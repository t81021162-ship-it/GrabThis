// Core game: actors, Source-style movement, shooting, grenades, bomb, rounds and economy.
import * as THREE from 'three';
import { WEAPONS, EQUIP, newWeapon, U, buildWeaponModel } from './weapons.js';
import { CharacterModel } from './characters.js';
import { Bot } from './bots.js';

export const GRAV = 800 * U;
const JUMP_V = 7.5, ACCEL = 5.5, AIR_ACCEL = 12, FRICTION = 5.2, STOP_SPEED = 80 * U, AIR_CAP = 30 * U;
export const STAND_H = 1.83, CROUCH_H = 1.37, EYE_STAND = 1.63, EYE_CROUCH = 1.17;
const DEG = Math.PI / 180;

const BOT_NAMES = ['Crusher', 'Vitaliy', 'Rook', 'Maverick', 'Kaz', 'Hawk', 'Moose', 'Blitz', 'Ghost', 'Viper', 'Dozer', 'Sable', 'Nomad', 'Frost', 'Jinx', 'Talon', 'Reaper', 'Brick', 'Ozzy', 'Lynx'];

let actorId = 0;

export class Actor {
  constructor(game, { name, team, isBot, squad }) {
    this.game = game;
    this.id = actorId++;
    this.name = name; this.team = team; this.isBot = isBot; this.squad = squad;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.hw = 0.36; this.h = STAND_H; this.eyeH = EYE_STAND; this.ducked = false; this.onGround = true;
    this.health = 100; this.armor = 0; this.helmet = false; this.defuser = false; this.money = 800; this.alive = true;
    this.inv = { 1: null, 2: null, 3: newWeapon('knife'), 4: [], 5: null };
    this.slot = 3; this.gi = 0; this.lastSlot = 2;
    this.nextFire = 0; this.reloadEnd = 0; this.reloading = false; this.drawEnd = 0;
    this.recoilIdx = 0; this.accum = 0; this.lastShot = -10; this.zoom = 0; this.rezoomAt = 0;
    this.punch = { x: 0, y: 0 }; this.flinch = 0;
    this.stats = { k: 0, d: 0, a: 0, dmg: 0, mvp: 0, hs: 0 };
    this.roundKills = 0; this.dmgBy = new Map();
    this.input = { move: new THREE.Vector3(), walk: false, crouch: false, jump: false, fire: false, fire2: false, use: false };
    this.prev = { fire: false, fire2: false, jump: false };
    this.stepDist = 0; this.flashEnd = 0; this.flashDur = 0;
    this.plantProg = 0; this.defuseProg = 0;
    this.spotted = 0;
    this.model = new CharacterModel(team, game.T);
    game.scene.add(this.model.root);
    this.brain = isBot ? new Bot(this, game) : null;
  }
  get cur() {
    if (this.slot === 4) return this.inv[4][this.gi] || this.inv[3];
    return this.inv[this.slot] || this.inv[3];
  }
  get curDef() { return this.cur.def; }
  eye(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + this.eyeH, this.pos.z); }
  forward(out = new THREE.Vector3()) {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }
  get speed2d() { return Math.hypot(this.vel.x, this.vel.z); }
  get maxSpeed() {
    const d = this.curDef;
    let s = (this.zoom > 0 && d.scopedSpeed ? d.scopedSpeed : d.speed) * U;
    if (this.input.walk) s *= 0.52;
    if (this.ducked) s *= 0.34;
    return s;
  }
  setTeam(team) {
    this.team = team;
    this.game.scene.remove(this.model.root);
    this.model = new CharacterModel(team, this.game.T);
    this.game.scene.add(this.model.root);
  }
  hasPrimaryOrSecondary() { return this.inv[1] || this.inv[2]; }
  totalGrenades() { return this.inv[4].length; }

  select(slot, silent = false) {
    if (slot === 4) {
      if (!this.inv[4].length) return false;
      if (this.slot === 4) this.gi = (this.gi + 1) % this.inv[4].length; else this.gi = 0;
    } else if (!this.inv[slot]) return false;
    else if (this.slot === slot) return false;
    if (this.slot !== slot) this.lastSlot = this.slot;
    this.slot = slot;
    this.reloading = false; this.zoom = 0; this.rezoomAt = 0; this.pulling = false;
    this.drawEnd = this.game.now + (this.curDef.type === 'knife' ? 0.3 : this.curDef.type === 'pistol' ? 0.45 : 0.6);
    this.recoilIdx = 0;
    if (this === this.game.player) this.game.onPlayerWeaponChange(silent);
    return true;
  }
  bestSlot() { return this.inv[1] ? 1 : this.inv[2] ? 2 : 3; }
  startReload() {
    const w = this.cur, d = w.def;
    if (!d.mag || this.reloading || w.ammo >= d.mag || w.reserve <= 0) return;
    this.reloading = true; this.zoom = 0; this.rezoomAt = 0;
    const dur = d.shellReload ? 0.5 * (d.mag - w.ammo) + 0.4 : d.reload;
    this.reloadEnd = this.game.now + dur;
    this.game.sound.reload(d, this === this.game.viewActor ? null : this.pos, dur);
    if (this === this.game.player) this.game.vm.reload(dur);
  }
}

export class Game {
  constructor({ scene, world, T, sound, effects, hud, vm, settings, camera }) {
    Object.assign(this, { scene, world, T, sound, effects, hud, vm, settings, camera });
    this.now = 0;
    this.actors = [];
    this.grenades = [];
    this.items = [];
    this.bomb = null;         // planted bomb
    this.droppedBomb = null;  // bomb on the ground
    this.phase = 'freeze';
    this.round = 0;
    this.score = [0, 0]; // by squad
    this.lossStreak = { T: 1, CT: 1 };
    this.plan = {};
    this._v = new THREE.Vector3(); this._v2 = new THREE.Vector3();
  }

  // ------------------------------------------------ setup
  start({ side, difficulty, maxRounds }) {
    this.difficulty = difficulty;
    this.maxRounds = maxRounds;             // e.g. 24 -> first to 13
    this.half = maxRounds / 2;
    this.winTarget = this.half + 1;
    const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
    const enemy = side === 'T' ? 'CT' : 'T';
    this.player = new Actor(this, { name: this.settings.name || 'You', team: side, isBot: false, squad: 0 });
    this.actors.push(this.player);
    for (let i = 0; i < 4; i++) this.actors.push(new Actor(this, { name: names[i], team: side, isBot: true, squad: 0 }));
    for (let i = 0; i < 5; i++) this.actors.push(new Actor(this, { name: names[4 + i], team: enemy, isBot: true, squad: 1 }));
    this.viewActor = this.player;
    this.round = 0;
    this.newRound(true);
  }
  squadSide(squad) { const a = this.actors.find(x => x.squad === squad); return a ? a.team : 'CT'; }
  teamScore(team) { const sq = this.actors.find(a => a.team === team).squad; return this.score[sq]; }
  alive(team) { return this.actors.filter(a => a.alive && a.team === team); }

  giveDefaults(a) {
    a.inv[2] = newWeapon(a.team === 'T' ? 'glock' : 'usp');
  }

  newRound(first = false) {
    this.round++;
    const w = this.world;
    // halftime swap
    if (!first && this.round === this.half + 1) {
      for (const a of this.actors) {
        a.setTeam(a.team === 'T' ? 'CT' : 'T');
        a.money = 800; a.inv = { 1: null, 2: null, 3: newWeapon('knife'), 4: [], 5: null };
        a.armor = 0; a.helmet = false; a.defuser = false; a.alive = false;
      }
      this.lossStreak = { T: 1, CT: 1 };
      this.hud.center('HALFTIME — SWITCHING SIDES', 4);
    }
    this.phase = 'freeze';
    this.phaseEnd = this.now + (first ? 6 : this.settings.freezeTime);
    this.buyEnd = this.phaseEnd + 20;
    this.roundTimeEnd = this.phaseEnd + 115;
    this.matchOver = false;
    // clean world
    for (const it of this.items) this.scene.remove(it.mesh);
    this.items = [];
    for (const g of this.grenades) this.scene.remove(g.mesh);
    this.grenades = [];
    if (this.bomb) { this.scene.remove(this.bomb.mesh); this.bomb = null; }
    if (this.droppedBomb) { this.scene.remove(this.droppedBomb.mesh); this.droppedBomb = null; }
    this.effects.clearRound();
    // spawn
    const spawnIdx = { T: 0, CT: 0 };
    const order = this.actors.slice().sort(() => Math.random() - 0.5);
    for (const a of order) {
      const sp = w.spawns[a.team][spawnIdx[a.team]++ % 5];
      const x = w.cx2x(sp[0]) + (Math.random() - 0.5) * 0.6, z = w.cz2z(sp[1]) + (Math.random() - 0.5) * 0.6;
      a.pos.set(x, w.heightAt(x, z), z); a.vel.set(0, 0, 0);
      a.yaw = a.team === 'T' ? 0 : Math.PI; a.pitch = 0;
      if (!a.alive || first) {
        a.inv = { 1: null, 2: null, 3: newWeapon('knife'), 4: [], 5: null };
        a.armor = 0; a.helmet = false; a.defuser = false;
        this.giveDefaults(a);
      }
      if (a.team === 'T') a.defuser = false;
      a.inv[5] = null;
      // refill ammo of kept guns
      for (const s of [1, 2]) if (a.inv[s]) { a.inv[s].ammo = a.inv[s].def.mag; a.inv[s].reserve = a.inv[s].def.reserve; }
      a.alive = true; a.health = 100; a.ducked = false; a.h = STAND_H; a.eyeH = EYE_STAND;
      a.flashEnd = 0; a.plantProg = 0; a.defuseProg = 0; a.zoom = 0; a.reloading = false; a.pulling = false;
      a.roundKills = 0; a.dmgBy = new Map(); a.spotted = 0; a.roundDamage = 0;
      a.slot = 3; a.select(a.bestSlot(), true);
      a.model.reset();
      a.model.root.visible = true;
    }
    // bomb to a random T
    const ts = this.alive('T');
    const carrier = ts[Math.floor(Math.random() * ts.length)];
    carrier.inv[5] = newWeapon('c4');
    // plan
    const site = Math.random() < 0.5 ? 'A' : 'B';
    this.plan = { site, route: Math.floor(Math.random() * 2), rush: Math.random() < 0.3 };
    for (const a of this.actors) if (a.brain) a.brain.newRound();
    this.roundEndAt = 0;
    this.player.spectate = null;
    this.viewActor = this.player;
    this.hud.roundReset(this);
    if (this.player.team === 'T' && this.player.inv[5]) this.hud.chat('<b class="t">You</b> have the bomb. Plant it at <b>A</b> or <b>B</b>.');
    if (this.onRoundStart) this.onRoundStart();
  }

  // A bot spotted enemies (or a teammate died): some idle defenders rotate to help.
  teamAlert(team, pos, from) {
    if (team !== 'CT' || this.bomb) return;
    this.alertCd = this.alertCd || {};
    if ((this.alertCd[team] || 0) > this.now) return;
    this.alertCd[team] = this.now + 8;
    for (const a of this.actors) {
      if (!a.brain || !a.alive || a.team !== team || a === from || a.brain.target) continue;
      if (a.brain.mode !== 'hold' && a.brain.mode !== 'move') continue;
      if (a.pos.distanceTo(pos) < 22 || Math.random() > 0.65) continue;
      a.brain.rotateTo(pos);
    }
  }

  // ------------------------------------------------ economy / buying
  canBuy(a) {
    if (!a.alive) return false;
    if (this.now > this.buyEnd || this.phase === 'post') return false;
    return this.world.inRect(a.pos.x, a.pos.z, this.world.buyZones[a.team]);
  }
  priceOf(a, id) {
    if (id === 'vesthelm') return a.armor >= 100 ? 350 : 1000;
    return (WEAPONS[id] || EQUIP[id]).price;
  }
  buy(a, id) {
    if (!this.canBuy(a)) return 'You can’t buy right now';
    const def = WEAPONS[id] || EQUIP[id];
    if (def.team && def.team !== a.team) return 'Not available for your team';
    const price = this.priceOf(a, id);
    if (a.money < price) return 'Insufficient funds';
    if (id === 'vest') { if (a.armor >= 100) return 'Already have armor'; a.armor = 100; }
    else if (id === 'vesthelm') { if (a.armor >= 100 && a.helmet) return 'Already have armor'; a.armor = 100; a.helmet = true; }
    else if (id === 'defuser') { if (a.defuser) return 'Already have a kit'; a.defuser = true; }
    else if (def.type === 'grenade') {
      const count = a.inv[4].filter(g => g.def.id === id).length;
      if (count >= def.max || a.inv[4].length >= 4) return 'Cannot carry any more';
      a.inv[4].push(newWeapon(id));
    } else {
      const slot = def.slot;
      if (a.inv[slot] && a.inv[slot].def.id === id) return 'Already own this';
      if (a.inv[slot]) this.dropWeapon(a, slot, true);
      a.inv[slot] = newWeapon(id);
      a.slot = 0; a.select(slot, a !== this.player);
    }
    a.money -= price;
    if (a === this.player) this.sound.buy();
    return null;
  }

  // ------------------------------------------------ dropped weapons
  dropWeapon(a, slot, fromBuy = false) {
    const w = a.inv[slot];
    if (!w || slot === 3) return;
    if (slot === 4) return;
    a.inv[slot] = null;
    if (slot === 5) { this.dropBomb(a); }
    else {
      const mesh = buildWeaponModel(w.def.id);
      const f = a.forward(this._v);
      mesh.position.set(a.pos.x + f.x * (fromBuy ? 0.4 : 1.0), a.pos.y + 0.05, a.pos.z + f.z * (fromBuy ? 0.4 : 1.0));
      mesh.rotation.set(0, Math.random() * 6.28, Math.PI / 2);
      this.scene.add(mesh);
      this.items.push({ w, mesh, t: this.now });
    }
    if (a.slot === slot) { a.slot = 0; a.select(a.bestSlot(), true); if (a === this.player) this.onPlayerWeaponChange(); }
  }
  dropBomb(a) {
    const mesh = buildWeaponModel('c4');
    mesh.position.set(a.pos.x, a.pos.y + 0.05, a.pos.z);
    this.scene.add(mesh);
    this.droppedBomb = { mesh, pos: mesh.position };
    if (a.team === 'T') this.hud.chat(`<b class="t">${a.name}</b> dropped the bomb`);
  }

  // ------------------------------------------------ per-frame
  update(dt) {
    this.now += dt;
    const now = this.now;
    // phase transitions
    if (this.phase === 'freeze' && now >= this.phaseEnd) {
      this.phase = 'live';
      this.sound.roundStart();
      this.hud.center('', 0);
      for (const a of this.actors) if (a.brain) a.brain.go();
    }
    if (this.phase === 'live' && !this.bomb && now >= this.roundTimeEnd) this.endRound('CT', 'time');
    if (this.phase === 'post' && now >= this.roundEndAt) {
      if (this.matchOver) { this.phase = 'over'; this.onMatchOver && this.onMatchOver(); return; }
      this.newRound();
    }

    for (const a of this.actors) if (a.brain && a.alive) a.brain.update(dt);
    for (const a of this.actors) this.updateActor(a, dt);
    this.separate();
    this.updateGrenades(dt);
    this.updateBomb(dt);
    this.updateItems();
    this.updateSpotting(dt);
  }

  frozen(a) { return this.phase === 'freeze' || a.plantProg > 0 || a.defuseProg > 0 || this.phase === 'over'; }

  updateActor(a, dt) {
    const now = this.now;
    const m = a.model;
    if (!a.alive) { m.root.visible = true; m.update(dt, {}); return; }
    const inp = a.input;
    // --- ducking
    if (inp.crouch && !a.ducked) {
      a.ducked = true;
      if (!a.onGround && !this.world.collides(a.pos.x, a.pos.y + 0.46, a.pos.z, a.hw, CROUCH_H)) { a.pos.y += 0.46; a.eyeH -= 0.46; }
    } else if (!inp.crouch && a.ducked) {
      if (a.onGround) {
        if (!this.world.collides(a.pos.x, a.pos.y + 0.01, a.pos.z, a.hw, STAND_H)) a.ducked = false;
      } else if (a.pos.y - 0.46 > 0 && !this.world.collides(a.pos.x, a.pos.y - 0.46, a.pos.z, a.hw, STAND_H)) { a.pos.y -= 0.46; a.eyeH += 0.46; a.ducked = false; }
      else if (!this.world.collides(a.pos.x, a.pos.y + 0.01, a.pos.z, a.hw, STAND_H)) a.ducked = false;
    }
    a.h = a.ducked ? CROUCH_H : STAND_H;
    const eyeT = a.ducked ? EYE_CROUCH : EYE_STAND;
    a.eyeH += (eyeT - a.eyeH) * Math.min(1, dt * 14);

    // --- movement
    const wish = this._v.copy(inp.move); wish.y = 0;
    let wishSpeed = wish.length() > 0.01 ? a.maxSpeed : 0;
    if (wishSpeed) wish.normalize();
    if (this.frozen(a)) wishSpeed = 0;
    const wasGround = a.onGround, vy0 = a.vel.y;
    const jumpPress = inp.jump && !a.prev.jump;
    if (a.onGround && jumpPress && !this.frozen(a)) {
      a.vel.y = JUMP_V; a.onGround = false; a.jumped = true;
      this.airAccel(a.vel, wish, wishSpeed, dt);
    } else if (a.onGround) {
      this.friction(a.vel, dt);
      this.accel(a.vel, wish, wishSpeed, ACCEL, dt);
    } else this.airAccel(a.vel, wish, wishSpeed, dt);
    a.vel.y -= GRAV * dt;
    // cap horizontal speed to avoid silliness
    const sp = a.speed2d, cap = 12;
    if (sp > cap) { a.vel.x *= cap / sp; a.vel.z *= cap / sp; }
    a.stepAir = false;
    this.world.moveBody(a, dt);
    if (!wasGround && a.onGround && vy0 < -3) {
      if (a === this.viewActor) { this.vm.state.land = Math.min(1, -vy0 / 8); }
      this.sound.land(a === this.player ? null : a.pos, Math.min(1, -vy0 / 10) * 0.6);
    }
    // footsteps
    if (a.onGround) {
      const s = a.speed2d;
      if (s > 135 * U && !inp.walk && !a.ducked) {
        a.stepDist += s * dt;
        if (a.stepDist > 2.1) {
          a.stepDist = 0;
          const surf = this.world.floorMat[this.world.idx(this.world.cellX(a.pos.x), this.world.cellZ(a.pos.z))] || 0;
          this.sound.footstep(a === this.player ? null : a.pos, a === this.player ? 0.22 : 0.55, surf);
          a.lastNoise = now;
        }
      }
    }

    // --- weapons
    const w = a.cur, d = w.def;
    if (a.reloading && now >= a.reloadEnd) {
      a.reloading = false;
      const need = d.mag - w.ammo, take = Math.min(need, w.reserve);
      w.ammo += take; w.reserve -= take;
    }
    if (a.rezoomAt && now >= a.rezoomAt) { a.zoom = a.rezoomLevel; a.rezoomAt = 0; }
    // recoil recovery
    if (now - a.lastShot > 60 / (d.rpm || 600) + 0.05) a.recoilIdx = Math.max(0, a.recoilIdx - dt * (d.type === 'rifle' || d.type === 'smg' ? 11 : 6));
    const insp = d.inacc;
    if (insp) a.accum *= Math.exp(-dt * 3 / insp.recover);
    const pat = d.pattern;
    if (pat) {
      const i0 = Math.min(pat.length - 1, Math.floor(a.recoilIdx)), i1 = Math.min(pat.length - 1, i0 + 1), f = a.recoilIdx - Math.floor(a.recoilIdx);
      const tx = (pat[i0][0] * (1 - f) + pat[i1][0] * f) * 0.5, ty = (pat[i0][1] * (1 - f) + pat[i1][1] * f) * 0.5;
      a.punch.x += (tx - a.punch.x) * Math.min(1, dt * 25);
      a.punch.y += (ty - a.punch.y) * Math.min(1, dt * 25);
    } else { a.punch.x *= Math.exp(-dt * 10); a.punch.y *= Math.exp(-dt * 10); }
    a.flinch *= Math.exp(-dt * 10);

    // fire input
    const firePress = inp.fire && !a.prev.fire, fire2Press = inp.fire2 && !a.prev.fire2;
    const canAct = this.phase !== 'freeze' && this.phase !== 'over' && now >= a.drawEnd && a.plantProg <= 0 && a.defuseProg <= 0;
    if (d.type === 'grenade') {
      if (canAct && (firePress || fire2Press) && !a.pulling) { a.pulling = true; a.pullStrong = firePress; a.pullStart = now; if (a === this.player) this.sound.pin(); }
      if (a.pulling && !inp.fire && !inp.fire2 && now - a.pullStart > 0.15) { this.throwGrenade(a, a.pullStrong); a.pulling = false; }
    } else if (d.type === 'c4') {
      // handled by plant logic
    } else if (canAct) {
      if (d.type === 'knife') {
        if (inp.fire && now >= a.nextFire) this.knife(a, false);
        else if (inp.fire2 && now >= a.nextFire) this.knife(a, true);
      } else {
        if (fire2Press && d.scope) {
          a.zoom = (a.zoom + 1) % (d.scope.length + 1); a.rezoomAt = 0;
          if (a === this.player) this.sound.click(null, 3000, 0.15);
        }
        if ((d.auto ? inp.fire : firePress) && now >= a.nextFire) {
          if (a.reloading) { if (d.shellReload && w.ammo > 0) a.reloading = false; }
          if (!a.reloading) {
            if (w.ammo > 0) this.shoot(a);
            else if (firePress) {
              if (a === this.player) this.sound.dryFire();
              a.nextFire = now + 0.2;
              if (w.reserve > 0) a.startReload();
            }
          }
        }
      }
    }
    // --- plant / defuse
    this.updatePlantDefuse(a, dt);

    a.prev.fire = inp.fire; a.prev.fire2 = inp.fire2; a.prev.jump = inp.jump;

    // --- model
    m.root.position.copy(a.pos);
    m.root.rotation.y = a.yaw;
    m.setWeapon(d.id);
    m.update(dt, { speed: a.speed2d, crouch: a.ducked ? 1 : 0, pitch: a.pitch, onGround: a.onGround, recoil: Math.min(1, a.punch.y * 0.3), planting: a.plantProg > 0 || a.defuseProg > 0 });
    m.root.visible = a !== this.viewActor || this.thirdPerson;
  }

  friction(v, dt) {
    const sp = Math.hypot(v.x, v.z);
    if (sp < 0.01) { v.x = v.z = 0; return; }
    const control = sp < STOP_SPEED ? STOP_SPEED : sp;
    const ns = Math.max(sp - control * FRICTION * dt, 0) / sp;
    v.x *= ns; v.z *= ns;
  }
  accel(v, wish, ws, acc, dt) {
    const cur = v.x * wish.x + v.z * wish.z;
    const add = ws - cur; if (add <= 0) return;
    const as = Math.min(acc * dt * ws, add);
    v.x += as * wish.x; v.z += as * wish.z;
  }
  airAccel(v, wish, ws, dt) {
    const w = Math.min(ws, AIR_CAP);
    const cur = v.x * wish.x + v.z * wish.z;
    const add = w - cur; if (add <= 0) return;
    const as = Math.min(AIR_ACCEL * ws * dt, add);
    v.x += as * wish.x; v.z += as * wish.z;
  }
  separate() {
    const A = this.actors;
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
      const a = A[i], b = A[j];
      if (!a.alive || !b.alive) continue;
      if (Math.abs(a.pos.y - b.pos.y) > 1.6) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = 0.66;
      if (d < min && d > 1e-4) {
        const push = (min - d) / 2, nx = dx / d, nz = dz / d;
        const tryMove = (act, sx, sz) => { if (!this.world.collides(act.pos.x + sx, act.pos.y + 0.01, act.pos.z + sz, act.hw, act.h)) { act.pos.x += sx; act.pos.z += sz; } };
        tryMove(a, -nx * push, -nz * push); tryMove(b, nx * push, nz * push);
      }
    }
  }

  // ------------------------------------------------ shooting
  inaccuracy(a) {
    const d = a.curDef, I = d.inacc;
    if (!I) return 0;
    let base = a.ducked ? I.crouch : I.stand;
    if (d.scope && a.zoom === 0) base = I.stand;
    if (d.scope && a.zoom > 0) base = d.scopedInacc;
    const sp = a.speed2d, ms = d.speed * U;
    const moveFrac = Math.max(0, Math.min(1, (sp - ms * 0.34) / (ms * 0.66)));
    let inc = base + moveFrac * I.move + a.accum;
    if (!a.onGround) inc += I.jump;
    return inc;
  }

  shoot(a) {
    const now = this.now, w = a.cur, d = w.def;
    w.ammo--;
    a.nextFire = now + 60 / d.rpm;
    a.lastShot = now;
    const eye = a.eye(new THREE.Vector3());
    const inacc = this.inaccuracy(a);
    const pat = d.pattern || [[0, 0]];
    const pi = Math.min(pat.length - 1, Math.floor(a.recoilIdx));
    const comp = a.brain ? a.brain.recoilComp : 0;
    const rx = pat[pi][0] * (1 - comp), ry = pat[pi][1] * (1 - comp);
    const pellets = d.pellets || 1;
    let hitAny = false;
    const muzzle = new THREE.Vector3();
    if (a === this.viewActor && !this.thirdPerson) muzzle.copy(eye).add(this._v2.set(0, -0.12, 0)).addScaledVector(a.forward(this._v), 0.5);
    else { a.model.root.updateMatrixWorld(true); a.model.muzzleWorld(muzzle); }
    for (let p = 0; p < pellets; p++) {
      const ang = Math.random() * Math.PI * 2;
      const r = (d.spreadFixed ? d.spreadFixed * Math.sqrt(Math.random()) : 0) + inacc * Math.random();
      const yaw = a.yaw - rx * DEG + Math.cos(ang) * r;
      const pitch = a.pitch + ry * DEG + Math.sin(ang) * r;
      const cp = Math.cos(pitch);
      const dir = new THREE.Vector3(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
      const res = this.trace(a, eye, dir, 200);
      if (res.victim) {
        hitAny = true;
        this.hitActor(a, res, dir, d);
      } else if (res.world) {
        this.effects.impact(res.world, dir);
        if (Math.random() < 0.3) this.sound.ricochet(new THREE.Vector3(res.world.x, res.world.y, res.world.z));
      }
      const end = res.point;
      if (p === 0 || Math.random() < 0.3) {
        if (a !== this.viewActor || (a.recoilIdx % 3 < 1)) this.effects.tracer(muzzle, end);
      }
    }
    a.recoilIdx += 1;
    if (d.inacc) a.accum = Math.min(a.accum + d.inacc.fire, d.inacc.fire * 7);
    // sound & flash
    this.sound.gun(d.sound, a === this.viewActor ? null : eye.clone(), 1);
    if (a !== this.viewActor || this.thirdPerson) {
      if (!d.silenced) this.effects.muzzleFlash(muzzle, d.type === 'sniper' ? 1.4 : 1);
    } else {
      this.vm.fire(d.type === 'sniper' ? 1.4 : d.type === 'pistol' ? 0.8 : 0.6);
      if (!d.silenced) this.effects.light(muzzle, 0xffb060, 5, 7, 0.05);
    }
    if (d.bolt) {
      if (a.zoom > 0) { a.rezoomLevel = a.zoom; a.zoom = 0; a.rezoomAt = now + 60 / d.rpm * 0.85; }
      if (w.ammo > 0) this.sound.boltCycle(a === this.viewActor ? null : a.pos);
    }
    // alert bots about noise
    a.lastNoise = now; a.lastShotPos = eye;
    for (const b of this.actors) if (b.brain && b.alive) b.brain.hearShot(a, eye);
    if (w.ammo === 0 && w.reserve > 0 && a.brain) a.startReload();
  }

  // returns {victim, group, dist, point, world}
  trace(shooter, o, dir, maxD) {
    const hit = this.world.raycast(o, dir, maxD, {});
    let best = hit ? hit.t : maxD;
    let victim = null, group = null;
    for (const b of this.actors) {
      if (b === shooter || !b.alive || b.team === shooter.team) continue;
      const boxes = this.hitboxes(b);
      for (const hb of boxes) {
        const t = rayBox(o, dir, hb.a, hb.b);
        if (t !== null && t < best) { best = t; victim = b; group = hb.g; }
      }
    }
    const point = o.clone().addScaledVector(dir, best);
    return { victim, group, dist: best, point, world: victim ? null : hit };
  }
  hitboxes(b) {
    const p = b.pos, h = b.h, ey = p.y + b.eyeH;
    const f = this._v2.set(-Math.sin(b.yaw), 0, -Math.cos(b.yaw));
    const hx = p.x + f.x * 0.02, hz = p.z + f.z * 0.02;
    return [
      { g: 'head', a: [hx - 0.13, ey - 0.12, hz - 0.13], b: [hx + 0.13, ey + 0.17, hz + 0.13] },
      { g: 'chest', a: [p.x - 0.24, p.y + h * 0.56, p.z - 0.24], b: [p.x + 0.24, ey - 0.12, p.z + 0.24] },
      { g: 'stomach', a: [p.x - 0.2, p.y + h * 0.43, p.z - 0.2], b: [p.x + 0.2, p.y + h * 0.56, p.z + 0.2] },
      { g: 'legs', a: [p.x - 0.2, p.y, p.z - 0.2], b: [p.x + 0.2, p.y + h * 0.43, p.z + 0.2] },
    ];
  }
  hitActor(a, res, dir, d) {
    const b = res.victim, g = res.group;
    let dmg = d.dmg * Math.pow(d.falloff, res.dist / (500 * U));
    const mult = { head: 4, chest: 1, stomach: 1.25, legs: 0.75 }[g];
    dmg *= mult;
    const armored = g === 'head' ? b.helmet && b.armor > 0 : g !== 'legs' && b.armor > 0;
    const p = res.point;
    if (g === 'head') this.sound.headshot(p, armored);
    else this.sound.hitFlesh(p);
    this.effects.bloodHit(p.x, p.y, p.z, dir, g === 'head');
    // blood on wall behind
    const behind = this.world.raycast(p, dir, 3, {});
    if (behind) this.effects.bloodSplat(behind.x, behind.y, behind.z, behind.n, 0.5 + Math.random() * 0.5);
    this.damage(b, a, dmg, armored, d.pen, d.id, g === 'head', dir);
    if (a === this.player) this.hud.hitConfirm && this.hud.hitConfirm(g === 'head');
  }

  damage(b, a, dmg, armored, pen, weaponId, headshot, dir) {
    if (!b.alive) return;
    let hp = dmg;
    if (armored) {
      hp = dmg * pen;
      const armorDmg = (dmg - hp) * 0.5;
      if (armorDmg > b.armor) { hp += (armorDmg - b.armor) * 2; b.armor = 0; }
      else b.armor = Math.max(0, b.armor - armorDmg);
    }
    hp = Math.max(1, Math.floor(hp));
    const dealt = Math.min(hp, b.health);
    b.health -= hp;
    b.flinch = 1; b.model.flinch = 1;
    if (a && a !== b) {
      a.stats.dmg += dealt;
      b.dmgBy.set(a, (b.dmgBy.get(a) || 0) + dealt);
      if (a === this.player) { this.player.roundDamage = (this.player.roundDamage || 0) + dealt; this.lastDealt = { to: b.name, dmg: dealt }; }
      if (b.brain) b.brain.onDamaged(a);
    }
    if (b === this.player) {
      if (a && a !== b) this.hud.damageFrom(a.pos, this.player);
      this.sound.hitMarkerSelf();
      this.lastTakenFrom = a;
    }
    if (b === this.player || b === this.viewActor) this.player.shake = 0.3;
    if (b.health <= 0) { b.health = 0; this.kill(b, a, weaponId, headshot, dir); }
  }

  kill(b, a, weaponId, headshot, dir) {
    b.alive = false;
    b.stats.d++;
    b.pulling = false; b.plantProg = 0; b.defuseProg = 0;
    const toKiller = a ? Math.atan2(a.pos.x - b.pos.x, a.pos.z - b.pos.z) : 0;
    const rel = Math.cos(toKiller - (b.yaw + Math.PI));
    b.model.die(rel >= 0 ? 1 : -1);
    // drop best gun + bomb
    if (b.inv[1]) this.dropWeapon(b, 1); else if (b.inv[2]) this.dropWeapon(b, 2);
    if (b.inv[5]) { b.inv[5] = null; this.dropBomb(b); }
    if (a && a !== b && weaponId !== 'c4') {
      if (a.team !== b.team) {
        a.stats.k++; a.roundKills++;
        if (headshot) a.stats.hs++;
        const reward = (WEAPONS[weaponId] && WEAPONS[weaponId].reward) || 300;
        a.money = Math.min(16000, a.money + reward);
        if (a === this.player) this.hud.moneyDelta(reward);
      } else { a.stats.k--; a.money = Math.max(0, a.money - 300); }
    }
    // assists
    for (const [att, dmg] of b.dmgBy) if (att !== a && att.team !== b.team && dmg >= 41) att.stats.a++;
    this.hud.killfeed(a, b, weaponId, headshot, a === this.player || b === this.player);
    if (b === this.player) {
      this.hud.deathPanel(a, weaponId, headshot, this);
      this.player.spectate = null;
      this.deathCamUntil = this.now + 2.5;
    }
    for (const x of this.actors) if (x.brain && x.alive) x.brain.onKill(b, a);
    if (b.team === 'CT') this.teamAlert('CT', b.pos, b);
    this.checkRoundEnd();
  }

  knife(a, heavy) {
    const now = this.now;
    a.nextFire = now + (heavy ? 1.1 : 0.45);
    if (a === this.player) { this.vm.swing(heavy); this.sound.knifeSwing(); }
    const eye = a.eye(new THREE.Vector3()), f = a.forward(new THREE.Vector3());
    const range = heavy ? 1.5 : 1.8;
    let best = null, bd = range;
    for (const b of this.actors) {
      if (!b.alive || b.team === a.team) continue;
      const c = new THREE.Vector3(b.pos.x, Math.min(Math.max(eye.y, b.pos.y + 0.5), b.pos.y + b.eyeH), b.pos.z);
      const to = c.clone().sub(eye); const dist = to.length();
      if (dist > range + 0.35) continue;
      to.normalize();
      if (to.dot(f) < 0.8) continue;
      if (!this.world.los(eye, c)) continue;
      if (dist < bd + 0.35) { best = b; bd = dist; }
    }
    if (best) {
      const bf = new THREE.Vector3(-Math.sin(best.yaw), 0, -Math.cos(best.yaw));
      const fromA = new THREE.Vector3(best.pos.x - a.pos.x, 0, best.pos.z - a.pos.z).normalize();
      const backstab = bf.dot(fromA) > 0.5;
      const dmg = heavy ? (backstab ? 180 : 65) : (backstab ? 90 : 40);
      this.sound.knifeHit(best.pos);
      this.effects.bloodHit(best.pos.x, best.pos.y + 1.2, best.pos.z, f, false);
      this.damage(best, a, dmg, best.armor > 0, 0.85, 'knife', false, f);
    } else {
      const hit = this.world.raycast(eye, f, range, {});
      if (hit) { this.sound.knifeWall(new THREE.Vector3(hit.x, hit.y, hit.z)); this.effects.impact(hit, f); }
    }
  }

  // ------------------------------------------------ grenades
  throwGrenade(a, strong) {
    const w = a.cur, id = w.def.id;
    const idx = a.inv[4].indexOf(w);
    if (idx >= 0) a.inv[4].splice(idx, 1);
    const eye = a.eye(new THREE.Vector3()), f = a.forward(new THREE.Vector3());
    const pitch = a.pitch + (strong ? 0.12 : 0.05);
    const cp = Math.cos(pitch);
    const dir = new THREE.Vector3(-Math.sin(a.yaw) * cp, Math.sin(pitch), -Math.cos(a.yaw) * cp);
    const speed = strong ? 17 : 8;
    const vel = dir.multiplyScalar(speed).add(new THREE.Vector3(a.vel.x, Math.max(0, a.vel.y), a.vel.z).multiplyScalar(1.1));
    const mesh = buildWeaponModel(id);
    mesh.scale.setScalar(1.3);
    const pos = eye.clone().addScaledVector(f, 0.3);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.grenades.push({ id, owner: a, pos, vel, mesh, t: 0, rest: 0, spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, 0) });
    if (a === this.player) { this.vm.throwAnim(); this.sound.throwSnd(); }
    const line = { he: 'Fire in the hole!', flash: 'Flashbang out!', smoke: 'Smoke out!' }[id];
    if (a.squad === this.player.squad && a !== this.player) this.hud.chat(`<b class="${a.team === 'T' ? 't' : 'ct'}">${a.name}</b> (RADIO): ${line}`);
    // switch to next weapon
    a.pulling = false;
    if (a.inv[4].length) { a.gi = Math.min(a.gi, a.inv[4].length - 1); a.drawEnd = this.now + 0.5; if (a === this.player) this.onPlayerWeaponChange(); }
    else { a.slot = 0; a.select(a.lastSlot && a.lastSlot !== 4 && a.inv[a.lastSlot] ? a.lastSlot : a.bestSlot(), true); if (a === this.player) this.onPlayerWeaponChange(); }
  }

  updateGrenades(dt) {
    const now = this.now;
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.t += dt;
      if (g.rest < 1) {
        g.vel.y -= GRAV * 0.4 * dt;
        const step = g.vel.clone().multiplyScalar(dt);
        const len = step.length();
        if (len > 0) {
          const dir = step.clone().divideScalar(len);
          const hit = this.world.raycast(g.pos, dir, len + 0.06, {});
          if (hit) {
            const n = new THREE.Vector3(...hit.n);
            g.pos.set(hit.x, hit.y, hit.z).addScaledVector(n, 0.07);
            const vn = g.vel.dot(n);
            g.vel.addScaledVector(n, -1.45 * vn);
            g.vel.multiplyScalar(0.62);
            if (Math.abs(vn) > 1.5) this.sound.bounce(g.pos.clone());
            if (n.y > 0.7 && g.vel.length() < 1) { g.rest = 1; g.vel.set(0, 0, 0); }
          } else g.pos.add(step);
        }
        g.mesh.rotation.x += g.spin.x * dt; g.mesh.rotation.y += g.spin.y * dt;
        if (g.rest >= 1) g.restAt = now;
      }
      g.mesh.position.copy(g.pos);
      let det = false;
      if (g.id === 'he' || g.id === 'flash') det = g.t > 1.6;
      if (g.id === 'smoke') det = (g.rest >= 1 && g.t > 0.8) || g.t > 3.5;
      if (det) {
        this.detonate(g);
        this.scene.remove(g.mesh);
        this.grenades.splice(i, 1);
      }
    }
  }

  detonate(g) {
    const p = g.pos, now = this.now;
    if (g.id === 'he') {
      this.effects.explosion(p);
      this.sound.explosion(p.clone(), false);
      for (const b of this.actors) {
        if (!b.alive) continue;
        const c = new THREE.Vector3(b.pos.x, b.pos.y + 1.0, b.pos.z);
        const d = c.distanceTo(p);
        if (d > 9) continue;
        if (!this.world.los(p.clone().setY(p.y + 0.2), c)) continue;
        const dmg = 98 * (1 - d / 9);
        if (b.team === g.owner.team && b !== g.owner) continue;
        this.damage(b, g.owner, dmg, b.armor > 0, 0.575, 'he', false, c.clone().sub(p).normalize());
      }
      this.shakeAt(p, 14, 0.6);
    } else if (g.id === 'flash') {
      this.effects.flashPop(p);
      this.sound.flashPop(p.clone());
      for (const b of this.actors) {
        if (!b.alive) continue;
        const e = b.eye(new THREE.Vector3());
        const to = p.clone().sub(e); const d = to.length();
        if (d > 32) continue;
        if (!this.world.los(e, p) || this.effects.smokeBlocks(e, p, now)) continue;
        to.normalize();
        const dot = to.dot(b.forward(new THREE.Vector3()));
        let dur = dot > 0.5 ? 4.2 : dot > 0 ? 2.2 : dot > -0.5 ? 0.9 : 0.35;
        dur *= Math.max(0.3, 1 - d / 40);
        if (dur < 0.3) continue;
        b.flashEnd = now + dur; b.flashDur = dur;
        if (b === this.player) this.hud.flash(dur, this.sound);
        if (b.brain) b.brain.flashed(dur);
      }
    } else if (g.id === 'smoke') {
      this.effects.smokeCloud(p, now);
      this.sound.smokeHiss(p.clone());
    }
  }

  shakeAt(p, radius, amt) {
    const d = this.player.eye(new THREE.Vector3()).distanceTo(p);
    if (d < radius) this.player.shake = Math.max(this.player.shake || 0, amt * (1 - d / radius));
  }

  // ------------------------------------------------ bomb
  updatePlantDefuse(a, dt) {
    const now = this.now;
    // planting: hold fire with C4 selected, or hold use while carrying
    if (a.team === 'T' && a.inv[5] && a.input.use && a.slot !== 5 && this.phase === 'live' && this.world.siteAt(a.pos.x, a.pos.z)) a.select(5);
    const planting = a.team === 'T' && a.inv[5] && a.slot === 5 && (a.input.fire || a.input.use) && this.phase === 'live' && this.now >= a.drawEnd;
    if (planting) {
      const site = this.world.siteAt(a.pos.x, a.pos.z);
      if (!site || !a.onGround) {
        if (a === this.player && a.plantProg === 0 && !a._warned) { this.hud.hint('You must be in a bomb site to plant', 1.5); a._warned = true; }
        a.plantProg = 0;
      } else {
        if (a.plantProg === 0) { a.plantSite = site; }
        a.plantProg += dt;
        if (Math.random() < dt * 5 && a === this.player) this.sound.keypad();
        if (a.plantProg >= 3.2) this.plantBomb(a, site);
      }
    } else { a.plantProg = 0; a._warned = false; }

    // defusing
    if (a.team === 'CT' && this.bomb && !this.bomb.defused && this.phase === 'live') {
      const near = a.pos.distanceTo(this.bomb.pos) < 1.9;
      if (near && a.input.use && a.onGround) {
        if (!this.bomb.defuser || this.bomb.defuser === a) {
          if (a.defuseProg === 0) {
            this.bomb.defuser = a;
            this.bomb.defuseTime = a.defuser ? 5 : 10;
            this.sound.click(this.bomb.pos, 1500, 0.5);
            if (a.squad === this.player.squad && a !== this.player) this.hud.chat(`<b class="ct">${a.name}</b> is defusing the bomb`);
          }
          a.defuseProg += dt;
          if (Math.random() < dt * 3) this.sound.defuseTick(this.bomb.pos);
          if (a.defuseProg >= this.bomb.defuseTime) this.defuse(a);
        }
      } else if (a.defuseProg > 0) { a.defuseProg = 0; if (this.bomb.defuser === a) this.bomb.defuser = null; }
    } else a.defuseProg = 0;
  }

  plantBomb(a, site) {
    a.plantProg = 0;
    a.inv[5] = null;
    a.slot = 0; a.select(a.bestSlot(), true);
    if (a === this.player) this.onPlayerWeaponChange();
    const mesh = buildWeaponModel('c4');
    mesh.scale.setScalar(1.4);
    mesh.position.set(a.pos.x, a.pos.y + 0.03, a.pos.z);
    mesh.rotation.y = a.yaw;
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    led.position.set(0.05, 0.05, -0.1); mesh.add(led);
    this.scene.add(mesh);
    this.bomb = { pos: mesh.position.clone(), mesh, led, site, planter: a, plantedAt: this.now, explodeAt: this.now + 40, nextBeep: this.now + 1, defuser: null };
    a.money += 300;
    this.sound.say('The bomb has been planted.', 1.0, 0.7);
    this.hud.center('The bomb has been planted.', 3, 'bomb');
    this.hud.chat(`<b class="t">${a.name}</b> planted the bomb at <b>${site}</b>`);
    for (const x of this.actors) if (x.brain) x.brain.onBombPlanted(this.bomb);
  }

  defuse(a) {
    this.bomb.defused = true;
    a.defuseProg = 0;
    a.money += 300;
    this.sound.say('The bomb has been defused.', 1.0, 0.7);
    this.bombDefuser = a;
    this.endRound('CT', 'defuse');
  }

  updateBomb(dt) {
    const b = this.bomb;
    if (!b || b.defused || b.exploded) return;
    const now = this.now;
    const rem = b.explodeAt - now;
    if (now >= b.nextBeep) {
      this.sound.beep(b.pos.clone(), rem < 10);
      b.led.visible = true; b.ledOff = now + 0.08;
      const frac = Math.max(0, rem / 40);
      b.nextBeep = now + Math.max(0.12, 0.12 + 0.88 * Math.pow(frac, 1.3));
    }
    if (b.ledOff && now > b.ledOff) b.led.visible = false;
    if (rem <= 0 && this.phase !== 'over') {
      b.exploded = true;
      this.effects.explosion(b.pos); this.effects.explosion(b.pos.clone().add(new THREE.Vector3(0, 2, 0)));
      this.sound.explosion(b.pos.clone(), true);
      this.shakeAt(b.pos, 60, 1.5);
      if (this.phase === 'live') this.endRound('T', 'bomb');
      for (const x of this.actors) {
        if (!x.alive) continue;
        const d = x.pos.distanceTo(b.pos);
        const dmg = 500 * Math.exp(-(d * d) / (2 * 9 * 9));
        if (dmg > 1) this.damage(x, b.planter, dmg, x.armor > 0, 0.5, 'c4', false, x.pos.clone().sub(b.pos).normalize());
      }
      this.scene.remove(b.mesh);
    }
  }

  updateItems() {
    // weapon pickup (walk over when slot empty) & bomb pickup
    for (const a of this.actors) {
      if (!a.alive) continue;
      if (this.droppedBomb && a.team === 'T' && !a.inv[5] && a.pos.distanceTo(this.droppedBomb.pos) < 1.1) {
        a.inv[5] = newWeapon('c4');
        this.scene.remove(this.droppedBomb.mesh); this.droppedBomb = null;
        if (a === this.player) this.hud.hint('You picked up the bomb', 2);
        else if (a.squad === this.player.squad) this.hud.chat(`<b class="t">${a.name}</b> picked up the bomb`);
      }
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        if (this.now - it.t < 1) continue;
        const slot = it.w.def.slot;
        if (a.inv[slot]) continue;
        if (a.pos.distanceTo(it.mesh.position) < 1.1) {
          a.inv[slot] = it.w;
          this.scene.remove(it.mesh); this.items.splice(i, 1);
          if (a === this.player) { this.sound.draw('gun'); this.hud.hint('Picked up ' + it.w.def.name, 1.5); }
          if (a.brain && slot < a.slot) { a.slot = 0; a.select(slot, true); }
        }
      }
    }
  }
  // Player presses E near a weapon to swap
  tryPickup(a) {
    let best = null, bd = 2.2;
    const eye = a.eye(new THREE.Vector3()), f = a.forward(new THREE.Vector3());
    for (const it of this.items) {
      const to = it.mesh.position.clone().sub(eye); const d = to.length();
      if (d < bd && to.normalize().dot(f) > 0.6) { best = it; bd = d; }
    }
    if (!best) return false;
    const slot = best.w.def.slot;
    if (a.inv[slot]) this.dropWeapon(a, slot, true);
    a.inv[slot] = best.w;
    this.scene.remove(best.mesh); this.items.splice(this.items.indexOf(best), 1);
    a.slot = 0; a.select(slot);
    return true;
  }

  updateSpotting(dt) {
    this.spotT = (this.spotT || 0) - dt;
    if (this.spotT > 0) return;
    this.spotT = 0.15;
    const now = this.now;
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), f = new THREE.Vector3();
    for (const a of this.actors) {
      if (!a.alive) continue;
      a.eye(e1); a.forward(f);
      for (const b of this.actors) {
        if (!b.alive || b.team === a.team) continue;
        e2.set(b.pos.x, b.pos.y + b.eyeH - 0.1, b.pos.z);
        const to = e2.clone().sub(e1); const d = to.length();
        if (d > 90) continue;
        if (to.normalize().dot(f) < 0.35) continue;
        if (this.world.los(e1, e2) && !this.effects.smokeBlocks(e1, e2, now)) {
          if (a.squad === this.player.squad) b.spotted = now + 1.2;
        }
      }
    }
  }

  // ------------------------------------------------ round end
  checkRoundEnd() {
    if (this.phase !== 'live' && this.phase !== 'freeze') return;
    const t = this.alive('T').length, ct = this.alive('CT').length;
    if (ct === 0) this.endRound('T', 'elim');
    else if (t === 0 && !this.bomb) this.endRound('CT', 'elim');
  }

  endRound(winner, reason) {
    if (this.phase === 'post') return;
    this.phase = 'post';
    this.roundEndAt = this.now + 6;
    const loser = winner === 'T' ? 'CT' : 'T';
    const winSquad = this.actors.find(a => a.team === winner).squad;
    this.score[winSquad]++;
    // money
    const winMoney = reason === 'bomb' || reason === 'defuse' ? 3500 : 3250;
    const lossMoney = [1400, 1900, 2400, 2900, 3400][Math.min(4, this.lossStreak[loser] - 1)];
    for (const a of this.actors) {
      if (a.team === winner) a.money += winMoney;
      else {
        let m = lossMoney;
        if (a.team === 'T' && reason === 'time' && a.alive) m = 0; // survivors get nothing when time runs out
        if (a.team === 'T' && this.bomb && reason === 'defuse') m += 800;
        a.money += m;
      }
      a.money = Math.min(16000, a.money);
    }
    this.lossStreak[loser] = Math.min(5, this.lossStreak[loser] + 1);
    this.lossStreak[winner] = Math.max(1, this.lossStreak[winner] - 1);
    // MVP
    let mvp = null;
    if (reason === 'defuse') mvp = this.bombDefuser;
    else if (reason === 'bomb') mvp = this.bomb.planter;
    else mvp = this.actors.filter(a => a.team === winner).sort((x, y) => y.roundKills - x.roundKills)[0];
    if (mvp) mvp.stats.mvp++;
    const text = winner === 'CT' ? 'Counter-Terrorists Win' : 'Terrorists Win';
    this.sound.say(winner === 'CT' ? 'Counter-Terrorists win.' : 'Terrorists win.', 1.0, 0.7);
    const playerWon = this.player.team === winner;
    this.sound.mvp(playerWon);
    const reasonText = { elim: winner === 'CT' ? 'All Terrorists eliminated' : 'All Counter-Terrorists eliminated', time: 'Target saved', bomb: 'Target bombed', defuse: 'The bomb has been defused' }[reason];
    let mvpText = '';
    if (mvp) {
      mvpText = reason === 'defuse' ? `MVP: ${mvp.name} for defusing the bomb` : reason === 'bomb' ? `MVP: ${mvp.name} for planting the bomb` : `MVP: ${mvp.name} for most eliminations`;
    }
    this.hud.banner(winner, text, reasonText, mvpText);
    // match over?
    if (this.score[winSquad] >= this.winTarget || this.round >= this.maxRounds) {
      this.matchOver = true;
      this.roundEndAt = this.now + 7;
    }
    this.bombDefuser = null;
  }

  onPlayerWeaponChange(silent) {
    const a = this.player;
    this.vm.set(a.curDef.id, a.team);
    if (!silent) this.sound.draw(a.curDef.type);
  }
}

// slab test; returns t or null
export function rayBox(o, d, a, b) {
  let tmin = -Infinity, tmax = Infinity;
  const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dd[i]) < 1e-12) { if (oo[i] < a[i] || oo[i] > b[i]) return null; continue; }
    let t1 = (a[i] - oo[i]) / dd[i], t2 = (b[i] - oo[i]) / dd[i];
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return tmin >= 0 ? tmin : 0;
}
