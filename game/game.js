(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hash = (s) => { let x = 0x811c9dc5; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x; };
  const fmtTime = (sec) => { const s = Math.round(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  function px(name, scale = 3, cls = '') {
    const g = ICONS[name];
    let rects = '';
    g.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== '.') rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PALETTE[c]}"/>`;
    }));
    return `<svg class="px ${cls}" viewBox="0 0 ${g[0].length} ${g.length}" width="${g[0].length * scale}" height="${g.length * scale}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }

  /* ---------- state ---------- */
  const S = {
    started: false, done: false, player: '',
    level: 1, clicks: [0, 0, 0, 0], secs: [0, 0, 0, 0], levelStart: 0, startedAt: 0,
    mail: { sel: null, showAddr: {}, read: {}, reported: {}, linkCheck: null },
    browser: { url: 'pixelforge.studio', hist: [], hint: '', loginErr: '', loginUser: '', phished: false },
    loggedIn: false, sawKey: false, evidence: [], accuseMsg: '',
  };

  /* ---------- windows ---------- */
  const APPS = {
    casefile: { title: 'Case File', icon: 'casefile', w: 380, h: 600, x: 'right', y: 16, render: renderCase },
    mail: { title: 'Mail · mira.kade', icon: 'mail', w: 800, h: 540, x: 120, y: 24, render: renderMail },
    browser: { title: 'Browser', icon: 'browser', w: 860, h: 600, x: 150, y: 52, render: renderBrowser },
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
  /* keep a window fully reachable inside the desktop (also after the browser window is resized) */
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
  function renderAll() {
    Object.keys(APPS).forEach(render);
    updateTop();
  }

  /* window dragging */
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
    const x = Math.max(-drag.win.offsetWidth + 80, Math.min(e.clientX - d.left - drag.dx, d.width - 80));
    const y = Math.max(0, Math.min(e.clientY - d.top - drag.dy, d.height - 40));
    drag.win.style.left = `${x}px`;
    drag.win.style.top = `${y}px`;
  });
  document.addEventListener('pointerup', () => { drag = null; });

  /* ---------- top bar, toasts, modal ---------- */
  function updateTop() {
    const total = S.clicks[1] + S.clicks[2] + S.clicks[3];
    $('#tb-clicks').textContent = `Clicks: ${total}`;
    $('#tb-task').textContent = S.started ? (S.done ? 'Incident #0412 · Case closed' : `Incident #0412 · Task ${S.level} of 3`) : 'Incident #0412';
  }
  function tickClock() {
    const d = new Date();
    $('#tb-clock').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

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
  function completeLevel(n, title, html, flag, evidence) {
    S.secs[n] = (Date.now() - S.levelStart) / 1000;
    if (evidence) S.evidence.push(evidence);
    modal(`<div class="modal-kicker">Task ${n} of 3 complete</div>
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
    S.secs[3] = (Date.now() - S.levelStart) / 1000;
    S.done = true;
    const result = {
      player: S.player, date: new Date().toISOString(),
      clicks: S.clicks.slice(1), total: S.clicks[1] + S.clicks[2] + S.clicks[3],
      seconds: S.secs.slice(1).map((s) => Math.round(s)), totalSeconds: Math.round(S.secs[1] + S.secs[2] + S.secs[3]),
    };
    let runs = [];
    try { runs = JSON.parse(localStorage.getItem('pixelforge-runs') || '[]'); } catch (e) { runs = []; }
    runs.push(result);
    try { localStorage.setItem('pixelforge-runs', JSON.stringify(runs)); } catch (e) { /* ignore */ }
    window.pixelforgeLastResult = result;
    updateTop();

    const row = (label, i) => `<tr><td>${label}</td><td>${result.clicks[i]}</td><td>${fmtTime(result.seconds[i])}</td></tr>`;
    const past = runs.slice(-6).reverse().map((r) => `<tr><td>${esc(r.player)}</td><td>${r.total}</td><td>${fmtTime(r.totalSeconds)}</td><td>${new Date(r.date).toLocaleDateString()}</td></tr>`).join('');
    modal(`<div class="modal-kicker">Case closed</div>
      <h2>The leaker was Jonas Marsh</h2>
      <p>Jonas, the Community Manager, guessed Theo's weak password from his public posts, signed in as Theo,
      and used a bug in the Staff Portal to download the secret dragon art onto his own laptop, <b>JMARSH-LT</b>.</p>
      <table class="score"><thead><tr><th>Task</th><th>Clicks</th><th>Time</th></tr></thead><tbody>
        ${row('1 · Scam email', 0)}${row('2 · Weak password', 1)}${row('3 · File bug + leaker', 2)}
        <tr class="total"><td>Total</td><td>${result.total}</td><td>${fmtTime(result.totalSeconds)}</td></tr>
      </tbody></table>
      <details class="past"><summary>Previous runs on this computer</summary>
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
    const sc = [1, 2, 3].map((n) => `<div class="cf-score ${S.level === n && !S.done ? 'now' : ''}"><span>Task ${n}</span><b>${S.level >= n ? S.clicks[n] : '–'}</b></div>`).join('');
    let accuse = '';
    if (S.level === 3 && !S.done) {
      accuse = `<h3>Name the leaker</h3>
        ${S.sawKey ? '' : '<p class="muted small">Find proof first: which secret file did the leaker take, and from which device?</p>'}
        <div class="suspects">${SUSPECTS.map((p) => `<button class="suspect" data-act="accuse" data-id="${p.id}" aria-disabled="${!S.sawKey}">
          <span class="avatar">${p.name.split(' ').map((w) => w[0]).join('')}</span><span><b>${esc(p.name)}</b><small>${esc(p.role)}</small></span></button>`).join('')}</div>
        ${S.accuseMsg ? `<p class="warn small">${S.accuseMsg}</p>` : ''}`;
    }
    return `<div class="cf">
      <div class="cf-head">${px('casefile', 2)}<div><div class="cf-kicker">Incident #0412</div><div class="cf-name">Pixelforge Studios leak</div></div></div>
      <p class="cf-brief">Secret art for <b>Emberfall</b> is leaking online. You have access to lead artist Mira Kade's computer. Find out how the leaker got in.</p>
      <h3>${S.done ? 'Status' : `Task ${S.level} of 3`}</h3>
      <p class="cf-task">${S.done ? 'Case closed. Great work.' : OBJECTIVES[S.level]}</p>
      ${accuse}
      <h3>Evidence</h3><ul class="cf-ev">${ev}</ul>
      <h3>Clicks so far</h3><div class="cf-scores">${sc}</div>
    </div>`;
  }

  /* ---------- Mail ---------- */
  function renderMail() {
    const M = S.mail;
    const list = EMAILS.map((m) => `<button class="mail-item ${M.sel === m.id ? 'sel' : ''} ${M.read[m.id] ? '' : 'unread'}" data-act="mailSel" data-id="${m.id}">
        <span class="mi-top"><span class="mi-from">${esc(m.name)}</span><span class="mi-time">${esc(m.time)}</span></span>
        <span class="mi-subj">${esc(m.subject)}</span></button>`).join('');
    const m = EMAILS.find((x) => x.id === M.sel);
    let read = '<div class="mail-empty">Select an email to read it.</div>';
    if (m) {
      const showAddr = M.showAddr[m.id];
      const status = M.reported[m.id] === 'genuine' ? '<span class="badge ok">IT checked: genuine</span>'
        : M.reported[m.id] === 'scam' ? '<span class="badge bad">Reported as scam</span>' : '';
      read = `<div class="mr-tools">
          <button class="btn danger small" data-act="report" data-id="${m.id}">${px('flag', 1.5)} Report as scam</button>${status}
        </div>
        <h2 class="mr-subj">${esc(m.subject)}</h2>
        <div class="mr-meta">
          <button class="from-btn" data-act="addr" data-id="${m.id}" title="Show sender address">
            <span class="avatar sm">${esc(m.name[0])}</span><b>${esc(m.name)}</b>
            ${showAddr ? `<span class="addr">&lt;${esc(m.addr)}&gt;</span>` : '<span class="addr-hint">show address ▾</span>'}
          </button>
          <span class="mr-time">${esc(m.time)}</span>
        </div>
        <div class="mr-to">To: Mira Kade</div>
        <div class="mr-body">${m.body}</div>
        ${M.linkCheck ? `<div class="linkcheck"><div>This link really goes to:</div><code>${esc(M.linkCheck)}</code>
            <div class="lc-actions"><button class="btn small" data-act="linkOpen">Open in browser</button><button class="btn ghost small" data-act="linkCancel">Cancel</button></div></div>` : ''}`;
    }
    return `<div class="mail"><aside class="mail-list"><div class="mail-folder">Inbox <span>${EMAILS.length}</span></div>${list}</aside>
      <section class="mail-read">${read}</section></div>`;
  }

  /* ---------- Browser ---------- */
  function norm(u) {
    return String(u).trim().toLowerCase()
      .replace(/^[a-z]+:\/\//, '').replace(/^www\./, '')
      .replace(/\/+(\?|$)/, '$1').replace(/\/+$/, '');
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
    S.browser.url = url;
    S.browser.loginErr = '';
    S.browser.addrDraft = null;
    checkEvidence();
    render('browser');
  }
  /* seeing the secret file while signed in (task 3) unlocks the accusation */
  function checkEvidence() {
    const r = route(S.browser.url);
    if (!S.loggedIn || S.sawKey || S.level !== 3 || r.host !== 'portal.pixelforge.studio' || r.path !== '/files') return;
    const f = FILES[parseInt(r.q.get('id'), 10)];
    if (f && f.key) {
      S.sawKey = true;
      S.evidence.push('The secret dragon art (file 17) was downloaded at 02:16 with Theo\'s account, from a device called <b>JMARSH-LT</b>.');
      toast('New evidence added to your Case File', 'good');
      render('casefile');
    }
  }

  function renderBrowser() {
    const B = S.browser;
    const marks = [
      ['pixelforge.studio', 'Pixelforge website'],
      ['portal.pixelforge.studio', 'Staff Portal'],
      ['chirper.social', 'Chirper'],
    ].map(([u, l]) => `<button class="mark" data-act="nav" data-url="${u}">${esc(l)}</button>`).join('');
    return `<div class="br">
      <form class="br-tools" onsubmit="return false">
        <button type="button" class="br-btn" data-act="back" title="Back" aria-disabled="${!B.hist.length}">←</button>
        <label class="br-addr"><span class="lock">●</span><input id="addr" value="${esc(B.addrDraft != null ? B.addrDraft : `https://${B.url}`)}" spellcheck="false" autocomplete="off" aria-label="Address"></label>
        <button type="submit" class="br-btn go" data-act="go">Go</button>
      </form>
      <div class="br-marks">${marks}</div>
      <div class="br-page">${page(route(B.url))}</div>
    </div>`;
  }

  function page(r) {
    switch (r.host) {
      case 'pixelforge.studio': return pagePixelforge(r);
      case 'chirper.social': return pageChirper(r);
      case 'portal.pixelforge.studio': return pagePortal(r);
      case 'status.pixelforge.studio':
        return `<div class="pg pg-plain"><h1>Pixelforge status</h1><p class="ok-line">● All systems operational</p>
          <p>Planned maintenance: Staff Portal, Saturday 06:00–08:00.</p></div>`;
      case 'people.pixelforge.studio':
        return `<div class="pg pg-plain"><h1>People Portal</h1><p>To view your contract, please sign in to the
          <button type="button" class="linkish" data-act="nav" data-url="portal.pixelforge.studio">Staff Portal</button> first.</p></div>`;
      case 'pixelforge-studio.net': return pagePhish();
      default:
        return `<div class="pg pg-error"><h1>Can't reach this page</h1><p>Check the address for typos: <code>${esc(S.browser.url)}</code></p></div>`;
    }
  }

  function pagePixelforge(r) {
    if (r.path === '/team') {
      return `<div class="pg pf"><div class="pf-nav"><button type="button" class="linkish" data-act="nav" data-url="pixelforge.studio">${px('spark', 2)} Pixelforge Studios</button></div>
        <h1 class="pf-h">Meet the team</h1>
        <div class="team">${TEAM.map((t) => `<div class="tcard"><span class="avatar lg">${t.name.split(' ').map((w) => w[0]).join('')}</span>
          <b>${esc(t.name)}</b><small>${esc(t.role)}</small>
          <button type="button" class="linkish" data-act="nav" data-url="chirper.social/@${t.handle}">@${t.handle} on Chirper</button></div>`).join('')}</div></div>`;
    }
    if (r.path) return `<div class="pg pg-error"><h1>404</h1><p>This page doesn't exist on pixelforge.studio.</p></div>`;
    return `<div class="pg pf"><div class="pf-nav"><button type="button" class="linkish" data-act="nav" data-url="pixelforge.studio">${px('spark', 2)} Pixelforge Studios</button>
        <button type="button" class="linkish" data-act="nav" data-url="pixelforge.studio/team">Team</button></div>
      <div class="pf-hero"><div class="pf-tag">Coming 2027</div><h1>EMBERFALL</h1>
        <p>A dragon-hunting adventure in a world made of embers and pixels.</p>
        <button class="btn primary" data-act="nav" data-url="pixelforge.studio/team">Meet the team →</button></div></div>`;
  }

  function pageChirper(r) {
    const h = r.path.replace(/^\/@?/, '');
    if (h) {
      const p = CHIRPER[h];
      if (!p) return `<div class="pg ch"><div class="ch-brand">chirper</div><p>This account doesn't exist.</p></div>`;
      return `<div class="pg ch"><div class="ch-brand"><button type="button" class="linkish" data-act="nav" data-url="chirper.social">chirper</button></div>
        <div class="ch-prof"><span class="avatar lg">${p.name.split(' ').map((w) => w[0]).join('')}</span>
          <div><b>${esc(p.name)}</b><div class="muted">@${h}</div><p>${esc(p.bio)}</p></div></div>
        ${p.posts.map(([t, d]) => `<div class="ch-post"><div class="muted small">${esc(d)}</div><p>${esc(t)}</p></div>`).join('')}</div>`;
    }
    return `<div class="pg ch"><div class="ch-brand">chirper</div>
      <h2>Trending in games</h2>
      <div class="ch-post"><div class="muted small">@pixelnews · 2h</div><p>Rumour: a mystery Emberfall boss image is going around online. Pixelforge has not commented.</p></div>
      <div class="ch-post"><div class="muted small">@retro_rae · 5h</div><p>Unpopular opinion: dragons are the best video game bosses. Fight me.</p></div>
      <h2>People</h2>
      <div class="ch-people">${Object.entries(CHIRPER).map(([h2, p]) => `<button class="ch-person" data-act="nav" data-url="chirper.social/@${h2}">
        <span class="avatar sm">${p.name[0]}</span><span><b>${esc(p.name)}</b><small>@${h2}</small></span></button>`).join('')}</div></div>`;
  }

  function pagePortal(r) {
    const B = S.browser;
    if (!S.loggedIn) {
      return `<div class="pg portal"><form class="login" onsubmit="return false">
        <div class="login-logo">${px('spark', 3)}<b>Pixelforge Staff Portal</b></div>
        <label>Username<input id="lg-user" value="${esc(B.loginUser)}" autocomplete="off" spellcheck="false"></label>
        <label>Password<input id="lg-pass" type="password" value="${esc(B.loginPass || '')}" autocomplete="off"></label>
        ${B.loginErr ? `<p class="warn small">${B.loginErr}</p>` : ''}
        <button type="submit" class="btn primary" data-act="login">Sign in</button>
        <button type="button" class="linkish" data-act="hint">Forgot password?</button>
        ${B.hint ? `<p class="hint small">${B.hint}</p>` : ''}
      </form></div>`;
    }
    const top = `<div class="portal-top"><span>${px('spark', 2)} Staff Portal</span><span>theo.brandt · <button class="linkish" data-act="logout">Sign out</button></span></div>`;
    if (r.path === '/files') {
      const id = parseInt(r.q.get('id'), 10);
      const f = FILES[id];
      if (!f) return `<div class="pg portal">${top}<div class="pt-body"><button type="button" class="linkish" data-act="nav" data-url="portal.pixelforge.studio">← My files</button><h2>File not found</h2><p class="muted">There is no file with id ${esc(r.q.get('id') || '?')}.</p></div></div>`;
      const preview = f.art ? `<div class="art">${px(f.art, 9)}<span class="wm">CONFIDENTIAL</span></div>` : `<div class="doc">${esc(f.text)}</div>`;
      return `<div class="pg portal">${top}<div class="pt-body">
        <button type="button" class="linkish" data-act="nav" data-url="portal.pixelforge.studio">← My files</button>
        <div class="file-head"><h2>${esc(f.name)}</h2>${f.secret ? '<span class="badge bad">Confidential</span>' : ''}</div>
        <div class="muted small">File id ${id} · Team: ${esc(f.team)} · Owner: ${esc(f.owner)}</div>
        ${preview}${f.art ? `<p class="small">${esc(f.text)}</p>` : ''}
        <h3>Access log</h3>
        <table class="log"><thead><tr><th>When</th><th>Account</th><th>Device</th><th>Action</th></tr></thead><tbody>
          ${f.log.map((l) => `<tr><td>${esc(l[0])}</td><td>${esc(l[1])}</td><td>${esc(l[2])}</td><td>${esc(l[3])}</td></tr>`).join('')}
        </tbody></table></div></div>`;
    }
    return `<div class="pg portal">${top}<div class="pt-body">
      <h2>Welcome back, Theo</h2>
      <h3>My files</h3>
      <div class="files">${THEO_FILES.map((id) => `<button class="file" data-act="nav" data-url="portal.pixelforge.studio/files?id=${id}">
        <span class="file-ico">▤</span><span><b>${esc(FILES[id].name)}</b><small>${esc(FILES[id].team)}</small></span></button>`).join('')}</div>
      <h3>Recent sign-ins</h3>
      <table class="log"><tbody>
        <tr class="warnrow"><td>Nov 2, 02:14</td><td>Unknown device</td><td>⚠ Not you?</td></tr>
        <tr><td>Oct 31, 08:55</td><td>TBRANDT-LT</td><td></td></tr>
      </tbody></table></div></div>`;
  }

  function pagePhish() {
    if (S.browser.phished) {
      return `<div class="pg portal"><div class="login"><div class="login-logo">${px('spark', 3)}<b>Pixelforge Single Sign-On</b></div>
        <p>Thank you! Your account has been verified.</p></div></div>`;
    }
    return `<div class="pg portal"><form class="login" onsubmit="return false">
      <div class="login-logo">${px('spark', 3)}<b>Pixelforge Single Sign-On</b></div>
      <p class="small">Verify your account to keep access to Art Drive.</p>
      <label>Username<input autocomplete="off"></label>
      <label>Password<input type="password" autocomplete="off"></label>
      <button type="submit" class="btn primary" data-act="phish">Verify account</button>
    </form></div>`;
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

    mailSel: (d) => { S.mail.sel = d.id; S.mail.read[d.id] = true; S.mail.linkCheck = null; render('mail'); },
    addr: (d) => { S.mail.showAddr[d.id] = !S.mail.showAddr[d.id]; render('mail'); },
    link: (d) => { S.mail.linkCheck = d.url; render('mail'); },
    linkCancel: () => { S.mail.linkCheck = null; render('mail'); },
    linkOpen: () => { const u = S.mail.linkCheck; S.mail.linkCheck = null; render('mail'); openApp('browser'); navigate(u); },
    report: (d) => {
      const m = EMAILS.find((x) => x.id === d.id);
      if (S.mail.reported[m.id]) return;
      if (S.level !== 1) { toast('You already found the scam email.'); return; }
      if (m.scam) {
        S.mail.reported[m.id] = 'scam';
        render('mail');
        completeLevel(1, 'You found the scam email',
          `<p>The "IT Helpdesk" email came from <b>pixelforge-studio.net</b>, not the real <b>pixelforge.studio</b>, and its link pointed to that fake site.
           Mira never clicked it, so the leaker needed another way in.</p>
           <p><b>New lead from IT:</b> someone signed in to the Staff Portal as <b>theo.brandt</b> at 02:14 last night. Theo is on holiday.</p>`,
          'PF{check-the-sender}',
          'A scam email from the fake domain <b>pixelforge-studio.net</b> tried to steal Mira\'s password. She didn\'t fall for it.');
      } else {
        S.mail.reported[m.id] = 'genuine';
        render('mail');
        toast('IT checked this email: it\'s genuine. Keep looking.', 'bad');
      }
    },

    nav: (d) => { openApp('browser'); navigate(d.url); },
    back: () => { const p = S.browser.hist.pop(); if (p) navigate(p, false); },
    go: () => { const v = $('#addr'); if (v) navigate(v.value); },

    hint: () => {
      const u = ($('#lg-user') || {}).value || '';
      const user = u.trim().toLowerCase().replace(/@pixelforge\.studio$/, '');
      S.browser.loginUser = u;
      S.browser.hint = !user ? 'Type your username first, then click "Forgot password?".'
        : user === SECRET.user ? 'Password hint for theo.brandt: <b>my best buddy + the year we met</b>'
        : 'No password hint is set for this account.';
      render('browser');
    },
    login: () => {
      const u = ($('#lg-user') || {}).value || '';
      const p = (($('#lg-pass') || {}).value || '').trim().toLowerCase();
      const user = u.trim().toLowerCase().replace(/@pixelforge\.studio$/, '');
      S.browser.loginUser = u;
      if (S.level < 2) {
        S.browser.loginErr = 'Sign-in is paused by IT during the investigation. Finish your current task first.';
      } else if (user === SECRET.user && hash(p) === SECRET.passHash) {
        S.loggedIn = true;
        S.browser.loginErr = '';
        S.browser.hint = '';
        S.browser.loginPass = '';
        checkEvidence();
        render('browser');
        if (S.level === 2) {
          completeLevel(2, 'You\'re in Theo\'s account',
            `<p>Theo's password was his dog's name plus the year he met him. He posted both publicly on Chirper,
             so anyone could guess it, and the leaker did.</p>
             <p><b>Next:</b> find out what the leaker took. Theo's files open at addresses like <code>…/files?id=12</code>.
             Does the portal check who is allowed to open which file?</p>`,
            'PF{weak-password}',
            'Theo\'s password was guessable from his public Chirper posts. The leaker signed in as him.');
        }
        return;
      } else {
        S.browser.loginErr = 'Wrong username or password.';
      }
      render('browser');
    },
    logout: () => { S.loggedIn = false; render('browser'); },
    phish: () => { S.browser.phished = true; render('browser'); },

    accuse: (d) => {
      if (!S.sawKey || S.level !== 3) return;
      if (hash(d.id) === SECRET.leakerHash) { finishGame(); return; }
      const p = SUSPECTS.find((x) => x.id === d.id);
      S.accuseMsg = `${esc(p.name)}? The evidence doesn't point to them. Look at the access log again.`;
      render('casefile');
    },

    start: () => {
      S.player = (($('#player') || {}).value || '').trim().slice(0, 24) || 'Player';
      S.started = true;
      S.startedAt = S.levelStart = Date.now();
      closeModal();
      renderAll();
      openApp('casefile');
    },
    continue: () => closeModal(),
    copy: () => {
      const txt = JSON.stringify(window.pixelforgeLastResult, null, 2);
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('Results copied', 'good'), () => toast('Could not copy'));
    },
    again: () => location.reload(),
    level2: () => { location.href = 'level2.html'; },
  };

  /* every click inside the desktop counts towards the current task */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const inApp = !!t.closest('#app');
    // a click on a <label> is forwarded by the browser as a second click on its input: count only that one
    const lab = t.closest('label');
    const forwarded = lab && lab.control && t !== lab.control;
    const counted = S.started && !S.done && inApp && $('#overlay').hidden && !forwarded && !t.closest('[data-nocount]');
    if (counted) {
      S.clicks[S.level] += 1;
      updateTop();
    }
    const a = t.closest('[data-act]');
    if (a && a.getAttribute('aria-disabled') !== 'true') {
      e.preventDefault();
      const fn = ACTS[a.dataset.act];
      if (fn) fn(a.dataset);
    }
    if (counted && $('#win-casefile')) render('casefile');
  });

  /* remember half-typed text so re-rendering a window never wipes it */
  document.addEventListener('input', (e) => {
    const id = e.target.id;
    if (id === 'addr') S.browser.addrDraft = e.target.value;
    else if (id === 'lg-user') S.browser.loginUser = e.target.value;
    else if (id === 'lg-pass') S.browser.loginPass = e.target.value;
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
    $('#icons').innerHTML = [['casefile', 'Case File'], ['mail', 'Mail'], ['browser', 'Browser']]
      .map(([id, l]) => `<button class="dicon" data-act="open" data-id="${id}">${px(id, 3.5)}<span>${l}</span></button>`).join('');
    tickClock();
    setInterval(tickClock, 15000);
    updateTop();
    modal(`<div class="intro">${px('spark', 6)}
      <div class="modal-kicker">Level 1 · Pixelforge Studios · Incident #0412</div>
      <h2>Someone is leaking our secret game art</h2>
      <p>Art for our next game, <b>Emberfall</b>, is showing up online before the reveal. You're the security expert we hired.
      You have access to lead artist Mira Kade's computer. Find out how the leaker got in.</p>
      <p class="muted small">Every click counts: fewer clicks is a better score. No terminal needed.</p>
      <label class="name">Your name<input id="player" maxlength="24" autocomplete="off" placeholder="Player"></label>
      <div class="modal-actions start-actions">
        <button class="btn ghost" data-act="level2" data-nocount>Level 2 (harder) →</button>
        <button class="btn primary" data-act="start" data-nocount>Start Level 1</button>
      </div></div>`);
    setTimeout(() => { const i = $('#player'); if (i) i.focus(); }, 50);
  }

  window.pixelforgeScore = () => ({ player: S.player, game: 1, tasks: 3, level: S.level, done: S.done, clicks: S.clicks.slice(1) });
  boot();
})();
