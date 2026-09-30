/* Witherholm — the player: movement, weapons, view model and input
   (keyboard + mouse with pointer lock, a drag-to-look fallback, and touch). */

const EYE_H = 1.62;
const PLAYER_R = 0.35;

const WEAPONS = {
  pistol: { name: 'Service Pistol', ammo: 'ammo', cap: 10, dmg: 14, pellets: 1, spreadHip: 0.03, spreadAim: 0.006, delay: 0.26, reload: 1.3, kick: 0.05 },
  shotgun: { name: 'Hollowell 12-gauge', ammo: 'shells', cap: 4, dmg: 11, pellets: 8, spreadHip: 0.085, spreadAim: 0.06, delay: 0.95, shellTime: 0.55, kick: 0.16 },
};

const Input = {
  keys: {}, fire: false, aim: false, lookX: 0, lookY: 0, stickX: 0, stickY: 0, runToggle: false,
  locked: false, dragMode: false, touch: false, sens: 1, invert: false,
  pressed: {}, // one-shot actions, consumed each frame
  press(a) { this.pressed[a] = true; },
  take(a) { const v = this.pressed[a]; this.pressed[a] = false; return v; },
};

const Player = (() => {
  const P = {
    pos: { x: 0, z: 0 }, vel: { x: 0, z: 0 }, yaw: 0, pitch: 0,
    hp: 100, alive: true, noisy: false, running: false, aiming: false,
    herbs: 0, keys: [], reserve: { ammo: 20, shells: 0 },
    weapons: { pistol: { owned: true, mag: 10 }, shotgun: { owned: false, mag: 0 } },
    current: 'pistol', flashlight: true,
    invuln: 0, bob: 0, stepSide: 0, turnT: 0, turnFrom: 0,
    fireCd: 0, reloadT: 0, reloading: false, switchT: 0, kick: 0, deathT: 0,
  };

  let camera, gunScene, gunRoot, models = {}, muzzle, gunFlash, gunAmbient;
  const raycaster = new THREE.Raycaster();

  // ---------- view model ----------
  function buildViewModel() {
    gunScene = new THREE.Scene();
    gunAmbient = new THREE.AmbientLight(0x8a8074, 0.5);
    gunScene.add(gunAmbient);
    const dl = new THREE.DirectionalLight(0xffe8d0, 0.55); dl.position.set(0.4, 1, 0.5); gunScene.add(dl);
    gunRoot = new THREE.Group(); gunScene.add(gunRoot);
    gunFlash = new THREE.PointLight(0xffaa55, 0, 2.5, 2); gunFlash.position.set(0.15, -0.05, -0.8); gunRoot.add(gunFlash);

    const metal = new THREE.MeshPhongMaterial({ color: 0x26272a, specular: 0x777777, shininess: 70 });
    const metal2 = new THREE.MeshPhongMaterial({ color: 0x3a3b3e, specular: 0x555555, shininess: 40 });
    const wood = new THREE.MeshPhongMaterial({ color: 0x4e2c14, shininess: 25 });
    const skin = new THREE.MeshPhongMaterial({ color: 0xb08a70, shininess: 8 });
    const sleeve = new THREE.MeshPhongMaterial({ color: 0x2a2620, shininess: 4 });
    const lens = new THREE.MeshBasicMaterial({ color: 0xfff4d0 });
    const box = (g, w, h, d, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); return o; };
    const cyl = (g, r, len, m, x, y, z, rx = Math.PI / 2) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), m); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); return o; };

    // pistol with an under-barrel light
    const pistol = new THREE.Group();
    const slide = box(pistol, 0.046, 0.05, 0.25, metal, 0, 0.022, -0.06);
    box(pistol, 0.04, 0.03, 0.2, metal2, 0, -0.012, -0.05);
    box(pistol, 0.042, 0.13, 0.065, metal2, 0, -0.075, 0.045, -0.28);
    box(pistol, 0.008, 0.012, 0.01, metal, 0, 0.052, -0.175);
    box(pistol, 0.03, 0.012, 0.01, metal, 0, 0.052, 0.055);
    cyl(pistol, 0.02, 0.09, metal2, 0, -0.04, -0.12);
    cyl(pistol, 0.016, 0.005, lens, 0, -0.04, -0.167);
    box(pistol, 0.07, 0.085, 0.1, skin, 0.004, -0.085, 0.055, -0.28);
    cyl(pistol, 0.05, 0.42, sleeve, 0.03, -0.2, 0.25, 1.05);
    pistol.userData = { hip: new THREE.Vector3(0.2, -0.2, -0.42), aim: new THREE.Vector3(0, -0.075, -0.36), muzzle: new THREE.Vector3(0, 0.022, -0.2), slide };
    // shotgun
    const shotgun = new THREE.Group();
    cyl(shotgun, 0.019, 0.6, metal, 0, 0.03, -0.33);
    cyl(shotgun, 0.015, 0.46, metal2, 0, -0.008, -0.27);
    const pump = box(shotgun, 0.05, 0.045, 0.15, wood, 0, -0.008, -0.3);
    box(shotgun, 0.052, 0.075, 0.18, metal2, 0, 0.018, 0.02);
    box(shotgun, 0.046, 0.085, 0.3, wood, 0, -0.03, 0.24, 0.14);
    box(shotgun, 0.07, 0.07, 0.11, skin, 0, -0.05, -0.3);
    box(shotgun, 0.065, 0.085, 0.1, skin, 0.01, -0.05, 0.1, -0.3);
    cyl(shotgun, 0.05, 0.42, sleeve, 0.04, -0.17, 0.32, 1.1);
    cyl(shotgun, 0.05, 0.4, sleeve, -0.02, -0.2, -0.12, 0.9);
    cyl(shotgun, 0.018, 0.08, metal2, 0, -0.045, -0.2);
    shotgun.userData = { hip: new THREE.Vector3(0.21, -0.2, -0.46), aim: new THREE.Vector3(0, -0.07, -0.4), muzzle: new THREE.Vector3(0, 0.03, -0.64), pump };
    models.pistol = pistol; models.shotgun = shotgun;
    gunRoot.add(pistol); gunRoot.add(shotgun);
    shotgun.visible = false;

    muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.get('muzzle'), blending: THREE.AdditiveBlending, depthTest: false, transparent: true }));
    muzzle.visible = false; muzzle.scale.setScalar(0.25);
    gunRoot.add(muzzle);
    gunScene.traverse(o => { o.frustumCulled = false; });
    return gunScene;
  }

  function init(cam) {
    camera = cam;
    P.hurt = hurt;
    camera.rotation.order = 'YXZ';
    return buildViewModel();
  }

  function spawn(state) {
    const s = state.player;
    P.pos.x = s.x; P.pos.z = s.z; P.yaw = s.yaw; P.pitch = 0;
    P.vel.x = P.vel.z = 0;
    P.hp = s.hp; P.alive = true; P.herbs = s.herbs; P.keys = [...s.keys];
    P.reserve = { ...s.reserve };
    P.weapons = { pistol: { ...s.weapons.pistol }, shotgun: { ...s.weapons.shotgun } };
    P.current = s.current; P.flashlight = true;
    P.invuln = 1; P.reloading = false; P.reloadT = 0; P.switchT = 0; P.kick = 0; P.fireCd = 0; P.deathT = 0; P.turnT = 0;
    models.pistol.visible = P.current === 'pistol'; models.shotgun.visible = P.current === 'shotgun';
    UI.updateInventory();
  }

  function snapshot() {
    return {
      x: P.pos.x, z: P.pos.z, yaw: P.yaw, hp: P.hp, herbs: P.herbs, keys: [...P.keys], reserve: { ...P.reserve },
      weapons: { pistol: { ...P.weapons.pistol }, shotgun: { ...P.weapons.shotgun } }, current: P.current,
    };
  }

  // ---------- combat ----------
  function forward() { return new THREE.Vector3(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch)); }

  function fire() {
    const W = WEAPONS[P.current], w = P.weapons[P.current];
    if (P.fireCd > 0 || P.switchT > 0) return;
    if (P.reloading) {
      if (P.current === 'shotgun' && w.mag > 0) P.reloading = false; // interrupt shell loading
      else return;
    }
    if (w.mag <= 0) {
      Sound.play('dryFire'); P.fireCd = 0.3;
      if (P.reserve[W.ammo] > 0) startReload(); else UI.message('Out of ammunition', 'bad');
      return;
    }
    w.mag--;
    P.fireCd = W.delay;
    P.kick = 1;
    Game.stats.shots++;
    Sound.play(P.current);
    Game.muzzleFlash();
    Monsters.alertNoise(P.pos.x, P.pos.z, 24);
    muzzle.visible = true; muzzle.material.rotation = Math.random() * Math.PI; muzzle.scale.setScalar(P.current === 'shotgun' ? 0.45 : 0.28);
    muzzle.userData.t = 0.05;
    gunFlash.intensity = 3;

    const origin = camera.getWorldPosition(new THREE.Vector3());
    const base = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const moving = Math.hypot(P.vel.x, P.vel.z) / 3;
    const spread = (P.aiming ? W.spreadAim : W.spreadHip) * (1 + moving * 0.8);
    let hitSomething = false;
    for (let i = 0; i < W.pellets; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
      const dir = base.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      raycaster.set(origin, dir); raycaster.far = 70;
      const hits = raycaster.intersectObjects(Game.shootables(), true);
      const h = hits.find(x => x.object.visible !== false);
      if (!h) continue;
      const mon = h.object.userData.monster;
      if (mon) {
        const falloff = W.pellets > 1 ? Math.max(0.3, Math.min(1, 1 - (h.distance - 4) / 14)) : 1;
        Monsters.hurt(mon, W.dmg * falloff, h.object.userData.zone, dir, h.point);
        hitSomething = true;
      } else {
        const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : dir.clone().negate();
        Game.particles.emit(h.point.x + n.x * 0.05, h.point.y + n.y * 0.05, h.point.z + n.z * 0.05, W.pellets > 1 ? 2 : 6, 'spark', n);
        if (i === 0) Sound.play('impact', h.point);
      }
    }
    if (hitSomething) Game.stats.hits++;
    if (w.mag === 0 && P.reserve[W.ammo] > 0) setTimeout(() => { if (P.weapons[P.current].mag === 0 && !P.reloading) startReload(); }, 350);
    UI.updateAmmo();
  }

  function startReload() {
    const W = WEAPONS[P.current], w = P.weapons[P.current];
    if (P.reloading || w.mag >= W.cap || P.reserve[W.ammo] <= 0 || P.switchT > 0) return;
    P.reloading = true;
    if (P.current === 'pistol') { P.reloadT = W.reload; Sound.play('reload'); }
    else P.reloadT = W.shellTime;
  }

  function updateReload(dt) {
    if (!P.reloading) return;
    const W = WEAPONS[P.current], w = P.weapons[P.current];
    P.reloadT -= dt;
    if (P.reloadT > 0) return;
    if (P.current === 'pistol') {
      const n = Math.min(W.cap - w.mag, P.reserve.ammo);
      w.mag += n; P.reserve.ammo -= n; P.reloading = false;
    } else {
      w.mag++; P.reserve.shells--; Sound.play('reload', 'shell');
      if (w.mag < W.cap && P.reserve.shells > 0) P.reloadT = W.shellTime;
      else { P.reloading = false; Sound.play('pump'); }
    }
    UI.updateAmmo();
  }

  function switchWeapon(name) {
    if (!name) name = P.current === 'pistol' ? 'shotgun' : 'pistol';
    if (name === P.current || !P.weapons[name].owned) return;
    P.reloading = false;
    P.current = name; P.switchT = 0.45;
    Sound.play('reload', 'shell');
    UI.updateAmmo();
  }

  function useHerb() {
    if (P.herbs <= 0) { UI.message('No herbs left'); return; }
    if (P.hp >= 100) { UI.message('You are not hurt'); return; }
    P.herbs--; P.hp = Math.min(100, P.hp + 45);
    Sound.play('heal');
    UI.message('Used Ashroot herb. The bitterness clears your head.');
    UI.updateInventory();
  }

  function hurt(dmg, from) {
    if (!P.alive || P.invuln > 0) return;
    P.hp -= dmg; P.invuln = 0.45;
    Game.damage = 1; Game.shake = Math.max(Game.shake, 0.4);
    Sound.play('hurt');
    const dx = P.pos.x - from.x, dz = P.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
    P.vel.x += dx / d * 4; P.vel.z += dz / d * 4;
    Game.particles.emit(P.pos.x - dx / d * 0.4, 1.3, P.pos.z - dz / d * 0.4, 12, 'blood', { x: dx / d, y: 0.3, z: dz / d });
    if (P.hp <= 0) { P.hp = 0; P.alive = false; P.deathT = 0; Game.onPlayerDeath(); }
    UI.updateInventory();
  }

  // ---------- per frame ----------
  function update(dt, time) {
    P.invuln = Math.max(0, P.invuln - dt);
    P.fireCd = Math.max(0, P.fireCd - dt);
    P.switchT = Math.max(0, P.switchT - dt);
    P.kick = Math.max(0, P.kick - dt * 7);

    if (!P.alive) { updateDeathCam(dt); return; }

    // look
    const sens = 0.0022 * Input.sens * (P.aiming ? 0.6 : 1);
    P.yaw -= Input.lookX * sens;
    P.pitch -= Input.lookY * sens * (Input.invert ? -1 : 1);
    Input.lookX = Input.lookY = 0;
    if (Input.keys.ArrowLeft) P.yaw += dt * 2.4;
    if (Input.keys.ArrowRight) P.yaw -= dt * 2.4;
    if (Input.keys.ArrowUp) P.pitch += dt * 1.5;
    if (Input.keys.ArrowDown) P.pitch -= dt * 1.5;
    P.pitch = Math.max(-1.35, Math.min(1.35, P.pitch));

    if (Input.take('turn') && P.turnT <= 0) { P.turnT = 0.28; P.turnFrom = P.yaw; }
    if (P.turnT > 0) {
      P.turnT -= dt;
      const k = 1 - Math.max(0, P.turnT) / 0.28;
      P.yaw = P.turnFrom + Math.PI * (k * k * (3 - 2 * k));
    }

    // move
    const K = Input.keys;
    let mx = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + Input.stickX;
    let mz = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0) - Input.stickY;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    P.aiming = Input.aim && P.switchT <= 0;
    P.running = (K.ShiftLeft || K.ShiftRight || Input.runToggle || Math.hypot(Input.stickX, Input.stickY) > 0.95) && !P.aiming && mz > 0.2;
    let speed = P.aiming ? 1.6 : P.running ? 4.7 : 2.9;
    if (P.hp < 30) speed *= 0.82;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    const tvx = (fx * mz + rx * mx) * speed, tvz = (fz * mz + rz * mx) * speed;
    const a = 1 - Math.exp(-dt * 11);
    P.vel.x += (tvx - P.vel.x) * a; P.vel.z += (tvz - P.vel.z) * a;
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    // monsters are solid
    for (const m of Monsters.list) {
      if (m.state === 'dying' || m.state === 'dormant') continue;
      const dx = P.pos.x - m.pos.x, dz = P.pos.z - m.pos.z, d = Math.hypot(dx, dz), min = m.T.radius + PLAYER_R;
      if (d < min && d > 0.001) { P.pos.x += dx / d * (min - d); P.pos.z += dz / d * (min - d); }
    }
    Level.collide(P.pos, PLAYER_R);
    const moveAmt = Math.hypot(P.vel.x, P.vel.z);
    P.noisy = P.running && moveAmt > 3;

    // head bob + footsteps
    const prev = P.bob;
    P.bob += dt * moveAmt * 2.1;
    if (Math.floor(prev / Math.PI) !== Math.floor(P.bob / Math.PI) && moveAmt > 0.8) Sound.play('step', Level.floorAt(P.pos.x, P.pos.z));

    // actions
    if (Input.fire) fire();
    if (Input.take('reload')) startReload();
    if (Input.take('swap')) switchWeapon();
    if (Input.take('w1')) switchWeapon('pistol');
    if (Input.take('w2')) { if (P.weapons.shotgun.owned) switchWeapon('shotgun'); }
    if (Input.take('herb')) useHerb();
    if (Input.take('light')) { P.flashlight = !P.flashlight; Sound.play('dryFire'); }
    updateReload(dt);

    placeCamera(dt, time, moveAmt);
    updateViewModel(dt, time, moveAmt);
  }

  function placeCamera(dt, time, moveAmt) {
    const bobAmt = Math.min(1, moveAmt / 3) * (P.aiming ? 0.3 : 1);
    const sh = Game.shake;
    camera.position.set(
      P.pos.x + (Math.random() - 0.5) * sh * 0.12,
      EYE_H + Math.sin(P.bob * 2) * 0.045 * bobAmt + (Math.random() - 0.5) * sh * 0.1,
      P.pos.z + (Math.random() - 0.5) * sh * 0.12);
    camera.rotation.set(P.pitch + P.kick * WEAPONS[P.current].kick * 0.6, P.yaw, Math.sin(P.bob) * 0.006 * bobAmt);
    const fov = P.aiming ? 55 : 72;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix(); }
  }

  function updateViewModel(dt, time, moveAmt) {
    gunRoot.position.copy(camera.position);
    gunRoot.quaternion.copy(camera.quaternion);
    for (const k in models) models[k].visible = k === P.current;
    const g = models[P.current], u = g.userData;
    const t = P.aiming ? u.aim : u.hip;
    const bobAmt = Math.min(1, moveAmt / 3) * (P.aiming ? 0.15 : 1);
    let x = t.x + Math.cos(P.bob) * 0.012 * bobAmt;
    let y = t.y + Math.abs(Math.sin(P.bob)) * 0.012 * bobAmt + Math.sin(time * 1.5) * 0.002;
    let z = t.z + P.kick * WEAPONS[P.current].kick;
    let rx = P.kick * WEAPONS[P.current].kick * 2.2, rz = 0;
    if (P.reloading) {
      const k = P.current === 'pistol' ? Math.sin(Math.min(1, 1 - P.reloadT / WEAPONS.pistol.reload) * Math.PI) : 0.5;
      y -= 0.07 * k; rx -= 0.5 * k; rz += 0.4 * k;
    }
    if (P.switchT > 0) { const k = Math.sin(P.switchT / 0.45 * Math.PI); y -= 0.25 * k; rx -= 0.6 * k; }
    const s = Math.min(1, dt * 14);
    g.position.x += (x - g.position.x) * s; g.position.y += (y - g.position.y) * s; g.position.z += (z - g.position.z) * s;
    g.rotation.x += (rx - g.rotation.x) * s; g.rotation.z += (rz - g.rotation.z) * s;
    if (u.slide) u.slide.position.z = -0.06 + P.kick * 0.04;
    if (u.pump) u.pump.position.z = -0.3 + (P.fireCd > 0.2 && P.fireCd < 0.7 ? Math.sin((P.fireCd - 0.2) / 0.5 * Math.PI) * 0.08 : 0);
    muzzle.position.copy(g.position).add(u.muzzle);
    if (muzzle.userData.t > 0) { muzzle.userData.t -= dt; if (muzzle.userData.t <= 0) muzzle.visible = false; }
    gunFlash.intensity = Math.max(0, gunFlash.intensity - dt * 40);
    gunAmbient.intensity = 0.18 + Game.localLight * 0.6 + (P.flashlight ? 0.12 : 0);
  }

  function updateDeathCam(dt) {
    P.deathT += dt;
    const k = Math.min(1, P.deathT / 1.2);
    camera.position.y = EYE_H - (EYE_H - 0.3) * k * k;
    camera.rotation.z = k * 0.9;
    camera.rotation.x = P.pitch * (1 - k) + 0.3 * k;
    gunRoot.visible = false;
  }

  function showGun(v) { if (gunRoot) gunRoot.visible = v; }

  // ---------- input wiring ----------
  function bindInput(canvas) {
    const keyActions = { KeyR: 'reload', KeyQ: 'turn', KeyF: 'light', KeyH: 'herb', Digit1: 'w1', Digit2: 'w2', KeyX: 'swap', KeyE: 'use', Enter: 'use' };
    window.addEventListener('keydown', e => {
      if (e.code === 'Tab') e.preventDefault();
      if (Game.mode === 'note') {
        if (e.code === 'KeyE' || e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); Game.closeNote(); }
        else if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'PageDown' || e.code === 'Space') { e.preventDefault(); Game.scrollNote(80); }
        else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'PageUp') { e.preventDefault(); Game.scrollNote(-80); }
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') { if (!Input.locked) Game.togglePause(); return; }
      if (Game.mode !== 'playing') return;
      if (e.code === 'Space') { e.preventDefault(); Input.fire = true; }
      Input.keys[e.code] = true;
      if (!e.repeat && keyActions[e.code]) Input.press(keyActions[e.code]);
    });
    window.addEventListener('keyup', e => { Input.keys[e.code] = false; if (e.code === 'Space') Input.fire = false; });
    window.addEventListener('blur', () => { Input.keys = {}; Input.fire = false; Input.aim = false; if (Game.mode === 'playing' && !Input.touch) Game.pause(); });

    let drag = null, lockedAt = 0;
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('mousedown', e => {
      if (Game.mode !== 'playing') return;
      if (!Input.locked && !Input.dragMode) { requestLock(canvas); return; }
      if (e.button === 2) Input.aim = true;
      if (e.button === 0) {
        if (Input.locked) Input.fire = true;
        else drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 2) Input.aim = false;
      if (e.button === 0) {
        Input.fire = false;
        if (drag && drag.moved < 6 && performance.now() - drag.t < 300 && Game.mode === 'playing') { fire(); }
        drag = null;
      }
    });
    window.addEventListener('mousemove', e => {
      if (Game.mode !== 'playing') return;
      if (Input.locked) {
        // browsers sometimes report one huge jump right after the pointer is captured
        if (performance.now() - lockedAt < 150 || Math.abs(e.movementX) > 220 || Math.abs(e.movementY) > 220) return;
        Input.lookX += e.movementX; Input.lookY += e.movementY;
      }
      else if (drag) { Input.lookX += e.movementX * 1.4; Input.lookY += e.movementY * 1.4; drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY); }
    });
    document.addEventListener('pointerlockchange', () => {
      Input.locked = document.pointerLockElement === canvas;
      if (Input.locked) lockedAt = performance.now();
      if (!Input.locked) { Input.fire = false; Input.aim = false; if (Game.mode === 'playing') Game.pause(); }
    });
    document.addEventListener('pointerlockerror', () => enableDragMode());
    bindTouch();
  }

  function enableDragMode() {
    if (Input.dragMode || Input.touch) return;
    Input.dragMode = true;
    UI.message('Mouse capture is blocked here. Drag to look, click or Space to shoot, arrow keys turn.', 'warn', 6);
  }

  function requestLock(canvas) {
    if (Input.touch || Input.dragMode) return;
    if (!canvas.requestPointerLock) { enableDragMode(); return; }
    try {
      const r = canvas.requestPointerLock();
      if (r && r.catch) r.catch(() => enableDragMode());
    } catch (err) { enableDragMode(); }
  }

  function bindTouch() {
    const $ = id => document.getElementById(id);
    const stick = $('stick'), knob = $('knob'), pad = $('lookpad');
    let stickId = null, lookId = null, lx = 0, ly = 0;
    stick.addEventListener('pointerdown', e => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); e.preventDefault(); });
    stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
    const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; Input.stickX = Input.stickY = 0; knob.style.transform = ''; };
    stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
    function moveStick(e) {
      const r = stick.getBoundingClientRect(), R = r.width / 2;
      let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
      const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
      Input.stickX = dx / R; Input.stickY = dy / R;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    pad.addEventListener('pointerdown', e => { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; pad.setPointerCapture(e.pointerId); });
    pad.addEventListener('pointermove', e => { if (e.pointerId !== lookId) return; Input.lookX += (e.clientX - lx) * 2.2; Input.lookY += (e.clientY - ly) * 2.2; lx = e.clientX; ly = e.clientY; });
    const endLook = e => { if (e.pointerId === lookId) lookId = null; };
    pad.addEventListener('pointerup', endLook); pad.addEventListener('pointercancel', endLook);

    const hold = (id, on, off) => {
      const b = $(id);
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); on(b); });
      const up = () => off && off(b);
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    };
    hold('t-fire', () => { Input.fire = true; }, () => { Input.fire = false; });
    hold('t-aim', b => { Input.aim = !Input.aim; b.classList.toggle('active', Input.aim); });
    hold('t-run', b => { Input.runToggle = !Input.runToggle; b.classList.toggle('active', Input.runToggle); });
    hold('t-use', () => Game.mode === 'note' ? Game.closeNote() : Input.press('use'));
    hold('t-reload', () => Input.press('reload'));
    hold('t-turn', () => Input.press('turn'));
    hold('t-swap', () => Input.press('swap'));
    hold('t-herb', () => Input.press('herb'));
    hold('t-light', () => Input.press('light'));
    hold('t-pause', () => Game.togglePause());
  }

  function enableTouch() {
    Input.touch = true;
    document.body.classList.add('touch');
  }

  function aimDir() { return forward(); }

  return { P, init, spawn, snapshot, update, hurt, bindInput, requestLock, enableTouch, showGun, aimDir, fire,
    get gunScene() { return gunScene; } };
})();
