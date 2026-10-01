/* Witherholm — the house.
   The map is a plain ASCII grid so it is easy to edit by hand.

   #  wall                 S  bookshelf wall        J  jar shelf wall      T  table / counter / pew / planter / crate
   m  marble (foyer)       w  wood (dining, study)  t  tile (kitchen)      p  pantry (flagstone)
   c  carpet (halls)       l  dark wood (library)   s  stone (chapel)      g  glasshouse (conservatory)
   r  roots (the cellar under the chapel)
   D  door                 1  Moth door             2  Serpent door        3  root door (opens when the Matron falls)
   E  front door (needs the Crown key)

   One cell is CELL world units wide. Cell (x, y) maps to world (x*CELL, y*CELL);
   north is -z. */

const CELL = 2;
const WALL_H = 3.0;
const DOOR_H = 2.3;
const DOOR_W = 1.3;

const MAP = [
  '##################################################',  // 0
  '#rrrrrrrrrr#ssssssssssssss########################',  // 1
  '#rrrrrrrrrr#ssssssssssssss########################',  // 2
  '#rrrrrrrrrr3ssssssssssssss########################',  // 3
  '#rrrrrrrrrr#ssssssssssssss########################',  // 4
  '############sTTTTsssssTTTT#SSwwwwwwSS#############',  // 5
  '###JpTppppJ#ssssssssssssss#wwwwwwwwww#############',  // 6
  '###JppppppJ#sTTTTsssssTTTT#wwwwTTwwww#############',  // 7
  '###JppppTpJ#ssssssssssssss#wwwwwwwwww#############',  // 8
  '#######D###########2#######wwwwwwwwww#############',  // 9
  '###TTTttttTTTt####cccc#####wwwwwwwwww#############',  // 10
  '###ttttttttttt####cccc#####wwwwwwwwww#############',  // 11
  '###tttttttttttcccDcccc#####wwwwwwwwww#gggggggggg##',  // 12
  '###ttttTTTtttt####cccc#####wwwwwwwwww#gTTTggTTTg##',  // 13
  '###ttttttttttt####cccc#ccc#####c######gggggggggg##',  // 14
  '###ttttttttttt####ccccDccc#####c######gTTTggTTTg##',  // 15
  '########t#########cccc#ccc#####c######gggggggggg##',  // 16
  '########D#########cccc#########D######gggggggggg##',  // 17
  '###wwwwwwwwwww####cccc####lllllllllll#gTTTggTTTg##',  // 18
  '###wwwwwwwwwww#####cc#####lllllllllll#gggggggggg##',  // 19
  '###wwwwwwwwwww#mmmmmmmmmm#llSSSllSSSl#gTTTggTTTg##',  // 20
  '###wwwwwwwwwww#mmmmmmmmmm#lllllllllll#gggggggggg##',  // 21
  '###wwwwwwwwwww#m#mmmmmm#m#lllllllllllDgggggggggg##',  // 22
  '###wwwTTTTwwww#mmmmmmmmmm#llSSSllSSSl#gggggggggg##',  // 23
  '###wwwwwwwwwwwDmmmmmmmmmm1lllllllllll#gggggggggg##',  // 24
  '###wwwwwwwwwww#mmmmmmmmmm#lllllllllll#############',  // 25
  '###wwwwwwwwwww#m#mmmmmm#m#llSSSllSSSl#############',  // 26
  '###wwwwwwwwwww#mmmmmmmmmm#lllllllllll#############',  // 27
  '###wwwwwwwwwww#mmmmmmmmmm#lllllllllll#############',  // 28
  '###################E##############################',  // 29
];

// floor type -> textures for that room
const THEMES = {
  m: { floor: 'marble', wall: 'wallRed', ceil: 'plaster', trim: true },
  w: { floor: 'wood', wall: 'wallGreen', ceil: 'plaster', trim: true },
  t: { floor: 'tile', wall: 'wallTile', ceil: 'plaster', trim: false },
  c: { floor: 'carpet', wall: 'panel', ceil: 'beams', trim: true },
  l: { floor: 'woodDark', wall: 'panel', ceil: 'beams', trim: true },
  s: { floor: 'stone', wall: 'stoneWall', ceil: 'stoneWall', trim: false },
  p: { floor: 'stone', wall: 'stoneWall', ceil: 'plaster', trim: false },
  r: { floor: 'rootFloor', wall: 'rootWall', ceil: 'rootWall', trim: false },
  g: { floor: 'terracotta', wall: 'glassWall', ceil: 'glassCeil', trim: false },
};

// surface feel: shininess and specular colour per texture
const SURFACE = {
  marble: [70, 0x606060], wood: [22, 0x302418], woodDark: [22, 0x302418], tile: [45, 0x444444], stone: [14, 0x222222], carpet: [2, 0x050505],
  terracotta: [20, 0x2a1a12], rootFloor: [60, 0x664444], rootWall: [40, 0x443333], glassWall: [80, 0x5a7a7a], glassCeil: [80, 0x5a7a7a],
  panel: [14, 0x222222], wallRed: [6, 0x111111], wallGreen: [6, 0x111111], wallTile: [40, 0x333333], stoneWall: [10, 0x1a1a1a],
  plaster: [4, 0x0c0c0c], beams: [10, 0x1a1208], bookshelf: [10, 0x1a1208], jars: [30, 0x555544], frame: [14, 0x221a12],
};
const GLOW = { glassWall: 0.5, glassCeil: 0.55, rootWall: 1.0, rootFloor: 0.85 };

// room lights: x, z in cell units (cell centre = +0.5), y in metres. Only the nearest few are live at once.
// flicker: amplitude, or 'strobe' (failing tube) or 'heart' (beats with the Root)
const LIGHT_DEFS = [
  { x: 20, z: 24, y: 2.6, color: 0xffb070, intensity: 1.15, dist: 17, flicker: 0.25, fixture: 'chandelier' },
  { x: 8, z: 23.5, y: 1.25, color: 0xff9a50, intensity: 1.0, dist: 13, flicker: 0.45, fixture: 'candles' },
  { x: 8, z: 12.5, y: 2.85, color: 0xb8ffd0, intensity: 0.95, dist: 14, flicker: 'strobe', fixture: 'tube' },
  { x: 31.5, z: 24.5, y: 2.3, color: 0xffc080, intensity: 0.85, dist: 13, flicker: 0.15, fixture: 'lamp' },
  { x: 32, z: 7.5, y: 1.3, color: 0xffb060, intensity: 0.9, dist: 13, flicker: 0.2, fixture: 'candles' },
  { x: 19.5, z: 1.9, y: 1.55, color: 0xff4020, intensity: 1.7, dist: 20, flicker: 0.35, fixture: 'candles' },
  { x: 18.15, z: 12.5, y: 1.9, color: 0xffa860, intensity: 0.55, dist: 9, flicker: 0.3, fixture: 'sconce' },
  { x: 21.85, z: 16.5, y: 1.9, color: 0xffa860, intensity: 0.55, dist: 9, flicker: 0.3, fixture: 'sconce' },
  { x: 24.5, z: 15, y: 2.0, color: 0xffc888, intensity: 0.75, dist: 7, flicker: 0.1, fixture: 'lamp' },
  { x: 7, z: 7, y: 2.6, color: 0xc8ff90, intensity: 0.7, dist: 9, flicker: 'strobe', fixture: 'tube' },
  { x: 42.5, z: 15, y: 2.7, color: 0x7090ff, intensity: 0.9, dist: 14, flicker: 0.06 },
  { x: 42.5, z: 21.5, y: 2.7, color: 0x7090ff, intensity: 0.9, dist: 14, flicker: 0.06 },
  { x: 2.6, z: 3.0, y: 1.6, color: 0xffb030, intensity: 1.8, dist: 16, flicker: 'heart' },
  { x: 8, z: 2.5, y: 2.2, color: 0x88c060, intensity: 0.55, dist: 10, flicker: 0.2 },
  { x: 14, z: 4.5, y: 2.2, color: 0x5070c0, intensity: 0.5, dist: 10, flicker: 0.05 },
  { x: 24, z: 4.5, y: 2.2, color: 0x5070c0, intensity: 0.5, dist: 10, flicker: 0.05 },
];

// paintings: cell, which wall of that cell (n/s/e/w)
const PAINTINGS = [
  { x: 17, y: 20, side: 'n', seed: 2 }, { x: 22, y: 20, side: 'n', seed: 3 }, { x: 15, y: 22, side: 'w', seed: 8 }, { x: 24, y: 22, side: 'e', seed: 9 },
  { x: 18, y: 14, side: 'w', seed: 4 }, { x: 21, y: 11, side: 'e', seed: 5 },
  { x: 3, y: 21, side: 'w', seed: 6 }, { x: 36, y: 9, side: 'e', seed: 7 },
];

// windows onto the moor. kind: moon (default) or rose (stained glass)
const WINDOWS = [
  { x: 3, y: 20, side: 'w' }, { x: 3, y: 25, side: 'w' }, { x: 6, y: 28, side: 's' }, { x: 11, y: 28, side: 's' },
  { x: 17, y: 28, side: 's' }, { x: 22, y: 28, side: 's' },
  { x: 28, y: 28, side: 's' }, { x: 34, y: 28, side: 's' }, { x: 36, y: 20, side: 'e' },
  { x: 30, y: 5, side: 'n' }, { x: 33, y: 5, side: 'n' }, { x: 36, y: 9, side: 'e', noPainting: true },
  { x: 19, y: 1, side: 'n', kind: 'rose' }, { x: 14, y: 1, side: 'n' }, { x: 24, y: 1, side: 'n' }, { x: 12, y: 6, side: 'w' }, { x: 25, y: 6, side: 'e' },
];
// moonbeams falling straight through the glasshouse roof: cell x, y
const SKYLIGHTS = [[40, 14], [45, 14], [40, 19], [45, 19], [42.5, 22.5], [42.5, 16.5]];

// things scrawled on walls (the last word is usually the point)
const WRITING = [
  { x: 9, y: 18, side: 'n', text: 'EAT', w: 1.2 },
  { x: 21, y: 13, side: 'e', text: 'SHE HUMS', w: 1.5 },
  { x: 18, y: 17, side: 'w', text: 'DO NOT LISTEN', w: 1.8 },
  { x: 26, y: 25, side: 'w', text: 'IT KNOWS YOUR NAME', w: 2.0 },
  { x: 29, y: 5, side: 'n', text: 'NELL NELL NELL', w: 2.0 },
  { x: 36, y: 12, side: 'e', text: 'LOOK AT THE WALLS', w: 2.0 },
  { x: 6, y: 4, side: 's', text: 'CHOOSE', w: 1.8 },
  { x: 7, y: 6, side: 'n', text: 'HE HUMS', w: 1.4 },
  { x: 4, y: 12, side: 'w', text: 'DO NOT', w: 1.3 },
  { x: 46, y: 24, side: 's', text: 'IT GROWS', w: 1.4, color: '#ddd8b0' },
];

const Level = (() => {
  const H = MAP.length, W = MAP[0].length;
  const cells = [];
  const DOOR_CHARS = { D: null, 1: 'moth', 2: 'serpent', 3: 'root', E: 'crown' };
  const doorDefs = [];
  const lightDefs = LIGHT_DEFS.map(d => ({ ...d, base: d.intensity, t: Math.random() * 10, k: 1 }));
  const fixtures = [];
  const pool = [];
  const staticMeshes = [];
  const glassMats = [];
  let poolTimer = 0;

  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const ch = MAP[y][x];
      row.push({ ch, x, y, wall: ch === '#' || ch === 'S' || ch === 'J', shelf: ch === 'S' || ch === 'J', table: ch === 'T', door: null, props: [], floor: null });
    }
    cells.push(row);
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? null : cells[y][x];
  const isWallCell = (x, y) => { const c = at(x, y); return !c || c.wall; };
  const cellX = wx => Math.floor(wx / CELL);
  const solidWorld = (wx, wz) => isWallCell(cellX(wx), cellX(wz));

  // work out floor types for tables and doors from their neighbours
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = cells[y][x];
    if (c.wall) continue;
    if (THEMES[c.ch]) { c.floor = c.ch; continue; }
    const counts = {};
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const n = at(x + dx, y + dy);
      if (n && THEMES[n.ch]) counts[n.ch] = (counts[n.ch] || 0) + 1;
    }
    c.floor = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'w';
    if (c.ch in DOOR_CHARS) {
      const orient = (isWallCell(x - 1, y) && isWallCell(x + 1, y)) ? 'ns' : 'ew';
      const def = { id: `door_${x}_${y}`, cx: x, cy: y, key: DOOR_CHARS[c.ch], exit: c.ch === 'E', orient };
      doorDefs.push(def);
      c.doorDef = def;
    }
  }

  // ---------- materials ----------
  const matCache = {};
  function surfaceMat(name, { vc = false, mould = 1, ns = 0.9 } = {}) {
    const key = name + (vc ? ':vc' : '') + ':' + mould;
    if (matCache[key]) return matCache[key];
    const [shininess, spec] = SURFACE[name] || [8, 0x161616];
    const opts = { map: Tex.get(name), normalMap: Tex.getNormal(name), normalScale: new THREE.Vector2(ns, ns), shininess, specular: new THREE.Color(spec), vertexColors: vc };
    const em = Tex.getEmissive(name);
    if (em) { opts.emissiveMap = em; opts.emissive = new THREE.Color(0xffffff); opts.emissiveIntensity = GLOW[name] || 0.5; }
    return (matCache[key] = Shaders.patchWorld(new THREE.MeshPhongMaterial(opts), { mould }));
  }
  const M = (name, o) => surfaceMat(name, o);
  const colorCache = {};
  function C(color, { shininess = 10, spec = 0x111111, mould = 0.7, emissive = 0x000000, flat = false } = {}) {
    const key = [color, shininess, spec, mould, emissive, flat].join();
    if (colorCache[key]) return colorCache[key];
    const m = new THREE.MeshPhongMaterial({ color, shininess, specular: spec, emissive, flatShading: flat });
    return (colorCache[key] = Shaders.patchWorld(m, { mould }));
  }

  // ---------- geometry batching (subdivided so ambient occlusion can be baked per vertex) ----------
  const batches = {};
  const SUB = 4;
  function batch(key) { return batches[key] || (batches[key] = { pos: [], nor: [], uv: [], col: [], idx: [] }); }

  function aoFlat(x, z, strength) {
    let occ = 0;
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [0.7, 0.7, 0.7], [-0.7, 0.7, 0.7], [0.7, -0.7, 0.7], [-0.7, -0.7, 0.7]];
    for (const [dx, dz, w] of dirs) {
      if (solidWorld(x + dx * 0.45, z + dz * 0.45)) occ += w;
      else if (solidWorld(x + dx * 0.95, z + dz * 0.95)) occ += w * 0.4;
    }
    return Math.max(0.5, 1 - occ * strength);
  }
  function aoWall(x, y, z, n) {
    const tx = -n[2], tz = n[0];
    let occ = 0;
    for (const s of [-1, 1]) {
      if (solidWorld(x + n[0] * 0.05 + tx * s * 0.35, z + n[2] * 0.05 + tz * s * 0.35)) occ += 1;
      else if (solidWorld(x + n[0] * 0.05 + tx * s * 0.9, z + n[2] * 0.05 + tz * s * 0.9)) occ += 0.35;
    }
    let v = 1 - occ * 0.09;
    v *= 1 - 0.3 * Math.max(0, 1 - y / 0.6) - 0.26 * Math.max(0, (y - (WALL_H - 0.6)) / 0.6);
    return Math.max(0.45, v);
  }

  // a, b, c, d go round the quad (c = b + d - a); uv runs (0,0) (1,0) (1,1) (0,1)
  function quadSub(key, a, b, c, d, n, ao) {
    const B = batch(key), base = B.pos.length / 3, N = SUB;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const u = i / N, v = j / N;
      const x = a[0] + (b[0] - a[0]) * u + (d[0] - a[0]) * v, y = a[1] + (b[1] - a[1]) * u + (d[1] - a[1]) * v, z = a[2] + (b[2] - a[2]) * u + (d[2] - a[2]) * v;
      B.pos.push(x, y, z); B.nor.push(n[0], n[1], n[2]); B.uv.push(u, v);
      const k = ao(x, y, z); B.col.push(k, k, k);
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const p00 = base + j * (N + 1) + i, p10 = p00 + 1, p01 = p00 + N + 1, p11 = p01 + 1;
      B.idx.push(p00, p10, p11, p00, p11, p01);
    }
  }
  function quadFlat(key, a, b, c, d, n, shade = 1) {
    const B = batch(key), base = B.pos.length / 3;
    B.pos.push(...a, ...b, ...c, ...d);
    for (let i = 0; i < 4; i++) { B.nor.push(...n); B.col.push(shade, shade, shade); }
    B.uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    B.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  // one wall face: p0 -> p1 along the bottom edge, n points into the room
  function wallFace(tex, p0, p1, n, trim) {
    const h = WALL_H, a = p0, b = p1, c = [p1[0], h, p1[2]], d = [p0[0], h, p0[2]];
    quadSub('w:' + tex, a, b, c, d, n, (x, y, z) => aoWall(x, y, z, n));
    if (!trim) return;
    const T = 't:frame', off = 0.04;
    const o = (p, y, k = off) => [p[0] + n[0] * k, y, p[2] + n[2] * k];
    quadFlat(T, o(p0, 0.01), o(p1, 0.01), o(p1, 0.17), o(p0, 0.17), n, 0.85);                 // baseboard face
    quadFlat(T, o(p0, 0.17), o(p1, 0.17), o(p1, 0.17, 0), o(p0, 0.17, 0), [0, 1, 0], 0.95);     // baseboard top
    quadFlat(T, o(p0, h - 0.16), o(p1, h - 0.16), o(p1, h), o(p0, h), n, 0.85);                 // crown face
    quadFlat(T, o(p0, h - 0.16, 0), o(p1, h - 0.16, 0), o(p1, h - 0.16), o(p0, h - 0.16), [0, -1, 0], 0.7);
    // chair rail in the long wood-panelled rooms
  }

  function buildStatic(scene) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = cells[y][x];
      if (c.wall) continue;
      const th = THEMES[c.floor];
      const x0 = x * CELL, x1 = x0 + CELL, z0 = y * CELL, z1 = z0 + CELL, h = WALL_H;
      quadSub('f:' + th.floor, [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], [0, 1, 0], (px, py, pz) => aoFlat(px, pz, 0.085));
      quadSub('c:' + th.ceil, [x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1], [0, -1, 0], (px, py, pz) => Math.min(1, aoFlat(px, pz, 0.08) + 0.1));
      if (c.doorDef) continue; // door frames are boxes
      const wallTex = (nx, ny) => { const n = at(nx, ny); return n && n.ch === 'S' ? 'bookshelf' : n && n.ch === 'J' ? 'jars' : th.wall; };
      const trimOn = th.trim;
      if (isWallCell(x, y - 1)) wallFace(wallTex(x, y - 1), [x0, 0, z0], [x1, 0, z0], [0, 0, 1], trimOn && !at(x, y - 1)?.shelf);
      if (isWallCell(x, y + 1)) wallFace(wallTex(x, y + 1), [x1, 0, z1], [x0, 0, z1], [0, 0, -1], trimOn && !at(x, y + 1)?.shelf);
      if (isWallCell(x - 1, y)) wallFace(wallTex(x - 1, y), [x0, 0, z1], [x0, 0, z0], [1, 0, 0], trimOn && !at(x - 1, y)?.shelf);
      if (isWallCell(x + 1, y)) wallFace(wallTex(x + 1, y), [x1, 0, z0], [x1, 0, z1], [-1, 0, 0], trimOn && !at(x + 1, y)?.shelf);
    }

    for (const key in batches) {
      const B = batches[key];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
      g.setIndex(B.idx);
      g.computeBoundingSphere();
      const texName = key.slice(2);
      const isTrim = key === 't:frame';
      const mat = M(texName, { vc: true, mould: key[0] === 'c' ? 0.6 : 1 });
      const mesh = new THREE.Mesh(g, isTrim ? (matCache.trim || (matCache.trim = Object.assign(M(texName, { vc: true, mould: 0.8 }).clone(), { side: THREE.DoubleSide }))) : mat);
      mesh.receiveShadow = true; mesh.castShadow = false;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      scene.add(mesh);
      staticMeshes.push(mesh);
    }

    buildDoorFrames(scene);
    buildTables(scene);
    buildPaintings(scene);
    buildWindows(scene);
    buildWriting(scene);
    buildWebs(scene);
    buildLights(scene);
    if (typeof Props !== 'undefined') Props.build(scene);
  }

  // solid axis-aligned box that is also drawn
  function box(w, h, d, material, x, y, z, scene, { cast = true, receive = true, collide = false } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = cast; m.receiveShadow = receive;
    m.updateMatrix(); m.matrixAutoUpdate = false;
    scene.add(m); staticMeshes.push(m);
    if (collide) addCollider({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h: y + h / 2 });
    return m;
  }
  // register a blocking box in every cell it touches, so nothing slips past a cell border
  function addCollider(b) {
    for (let cy = cellX(b.z0); cy <= cellX(b.z1); cy++) for (let cx = cellX(b.x0); cx <= cellX(b.x1); cx++) { const c = at(cx, cy); if (c && !c.wall) c.props.push(b); }
  }

  function buildDoorFrames(scene) {
    const fm = M('frame');
    const jw = (CELL - DOOR_W) / 2;
    for (const d of doorDefs) {
      const cx = d.cx * CELL + CELL / 2, cz = d.cy * CELL + CELL / 2;
      const c = cells[d.cy][d.cx];
      c.jambs = [];
      if (d.orient === 'ns') {
        box(jw, WALL_H, CELL, fm, d.cx * CELL + jw / 2, WALL_H / 2, cz, scene);
        box(jw, WALL_H, CELL, fm, (d.cx + 1) * CELL - jw / 2, WALL_H / 2, cz, scene);
        box(DOOR_W, WALL_H - DOOR_H, CELL, fm, cx, DOOR_H + (WALL_H - DOOR_H) / 2, cz, scene);
        c.jambs.push({ x0: d.cx * CELL, x1: d.cx * CELL + jw, z0: d.cy * CELL, z1: (d.cy + 1) * CELL, h: WALL_H });
        c.jambs.push({ x0: (d.cx + 1) * CELL - jw, x1: (d.cx + 1) * CELL, z0: d.cy * CELL, z1: (d.cy + 1) * CELL, h: WALL_H });
      } else {
        box(CELL, WALL_H, jw, fm, cx, WALL_H / 2, d.cy * CELL + jw / 2, scene);
        box(CELL, WALL_H, jw, fm, cx, WALL_H / 2, (d.cy + 1) * CELL - jw / 2, scene);
        box(CELL, WALL_H - DOOR_H, DOOR_W, fm, cx, DOOR_H + (WALL_H - DOOR_H) / 2, cz, scene);
        c.jambs.push({ x0: d.cx * CELL, x1: (d.cx + 1) * CELL, z0: d.cy * CELL, z1: d.cy * CELL + jw, h: WALL_H });
        c.jambs.push({ x0: d.cx * CELL, x1: (d.cx + 1) * CELL, z0: (d.cy + 1) * CELL - jw, z1: (d.cy + 1) * CELL, h: WALL_H });
      }
      if (d.exit) {
        // the front door alcove gets a back wall so it never looks open
        const back = new THREE.Mesh(new THREE.PlaneGeometry(CELL, WALL_H), M('frame'));
        back.position.set(cx, WALL_H / 2, (d.cy + 1) * CELL - 0.01); back.rotation.y = Math.PI;
        scene.add(back);
      }
    }
  }

  // tables, counters, pews, planters, crates
  function buildTables(scene) {
    const wood = M('frame');
    const top = C(0x3b2616, { shininess: 20, spec: 0x221a10 });
    const counterTop = C(0x6f6d63, { shininess: 30, spec: 0x333333 });
    const counterBody = M('panel');
    const cloth = C(0x5e1a14, { shininess: 2 });
    const soil = C(0x1c140c, { shininess: 2, mould: 1 });
    const crateMat = C(0x6a4a26, { shininess: 6 });
    const stone = M('stoneWall');

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = cells[y][x];
      if (!c.table) continue;
      const tx = t => at(x + t, y) && at(x + t, y).table;
      const tz = t => at(x, y + t) && at(x, y + t).table;
      const alongX = tx(-1) || tx(1) || !(tz(-1) || tz(1));
      const cx = x * CELL + CELL / 2, cz = y * CELL + CELL / 2;
      const lenX = alongX ? CELL : 1.7, lenZ = alongX ? 1.7 : CELL;
      const kind = c.floor === 's' ? 'pew' : c.floor === 't' ? 'counter' : c.floor === 'g' ? 'planter' : c.floor === 'p' ? 'crate' : 'table';

      if (kind === 'pew') {
        box(CELL, 0.1, 0.75, wood, cx, 0.46, cz - 0.05, scene);
        box(CELL, 0.95, 0.1, wood, cx, 0.62, cz + 0.36, scene);
        if (!tx(-1)) box(0.1, 0.9, 0.85, wood, x * CELL + 0.05, 0.45, cz, scene);
        if (!tx(1)) box(0.1, 0.9, 0.85, wood, (x + 1) * CELL - 0.05, 0.45, cz, scene);
        c.props.push({ x0: x * CELL, x1: (x + 1) * CELL, z0: cz - 0.48, z1: cz + 0.45, h: 1.0 });
      } else if (kind === 'counter') {
        let oz = 0;
        if (isWallCell(x, y - 1)) oz = -(CELL - 1.8) / 2; else if (isWallCell(x, y + 1)) oz = (CELL - 1.8) / 2;
        box(lenX, 0.9, 1.8, counterBody, cx, 0.45, cz + oz, scene);
        box(lenX, 0.07, 1.86, counterTop, cx, 0.93, cz + oz, scene);
        c.props.push({ x0: x * CELL, x1: (x + 1) * CELL, z0: cz + oz - 0.93, z1: cz + oz + 0.93, h: 0.97 });
      } else if (kind === 'planter') {
        // raised stone bed with soil and a hedge of ashroot, ferns and glowing caps
        box(CELL, 0.55, 1.6, stone, cx, 0.275, cz, scene);
        box(CELL - 0.12, 0.04, 1.48, soil, cx, 0.57, cz, scene, { cast: false });
        c.props.push({ x0: x * CELL, x1: (x + 1) * CELL, z0: cz - 0.82, z1: cz + 0.82, h: 0.6 });
        c.planter = { cx, cz };
      } else if (kind === 'crate') {
        box(1.5, 1.0, 1.5, crateMat, cx, 0.5, cz, scene);
        box(1.56, 0.06, 1.56, crateMat, cx, 1.03, cz, scene);
        c.props.push({ x0: cx - 0.78, x1: cx + 0.78, z0: cz - 0.78, z1: cz + 0.78, h: 1.06 });
      } else {
        box(lenX, 0.08, lenZ, top, cx, 0.82, cz, scene);
        if (c.floor === 'w' && alongX) box(lenX, 0.01, 0.7, cloth, cx, 0.865, cz, scene, { cast: false });
        const lx = lenX / 2 - 0.12, lz = lenZ / 2 - 0.12;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const isEndX = alongX ? ((sx < 0 && !tx(-1)) || (sx > 0 && !tx(1))) : true;
          const isEndZ = alongX ? true : ((sz < 0 && !tz(-1)) || (sz > 0 && !tz(1)));
          if (isEndX && isEndZ) box(0.1, 0.8, 0.1, wood, cx + sx * lx, 0.4, cz + sz * lz, scene);
        }
        c.props.push({ x0: cx - lenX / 2, x1: cx + lenX / 2, z0: cz - lenZ / 2, z1: cz + lenZ / 2, h: 0.86 });
      }
    }

    // chapel altar
    const ax = 19.5 * CELL, az = 1 * CELL + 0.8;
    box(4.2, 1.1, 1.3, stone, ax, 0.55, az, scene);
    box(4.4, 0.1, 1.45, cloth, ax, 1.14, az, scene);
    addCollider({ x0: ax - 2.1, x1: ax + 2.1, z0: az - 0.65, z1: az + 0.65, h: 1.2 });
  }

  function paintingTexture(seed) {
    const cv = document.createElement('canvas'); cv.width = 48; cv.height = 64;
    const g = cv.getContext('2d');
    let s = seed * 9301 + 49297; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    g.fillStyle = '#6b5424'; g.fillRect(0, 0, 48, 64);
    g.fillStyle = '#2b2008'; g.fillRect(3, 3, 42, 58);
    const bg = g.createLinearGradient(0, 0, 0, 64); bg.addColorStop(0, `hsl(${20 + r() * 100},25%,${10 + r() * 8}%)`); bg.addColorStop(1, '#070504');
    g.fillStyle = bg; g.fillRect(5, 5, 38, 54);
    g.fillStyle = `hsl(${r() * 40},20%,${14 + r() * 10}%)`;
    g.beginPath(); g.ellipse(24, 58, 16, 16, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#b9ab90'; g.beginPath(); g.ellipse(24, 27, 7, 9, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#140b06'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(17 + r() * 3, 22 + r() * 6); g.lineTo(29 + r() * 3, 24 + r() * 6); g.stroke(); }
    if (r() < 0.6) { g.fillStyle = 'rgba(200,180,70,0.8)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(20 + r() * 10, 16 + r() * 6, 1 + r() * 2, 0, Math.PI * 2); g.fill(); } }
    const t = new THREE.CanvasTexture(cv); t.anisotropy = 4;
    return t;
  }
  const SIDE = { n: { n: [0, 0, 1], o: [0, -1] }, s: { n: [0, 0, -1], o: [0, 1] }, w: { n: [1, 0, 0], o: [-1, 0] }, e: { n: [-1, 0, 0], o: [1, 0] } };
  // place a flat decal on the named wall of a cell: returns the wall-facing position and yaw
  function wallSpot(x, y, side, inset = 0.03) {
    const cx = x * CELL + CELL / 2, cz = y * CELL + CELL / 2, o = CELL / 2 - inset;
    const pos = new THREE.Vector3(cx, 0, cz);
    let yaw = 0;
    if (side === 'n') pos.z -= o;
    if (side === 's') { pos.z += o; yaw = Math.PI; }
    if (side === 'w') { pos.x -= o; yaw = Math.PI / 2; }
    if (side === 'e') { pos.x += o; yaw = -Math.PI / 2; }
    return { pos, yaw };
  }
  function buildPaintings(scene) {
    PAINTINGS.forEach((p, i) => {
      const m = new THREE.MeshPhongMaterial({ map: paintingTexture(p.seed || 1 + i), shininess: 15 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.45), m);
      const { pos, yaw } = wallSpot(p.x, p.y, p.side);
      pos.y = 1.85; mesh.position.copy(pos); mesh.rotation.y = yaw; mesh.rotation.z = (Math.random() - 0.5) * 0.08;
      scene.add(mesh);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(1.24, 1.58, 0.05), M('frame'));
      fr.position.copy(pos); fr.rotation.y = yaw; fr.rotation.z = mesh.rotation.z;
      fr.translateZ(-0.03); scene.add(fr);
    });
  }

  function buildWindows(scene) {
    const moonTex = Tex.get('window'), roseTex = Tex.get('rose');
    const frameMat = M('frame');
    for (const w of WINDOWS) {
      const rose = w.kind === 'rose';
      const W_ = rose ? 1.9 : 1.0, H_ = rose ? 1.9 : 1.5, cy = rose ? 2.05 : 1.75;
      const mat = new THREE.MeshBasicMaterial({ map: rose ? roseTex : moonTex, color: rose ? 0x9a9aa8 : 0x8a94aa, fog: true });
      glassMats.push({ mat, base: rose ? 0.6 : 0.56 });
      const { pos, yaw } = wallSpot(w.x, w.y, w.side, 0.02);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(W_, H_), mat);
      g.position.set(pos.x, cy, pos.z); g.rotation.y = yaw; scene.add(g);
      // a slim frame and sill so the window sits in the wall rather than on it
      const n = new THREE.Vector3(SIDE[w.side].n[0], 0, SIDE[w.side].n[2]);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(W_ + 0.22, 0.07, 0.16), frameMat);
      sill.position.set(pos.x, cy - H_ / 2 - 0.03, pos.z).addScaledVector(n, 0.06); sill.rotation.y = yaw; scene.add(sill);
      if (!rose) {
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(W_ + 0.2, 0.08, 0.1), frameMat);
        lintel.position.set(pos.x, cy + H_ / 2 + 0.03, pos.z).addScaledVector(n, 0.04); lintel.rotation.y = yaw; scene.add(lintel);
      }
      // a shaft of moonlight (or coloured glass light) falling into the room
      const tangent = new THREE.Vector3(-n.z, 0, n.x);
      const sh = Fx.windowShaft({ centre: new THREE.Vector3(pos.x, cy, pos.z).addScaledVector(n, 0.05), tangent, n, w: W_, h: H_, reach: rose ? 0.95 : 0.55, color: rose ? 0xd86a40 : 0x7d9cdc, intensity: rose ? 0.2 : 0.17 });
      scene.add(sh);
    }
    // roof panes in the glasshouse
    for (const [sx, sz] of SKYLIGHTS) scene.add(Fx.skyShaft(sx * CELL, sz * CELL, WALL_H));
  }

  function buildWriting(scene) {
    for (const w of WRITING) {
      const tex = Tex.writing(w.text, { color: w.color || '#7a0c0c', w: 320, h: 80, size: 40 });
      const mat = new THREE.MeshPhongMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, shininess: 40, specular: 0x331111 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w.w, w.w * 0.25), mat);
      const { pos, yaw } = wallSpot(w.x, w.y, w.side, 0.012);
      m.position.set(pos.x + (w.dx || 0), w.h || 1.55, pos.z); m.rotation.y = yaw; m.rotation.z = (Math.random() - 0.5) * 0.12;
      scene.add(m);
    }
  }

  // cobwebs in the upper corners of most rooms
  function buildWebs(scene) {
    const mat = new THREE.MeshPhongMaterial({ map: Tex.get('web'), transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0x9a9a92, shininess: 2, polygonOffset: true, polygonOffsetFactor: -1 });
    const geo = new THREE.PlaneGeometry(0.9, 0.9);
    let k = 7;
    const rng = () => (k = (k * 16807) % 2147483647) / 2147483647;
    const put = (cx, cz, t, n) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(cx + t[0] * 0.45 + n[0] * 0.02, WALL_H - 0.45, cz + t[1] * 0.45 + n[1] * 0.02);
      m.rotation.y = Math.atan2(-t[1], t[0]);
      scene.add(m);
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = cells[y][x];
      if (c.wall || c.ch === 'm' || c.doorDef) continue;
      const N = isWallCell(x, y - 1), S = isWallCell(x, y + 1), Wl = isWallCell(x - 1, y), E = isWallCell(x + 1, y);
      const x0 = x * CELL, x1 = x0 + CELL, z0 = y * CELL, z1 = z0 + CELL;
      if (N && Wl && rng() < 0.6) { put(x0, z0, [1, 0], [0, 1]); put(x0, z0, [0, 1], [1, 0]); }
      if (N && E && rng() < 0.6) { put(x1, z0, [-1, 0], [0, 1]); put(x1, z0, [0, 1], [-1, 0]); }
      if (S && Wl && rng() < 0.6) { put(x0, z1, [1, 0], [0, -1]); put(x0, z1, [0, -1], [1, 0]); }
      if (S && E && rng() < 0.6) { put(x1, z1, [-1, 0], [0, -1]); put(x1, z1, [0, -1], [-1, 0]); }
    }
  }

  // ---------- lights: a few real lights shared among many places ----------
  const POOL = 6;
  function buildLights(scene) {
    const flameMat = new THREE.SpriteMaterial({ map: Tex.get('flame'), color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const glow = new THREE.SpriteMaterial({ map: Tex.get('glint'), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 });
    const metal = new THREE.MeshPhongMaterial({ color: 0x3a3226, shininess: 40, specular: 0x554433 });
    const wax = new THREE.MeshPhongMaterial({ color: 0xd8cdb0, emissive: 0x2a1a08 });
    for (const L of lightDefs) {
      const wx = L.x * CELL, wz = L.z * CELL;
      const fx = { def: L, sprites: [], glows: [] };
      const addFlame = (x, y, z, s) => {
        const fl = new THREE.Sprite(flameMat); fl.scale.set(0.16 * s, 0.26 * s, 1); fl.position.set(x, y, z); scene.add(fl); fx.sprites.push(fl);
        const gl = new THREE.Sprite(glow); gl.scale.setScalar(0.9 * s); gl.position.set(x, y, z); scene.add(gl); fx.glows.push(gl);
      };
      if (L.fixture === 'candles') {
        for (let i = 0; i < 3; i++) {
          const ox = (i - 1) * 0.35, oz = (i % 2) * 0.12, baseY = L.y - 0.35;
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.22 + i * 0.05, 6), wax);
          cyl.position.set(wx + ox, baseY + 0.11 + i * 0.025, wz + oz); scene.add(cyl);
          addFlame(wx + ox, baseY + 0.32 + i * 0.05, wz + oz, 1);
        }
      } else if (L.fixture === 'chandelier') {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 6, 16), metal);
        ring.rotation.x = Math.PI / 2; ring.position.set(wx, L.y, wz); scene.add(ring);
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, WALL_H - L.y, 4), metal);
        chain.position.set(wx, L.y + (WALL_H - L.y) / 2, wz); scene.add(chain);
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2;
          if (i % 3 !== 1) addFlame(wx + Math.cos(a) * 0.7, L.y + 0.12, wz + Math.sin(a) * 0.7, 1);
        }
      } else if (L.fixture === 'sconce') {
        // a bracket on the wall with a single weak flame
        const br = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), metal); br.position.set(wx, L.y - 0.18, wz); scene.add(br);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.12, 6), wax); cup.position.set(wx, L.y - 0.08, wz); scene.add(cup);
        addFlame(wx, L.y + 0.06, wz, 0.8);
      } else if (L.fixture === 'tube') {
        const tm = new THREE.MeshBasicMaterial({ color: 0xd8ffe8 });
        const tube = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.1), tm);
        tube.position.set(wx, L.y + 0.08, wz); scene.add(tube);
        fx.tubeMat = tm;
      } else if (L.fixture === 'lamp') {
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 8, 1, true), new THREE.MeshPhongMaterial({ color: 0xc89048, emissive: 0x6a3a10, side: THREE.DoubleSide }));
        shade.position.set(wx, L.y + 0.2, wz); scene.add(shade);
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, WALL_H - L.y, 3), metal);
        cord.position.set(wx, L.y + (WALL_H - L.y) / 2, wz); scene.add(cord);
      }
      fixtures.push(fx);
    }
    for (let i = 0; i < POOL; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 14, 2);
      light.position.set(0, -50, 0); scene.add(light);
      pool.push({ light, def: null, next: null, leaving: false, fade: 0 });
    }
  }

  function addLightDef(d) {
    const def = { ...d, base: d.intensity, t: Math.random() * 10, k: 1 };
    lightDefs.push(def);
    return def;
  }
  function removeLightDef(def) {
    const i = lightDefs.indexOf(def); if (i >= 0) lightDefs.splice(i, 1);
    for (const s of pool) { if (s.def === def) s.leaving = true; if (s.next === def) s.next = null; }
  }

  function applyDef(s) {
    const d = s.def; if (!d) return;
    s.light.color.setHex(d.color); s.light.distance = d.dist;
    s.light.position.set(d.x * CELL, d.y, d.z * CELL);
  }

  function assignPool(px, pz) {
    const ranked = lightDefs.map(d => ({ d, dist: Math.hypot(d.x * CELL - px, d.z * CELL - pz) })).filter(o => o.dist < o.d.dist + 8).sort((a, b) => a.dist - b.dist).slice(0, POOL).map(o => o.d);
    for (const s of pool) if (s.def && !s.leaving && !ranked.includes(s.def)) s.leaving = true;
    for (const d of ranked) {
      if (pool.some(s => s.def === d && !s.leaving) || pool.some(s => s.next === d)) continue;
      const free = pool.find(s => !s.def);
      if (free) { free.def = d; free.fade = 0; free.leaving = false; applyDef(free); continue; }
      const leaving = pool.find(s => s.leaving && !s.next);
      if (leaving) leaving.next = d;
    }
  }

  function updateLights(dt, time, px, pz) {
    poolTimer -= dt;
    if (poolTimer <= 0) { poolTimer = 0.15; assignPool(px, pz); }

    for (const d of lightDefs) {
      d.t += dt;
      let k = 1;
      if (d.flicker === 'strobe') {
        const s = Math.sin(d.t * 1.3) + Math.sin(d.t * 7.1);
        k = s > 1.4 ? (Math.random() < 0.5 ? 0.05 : 1) : (Math.random() < 0.02 ? 0.1 : 1);
      } else if (d.flicker === 'heart') {
        k = 0.45 + 0.75 * Math.pow(Math.max(0, Math.sin(d.t * 4.4)), 5) + 0.2 * Math.pow(Math.max(0, Math.sin(d.t * 4.4 - 0.9)), 5);
      } else {
        const f = d.flicker || 0;
        k = 1 - f * 0.5 + f * 0.5 * (Math.sin(d.t * 9.3) * 0.5 + Math.sin(d.t * 23.7) * 0.3 + Math.random() * 0.4);
      }
      d.k = k;
    }
    for (const fx of fixtures) {
      const d = fx.def;
      if (fx.tubeMat) fx.tubeMat.color.setScalar(d.k > 0.5 ? 0.85 : 0.15);
      fx.sprites.forEach((s, i) => { const q = 0.85 + 0.3 * Math.sin(time * 17 + i * 3.1) * Math.random(); s.scale.y = 0.26 * q * (s.scale.x / 0.16); });
      fx.glows.forEach(g => { g.material.opacity = 0.35 + 0.35 * d.k; });
    }
    for (const s of pool) {
      const target = s.def && !s.leaving ? 1 : 0;
      s.fade += (target - s.fade) * Math.min(1, dt * 7);
      if (s.leaving && s.fade < 0.03) { s.def = s.next; s.next = null; s.leaving = false; s.fade = 0; applyDef(s); }
      s.light.intensity = s.def ? s.def.base * 1.3 * s.def.k * s.fade * Game.lightDim * (s.def.scale || 1) : 0;
    }
  }

  // window glass brightens with lightning
  function setFlash(f) { for (const g of glassMats) g.mat.color.setScalar(g.base + f * 1.6); }

  // ---------- queries ----------
  function doorBlocks(c) { return c.door ? !c.door.passable : !!c.doorDef; }
  function blocksMove(x, y) { const c = at(x, y); return !c || c.wall || c.table || doorBlocks(c); }
  function blocksSight(x, y) { const c = at(x, y); return !c || c.wall || doorBlocks(c); }

  function pushOut(p, r, b) {
    const qx = Math.max(b.x0, Math.min(p.x, b.x1)), qz = Math.max(b.z0, Math.min(p.z, b.z1));
    let dx = p.x - qx, dz = p.z - qz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return false;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2), push = r - d;
      p.x += dx / d * push; p.z += dz / d * push;
    } else {
      const opts = [[p.x - b.x0 + r, -1, 0], [b.x1 - p.x + r, 1, 0], [p.z - b.z0 + r, 0, -1], [b.z1 - p.z + r, 0, 1]];
      opts.sort((a, c) => a[0] - c[0]);
      p.x += opts[0][1] * opts[0][0]; p.z += opts[0][2] * opts[0][0];
    }
    return true;
  }

  function collide(p, r, { ignoreProps = false } = {}) {
    for (let iter = 0; iter < 3; iter++) {
      let hit = false;
      const minX = cellX(p.x - r), maxX = cellX(p.x + r), minY = cellX(p.z - r), maxY = cellX(p.z + r);
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const c = at(x, y);
        if (!c || c.wall || (c.doorDef && !(c.door && c.door.passable))) {
          hit = pushOut(p, r, { x0: x * CELL, x1: (x + 1) * CELL, z0: y * CELL, z1: (y + 1) * CELL }) || hit;
          continue;
        }
        if (c.jambs) for (const j of c.jambs) hit = pushOut(p, r, j) || hit;
        if (!ignoreProps) for (const pr of c.props) hit = pushOut(p, r, pr) || hit;
      }
      if (!hit) break;
    }
    return p;
  }

  // grid ray march; true when nothing blocks between the two points
  function lineOfSight(ax, az, bx, bz, fn = blocksSight) {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const steps = Math.ceil(len / 0.35);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (fn(cellX(ax + dx * t), cellX(az + dz * t))) return false;
    }
    return true;
  }
  function walkLine(ax, az, bx, bz, r = 0.4) {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len * r, nz = dx / len * r;
    return lineOfSight(ax + nx, az + nz, bx + nx, bz + nz, blocksMove) && lineOfSight(ax - nx, az - nz, bx - nx, bz - nz, blocksMove) && lineOfSight(ax, az, bx, bz, blocksMove);
  }

  // is this point inside something solid (wall, floor, ceiling, closed door, furniture)?
  function blockedPoint(x, y, z) {
    if (y < 0 || y > WALL_H) return true;
    const c = at(cellX(x), cellX(z));
    if (!c || c.wall) return true;
    if (c.doorDef) {
      if (!(c.door && c.door.passable)) return true;
      if (y > DOOR_H) return true;
      if (c.jambs) for (const j of c.jambs) if (x >= j.x0 && x <= j.x1 && z >= j.z0 && z <= j.z1) return true;
    }
    for (const b of c.props) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && y < (b.h || 1)) return true;
    return false;
  }
  // first solid thing along a ray: { dist, point, normal } or null. Cheap: the level is a grid, so we just march.
  function raycast(ox, oy, oz, dx, dy, dz, maxD = 70) {
    const step = 0.08;
    let t = 0;
    while (t < maxD) {
      const nt = t + step;
      if (blockedPoint(ox + dx * nt, oy + dy * nt, oz + dz * nt)) {
        let lo = t, hi = nt;
        for (let i = 0; i < 5; i++) { const mid = (lo + hi) / 2; if (blockedPoint(ox + dx * mid, oy + dy * mid, oz + dz * mid)) hi = mid; else lo = mid; }
        const px = ox + dx * lo, py = oy + dy * lo, pz = oz + dz * lo, bx = ox + dx * hi, by = oy + dy * hi, bz = oz + dz * hi;
        let n = [-Math.sign(dx), 0, 0], best = 0;
        if (blockedPoint(bx, py, pz) && Math.abs(dx) > best) { best = Math.abs(dx); n = [-Math.sign(dx), 0, 0]; }
        if (blockedPoint(px, by, pz) && Math.abs(dy) > best) { best = Math.abs(dy); n = [0, -Math.sign(dy), 0]; }
        if (blockedPoint(px, py, bz) && Math.abs(dz) > best) { best = Math.abs(dz); n = [0, 0, -Math.sign(dz)]; }
        return { dist: lo, point: { x: px, y: py, z: pz }, normal: { x: n[0], y: n[1], z: n[2] } };
      }
      t = nt;
    }
    return null;
  }

  // breadth-first distance field toward a target cell; monsters roll downhill on it
  const flow = new Int16Array(W * H);
  function computeFlow(tx, ty) {
    flow.fill(-1);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return flow;
    const q = new Int32Array(W * H);
    let head = 0, tail = 0;
    flow[ty * W + tx] = 0; q[tail++] = ty * W + tx;
    while (head < tail) {
      const i = q[head++], x = i % W, y = (i / W) | 0, d = flow[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (flow[ni] !== -1 || blocksMove(nx, ny)) continue;
        flow[ni] = d + 1; q[tail++] = ni;
      }
    }
    return flow;
  }
  function flowAt(x, y) { return (x < 0 || y < 0 || x >= W || y >= H) ? -1 : flow[y * W + x]; }

  function floorAt(wx, wz) { const c = at(cellX(wx), cellX(wz)); return c ? c.floor : null; }
  function cellCenter(x, y) { return { x: x * CELL + CELL / 2, z: y * CELL + CELL / 2 }; }
  function setHot(i, x, z, r) { Shaders.worldUniforms.uHot.value[i].set(x, z, r); }

  return {
    W, H, cells, at, doorDefs, staticMeshes, buildStatic, updateLights, collide, lineOfSight, walkLine, raycast,
    blocksMove, blocksSight, computeFlow, flowAt, floorAt, cellCenter, cellX, box, addCollider, M, C, setHot, setFlash,
    addLightDef, removeLightDef, lightDefs, wallSpot, THEMES,
  };
})();
