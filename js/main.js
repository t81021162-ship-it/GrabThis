/* Witherholm — game state, story events, checkpoints and the render loop. */

const Game = {
  mode: 'boot', time: 0, state: null, checkpoint: null, player: null,
  stats: { kills: 0, shots: 0, hits: 0, playTime: 0 },
  damage: 0, shake: 0, warp: 0, beat: 0, lightDim: 1, localLight: 0, fade: 0, red: 0,
  particles: null, pausedAt: 0,
};

(() => {
  let renderer, scene, camera, rt, postMat, postScene, postCam, flashlight, muzzleLight, dust;
  let resTarget = 300;
  let last = performance.now();
  let flickerT = 20, flickerLeft = 0;
  let bossIntroDone = false;
  let deathTimer = 0;
  const clone = o => JSON.parse(JSON.stringify(o));
  const $ = id => document.getElementById(id);

  // ---------- setup ----------
  function boot() {
    if (!window.THREE) return fail('The 3D engine (three.js) could not be loaded. Check your internet connection and reload.');
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    } catch (e) { return fail('Your browser could not start WebGL. Try a recent Chrome, Edge, Firefox or Safari.'); }
    renderer.setPixelRatio(1);
    renderer.autoClear = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    $('view').appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x040404, 0.062);
    camera = new THREE.PerspectiveCamera(72, 1, 0.05, 90);
    scene.add(camera);

    scene.add(new THREE.HemisphereLight(0x566070, 0x22170e, 0.85));
    flashlight = new THREE.SpotLight(0xfff0d8, 2.6, 30, 0.43, 0.55, 1.1);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(1024, 1024);
    flashlight.shadow.camera.near = 0.3; flashlight.shadow.camera.far = 30;
    flashlight.shadow.bias = -0.0006; flashlight.shadow.normalBias = 0.02;
    scene.add(flashlight); scene.add(flashlight.target);
    muzzleLight = new THREE.PointLight(0xffa050, 0, 14, 2);
    scene.add(muzzleLight);

    Shaders.worldUniforms.uInfect.value.set(19.5 * CELL, 4 * CELL);
    Level.buildStatic(scene);
    Entities.init(scene);
    Monsters.init(scene);
    Player.init(camera);
    Game.player = Player.P;

    dust = Shaders.makeDust();
    scene.add(dust);
    Game.particles = Shaders.makeParticles();
    scene.add(Game.particles.points);

    rt = new THREE.WebGLRenderTarget(320, 180, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    postMat = Shaders.makePostMaterial(rt.texture);
    postScene = new THREE.Scene();
    postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
    quad.frustumCulled = false;
    postScene.add(quad);

    UI.init();
    loadSettings();
    bindMenus();
    Player.bindInput(renderer.domElement);
    if (matchMedia('(pointer: coarse)').matches) Player.enableTouch();
    window.addEventListener('resize', resize);
    resize();

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
    Game.particles.material.uniforms.uScale.value = scale;
  }

  // ---------- settings ----------
  function loadSettings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem('witherholm-settings') || '{}'); } catch (e) { s = {}; }
    if (s.sens) $('opt-sens').value = s.sens;
    if (s.vol !== undefined) $('opt-vol').value = s.vol;
    if (s.res) $('opt-res').value = s.res;
    if (s.invert) $('opt-invert').checked = true;
    applySettings();
  }
  function applySettings() {
    Input.sens = parseFloat($('opt-sens').value);
    Input.invert = $('opt-invert').checked;
    Sound.setVolume(parseFloat($('opt-vol').value));
    const r = parseInt($('opt-res').value, 10);
    if (r !== resTarget) { resTarget = r; if (rt) resize(); }
    try { localStorage.setItem('witherholm-settings', JSON.stringify({ sens: Input.sens, vol: parseFloat($('opt-vol').value), res: resTarget, invert: Input.invert })); } catch (e) { /* storage blocked */ }
  }

  function bindMenus() {
    ['opt-sens', 'opt-vol', 'opt-res', 'opt-invert'].forEach(id => $(id).addEventListener('input', applySettings));
    $('btn-start').addEventListener('click', () => {
      Sound.init(); applySettings();
      UI.show('title', false);
      startPlaying();
      Sound.play('slam', { x: Game.player.pos.x, y: 1.5, z: Game.player.pos.z + 4 });
      UI.message('The front door slams shut behind you.', '', 4);
      setTimeout(() => UI.message('There is a letter on the floor.', 'warn', 4), 1800);
    });
    $('btn-resume').addEventListener('click', resume);
    $('btn-restart').addEventListener('click', () => { loadCheckpoint(); resume(); });
    $('btn-retry').addEventListener('click', () => { UI.show('dead', false); loadCheckpoint(); startPlaying(); });
    $('btn-newgame').addEventListener('click', () => { UI.show('dead', false); newGame(); startPlaying(); });
    $('btn-again').addEventListener('click', () => { UI.show('win', false); newGame(); startPlaying(); });
    $('note').addEventListener('click', e => { if (!e.target.closest('.paper')) Game.closeNote(); });
    $('btn-note-close').addEventListener('click', () => Game.closeNote());
    // the mouse may be captured while reading, so scroll the page by wheel from anywhere
    window.addEventListener('wheel', e => { if (Game.mode === 'note') document.querySelector('.paper').scrollBy(0, e.deltaY); }, { passive: true });
  }

  function startPlaying() {
    Game.mode = 'playing';
    Game.fade = 0; Game.red = 0;
    UI.show('hud', true);
    UI.show('touch', Input.touch);
    Player.showGun(true);
    Player.requestLock(renderer.domElement);
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
    UI.show('pause', false);
    Game.mode = 'playing';
    Player.requestLock(renderer.domElement);
  }
  Game.togglePause = function () {
    if (Game.mode === 'playing') Game.pause();
    else if (Game.mode === 'paused' && performance.now() - Game.pausedAt > 350) resume();
  };

  // ---------- state & checkpoints ----------
  function freshState() {
    return {
      player: {
        x: 19.5 * CELL, z: 27.5 * CELL, yaw: 0, hp: 100, herbs: 0, keys: [], reserve: { ammo: 20, shells: 0 },
        weapons: { pistol: { owned: true, mag: 10 }, shotgun: { owned: false, mag: 0 } }, current: 'pistol',
      },
      taken: [], opened: [], dead: [], flags: {}, drops: [],
    };
  }

  function applyState(s) {
    Game.state = s;
    Entities.reset(s);
    Monsters.reset(s);
    Player.spawn(s);
    Game.particles.clear();
    Game.damage = Game.shake = Game.warp = 0; Game.lightDim = 1; Game.fade = 0; Game.red = 0;
    bossIntroDone = false;
    UI.bossHealth(null);
    UI.prompt(null);
    updateObjective();
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
    const s = Game.state, keys = Player.P.keys;
    let t;
    if (keys.includes('crown')) t = 'Escape through the front door';
    else if (s.flags.bossDead) t = 'Take the Crown key from the chapel';
    else if (s.flags.serpent) t = 'Unlock the chapel at the north end of the hall';
    else if (s.flags.moth) t = 'Search the east wing for the Serpent key';
    else t = 'Find the Moth key in the west wing';
    UI.objective(t);
  }

  Game.inChapel = function () {
    const P = Player.P, cx = Level.cellX(P.pos.x), cy = Level.cellX(P.pos.z);
    return cy <= 8 && cx >= 12 && cx <= 25;
  };

  Game.dropItem = function (type, x, z, id) {
    id = id || 'drop_' + Math.random().toString(36).slice(2, 8);
    const p = { x, z }; Level.collide(p, 0.3);
    Entities.spawnItem({ id, type }, p);
    Game.state.drops.push({ id, type, x: p.x, z: p.z });
  };

  Game.shootables = function () {
    const arr = Level.staticMeshes.slice();
    for (const d of Entities.doors) arr.push(d.panel);
    for (const m of Monsters.list) if (m.state !== 'dying' && m.state !== 'dead') arr.push(m.root);
    return arr;
  };

  Game.muzzleFlash = function () { muzzleLight.intensity = 3.5; };
  Game.onHeartbeat = function () { Game.beat = 1; };

  Game.onBossDead = function (m) {
    const s = Game.state;
    s.flags.bossDead = true;
    Game.dropItem('key_crown', m.pos.x, m.pos.z + 1.2, 'key_crown');
    Monsters.spawnEvent('bossDead', false);
    // her brood dies with her
    for (const o of Monsters.list) if (o.summoned && o.state !== 'dying') Monsters.hurt(o, 999, 'body', { x: 0, y: 0, z: 1 }, { x: o.pos.x, y: 0.5, z: o.pos.z });
    UI.message('The Matron collapses. Something falls from her chest.', 'warn', 5);
    setTimeout(() => UI.message('Far off, in the foyer, something begins to move.', 'bad', 5), 4000);
    setTimeout(() => UI.bossHealth(null), 2500);
    Game.warp = 1; flickerLeft = 1.5;
    updateObjective();
    setTimeout(() => { if (Game.mode === 'playing' || Game.mode === 'note') saveCheckpoint(); }, 100);
  };

  Game.onPlayerDeath = function () {
    Sound.play('death');
    deathTimer = 2.2;
    Input.fire = false; Input.aim = false;
  };

  function win() {
    Game.mode = 'win';
    Sound.play('victory');
    if (document.pointerLockElement) document.exitPointerLock();
    const t = Game.stats.playTime, mm = Math.floor(t / 60), ss = Math.floor(t % 60);
    const acc = Game.stats.shots ? Math.round(Game.stats.hits / Game.stats.shots * 100) : 0;
    $('win-stats').textContent = `Time ${mm}:${String(ss).padStart(2, '0')} · ${Game.stats.kills} creatures put to rest · ${acc}% accuracy`;
    UI.show('hud', false); UI.show('touch', false);
    UI.show('win', true);
  }

  // ---------- interaction ----------
  function findInteractable() {
    const P = Player.P;
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
    for (const it of Entities.items) if (!it.taken) consider(it, 'item', it.x, it.z, 2.0);
    for (const d of Entities.doors) if (!d.open) consider(d, 'door', d.x, d.z, 2.4);
    return best;
  }

  function promptFor(t) {
    if (!t) return null;
    const P = Player.P;
    if (t.kind === 'item') { const T = ITEM_TYPES[t.obj.type]; return `${T.verb} ${T.label}`; }
    const d = t.obj;
    if (d.exit) return P.keys.includes('crown') ? 'Unlock the front door with the Crown key' : 'Open the front door';
    if (d.locked) return P.keys.includes(d.key) ? `Use the ${d.key[0].toUpperCase() + d.key.slice(1)} key` : 'Try the door';
    return 'Open door';
  }

  function interact(t) {
    const P = Player.P, s = Game.state;
    if (t.kind === 'door') {
      const d = t.obj, pos = { x: d.x, y: 1.3, z: d.z };
      if (d.exit) {
        if (P.keys.includes('crown')) { Sound.play('unlock', pos); Sound.play('door', pos); win(); }
        else { Sound.play('locked', pos); UI.message('The front door will not move. Its lock is shaped like a crown.'); }
        return;
      }
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
      case 'note':
        Sound.play('note');
        Game.mode = 'note';
        Input.fire = false;
        UI.openNote(it.def.note);
        document.querySelector('.paper').scrollTop = 0;
        return;
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
        } else if (key === 'serpent') {
          s.flags.serpent = true;
          Monsters.spawnEvent('serpent', true);
          setTimeout(() => { Sound.stinger(false); UI.message('A bell tolls once, deep in the house.', 'bad'); }, 700);
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
      UI.message('Lady Hollis rises from the altar.', 'bad', 4);
      Game.warp = 1;
    }

    // death sequence
    if (!P.alive) {
      Game.red = Math.min(1, Game.red + dt * 0.8);
      deathTimer -= dt;
      if (deathTimer <= 0 && Game.mode === 'playing') {
        Game.mode = 'dead';
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

    // now and then the batteries stutter
    flickerT -= dt;
    if (flickerT <= 0) { flickerT = 25 + Math.random() * 30; flickerLeft = 0.5 + Math.random() * 0.6; }
    let fl = 1;
    if (flickerLeft > 0) { flickerLeft -= dt; fl = Math.random() < 0.5 ? 0.15 : 1; }
    flashlight.intensity = P.flashlight && P.alive !== false ? 3.4 * fl : 0;

    muzzleLight.position.copy(camera.position).addScaledVector(fwd, 0.8);
    muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 45);

    Game.lightDim = Game.warp > 0.2 ? 0.4 + Math.random() * 0.6 : 1;
    Level.updateLights(dt, Game.time);

    // how lit is the spot you're standing in (drives the view model's ambient)
    let L = 0;
    for (const d of LIGHT_DEFS) {
      const dist = Math.hypot(d.x * CELL - P.pos.x, d.z * CELL - P.pos.z);
      L += d.intensity * Math.pow(Math.max(0, 1 - dist / d.dist), 2);
    }
    Game.localLight = Math.min(1, L);

    const U = dust.material.uniforms;
    U.uTime.value = Game.time; U.uCenter.value.copy(camera.position);
    U.uFlashPos.value.copy(flashlight.position); U.uFlashDir.value.copy(fwd); U.uFlashOn.value = flashlight.intensity > 0.5 ? 1 : 0;
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

    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    if (Game.mode !== 'title') { renderer.clearDepth(); renderer.render(Player.gunScene, camera); }
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
    else if (Game.mode === 'title') {
      Game.time += dt;
      titleCamera();
      Monsters.update(dt * 0.0001, Game.time); // keep materials ticking without letting anything move
      Entities.updateItems(dt, Game.time);
    } else if (Game.mode === 'dead') {
      Game.time += dt;
      Game.particles.update(dt);
    }
    updateLighting(dt);
    render();
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
