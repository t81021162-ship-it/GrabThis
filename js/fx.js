/* Witherholm — atmosphere: light shafts, low mist, flames, and the storm outside. */

const Fx = (() => {
  let scene = null;
  const mists = [], shafts = [], fires = [];
  const shaftMats = {};
  let flash = 0, stormT = 7, stormy = true;
  const pending = [];   // things that happen a moment after a lightning strike

  function init(sc) { scene = sc; }

  function shaftMat(color, intensity) {
    const key = color + ':' + intensity;
    if (!shaftMats[key]) { shaftMats[key] = Shaders.makeShaft({ color, intensity }); shafts.push(shaftMats[key]); }
    return shaftMats[key];
  }

  // four-sided prism: top corners p[0..3] projected along dir until they reach the floor (y = 0)
  function prism(p, dir, mat) {
    const q = p.map(v => v.clone().addScaledVector(dir, v.y / -dir.y));
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, base = pos.length / 3;
      for (const v of [p[i], p[j], q[j], q[i]]) pos.push(v.x, v.y, v.z);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false; m.renderOrder = 2;
    return m;
  }

  function windowShaft({ centre, tangent, n, w, h, reach, color, intensity }) {
    const up = new THREE.Vector3(0, 1, 0);
    const corner = (sx, sy) => centre.clone().addScaledVector(tangent, sx * w / 2).addScaledVector(up, sy * h / 2);
    const dir = n.clone().multiplyScalar(reach).add(new THREE.Vector3(0, -(1 - reach * 0.5), 0)).normalize();
    return prism([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], dir, shaftMat(color, intensity));
  }
  function skyShaft(x, z, h) {
    const s = 0.8, dir = new THREE.Vector3(0.22, -1, 0.1).normalize();
    const p = [new THREE.Vector3(x - s, h, z - s), new THREE.Vector3(x + s, h, z - s), new THREE.Vector3(x + s, h, z + s), new THREE.Vector3(x - s, h, z + s)];
    return prism(p, dir, shaftMat(0x88aaf0, 0.2));
  }

  function addMist(x0, z0, x1, z1, y, { color = 0x8f9bb0, opacity = 0.22, scale = 0.22, speed = 0.018 } = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), Shaders.makeMist({ texture: Tex.get('mist'), color, opacity, scale, speed }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.renderOrder = 1; m.frustumCulled = false;
    scene.add(m); mists.push(m);
    return m;
  }

  // ---------- fire ----------
  let flameMat = null, glowMat = null;
  function addFire(x, z, scale = 1) {
    if (!flameMat) {
      flameMat = new THREE.SpriteMaterial({ map: Tex.get('flame'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
      glowMat = new THREE.SpriteMaterial({ map: Tex.get('glint'), color: 0xff7a20, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 });
    }
    const f = { x, z, scale, t: Math.random() * 10, sprites: [] };
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(flameMat); s.position.set(x + (Math.random() - 0.5) * 0.5 * scale, 0.5 * scale, z + (Math.random() - 0.5) * 0.5 * scale);
      scene.add(s); f.sprites.push(s);
    }
    f.glow = new THREE.Sprite(glowMat); f.glow.scale.setScalar(3 * scale); f.glow.position.set(x, 0.8 * scale, z); scene.add(f.glow);
    fires.push(f);
    return f;
  }
  function clearFires() { for (const f of fires) { f.sprites.forEach(s => scene.remove(s)); scene.remove(f.glow); } fires.length = 0; }
  function fireNear(x, z, r) { for (const f of fires) if (Math.hypot(f.x - x, f.z - z) < r * f.scale + 0.3) return true; return false; }

  // ---------- storm ----------
  function strike() {
    flash = 1;
    pending.push({ t: 0.13, kind: 'flash', v: 0.8 });
    pending.push({ t: 0.35 + Math.random() * 2.4, kind: 'thunder' });
  }
  function setStorm(on) { stormy = on; }

  function update(dt, time) {
    for (const m of mists) m.material.uniforms.uTime.value = time;
    for (const s of shafts) { s.uniforms.uTime.value = time; s.uniforms.uFlash.value = flash; }
    for (const f of fires) {
      f.t += dt;
      f.sprites.forEach((s, i) => {
        const q = 0.8 + 0.35 * Math.sin(f.t * (11 + i * 3) + i) * Math.random() + 0.2;
        s.scale.set(0.7 * f.scale * (0.9 + 0.2 * Math.sin(f.t * 7 + i)), 1.2 * f.scale * q, 1);
        s.position.y = 0.55 * f.scale * q;
      });
      f.glow.material.opacity = 0.45 + 0.25 * Math.random();
    }
    flash = Math.max(0, flash - dt * 3.2);
    if (stormy) { stormT -= dt; if (stormT <= 0) { stormT = 14 + Math.random() * 30; strike(); } }
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i]; p.t -= dt;
      if (p.t > 0) continue;
      if (p.kind === 'flash') flash = Math.max(flash, p.v);
      else if (p.kind === 'thunder') Sound.play('thunder');
      pending.splice(i, 1);
    }
  }

  return { init, update, windowShaft, skyShaft, addMist, addFire, clearFires, fireNear, strike, setStorm, get flash() { return flash; }, get fires() { return fires; } };
})();
