// Procedural soldier models (T / CT) with simple skeletal animation, plus first-person arms.
import * as THREE from 'three';
import { buildWeaponModel } from './weapons.js';
import { mergeChildren } from './merge.js';

const cache = {};
function mat(key, make) { return cache[key] || (cache[key] = make()); }

function teamMats(team, T) {
  if (team === 'T') return {
    top: mat('tTop', () => new THREE.MeshStandardMaterial({ map: T.clothT, roughness: 0.95 })),
    pants: mat('tPants', () => new THREE.MeshStandardMaterial({ map: T.clothT2, roughness: 0.95 })),
    vest: mat('tVest', () => new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 0.9 })),
    head: mat('tHead', () => new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 0.95 })),
    skin: mat('skin', () => new THREE.MeshStandardMaterial({ color: 0xb58a67, roughness: 0.8 })),
    boots: mat('boots', () => new THREE.MeshStandardMaterial({ color: 0x2a2219, roughness: 0.8 })),
    glove: mat('tGlove', () => new THREE.MeshStandardMaterial({ color: 0x3b2f23, roughness: 0.85 })),
    accent: mat('tAcc', () => new THREE.MeshStandardMaterial({ color: 0x7d2b1f, roughness: 0.9 })),
  };
  return {
    top: mat('ctTop', () => new THREE.MeshStandardMaterial({ map: T.clothCT, roughness: 0.9 })),
    pants: mat('ctPants', () => new THREE.MeshStandardMaterial({ map: T.clothCT2, roughness: 0.9 })),
    vest: mat('ctVest', () => new THREE.MeshStandardMaterial({ map: T.vest, color: 0x9aa0a8, roughness: 0.85 })),
    head: mat('ctHelm', () => new THREE.MeshStandardMaterial({ color: 0x2f3530, roughness: 0.6, metalness: 0.2 })),
    skin: mat('skin', () => new THREE.MeshStandardMaterial({ color: 0xb58a67, roughness: 0.8 })),
    boots: mat('bootsCT', () => new THREE.MeshStandardMaterial({ color: 0x121314, roughness: 0.7 })),
    glove: mat('ctGlove', () => new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.8 })),
    accent: mat('ctAcc', () => new THREE.MeshStandardMaterial({ color: 0x1c2330, roughness: 0.8 })),
  };
}

function B(parent, w, h, d, x, y, z, m) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
// capsule along Y, optionally squashed in x/z
function C(parent, r, len, x, y, z, m, sx = 1, sz = 1, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);
  mesh.position.set(x, y, z); mesh.scale.set(sx, 1, sz); mesh.rotation.z = rz;
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function S(parent, r, x, y, z, m, sx = 1, sy = 1, sz = 1, partial = false) {
  const mesh = new THREE.Mesh(partial ? new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55) : new THREE.SphereGeometry(r, 14, 10), m);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function G(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

const DOWN = new THREE.Vector3(0, -1, 0);
const _d = new THREE.Vector3(), _e = new THREE.Vector3(), _pole = new THREE.Vector3(), _f = new THREE.Vector3(), _q = new THREE.Quaternion();
const _tR = new THREE.Vector3(), _tL = new THREE.Vector3();
// Two-bone IK: orient shoulder & elbow groups (both pointing down -Y) so the hand reaches target (torso space).
function solveArm(shoulder, elbow, target, poleX) {
  const L1 = 0.29, L2 = 0.3;
  _d.copy(target).sub(shoulder.position);
  const dist = _d.length() || 1e-4;
  _d.divideScalar(dist);
  const D = Math.min(dist, L1 + L2 - 0.002);
  const a = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))));
  _pole.set(poleX, -0.7, 0.35);
  _pole.addScaledVector(_d, -_pole.dot(_d)).normalize();
  _e.copy(_d).multiplyScalar(Math.cos(a) * L1).addScaledVector(_pole, Math.sin(a) * L1);
  _f.copy(_d).multiplyScalar(D).sub(_e).normalize();
  _e.normalize();
  shoulder.quaternion.setFromUnitVectors(DOWN, _e);
  _q.copy(shoulder.quaternion).invert();
  _f.applyQuaternion(_q);
  elbow.quaternion.setFromUnitVectors(DOWN, _f);
}

export class CharacterModel {
  constructor(team, T) {
    const m = teamMats(team, T);
    const ct = team === 'CT';
    this.team = team;
    this.root = new THREE.Group();
    this.body = G(this.root);
    const hips = this.hips = G(this.body, 0, 0.92, 0);
    C(hips, 0.13, 0.1, 0, 0.03, 0, m.pants, 1, 0.8, Math.PI / 2);
    B(hips, 0.36, 0.05, 0.22, 0, 0.1, 0, m.accent); // belt
    // legs
    const leg = (side) => {
      const l = G(hips, side * 0.1, -0.02, 0);
      C(l, 0.085, 0.3, 0, -0.22, 0, m.pants, 1, 1.05);
      if (ct) B(l, 0.13, 0.1, 0.06, 0, -0.42, -0.07, m.vest);
      else B(l, 0.07, 0.09, 0.05, side * 0.07, -0.16, 0, m.vest); // thigh pouch
      const k = G(l, 0, -0.45, 0);
      C(k, 0.068, 0.28, 0, -0.19, 0.01, m.pants);
      B(k, 0.13, 0.12, 0.25, 0, -0.41, -0.045, m.boots);
      B(k, 0.135, 0.03, 0.26, 0, -0.465, -0.045, m.boots);
      return [l, k];
    };
    [this.legL, this.kneeL] = leg(-1);
    [this.legR, this.kneeR] = leg(1);
    // torso
    const torso = this.torso = G(hips, 0, 0.08, 0);
    C(torso, 0.19, 0.2, 0, 0.27, 0, m.top, 1.08, 0.66);
    C(torso, 0.2, 0.12, 0, 0.3, 0, m.vest, 1.1, 0.74);
    if (ct) {
      B(torso, 0.1, 0.1, 0.06, -0.1, 0.22, -0.155, m.accent); B(torso, 0.1, 0.1, 0.06, 0.1, 0.22, -0.155, m.accent);
      B(torso, 0.26, 0.06, 0.05, 0, 0.38, -0.15, m.accent);
      B(torso, 0.28, 0.34, 0.12, 0, 0.32, 0.17, m.accent); // backpack
    } else {
      for (const x of [-0.12, 0, 0.12]) B(torso, 0.085, 0.12, 0.05, x, 0.2, -0.155, m.vest);
      C(torso, 0.03, 0.4, 0.05, 0.33, -0.12, m.accent, 1, 1, 0.8); // bandolier
    }
    // head
    const head = this.head = G(torso, 0, 0.52, 0);
    C(head, 0.055, 0.05, 0, 0.04, 0, m.skin);
    if (!ct) {
      S(head, 0.118, 0, 0.18, 0, m.head, 0.95, 1.12, 1.02);
      B(head, 0.16, 0.042, 0.03, 0, 0.2, -0.105, m.skin); // eye slit
      const eye = mat('eye', () => new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.3 }));
      S(head, 0.016, -0.04, 0.2, -0.118, eye); S(head, 0.016, 0.04, 0.2, -0.118, eye);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.05, 14), m.accent);
      band.position.set(0, 0.27, 0); band.scale.set(1, 1, 1.04); head.add(band);
    } else {
      S(head, 0.112, 0, 0.18, 0, m.skin, 0.95, 1.1, 1.02);
      S(head, 0.135, 0, 0.2, 0.005, m.head, 1, 0.95, 1.08, true); // helmet dome
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16), m.head);
      brim.position.set(0, 0.2, 0.005); brim.scale.set(1, 1, 1.08); head.add(brim);
      B(head, 0.19, 0.05, 0.04, 0, 0.215, -0.12, mat('goggle', () => new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.15, metalness: 0.8 })));
      B(head, 0.17, 0.09, 0.05, 0, 0.1, -0.095, mat('mask', () => new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 })));
    }
    // arms
    const arm = (side) => {
      const s = G(torso, side * 0.25, 0.46, 0);
      S(s, 0.075, 0, 0, 0, m.top);
      C(s, 0.06, 0.2, 0, -0.14, 0, m.top);
      const e = G(s, 0, -0.29, 0);
      C(e, 0.052, 0.17, 0, -0.12, 0, m.top);
      B(e, 0.075, 0.1, 0.1, 0, -0.29, 0, m.glove);
      return [s, e];
    };
    [this.armL, this.elbowL] = arm(-1);
    [this.armR, this.elbowR] = arm(1);
    this.gunMount = G(torso, 0.06, 0.3, -0.26);
    this.gun = null;
    this.phase = 0;
    this.deathT = -1;
    this.flinch = 0;
    for (const g of [hips, this.legL, this.kneeL, this.legR, this.kneeR, torso, head, this.armL, this.elbowL, this.armR, this.elbowR]) mergeChildren(g);
    this.root.traverse(o => { if (o.isMesh) o.userData.char = true; });
  }

  setWeapon(id) {
    if (this.gunId === id) return;
    this.gunId = id;
    if (this.gun) this.gunMount.remove(this.gun);
    this.gun = id ? buildWeaponModel(id) : null;
    if (this.gun) {
      this.gunMount.add(this.gun);
      const info = this.gun.userData;
      this.gun.position.set(-info.rh[0], -info.rh[1] - 0.04, -info.rh[2]);
      if (id === 'knife' || ['he', 'flash', 'smoke', 'c4'].includes(id)) this.gun.position.z += 0.1;
      const muzzle = info.muzzle;
      mergeChildren(this.gun);
      this.gun.userData = info; this.gun.userData.muzzle = muzzle;
      this.gun.traverse(o => { if (o.isMesh) o.castShadow = true; });
    }
  }

  muzzleWorld(out) {
    if (!this.gun) return out.set(0, 0, 0).applyMatrix4(this.gunMount.matrixWorld);
    const mz = this.gun.userData.muzzle;
    return out.set(mz[0], mz[1], mz[2]).applyMatrix4(this.gun.matrixWorld);
  }

  // state: {speed, crouch(0..1), pitch, onGround, alive, dt, planting}
  update(dt, st) {
    if (this.deathT >= 0) {
      this.deathT += dt;
      const k = Math.min(1, this.deathT / 0.55);
      const e = k * k * (3 - 2 * k);
      this.body.rotation.x = e * (Math.PI / 2) * this.deathDir;
      this.body.rotation.z = e * this.deathTwist;
      this.body.position.y = -e * 0.12 + Math.sin(k * Math.PI) * 0.05;
      this.hips.position.y = 0.92 - e * 0.6 * 0;
      this.armL.rotation.x = e * 2.4; this.armR.rotation.x = e * 2.0;
      this.legL.rotation.x = e * 0.3; this.kneeL.rotation.x = -e * 0.4;
      return;
    }
    const sp = Math.min(1, st.speed / 5.5);
    this.phase += dt * (st.speed * 1.55 + 0.001);
    const c = st.crouch;
    const swing = Math.sin(this.phase) * 0.62 * sp * (st.onGround ? 1 : 0.2);
    const air = st.onGround ? 0 : 1;
    // crouch pose blended with walk cycle
    const baseThigh = 1.15 * c + air * 0.5, baseKnee = -2.0 * c - air * 0.8;
    this.legL.rotation.x = baseThigh + swing;
    this.legR.rotation.x = baseThigh - swing;
    this.kneeL.rotation.x = baseKnee - Math.max(0, -Math.sin(this.phase)) * 0.9 * sp;
    this.kneeR.rotation.x = baseKnee - Math.max(0, Math.sin(this.phase)) * 0.9 * sp;
    this.hips.position.y = 0.92 - c * 0.44 - Math.abs(Math.cos(this.phase)) * 0.03 * sp;
    this.torso.rotation.x = st.pitch * 0.45 - c * 0.15 + 0.06 * sp;
    this.torso.rotation.y = Math.sin(this.phase) * 0.05 * sp;
    this.head.rotation.x = st.pitch * 0.45;
    // arms: IK hands onto the weapon
    const pistol = this.gun && this.gun.userData.pistol;
    const knife = this.gunId === 'knife' || !this.gunId;
    const small = ['he', 'flash', 'smoke', 'c4'].includes(this.gunId);
    this.flinch = Math.max(0, this.flinch - dt * 6);
    const rec = st.recoil || 0;
    if (pistol) this.gunMount.position.set(0.02, 0.36 + rec * 0.02, -0.4 + rec * 0.03);
    else if (knife || small) this.gunMount.position.set(0.22, 0.12, -0.28);
    else this.gunMount.position.set(0.07, 0.3, -0.18 + rec * 0.03);
    this.gunMount.rotation.x = rec * 0.12 - this.flinch * 0.2;
    if (st.lowReady && !pistol && !knife && !small) { this.gunMount.position.set(0.04, 0.2, -0.2); this.gunMount.rotation.set(-0.55, 0.6, 0.35); }
    this.gunMount.updateMatrix();
    const gp = this.gun ? this.gun.position : _d.set(0, -0.04, 0);
    _tR.set(gp.x, gp.y, gp.z);
    if (this.gun && this.gun.userData.rh) { const rh = this.gun.userData.rh; _tR.set(gp.x + rh[0], gp.y + rh[1], gp.z + rh[2]); }
    _tR.applyMatrix4(this.gunMount.matrix);
    if (st.planting) { _tR.set(0.1, -0.15, -0.38); _tL.set(-0.1, -0.15, -0.38); }
    else if (knife || small) _tL.set(-0.3, -0.05 + swing * 0.1, -0.08 - swing * 0.1);
    else if (this.gun && this.gun.userData.lh) {
      const lh = this.gun.userData.lh;
      _tL.set(gp.x + lh[0], gp.y + lh[1], gp.z + lh[2]).applyMatrix4(this.gunMount.matrix);
    } else _tL.set(-0.2, 0.1, -0.2);
    solveArm(this.armR, this.elbowR, _tR, 1);
    solveArm(this.armL, this.elbowL, _tL, -1);
    if (st.planting) this.torso.rotation.x = -0.4;
  }

  die(fromDir) {
    this.deathT = 0;
    this.deathDir = fromDir >= 0 ? 1 : -1;
    this.deathTwist = (Math.random() - 0.5) * 0.6;
  }
  reset() {
    this.deathT = -1;
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
  }
}

// ---------------- First-person arms attached to a weapon model ----------------
export function attachArms(gun, team, T) {
  const m = teamMats(team, T);
  const sleeveMat = m.top, gloveMat = m.glove;
  const info = gun.userData;
  const armFrom = (hand, elbowOff, isLeft) => {
    const grp = new THREE.Group();
    const hp = new THREE.Vector3(...hand);
    const ep = hp.clone().add(new THREE.Vector3(...elbowOff));
    // glove: rounded palm, curled fingers and thumb
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), gloveMat);
    palm.scale.set(0.028, 0.043, 0.048); palm.position.copy(hp).add(new THREE.Vector3(isLeft ? -0.012 : 0.012, 0, 0.008)); grp.add(palm);
    const fingers = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.045, 3, 8), gloveMat);
    fingers.position.copy(hp).add(new THREE.Vector3(isLeft ? 0.006 : -0.006, -0.004, -0.03));
    fingers.rotation.z = Math.PI / 2; fingers.scale.set(1, 1, 1.25); grp.add(fingers);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.035, 3, 8), gloveMat);
    thumb.position.copy(hp).add(new THREE.Vector3(isLeft ? 0.022 : -0.022, 0.03, -0.012));
    thumb.rotation.x = Math.PI / 2 - 0.3; grp.add(thumb);
    // forearm (from hand to elbow)
    const dir = ep.clone().sub(hp); const len = dir.length(); dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.08, 10), gloveMat);
    wrist.quaternion.copy(q); wrist.position.copy(hp).addScaledVector(dir, 0.07); grp.add(wrist);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.052, len - 0.08, 12), sleeveMat);
    fore.quaternion.copy(q); fore.position.copy(hp).addScaledVector(dir, 0.08 + (len - 0.08) / 2); grp.add(fore);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 12), m.accent);
    cuff.quaternion.copy(q); cuff.position.copy(hp).addScaledVector(dir, 0.11); grp.add(cuff);
    return grp;
  };
  const arms = new THREE.Group();
  if (info.rh) arms.add(armFrom(info.rh, [0.1, -0.2, 0.42], false));
  if (info.lh) {
    const left = armFrom(info.lh, info.pistol ? [-0.1, -0.18, 0.44] : [-0.15, -0.22, 0.46], true);
    arms.add(left);
    arms.userData.left = left;
  }
  gun.add(arms);
  gun.userData.arms = arms;
  return arms;
}
