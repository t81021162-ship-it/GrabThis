/* Witherholm — HUD, heart monitor, messages, chapter cards, notes, choice panel and menus. */

const UI = (() => {
  const $ = id => document.getElementById(id);
  let ecg, ecgCtx, ecgX = 0, ecgPrevY = 28, ecgPhase = 0;
  const KEY_NAMES = { moth: 'Moth key', serpent: 'Serpent key', crown: 'Crown key' };
  let introState = null;
  let noteIsOpen = false;

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
  // Nell thinking out loud
  const thought = (text, seconds = 5) => message(text, 'thought', seconds);

  // a voice with a name, at the bottom of the screen
  let subT = null;
  function subtitle(who, text, seconds = 4.2, cls = '') {
    const el = $('subtitle');
    el.className = cls;
    el.innerHTML = '';
    if (who) { const w = document.createElement('span'); w.className = 'who'; w.textContent = who; el.appendChild(w); }
    const t = document.createElement('span'); t.className = 'txt'; t.textContent = text; el.appendChild(t);
    el.hidden = false; el.style.opacity = '1';
    clearTimeout(subT);
    subT = setTimeout(() => { el.style.opacity = '0'; subT = setTimeout(() => { el.hidden = true; }, 700); }, seconds * 1000);
  }

  let chapT = null;
  function chapter(n) {
    const c = Story.chapters[n]; if (!c) return;
    const el = $('chapter');
    el.querySelector('.ch-num').textContent = 'Chapter ' + c[0];
    el.querySelector('h2').textContent = c[1];
    el.querySelector('p').textContent = c[2];
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    Sound.play('bell');
    clearTimeout(chapT); chapT = setTimeout(() => { el.hidden = true; el.classList.remove('show'); }, 5200);
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

  function timer(label, seconds) {
    const el = $('timer');
    if (label === null || seconds === null || seconds === undefined) { el.hidden = true; return; }
    el.hidden = false;
    $('timer-label').textContent = label;
    const s = Math.max(0, Math.ceil(seconds));
    $('timer-val').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    el.classList.toggle('urgent', seconds < 25);
  }

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
    const items = P.keys.map(k => KEY_NAMES[k]);
    if (P.oil) items.push('Lamp oil');
    if (P.carrying) items.push('Carrying Mara');
    $('keys').innerHTML = items.map(k => `<div class="key">${k}</div>`).join('');
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
    const n = Story.notes[id];
    $('note-title').textContent = n.title;
    $('note-body').innerHTML = n.body;
    show('note', true); noteIsOpen = true;
    document.querySelector('.paper').scrollTop = 0;
  }
  function closeNote() { show('note', false); noteIsOpen = false; }

  // the Files screen: every note you have read, in story order
  function openFiles(read) {
    const list = $('files-list');
    list.innerHTML = '';
    const ids = Story.noteOrder.filter(id => read.includes(id));
    if (!ids.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'You have not found any papers yet.'; list.appendChild(p); }
    for (const id of ids) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'file'; b.textContent = Story.notes[id].title;
      b.addEventListener('click', () => { Sound.play('note'); openNote(id); });
      list.appendChild(b);
    }
    $('files-count').textContent = `${ids.length} of ${Story.noteOrder.length} found`;
    show('files', true);
  }

  // ---------- the choice at the Root ----------
  function openChoice(P, handler) {
    const need = 3, herbsOk = P.herbs >= need, oilOk = P.oil;
    const box = $('choice-options');
    box.innerHTML = '';
    const opt = (key, title, desc, ok, why) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice-btn'; b.disabled = !ok;
      b.innerHTML = `<b>${title}</b><span>${desc}</span>${ok ? '' : `<em>${why}</em>`}`;
      b.addEventListener('click', () => { show('choice', false); handler(key); });
      box.appendChild(b);
    };
    opt('burn', 'Burn the Root', 'The oil will take the house, and everything joined to it. Mara is joined to it.', oilOk, 'You have nothing to burn it with. Somewhere in the house there was lamp oil.');
    opt('free', 'Cut Mara free', 'Three measures of Ashroot on the bond. She will come back out, changed. The house will not let you leave quietly.', herbsOk, `You need ${need} Ashroot herbs. You have ${P.herbs}.`);
    opt('back', 'Step back', 'Leave her. Use the Crown key. Walk out the front door.', true, '');
    show('choice', true);
  }

  // ---------- typewriter intro ----------
  function runIntro(pages, done) {
    const el = $('intro-text');
    let page = 0, line = 0, ch = 0, timer = null, typing = false, finished = false;
    show('intro', true);
    el.innerHTML = '';
    const lines = () => pages[page];
    function finish() {
      if (finished) return; finished = true;
      clearInterval(timer);
      window.removeEventListener('keydown', onKey); $('intro').removeEventListener('click', onClick);
      show('intro', false); introState = null; done();
    }
    function nextPage() {
      page++;
      if (page >= pages.length) return finish();
      el.innerHTML = ''; line = 0; ch = 0; Fx.strike(); start();
    }
    function start() {
      typing = true;
      clearInterval(timer);
      let cur = document.createElement('p'); el.appendChild(cur);
      timer = setInterval(() => {
        const L = lines();
        if (line >= L.length) { clearInterval(timer); typing = false; return; }
        const text = L[line];
        if (ch === 0 && text === '') { line++; cur = document.createElement('p'); el.appendChild(cur); cur.className = 'gap'; return; }
        cur.textContent = text.slice(0, ++ch);
        if (text[ch - 1] !== ' ') Sound.play('typeclick');
        if (ch >= text.length) { line++; ch = 0; if (line < L.length) { cur = document.createElement('p'); el.appendChild(cur); } }
      }, 34);
    }
    function completePage() {
      clearInterval(timer);
      el.innerHTML = '';
      for (const l of lines()) { const p = document.createElement('p'); p.textContent = l; if (!l) p.className = 'gap'; el.appendChild(p); }
      typing = false;
    }
    function advance() { if (typing) completePage(); else nextPage(); }
    const onKey = e => { if (e.code === 'Escape') { finish(); return; } e.preventDefault(); advance(); };
    const onClick = () => advance();
    window.addEventListener('keydown', onKey); $('intro').addEventListener('click', onClick);
    introState = { finish };
    start();
  }

  // ---------- endings ----------
  function showEnding(key, stats, found) {
    const e = Story.endings[key];
    $('end-kicker').textContent = key === 'fire' ? 'The end' : 'Dawn';
    $('end-title').textContent = e.title;
    const body = $('end-text'); body.innerHTML = '';
    for (const t of e.text) { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); }
    $('win-stats').textContent = stats;
    $('end-found').textContent = `Endings found: ${found} of 3`;
    show('win', true);
  }

  return { init, show, updateECG, message, thought, subtitle, chapter, prompt, saved, objective, timer, updateAmmo, updateInventory, crosshair, bossHealth, openNote, closeNote, openFiles, openChoice, runIntro, showEnding, get noteOpen() { return noteIsOpen; } };
})();
