extends SceneTree
## Dev-only: lines up one robot of each type in front of the camera and saves a screenshot.

var frame := 0
var out := "user://"


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		out = args[0]
	change_scene_to_file("res://main.tscn")


func _process(_delta: float) -> bool:
	frame += 1
	var main = current_scene
	if main == null:
		return false
	if frame == 5:
		main.hud.hide_overlay()
		var x := -2.5
		for kind in ["drone", "trooper", "heavy"]:
			var r = preload("res://scripts/robot.gd").new()
			r.kind = kind
			r.player = main.player
			main.add_child(r)
			r.global_position = Vector3(x, 0.1, -6)
			r.rotation.y = PI
			r.freeze()
			x += 2.5
	if frame == 40:
		root.get_texture().get_image().save_png("%s/robots.png" % out)
	return frame >= 40
