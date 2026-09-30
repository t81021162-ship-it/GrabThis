/* Witherholm — HUD, heart monitor, messages, notes and menus. */

const UI = (() => {
  const $ = id => document.getElementById(id);
  let ecg, ecgCtx, ecgX = 0, ecgPrevY = 28, ecgPhase = 0;
  const KEY_NAMES = { moth: 'Moth key', serpent: 'Serpent key', crown: 'Crown key' };

  function init() {
    ecg = $('ecg'); ecgCtx = ecg.getContext('2d');
  }

  function show(id, v = true) { $(id).hidden = !v; }

  // ---------- heart monitor ----------
  function ecgValue(ph) {
    if (ph < 0.12) return 0;
    if (ph < 0.2) return Math.sin((ph - 0.12) / 0.08 * Math.PI) * 0.12;
    if (ph < 0.28) return 0;
    if (ph < 0.3) return -0.15;
    if (ph < 0.33) return 1 - Math.abs(ph - 0.315) / 0.015;
    if (ph < 0.36) return -0.3;
    if (ph < 0.45) return 0;
    if (ph < 0.6) return Math.sin((ph - 0.45) / 0.15 * Math.PI) * 0.22;
    return 0;
  }

  function updateECG(dt, hp, alive) {
    const W = ecg.width, H = ecg.height, g = ecgCtx;
    const state = hp > 66 ? 'stable' : hp > 33 ? 'caution' : 'danger';
    const bpm = !alive ? 0 : state === 'stable' ? 68 : state === 'caution' ? 96 : 132;
    const color = state === 'stable' ? '#74a35a' : state === 'caution' ? '#d8a02a' : '#c4231d';
    ecgPhase += dt * bpm / 60 * (state === 'danger' ? 0.85 + Math.random() * 0.3 : 1);
    const nx = ecgX + dt * 70;
    let v = alive ? ecgValue(ecgPhase % 1) : 0;
    if (state === 'danger' && alive) v += (Math.random() - 0.5) * 0.06;
    const ny = H / 2 + 4 - v * (H * 0.42);
    g.clearRect(ecgX + 1, 0, 14, H);
    g.strokeStyle = color; g.lineWidth = 2; g.shadowColor = color; g.shadowBlur = 6;
    g.beginPath(); g.moveTo(ecgX, ecgPrevY); g.lineTo(nx, ny); g.stroke();
    ecgX = nx; ecgPrevY = ny;
    if (ecgX > W) { ecgX = 0; g.clearRect(0, 0, 14, H); }
    const cond = $('condition');
    const label = !alive ? 'FLATLINE' : state === 'stable' ? 'STABLE' : state === 'caution' ? 'INJURED' : 'CRITICAL';
    if (cond.textContent !== label) { cond.textContent = label; cond.className = state === 'stable' ? '' : state; }
  }

  // ---------- text ----------
  function message(text, cls = '', seconds = 3.5) {
    const box = $('messages');
    const el = document.createElement('div');
    el.className = 'msg ' + cls; el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => { el.style.opacity = '0'; }, seconds * 1000);
    setTimeout(() => el.remove(), seconds * 1000 + 700);
  }

  let lastPrompt = null;
  function prompt(text) {
    if (text === lastPrompt) return;
    lastPrompt = text;
    const el = $('prompt');
    if (!text) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<kbd>${Input.touch ? 'USE' : 'E'}</kbd> ${text}`;
  }

  function saved() {
    const el = $('saved');
    el.hidden = true; void el.offsetWidth; el.hidden = false;
    clearTimeout(saved.t); saved.t = setTimeout(() => { el.hidden = true; }, 2500);
  }

  function objective(text) { $('objective').innerHTML = text ? `<b>Objective:</b> ${text}` : ''; }

  // ---------- inventory ----------
  function updateAmmo() {
    const P = Player.P, W = WEAPONS[P.current], w = P.weapons[P.current];
    $('mag').textContent = w.mag;
    $('reserve').textContent = P.reserve[W.ammo];
    $('wname').textContent = W.name + (P.reloading ? ' · reloading' : '');
    document.querySelector('#weapon .ammo').classList.toggle('empty', w.mag === 0);
  }
  function updateInventory() {
    const P = Player.P;
    $('herbs').textContent = P.herbs ? `Ashroot ×${P.herbs}${Input.touch ? '' : '  [H]'}` : '';
    $('keys').innerHTML = P.keys.map(k => `<div class="key">${KEY_NAMES[k]}</div>`).join('');
    updateAmmo();
  }

  function crosshair(spread) { $('crosshair').firstElementChild.style.transform = `scale(${spread})`; }

  function bossHealth(f) {
    if (f === null) { show('bossbar', false); return; }
    show('bossbar', true);
    $('bossfill').style.width = Math.max(0, f * 100) + '%';
  }

  // ---------- notes ----------
  function openNote(id) {
    const n = NOTES[id];
    $('note-title').textContent = n.title;
    $('note-body').innerHTML = n.body;
    show('note', true);
  }
  function closeNote() { show('note', false); }

  return { init, show, updateECG, message, prompt, saved, objective, updateAmmo, updateInventory, crosshair, bossHealth, openNote, closeNote };
})();
