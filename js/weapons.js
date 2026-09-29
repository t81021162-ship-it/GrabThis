// Weapon stats (CS2-like values), recoil patterns and procedural 3D models.
import * as THREE from 'three';
import { rng } from './textures.js';

export const U = 0.0254; // one Source unit in metres

// Spray patterns: cumulative [yaw(deg, +right), pitch(deg, +up)] per shot.
const AK_PATTERN = [[0, 0], [0, 0.45], [0.05, 1.25], [0.12, 2.2], [0.05, 3.2], [0.18, 4.15], [0.32, 5.0], [0.3, 5.7], [0.2, 6.25], [0, 6.6],
  [-0.8, 6.85], [-1.5, 7.0], [-2.1, 7.1], [-2.35, 7.3], [-2.0, 7.4], [-1.2, 7.35], [-0.2, 7.45], [0.8, 7.55], [1.6, 7.45], [2.2, 7.55],
  [2.45, 7.65], [2.05, 7.75], [1.35, 7.65], [0.6, 7.85], [0, 7.95], [-0.6, 7.95], [-1.2, 8.05], [-1.8, 8.05], [-2.0, 8.15], [-1.6, 8.15]];

function genPattern(n, up, maxUp, side, freq, seed) {
  const r = rng(seed);
  const p = [[0, 0]];
  let y = 0;
  for (let i = 1; i < n; i++) {
    const k = Math.min(1, y / maxUp);
    y += up * (1 - k * 0.88);
    const x = Math.sin(i * freq + seed) * side * k + (r() - 0.5) * side * 0.2;
    p.push([x, y]);
  }
  return p;
}
const scaleP = (p, sx, sy, flip = 1) => p.map(([x, y]) => [x * sx * flip, y * sy]);

const inacc = (stand, crouch, move, jump, fire, recover) => ({ stand, crouch, move, jump, fire, recover });

export const WEAPONS = {
  knife: { id: 'knife', name: 'Knife', slot: 3, type: 'knife', price: 0, speed: 250, reward: 1500 },
  glock: { id: 'glock', name: 'Glock-18', slot: 2, type: 'pistol', team: 'T', price: 200, dmg: 30, pen: 0.47, rpm: 400, mag: 20, reserve: 120, reload: 2.2, speed: 240, falloff: 0.85, reward: 300,
    inacc: inacc(0.0056, 0.0042, 0.03, 0.12, 0.024, 0.32), pattern: genPattern(20, 0.9, 5, 0.6, 1.3, 3), sound: 'pistol' },
  usp: { id: 'usp', name: 'USP-S', slot: 2, type: 'pistol', team: 'CT', price: 200, dmg: 35, pen: 0.505, rpm: 352, mag: 12, reserve: 24, reload: 2.2, speed: 240, falloff: 0.91, reward: 300, silenced: true,
    inacc: inacc(0.0038, 0.003, 0.028, 0.12, 0.03, 0.35), pattern: genPattern(12, 1.1, 6, 0.5, 1.1, 5), sound: 'silenced' },
  p250: { id: 'p250', name: 'P250', slot: 2, type: 'pistol', price: 300, dmg: 38, pen: 0.64, rpm: 400, mag: 13, reserve: 26, reload: 2.2, speed: 240, falloff: 0.85, reward: 300,
    inacc: inacc(0.0055, 0.0045, 0.03, 0.12, 0.035, 0.34), pattern: genPattern(13, 1.2, 6, 0.6, 1.2, 7), sound: 'pistol' },
  deagle: { id: 'deagle', name: 'Desert Eagle', slot: 2, type: 'pistol', price: 700, dmg: 53, pen: 0.932, rpm: 267, mag: 7, reserve: 35, reload: 2.2, speed: 230, falloff: 0.81, reward: 300,
    inacc: inacc(0.0045, 0.0035, 0.06, 0.2, 0.09, 0.5), pattern: genPattern(7, 3.2, 12, 1, 1.4, 9), sound: 'deagle' },
  mac10: { id: 'mac10', name: 'MAC-10', slot: 1, type: 'smg', team: 'T', price: 1050, dmg: 29, pen: 0.575, rpm: 800, mag: 30, reserve: 100, reload: 2.6, speed: 240, falloff: 0.8, reward: 600, auto: true,
    inacc: inacc(0.009, 0.007, 0.022, 0.1, 0.006, 0.3), pattern: scaleP(genPattern(30, 0.55, 4.5, 1.8, 0.45, 11), 1, 1), sound: 'smg' },
  mp9: { id: 'mp9', name: 'MP9', slot: 1, type: 'smg', team: 'CT', price: 1250, dmg: 26, pen: 0.6, rpm: 857, mag: 30, reserve: 120, reload: 2.1, speed: 240, falloff: 0.87, reward: 600, auto: true,
    inacc: inacc(0.0075, 0.006, 0.02, 0.1, 0.0055, 0.3), pattern: genPattern(30, 0.5, 4, 1.6, 0.5, 13), sound: 'smg' },
  nova: { id: 'nova', name: 'Nova', slot: 1, type: 'shotgun', price: 1050, dmg: 26, pellets: 9, pen: 0.5, rpm: 68, mag: 8, reserve: 32, reload: 3.4, speed: 220, falloff: 0.7, reward: 900,
    inacc: inacc(0.045, 0.045, 0.02, 0.1, 0.01, 0.5), pattern: genPattern(8, 2, 6, 0.4, 1, 15), sound: 'shotgun', spreadFixed: 0.05, shellReload: true },
  galil: { id: 'galil', name: 'Galil AR', slot: 1, type: 'rifle', team: 'T', price: 1800, dmg: 30, pen: 0.775, rpm: 666, mag: 35, reserve: 90, reload: 3.0, speed: 215, falloff: 0.98, reward: 300, auto: true,
    inacc: inacc(0.006, 0.0045, 0.13, 0.4, 0.0075, 0.35), pattern: scaleP(AK_PATTERN.concat(AK_PATTERN.slice(25)), 0.8, 0.8, -1), sound: 'rifle2' },
  famas: { id: 'famas', name: 'FAMAS', slot: 1, type: 'rifle', team: 'CT', price: 2050, dmg: 30, pen: 0.7, rpm: 666, mag: 25, reserve: 90, reload: 3.3, speed: 220, falloff: 0.96, reward: 300, auto: true,
    inacc: inacc(0.0055, 0.0042, 0.12, 0.4, 0.0072, 0.35), pattern: scaleP(AK_PATTERN, 0.75, 0.78), sound: 'rifle2' },
  ak47: { id: 'ak47', name: 'AK-47', slot: 1, type: 'rifle', team: 'T', price: 2700, dmg: 36, pen: 0.775, rpm: 600, mag: 30, reserve: 90, reload: 2.43, speed: 215, falloff: 0.98, reward: 300, auto: true,
    inacc: inacc(0.0048, 0.0036, 0.14, 0.42, 0.0078, 0.37), pattern: AK_PATTERN, sound: 'ak' },
  m4a4: { id: 'm4a4', name: 'M4A4', slot: 1, type: 'rifle', team: 'CT', price: 3100, dmg: 33, pen: 0.7, rpm: 666, mag: 30, reserve: 90, reload: 3.07, speed: 225, falloff: 0.97, reward: 300, auto: true,
    inacc: inacc(0.0038, 0.0029, 0.12, 0.4, 0.007, 0.34), pattern: scaleP(AK_PATTERN, 0.85, 0.82, -1), sound: 'm4' },
  m4a1s: { id: 'm4a1s', name: 'M4A1-S', slot: 1, type: 'rifle', team: 'CT', price: 2900, dmg: 38, pen: 0.7, rpm: 600, mag: 20, reserve: 80, reload: 3.07, speed: 225, falloff: 0.99, reward: 300, auto: true, silenced: true,
    inacc: inacc(0.0032, 0.0025, 0.11, 0.4, 0.0065, 0.34), pattern: scaleP(AK_PATTERN.slice(0, 20), 0.7, 0.7, -1), sound: 'silencedRifle' },
  ssg08: { id: 'ssg08', name: 'SSG 08', slot: 1, type: 'sniper', price: 1700, dmg: 88, pen: 0.85, rpm: 48, mag: 10, reserve: 90, reload: 3.7, speed: 230, falloff: 0.98, reward: 300, scope: [40, 15],
    inacc: inacc(0.025, 0.022, 0.1, 0.02, 0.02, 0.4), scopedInacc: 0.0025, pattern: genPattern(10, 1.5, 4, 0.2, 1, 17), sound: 'scout', bolt: true },
  awp: { id: 'awp', name: 'AWP', slot: 1, type: 'sniper', price: 4750, dmg: 115, pen: 0.975, rpm: 41, mag: 5, reserve: 30, reload: 3.67, speed: 200, scopedSpeed: 100, falloff: 0.99, reward: 100, scope: [40, 10],
    inacc: inacc(0.08, 0.075, 0.2, 0.4, 0.05, 0.4), scopedInacc: 0.0012, pattern: genPattern(5, 2.5, 5, 0.2, 1, 19), sound: 'awp', bolt: true },
  he: { id: 'he', name: 'HE Grenade', slot: 4, type: 'grenade', price: 300, speed: 245, reward: 300, max: 1 },
  flash: { id: 'flash', name: 'Flashbang', slot: 4, type: 'grenade', price: 200, speed: 245, reward: 300, max: 2 },
  smoke: { id: 'smoke', name: 'Smoke Grenade', slot: 4, type: 'grenade', price: 300, speed: 245, reward: 300, max: 1 },
  c4: { id: 'c4', name: 'C4 Explosive', slot: 5, type: 'c4', price: 0, speed: 250 },
};

export const BUY_MENU = [
  { title: 'Pistols', items: ['glock', 'usp', 'p250', 'deagle'] },
  { title: 'Mid-Tier', items: ['mac10', 'mp9', 'nova'] },
  { title: 'Rifles', items: ['galil', 'famas', 'ak47', 'm4a4', 'm4a1s', 'ssg08', 'awp'] },
  { title: 'Equipment', items: ['vest', 'vesthelm', 'defuser'] },
  { title: 'Grenades', items: ['flash', 'smoke', 'he'] },
];
export const EQUIP = {
  vest: { id: 'vest', name: 'Kevlar Vest', price: 650 },
  vesthelm: { id: 'vesthelm', name: 'Kevlar + Helmet', price: 1000 },
  defuser: { id: 'defuser', name: 'Defuse Kit', price: 400, team: 'CT' },
};

export function newWeapon(id) {
  const d = WEAPONS[id];
  return { def: d, ammo: d.mag || 0, reserve: d.reserve || 0 };
}

// ---------------------------------------------------------------- models
const matCache = {};
function M(color, rough = 0.6, metal = 0.2, extra = {}) {
  const key = color + '_' + rough + '_' + metal + JSON.stringify(extra);
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  return matCache[key];
}
const MET = () => M(0x2a2b2e, 0.42, 0.6);
const MET2 = () => M(0x3a3c40, 0.48, 0.55);
const POLY = () => M(0x222222, 0.75, 0.05);
const WOOD = () => M(0x5e3620, 0.5, 0.05);

function box(g, w, h, d, x, y, z, mat, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  g.add(m); return m;
}
function cyl(g, r1, r2, len, x, y, z, mat, seg = 12, axis = 'z') {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, seg), mat);
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z);
  g.add(m); return m;
}

function rail(g, len, x, y, z0, mat) {
  box(g, 0.022, 0.008, len, x, y, z0 - len / 2, mat);
  for (let z = z0; z > z0 - len; z -= 0.016) box(g, 0.026, 0.008, 0.008, x, y + 0.007, z - 0.004, mat);
}

function curvedMag(g, x, y, z, n, w, segH, segD, bend, mat) {
  const mag = new THREE.Group(); mag.position.set(x, y, z);
  let cy = 0, cz = 0, ang = 0;
  for (let i = 0; i < n; i++) {
    const m = box(mag, w, segH + 0.004, segD, 0, cy - segH / 2, cz, mat, ang);
    m.position.y = cy - Math.cos(ang) * segH / 2; m.position.z = cz - Math.sin(ang) * segH / 2;
    cy -= Math.cos(ang) * segH; cz -= Math.sin(ang) * segH;
    ang += bend;
  }
  g.add(mag); return mag;
}

const builders = {
  ak47(g) {
    box(g, 0.05, 0.07, 0.36, 0, 0.035, -0.03, MET());
    box(g, 0.044, 0.024, 0.3, 0, 0.078, -0.01, MET2());
    box(g, 0.03, 0.026, 0.04, 0, 0.085, -0.2, MET());
    cyl(g, 0.011, 0.011, 0.44, 0, 0.05, -0.45, MET());
    cyl(g, 0.016, 0.016, 0.06, 0, 0.05, -0.68, MET());
    box(g, 0.01, 0.05, 0.02, 0, 0.08, -0.62, MET());
    cyl(g, 0.013, 0.013, 0.24, 0, 0.083, -0.34, MET());
    box(g, 0.05, 0.036, 0.16, 0, 0.085, -0.3, WOOD());
    box(g, 0.058, 0.058, 0.2, 0, 0.03, -0.31, WOOD());
    const mag = curvedMag(g, 0, 0.0, -0.1, 6, 0.036, 0.04, 0.07, 0.1, M(0x2a2622, 0.5, 0.6));
    box(g, 0.036, 0.1, 0.048, 0, -0.045, 0.07, WOOD(), -0.35);
    box(g, 0.008, 0.008, 0.07, 0, -0.03, -0.02, MET());
    box(g, 0.044, 0.075, 0.28, 0, 0.005, 0.29, WOOD(), 0.1);
    box(g, 0.046, 0.1, 0.02, 0, -0.005, 0.43, POLY(), 0.1);
    cyl(g, 0.006, 0.006, 0.04, 0.035, 0.06, -0.12, MET(), 8, 'x');
    return { rh: [0, -0.05, 0.07], lh: [0, 0.02, -0.33], muzzle: [0, 0.05, -0.72], mag, eject: [0.03, 0.06, -0.05] };
  },
  m4a4(g, silenced = false) {
    box(g, 0.048, 0.06, 0.2, 0, 0.02, -0.02, MET());
    box(g, 0.048, 0.05, 0.25, 0, 0.07, -0.05, MET2());
    rail(g, 0.22, 0, 0.1, 0.06, MET());
    box(g, 0.06, 0.066, silenced ? 0.24 : 0.28, 0, 0.06, silenced ? -0.29 : -0.31, M(0x26282b, 0.6, 0.5));
    rail(g, silenced ? 0.2 : 0.26, 0, 0.098, -0.18, MET());
    box(g, 0.01, 0.05, 0.015, 0, 0.11, silenced ? -0.38 : -0.43, MET());
    if (silenced) cyl(g, 0.021, 0.021, 0.23, 0, 0.058, -0.54, M(0x151515, 0.5, 0.6), 16);
    else { cyl(g, 0.011, 0.011, 0.2, 0, 0.058, -0.54, MET()); cyl(g, 0.015, 0.015, 0.05, 0, 0.058, -0.66, MET()); }
    const mag = new THREE.Group(); mag.position.set(0, 0, -0.1); g.add(mag);
    box(mag, 0.034, 0.16, 0.066, 0, -0.075, -0.01, M(0x3a3a38, 0.55, 0.5), 0.14);
    box(g, 0.036, 0.1, 0.046, 0, -0.04, 0.07, POLY(), -0.35);
    box(g, 0.008, 0.008, 0.07, 0, -0.02, -0.01, MET());
    cyl(g, 0.016, 0.016, 0.14, 0, 0.05, 0.17, MET());
    box(g, 0.044, 0.09, 0.15, 0, 0.03, 0.28, POLY());
    return { rh: [0, -0.04, 0.07], lh: [0, 0.03, -0.3], muzzle: [0, 0.058, silenced ? -0.66 : -0.69], mag, eject: [0.03, 0.07, -0.05] };
  },
  m4a1s(g) { return builders.m4a4(g, true); },
  galil(g) {
    box(g, 0.05, 0.075, 0.34, 0, 0.035, -0.03, MET());
    rail(g, 0.18, 0, 0.078, 0.02, MET());
    box(g, 0.058, 0.06, 0.22, 0, 0.04, -0.3, WOOD());
    cyl(g, 0.011, 0.011, 0.3, 0, 0.05, -0.5, MET());
    cyl(g, 0.016, 0.016, 0.06, 0, 0.05, -0.66, MET());
    const mag = curvedMag(g, 0, 0.0, -0.1, 6, 0.036, 0.038, 0.07, 0.07, MET2());
    box(g, 0.036, 0.1, 0.046, 0, -0.045, 0.07, POLY(), -0.35);
    cyl(g, 0.01, 0.01, 0.26, 0, 0.06, 0.27, MET());
    cyl(g, 0.01, 0.01, 0.26, 0, -0.0, 0.27, MET());
    box(g, 0.044, 0.1, 0.03, 0, 0.03, 0.41, POLY());
    return { rh: [0, -0.05, 0.07], lh: [0, 0.02, -0.32], muzzle: [0, 0.05, -0.7], mag, eject: [0.03, 0.06, -0.05] };
  },
  famas(g) {
    box(g, 0.06, 0.11, 0.62, 0, 0.03, -0.02, M(0x2f3134, 0.6, 0.4));
    box(g, 0.02, 0.03, 0.42, 0, 0.14, -0.08, POLY());
    box(g, 0.02, 0.06, 0.02, 0, 0.1, -0.28, POLY()); box(g, 0.02, 0.06, 0.02, 0, 0.1, 0.12, POLY());
    cyl(g, 0.011, 0.011, 0.2, 0, 0.05, -0.42, MET());
    cyl(g, 0.016, 0.016, 0.05, 0, 0.05, -0.54, MET());
    const mag = new THREE.Group(); mag.position.set(0, -0.02, 0.14); g.add(mag);
    box(mag, 0.03, 0.12, 0.06, 0, -0.06, 0, M(0x3a3a38, 0.5, 0.5), 0.1);
    box(g, 0.036, 0.1, 0.046, 0, -0.06, -0.08, POLY(), -0.25);
    return { rh: [0, -0.06, -0.08], lh: [0, 0.0, -0.26], muzzle: [0, 0.05, -0.57], mag, eject: [0.035, 0.06, 0.1] };
  },
  mac10(g) {
    box(g, 0.05, 0.09, 0.22, 0, 0.03, -0.05, M(0x2a2c2e, 0.5, 0.6));
    cyl(g, 0.012, 0.012, 0.06, 0, 0.05, -0.19, MET());
    const mag = new THREE.Group(); mag.position.set(0, -0.02, 0.02); g.add(mag);
    box(mag, 0.03, 0.2, 0.045, 0, -0.1, 0, M(0x3a3a38, 0.5, 0.5));
    box(g, 0.036, 0.1, 0.05, 0, -0.04, 0.02, POLY());
    box(g, 0.01, 0.03, 0.12, 0.028, 0.06, 0.1, MET());
    return { rh: [0, -0.04, 0.02], lh: [0, -0.14, 0.02], muzzle: [0, 0.05, -0.23], mag, eject: [0.03, 0.07, -0.05], lhGrip: true };
  },
  mp9(g) {
    box(g, 0.045, 0.07, 0.26, 0, 0.04, -0.07, M(0x1e1f21, 0.6, 0.3));
    rail(g, 0.16, 0, 0.08, -0.0, MET());
    cyl(g, 0.012, 0.012, 0.06, 0, 0.05, -0.22, MET());
    box(g, 0.03, 0.08, 0.035, 0, -0.03, -0.16, POLY());
    const mag = new THREE.Group(); mag.position.set(0, -0.0, 0.02); g.add(mag);
    box(mag, 0.03, 0.2, 0.045, 0, -0.1, 0, M(0x2c2c2a, 0.5, 0.5));
    box(g, 0.036, 0.1, 0.05, 0, -0.04, 0.02, POLY());
    box(g, 0.01, 0.06, 0.18, 0, 0.02, 0.15, POLY());
    return { rh: [0, -0.04, 0.02], lh: [0, -0.06, -0.16], muzzle: [0, 0.05, -0.25], mag, eject: [0.03, 0.07, -0.05] };
  },
  nova(g) {
    box(g, 0.05, 0.075, 0.28, 0, 0.03, -0.02, M(0x222326, 0.5, 0.5));
    cyl(g, 0.014, 0.014, 0.55, 0, 0.05, -0.43, MET());
    cyl(g, 0.013, 0.013, 0.46, 0, 0.018, -0.38, MET2());
    const pump = box(g, 0.05, 0.05, 0.16, 0, 0.018, -0.36, WOOD());
    box(g, 0.036, 0.1, 0.05, 0, -0.04, 0.12, WOOD(), -0.4);
    box(g, 0.046, 0.1, 0.3, 0, 0.0, 0.3, WOOD(), 0.12);
    return { rh: [0, -0.04, 0.12], lh: [0, -0.01, -0.36], muzzle: [0, 0.05, -0.72], mag: pump, eject: [0.03, 0.06, -0.02] };
  },
  sniper(g, body, scopeCol, len) {
    box(g, 0.058, 0.07, 0.5, 0, 0.02, -0.05, body);
    box(g, 0.052, 0.13, 0.32, 0, -0.01, 0.3, body);
    box(g, 0.052, 0.05, 0.1, 0, -0.03, 0.22, M(0x0c0c0c, 0.9, 0)); // thumbhole
    cyl(g, 0.014, 0.012, len, 0, 0.045, -0.3 - len / 2, MET(), 12);
    cyl(g, 0.02, 0.02, 0.08, 0, 0.045, -0.3 - len, MET2(), 12);
    cyl(g, 0.024, 0.024, 0.3, 0, 0.12, -0.03, scopeCol, 16);
    cyl(g, 0.036, 0.024, 0.08, 0, 0.12, -0.22, scopeCol, 16);
    cyl(g, 0.031, 0.024, 0.06, 0, 0.12, 0.14, scopeCol, 16);
    box(g, 0.02, 0.05, 0.02, 0, 0.08, -0.1, MET()); box(g, 0.02, 0.05, 0.02, 0, 0.08, 0.05, MET());
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), MET()); bolt.position.set(0.06, 0.05, 0.08); g.add(bolt);
    cyl(g, 0.005, 0.005, 0.05, 0.04, 0.05, 0.08, MET(), 6, 'x');
    const mag = new THREE.Group(); mag.position.set(0, -0.02, -0.02); g.add(mag);
    box(mag, 0.04, 0.07, 0.08, 0, -0.03, 0, POLY());
    box(g, 0.036, 0.1, 0.05, 0, -0.06, 0.12, body, -0.3);
    return { rh: [0, -0.06, 0.12], lh: [0, 0.0, -0.3], muzzle: [0, 0.045, -0.34 - len], mag, eject: [0.04, 0.06, 0.04] };
  },
  awp(g) { return builders.sniper(g, M(0x3f4c33, 0.7, 0.1), M(0x151515, 0.4, 0.6), 0.62); },
  ssg08(g) { return builders.sniper(g, M(0x3b4450, 0.6, 0.2), M(0x1a1a1a, 0.4, 0.6), 0.52); },
  pistol(g, slideCol, frameCol, len = 0.19, silencer = false, big = false) {
    const s = big ? 1.22 : 1;
    box(g, 0.03 * s, 0.035 * s, len * s, 0, 0.045 * s, -0.06 * s, slideCol);
    box(g, 0.028 * s, 0.024 * s, len * 0.9 * s, 0, 0.018 * s, -0.06 * s, frameCol);
    box(g, 0.004, 0.012, 0.008, 0, 0.068 * s, -0.14 * s, slideCol);
    box(g, 0.012, 0.01, 0.01, 0, 0.066 * s, 0.025 * s, slideCol);
    const mag = new THREE.Group(); mag.position.set(0, 0, 0.02 * s); g.add(mag);
    box(mag, 0.03 * s, 0.11 * s, 0.048 * s, 0, -0.045 * s, 0, frameCol, -0.25);
    box(g, 0.006, 0.02, 0.03, 0, -0.005, -0.03, frameCol);
    let mz = -0.06 * s - len * s / 2;
    if (silencer) { cyl(g, 0.016, 0.016, 0.15, 0, 0.045, mz - 0.075, M(0x161616, 0.5, 0.6), 14); mz -= 0.15; }
    return { rh: [0, -0.03, 0.03 * s], lh: [0, -0.05, 0.02 * s], muzzle: [0, 0.045 * s, mz], mag, eject: [0.02, 0.06, -0.04], pistol: true };
  },
  glock(g) { return builders.pistol(g, M(0x2b2d2b, 0.55, 0.5), M(0x1f211f, 0.8, 0.1)); },
  usp(g) { return builders.pistol(g, M(0x1f2124, 0.45, 0.6), M(0x151618, 0.8, 0.1), 0.19, true); },
  p250(g) { return builders.pistol(g, M(0x3a3c3e, 0.45, 0.6), M(0x1a1a1a, 0.8, 0.1), 0.18); },
  deagle(g) { return builders.pistol(g, M(0xb5b8bd, 0.3, 0.9), M(0x222222, 0.7, 0.2), 0.22, false, true); },
  knife(g) {
    const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.09, 4, 10), POLY());
    handle.rotation.x = Math.PI / 2; handle.scale.set(0.9, 1, 1.15); handle.position.set(0, 0, 0.02); g.add(handle);
    for (let i = 0; i < 4; i++) box(g, 0.034, 0.005, 0.006, 0, 0.0, -0.01 + i * 0.022, M(0x111111, 0.9, 0));
    box(g, 0.05, 0.036, 0.012, 0, 0.004, -0.045, MET());
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.012); sh.lineTo(0.14, -0.012); sh.quadraticCurveTo(0.19, -0.008, 0.21, 0.012); sh.lineTo(0.15, 0.02); sh.lineTo(0, 0.02); sh.lineTo(0, -0.012);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.002, bevelSegments: 1 });
    const blade = new THREE.Mesh(geo, M(0xc8ccd2, 0.25, 0.95));
    blade.rotation.y = Math.PI / 2; blade.position.set(-0.002, 0.004, -0.05);
    g.add(blade);
    return { rh: [0, 0, 0.02], lh: null, muzzle: [0, 0, -0.26], mag: null };
  },
  grenade(g, bodyCol, topCol) {
    cyl(g, 0.032, 0.032, 0.09, 0, 0.02, 0, bodyCol, 14, 'y');
    cyl(g, 0.02, 0.026, 0.03, 0, 0.078, 0, topCol, 12, 'y');
    box(g, 0.012, 0.09, 0.012, 0, 0.04, 0.036, MET2(), -0.1);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 14), MET2()); ring.position.set(0.02, 0.1, 0); g.add(ring);
    return { rh: [0, 0.0, 0.02], lh: null, muzzle: [0, 0.05, 0], mag: null };
  },
  he(g) { return builders.grenade(g, M(0x3f4a2a, 0.7, 0.2), M(0x55584f, 0.4, 0.8)); },
  flash(g) { return builders.grenade(g, M(0x8a8f96, 0.5, 0.5), M(0x55584f, 0.4, 0.8)); },
  smoke(g) { return builders.grenade(g, M(0x4a4e52, 0.6, 0.4), M(0x7a8a4a, 0.4, 0.4)); },
  c4(g) {
    box(g, 0.2, 0.06, 0.12, 0, 0.0, -0.06, M(0xa89468, 0.8, 0));
    for (let i = 0; i < 3; i++) cyl(g, 0.018, 0.018, 0.2, 0, -0.035, -0.02 - i * 0.04, M(0xbca880, 0.8, 0), 10, 'x');
    box(g, 0.1, 0.02, 0.07, -0.03, 0.04, -0.06, M(0x1a1a1a, 0.7, 0.1));
    box(g, 0.05, 0.004, 0.025, -0.03, 0.052, -0.08, M(0x225522, 0.4, 0, { emissive: 0x33ff55, emissiveIntensity: 0.6 }));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) box(g, 0.012, 0.006, 0.01, -0.05 + i * 0.018, 0.052, -0.055 + j * 0.013, M(0x444444, 0.6, 0.3));
    cyl(g, 0.004, 0.004, 0.18, 0.07, 0.04, -0.06, M(0xaa2222, 0.6, 0), 6, 'x');
    return { rh: [0, -0.01, 0.0], lh: [0.0, -0.01, -0.12], muzzle: [0, 0, -0.1], mag: null };
  },
};

export function buildWeaponModel(id) {
  const g = new THREE.Group();
  const info = builders[id](g);
  g.userData = info;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

// Render white silhouettes of each weapon (for killfeed / buy menu / inventory).
export function buildIcons(renderer) {
  const icons = {};
  const scene = new THREE.Scene();
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
  cam.position.set(3, 0, 0); cam.lookAt(0, 0, 0);
  const rt = new THREE.WebGLRenderTarget(512, 256);
  const pixels = new Uint8Array(512 * 256 * 4);
  const prevClear = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
  for (const id of Object.keys(builders)) {
    if (['sniper', 'pistol', 'grenade'].includes(id)) continue;
    const g = buildWeaponModel(id);
    g.traverse(o => { if (o.isMesh) o.material = white; });
    scene.add(g);
    const bb = new THREE.Box3().setFromObject(g);
    const sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    const aspect = 2;
    let hw = sz.z / 2 * 1.06, hh = sz.y / 2 * 1.06;
    if (hw / hh > aspect) hh = hw / aspect; else hw = hh * aspect;
    cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh;
    cam.position.set(c.x + 3, c.y, c.z); cam.lookAt(c.x, c.y, c.z); cam.updateProjectionMatrix();
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, 512, 256, pixels);
    renderer.setRenderTarget(null);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(512, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) {
      const s = ((255 - y) * 512 + x) * 4, d = (y * 512 + x) * 4;
      img.data[d] = 255; img.data[d + 1] = 255; img.data[d + 2] = 255; img.data[d + 3] = pixels[s + 3] > 10 ? 255 : 0;
    }
    ctx.putImageData(img, 0, 0);
    // trim
    let minx = 512, maxx = 0, miny = 256, maxy = 0;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) if (img.data[(y * 512 + x) * 4 + 3]) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    const out = document.createElement('canvas');
    out.width = Math.max(1, maxx - minx + 1); out.height = Math.max(1, maxy - miny + 1);
    out.getContext('2d').drawImage(cv, minx, miny, out.width, out.height, 0, 0, out.width, out.height);
    icons[id] = out.toDataURL();
    scene.remove(g);
  }
  renderer.setClearColor(prevClear, prevA);
  rt.dispose();
  return icons;
}
