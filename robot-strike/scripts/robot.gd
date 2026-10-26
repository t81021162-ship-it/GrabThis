extends CharacterBody3D
## Hostile robot. Paths toward the player, takes cover-less potshots with a
## laser rifle, and blows up when destroyed. Heads take double damage.

const Fx := preload("res://scripts/fx.gd")

signal died(points: int, headshot: bool)

const TYPES := {
	"trooper": {"hp": 100.0, "speed": 3.6, "scale": 1.0, "damage": 8.0, "interval": 1.2,
		"range": 26.0, "burst": 1, "points": 100, "color": Color(0.55, 0.6, 0.68)},
	"drone": {"hp": 50.0, "speed": 6.2, "scale": 0.75, "damage": 5.0, "interval": 0.8,
		"range": 16.0, "burst": 1, "points": 75, "color": Color(0.85, 0.7, 0.25)},
	"heavy": {"hp": 380.0, "speed": 2.3, "scale": 1.45, "damage": 9.0, "interval": 2.2,
		"range": 30.0, "burst": 3, "points": 300, "color": Color(0.55, 0.22, 0.2)},
}
const GRAVITY := 22.0
const HEAD_HEIGHT := 1.7
const EYE_GLOW := 1.2

var kind := "trooper"
var difficulty := 1.0
var player: CharacterBody3D

var stats: Dictionary
var hp := 100.0
var size := 1.0
var dead := false
var frozen := false

var agent: NavigationAgent3D
var visual: Node3D
var leg_l: Node3D
var leg_r: Node3D
var muzzle: Node3D
var body_mat: StandardMaterial3D
var eye_mat: StandardMaterial3D

var think_timer := 0.0
var has_los := false
var fire_timer := 1.5
var charge := 0.0
var burst_left := 0
var burst_timer := 0.0
var strafe := 1.0
var strafe_timer := 2.0
var walk_cycle := 0.0
var hit_flash := 0.0


func _ready() -> void:
	stats = TYPES[kind]
	hp = stats.hp * (0.85 + 0.15 * difficulty)
	size = stats.scale
	fire_timer = randf_range(1.0, 2.5)
	strafe = 1.0 if randf() < 0.5 else -1.0
	collision_layer = 4
	collision_mask = 1 | 2 | 4

	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.45 * size
	capsule.height = 2.1 * size
	shape.shape = capsule
	shape.position.y = 1.05 * size
	add_child(shape)

	agent = NavigationAgent3D.new()
	agent.path_desired_distance = 0.8
	agent.target_desired_distance = 1.0
	agent.radius = 0.5 * size
	add_child(agent)

	_build_visual()


func _build_visual() -> void:
	visual = Node3D.new()
	visual.scale = Vector3.ONE * size
	add_child(visual)
	body_mat = Fx.mat(stats.color)
	body_mat.metallic = 0.6
	body_mat.roughness = 0.45
	var joint_mat := Fx.mat(Color(0.15, 0.15, 0.17))
	eye_mat = Fx.mat(Color(1.0, 0.08, 0.05), EYE_GLOW)

	leg_l = _limb(Vector3(-0.18, 0.95, 0), Vector3(0.22, 0.95, 0.26), body_mat)
	leg_r = _limb(Vector3(0.18, 0.95, 0), Vector3(0.22, 0.95, 0.26), body_mat)
	visual.add_child(Fx.box(Vector3(0.5, 0.18, 0.32), joint_mat, Vector3(0, 0.98, 0)))
	visual.add_child(Fx.box(Vector3(0.72, 0.62, 0.46), body_mat, Vector3(0, 1.38, 0)))
	visual.add_child(Fx.box(Vector3(0.4, 0.3, 0.1), joint_mat, Vector3(0, 1.4, -0.25)))
	visual.add_child(Fx.box(Vector3(0.18, 0.1, 0.18), joint_mat, Vector3(0, 1.73, 0)))
	visual.add_child(Fx.box(Vector3(0.44, 0.32, 0.4), body_mat, Vector3(0, 1.9, 0)))
	visual.add_child(Fx.box(Vector3(0.34, 0.08, 0.04), eye_mat, Vector3(0, 1.92, -0.2)))
	# Glowing power cores front and back so robots read at a distance.
	visual.add_child(Fx.box(Vector3(0.2, 0.2, 0.04), eye_mat, Vector3(0, 1.42, -0.31)))
	visual.add_child(Fx.box(Vector3(0.3, 0.12, 0.04), eye_mat, Vector3(0, 1.5, 0.24)))
	visual.add_child(Fx.cylinder(0.015, 0.3, joint_mat, Vector3(0.14, 2.18, 0.05)))
	visual.add_child(Fx.box(Vector3(0.05, 0.05, 0.05), eye_mat, Vector3(0.14, 2.34, 0.05)))

	# Left arm hangs, right arm holds the rifle forward.
	var arm_l := _limb(Vector3(-0.46, 1.62, 0), Vector3(0.17, 0.62, 0.17), body_mat)
	arm_l.rotation.x = 0.15
	var arm_r := _limb(Vector3(0.46, 1.62, 0), Vector3(0.17, 0.5, 0.17), body_mat)
	arm_r.rotation.x = 1.45
	arm_r.add_child(Fx.box(Vector3(0.12, 0.6, 0.14), joint_mat, Vector3(0, -0.6, -0.05)))
	muzzle = Node3D.new()
	muzzle.position = Vector3(0, -0.92, -0.05)
	arm_r.add_child(muzzle)

	for mi in visual.find_children("*", "MeshInstance3D", true, false):
		if kind == "drone":
			(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF


func _limb(pivot: Vector3, box_size: Vector3, material: Material) -> Node3D:
	var joint := Node3D.new()
	joint.position = pivot
	joint.add_child(Fx.box(box_size, material, Vector3(0, -box_size.y / 2, 0)))
	visual.add_child(joint)
	return joint


func freeze() -> void:
	frozen = true
	charge = 0.0
	burst_left = 0


func _physics_process(delta: float) -> void:
	if dead:
		return
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	else:
		velocity.y = 0.0
	if frozen or player == null:
		velocity.x = move_toward(velocity.x, 0, 20 * delta)
		velocity.z = move_toward(velocity.z, 0, 20 * delta)
		move_and_slide()
		_animate(delta)
		return

	var to_player := player.global_position - global_position
	to_player.y = 0
	var dist := to_player.length()

	think_timer -= delta
	if think_timer <= 0.0:
		think_timer = randf_range(0.2, 0.35)
		agent.target_position = player.global_position
		has_los = _check_los()

	strafe_timer -= delta
	if strafe_timer <= 0.0:
		strafe_timer = randf_range(1.5, 3.5)
		strafe = -strafe

	var speed: float = stats.speed * (0.9 + 0.1 * difficulty)
	var move := Vector3.ZERO
	var engage_range: float = stats.range * 0.65
	if not has_los or dist > engage_range:
		move = _path_direction(to_player) * speed
	elif dist < 4.0:
		move = -to_player.normalized() * speed * 0.6
	else:
		var side := to_player.normalized().cross(Vector3.UP) * strafe
		move = side * speed * 0.45
	if charge > 0.0 or burst_left > 0:
		move *= 0.3

	velocity.x = move_toward(velocity.x, move.x, speed * 6.0 * delta)
	velocity.z = move_toward(velocity.z, move.z, speed * 6.0 * delta)
	move_and_slide()

	if dist > 0.1:
		var target_yaw := atan2(-to_player.x, -to_player.z)
		rotation.y = lerp_angle(rotation.y, target_yaw, clampf(delta * 6.0, 0.0, 1.0))

	_update_attack(delta, dist)
	_animate(delta)


func _path_direction(to_player: Vector3) -> Vector3:
	var map := agent.get_navigation_map()
	if NavigationServer3D.map_get_iteration_id(map) > 0 and not agent.is_navigation_finished():
		var next := agent.get_next_path_position()
		var d := next - global_position
		d.y = 0
		if d.length() > 0.05:
			return d.normalized()
	return to_player.normalized()


func _check_los() -> bool:
	var from := global_position + Vector3.UP * HEAD_HEIGHT * size
	var to: Vector3 = player.global_position + Vector3.UP * 1.4
	var query := PhysicsRayQueryParameters3D.create(from, to, 1 | 2, [get_rid()])
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	return hit and hit.collider == player


func _update_attack(delta: float, dist: float) -> void:
	fire_timer -= delta
	if burst_left > 0:
		burst_timer -= delta
		if burst_timer <= 0.0:
			_shoot(dist)
			burst_left -= 1
			burst_timer = 0.18
		return
	if charge > 0.0:
		charge -= delta
		eye_mat.emission_energy_multiplier = EYE_GLOW + (0.4 - charge) * 12.0
		if charge <= 0.0:
			eye_mat.emission_energy_multiplier = EYE_GLOW
			burst_left = stats.burst
			burst_timer = 0.0
		return
	if fire_timer <= 0.0 and has_los and dist < stats.range:
		charge = 0.4
		fire_timer = stats.interval * randf_range(0.8, 1.3) / (0.8 + 0.2 * difficulty)


func _shoot(dist: float) -> void:
	if not has_los:
		return
	var from := muzzle.global_position
	var target: Vector3 = player.global_position + Vector3.UP * 1.2
	var player_speed := Vector2(player.velocity.x, player.velocity.z).length()
	var accuracy := clampf(0.85 - dist / stats.range * 0.35 - player_speed * 0.035, 0.2, 0.9)
	var hits := randf() < accuracy
	if not hits:
		var miss := Vector3(randf_range(-1, 1), randf_range(-0.5, 1), randf_range(-1, 1)).normalized()
		target += miss * randf_range(0.8, 1.6)
		target = from + (target - from).normalized() * (dist + 15.0)
		var query := PhysicsRayQueryParameters3D.create(from, target, 1, [get_rid()])
		var wall := get_world_3d().direct_space_state.intersect_ray(query)
		if wall:
			target = wall.position
			Fx.sparks(get_parent(), target, Color(1.0, 0.3, 0.2), 5, 3.0, 0.05)
	Fx.tracer(get_parent(), from, target, Color(1.0, 0.2, 0.15), 0.05, 0.09)
	Fx.flash(get_parent(), from, Color(1.0, 0.25, 0.2), 2.5, 0.1)
	if hits:
		player.take_damage(stats.damage * (0.85 + 0.15 * difficulty), global_position)


func _animate(delta: float) -> void:
	var horiz := Vector2(velocity.x, velocity.z).length()
	walk_cycle += delta * horiz * 2.2
	var swing := sin(walk_cycle) * clampf(horiz / 3.0, 0.0, 1.0) * 0.6
	leg_l.rotation.x = swing
	leg_r.rotation.x = -swing
	visual.position.y = absf(cos(walk_cycle)) * 0.04 * clampf(horiz, 0.0, 1.0)
	if hit_flash > 0.0:
		hit_flash -= delta
		if hit_flash <= 0.0:
			body_mat.emission_enabled = false


func take_hit(damage: float, at: Vector3, dir: Vector3) -> Dictionary:
	if dead:
		return {"killed": false, "headshot": false}
	var headshot := at.y - global_position.y > HEAD_HEIGHT * size
	hp -= damage * (2.0 if headshot else 1.0)
	body_mat.emission_enabled = true
	body_mat.emission = Color(1, 1, 1)
	body_mat.emission_energy_multiplier = 0.6
	hit_flash = 0.06
	velocity += Vector3(dir.x, 0, dir.z).normalized() * (0.6 / size)
	# Getting shot makes robots react even if they had lost sight of you.
	has_los = _check_los()
	if hp <= 0.0:
		_die(headshot)
		return {"killed": true, "headshot": headshot}
	return {"killed": false, "headshot": headshot}


func _die(headshot: bool) -> void:
	dead = true
	collision_layer = 0
	Fx.explosion(get_parent(), global_position + Vector3.UP * size, size)
	var points: int = stats.points
	if headshot:
		points = int(points * 1.5)
	died.emit(points, headshot)
	queue_free()
