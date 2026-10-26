extends CharacterBody3D
## First-person soldier: movement, looking, and an automatic rifle.
## Input comes from the HUD's touch controls or from keyboard and mouse.

const Fx := preload("res://scripts/fx.gd")

signal health_changed(hp: float, max_hp: float)
signal ammo_changed(ammo: int, mag: int, reloading: bool)
signal hit_confirmed(killed: bool, headshot: bool)
signal damaged(from_dir: Vector3)
signal died

const WALK_SPEED := 6.5
const SPRINT_SPEED := 9.0
const GRAVITY := 22.0
const JUMP_VELOCITY := 7.5
const EYE_HEIGHT := 1.6
const MAX_HP := 100.0
const MAG_SIZE := 30
const FIRE_INTERVAL := 0.1
const RELOAD_TIME := 1.6
const DAMAGE := 25.0
const RANGE := 120.0

var active := false
var dead := false
var hp := MAX_HP
var ammo := MAG_SIZE
var reloading := false
var reload_left := 0.0
var fire_cooldown := 0.0
var regen_delay := 0.0

# Set by the HUD every frame.
var move_input := Vector2.ZERO
var touch_fire := false
var jump_requested := false

var mouse_sensitivity := 0.0025
var pitch := 0.0
var recoil := 0.0
var shake := 0.0
var bob_time := 0.0

var head: Node3D
var camera: Camera3D
var gun: Node3D
var muzzle: Node3D
var muzzle_flash: MeshInstance3D
var gun_rest := Vector3(0.22, -0.22, -0.45)


func _ready() -> void:
	collision_layer = 2
	collision_mask = 1 | 4
	floor_snap_length = 0.3
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.4
	capsule.height = 1.8
	shape.shape = capsule
	shape.position.y = 0.9
	add_child(shape)

	head = Node3D.new()
	head.position.y = EYE_HEIGHT
	add_child(head)
	camera = Camera3D.new()
	camera.fov = 75.0
	camera.near = 0.05
	camera.far = 200.0
	head.add_child(camera)
	camera.make_current()
	_build_gun()


func _build_gun() -> void:
	gun = Node3D.new()
	gun.position = gun_rest
	camera.add_child(gun)
	var dark := Fx.mat(Color(0.12, 0.13, 0.14))
	var metal := Fx.mat(Color(0.3, 0.32, 0.34))
	var accent := Fx.mat(Color(0.35, 0.3, 0.2))
	gun.add_child(Fx.box(Vector3(0.07, 0.1, 0.5), dark, Vector3(0, 0, -0.05)))
	gun.add_child(Fx.box(Vector3(0.05, 0.06, 0.3), metal, Vector3(0, 0.02, -0.42)))
	gun.add_child(Fx.box(Vector3(0.06, 0.14, 0.08), accent, Vector3(0, -0.11, 0.02)))
	gun.add_child(Fx.box(Vector3(0.05, 0.16, 0.06), dark, Vector3(0, -0.12, -0.16)))
	gun.add_child(Fx.box(Vector3(0.06, 0.09, 0.22), accent, Vector3(0, -0.01, 0.3)))
	gun.add_child(Fx.box(Vector3(0.03, 0.05, 0.12), metal, Vector3(0, 0.08, -0.05)))
	for mi in gun.get_children():
		(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	muzzle = Node3D.new()
	muzzle.position = Vector3(0, 0.02, -0.6)
	gun.add_child(muzzle)
	muzzle_flash = MeshInstance3D.new()
	var quad := SphereMesh.new()
	quad.radius = 0.06
	quad.height = 0.12
	muzzle_flash.mesh = quad
	muzzle_flash.material_override = Fx.unshaded(Color(1.0, 0.8, 0.4))
	muzzle_flash.visible = false
	muzzle.add_child(muzzle_flash)


func emit_status() -> void:
	health_changed.emit(hp, MAX_HP)
	ammo_changed.emit(ammo, MAG_SIZE, reloading)


func _unhandled_input(event: InputEvent) -> void:
	if not active or dead:
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		look(event.relative * mouse_sensitivity)
	elif event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	elif event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_R:
				start_reload()
			KEY_ESCAPE:
				Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func look(delta: Vector2) -> void:
	rotation.y -= delta.x
	pitch = clampf(pitch - delta.y, deg_to_rad(-85), deg_to_rad(85))


func _physics_process(delta: float) -> void:
	if dead or not active:
		head.rotation.x = pitch
		return

	var input := move_input
	var sprint := false
	if Input.is_physical_key_pressed(KEY_W): input.y -= 1
	if Input.is_physical_key_pressed(KEY_S): input.y += 1
	if Input.is_physical_key_pressed(KEY_A): input.x -= 1
	if Input.is_physical_key_pressed(KEY_D): input.x += 1
	if Input.is_physical_key_pressed(KEY_SHIFT): sprint = true
	if input.length() > 1.0:
		input = input.normalized()
	# Pushing the stick all the way forward sprints, like most mobile shooters.
	if move_input.y < -0.95:
		sprint = true

	var dir := (transform.basis * Vector3(input.x, 0, input.y))
	var speed := SPRINT_SPEED if sprint and input.y < 0 else WALK_SPEED
	var accel := 14.0 if is_on_floor() else 4.0
	velocity.x = move_toward(velocity.x, dir.x * speed, accel * speed * delta)
	velocity.z = move_toward(velocity.z, dir.z * speed, accel * speed * delta)

	if is_on_floor():
		if jump_requested or Input.is_physical_key_pressed(KEY_SPACE):
			velocity.y = JUMP_VELOCITY
	else:
		velocity.y -= GRAVITY * delta
	jump_requested = false
	move_and_slide()

	_update_weapon(delta)
	_update_regen(delta)
	_update_camera(delta, input.length())


func _update_weapon(delta: float) -> void:
	fire_cooldown -= delta
	if reloading:
		reload_left -= delta
		if reload_left <= 0.0:
			reloading = false
			ammo = MAG_SIZE
			ammo_changed.emit(ammo, MAG_SIZE, reloading)
	var wants_fire := touch_fire or (Input.mouse_mode == Input.MOUSE_MODE_CAPTURED and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT))
	if wants_fire and not reloading and fire_cooldown <= 0.0:
		if ammo > 0:
			_fire()
		else:
			start_reload()
	muzzle_flash.visible = fire_cooldown > FIRE_INTERVAL * 0.5


func start_reload() -> void:
	if reloading or ammo == MAG_SIZE or dead:
		return
	reloading = true
	reload_left = RELOAD_TIME
	ammo_changed.emit(ammo, MAG_SIZE, reloading)


func _fire() -> void:
	fire_cooldown = FIRE_INTERVAL
	ammo -= 1
	ammo_changed.emit(ammo, MAG_SIZE, reloading)
	recoil = minf(recoil + 0.012, 0.08)
	gun.position.z = gun_rest.z + 0.06

	var spread := 0.006 + recoil * 0.15 + (0.02 if not is_on_floor() else 0.0)
	var aim := -camera.global_transform.basis.z
	aim += camera.global_transform.basis.x * randf_range(-spread, spread)
	aim += camera.global_transform.basis.y * randf_range(-spread, spread)
	var from := camera.global_position
	var to := from + aim.normalized() * RANGE
	var query := PhysicsRayQueryParameters3D.create(from, to, 1 | 4, [get_rid()])
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	var end := to
	if hit:
		end = hit.position
		var collider: Object = hit.collider
		if collider and collider.has_method("take_hit"):
			var result: Dictionary = collider.take_hit(DAMAGE, end, aim)
			hit_confirmed.emit(result.get("killed", false), result.get("headshot", false))
			Fx.sparks(get_parent(), end, Color(1.0, 0.85, 0.3), 8, 5.0)
		else:
			Fx.sparks(get_parent(), end + hit.normal * 0.05, Color(0.7, 0.65, 0.55), 6, 3.0, 0.05)
	Fx.tracer(get_parent(), muzzle.global_position, end, Color(1.0, 0.9, 0.5), 0.02, 0.04)
	Fx.flash(get_parent(), muzzle.global_position, Color(1.0, 0.75, 0.4), 2.0, 0.06)


func take_damage(amount: float, from_pos: Vector3) -> void:
	if dead or not active:
		return
	hp -= amount
	regen_delay = 4.0
	shake = minf(shake + 0.15, 0.3)
	health_changed.emit(maxf(hp, 0.0), MAX_HP)
	damaged.emit(from_pos - global_position)
	if hp <= 0.0:
		dead = true
		touch_fire = false
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		var tw := create_tween()
		tw.tween_property(head, "position:y", 0.3, 0.6)
		tw.parallel().tween_property(head, "rotation:z", 0.6, 0.6)
		died.emit()


func _update_regen(delta: float) -> void:
	if regen_delay > 0.0:
		regen_delay -= delta
	elif hp < MAX_HP:
		hp = minf(hp + 30.0 * delta, MAX_HP)
		health_changed.emit(hp, MAX_HP)


func _update_camera(delta: float, move_amount: float) -> void:
	recoil = move_toward(recoil, 0.0, delta * 0.25)
	head.rotation.x = pitch + recoil
	shake = move_toward(shake, 0.0, delta)
	camera.h_offset = randf_range(-shake, shake) * 0.3
	camera.v_offset = randf_range(-shake, shake) * 0.3

	if is_on_floor() and move_amount > 0.1:
		bob_time += delta * (8.0 + velocity.length())
	var bob := Vector3(sin(bob_time) * 0.012, absf(cos(bob_time)) * 0.012, 0) * clampf(move_amount, 0.0, 1.0)
	var target := gun_rest + bob
	if reloading:
		target += Vector3(0, -0.15, 0.05)
	gun.position = gun.position.lerp(target, clampf(delta * 14.0, 0.0, 1.0))
	gun.rotation.x = lerpf(gun.rotation.x, -0.6 if reloading else 0.0, clampf(delta * 10.0, 0.0, 1.0))
