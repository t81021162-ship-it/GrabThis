extends SceneTree
## Dev-only bot: plays the game for a while and saves screenshots.
## Run: godot -s res://tools/autoplay.gd -- <out_dir>

var frame := 0
var main: Node
var out := "user://"
var shots := {}


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		out = args[0]
	change_scene_to_file("res://main.tscn")
	for f in [20, 330, 450, 600]:
		shots[f] = true


func _process(_delta: float) -> bool:
	frame += 1
	main = current_scene
	if main == null:
		return false
	var p = main.player
	if frame == 25:
		main._on_start_pressed()
	if frame > 40 and p and not p.dead:
		var target: Node3D = null
		var best := INF
		for n in main.get_children():
			if n.has_method("take_hit") and not n.dead:
				var d: float = n.global_position.distance_to(p.global_position)
				if d < best:
					best = d
					target = n
		if target:
			var to: Vector3 = target.global_position + Vector3.UP * 1.3 * target.size - p.camera.global_position
			p.rotation.y = lerp_angle(p.rotation.y, atan2(-to.x, -to.z), 0.2)
			p.pitch = lerpf(p.pitch, atan2(to.y, Vector2(to.x, to.z).length()), 0.2)
			p.touch_fire = frame > 380 and best < 35
		p.move_input = Vector2(sin(frame * 0.02), 0) * 0.5
	if frame % 60 == 0:
		print("frame %d wave %d alive %d kills %d score %d hp %.0f ammo %d" % [frame, main.wave, main.alive, main.kills, main.score, p.hp, p.ammo])
	if frame == 760 and not p.dead:
		p.take_damage(1000.0, p.global_position + Vector3.FORWARD)
	if shots.has(frame) or frame == 820:
		root.get_texture().get_image().save_png("%s/shot_%04d.png" % [out, frame])
	return frame >= 820
