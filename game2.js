/* Pixelforge Level 2 (Incident #0413). Same engine as Level 1 (game.js), with four tasks:
   login detective -> photo clue -> hidden page (view source) -> cookie trick. */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hash = (s) => { let x = 0x811c9dc5; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x; };
  const fmtTime = (sec) => { const s = Math.round(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const initials = (n) => n.split(' ').map((w) => w[0]).join('');
  const N = L2.tasks.length;

  function px(name, scale = 3, cls = '') {
    const g = ICONS[name];
    let rects = '';
    g.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== '.') rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PALETTE[c]}"/>`;
    }));
    return `<svg class="px ${cls}" viewBox="0 0 ${g[0].length} ${g.length}" width="${g[0].length * scale}" height="${g.length * scale}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }

  /* Lena's desk photo. The clue is only visible in the picture itself. */
  function deskPhoto(width) {
    const r = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
    let wave = '';
    for (let i = 0; i < 30; i++) {
      const h = [3, 7, 12, 5, 16, 9, 4, 14, 20, 8, 5, 11, 18, 6, 3, 10, 15, 7, 12, 4, 9, 17, 6, 13, 8, 3, 11, 5, 7, 2][i];
      wave += r(51 + i * 2, 38 - h / 2, 1.2, h, i % 2 ? '#8fd6b4' : '#6fbf9a');
    }
    const big = width === '100%';
    return `<svg viewBox="0 0 160 100" ${big ? 'class="photo-big"' : `width="${width}"`} style="${big ? '' : 'max-width:100%;height:auto;'}display:block" role="img" aria-hidden="true">
      <g shape-rendering="crispEdges">
        ${r(0, 0, 160, 72, '#2b2f45')}${r(0, 0, 160, 2, '#33374f')}
        ${r(8, 8, 34, 28, '#4a4f6c')}${r(10, 10, 30, 24, '#18233a')}${r(32, 14, 4, 4, '#f4d27a')}${r(24, 10, 1, 24, '#4a4f6c')}
        ${r(124, 10, 28, 20, '#4a4f6c')}${r(126, 12, 24, 16, '#a99cf0')}${r(132, 16, 12, 8, '#6f5fc0')}
        ${r(0, 72, 160, 28, '#7d5a3c')}${r(0, 72, 160, 3, '#b88a62')}
        ${r(74, 60, 12, 12, '#23232c')}${r(66, 70, 28, 3, '#23232c')}
        ${r(46, 16, 68, 46, '#14151f')}${r(49, 19, 62, 38, '#162427')}
        ${wave}
        ${r(54, 76, 50, 7, '#3a3f58')}${r(56, 77, 46, 5, '#4a4f6c')}
        ${r(16, 60, 11, 12, '#b88a62')}${r(14, 50, 6, 10, '#4f9a7a')}${r(19, 46, 6, 14, '#8fd6b4')}${r(24, 52, 5, 8, '#4f9a7a')}
        ${r(128, 62, 9, 10, '#e88a9a')}${r(137, 64, 3, 5, '#e88a9a')}${r(130, 58, 1, 3, '#8b8ba3')}${r(133, 56, 1, 4, '#8b8ba3')}
        ${r(28, 66, 18, 4, '#3a3554')}${r(28, 60, 4, 8, '#3a3554')}${r(42, 60, 4, 8, '#3a3554')}
        ${r(86, 45, 36, 19, '#f4d27a')}${r(86, 45, 36, 2, '#e8c35f')}
      </g>
      <g font-family="Consolas, 'Cascadia Mono', ui-monospace, monospace" font-weight="700" fill="#2a2733">
        <text x="89" y="53" font-size="4.4">portal pw:</text>
        <text x="88.5" y="60.5" font-size="4.6">SynthWave88</text>
      </g>
    </svg>`;
  }

  /* ---------- state ---------- */
  const S = {
    started: false, done: false, player: '',
    level: 1, clicks: Array(N + 1).fill(0), secs: Array(N + 1).fill(0), levelStart: 0,
    lastFlag: null, flagged: {},
    browser: { url: 'pixelforge.studio', hist: [], addrDraft: null, loginErr: '', loginUser: '', loginPass: '',
      source: false, cookiesOpen: false, cookieEdit: null, cookieDraft: '', photo: null },
    loggedIn: false, cookies: null, pageRole: 'user', sawPanel: false, evidence: [], accuseMsg: '',
  };
  const roleNow = () => (S.cookies ? String(S.cookies.role).trim().toLowerCase() : 'user');
  /* the portal reads the role cookie when a page loads, like a real site */
  const isAdmin = () => S.loggedIn && S.pageRole === 'admin';

  /* ---------- windows ---------- */
  const APPS = {
    casefile: { title: 'Case File', icon: 'casefile', w: 380, h: 600, x: 'right', y: 16, render: renderCase },
    security: { title: 'Security Center · sign-in log', icon: 'shield', w: 820, h: 560, x: 120, y: 24, render: renderSecurity },
    browser: { title: 'Browser', icon: 'browser', w: 880, h: 620, x: 150, y: 44, render: renderBrowser },
  };
  let zTop = 10;

  function openApp(id) {
    let win = $(`#win-${id}`);
    if (!win) {
      const a = APPS[id];
      const desk = $('#desktop').getBoundingClientRect();
      const w = Math.min(a.w, desk.width - 120);
      const h = Math.min(a.h, desk.height - 30);
      const want = a.x === 'right' ? desk.width - w - 16 : a.x;
      const x = Math.max(110, Math.min(want, desk.width - w - 10));
      const y = Math.max(10, Math.min(a.y, desk.height - h - 10));
      win = document.createElement('section');
      win.className = 'win';
      win.id = `win-${id}`;
      win.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      win.innerHTML = `<div class="win-bar" data-drag="${id}">
          <span class="win-ico">${px(a.icon, 1.5)}</span><span class="win-title">${esc(a.title)}</span>
          <button class="win-max" data-act="max" data-id="${id}" aria-label="Maximize" title="Maximize">□</button>
          <button class="win-close" data-act="close" data-id="${id}" aria-label="Close">✕</button>
        </div><div class="win-body"></div>`;
      $('#windows').appendChild(win);
      render(id);
    }
    clampWin(win);
    focusWin(win);
  }
  function clampWin(win) {
    const d = $('#desktop').getBoundingClientRect();
    const w = Math.min(win.offsetWidth, Math.max(320, d.width - 120));
    const h = Math.min(win.offsetHeight, Math.max(240, d.height - 20));
    const x = Math.max(110, Math.min(win.offsetLeft, d.width - w - 10));
    const y = Math.max(10, Math.min(win.offsetTop, d.height - h - 10));
    win.style.width = `${w}px`; win.style.height = `${h}px`;
    win.style.left = `${Math.max(0, x)}px`; win.style.top = `${Math.max(0, y)}px`;
  }
  window.addEventListener('resize', () => document.querySelectorAll('.win').forEach(clampWin));
  function focusWin(win) {
    document.querySelectorAll('.win').forEach((w) => w.classList.remove('active'));
    win.classList.add('active');
    win.style.zIndex = ++zTop;
  }
  function render(id) {
    const win = $(`#win-${id}`);
    if (!win) return;
    const body = $('.win-body', win);
    const focusId = body.contains(document.activeElement) ? document.activeElement.id : '';
    body.innerHTML = APPS[id].render();
    if (focusId) {
      const el = document.getElementById(focusId);
      if (el) { el.focus(); if (el.setSelectionRange && el.type !== 'password') el.setSelectionRange(el.value.length, el.value.length); }
    }
  }
  function renderAll() { Object.keys(APPS).forEach(render); updateTop(); }

  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    const win = e.target.closest('.win');
    if (win) focusWin(win);
    const bar = e.target.closest('[data-drag]');
    if (bar && !e.target.closest('button')) {
      const r = win.getBoundingClientRect();
      drag = { win, dx: e.clientX - r.left, dy: e.clientY - r.top };
      bar.setPointerCapture(e.pointerId);
    }
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const d = $('#desktop').getBoundingClientRect();
    drag.win.style.left = `${Math.max(-drag.win.offsetWidth + 80, Math.min(e.clientX - d.left - drag.dx, d.width - 80))}px`;
    drag.win.style.top = `${Math.max(0, Math.min(e.clientY - d.top - drag.dy, d.height - 40))}px`;
  });
  document.addEventListener('pointerup', () => { drag = null; });

  /* ---------- top bar, toasts, modal ---------- */
  function updateTop() {
    const total = S.clicks.reduce((a, b) => a + b, 0);
    $('#tb-clicks').textContent = `Clicks: ${total}`;
    $('#tb-task').textContent = S.started ? (S.done ? `${L2.incident} · Case closed` : `${L2.incident} · Task ${S.level} of ${N}`) : L2.incident;
  }
  function tickClock() { $('#tb-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function toast(msg, kind = '') {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.innerHTML = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3400);
    setTimeout(() => t.remove(), 3800);
  }
  let modalDone = null;
  function modal(html, onDone) {
    const o = $('#overlay');
    o.innerHTML = `<div class="modal">${html}</div>`;
    o.hidden = false;
    $('#app').inert = true;
    modalDone = onDone || null;
    const btn = $('.modal [data-act="continue"]', o);
    if (btn) btn.focus();
  }
  function closeModal() {
    $('#overlay').hidden = true;
    $('#overlay').innerHTML = '';
    $('#app').inert = false;
    const f = modalDone; modalDone = null;
    if (f) f();
  }

  /* ---------- progress ---------- */
  function completeTask(n, title, html, flag, evidence) {
    if (S.level !== n || S.done) return;
    S.secs[n] = (Date.now() - S.levelStart) / 1000;
    if (evidence) S.evidence.push(evidence);
    modal(`<div class="modal-kicker">Task ${n} of ${N} complete</div>
      <h2>${title}</h2>${html}
      <div class="flag">${px('flag', 2)} <span>${esc(flag)}</span></div>
      <div class="modal-score">${S.clicks[n]} clicks · ${fmtTime(S.secs[n])}</div>
      <button class="btn primary" data-act="continue" data-nocount>Next task →</button>`, () => {
      S.level = n + 1;
      S.levelStart = Date.now();
      renderAll();
      openApp('casefile');
    });
  }

  function finishGame() {
    S.secs[N] = (Date.now() - S.levelStart) / 1000;
    S.done = true;
    const clicks = S.clicks.slice(1), seconds = S.secs.slice(1).map((s) => Math.round(s));
    const result = { level: 2, player: S.player, date: new Date().toISOString(), clicks, total: clicks.reduce((a, b) => a + b, 0),
      seconds, totalSeconds: Math.round(S.secs.slice(1).reduce((a, b) => a + b, 0)) };
    let runs = [];
    try { runs = JSON.parse(localStorage.getItem('pixelforge-runs-l2') || '[]'); } catch (e) { runs = []; }
    runs.push(result);
    try { localStorage.setItem('pixelforge-runs-l2', JSON.stringify(runs)); } catch (e) { /* ignore */ }
    window.pixelforgeLastResult = result;
    updateTop();
    const rows = L2.tasks.map((t, i) => `<tr><td>${i + 1} · ${esc(t)}</td><td>${clicks[i]}</td><td>${fmtTime(seconds[i])}</td></tr>`).join('');
    const past = runs.slice(-6).reverse().map((r) => `<tr><td>${esc(r.player)}</td><td>${r.total}</td><td>${fmtTime(r.totalSeconds)}</td><td>${new Date(r.date).toLocaleDateString()}</td></tr>`).join('');
    modal(`<div class="modal-kicker">Case closed · Level 2</div>
      <h2>The seller was Marco Duarte</h2>
      <p>Marco, the junior tester, read Lena's password off the sticky note in her desk photo. He signed in as her through a VPN
      (so it looked like Brazil), found the forgotten admin page, changed his cookie to become admin, and downloaded the game copy
      onto his own home PC, <b>DESKTOP-K7Q2</b>.</p>
      <table class="score"><thead><tr><th>Task</th><th>Clicks</th><th>Time</th></tr></thead><tbody>
        ${rows}<tr class="total"><td>Total</td><td>${result.total}</td><td>${fmtTime(result.totalSeconds)}</td></tr>
      </tbody></table>
      <details class="past"><summary>Previous Level 2 runs on this computer</summary>
        <table class="score"><thead><tr><th>Player</th><th>Clicks</th><th>Time</th><th>Date</th></tr></thead><tbody>${past}</tbody></table>
      </details>
      <div class="modal-actions">
        <button class="btn" data-act="copy" data-nocount>Copy results</button>
        <button class="btn primary" data-act="again" data-nocount>Play again</button>
      </div>`);
  }

  /* ---------- Case File ---------- */
  function renderCase() {
    const ev = S.evidence.length ? S.evidence.map((e) => `<li>${e}</li>`).join('') : '<li class="muted">Nothing yet.</li>';
    const sc = L2.tasks.map((t, i) => `<div class="cf-score ${S.level === i + 1 && !S.done ? 'now' : ''}"><span>Task ${i + 1}</span><b>${S.level >= i + 1 ? S.clicks[i + 1] : '–'}</b></div>`).join('');
    let accuse = '';
    if (S.level === N && !S.done) {
      accuse = `<h3>Name the seller</h3>
        ${S.sawPanel ? '' : '<p class="muted small">Find proof first: who downloaded the game copy, and from which device?</p>'}
        <div class="suspects">${L2.suspects.map((p) => `<button class="suspect" data-act="accuse" data-id="${p.id}" aria-disabled="${!S.sawPanel}">
          <span class="avatar">${initials(p.name)}</span><span><b>${esc(p.name)}</b><small>${esc(p.role)}</small></span></button>`).join('')}</div>
        ${S.accuseMsg ? `<p class="warn small">${S.accuseMsg}</p>` : ''}`;
    }
    return `<div class="cf">
      <div class="cf-head">${px('casefile', 2)}<div><div class="cf-kicker">${L2.incident} · Level 2</div><div class="cf-name">The stolen game copy</div></div></div>
      <p class="cf-brief">Someone is selling an unreleased copy of <b>Emberfall</b> online. You're back as Pixelforge's security expert. Find out who took it.</p>
      <h3>${S.done ? 'Status' : `Task ${S.level} of ${N}`}</h3>
      <p class="cf-task">${S.done ? 'Case closed. Great work.' : L2.objectives[S.level]}</p>
      ${accuse}
      <h3>Evidence</h3><ul class="cf-ev">${ev}</ul>
      <h3>Clicks so far</h3><div class="cf-scores four">${sc}</div>
    </div>`;
  }

  /* ---------- Security Center ---------- */
  function renderSecurity() {
    const rows = L2.log.map((l, i) => `<tr class="${S.flagged[i] ? 'checked' : ''}">
        <td>${esc(l.t)}</td><td>${esc(l.user)}</td><td>${esc(l.loc)}</td><td>${esc(l.dev)}</td>
        <td class="${l.ok ? 'res-ok' : 'res-fail'}">${l.ok ? 'Success' : 'Failed'}</td>
        <td><button class="btn small flagbtn" data-act="flagRow" data-id="${i}">Flag</button></td></tr>
        ${S.lastFlag === i ? `<tr class="why-row"><td colspan="6">↳ IT checked this login: ${esc(l.why || 'it looks normal.')}</td></tr>` : ''}`).join('');
    return `<div class="sec">
      <div class="sec-head"><div><b>Sign-in log</b><span class="muted small"> · every staff sign-in · Belgian time</span></div>
        <span class="muted small">${L2.log.length} entries</span></div>
      <table class="log sec-table"><thead><tr><th>When</th><th>Account</th><th>Location</th><th>Device</th><th>Result</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  /* ---------- Browser ---------- */
  function norm(u) {
    return String(u).trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').replace(/\/+(\?|$)/, '$1').replace(/\/+$/, '');
  }
  function route(u) {
    const [hp, query = ''] = u.split('?');
    const i = hp.indexOf('/');
    return { host: i < 0 ? hp : hp.slice(0, i), path: i < 0 ? '' : hp.slice(i), q: new URLSearchParams(query) };
  }
  function navigate(u, push = true) {
    const url = norm(u);
    if (!url) return;
    if (push && url !== S.browser.url) S.browser.hist.push(S.browser.url);
    Object.assign(S.browser, { url, loginErr: '', addrDraft: null, source: false, photo: null });
    S.pageRole = roleNow();
    render('browser');
    checkProgress();
  }
  function checkProgress() {
    const r = route(S.browser.url);
    if (!S.loggedIn || r.host !== 'portal.pixelforge.studio' || r.path !== '/admin-legacy' || S.done) return;
    if (S.level === 3) {
      completeTask(3, 'You found the hidden admin page',
        `<p>A developer left a note in the page's source code pointing to <b>/admin-legacy</b>. Visitors never see those notes,
         but anyone can read them with "View source".</p>
         <p><b>Next:</b> the page only lets admins in. How does it know who you are? It reads something your browser stores
         for this site.</p>`,
        'PF{read-the-source}',
        'A forgotten admin page exists at <b>/admin-legacy</b>, mentioned in a note in the portal’s source code.');
    } else if (S.level === 4 && isAdmin() && !S.sawPanel) {
      S.sawPanel = true;
      S.evidence.push('The game copy was downloaded at 09:11 with Lena’s account from device <b>DESKTOP-K7Q2</b>. The admin device list shows who owns that device.');
      toast('New evidence added to your Case File', 'good');
      render('casefile');
    }
  }

  function renderBrowser() {
    const B = S.browser;
    const r = route(B.url);
    const marks = [['pixelforge.studio', 'Pixelforge website'], ['portal.pixelforge.studio', 'Staff Portal'], ['chirper.social', 'Chirper']]
      .map(([u, l]) => `<button class="mark" data-act="nav" data-url="${u}">${esc(l)}</button>`).join('');
    const jar = cookieJar(r.host);
    const cookies = B.cookiesOpen ? `<div class="cookies"><div class="ck-head"><b>Cookies for ${esc(r.host)}</b><button class="linkish small" data-act="cookies">Hide</button></div>
      ${jar ? `<form class="ck-form" onsubmit="return false"><table class="log"><thead><tr><th>Name</th><th>Value</th><th></th></tr></thead><tbody>
        ${Object.entries(jar).map(([k, v]) => B.cookieEdit === k
          ? `<tr><td>${esc(k)}</td><td><input id="ck-val" value="${esc(B.cookieDraft)}" aria-label="Value of cookie ${esc(k)}" autocomplete="off" spellcheck="false"></td>
             <td><button type="submit" class="btn small" data-act="ckSave">Save</button></td></tr>`
          : `<tr><td>${esc(k)}</td><td><code>${esc(v)}</code></td><td><button type="button" class="btn small" data-act="ckEdit" data-id="${esc(k)}">Edit</button></td></tr>`).join('')}
        </tbody></table></form><p class="muted small">Changes are used the next time the page loads.</p>`
        : '<p class="muted small">This site has not stored any cookies.</p>'}</div>` : '';
    return `<div class="br">
      <form class="br-tools" onsubmit="return false">
        <button type="button" class="br-btn" data-act="back" title="Back" aria-disabled="${!B.hist.length}">←</button>
        <label class="br-addr"><span class="lock">●</span><input id="addr" value="${esc(B.addrDraft != null ? B.addrDraft : `https://${B.url}`)}" spellcheck="false" autocomplete="off" aria-label="Address"></label>
        <button type="submit" class="br-btn go" data-act="go">Go</button>
        <button type="button" class="br-btn ${B.source ? 'on' : ''}" data-act="source" title="View source">&lt;/&gt;</button>
        <button type="button" class="br-btn ${B.cookiesOpen ? 'on' : ''}" data-act="cookies" title="Cookies">Cookies</button>
      </form>
      <div class="br-marks">${marks}</div>
      ${cookies}
      ${B.photo ? `<div class="br-page lightbox"><div class="lb-bar"><span>Photo by @lenamakesnoise · Nov 18</span>
          <button class="btn small" data-act="photoClose">Close photo</button></div>
          <div class="lb-img" data-pic="Lena's desk photo, shown large (look at the screenshot to see the details)">${deskPhoto('100%')}</div></div>`
        : `<div class="br-page">${B.source ? `<pre class="source">${esc(sourceOf(r))}</pre>` : page(r)}</div>`}
    </div>`;
  }

  function cookieJar(host) {
    return host === 'portal.pixelforge.studio' && S.loggedIn ? S.cookies : null;
  }

  function page(r) {
    switch (r.host) {
      case 'pixelforge.studio': return pagePixelforge(r);
      case 'chirper.social': return pageChirper(r);
      case 'portal.pixelforge.studio': return pagePortal(r);
      default:
        return `<div class="pg pg-error"><h1>Can't reach this page</h1><p>Check the address for typos: <code>${esc(S.browser.url)}</code></p></div>`;
    }
  }

  function pagePixelforge(r) {
    const nav = `<div class="pf-nav"><button type="button" class="linkish" data-act="nav" data-url="pixelforge.studio">${px('spark', 2)} Pixelforge Studios</button>
      <button type="button" class="linkish" data-act="nav" data-url="pixelforge.studio/team">Team</button></div>`;
    if (r.path === '/team') {
      return `<div class="pg pf">${nav}<h1 class="pf-h">Meet the team</h1>
        <div class="team">${L2.team.map((t) => `<div class="tcard"><span class="avatar lg">${initials(t.name)}</span>
          <b>${esc(t.name)}</b><small>${esc(t.role)}</small>
          <button type="button" class="linkish" data-act="nav" data-url="chirper.social/@${t.handle}">@${t.handle} on Chirper</button></div>`).join('')}</div></div>`;
    }
    if (r.path) return `<div class="pg pg-error"><h1>404</h1><p>This page doesn't exist on pixelforge.studio.</p></div>`;
    return `<div class="pg pf">${nav}<div class="pf-hero"><div class="pf-tag">Beta coming soon</div><h1>EMBERFALL</h1>
      <p>A dragon-hunting adventure in a world made of embers and pixels.</p>
      <button class="btn primary" data-act="nav" data-url="pixelforge.studio/team">Meet the team →</button></div></div>`;
  }

  function pageChirper(r) {
    const h = r.path.replace(/^\/@?/, '');
    if (h) {
      const p = L2.chirper[h];
      if (!p) return `<div class="pg ch"><div class="ch-brand">chirper</div><p>This account doesn't exist.</p></div>`;
      return `<div class="pg ch"><div class="ch-brand"><button type="button" class="linkish" data-act="nav" data-url="chirper.social">chirper</button></div>
        <div class="ch-prof"><span class="avatar lg">${initials(p.name)}</span>
          <div><b>${esc(p.name)}</b><div class="muted">@${h}</div><p>${esc(p.bio)}</p></div></div>
        ${p.posts.map(([t, d, pic]) => `<div class="ch-post"><div class="muted small">${esc(d)}</div><p>${esc(t)}</p>
          ${pic ? `<button type="button" class="photo" data-act="photo" data-id="${pic}" aria-label="Photo: Lena's new desk (click to enlarge)">${deskPhoto(340)}</button>` : ''}</div>`).join('')}</div>`;
    }
    return `<div class="pg ch"><div class="ch-brand">chirper</div>
      <h2>Trending in games</h2>
      <div class="ch-post"><div class="muted small">@pixelnews · 1h</div><p>An unreleased Emberfall beta is being sold on a shady website. Pixelforge says it is investigating.</p></div>
      <h2>People</h2>
      <div class="ch-people">${Object.entries(L2.chirper).map(([h2, p]) => `<button class="ch-person" data-act="nav" data-url="chirper.social/@${h2}">
        <span class="avatar sm">${p.name[0]}</span><span><b>${esc(p.name)}</b><small>@${h2}</small></span></button>`).join('')}</div></div>`;
  }

  function pagePortal(r) {
    const B = S.browser;
    if (!S.loggedIn) {
      return `<div class="pg portal"><form class="login" onsubmit="return false">
        <div class="login-logo">${px('spark', 3)}<b>Pixelforge Staff Portal</b></div>
        <label>Username<input id="lg-user" value="${esc(B.loginUser)}" autocomplete="off" spellcheck="false"></label>
        <label>Password<input id="lg-pass" type="password" value="${esc(B.loginPass)}" autocomplete="off"></label>
        ${B.loginErr ? `<p class="warn small">${B.loginErr}</p>` : ''}
        <button type="submit" class="btn primary" data-act="login">Sign in</button>
      </form></div>`;
    }
    const top = `<div class="portal-top"><span>${px('spark', 2)} Staff Portal</span><span>lena.okafor · <button class="linkish" data-act="logout">Sign out</button></span></div>`;
    if (r.path === '/admin-legacy') {
      if (!isAdmin()) {
        return `<div class="pg portal">${top}<div class="pt-body"><h2>403 · Admins only</h2>
          <p class="muted">This old admin panel is only for administrators.</p>
          <p>Your role: <code>${esc(S.pageRole)}</code></p></div></div>`;
      }
      return `<div class="pg portal">${top}<div class="pt-body">
        <h2>Legacy admin panel</h2><p class="warn small">Old tool. Do not use. Scheduled for removal.</p>
        <h3>Build downloads</h3>
        <table class="log"><thead><tr><th>When</th><th>File</th><th>Account</th><th>Device</th><th>From</th></tr></thead><tbody>
          ${L2.downloads.map((d) => `<tr>${d.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <h3>Registered devices</h3>
        <table class="log"><thead><tr><th>Device</th><th>Owner</th><th>Type</th></tr></thead><tbody>
          ${L2.devices.map((d) => `<tr>${d.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    }
    if (r.path) return `<div class="pg portal">${top}<div class="pt-body"><h2>404</h2><p class="muted">This page doesn't exist.</p></div></div>`;
    return `<div class="pg portal">${top}<div class="pt-body">
      <h2>Welcome back, Lena</h2>
      <h3>My files</h3>
      <div class="files">${L2.lenaFiles.map((f) => `<div class="file"><span class="file-ico">▤</span><span><b>${esc(f)}</b><small>Audio team</small></span></div>`).join('')}</div>
      <h3>Recent sign-ins</h3>
      <table class="log"><tbody>
        <tr class="warnrow"><td>Nov 21, 09:07</td><td>São Paulo, Brazil</td><td>⚠ Not you?</td></tr>
        <tr><td>Nov 21, 09:02</td><td>Ghent, Belgium</td><td></td></tr>
      </tbody></table></div></div>`;
  }

  /* what "View source" shows for each page */
  function sourceOf(r) {
    const head = (title) => `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>${title}</title>\n  <link rel="stylesheet" href="/static/site.css">\n</head>\n<body>`;
    const foot = '\n  <script src="/static/app.js"></script>\n</body>\n</html>';
    if (r.host === 'portal.pixelforge.studio') {
      if (!S.loggedIn) return `${head('Staff Portal · Sign in')}\n  <form class="login" method="post" action="/login">\n    <input name="username">\n    <input name="password" type="password">\n    <button>Sign in</button>\n  </form>${foot}`;
      if (r.path === '/admin-legacy') return `${head('Legacy admin')}\n  <!-- legacy admin v0.3 -->\n  <div id="admin-root"></div>${foot}`;
      return `${head('Staff Portal · Home')}\n  <header class="portal-top">\n    <a href="/">Staff Portal</a>\n    <span class="user">lena.okafor</span>\n  </header>\n  <main>\n    <h2>Welcome back</h2>\n    <section id="my-files"></section>\n    <section id="recent-sign-ins"></section>\n    <!-- TODO (ravi): remove the old admin panel before launch: /admin-legacy -->\n  </main>${foot}`;
    }
    if (r.host === 'chirper.social') return `${head('Chirper')}\n  <div id="feed"></div>${foot}`;
    if (r.host === 'pixelforge.studio') return `${head('Pixelforge Studios')}\n  <nav><a href="/">Pixelforge</a> <a href="/team">Team</a></nav>\n  <main id="page"></main>${foot}`;
    return '(no source: the page could not be loaded)';
  }

  /* ---------- actions ---------- */
  const ACTS = {
    open: (d) => openApp(d.id),
    close: (d) => { const w = $(`#win-${d.id}`); if (w) w.remove(); },
    max: (d) => {
      const w = $(`#win-${d.id}`);
      if (!w) return;
      const btn = $('.win-max', w);
      if (w.dataset.restore) {
        w.style.cssText = w.dataset.restore;
        delete w.dataset.restore;
        btn.setAttribute('aria-label', 'Maximize'); btn.title = 'Maximize'; btn.textContent = '□';
      } else {
        const desk = $('#desktop').getBoundingClientRect();
        w.dataset.restore = w.style.cssText;
        Object.assign(w.style, { left: '110px', top: '10px', width: `${desk.width - 120}px`, height: `${desk.height - 20}px` });
        btn.setAttribute('aria-label', 'Restore size'); btn.title = 'Restore size'; btn.textContent = '❐';
      }
      focusWin(w);
    },

    flagRow: (d) => {
      const i = +d.id, l = L2.log[i];
      if (S.level !== 1) { toast('You already found the impossible login.'); return; }
      if (l.bad) {
        S.lastFlag = null;
        render('security');
        completeTask(1, 'You found the impossible login',
          `<p><b>lena.okafor</b> signed in from Ghent at 09:02, then from São Paulo, Brazil at 09:07.
           Nobody travels 9,000 km in five minutes, so someone else has Lena's password.</p>
           <p><b>Next:</b> Lena swears she never shares her password. But she does post a lot online.</p>`,
          'PF{impossible-travel}',
          'Impossible login: <b>lena.okafor</b> from São Paulo at 09:07, five minutes after Ghent. Device: <b>DESKTOP-K7Q2</b>.');
        return;
      }
      S.flagged[i] = true;
      S.lastFlag = i;
      render('security');
    },

    nav: (d) => { openApp('browser'); navigate(d.url); },
    back: () => { const p = S.browser.hist.pop(); if (p) navigate(p, false); },
    go: () => { const v = $('#addr'); if (v) navigate(v.value); },
    source: () => { S.browser.source = !S.browser.source; S.browser.photo = null; render('browser'); },
    cookies: () => { S.browser.cookiesOpen = !S.browser.cookiesOpen; S.browser.cookieEdit = null; render('browser'); },
    ckEdit: (d) => { if (!S.cookies) return; S.browser.cookieEdit = d.id; S.browser.cookieDraft = String(S.cookies[d.id]); render('browser'); },
    ckSave: () => {
      const k = S.browser.cookieEdit, v = $('#ck-val');
      if (k && v && S.cookies) { S.cookies[k] = v.value.trim(); toast(`Cookie "${esc(k)}" saved`); }
      S.browser.cookieEdit = null;
      render('browser');
    },
    photo: (d) => { S.browser.photo = d.id; S.seenPhoto = true; render('browser'); },
    photoClose: () => { S.browser.photo = null; render('browser'); },

    login: () => {
      const u = ($('#lg-user') || {}).value || '';
      const p = (($('#lg-pass') || {}).value || '').trim().toLowerCase();
      const user = u.trim().toLowerCase().replace(/@pixelforge\.studio$/, '');
      S.browser.loginUser = u;
      if (S.level < 2) {
        S.browser.loginErr = 'Sign-in is paused by IT during the investigation. Finish your current task first.';
      } else if (user === L2.secret.user && hash(p) === L2.secret.passHash) {
        S.loggedIn = true;
        S.cookies = { session: 'a8f3e2c19b7d4e60', role: 'user', theme: 'dark' };
        S.pageRole = 'user';
        Object.assign(S.browser, { loginErr: '', loginPass: '' });
        render('browser');
        completeTask(2, 'You\'re in as Lena',
          `<p>Lena's password was on a sticky note in the desk photo she posted publicly. The attacker zoomed in and read it.</p>
           <p><b>Next:</b> IT believes the attacker used an old admin page that was never deleted. Where could it be?</p>`,
          'PF{dont-post-your-desk}',
          'Lena’s password was readable on a sticky note in her public desk photo.');
        checkProgress();
        return;
      } else {
        S.browser.loginErr = 'Wrong username or password.';
      }
      render('browser');
    },
    logout: () => { S.loggedIn = false; S.cookies = null; S.browser.cookieEdit = null; render('browser'); },

    accuse: (d) => {
      if (!S.sawPanel || S.level !== N) return;
      if (hash(d.id) === L2.secret.sellerHash) { finishGame(); return; }
      const p = L2.suspects.find((x) => x.id === d.id);
      S.accuseMsg = `${esc(p.name)}? The evidence doesn't point to them. Look at which device was used, and who owns it.`;
      render('casefile');
    },

    start: () => {
      S.player = (($('#player') || {}).value || '').trim().slice(0, 24) || 'Player';
      S.started = true;
      S.levelStart = Date.now();
      closeModal();
      renderAll();
      openApp('casefile');
    },
    level1: () => { location.href = 'index.html'; },
    level3: () => { location.href = 'level3.html'; },
    continue: () => closeModal(),
    copy: () => {
      const txt = JSON.stringify(window.pixelforgeLastResult, null, 2);
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('Results copied', 'good'), () => toast('Could not copy'));
    },
    again: () => location.reload(),
  };

  /* every click inside the desktop counts towards the current task */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const inApp = !!t.closest('#app');
    const lab = t.closest('label');
    const forwarded = lab && lab.control && t !== lab.control;
    const counted = S.started && !S.done && inApp && $('#overlay').hidden && !forwarded && !t.closest('[data-nocount]');
    if (counted) { S.clicks[S.level] += 1; updateTop(); }
    const a = t.closest('[data-act]');
    if (a && a.getAttribute('aria-disabled') !== 'true') {
      e.preventDefault();
      const fn = ACTS[a.dataset.act];
      if (fn) fn(a.dataset);
    }
    if (counted && $('#win-casefile')) render('casefile');
  });
  document.addEventListener('input', (e) => {
    const id = e.target.id;
    if (id === 'addr') S.browser.addrDraft = e.target.value;
    else if (id === 'lg-user') S.browser.loginUser = e.target.value;
    else if (id === 'lg-pass') S.browser.loginPass = e.target.value;
    else if (id === 'ck-val') S.browser.cookieDraft = e.target.value;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !$('#overlay').hidden) {
      const b = $('#overlay [data-act="continue"], #overlay [data-act="start"]');
      if (b && !(e.target.tagName === 'INPUT' && b.dataset.act !== 'start')) { e.preventDefault(); b.click(); }
    }
  });

  /* ---------- boot ---------- */
  function boot() {
    $('.logo').innerHTML = px('spark', 2);
    $('#icons').innerHTML = [['casefile', 'Case File'], ['security', 'Security'], ['browser', 'Browser']]
      .map(([id, l]) => `<button class="dicon" data-act="open" data-id="${id}">${px(id === 'security' ? 'shield' : id, 3.5)}<span>${l}</span></button>`).join('');
    tickClock();
    setInterval(tickClock, 15000);
    updateTop();
    modal(`<div class="intro">${px('spark', 6)}
      <div class="modal-kicker">Level 2 · Pixelforge Studios · ${L2.incident}</div>
      <h2>Someone is selling our unreleased game</h2>
      <p>A copy of the <b>Emberfall</b> beta is for sale on a shady website, weeks before release. You're back as our security expert.
      This time you have the company's Security Center and a browser. Find out who took it.</p>
      <p class="muted small">Harder than Level 1: four tasks. Every click counts, and fewer clicks is a better score. No terminal needed.</p>
      <label class="name">Your name<input id="player" maxlength="24" autocomplete="off" placeholder="Player"></label>
      <div class="modal-actions start-actions">
        <button class="btn ghost" data-act="level1" data-nocount>← Level 1</button>
        <button class="btn ghost" data-act="level3" data-nocount>Level 3 (hard) →</button>
        <button class="btn primary" data-act="start" data-nocount>Start Level 2</button>
      </div></div>`);
    setTimeout(() => { const i = $('#player'); if (i) i.focus(); }, 50);
  }

  window.pixelforgeScore = () => ({ player: S.player, game: 2, tasks: N, level: S.level, done: S.done, clicks: S.clicks.slice(1) });
  /* what the arena's teacher may look at: where the player is, never the answers */
  window.pixelforgeTeacherState = () => ({
    task: S.level, done: S.done, url: S.browser.url, loggedIn: S.loggedIn, seenPhoto: !!S.seenPhoto, photoOpen: !!S.browser.photo,
    sourceOpen: S.browser.source, cookiesOpen: S.browser.cookiesOpen, pageRole: S.pageRole,
    roleCookie: S.cookies ? String(S.cookies.role) : null, sawPanel: S.sawPanel,
    openApps: [...document.querySelectorAll('.win')].map((w) => w.id.replace('win-', '')),
  });
  boot();
})();
