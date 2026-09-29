// Procedural WebAudio sound effects with 3D positioning. No audio files required.
export class Sound {
  constructor() {
    this.ctx = null;
    this.volume = 0.7;
    this.voiceOn = true;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.volume;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.muffle = ctx.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 20000;
    this.master.connect(this.muffle); this.muffle.connect(this.comp); this.comp.connect(ctx.destination);
    // reverb
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(1.6, 2.6);
    this.revGain = ctx.createGain(); this.revGain.gain.value = 0.32;
    this.reverb.connect(this.revGain); this.revGain.connect(this.master);
    // noise buffers
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const b = this.brown.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  impulse(sec, decay) {
    const ctx = this.ctx, rate = ctx.sampleRate, len = rate * sec;
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < rate * 0.01 ? i / (rate * 0.01) : 1);
    }
    return buf;
  }
  get t() { return this.ctx.currentTime; }

  setListener(pos, fwd, up) {
    if (!this.ctx) return;
    const L = this.ctx.listener, t = this.t;
    if (L.positionX) {
      L.positionX.setValueAtTime(pos.x, t); L.positionY.setValueAtTime(pos.y, t); L.positionZ.setValueAtTime(pos.z, t);
      L.forwardX.setValueAtTime(fwd.x, t); L.forwardY.setValueAtTime(fwd.y, t); L.forwardZ.setValueAtTime(fwd.z, t);
      L.upX.setValueAtTime(up.x, t); L.upY.setValueAtTime(up.y, t); L.upZ.setValueAtTime(up.z, t);
    } else {
      L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }
    this.listenerPos = pos;
  }

  // Output node: 3D panner if pos given
  out(pos, vol = 1, rev = 0.3) {
    const ctx = this.ctx;
    const g = ctx.createGain(); g.gain.value = vol;
    let node = g;
    if (pos) {
      const p = ctx.createPanner();
      p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 3; p.rolloffFactor = 1.1; p.maxDistance = 200;
      if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; }
      else p.setPosition(pos.x, pos.y, pos.z);
      // distance-based muffling
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
      let dist = 0;
      if (this.listenerPos) dist = Math.hypot(pos.x - this.listenerPos.x, pos.y - this.listenerPos.y, pos.z - this.listenerPos.z);
      lp.frequency.value = Math.max(900, 18000 - dist * 260);
      g.connect(lp); lp.connect(p); p.connect(this.master);
    } else g.connect(this.master);
    if (rev > 0) { const s = ctx.createGain(); s.gain.value = rev; g.connect(s); s.connect(this.reverb); }
    return g;
  }

  noiseSrc(brown = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = brown ? this.brown : this.noise;
    s.loop = true;
    s.loopStart = Math.random();
    return s;
  }
  env(g, t, a, peak, d, curve = 'exp') {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    else g.gain.linearRampToValueAtTime(0.0001, t + a + d);
  }
  burst(dest, { t = this.t, type = 'lowpass', f = 2000, q = 0.7, a = 0.001, peak = 1, d = 0.1, brown = false, fEnd = null }) {
    const s = this.noiseSrc(brown), flt = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (fEnd) flt.frequency.exponentialRampToValueAtTime(fEnd, t + a + d);
    this.env(g, t, a, peak, d);
    s.connect(flt); flt.connect(g); g.connect(dest);
    s.start(t, Math.random()); s.stop(t + a + d + 0.05);
  }
  tone(dest, { t = this.t, type = 'sine', f = 440, fEnd = null, a = 0.002, peak = 0.5, d = 0.1 }) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t + a + d);
    this.env(g, t, a, peak, d);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + a + d + 0.05);
  }

  gun(profile, pos, vol = 1) {
    if (!this.ctx) return;
    const P = {
      ak: { lp: 2600, d: 0.2, th: 95, crack: 0.9, rev: 0.45, v: 1 },
      m4: { lp: 3400, d: 0.15, th: 110, crack: 0.8, rev: 0.4, v: 0.9 },
      rifle2: { lp: 3000, d: 0.16, th: 105, crack: 0.8, rev: 0.4, v: 0.9 },
      silencedRifle: { lp: 1500, d: 0.07, th: 140, crack: 0.15, rev: 0.12, v: 0.55 },
      silenced: { lp: 1300, d: 0.06, th: 160, crack: 0.12, rev: 0.1, v: 0.5 },
      pistol: { lp: 3800, d: 0.11, th: 130, crack: 0.7, rev: 0.35, v: 0.75 },
      deagle: { lp: 2200, d: 0.28, th: 70, crack: 1, rev: 0.55, v: 1.1 },
      smg: { lp: 3500, d: 0.09, th: 120, crack: 0.6, rev: 0.3, v: 0.75 },
      shotgun: { lp: 1600, d: 0.32, th: 60, crack: 0.7, rev: 0.5, v: 1.15 },
      scout: { lp: 2600, d: 0.35, th: 75, crack: 1, rev: 0.6, v: 1.0 },
      awp: { lp: 1900, d: 0.55, th: 50, crack: 1.2, rev: 0.8, v: 1.3 },
    }[profile] || { lp: 3000, d: 0.15, th: 100, crack: 0.8, rev: 0.4, v: 1 };
    const o = this.out(pos, vol * P.v, P.rev);
    const t = this.t;
    this.burst(o, { t, f: P.lp, d: P.d, peak: 0.9, fEnd: P.lp * 0.35 });
    if (P.crack) this.burst(o, { t, type: 'highpass', f: 2500, d: 0.035, peak: 0.6 * P.crack });
    this.tone(o, { t, f: P.th * 1.8, fEnd: P.th * 0.6, d: P.d * 0.7, peak: 0.8 });
    this.burst(o, { t: t + 0.01, f: 500, d: P.d * 1.6, peak: 0.35, brown: true });
  }
  dryFire() { if (!this.ctx) return; const o = this.out(null, 0.4, 0); this.tone(o, { f: 2400, d: 0.02, peak: 0.4, type: 'square' }); }
  click(pos, f = 1800, vol = 0.35) {
    if (!this.ctx) return;
    const o = this.out(pos, vol, 0.05);
    this.burst(o, { type: 'bandpass', f, q: 3, d: 0.03, peak: 0.8 });
    this.tone(o, { f: f * 0.8, d: 0.025, peak: 0.25, type: 'triangle' });
  }
  reload(def, pos, dur) {
    if (!this.ctx) return;
    const t = this.t, o = this.out(pos, pos ? 0.5 : 0.45, 0.05);
    const clk = (at, f, p = 0.7) => { this.burst(o, { t: t + at, type: 'bandpass', f, q: 4, d: 0.04, peak: p }); this.tone(o, { t: t + at, f: f * 0.6, d: 0.03, peak: 0.2, type: 'triangle' }); };
    if (def.shellReload) { for (let i = 0; i < 3; i++) clk(0.3 + i * 0.45, 1400); clk(dur - 0.3, 900); return; }
    clk(dur * 0.18, 1300); this.burst(o, { t: t + dur * 0.22, f: 600, d: 0.08, peak: 0.3 });
    clk(dur * 0.6, 1600); clk(dur * 0.64, 2200, 0.5);
    if (def.type !== 'pistol') { clk(dur * 0.82, 1100); clk(dur * 0.88, 1900); }
    else clk(dur * 0.85, 2400);
  }
  boltCycle(pos) {
    if (!this.ctx) return;
    const t = this.t, o = this.out(pos, 0.5, 0.05);
    this.burst(o, { t: t + 0.25, type: 'bandpass', f: 1200, q: 3, d: 0.06, peak: 0.7 });
    this.burst(o, { t: t + 0.55, type: 'bandpass', f: 1700, q: 3, d: 0.06, peak: 0.7 });
  }
  footstep(pos, vol = 0.5, surface = 0) {
    if (!this.ctx) return;
    const o = this.out(pos, vol, 0.08);
    const f = surface === 1 ? 1500 : surface === 2 ? 700 : 1000;
    this.burst(o, { type: 'bandpass', f: f * (0.8 + Math.random() * 0.4), q: 1.2, d: 0.07, peak: 0.8 });
    this.burst(o, { type: 'lowpass', f: 300, d: 0.05, peak: 0.6 });
  }
  land(pos, vol = 0.6) { if (!this.ctx) return; const o = this.out(pos, vol, 0.1); this.burst(o, { f: 500, d: 0.12, peak: 1 }); }
  jumpGrunt() { }
  hitFlesh(pos) { if (!this.ctx) return; const o = this.out(pos, 0.8, 0.05); this.burst(o, { f: 700, d: 0.08, peak: 1 }); this.tone(o, { f: 160, fEnd: 70, d: 0.08, peak: 0.6 }); }
  headshot(pos, helmet) {
    if (!this.ctx) return;
    const o = this.out(pos, 0.9, 0.2);
    if (helmet) { [2800, 4150, 5600].forEach((f, i) => this.tone(o, { f, d: 0.35 - i * 0.08, peak: 0.25 / (i + 1) })); }
    this.burst(o, { f: 1200, d: 0.07, peak: 0.9 });
  }
  hitMarkerSelf() { if (!this.ctx) return; const o = this.out(null, 0.5, 0); this.burst(o, { f: 400, d: 0.12, peak: 0.9, brown: true }); this.tone(o, { f: 120, fEnd: 60, d: 0.12, peak: 0.7 }); }
  ricochet(pos) {
    if (!this.ctx) return;
    const o = this.out(pos, 0.35, 0.1);
    this.burst(o, { type: 'bandpass', f: 2500, q: 2, d: 0.05, peak: 0.6 });
    if (Math.random() < 0.3) this.tone(o, { f: 3000 + Math.random() * 2000, fEnd: 1200, d: 0.25, peak: 0.08 });
  }
  knifeSwing() { if (!this.ctx) return; const o = this.out(null, 0.5, 0.05); this.burst(o, { type: 'bandpass', f: 800, fEnd: 3500, q: 2, d: 0.18, peak: 0.7 }); }
  knifeHit(pos) { if (!this.ctx) return; const o = this.out(pos, 0.8, 0.1); this.burst(o, { f: 1500, d: 0.12, peak: 1 }); this.tone(o, { f: 200, fEnd: 90, d: 0.1, peak: 0.5 }); }
  knifeWall(pos) { if (!this.ctx) return; const o = this.out(pos, 0.6, 0.1); this.tone(o, { f: 3200, d: 0.2, peak: 0.15 }); this.burst(o, { type: 'highpass', f: 2000, d: 0.05, peak: 0.6 }); }
  draw(type) {
    if (!this.ctx) return;
    const o = this.out(null, 0.35, 0.02);
    if (type === 'knife') this.burst(o, { type: 'highpass', f: 3500, fEnd: 7000, d: 0.25, peak: 0.4 });
    else { this.burst(o, { type: 'bandpass', f: 1200, q: 3, d: 0.04, peak: 0.7 }); this.burst(o, { t: this.t + 0.12, type: 'bandpass', f: 1800, q: 3, d: 0.04, peak: 0.5 }); }
  }
  pin() { if (!this.ctx) return; const o = this.out(null, 0.4, 0); this.tone(o, { f: 2600, d: 0.04, peak: 0.3, type: 'triangle' }); this.tone(o, { t: this.t + 0.08, f: 1800, d: 0.05, peak: 0.25, type: 'triangle' }); }
  throwSnd() { if (!this.ctx) return; const o = this.out(null, 0.4, 0.02); this.burst(o, { type: 'bandpass', f: 600, fEnd: 2000, q: 1, d: 0.15, peak: 0.5 }); }
  bounce(pos) { if (!this.ctx) return; const o = this.out(pos, 0.4, 0.05); this.tone(o, { f: 900 + Math.random() * 400, d: 0.05, peak: 0.4, type: 'triangle' }); this.burst(o, { type: 'bandpass', f: 1500, q: 3, d: 0.03, peak: 0.4 }); }
  explosion(pos, big = false) {
    if (!this.ctx) return;
    const o = this.out(pos, big ? 2 : 1.4, 0.9);
    const t = this.t;
    this.burst(o, { t, f: 1200, fEnd: 120, d: big ? 2.5 : 1.3, peak: 1 });
    this.burst(o, { t, f: 300, d: big ? 3.5 : 1.8, peak: 1, brown: true });
    this.tone(o, { t, f: 90, fEnd: 30, d: big ? 1.5 : 0.8, peak: 1 });
    this.burst(o, { t, type: 'highpass', f: 2000, d: 0.08, peak: 0.8 });
  }
  flashPop(pos) {
    if (!this.ctx) return;
    const o = this.out(pos, 1.3, 0.8);
    this.burst(o, { type: 'highpass', f: 1500, d: 0.25, peak: 1 });
    this.burst(o, { f: 800, d: 0.5, peak: 0.6 });
  }
  smokeHiss(pos) {
    if (!this.ctx) return;
    const o = this.out(pos, 0.7, 0.3);
    this.burst(o, { type: 'highpass', f: 3000, a: 0.05, d: 2.5, peak: 0.5, fEnd: 1200 });
    this.burst(o, { f: 600, a: 0.1, d: 1.5, peak: 0.4 });
  }
  ringing(dur) {
    if (!this.ctx) return;
    const o = this.out(null, 0.25, 0);
    this.tone(o, { f: 3300, a: 0.02, d: dur, peak: 0.25 });
    this.muffle.frequency.cancelScheduledValues(this.t);
    this.muffle.frequency.setValueAtTime(600, this.t);
    this.muffle.frequency.exponentialRampToValueAtTime(20000, this.t + dur);
  }
  beep(pos, hi = false) {
    if (!this.ctx) return;
    const o = this.out(pos, 0.7, 0.2);
    this.tone(o, { f: hi ? 3000 : 2600, d: 0.08, peak: 0.5, type: 'sine' });
  }
  keypad() {
    if (!this.ctx) return;
    const o = this.out(null, 0.4, 0.05);
    this.tone(o, { f: 1400 + Math.floor(Math.random() * 6) * 150, d: 0.07, peak: 0.35, type: 'square' });
  }
  defuseTick(pos) { this.click(pos, 2600, 0.3); }
  buy() { if (!this.ctx) return; const o = this.out(null, 0.4, 0); this.burst(o, { type: 'bandpass', f: 1600, q: 5, d: 0.04, peak: 0.8 }); this.tone(o, { f: 900, d: 0.06, peak: 0.2 }); }
  ui() { if (!this.ctx) return; const o = this.out(null, 0.25, 0); this.tone(o, { f: 1800, d: 0.03, peak: 0.3, type: 'triangle' }); }
  deny() { if (!this.ctx) return; const o = this.out(null, 0.3, 0); this.tone(o, { f: 220, d: 0.12, peak: 0.3, type: 'square' }); }
  roundStart() {
    if (!this.ctx) return;
    const o = this.out(null, 0.3, 0.3), t = this.t;
    [[392, 0], [523, 0.12], [659, 0.24]].forEach(([f, dt]) => this.tone(o, { t: t + dt, f, d: 0.3, peak: 0.25, type: 'triangle' }));
  }
  mvp(win) {
    if (!this.ctx) return;
    const o = this.out(null, 0.35, 0.5), t = this.t;
    const notes = win ? [523, 659, 784, 1046] : [392, 349, 311, 262];
    notes.forEach((f, i) => { this.tone(o, { t: t + i * 0.16, f, d: 0.5, peak: 0.25, type: 'sawtooth' }); this.tone(o, { t: t + i * 0.16, f: f / 2, d: 0.5, peak: 0.2, type: 'triangle' }); });
  }
  heartbeat() { if (!this.ctx) return; const o = this.out(null, 0.5, 0); this.tone(o, { f: 60, fEnd: 40, d: 0.12, peak: 0.6 }); this.tone(o, { t: this.t + 0.18, f: 55, fEnd: 38, d: 0.12, peak: 0.45 }); }

  say(text, rate = 1.0, pitch = 0.75) {
    if (!this.voiceOn || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate; u.pitch = pitch; u.volume = Math.min(1, this.volume * 1.2);
      const vs = speechSynthesis.getVoices().filter(v => /en[-_]/i.test(v.lang));
      const pick = vs.find(v => /male|daniel|david|george|alex|fred/i.test(v.name)) || vs[0];
      if (pick) u.voice = pick;
      speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  }
}
