/* Witherholm — furniture, set dressing and the Root.
   Positions are in map cells (1 cell = CELL metres), so x: 19.5 is the middle of column 19. */

const PROP_LIST = [
  // foyer
  { t: 'rug', x: 19.5, z: 24.5, w: 4.4, d: 7.4, color: 0x8a2c28 },
  { t: 'clock', x: 24.62, z: 21.5, rot: -Math.PI / 2 },
  { t: 'urn', x: 15.45, z: 28.45 }, { t: 'urn', x: 24.45, z: 28.45 }, { t: 'urn', x: 15.45, z: 20.55 },
  { t: 'candelabra', x: 23.7, z: 20.6 },
  // dining room: fourteen places, most of the chairs pushed back as if everyone stood at once
  { t: 'rug', x: 8, z: 23.5, w: 6.4, d: 3.8, color: 0x5a2a4a },
  ...[6.5, 7.5, 8.5, 9.5].flatMap((x, i) => [
    { t: 'chair', x, z: 22.62, rot: 0.1 * (i - 1.5) },
    { t: 'chair', x, z: 24.38, rot: Math.PI + 0.12 * (i - 1) },
  ]),
  { t: 'chair', x: 5.55, z: 23.5, rot: Math.PI / 2 }, { t: 'chair', x: 10.45, z: 23.5, rot: -Math.PI / 2, fallen: true },
  { t: 'chair', x: 4.4, z: 20.6, rot: 2.3, fallen: true }, { t: 'chair', x: 11.4, z: 20.4, rot: 0.8 },
  { t: 'candelabra', x: 12.4, z: 18.7 }, { t: 'candelabra', x: 3.7, z: 27.3 },
  // kitchen
  { t: 'barrel', x: 12.35, z: 14.4 }, { t: 'barrel', x: 11.45, z: 14.6 }, { t: 'barrel', x: 3.6, z: 14.4 },
  // pantry
  { t: 'barrel', x: 9.4, z: 6.45 }, { t: 'barrel', x: 4.5, z: 8.45 },
  // hall and closet
  { t: 'rug', x: 19.5, z: 14.6, w: 2.4, d: 15, color: 0x5e1e1e },
  { t: 'rug', x: 24, z: 15, w: 2.6, d: 2.6, color: 0x2e3a2a },
  { t: 'candelabra', x: 18.55, z: 18.4 },
  // library
  { t: 'rug', x: 31.5, z: 24.5, w: 7, d: 6, color: 0x3a2a4a },
  { t: 'sofa', x: 28.5, z: 18.75, rot: 0 }, { t: 'sofa', x: 34.5, z: 18.75, rot: 0.05 },
  { t: 'chair', x: 31.6, z: 24.4, rot: 2.6 },
  // study
  { t: 'rug', x: 31.5, z: 9.5, w: 5, d: 4, color: 0x4a2a1a },
  { t: 'chair', x: 32, z: 6.35, rot: 0.2 },
  { t: 'chair', x: 34.5, z: 11.5, rot: 4.1, fallen: true },
  // chapel
  { t: 'statue', x: 13.6, z: 1.7 }, { t: 'statue', x: 25.4, z: 1.7 },
  { t: 'candelabra', x: 17.35, z: 1.65 }, { t: 'candelabra', x: 21.65, z: 1.65 },
  { t: 'rug', x: 19.5, z: 6.5, w: 2.2, d: 11, color: 0x6a1818 },
  // conservatory
  { t: 'statue', x: 42.5, z: 12.85 }, { t: 'urn', x: 38.5, z: 24.45 }, { t: 'urn', x: 47.45, z: 24.45 },
  // root chamber
  { t: 'urn', x: 9.5, z: 1.5 },
];

// rooms get a few creeping vines and fungus: [x0, y0, x1, y1, vines, mushrooms]
const DECAY = [
  [12, 1, 25, 8, 12, 10], [1, 1, 10, 4, 14, 16], [38, 12, 47, 24, 10, 14], [18, 10, 21, 19, 4, 3], [26, 18, 36, 28, 5, 4],
  [27, 5, 36, 13, 4, 4], [15, 20, 24, 28, 2, 0], [3, 18, 13, 28, 3, 4], [3, 10, 13, 15, 3, 3], [4, 6, 9, 8, 4, 6],
];

const Props = (() => {
  let scene, U = null, leafMesh = null;
  const dyn = [];               // per-frame animators
  const glowCaps = [];          // mushroom materials that pulse
  const root = { group: null, mats: [], cocoon: null, body: null, light: null, state: 'calm', t: 0, dissolve: 0 };
  let rngSeed = 2024;
  const rnd = () => (rngSeed = (rngSeed * 16807) % 2147483647) / 2147483647;
  const rr = (a, b) => a + rnd() * (b - a);

  const wood = () => Level.M('frame');
  const C = (c, o) => Level.C(c, o);

  function place(obj, x, z, rot = 0, y = 0) { obj.position.set(x * CELL, y, z * CELL); obj.rotation.y = rot; scene.add(obj); return obj; }
  function add(g, geo, mat, x = 0, y = 0, z = 0, cast = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; }
  function collider(x, z, hw, hd, h) { Level.addCollider({ x0: x * CELL - hw, x1: x * CELL + hw, z0: z * CELL - hd, z1: z * CELL + hd, h }); }

  const BUILD = {
    rug(p) {
      const t = Tex.get('carpet').clone(); t.repeat.set(p.w / 2, p.d / 2); t.needsUpdate = true;
      const n = Tex.getNormal('carpet').clone(); n.repeat.set(p.w / 2, p.d / 2); n.needsUpdate = true;
      const m = Shaders.patchWorld(new THREE.MeshPhongMaterial({ map: t, normalMap: n, color: p.color || 0x8a3a3a, shininess: 2, polygonOffset: true, polygonOffsetFactor: -1 }), { mould: 0.5 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), m);
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(p.x * CELL, 0.012, p.z * CELL); mesh.receiveShadow = true; scene.add(mesh);
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(p.w * 0.92, p.d * 0.94), new THREE.MeshBasicMaterial({ visible: false })); // keeps the footprint explicit
      return mesh;
    },
    chair(p) {
      const g = new THREE.Group(), m = wood(), seat = C(0x4a2c1a, { shininess: 14 });
      add(g, new THREE.BoxGeometry(0.46, 0.05, 0.46), seat, 0, 0.46, 0);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(g, new THREE.BoxGeometry(0.05, 0.46, 0.05), m, sx * 0.2, 0.23, sz * 0.2);
      add(g, new THREE.BoxGeometry(0.46, 0.55, 0.05), seat, 0, 0.75, -0.21);
      add(g, new THREE.BoxGeometry(0.4, 0.06, 0.04), m, 0, 1.0, -0.21);
      if (p.fallen) { g.rotation.x = -Math.PI / 2 * 0.98; g.position.y = 0.26; }
      place(g, p.x, p.z, p.rot || 0, p.fallen ? 0.0 : 0);
      if (p.fallen) g.position.y = 0.26;
      collider(p.x, p.z, 0.24, 0.24, p.fallen ? 0.4 : 0.55);
    },
    clock(p) {
      const g = new THREE.Group(), dark = C(0x2a1a0e, { shininess: 30, spec: 0x443322 });
      add(g, new THREE.BoxGeometry(0.56, 0.3, 0.38), dark, 0, 0.15, 0);
      add(g, new THREE.BoxGeometry(0.44, 1.5, 0.3), dark, 0, 1.05, 0);
      add(g, new THREE.BoxGeometry(0.6, 0.45, 0.36), dark, 0, 2.02, 0);
      add(g, new THREE.CylinderGeometry(0.15, 0.15, 0.02, 14), new THREE.MeshPhongMaterial({ color: 0xd8d0b0, emissive: 0x1a1810 }), 0, 2.02, 0.185).rotation.x = Math.PI / 2;
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.01), C(0x111111)); hand.position.set(0, 2.06, 0.2); g.add(hand);
      const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.01), C(0x111111)); hand2.position.set(0.02, 2.02, 0.2); hand2.rotation.z = -1.7; g.add(hand2);
      const pend = new THREE.Group(); pend.position.set(0, 1.6, 0.17); g.add(pend);
      add(pend, new THREE.CylinderGeometry(0.008, 0.008, 0.6, 4), C(0x8a7a3a, { shininess: 60 }), 0, -0.3, 0, false);
      add(pend, new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12), C(0xb09a40, { shininess: 80, spec: 0x888855 }), 0, -0.62, 0, false).rotation.x = Math.PI / 2;
      dyn.push((dt, time) => { pend.rotation.z = Math.sin(time * 2.6) * 0.14; });
      place(g, p.x, p.z, p.rot || 0);
      collider(p.x, p.z, 0.3, 0.3, 2.3);
    },
    urn(p) {
      const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.06 + Math.sin(t * Math.PI * 0.95) * 0.2 + (t > 0.85 ? 0.05 : 0), t * 0.85)); }
      const g = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), C(0x6a7a8a, { shininess: 60, spec: 0x99aabb }));
      g.castShadow = true; g.receiveShadow = true; g.material.side = THREE.DoubleSide;
      place(g, p.x, p.z, 0);
      collider(p.x, p.z, 0.25, 0.25, 0.85);
    },
    barrel(p) {
      const g = new THREE.Group(), w = C(0x5a3a1e, { shininess: 8 }), band = C(0x2a2a2a, { shininess: 40 });
      const body = add(g, new THREE.CylinderGeometry(0.4, 0.4, 0.95, 12), w, 0, 0.475, 0); body.scale.set(1, 1, 1);
      for (const y of [0.15, 0.8]) add(g, new THREE.TorusGeometry(0.405, 0.022, 5, 14), band, 0, y, 0, false).rotation.x = Math.PI / 2;
      add(g, new THREE.BoxGeometry(0.1, 0.05, 0.1), band, 0.1, 0.97, 0.05, false);
      place(g, p.x, p.z, rnd() * 6);
      collider(p.x, p.z, 0.42, 0.42, 0.97);
    },
    sofa(p) {
      const g = new THREE.Group(), velvet = C(0x5a1a22, { shininess: 6, mould: 1 }), dk = C(0x2a1a10);
      add(g, new THREE.BoxGeometry(1.9, 0.4, 0.85), velvet, 0, 0.3, 0);
      add(g, new THREE.BoxGeometry(1.9, 0.6, 0.22), velvet, 0, 0.75, -0.33);
      for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.2, 0.55, 0.85), velvet, s * 0.85, 0.5, 0);
      for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.08, 0.1, 0.08), dk, s * 0.85, 0.05, 0.35);
      place(g, p.x, p.z, p.rot || 0);
      collider(p.x, p.z, 1.0, 0.45, 0.9);
    },
    statue(p) {
      const g = new THREE.Group(), stone = C(0x8a8a82, { shininess: 14, spec: 0x333333, mould: 1 });
      add(g, new THREE.BoxGeometry(0.8, 0.5, 0.8), stone, 0, 0.25, 0);
      const robe = add(g, new THREE.ConeGeometry(0.34, 1.35, 10), stone, 0, 1.17, 0);
      add(g, new THREE.SphereGeometry(0.15, 10, 8), stone, 0, 1.97, 0);
      for (const s of [-1, 1]) { const a = add(g, new THREE.CylinderGeometry(0.05, 0.04, 0.6, 6), stone, s * 0.22, 1.55, 0.14); a.rotation.set(-0.9, 0, s * 0.3); }
      // a wing folded the wrong way
      const wing = add(g, new THREE.ConeGeometry(0.22, 1.1, 4), stone, 0.15, 1.7, -0.22); wing.rotation.set(0.25, 0, -0.5); wing.scale.z = 0.25;
      place(g, p.x, p.z, p.rot || 0);
      collider(p.x, p.z, 0.42, 0.42, 2.1);
    },
    candelabra(p) {
      const g = new THREE.Group(), brass = C(0x8a7030, { shininess: 70, spec: 0xaa9955 }), wax = new THREE.MeshPhongMaterial({ color: 0xd8cdb0, emissive: 0x2a1a08 });
      add(g, new THREE.CylinderGeometry(0.17, 0.2, 0.06, 10), brass, 0, 0.03, 0);
      add(g, new THREE.CylinderGeometry(0.03, 0.04, 1.25, 8), brass, 0, 0.66, 0);
      for (let i = -1; i <= 1; i++) {
        const arm = add(g, new THREE.CylinderGeometry(0.015, 0.015, 0.34, 5), brass, i * 0.15, 1.3, 0, false); arm.rotation.z = -i * 1.05;
        add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.14, 6), wax, i * 0.3, 1.46 - (i ? 0 : -0.06), 0, false);
        const f = new THREE.Sprite(Props.flameMat()); f.scale.set(0.11, 0.2, 1); f.position.set(i * 0.3, 1.6 - (i ? 0 : -0.06), 0); g.add(f);
        dyn.push((dt, time) => { f.scale.y = 0.2 * (0.85 + 0.3 * Math.sin(time * 15 + i * 2 + p.x) * Math.random()); });
      }
      place(g, p.x, p.z, 0);
      collider(p.x, p.z, 0.2, 0.2, 1.4);
    },
  };

  let flame = null;
  function flameMat() {
    return flame || (flame = new THREE.SpriteMaterial({ map: Tex.get('flame'), color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  }

  // ---------- organic stuff ----------
  function fleshMat(color = 0x6a5048, veins = 1) {
    return Shaders.patchFlesh(new THREE.MeshPhongMaterial({ color, map: Tex.get('skin'), normalMap: Tex.getNormal('skin'), shininess: 45, specular: 0x443333 }), U, { veins });
  }
  function vine(x0, y0, z0, n, len = 3, radius = 0.05) {
    const pts = [];
    const t = new THREE.Vector3(-n.z, 0, n.x);
    const wig = rr(0.05, 0.3);
    for (let i = 0; i <= 6; i++) {
      const k = i / 6;
      pts.push(new THREE.Vector3(x0, y0 - k * len, z0).addScaledVector(n, 0.05 + 0.18 * Math.sin(k * Math.PI * rr(0.6, 1.4)) + k * 0.12).addScaledVector(t, Math.sin(k * 6 + wig * 10) * wig));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, radius * rr(0.7, 1.4), 6, false);
    const m = new THREE.Mesh(geo, fleshMat(0x5e4a3a));
    m.castShadow = false; m.receiveShadow = true; scene.add(m);
  }
  function mushrooms(x, z, n, scale = 1) {
    const cap = new THREE.MeshPhongMaterial({ color: 0x6a5c28, emissive: 0xa88a1c, emissiveIntensity: 0.45, shininess: 50 });
    glowCaps.push(cap);
    const stem = C(0xb8ac88, { shininess: 10, mould: 0.2 });
    for (let i = 0; i < n; i++) {
      const h = rr(0.1, 0.42) * scale, r = rr(0.06, 0.15) * scale;
      const px = x + rr(-0.5, 0.5), pz = z + rr(-0.5, 0.5);
      const g = new THREE.Group();
      add(g, new THREE.CylinderGeometry(r * 0.25, r * 0.35, h, 6), stem, 0, h / 2, 0, false);
      const c = add(g, new THREE.SphereGeometry(r, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), cap, 0, h, 0, false); c.scale.y = 0.65;
      g.position.set(px, 0, pz); g.rotation.z = rr(-0.25, 0.25); scene.add(g);
    }
  }
  function plantsFor(cells) {
    const geo = new THREE.PlaneGeometry(0.85, 0.95); geo.translate(0, 0.475, 0);
    const mat = new THREE.MeshPhongMaterial({ map: Tex.get('leaf'), alphaTest: 0.5, side: THREE.DoubleSide, shininess: 14, specular: 0x223322 });
    const per = 7, total = cells.length * per * 2;
    const mesh = new THREE.InstancedMesh(geo, mat, total);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();
    let i = 0;
    for (const c of cells) for (let k = 0; k < per; k++) {
      const x = c.cx + rr(-0.75, 0.75), z = c.cz + rr(-0.55, 0.55), sc = rr(0.6, 1.5), yaw = rnd() * 3.14;
      for (let cross = 0; cross < 2; cross++) {
        e.set(rr(-0.15, 0.15), yaw + cross * Math.PI / 2, rr(-0.15, 0.15)); q.setFromEuler(e);
        p.set(x, 0.58, z); s.set(sc, sc * rr(0.8, 1.3), sc);
        m4.compose(p, q, s); mesh.setMatrixAt(i, m4);
        col.setHSL(0.27 + rr(-0.04, 0.05), rr(0.25, 0.5), rr(0.32, 0.62)); mesh.setColorAt(i, col);
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false; mesh.receiveShadow = true;
    scene.add(mesh); leafMesh = mesh;
  }

  // ---------- the Root ----------
  function buildRoot() {
    const g = new THREE.Group(); root.group = g;
    const core = new THREE.Vector3(10.2, 1.5, 12.0 / 1);   // x metres, y, z metres (centre of the west end)
    core.set(5.2, 1.45, 6.0);
    const mat = fleshMat(0x7a5a52);
    root.mats.push(mat);
    // trunks: out of the west wall, floor and ceiling, all knotted toward the core
    for (let i = 0; i < 16; i++) {
      const top = i % 3 === 0, floor = i % 3 === 1;
      const sx = 2.12 + rnd() * 0.5, sy = top ? 3.0 : floor ? 0.0 : rr(0.3, 2.7), sz = rr(2.4, 9.6);
      const pts = [new THREE.Vector3(sx, sy, sz)];
      for (let k = 1; k < 5; k++) { const t = k / 5; pts.push(new THREE.Vector3(sx + (core.x - sx) * t + rr(-0.5, 0.5), sy + (core.y - sy) * t + rr(-0.5, 0.5), sz + (core.z - sz) * t + rr(-0.6, 0.6))); }
      pts.push(core.clone().add(new THREE.Vector3(rr(-0.25, 0.25), rr(-0.4, 0.4), rr(-0.25, 0.25))));
      const r = rr(0.12, 0.3);
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, r, 8, false), mat);
      m.castShadow = true; m.receiveShadow = true; g.add(m);
      if (i % 2 === 0) { const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 1.7, 8, 6), mat); tip.position.copy(pts[0]); g.add(tip); }
    }
    // the knot itself
    const bulbMat = Shaders.patchFlesh(new THREE.MeshPhongMaterial({ color: 0xc9a04a, emissive: 0x8a5a10, shininess: 70, specular: 0x665533 }), U, { veins: 0 });
    root.mats.push(bulbMat);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 14), bulbMat); bulb.position.copy(core).add(new THREE.Vector3(-0.85, 0.05, 0)); bulb.scale.set(0.9, 1.3, 0.9); g.add(bulb);
    root.bulb = bulb;
    // Mara: a figure in an amber cocoon, held up by the roots
    const cocoon = new THREE.Group(); cocoon.position.copy(core).add(new THREE.Vector3(0.05, -0.05, 0)); g.add(cocoon);
    const amber = new THREE.MeshPhongMaterial({ color: 0xd8a84a, emissive: 0x7a4a0a, transparent: true, opacity: 0.5, shininess: 90, specular: 0xffeeaa, depthWrite: false });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), amber); shell.scale.set(0.8, 1.55, 0.72); cocoon.add(shell);
    const body = new THREE.Group(); cocoon.add(body); root.body = body;
    const cloth = C(0x5a6a7a, { shininess: 4 }), skin = C(0xc9a48a, { shininess: 12, mould: 0 });
    add(body, new THREE.CapsuleGeometry(0.17, 0.75, 4, 10), cloth, 0, -0.1, 0, false);
    add(body, new THREE.SphereGeometry(0.15, 12, 10), skin, 0, 0.6, 0.02, false);
    const hair = add(body, new THREE.SphereGeometry(0.165, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), C(0x2a1a12, { mould: 0 }), 0, 0.64, -0.01, false); hair.rotation.x = -0.25;
    for (const s of [-1, 1]) { const arm = add(body, new THREE.CylinderGeometry(0.05, 0.04, 0.62, 6), skin, s * 0.22, 0.05, 0.1, false); arm.rotation.set(-0.2, 0, s * 0.12); }
    body.rotation.z = 0.04;
    root.cocoon = cocoon; root.shell = shell;
    scene.add(g);
    Level.addCollider({ x0: 2.0, x1: 6.5, z0: 2.6, z1: 9.4, h: 3 });
    // dead-white roots crawl along the floor toward the door
    for (let i = 0; i < 6; i++) {
      let z = rr(2.6, 9.4), x = 6.4; const pts = [];
      for (let k = 0; k < 6; k++) { pts.push(new THREE.Vector3(x, 0.05 + rnd() * 0.12, z)); x += rr(1, 2.4); z += rr(-0.7, 0.7); }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, rr(0.04, 0.1), 6), mat);
      m.receiveShadow = true; scene.add(m);
    }
  }

  // called by the ending sequences
  function rootState(state) {
    root.state = state; root.t = 0;
    if (!U || !root.cocoon) return;
    if (state === 'calm') { U.uDissolve.value = 0; U.uRage.value = 0; root.cocoon.visible = true; }
    if (state === 'free') { root.cocoon.visible = false; U.uRage.value = 1; }
    if (state === 'burn') { U.uDissolve.value = 0; U.uRage.value = 0.6; root.cocoon.visible = true; }
  }

  function buildDecay() {
    const SIDES = [{ s: 'n', n: [0, 1] }, { s: 's', n: [0, -1] }, { s: 'w', n: [1, 0] }, { s: 'e', n: [-1, 0] }];
    for (const [x0, y0, x1, y1, nv, nm] of DECAY) {
      const cells = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = Level.at(x, y); if (c && !c.wall && !c.doorDef && !c.table) cells.push(c); }
      let guard = 0;
      for (let v = 0; v < nv && guard < 400; guard++) {
        const c = cells[rnd() * cells.length | 0];
        const side = SIDES.filter(s => { const n = Level.at(c.x + (s.s === 'w' ? -1 : s.s === 'e' ? 1 : 0), c.y + (s.s === 'n' ? -1 : s.s === 's' ? 1 : 0)); return n && n.wall && n.ch === '#'; });
        if (!side.length) continue;
        const sd = side[rnd() * side.length | 0];
        const { pos } = Level.wallSpot(c.x, c.y, sd.s, 0.05);
        vine(pos.x + (sd.n[1] ? rr(-0.7, 0.7) : 0), 3.05, pos.z + (sd.n[0] ? rr(-0.7, 0.7) : 0), new THREE.Vector3(sd.n[0], 0, sd.n[1]), rr(1.5, 3.05), rr(0.035, 0.08));
        v++;
      }
      for (let m = 0; m < nm; m++) {
        const c = cells[rnd() * cells.length | 0]; if (!c) continue;
        // hug walls and corners
        const cx = c.x * CELL + CELL / 2, cz = c.y * CELL + CELL / 2;
        const ox = (Level.at(c.x - 1, c.y)?.wall ? -0.8 : Level.at(c.x + 1, c.y)?.wall ? 0.8 : rr(-0.8, 0.8)), oz = (Level.at(c.x, c.y - 1)?.wall ? -0.8 : Level.at(c.x, c.y + 1)?.wall ? 0.8 : rr(-0.8, 0.8));
        mushrooms(cx + ox, cz + oz, 3 + (rnd() * 4 | 0), rr(0.8, 1.4));
      }
    }
  }

  function buildMists() {
    const wide = (cx0, cy0, cx1, cy1, y, o) => Fx.addMist(cx0 * CELL, cy0 * CELL, (cx1 + 1) * CELL, (cy1 + 1) * CELL, y, o);
    wide(12, 1, 25, 8, 0.25, { color: 0x8f9bb4, opacity: 0.2 }); wide(12, 1, 25, 8, 0.75, { color: 0x8f9bb4, opacity: 0.1, speed: 0.012 });
    wide(1, 1, 10, 4, 0.28, { color: 0xcfc46e, opacity: 0.16 }); wide(1, 1, 10, 4, 0.8, { color: 0xbfb060, opacity: 0.1, speed: 0.012 });
    wide(38, 12, 47, 24, 0.3, { color: 0x8aa8cc, opacity: 0.2 }); wide(38, 12, 47, 24, 0.85, { color: 0x8aa8cc, opacity: 0.1, speed: 0.012 });
    wide(4, 6, 9, 8, 0.22, { color: 0xa8b8a0, opacity: 0.16 });
    wide(15, 20, 24, 28, 0.2, { color: 0x9a9aa8, opacity: 0.1 });
    wide(3, 18, 13, 28, 0.2, { color: 0x9a9aa8, opacity: 0.08 });
    wide(18, 10, 21, 19, 0.22, { color: 0x9a9aa8, opacity: 0.09 });
  }

  function build(sc) {
    scene = sc;
    U = Shaders.makeFleshUniforms(0xd8c040); U.uPulse.value = 0.012;
    for (const p of PROP_LIST) BUILD[p.t](p);
    const planters = []; for (const row of Level.cells) for (const c of row) if (c.planter) planters.push(c.planter);
    plantsFor(planters);
    buildRoot();
    buildDecay();
    buildMists();
  }

  function update(dt, time) {
    if (!U) return;
    U.uTime.value = time;
    for (const f of dyn) f(dt, time);
    const beat = 0.75 + 0.25 * Math.sin(time * 4.4);
    for (const c of glowCaps) c.emissiveIntensity = 0.28 + 0.26 * beat;
    if (root.group) {
      root.t += dt;
      const big = root.state === 'rage' || root.state === 'free';
      U.uPulse.value = big ? 0.03 : 0.012;
      if (root.bulb) root.bulb.scale.set(0.9 + 0.05 * Math.sin(time * 4.4), 1.3 + 0.06 * Math.sin(time * 4.4 + 0.5), 0.9);
      if (root.shell) root.shell.material.opacity = 0.45 + 0.1 * Math.sin(time * 4.4);
      if (root.state === 'burn') { U.uDissolve.value = Math.min(1, root.t / 9); if (root.cocoon && U.uDissolve.value > 0.4) root.cocoon.visible = false; }
    }
  }

  // world position of Mara's cocoon, for the interaction prompt
  const cocoonPos = () => ({ x: 6.1, z: 6.0 });

  return { build, update, rootState, cocoonPos, flameMat, get U() { return U; } };
})();
