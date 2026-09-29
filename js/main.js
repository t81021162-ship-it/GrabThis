// Entry point: renderer, lighting, menus, input handling, camera and the main loop.
import * as THREE from 'three';
import { buildTextures } from './textures.js';
import { World } from './world.js';
import { buildIcons } from './weapons.js';
import { Effects } from './effects.js';
import { Sound } from './audio.js';
import { HUD } from './hud.js';
import { ViewModel } from './viewmodel.js';
import { Game } from './game.js';
import { CharacterModel } from './characters.js';

const $ = id => document.getElementById(id);
const DEG = Math.PI / 180;
const BASE_VFOV = 73.74; // CS: 90° horizontal at 4:3
const isTouch = matchMedia('(pointer: coarse)').matches && 'ontouchstart' in window;

// ------------------------------------------------ settings
const DEFAULTS = {
  name: 'Player', sens: 1.6, freezeTime: 8, invert: false, volume: 0.7, voice: true, quality: isTouch ? 0 : 2,
  xhColor: '#4cff4c', xhSize: 5, xhGap: 2, xhThick: 2, xhDynamic: true, xhDot: false, fps: false,
  mode: 24, side: 'CT', diff: 'normal',
};
let settings = { ...DEFAULTS };
try { Object.assign(settings, JSON.parse(localStorage.getItem('sz2-settings') || '{}')); } catch (e) { /* storage unavailable */ }
const saveSettings = () => { try { localStorage.setItem('sz2-settings', JSON.stringify(settings)); } catch (e) { /* ignore */ } };

const setMsg = t => { $('loadMsg').textContent = t; return new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); };

// ------------------------------------------------ globals
let renderer, scene, camera, sun, hemi, sky, T, world, effects, sound, hud, vm, game = null, icons;
let state = 'loading', paused = false, buyOpen = false, menuFromPause = false;
const keys = {}, mouse = {};
let mouseDX = 0, mouseDY = 0;
const sunDir = new THREE.Vector3(-0.45, 0.82, 0.38).normalize();
let sunVis = 1;
let specIdx = 0;
const touch = { move: { x: 0, y: 0 }, fire: false, fire2: false, jump: false, crouch: false, use: false };

async function boot() {
  await setMsg('Starting renderer…');
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.domElement.id = 'gl';
  document.body.prepend(renderer.domElement);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd7d2c3, 70, 300);
  camera = new THREE.PerspectiveCamera(BASE_VFOV, innerWidth / innerHeight, 0.05, 800);
  camera.rotation.order = 'YXZ';

  hemi = new THREE.HemisphereLight(0xcfe0ff, 0x9c8160, 0.55);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffe9c7, 3.3);
  sun.position.copy(sunDir).multiplyScalar(120);
  sun.shadow.camera.left = -85; sun.shadow.camera.right = 85; sun.shadow.camera.top = 85; sun.shadow.camera.bottom = -85;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 300;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);

  // sky dome
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color(0x3f78c0) }, horizon: { value: new THREE.Color(0xe2dccb) }, bottom: { value: new THREE.Color(0xb7a584) }, sunDir: { value: sunDir } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, horizon, bottom, sunDir; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = mix(horizon, top, pow(max(h, 0.0), 0.55));
        if (h < 0.0) c = mix(horizon, bottom, min(1.0, -h * 5.0));
        float s = max(dot(d, sunDir), 0.0);
        c += vec3(1.0, 0.92, 0.75) * pow(s, 900.0) * 6.0 + vec3(1.0, 0.85, 0.6) * pow(s, 12.0) * 0.35;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat);
  sky.renderOrder = -1;
  scene.add(sky);

  // image-based lighting from a procedural desert sky (gives metals something to reflect)
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { sunDir: { value: sunDir } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 sunDir; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 top = vec3(0.16, 0.32, 0.62), hor = vec3(0.85, 0.78, 0.64), gnd = vec3(0.42, 0.32, 0.2);
        vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.6)) : mix(hor * 0.8, gnd, min(1.0, -h * 3.0));
        c += vec3(1.0, 0.9, 0.7) * pow(max(dot(d, sunDir), 0.0), 48.0) * 6.0;
        gl_FragColor = vec4(c, 1.0); }`,
  })));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(envScene, 0.02).texture;
  scene.environment = envTex;

  await setMsg('Generating textures…');
  T = buildTextures();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  for (const t of Object.values(T).flat()) if (t && t.isTexture) t.anisotropy = maxAniso;
  await setMsg('Building Dust Zero…');
  world = new World();
  world.build(scene, T, settings.quality);
  await setMsg('Preparing weapons…');
  icons = buildIcons(renderer);
  sound = new Sound();
  sound.volume = settings.volume; sound.voiceOn = settings.voice;
  effects = new Effects(scene, T, sound);
  vm = new ViewModel(T);
  vm.scene.environment = envTex;
  hud = new HUD(icons, world, sound);
  hud.settings = settings;
  applyQuality();
  setupMenu();
  setupInput();
  setupTouch();
  onResize();
  addEventListener('resize', onResize);
  drawMapThumb();
  $('loading').classList.add('hidden');
  showMenu('play');
  state = 'menu';
  last = performance.now();
  requestAnimationFrame(frame);
  window.__sz = { get game() { return game; }, world, scene, camera, renderer, startMatch, settings };
}

function applyQuality() {
  const q = +settings.quality;
  const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(q === 0 ? Math.min(dpr, 0.85) : q === 1 ? Math.min(dpr, 1) : Math.min(dpr, 1.5));
  sun.castShadow = q > 0;
  const size = q === 2 ? 4096 : 2048;
  if (sun.shadow.mapSize.x !== size) {
    sun.shadow.mapSize.set(size, size);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  onResize();
}

function onResize() {
  if (!renderer) return;
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  const dc = $('dmgCanvas'); dc.width = innerWidth; dc.height = innerHeight;
  const ff = $('flashFreeze'); ff.width = Math.round(innerWidth / 2); ff.height = Math.round(innerHeight / 2);
}

function drawMapThumb() {
  const c = $('mapThumb'), img = world.radarImage(4);
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
}

// ------------------------------------------------ menus
function showMenu(page) {
  $('menu').classList.remove('hidden');
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('on', t.dataset.page === page);
  for (const pg of document.querySelectorAll('[data-pg]')) pg.classList.toggle('hidden', pg.dataset.pg !== page);
  $('goBtn').textContent = menuFromPause ? 'RESUME' : 'GO';
  $('menuName').textContent = settings.name;
}

function setupMenu() {
  for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => { sound.init(); sound.ui(); showMenu(t.dataset.page); });
  const chipGroups = { mode: 'mode', side: 'side', diff: 'diff' };
  for (const grp of document.querySelectorAll('.chips')) {
    const key = chipGroups[grp.dataset.opt];
    for (const ch of grp.children) {
      ch.classList.toggle('on', String(settings[key]) === ch.dataset.v);
      ch.addEventListener('click', () => {
        sound.init(); sound.ui();
        for (const c2 of grp.children) c2.classList.remove('on');
        ch.classList.add('on');
        settings[key] = key === 'mode' ? +ch.dataset.v : ch.dataset.v;
        saveSettings();
      });
    }
  }
  $('goBtn').addEventListener('click', () => {
    sound.init();
    if (menuFromPause && game) { menuFromPause = false; $('menu').classList.add('hidden'); resume(); return; }
    startMatch();
  });
  // settings bindings
  const bind = (id, key, fmt = v => v, parse = v => v, after) => {
    const el = $(id);
    el.value = typeof settings[key] === 'boolean' ? (settings[key] ? '1' : '0') : settings[key];
    const vEl = $(id.replace('set', 'val'));
    if (vEl) vEl.textContent = fmt(settings[key]);
    el.addEventListener('input', () => {
      settings[key] = parse(el.value);
      if (vEl) vEl.textContent = fmt(settings[key]);
      saveSettings();
      if (after) after();
    });
  };
  const num = v => +v, bool = v => v === '1';
  bind('setName', 'name', v => v, v => v.trim().slice(0, 16) || 'Player', () => { $('menuName').textContent = settings.name; });
  bind('setSens', 'sens', v => (+v).toFixed(2), num);
  bind('setFreeze', 'freezeTime', v => v, num);
  bind('setInvert', 'invert', v => v, bool);
  bind('setVol', 'volume', v => Math.round(v * 100), num, () => sound.setVolume(settings.volume));
  bind('setVoice', 'voice', v => v, bool, () => { sound.voiceOn = settings.voice; });
  bind('setQuality', 'quality', v => v, num, applyQuality);
  bind('setFps', 'fps', v => v, bool, () => { $('fps').style.display = settings.fps ? 'block' : 'none'; });
  bind('setXhColor', 'xhColor');
  bind('setXhSize', 'xhSize', v => v, num);
  bind('setXhGap', 'xhGap', v => v, num);
  bind('setXhThick', 'xhThick', v => v, num);
  bind('setXhDyn', 'xhDynamic', v => v, bool);
  bind('setXhDot', 'xhDot', v => v, bool);
  $('fps').style.display = settings.fps ? 'block' : 'none';

  $('pResume').addEventListener('click', resume);
  $('pFull').addEventListener('click', () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) (el.requestFullscreen ? el.requestFullscreen() : Promise.resolve()).then(() => {
      if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock().catch(() => {});
    }).catch(() => {});
    else document.exitFullscreen();
  });
  $('pSettings').addEventListener('click', () => { menuFromPause = true; $('pause').classList.remove('show'); showMenu('settings'); });
  $('pQuit').addEventListener('click', quitToMenu);
  $('moBtn').addEventListener('click', quitToMenu);
}

function destroyGame() {
  if (!game) return;
  for (const a of game.actors) scene.remove(a.model.root);
  for (const it of game.items) scene.remove(it.mesh);
  for (const g of game.grenades) scene.remove(g.mesh);
  if (game.bomb) scene.remove(game.bomb.mesh);
  if (game.droppedBomb) scene.remove(game.droppedBomb.mesh);
  effects.clearRound();
  game = null;
}

function startMatch() {
  destroyGame();
  sound.init();
  let side = settings.side;
  if (side === 'R') side = Math.random() < 0.5 ? 'T' : 'CT';
  game = new Game({ scene, world, T, sound, effects, hud, vm, settings, camera });
  game.onMatchOver = showMatchOver;
  game.start({ side, difficulty: settings.diff, maxRounds: settings.mode });
  hud.onBuy = id => {
    const err = game.buy(game.player, id);
    if (err) { sound.deny(); hud.hint(err, 1.5); }
    hud.refreshBuy(game);
  };
  $('killfeed').innerHTML = ''; $('chat').innerHTML = '';
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (menuAgent) menuAgent.root.visible = false;
  perf.start = 0; perf.frames = 0; perf.drops = 0;
  $('matchOver').classList.remove('show');
  if (isTouch) $('touch').classList.add('on');
  state = 'playing'; paused = false; menuFromPause = false;
  lockPointer();
}

function showMatchOver() {
  const p = game.player;
  const my = game.score[p.squad], them = game.score[1 - p.squad];
  $('moTitle').textContent = my > them ? 'Victory' : my < them ? 'Defeat' : 'Draw';
  $('moTitle').style.color = my > them ? '#8fdc6a' : my < them ? '#ff6a5a' : '#fff';
  $('moScore').textContent = `${my} : ${them}`;
  $('matchOver').classList.add('show');
  hud.scoreboard(game, true);
  document.exitPointerLock && document.exitPointerLock();
}

function quitToMenu() {
  destroyGame();
  paused = false; buyOpen = false; menuFromPause = false;
  $('pause').classList.remove('show'); $('buymenu').classList.remove('show'); $('matchOver').classList.remove('show');
  $('scoreboard').classList.remove('show');
  $('hud').classList.add('hidden'); $('touch').classList.remove('on');
  $('scope').classList.remove('show');
  $('flash').style.opacity = 0; $('flashFreeze').style.opacity = 0; $('lowhp').style.opacity = 0;
  vm.visible = false;
  state = 'menu';
  document.body.classList.remove('ingame');
  document.exitPointerLock && document.exitPointerLock();
  showMenu('play');
}

function pause() {
  if (state !== 'playing' || paused || !game || game.phase === 'over') return;
  paused = true;
  for (const k in keys) keys[k] = false;
  for (const k in mouse) mouse[k] = false;
  $('pause').classList.add('show');
}
function resume() {
  paused = false;
  $('pause').classList.remove('show');
  lockPointer();
}

// Pointer lock can be refused (sandboxed iframes, or re-locking too quickly). After repeated
// failures fall back to plain mouse-move look so the game stays playable.
let fallbackLook = false, lockErrors = 0;
function lockPointer() {
  if (isTouch) return;
  const c = renderer.domElement;
  try {
    const r = c.requestPointerLock && c.requestPointerLock();
    if (r && r.catch) r.catch(() => {});
  } catch (e) { if (++lockErrors >= 2) fallbackLook = true; }
}
const locked = () => document.pointerLockElement === renderer.domElement;

function toggleBuy(force) {
  if (!game) return;
  const open = force !== undefined ? force : !buyOpen;
  if (open && (!game.player.alive || game.phase === 'over')) return;
  buyOpen = open;
  hud.buyCat = 0;
  $('buymenu').classList.toggle('show', open);
  if (open) { hud.refreshBuy(game); for (const k in mouse) mouse[k] = false; document.exitPointerLock && document.exitPointerLock(); }
  else lockPointer();
}

// ------------------------------------------------ input
function setupInput() {
  const c = renderer.domElement;
  addEventListener('keydown', e => {
    if (state !== 'playing') return;
    if (['Tab', 'Space', 'KeyB', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code) || e.ctrlKey) e.preventDefault();
    if (e.code === 'Escape') {
      if (buyOpen) toggleBuy(false);
      else if (paused) resume();
      else if (!locked()) pause();
      return;
    }
    if (paused || !game) return;
    if (e.repeat) return;
    keys[e.code] = true;
    const p = game.player;
    if (e.code === 'KeyB') { toggleBuy(); return; }
    if (e.code === 'Tab') { hud.scoreboard(game, true); return; }
    if (buyOpen) {
      // CS-style number buying: category digit, then item digit
      if (e.code.startsWith('Digit')) {
        const n = +e.code.slice(5);
        if (!hud.buyCat) { if (n >= 1 && n <= 5) hud.buyCat = n; else sound.deny(); }
        else { const id = hud.buyKeys[`${hud.buyCat}${n}`]; hud.buyCat = 0; if (id) hud.onBuy(id); else sound.deny(); }
        sound.ui();
        hud.refreshBuy(game);
      }
      return;
    }
    if (!p.alive) {
      if (e.code === 'Space') nextSpectate();
      return;
    }
    if (e.code.startsWith('Digit')) { const n = +e.code.slice(5); if (n >= 1 && n <= 5) p.select(n); }
    if (e.code === 'KeyQ') { const ls = p.lastSlot; if (ls && (ls === 4 ? p.inv[4].length : p.inv[ls])) p.select(ls); }
    if (e.code === 'KeyR') p.startReload();
    if (e.code === 'KeyF') vm.inspect();
    if (e.code === 'KeyG') { if (p.slot === 1 || p.slot === 2 || p.slot === 5) game.dropWeapon(p, p.slot); }
    if (e.code === 'KeyE') game.tryPickup(p);
  });
  addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'Tab' && game) hud.scoreboard(game, false);
  });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; for (const k in mouse) mouse[k] = false; });
  c.addEventListener('mousedown', e => {
    if (state !== 'playing' || paused || buyOpen) return;
    sound.init();
    if (!locked() && !fallbackLook) { lockPointer(); return; }
    mouse[e.button] = true;
    if (game && !game.player.alive && e.button === 0) nextSpectate();
  });
  addEventListener('mouseup', e => { mouse[e.button] = false; });
  addEventListener('contextmenu', e => { if (state === 'playing') e.preventDefault(); });
  addEventListener('mousemove', e => {
    if (state !== 'playing' || paused || buyOpen || !game) return;
    if (!locked() && !fallbackLook) return;
    look(e.movementX || 0, e.movementY || 0);
  });
  addEventListener('wheel', e => {
    if (state !== 'playing' || paused || buyOpen || !game || !game.player.alive) return;
    const p = game.player, order = [1, 2, 3, 4, 5].filter(s => s === 3 || (s === 4 ? p.inv[4].length : p.inv[s]));
    const i = order.indexOf(p.slot);
    const n = order[(i + (e.deltaY > 0 ? 1 : -1) + order.length) % order.length];
    p.select(n);
  }, { passive: true });
  document.addEventListener('pointerlockchange', () => {
    if (locked()) { lockErrors = 0; fallbackLook = false; }
    if (!locked() && state === 'playing' && !buyOpen && !paused && game && game.phase !== 'over') pause();
  });
  document.addEventListener('pointerlockerror', () => {
    if (++lockErrors >= 2) fallbackLook = true;
    else if (state === 'playing' && hud) hud.hint('Click to capture the mouse', 2);
  });
}

function look(dx, dy) {
  const p = game.player;
  if (!p.alive) return;
  let scale = settings.sens * 0.022 * DEG;
  if (p.zoom > 0) scale *= p.curDef.scope[p.zoom - 1] / 90;
  p.yaw -= dx * scale;
  p.pitch -= dy * scale * (settings.invert ? -1 : 1);
  p.pitch = Math.max(-89 * DEG, Math.min(89 * DEG, p.pitch));
  mouseDX += dx; mouseDY += dy;
}

function setupTouch() {
  if (!isTouch) return;
  const joy = $('joy'), knob = $('joyKnob');
  let joyId = null, cx = 0, cy = 0, lookId = null, lx = 0, ly = 0;
  joy.addEventListener('touchstart', e => { const t = e.changedTouches[0]; joyId = t.identifier; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; e.preventDefault(); }, { passive: false });
  const lz = $('lookZone');
  lz.addEventListener('touchstart', e => { const t = e.changedTouches[0]; lookId = t.identifier; lx = t.clientX; ly = t.clientY; sound.init(); e.preventDefault(); }, { passive: false });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        let dx = (t.clientX - cx) / 50, dy = (t.clientY - cy) / 50;
        const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
        touch.move.x = dx; touch.move.y = -dy;
        knob.style.transform = `translate(${dx * 45}px, ${dy * 45}px)`;
      } else if (t.identifier === lookId && game) {
        look((t.clientX - lx) * 2.2, (t.clientY - ly) * 2.2);
        lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: false });
  addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) { joyId = null; touch.move.x = touch.move.y = 0; knob.style.transform = ''; }
      if (t.identifier === lookId) lookId = null;
    }
  });
  for (const b of document.querySelectorAll('#touch .tbtn')) {
    const k = b.dataset.k;
    b.addEventListener('touchstart', e => {
      e.preventDefault(); sound.init();
      if (!game) return;
      const p = game.player;
      if (k === 'next') { const order = [1, 2, 3, 4, 5].filter(s => s === 3 || (s === 4 ? p.inv[4].length : p.inv[s])); p.select(order[(order.indexOf(p.slot) + 1) % order.length]); }
      else if (k === 'reload') p.startReload();
      else if (k === 'buy') toggleBuy();
      else if (k === 'score') hud.scoreboard(game, !$('scoreboard').classList.contains('show'));
      else { touch[k] = true; if (k === 'use') game.tryPickup(p); if (!p.alive && k === 'fire') nextSpectate(); }
    }, { passive: false });
    b.addEventListener('touchend', e => { e.preventDefault(); if (k in touch) touch[k] = false; }, { passive: false });
  }
}

function applyInput() {
  const p = game.player, inp = p.input;
  if (!p.alive) return;
  const ui = paused || buyOpen;
  const fwd = ui ? 0 : (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) + touch.move.y;
  const side = ui ? 0 : (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + touch.move.x;
  const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
  inp.move.set(-sy * fwd + cy * side, 0, -cy * fwd - sy * side);
  inp.walk = !!(keys.ShiftLeft || keys.ShiftRight);
  inp.crouch = !!(keys.ControlLeft || keys.ControlRight || keys.KeyC || touch.crouch);
  inp.jump = !!(keys.Space || touch.jump) && !ui;
  inp.fire = !!(mouse[0] || touch.fire) && !ui;
  inp.fire2 = !!(mouse[2] || touch.fire2) && !ui;
  inp.use = !!(keys.KeyE || touch.use) && !ui;
}

function nextSpectate() {
  if (!game) return;
  const mates = game.actors.filter(a => a.alive && a.team === game.player.team);
  if (!mates.length) return;
  specIdx = (specIdx + 1) % mates.length;
  game.viewActor = mates[specIdx];
  game.deathCamUntil = 0;
}

// ------------------------------------------------ camera
const _e = new THREE.Vector3(), _f = new THREE.Vector3(), _d = new THREE.Vector3();
function updateCamera(dt) {
  const p = game.player;
  let v = game.viewActor || p;
  if (!p.alive) {
    if (game.now > (game.deathCamUntil || 0)) {
      if (!v.alive || v === p) {
        const mates = game.actors.filter(a => a.alive && a.team === p.team);
        if (mates.length) { specIdx = specIdx % mates.length; v = game.viewActor = mates[specIdx]; }
      }
    }
  } else { v = game.viewActor = p; }
  game.thirdPerson = !p.alive && v !== p;
  let fovZ = 90;
  if (v === p && p.alive) {
    p.eye(_e);
    camera.position.copy(_e);
    const sh = p.shake || 0;
    if (sh > 0) { camera.position.x += (Math.random() - 0.5) * sh * 0.12; camera.position.y += (Math.random() - 0.5) * sh * 0.12; p.shake = Math.max(0, sh - dt * 1.2); }
    camera.rotation.set(p.pitch + p.punch.y * DEG, p.yaw - p.punch.x * DEG, 0);
    if (p.zoom > 0) fovZ = p.curDef.scope[p.zoom - 1];
  } else if (v === p) {
    // death cam: stay at death spot and look at killer
    p.eye(_e); _e.y = Math.max(_e.y, p.pos.y + 0.6);
    camera.position.lerp(_e.setY(p.pos.y + 1.2), Math.min(1, dt * 3));
    const k = game.lastTakenFrom;
    if (k) {
      _d.set(k.pos.x, k.pos.y + 1.5, k.pos.z).sub(camera.position);
      const yaw = Math.atan2(-_d.x, -_d.z), pitch = Math.atan2(_d.y, Math.hypot(_d.x, _d.z));
      camera.rotation.y += (((yaw - camera.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 3);
      camera.rotation.x += (pitch - camera.rotation.x) * Math.min(1, dt * 3);
    }
  } else {
    // third-person spectate
    v.eye(_e);
    const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw);
    _d.set(sy * 2.6, 0.45, cy * 2.6);
    const len = _d.length(); _d.normalize();
    const hit = world.raycast(_e, _d, len + 0.2, {});
    const dist = hit ? Math.max(0.3, hit.t - 0.25) : len;
    camera.position.copy(_e).addScaledVector(_d, dist);
    camera.rotation.set(v.pitch * 0.9 - 0.12, v.yaw, 0);
  }
  const vf = 2 * Math.atan(Math.tan(BASE_VFOV * DEG / 2) * Math.tan(fovZ * DEG / 2) / Math.tan(45 * DEG)) / DEG;
  if (Math.abs(camera.fov - vf) > 0.01) { camera.fov = vf; camera.updateProjectionMatrix(); }
}

// CS2-style main menu: an agent idling in the level with a slow camera drift
let menuAgent = null, menuAgentTeam = null;
function updateMenuAgent(t, dt) {
  const team = settings.side === 'T' ? 'T' : 'CT';
  if (menuAgentTeam !== team) {
    if (menuAgent) scene.remove(menuAgent.root);
    menuAgent = new CharacterModel(team, T);
    menuAgent.setWeapon(team === 'T' ? 'ak47' : 'm4a4');
    menuAgent.root.position.set(39.2, 0, -8);
    scene.add(menuAgent.root);
    menuAgentTeam = team;
  }
  menuAgent.root.visible = true;
  menuAgent.root.rotation.y = 0.75 + Math.sin(t * 0.25) * 0.06;
  menuAgent.update(dt, { speed: 0, crouch: 0, pitch: -0.08 + Math.sin(t * 0.9) * 0.015, onGround: true, recoil: 0, lowReady: true });
  menuAgent.torso.rotation.x += Math.sin(t * 1.3) * 0.012;
  menuAgent.head.rotation.y = Math.sin(t * 0.35) * 0.25;
}
function menuCamera(t) {
  camera.position.set(39.6 + Math.sin(t * 0.13) * 0.35, 1.38 + Math.sin(t * 0.21) * 0.05, -11.4);
  camera.lookAt(38.2, 1.05, -8);
  if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
}

// ------------------------------------------------ loop
let last = 0, fpsAcc = 0, fpsN = 0, buyRefresh = 0;
const perf = { start: 0, frames: 0, drops: 0 };
// Lower graphics quality automatically if the first seconds of play run poorly.
function autoQuality(dt) {
  if (paused || perf.drops >= 2) { perf.start = 0; return; }
  const now = performance.now();
  if (!perf.start) { perf.start = now; perf.frames = 0; return; }
  perf.frames++;
  if (now - perf.start < 5000) return;
  const fps = perf.frames / ((now - perf.start) / 1000);
  perf.start = 0;
  if (fps < 38 && settings.quality > 0) {
    settings.quality--; perf.drops++;
    applyQuality(); saveSettings();
    $('setQuality').value = settings.quality;
    hud.hint('Graphics quality lowered for smoother performance', 3);
  } else perf.drops = 2;
}
const _q = new THREE.Quaternion();
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
  last = t;
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) { $('fps').textContent = Math.round(fpsN / fpsAcc) + ' fps'; fpsAcc = 0; fpsN = 0; }

  if (state === 'menu' || state === 'loading') {
    if (!game) { menuCamera(t / 1000); updateMenuAgent(t / 1000, dt); }
    effects.update(dt, 0);
  } else if (state === 'playing' && game) {
    if (!paused) {
      autoQuality(dt);
      applyInput();
      game.update(dt);
      if (buyOpen) { buyRefresh -= dt; if (buyRefresh <= 0) { hud.refreshBuy(game); buyRefresh = 0.25; } if (!game.player.alive) toggleBuy(false); }
    }
    updateCamera(dt);
    document.body.classList.toggle('ingame', !paused && !buyOpen && game.phase !== 'over');
    effects.update(paused ? 0 : dt, game.now);
    hud.update(game, dt);
    // viewmodel
    const p = game.player;
    const showVm = p.alive && game.viewActor === p;
    vm.visible = showVm;
    if (showVm) {
      p.eye(_e);
      const blocked = world.raycast(_e, sunDir, 80, {});
      sunVis += ((blocked ? 0.22 : 1) - sunVis) * Math.min(1, dt * 4);
      _q.copy(camera.quaternion).invert();
      _f.copy(sunDir).applyQuaternion(_q);
      vm.update(paused ? 0 : dt, { speed: p.speed2d, onGround: p.onGround, mouseDX, mouseDY, crouch: p.ducked ? 1 : 0, scoped: p.zoom > 0, sunDirView: _f, sunVis, pulling: p.pulling });
    }
  }
  mouseDX = 0; mouseDY = 0;
  sound.ctx && sound.setListener(camera.position, _d.set(0, 0, -1).applyQuaternion(camera.quaternion), new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion));
  sky.position.copy(camera.position);
  renderer.clear();
  renderer.render(scene, camera);
  if (state === 'playing' && vm.visible) vm.render(renderer, camera.aspect);
  if (hud.needSnapshot) {
    hud.needSnapshot = false;
    const ff = $('flashFreeze');
    ff.getContext('2d').drawImage(renderer.domElement, 0, 0, ff.width, ff.height);
  }
}

boot().catch(err => {
  console.error(err);
  $('loadMsg').textContent = 'Failed to start: ' + (err && err.message ? err.message : err) + ' — WebGL is required.';
});
