# Strike Zone 2

A browser-based tactical 5v5 bomb-defusal shooter in the style of Counter-Strike 2: a desert map with long corridors, tunnels and two bomb sites; a round-based economy with a buy menu; learnable recoil patterns; and a full squad of bots on each side.

Everything is generated in code: textures, 3D models, weapon icons and sounds. There are no image or audio files.

## Play

Open **`index.html`** in a modern desktop browser (Chrome, Edge or Firefox). Double-clicking the file works. It needs an internet connection the first time, to load three.js and the fonts from a CDN.

Click **GO**, then click the game to capture the mouse.

| Action | Key |
| --- | --- |
| Move / jump | `W` `A` `S` `D` / `Space` |
| Crouch / walk (silent) | `Ctrl` or `C` / `Shift` |
| Fire / scope or alt attack | `Mouse 1` / `Mouse 2` |
| Reload / inspect | `R` / `F` |
| Use, plant, defuse, pick up | `E` (hold to plant or defuse) |
| Buy menu | `B`. Click an item, or press a category number then an item number, e.g. `3` `3` = AK-47 |
| Weapons | `1` primary, `2` pistol, `3` knife, `4` grenades, `5` C4, `Q` last weapon, `G` drop, mouse wheel |
| Scoreboard / pause | `Tab` / `Esc` |

Tip: use **Fullscreen** from the pause menu if you crouch with `Ctrl`. It stops `Ctrl+W` from closing the tab.

Touch devices get on-screen controls: a joystick, drag-to-look, and buttons.

## Features

- **Dust Zero map**: Long A with long doors, catwalk/short, mid with mid doors, upper and lower B tunnels, and raised bomb sites A and B with crates. It also has baked ambient occlusion, sun shadows, a sky and image-based lighting.
- **Competitive rules**: MR12 (first to 13) or short MR8. Includes freeze time, buy time, a 1:55 round timer, a 40-second C4 timer, 10-second defuses (5 with a kit), halftime side switching, CS-style loss bonuses, kill rewards and MVPs.
- **Weapons**: Glock-18, USP-S, P250, Desert Eagle, MAC-10, MP9, Nova, Galil AR, FAMAS, AK-47, M4A4, M4A1-S, SSG 08 and AWP (with a 2-level scope), plus a knife with backstabs. Grenades are HE, flashbang (with an afterimage and ear ringing) and smoke (blocks vision, including the bots').
- **Gunplay**: Source-style movement with counter-strafing and air-strafing. Accuracy depends on movement, crouching and jumping. Each rifle has a spray pattern, and hitboxes take damage multipliers (4× headshots) and armor penetration.
- **Bots**: They buy by economy, and Terrorists pick a site and route while Counter-Terrorists spread out and rotate. They plant, retake and defuse, react with human-like delay and aim error, burst-fire at range and call out enemies over radio. There are four difficulty levels.
- **HUD in the CS2 layout**: rotating radar with spotted enemies, top bar with team avatars and timer, killfeed with headshot icons, health/armor/ammo, weapon inventory, scoreboard, death panel, damage direction indicators and spectator mode.
- **Viewmodels**: first-person arms and gloves with draw, recoil, reload (the magazine comes out), inspect, bob and sway animations, plus muzzle flash and ejected shells.
- **Audio**: all sounds are synthesized with the Web Audio API and positioned in 3D. Browser text-to-speech provides the announcer.
- **Settings**: sensitivity, crosshair editor, volume, graphics quality (auto-lowers if FPS is poor) and an FPS counter.

## Development

The source lives in `js/` as ES modules and `dev.html` is the development page:

```sh
python3 -m http.server 8000   # then open http://localhost:8000/dev.html
node build.mjs                # bundle dev.html + js/*.js into the standalone index.html
```

| File | Purpose |
| --- | --- |
| `js/main.js` | renderer, lighting, sky, menus, input, camera, main loop |
| `js/game.js` | actors, movement physics, shooting, grenades, bomb, rounds, economy |
| `js/bots.js` | bot AI |
| `js/world.js` | map layout, geometry, collision, raycasting, A* navigation |
| `js/weapons.js` | weapon stats, recoil patterns, procedural models, icons |
| `js/characters.js` | soldier models, arm IK, first-person arms |
| `js/viewmodel.js` | first-person weapon rendering and animation |
| `js/effects.js` | particles, decals, tracers, smoke |
| `js/hud.js` | HUD, radar, buy menu, scoreboard |
| `js/audio.js` | procedural sound effects |
| `js/textures.js` | procedural canvas textures |

This is a fan-made tribute and is not affiliated with or endorsed by Valve.
