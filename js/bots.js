// Bot AI: buying, navigation, objective play, target acquisition, aiming and shooting.
import * as THREE from 'three';

const DIFF = {
  easy: { react: [0.6, 0.95], turn: 3.2, aimErr: 0.1, settle: 0.9, hs: 0.12, comp: 0.35, spray: 4, fovCos: 0.45 },
  normal: { react: [0.34, 0.58], turn: 5.5, aimErr: 0.06, settle: 0.6, hs: 0.28, comp: 0.6, spray: 6, fovCos: 0.35 },
  hard: { react: [0.22, 0.36], turn: 9, aimErr: 0.035, settle: 0.42, hs: 0.42, comp: 0.8, spray: 8, fovCos: 0.25 },
  expert: { react: [0.14, 0.25], turn: 14, aimErr: 0.02, settle: 0.3, hs: 0.58, comp: 0.9, spray: 10, fovCos: 0.15 },
};

const wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export class Bot {
  constructor(actor, game) {
    this.a = actor; this.g = game;
    this.d = DIFF[game.difficulty] || DIFF.normal;
    this.recoilComp = this.d.comp;
    this.v = new THREE.Vector3(); this.v2 = new THREE.Vector3();
  }
  get w() { return this.g.world; }
  cellPos([cx, cz]) { return { x: this.w.cx2x(cx) + (Math.random() - 0.5) * 1.0, z: this.w.cz2z(cz) + (Math.random() - 0.5) * 1.0 }; }

  newRound() {
    this.d = DIFF[this.g.difficulty] || DIFF.normal;
    this.recoilComp = this.d.comp;
    this.path = null; this.pi = 0; this.goal = null; this.queue = [];
    this.mode = 'idle'; this.target = null; this.lookAt = null; this.lookUntil = 0; this.holdLook = null;
    this.blindUntil = 0; this.nextPerceive = 0; this.stuckT = 0; this.lastPos = this.a.pos.clone(); this.stuckCount = 0;
    this.burst = 0; this.nextShotAt = 0; this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.strafeSwap = 0;
    this.wantCrouch = false; this.spotAnnounced = false; this.threwNade = false; this.scoped = false;
    this.startDelay = Math.random() * 1.2;
    this.buy();
  }

  buy() {
    const a = this.a, g = this.g;
    const T = a.team === 'T';
    const pistolRound = g.round === 1 || g.round === g.half + 1;
    const tryBuy = id => g.buy(a, id) === null;
    if (pistolRound) {
      if (Math.random() < 0.5) tryBuy('vest');
      else { tryBuy(Math.random() < 0.5 ? 'p250' : 'deagle'); }
      if (a.money >= 200 && Math.random() < 0.5) tryBuy('flash');
      return;
    }
    if (!a.inv[1]) {
      const teamHasAwp = g.actors.some(x => x !== a && x.team === a.team && x.inv[1] && x.inv[1].def.id === 'awp');
      const rifle = T ? 'ak47' : (Math.random() < 0.55 ? 'm4a4' : 'm4a1s');
      if (a.money >= 5750 && !teamHasAwp && Math.random() < 0.25) tryBuy('awp');
      else if (a.money >= g.priceOf(a, rifle) + 650) tryBuy(rifle);
      else if (a.money >= 2500 && Math.random() < 0.7) tryBuy(T ? 'galil' : 'famas');
      else if (a.money >= 2200 && Math.random() < 0.5) tryBuy(pick([T ? 'mac10' : 'mp9', 'nova', 'ssg08']));
      else if (a.money >= 1500 && Math.random() < 0.4) tryBuy('deagle');
    }
    if (a.money >= 1000 && (a.armor < 100 || !a.helmet)) tryBuy('vesthelm');
    else if (a.money >= 650 && a.armor < 100) tryBuy('vest');
    if (!T && a.money >= 400 && Math.random() < 0.6) tryBuy('defuser');
    const nades = ['smoke', 'flash', 'he', 'flash'];
    for (let i = 0; i < 2; i++) if (a.money >= 300 && Math.random() < 0.6) tryBuy(pick(nades));
    a.slot = 0; a.select(a.bestSlot(), true);
  }

  // Called when freeze time ends
  go() {
    const a = this.a, g = this.g, P = this.w.points;
    if (a.team === 'T') {
      let site = g.plan.site, route = g.plan.route;
      if (!a.inv[5] && Math.random() < 0.2) { site = site === 'A' ? 'B' : 'A'; route = Math.floor(Math.random() * 2); } // lurk
      if (Math.random() < 0.25) route = 1 - route;
      this.site = site;
      this.queue = P.routes[site][route].map(c => this.cellPos(c));
      this.queue.push(this.cellPos(pick(P[site + '_site'])));
      this.mode = 'move';
      this.nextGoal();
    } else {
      const cts = g.actors.filter(x => x.team === 'CT' && x.brain);
      const idx = cts.indexOf(a);
      const roles = ['A_hold', 'B_hold', 'Mid_hold', 'A_hold', 'B_hold'];
      const role = roles[(idx + g.round) % roles.length];
      const spot = pick(P[role]);
      this.holdLook = this.cellPos(spot.look);
      this.queue = [this.cellPos(spot.at)];
      this.site = role[0] === 'M' ? 'A' : role[0];
      this.mode = 'move';
      this.nextGoal();
    }
  }

  nextGoal() {
    if (!this.queue.length) { this.goal = null; this.path = null; this.onArrive(); return; }
    const q = this.queue.shift();
    this.setGoal(q.x, q.z);
  }
  setGoal(x, z) {
    this.goal = { x, z };
    const p = this.w.findPath(this.a.pos.x, this.a.pos.z, x, z);
    this.path = p; this.pi = p && p.length > 1 ? 1 : 0;
    if (p && p.length) p[p.length - 1] = [x, z];
  }

  onArrive() {
    const a = this.a, g = this.g;
    if (a.team === 'T' && a.inv[5] && !g.bomb && this.w.siteAt(a.pos.x, a.pos.z)) { this.mode = 'plant'; return; }
    if (a.team === 'T' && a.inv[5] && !g.bomb) {
      const s = g.plan.site;
      this.queue = [this.cellPos(pick(this.w.points[s + '_site']))]; this.nextGoal(); return;
    }
    this.mode = 'hold';
    if (!this.holdLook) {
      // look back toward where enemies would come from
      const e = this.w.points.routes[this.site || 'A'][0];
      this.holdLook = this.cellPos(a.team === 'T' ? [23, 6] : e[e.length - 1]);
    }
  }

  onBombPlanted(bomb) {
    const a = this.a;
    if (!a.alive) return;
    if (a.team === 'CT') {
      this.mode = 'retake';
      this.queue = [];
      const dx = (Math.random() - 0.5) * 6, dz = (Math.random() - 0.5) * 6;
      this.setGoal(bomb.pos.x + dx, bomb.pos.z + dz);
    } else {
      this.mode = 'move';
      const spots = this.w.points[bomb.site + '_site'];
      this.queue = [this.cellPos(pick(spots))];
      this.holdLook = { x: bomb.pos.x, z: bomb.pos.z };
      this.nextGoal();
    }
  }
  onKill(victim) { if (this.target === victim) { this.target = null; this.burst = 0; } }
  // CT rotation toward contact near a bombsite
  rotateTo(pos) {
    const w = this.w;
    const sites = { A: w.sites.A, B: w.sites.B };
    let best = null, bd = Infinity;
    for (const k in sites) {
      const r = sites[k], cx = w.cx2x((r[0] + r[2]) / 2), cz = w.cz2z((r[1] + r[3]) / 2);
      const d = Math.hypot(pos.x - cx, pos.z - cz);
      if (d < bd) { bd = d; best = k; }
    }
    if (bd > 45) return;
    const spot = pick(this.w.points[best + '_hold']);
    this.queue = [this.cellPos(spot.at)];
    this.holdLook = { x: pos.x, z: pos.z };
    this.site = best; this.mode = 'move';
    this.nextGoal();
  }
  onDamaged(att) {
    if (!att || att.team === this.a.team) return;
    if (!this.target) { this.lookAt = att.pos.clone(); this.lookUntil = this.g.now + 1.5; this.alertUntil = this.g.now + 2; }
  }
  hearShot(shooter, pos) {
    if (shooter.team === this.a.team || this.target) return;
    const d = pos.distanceTo(this.a.pos);
    if (d < 40 && (!this.lookUntil || this.g.now > this.lookUntil)) {
      this.lookAt = pos.clone(); this.lookUntil = this.g.now + 1.2 + Math.random(); this.alertUntil = this.g.now + 1.5;
    }
  }
  flashed(dur) { this.blindUntil = this.g.now + dur * 0.85; }

  // --------------------------------------------------------------- perception
  perceive() {
    const a = this.a, g = this.g, now = g.now;
    if (now < this.blindUntil) { if (this.target && Math.random() < 0.5) this.target = null; return; }
    const eye = a.eye(this.v), f = a.forward(this.v2);
    let best = null, bd = Infinity;
    const alert = now < (this.alertUntil || 0);
    for (const b of g.actors) {
      if (!b.alive || b.team === a.team) continue;
      const pts = [[0, b.eyeH], [0, b.h * 0.6]];
      for (const [, hy] of pts) {
        const p = new THREE.Vector3(b.pos.x, b.pos.y + hy, b.pos.z);
        const to = p.clone().sub(eye); const d = to.length();
        if (d > 95) break;
        to.normalize();
        const dot = to.dot(f);
        const known = b === this.target;
        if (!known && dot < (alert ? -0.2 : this.d.fovCos) && d > 2.5) break;
        if (!this.w.los(eye, p) || g.effects.smokeBlocks(eye, p, now)) continue;
        const score = d * (known ? 0.6 : 1) * (dot > 0.9 ? 0.8 : 1);
        if (score < bd) { bd = score; best = b; }
        break;
      }
    }
    if (best) {
      if (best !== this.target) {
        const first = !this.target;
        this.target = best;
        this.seenAt = now;
        const [r0, r1] = this.d.react;
        this.reactAt = now + (r0 + Math.random() * (r1 - r0)) * (alert ? 0.7 : 1);
        const dist = best.pos.distanceTo(a.pos);
        const e = this.d.aimErr * (0.6 + Math.random() * 0.8) * (1 + Math.min(1, dist / 40));
        const ang = Math.random() * 6.28;
        this.err0 = { y: Math.cos(ang) * e, p: Math.sin(ang) * e * 0.6 };
        this.aimHead = Math.random() < this.d.hs;
        if (first) g.teamAlert(a.team, best.pos, a);
        if (first && a.squad === g.player.squad && !this.spotAnnounced && Math.random() < 0.5) {
          this.spotAnnounced = true;
          const zone = this.w.zoneName(best.pos.x, best.pos.z);
          g.hud.chat(`<b class="${a.team === 'T' ? 't' : 'ct'}">${a.name}</b> (RADIO): Enemy spotted${zone ? ' — ' + zone : ''}`);
        }
      }
      this.lastSeen = best.pos.clone(); this.lastSeenT = now;
    } else if (this.target && now - (this.lastSeenT || 0) > 1.6) {
      this.target = null; this.burst = 0;
      if (this.lastSeen) { this.lookAt = this.lastSeen.clone(); this.lookUntil = now + 2; }
    }
  }

  // --------------------------------------------------------------- per frame
  update(dt) {
    const a = this.a, g = this.g, now = g.now, inp = a.input;
    inp.move.set(0, 0, 0); inp.fire = false; inp.fire2 = false; inp.jump = false; inp.use = false; inp.walk = false;
    inp.crouch = this.wantCrouch;
    if (g.phase === 'freeze' || g.phase === 'over') { this.lookAround(dt, now); return; }
    if (g.phase === 'live' && this.startDelay > 0) { this.startDelay -= dt; }

    if (now >= this.nextPerceive) { this.nextPerceive = now + 0.09 + Math.random() * 0.05; this.perceive(); }
    const blind = now < this.blindUntil;
    if (this.target && !this.target.alive) this.target = null;

    // weapon management
    const cur = a.cur;
    if (this.mode !== 'plant' && a.slot !== 1 && a.inv[1] && (a.inv[1].ammo > 0 || a.inv[1].reserve > 0) && !a.pulling && (a.slot !== 4 || !this.throwing)) { a.select(1, true); }
    else if (a.slot === 3 && a.inv[2] && !this.target) a.select(2, true);
    if (a.slot === 1 && a.inv[1] && a.inv[1].ammo === 0 && a.inv[1].reserve === 0 && a.inv[2]) a.select(2, true);
    if (this.target && cur.def.mag && cur.ammo === 0 && !a.reloading && a.inv[2] && a.slot === 1 && cur.reserve > 0 && this.target.pos.distanceTo(a.pos) < 12) a.select(2, true);
    if (!this.target && cur.def.mag && cur.ammo < cur.def.mag * 0.4 && cur.reserve > 0 && !a.reloading) a.startReload();

    // grenade throw sequence
    if (this.throwing) {
      const t = this.throwing;
      this.turnTo(t.yaw, t.pitch, dt, 8);
      inp.fire = now > t.start + 0.7 && now < t.start + 1.0;
      if (now > t.start + 1.25 || (a.slot !== 4 && now > t.start + 0.2)) this.throwing = null;
      return;
    }

    if (this.target && !blind) this.engage(dt, now);
    else {
      if (blind) { a.yaw += Math.sin(now * 3) * dt * 0.8; if (this.target && Math.random() < 0.2) inp.fire = a.cur.def.auto || Math.random() < 0.5; }
      this.objective(dt, now);
    }
    this.checkStuck(dt);
  }

  aimPoint(b) {
    const hy = this.aimHead ? b.eyeH + 0.03 : b.h * 0.66;
    return new THREE.Vector3(b.pos.x + b.vel.x * 0.05, b.pos.y + hy, b.pos.z + b.vel.z * 0.05);
  }
  turnTo(yaw, pitch, dt, rate) {
    const a = this.a;
    const k = 1 - Math.exp(-dt * rate * 1.4), maxStep = rate * dt * 1.3, minStep = 0.3 * dt;
    const step = diff => { const ad = Math.abs(diff); return Math.sign(diff) * Math.min(ad, Math.max(ad * k, minStep), maxStep); };
    a.yaw = wrap(a.yaw + step(wrap(yaw - a.yaw)));
    a.pitch = Math.max(-1.5, Math.min(1.5, a.pitch + step(pitch - a.pitch)));
  }
  anglesTo(p) {
    const e = this.a.eye(this.v);
    const dx = p.x - e.x, dy = p.y - e.y, dz = p.z - e.z;
    return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)), dist: Math.hypot(dx, dy, dz) };
  }

  engage(dt, now) {
    const a = this.a, b = this.target, inp = a.input, d = a.curDef;
    const tp = this.aimPoint(b);
    const ang = this.anglesTo(tp);
    const t = now - this.seenAt;
    const errK = Math.exp(-t / this.d.settle);
    const jit = 0.004 * Math.sin(now * 7.3) + 0.003 * Math.sin(now * 11.1);
    const wy = ang.yaw + this.err0.y * errK + jit, wp = ang.pitch + this.err0.p * errK + jit * 0.5 - (a.punch.y * Math.PI / 180) * this.recoilComp * 0.9;
    this.turnTo(wy, wp, dt, this.d.turn);
    const errAng = Math.hypot(wrap(ang.yaw - a.yaw), ang.pitch - a.pitch + (a.punch.y * Math.PI / 180) * this.recoilComp * 0);
    const tol = Math.atan(0.28 / Math.max(1, ang.dist)) + 0.008;
    const dist = ang.dist;
    const visibleNow = now - this.lastSeenT < 0.15;
    // movement: strafe while aiming, stop to shoot
    const ready = now >= this.reactAt && errAng < tol * 2.2;
    const f = a.forward(this.v2);
    const right = new THREE.Vector3(-f.z, 0, f.x).normalize();
    if (!ready && (this.d.turn > 5) && dist > 6) {
      if (now > this.strafeSwap) { this.strafeDir *= -1; this.strafeSwap = now + 0.35 + Math.random() * 0.5; }
      inp.move.copy(right).multiplyScalar(this.strafeDir);
    }
    if (d.type === 'knife') { inp.move.set(-Math.sin(a.yaw), 0, -Math.cos(a.yaw)); if (dist < 2.2 && ready) inp.fire = true; return; }
    if (d.type === 'grenade' || d.type === 'c4') { a.select(a.bestSlot(), true); return; }
    if (!visibleNow) { // pre-aim last position, advance slowly
      if (this.lastSeen) { this.setMoveToward(this.lastSeen, true); }
      return;
    }
    if (a.cur.ammo === 0) { if (!a.reloading) a.startReload(); return; }
    if (d.scope && a.zoom === 0 && dist > 6 && now > (this.scopeCd || 0)) { inp.fire2 = true; this.scopeCd = now + 0.4; return; }
    if (!ready) return;
    // decide firing
    if (now < this.nextShotAt) return;
    const spd = a.speed2d;
    if (d.type === 'sniper') {
      if (spd < 1 && errAng < tol) { inp.fire = true; this.nextShotAt = now + 0.2; }
      return;
    }
    if (d.auto) {
      const maxBurst = dist > 28 ? 2 : dist > 15 ? 4 : this.d.spray;
      if (spd > d.speed * 0.0254 * 0.45 && dist > 8) return; // counter-strafe first
      inp.fire = true;
      if (dist > 10 && a.recoilIdx > 2 && Math.random() < 0.02) this.wantCrouch = true;
      if (a.recoilIdx >= maxBurst) { inp.fire = false; this.nextShotAt = now + (dist > 20 ? 0.3 : 0.12) + a.recoilIdx / 11 * 0.7 + Math.random() * 0.12; this.wantCrouch = false; }
    } else {
      if (spd > d.speed * 0.0254 * 0.5 && dist > 8) return;
      inp.fire = true; // press (edge created by reset each frame)
      this.nextShotAt = now + (d.id === 'deagle' ? 0.45 : d.type === 'shotgun' ? 0.9 : 0.18) + Math.random() * 0.12;
    }
  }

  setMoveToward(p, walk = false) {
    const a = this.a;
    const dx = p.x - a.pos.x, dz = p.z - a.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.5) return;
    a.input.move.set(dx / d, 0, dz / d);
    a.input.walk = walk;
  }

  lookAround(dt, now) {
    this.a.yaw += Math.sin(now * 0.7 + this.a.id) * dt * 0.2;
  }

  objective(dt, now) {
    const a = this.a, g = this.g, inp = a.input;
    if (this.startDelay > 0) return;
    // bomb retrieval
    if (a.team === 'T' && g.droppedBomb && !g.bomb) {
      const carrierExists = g.actors.some(x => x.alive && x.inv[5]);
      if (!carrierExists) {
        const ts = g.actors.filter(x => x.alive && x.team === 'T' && x.brain);
        const closest = ts.sort((p, q) => p.pos.distanceTo(g.droppedBomb.pos) - q.pos.distanceTo(g.droppedBomb.pos))[0];
        if (closest === a && (!this.goal || Math.hypot(this.goal.x - g.droppedBomb.pos.x, this.goal.z - g.droppedBomb.pos.z) > 1)) {
          this.queue = []; this.setGoal(g.droppedBomb.pos.x, g.droppedBomb.pos.z); this.mode = 'move';
        }
      }
    }
    // got the bomb later: head to plan site
    if (a.team === 'T' && a.inv[5] && !g.bomb && this.mode === 'hold') {
      this.queue = [this.cellPos(pick(this.w.points[g.plan.site + '_site']))]; this.mode = 'move'; this.nextGoal();
    }
    // planting
    if (this.mode === 'plant') {
      if (!a.inv[5] || g.bomb) { this.mode = 'hold'; return; }
      if (!this.w.siteAt(a.pos.x, a.pos.z)) { this.mode = 'move'; this.queue = [this.cellPos(pick(this.w.points[g.plan.site + '_site']))]; this.nextGoal(); return; }
      if (a.slot !== 5) a.select(5, true);
      inp.use = true; inp.crouch = true;
      a.pitch += (-0.6 - a.pitch) * Math.min(1, dt * 5);
      return;
    }
    // defusing
    if (a.team === 'CT' && g.bomb && !g.bomb.defused) {
      const bd = a.pos.distanceTo(g.bomb.pos);
      const others = g.actors.filter(x => x.alive && x.team === 'CT' && x !== a && (x.defuseProg > 0));
      const iAmClosest = g.actors.filter(x => x.alive && x.team === 'CT').sort((p, q) => p.pos.distanceTo(g.bomb.pos) - q.pos.distanceTo(g.bomb.pos))[0] === a;
      if ((iAmClosest || bd < 3) && !others.length) {
        if (bd < 1.4) {
          inp.use = true; inp.crouch = Math.random() < 0.5 ? inp.crouch : true;
          const ang = this.anglesTo(g.bomb.pos); this.turnTo(ang.yaw, ang.pitch, dt, 6);
          return;
        }
        if (!this.goal || Math.hypot(this.goal.x - g.bomb.pos.x, this.goal.z - g.bomb.pos.z) > 0.8) { this.queue = []; this.setGoal(g.bomb.pos.x, g.bomb.pos.z); }
      }
    }
    // grenade usage when approaching site
    if (a.team === 'T' && !this.threwNade && this.mode === 'move' && this.queue.length === 1 && a.inv[4].length && Math.random() < 0.02) {
      this.threwNade = true;
      const i = a.inv[4].findIndex(n => n.def.id !== 'he') >= 0 ? a.inv[4].findIndex(n => n.def.id !== 'he') : 0;
      a.slot = 0; a.gi = i; a.select(4, true); a.gi = i;
      const tgt = this.queue[0];
      const e = a.eye(this.v);
      this.throwing = { yaw: Math.atan2(-(tgt.x - e.x), -(tgt.z - e.z)), pitch: 0.35, start: g.now };
      return;
    }

    // path following
    this.wantCrouch = false;
    if (this.path && this.pi < this.path.length) {
      const [nx, nz] = this.path[this.pi];
      const dx = nx - a.pos.x, dz = nz - a.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.8) { this.pi++; if (this.pi >= this.path.length) { this.path = null; this.nextGoal(); } }
      else {
        inp.move.set(dx / d, 0, dz / d);
        // look ahead along path
        const la = this.path[Math.min(this.path.length - 1, this.pi + 2)];
        let ly = Math.atan2(-(la[0] - a.pos.x), -(la[1] - a.pos.z));
        if (this.lookAt && now < this.lookUntil) { const an = this.anglesTo(this.lookAt); ly = an.yaw; }
        this.turnTo(ly, 0, dt, 4);
        const near = g.actors.some(x => x.alive && x.team !== a.team && x.pos.distanceTo(a.pos) < 18);
        inp.walk = near && Math.random() < 0.5 && a.team === 'CT';
      }
    } else {
      // holding
      if (this.lookAt && now < this.lookUntil) {
        const an = this.anglesTo(this.lookAt); this.turnTo(an.yaw, an.pitch * 0.5, dt, 5);
      } else if (this.holdLook) {
        const an = this.anglesTo(new THREE.Vector3(this.holdLook.x, a.pos.y + 1.5, this.holdLook.z));
        this.turnTo(an.yaw + Math.sin(now * 0.6 + a.id) * 0.35, 0, dt, 3);
      }
      if (this.mode === 'retake' && g.bomb) {
        // push onto the site
        if (!this.goal) this.setGoal(g.bomb.pos.x + (Math.random() - 0.5) * 4, g.bomb.pos.z + (Math.random() - 0.5) * 4);
      }
      // late-round T without plan: go for site
      if (a.team === 'T' && !g.bomb && g.roundTimeEnd - now < 40 && this.mode === 'hold' && !this.lateGo) {
        this.lateGo = true;
        this.queue = [this.cellPos(pick(this.w.points[g.plan.site + '_site']))]; this.mode = 'move'; this.nextGoal();
      }
    }
  }

  checkStuck(dt) {
    const a = this.a;
    this.stuckT += dt;
    if (this.stuckT < 1.0) return;
    const moved = Math.hypot(a.pos.x - this.lastPos.x, a.pos.z - this.lastPos.z);
    const wants = a.input.move.lengthSq() > 0.1;
    if (wants && moved < 0.35 && a.plantProg <= 0 && a.defuseProg <= 0) {
      this.stuckCount++;
      a.input.jump = true;
      if (this.goal) {
        const g2 = this.goal;
        if (this.stuckCount > 2) { this.a.pos.x += (Math.random() - 0.5) * 0.3; this.a.pos.z += (Math.random() - 0.5) * 0.3; }
        this.setGoal(g2.x, g2.z);
      }
    } else this.stuckCount = 0;
    this.stuckT = 0;
    this.lastPos.copy(a.pos);
  }
}
