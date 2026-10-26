extends CanvasLayer
## On-screen HUD and mobile touch controls.
## Left side of the screen is a floating move stick, the rest drags to look,
## and the buttons on the right fire, reload and jump.

signal start_pressed

const LOOK_SENSITIVITY := 0.006
const STICK_RADIUS := 90.0
const LEFT_ZONE := 0.4

var player: CharacterBody3D

var root: Control
var controls: TouchControls
var crosshair: Crosshair
var damage_ring: DamageRing
var vignette: ColorRect
var hp_bar: ColorRect
var hp_bar_back: ColorRect
var wave_label: Label
var score_label: Label
var ammo_label: Label
var banner_title: Label
var banner_sub: Label
var feed: VBoxContainer
var overlay: ColorRect
var overlay_title: Label
var overlay_body: Label

var overlay_open := true
var overlay_ready_at := 0.0
var hp_ratio := 1.0
var damage_pulse := 0.0
var banner_time := 0.0

var stick_finger := -1
var stick_origin := Vector2.ZERO
var fire_finger := -1
var look_fingers := {}


func _ready() -> void:
	layer = 10
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	vignette = ColorRect.new()
	vignette.set_anchors_preset(Control.PRESET_FULL_RECT)
	vignette.color = Color(0.7, 0.0, 0.0, 0.0)
	vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(vignette)

	damage_ring = DamageRing.new()
	damage_ring.hud = self
	_fill(damage_ring)
	crosshair = Crosshair.new()
	crosshair.hud = self
	_fill(crosshair)
	controls = TouchControls.new()
	controls.hud = self
	_fill(controls)

	hp_bar_back = ColorRect.new()
	hp_bar_back.color = Color(0, 0, 0, 0.5)
	hp_bar_back.position = Vector2(24, 24)
	hp_bar_back.size = Vector2(260, 18)
	root.add_child(hp_bar_back)
	hp_bar = ColorRect.new()
	hp_bar.color = Color(0.3, 0.9, 0.4)
	hp_bar.position = Vector2(27, 27)
	hp_bar.size = Vector2(254, 12)
	root.add_child(hp_bar)

	wave_label = _label(26, HORIZONTAL_ALIGNMENT_LEFT)
	wave_label.position = Vector2(24, 48)
	wave_label.text = "WAVE -"
	score_label = _label(30, HORIZONTAL_ALIGNMENT_RIGHT)
	_place(score_label, Vector2(1, 0), Rect2(-324, 18, 300, 40))
	score_label.text = "0"
	ammo_label = _label(34, HORIZONTAL_ALIGNMENT_RIGHT)
	_place(ammo_label, Vector2(1, 1), Rect2(-480, -300, 220, 46))

	banner_title = _label(64, HORIZONTAL_ALIGNMENT_CENTER)
	_place(banner_title, Vector2(0.5, 0), Rect2(-400, 90, 800, 80))
	banner_title.add_theme_color_override("font_color", Color(1.0, 0.75, 0.3))
	banner_sub = _label(26, HORIZONTAL_ALIGNMENT_CENTER)
	_place(banner_sub, Vector2(0.5, 0), Rect2(-400, 168, 800, 40))

	feed = VBoxContainer.new()
	feed.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(feed)
	_place(feed, Vector2(0.5, 0.5), Rect2(-200, 60, 400, 120))

	overlay = ColorRect.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.color = Color(0.03, 0.04, 0.06, 0.78)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(overlay)
	overlay_title = _label(92, HORIZONTAL_ALIGNMENT_CENTER, overlay)
	_place(overlay_title, Vector2(0.5, 0.5), Rect2(-600, -230, 1200, 120))
	overlay_title.add_theme_color_override("font_color", Color(1.0, 0.7, 0.25))
	overlay_body = _label(28, HORIZONTAL_ALIGNMENT_CENTER, overlay)
	_place(overlay_body, Vector2(0.5, 0.5), Rect2(-600, -100, 1200, 320))


## Anchors a control to a point of its parent and offsets it by rect.
func _place(c: Control, anchor: Vector2, rect: Rect2) -> void:
	c.anchor_left = anchor.x
	c.anchor_right = anchor.x
	c.anchor_top = anchor.y
	c.anchor_bottom = anchor.y
	c.offset_left = rect.position.x
	c.offset_top = rect.position.y
	c.offset_right = rect.end.x
	c.offset_bottom = rect.end.y


func _fill(c: Control) -> void:
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(c)


func _label(font_size: int, align: HorizontalAlignment, parent: Control = null) -> Label:
	var l := Label.new()
	l.horizontal_alignment = align
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.add_theme_font_size_override("font_size", font_size)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	l.add_theme_constant_override("outline_size", maxi(4, font_size / 6))
	(parent if parent else root).add_child(l)
	return l


# --- Public API used by main.gd and player.gd -------------------------------

func show_title() -> void:
	overlay_title.text = "ROBOT STRIKE"
	overlay_body.text = "The machines have taken the city. Hold the line.\n\nLEFT SIDE: move   •   RIGHT SIDE: look\nFIRE button shoots (drag it to aim)\nAim for the head — double damage\n\nTAP TO DEPLOY"
	_open_overlay()


func show_game_over(wave: int, kills: int, score: int) -> void:
	overlay_title.text = "K.I.A."
	overlay_body.text = "You held out until wave %d\n\nRobots destroyed: %d\nScore: %d\n\nTAP TO REDEPLOY" % [wave, kills, score]
	_open_overlay()
	overlay_ready_at = Time.get_ticks_msec() / 1000.0 + 1.5


func _open_overlay() -> void:
	overlay_open = true
	overlay.visible = true
	_release_all()


func hide_overlay() -> void:
	overlay_open = false
	overlay.visible = false


func set_health(hp: float, max_hp: float) -> void:
	hp_ratio = clampf(hp / max_hp, 0.0, 1.0)
	hp_bar.size.x = 254.0 * hp_ratio
	hp_bar.color = Color(0.3, 0.9, 0.4).lerp(Color(0.95, 0.2, 0.15), 1.0 - hp_ratio)


func set_ammo(ammo: int, mag: int, reloading: bool) -> void:
	if reloading:
		ammo_label.text = "RELOADING"
		ammo_label.add_theme_color_override("font_color", Color(1.0, 0.8, 0.3))
	else:
		ammo_label.text = "%d / %d" % [ammo, mag]
		ammo_label.add_theme_color_override("font_color", Color(1.0, 0.35, 0.3) if ammo <= mag / 5 else Color(1, 1, 1))


func set_wave(wave: int) -> void:
	wave_label.text = "WAVE %d" % wave


func set_score(score: int) -> void:
	score_label.text = str(score)


func banner(title: String, sub: String) -> void:
	banner_title.text = title
	banner_sub.text = sub
	banner_time = 2.6


func kill_feed(text: String) -> void:
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", 22)
	l.add_theme_color_override("font_color", Color(1.0, 0.85, 0.4) if text.begins_with("HEAD") else Color(1, 1, 1))
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	l.add_theme_constant_override("outline_size", 4)
	feed.add_child(l)
	if feed.get_child_count() > 3:
		feed.get_child(0).queue_free()
	var tw := l.create_tween()
	tw.tween_interval(1.4)
	tw.tween_property(l, "modulate:a", 0.0, 0.5)
	tw.tween_callback(l.queue_free)


func show_hitmarker(killed: bool, headshot: bool) -> void:
	crosshair.hit_time = 0.18
	crosshair.hit_color = Color(1, 0.25, 0.2) if killed else (Color(1, 0.85, 0.3) if headshot else Color(1, 1, 1))


func flash_damage(from_dir: Vector3) -> void:
	damage_pulse = 0.35
	if player:
		var local := player.global_transform.basis.inverse() * from_dir
		damage_ring.add(atan2(local.x, -local.z))


func _process(delta: float) -> void:
	damage_pulse = maxf(damage_pulse - delta, 0.0)
	var low := clampf((0.5 - hp_ratio) * 1.2, 0.0, 0.6)
	vignette.color.a = maxf(low, damage_pulse)
	if banner_time > 0.0:
		banner_time -= delta
		var a := clampf(banner_time / 0.5, 0.0, 1.0)
		banner_title.modulate.a = a
		banner_sub.modulate.a = a
	else:
		banner_title.text = ""
		banner_sub.text = ""


# --- Touch handling ---------------------------------------------------------

func screen_size() -> Vector2:
	return root.size


func fire_center() -> Vector2:
	var s := screen_size()
	return Vector2(s.x - 170, s.y - 170)


func reload_center() -> Vector2:
	var s := screen_size()
	return Vector2(s.x - 345, s.y - 95)


func jump_center() -> Vector2:
	var s := screen_size()
	return Vector2(s.x - 95, s.y - 345)


func stick_rest() -> Vector2:
	return Vector2(190, screen_size().y - 190)


func _input(event: InputEvent) -> void:
	if overlay_open:
		var tapped: bool = (event is InputEventScreenTouch and event.pressed) or (event is InputEventMouseButton and event.pressed)
		if tapped and Time.get_ticks_msec() / 1000.0 >= overlay_ready_at:
			start_pressed.emit()
			get_viewport().set_input_as_handled()
		return
	if player == null or player.dead:
		return
	if event is InputEventScreenTouch:
		if event.pressed:
			_touch_down(event.index, event.position)
		else:
			_touch_up(event.index)
	elif event is InputEventScreenDrag:
		_touch_drag(event.index, event.position, event.relative)


func _touch_down(index: int, pos: Vector2) -> void:
	if pos.distance_to(fire_center()) < 100.0:
		fire_finger = index
		player.touch_fire = true
	elif pos.distance_to(reload_center()) < 60.0:
		player.start_reload()
	elif pos.distance_to(jump_center()) < 60.0:
		player.jump_requested = true
	elif pos.x < screen_size().x * LEFT_ZONE and stick_finger == -1:
		stick_finger = index
		stick_origin = pos
		controls.stick_knob = Vector2.ZERO
	else:
		look_fingers[index] = true


func _touch_up(index: int) -> void:
	if index == stick_finger:
		stick_finger = -1
		controls.stick_knob = Vector2.ZERO
		player.move_input = Vector2.ZERO
	if index == fire_finger:
		fire_finger = -1
		player.touch_fire = false
	look_fingers.erase(index)


func _touch_drag(index: int, pos: Vector2, relative: Vector2) -> void:
	if index == stick_finger:
		var offset := (pos - stick_origin).limit_length(STICK_RADIUS)
		controls.stick_knob = offset
		player.move_input = offset / STICK_RADIUS
	elif index == fire_finger or look_fingers.has(index):
		player.look(relative * LOOK_SENSITIVITY)


func _release_all() -> void:
	stick_finger = -1
	fire_finger = -1
	look_fingers.clear()
	if controls:
		controls.stick_knob = Vector2.ZERO
	if player:
		player.move_input = Vector2.ZERO
		player.touch_fire = false


# --- Drawn widgets ----------------------------------------------------------

class TouchControls extends Control:
	var hud
	var stick_knob := Vector2.ZERO

	func _process(_delta: float) -> void:
		visible = not hud.overlay_open
		queue_redraw()

	func _draw() -> void:
		var font := get_theme_default_font()
		var base: Vector2 = hud.stick_origin if hud.stick_finger != -1 else hud.stick_rest()
		draw_circle(base, STICK_RADIUS, Color(1, 1, 1, 0.08))
		draw_arc(base, STICK_RADIUS, 0, TAU, 48, Color(1, 1, 1, 0.35), 3.0)
		draw_circle(base + stick_knob, 38, Color(1, 1, 1, 0.35))
		var firing: bool = hud.fire_finger != -1
		_button(font, hud.fire_center(), 85, "FIRE", Color(0.95, 0.3, 0.2, 0.55 if firing else 0.35), 26)
		_button(font, hud.reload_center(), 50, "R", Color(1, 1, 1, 0.25), 30)
		_button(font, hud.jump_center(), 50, "JUMP", Color(1, 1, 1, 0.25), 20)

	func _button(font: Font, center: Vector2, radius: float, text: String, color: Color, size: int) -> void:
		draw_circle(center, radius, color)
		draw_arc(center, radius, 0, TAU, 48, Color(1, 1, 1, 0.6), 3.0)
		var w := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
		draw_string(font, center + Vector2(-w / 2, size * 0.35), text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, Color(1, 1, 1, 0.9))


class Crosshair extends Control:
	var hud
	var hit_time := 0.0
	var hit_color := Color.WHITE

	func _process(delta: float) -> void:
		hit_time = maxf(hit_time - delta, 0.0)
		visible = not hud.overlay_open
		queue_redraw()

	func _draw() -> void:
		var c := size / 2
		var gap := 8.0
		if hud.player:
			gap += hud.player.recoil * 250.0
			if hud.player.reloading:
				gap += 10.0
		var col := Color(1, 1, 1, 0.85)
		for d in [Vector2.UP, Vector2.DOWN, Vector2.LEFT, Vector2.RIGHT]:
			draw_line(c + d * gap, c + d * (gap + 12), Color(0, 0, 0, 0.5), 4.0)
			draw_line(c + d * gap, c + d * (gap + 12), col, 2.0)
		if hit_time > 0.0:
			var a := hit_time / 0.18
			var hc := Color(hit_color, a)
			for d in [Vector2(1, 1), Vector2(-1, 1), Vector2(1, -1), Vector2(-1, -1)]:
				draw_line(c + d * 7, c + d * 16, hc, 3.0)


class DamageRing extends Control:
	var hud
	var marks: Array = []

	func add(angle: float) -> void:
		marks.append([angle, 1.0])

	func _process(delta: float) -> void:
		for m in marks:
			m[1] -= delta * 1.2
		marks = marks.filter(func(m): return m[1] > 0.0)
		queue_redraw()

	func _draw() -> void:
		var c := size / 2
		for m in marks:
			var angle: float = m[0] - PI / 2
			draw_arc(c, 140, angle - 0.35, angle + 0.35, 16, Color(1, 0.15, 0.1, m[1] * 0.8), 10.0)
