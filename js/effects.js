// Particles (instanced billboards), bullet-hole decals, tracers, muzzle flashes and lights.
import * as THREE from 'three';

class Billboards {
  constructor(scene, tex, cap, additive = false, lit = false) {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.getAttribute('position'));
    g.setAttribute('uv', base.getAttribute('uv'));
    this.off = new Float32Array(cap * 3); this.col = new Float32Array(cap * 4); this.sr = new Float32Array(cap * 2);
    g.setAttribute('iOff', new THREE.InstancedBufferAttribute(this.off, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iCol', new THREE.InstancedBufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iSR', new THREE.InstancedBufferAttribute(this.sr, 2).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = cap;
    this.geo = g;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, fogColor: { value: new THREE.Color(0xcdd6dc) }, fogNear: { value: 90 }, fogFar: { value: 320 } },
      vertexShader: `
        attribute vec3 iOff; attribute vec4 iCol; attribute vec2 iSR;
        varying vec2 vUv; varying vec4 vCol; varying float vDepth;
        void main(){
          vUv = uv; vCol = iCol;
          float c = cos(iSR.y), s = sin(iSR.y);
          vec2 p = vec2(position.x*c - position.y*s, position.x*s + position.y*c) * iSR.x;
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 wp = iOff + right*p.x + up*p.y;
          vec4 mv = viewMatrix * vec4(wp,1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform vec3 fogColor; uniform float fogNear, fogFar;
        varying vec2 vUv; varying vec4 vCol; varying float vDepth;
        void main(){
          vec4 t = texture2D(map, vUv);
          vec4 c = vec4(vCol.rgb * t.rgb, t.a * vCol.a);
          float f = smoothstep(fogNear, fogFar, vDepth);
          c.rgb = mix(c.rgb, fogColor, f * 0.8);
          if (c.a < 0.003) discard;
          gl_FragColor = c;
        }`,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 3 : 2;
    scene.add(this.mesh);
    this.cap = cap;
    this.p = [];
    for (let i = 0; i < cap; i++) this.p.push({ life: 0 });
    this.next = 0;
  }
  spawn(o) {
    const p = this.p[this.next]; this.next = (this.next + 1) % this.cap;
    Object.assign(p, { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, size: 0.1, grow: 0, rot: Math.random() * 6.28, vr: 0, r: 1, gg: 1, b: 1, a: 1, fadeIn: 0, t: 0, life: 1 }, o);
    p.max = p.life;
    return p;
  }
  update(dt) {
    for (let i = 0; i < this.cap; i++) {
      const p = this.p[i];
      if (p.life <= 0) { this.sr[i * 2] = 0; continue; }
      p.life -= dt; p.t += dt;
      p.vy -= p.g * dt;
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy *= dr; p.vz *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.floor !== undefined && p.y < p.floor) { p.y = p.floor; p.vy = 0; p.vx *= 0.5; p.vz *= 0.5; }
      p.size += p.grow * dt; p.rot += p.vr * dt;
      const k = Math.max(0, p.life / p.max);
      let a = p.a * Math.min(1, k * 2.5);
      if (p.fadeIn) a *= Math.min(1, p.t / p.fadeIn);
      this.off[i * 3] = p.x; this.off[i * 3 + 1] = p.y; this.off[i * 3 + 2] = p.z;
      this.col[i * 4] = p.r; this.col[i * 4 + 1] = p.gg; this.col[i * 4 + 2] = p.b; this.col[i * 4 + 3] = p.life > 0 ? a : 0;
      this.sr[i * 2] = p.life > 0 ? p.size : 0; this.sr[i * 2 + 1] = p.rot;
    }
    this.geo.attributes.iOff.needsUpdate = true;
    this.geo.attributes.iCol.needsUpdate = true;
    this.geo.attributes.iSR.needsUpdate = true;
  }
  clear() { for (const p of this.p) p.life = 0; }
}

export class Effects {
  constructor(scene, T, sound) {
    this.scene = scene; this.T = T; this.sound = sound;
    this.dust = new Billboards(scene, T.smoke, 400);
    this.smoke = new Billboards(scene, T.smoke, 500);
    this.sparks = new Billboards(scene, T.spark, 300, true);
    this.blood = new Billboards(scene, T.soft, 300);
    this.fire = new Billboards(scene, T.spark, 200, true);
    this.flashes = new Billboards(scene, T.muzzle, 40, true);

    // decals (bullet holes) via InstancedMesh
    const holeMat = new THREE.MeshBasicMaterial({ map: T.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.holes = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), holeMat, 200);
    this.holes.count = 0; this.holes.frustumCulled = false; this.holeIdx = 0;
    scene.add(this.holes);
    const bloodMat = new THREE.MeshBasicMaterial({ map: T.blood, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, color: 0xaa2222 });
    this.splats = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), bloodMat, 80);
    this.splats.count = 0; this.splats.frustumCulled = false; this.splatIdx = 0;
    scene.add(this.splats);

    // tracers
    this.tracers = [];
    const trMat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    const trGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 5); trGeo.rotateX(Math.PI / 2); trGeo.translate(0, 0, -0.5);
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(trGeo, trMat); m.visible = false; scene.add(m);
      this.tracers.push({ m, life: 0 });
    }
    this.trIdx = 0;

    // pooled flash lights
    this.lights = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffb060, 0, 10, 2); l.visible = true; scene.add(l);
      this.lights.push({ l, life: 0, max: 1, peak: 0 });
    }
    this.lightIdx = 0;
    this.clouds = []; // smoke clouds for LOS
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3();
  }

  light(pos, color, peak, dist, life) {
    const L = this.lights[this.lightIdx]; this.lightIdx = (this.lightIdx + 1) % this.lights.length;
    L.l.position.copy(pos); L.l.color.set(color); L.l.distance = dist; L.life = life; L.max = life; L.peak = peak; L.l.intensity = peak;
  }

  decal(hit, size = 0.09) {
    const n = new THREE.Vector3(hit.n[0], hit.n[1], hit.n[2]);
    this._q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.random() * 6.28);
    this._q.multiply(rot);
    this._v.set(hit.x + n.x * 0.005, hit.y + n.y * 0.005, hit.z + n.z * 0.005);
    this._s.set(size, size, size);
    this._m.compose(this._v, this._q, this._s);
    this.holes.setMatrixAt(this.holeIdx, this._m);
    this.holeIdx = (this.holeIdx + 1) % 200;
    this.holes.count = Math.min(200, Math.max(this.holes.count, this.holeIdx === 0 ? 200 : this.holeIdx));
    this.holes.instanceMatrix.needsUpdate = true;
  }
  bloodSplat(x, y, z, n, size) {
    const nn = new THREE.Vector3(...n);
    this._q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nn);
    this._q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.random() * 6.28));
    this._v.set(x + nn.x * 0.01, y + nn.y * 0.01, z + nn.z * 0.01);
    this._s.set(size, size, size);
    this._m.compose(this._v, this._q, this._s);
    this.splats.setMatrixAt(this.splatIdx, this._m);
    this.splatIdx = (this.splatIdx + 1) % 80;
    this.splats.count = Math.min(80, Math.max(this.splats.count, this.splatIdx === 0 ? 80 : this.splatIdx));
    this.splats.instanceMatrix.needsUpdate = true;
  }

  impact(hit, dir) {
    this.decal(hit);
    const n = hit.n;
    // dust puff
    for (let i = 0; i < 3; i++) this.dust.spawn({
      x: hit.x, y: hit.y, z: hit.z,
      vx: n[0] * (0.6 + Math.random()) + (Math.random() - 0.5) * 0.6, vy: n[1] * (0.6 + Math.random()) + Math.random() * 0.4, vz: n[2] * (0.6 + Math.random()) + (Math.random() - 0.5) * 0.6,
      drag: 2.5, size: 0.12, grow: 0.5, life: 0.6 + Math.random() * 0.4, r: 0.85, gg: 0.75, b: 0.6, a: 0.7, vr: (Math.random() - 0.5) * 2, g: -0.2,
    });
    // debris chips
    for (let i = 0; i < 5; i++) this.blood.spawn({
      x: hit.x, y: hit.y, z: hit.z,
      vx: n[0] * 3 + (Math.random() - 0.5) * 3, vy: n[1] * 3 + Math.random() * 2.5, vz: n[2] * 3 + (Math.random() - 0.5) * 3,
      g: 9.8, size: 0.02 + Math.random() * 0.02, life: 0.5, r: 0.45, gg: 0.38, b: 0.3, a: 1,
    });
    if (Math.random() < 0.35) for (let i = 0; i < 3; i++) this.sparks.spawn({
      x: hit.x, y: hit.y, z: hit.z,
      vx: n[0] * 4 + (Math.random() - 0.5) * 4, vy: n[1] * 4 + Math.random() * 3, vz: n[2] * 4 + (Math.random() - 0.5) * 4,
      g: 9.8, size: 0.03, life: 0.18, r: 1, gg: 0.8, b: 0.5,
    });
  }

  bloodHit(x, y, z, dir, head) {
    const n = head ? 16 : 10;
    for (let i = 0; i < n; i++) this.blood.spawn({
      x, y, z,
      vx: dir.x * (1 + Math.random() * 2) + (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.2) * 2, vz: dir.z * (1 + Math.random() * 2) + (Math.random() - 0.5) * 1.5,
      g: 9.8, size: 0.03 + Math.random() * 0.05, life: 0.4 + Math.random() * 0.3, r: 0.55, gg: 0.02, b: 0.02, a: 0.95,
    });
    for (let i = 0; i < 2; i++) this.dust.spawn({ x, y, z, vx: dir.x * 0.8, vy: 0.1, vz: dir.z * 0.8, drag: 3, size: 0.15, grow: 0.8, life: 0.35, r: 0.5, gg: 0.04, b: 0.04, a: 0.7 });
  }

  tracer(from, to, delay = 0) {
    const tr = this.tracers[this.trIdx]; this.trIdx = (this.trIdx + 1) % this.tracers.length;
    tr.from = from.clone(); tr.to = to.clone();
    tr.len = from.distanceTo(to); tr.t = -delay; tr.life = 1; tr.dir = to.clone().sub(from).normalize();
    tr.m.visible = false;
  }

  muzzleFlash(pos, big = 1) {
    this.flashes.spawn({ x: pos.x, y: pos.y, z: pos.z, size: 0.35 * big, life: 0.05, rot: Math.random() * 6.28, r: 1, gg: 0.9, b: 0.7, a: 1 });
    this.light(pos, 0xffb060, 6 * big, 7, 0.06);
    this.dust.spawn({ x: pos.x, y: pos.y, z: pos.z, vy: 0.5, drag: 2, size: 0.08, grow: 0.6, life: 0.5, r: 0.8, gg: 0.8, b: 0.8, a: 0.25 });
  }

  explosion(pos) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * 6.28, e = Math.random() * 1.4, s = 3 + Math.random() * 7;
      this.fire.spawn({ x: pos.x, y: pos.y + 0.2, z: pos.z, vx: Math.cos(a) * Math.cos(e) * s, vy: Math.sin(e) * s, vz: Math.sin(a) * Math.cos(e) * s, drag: 3, size: 0.8 + Math.random(), grow: 1.5, life: 0.35 + Math.random() * 0.3, r: 1, gg: 0.6, b: 0.25 });
    }
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 6.28, s = 1 + Math.random() * 3;
      this.smoke.spawn({ x: pos.x, y: pos.y + 0.4, z: pos.z, vx: Math.cos(a) * s, vy: 1 + Math.random() * 2, vz: Math.sin(a) * s, drag: 1.2, size: 1.2, grow: 1.5, life: 2 + Math.random() * 1.5, r: 0.25, gg: 0.23, b: 0.2, a: 0.75, vr: (Math.random() - 0.5) });
    }
    for (let i = 0; i < 30; i++) this.sparks.spawn({ x: pos.x, y: pos.y + 0.2, z: pos.z, vx: (Math.random() - 0.5) * 18, vy: Math.random() * 12, vz: (Math.random() - 0.5) * 18, g: 12, size: 0.06, life: 0.6 + Math.random() * 0.5, r: 1, gg: 0.75, b: 0.4 });
    this.light(pos.clone().setY(pos.y + 1), 0xffa050, 60, 22, 0.35);
  }

  flashPop(pos) {
    this.flashes.spawn({ x: pos.x, y: pos.y, z: pos.z, size: 3, life: 0.12, r: 1, gg: 1, b: 1 });
    this.light(pos, 0xffffff, 80, 25, 0.2);
    for (let i = 0; i < 20; i++) this.sparks.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: (Math.random() - 0.5) * 10, vy: Math.random() * 8, vz: (Math.random() - 0.5) * 10, g: 10, size: 0.05, life: 0.5, r: 1, gg: 1, b: 0.9 });
  }

  smokeCloud(pos, now) {
    const cloud = { x: pos.x, y: pos.y + 1.4, z: pos.z, r: 0, maxR: 3.9, start: now, end: now + 18 };
    this.clouds.push(cloud);
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * 6.28, u = Math.random() * 2 - 1, rr = Math.cbrt(Math.random()) * 3.4;
      const tx = Math.cos(a) * Math.sqrt(1 - u * u) * rr, ty = Math.abs(u) * rr * 0.7, tz = Math.sin(a) * Math.sqrt(1 - u * u) * rr;
      const shade = 0.72 + Math.random() * 0.2 + ty * 0.03;
      this.smoke.spawn({ x: pos.x, y: pos.y + 0.3, z: pos.z, vx: tx * 1.6, vy: ty * 1.6 + 0.4, vz: tz * 1.6, drag: 1.6, size: 1.2, grow: 0.25, life: 17 + Math.random() * 2, r: shade, gg: shade, b: shade * 1.02, a: 0.9, vr: (Math.random() - 0.5) * 0.2, fadeIn: 0.3, floor: 0.6 });
    }
    return cloud;
  }

  // does segment a->b pass through an active smoke cloud?
  smokeBlocks(a, b, now) {
    for (const c of this.clouds) {
      if (now < c.start + 0.8 || now > c.end - 1) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const L2 = dx * dx + dy * dy + dz * dz;
      let t = ((c.x - a.x) * dx + (c.y - a.y) * dy + (c.z - a.z) * dz) / L2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + dx * t - c.x, py = a.y + dy * t - c.y, pz = a.z + dz * t - c.z;
      if (px * px + py * py * 1.8 + pz * pz < (c.maxR * 0.95) ** 2) return true;
    }
    return false;
  }

  update(dt, now) {
    this.dust.update(dt); this.smoke.update(dt); this.sparks.update(dt); this.blood.update(dt); this.fire.update(dt); this.flashes.update(dt);
    for (const tr of this.tracers) {
      if (tr.life <= 0) continue;
      tr.t += dt;
      if (tr.t < 0) continue;
      const speed = 320, seg = Math.min(4, tr.len * 0.5);
      const head = Math.min(tr.len, tr.t * speed);
      const tail = Math.max(0, head - seg);
      if (tail >= tr.len - 0.01) { tr.life = 0; tr.m.visible = false; continue; }
      tr.m.visible = true;
      tr.m.position.copy(tr.from).addScaledVector(tr.dir, head);
      tr.m.lookAt(tr.from);
      tr.m.rotateY(Math.PI);
      tr.m.scale.set(1, 1, Math.max(0.01, head - tail));
    }
    for (const L of this.lights) {
      if (L.life > 0) { L.life -= dt; L.l.intensity = Math.max(0, L.peak * (L.life / L.max)); }
      else L.l.intensity = 0;
    }
    this.clouds = this.clouds.filter(c => now < c.end);
  }

  clearRound() {
    this.clouds = [];
    this.smoke.clear(); this.fire.clear(); this.dust.clear();
    this.holes.count = 0; this.holeIdx = 0; this.splats.count = 0; this.splatIdx = 0;
  }
}
