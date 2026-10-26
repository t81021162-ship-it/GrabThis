# Robot Strike

A 3D first-person shooter for Android made with Godot 4.3. Fight waves of
hostile robots in a ruined arena. Each wave brings more of them, and tougher
types join as you go.

**Download:** [`build/RobotStrike.apk`](build/RobotStrike.apk). On your phone,
open the file and allow installing from unknown sources when asked.

## Controls

| Touch | Action |
|---|---|
| Left side of the screen | Floating move stick (push all the way forward to sprint) |
| Right side of the screen | Drag to look |
| FIRE | Shoot (drag on it to aim while firing) |
| R | Reload |
| JUMP | Jump |

On a PC: WASD to move, mouse to look, left click to fire, R to reload, Space to jump, Shift to sprint.

## Enemies

- **Drone** (yellow): small and fast, weak armor.
- **Trooper** (grey): the standard robot soldier.
- **Heavy** (red): big, slow, lots of armor, fires 3-shot bursts. Shows up from wave 3.

Headshots do double damage and score 1.5x points. Your health regenerates
after a few seconds out of fire.

## Building

```sh
./build_apk.sh
```

Needs Godot 4.3 with the Android export templates, plus an Android SDK path
(build-tools with `apksigner` and `zipalign`) set in Godot's editor settings.
The included keystore is for sideloading only; make your own private key
before publishing to a store.

`tools/` holds dev-only scripts that play the game automatically and save
screenshots. They are left out of the APK.
