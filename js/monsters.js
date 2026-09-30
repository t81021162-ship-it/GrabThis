/* Witherholm — the Bloom's creatures.
   Husk: a shambling former servant. Crawler: fast, low, lunges.
   The Matron: the lady of the house, now a walking garden with a glowing heart. */

const MONSTER_TYPES = {
  husk: { hp: 60, speed: 1.35, radius: 0.38, range: 1.55, damage: 18, windup: 0.55, recover: 1.0, sight: 20, hear: 7, stagger: 0.45, staggerChance: 0.4 },
  crawler: { hp: 34, speed: 3.3, radius: 0.36, range: 3.0, damage: 10, windup: 0.45, recover: 1.4, sight: 16, hear: 8, stagger: 0.3, staggerChance: 0.5 },
  matron: { hp: 650, speed: 1.15, radius: 1.0, range: 3.3, damage: 34, windup: 0.9, recover: 1.3, sight: 40, hear: 40, stagger: 0.35, staggerChance: 0.25 },
};

// x, y grid cells; `event` spawns them later in the story
const MONSTER_DEFS = [
  { id: 'h_dining1', type: 'husk', x: 5, y: 21 },
  { id: 'h_dining2', type: 'husk', x: 11, y: 26, dormant: true },
  { id: 'h_kitchen', type: 'husk', x: 11, y: 14 },
  { id: 'c_kitchen', type: 'crawler', x: 5, y: 12 },
  { id: 'h_hall', type: 'husk', x: 19, y: 15, event: 'moth' },
  { id: 'c_lib1', type: 'crawler', x: 31, y: 21 },
  { id: 'c_lib2', type: 'crawler', x: 34, y: 27 },
  { id: 'h_lib', type: 'husk', x: 35, y: 19, dormant: true },
  { id: 'h_lib2', type: 'husk', x: 31, y: 19, event: 'serpent' },
  { id: 'h_study1', type: 'husk', x: 29, y: 10 },
  { id: 'h_study2', type: 'husk', x: 34, y: 9 },
  { id: 'boss', type: 'matron', x: 19, y: 4 },
  { id: 'h_foyer1', type: 'husk', x: 16, y: 24, event: 'bossDead' },
  { id: 'h_foyer2', type: 'husk', x: 23, y: 21, event: 'bossDead' },
  { id: 'c_foyer', type: 'crawler', x: 21, y: 22, event: 'bossDead' },
];

const Monsters = (() => {
  let scene;
  const list = [];
  let flowTimer = 0;
  let lastStinger = -99;

  // ---------- model builders (all face +z) ----------
  function fleshMats(U, skin, cloth, glow) {
    const flesh = Shaders.patchFlesh(new THREE.MeshPhongMaterial({ color: skin, shininess: 35, specular: 0x2a1a1a }), U);
    const rag = Shaders.patchFlesh(new THREE.MeshPhongMaterial({ color: cloth, shininess: 4 }), U, { veins: 0 });
    const bloom = Shaders.patchFlesh(new THREE.MeshPhongMaterial({ color: glow, emissive: new THREE.Color(glow).multiplyScalar(0.45), shininess: 60 }), U, { veins: 0 });
    return { flesh, rag, bloom };
  }
  function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  }
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe8e4b0 });

  function buildHusk(U) {
    const tint = 0.85 + Math.random() * 0.25;
    const skin = new THREE.Color(0x9c9a86).multiplyScalar(tint);
    const { flesh, rag, bloom } = fleshMats(U, skin, [0x3a3228, 0x2a2e36, 0x3e2a22][Math.random() * 3 | 0], 0xd8c040);
    const root = new THREE.Group();
    const hips = new THREE.Group(); hips.position.y = 0.9; root.add(hips);
    const legs = [-1, 1].map(s => {
      const p = new THREE.Group(); p.position.set(0.11 * s, 0, 0); hips.add(p);
      mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.88, 6), rag, p, 0, -0.44, 0);
      mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), flesh, p, 0, -0.87, 0.05);
      return p;
    });
    const torso = new THREE.Group(); torso.rotation.x = 0.35; hips.add(torso);
    mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.62, 8), flesh, torso, 0, 0.31, 0);
    mesh(new THREE.CylinderGeometry(0.215, 0.18, 0.52, 8, 1, true, 0.6, 4.6), rag, torso, 0, 0.26, 0).material.side = THREE.DoubleSide;
    // fungal growth bursting from the shoulder
    for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 6, 5), bloom, torso, 0.1 + Math.random() * 0.1, 0.5 + Math.random() * 0.12, -0.08 + Math.random() * 0.1);
    const neck = new THREE.Group(); neck.position.y = 0.66; torso.add(neck);
    const head = mesh(new THREE.SphereGeometry(0.13, 8, 7), flesh, neck, 0, 0.1, 0.02);
    head.scale.set(1, 1.15, 1);
    head.userData.zone = 'head';
    const jaw = mesh(new THREE.BoxGeometry(0.11, 0.04, 0.1), flesh, neck, 0, -0.01, 0.07); jaw.rotation.x = 0.5; jaw.userData.zone = 'head';
    [-1, 1].forEach(s => { const e = mesh(new THREE.SphereGeometry(0.022, 5, 4), eyeMat, neck, 0.045 * s, 0.13, 0.13); e.castShadow = false; e.userData.zone = 'head'; });
    for (let i = 0; i < 4; i++) { const b = mesh(new THREE.SphereGeometry(0.025 + Math.random() * 0.035, 6, 5), bloom, neck, -0.05 + Math.random() * 0.1, 0.2 + Math.random() * 0.05, -0.08 + Math.random() * 0.06); b.userData.zone = 'head'; }
    const arms = [-1, 1].map(s => {
      const p = new THREE.Group(); p.position.set(0.25 * s, 0.56, 0); torso.add(p);
      mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.64, 6), flesh, p, 0, -0.32, 0);
      mesh(new THREE.BoxGeometry(0.07, 0.12, 0.05), flesh, p, 0, -0.68, 0);
      return p;
    });
    return { root, hips, legs, torso, neck, arms, height: 1.75 };
  }

  function buildCrawler(U) {
    const { flesh, rag, bloom } = fleshMats(U, 0x8a5a50, 0x4a2a26, 0xe0b040);
    const root = new THREE.Group();
    const body = new THREE.Group(); body.position.y = 0.42; root.add(body);
    const torso = mesh(new THREE.SphereGeometry(0.3, 10, 8), flesh, body); torso.scale.set(0.85, 0.6, 1.6);
    for (let i = 0; i < 5; i++) { const sp = mesh(new THREE.ConeGeometry(0.04, 0.18 + Math.random() * 0.1, 5), bloom, body, (Math.random() - 0.5) * 0.12, 0.18, -0.35 + i * 0.16); sp.rotation.x = -0.4; }
    const neck = new THREE.Group(); neck.position.set(0, 0.04, 0.48); body.add(neck);
    const head = mesh(new THREE.SphereGeometry(0.19, 8, 7), flesh, neck, 0, 0, 0.1); head.scale.set(1, 0.85, 1.1); head.userData.zone = 'head';
    const maw = mesh(new THREE.ConeGeometry(0.13, 0.22, 7, 1, true), rag, neck, 0, -0.02, 0.28); maw.rotation.x = Math.PI / 2; maw.material.side = THREE.DoubleSide; maw.userData.zone = 'head';
    [-1, 1].forEach(s => { const e = mesh(new THREE.SphereGeometry(0.03, 5, 4), eyeMat, neck, 0.09 * s, 0.1, 0.22); e.userData.zone = 'head'; });
    // invisible, slightly generous body hitbox so the low crawler is fair to shoot
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 1.0), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0, -0.12); body.add(hit);
    const legs = [];
    for (let i = 0; i < 6; i++) {
      const s = i % 2 ? 1 : -1, zi = (Math.floor(i / 2) - 1) * 0.3;
      const p = new THREE.Group(); p.position.set(0.18 * s, 0, zi); body.add(p);
      const upper = new THREE.Group(); upper.rotation.z = s * 1.0; p.add(upper);
      mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.42, 5), flesh, upper, 0, 0.21, 0).rotation.z = 0;
      const knee = new THREE.Group(); knee.position.y = 0.42; knee.rotation.z = s * -2.2; upper.add(knee);
      mesh(new THREE.CylinderGeometry(0.025, 0.012, 0.55, 5), rag, knee, 0, 0.27, 0);
      p.userData.side = s; p.userData.phase = i * 1.3;
      legs.push(p);
    }
    return { root, body, neck, legs, height: 0.7 };
  }

  function buildMatron(U) {
    const { flesh, rag, bloom } = fleshMats(U, 0x8a6e62, 0x2e2220, 0xf0c050);
    const root = new THREE.Group();
    const skirt = mesh(new THREE.ConeGeometry(1.15, 1.9, 14, 3, true), rag, root, 0, 0.95, 0); skirt.material.side = THREE.DoubleSide;
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      const t = mesh(new THREE.ConeGeometry(0.1, 1.1, 5), flesh, root, Math.cos(a) * 1.05, 0.12, Math.sin(a) * 1.05);
      t.rotation.set(Math.sin(a) * 1.35, 0, -Math.cos(a) * 1.35);
    }
    const body = new THREE.Group(); body.position.y = 2.05; root.add(body);
    const torso = mesh(new THREE.SphereGeometry(0.75, 14, 10), flesh, body); torso.scale.set(1, 1.2, 0.82);
    for (let i = 0; i < 12; i++) mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.09, 6, 5), bloom, body, (Math.random() - 0.5) * 1.1, (Math.random() - 0.3) * 1.1, -0.3 - Math.random() * 0.3);
    // the heart: weak point
    const heartMat = Shaders.patchFlesh(new THREE.MeshPhongMaterial({ color: 0xffd070, emissive: 0xff8a20, shininess: 90 }), U, { veins: 0 });
    const heart = mesh(new THREE.SphereGeometry(0.24, 12, 10), heartMat, body, 0, 0.05, 0.6);
    heart.userData.zone = 'weak';
    const heartLight = new THREE.PointLight(0xff9a30, 1.3, 7, 2);
    heartLight.position.set(0, 0.05, 0.9); body.add(heartLight);
    const neck = new THREE.Group(); neck.position.set(0, 0.95, 0.12); body.add(neck);
    const head = mesh(new THREE.SphereGeometry(0.3, 10, 8), flesh, neck, 0, 0.12, 0); head.scale.set(0.9, 1.15, 0.95); head.userData.zone = 'head';
    const maw = mesh(new THREE.BoxGeometry(0.06, 0.34, 0.1), new THREE.MeshBasicMaterial({ color: 0x220404 }), neck, 0, 0.08, 0.27); maw.userData.zone = 'head';
    const petals = new THREE.Group(); petals.position.y = 0.3; neck.add(petals);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const p = mesh(new THREE.ConeGeometry(0.13, 0.75, 5), bloom, petals, Math.cos(a) * 0.22, 0.25, Math.sin(a) * 0.22);
      p.scale.z = 0.35; p.rotation.set(Math.sin(a) * 0.7, -a, -Math.cos(a) * 0.7);
      p.userData.zone = 'head';
    }
    const arms = [-1, 1].map(s => {
      const sh = new THREE.Group(); sh.position.set(0.78 * s, 0.45, 0.05); body.add(sh);
      mesh(new THREE.CylinderGeometry(0.13, 0.1, 1.25, 7), flesh, sh, 0, -0.62, 0);
      const el = new THREE.Group(); el.position.y = -1.22; sh.add(el);
      mesh(new THREE.CylinderGeometry(0.1, 0.07, 1.15, 7), flesh, el, 0, -0.57, 0);
      for (let c = 0; c < 3; c++) { const cl = mesh(new THREE.ConeGeometry(0.04, 0.4, 4), rag, el, (c - 1) * 0.06, -1.25, 0.03); cl.rotation.x = Math.PI + (c - 1) * 0.2; }
      return { sh, el };
    });
    return { root, body, neck, arms, heart, heartLight, petals, skirt, height: 3.3 };
  }

  // ---------- lifecycle ----------
  function spawn(def, opts = {}) {
    const T = MONSTER_TYPES[def.type];
    const U = Shaders.makeFleshUniforms(def.type === 'matron' ? 0xffb040 : 0xd8c040);
    const parts = def.type === 'husk' ? buildHusk(U) : def.type === 'crawler' ? buildCrawler(U) : buildMatron(U);
    const c = opts.pos || Level.cellCenter(def.x, def.y);
    const m = {
      id: def.id || null, def, type: def.type, T, U, parts, root: parts.root,
      pos: { x: c.x, z: c.z }, heading: Math.random() * Math.PI * 2,
      hp: T.hp, state: def.dormant ? 'dormant' : 'idle', aware: false, t: 0, phase: Math.random() * 10,
      speedMul: def.type === 'husk' ? 0.85 + Math.random() * 0.4 : 1,
      staggerT: 0, lostT: 0, groanT: 2 + Math.random() * 6, twitchT: 1, twitch: 0,
      lunge: null, hitDone: false, summonT: 10, dieT: 0, rage: 0, summoned: !!opts.summoned,
    };
    m.root.rotation.order = 'YXZ';
    m.root.traverse(o => { if (o.isMesh) o.userData.monster = m; });
    m.root.position.set(m.pos.x, 0, m.pos.z);
    if (m.state === 'dormant') { m.root.rotation.x = -Math.PI / 2 + 0.1; m.root.position.y = 0.2; }
    scene.add(m.root);
    list.push(m);
    if (opts.aware) becomeAware(m, true);
    return m;
  }

  function clearAll() {
    for (const m of list) scene.remove(m.root);
    list.length = 0;
  }

  function reset(state) {
    clearAll();
    for (const def of MONSTER_DEFS) {
      if (state.dead.includes(def.id)) continue;
      if (def.event && !state.flags[def.event]) continue;
      spawn(def);
    }
  }

  function spawnEvent(ev, aware) {
    for (const def of MONSTER_DEFS) if (def.event === ev) spawn(def, { aware });
  }

  function becomeAware(m, silent) {
    if (m.aware || m.state === 'dying' || m.state === 'dead') return;
    m.aware = true;
    if (m.state === 'idle') m.state = 'chase';
    if (silent) return;
    const p = { x: m.pos.x, y: 1.4, z: m.pos.z };
    if (m.type === 'crawler') Sound.play('screech', p);
    else if (m.type === 'husk') Sound.play('groan', p, 0.9 + Math.random() * 0.3, 1.2);
    if (Game.time - lastStinger > 25 && m.type !== 'matron') { lastStinger = Game.time; Sound.stinger(false); }
  }

  function alertNoise(x, z, radius) {
    for (const m of list) {
      if (m.aware || m.state === 'dying' || m.state === 'dead' || m.type === 'matron') continue;
      if (Math.hypot(m.pos.x - x, m.pos.z - z) < radius && Level.flowAt(Level.cellX(m.pos.x), Level.cellX(m.pos.z)) >= 0) {
        if (m.state === 'dormant') wakeDormant(m); else becomeAware(m);
      }
    }
  }

  function wakeDormant(m) {
    m.state = 'rising'; m.t = 0;
    Sound.play('rise', { x: m.pos.x, y: 0.5, z: m.pos.z });
  }

  function hurt(m, dmg, zone, dir, point) {
    if (m.state === 'dying' || m.state === 'dead') return;
    let mult = 1;
    if (zone === 'head') mult = m.type === 'matron' ? 1.2 : 2.3;
    if (zone === 'weak') mult = 3.2;
    if (m.type === 'matron' && zone !== 'weak' && zone !== 'head') mult = 0.45;
    const d = dmg * mult;
    m.hp -= d;
    m.U.uHit.value = zone === 'weak' ? 1.2 : 0.8;
    Game.particles.emit(point.x, point.y, point.z, zone === 'weak' ? 14 : 9, zone === 'weak' ? 'spore' : 'blood', { x: -dir.x, y: 0.2, z: -dir.z });
    Game.particles.emit(point.x, point.y, point.z, 6, 'blood', { x: dir.x, y: 0.1, z: dir.z });
    Sound.play('flesh', point);
    if (m.hp <= 0) { die(m, dir); return; }
    if (m.state === 'dormant') { wakeDormant(m); return; }
    if (!m.aware) becomeAware(m);
    const chance = zone === 'head' || zone === 'weak' ? Math.max(0.85, m.T.staggerChance) : m.T.staggerChance;
    if (m.state !== 'rising' && m.state !== 'screech' && Math.random() < chance) {
      m.staggerT = m.T.stagger * (zone === 'head' ? 1.6 : 1);
      if (m.state === 'windup') m.state = 'chase';
      if (m.type !== 'matron') { m.pos.x += dir.x * 0.22; m.pos.z += dir.z * 0.22; Level.collide(m.pos, m.T.radius); }
      if (m.type === 'matron') Sound.play('groan', { x: m.pos.x, y: 3, z: m.pos.z }, 0.45, 1.2);
    }
    if (m.type === 'matron') UI.bossHealth(m.hp / m.T.hp);
  }

  function die(m, dir) {
    m.lying = m.state === 'dormant' || m.state === 'rising';
    m.state = 'dying'; m.dieT = 0; m.hp = 0;
    m.root.traverse(o => { if (o.isMesh) o.castShadow = false; });
    m.fallDir = dir;
    Game.stats.kills++;
    const p = { x: m.pos.x, y: 1, z: m.pos.z };
    if (m.type === 'matron') { Sound.play('roar', p); Game.onBossDead(m); }
    else if (m.type === 'crawler') Sound.play('screech', p);
    else Sound.play('groan', p, 0.7, 1.4);
    if (m.id) Game.state.dead.push(m.id);
    Entities.decal(m.pos.x, m.pos.z, m.type === 'matron' ? 4 : 1.6);
    // husks sometimes still carry a few rounds
    if (m.type === 'husk' && Math.random() < 0.3) Game.dropItem('ammo', m.pos.x + 0.3, m.pos.z + 0.3);
  }

  // ---------- behaviour ----------
  function update(dt, time) {
    const P = Game.player;
    flowTimer -= dt;
    if (flowTimer <= 0) { flowTimer = 0.3; Level.computeFlow(Level.cellX(P.pos.x), Level.cellX(P.pos.z)); }

    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      m.U.uTime.value = time + m.phase;
      m.U.uHit.value = Math.max(0, m.U.uHit.value - dt * 5);

      if (m.state === 'dying') { animateDeath(m, dt); if (m.state === 'dead') { scene.remove(m.root); list.splice(i, 1); } continue; }

      const dx = P.pos.x - m.pos.x, dz = P.pos.z - m.pos.z, dist = Math.hypot(dx, dz);
      const canSee = dist < m.T.sight && Level.lineOfSight(m.pos.x, m.pos.z, P.pos.x, P.pos.z);

      if (m.state === 'dormant') {
        if (dist < 4.2 && canSee && P.alive) wakeDormant(m);
        animate(m, dt, 0);
        continue;
      }
      if (m.state === 'rising') {
        m.t += dt;
        const k = Math.min(1, m.t / 1.6), e = k * k * (3 - 2 * k);
        m.root.rotation.x = (-Math.PI / 2 + 0.1) * (1 - e);
        m.root.position.y = 0.2 * (1 - e);
        faceToward(m, dx, dz, dt * 2);
        m.root.rotation.y = m.heading;
        if (k >= 1) { m.state = 'chase'; m.aware = true; }
        animate(m, dt, 0);
        continue;
      }

      // perception
      if (!m.aware && P.alive) {
        const fx = Math.sin(m.heading), fz = Math.cos(m.heading);
        const facing = (fx * dx + fz * dz) / (dist || 1) > -0.1;
        if (m.type === 'matron') { if (Game.inChapel()) becomeAware(m); }
        else if ((canSee && (facing || dist < 5)) || (dist < m.T.hear && P.noisy && canSee)) becomeAware(m);
      }
      if (m.aware) {
        if (canSee) m.lostT = 0; else m.lostT += dt;
        if (m.lostT > 14 && dist > 16 && m.type !== 'matron') { m.aware = false; m.state = 'idle'; }
      }

      // ambient voice
      m.groanT -= dt;
      if (m.groanT <= 0 && dist < 22) {
        m.groanT = (m.aware ? 2.5 : 7) + Math.random() * 5;
        const p = { x: m.pos.x, y: m.parts.height * 0.8, z: m.pos.z };
        if (m.type === 'husk') Sound.play('groan', p, 0.85 + Math.random() * 0.4, 0.8 + Math.random() * 0.6);
        else if (m.type === 'crawler') { if (m.aware && Math.random() < 0.5) Sound.play('screech', p); }
        else Sound.play('groan', p, 0.4, 1.6);
      }

      let moveSpeed = 0;
      if (m.staggerT > 0) {
        m.staggerT -= dt;
      } else if (m.state === 'windup') {
        m.t += dt;
        faceToward(m, dx, dz, dt * 6);
        if (m.t >= m.T.windup * (m.rage ? 0.7 : 1)) strike(m, dist, dx, dz);
      } else if (m.state === 'lunge') {
        m.t += dt;
        const sp = 8;
        m.pos.x += m.lunge.x * sp * dt; m.pos.z += m.lunge.z * sp * dt;
        Level.collide(m.pos, m.T.radius);
        if (!m.hitDone && dist < 1.0 && P.alive) { m.hitDone = true; P.hurt(m.T.damage, m.pos); Sound.play('bite', { x: m.pos.x, y: 0.5, z: m.pos.z }); }
        if (m.t > 0.32) { m.state = 'recover'; m.t = 0; }
        moveSpeed = sp;
      } else if (m.state === 'recover') {
        m.t += dt;
        if (m.t >= m.T.recover) m.state = 'chase';
      } else if (m.state === 'screech') {
        m.t += dt;
        if (m.t > 0.5 && !m.hitDone) { m.hitDone = true; summon(m); }
        if (m.t > 1.6) { m.state = 'chase'; m.t = 0; }
      } else if (m.aware && P.alive) {
        // boss abilities
        if (m.type === 'matron') {
          m.summonT -= dt;
          if (m.hp < m.T.hp * 0.5 && !m.rage) { m.rage = 1; m.U.uRage.value = 1; Sound.play('roar', { x: m.pos.x, y: 3, z: m.pos.z }); Game.warp = 1; UI.message('The Matron is enraged', 'bad'); }
          if (m.summonT <= 0) {
            m.summonT = m.rage ? 11 : 15;
            const alive = list.filter(o => o.summoned && o.state !== 'dying').length;
            if (alive < 3) { m.state = 'screech'; m.t = 0; m.hitDone = false; Sound.play('roar', { x: m.pos.x, y: 3, z: m.pos.z }); Game.warp = 1; animate(m, dt, 0); continue; }
          }
        }
        if (dist < m.T.range && canSee) {
          m.state = 'windup'; m.t = 0; m.hitDone = false;
          if (m.type === 'crawler') Sound.play('screech', { x: m.pos.x, y: 0.5, z: m.pos.z });
        } else {
          moveSpeed = m.T.speed * m.speedMul * (m.rage ? 1.5 : 1);
          if (m.type === 'husk') moveSpeed *= 0.8 + 0.35 * Math.max(0, Math.sin(time * 1.3 + m.phase)); // lurching gait
          steer(m, dt, moveSpeed, canSee);
        }
      }

      // don't overlap the player or each other
      separate(m);
      if (m.type === 'matron') m.pos.z = Math.min(m.pos.z, 9 * CELL - 1.05);
      m.root.position.x = m.pos.x; m.root.position.z = m.pos.z;
      m.root.rotation.y = m.heading;
      animate(m, dt, moveSpeed);
    }
  }

  function faceToward(m, dx, dz, k) {
    const target = Math.atan2(dx, dz);
    let d = target - m.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    m.heading += d * Math.min(1, k);
  }

  function steer(m, dt, speed, canSee) {
    const P = Game.player;
    let tx = P.pos.x, tz = P.pos.z;
    if (!(canSee && Level.walkLine(m.pos.x, m.pos.z, P.pos.x, P.pos.z, m.T.radius * 0.8))) {
      const cx = Level.cellX(m.pos.x), cy = Level.cellX(m.pos.z);
      let best = Level.flowAt(cx, cy), bx = -1, by = -1;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const f = Level.flowAt(cx + ox, cy + oy);
        if (f >= 0 && (best < 0 || f < best)) { best = f; bx = cx + ox; by = cy + oy; }
      }
      if (bx >= 0) { const c = Level.cellCenter(bx, by); tx = c.x; tz = c.z; }
      else if (Level.flowAt(cx, cy) < 0 && !canSee) return; // no route: wait
    }
    const dx = tx - m.pos.x, dz = tz - m.pos.z, d = Math.hypot(dx, dz) || 1;
    m.pos.x += dx / d * speed * dt; m.pos.z += dz / d * speed * dt;
    Level.collide(m.pos, m.T.radius);
    faceToward(m, dx, dz, dt * 5);
  }

  function separate(m) {
    const P = Game.player;
    for (const o of list) {
      if (o === m || o.state === 'dying' || o.state === 'dormant') continue;
      const dx = m.pos.x - o.pos.x, dz = m.pos.z - o.pos.z, d = Math.hypot(dx, dz), min = m.T.radius + o.T.radius;
      if (d < min && d > 0.001) { const push = (min - d) * 0.5; m.pos.x += dx / d * push; m.pos.z += dz / d * push; }
    }
    const dx = m.pos.x - P.pos.x, dz = m.pos.z - P.pos.z, d = Math.hypot(dx, dz), min = m.T.radius + 0.35;
    if (d < min && d > 0.001) { m.pos.x += dx / d * (min - d); m.pos.z += dz / d * (min - d); }
    Level.collide(m.pos, m.T.radius);
  }

  function strike(m, dist, dx, dz) {
    const P = Game.player;
    const p = { x: m.pos.x, y: 1, z: m.pos.z };
    if (m.type === 'crawler') {
      const d = Math.hypot(dx, dz) || 1;
      m.lunge = { x: dx / d, z: dz / d }; m.state = 'lunge'; m.t = 0; m.hitDone = false;
      return;
    }
    if (m.type === 'matron') {
      Sound.play('slam', p);
      Game.shake = Math.max(Game.shake, 0.6);
      Game.particles.emit(m.pos.x + Math.sin(m.heading) * 2, 0.1, m.pos.z + Math.cos(m.heading) * 2, 20, 'dust');
      if (dist < m.T.range + 0.6 && P.alive) P.hurt(m.T.damage, m.pos);
    } else if (dist < m.T.range + 0.45 && P.alive) {
      Sound.play('bite', p);
      P.hurt(m.T.damage, m.pos);
    }
    m.state = 'recover'; m.t = 0;
  }

  function summon(m) {
    for (let k = 0; k < 2; k++) {
      const a = m.heading + (k ? 1.2 : -1.2);
      const pos = { x: m.pos.x + Math.sin(a) * 2.2, z: m.pos.z + Math.cos(a) * 2.2 };
      Level.collide(pos, 0.4);
      const c = spawn({ type: 'crawler' }, { pos, summoned: true, aware: true });
      Game.particles.emit(pos.x, 0.3, pos.z, 18, 'spore');
      c.state = 'recover'; c.t = 0.3;
    }
  }

  // ---------- animation ----------
  function animate(m, dt, speed) {
    const p = m.parts, time = Game.time;
    m.phase += dt * (speed > 0 ? speed * 3.0 : 0.8);
    const ph = m.phase;
    if (m.type === 'husk') {
      const walk = Math.min(1, speed / 1.2);
      p.legs[0].rotation.x = Math.sin(ph) * 0.5 * walk;
      p.legs[1].rotation.x = -Math.sin(ph) * 0.5 * walk;
      p.hips.position.y = 0.9 + Math.abs(Math.cos(ph)) * 0.04 * walk;
      p.torso.rotation.z = Math.sin(ph) * 0.1 * walk + Math.sin(time * 0.7 + m.phase) * 0.04;
      m.twitchT -= dt;
      if (m.twitchT <= 0) { m.twitchT = 0.4 + Math.random() * 2.5; m.twitch = (Math.random() - 0.5) * 1.1; }
      p.neck.rotation.z += (m.twitch - p.neck.rotation.z) * Math.min(1, dt * 18);
      p.neck.rotation.x = 0.2 + Math.sin(time * 1.1 + m.phase) * 0.1;
      let armX = m.aware ? -1.7 + Math.sin(ph * 0.5) * 0.12 : 0.15 + Math.sin(time + m.phase) * 0.05;
      let torsoX = 0.35;
      if (m.state === 'windup') { const k = m.t / m.T.windup; armX = -1.8 - k * 0.7; torsoX = 0.35 - k * 0.3; }
      if (m.state === 'recover' && m.t < 0.3) { armX = -1.3; torsoX = 0.75; }
      if (m.staggerT > 0) { torsoX = -0.1; armX = -0.4; }
      p.arms.forEach((a, i) => { a.rotation.x += (armX + (i ? 0.1 : -0.05) - a.rotation.x) * Math.min(1, dt * 10); a.rotation.z = (i ? -0.15 : 0.15); });
      p.torso.rotation.x += (torsoX - p.torso.rotation.x) * Math.min(1, dt * 12);
    } else if (m.type === 'crawler') {
      const walk = Math.min(1, speed / 2 + (m.aware ? 0.2 : 0));
      p.legs.forEach(l => { const s = l.userData.side; l.rotation.y = Math.sin(ph * 2.2 + l.userData.phase) * 0.45 * walk; l.rotation.x = Math.max(0, Math.cos(ph * 2.2 + l.userData.phase)) * 0.25 * walk * s; });
      p.body.position.y = 0.42 + Math.sin(ph * 4.4) * 0.03 * walk;
      p.neck.rotation.y = Math.sin(time * 6 + m.phase) * 0.15;
      let nx = 0;
      if (m.state === 'windup') { nx = -0.5; p.body.position.y = 0.3; }
      if (m.state === 'lunge') nx = -0.3;
      p.neck.rotation.x += (nx - p.neck.rotation.x) * Math.min(1, dt * 10);
    } else {
      const walk = Math.min(1, speed);
      p.body.rotation.z = Math.sin(ph * 0.8) * 0.06 * walk + Math.sin(time * 0.5) * 0.03;
      p.body.position.y = 2.05 + Math.sin(time * 1.4) * 0.05;
      p.petals.rotation.y += dt * (m.rage ? 1.6 : 0.4);
      const beat = 1 + Math.pow(Math.max(0, Math.sin(time * (m.rage ? 9 : 5))), 8) * 0.25;
      p.heart.scale.setScalar(beat);
      p.heartLight.intensity = (m.rage ? 1.8 : 1.2) * beat;
      p.skirt.rotation.y += dt * 0.2;
      let shX = 0.2 + Math.sin(time + 1) * 0.08, elX = -0.3, shZ = 0.25;
      if (m.state === 'windup') { const k = m.t / (m.T.windup * (m.rage ? 0.7 : 1)); shX = -2.6 * k; elX = -0.6 * k; }
      if (m.state === 'recover' && m.t < 0.35) { shX = -0.9; elX = -0.2; }
      if (m.state === 'screech') { shX = -0.6; shZ = 1.3; p.neck.rotation.x = -0.5; } else p.neck.rotation.x += (0.1 - p.neck.rotation.x) * Math.min(1, dt * 4);
      p.arms.forEach(({ sh, el }, i) => {
        const s = i ? -1 : 1;
        sh.rotation.x += (shX - sh.rotation.x) * Math.min(1, dt * 7);
        sh.rotation.z += (shZ * s - sh.rotation.z) * Math.min(1, dt * 5);
        el.rotation.x += (elX - el.rotation.x) * Math.min(1, dt * 7);
      });
      m.U.uPulse.value = 0.03 + m.rage * 0.03;
    }
  }

  function animateDeath(m, dt) {
    m.dieT += dt;
    const t = m.dieT;
    if (m.type === 'husk' && !m.lying) {
      const k = Math.min(1, t / 0.7);
      m.root.rotation.x = -k * k * (Math.PI / 2 - 0.12);
      m.root.position.y = 0.12 * k;
    } else if (m.type === 'crawler') {
      const k = Math.min(1, t / 0.4);
      m.root.rotation.z = k * 2.6; m.root.position.y = k * 0.4;
    } else {
      const k = Math.min(1, t / 3);
      m.root.position.y = -k * 1.2;
      m.root.rotation.z = Math.sin(t * 20) * 0.03 * (1 - k);
      m.parts.heartLight.intensity = 2 * (1 - k);
      if (Math.random() < 0.4) Game.particles.emit(m.pos.x + (Math.random() - 0.5) * 2, 1 + Math.random() * 2, m.pos.z + (Math.random() - 0.5) * 2, 2, 'spore');
    }
    const start = m.type === 'matron' ? 1.0 : 0.9, len = m.type === 'matron' ? 3.5 : 2.2;
    m.U.uDissolve.value = Math.min(1, Math.max(0, (t - start) / len));
    if (m.U.uDissolve.value >= 1) m.state = 'dead';
  }

  function boss() { return list.find(m => m.type === 'matron' && m.state !== 'dead'); }

  function init(sc) { scene = sc; }

  return { init, reset, list, spawn, spawnEvent, update, hurt, alertNoise, boss, clearAll };
})();
