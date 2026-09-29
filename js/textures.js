// Procedural canvas textures (no external image assets needed).
import * as THREE from 'three';

export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function cv(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Smooth multi-octave value noise painted by upscaling tiny random canvases.
function blotches(ctx, w, h, rand, octaves, color, alpha) {
  for (const [cells, a] of octaves) {
    const s = cv(cells, cells);
    const sc = s.getContext('2d');
    const img = sc.createImageData(cells, cells);
    for (let i = 0; i < cells * cells; i++) {
      const v = rand();
      img.data[i * 4] = color[0]; img.data[i * 4 + 1] = color[1]; img.data[i * 4 + 2] = color[2];
      img.data[i * 4 + 3] = v * 255;
    }
    sc.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = a * alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // draw 3x3 to make the result tile seamlessly
    const cw = w * (cells + 1) / cells, chh = h * (cells + 1) / cells;
    ctx.drawImage(s, 0, 0, cells, cells, -w / cells / 2, -h / cells / 2, cw, chh);
    ctx.restore();
  }
}

function grain(ctx, w, h, rand, amount) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.9));
  }
  ctx.putImageData(img, 0, 0);
}

function tex(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function shade(hex, f) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const cl = v => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${cl(r * f)},${cl(g * f)},${cl(b * f)})`;
}

// Sandstone block wall — the classic desert look.
function sandstone(seed, base = 0xc9a775) {
  const W = 512, c = cv(W), ctx = c.getContext('2d'), r = rng(seed);
  ctx.fillStyle = shade(base, 1); ctx.fillRect(0, 0, W, W);
  const rowH = 64;
  for (let y = 0; y < W; y += rowH) {
    let x = -((y / rowH) % 2) * 60 - r() * 40;
    while (x < W) {
      const bw = 90 + r() * 80;
      const f = 0.86 + r() * 0.22;
      ctx.fillStyle = shade(base, f);
      const draw = (ox) => {
        ctx.fillRect(x + ox + 2, y + 2, bw - 4, rowH - 4);
        // bevel: light top, dark bottom
        ctx.fillStyle = 'rgba(255,240,210,0.18)';
        ctx.fillRect(x + ox + 2, y + 2, bw - 4, 4);
        ctx.fillStyle = 'rgba(60,40,20,0.22)';
        ctx.fillRect(x + ox + 2, y + rowH - 7, bw - 4, 5);
        ctx.fillStyle = shade(base, f);
      };
      draw(0); if (x + bw > W) draw(-W);
      x += bw;
    }
  }
  blotches(ctx, W, W, r, [[4, 0.5], [8, 0.4], [32, 0.25]], [90, 60, 30], 0.35);
  blotches(ctx, W, W, r, [[6, 0.5], [16, 0.3]], [255, 235, 200], 0.25);
  // mortar
  ctx.fillStyle = 'rgba(70,50,30,0.55)';
  for (let y = 0; y < W; y += rowH) ctx.fillRect(0, y, W, 2);
  // chips
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(70,45,25,${0.1 + r() * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(r() * W, r() * W, 1 + r() * 5, 1 + r() * 3, r() * 3, 0, 7);
    ctx.fill();
  }
  grain(ctx, W, W, r, 22);
  return c;
}

function plaster(seed, base = 0xd8c49b) {
  const W = 512, c = cv(W), ctx = c.getContext('2d'), r = rng(seed);
  ctx.fillStyle = shade(base, 1); ctx.fillRect(0, 0, W, W);
  blotches(ctx, W, W, r, [[3, 0.6], [7, 0.5], [20, 0.3]], [120, 90, 55], 0.4);
  blotches(ctx, W, W, r, [[5, 0.6], [12, 0.3]], [255, 245, 220], 0.3);
  // exposed bricks where plaster has fallen off (irregular, subtle)
  for (let p = 0; p < 2; p++) {
    const px = r() * W, py = r() * W;
    ctx.save();
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const bx = px + (r() - 0.5) * 70, by = py + (r() - 0.5) * 40;
      ctx.moveTo(bx + 30, by);
      ctx.ellipse(bx, by, 22 + r() * 22, 12 + r() * 14, r() * 3, 0, 7);
    }
    ctx.clip();
    for (let y = py - 90; y < py + 90; y += 16) {
      for (let x = px - 120 - ((y / 16) % 2) * 15; x < px + 120; x += 30) {
        ctx.fillStyle = shade(0xa58866, 0.85 + r() * 0.2);
        ctx.fillRect(x, y, 28, 14);
      }
    }
    ctx.fillStyle = 'rgba(60,40,20,0.25)'; ctx.fillRect(px - 130, py - 100, 260, 200);
    ctx.restore();
  }
  // drips/stains from top
  for (let i = 0; i < 26; i++) {
    const x = r() * W, len = 60 + r() * 220;
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, 'rgba(80,60,40,0.25)'); g.addColorStop(1, 'rgba(80,60,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, 3 + r() * 10, len);
  }
  // cracks
  ctx.strokeStyle = 'rgba(60,45,30,0.45)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 10; i++) {
    let x = r() * W, y = r() * W;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 30; y += r() * 18; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  grain(ctx, W, W, r, 16);
  return c;
}

function sand(seed) {
  const W = 512, c = cv(W), ctx = c.getContext('2d'), r = rng(seed);
  ctx.fillStyle = '#bd9d70'; ctx.fillRect(0, 0, W, W);
  blotches(ctx, W, W, r, [[3, 0.6], [6, 0.5], [14, 0.4], [40, 0.3]], [110, 80, 45], 0.45);
  blotches(ctx, W, W, r, [[5, 0.5], [18, 0.3]], [245, 225, 185], 0.35);
  for (let i = 0; i < 1400; i++) {
    const g = r() < 0.5 ? 80 : 225;
    ctx.fillStyle = `rgba(${g},${g * 0.85},${g * 0.65},${0.15 + r() * 0.35})`;
    const s = 0.8 + r() * 2.8;
    ctx.fillRect(r() * W, r() * W, s, s);
  }
  // pebbles
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * W, s = 2 + r() * 5;
    ctx.fillStyle = `rgba(90,75,60,0.5)`;
    ctx.beginPath(); ctx.ellipse(x + 1, y + 1.5, s, s * 0.7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = shade(0xb09a80, 0.8 + r() * 0.4);
    ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.7, 0, 0, 7); ctx.fill();
  }
  grain(ctx, W, W, r, 26);
  return c;
}

function tiles(seed, base = 0xbfae8e) {
  const W = 512, c = cv(W), ctx = c.getContext('2d'), r = rng(seed);
  ctx.fillStyle = '#6a5a45'; ctx.fillRect(0, 0, W, W);
  const n = 4, s = W / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    ctx.fillStyle = shade(base, 0.82 + r() * 0.26);
    ctx.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
    ctx.fillStyle = 'rgba(255,250,235,0.12)'; ctx.fillRect(x * s + 3, y * s + 3, s - 6, 3);
    ctx.fillStyle = 'rgba(40,30,20,0.18)'; ctx.fillRect(x * s + 3, y * s + s - 6, s - 6, 3);
    if (r() < 0.35) { // crack
      ctx.strokeStyle = 'rgba(50,40,30,0.5)'; ctx.lineWidth = 1;
      let px = x * s + r() * s, py = y * s + 4;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 30; py += s / 6; ctx.lineTo(px, py); }
      ctx.stroke();
    }
  }
  blotches(ctx, W, W, r, [[4, 0.5], [10, 0.4], [30, 0.3]], [90, 70, 45], 0.35);
  blotches(ctx, W, W, r, [[6, 0.5]], [230, 200, 150], 0.25);
  grain(ctx, W, W, r, 18);
  return c;
}

function dirt(seed) {
  const W = 512, c = cv(W), ctx = c.getContext('2d'), r = rng(seed);
  ctx.fillStyle = '#8a7152'; ctx.fillRect(0, 0, W, W);
  blotches(ctx, W, W, r, [[3, 0.6], [8, 0.5], [24, 0.4]], [50, 38, 25], 0.5);
  blotches(ctx, W, W, r, [[5, 0.5], [14, 0.4]], [190, 160, 120], 0.3);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(40,30,20,${r() * 0.3})`;
    ctx.fillRect(r() * W, r() * W, 1 + r() * 3, 1 + r() * 3);
  }
  grain(ctx, W, W, r, 24);
  return c;
}

function concrete(seed) {
  const W = 256, c = cv(W), ctx = c.getContext('2d'), r = rng(seed);
  ctx.fillStyle = '#9d9181'; ctx.fillRect(0, 0, W, W);
  blotches(ctx, W, W, r, [[3, 0.5], [8, 0.5], [20, 0.4]], [50, 45, 40], 0.45);
  blotches(ctx, W, W, r, [[6, 0.4]], [220, 215, 200], 0.3);
  grain(ctx, W, W, r, 20);
  return c;
}

function crate(seed) {
  const W = 256, c = cv(W), ctx = c.getContext('2d'), r = rng(seed);
  const base = 0x9a7446;
  // planks
  const planks = 5, pw = W / planks;
  for (let i = 0; i < planks; i++) {
    ctx.fillStyle = shade(base, 0.85 + r() * 0.25);
    ctx.fillRect(i * pw, 0, pw, W);
    ctx.strokeStyle = 'rgba(60,35,15,0.35)';
    for (let k = 0; k < 7; k++) {
      ctx.lineWidth = 0.6 + r();
      ctx.beginPath();
      const x0 = i * pw + r() * pw;
      ctx.moveTo(x0, 0);
      ctx.bezierCurveTo(x0 + (r() - 0.5) * 12, W * 0.3, x0 + (r() - 0.5) * 12, W * 0.6, x0 + (r() - 0.5) * 8, W);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40,22,8,0.7)'; ctx.fillRect(i * pw, 0, 2, W);
  }
  // frame
  const fw = 26;
  const frame = (x, y, w, h) => {
    ctx.fillStyle = shade(base, 0.72 + r() * 0.1); ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(35,20,8,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = 'rgba(255,230,190,0.12)'; ctx.fillRect(x + 2, y + 2, w - 4, 3);
  };
  frame(0, 0, W, fw); frame(0, W - fw, W, fw); frame(0, 0, fw, W); frame(W - fw, 0, fw, W);
  // diagonal brace
  ctx.save();
  ctx.translate(W / 2, W / 2); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = shade(base, 0.7);
  ctx.fillRect(-W * 0.62, -fw / 2, W * 1.24, fw);
  ctx.strokeStyle = 'rgba(35,20,8,0.8)'; ctx.lineWidth = 2;
  ctx.strokeRect(-W * 0.62, -fw / 2, W * 1.24, fw);
  ctx.restore();
  frame(0, 0, W, fw); frame(0, W - fw, W, fw);
  // nails
  ctx.fillStyle = '#3a3530';
  for (const [x, y] of [[13, 13], [W - 13, 13], [13, W - 13], [W - 13, W - 13], [W / 2, 13], [W / 2, W - 13]]) {
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill();
  }
  // stencil text
  ctx.fillStyle = 'rgba(30,20,10,0.35)';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('FRAGILE', 60, 120);
  blotches(ctx, W, W, r, [[4, 0.5], [12, 0.3]], [40, 25, 10], 0.3);
  grain(ctx, W, W, r, 16);
  return c;
}

function door(seed, kind) {
  const W = 256, H = 512, c = cv(W, H), ctx = c.getContext('2d'), r = rng(seed);
  if (kind === 'metal') {
    ctx.fillStyle = '#3d6a84'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(i * 32, 0, 3, H);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(i * 32 + 3, 0, 2, H);
    }
    blotches(ctx, W, H, r, [[4, 0.6], [12, 0.5], [30, 0.4]], [120, 60, 25], 0.55);
  } else {
    const base = 0x6d4a2c;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = shade(base, 0.8 + r() * 0.35); ctx.fillRect(i * W / 6, 0, W / 6, H);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(i * W / 6, 0, 2, H);
    }
    ctx.fillStyle = '#2d2a26';
    ctx.fillRect(0, 70, W, 16); ctx.fillRect(0, H - 90, W, 16);
    ctx.fillStyle = '#1d1a16';
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(16 + i * 32, 78, 3, 0, 7); ctx.arc(16 + i * 32, H - 82, 3, 0, 7); ctx.fill(); }
    blotches(ctx, W, H, r, [[4, 0.5], [16, 0.3]], [30, 20, 10], 0.35);
  }
  ctx.fillStyle = '#222'; ctx.fillRect(W - 40, H / 2, 16, 40);
  grain(ctx, W, H, r, 18);
  return c;
}

function shutter(seed) {
  const W = 256, c = cv(W), ctx = c.getContext('2d'), r = rng(seed);
  const cols = [0x4b7a6a, 0x5a7fa0, 0x8b5a3a, 0x6b6f4a];
  const col = cols[Math.floor(r() * cols.length)];
  ctx.fillStyle = '#2a2018'; ctx.fillRect(0, 0, W, W);
  for (const x0 of [8, W / 2 + 2]) {
    ctx.fillStyle = shade(col, 1); ctx.fillRect(x0, 8, W / 2 - 10, W - 16);
    for (let y = 16; y < W - 16; y += 14) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0 + 6, y, W / 2 - 22, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x0 + 6, y + 4, W / 2 - 22, 2);
    }
  }
  blotches(ctx, W, W, r, [[4, 0.6], [14, 0.5]], [200, 190, 160], 0.35);
  grain(ctx, W, W, r, 20);
  return c;
}

function siteLetter(letter) {
  const W = 512, c = cv(W), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, W);
  ctx.font = 'bold 380px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(160,20,10,0.9)'; ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(175,30,20,0.92)';
  ctx.fillText(letter, W / 2, W / 2 + 10);
  ctx.shadowBlur = 0;
  // drips
  const r = rng(letter.charCodeAt(0) * 7);
  for (let i = 0; i < 10; i++) {
    const x = W * 0.3 + r() * W * 0.4, y = W * 0.7 + r() * 40, l = 20 + r() * 90;
    ctx.fillStyle = 'rgba(165,28,18,0.8)'; ctx.fillRect(x, y, 4, l);
    ctx.beginPath(); ctx.arc(x + 2, y + l, 4, 0, 7); ctx.fill();
  }
  return c;
}

function radial(stops, W = 128) {
  const c = cv(W), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  return c;
}

function smokePuff(seed) {
  const W = 128, c = cv(W), ctx = c.getContext('2d'), r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const x = W / 2 + (r() - 0.5) * W * 0.45, y = W / 2 + (r() - 0.5) * W * 0.45, rad = W * (0.12 + r() * 0.2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  }
  // fade edges
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createRadialGradient(W / 2, W / 2, W * 0.1, W / 2, W / 2, W / 2);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  return c;
}

function muzzle() {
  const W = 256, c = cv(W), ctx = c.getContext('2d');
  ctx.translate(W / 2, W / 2);
  for (let i = 0; i < 7; i++) {
    ctx.rotate(Math.PI * 2 / 7 + (i % 2) * 0.2);
    const g = ctx.createLinearGradient(0, 0, W * 0.48, 0);
    g.addColorStop(0, 'rgba(255,245,200,1)'); g.addColorStop(0.4, 'rgba(255,170,60,0.8)'); g.addColorStop(1, 'rgba(255,90,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(W * (0.3 + (i % 3) * 0.08), 0); ctx.lineTo(0, 10); ctx.fill();
  }
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.25);
  g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.5, 'rgba(255,200,90,0.7)'); g.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, W * 0.25, 0, 7); ctx.fill();
  return c;
}

function bulletHole() {
  const W = 64, c = cv(W), ctx = c.getContext('2d');
  let g = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
  g.addColorStop(0, 'rgba(10,8,6,1)'); g.addColorStop(0.22, 'rgba(20,15,10,0.95)');
  g.addColorStop(0.3, 'rgba(60,45,30,0.6)'); g.addColorStop(0.6, 'rgba(80,60,40,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  const r = rng(99);
  ctx.strokeStyle = 'rgba(30,20,10,0.6)';
  for (let i = 0; i < 6; i++) {
    const a = r() * 7;
    ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * 6, W / 2 + Math.sin(a) * 6);
    ctx.lineTo(W / 2 + Math.cos(a) * (12 + r() * 14), W / 2 + Math.sin(a) * (12 + r() * 14)); ctx.stroke();
  }
  return c;
}

function bloodSplat(seed) {
  const W = 128, c = cv(W), ctx = c.getContext('2d'), r = rng(seed);
  for (let i = 0; i < 24; i++) {
    const a = r() * 7, d = r() * W * 0.35;
    ctx.fillStyle = `rgba(${90 + r() * 40},5,5,${0.5 + r() * 0.4})`;
    ctx.beginPath(); ctx.arc(W / 2 + Math.cos(a) * d, W / 2 + Math.sin(a) * d, 2 + r() * (12 - d / 6), 0, 7); ctx.fill();
  }
  return c;
}

function grime() {
  // alphaMap samples the green channel, so paint an opaque grayscale gradient
  const c = cv(4, 128), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 128, 0, 0);
  g.addColorStop(0, '#fff'); g.addColorStop(0.25, '#777'); g.addColorStop(1, '#000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 128);
  return c;
}

function cloth(seed, colors, blobs = true) {
  const W = 256, c = cv(W), ctx = c.getContext('2d'), r = rng(seed);
  ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, W, W);
  if (blobs) {
    for (let k = 1; k < colors.length; k++) {
      ctx.fillStyle = colors[k];
      for (let i = 0; i < 22; i++) {
        ctx.beginPath();
        const x = r() * W, y = r() * W;
        ctx.moveTo(x, y);
        for (let a = 0; a < 7; a++) ctx.lineTo(x + Math.cos(a) * (8 + r() * 26), y + Math.sin(a) * (8 + r() * 20));
        ctx.fill();
      }
    }
  }
  // weave
  ctx.globalAlpha = 0.08;
  for (let y = 0; y < W; y += 2) { ctx.fillStyle = y % 4 ? '#000' : '#fff'; ctx.fillRect(0, y, W, 1); }
  ctx.globalAlpha = 1;
  grain(ctx, W, W, r, 14);
  return c;
}

export function buildTextures() {
  const T = {};
  T.sandstone = tex(sandstone(11));
  T.sandstone2 = tex(sandstone(23, 0xbe9c6c));
  T.plaster = tex(plaster(31));
  T.plaster2 = tex(plaster(47, 0xcfb58a));
  T.sand = tex(sand(5));
  T.tiles = tex(tiles(8));
  T.dirt = tex(dirt(9));
  T.concrete = tex(concrete(13));
  T.crate = tex(crate(17));
  T.crate2 = tex(crate(29));
  T.doorWood = tex(door(3, 'wood'));
  T.doorMetal = tex(door(4, 'metal'));
  T.shutter = [tex(shutter(1)), tex(shutter(2)), tex(shutter(5))];
  T.letterA = tex(siteLetter('A'), { repeat: false });
  T.letterB = tex(siteLetter('B'), { repeat: false });
  T.smoke = tex(smokePuff(4), { repeat: false });
  T.soft = tex(radial([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]), { repeat: false });
  T.spark = tex(radial([[0, 'rgba(255,255,230,1)'], [0.3, 'rgba(255,200,90,0.9)'], [1, 'rgba(255,120,0,0)']]), { repeat: false });
  T.muzzle = tex(muzzle(), { repeat: false });
  T.hole = tex(bulletHole(), { repeat: false });
  T.blood = tex(bloodSplat(3), { repeat: false });
  T.grime = tex(grime(), { repeat: false, srgb: false });
  T.clothT = tex(cloth(7, ['#7a6546', '#5d4b32', '#8f7a57', '#4a3c29']));
  T.clothT2 = tex(cloth(8, ['#3b3a30', '#2c2b24', '#4a4838']));
  T.clothCT = tex(cloth(9, ['#39465a', '#2b3546', '#4a5870', '#222a36']));
  T.clothCT2 = tex(cloth(10, ['#2e3440', '#262b35']));
  T.vest = tex(cloth(12, ['#2d2f2a', '#23251f'], false));
  return T;
}
