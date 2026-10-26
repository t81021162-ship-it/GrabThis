extends Node3D
## Builds the arena, spawns the player and HUD, and runs the robot waves.

const PlayerScript := preload("res://scripts/player.gd")
const RobotScript := preload("res://scripts/robot.gd")
const HudScript := preload("res://scripts/hud.gd")
const Fx := preload("res://scripts/fx.gd")

const ARENA_HALF := 40.0
const WALL_HEIGHT := 7.0

var player: CharacterBody3D
var hud: CanvasLayer
var nav_region: NavigationRegion3D
var rng := RandomNumberGenerator.new()
var spawn_points: Array[Vector3] = []

var started := false
var game_over := false
var wave := 0
var score := 0
var kills := 0
var to_spawn := 0
var alive := 0
var spawn_timer := 0.0
var wave_break := 0.0


func _ready() -> void:
	rng.seed = 81021
	_build_environment()
	_build_arena()
	_spawn_player()
	hud = HudScript.new()
	add_child(hud)
	hud.player = player
	hud.start_pressed.connect(_on_start_pressed)
	hud.show_title()
	player.health_changed.connect(hud.set_health)
	player.ammo_changed.connect(hud.set_ammo)
	player.hit_confirmed.connect(hud.show_hitmarker)
	player.damaged.connect(hud.flash_damage)
	player.died.connect(_on_player_died)
	player.emit_status()


func _physics_process(delta: float) -> void:
	if not started or game_over:
		return
	if wave_break > 0.0:
		wave_break -= delta
		if wave_break <= 0.0:
			_begin_wave()
		return
	if to_spawn > 0:
		spawn_timer -= delta
		if spawn_timer <= 0.0 and alive < 6 + wave:
			_spawn_robot()
			to_spawn -= 1
			spawn_timer = maxf(0.5, 1.6 - wave * 0.1)
	elif alive <= 0:
		score += 250 * wave
		hud.set_score(score)
		hud.banner("WAVE %d CLEARED" % wave, "+%d BONUS" % (250 * wave))
		wave_break = 4.0


func _on_start_pressed() -> void:
	if game_over:
		get_tree().reload_current_scene()
		return
	if started:
		return
	started = true
	hud.hide_overlay()
	player.active = true
	wave_break = 1.5


func _begin_wave() -> void:
	wave += 1
	to_spawn = 4 + wave * 2
	spawn_timer = 0.5
	hud.set_wave(wave)
	hud.banner("WAVE %d" % wave, "%d HOSTILES INBOUND" % to_spawn)


func _pick_robot_type() -> String:
	var r := rng.randf()
	if wave >= 3 and r < minf(0.1 + wave * 0.03, 0.3):
		return "heavy"
	if wave >= 2 and r < 0.55:
		return "drone"
	return "trooper"


func _spawn_robot() -> void:
	# Prefer spawn points the player is not standing next to.
	var best := spawn_points[0]
	var best_score := -INF
	for i in 4:
		var p := spawn_points[rng.randi() % spawn_points.size()]
		var d := p.distance_to(player.global_position)
		var s := d + rng.randf() * 10.0
		if s > best_score:
			best_score = s
			best = p
	var robot: CharacterBody3D = RobotScript.new()
	robot.kind = _pick_robot_type()
	robot.difficulty = 1.0 + (wave - 1) * 0.08
	robot.player = player
	add_child(robot)
	robot.global_position = best
	robot.died.connect(_on_robot_died)
	alive += 1
	Fx.flash(self, best + Vector3.UP, Color(0.3, 0.7, 1.0), 6.0, 0.4)


func _on_robot_died(points: int, headshot: bool) -> void:
	alive -= 1
	kills += 1
	score += points
	hud.set_score(score)
	hud.kill_feed(("HEADSHOT  +%d" if headshot else "ROBOT DESTROYED  +%d") % points)


func _on_player_died() -> void:
	game_over = true
	for n in get_children():
		if n.has_method("freeze"):
			n.freeze()
	hud.show_game_over(wave, kills, score)


# --- World construction ---------------------------------------------------

func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.18, 0.22, 0.32)
	sky_mat.sky_horizon_color = Color(0.85, 0.55, 0.35)
	sky_mat.ground_horizon_color = Color(0.45, 0.32, 0.25)
	sky_mat.ground_bottom_color = Color(0.1, 0.08, 0.07)
	sky_mat.sun_angle_max = 20.0
	sky.sky_material = sky_mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 1.0
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = Color(0.6, 0.45, 0.35)
	env.fog_density = 0.008
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-38, -35, 0)
	sun.light_color = Color(1.0, 0.85, 0.7)
	sun.light_energy = 1.2
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 60.0
	add_child(sun)


func _build_arena() -> void:
	nav_region = NavigationRegion3D.new()
	var nav_mesh := NavigationMesh.new()
	nav_mesh.geometry_parsed_geometry_type = NavigationMesh.PARSED_GEOMETRY_STATIC_COLLIDERS
	nav_mesh.cell_size = 0.25
	nav_mesh.cell_height = 0.25
	nav_mesh.agent_radius = 0.75
	nav_mesh.agent_height = 2.0
	nav_mesh.agent_max_climb = 0.5
	nav_region.navigation_mesh = nav_mesh
	add_child(nav_region)

	var ground_mat := ShaderMaterial.new()
	ground_mat.shader = _ground_shader()
	_add_block(Vector3(0, -0.5, 0), Vector3(ARENA_HALF * 2 + 4, 1, ARENA_HALF * 2 + 4), ground_mat, false)

	var wall_mat := Fx.mat(Color(0.32, 0.33, 0.36))
	var s := ARENA_HALF * 2
	_add_block(Vector3(0, WALL_HEIGHT / 2, -ARENA_HALF - 1), Vector3(s + 4, WALL_HEIGHT, 2), wall_mat)
	_add_block(Vector3(0, WALL_HEIGHT / 2, ARENA_HALF + 1), Vector3(s + 4, WALL_HEIGHT, 2), wall_mat)
	_add_block(Vector3(-ARENA_HALF - 1, WALL_HEIGHT / 2, 0), Vector3(2, WALL_HEIGHT, s), wall_mat)
	_add_block(Vector3(ARENA_HALF + 1, WALL_HEIGHT / 2, 0), Vector3(2, WALL_HEIGHT, s), wall_mat)

	# Ruined buildings near the corners.
	var bld_mat := Fx.mat(Color(0.42, 0.38, 0.34))
	for c in [Vector2(-1, -1), Vector2(1, -1), Vector2(-1, 1), Vector2(1, 1)]:
		var cx: float = c.x * 24.0
		var cz: float = c.y * 24.0
		var h := rng.randf_range(5.0, 10.0)
		_add_block(Vector3(cx, h / 2, cz), Vector3(8, h, 6), bld_mat)
		_add_block(Vector3(cx + c.x * 5.0, 1.5, cz - c.y * 2.0), Vector3(2, 3, 2), bld_mat)

	# Low walls and crates for cover, kept away from the player's start.
	var crate_mat := Fx.mat(Color(0.45, 0.36, 0.2))
	var barrier_mat := Fx.mat(Color(0.55, 0.55, 0.5))
	var placed := 0
	var tries := 0
	while placed < 34 and tries < 400:
		tries += 1
		var pos := Vector3(rng.randf_range(-36, 36), 0, rng.randf_range(-36, 36))
		if pos.length() < 7.0:
			continue
		if absf(absf(pos.x) - 24.0) < 6.0 and absf(absf(pos.z) - 24.0) < 5.0:
			continue
		if rng.randf() < 0.5:
			var size := rng.randf_range(1.2, 2.2)
			_add_block(pos + Vector3(0, size / 2, 0), Vector3(size, size, size), crate_mat, true, rng.randf() * TAU)
			if rng.randf() < 0.35:
				_add_block(pos + Vector3(0, size + 0.5, 0), Vector3(1, 1, 1), crate_mat, true, rng.randf() * TAU)
		else:
			var length := rng.randf_range(3.0, 6.0)
			_add_block(pos + Vector3(0, 0.6, 0), Vector3(length, 1.2, 0.6), barrier_mat, true, rng.randf() * PI)
		placed += 1

	# Tall pillars to break sight lines.
	var pillar_mat := Fx.mat(Color(0.28, 0.3, 0.33))
	for p in [Vector3(-12, 0, 0), Vector3(12, 0, 0), Vector3(0, 0, -14), Vector3(0, 0, 14)]:
		_add_block(p + Vector3(0, 3, 0), Vector3(1.6, 6, 1.6), pillar_mat)

	nav_region.bake_navigation_mesh(false)

	for x in [-34.0, 0.0, 34.0]:
		for z in [-34.0, 34.0]:
			spawn_points.append(Vector3(x, 0.2, z))
	spawn_points.append(Vector3(-34, 0.2, 0))
	spawn_points.append(Vector3(34, 0.2, 0))


func _add_block(pos: Vector3, size: Vector3, material: Material, shadows := true, yaw := 0.0) -> void:
	var body := StaticBody3D.new()
	body.collision_layer = 1
	body.collision_mask = 0
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	shape.shape = box
	body.add_child(shape)
	var mesh_inst := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh_inst.mesh = mesh
	mesh_inst.material_override = material
	if not shadows:
		mesh_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	body.add_child(mesh_inst)
	nav_region.add_child(body)
	body.position = pos
	body.rotation.y = yaw


func _ground_shader() -> Shader:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
varying vec3 wpos;
void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void fragment() {
	vec2 cell = floor(wpos.xz / 4.0);
	float tone = 0.85 + 0.15 * hash(cell);
	vec2 g = abs(fract(wpos.xz / 4.0) - 0.5);
	float line = smoothstep(0.48, 0.5, max(g.x, g.y));
	vec3 base = vec3(0.27, 0.26, 0.24) * tone;
	ALBEDO = mix(base, vec3(0.16, 0.16, 0.15), line);
	ROUGHNESS = 0.95;
}
"""
	return shader


func _spawn_player() -> void:
	player = PlayerScript.new()
	add_child(player)
	player.global_position = Vector3(0, 0.1, 0)
