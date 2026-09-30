/* Witherholm — procedural textures.
   Every surface is painted at load time on a 2D canvas, then handed to three.js
   with nearest-neighbour filtering for a crunchy late-90s look. */

const Tex = (() => {
  const cache = {};
  let seed = 1337;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rr = (a, b) => a + rnd() * (b - a);

  function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function toTexture(c, { repeat = true, nearest = true } = {}) {
    const t = new THREE.CanvasTexture(c);
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; }
    t.anisotropy = 1;
    return t;
  }

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

  const painters = {
    wallRed: () => wallpaper('#4a1614', 'rgba(150,90,60,1)', '#2a170c'),
    wallGreen: () => wallpaper('#233021', 'rgba(140,150,90,1)', '#2b1a0e'),
    wallTile: kitchenTile, panel: woodPanel, stoneWall, bookshelf,
    marble, wood: () => planks([92, 60, 36]), woodDark: () => planks([58, 36, 22]), tile: floorTile, carpet, stone: flagstone,
    plaster, beams,
    door: () => door('plain'), doorMoth: () => door('moth'), doorSerpent: () => door('serpent'), doorCrown: () => door('crown'),
    frame, splat, glint: () => star('rgba(255,236,170,0.9)'), muzzle: () => star('rgba(255,170,60,1)'), paper,
  };

  function get(name) {
    if (!cache[name]) {
      const c = painters[name]();
      const sprite = ['splat', 'glint', 'muzzle'].includes(name);
      cache[name] = toTexture(c, { repeat: !sprite, nearest: !sprite });
    }
    return cache[name];
  }

  return { get };
})();
