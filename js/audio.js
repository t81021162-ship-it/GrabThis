/* Witherholm — procedural audio.
   Every sound in the game is synthesised here with the Web Audio API:
   no sample files, so there is nothing copyrighted to ship. */

const Sound = (() => {
  let ctx = null;
  let master, sfxBus, ambBus, musicBus, noiseBuf;
  let droneNodes = null;
  let volume = 0.8;
  let ambientTimer = 8;
  let heartTimer = 0;
  let bossDrumTimer = 0;
  let bossMusicOn = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5;
    master = ctx.createGain(); master.gain.value = volume;
    master.connect(comp); comp.connect(ctx.destination);

    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.9; ambBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.7; musicBus.connect(master);

    // two seconds of white noise, reused by every noisy sound
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    startDrone();
  }

  const now = () => ctx.currentTime;
  const ok = () => !!ctx && ctx.state !== 'closed';

  function setVolume(v) {
    volume = v;
    if (master) master.gain.setTargetAtTime(v, now(), 0.05);
  }

  // ---------- building blocks ----------
  function env(gainNode, t, attack, peak, decay) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function spatial(pos) {
    if (!pos) return sfxBus;
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 2.2; p.rolloffFactor = 1.3; p.maxDistance = 60;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; }
    else p.setPosition(pos.x, pos.y, pos.z);
    p.connect(sfxBus);
    return p;
  }

  function noise({ t = now(), dur = 0.3, type = 'bandpass', freq = 1000, q = 1, peak = 0.5, attack = 0.005, sweep = null, dest = sfxBus, rate = 1 }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.playbackRate.value = rate;
    src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain();
    env(g, t, attack, peak, dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 1.5); src.stop(t + attack + dur + 0.05);
    return { src, f, g };
  }

  function tone({ t = now(), freq = 440, to = null, dur = 0.3, type = 'sine', peak = 0.3, attack = 0.005, dest = sfxBus, filter = null }) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + dur);
    const g = ctx.createGain();
    env(g, t, attack, peak, dur);
    let node = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = filter.type || 'lowpass'; f.frequency.value = filter.freq; f.Q.value = filter.q || 0.7; o.connect(f); node = f; }
    node.connect(g); g.connect(dest);
    o.start(t); o.stop(t + attack + dur + 0.05);
    return { o, g };
  }

  // ---------- ambience ----------
  function startDrone() {
    const out = ctx.createGain(); out.gain.value = 0; out.connect(ambBus);
    out.gain.setTargetAtTime(0.055, now(), 3);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; lp.Q.value = 3; lp.connect(out);
    const oscs = [43.6, 43.9, 65.4].map((f, i) => {
      const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 2 ? 0.35 : 0.6; o.connect(g); g.connect(lp); o.start(); return o;
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 70; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();

    // air moving through the house
    const air = ctx.createBufferSource(); air.buffer = noiseBuf; air.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 0.6;
    const airG = ctx.createGain(); airG.gain.value = 0.018;
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.11;
    const lfo2G = ctx.createGain(); lfo2G.gain.value = 180; lfo2.connect(lfo2G); lfo2G.connect(bp.frequency); lfo2.start();
    air.connect(bp); bp.connect(airG); airG.connect(ambBus); air.start();
    droneNodes = { out, oscs, lfo, air };
  }

  function ambientEvent(listenerPos) {
    const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10;
    const pos = { x: listenerPos.x + Math.cos(a) * r, y: 1 + Math.random() * 2, z: listenerPos.z + Math.sin(a) * r };
    const dest = spatial(pos);
    const t = now();
    const kind = Math.random();
    if (kind < 0.3) {          // floorboard creak
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(90 + Math.random() * 60, t);
      o.frequency.linearRampToValueAtTime(140 + Math.random() * 80, t + 0.5);
      o.frequency.linearRampToValueAtTime(100, t + 0.9);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 8;
      const g = ctx.createGain(); env(g, t, 0.08, 0.12, 0.9);
      o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + 1.1);
    } else if (kind < 0.55) {  // distant knock, knock
      for (let i = 0; i < 2 + (Math.random() * 3 | 0); i++) {
        const tt = t + i * (0.35 + Math.random() * 0.2);
        tone({ t: tt, freq: 95, to: 50, dur: 0.18, peak: 0.35, dest });
        noise({ t: tt, dur: 0.06, type: 'lowpass', freq: 600, peak: 0.25, dest });
      }
    } else if (kind < 0.8) {   // breathy whisper
      const n = noise({ t, dur: 1.4 + Math.random(), type: 'bandpass', freq: 1800, q: 6, peak: 0.07, attack: 0.4, dest });
      n.f.frequency.setValueAtTime(1400, t);
      n.f.frequency.linearRampToValueAtTime(2600, t + 0.6);
      n.f.frequency.linearRampToValueAtTime(1100, t + 1.4);
    } else {                   // something heavy dragged
      noise({ t, dur: 1.6, type: 'lowpass', freq: 300, q: 2, peak: 0.12, attack: 0.3, sweep: 180, dest });
    }
  }

  function update(dt, listenerPos, health, bossActive) {
    if (!ok()) return;
    ambientTimer -= dt;
    if (ambientTimer <= 0) { ambientTimer = 7 + Math.random() * 14; ambientEvent(listenerPos); }

    // heartbeat when hurt
    if (health < 45 && health > 0) {
      heartTimer -= dt;
      if (heartTimer <= 0) {
        heartTimer = 0.55 + (health / 45) * 0.5;
        const t = now();
        tone({ t, freq: 62, to: 40, dur: 0.12, peak: 0.55 });
        tone({ t: t + 0.17, freq: 55, to: 38, dur: 0.14, peak: 0.4 });
        Game.onHeartbeat();
      }
    }

    // boss fight pulse
    if (bossActive) {
      bossDrumTimer -= dt;
      if (bossDrumTimer <= 0) {
        bossDrumTimer = 0.62;
        const t = now();
        tone({ t, freq: 70, to: 32, dur: 0.35, peak: 0.45, dest: musicBus });
        if (Math.random() < 0.35) tone({ t: t + 0.31, freq: 70, to: 32, dur: 0.25, peak: 0.3, dest: musicBus });
        noise({ t, dur: 0.1, type: 'highpass', freq: 5000, peak: 0.04, dest: musicBus });
      }
      if (!bossMusicOn) { bossMusicOn = true; stinger(true); }
    } else bossMusicOn = false;
  }

  function setListener(pos, fwd) {
    if (!ok()) return;
    const L = ctx.listener;
    if (L.positionX) {
      const t = now();
      L.positionX.setTargetAtTime(pos.x, t, 0.02); L.positionY.setTargetAtTime(pos.y, t, 0.02); L.positionZ.setTargetAtTime(pos.z, t, 0.02);
      L.forwardX.setTargetAtTime(fwd.x, t, 0.02); L.forwardY.setTargetAtTime(fwd.y, t, 0.02); L.forwardZ.setTargetAtTime(fwd.z, t, 0.02);
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else {
      L.setPosition(pos.x, pos.y, pos.z);
      L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  }

  // ---------- one-shots ----------
  const S = {
    pistol() {
      const t = now();
      noise({ t, dur: 0.22, type: 'lowpass', freq: 5200, sweep: 400, peak: 0.9 });
      noise({ t, dur: 0.45, type: 'bandpass', freq: 900, q: 0.6, peak: 0.25, attack: 0.01, sweep: 200 });
      tone({ t, freq: 150, to: 40, dur: 0.18, peak: 0.8 });
    },
    shotgun() {
      const t = now();
      noise({ t, dur: 0.4, type: 'lowpass', freq: 3800, sweep: 250, peak: 1.0 });
      noise({ t, dur: 0.9, type: 'bandpass', freq: 600, q: 0.5, peak: 0.35, attack: 0.02, sweep: 120 });
      tone({ t, freq: 110, to: 30, dur: 0.3, peak: 1.0 });
      noise({ t: t + 0.45, dur: 0.07, type: 'bandpass', freq: 2200, q: 3, peak: 0.25 });
      noise({ t: t + 0.6, dur: 0.07, type: 'bandpass', freq: 1800, q: 3, peak: 0.25 });
    },
    dryFire() { noise({ dur: 0.04, type: 'bandpass', freq: 3000, q: 4, peak: 0.3 }); },
    reload(kind) {
      const t = now();
      if (kind === 'shell') { noise({ t, dur: 0.05, type: 'bandpass', freq: 1500, q: 3, peak: 0.3 }); return; }
      noise({ t, dur: 0.05, type: 'bandpass', freq: 2400, q: 5, peak: 0.3 });
      noise({ t: t + 0.55, dur: 0.05, type: 'bandpass', freq: 1700, q: 5, peak: 0.35 });
      noise({ t: t + 1.0, dur: 0.07, type: 'bandpass', freq: 2800, q: 4, peak: 0.4 });
    },
    pump() {
      const t = now();
      noise({ t, dur: 0.08, type: 'bandpass', freq: 1400, q: 3, peak: 0.35 });
      noise({ t: t + 0.18, dur: 0.08, type: 'bandpass', freq: 1900, q: 3, peak: 0.35 });
    },
    step(surface) {
      const f = { m: 2600, t: 2400, s: 1500, w: 700, l: 650, c: 420 }[surface] || 800;
      noise({ dur: 0.07 + Math.random() * 0.04, type: 'bandpass', freq: f * (0.85 + Math.random() * 0.3), q: 1.3, peak: surface === 'c' ? 0.07 : 0.14 });
      if (surface === 'w' || surface === 'l') tone({ freq: 70 + Math.random() * 20, to: 50, dur: 0.06, peak: 0.08 });
    },
    impact(pos) { noise({ dur: 0.08, type: 'bandpass', freq: 2500 + Math.random() * 1500, q: 2, peak: 0.25, dest: spatial(pos) }); },
    flesh(pos) {
      const d = spatial(pos);
      noise({ dur: 0.16, type: 'lowpass', freq: 900, sweep: 200, q: 4, peak: 0.6, dest: d });
      tone({ freq: 120, to: 60, dur: 0.1, peak: 0.25, dest: d });
    },
    groan(pos, pitch = 1, len = 1) {
      const t = now(), d = spatial(pos);
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const base = (70 + Math.random() * 30) * pitch;
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * (0.8 + Math.random() * 0.5), t + 0.6 * len);
      o.frequency.linearRampToValueAtTime(base * 0.7, t + 1.3 * len);
      const vib = ctx.createOscillator(); vib.frequency.value = 5 + Math.random() * 4;
      const vg = ctx.createGain(); vg.gain.value = base * 0.06; vib.connect(vg); vg.connect(o.frequency);
      const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 500 * pitch; f1.Q.value = 5;
      const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1100 * pitch; f2.Q.value = 7;
      const g = ctx.createGain(); env(g, t, 0.15, 0.5, 1.2 * len);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(d);
      o.start(t); vib.start(t); o.stop(t + 1.5 * len); vib.stop(t + 1.5 * len);
      noise({ t, dur: 1.0 * len, type: 'bandpass', freq: 700 * pitch, q: 2, peak: 0.08, attack: 0.2, dest: d });
    },
    screech(pos) {
      const t = now(), d = spatial(pos);
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(1800, t + 0.15); o.frequency.exponentialRampToValueAtTime(600, t + 0.5);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 3;
      const g = ctx.createGain(); env(g, t, 0.02, 0.18, 0.5);
      o.connect(f); f.connect(g); g.connect(d); o.start(t); o.stop(t + 0.6);
      noise({ t, dur: 0.45, type: 'highpass', freq: 2500, peak: 0.15, dest: d });
    },
    roar(pos) {
      const t = now(), d = spatial(pos);
      [45, 47.5, 67].forEach((fq, i) => {
        tone({ t, freq: fq * 1.6, to: fq, dur: 1.8, type: 'sawtooth', peak: 0.35, attack: 0.15, dest: d, filter: { freq: 500 + i * 200, q: 2 } });
      });
      noise({ t, dur: 1.9, type: 'bandpass', freq: 400, q: 0.8, peak: 0.5, attack: 0.1, sweep: 150, dest: d });
    },
    slam(pos) {
      const d = spatial(pos), t = now();
      tone({ t, freq: 80, to: 25, dur: 0.6, peak: 1.0, dest: d });
      noise({ t, dur: 0.5, type: 'lowpass', freq: 800, sweep: 100, peak: 0.8, dest: d });
    },
    hurt() {
      const t = now();
      tone({ t, freq: 190, to: 110, dur: 0.22, type: 'sawtooth', peak: 0.28, filter: { freq: 900, q: 2 } });
      noise({ t, dur: 0.18, type: 'lowpass', freq: 700, peak: 0.5 });
    },
    bite(pos) {
      const d = spatial(pos);
      noise({ dur: 0.12, type: 'bandpass', freq: 1200, q: 2, peak: 0.6, dest: d });
      noise({ t: now() + 0.08, dur: 0.2, type: 'lowpass', freq: 500, q: 3, peak: 0.5, dest: d });
    },
    pickup() {
      const t = now();
      [523.25, 659.25, 783.99].forEach((f, i) => tone({ t: t + i * 0.07, freq: f, dur: 0.35, type: 'triangle', peak: 0.12 }));
    },
    keyItem() {
      const t = now();
      [392, 493.88, 587.33, 739.99].forEach((f, i) => tone({ t: t + i * 0.11, freq: f, dur: 0.9, type: 'sine', peak: 0.13 }));
    },
    heal() {
      const t = now();
      noise({ t, dur: 0.4, type: 'bandpass', freq: 3000, q: 1, peak: 0.08, attack: 0.1 });
      [440, 554.37, 659.25].forEach((f, i) => tone({ t: t + i * 0.09, freq: f, dur: 0.6, type: 'sine', peak: 0.1 }));
    },
    door(pos) {
      const t = now(), d = spatial(pos);
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(260, t + 0.35); o.frequency.linearRampToValueAtTime(140, t + 0.8);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 12;
      const g = ctx.createGain(); env(g, t, 0.05, 0.25, 0.8);
      o.connect(f); f.connect(g); g.connect(d); o.start(t); o.stop(t + 1);
      tone({ t: t + 0.85, freq: 90, to: 45, dur: 0.2, peak: 0.4, dest: d });
    },
    locked(pos) {
      const d = spatial(pos), t = now();
      for (let i = 0; i < 3; i++) noise({ t: t + i * 0.09, dur: 0.05, type: 'bandpass', freq: 1500 + i * 200, q: 4, peak: 0.35, dest: d });
    },
    unlock(pos) {
      const d = spatial(pos), t = now();
      noise({ t, dur: 0.06, type: 'bandpass', freq: 2600, q: 5, peak: 0.4, dest: d });
      noise({ t: t + 0.25, dur: 0.1, type: 'bandpass', freq: 1200, q: 3, peak: 0.5, dest: d });
    },
    note() { noise({ dur: 0.25, type: 'highpass', freq: 3000, peak: 0.12, attack: 0.03 }); },
    rise(pos) {
      const d = spatial(pos);
      noise({ dur: 1.2, type: 'lowpass', freq: 400, q: 3, peak: 0.3, attack: 0.2, dest: d });
      S.groan(pos, 0.8, 1.3);
    },
    glass() {
      const t = now(), d = spatial({ x: Game.player.pos.x + 8, y: 2, z: Game.player.pos.z - 6 });
      for (let i = 0; i < 9; i++) tone({ t: t + Math.random() * 0.3, freq: 2500 + Math.random() * 3500, dur: 0.15 + Math.random() * 0.3, type: 'triangle', peak: 0.08, dest: d });
      noise({ t, dur: 0.35, type: 'highpass', freq: 3000, peak: 0.3, dest: d });
    },
    victory() {
      const t = now();
      [261.63, 311.13, 392, 466.16, 523.25].forEach((f, i) => tone({ t: t + i * 0.35, freq: f, dur: 2.5, type: 'triangle', peak: 0.1, attack: 0.3 }));
    },
    death() {
      const t = now();
      tone({ t, freq: 220, to: 40, dur: 2.5, type: 'sawtooth', peak: 0.3, filter: { freq: 600, q: 3 } });
      noise({ t, dur: 2.5, type: 'lowpass', freq: 1200, sweep: 80, peak: 0.4, attack: 0.05 });
    },
  };

  function stinger(big) {
    if (!ok()) return;
    const t = now();
    const freqs = big ? [55, 58.3, 82.4, 87.3, 116.5] : [110, 116.5, 164.8];
    freqs.forEach(f => tone({ t, freq: f * 2, to: f, dur: big ? 3.2 : 1.8, type: 'sawtooth', peak: big ? 0.12 : 0.09, attack: 0.02, dest: musicBus, filter: { freq: 1400, q: 1 } }));
    noise({ t, dur: big ? 2 : 1.2, type: 'highpass', freq: 4000, peak: 0.12, attack: 0.01, sweep: 8000, dest: musicBus });
  }

  function play(name, ...args) {
    if (!ok() || !S[name]) return;
    try { S[name](...args); } catch (e) { /* audio is decorative; never break the game */ }
  }

  return { init, update, setListener, setVolume, play, stinger, get ready() { return !!ctx; } };
})();
