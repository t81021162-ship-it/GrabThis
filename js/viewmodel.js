// First-person weapon rendering with procedural animation (draw, fire, reload, inspect, bob, sway).
import * as THREE from 'three';
import { buildWeaponModel, WEAPONS } from './weapons.js';
import { attachArms } from './characters.js';

const OFFSETS = {
  rifle: [0.19, -0.2, -0.43],
  smg: [0.17, -0.18, -0.42],
  shotgun: [0.19, -0.2, -0.43],
  sniper: [0.18, -0.21, -0.47],
  pistol: [0.12, -0.15, -0.42],
  knife: [0.15, -0.17, -0.42],
  grenade: [0.15, -0.17, -0.36],
  c4: [0.07, -0.2, -0.4],
};
const ROT = {
  rifle: [0.02, 0.15, 0.05], smg: [0.02, 0.13, 0.04], shotgun: [0.02, 0.14, 0.05], sniper: [0.02, 0.1, 0.03],
  pistol: [0.02, 0.05, 0.02], knife: [0.35, 0.55, -0.35], grenade: [0.1, 0.2, 0.1], c4: [0.2, 0, 0],
};

export class ViewModel {
  constructor(T) {
    this.T = T;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.01, 10);
    this.hemi = new THREE.HemisphereLight(0xdfe8ff, 0x8a7355, 0.6);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.fill = new THREE.PointLight(0xffc080, 0, 3, 2); this.fill.position.set(0.1, 0, -0.3); this.scene.add(this.fill);
    this.holder = new THREE.Group();
    this.scene.add(this.holder);
    this.pivot = new THREE.Group();
    this.holder.add(this.pivot);
    this.cache = {};
    this.model = null;
    this.state = { draw: 1, kick: 0, reload: -1, reloadDur: 1, inspect: -1, swing: -1, swingHeavy: false, throw: -1, bobPhase: 0, land: 0, swayX: 0, swayY: 0, t: 0 };
    // muzzle flash sprite
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.muzzle, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.flash.scale.set(0.2, 0.2, 0.2); this.flash.visible = false;
    this.flashT = 0;
    // brass shells
    this.shells = [];
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a13c, metalness: 0.9, roughness: 0.3 });
    const sg = new THREE.CylinderGeometry(0.005, 0.005, 0.03, 6);
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(sg, brass); m.visible = false; this.scene.add(m); this.shells.push({ m, life: 0, v: new THREE.Vector3(), w: new THREE.Vector3() }); }
    this.shellIdx = 0;
    this.visible = true;
  }

  set(id, team) {
    const key = id + '_' + team;
    if (this.key === key) return;
    this.key = key;
    if (this.model) this.pivot.remove(this.model);
    if (!this.cache[key]) {
      const g = buildWeaponModel(id);
      attachArms(g, team, this.T);
      g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
      // stocks sit behind the camera in first person; cull them like most shooters do
      for (const o of g.children) if (o.isMesh && o.position.z > 0.12) o.visible = false;
      this.cache[key] = g;
    }
    this.model = this.cache[key];
    this.def = WEAPONS[id];
    const type = this.def.type;
    const off = OFFSETS[type] || OFFSETS.rifle;
    const rh = this.model.userData.rh || [0, 0, 0];
    this.model.position.set(off[0] - rh[0], off[1] - rh[1], off[2] - rh[2]);
    this.baseModelPos = this.model.position.clone();
    this.pivot.add(this.model);
    const mz = this.model.userData.muzzle;
    this.model.add(this.flash);
    this.flash.position.set(mz[0], mz[1], mz[2] - 0.03);
    const mag = this.model.userData.mag;
    if (mag) { mag.userData.base = mag.userData.base || mag.position.clone(); mag.position.copy(mag.userData.base); mag.visible = true; }
    const rot = ROT[type] || ROT.rifle; this.model.rotation.set(rot[0], rot[1], rot[2]);
    this.drawAnim();
  }

  drawAnim() { this.state.draw = 0; this.state.reload = -1; this.state.inspect = -1; this.state.swing = -1; this.state.throw = -1; }
  fire(big = 1) {
    this.state.kick = Math.min(1.6, this.state.kick + big);
    this.state.inspect = -1;
    if (this.def && this.def.type !== 'knife' && this.def.type !== 'grenade') {
      this.flash.visible = true; this.flashT = 0.045;
      this.flash.material.rotation = Math.random() * 6.28;
      const s = (this.def.silenced ? 0.07 : 0.2) * (0.8 + Math.random() * 0.4);
      this.flash.scale.set(s, s, s);
      this.ejectShell();
    }
  }
  ejectShell() {
    if (!this.model || !this.model.userData.eject || this.def.type === 'shotgun') return;
    const sh = this.shells[this.shellIdx]; this.shellIdx = (this.shellIdx + 1) % this.shells.length;
    const e = this.model.userData.eject;
    sh.m.position.set(e[0], e[1], e[2]); this.model.localToWorld(sh.m.position);
    sh.v.set(0.9 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.2);
    sh.w.set(Math.random() * 20, Math.random() * 20, Math.random() * 20);
    sh.life = 0.6; sh.m.visible = true;
  }
  reload(dur) { this.state.reload = 0; this.state.reloadDur = dur; this.state.inspect = -1; }
  inspect() { if (this.state.reload < 0 && this.state.draw >= 1) this.state.inspect = 0; }
  swing(heavy) { this.state.swing = 0; this.state.swingHeavy = heavy; }
  throwAnim() { this.state.throw = 0; }

  update(dt, st) {
    const S = this.state;
    S.t += dt;
    this.holder.visible = this.visible && !st.scoped && !!this.model;
    if (!this.model) return;
    // sun direction in view space
    this.sun.position.copy(st.sunDirView).multiplyScalar(5);
    this.sun.intensity = 2.4 * st.sunVis;
    this.hemi.intensity = 0.3 + 0.35 * st.sunVis;

    // bob & sway
    const speed = st.speed;
    const bobAmp = st.onGround ? Math.min(1, speed / 6) : 0;
    S.bobPhase += dt * (4 + speed * 1.3);
    S.swayX += (-st.mouseDX * 0.0009 - S.swayX) * Math.min(1, dt * 10);
    S.swayY += (st.mouseDY * 0.0009 - S.swayY) * Math.min(1, dt * 10);
    S.swayX = Math.max(-0.06, Math.min(0.06, S.swayX)); S.swayY = Math.max(-0.05, Math.min(0.05, S.swayY));
    S.land *= Math.exp(-dt * 8);
    S.kick *= Math.exp(-dt * 16);

    let px = Math.sin(S.bobPhase) * 0.011 * bobAmp + S.swayX * 0.4;
    let py = -Math.abs(Math.cos(S.bobPhase)) * 0.009 * bobAmp - S.land * 0.04 + Math.sin(S.t * 1.7) * 0.0015 + S.swayY * 0.3 - st.crouch * 0.008;
    let pz = S.kick * 0.035;
    let rx = S.kick * 0.05 + S.swayY, ry = S.swayX, rz = Math.sin(S.bobPhase) * 0.01 * bobAmp + S.swayX * 0.5;

    // draw
    if (S.draw < 1) {
      S.draw = Math.min(1, S.draw + dt / (this.def.type === 'knife' ? 0.35 : 0.5));
      const e = 1 - Math.pow(1 - S.draw, 3);
      rx += (1 - e) * -1.1; py += (1 - e) * -0.18; rz += (1 - e) * 0.4;
    }
    // reload
    const mag = this.model.userData.mag;
    if (S.reload >= 0) {
      S.reload += dt / S.reloadDur;
      const p = S.reload;
      const w = Math.sin(Math.min(1, p) * Math.PI);
      rz += w * 0.45; rx += w * 0.2; py -= w * 0.03; px -= w * 0.02;
      if (mag && mag.userData.base && !this.def.shellReload) {
        const b = mag.userData.base;
        let dy = 0, vis = true;
        if (p > 0.15 && p < 0.35) dy = -((p - 0.15) / 0.2) * 0.35;
        else if (p >= 0.35 && p < 0.5) { vis = false; }
        else if (p >= 0.5 && p < 0.68) dy = -(1 - (p - 0.5) / 0.18) * 0.25;
        mag.position.set(b.x, b.y + dy, b.z + dy * 0.2);
        mag.visible = vis;
        if (p > 0.8 && p < 0.92) { pz += 0.02 * Math.sin((p - 0.8) / 0.12 * Math.PI); rx -= 0.05; }
      }
      if (this.def.shellReload && mag) {
        const b = mag.userData.base || mag.position;
        mag.position.z = b.z + Math.max(0, Math.sin(p * Math.PI * 6)) * 0.05;
      }
      if (S.reload >= 1) { S.reload = -1; if (mag && mag.userData.base) { mag.position.copy(mag.userData.base); mag.visible = true; } }
    }
    // inspect
    if (S.inspect >= 0) {
      S.inspect += dt / 3.0;
      const p = S.inspect;
      const e1 = Math.sin(Math.min(1, p / 0.5) * Math.PI / 2), e2 = p > 0.5 ? Math.sin(Math.min(1, (p - 0.5) / 0.5) * Math.PI / 2) : 0;
      const k = p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15;
      ry += (e1 * 0.9 - e2 * 0.2) * k;
      rz += (e1 * 0.35 + e2 * 0.6) * k;
      px -= e1 * 0.05 * k; py += e1 * 0.03 * k;
      if (S.inspect >= 1) S.inspect = -1;
    }
    // knife swing
    if (S.swing >= 0) {
      S.swing += dt / (S.swingHeavy ? 0.6 : 0.38);
      const p = S.swing, w = Math.sin(p * Math.PI);
      if (S.swingHeavy) { pz -= w * 0.12; rx -= w * 0.4; py += w * 0.04; }
      else { ry += Math.cos(p * Math.PI) * 0.9 * w; rz -= w * 0.8; px -= w * 0.08; pz -= w * 0.05; }
      if (S.swing >= 1) S.swing = -1;
    }
    // grenade throw
    if (S.throw >= 0) {
      S.throw += dt / 0.35;
      const p = S.throw;
      py += p < 0.4 ? p * 0.25 : 0.1 - (p - 0.4) * 0.6; pz -= p * 0.2; rx += p < 0.4 ? p * 0.8 : 0.32 - (p - 0.4) * 2.5;
      if (S.throw >= 1) S.throw = -1;
    }
    if (st.pulling) { py += 0.03; rx += 0.25; pz += 0.03; }

    this.pivot.position.set(px, py, pz);
    this.pivot.rotation.set(rx, ry, rz);

    // flash & shells
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.flash.visible = false; }
    this.fill.intensity = this.flashT > 0 ? 3 : 0;
    for (const sh of this.shells) {
      if (sh.life <= 0) continue;
      sh.life -= dt;
      sh.v.y -= 6 * dt;
      sh.m.position.addScaledVector(sh.v, dt);
      sh.m.rotation.x += sh.w.x * dt; sh.m.rotation.y += sh.w.y * dt;
      if (sh.life <= 0) sh.m.visible = false;
    }
  }

  render(renderer, aspect) {
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }
}
