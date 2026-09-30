# Witherholm

A small first-person survival horror game made with plain HTML, CSS and JavaScript,
using [three.js](https://threejs.org) (MIT) for WebGL and a stack of custom GLSL shaders.

Your sister stopped writing from the Witherholm estate. Inside, a fungus the family calls
*the Bloom* has turned the household into shambling husks. Find the keys, get through the
east wing, face the lady of the house in the chapel, and get out the front door alive.

Everything is original: the story, characters, map, textures (painted on canvas at load
time) and sound (synthesised with the Web Audio API). There are no image or audio files.

## Play

Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari). No build step and no
server needed, but you do need an internet connection the first time so three.js and the
fonts can load from their CDNs.

If you'd rather serve it: `npx http-server .` and open the printed address.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | `W A S D` | left stick |
| Look | mouse (click the game to capture it) | drag on the right side |
| Shoot | left click | FIRE |
| Aim (slower, steadier) | right click | AIM |
| Reload | `R` | RELOAD |
| Interact / read / open | `E` | USE |
| Run | `Shift` | RUN, or push the stick all the way |
| Quick 180° turn | `Q` | TURN |
| Switch weapon | `1` / `2` | SWAP |
| Use a healing herb | `H` | HERB |
| Flashlight on/off | `F` | LIGHT |
| Pause & settings | `Esc` | II |

Tips: headshots do more than double damage. Monsters can't open doors. Running is loud.
The glowing thing in the Matron's chest is her weak spot. The game saves a checkpoint every
time you pick up a key or unlock a door.

## What's in the shaders

* **Post-processing** (`js/shaders.js`): the scene renders to a low-resolution target and is
  upscaled with barrel distortion, chromatic aberration, film grain, scanlines, a cold/warm
  colour grade, ordered (Bayer) dithering with colour quantisation, a heartbeat vignette at low
  health, and blood at the screen edges when you're hit.
* **Infected surfaces**: every wall, floor and prop gets fungal mould mixed in by 3D noise. It
  glows faintly and grows thicker the closer you get to the chapel.
* **Flesh**: monsters breathe (noise-driven vertex displacement), have pulsing glowing veins,
  flash when hit, and burn away with a glowing dissolve edge when they die.
* **Dust in the beam**: floating motes that are only visible inside your flashlight cone.
* Flashlight with real-time shadows, flickering candles and a strobing kitchen tube light.

## Files

```
index.html        page layout, HUD and menus
style.css         styling for HUD, menus, notes and touch controls
js/audio.js       procedural sound: drones, footsteps, guns, groans, heartbeat
js/textures.js    procedural canvas textures (wallpaper, wood, tile, stone, books...)
js/shaders.js     GLSL: post-processing, mould, flesh, dust, particles
js/level.js       ASCII map, level geometry, lights, collision, line of sight, pathfinding
js/entities.js    doors, items, notes, blood decals
js/monsters.js    Husk, Crawler and the Matron: models, AI and animation
js/player.js      movement, weapons, view model, keyboard/mouse/touch input
js/ui.js          heart monitor, messages, objectives, note reader
js/main.js        game state, story events, checkpoints, render loop
```

The map is a plain text grid at the top of `js/level.js`, with a legend, so it's easy to
rearrange rooms or add your own.
