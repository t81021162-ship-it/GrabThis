/* Witherholm — game state, story events, checkpoints and the render loop. */

const Game = {
  mode: 'boot', time: 0, state: null, checkpoint: null, player: null,
  stats: { kills: 0, shots: 0, hits: 0, playTime: 0 },
  damage: 0, shake: 0, warp: 0, beat: 0, lightDim: 1, localLight: 0, fade: 0, red: 0,
  particles: null, pausedAt: 0, flashOn: true, escape: null, deathCause: 'monster', spreadR: 0,
};

(() => {
  let renderer, scene, camera, rt, postMat, postScene, postCam, flashlight, muzzleLight, hemi, dust, spores;
  let resTarget = 540, look = 'cinematic';
  let last = performance.now();
  let flickerT = 20, flickerLeft = 0;
  let bossIntroDone = false;
  let deathTimer = 0, zoneT = 0, whisperT = 60, fireLights = [];
  const fogTarget = new THREE.Color(0x040404);
  const clone = o => JSON.parse(JSON.stringify(o));
  const $ = id => document.getElementById(id);
  const Z = id => Story.zones.find(z => z.id === id).rect;

  // ---------- setup ----------
  function makeCookie() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#eeeeee'); gr.addColorStop(0.8, '#a8a8a8'); gr.addColorStop(1, '#000000');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(0,0,0,0.10)'; g.lineWidth = 3;
    for (const r of [16, 27, 40, 52]) { g.beginPath(); g.arc(64, 64, r, 0, Math.PI * 2); g.stroke(); }
    return new THREE.CanvasTexture(c);
  }

  function boot() {
    if (!window.THREE) return fail('The 3D engine (three.js) could not be loaded. Reload the page, and check that the vendor folder is next to index.html.');
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    } catch (e) { return fail('Your browser could not start WebGL. Try a recent Chrome, Edge, Firefox or Safari.'); }
    renderer.setPixelRatio(1);
    Game.renderer = renderer; Game.debugScene = () => ({ scene, camera });
    renderer.autoClear = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    $('view').appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x040404, 0.058);
    camera = new THREE.PerspectiveCamera(72, 1, 0.05, 44);   // the fog swallows everything past this anyway
    scene.add(camera);

    hemi = new THREE.HemisphereLight(0x6a7488, 0x2c1e12, 1.1);
    scene.add(hemi);
    flashlight = new THREE.SpotLight(0xfff0d8, 3.4, 30, 0.43, 0.55, 1.1);
    flashlight.map = makeCookie();
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(1024, 1024);
    flashlight.shadow.camera.near = 0.3; flashlight.shadow.camera.far = 30;
    flashlight.shadow.bias = -0.0006; flashlight.shadow.normalBias = 0.02;
    scene.add(flashlight); scene.add(flashlight.target);
    muzzleLight = new THREE.PointLight(0xffa050, 0, 14, 2);
    scene.add(muzzleLight);

    // where the Bloom is thick: the chapel, the cellar under it, the glasshouse, and (later) the hall and foyer
    Level.setHot(0, 38, 10, 30); Level.setHot(1, 12, 6, 20); Level.setHot(2, 86, 37, 24); Level.setHot(3, 39, 50, 0);

    Fx.init(scene);
    Level.buildStatic(scene);
    Entities.init(scene);
    Game.merged = Level.mergeStatic(scene);
    Monsters.init(scene);
    Player.init(camera);
    Game.player = Player.P;

    dust = Shaders.makeDust();
    scene.add(dust);
    spores = Shaders.makeSpores();
    scene.add(spores);
    Game.particles = Shaders.makeParticles();
    scene.add(Game.particles.points);

    rt = new THREE.WebGLRenderTarget(320, 180, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
    postMat = Shaders.makePostMaterial(rt.texture);
    postScene = new THREE.Scene();
    postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
    quad.frustumCulled = false;
    postScene.add(quad);

    UI.init();
    const coarse = matchMedia('(pointer: coarse)').matches;
    if (coarse) { Player.enableTouch(); $('opt-res').value = '360'; }
    loadSettings();
    bindMenus();
    Player.bindInput(renderer.domElement);
    window.addEventListener('resize', resize);
    resize();

    showEndingsFound();
    newGame();
    Game.mode = 'title';
    requestAnimationFrame(loop);
  }

  function fail(msg) {
    $('error-text').textContent = msg;
    UI.show('title', false); UI.show('error', true);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    const rh = Math.min(resTarget, h), rw = Math.max(1, Math.round(rh * w / h));
    rt.setSize(rw, rh);
    postMat.uniforms.uRes.value.set(rw, rh);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const scale = rh / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    dust.material.uniforms.uScale.value = scale;
    spores.material.uniforms.uScale.value = scale;
    Game.particles.material.uniforms.uScale.value = scale;
  }

  // ---------- settings ----------
  function loadSettings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem('witherholm-settings2') || '{}'); } catch (e) { s = {}; }
    if (s.sens) $('opt-sens').value = s.sens;
    if (s.vol !== undefined) $('opt-vol').value = s.vol;
    if (s.res) $('opt-res').value = s.res;
    if (s.look) $('opt-look').value = s.look;
    if (s.invert) $('opt-invert').checked = true;
    applySettings();
  }
  function applySettings() {
    Input.sens = parseFloat($('opt-sens').value);
    Input.invert = $('opt-invert').checked;
    Sound.setVolume(parseFloat($('opt-vol').value));
    look = $('opt-look').value;
    applyLook();
    const r = parseInt($('opt-res').value, 10);
    if (r !== resTarget) { resTarget = r; if (rt) resize(); }
    try { localStorage.setItem('witherholm-settings2', JSON.stringify({ sens: Input.sens, vol: parseFloat($('opt-vol').value), res: resTarget, look, invert: Input.invert })); } catch (e) { /* storage blocked */ }
  }
  function applyLook() {
    const u = postMat.uniforms;
    if (look === 'retro') {
      Tex.setSmooth(false);
      u.uBloom.value = 0.25; u.uLevels.value = 30; u.uDither.value = 1; u.uGrain.value = 0.075; u.uScan.value = 0.07; u.uCA.value = 1.6; u.uBarrel.value = 0.085;
    } else {
      Tex.setSmooth(true);
      u.uBloom.value = 0.6; u.uLevels.value = 0; u.uDither.value = 0; u.uGrain.value = 0.035; u.uScan.value = 0.018; u.uCA.value = 1.0; u.uBarrel.value = 0.05;
    }
  }

  function bindMenus() {
    ['opt-sens', 'opt-vol', 'opt-res', 'opt-look', 'opt-invert'].forEach(id => $(id).addEventListener('input', applySettings));
    $('btn-start').addEventListener('click', () => {
      Sound.init(); applySettings();
      UI.show('title', false);
      Game.mode = 'intro';
      UI.runIntro(Story.intro, () => beginGame(true));
    });
    $('btn-resume').addEventListener('click', resume);
    $('btn-restart').addEventListener('click', () => { UI.show('files', false); UI.closeNote(); loadCheckpoint(); resume(); });
    $('btn-files').addEventListener('click', () => UI.openFiles(Game.state.notes));
    $('btn-files-close').addEventListener('click', () => UI.show('files', false));
    $('btn-retry').addEventListener('click', () => { UI.show('dead', false); loadCheckpoint(); startPlaying(); });
    $('btn-newgame').addEventListener('click', () => { UI.show('dead', false); newGame(); beginGame(false); });
    $('btn-again').addEventListener('click', () => { UI.show('win', false); newGame(); beginGame(false); });
    $('note').addEventListener('click', e => { if (!e.target.closest('.paper')) Game.closeNote(); });
    $('btn-note-close').addEventListener('click', () => Game.closeNote());
    // the mouse may be captured while reading, so scroll the page by wheel from anywhere
    window.addEventListener('wheel', e => { if (!$('note').hidden) document.querySelector('.paper').scrollBy(0, e.deltaY); }, { passive: true });
  }

  function startPlaying() {
    Game.mode = 'playing';
    Game.fade = 0; Game.red = 0;
    UI.show('hud', true);
    UI.show('touch', Input.touch);
    Player.showGun(true);
    Player.requestLock(renderer.domElement);
  }

  // the first moments of a new game
  function beginGame(first) {
    startPlaying();
    Sound.play('slam', { x: Game.player.pos.x, y: 1.5, z: Game.player.pos.z + 4 });
    UI.message('The front door slams shut behind you.', '', 4);
    setTimeout(() => UI.message('There is a letter on the pedestal.', 'warn', 4), 1800);
    setTimeout(() => { if (Game.mode === 'playing') UI.chapter(1); }, first ? 400 : 200);
    whisperT = 70 + Math.random() * 40;
  }

  Game.pause = function () {
    if (Game.mode !== 'playing') return;
    Game.mode = 'paused'; Game.pausedAt = performance.now();
    Input.fire = false; Input.aim = false; Input.keys = {};
    UI.show('pause', true);
    if (document.pointerLockElement) document.exitPointerLock();
  };
  function resume() {
    if (Game.mode !== 'paused') return;
    UI.show('pause', false); UI.show('files', false);
    Game.mode = 'playing';
    Player.requestLock(renderer.domElement);
  }
  Game.togglePause = function () {
    if (Game.mode === 'playing') Game.pause();
    else if (Game.mode === 'paused' && performance.now() - Game.pausedAt > 350) resume();
  };
  Game.onEscape = function () {
    if (UI.noteOpen && Game.mode === 'paused') return Game.closeNote();
    if (!$('files').hidden) return UI.show('files', false);
    if (Game.mode === 'choice') return closeChoice();
    Game.togglePause();
  };

  // ---------- state & checkpoints ----------
  function freshState() {
    return {
      player: {
        x: 19.5 * CELL, z: 27.5 * CELL, yaw: 0, hp: 100, herbs: 0, keys: [], oil: false, carrying: false, reserve: { ammo: 20, shells: 0 },
        weapons: { pistol: { owned: true, mag: 10 }, shotgun: { owned: false, mag: 0 } }, current: 'pistol',
      },
      taken: [], opened: [], dead: [], flags: {}, drops: [], notes: [],
    };
  }

  function applyState(s) {
    Game.state = s;
    clearEscape();
    Entities.reset(s);
    Monsters.reset(s);
    Player.spawn(s);
    Props.rootState('calm');
    Game.particles.clear();
    Game.damage = Game.shake = Game.warp = 0; Game.lightDim = 1; Game.fade = 0; Game.red = 0; Game.deathCause = 'monster';
    Game.spreadR = s.flags.bossDead ? 26 : 0;
    bossIntroDone = false;
    UI.bossHealth(null); UI.prompt(null); UI.timer(null);
    $('subtitle').hidden = true;
    updateObjective();
    if (s.flags.choice) startEscape(s.flags.choice);
  }

  function newGame() {
    Game.stats = { kills: 0, shots: 0, hits: 0, playTime: 0 };
    const s = freshState();
    Game.checkpoint = clone(s);
    applyState(s);
  }
  function saveCheckpoint() {
    Game.state.player = Player.snapshot();
    Game.checkpoint = clone(Game.state);
    UI.saved();
  }
  function loadCheckpoint() { applyState(clone(Game.checkpoint)); }

  function updateObjective() {
    const s = Game.state, f = s.flags, keys = Player.P.keys;
    let t;
    if (f.choice) t = 'Get out. The front door.';
    else if (f.bossDead && keys.includes('crown')) t = 'Go down to Mara, or leave by the front door';
    else if (f.bossDead) t = 'Take the Crown key from the chapel floor';
    else if (f.serpent) t = 'Unlock the chapel at the north end of the hall';
    else if (f.moth) t = 'Find the Serpent key in the east wing';
    else t = 'Find the Moth key in the kitchen';
    UI.objective(t);
  }

  const inRect = (r, pad = 0) => { const P = Player.P, cx = Level.cellX(P.pos.x), cy = Level.cellX(P.pos.z); return cx >= r[0] - pad && cx <= r[2] + pad && cy >= r[1] - pad && cy <= r[3] + pad; };
  Game.inChapel = () => inRect([12, 1, 25, 8]);

  Game.dropItem = function (type, x, z, id) {
    id = id || 'drop_' + Math.random().toString(36).slice(2, 8);
    const p = { x, z }; Level.collide(p, 0.3);
    Entities.spawnItem({ id, type }, p);
    Game.state.drops.push({ id, type, x: p.x, z: p.z });
  };

  Game.shootables = function () {
    const arr = [];
    for (const m of Monsters.list) if (m.state !== 'dying' && m.state !== 'dead') arr.push(m.root);
    return arr;
  };

  Game.muzzleFlash = function () { muzzleLight.intensity = 3.5; };
  Game.onHeartbeat = function () { Game.beat = 1; };
  Game.onHollowFreeze = function () {
    if (Game.state.flags.hollowTip) return;
    Game.state.flags.hollowTip = true;
    UI.thought('The light stops them. Keep it on them.', 5);
  };
  Game.onBruteDead = function () { UI.thought('He has stopped humming.', 4); };

  Game.onBossRage = function () { UI.subtitle(...Story.lines.bossRage, 3.6); };

  Game.onBossDead = function (m) {
    const s = Game.state;
    s.flags.bossDead = true;
    Game.dropItem('key_crown', m.pos.x, m.pos.z + 1.2, 'key_crown');
    Monsters.spawnEvent('bossDead', false);
    // her brood dies with her
    for (const o of Monsters.list) if (o.summoned && o.state !== 'dying') Monsters.hurt(o, 999, 'body', { x: 0, y: 0, z: 1 }, { x: o.pos.x, y: 0.5, z: o.pos.z });
    UI.subtitle(...Story.lines.bossDie, 4.2);
    setTimeout(() => UI.message('Something falls from her chest.', 'warn', 4), 1500);
    setTimeout(() => UI.bossHealth(null), 2500);
    // the way down opens
    setTimeout(() => {
      const d = Entities.doors.find(x => x.key === 'root');
      if (d && !d.open) { Entities.openDoor(d, 99, d.z); s.opened.push(d.id); Sound.play('grind', { x: d.x, y: 1.2, z: d.z }); UI.message(Story.lines.rootDoor, 'bad', 5); }
      Game.shake = Math.max(Game.shake, 0.5);
    }, 4500);
    setTimeout(() => { UI.message('Far off, in the foyer, something begins to move.', 'bad', 5); }, 7500);
    setTimeout(() => { if (Game.mode === 'playing') UI.chapter(4); }, 9500);
    Game.warp = 1; flickerLeft = 1.5;
    updateObjective();
    setTimeout(() => { if (Game.mode === 'playing' || Game.mode === 'note') saveCheckpoint(); }, 11000);
  };

  Game.onPlayerDeath = function () {
    Sound.play('death');
    deathTimer = 2.2;
    Input.fire = false; Input.aim = false;
  };

  // ---------- endings ----------
  function endingsFound() { try { return JSON.parse(localStorage.getItem('witherholm-endings') || '[]'); } catch (e) { return []; } }
  function recordEnding(kind) {
    const a = endingsFound(); if (!a.includes(kind)) a.push(kind);
    try { localStorage.setItem('witherholm-endings', JSON.stringify(a)); } catch (e) { /* storage blocked */ }
    return a.length;
  }
  function showEndingsFound() { const n = endingsFound().length; $('title-endings').textContent = n ? `Endings found: ${n} of 3` : ''; }

  function win() {
    const kind = Game.state.flags.choice === 'burn' ? 'ashes' : Game.state.flags.choice === 'free' ? 'kin' : 'left';
    Game.mode = 'win';
    Sound.play('victory');
    if (document.pointerLockElement) document.exitPointerLock();
    const t = Game.stats.playTime, mm = Math.floor(t / 60), ss = Math.floor(t % 60);
    const acc = Game.stats.shots ? Math.round(Game.stats.hits / Game.stats.shots * 100) : 0;
    const found = recordEnding(kind); showEndingsFound();
    UI.show('hud', false); UI.show('touch', false);
    UI.showEnding(kind, `Time ${mm}:${String(ss).padStart(2, '0')} · ${Game.stats.kills} ${Game.stats.kills === 1 ? 'creature' : 'creatures'} put to rest · ${acc}% accuracy`, found);
    clearEscape();
  }

  // ---------- the choice ----------
  function openChoice() {
    Game.mode = 'choice';
    Input.fire = false; Input.aim = false;
    if (document.pointerLockElement) document.exitPointerLock();
    Sound.stinger(true);
    UI.openChoice(Player.P, applyChoice);
  }
  function closeChoice() { UI.show('choice', false); Game.mode = 'playing'; Player.requestLock(renderer.domElement); }
  function applyChoice(key) {
    const P = Player.P, s = Game.state;
    Game.mode = 'playing'; Player.requestLock(renderer.domElement);
    if (key === 'back') { UI.thought('I am sorry, Mara. I am sorry.', 5); return; }
    if (key === 'burn') { P.oil = false; s.flags.choice = 'burn'; }
    if (key === 'free') { P.herbs -= 3; P.carrying = true; s.flags.choice = 'free'; }
    UI.updateInventory();
    saveCheckpoint();
    startEscape(s.flags.choice, true);
  }

  // ---------- the escape ----------
  // a dense list of points from the cellar to the front door, for the fire to follow
  const ROUTE = (() => {
    const way = [[3, 3], [9, 3], [11, 3], [13, 4], [18, 5], [19, 8], [19, 19], [19, 27]], out = [];
    for (let i = 0; i < way.length - 1; i++) {
      const [ax, ay] = way[i], [bx, by] = way[i + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay)));
      for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
    }
    return out;
  })();

  function startEscape(kind, fresh) {
    const total = kind === 'burn' ? 80 : 95;
    Game.escape = { kind, t: total, total, idx: 0, fireT: 0, rumbleT: 4, crackT: 0, warpT: 6 };
    Game.state.flags.escape = true;
    Monsters.spawnEvent('escape', true);
    Props.rootState(kind === 'burn' ? 'burn' : 'free');
    updateObjective();
    if (kind === 'burn') {
      Sound.play('whoosh');
      const c = Props.cocoonPos();
      for (let i = 0; i < 5; i++) Fx.addFire(c.x + 1 + Math.random() * 3, c.z - 2.5 + Math.random() * 5, 1.1);
      Sound.play('lullaby', { x: c.x, y: 1.5, z: c.z }, 1);
      if (fresh) setTimeout(() => { if (Game.mode === 'playing') UI.subtitle('MARA', 'Hum it with me, Nell.', 5, 'whisper'); }, 5600);
    } else {
      Sound.play('roar', { x: Props.cocoonPos().x, y: 2, z: Props.cocoonPos().z });
      Game.warp = 1; flickerLeft = 2;
      if (fresh) { UI.thought('She weighs nothing at all.', 5); setTimeout(() => { if (Game.mode === 'playing') UI.subtitle('MARA', 'Nell...? Is it morning yet?', 5, 'whisper'); }, 5600); }
    }
    if (fresh) setTimeout(() => { if (Game.mode === 'playing') UI.chapter(5); }, 900);
  }
  function clearEscape() {
    Game.escape = null;
    Fx.clearFires();
    for (const d of fireLights) Level.removeLightDef(d);
    fireLights = [];
    UI.timer(null);
  }

  function spawnFire() {
    const E = Game.escape; if (E.idx >= ROUTE.length) return;
    const [cx, cy] = ROUTE[E.idx++], c = Level.cellCenter(cx, cy);
    const x = cx * CELL + (Math.random() - 0.5) * 1.6, z = cy * CELL + (Math.random() - 0.5) * 1.6;
    if (!Level.blocksMove(Level.cellX(x), Level.cellX(z))) {
      Fx.addFire(x, z, 0.8 + Math.random() * 0.6);
      if (E.idx % 2 === 0) fireLights.push(Level.addLightDef({ x: x / CELL, z: z / CELL, y: 0.9, color: 0xff7020, intensity: 1.25, dist: 10, flicker: 0.5 }));
    }
  }

  function updateEscape(dt) {
    const E = Game.escape; if (!E) return;
    const P = Player.P;
    E.t -= dt;
    UI.timer(E.kind === 'burn' ? 'The house is burning' : 'The house is waking', E.t);
    E.rumbleT -= dt;
    if (E.rumbleT <= 0) {
      E.rumbleT = 3 + Math.random() * 3; Game.shake = Math.max(Game.shake, 0.55); Sound.play('rumble');
      Game.particles.emit(P.pos.x + (Math.random() - 0.5) * 6, 2.8, P.pos.z + (Math.random() - 0.5) * 6, 14, 'dust');
    }
    if (E.kind === 'burn') {
      E.fireT -= dt; if (E.fireT <= 0) { E.fireT = 1.15; spawnFire(); }
      E.crackT -= dt; if (E.crackT <= 0) { E.crackT = 0.09 + Math.random() * 0.12; Sound.play('crackle'); }
      if (P.alive && Fx.fireNear(P.pos.x, P.pos.z, 0.75)) { Game.deathCause = 'fire'; P.hurt(7, { x: P.pos.x + 1, z: P.pos.z }); Game.particles.emit(P.pos.x, 1, P.pos.z, 3, 'ember'); }
      for (const f of Fx.fires) if (Math.random() < 0.02) Game.particles.emit(f.x, 1, f.z, 2, 'ember');
    } else {
      E.warpT -= dt; if (E.warpT <= 0) { E.warpT = 5 + Math.random() * 4; Game.warp = Math.max(Game.warp, 0.9); flickerLeft = 0.8; }
    }
    if (E.t <= 0 && P.alive) { Game.deathCause = E.kind === 'burn' ? 'fire' : 'root'; P.invuln = 0; P.hurt(999, { x: P.pos.x, z: P.pos.z + 1 }); }
  }

  // ---------- story beats: zones, whispers ----------
  function checkZones() {
    const f = Game.state.flags;
    for (const z of Story.zones) {
      const key = 'z_' + z.id;
      if (f[key] || !inRect(z.rect)) continue;
      f[key] = true;
      if (z.id === 'foyer') continue;              // the letter and the door say enough
      UI.thought(z.text, 5);
      if (z.id === 'root') { Sound.stinger(true); Game.shake = Math.max(Game.shake, 0.3); }
      if (z.id === 'conservatory') setTimeout(() => { if (Game.mode === 'playing') UI.subtitle('MARA', Story.whispers.hollow[0], 4.5, 'whisper'); Sound.play('whisper', 2.6); }, 4000);
      break;
    }
  }
  function maybeWhisper(dt) {
    whisperT -= dt;
    if (whisperT > 0) return;
    whisperT = 55 + Math.random() * 60;
    const f = Game.state.flags, W = Story.whispers, boss = Monsters.boss();
    if (Game.escape || (boss && boss.aware) || !Player.P.alive) return;
    let pool = [...W.any];
    if (f.moth && !f.serpent) pool.push(...W.moth);
    if (f.serpent && !f.bossDead) pool.push(...W.serpent);
    if (f.bossDead) pool.push(...W.bossDead);
    if (inRect(Z('conservatory'))) pool = [...W.hollow, ...W.hollow, ...W.any.slice(0, 2)];
    UI.subtitle('MARA', pool[Math.random() * pool.length | 0], 4.6, 'whisper');
    Sound.play('whisper', 2.4);
  }

  // ---------- interaction ----------
  function findInteractable() {
    const P = Player.P, f = Game.state.flags;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    let best = null, bestScore = Infinity;
    const consider = (obj, kind, x, z, range) => {
      const dx = x - P.pos.x, dz = z - P.pos.z, d = Math.hypot(dx, dz);
      if (d > range) return;
      const facing = (dx * fx + dz * fz) / (d || 1);
      if (facing < 0.45 && d > 1.1) return;
      const score = d - facing * 1.5;
      if (score < bestScore) { bestScore = score; best = { obj, kind }; }
    };
    for (const it of Entities.items) if (!it.taken) consider(it, 'item', it.x, it.z, it.type === 'gramophone' ? 2.3 : 2.0);
    for (const d of Entities.doors) if (!d.open) consider(d, 'door', d.x, d.z, 2.4);
    if (f.bossDead && !f.choice) { const c = Props.cocoonPos(); consider({ x: c.x, z: c.z }, 'cocoon', c.x, c.z, 3.4); }
    return best;
  }

  function promptFor(t) {
    if (!t) return null;
    const P = Player.P;
    if (t.kind === 'cocoon') return 'Kneel by the Root';
    if (t.kind === 'item') { const T = ITEM_TYPES[t.obj.type]; return `${T.verb} ${T.label}`; }
    const d = t.obj;
    if (d.exit) return P.keys.includes('crown') ? 'Unlock the front door with the Crown key' : 'Open the front door';
    if (d.key === 'root') return 'Examine the wall';
    if (d.locked) return P.keys.includes(d.key) ? `Use the ${d.key[0].toUpperCase() + d.key.slice(1)} key` : 'Try the door';
    return 'Open door';
  }

  function interact(t) {
    const P = Player.P, s = Game.state;
    if (t.kind === 'cocoon') return openChoice();
    if (t.kind === 'door') {
      const d = t.obj, pos = { x: d.x, y: 1.3, z: d.z };
      if (d.exit) {
        if (P.keys.includes('crown')) { Sound.play('unlock', pos); Sound.play('door', pos); win(); }
        else { Sound.play('locked', pos); UI.message('The front door will not move. Its lock is shaped like a crown.'); }
        return;
      }
      if (d.key === 'root') { Sound.play('locked', pos); UI.thought('The stone is warm. Something behind it is listening.', 4); return; }
      if (d.locked) {
        if (P.keys.includes(d.key)) {
          P.keys.splice(P.keys.indexOf(d.key), 1);
          Sound.play('unlock', pos);
          UI.message(`You used the ${d.key[0].toUpperCase() + d.key.slice(1)} key.`);
          Entities.openDoor(d, P.pos.x, P.pos.z);
          s.opened.push(d.id);
          UI.updateInventory();
          saveCheckpoint();
        } else {
          Sound.play('locked', pos);
          UI.message(`Locked. A ${d.key} is carved into the lock.`);
        }
        return;
      }
      Entities.openDoor(d, P.pos.x, P.pos.z);
      s.opened.push(d.id);
      return;
    }

    const it = t.obj;
    switch (it.type) {
      case 'gramophone': {
        if (it.playing > 0) return;
        it.playing = 13;
        Sound.play('lullaby', { x: it.x, y: 1, z: it.z });
        saveCheckpoint();
        if (!s.flags.gramo) { s.flags.gramo = true; setTimeout(() => UI.thought('Mother\'s song. Mara must have brought the record.', 5), 1500); }
        else UI.message('You wind it, and sit a moment.');
        return;
      }
      case 'note':
        if (!s.notes.includes(it.def.note)) s.notes.push(it.def.note);
        Sound.play('note');
        Game.mode = 'note';
        Input.fire = false;
        UI.openNote(it.def.note);
        return;
      case 'oil': P.oil = true; UI.message('Took the flask of lamp oil. It would burn for a long time.', 'warn', 4); Sound.play('pickup'); break;
      case 'ammo': P.reserve.ammo += 12; UI.message('Picked up pistol rounds (12)'); Sound.play('pickup'); break;
      case 'shells': P.reserve.shells += 6; UI.message('Picked up shotgun shells (6)'); Sound.play('pickup'); break;
      case 'herb': P.herbs++; UI.message(`Picked up an Ashroot herb. ${Input.touch ? 'Tap HERB' : 'Press H'} to use it.`); Sound.play('pickup'); break;
      case 'shotgun':
        P.weapons.shotgun.owned = true; P.weapons.shotgun.mag = 4;
        Sound.play('pump');
        UI.message(`Took the Hollowell 12-gauge. ${Input.touch ? 'Tap SWAP' : 'Press 2'} to equip it.`, 'warn', 5);
        break;
      default: {
        const key = ITEM_TYPES[it.type].key;
        P.keys.push(key);
        Sound.play('keyItem');
        UI.message(`Took the ${ITEM_TYPES[it.type].label}.`, 'warn');
        if (key === 'moth') {
          s.flags.moth = true;
          Monsters.spawnEvent('moth', true);
          setTimeout(() => { Sound.play('glass'); UI.message('Glass breaks somewhere in the hall.', 'bad'); }, 900);
          setTimeout(() => { if (Game.mode === 'playing') UI.chapter(2); }, 2600);
        } else if (key === 'serpent') {
          s.flags.serpent = true;
          Monsters.spawnEvent('serpent', true);
          setTimeout(() => { Sound.play('bell'); UI.message('A bell tolls once, deep in the house.', 'bad'); }, 700);
          setTimeout(() => { if (Game.mode === 'playing') UI.chapter(3); }, 3000);
        } else if (key === 'crown') {
          UI.thought('It is warm, like something that was worn against a heartbeat.', 4);
        }
      }
    }
    Entities.removeItem(it);
    s.taken.push(it.id);
    UI.updateInventory();
    updateObjective();
    if (it.type.startsWith('key_')) saveCheckpoint();
  }

  Game.scrollNote = function (dy) { document.querySelector('.paper').scrollBy(0, dy); };
  Game.closeNote = function () {
    if (Game.mode === 'paused') { UI.closeNote(); return; }
    if (Game.mode !== 'note') return;
    UI.closeNote();
    Game.mode = 'playing';
    Input.pressed = {};
  };

  // ---------- frame ----------
  function update(dt) {
    Game.time += dt;
    const P = Player.P;
    Game.stats.playTime += dt;

    Player.update(dt, Game.time);
    Entities.updateDoors(dt);
    Entities.updateItems(dt, Game.time);
    Monsters.update(dt, Game.time);
    Game.particles.update(dt);
    updateEscape(dt);

    zoneT -= dt; if (zoneT <= 0) { zoneT = 0.3; checkZones(); }
    maybeWhisper(dt);

    // interaction prompt
    const target = P.alive ? findInteractable() : null;
    UI.prompt(promptFor(target));
    if (Input.take('use') && target && Game.mode === 'playing') interact(target);

    // boss intro
    const boss = Monsters.boss();
    const bossActive = !!(boss && boss.aware && boss.state !== 'dying');
    if (bossActive && !bossIntroDone) {
      bossIntroDone = true;
      Sound.play('roar', { x: boss.pos.x, y: 3, z: boss.pos.z });
      UI.bossHealth(boss.hp / boss.T.hp);
      UI.subtitle(...Story.lines.bossRise, 4.2);
      Game.warp = 1;
    }

    // death sequence
    if (!P.alive) {
      Game.red = Math.min(1, Game.red + dt * 0.8);
      deathTimer -= dt;
      if (deathTimer <= 0 && Game.mode === 'playing') {
        Game.mode = 'dead';
        const fire = Game.deathCause === 'fire' || Game.deathCause === 'root';
        $('dead-title').textContent = fire ? Story.endings.fire.title : 'The Bloom takes you';
        $('dead-text').textContent = fire ? Story.endings.fire.text.join(' ') : 'Your body joins the house.';
        UI.show('hud', false); UI.show('touch', false);
        UI.show('dead', true);
        if (document.pointerLockElement) document.exitPointerLock();
      }
    }

    Sound.update(dt, camera.position, P.hp, bossActive);
    UI.updateECG(dt, P.hp, P.alive);
    const moving = Math.hypot(P.vel.x, P.vel.z) / 3;
    UI.crosshair(P.aiming ? 0.55 : 1 + moving * 0.5 + P.kick * 0.6);
  }

  function updateLighting(dt) {
    const P = Player.P;
    // the flashlight sits in your right hand, a little below the eyes
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    flashlight.position.copy(camera.position).addScaledVector(right, 0.2).add(new THREE.Vector3(0, -0.14, 0)).addScaledVector(fwd, 0.15);
    flashlight.target.position.copy(camera.position).addScaledVector(fwd, 10);
    flashlight.target.updateMatrixWorld();
    Sound.setListener(camera.position, fwd);

    // now and then the batteries stutter, more often in the glasshouse
    flickerT -= dt * (Game.mode === 'playing' && inRect(Z('conservatory')) ? 2.4 : 1);
    if (flickerT <= 0) { flickerT = 25 + Math.random() * 30; flickerLeft = 0.5 + Math.random() * 0.6; }
    let fl = 1;
    if (flickerLeft > 0) { flickerLeft -= dt; fl = Math.random() < 0.5 ? 0.15 : 1; }
    flashlight.intensity = P.flashlight && P.alive !== false ? 3.4 * fl : 0;
    Game.flashOn = flashlight.intensity > 0.5;

    muzzleLight.position.copy(camera.position).addScaledVector(fwd, 0.8);
    muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 45);

    Game.lightDim = Game.warp > 0.2 ? 0.4 + Math.random() * 0.6 : 1;
    Level.updateLights(dt, Game.time, P.pos.x, P.pos.z);

    // the storm: lightning lifts the whole scene for a moment
    hemi.intensity = 1.1 + Fx.flash * 1.4 + (Game.escape && Game.escape.kind === 'burn' ? 0.3 : 0);
    Level.setFlash(Fx.flash);
    fogTarget.setHex(Game.escape && Game.escape.kind === 'burn' ? 0x1c0a04 : Game.escape ? 0x1a0606 : 0x040404);
    scene.fog.color.lerp(fogTarget, Math.min(1, dt * 0.6));
    const tint = postMat.uniforms.uTint.value;
    const burn = Game.escape && Game.escape.kind === 'burn';
    tint.x += ((burn ? 1.18 : 1) - tint.x) * Math.min(1, dt * 0.8); tint.y += ((burn ? 0.9 : 1) - tint.y) * Math.min(1, dt * 0.8); tint.z += ((burn ? 0.74 : 1) - tint.z) * Math.min(1, dt * 0.8);

    // how lit is the spot you're standing in (drives the view model's ambient)
    let L = 0;
    for (const d of Level.lightDefs) {
      const dist = Math.hypot(d.x * CELL - P.pos.x, d.z * CELL - P.pos.z);
      L += d.base * Math.pow(Math.max(0, 1 - dist / d.dist), 2);
    }
    Game.localLight = Math.min(1, L);

    const U = dust.material.uniforms;
    U.uTime.value = Game.time; U.uCenter.value.copy(camera.position);
    U.uFlashPos.value.copy(flashlight.position); U.uFlashDir.value.copy(fwd); U.uFlashOn.value = Game.flashOn ? 1 : 0;
    const SU = spores.material.uniforms;
    SU.uTime.value = Game.time; SU.uCenter.value.copy(camera.position);

    // the Bloom creeps outward once the Matron falls
    const target = Game.state && Game.state.flags.bossDead ? 26 : 0;
    Game.spreadR += (target - Game.spreadR) * Math.min(1, dt * 0.05);
    Level.setHot(3, 39, 50, Game.spreadR < 4 ? 0 : Game.spreadR);
  }

  function render() {
    Shaders.worldUniforms.uTime.value = Game.time;
    const u = postMat.uniforms, P = Player.P;
    u.uTime.value = Game.time;
    u.uDamage.value = Game.damage;
    u.uLow.value = P.alive ? Math.max(0, Math.min(1, (45 - P.hp) / 45)) : 1;
    u.uBeat.value = Game.beat;
    u.uFade.value = Game.fade;
    u.uRed.value = Game.red;
    u.uWarp.value = Game.warp;
    u.uFlash.value = Fx.flash;

    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    if (Game.mode !== 'title' && Game.mode !== 'intro') { renderer.clearDepth(); renderer.render(Player.gunScene, camera); }
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postScene, postCam);
  }

  function titleCamera() {
    const P = Player.P, t = Game.time;
    camera.position.set(P.pos.x + Math.sin(t * 0.13) * 0.6, EYE_H + Math.sin(t * 0.4) * 0.03, P.pos.z + 1.5);
    camera.rotation.set(0.06 + Math.sin(t * 0.21) * 0.04, Math.sin(t * 0.11) * 0.35, 0);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    Game.damage = Math.max(0, Game.damage - dt * 1.6);
    Game.shake = Math.max(0, Game.shake - dt * 1.8);
    Game.warp = Math.max(0, Game.warp - dt * 0.7);
    Game.beat = Math.max(0, Game.beat - dt * 2.5);

    if (Game.mode === 'playing') update(dt);
    else if (Game.mode === 'title' || Game.mode === 'intro') {
      Game.time += dt;
      titleCamera();
      Monsters.tickMaterials(Game.time);
      Entities.updateItems(dt, Game.time);
    } else if (Game.mode === 'dead') {
      Game.time += dt;
      Game.particles.update(dt);
    } else if (Game.mode === 'choice' || Game.mode === 'note') {
      Game.time += dt;
    }
    Fx.update(dt, Game.time);
    Props.update(dt, Game.time);
    updateLighting(dt);
    render();
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
