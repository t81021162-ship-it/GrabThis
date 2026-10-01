# Witherholm

A first-person survival horror game made with plain HTML, CSS and JavaScript, using
[three.js](https://threejs.org) (MIT) for WebGL and a stack of custom GLSL shaders.

You are **Nell Corvin**, a district nurse. Three weeks ago your sister Mara took a post at
Witherholm, a house out on the moor. Her last letter was one line long: *Come now, Nell. Bring
your lamp.* Inside, a fungus the household calls the Bloom has been eating the house from the
cellar up. Read the papers, find the keys, get past the lady of the house, and decide what to do
about your sister. There are three endings.

Everything is original: the story, characters, map, textures (painted on canvas at load time)
and sound (synthesised with the Web Audio API). There are no image or audio files.

## Play

Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari). No build step and no
server needed. three.js is included in `vendor/`. Fonts come from Google Fonts when you are online
and fall back to system fonts when you are not.

Want one file to share? `python3 tools/build.py` writes `dist/witherholm.html`, with three.js, the
CSS and every script inlined. A built copy is already in `dist/`.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | `W A S D` | left stick |
| Look | mouse (click the game to capture it) | drag on the right side |
| Shoot | left click | FIRE |
| Aim (slower, steadier) | right click | AIM |
| Reload | `R` | RELOAD |
| Interact / read / open / save | `E` | USE |
| Run | `Shift` | RUN, or push the stick all the way |
| Quick 180° turn | `Q` | TURN |
| Switch weapon | `1` / `2` | SWAP |
| Use a healing herb | `H` | HERB |
| Flashlight on/off | `F` | LIGHT |
| Pause, settings, reread papers | `Esc` | II |

Tips: headshots do more than double damage. Running is loud. Wind a gramophone to save your
progress (it also saves when you pick up a key or unlock a door). **Hollows freeze in the beam of
your lamp and sprint when it is off or pointed elsewhere.** Not every voice in the house is your
sister, even when it sounds like her.

## What is in it

* **A story told through the house**: a typewriter intro, five chapters, fifteen papers you can
  reread from the pause menu (Files), things Nell says out loud as she enters rooms, and a voice
  that sounds like Mara.
* **A choice and three endings**: what you carry, and what you are willing to spend, decides which
  ones you can reach. Your endings are remembered between runs.
* **Places**: foyer, dining room, kitchen, pantry, hall, library, glasshouse, study, chapel, and the
  roots under it.
* **Creatures**: Husks (servants and guests, each with a painted face), Crawlers, Tomas the cook,
  Hollows (pale, eyeless, stopped by light), and the Matron, who spits spores and grows tendrils
  when angry.
* **Two looks**: *Cinematic* (smooth textures, bloom, soft grain) and *Retro 1998* (chunky pixels,
  dither, scanlines). Detail runs from 240p to 720p.

## What is in the graphics

* **Surfaces** (`js/textures.js`, `js/level.js`): every texture gets a generated normal map, so the
  flashlight rakes across real grooves in wood, brick and bark. Ambient occlusion is baked into the
  vertices, so corners darken. Baseboards and crown moulding frame every wood-panelled room.
* **Light** (`js/level.js`, `js/fx.js`): a pool of six real lights is shared among sixteen places by
  distance, so every room has its own light without a performance cost. The flashlight casts shadows
  through a beam texture. Moonlit windows throw shafts of light, a stained-glass rose window lights
  the chapel, low mist drifts across floors, and lightning lifts the whole house for a moment.
* **Post-processing** (`js/shaders.js`): bloom, barrel distortion, chromatic aberration, colour
  grading, film grain, a heartbeat vignette at low health, blood at the edges when hit.
* **The Bloom** (`js/shaders.js`, `js/props.js`): mould grows on every surface by 3D noise, glows, and
  creeps outward as the story goes on. Flesh breathes through vertex displacement, has pulsing
  veins, and burns away with a glowing edge when it dies. Spores hang in infected air.
* **Speed**: static furniture is merged into a few meshes per room-sized chunk, bullets use a grid
  ray instead of triangle tests, and what is behind a wall is not drawn.

## Files

```
index.html        page layout, HUD and menus
style.css         styling for HUD, menus, notes, choice and touch controls
vendor/           three.js r149 (MIT)
tools/build.py    bundles everything into dist/witherholm.html
js/story.js       all the writing: intro, notes, thoughts, whispers, chapters, endings
js/audio.js       procedural sound: rain, thunder, drones, music box, footsteps, guns, groans
js/textures.js    procedural canvas textures and normal maps
js/shaders.js     GLSL: post-processing, mould, flesh, mist, light shafts, spores, particles
js/fx.js          light shafts, mist, fire and the storm
js/level.js       ASCII map, geometry, windows, lights, collision, line of sight, pathfinding
js/props.js       furniture, fungus, vines, plants and the Root
js/entities.js    doors, items, gramophones, blood decals
js/monsters.js    every creature: models, AI and animation
js/player.js      movement, weapons, view model, keyboard/mouse/touch input
js/ui.js          HUD, heart monitor, chapters, subtitles, choice panel, Files, intro, endings
js/main.js        game state, story flow, checkpoints, escape sequences, render loop
```

The map is a plain text grid at the top of `js/level.js`, with a legend, so it is easy to
rearrange rooms or add your own.
