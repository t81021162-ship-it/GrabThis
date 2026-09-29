// Map definition, rendering geometry, collision, raycasting and bot navigation.
import * as THREE from 'three';
import { rng } from './textures.js';
import { mergeStatic } from './merge.js';

export const CELL = 2;          // metres per grid cell
export const GW = 48, GH = 56;  // grid size
export const STEP = 0.45;       // max step-up height

const K_FLOOR = 0, K_WALL = 1, K_CRATE = 2, K_BIGCRATE = 3;

// Simple geometry accumulator with world-aligned or per-face UVs.
class GeoBuilder {
  constructor() { this.p = []; this.n = []; this.uv = []; this.uv1 = []; this.i = []; }
  quad(ps, nrm, uvs, uv1s) {
    const b = this.p.length / 3;
    for (let k = 0; k < 4; k++) {
      this.p.push(ps[k][0], ps[k][1], ps[k][2]);
      this.n.push(nrm[0], nrm[1], nrm[2]);
      this.uv.push(uvs[k][0], uvs[k][1]);
      this.uv1.push(uv1s ? uv1s[k][0] : 0, uv1s ? uv1s[k][1] : 0);
    }
    // ensure CCW winding facing the normal
    const a = ps[0], c1 = ps[1], c2 = ps[2];
    const ux = c1[0] - a[0], uy = c1[1] - a[1], uz = c1[2] - a[2];
    const vx = c2[0] - a[0], vy = c2[1] - a[1], vz = c2[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * nrm[0] + cy * nrm[1] + cz * nrm[2] >= 0) this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    else this.i.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  box(a, b, { scale = 2, unit = false, skip = {}, uvOff = [0, 0], mapUV1 = null } = {}) {
    const F = {
      px: [[[b[0], a[1], b[2]], [b[0], a[1], a[2]], [b[0], b[1], a[2]], [b[0], b[1], b[2]]], [1, 0, 0]],
      nx: [[[a[0], a[1], a[2]], [a[0], a[1], b[2]], [a[0], b[1], b[2]], [a[0], b[1], a[2]]], [-1, 0, 0]],
      pz: [[[a[0], a[1], b[2]], [b[0], a[1], b[2]], [b[0], b[1], b[2]], [a[0], b[1], b[2]]], [0, 0, 1]],
      nz: [[[b[0], a[1], a[2]], [a[0], a[1], a[2]], [a[0], b[1], a[2]], [b[0], b[1], a[2]]], [0, 0, -1]],
      py: [[[a[0], b[1], b[2]], [b[0], b[1], b[2]], [b[0], b[1], a[2]], [a[0], b[1], a[2]]], [0, 1, 0]],
      ny: [[[a[0], a[1], a[2]], [b[0], a[1], a[2]], [b[0], a[1], b[2]], [a[0], a[1], b[2]]], [0, -1, 0]],
    };
    for (const k in F) {
      if (skip[k]) continue;
      const [ps, n] = F[k];
      let uvs;
      if (unit) uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
      else uvs = ps.map(p => {
        if (n[0]) return [(p[2] * n[0]) / scale + uvOff[0], p[1] / scale + uvOff[1]];
        if (n[2]) return [(-p[0] * n[2]) / scale + uvOff[0], p[1] / scale + uvOff[1]];
        return [p[0] / scale + uvOff[0], p[2] / scale + uvOff[1]];
      });
      this.quad(ps, n, uvs, mapUV1 ? ps.map(mapUV1) : null);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('uv1', new THREE.Float32BufferAttribute(this.uv1, 2));
    g.setIndex(this.i);
    g.computeBoundingSphere();
    return g;
  }
  get empty() { return this.i.length === 0; }
}

export class World {
  constructor() {
    const N = GW * GH;
    this.kind = new Uint8Array(N).fill(K_WALL);
    this.floorH = new Float32Array(N);
    this.floorMat = new Uint8Array(N); // 0 sand 1 tile 2 dirt
    this.roof = new Array(N).fill(null);
    this.wallH = new Float32Array(N);
    this.wallStyle = new Uint8Array(N);
    this.boxes = new Array(N);
    this.lights = [];
    this.defineLayout();
    this.computeBoxes();
  }

  idx(cx, cz) { return cz * GW + cx; }
  inb(cx, cz) { return cx >= 0 && cz >= 0 && cx < GW && cz < GH; }
  cellX(x) { return Math.floor(x / CELL + GW / 2); }
  cellZ(z) { return Math.floor(z / CELL + GH / 2); }
  cx2x(cx) { return (cx - GW / 2 + 0.5) * CELL; }
  cz2z(cz) { return (cz - GH / 2 + 0.5) * CELL; }

  carve(x0, z0, x1, z1, mat = 0) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const i = this.idx(x, z); this.kind[i] = K_FLOOR; this.floorMat[i] = mat;
    }
  }
  wall(x0, z0, x1, z1) { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.kind[this.idx(x, z)] = K_WALL; }
  raise(x0, z0, x1, z1, h) { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.floorH[this.idx(x, z)] = h; }
  setRoof(x0, z0, x1, z1, y0 = 3.4, y1 = 4.3) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const i = this.idx(x, z); if (this.kind[i] !== K_WALL) this.roof[i] = [y0, y1];
    }
  }
  crate(x, z, big = false) { this.kind[this.idx(x, z)] = big ? K_BIGCRATE : K_CRATE; }

  defineLayout() {
    const SAND = 0, TILE = 1, DIRT = 2;
    // --- Bombsite B (north-west)
    this.carve(2, 2, 15, 14, TILE);
    this.raise(2, 2, 5, 5, 0.4);
    // B doors -> CT spawn
    this.carve(16, 6, 18, 8, SAND);
    // --- CT spawn
    this.carve(19, 3, 29, 11, SAND);
    // CT ramp to A
    this.carve(30, 5, 33, 9, SAND); this.raise(30, 5, 31, 9, 0.4); this.raise(32, 5, 33, 9, 0.4);
    // --- Bombsite A (north-east), raised platform
    this.carve(34, 2, 45, 14, TILE); this.raise(34, 2, 45, 14, 0.8);
    // --- Long A
    this.carve(40, 15, 45, 41, SAND); this.raise(40, 15, 45, 16, 0.4);
    this.wall(40, 39, 41, 41); this.wall(44, 39, 45, 41); // long doors
    this.carve(34, 42, 45, 47, SAND); // outside long
    // --- T spawn
    this.carve(16, 46, 33, 53, SAND);
    // top mid
    this.carve(21, 38, 25, 45, SAND);
    // --- Mid
    this.carve(21, 12, 25, 37, SAND);
    this.wall(21, 13, 21, 13); this.wall(25, 13, 25, 13); // mid doors
    // --- Catwalk / short A
    this.carve(26, 20, 33, 23, SAND);
    this.raise(26, 20, 27, 23, 0.4); this.raise(28, 20, 29, 23, 0.8); this.raise(30, 20, 33, 23, 1.2);
    this.carve(30, 12, 33, 19, SAND); this.raise(30, 12, 33, 19, 1.2);
    // --- B tunnels
    this.carve(5, 15, 9, 23, SAND);            // tunnel exit to B
    this.carve(6, 24, 20, 26, DIRT); this.setRoof(6, 24, 20, 26);  // lower tunnels -> mid
    this.carve(6, 27, 8, 45, DIRT); this.setRoof(6, 27, 8, 45);    // upper tunnels
    this.carve(9, 43, 17, 47, SAND); this.setRoof(9, 43, 12, 47);  // tunnel entrance from T

    // Doorway lintels
    this.lintels = [[42, 40], [43, 40], [22, 13], [23, 13], [24, 13], [17, 6], [17, 7], [17, 8], [20, 25]];
    for (const [x, z] of this.lintels) {
      const i = this.idx(x, z); if (this.kind[i] !== K_WALL) this.roof[i] = [3.3, 5.2];
    }

    // --- Crates
    this.crate(4, 8, true); this.crate(5, 8, true); this.crate(4, 9);
    this.crate(11, 9, true); this.crate(12, 9); this.crate(8, 12);
    this.crate(13, 3); this.crate(9, 5, true);
    this.crate(38, 6, true); this.crate(39, 6, true); this.crate(39, 7);
    this.crate(42, 11); this.crate(35, 3, true); this.crate(44, 4);
    this.crate(44, 22, true); this.crate(44, 23); this.crate(41, 30); this.crate(41, 36, true);
    this.crate(36, 44); this.crate(23, 29);
    this.crate(20, 4, true); this.crate(28, 10);
    this.crate(18, 48); this.crate(31, 52, true); this.crate(30, 52);
    this.crate(7, 31); this.crate(6, 38); this.crate(8, 20);
    this.crate(22, 41); this.crate(33, 22, false);

    // Wall heights & styles, varying by 3x3 blocks for a skyline
    const r = rng(1234);
    const blockH = {}, blockS = {};
    for (let cz = 0; cz < GH; cz++) for (let cx = 0; cx < GW; cx++) {
      const key = ((cx / 3) | 0) + ',' + ((cz / 3) | 0);
      if (blockH[key] === undefined) {
        blockH[key] = [5.5, 6.5, 7.5, 8.5, 9.5][Math.floor(r() * 5)];
        blockS[key] = Math.floor(r() * 4);
      }
      const i = this.idx(cx, cz);
      const border = cx === 0 || cz === 0 || cx === GW - 1 || cz === GH - 1;
      this.wallH[i] = border ? 11 : blockH[key];
      this.wallStyle[i] = blockS[key];
    }

    this.spawns = {
      T: [[20, 49], [22, 50], [24, 49], [26, 50], [28, 49]],
      CT: [[21, 5], [23, 6], [25, 5], [27, 6], [23, 8]],
    };
    this.sites = { A: [34, 2, 45, 14], B: [2, 2, 15, 14] };
    this.buyZones = { T: [16, 45, 33, 53], CT: [19, 3, 29, 11] };
    this.zones = [
      ['A Site', 34, 2, 45, 14], ['B Site', 2, 2, 15, 14], ['CT Spawn', 19, 3, 29, 11], ['B Doors', 16, 6, 18, 8],
      ['CT Ramp', 30, 5, 33, 9], ['Long A', 40, 15, 45, 38], ['Long Doors', 40, 39, 45, 41], ['Outside Long', 34, 42, 45, 47],
      ['T Spawn', 16, 46, 33, 53], ['Top Mid', 21, 38, 25, 45], ['Middle', 21, 12, 25, 37], ['Catwalk', 26, 12, 33, 23],
      ['B Tunnels', 5, 15, 9, 23], ['Lower Tunnels', 6, 24, 20, 26], ['Upper Tunnels', 6, 27, 17, 47],
    ];
    // named strategic points used by bots [cx, cz]
    this.points = {
      A_site: [[38, 9], [41, 5], [36, 12], [43, 8], [40, 11]],
      B_site: [[6, 6], [10, 7], [12, 5], [7, 11], [3, 12]],
      A_hold: [{ at: [43, 6], look: [43, 30] }, { at: [36, 5], look: [32, 16] }, { at: [40, 3], look: [42, 20] }],
      B_hold: [{ at: [12, 4], look: [7, 22] }, { at: [3, 11], look: [7, 20] }, { at: [14, 10], look: [7, 18] }],
      Mid_hold: [{ at: [23, 10], look: [23, 35] }, { at: [27, 8], look: [23, 30] }],
      routes: {
        A: [[[37, 45], [42, 40], [42, 22]], [[23, 40], [23, 30], [27, 21], [31, 15]]],
        B: [[[14, 45], [7, 40], [7, 28], [7, 18]], [[23, 40], [23, 30], [15, 25], [7, 22]]],
      },
    };
  }

  zoneName(x, z) {
    const cx = this.cellX(x), cz = this.cellZ(z);
    for (const [n, x0, z0, x1, z1] of this.zones) if (cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1) return n;
    return '';
  }
  inRect(x, z, rect) {
    const cx = this.cellX(x), cz = this.cellZ(z);
    return cx >= rect[0] && cx <= rect[2] && cz >= rect[1] && cz <= rect[3];
  }
  siteAt(x, z) {
    for (const s of ['A', 'B']) if (this.inRect(x, z, this.sites[s])) return s;
    return null;
  }

  computeBoxes() {
    for (let cz = 0; cz < GH; cz++) for (let cx = 0; cx < GW; cx++) {
      const i = this.idx(cx, cz), x0 = (cx - GW / 2) * CELL, z0 = (cz - GH / 2) * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
      const list = [];
      const k = this.kind[i], fh = this.floorH[i];
      if (k === K_WALL) list.push({ a: [x0, 0, z0], b: [x1, this.wallH[i], z1] });
      else {
        if (fh > 0) list.push({ a: [x0, 0, z0], b: [x1, fh, z1] });
        if (k === K_CRATE) list.push({ a: [x0 + 0.35, fh, z0 + 0.35], b: [x1 - 0.35, fh + 1.3, z1 - 0.35] });
        if (k === K_BIGCRATE) {
          list.push({ a: [x0 + 0.1, fh, z0 + 0.1], b: [x1 - 0.1, fh + 1.8, z1 - 0.1] });
          list.push({ a: [x0 + 0.4, fh + 1.8, z0 + 0.4], b: [x1 - 0.4, fh + 3.0, z1 - 0.4] });
        }
        if (this.roof[i]) list.push({ a: [x0, this.roof[i][0], z0], b: [x1, this.roof[i][1], z1] });
      }
      this.boxes[i] = list;
    }
  }

  walkable(cx, cz) { return this.inb(cx, cz) && this.kind[this.idx(cx, cz)] === K_FLOOR; }
  heightAt(x, z) {
    const cx = this.cellX(x), cz = this.cellZ(z);
    return this.inb(cx, cz) ? this.floorH[this.idx(cx, cz)] : 0;
  }

  // ---------------- Collision ----------------
  // Calls fn(box) for every box overlapping the AABB; returns true if fn returns true.
  forBoxes(minx, miny, minz, maxx, maxy, maxz, fn) {
    const cx0 = this.cellX(minx), cx1 = this.cellX(maxx), cz0 = this.cellZ(minz), cz1 = this.cellZ(maxz);
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      if (!this.inb(cx, cz)) { if (fn({ a: [-1e4, -1e4, -1e4], b: [1e4, 1e4, 1e4], oob: true })) return true; continue; }
      for (const bx of this.boxes[this.idx(cx, cz)]) {
        if (bx.a[0] < maxx && bx.b[0] > minx && bx.a[1] < maxy && bx.b[1] > miny && bx.a[2] < maxz && bx.b[2] > minz) {
          if (fn(bx)) return true;
        }
      }
    }
    return false;
  }
  collides(x, y, z, hw, h) {
    return this.forBoxes(x - hw, y, z - hw, x + hw, y + h, z + hw, () => true);
  }

  // Move a body {pos, vel, hw, h, onGround} with sliding & step-up.
  moveBody(body, dt) {
    const p = body.pos, v = body.vel, hw = body.hw, h = body.h;
    const EPS = 0.001;
    const wasGround = body.onGround;
    // horizontal axes
    for (const ax of [0, 2]) {
      const d = (ax === 0 ? v.x : v.z) * dt;
      if (!d) continue;
      if (ax === 0) p.x += d; else p.z += d;
      let top = -Infinity, hit = false, faceLimit = null;
      this.forBoxes(p.x - hw, p.y + EPS, p.z - hw, p.x + hw, p.y + h, p.z + hw, bx => {
        hit = true;
        top = Math.max(top, bx.b[1]);
        const lim = d > 0 ? bx.a[ax] - hw - EPS : bx.b[ax] + hw + EPS;
        faceLimit = faceLimit === null ? lim : (d > 0 ? Math.min(faceLimit, lim) : Math.max(faceLimit, lim));
      });
      if (!hit) continue;
      if ((wasGround || body.stepAir) && top - p.y <= STEP && top - p.y > 0 && !this.collides(p.x, top + EPS, p.z, hw, h)) {
        p.y = top + EPS; // step up
        continue;
      }
      if (ax === 0) { p.x = faceLimit; v.x = 0; } else { p.z = faceLimit; v.z = 0; }
    }
    // vertical
    p.y += v.y * dt;
    body.onGround = false;
    if (v.y <= 0) {
      let top = -Infinity;
      this.forBoxes(p.x - hw, p.y, p.z - hw, p.x + hw, p.y + h, p.z + hw, bx => { top = Math.max(top, bx.b[1]); });
      if (top > -Infinity && top - p.y < h * 0.9) { p.y = top + EPS; v.y = 0; body.onGround = true; }
      if (p.y <= 0) { p.y = 0; v.y = 0; body.onGround = true; }
      if (!body.onGround && wasGround && !body.jumped) {
        // stick to stairs when walking down
        let t2 = -Infinity;
        this.forBoxes(p.x - hw, p.y - STEP, p.z - hw, p.x + hw, p.y, p.z + hw, bx => { t2 = Math.max(t2, bx.b[1]); });
        if (p.y - STEP <= 0) t2 = Math.max(t2, 0);
        if (t2 > -Infinity) { p.y = t2 + EPS; v.y = 0; body.onGround = true; }
      }
    } else {
      let bottom = Infinity;
      this.forBoxes(p.x - hw, p.y, p.z - hw, p.x + hw, p.y + h, p.z + hw, bx => { bottom = Math.min(bottom, bx.a[1]); });
      if (bottom < Infinity) { p.y = bottom - h - EPS; v.y = 0; }
    }
    body.jumped = false;
  }

  // ---------------- Raycast (grid DDA + slab tests) ----------------
  raycast(o, d, maxDist, out = {}) {
    let best = maxDist, bn = null;
    if (d.y < 0) { const t = -o.y / d.y; if (t < best) { best = t; bn = [0, 1, 0]; } }
    const gx = o.x / CELL + GW / 2, gz = o.z / CELL + GH / 2;
    let cx = Math.floor(gx), cz = Math.floor(gz);
    const sx = d.x > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
    const dX = Math.abs(d.x) > 1e-9 ? Math.abs(CELL / d.x) : Infinity;
    const dZ = Math.abs(d.z) > 1e-9 ? Math.abs(CELL / d.z) : Infinity;
    let tX = Math.abs(d.x) > 1e-9 ? (((d.x > 0 ? cx + 1 : cx) - gx) * CELL) / d.x : Infinity;
    let tZ = Math.abs(d.z) > 1e-9 ? (((d.z > 0 ? cz + 1 : cz) - gz) * CELL) / d.z : Infinity;
    let guard = 0;
    while (guard++ < 400) {
      if (this.inb(cx, cz)) {
        for (const bx of this.boxes[this.idx(cx, cz)]) {
          // slab test
          let tmin = -Infinity, tmax = Infinity, nAxis = -1, nSign = 0;
          let ok = true;
          for (let ax = 0; ax < 3; ax++) {
            const oa = ax === 0 ? o.x : ax === 1 ? o.y : o.z, da = ax === 0 ? d.x : ax === 1 ? d.y : d.z;
            if (Math.abs(da) < 1e-12) { if (oa < bx.a[ax] || oa > bx.b[ax]) { ok = false; break; } continue; }
            let t1 = (bx.a[ax] - oa) / da, t2 = (bx.b[ax] - oa) / da, s = -1;
            if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
            if (t1 > tmin) { tmin = t1; nAxis = ax; nSign = s; }
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) { ok = false; break; }
          }
          if (ok && tmin >= 0 && tmin < best) {
            best = tmin; bn = [0, 0, 0]; bn[nAxis] = nSign;
          }
        }
      } else if (cx < -3 || cz < -3 || cx > GW + 3 || cz > GH + 3) break;
      const tExit = Math.min(tX, tZ);
      if (best <= tExit || tExit > maxDist) break;
      if (tX < tZ) { tX += dX; cx += sx; } else { tZ += dZ; cz += sz; }
    }
    if (!bn) return null;
    out.t = best; out.n = bn;
    out.x = o.x + d.x * best; out.y = o.y + d.y * best; out.z = o.z + d.z * best;
    return out;
  }

  los(a, b) {
    const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const L = Math.hypot(d.x, d.y, d.z);
    if (L < 1e-4) return true;
    d.x /= L; d.y /= L; d.z /= L;
    return !this.raycast(a, d, L - 0.05);
  }

  // ---------------- Navigation (A* over cells) ----------------
  findPath(sx, sz, tx, tz) {
    let s = [this.cellX(sx), this.cellZ(sz)], t = [this.cellX(tx), this.cellZ(tz)];
    s = this.nearestWalkable(s); t = this.nearestWalkable(t);
    if (!s || !t) return null;
    const N = GW * GH, start = this.idx(s[0], s[1]), goal = this.idx(t[0], t[1]);
    const g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = [];
    const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const hfn = i => { const dx = Math.abs(i % GW - t[0]), dz = Math.abs(((i / GW) | 0) - t[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    g[start] = 0; push(start, hfn(start));
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (heap.length) {
      const [, cur] = pop();
      if (cur === goal) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % GW, cz = (cur / GW) | 0, ch = this.floorH[cur];
      for (const [dx, dz, c] of dirs) {
        const nx = cx + dx, nz = cz + dz;
        if (!this.walkable(nx, nz)) continue;
        if (dx && dz && (!this.walkable(cx + dx, cz) || !this.walkable(cx, cz + dz))) continue;
        const ni = this.idx(nx, nz);
        if (Math.abs(this.floorH[ni] - ch) > STEP) continue;
        const ng = g[cur] + c + (this.roof[ni] ? 0.2 : 0);
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; push(ni, ng + hfn(ni)); }
      }
    }
    if (came[goal] === -1 && goal !== start) return null;
    const path = [];
    for (let i = goal; i !== -1; i = came[i]) { path.push([this.cx2x(i % GW), this.cz2z((i / GW) | 0)]); if (i === start) break; }
    path.reverse();
    return path;
  }
  nearestWalkable([cx, cz]) {
    if (this.walkable(cx, cz)) return [cx, cz];
    for (let r = 1; r < 6; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++)
      if (this.walkable(cx + dx, cz + dz)) return [cx + dx, cz + dz];
    return null;
  }

  // ---------------- Rendering ----------------
  build(scene, T, quality) {
    const group = new THREE.Group();
    this.group = group;
    const mapUV1 = p => [(p[0] / CELL + GW / 2) / GW, 1 - (p[2] / CELL + GH / 2) / GH];

    // AO texture for floors (blurred wall/crate mask)
    const aoC = document.createElement('canvas');
    const S = 8; aoC.width = GW * S; aoC.height = GH * S;
    const ac = aoC.getContext('2d');
    ac.fillStyle = '#fff'; ac.fillRect(0, 0, aoC.width, aoC.height);
    ac.filter = 'blur(7px)';
    ac.fillStyle = 'rgba(0,0,0,0.75)';
    for (let cz = 0; cz < GH; cz++) for (let cx = 0; cx < GW; cx++) {
      const k = this.kind[this.idx(cx, cz)];
      if (k === K_WALL) ac.fillRect(cx * S, cz * S, S, S);
      else if (k !== K_FLOOR) ac.fillRect(cx * S + 2, cz * S + 2, S - 4, S - 4);
    }
    ac.filter = 'blur(10px)';
    ac.fillStyle = 'rgba(0,0,0,0.5)';
    for (let cz = 0; cz < GH; cz++) for (let cx = 0; cx < GW; cx++) if (this.roof[this.idx(cx, cz)]) ac.fillRect(cx * S, cz * S, S, S);
    ac.filter = 'none';
    // redraw walls crisp so AO sits outside them
    ac.fillStyle = '#fff';
    const aoTex = new THREE.CanvasTexture(aoC);
    aoTex.channel = 1; aoTex.flipY = true;

    const mk = (map, opts = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, aoMap: opts.ao ? aoTex : null, aoMapIntensity: 1, ...opts.extra });
    const wallTex = [T.sandstone, T.plaster, T.sandstone2, T.plaster2];
    const wallMats = wallTex.map(t => mk(t));
    const floorMats = [mk(T.sand, { ao: true }), mk(T.tiles, { ao: true }), mk(T.dirt, { ao: true })];
    const stoneMat = mk(T.concrete);
    const crateMat = [mk(T.crate), mk(T.crate2)];
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x8c7a5e, roughness: 0.95 });

    const wallB = [0, 1, 2, 3].map(() => new GeoBuilder());
    const floorB = [0, 1, 2].map(() => new GeoBuilder());
    const stoneB = new GeoBuilder(), trimB = new GeoBuilder(), crateB = [new GeoBuilder(), new GeoBuilder()];
    const grimeB = new GeoBuilder();

    // Greedy merge wall cells (runs along x, then extend along z)
    const used = new Uint8Array(GW * GH);
    for (let cz = 0; cz < GH; cz++) for (let cx = 0; cx < GW; cx++) {
      const i = this.idx(cx, cz);
      if (used[i] || this.kind[i] !== K_WALL) continue;
      const h = this.wallH[i], s = this.wallStyle[i];
      const same = j => !used[j] && this.kind[j] === K_WALL && this.wallH[j] === h && this.wallStyle[j] === s;
      let x1 = cx; while (x1 + 1 < GW && same(this.idx(x1 + 1, cz))) x1++;
      let z1 = cz;
      outer: while (z1 + 1 < GH) { for (let x = cx; x <= x1; x++) if (!same(this.idx(x, z1 + 1))) break outer; z1++; }
      for (let z = cz; z <= z1; z++) for (let x = cx; x <= x1; x++) used[this.idx(x, z)] = 1;
      const a = [(cx - GW / 2) * CELL, 0, (cz - GH / 2) * CELL], b = [(x1 + 1 - GW / 2) * CELL, h, (z1 + 1 - GH / 2) * CELL];
      wallB[s].box(a, b, { scale: 4, skip: { ny: true } });
      trimB.box([a[0] - 0.08, h - 0.25, a[2] - 0.08], [b[0] + 0.08, h + 0.12, b[2] + 0.08], { scale: 2, skip: { ny: true } });
    }

    const rr = rng(77);
    const decor = [];
    // floors, raised steps, crates, roofs, wall grime, doors and windows
    for (let cz = 0; cz < GH; cz++) for (let cx = 0; cx < GW; cx++) {
      const i = this.idx(cx, cz);
      if (this.kind[i] === K_WALL) continue;
      const x0 = (cx - GW / 2) * CELL, z0 = (cz - GH / 2) * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
      const fh = this.floorH[i], fm = this.floorMat[i];
      if (fh > 0 || fm !== 0) {
        const y = fh > 0 ? fh : 0.012;
        floorB[fm].box([x0, y - 0.01, z0], [x1, y, z1], { scale: fm === 1 ? 4 : 6, skip: { px: 1, nx: 1, pz: 1, nz: 1, ny: 1 }, mapUV1 });
      }
      // side faces of raised floors
      for (const [dx, dz, face] of [[1, 0, 'px'], [-1, 0, 'nx'], [0, 1, 'pz'], [0, -1, 'nz']]) {
        const nx = cx + dx, nz = cz + dz;
        if (!this.inb(nx, nz)) continue;
        const j = this.idx(nx, nz);
        if (this.kind[j] === K_WALL) {
          // grime strip at base of wall
          const gy = fh;
          const px = dx > 0 ? x1 - 0.01 : dx < 0 ? x0 + 0.01 : null, pz = dz > 0 ? z1 - 0.01 : dz < 0 ? z0 + 0.01 : null;
          const gh = 1.6;
          let ps;
          if (px !== null) ps = [[px, gy, z0], [px, gy, z1], [px, gy + gh, z1], [px, gy + gh, z0]];
          else ps = [[x0, gy, pz], [x1, gy, pz], [x1, gy + gh, pz], [x0, gy + gh, pz]];
          grimeB.quad(ps, [-dx, 0, -dz], [[0, 0], [1, 0], [1, 1], [0, 1]]);
          // doors & windows on wall faces
          const wh = this.wallH[j];
          const roll = rr();
          if (!this.roof[i]) {
            if (roll < 0.07 && fh === 0) decor.push({ type: 'door', cx, cz, dx, dz, y: fh });
            else if (roll < 0.2 && wh > 6) decor.push({ type: 'window', cx, cz, dx, dz, y: 3.4 + rr() * 1.2 });
            else if (roll < 0.26 && wh > 5) decor.push({ type: 'beam', cx, cz, dx, dz, y: 2.9 + rr() * 0.4 });
          }
          continue;
        }
        const nh = this.floorH[j];
        if (nh < fh) {
          const sk = { px: 1, nx: 1, pz: 1, nz: 1, py: 1, ny: 1 }; delete sk[face];
          stoneB.box([x0, nh, z0], [x1, fh, z1], { scale: 2, skip: sk });
        }
      }
      const k = this.kind[i];
      if (k === K_CRATE) crateB[(cx + cz) & 1].box([x0 + 0.35, fh, z0 + 0.35], [x1 - 0.35, fh + 1.3, z1 - 0.35], { unit: true });
      if (k === K_BIGCRATE) {
        crateB[(cx + cz) & 1].box([x0 + 0.1, fh, z0 + 0.1], [x1 - 0.1, fh + 1.8, z1 - 0.1], { unit: true });
        crateB[(cx + cz + 1) & 1].box([x0 + 0.4, fh + 1.8, z0 + 0.4], [x1 - 0.4, fh + 3.0, z1 - 0.4], { unit: true });
      }
      if (this.roof[i]) {
        const [y0, y1] = this.roof[i];
        stoneB.box([x0, y0, z0], [x1, y1, z1], { scale: 3 });
      }
    }

    const addMesh = (b, mat, cast = true, recv = true) => {
      if (b.empty) return null;
      const m = new THREE.Mesh(b.geometry(), mat);
      m.castShadow = cast; m.receiveShadow = recv;
      group.add(m);
      return m;
    };
    wallB.forEach((b, k) => addMesh(b, wallMats[k]));
    floorB.forEach((b, k) => addMesh(b, floorMats[k], false, true));
    addMesh(stoneB, stoneMat);
    addMesh(trimB, trimMat);
    crateB.forEach((b, k) => addMesh(b, crateMat[k]));
    const grimeMat = new THREE.MeshBasicMaterial({ color: 0x241a10, alphaMap: T.grime, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    addMesh(grimeB, grimeMat, false, false);

    // Ground plane
    const gb = new GeoBuilder();
    const ext = 40;
    const gx0 = -GW / 2 * CELL - ext, gx1 = GW / 2 * CELL + ext, gz0 = -GH / 2 * CELL - ext, gz1 = GH / 2 * CELL + ext;
    gb.box([gx0, -0.1, gz0], [gx1, 0, gz1], { scale: 6, skip: { px: 1, nx: 1, pz: 1, nz: 1, ny: 1 }, mapUV1 });
    addMesh(gb, floorMats[0], false, true);

    // Decorative doors/windows/beams
    const doorMats = [new THREE.MeshStandardMaterial({ map: T.doorWood, roughness: 0.85 }), new THREE.MeshStandardMaterial({ map: T.doorMetal, roughness: 0.6, metalness: 0.3 })];
    const shutMats = T.shutter.map(t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.9 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 0.95 });
    for (const d of decor) {
      const cxw = this.cx2x(d.cx), czw = this.cz2z(d.cz);
      // position on the wall face
      const fx = cxw + d.dx * (CELL / 2), fz = czw + d.dz * (CELL / 2);
      const g = new THREE.Group();
      g.position.set(fx, d.y, fz);
      g.rotation.y = Math.atan2(-d.dx, -d.dz);  // local +z faces into the walkable cell
      if (d.type === 'door') {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.08), doorMats[rr() < 0.5 ? 0 : 1]);
        m.position.set(0, 1.2, 0.02); g.add(m);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.2), frameMat); fr.position.set(0, 2.5, 0.05); g.add(fr);
      } else if (d.type === 'window') {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.06), shutMats[Math.floor(rr() * 3)]);
        m.position.set(0, 0, 0.02); g.add(m);
        const sill = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 0.22), frameMat); sill.position.set(0, -0.7, 0.08); g.add(sill);
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 0.18), frameMat); top.position.set(0, 0.72, 0.06); g.add(top);
      } else {
        const m = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.18, 0.16), beamMat);
        m.position.set(0, 0, 0.08); g.add(m);
      }
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      group.add(g);
    }

    // Lintel beams over doorways
    for (const [x, z] of this.lintels) {
      const i = this.idx(x, z); if (!this.roof[i]) continue;
      const [y0, y1] = this.roof[i];
      const m = new THREE.Mesh(new THREE.BoxGeometry(CELL, y1 - y0, CELL), wallMats[0]);
      m.position.set(this.cx2x(x), (y0 + y1) / 2, this.cz2z(z));
      m.castShadow = m.receiveShadow = true;
      group.add(m);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(CELL + 0.1, 0.25, CELL + 0.1), beamMat);
      beam.position.set(this.cx2x(x), y0 + 0.12, this.cz2z(z)); group.add(beam);
    }

    // Long-doors wooden door leaves (open)
    for (const [x, z, rot] of [[41.6, 40, 0.9], [44.4, 40, -0.9]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.0, 0.1), doorMats[0]);
      const gp = new THREE.Group();
      gp.position.set((x - GW / 2) * CELL + (x < 43 ? 0 : 0), 0, (z - GH / 2) * CELL + 0.2);
      m.position.set(x < 43 ? 0.9 : -0.9, 1.5, 0); gp.rotation.y = rot;
      gp.add(m); m.castShadow = true; group.add(gp);
    }

    // Bombsite letters
    const letter = (tx, cx, cz, dx, dz, y) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
      m.position.set(this.cx2x(cx) + dx * (CELL / 2 - 0.02), y, this.cz2z(cz) + dz * (CELL / 2 - 0.02));
      m.rotation.y = Math.atan2(-dx, -dz);
      group.add(m);
    };
    letter(T.letterA, 45, 8, 1, 0, 3.2);
    letter(T.letterA, 38, 2, 0, -1, 3.2);
    letter(T.letterB, 2, 7, -1, 0, 2.8);
    letter(T.letterB, 9, 2, 0, -1, 2.8);

    // Tunnel lamps
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc070, emissiveIntensity: 3 });
    const lampSpots = [[7, 30], [7, 39], [13, 25], [7, 25], [10, 45]];
    for (const [x, z] of lampSpots) {
      const y = this.roof[this.idx(x, z)] ? this.roof[this.idx(x, z)][0] : 3.4;
      const lm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.18, 10), lampMat);
      lm.position.set(this.cx2x(x), y - 0.1, this.cz2z(z)); group.add(lm);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2), beamMat);
      cord.position.set(lm.position.x, y - 0.0, lm.position.z); group.add(cord);
      if (quality > 0) {
        const pl = new THREE.PointLight(0xffc27a, 14, 14, 1.6);
        pl.position.set(lm.position.x, y - 0.35, lm.position.z);
        group.add(pl);
      }
    }

    // Palm-ish trees & props in T spawn / CT spawn for atmosphere
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e5236, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f6a2a, roughness: 0.9, side: THREE.DoubleSide });
    for (const [x, z] of [[17, 53], [32, 46], [19, 11], [45, 45], [2, 14]]) {
      const g = new THREE.Group();
      g.position.set(this.cx2x(x), 0, this.cz2z(z));
      let py = 0, lean = (rr() - 0.5) * 0.2;
      for (let k = 0; k < 8; k++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - k * 0.008, 0.19 - k * 0.008, 0.9, 8), trunkMat);
        seg.position.set(lean * k * 0.9, py + 0.45, 0); seg.rotation.z = -lean; g.add(seg); py += 0.88;
      }
      for (let k = 0; k < 9; k++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.2, 1, 4), leafMat);
        const pos = leaf.geometry.attributes.position;
        for (let v = 0; v < pos.count; v++) { const yy = pos.getY(v); pos.setZ(v, -Math.pow((yy + 1.6) / 3.2, 2) * 1.2); }
        leaf.geometry.computeVertexNormals();
        const holder = new THREE.Group();
        holder.position.set(lean * 8 * 0.9, py, 0);
        holder.rotation.y = k / 9 * Math.PI * 2;
        leaf.rotation.x = -1.05; leaf.position.set(0, 0.3, -1.3);
        holder.add(leaf); g.add(holder);
      }
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      group.add(g);
    }

    // bake all decoration props into a handful of meshes (the level meshes carry uv1 and are skipped)
    mergeStatic(group, o => !o.geometry.attributes.uv1 && !o.material.transparent);
    scene.add(group);
    return group;
  }

  // Top-down radar image
  radarImage(px = 6) {
    const c = document.createElement('canvas');
    c.width = GW * px; c.height = GH * px;
    const ctx = c.getContext('2d');
    for (let cz = 0; cz < GH; cz++) for (let cx = 0; cx < GW; cx++) {
      const i = this.idx(cx, cz), k = this.kind[i];
      if (k === K_WALL) continue;
      const h = this.floorH[i];
      const l = 120 + h * 45 - (this.roof[i] && this.roof[i][1] < 5 ? 25 : 0);
      ctx.fillStyle = `rgb(${l},${l - 4},${l - 14})`;
      ctx.fillRect(cx * px, cz * px, px + 0.5, px + 0.5);
      if (k !== K_FLOOR) { ctx.fillStyle = 'rgba(60,55,45,0.9)'; ctx.fillRect(cx * px + 1.5, cz * px + 1.5, px - 3, px - 3); }
    }
    // outline
    ctx.strokeStyle = 'rgba(240,235,220,0.55)'; ctx.lineWidth = 1;
    for (let cz = 0; cz < GH; cz++) for (let cx = 0; cx < GW; cx++) {
      if (this.kind[this.idx(cx, cz)] === K_WALL) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, nz = cz + dz;
        if (this.inb(nx, nz) && this.kind[this.idx(nx, nz)] !== K_WALL) continue;
        ctx.beginPath();
        if (dx === 1) { ctx.moveTo((cx + 1) * px, cz * px); ctx.lineTo((cx + 1) * px, (cz + 1) * px); }
        if (dx === -1) { ctx.moveTo(cx * px, cz * px); ctx.lineTo(cx * px, (cz + 1) * px); }
        if (dz === 1) { ctx.moveTo(cx * px, (cz + 1) * px); ctx.lineTo((cx + 1) * px, (cz + 1) * px); }
        if (dz === -1) { ctx.moveTo(cx * px, cz * px); ctx.lineTo((cx + 1) * px, cz * px); }
        ctx.stroke();
      }
    }
    ctx.font = `bold ${px * 4}px "Barlow Condensed", sans-serif`;
    ctx.fillStyle = 'rgba(230,80,60,0.9)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('A', 40 * px, 8 * px);
    ctx.fillText('B', 8.5 * px, 8 * px);
    return c;
  }
}
