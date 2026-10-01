/* Witherholm — procedural textures.
   Every surface is painted at load time on a 2D canvas, then handed to three.js
   with either crunchy nearest-neighbour or smooth filtering, plus generated normal maps. */

const Tex = (() => {
  const cache = {};
  let seed = 1337;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rr = (a, b) => a + rnd() * (b - a);

  function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // ---- shared painting helpers ----
  function speckle(g, w, h, n, color, alpha, size = 1) {
    g.fillStyle = color;
    for (let i = 0; i < n; i++) { g.globalAlpha = rnd() * alpha; g.fillRect(rnd() * w | 0, rnd() * h | 0, size, size); }
    g.globalAlpha = 1;
  }
  function blotches(g, w, h, n, color, maxR, alpha) {
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * h, r = rr(maxR * 0.3, maxR);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = rnd() * alpha; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
  }
  function drips(g, w, h, n, color, alpha) {
    g.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const x = rnd() * w | 0, y0 = rr(0, h * 0.4) | 0, len = rr(h * 0.15, h * 0.6) | 0;
      for (let y = y0; y < y0 + len && y < h; y++) { g.globalAlpha = alpha * (1 - (y - y0) / len); g.fillRect(x, y, rnd() < 0.8 ? 1 : 2, 1); }
    }
    g.globalAlpha = 1;
  }
  function grime(g, w, h, amount = 1) {
    blotches(g, w, h, 10 * amount, 'rgba(20,14,6,1)', w * 0.35, 0.35);
    blotches(g, w, h, 4 * amount, 'rgba(60,70,20,1)', w * 0.2, 0.18);   // bloom-coloured mould
    drips(g, w, h, 8 * amount, '#1a120a', 0.35);
    speckle(g, w, h, 400 * amount, '#000', 0.3);
    speckle(g, w, h, 150 * amount, '#fff', 0.06);
  }
  function woodGrain(g, x, y, w, h, base, dark, vertical = false) {
    g.fillStyle = base; g.fillRect(x, y, w, h);
    g.strokeStyle = dark;
    const lines = vertical ? w / 2 : h / 2;
    for (let i = 0; i < lines; i++) {
      g.globalAlpha = rr(0.08, 0.3); g.beginPath();
      if (vertical) { const px = x + rnd() * w; g.moveTo(px, y); g.bezierCurveTo(px + rr(-2, 2), y + h * 0.3, px + rr(-2, 2), y + h * 0.6, px + rr(-1, 1), y + h); }
      else { const py = y + rnd() * h; g.moveTo(x, py); g.bezierCurveTo(x + w * 0.3, py + rr(-2, 2), x + w * 0.6, py + rr(-2, 2), x + w, py + rr(-1, 1)); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  // ---- wall paints ----
  function wallpaper(base, motif, trim) {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    // vertical stripes
    for (let x = 0; x < S; x += 16) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, 0, 2, S); }
    // damask motif
    g.fillStyle = motif;
    for (let yy = 0; yy < 96; yy += 24) for (let xx = 0; xx < S; xx += 32) {
      const ox = xx + ((yy / 24) % 2) * 16 + 8, oy = yy + 12;
      g.globalAlpha = 0.55; g.beginPath();
      g.moveTo(ox, oy - 8); g.quadraticCurveTo(ox + 6, oy - 2, ox, oy + 8); g.quadraticCurveTo(ox - 6, oy - 2, ox, oy - 8); g.fill();
      g.fillRect(ox - 5, oy - 1, 10, 2);
      g.beginPath(); g.arc(ox, oy - 10, 1.5, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    // wainscot panel at the bottom of the wall
    woodGrain(g, 0, 96, S, 32, trim, '#120a05');
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 96, S, 3);
    g.fillStyle = 'rgba(255,220,170,0.12)'; g.fillRect(0, 99, S, 1);
    for (let x = 4; x < S; x += 32) { g.strokeStyle = 'rgba(0,0,0,0.45)'; g.strokeRect(x + 0.5, 104.5, 24, 18); }
    // peeling seams
    g.fillStyle = 'rgba(210,190,150,0.25)';
    for (let i = 0; i < 3; i++) { const x = rnd() * S | 0; g.fillRect(x, rnd() * 60 | 0, 1, rr(10, 40)); }
    grime(g, S, S, 1.2);
    return c;
  }

  function kitchenTile() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#6d6a55'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < 96; y += 12) for (let x = 0; x < S; x += 16) {
      const v = rr(0.85, 1.05);
      g.fillStyle = `rgb(${178 * v | 0},${184 * v | 0},${160 * v | 0})`;
      if (rnd() < 0.04) g.fillStyle = '#3a3528';                  // missing tile
      g.fillRect(x + 1, y + 1, 14, 10);
      if (rnd() < 0.1) { g.strokeStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.moveTo(x + rr(2, 14), y + 1); g.lineTo(x + rr(2, 14), y + 11); g.stroke(); }
    }
    g.fillStyle = '#2c3a2c'; g.fillRect(0, 96, S, 32);
    for (let x = 0; x < S; x += 16) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 96, 1, 32); }
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 95, S, 2);
    grime(g, S, S, 1.5);
    blotches(g, S, S, 3, 'rgba(90,10,6,1)', 20, 0.5);             // old blood
    return c;
  }

  function woodPanel() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    for (let x = 0; x < S; x += 32) {
      woodGrain(g, x, 0, 32, S, `rgb(${rr(52, 62) | 0},${rr(32, 38) | 0},${rr(20, 24) | 0})`, '#140a04', true);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, 0, 2, S);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.strokeRect(x + 5.5, 10.5, 20, 70); g.strokeRect(x + 5.5, 90.5, 20, 30);
      g.strokeStyle = 'rgba(255,210,160,0.08)'; g.strokeRect(x + 6.5, 11.5, 20, 70);
    }
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, S, 4); g.fillRect(0, 84, S, 3);
    grime(g, S, S, 0.8);
    return c;
  }

  function stoneWall() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#1c1a17'; g.fillRect(0, 0, S, S);
    const rows = 8, rh = S / rows;
    for (let r = 0; r < rows; r++) {
      let x = r % 2 ? -rr(8, 20) : 0;
      while (x < S) {
        const bw = rr(22, 40), v = rr(0.75, 1.1);
        g.fillStyle = `rgb(${86 * v | 0},${80 * v | 0},${70 * v | 0})`;
        g.fillRect(x + 1, r * rh + 1, bw - 2, rh - 2);
        g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 1, r * rh + 1, bw - 2, 1);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 1, r * rh + rh - 3, bw - 2, 2);
        x += bw;
      }
    }
    speckle(g, S, S, 900, '#000', 0.4);
    blotches(g, S, S, 6, 'rgba(70,90,30,1)', 24, 0.35);
    drips(g, S, S, 12, '#0b0805', 0.4);
    return c;
  }

  function bookshelf() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    woodGrain(g, 0, 0, S, S, '#2a180c', '#0d0603');
    const shelfH = 28;
    const palette = ['#5b1a14', '#243a22', '#1f2a44', '#5a4a22', '#3b2030', '#6b5a3c', '#2b2b2b', '#4a2a12'];
    for (let y = 6; y < S - 8; y += shelfH) {
      g.fillStyle = '#080402'; g.fillRect(4, y, S - 8, shelfH - 6);
      let x = 5;
      while (x < S - 8) {
        const bw = rr(3, 7) | 0, bh = rr(shelfH - 14, shelfH - 7) | 0;
        if (rnd() < 0.08) { x += bw * 2; continue; }
        const lean = rnd() < 0.07;
        g.fillStyle = palette[rnd() * palette.length | 0];
        if (lean) { g.save(); g.translate(x, y + shelfH - 6); g.rotate(-0.3); g.fillRect(0, -bh, bw, bh); g.restore(); x += bw + 4; continue; }
        g.fillRect(x, y + shelfH - 6 - bh, bw, bh);
        g.fillStyle = 'rgba(210,180,90,0.35)'; g.fillRect(x, y + shelfH - 6 - bh + 3, bw, 1);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + bw - 1, y + shelfH - 6 - bh, 1, bh);
        x += bw;
      }
      g.fillStyle = '#3a2211'; g.fillRect(0, y + shelfH - 6, S, 4);
    }
    g.fillStyle = '#1b0e06'; g.fillRect(0, 0, 4, S); g.fillRect(S - 4, 0, 4, S);
    speckle(g, S, S, 300, '#000', 0.3);
    blotches(g, S, S, 4, 'rgba(160,150,120,1)', 18, 0.12); // cobweb haze
    return c;
  }

  // ---- floors ----
  function planks(base) {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    const ph = 16;
    for (let y = 0; y < S; y += ph) {
      let x = -(rnd() * 64 | 0);
      while (x < S) {
        const len = rr(48, 90) | 0, v = rr(0.8, 1.1);
        woodGrain(g, x, y, len, ph, `rgb(${base[0] * v | 0},${base[1] * v | 0},${base[2] * v | 0})`, '#0d0603');
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, y, 1, ph);
        x += len;
      }
      g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(0, y, S, 1);
      g.fillStyle = 'rgba(255,220,180,0.05)'; g.fillRect(0, y + 1, S, 1);
    }
    grime(g, S, S, 0.7);
    return c;
  }
  function marble() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    const n = 4, ts = S / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dark = (x + y) % 2 === 1;
      g.fillStyle = dark ? '#1d1a18' : '#9c958a'; g.fillRect(x * ts, y * ts, ts, ts);
      g.strokeStyle = dark ? 'rgba(120,110,100,0.35)' : 'rgba(40,35,30,0.35)';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x * ts + rnd() * ts, y * ts); g.bezierCurveTo(x * ts + rnd() * ts, y * ts + ts * 0.3, x * ts + rnd() * ts, y * ts + ts * 0.7, x * ts + rnd() * ts, y * ts + ts); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x * ts, y * ts, ts, 1); g.fillRect(x * ts, y * ts, 1, ts);
    }
    grime(g, S, S, 0.8);
    return c;
  }
  function floorTile() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    const n = 8, ts = S / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = (x + y) % 2 ? '#222520' : '#8d9281';
      g.fillRect(x * ts, y * ts, ts, ts);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x * ts, y * ts, ts, 1); g.fillRect(x * ts, y * ts, 1, ts);
    }
    grime(g, S, S, 1.4);
    blotches(g, S, S, 3, 'rgba(80,8,4,1)', 26, 0.5);
    return c;
  }
  function carpet() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#3e0f10'; g.fillRect(0, 0, S, S);
    speckle(g, S, S, 3000, '#1a0405', 0.5);
    speckle(g, S, S, 1200, '#6b2320', 0.4);
    g.strokeStyle = 'rgba(190,150,70,0.35)'; g.lineWidth = 2;
    g.strokeRect(10, 10, S - 20, S - 20);
    g.lineWidth = 1; g.strokeStyle = 'rgba(190,150,70,0.25)';
    for (let i = 0; i < 4; i++) { g.save(); g.translate(S / 2, S / 2); g.rotate(i * Math.PI / 2); g.beginPath(); g.moveTo(0, -30); g.lineTo(12, -12); g.lineTo(0, 0); g.lineTo(-12, -12); g.closePath(); g.stroke(); g.restore(); }
    blotches(g, S, S, 8, 'rgba(0,0,0,1)', 30, 0.4);
    return c;
  }
  function flagstone() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#12100e'; g.fillRect(0, 0, S, S);
    const n = 3, ts = S / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = rr(0.7, 1.05);
      g.fillStyle = `rgb(${70 * v | 0},${66 * v | 0},${60 * v | 0})`;
      g.beginPath();
      g.moveTo(x * ts + rr(1, 4), y * ts + rr(1, 4)); g.lineTo(x * ts + ts - rr(1, 4), y * ts + rr(1, 4));
      g.lineTo(x * ts + ts - rr(1, 4), y * ts + ts - rr(1, 4)); g.lineTo(x * ts + rr(1, 4), y * ts + ts - rr(1, 4)); g.fill();
    }
    speckle(g, S, S, 1200, '#000', 0.45);
    blotches(g, S, S, 5, 'rgba(60,80,25,1)', 22, 0.35);
    blotches(g, S, S, 3, 'rgba(90,6,4,1)', 26, 0.55);
    return c;
  }

  // ---- ceilings ----
  function plaster() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#5c574c'; g.fillRect(0, 0, S, S);
    speckle(g, S, S, 2500, '#000', 0.2);
    blotches(g, S, S, 8, 'rgba(40,28,10,1)', 40, 0.5);                 // water stains
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    for (let i = 0; i < 4; i++) { let x = rnd() * S, y = rnd() * S; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rr(-12, 12); y += rr(-12, 12); g.lineTo(x, y); } g.stroke(); }
    return c;
  }
  function beams() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#211712'; g.fillRect(0, 0, S, S);
    woodGrain(g, 0, 0, S, 22, '#3a2618', '#0d0603');
    woodGrain(g, 0, 64, S, 22, '#3a2618', '#0d0603');
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 22, S, 4); g.fillRect(0, 86, S, 4);
    speckle(g, S, S, 800, '#000', 0.3);
    return c;
  }

  // ---- doors ----
  function emblem(g, kind, cx, cy, s) {
    g.save(); g.translate(cx, cy);
    g.fillStyle = '#b08d3c'; g.strokeStyle = '#3a2a0a'; g.lineWidth = 1;
    g.beginPath(); g.arc(0, 0, s, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#3a2a0a';
    if (kind === 'moth') {
      g.beginPath(); g.ellipse(-s * 0.35, -s * 0.15, s * 0.35, s * 0.45, -0.5, 0, Math.PI * 2); g.ellipse(s * 0.35, -s * 0.15, s * 0.35, s * 0.45, 0.5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(-s * 0.25, s * 0.35, s * 0.2, s * 0.25, 0.4, 0, Math.PI * 2); g.ellipse(s * 0.25, s * 0.35, s * 0.2, s * 0.25, -0.4, 0, Math.PI * 2); g.fill();
      g.fillRect(-1, -s * 0.5, 2, s);
    } else if (kind === 'serpent') {
      g.lineWidth = s * 0.22; g.strokeStyle = '#3a2a0a'; g.beginPath();
      g.moveTo(-s * 0.5, -s * 0.5); g.bezierCurveTo(s * 0.6, -s * 0.6, -s * 0.6, s * 0.1, s * 0.1, s * 0.2); g.bezierCurveTo(s * 0.6, s * 0.3, s * 0.2, s * 0.7, -s * 0.4, s * 0.5); g.stroke();
      g.beginPath(); g.arc(-s * 0.5, -s * 0.5, s * 0.16, 0, Math.PI * 2); g.fill();
    } else if (kind === 'root') {
      g.lineWidth = s * 0.16; g.strokeStyle = '#3a2a0a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, s * 0.6); g.bezierCurveTo(-s * 0.8 + i * s * 0.4, s * 0.1, s * 0.6 - i * s * 0.3, -s * 0.2, -s * 0.5 + i * s * 0.25, -s * 0.7); g.stroke(); }
    } else if (kind === 'crown') {
      g.beginPath(); g.moveTo(-s * 0.6, s * 0.35); g.lineTo(-s * 0.6, -s * 0.3); g.lineTo(-s * 0.3, s * 0.05); g.lineTo(0, -s * 0.5); g.lineTo(s * 0.3, s * 0.05); g.lineTo(s * 0.6, -s * 0.3); g.lineTo(s * 0.6, s * 0.35); g.closePath(); g.fill();
    }
    g.restore();
  }
  function door(kind) {
    const W = 64, H = 128, c = canvas(W, H), g = c.getContext('2d');
    woodGrain(g, 0, 0, W, H, kind === 'crown' ? '#3b2413' : '#4a2e1a', '#120a04', true);
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2;
    g.strokeRect(7, 8, W - 14, 46); g.strokeRect(7, 64, W - 14, 54);
    g.strokeStyle = 'rgba(255,210,160,0.1)'; g.lineWidth = 1;
    g.strokeRect(9, 10, W - 18, 42); g.strokeRect(9, 66, W - 18, 50);
    g.fillStyle = '#8c7236'; g.beginPath(); g.arc(W - 10, 64, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1206'; g.fillRect(W - 11, 69, 2, 4);
    if (kind && kind !== 'plain') emblem(g, kind, W / 2, 32, 12);
    grime(g, W, H, 0.6);
    return c;
  }
  function frame() {
    const S = 64, c = canvas(S), g = c.getContext('2d');
    woodGrain(g, 0, 0, S, S, '#2c1a0e', '#0a0502', true);
    speckle(g, S, S, 200, '#000', 0.4);
    return c;
  }

  // ---- sprites ----
  function splat() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    const col = 'rgba(70,4,3,';
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() < 0.7 ? rnd() * 28 : rr(30, 56), r = d < 28 ? rr(8, 22) : rr(1.5, 5);
      g.fillStyle = col + rr(0.6, 0.95) + ')'; g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r, 0, Math.PI * 2); g.fill();
    }
    return c;
  }
  function star(color) {
    const S = 64, c = canvas(S), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = color;
    g.beginPath(); g.moveTo(32, 0); g.lineTo(35, 29); g.lineTo(64, 32); g.lineTo(35, 35); g.lineTo(32, 64); g.lineTo(29, 35); g.lineTo(0, 32); g.lineTo(29, 29); g.closePath(); g.fill();
    return c;
  }
  function paper() {
    const S = 64, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#cbbd98'; g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(40,30,20,0.6)';
    for (let y = 8; y < S - 6; y += 5) g.fillRect(6, y, rr(30, 52), 1);
    blotches(g, S, S, 3, 'rgba(90,60,20,1)', 20, 0.4);
    return c;
  }

  // ---- organic + new-area textures ----
  // Strokes are generated once, then drawn at every wrap offset so the texture tiles without seams.
  function makeStrokes(n, S, cols, wMin, wMax, reach) {
    const strokes = [];
    for (let i = 0; i < n; i++) {
      let x = rnd() * S, y = rnd() * S; const pts = [[x, y, 0, 0]];
      for (let k = 0; k < 4; k++) { x += rr(-reach, reach); y += rr(-reach, reach); pts.push([x, y, rr(-reach / 2, reach / 2), rr(-reach / 2, reach / 2)]); }
      strokes.push({ c: cols[rnd() * cols.length | 0], w: rr(wMin, wMax), a: rr(0.5, 0.95), pts });
    }
    return strokes;
  }
  function drawStrokes(g, S, strokes, dx = 0, dy = 0) {
    g.lineCap = 'round';
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) for (const s of strokes) {
      g.strokeStyle = s.c; g.lineWidth = s.w; g.globalAlpha = s.a; g.beginPath();
      g.moveTo(s.pts[0][0] + ox + dx, s.pts[0][1] + oy + dy);
      for (let k = 1; k < s.pts.length; k++) { const p = s.pts[k]; g.quadraticCurveTo(p[0] + p[2] + ox + dx, p[1] + p[3] + oy + dy, p[0] + ox + dx, p[1] + oy + dy); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  function glowNodes(g, S, n, maxR, alpha, bright) {
    const nodes = []; for (let i = 0; i < n; i++) nodes.push([rnd() * S, rnd() * S, rr(maxR * 0.4, maxR)]);
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) for (const [x, y, r] of nodes) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, bright ? 'rgba(240,215,90,1)' : 'rgba(150,120,40,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = alpha; g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
  }
  function rootTex(em, floor) {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = em ? '#000' : floor ? '#1e1014' : '#2a1519'; g.fillRect(0, 0, S, S);
    const cols = floor ? ['#33191d', '#3f2024', '#150a0c', '#4e2a2a'] : ['#4a2228', '#5e2c31', '#1d0d10', '#6f3a36', '#36191d'];
    if (!em) {
      const strokes = makeStrokes(floor ? 36 : 48, S, cols, 2, floor ? 7 : 10, 32);
      drawStrokes(g, S, strokes);
      g.globalCompositeOperation = 'lighter'; drawStrokes(g, S, strokes.map(s => ({ ...s, c: 'rgba(120,60,50,0.22)', w: 1, a: 0.6 })), -1, -1); g.globalCompositeOperation = 'source-over';
      speckle(g, S, S, 700, '#000', 0.45);
      if (floor) blotches(g, S, S, 6, 'rgba(120,30,30,1)', 22, 0.3);
    }
    glowNodes(g, S, em ? 10 : 8, 9, em ? 0.9 : 0.35, em);
    return c;
  }
  function glassTex(kind, em) {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    const ph = kind === 'wall' ? 88 : S;
    g.fillStyle = em ? '#000' : '#0c1210'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < ph; y += 32) for (let x = 0; x < S; x += 32) {
      const h = Math.min(32, ph - y);
      const gr = g.createLinearGradient(x, y, x + 32, y + h);
      if (em) { gr.addColorStop(0, 'rgb(46,78,108)'); gr.addColorStop(1, 'rgb(20,36,58)'); } else { gr.addColorStop(0, '#26423f'); gr.addColorStop(1, '#10201f'); }
      g.fillStyle = gr; g.fillRect(x + 2, y + 2, 28, h - 3);
      if (!em) { g.fillStyle = 'rgba(200,230,240,0.10)'; g.beginPath(); g.moveTo(x + 6, y + 2); g.lineTo(x + 15, y + 2); g.lineTo(x + 5, y + h - 2); g.lineTo(x + 2, y + h - 2); g.fill(); }
    }
    if (!em) {
      if (kind === 'wall') {
        for (let r = 0; r < 5; r++) { let x = r % 2 ? -8 : 0; while (x < S) { const bw = 24, v = rr(0.75, 1.1); g.fillStyle = `rgb(${96 * v | 0},${62 * v | 0},${48 * v | 0})`; g.fillRect(x + 1, 90 + r * 8 + 1, bw - 2, 6); x += bw; } }
      }
      blotches(g, S, S, 8, 'rgba(50,90,30,1)', 26, 0.5);
      drips(g, S, S, 10, '#14200e', 0.4); speckle(g, S, S, 500, '#000', 0.3);
    }
    return c;
  }
  function terracotta() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#2a1a12'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = rr(0.8, 1.1);
      g.fillStyle = `rgb(${168 * v | 0},${92 * v | 0},${60 * v | 0})`; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30);
      g.fillStyle = 'rgba(255,200,150,0.10)'; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 1);
      if (rnd() < 0.25) { g.strokeStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.moveTo(x * 32 + rr(4, 28), y * 32 + 1); g.lineTo(x * 32 + rr(4, 28), y * 32 + 31); g.stroke(); }
    }
    blotches(g, S, S, 10, 'rgba(50,90,28,1)', 24, 0.5); grime(g, S, S, 0.8);
    return c;
  }
  function jars() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    woodGrain(g, 0, 0, S, S, '#2a180c', '#0d0603');
    const shelfH = 32, pal = ['#8a5a1a', '#3a5a2a', '#5a5030', '#6a1a14', '#4a3a5a', '#7a7a3a'];
    for (let y = 4; y < S - 8; y += shelfH) {
      g.fillStyle = '#080402'; g.fillRect(4, y, S - 8, shelfH - 5);
      let x = 6;
      while (x < S - 14) {
        const w = rr(9, 14) | 0, h = rr(14, 22) | 0, by = y + shelfH - 5 - h;
        if (rnd() < 0.1) { x += w; continue; }
        g.fillStyle = pal[rnd() * pal.length | 0]; g.globalAlpha = 0.9; g.fillRect(x, by, w, h); g.globalAlpha = 1;
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 1, by + 1, 2, h - 2);
        g.fillStyle = '#3a3a36'; g.fillRect(x, by - 2, w, 3);
        g.fillStyle = 'rgba(220,210,170,0.8)'; g.fillRect(x + 2, by + h / 2 - 2, w - 4, 4);
        if (rnd() < 0.3) { g.fillStyle = 'rgba(230,200,70,0.9)'; g.fillRect(x + w / 2 - 1, by + 3, 2, 2); }
        x += w + 2;
      }
      g.fillStyle = '#3a2211'; g.fillRect(0, y + shelfH - 5, S, 4);
    }
    speckle(g, S, S, 300, '#000', 0.35); blotches(g, S, S, 3, 'rgba(160,150,120,1)', 18, 0.12);
    return c;
  }
  function web() {
    const S = 64, c = canvas(S), g = c.getContext('2d');
    g.strokeStyle = 'rgba(225,225,215,0.6)'; g.lineWidth = 1;
    const ang = []; for (let a = 0; a <= 90; a += 13 + (rnd() * 5 | 0)) ang.push(a * Math.PI / 180);
    for (const a of ang) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 63, Math.sin(a) * 63); g.stroke(); }
    for (let r = 10; r < 60; r += rr(9, 14)) for (let i = 0; i < ang.length - 1; i++) {
      const a0 = ang[i], a1 = ang[i + 1], am = (a0 + a1) / 2, sag = r * 0.82;
      g.beginPath(); g.moveTo(Math.cos(a0) * r, Math.sin(a0) * r); g.quadraticCurveTo(Math.cos(am) * sag, Math.sin(am) * sag, Math.cos(a1) * r, Math.sin(a1) * r); g.stroke();
    }
    return c;
  }
  function windowTex(storm) {
    const W = 64, H = 96, c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#2b1a0e'; g.fillRect(0, 0, W, H);
    const sky = g.createLinearGradient(0, 8, 0, 88); sky.addColorStop(0, '#2a4066'); sky.addColorStop(1, '#0c1626');
    g.fillStyle = sky; g.fillRect(8, 8, 48, 80);
    const moon = g.createRadialGradient(40, 28, 1, 40, 28, 14); moon.addColorStop(0, '#f2f6ff'); moon.addColorStop(0.35, 'rgba(200,220,255,0.6)'); moon.addColorStop(1, 'rgba(120,150,210,0)');
    g.fillStyle = moon; g.fillRect(8, 8, 48, 80);
    g.strokeStyle = 'rgba(5,8,14,0.95)'; g.lineWidth = 2; g.lineCap = 'round';
    for (let i = 0; i < 5; i++) { let x = 8 + rnd() * 10, y = 88 - rnd() * 30; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += rr(5, 11); y -= rr(3, 14); g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = '#2b1a0e'; g.fillRect(30, 8, 4, 80); g.fillRect(8, 46, 48, 4); g.fillStyle = '#3a2412'; g.fillRect(4, 88, 56, 6);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(9, 9, 20, 36);
    // tattered drapes
    for (const side of [0, 1]) {
      const x0 = side ? 48 : 0;
      g.fillStyle = '#3a0f12'; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 16, 0); g.lineTo(x0 + 16, 50 + rnd() * 25); for (let k = 0; k < 5; k++) g.lineTo(x0 + 16 - k * 3.2, 62 + rnd() * 26); g.lineTo(x0, 70 + rnd() * 20); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; for (let k = 2; k < 16; k += 4) { g.beginPath(); g.moveTo(x0 + k, 0); g.lineTo(x0 + k + rr(-1, 1), 80); g.stroke(); }
    }
    speckle(g, W, H, 200, '#000', 0.35);
    return c;
  }
  function roseTex() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#080709'; g.fillRect(0, 0, S, S);
    const pal = ['#8a1c1c', '#c89a2a', '#23468a', '#2c7a4a', '#7a2a7a', '#d8d0a8'];
    const cx = 64, cy = 64, n = 12;
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, r0 = ring ? 38 : 16, r1 = ring ? 60 : 38;
      const grd = g.createRadialGradient(cx, cy, r0, cx, cy, r1); const col = pal[(i + ring * 2) % pal.length];
      grd.addColorStop(0, col); grd.addColorStop(1, 'rgba(0,0,0,0.6)');
      g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, r1, a0, a1); g.arc(cx, cy, r0, a1, a0, true); g.closePath(); g.fill();
      g.strokeStyle = '#050404'; g.lineWidth = 2; g.stroke();
    }
    g.fillStyle = '#d8b040'; g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#050404'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#6a1010'; g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fill();
    return c;
  }
  function skin() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#9a9682'; g.fillRect(0, 0, S, S);
    blotches(g, S, S, 14, 'rgba(110,100,84,1)', 36, 0.5);
    blotches(g, S, S, 6, 'rgba(120,70,90,1)', 22, 0.4);
    blotches(g, S, S, 8, 'rgba(190,180,150,1)', 26, 0.35);
    drawStrokes(g, S, makeStrokes(16, S, ['#6a3a4a', '#3c4a62', '#5a2a34'], 1, 2, 26).map(s => ({ ...s, a: 0.45 })));
    speckle(g, S, S, 900, '#2a2018', 0.35);
    return c;
  }
  function face(variant) {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    g.drawImage(get('skin').userData.canvas, 0, 0);
    const eye = (x, y, r, milky) => {
      g.fillStyle = '#1a0c0e'; g.beginPath(); g.ellipse(x, y, r + 3, r + 2, 0, 0, Math.PI * 2); g.fill();
      if (milky) { g.fillStyle = '#d8d8c0'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.fillStyle = '#b8b89a'; g.beginPath(); g.arc(x + 1, y + 1, r * 0.35, 0, Math.PI * 2); g.fill(); }
    };
    if (variant === 2) { g.fillStyle = '#1a0c0e'; g.fillRect(14, 50, 36, 10); }
    else { eye(22, 56, 4, true); eye(42, 56, 4, true); }
    g.fillStyle = 'rgba(40,20,24,0.7)'; g.beginPath(); g.moveTo(30, 62); g.lineTo(34, 62); g.lineTo(32, 72); g.closePath(); g.fill();       // nose
    if (variant === 1) { g.fillStyle = '#0c0506'; g.beginPath(); g.ellipse(32, 84, 9, 13, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#cfc8a8'; for (let i = 0; i < 6; i++) g.fillRect(25 + i * 3, 72 + (i % 2), 2, 5); }
    else { g.fillStyle = '#1a0c0e'; g.fillRect(22, 82, 20, 3); g.strokeStyle = 'rgba(200,190,170,0.7)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(23 + i * 3.4, 79); g.lineTo(23 + i * 3.4, 88); g.stroke(); } }
    g.fillStyle = 'rgba(40,10,14,0.5)'; g.fillRect(19, 59, 1, 18);                                                                          // a tear track
    glowNodes(g, S, 3, 7, 0.55, true);
    return c;
  }
  function flame() {
    const S = 64, c = canvas(S), g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 4, 0, 62); grd.addColorStop(0, 'rgba(255,240,170,0.95)'); grd.addColorStop(0.4, 'rgba(255,150,40,0.95)'); grd.addColorStop(1, 'rgba(200,40,0,0)');
    g.fillStyle = grd; g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(52, 22, 56, 46, 32, 62); g.bezierCurveTo(8, 46, 12, 22, 32, 2); g.fill();
    const in_ = g.createLinearGradient(0, 24, 0, 60); in_.addColorStop(0, 'rgba(255,255,230,0.9)'); in_.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = in_; g.beginPath(); g.moveTo(32, 26); g.bezierCurveTo(42, 38, 42, 50, 32, 60); g.bezierCurveTo(22, 50, 22, 38, 32, 26); g.fill();
    return c;
  }
  function leaf() {
    const S = 64, c = canvas(S), g = c.getContext('2d');
    g.strokeStyle = '#1e3a14'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 63); g.quadraticCurveTo(30, 34, 34, 3); g.stroke();
    for (let i = 0; i < 12; i++) for (const s of [-1, 1]) {
      const t = i / 12, y = 60 - t * 54, len = 4 + (1 - Math.abs(t - 0.4)) * 16, x = 32 + Math.sin(t * 2) * 1.5;
      g.fillStyle = `hsl(${95 + rnd() * 30},${40 + rnd() * 20}%,${18 + rnd() * 14}%)`;
      g.beginPath(); g.ellipse(x + s * len * 0.55, y - len * 0.25, len * 0.55, 2.4, s * -0.5, 0, Math.PI * 2); g.fill();
    }
    return c;
  }
  function mist() {
    const S = 128, c = canvas(S), g = c.getContext('2d');
    const blobs = []; for (let i = 0; i < 16; i++) blobs.push([rnd() * S, rnd() * S, rr(22, 44)]);
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) for (const [x, y, r] of blobs) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
    return c;
  }

  // dynamic text decals: scrawls, carvings
  function writing(text, { w = 256, h = 64, color = '#7a0c0c', size = 34, drip = true, carve = false } = {}) {
    const c = canvas(w, h), g = c.getContext('2d');
    g.font = `${size}px "Special Elite", "Courier New", monospace`; g.textBaseline = 'middle';
    const widths = [...text].map(ch => g.measureText(ch).width + rr(0, 3)), total = widths.reduce((a, b) => a + b, 0);
    let x = Math.max(4, (w - total) / 2);
    const bottoms = [];
    [...text].forEach((ch, i) => {
      g.save(); g.translate(x + widths[i] / 2, h * 0.45 + rr(-4, 4)); g.rotate(rr(-0.22, 0.22)); g.fillStyle = color;
      g.shadowColor = carve ? 'rgba(0,0,0,0.9)' : 'rgba(20,0,0,0.6)'; g.shadowBlur = carve ? 2 : 3; g.fillText(ch, -widths[i] / 2, 0); g.restore();
      if (ch !== ' ') bottoms.push(x + widths[i] / 2); x += widths[i];
    });
    if (drip) for (const bx of bottoms) if (rnd() < 0.6) { const len = rr(6, h * 0.45), y0 = h * 0.6; const gr = g.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(bx + rr(-3, 3), y0, rnd() < 0.7 ? 1.5 : 2.5, len); }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }

  // ---- normal maps: the flashlight rakes across real surface detail ----
  function normalFromCanvas(src, strength) {
    const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
    const H = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) H[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255;
    const out = canvas(w, h), og = out.getContext('2d'), img = og.createImageData(w, h), o = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const xl = (x - 1 + w) % w, xr = (x + 1) % w, yu = (y - 1 + h) % h, yd = (y + 1) % h;
      const dx = (H[y * w + xr] - H[y * w + xl]) * strength, dy = (H[yd * w + x] - H[yu * w + x]) * strength;
      const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      o[i] = (-dx / l * 0.5 + 0.5) * 255; o[i + 1] = (dy / l * 0.5 + 0.5) * 255; o[i + 2] = (1 / l * 0.5 + 0.5) * 255; o[i + 3] = 255;
    }
    og.putImageData(img, 0, 0);
    return out;
  }

  const painters = {
    wallRed: () => wallpaper('#4a1614', 'rgba(150,90,60,1)', '#2a170c'),
    wallGreen: () => wallpaper('#233021', 'rgba(140,150,90,1)', '#2b1a0e'),
    wallTile: kitchenTile, panel: woodPanel, stoneWall, bookshelf, jars,
    marble, wood: () => planks([92, 60, 36]), woodDark: () => planks([58, 36, 22]), tile: floorTile, carpet, stone: flagstone, terracotta,
    plaster, beams,
    rootWall: () => rootTex(false, false), rootWallE: () => rootTex(true, false), rootFloor: () => rootTex(false, true), rootFloorE: () => rootTex(true, true),
    glassWall: () => glassTex('wall', false), glassWallE: () => glassTex('wall', true), glassCeil: () => glassTex('ceil', false), glassCeilE: () => glassTex('ceil', true),
    door: () => door('plain'), doorMoth: () => door('moth'), doorSerpent: () => door('serpent'), doorCrown: () => door('crown'), doorRoot: () => door('root'),
    frame, splat, glint: () => star('rgba(255,236,170,0.9)'), muzzle: () => star('rgba(255,170,60,1)'), paper,
    web, window: () => windowTex(), rose: roseTex, skin, faceA: () => face(0), faceB: () => face(1), faceC: () => face(2), flame, leaf, mist,
  };

  // textures that are drawn once on a quad rather than tiled
  const SPRITES = new Set(['splat', 'glint', 'muzzle', 'web', 'window', 'rose', 'flame', 'leaf']);
  const NOMIP = new Set([...SPRITES, 'mist', 'faceA', 'faceB', 'faceC']);
  const EMISSIVE = { glassWall: 'glassWallE', glassCeil: 'glassCeilE', rootWall: 'rootWallE', rootFloor: 'rootFloorE' };
  const BUMP = { marble: 0.9, carpet: 1.4, wood: 2.4, woodDark: 2.4, stone: 3, stoneWall: 3.2, rootWall: 3.6, rootFloor: 3, glassWall: 2, glassCeil: 1.2, skin: 1.6, terracotta: 2.4, wallRed: 1.8, wallGreen: 1.8, plaster: 1.6 };
  let smooth = true;

  function applyFilter(t, name) {
    const noMip = NOMIP.has(name);
    if (smooth || SPRITES.has(name)) { t.magFilter = THREE.LinearFilter; t.minFilter = noMip ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter; t.anisotropy = 4; }
    else { t.magFilter = THREE.NearestFilter; t.minFilter = noMip ? THREE.NearestFilter : THREE.NearestMipmapLinearFilter; t.anisotropy = 1; }
    t.needsUpdate = true;
  }
  function make(c, name) {
    const t = new THREE.CanvasTexture(c);
    if (!SPRITES.has(name)) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.userData.canvas = c; t.userData.name = name;
    applyFilter(t, name);
    return t;
  }
  function get(name) {
    if (!cache[name]) cache[name] = make(painters[name](), name);
    return cache[name];
  }
  function getNormal(name) {
    const key = 'n:' + name;
    if (!cache[key]) {
      const c = get(name).userData.canvas;
      const t = new THREE.CanvasTexture(normalFromCanvas(c, BUMP[name] || 2.2));
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.userData.name = name; cache[key] = t; applyFilter(t, name);
    }
    return cache[key];
  }
  function getEmissive(name) { return EMISSIVE[name] ? get(EMISSIVE[name]) : null; }

  // retro = chunky nearest-neighbour texels, smooth = filtered and sharp
  function setSmooth(v) {
    if (smooth === v) return;
    smooth = v;
    for (const k in cache) applyFilter(cache[k], cache[k].userData.name);
  }

  return { get, getNormal, getEmissive, setSmooth, writing };
})();
