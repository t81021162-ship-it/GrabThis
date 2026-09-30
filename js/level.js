/* Witherholm — the house.
   The map is a plain ASCII grid so it is easy to edit by hand.

   #  wall                 S  bookshelf wall        T  table / counter / pew
   m  marble (foyer)       w  wood (dining, study)  t  tile (kitchen)
   c  carpet (halls)       l  dark wood (library)   s  stone (chapel)
   D  door                 1  Moth door             2  Serpent door
   E  front door (needs the Crown key)

   One cell is CELL world units wide. Cell (x, y) maps to world (x*CELL, y*CELL);
   north is -z. */

const CELL = 2;
const WALL_H = 3.0;
const DOOR_H = 2.3;
const DOOR_W = 1.3;

const MAP = [
  '########################################',  // 0
  '############ssssssssssssss##############',  // 1
  '############ssssssssssssss##############',  // 2
  '############ssssssssssssss##############',  // 3
  '############ssssssssssssss##############',  // 4
  '############sTTTTsssssTTTT#SSwwwwwwSS###',  // 5
  '############ssssssssssssss#wwwwwwwwww###',  // 6
  '############sTTTTsssssTTTT#wwwwTTwwww###',  // 7
  '############ssssssssssssss#wwwwwwwwww###',  // 8
  '###################2#######wwwwwwwwww###',  // 9
  '###TTTttttTTTt####cccc#####wwwwwwwwww###',  // 10
  '###ttttttttttt####cccc#####wwwwwwwwww###',  // 11
  '###tttttttttttcccDcccc#####wwwwwwwwww###',  // 12
  '###ttttTTTtttt####cccc#####wwwwwwwwww###',  // 13
  '###ttttttttttt####cccc#ccc#####c########',  // 14
  '###ttttttttttt####ccccDccc#####c########',  // 15
  '########t#########cccc#ccc#####c########',  // 16
  '########D#########cccc#########D########',  // 17
  '###wwwwwwwwwww####cccc####lllllllllll###',  // 18
  '###wwwwwwwwwww#####cc#####lllllllllll###',  // 19
  '###wwwwwwwwwww#mmmmmmmmmm#llSSSllSSSl###',  // 20
  '###wwwwwwwwwww#mmmmmmmmmm#lllllllllll###',  // 21
  '###wwwwwwwwwww#m#mmmmmm#m#lllllllllll###',  // 22
  '###wwwTTTTwwww#mmmmmmmmmm#llSSSllSSSl###',  // 23
  '###wwwwwwwwwwwDmmmmmmmmmm1lllllllllll###',  // 24
  '###wwwwwwwwwww#mmmmmmmmmm#lllllllllll###',  // 25
  '###wwwwwwwwwww#m#mmmmmm#m#llSSSllSSSl###',  // 26
  '###wwwwwwwwwww#mmmmmmmmmm#lllllllllll###',  // 27
  '###wwwwwwwwwww#mmmmmmmmmm#lllllllllll###',  // 28
  '###################E####################',  // 29
];

// floor type -> textures for that room
const THEMES = {
  m: { floor: 'marble', wall: 'wallRed', ceil: 'plaster' },
  w: { floor: 'wood', wall: 'wallGreen', ceil: 'plaster' },
  t: { floor: 'tile', wall: 'wallTile', ceil: 'plaster' },
  c: { floor: 'carpet', wall: 'panel', ceil: 'beams' },
  l: { floor: 'woodDark', wall: 'panel', ceil: 'beams' },
  s: { floor: 'stone', wall: 'stoneWall', ceil: 'stoneWall' },
};

// room lights: position in cell units (cell centre = +0.5)
const LIGHT_DEFS = [
  { x: 20, z: 24, y: 2.75, color: 0xffb070, intensity: 1.15, dist: 17, flicker: 0.25, fixture: 'chandelier' },
  { x: 8, z: 23.5, y: 1.25, color: 0xff9a50, intensity: 1.0, dist: 13, flicker: 0.45, fixture: 'candles' },
  { x: 8, z: 12.5, y: 3.05, color: 0xb8ffd0, intensity: 0.95, dist: 14, flicker: 'strobe', fixture: 'tube' },
  { x: 31.5, z: 24.5, y: 2.4, color: 0xffc080, intensity: 0.85, dist: 13, flicker: 0.15, fixture: 'lamp' },
  { x: 32, z: 7.5, y: 1.3, color: 0xffb060, intensity: 0.9, dist: 13, flicker: 0.2, fixture: 'candles' },
  { x: 19.5, z: 1.9, y: 1.7, color: 0xff4020, intensity: 1.7, dist: 20, flicker: 0.35, fixture: 'candles' },
];

// paintings: cell, which wall of that cell (n/s/e/w)
const PAINTINGS = [
  { x: 19, y: 20, side: 'n' }, { x: 17, y: 20, side: 'n', seed: 2 }, { x: 22, y: 20, side: 'n', seed: 3 },
  { x: 18, y: 14, side: 'w', seed: 4 }, { x: 21, y: 11, side: 'e', seed: 5 },
  { x: 3, y: 21, side: 'w', seed: 6 }, { x: 36, y: 9, side: 'e', seed: 7 },
];

const Level = (() => {
  const H = MAP.length, W = MAP[0].length;
  const cells = [];
  const DOOR_CHARS = { D: null, 1: 'moth', 2: 'serpent', E: 'crown' };
  const doorDefs = [];
  const lights = [];
  const staticMeshes = [];
  const flickerMats = [];

  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const ch = MAP[y][x];
      row.push({ ch, x, y, wall: ch === '#' || ch === 'S', shelf: ch === 'S', table: ch === 'T', door: null, props: [], floor: null });
    }
    cells.push(row);
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? null : cells[y][x];
  const isWallCell = (x, y) => { const c = at(x, y); return !c || c.wall; };

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

  // ---------- geometry batching ----------
  const batches = {};
  function batch(key) {
    return batches[key] || (batches[key] = { pos: [], nor: [], uv: [], idx: [] });
  }
  function quad(key, a, b, c, d, n, uvs = [0, 0, 1, 0, 1, 1, 0, 1]) {
    const B = batch(key), base = B.pos.length / 3;
    B.pos.push(...a, ...b, ...c, ...d);
    for (let i = 0; i < 4; i++) B.nor.push(...n);
    B.uv.push(...uvs);
    B.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  function mat(name, opts = {}) {
    const m = new THREE.MeshPhongMaterial({ map: Tex.get(name), shininess: opts.shininess ?? 6, specular: new THREE.Color(opts.spec ?? 0x111111), ...opts.extra });
    return Shaders.patchWorld(m, { mould: opts.mould ?? 1 });
  }
  const matCache = {};
  const M = (name, opts) => matCache[name] || (matCache[name] = mat(name, opts));

  function buildStatic(scene) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = cells[y][x];
      if (c.wall) continue;
      const th = THEMES[c.floor];
      const x0 = x * CELL, x1 = x0 + CELL, z0 = y * CELL, z1 = z0 + CELL, h = WALL_H;
      quad('f:' + th.floor, [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], [0, 1, 0]);
      quad('c:' + th.ceil, [x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1], [0, -1, 0]);
      if (c.doorDef) continue; // door frames are boxes
      const wallKey = (nx, ny) => { const n = at(nx, ny); return 'w:' + (n && n.shelf ? 'bookshelf' : th.wall); };
      if (isWallCell(x, y - 1)) quad(wallKey(x, y - 1), [x0, 0, z0], [x1, 0, z0], [x1, h, z0], [x0, h, z0], [0, 0, 1]);
      if (isWallCell(x, y + 1)) quad(wallKey(x, y + 1), [x1, 0, z1], [x0, 0, z1], [x0, h, z1], [x1, h, z1], [0, 0, -1]);
      if (isWallCell(x - 1, y)) quad(wallKey(x - 1, y), [x0, 0, z1], [x0, 0, z0], [x0, h, z0], [x0, h, z1], [1, 0, 0]);
      if (isWallCell(x + 1, y)) quad(wallKey(x + 1, y), [x1, 0, z0], [x1, 0, z1], [x1, h, z1], [x1, h, z0], [-1, 0, 0]);
    }

    for (const key in batches) {
      const B = batches[key];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
      g.setIndex(B.idx);
      g.computeBoundingSphere();
      const texName = key.slice(2);
      const mesh = new THREE.Mesh(g, M(texName, { mould: key[0] === 'c' ? 0.6 : 1 }));
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      scene.add(mesh);
      staticMeshes.push(mesh);
    }

    buildDoorFrames(scene);
    buildProps(scene);
    buildPaintings(scene);
    buildLights(scene);
  }

  function box(w, h, d, material, x, y, z, scene, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = cast; m.receiveShadow = receive;
    m.updateMatrix(); m.matrixAutoUpdate = false;
    scene.add(m); staticMeshes.push(m);
    return m;
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
        c.jambs.push({ x0: d.cx * CELL, x1: d.cx * CELL + jw, z0: d.cy * CELL, z1: (d.cy + 1) * CELL });
        c.jambs.push({ x0: (d.cx + 1) * CELL - jw, x1: (d.cx + 1) * CELL, z0: d.cy * CELL, z1: (d.cy + 1) * CELL });
      } else {
        box(CELL, WALL_H, jw, fm, cx, WALL_H / 2, d.cy * CELL + jw / 2, scene);
        box(CELL, WALL_H, jw, fm, cx, WALL_H / 2, (d.cy + 1) * CELL - jw / 2, scene);
        box(CELL, WALL_H - DOOR_H, DOOR_W, fm, cx, DOOR_H + (WALL_H - DOOR_H) / 2, cz, scene);
        c.jambs.push({ x0: d.cx * CELL, x1: (d.cx + 1) * CELL, z0: d.cy * CELL, z1: d.cy * CELL + jw });
        c.jambs.push({ x0: d.cx * CELL, x1: (d.cx + 1) * CELL, z0: (d.cy + 1) * CELL - jw, z1: (d.cy + 1) * CELL });
      }
      if (d.exit) {
        // the front door alcove gets a back wall so it never looks open
        const back = new THREE.Mesh(new THREE.PlaneGeometry(CELL, WALL_H), M('frame'));
        back.position.set(cx, WALL_H / 2, (d.cy + 1) * CELL - 0.01); back.rotation.y = Math.PI;
        scene.add(back);
      }
    }
  }

  // tables, counters, pews, desks
  function buildProps(scene) {
    const wood = M('frame');
    const top = new THREE.MeshPhongMaterial({ color: 0x3b2616, shininess: 20, specular: 0x221a10 });
    Shaders.patchWorld(top);
    const counterTop = new THREE.MeshPhongMaterial({ color: 0x6f6d63, shininess: 30, specular: 0x333333 });
    Shaders.patchWorld(counterTop);
    const counterBody = M('panel');
    const cloth = new THREE.MeshPhongMaterial({ color: 0x5e1a14, shininess: 2 });
    Shaders.patchWorld(cloth);

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = cells[y][x];
      if (!c.table) continue;
      const tx = t => at(x + t, y) && at(x + t, y).table;
      const tz = t => at(x, y + t) && at(x, y + t).table;
      const alongX = tx(-1) || tx(1) || !(tz(-1) || tz(1));
      const cx = x * CELL + CELL / 2, cz = y * CELL + CELL / 2;
      const lenX = alongX ? CELL : 1.7, lenZ = alongX ? 1.7 : CELL;
      const kind = c.floor === 's' ? 'pew' : c.floor === 't' ? 'counter' : 'table';

      if (kind === 'pew') {
        box(CELL, 0.1, 0.75, wood, cx, 0.46, cz - 0.05, scene);
        box(CELL, 0.95, 0.1, wood, cx, 0.62, cz + 0.36, scene);
        if (!tx(-1)) box(0.1, 0.9, 0.85, wood, x * CELL + 0.05, 0.45, cz, scene);
        if (!tx(1)) box(0.1, 0.9, 0.85, wood, (x + 1) * CELL - 0.05, 0.45, cz, scene);
        c.props.push({ x0: x * CELL, x1: (x + 1) * CELL, z0: cz - 0.48, z1: cz + 0.45, h: 1.0 });
      } else if (kind === 'counter') {
        // push counters against a wall when there is one
        let oz = 0;
        if (isWallCell(x, y - 1)) oz = -(CELL - 1.8) / 2; else if (isWallCell(x, y + 1)) oz = (CELL - 1.8) / 2;
        box(lenX, 0.9, 1.8, counterBody, cx, 0.45, cz + oz, scene);
        box(lenX, 0.07, 1.86, counterTop, cx, 0.93, cz + oz, scene);
        c.props.push({ x0: x * CELL, x1: (x + 1) * CELL, z0: cz + oz - 0.93, z1: cz + oz + 0.93, h: 0.97 });
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
    const altar = M('stoneWall');
    const ax = 19.5 * CELL, az = 1 * CELL + 0.8;
    box(4.2, 1.1, 1.3, altar, ax, 0.55, az, scene);
    box(4.4, 0.1, 1.45, cloth, ax, 1.14, az, scene);
    cells[1][19].props.push({ x0: ax - 2.1, x1: ax + 2.1, z0: az - 0.65, z1: az + 0.65, h: 1.15 });
    cells[1][18].props.push({ x0: ax - 2.1, x1: ax + 2.1, z0: az - 0.65, z1: az + 0.65, h: 1.15 });
    cells[1][20].props.push({ x0: ax - 2.1, x1: ax + 2.1, z0: az - 0.65, z1: az + 0.65, h: 1.15 });
  }

  function paintingTexture(seed) {
    const cv = document.createElement('canvas'); cv.width = 48; cv.height = 64;
    const g = cv.getContext('2d');
    let s = seed * 9301 + 49297; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    g.fillStyle = '#6b5424'; g.fillRect(0, 0, 48, 64);
    g.fillStyle = '#2b2008'; g.fillRect(3, 3, 42, 58);
    const bg = g.createLinearGradient(0, 0, 0, 64); bg.addColorStop(0, `hsl(${20 + r() * 100},25%,${10 + r() * 8}%)`); bg.addColorStop(1, '#070504');
    g.fillStyle = bg; g.fillRect(5, 5, 38, 54);
    // sitter
    g.fillStyle = `hsl(${r() * 40},20%,${14 + r() * 10}%)`;
    g.beginPath(); g.ellipse(24, 58, 16, 16, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#b9ab90'; g.beginPath(); g.ellipse(24, 27, 7, 9, 0, 0, Math.PI * 2); g.fill();
    // the eyes have been scratched out
    g.strokeStyle = '#140b06'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(17 + r() * 3, 22 + r() * 6); g.lineTo(29 + r() * 3, 24 + r() * 6); g.stroke(); }
    if (r() < 0.6) { g.fillStyle = 'rgba(200,180,70,0.8)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(20 + r() * 10, 16 + r() * 6, 1 + r() * 2, 0, Math.PI * 2); g.fill(); } }
    const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    return t;
  }
  function buildPaintings(scene) {
    PAINTINGS.forEach((p, i) => {
      const m = new THREE.MeshPhongMaterial({ map: paintingTexture(p.seed || 1 + i), shininess: 15 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.45), m);
      const cx = p.x * CELL + CELL / 2, cz = p.y * CELL + CELL / 2, o = CELL / 2 - 0.03;
      mesh.position.set(cx, 1.85, cz);
      if (p.side === 'n') { mesh.position.z -= o; }
      if (p.side === 's') { mesh.position.z += o; mesh.rotation.y = Math.PI; }
      if (p.side === 'w') { mesh.position.x -= o; mesh.rotation.y = Math.PI / 2; }
      if (p.side === 'e') { mesh.position.x += o; mesh.rotation.y = -Math.PI / 2; }
      mesh.rotation.z = (Math.random() - 0.5) * 0.08;
      scene.add(mesh);
    });
  }

  function buildLights(scene) {
    const flameMat = new THREE.SpriteMaterial({ map: Tex.get('glint'), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false });
    const metal = new THREE.MeshPhongMaterial({ color: 0x3a3226, shininess: 40, specular: 0x554433 });
    const wax = new THREE.MeshPhongMaterial({ color: 0xd8cdb0, emissive: 0x2a1a08 });
    for (const L of LIGHT_DEFS) {
      const wx = L.x * CELL, wz = L.z * CELL;
      const light = new THREE.PointLight(L.color, L.intensity, L.dist, 2);
      light.position.set(wx, L.y, wz);
      scene.add(light);
      const entry = { light, base: L.intensity, flicker: L.flicker, t: Math.random() * 10, sprites: [] };
      if (L.fixture === 'candles') {
        for (let i = 0; i < 3; i++) {
          const ox = (i - 1) * 0.35, oz = (i % 2) * 0.12;
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.22 + i * 0.05, 6), wax);
          const baseY = L.y - 0.35;
          cyl.position.set(wx + ox, baseY + 0.11 + i * 0.025, wz + oz); scene.add(cyl);
          const fl = new THREE.Sprite(flameMat); fl.scale.set(0.18, 0.28, 1);
          fl.position.set(wx + ox, baseY + 0.3 + i * 0.05, wz + oz); scene.add(fl); entry.sprites.push(fl);
        }
      } else if (L.fixture === 'chandelier') {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 6, 16), metal);
        ring.rotation.x = Math.PI / 2; ring.position.set(wx, L.y, wz); scene.add(ring);
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, WALL_H - L.y, 4), metal);
        chain.position.set(wx, L.y + (WALL_H - L.y) / 2, wz); scene.add(chain);
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2;
          const fl = new THREE.Sprite(flameMat); fl.scale.set(0.16, 0.24, 1);
          fl.position.set(wx + Math.cos(a) * 0.7, L.y + 0.1, wz + Math.sin(a) * 0.7);
          if (i % 3 !== 1) { scene.add(fl); entry.sprites.push(fl); }   // a few are dead
        }
      } else if (L.fixture === 'tube') {
        const tm = new THREE.MeshBasicMaterial({ color: 0xd8ffe8 });
        const tube = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.1), tm);
        tube.position.set(wx, L.y + 0.08, wz); scene.add(tube);
        entry.tubeMat = tm;
      } else if (L.fixture === 'lamp') {
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 8, 1, true), new THREE.MeshPhongMaterial({ color: 0xc89048, emissive: 0x6a3a10, side: THREE.DoubleSide }));
        shade.position.set(wx, L.y + 0.2, wz); scene.add(shade);
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, WALL_H - L.y, 3), metal);
        cord.position.set(wx, L.y + (WALL_H - L.y) / 2, wz); scene.add(cord);
      }
      lights.push(entry);
    }
  }

  function updateLights(dt, time) {
    for (const e of lights) {
      e.t += dt;
      let k = 1;
      if (e.flicker === 'strobe') {
        const s = Math.sin(e.t * 1.3) + Math.sin(e.t * 7.1);
        k = s > 1.4 ? (Math.random() < 0.5 ? 0.05 : 1) : (Math.random() < 0.02 ? 0.1 : 1);
        if (e.tubeMat) e.tubeMat.color.setScalar(k > 0.5 ? 0.85 : 0.15);
      } else {
        const f = e.flicker;
        k = 1 - f * 0.5 + f * 0.5 * (Math.sin(e.t * 9.3) * 0.5 + Math.sin(e.t * 23.7) * 0.3 + Math.random() * 0.4);
        e.sprites.forEach((s, i) => { const q = 0.85 + 0.3 * Math.sin(time * 17 + i * 3.1) * Math.random(); s.scale.y = 0.26 * q; });
      }
      e.light.intensity = e.base * k * Game.lightDim;
    }
  }

  // ---------- queries ----------
  const cellX = wx => Math.floor(wx / CELL);
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
      // centre inside the box: leave by the shortest way
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

  return {
    W, H, cells, at, doorDefs, staticMeshes, buildStatic, updateLights, collide, lineOfSight, walkLine,
    blocksMove, blocksSight, computeFlow, flowAt, floorAt, cellCenter, cellX, box, M,
  };
})();
