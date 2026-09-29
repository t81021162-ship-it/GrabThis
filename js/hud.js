// DOM-based HUD modelled after the CS2 layout.
import { WEAPONS, EQUIP, BUY_MENU } from './weapons.js';
import { GW, GH, CELL } from './world.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

const SKULL = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2C6.5 2 3 5.7 3 10.3c0 2.7 1.2 4.6 3 5.8V20h3v-2h2v2h2v-2h2v2h3v-3.9c1.8-1.2 3-3.1 3-5.8C21 5.7 17.5 2 12 2zm-3.5 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>';
const HS = '<svg class="hsic" viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 1v6M12 15v8M1 11h6M17 11h6" stroke="currentColor" stroke-width="2.2"/></svg>';

export class HUD {
  constructor(icons, world, sound) {
    this.icons = icons; this.world = world; this.sound = sound;
    this.radarImg = world.radarImage(8);
    this.radar = $('radar'); this.rctx = this.radar.getContext('2d');
    this.xh = $('crosshair'); this.xctx = this.xh.getContext('2d');
    this.dmgc = $('dmgCanvas'); this.dctx = this.dmgc.getContext('2d');
    this.killEntries = [];
    this.chatLines = [];
    this.dmgInd = [];
    this.flashEnd = 0; this.flashDur = 0;
    this.centerEnd = 0; this.hintEnd = 0;
    this.settings = null;
    this.buildBuyMenu();
  }

  icon(id, cls = '') {
    const src = this.icons[id];
    return src ? `<img class="wicon ${cls}" src="${src}" alt="${esc(id)}">` : `<span class="wtext">${esc((WEAPONS[id] || {}).name || id)}</span>`;
  }

  // ------------------------------------------------ messages
  center(text, dur = 2, kind = '') {
    const el = $('centerMsg');
    el.innerHTML = text ? (kind === 'bomb' ? '<span class="c4ic"></span>' : '') + esc(text) : '';
    el.classList.toggle('show', !!text);
    this.centerEnd = text ? performance.now() + dur * 1000 : 0;
  }
  hint(text, dur = 2) {
    const el = $('hint'); el.textContent = text; el.classList.add('show');
    this.hintEnd = performance.now() + dur * 1000;
  }
  chat(html) {
    const box = $('chat');
    const d = document.createElement('div');
    d.className = 'chatline'; d.innerHTML = html;
    box.appendChild(d);
    this.chatLines.push({ el: d, t: performance.now() });
    while (box.children.length > 6) box.removeChild(box.firstChild);
  }
  moneyDelta(n) {
    const el = $('moneyDelta'); el.textContent = (n >= 0 ? '+$' : '-$') + Math.abs(n);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }
  killfeed(a, b, weaponId, hs, mine) {
    const kf = $('killfeed');
    const d = document.createElement('div');
    d.className = 'kf' + (mine ? ' mine' : '');
    const nm = x => x ? `<span class="${x.team === 'T' ? 't' : 'ct'}">${esc(x.name)}</span>` : '';
    const wid = weaponId === 'c4' ? 'c4' : weaponId;
    d.innerHTML = (a && a !== b ? nm(a) : '') + this.icon(wid, 'kfi') + (hs ? HS : '') + nm(b);
    kf.prepend(d);
    this.killEntries.push({ el: d, t: performance.now() });
    while (kf.children.length > 6) kf.removeChild(kf.lastChild);
  }
  banner(winner, text, reason, mvp) {
    const el = $('roundBanner');
    el.className = 'show ' + (winner === 'T' ? 't' : 'ct');
    el.innerHTML = `<div class="bn-icon">${winner === 'T' ? 'T' : 'CT'}</div><div><div class="bn-title">${esc(text)}</div><div class="bn-reason">${esc(reason)}</div>${mvp ? `<div class="bn-mvp">★ ${esc(mvp)}</div>` : ''}</div>`;
  }
  deathPanel(killer, weaponId, hs, game) {
    const el = $('deathPanel');
    const p = game.player;
    const given = [];
    for (const b of game.actors) { const d = b.dmgBy.get(p); if (d) given.push(`${d} to ${esc(b.name)}`); }
    const taken = killer ? (p.dmgBy.get(killer) || 0) : 0;
    el.innerHTML = killer && killer !== p
      ? `<div class="dp-title">Killed by <span class="${killer.team === 'T' ? 't' : 'ct'}">${esc(killer.name)}</span></div>
         <div class="dp-row">${this.icon(weaponId, 'dpi')} ${hs ? HS + ' Headshot' : ''} <span class="dp-hp">${killer.alive ? killer.health + ' HP left' : ''}</span></div>
         <div class="dp-dmg">Damage taken: ${taken} · Damage given: ${given.length ? given.join(', ') : '0'}</div>`
      : `<div class="dp-title">You died</div>`;
    el.classList.add('show');
  }
  damageFrom(pos, p) {
    const ang = Math.atan2(pos.x - p.pos.x, pos.z - p.pos.z);
    this.dmgInd.push({ ang, t: performance.now() });
  }
  hitConfirm() { }
  flash(dur, sound) {
    this.flashEnd = performance.now() + dur * 1000; this.flashDur = dur;
    this.needSnapshot = true;
    if (dur > 1.2) sound.ringing(dur);
  }
  roundReset(game) {
    $('roundBanner').className = '';
    $('deathPanel').classList.remove('show');
    this.flashEnd = 0;
    $('flash').style.opacity = 0;
    this.center(game.round === game.half + 1 && game.round > 1 ? 'Sides switched' : `Round ${game.round}`, 2.5);
    this.dmgInd = [];
  }

  // ------------------------------------------------ buy menu
  buildBuyMenu() {
    const cols = BUY_MENU.map((col, ci) => `<div class="bcol"><div class="bcol-t">${col.title}</div>${col.items.map((id, i) => {
      const def = WEAPONS[id] || EQUIP[id];
      const ic = this.icons[id] ? `<img src="${this.icons[id]}" alt="">` : `<div class="eqic eq-${id}"></div>`;
      return `<button class="bitem" data-id="${id}"><span class="bkey">${ci + 1}${i + 1}</span>${ic}<div class="bname">${def.name}</div><div class="bprice">$${def.price}</div></button>`;
    }).join('')}</div>`).join('');
    $('buyGrid').innerHTML = cols;
    $('buyGrid').addEventListener('click', e => {
      const b = e.target.closest('.bitem');
      if (b && this.onBuy) this.onBuy(b.dataset.id);
    });
  }
  refreshBuy(game) {
    const p = game.player;
    $('buyMoney').textContent = '$' + p.money;
    const canBuy = game.canBuy(p);
    $('buyStatus').textContent = canBuy ? `Buy time remaining: ${fmtTime(game.buyEnd - game.now)}` : 'You are not in a buy zone or buy time has expired';
    this.buyKeys = {};
    document.querySelectorAll('.bcol').forEach((col, ci) => {
      col.classList.toggle('armed', this.buyCat === ci + 1);
      let n = 0;
      for (const b of col.querySelectorAll('.bitem')) {
        const def = WEAPONS[b.dataset.id] || EQUIP[b.dataset.id];
        if (def.team && def.team !== p.team) continue;
        n++; b.querySelector('.bkey').textContent = `${ci + 1}${n}`;
        this.buyKeys[`${ci + 1}${n}`] = b.dataset.id;
      }
    });
    for (const b of document.querySelectorAll('.bitem')) {
      const id = b.dataset.id, def = WEAPONS[id] || EQUIP[id];
      const price = game.priceOf(p, id);
      b.querySelector('.bprice').textContent = '$' + price;
      const wrongTeam = def.team && def.team !== p.team;
      b.classList.toggle('hidden', !!wrongTeam);
      b.classList.toggle('poor', p.money < price);
      const owned = (p.inv[1] && p.inv[1].def.id === id) || (p.inv[2] && p.inv[2].def.id === id) || (id === 'vest' && p.armor >= 100) || (id === 'vesthelm' && p.armor >= 100 && p.helmet) || (id === 'defuser' && p.defuser);
      b.classList.toggle('owned', !!owned);
    }
  }

  // ------------------------------------------------ scoreboard
  scoreboard(game, show) {
    const el = $('scoreboard');
    el.classList.toggle('show', show);
    if (!show) return;
    const row = a => `<tr class="${a.alive ? '' : 'dead'} ${a === game.player ? 'me' : ''}"><td class="sb-n">${a.alive ? '' : SKULL}${esc(a.name)}${a.inv[5] ? ' <span class="sb-c4">C4</span>' : ''}${a.defuser && a.team === 'CT' ? ' <span class="sb-kit">KIT</span>' : ''}</td><td>$${a.money}</td><td>${a.stats.k}</td><td>${a.stats.a}</td><td>${a.stats.d}</td><td>${a.stats.k ? Math.round(a.stats.hs / Math.max(1, a.stats.k) * 100) : 0}%</td><td>${Math.round(a.stats.dmg / Math.max(1, game.round - (game.phase === 'post' ? 0 : 1)))}</td><td>${a.stats.mvp ? '★' + a.stats.mvp : ''}</td><td class="sb-ping">${a.isBot ? 'BOT' : '5'}</td></tr>`;
    const team = t => game.actors.filter(a => a.team === t).sort((x, y) => y.stats.k - x.stats.k || x.stats.d - y.stats.d).map(row).join('');
    const hdr = '<tr><th class="sb-n">Player</th><th>Money</th><th>K</th><th>A</th><th>D</th><th>HS%</th><th>ADR</th><th>MVP</th><th>Ping</th></tr>';
    el.innerHTML = `<div class="sb-head"><div>Competitive · Dust Zero</div><div>Round ${game.round} / ${game.maxRounds}</div></div>
      <div class="sb-team ct"><div class="sb-score">${game.teamScore('CT')}</div><div class="sb-tn">Counter-Terrorists</div></div>
      <table>${hdr}${team('CT')}</table>
      <div class="sb-team t"><div class="sb-score">${game.teamScore('T')}</div><div class="sb-tn">Terrorists</div></div>
      <table>${hdr}${team('T')}</table>`;
  }

  // ------------------------------------------------ per-frame
  update(game, dt) {
    const now = performance.now();
    const p = game.player, v = game.viewActor || p;
    // top bar
    $('scoreCT').textContent = game.teamScore('CT');
    $('scoreT').textContent = game.teamScore('T');
    const tb = $('timer');
    if (game.bomb && !game.bomb.defused && !game.bomb.exploded) {
      tb.innerHTML = '<span class="c4ic pulse"></span>'; tb.className = 'bomb';
    } else {
      let s = 0;
      if (game.phase === 'freeze') s = game.phaseEnd - game.now;
      else if (game.phase === 'live') s = game.roundTimeEnd - game.now;
      tb.textContent = fmtTime(s);
      tb.className = game.phase === 'freeze' ? 'freeze' : (s < 10 && game.phase === 'live' ? 'low' : '');
    }
    const avs = t => game.actors.filter(a => a.team === t).map(a => `<div class="av ${a.alive ? '' : 'dead'} ${a === p ? 'me' : ''}" title="${esc(a.name)}"><span>${esc(a.name[0])}</span><i style="width:${a.health}%"></i></div>`).join('');
    const ctHtml = avs('CT'), tHtml = avs('T');
    if (ctHtml !== this._avct) { $('avCT').innerHTML = ctHtml; this._avct = ctHtml; }
    if (tHtml !== this._avt) { $('avT').innerHTML = tHtml; this._avt = tHtml; }
    $('aliveCT').textContent = game.alive('CT').length;
    $('aliveT').textContent = game.alive('T').length;

    // health / armor / money
    $('hp').textContent = v.health;
    $('hpbar').style.width = v.health + '%';
    $('hpBox').classList.toggle('low', v.health <= 25);
    $('ar').textContent = v.armor | 0;
    $('arIcon').classList.toggle('helmet', !!v.helmet);
    $('money').textContent = p.money;
    $('hudStatus').classList.toggle('dead', !p.alive && v === p);

    // ammo
    const w = v.cur, d = w.def;
    if (d.mag) { $('ammo').textContent = w.ammo; $('reserve').textContent = w.reserve; $('ammoBox').classList.remove('nomag'); $('ammoBox').classList.toggle('low', w.ammo <= Math.ceil(d.mag * 0.2)); }
    else { $('ammoBox').classList.add('nomag'); }
    $('reloadTag').classList.toggle('show', v.reloading);

    // inventory
    const inv = [];
    const slotHtml = (slot, id, sel, key) => `<div class="inv ${sel ? 'sel' : ''}"><span class="ik">${key}</span>${this.icon(id, 'invi')}</div>`;
    if (v.inv[1]) inv.push(slotHtml(1, v.inv[1].def.id, v.slot === 1, 1));
    if (v.inv[2]) inv.push(slotHtml(2, v.inv[2].def.id, v.slot === 2, 2));
    inv.push(slotHtml(3, 'knife', v.slot === 3, 3));
    if (v.inv[4].length) inv.push(`<div class="inv gren ${v.slot === 4 ? 'sel' : ''}"><span class="ik">4</span>${v.inv[4].map((g, i) => this.icon(g.def.id, 'invg' + (v.slot === 4 && v.gi === i ? ' on' : ''))).join('')}</div>`);
    if (v.inv[5]) inv.push(slotHtml(5, 'c4', v.slot === 5, 5));
    const invHtml = inv.join('') + (v.defuser && v.team === 'CT' ? '<div class="inv kit"><span class="kitic"></span></div>' : '');
    if (invHtml !== this._inv) { $('inventory').innerHTML = invHtml; this._inv = invHtml; }

    // location
    $('location').textContent = this.world.zoneName(v.pos.x, v.pos.z);

    // center / hint timers
    if (this.centerEnd && now > this.centerEnd) { $('centerMsg').classList.remove('show'); this.centerEnd = 0; }
    if (this.hintEnd && now > this.hintEnd) { $('hint').classList.remove('show'); this.hintEnd = 0; }
    for (const e of this.killEntries) if (now - e.t > 7000 && e.el.parentNode) e.el.remove();
    this.killEntries = this.killEntries.filter(e => e.el.parentNode);
    for (const c of this.chatLines) if (now - c.t > 9000) c.el.classList.add('fade');

    // context hints
    let ctx = '';
    if (p.alive) {
      if (game.phase === 'freeze' || (game.canBuy(p) && game.phase === 'live')) ctx = game.canBuy(p) ? 'Press B to open the Buy Menu' : '';
      if (p.inv[5] && game.world.siteAt(p.pos.x, p.pos.z) && !game.bomb) ctx = 'Hold E (or select C4 and hold Mouse 1) to plant the bomb';
      if (p.team === 'CT' && game.bomb && !game.bomb.defused && p.pos.distanceTo(game.bomb.pos) < 1.9) ctx = 'Hold E to defuse the bomb' + (p.defuser ? '' : ' (no kit: 10s)');
      const near = game.items.find(it => it.mesh.position.distanceTo(p.pos) < 2);
      if (near && !ctx) ctx = `Press E to pick up ${near.w.def.name}`;
    }
    const ch = $('ctxHint'); ch.textContent = ctx; ch.classList.toggle('show', !!ctx);

    // progress bar (plant / defuse)
    const pr = $('progress');
    if (p.plantProg > 0) { pr.classList.add('show'); $('progressFill').style.width = (p.plantProg / 3.2 * 100) + '%'; $('progressText').textContent = 'PLANTING BOMB'; }
    else if (p.defuseProg > 0 && game.bomb) { pr.classList.add('show'); $('progressFill').style.width = (p.defuseProg / game.bomb.defuseTime * 100) + '%'; $('progressText').textContent = 'DEFUSING BOMB'; }
    else pr.classList.remove('show');

    // spectating
    const spec = $('spectate');
    if (!p.alive && v !== p) { spec.innerHTML = `<span class="lbl">SPECTATING</span> <b class="${v.team === 'T' ? 't' : 'ct'}">${esc(v.name)}</b> <span class="sp-hp">${v.health} HP</span><div class="sp-tip">Mouse 1 / Space: next player</div>`; spec.classList.add('show'); }
    else spec.classList.remove('show');

    // flash overlay
    const fl = $('flash');
    if (now < this.flashEnd) {
      const rem = (this.flashEnd - now) / 1000;
      const k = Math.min(1, rem / Math.max(0.3, this.flashDur * 0.6));
      fl.style.opacity = k;
      $('flashFreeze').style.opacity = Math.min(1, rem / this.flashDur * 1.6) * 0.8;
    } else { fl.style.opacity = 0; }

    // scope overlay
    $('scope').classList.toggle('show', v === p && p.alive && p.zoom > 0);
    $('lowhp').style.opacity = v.alive && v.health < 30 ? (0.35 + 0.25 * Math.sin(now / 250)) * (1 - v.health / 30) + 0.2 : 0;

    this.drawRadar(game, v);
    this.drawCrosshair(game, v);
    this.drawDamage(game, v, now);
  }

  drawRadar(game, v) {
    const c = this.rctx, S = this.radar.width, R = S / 2;
    c.clearRect(0, 0, S, S);
    c.save();
    c.beginPath(); c.roundRect(2, 2, S - 4, S - 4, 16); c.clip();
    c.fillStyle = 'rgba(12,14,16,0.72)'; c.fillRect(0, 0, S, S);
    const scale = S / 64; // px per metre (≈64 m across)
    const px = 8 / CELL; // image px per metre
    c.translate(R, R);
    c.rotate(v.yaw);
    c.scale(scale / px, scale / px);
    const ix = (v.pos.x / CELL + GW / 2) * 8, iz = (v.pos.z / CELL + GH / 2) * 8;
    c.translate(-ix, -iz);
    c.globalAlpha = 0.9;
    c.drawImage(this.radarImg, 0, 0);
    c.globalAlpha = 1;
    const toImg = (x, z) => [(x / CELL + GW / 2) * 8, (z / CELL + GH / 2) * 8];
    const k = px / scale; // image px per screen px
    // bomb
    const bombPos = game.bomb && !game.bomb.exploded ? game.bomb.pos : game.droppedBomb ? game.droppedBomb.pos : null;
    if (bombPos && (game.player.team === 'T' || game.bomb)) {
      const [bx, bz] = toImg(bombPos.x, bombPos.z);
      c.fillStyle = game.bomb && Math.sin(performance.now() / 150) > 0 ? '#ff3b30' : '#e0a030';
      c.fillRect(bx - 5 * k, bz - 3.5 * k, 10 * k, 7 * k);
    }
    for (const a of game.actors) {
      if (a === v) continue;
      const friendly = a.team === game.player.team;
      if (!friendly && !(a.alive && a.spotted > game.now)) continue;
      const [ax, az] = toImg(a.pos.x, a.pos.z);
      if (!a.alive) {
        c.strokeStyle = friendly ? 'rgba(200,200,200,0.7)' : 'rgba(255,80,60,0.7)'; c.lineWidth = 2 * k;
        c.beginPath(); c.moveTo(ax - 4 * k, az - 4 * k); c.lineTo(ax + 4 * k, az + 4 * k); c.moveTo(ax + 4 * k, az - 4 * k); c.lineTo(ax - 4 * k, az + 4 * k); c.stroke();
        continue;
      }
      c.fillStyle = friendly ? (a.team === 'T' ? '#f0c040' : '#6fa8ff') : '#ff3b30';
      c.beginPath(); c.arc(ax, az, 4.5 * k, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 1.2 * k; c.stroke();
      if (a.inv[5] && friendly) { c.fillStyle = '#ff5030'; c.fillRect(ax - 2 * k, az - 9 * k, 4 * k, 3 * k); }
    }
    c.restore();
    // player arrow + view cone
    c.save(); c.translate(R, R);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 60);
    g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 60, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); c.closePath(); c.fill();
    c.fillStyle = v.team === 'T' ? '#f0c040' : '#6fa8ff';
    c.strokeStyle = '#000'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 6); c.lineTo(0, 3); c.lineTo(-6, 6); c.closePath(); c.fill(); c.stroke();
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2;
    c.beginPath(); c.roundRect(2, 2, S - 4, S - 4, 16); c.stroke();
  }

  drawCrosshair(game, v) {
    const c = this.xctx, S = this.xh.width, m = S / 2;
    c.clearRect(0, 0, S, S);
    const p = game.player;
    if (v.zoom > 0 && v === p) return;
    if (!v.alive || game.thirdPerson) return;
    const d = v.curDef;
    const st = this.settings || {};
    const col = st.xhColor || '#4cff4c';
    const len = st.xhSize || 5, th = st.xhThick || 2;
    let gap = st.xhGap != null ? st.xhGap : 3;
    if (st.xhDynamic !== false && d.inacc) gap += Math.min(26, game.inaccuracy(v) * 500);
    if (d.type === 'sniper' && v.zoom === 0) { gap = 0; }
    c.fillStyle = 'rgba(0,0,0,0.85)';
    const bar = (x, y, w, h) => { c.fillStyle = 'rgba(0,0,0,0.8)'; c.fillRect(x - 1, y - 1, w + 2, h + 2); c.fillStyle = col; c.fillRect(x, y, w, h); };
    const o = Math.floor(th / 2);
    if (d.type === 'sniper' && v.zoom === 0) { bar(m - o, m - o, th, th); return; }
    bar(m - o, m - gap - len - o, th, len);
    bar(m - o, m + gap + (th % 2 ? 0 : 0) + o, th, len);
    bar(m - gap - len - o, m - o, len, th);
    bar(m + gap + o, m - o, len, th);
    if (st.xhDot) bar(m - o, m - o, th, th);
  }

  drawDamage(game, v, now) {
    const c = this.dctx, W = this.dmgc.width, H = this.dmgc.height;
    c.clearRect(0, 0, W, H);
    this.dmgInd = this.dmgInd.filter(d => now - d.t < 1200);
    const p = game.player;
    for (const d of this.dmgInd) {
      const a = 1 - (now - d.t) / 1200;
      // relative angle: attacker direction vs view yaw
      const rel = d.ang - (p.yaw + Math.PI);
      const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.18;
      c.save(); c.translate(cx, cy); c.rotate(-rel);
      c.strokeStyle = `rgba(255,30,20,${0.75 * a})`; c.lineWidth = 10; c.lineCap = 'round';
      c.beginPath(); c.arc(0, 0, r, -Math.PI / 2 - 0.35, -Math.PI / 2 + 0.35); c.stroke();
      c.restore();
    }
  }
}
