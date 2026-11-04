/* Guard duty engine. Same desktop look and click semantics as gameR2.js.
   Nothing tells the player whether a decision was right until all 8 items are decided. */
(() => {
  'use strict';
  const url = new URL(location.href);
  const raw = url.searchParams.get('seed');
  let seed = raw !== null && /^[+-]?\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(seed)) { seed = Math.floor(Math.random() * 999999) + 1; url.searchParams.set('seed', String(seed)); history.replaceState(null, '', url.href); }
  const C = window.PFGuard.generate(seed);
  const N = C.items.length;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = (sec) => { const s = Math.round(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const host = (u) => u.replace(/^https?:\/\//, '').split('/')[0];
  function px(name, scale = 3, cls = '') {
    const g = ICONS[name]; let rects = '';
    g.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PALETTE[c]}"/>`; }));
    return `<svg class="px ${cls}" viewBox="0 0 ${g[0].length} ${g.length}" width="${g[0].length * scale}" height="${g.length * scale}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }

  const S = {
    started: false, done: false, player: '', clicks: 0, startedAt: 0, seconds: 0,
    sel: null, shown: {}, inspected: {}, decision: {}, // decision[id] = 'do' | 'stop'
    phone: { who: null, about: null, log: [] },
    browser: { page: 'home', domainQ: '', domainShown: null },
  };
  const decided = () => Object.keys(S.decision).length;

  /* ---------- windows (as gameR2) ---------- */
  const APPS = {
    queue: { title: 'Work queue', icon: 'mail', w: 1120, h: 680, x: 110, y: 10, render: renderQueue },
    directory: { title: 'Staff & partner directory', icon: 'files', w: 1080, h: 720, x: 'right', y: 4, render: renderDirectory },
    passwords: { title: 'Password manager', icon: 'shield', w: 640, h: 460, x: 'right', y: 40, render: renderPasswords },
    suppliers: { title: 'Supplier register', icon: 'files', w: 900, h: 460, x: 'right', y: 50, render: renderSuppliers },
    browser: { title: 'Browser', icon: 'browser', w: 880, h: 560, x: 'right', y: 36, render: renderBrowser },
    phone: { title: 'Phone · call back', icon: 'chat', w: 860, h: 700, x: 'right', y: 10, render: renderPhone },
  };
  let zTop = 10;
  function openApp(id) {
    let win = $(`#win-${id}`);
    if (!win) {
      const a = APPS[id], desk = $('#desktop').getBoundingClientRect();
      const w = Math.min(a.w, desk.width - 120), h = Math.min(a.h, desk.height - 30);
      const want = a.x === 'right' ? desk.width - w - 16 : a.x;
      const x = Math.max(110, Math.min(want, desk.width - w - 10)), y = Math.max(10, Math.min(a.y, desk.height - h - 10));
      win = document.createElement('section'); win.className = 'win'; win.id = `win-${id}`;
      win.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      win.innerHTML = `<div class="win-bar" data-drag="${id}"><span class="win-ico">${px(a.icon, 1.5)}</span><span class="win-title">${esc(a.title)}</span><button class="win-close" data-act="close" data-id="${id}" aria-label="Close">✕</button></div><div class="win-body"></div>`;
      $('#windows').appendChild(win); render(id);
    }
    focusWin(win);
  }
  function focusWin(win) { document.querySelectorAll('.win').forEach((w) => w.classList.remove('active')); win.classList.add('active'); win.style.zIndex = ++zTop; }
  function render(id) { const win = $(`#win-${id}`); if (!win) return; const body = $('.win-body', win); const f = body.contains(document.activeElement) ? document.activeElement.id : ''; body.innerHTML = APPS[id].render(); if (f) { const el = document.getElementById(f); if (el) { el.focus(); el.setSelectionRange?.(el.value.length, el.value.length); } } }
  function renderAll() { Object.keys(APPS).forEach(render); updateTop(); }
  let drag = null;
  document.addEventListener('pointerdown', (e) => { const win = e.target.closest('.win'); if (win) focusWin(win); const bar = e.target.closest('[data-drag]'); if (bar && !e.target.closest('button')) { const r = win.getBoundingClientRect(); drag = { win, dx: e.clientX - r.left, dy: e.clientY - r.top }; bar.setPointerCapture(e.pointerId); } });
  document.addEventListener('pointermove', (e) => { if (!drag) return; const d = $('#desktop').getBoundingClientRect(); drag.win.style.left = `${Math.max(-drag.win.offsetWidth + 80, Math.min(e.clientX - d.left - drag.dx, d.width - 80))}px`; drag.win.style.top = `${Math.max(0, Math.min(e.clientY - d.top - drag.dy, d.height - 40))}px`; });
  document.addEventListener('pointerup', () => { drag = null; });
  function updateTop() { $('#tb-clicks').textContent = `Clicks: ${S.clicks}`; $('#tb-task').textContent = S.started ? `${C.title} · Decided ${decided()} of ${N}${S.done ? ' · Day over' : ''}` : C.title; }
  function tickClock() { $('#tb-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function modal(html) { const o = $('#overlay'); o.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`; o.hidden = false; $('#app').inert = true; }
  function closeModal() { $('#overlay').hidden = true; $('#overlay').innerHTML = ''; $('#app').inert = false; }

  /* ---------- Work queue ---------- */
  const KIND = { link: 'Sign-in', file: 'Shared file', payment: 'Payment', update: 'Install', access: 'Access request' };
  function status(it) { const d = S.decision[it.id]; return d === 'do' ? '<span class="g-badge g-do">Done</span>' : d === 'stop' ? '<span class="g-badge g-stop">Stopped</span>' : '<span class="g-badge">Open</span>'; }
  function renderQueue() {
    const list = C.items.map((it) => `<button class="mail-item ${S.sel === it.id ? 'sel' : ''} ${S.decision[it.id] ? '' : 'unread'}" data-act="sel" data-id="${it.id}"><span class="mi-top"><b>${esc(it.fromName)}</b><span class="mi-time">${it.arrive}</span></span><span class="mi-subj">${esc(it.subject)}</span><span class="mi-meta">${KIND[it.type]} · ${it.channel === 'chat' ? 'Chat' : 'Mail'} ${status(it)}</span></button>`).join('');
    const it = C.items.find((x) => x.id === S.sel);
    let right = `<div class="mail-empty"><p>Pick an item. Decide every one: <b>Do it</b> or <b>Stop it</b>. Decisions are final.</p></div>`;
    if (it) {
      const d = S.decision[it.id];
      const addr = S.shown[it.id] ? `<span class="g-addr">${esc(it.fromAddr)}</span>` : `<button class="linkish" data-act="show" data-id="${it.id}">show address</button>`;
      const link = it.link ? `<div class="g-box"><b>${esc(it.link.text)}</b> ${S.inspected[it.id] ? `<span class="g-addr">→ ${esc(it.link.target)}</span>` : `<button class="linkish" data-act="inspect" data-id="${it.id}">inspect link</button>`}</div>` : '';
      const att = it.attachment ? `<div class="g-box">📎 <b>${esc(it.attachment)}</b></div>` : '';
      const buttons = d ? `<p class="g-final">You chose: <b>${d === 'do' ? 'Do it' : 'Stop it'}</b>. Decisions are final.</p>`
        : `<div class="g-actions"><button class="btn primary" data-act="do" data-id="${it.id}">Do it: ${esc(it.action)}</button><button class="btn danger" data-act="stop" data-id="${it.id}">Stop it (report as scam)</button></div>`;
      right = `<div class="g-item"><div class="g-kicker">${KIND[it.type]} · ${it.channel === 'chat' ? 'Chat message' : 'Mail'} · ${it.arrive}</div><h2 class="mr-subj">${esc(it.subject)}</h2>
        <p class="g-from"><b>${esc(it.fromName)}</b> ${addr}</p><p class="g-to muted small">To: ${esc(C.me.name)}</p>
        <div class="g-body">${esc(it.body)}${it.urgent ? ` <b>${esc(it.urgent)}</b>` : ''}</div>${link}${att}${buttons}</div>`;
    }
    return `<div class="mail"><div class="mail-list"><div class="ml-head">Today · ${N} items · decided ${decided()}</div>${list}</div><div class="mail-read">${right}</div></div>`;
  }
  /* ---------- reference tools ---------- */
  const table = (head, rows) => `<table class="log"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  function renderDirectory() {
    // Compact, so staff AND partners fit on one screen without scrolling (pilot finding, 2026-11-04).
    return `<div class="pad g-dir"><h3 class="sec-dev">Pixelforge staff</h3>${table(['Name', 'Role', 'Email', 'Phone', 'Manager'], C.staff.map((s) => [s.name, s.role, s.email, s.phone, s.manager]))}
      <h3 class="sec-dev">Partner contacts (outside studios)</h3>${table(['Name', 'Company', 'Email', 'Phone'], C.contacts.map((c) => [c.name, c.company, c.email, c.phone]))}</div>`;
  }
  function renderPasswords() {
    return `<div class="pad"><p class="muted small">Sites where ${esc(C.me.name.split(' ')[0])} has a saved password. The manager only fills in passwords on these exact addresses.</p>${table(['Service', 'Saved for address'], C.services.map((s) => [s.name, s.real]).concat([['Pixelforge single sign-on', C.companyDomain]]))}</div>`;
  }
  function renderSuppliers() {
    return `<div class="pad"><p class="muted small">Official supplier records, kept by Finance.</p>${table(['Supplier', 'Legal name', 'Mail domain', 'Bank account (IBAN)', 'Contact', 'Phone'], C.suppliers.map((s) => [s.name, s.owner, s.real, s.iban, s.contact, s.phone]))}</div>`;
  }
  function renderBrowser() {
    const B = S.browser;
    const marks = [['home', 'Bookmarks'], ['signin', 'Sign-in pages'], ...C.vendors.map((v) => [`vendor:${v.name}`, v.name]), ['whois', 'Domain lookup']];
    const bar = `<div class="br-bar">${marks.map(([id, l]) => `<button class="btn small ${B.page === id ? 'primary' : ''}" data-act="page" data-id="${esc(id)}">${esc(l)}</button>`).join(' ')}</div>`;
    let body = '<div class="pg pg-plain"><h1>Bookmarks</h1><p>The studio\'s official sign-in pages, vendor sites and the domain lookup.</p></div>';
    if (B.page === 'signin') {
      body = `<div class="pg pg-plain"><h1>Official sign-in pages</h1><p class="muted">Bookmarked by IT. Always sign in on these exact addresses.</p>${table(['Service', 'Sign-in page'], C.services.map((s) => [s.name, `https://${s.real}/login`]))}</div>`;
    } else if (B.page.startsWith('vendor:')) {
      const v = C.vendors.find((x) => `vendor:${x.name}` === B.page);
      body = `<div class="pg pg-plain"><h1>${esc(v.name)}</h1><p class="muted">${esc(v.site)} · published by ${esc(v.owner)}</p><h2>${esc(v.plugin)}</h2>${table(['Field', 'Value'], [['Latest version', v.version], ['Official downloads', `only from ${v.real}`], ['Mail updates come from', `updates@${v.real}`]])}</div>`;
    } else if (B.page === 'whois') {
      const r = B.domainShown;
      body = `<div class="pg pg-plain"><h1>Domain lookup</h1><form class="sec-search" data-form="whois"><label class="br-addr"><input id="whois-q" value="${esc(B.domainQ)}" placeholder="example.com" aria-label="Domain" autocomplete="off" spellcheck="false"></label><button type="submit" class="btn small">Look up</button></form>
        ${r ? (r.row ? table(['Field', 'Value'], [['Domain', r.domain], ['Registered to', r.row.owner], ['Registered on', r.row.created]]) : `<p>No record for ${esc(r.domain)}.</p>`) : ''}</div>`;
    }
    return `<div class="browser">${bar}<div class="br-page">${body}</div></div>`;
  }
  function renderPhone() {
    const P = S.phone;
    const people = C.phoneBook.map((p) => `<button class="file acct ${P.who === p.name ? 'sel' : ''}" data-act="who" data-id="${esc(p.name)}"><b>${esc(p.name)}</b><span class="muted small">${esc(p.label)} · ${esc(p.phone)}</span></button>`).join('');
    const about = P.who ? `<h3 class="sec-dev">Ask ${esc(P.who.split(' ')[0])} about:</h3>${C.items.map((it) => `<button class="btn small" data-act="ask" data-id="${it.id}">${it.arrive} · ${esc(it.subject)}</button>`).join(' ')}` : '<p class="muted">Pick someone to call. Calls go to the number in the directory or supplier register, so the answer is always truthful.</p>';
    const log = P.log.map((l) => `<p class="g-call"><b>${esc(l.who)}</b> about "${esc(l.subject)}": ${esc(l.answer)}</p>`).join('');
    return `<div class="g-phone"><div class="g-people">${people}</div><div class="pad">${about}<div class="g-log">${log}</div></div></div>`;
  }

  /* ---------- end of day ---------- */
  function score() {
    let stopped = 0, missed = 0, falseStops = 0, work = 0;
    C.items.forEach((it) => { const d = S.decision[it.id]; if (it.scam) { if (d === 'stop') stopped++; else if (d === 'do') missed++; } else { if (d === 'stop') falseStops++; else if (d === 'do') work++; } });
    const all = decided() === N;
    return { filed: all, decided: decided(), scams: C.secret.n, stopped, missed, falseStops, work, correct: all && missed === 0 && falseStops <= 1 };
  }
  function endDay() {
    S.done = true; S.seconds = Math.round((Date.now() - S.startedAt) / 1000);
    window.pixelforgeLastResult = { ...window.pixelforgeScore(), seconds: S.seconds };
    renderAll();
    const s = score();
    const rows = C.items.map((it) => { const d = S.decision[it.id], ok = it.scam ? d === 'stop' : d === 'do'; return `<tr><td>${it.arrive}</td><td>${esc(it.subject)}</td><td>${it.scam ? '<b>Scam</b>' : 'Real'}</td><td>${d === 'do' ? 'Did it' : 'Stopped'}</td><td class="${ok ? 'res-ok' : 'res-fail'}">${ok ? '✓' : '✗'}</td></tr>`; }).join('');
    modal(`<div class="modal-kicker">Day over · ${esc(C.title)}</div><h2>${s.correct ? 'Safe day ✓' : 'Not a safe day ✗'}</h2>
      <p>Scams stopped: <b>${s.stopped} of ${s.scams}</b> · Real items stopped by mistake: <b>${s.falseStops}</b> · Real work done: <b>${s.work}</b></p>
      <table class="score"><thead><tr><th>Time</th><th>Item</th><th>Truth</th><th>You</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <p class="muted small">A safe day needs every scam stopped and at most one real item stopped.</p>
      <div class="modal-score">${S.clicks} clicks · ${fmtTime(S.seconds)}</div><div class="modal-actions"><button class="btn" data-act="new" data-nocount>New random day</button><button class="btn primary" data-act="again" data-nocount>Play again</button></div>`);
  }
  function decide(id, d) {
    if (S.done || !S.started || S.decision[id]) return;
    S.decision[id] = d; render('queue'); updateTop();
    if (decided() === N) endDay();
  }

  const ACTS = {
    open: (d) => openApp(d.id),
    close: (d) => { const w = $(`#win-${d.id}`); if (w) w.remove(); },
    sel: (d) => { S.sel = d.id; render('queue'); },
    show: (d) => { S.shown[d.id] = true; render('queue'); },
    inspect: (d) => { S.inspected[d.id] = true; render('queue'); },
    do: (d) => decide(d.id, 'do'),
    stop: (d) => decide(d.id, 'stop'),
    page: (d) => { S.browser.page = d.id; render('browser'); },
    who: (d) => { S.phone.who = d.id; render('phone'); },
    ask: (d) => { const it = C.items.find((x) => x.id === d.id); if (!it || !S.phone.who) return; S.phone.log.unshift({ who: S.phone.who, subject: it.subject, answer: C.answers[S.phone.who][it.id] }); render('phone'); },
    start: () => { if (S.started) return; S.player = ($('#player').value || '').trim().slice(0, 24) || 'Player'; S.started = true; S.startedAt = Date.now(); closeModal(); renderAll(); openApp('queue'); },
    again: () => location.reload(),
    new: () => { const u = new URL(location.href); let n; do { n = Math.floor(Math.random() * 999999) + 1; } while (n === seed); u.searchParams.set('seed', String(n)); location.href = u.href; },
  };
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (S.started && !S.done && t.closest('#app') && $('#overlay').hidden && !t.closest('[data-nocount]')) { S.clicks++; updateTop(); }
    const a = t.closest('[data-act]');
    if (a) { e.preventDefault(); if (a.getAttribute('aria-disabled') !== 'true' && ACTS[a.dataset.act]) ACTS[a.dataset.act](a.dataset); }
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form]'); if (!form) return; e.preventDefault();
    if (S.done || !S.started) return;
    if (form.dataset.form === 'whois') {
      const q = $('#whois-q').value.trim().toLowerCase(); S.browser.domainQ = q; if (!q) return;
      const domain = host(q).replace(/^www\./, '');
      S.browser.domainShown = { domain, row: C.whois[domain] || null }; render('browser');
    }
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'whois-q') S.browser.domainQ = e.target.value; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('#overlay').hidden) { const b = $('#overlay [data-act="start"]'); if (b) { e.preventDefault(); b.click(); } } });

  window.pixelforgeScore = () => ({
    player: S.player, game: 'guard', seed, tasks: 1, level: 1, done: S.done, clicks: [S.clicks],
    progress: decided(), progressMax: N, found: C.items.filter((it) => S.decision[it.id]).map((it) => `${it.id}:${S.decision[it.id]}`), trapped: [],
    // The truth is only exposed once the day is over (code review round 1, point 7).
    trapsMax: 0, report: S.done ? score() : { filed: false, decided: decided() }, layout: S.done ? `scams-${C.secret.n}` : null, twists: [],
  });
  function boot() {
    document.title = `Pixelforge · ${C.title}`;
    $('.logo').innerHTML = px('spark', 2);
    $('#icons').innerHTML = [['queue', 'Work queue', 'mail'], ['directory', 'Directory', 'files'], ['passwords', 'Passwords', 'shield'], ['suppliers', 'Suppliers', 'files'], ['browser', 'Browser', 'browser'], ['phone', 'Phone', 'chat']].map(([id, label, icon]) => `<button class="dicon" data-act="open" data-id="${id}">${px(icon, 3)}<span>${label}</span></button>`).join('');
    tickClock(); setInterval(tickClock, 15000); updateTop();
    modal(`<div class="intro">${px('spark', 6)}<div class="modal-kicker">${esc(C.title)} · Seed ${seed}</div><h2>Guard duty</h2><div>${C.intro}</div><label class="name">Your name<input id="player" maxlength="24" autocomplete="off" placeholder="Player"></label><div class="modal-actions start-actions"><button class="btn ghost" data-act="new" data-nocount>New random day</button><button class="btn primary" data-act="start" data-nocount>Start</button></div></div>`);
    $('#player').focus();
  }
  boot();
})();
