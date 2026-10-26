extends RefCounted
## Small static helpers for materials and short-lived visual effects.


static func mat(color: Color, emission := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 0.8
	if emission > 0.0:
		m.emission_enabled = true
		m.emission = color
		m.emission_energy_multiplier = emission
	return m


static func unshaded(color: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = color
	if color.a < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return m


static func box(size: Vector3, material: Material, pos := Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	mi.material_override = material
	mi.position = pos
	return mi


static func cylinder(radius: float, height: float, material: Material, pos := Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 10
	mesh.rings = 1
	mi.mesh = mesh
	mi.material_override = material
	mi.position = pos
	return mi


static func _expire(node: Node, seconds: float) -> void:
	node.get_tree().create_timer(seconds, false).timeout.connect(node.queue_free)


static func flash(parent: Node, pos: Vector3, color: Color, energy: float, seconds: float) -> void:
	var light := OmniLight3D.new()
	light.light_color = color
	light.light_energy = energy
	light.omni_range = 6.0
	parent.add_child(light)
	light.global_position = pos
	var tw := light.create_tween()
	tw.tween_property(light, "light_energy", 0.0, seconds)
	tw.tween_callback(light.queue_free)


static func tracer(parent: Node, from: Vector3, to: Vector3, color: Color, width := 0.03, seconds := 0.06) -> void:
	var length := from.distance_to(to)
	if length < 0.05:
		return
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(width, width, length)
	mi.mesh = mesh
	mi.material_override = unshaded(color)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	mi.global_position = (from + to) * 0.5
	var up := Vector3.UP if absf((to - from).normalized().y) < 0.99 else Vector3.RIGHT
	mi.look_at(to, up)
	_expire(mi, seconds)


static func sparks(parent: Node, pos: Vector3, color: Color, amount := 10, speed := 5.0, size := 0.06) -> void:
	var p := CPUParticles3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(size, size, size)
	mesh.material = unshaded(color)
	p.mesh = mesh
	p.amount = amount
	p.one_shot = true
	p.explosiveness = 1.0
	p.lifetime = 0.5
	p.direction = Vector3.UP
	p.spread = 180.0
	p.initial_velocity_min = speed * 0.4
	p.initial_velocity_max = speed
	p.gravity = Vector3(0, -12, 0)
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.5
	parent.add_child(p)
	p.global_position = pos
	p.emitting = true
	_expire(p, 1.2)


static func explosion(parent: Node, pos: Vector3, scale := 1.0) -> void:
	sparks(parent, pos, Color(1.0, 0.6, 0.15), int(30 * scale), 9.0 * scale, 0.12 * scale)
	sparks(parent, pos, Color(0.25, 0.25, 0.27), int(18 * scale), 6.0 * scale, 0.2 * scale)
	flash(parent, pos, Color(1.0, 0.55, 0.2), 10.0 * scale, 0.5)
	var ball := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.6 * scale
	sphere.height = 1.2 * scale
	ball.mesh = sphere
	var m := unshaded(Color(1.0, 0.7, 0.3, 0.9))
	ball.material_override = m
	parent.add_child(ball)
	ball.global_position = pos
	var tw := ball.create_tween().set_parallel(true)
	tw.tween_property(ball, "scale", Vector3.ONE * 2.5, 0.35)
	tw.tween_property(m, "albedo_color:a", 0.0, 0.35)
	tw.chain().tween_callback(ball.queue_free)
