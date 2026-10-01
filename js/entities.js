/* Witherholm — doors, items, notes, decals. Notes live in story.js. */

const ITEM_TYPES = {
  ammo: { label: 'Pistol rounds', verb: 'Take' },
  shells: { label: 'Shotgun shells', verb: 'Take' },
  herb: { label: 'Ashroot herb', verb: 'Take' },
  shotgun: { label: 'Hollowell 12-gauge', verb: 'Take' },
  oil: { label: 'flask of lamp oil', verb: 'Take' },
  key_moth: { label: 'Moth key', verb: 'Take', key: 'moth' },
  key_serpent: { label: 'Serpent key', verb: 'Take', key: 'serpent' },
  key_crown: { label: 'Crown key', verb: 'Take', key: 'crown' },
  note: { label: 'note', verb: 'Read' },
  gramophone: { label: 'gramophone', verb: 'Wind the', permanent: true },
};

// x, y are grid cells. Items on a table or pedestal cell sit on top of it.
const ITEM_DEFS = [
  // foyer
  { id: 'note_arrival', type: 'note', note: 'arrival', x: 21, y: 27, pedestal: true },
  { id: 'ammo_foyer', type: 'ammo', x: 15, y: 20 },
  { id: 'gramo_foyer', type: 'gramophone', x: 17, y: 28, pedestal: true },
  // dining room
  { id: 'herb_dining', type: 'herb', x: 4, y: 19 },
  { id: 'ammo_dining', type: 'ammo', x: 12, y: 27 },
  { id: 'note_dining', type: 'note', note: 'dining', x: 7, y: 23 },
  { id: 'note_mara1', type: 'note', note: 'mara1', x: 11, y: 19, pedestal: true },
  // kitchen
  { id: 'key_moth', type: 'key_moth', x: 8, y: 13 },
  { id: 'ammo_kitchen', type: 'ammo', x: 12, y: 11 },
  { id: 'note_kitchen', type: 'note', note: 'kitchen', x: 4, y: 10 },
  { id: 'note_mara2', type: 'note', note: 'mara2', x: 11, y: 10 },
  // pantry
  { id: 'oil', type: 'oil', x: 8, y: 8 },
  { id: 'note_recipe', type: 'note', note: 'recipe', x: 5, y: 6 },
  { id: 'ammo_pantry', type: 'ammo', x: 9, y: 7 },
  { id: 'shells_pantry', type: 'shells', x: 4, y: 7 },
  // hall and closet
  { id: 'herb_hall', type: 'herb', x: 18, y: 10 },
  { id: 'ammo_hall', type: 'ammo', x: 21, y: 10 },
  { id: 'ammo_closet', type: 'ammo', x: 25, y: 16 },
  { id: 'herb_closet', type: 'herb', x: 25, y: 14 },
  { id: 'shells_closet', type: 'shells', x: 23, y: 16 },
  { id: 'note_fenwick', type: 'note', note: 'fenwick', x: 23, y: 14 },
  { id: 'gramo_closet', type: 'gramophone', x: 25, y: 15, pedestal: true },
  // library
  { id: 'ammo_lib', type: 'ammo', x: 36, y: 19 },
  { id: 'herb_lib', type: 'herb', x: 27, y: 19 },
  { id: 'shells_lib', type: 'shells', x: 36, y: 28 },
  { id: 'note_library', type: 'note', note: 'library', x: 32, y: 24, pedestal: true },
  { id: 'note_mara3', type: 'note', note: 'mara3', x: 27, y: 26, pedestal: true },
  // conservatory
  { id: 'note_wren1', type: 'note', note: 'wren1', x: 47, y: 16, pedestal: true },
  { id: 'note_wren2', type: 'note', note: 'wren2', x: 47, y: 21, pedestal: true },
  { id: 'herb_cons1', type: 'herb', x: 38, y: 12 },
  { id: 'herb_cons2', type: 'herb', x: 47, y: 12 },
  { id: 'herb_cons3', type: 'herb', x: 38, y: 24 },
  { id: 'shells_cons', type: 'shells', x: 47, y: 24 },
  { id: 'ammo_cons', type: 'ammo', x: 43, y: 17 },
  // study
  { id: 'shotgun', type: 'shotgun', x: 31, y: 7 },
  { id: 'key_serpent', type: 'key_serpent', x: 32, y: 7 },
  { id: 'note_study', type: 'note', note: 'study', x: 29, y: 6, pedestal: true },
  { id: 'note_hollis2', type: 'note', note: 'hollis2', x: 35, y: 6, pedestal: true },
  { id: 'ammo_study', type: 'ammo', x: 28, y: 12 },
  { id: 'herb_study', type: 'herb', x: 35, y: 12 },
  { id: 'shells_study', type: 'shells', x: 34, y: 12 },
  // chapel
  { id: 'note_altar', type: 'note', note: 'altar', x: 19, y: 1 },
  { id: 'ammo_chapel', type: 'ammo', x: 13, y: 8 },
  { id: 'shells_chapel', type: 'shells', x: 25, y: 8 },
  { id: 'herb_chapel', type: 'herb', x: 25, y: 1 },
  // the cellar
  { id: 'note_root', type: 'note', note: 'root', x: 8, y: 2, pedestal: true },
];

const Entities = (() => {
  let scene;
  const doors = [];
  const items = [];
  const decals = [];
  let glintMat, splatMat;

  // ---------- doors ----------
  function makeDoor(def) {
    const tex = { moth: 'doorMoth', serpent: 'doorSerpent', crown: 'doorCrown', root: 'doorRoot' }[def.key] || 'door';
    const face = new THREE.MeshPhongMaterial({ map: Tex.get(tex), normalMap: Tex.getNormal(tex), shininess: 10 });
    Shaders.patchWorld(face, { mould: 0.6 });
    // one material for the whole slab: a six-material box would cost six draw calls per door
    const panel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W - 0.04, DOOR_H - 0.03, 0.09), face);
    panel.position.set((DOOR_W - 0.04) / 2, (DOOR_H - 0.03) / 2, 0);
    panel.castShadow = true; panel.receiveShadow = true;
    const pivot = new THREE.Group();
    const cx = def.cx * CELL + CELL / 2, cz = def.cy * CELL + CELL / 2;
    const jw = (CELL - DOOR_W) / 2;
    if (def.orient === 'ns') { pivot.position.set(def.cx * CELL + jw + 0.02, 0, cz); pivot.userData.base = 0; }
    else { pivot.position.set(cx, 0, def.cy * CELL + jw + 0.02); pivot.userData.base = -Math.PI / 2; }
    pivot.rotation.y = pivot.userData.base;
    pivot.add(panel);
    scene.add(pivot);
    const door = {
      def, id: def.id, key: def.key, exit: def.exit, x: cx, z: cz, pivot, panel,
      open: false, passable: false, anim: 0, swing: Math.PI / 2 * 0.94, locked: !!def.key,
    };
    panel.userData.door = door;
    Level.cells[def.cy][def.cx].door = door;
    doors.push(door);
    return door;
  }

  function openDoor(door, fromX, fromZ, instant = false) {
    if (door.open) return;
    door.open = true;
    door.locked = false;
    if (door.def.orient === 'ns') door.swing = (fromZ < door.z ? -1 : 1) * Math.PI / 2 * 0.94;
    else door.swing = (fromX > door.x ? -1 : 1) * Math.PI / 2 * 0.94;
    if (instant) { door.anim = 1; door.passable = true; }
    else Sound.play('door', { x: door.x, y: 1.4, z: door.z });
  }

  function updateDoors(dt) {
    for (const d of doors) {
      if (d.open && d.anim < 1) d.anim = Math.min(1, d.anim + dt * 1.4);
      const e = 1 - Math.pow(1 - d.anim, 3);
      d.pivot.rotation.y = d.pivot.userData.base + d.swing * e;
      d.passable = d.open && d.anim > 0.45;
    }
  }

  // ---------- item models ----------
  function phong(color, extra = {}) { return new THREE.MeshPhongMaterial({ color, shininess: 30, ...extra }); }
  function itemModel(type) {
    const g = new THREE.Group();
    const add = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = false; g.add(o); return o; };
    if (type === 'ammo') {
      add(new THREE.BoxGeometry(0.3, 0.13, 0.2), phong(0x7a5a22), 0, 0.065, 0);
      add(new THREE.BoxGeometry(0.302, 0.05, 0.202), phong(0xc9a64e, { emissive: 0x2a1a05 }), 0, 0.09, 0);
    } else if (type === 'shells') {
      add(new THREE.BoxGeometry(0.3, 0.14, 0.2), phong(0x7a1812), 0, 0.07, 0);
      for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 6), phong(0xb02a1c), -0.06 + i * 0.06, 0.18, 0.02, 0, 0, 0.2);
    } else if (type === 'herb') {
      add(new THREE.CylinderGeometry(0.1, 0.08, 0.14, 8), phong(0x7a3e22), 0, 0.07, 0);
      const leaf = phong(0x5a7a34, { emissive: 0x0f1a05 });
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(new THREE.ConeGeometry(0.04, 0.28, 4), leaf, Math.cos(a) * 0.04, 0.26, Math.sin(a) * 0.04, Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); }
      add(new THREE.SphereGeometry(0.035, 6, 5), phong(0xd8c870, { emissive: 0x4a4010 }), 0, 0.4, 0);
    } else if (type === 'oil') {
      add(new THREE.CylinderGeometry(0.075, 0.09, 0.22, 10), phong(0xe0a030, { emissive: 0x5a3208, transparent: true, opacity: 0.9, shininess: 90, specular: 0xffffff }), 0, 0.11, 0);
      add(new THREE.CylinderGeometry(0.03, 0.05, 0.08, 8), phong(0xc8d8d0, { transparent: true, opacity: 0.6 }), 0, 0.26, 0);
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 8), phong(0x5a3a1a), 0, 0.32, 0);
      add(new THREE.BoxGeometry(0.16, 0.002, 0.12), phong(0xd8ccaa), 0, 0.12, 0.09, 0.3, 0, 0);
    } else if (type === 'shotgun') {
      const metal = phong(0x2a2a2c, { specular: 0x666666, shininess: 60 }), wood = phong(0x5a3418);
      add(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 8), metal, 0.1, 0.05, 0, 0, 0, Math.PI / 2);
      add(new THREE.BoxGeometry(0.22, 0.06, 0.06), wood, 0.2, 0.02, 0.0);
      add(new THREE.BoxGeometry(0.25, 0.09, 0.07), metal, -0.35, 0.05, 0);
      add(new THREE.BoxGeometry(0.34, 0.08, 0.06), wood, -0.62, 0.02, 0, 0, 0, 0.12);
      g.rotation.y = 0.5;
    } else if (type.startsWith('key_')) {
      const col = { key_moth: 0xcfc6a8, key_serpent: 0x5fa06a, key_crown: 0xe0b040 }[type];
      const m = phong(col, { emissive: new THREE.Color(col).multiplyScalar(0.25), shininess: 80, specular: 0xffffff });
      add(new THREE.TorusGeometry(0.06, 0.018, 6, 12), m, -0.13, 0.02, 0, Math.PI / 2, 0, 0);
      add(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 6), m, 0.02, 0.02, 0, 0, 0, Math.PI / 2);
      add(new THREE.BoxGeometry(0.03, 0.02, 0.06), m, 0.11, 0.02, 0.03);
      add(new THREE.BoxGeometry(0.03, 0.02, 0.045), m, 0.07, 0.02, 0.025);
    } else if (type === 'note') {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.36), new THREE.MeshPhongMaterial({ map: Tex.get('paper'), side: THREE.DoubleSide }));
      p.rotation.x = -Math.PI / 2; p.rotation.z = 0.3; p.position.y = 0.006; p.receiveShadow = true; g.add(p);
    } else if (type === 'gramophone') {
      const wood = phong(0x4a2a16, { shininess: 40 }), brass = phong(0x7a5e26, { shininess: 50, specular: 0x887744 });
      add(new THREE.BoxGeometry(0.42, 0.2, 0.42), wood, 0, 0.1, 0);
      add(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20), phong(0x111111, { shininess: 100 }), 0, 0.21, 0);
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 5), brass, 0.12, 0.32, 0.1, 0, 0, 0.5);
      const horn = add(new THREE.CylinderGeometry(0.3, 0.03, 0.55, 14, 1, true), Object.assign(brass.clone(), { side: THREE.DoubleSide }), -0.05, 0.52, -0.05, 0.25, 0, -0.45);
      horn.castShadow = true;
      const arm = add(new THREE.BoxGeometry(0.2, 0.012, 0.012), brass, 0.06, 0.24, 0.05, 0, 0.7, 0);
      g.userData.disc = g.children[1]; g.userData.arm = arm;
    }
    return g;
  }

  let pedestalsBuilt = false;
  function buildPedestals() {
    if (pedestalsBuilt) return; pedestalsBuilt = true;
    const wood = Level.M('frame');
    for (const d of ITEM_DEFS) {
      if (!d.pedestal) continue;
      const c = Level.cellCenter(d.x, d.y);
      Level.box(0.7, 0.78, 0.55, wood, c.x, 0.39, c.z, scene);
      Level.cells[d.y][d.x].props.push({ x0: c.x - 0.35, x1: c.x + 0.35, z0: c.z - 0.28, z1: c.z + 0.28, h: 0.8 });
    }
  }

  function surfaceHeight(x, y) {
    const c = Level.at(x, y);
    if (!c) return 0;
    let h = 0;
    for (const p of c.props) h = Math.max(h, p.h || 0);
    return h;
  }

  function spawnItem(def, pos) {
    const type = def.type;
    const model = itemModel(type);
    let wx, wz, wy;
    if (pos) { wx = pos.x; wz = pos.z; wy = 0; }
    else { const c = Level.cellCenter(def.x, def.y); wx = c.x; wz = c.z; wy = surfaceHeight(def.x, def.y); }
    model.position.set(wx, wy, wz);
    model.rotation.y += Math.random() * 0.6 - 0.3;
    scene.add(model);
    const glint = new THREE.Sprite(glintMat);
    glint.position.set(wx, wy + 0.3, wz); glint.scale.setScalar(0.3);
    if (type === 'gramophone') glint.position.y = wy + 0.9;
    scene.add(glint);
    const item = { id: def.id, def, type, x: wx, z: wz, y: wy, model, glint, taken: false, t: Math.random() * 6, playing: 0 };
    items.push(item);
    return item;
  }

  function removeItem(item) {
    item.taken = true;
    scene.remove(item.model); scene.remove(item.glint);
  }

  function updateItems(dt, time) {
    for (const it of items) {
      if (it.taken) continue;
      const near = Math.hypot(it.x - Game.player.pos.x, it.z - Game.player.pos.z) < 26;
      it.model.visible = it.glint.visible = near;
      if (!near) continue;
      it.t += dt;
      const p = Math.max(0, Math.sin(it.t * 2.2));
      it.glint.scale.setScalar(0.08 + Math.pow(p, 6) * (it.type === 'gramophone' ? 0.3 : 0.42));
      it.glint.material.rotation = time * 0.5;
      if (it.type.startsWith('key_')) it.model.rotation.y += dt * 0.8;
      if (it.type === 'gramophone' && it.playing > 0) {
        it.playing -= dt;
        it.model.userData.disc.rotation.y += dt * 5;
        it.model.userData.arm.rotation.y = 0.9 + Math.sin(time) * 0.03;
      }
    }
  }

  // ---------- blood decals ----------
  function decal(x, z, size = 1.4) {
    let d;
    if (decals.length >= 40) { d = decals.shift(); }
    else {
      d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), splatMat);
      d.rotation.x = -Math.PI / 2; d.renderOrder = 1;
      scene.add(d);
    }
    d.position.set(x, 0.012 + decals.length * 0.0004, z);
    d.rotation.z = Math.random() * Math.PI * 2;
    d.scale.set(size, size, 1);
    decals.push(d);
  }

  function init(sc) {
    scene = sc;
    glintMat = new THREE.SpriteMaterial({ map: Tex.get('glint'), color: 0xfff0c0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    splatMat = new THREE.MeshPhongMaterial({ map: Tex.get('splat'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, shininess: 60, specular: 0x331111 });
    buildPedestals();
  }

  // rebuild every dynamic thing from scratch, skipping what the checkpoint says is gone
  function reset(state) {
    for (const d of doors) { scene.remove(d.pivot); Level.cells[d.def.cy][d.def.cx].door = null; }
    doors.length = 0;
    for (const it of items) { scene.remove(it.model); scene.remove(it.glint); }
    items.length = 0;
    for (const d of decals) scene.remove(d);
    decals.length = 0;

    for (const def of Level.doorDefs) {
      const door = makeDoor(def);
      if (state.opened.includes(def.id)) openDoor(door, 0, 0, true);
    }
    for (const def of ITEM_DEFS) if (def.type === 'gramophone' || !state.taken.includes(def.id)) spawnItem(def);
    for (const drop of state.drops || []) if (!state.taken.includes(drop.id)) spawnItem({ id: drop.id, type: drop.type }, drop);
  }

  return { init, reset, doors, items, openDoor, updateDoors, updateItems, spawnItem, removeItem, decal };
})();
