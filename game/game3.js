/* Pixelforge Level 3 (Incident #0414). Same window/click engine as Levels 1 and 2, but open-ended:
   no step-by-step tasks, 7 discoveries to make anywhere in 5 apps, then one final report (3 more points).
   Score = discoveries out of 10, then clicks. */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hash = (s) => { let x = 0x811c9dc5; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x; };
  const fmtTime = (sec) => { const s = Math.round(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const initials = (n) => n.split(' ').map((w) => w[0]).join('');
  const MAX = L3.milestones.length;
  const MAX_WRONG_FLAGS = 2; // flagging is a real accusation: guessing every row must not earn the discovery

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
    started: false, done: false, player: '', clicks: 0, startedAt: 0,
    found: [], foundAt: {}, report: { who: null, how: null, evidence: [] }, reportMsg: '',
    mail: { sel: null, read: {} },
    chat: { sel: null, person: null },
    sec: { query: '', device: null, lastFlag: null, err: '', wrongFlags: 0 },
    files: { view: 'shared', open: null },
    browser: { url: 'pixelforge.studio', hist: [], addrDraft: null, leakQuery: '', leakShown: null },
  };

  function discover(id) {
    if (S.done || S.found.includes(id)) return;
    S.found.push(id);
    S.foundAt[id] = { clicks: S.clicks, seconds: Math.round((Date.now() - S.startedAt) / 1000) };
    const m = L3.milestones.find((x) => x.id === id);
    if (S.started) toast(`Discovery ${S.found.length} of ${MAX}: ${esc(m.name)}`, 'good');
    updateTop();
    render('casefile');
  }

  /* ---------- windows ---------- */
  const APPS = {
    casefile: { title: 'Case File', icon: 'casefile', w: 400, h: 640, x: 'right', y: 12, render: renderCase },
    mail: { title: 'Mail · security inbox', icon: 'mail', w: 760, h: 480, x: 120, y: 24, render: renderMail },
    chat: { title: 'Chat · admin view', icon: 'chat', w: 780, h: 500, x: 130, y: 34, render: renderChat },
    security: { title: 'Security Center · device timelines', icon: 'shield', w: 820, h: 520, x: 140, y: 44, render: renderSecurity },
    files: { title: 'Files · company file server', icon: 'files', w: 780, h: 500, x: 150, y: 54, render: renderFiles },
    browser: { title: 'Browser', icon: 'browser', w: 860, h: 600, x: 160, y: 40, render: renderBrowser },
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
    $('#tb-clicks').textContent = `Clicks: ${S.clicks}`;
    $('#tb-task').textContent = S.started ? `${L3.incident} · Discoveries ${S.found.length} of ${MAX}${S.done ? ' · Report filed' : ''}` : L3.incident;
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

  /* ---------- Case File: goal, discoveries, report ---------- */
  function renderCase() {
    const list = L3.milestones.map((m, i) => {
      const got = S.found.includes(m.id);
      return `<li class="${got ? 'got' : ''}"><span class="mk">${got ? '✓' : i + 1}</span>${got ? esc(m.name) : '<span class="muted">???</span>'}</li>`;
    }).join('');
    const R = S.report, opt = (group, id, label, on) =>
      `<button type="button" id="opt-${group}-${id}" class="ropt ${on ? 'on' : ''}" data-act="pick" data-group="${group}" data-id="${id}" aria-pressed="${on}">${esc(label)}</button>`;
    const report = S.done ? '<p class="cf-task">Report filed. The case is closed.</p>' : `
      <div class="report">
        <p class="rq">1. Who inside helped the attackers?</p>
        <div class="ropts">${L3.report.who.map(([id, l]) => opt('who', id, l, R.who === id)).join('')}</div>
        <p class="rq">2. How did the attackers get in?</p>
        <div class="ropts col">${L3.report.how.map(([id, l]) => opt('how', id, l, R.how === id)).join('')}</div>
        <p class="rq">3. Which 2 pieces of evidence prove who helped? <span class="muted">(${R.evidence.length} of 2 picked)</span></p>
        <div class="ropts col">${L3.report.evidence.map(([id, l]) => opt('evidence', id, l, R.evidence.includes(id))).join('')}</div>
        ${S.reportMsg ? `<p class="warn small">${S.reportMsg}</p>` : ''}
        <button type="button" id="file-report" class="btn primary" data-act="file">File report (only once)</button>
      </div>`;
    return `<div class="cf">
      <div class="cf-head">${px('casefile', 2)}<div><div class="cf-kicker">${L3.incident} · Level 3</div><div class="cf-name">Ransomware on launch day</div></div></div>
      <p class="cf-task">${L3.goal}</p>
      <h3>Discoveries · ${S.found.length} of ${MAX}</h3>
      <ol class="disc">${list}</ol>
      <h3>Your report</h3>${report}
    </div>`;
  }

  /* ---------- Mail ---------- */
  function renderMail() {
    const M = S.mail;
    const list = L3.emails.map((m) => `<button class="mail-item ${M.sel === m.id ? 'sel' : ''} ${M.read[m.id] ? '' : 'unread'}" data-act="mailSel" data-id="${m.id}">
        <span class="mi-top"><span class="mi-from">${esc(m.name)}</span><span class="mi-time">${esc(m.time)}</span></span>
        <span class="mi-subj">${esc(m.subject)}</span></button>`).join('');
    const m = L3.emails.find((x) => x.id === M.sel);
    const read = m ? `<h2 class="mr-subj">${esc(m.subject)}</h2>
      <div class="mr-meta"><span><span class="avatar sm">${esc(m.name[0])}</span> <b>${esc(m.name)}</b> <span class="addr">&lt;${esc(m.addr)}&gt;</span></span><span class="mr-time">${esc(m.time)}</span></div>
      <div class="mr-body">${m.body}</div>` : '<div class="mail-empty">Select an email to read it.</div>';
    return `<div class="mail"><aside class="mail-list"><div class="mail-folder">Inbox <span>${L3.emails.length}</span></div>${list}</aside>
      <section class="mail-read">${read}</section></div>`;
  }

  /* ---------- Chat ---------- */
  function renderChat() {
    const C = S.chat;
    const list = L3.chats.map((c) => `<button class="mail-item ${C.sel === c.id ? 'sel' : ''}" data-act="chatSel" data-id="${c.id}">
        <span class="mi-from">${esc(c.title)}</span><span class="mi-subj">${c.kind === 'channel' ? 'Channel' : 'Direct messages'}</span></button>`).join('');
    const c = L3.chats.find((x) => x.id === C.sel);
    let right = '<div class="mail-empty">Pick a conversation. As the investigator you can read all of them.</div>';
    if (C.person) {
      const p = L3.people[C.person];
      right = `<div class="person"><button type="button" class="linkish small" data-act="personClose">← Back to the conversation</button>
        <div class="ch-prof"><span class="avatar lg">${initials(p.title)}</span><div><b>${esc(p.title)}</b>
        <div><span class="badge ${p.badge === 'Guest account' ? 'bad' : 'ok'}">${esc(p.badge)}</span></div></div></div>
        <ul class="plines">${p.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`;
    } else if (c) {
      right = `<div class="chat-head">${esc(c.title)}</div>${c.msgs.map(([who, t, txt]) => `<div class="msg">
        <div class="msg-top"><button type="button" class="linkish msg-who" data-act="person" data-id="${esc(who)}">${esc(who)}</button><span class="muted small">${esc(t)}</span></div>
        <div>${esc(txt)}</div></div>`).join('')}`;
    }
    return `<div class="mail"><aside class="mail-list"><div class="mail-folder">Conversations <span>${L3.chats.length}</span></div>${list}</aside>
      <section class="mail-read">${right}</section></div>`;
  }

  /* ---------- Security Center ---------- */
  function renderSecurity() {
    const Q = S.sec;
    const dev = Q.device ? L3.devices[Q.device] : null;
    const flagsLeft = MAX_WRONG_FLAGS - Q.wrongFlags, flagLocked = flagsLeft <= 0 || S.found.includes('mfa');
    const flagNote = S.found.includes('mfa') ? '' : flagLocked
      ? '<p class="warn small">Flagging is locked: you flagged too many normal entries.</p>'
      : `<p class="muted small">Flag only the one entry where the attacker got in. Wrong flags left: ${flagsLeft}.</p>`;
    let body = '<p class="muted small">Type a device name (for example WEB-SRV-01) and click Search to see everything that happened on it.</p>';
    if (Q.err) body = `<p class="warn small">${Q.err}</p>`;
    if (dev) {
      body = `<h3 class="sec-dev">${esc(dev.name)}</h3>${flagNote}<table class="log sec-table"><thead><tr><th>When</th><th>What</th><th>Account</th><th>From</th><th>Result</th><th></th></tr></thead><tbody>
        ${dev.rows.map((r, i) => `<tr><td>${esc(r.t)}</td><td>${esc(r.what)}</td><td>${esc(r.acct)}</td><td>${esc(r.from)}</td><td>${esc(r.res)}</td>
          <td><button class="btn small flagbtn" data-act="flagRow" data-id="${i}" aria-disabled="${flagLocked}">Flag</button></td></tr>
          ${Q.lastFlag === i ? `<tr class="why-row"><td colspan="6">↳ ${esc(dev.why || 'Nothing unusual about this entry.')}</td></tr>` : ''}`).join('')}
      </tbody></table>`;
    }
    return `<div class="sec">
      <form class="sec-search" onsubmit="return false">
        <label class="br-addr"><input id="dev-q" value="${esc(Q.query)}" placeholder="Device name" aria-label="Device name" autocomplete="off" spellcheck="false"></label>
        <button type="submit" class="btn small" data-act="devSearch">Search</button>
      </form>${body}</div>`;
  }

  /* ---------- Files ---------- */
  function renderFiles() {
    const F = S.files;
    const tabs = [['shared', 'Shared'], ['servers', 'Servers'], ['backups', 'Backups']]
      .map(([id, l]) => `<button class="mail-item ${F.view === id ? 'sel' : ''}" data-act="filesView" data-id="${id}"><span class="mi-from">${l}</span></button>`).join('');
    let right = '';
    if (F.view === 'shared') {
      const f = L3.sharedFiles.find((x) => x.id === F.open);
      right = f ? `<button type="button" class="linkish small" data-act="fileClose">← All shared files</button><h3 class="sec-dev">${esc(f.name)}</h3><pre class="source">${esc(f.text)}</pre>`
        : `<div class="files">${L3.sharedFiles.map((x) => `<button class="file" data-act="fileOpen" data-id="${x.id}"><span class="file-ico">▤</span><span><b>${esc(x.name)}</b></span></button>`).join('')}</div>`;
    } else if (F.view === 'servers') {
      right = `<h3 class="sec-dev">Servers</h3><table class="log"><thead><tr><th>Server</th><th>Status</th><th>Locked at</th></tr></thead><tbody>
        ${L3.servers.map(([n, st, t]) => `<tr><td>${esc(n)}</td><td class="${st === 'OK' ? 'res-ok' : 'res-fail'}">${esc(st)}</td><td>${esc(t)}</td></tr>`).join('')}</tbody></table>`;
    } else {
      right = `<h3 class="sec-dev">Backup history</h3><table class="log"><thead><tr><th>When</th><th>Account</th><th>Action</th><th>Result</th></tr></thead><tbody>
        ${L3.backups.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    return `<div class="mail"><aside class="mail-list"><div class="mail-folder">File server</div>${tabs}</aside><section class="mail-read">${right}</section></div>`;
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
    Object.assign(S.browser, { url, addrDraft: null, leakShown: null });
    render('browser');
  }
  function renderBrowser() {
    const B = S.browser;
    const marks = [['pixelforge.studio', 'Pixelforge website'], ['chirper.social', 'Chirper'], ['leakcheck.net', 'LeakCheck']]
      .map(([u, l]) => `<button class="mark" data-act="nav" data-url="${u}">${esc(l)}</button>`).join('');
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
    if (r.host === 'pixelforge.studio') {
      const nav = `<div class="pf-nav"><button type="button" class="linkish" data-act="nav" data-url="pixelforge.studio">${px('spark', 2)} Pixelforge Studios</button>
        <button type="button" class="linkish" data-act="nav" data-url="pixelforge.studio/team">Team</button></div>`;
      if (r.path === '/team') {
        return `<div class="pg pf">${nav}<h1 class="pf-h">Meet the team</h1><div class="team">${L3.team.map((t) => `<div class="tcard"><span class="avatar lg">${initials(t.name)}</span>
          <b>${esc(t.name)}</b><small>${esc(t.role)}</small><small>${esc(t.email)}</small>
          <button type="button" class="linkish" data-act="nav" data-url="chirper.social/@${t.handle}">@${t.handle} on Chirper</button></div>`).join('')}</div></div>`;
      }
      if (r.path) return '<div class="pg pg-error"><h1>404</h1><p>This page doesn\'t exist on pixelforge.studio.</p></div>';
      return `<div class="pg pf">${nav}<div class="pf-hero"><div class="pf-tag">Launching today</div><h1>EMBERFALL</h1>
        <p>Our servers are having trouble. Launch may be delayed.</p>
        <button class="btn primary" data-act="nav" data-url="pixelforge.studio/team">Meet the team →</button></div></div>`;
    }
    if (r.host === 'chirper.social') {
      const h = r.path.replace(/^\/@?/, '');
      if (h) {
        const p = L3.chirper[h];
        if (!p) return '<div class="pg ch"><div class="ch-brand">chirper</div><p>This account doesn\'t exist.</p></div>';
        return `<div class="pg ch"><div class="ch-brand"><button type="button" class="linkish" data-act="nav" data-url="chirper.social">chirper</button></div>
          <div class="ch-prof"><span class="avatar lg">${initials(p.name)}</span><div><b>${esc(p.name)}</b><div class="muted">@${h}</div><p>${esc(p.bio)}</p></div></div>
          ${p.posts.map(([t, d]) => `<div class="ch-post"><div class="muted small">${esc(d)}</div><p>${esc(t)}</p></div>`).join('')}</div>`;
      }
      return `<div class="pg ch"><div class="ch-brand">chirper</div><h2>Trending</h2>
        <div class="ch-post"><div class="muted small">@technews · 3h</div><p>Game studio Pixelforge hit by ransomware on launch day. Group "NightShade" claims the attack.</p></div>
        <div class="ch-post"><div class="muted small">@leakcheck · 1d</div><p>Reusing passwords? Check if your email was in a data breach at leakcheck.net</p></div>
        <h2>People</h2><div class="ch-people">${Object.entries(L3.chirper).map(([h2, p]) => `<button class="ch-person" data-act="nav" data-url="chirper.social/@${h2}">
          <span class="avatar sm">${p.name[0]}</span><span><b>${esc(p.name)}</b><small>@${h2}</small></span></button>`).join('')}</div></div>`;
    }
    if (r.host === 'leakcheck.net') {
      const B = S.browser, res = B.leakShown;
      let out = '';
      if (res) {
        out = res.found.length ? `<p><b>${esc(res.email)}</b> was found in ${res.found.length} data breach${res.found.length > 1 ? 'es' : ''}:</p>
          <table class="log"><thead><tr><th>Site</th><th>Year</th><th>What leaked</th></tr></thead><tbody>${res.found.map((f) => `<tr>${f.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
          : `<p class="res-ok">Good news: <b>${esc(res.email)}</b> was not found in any known data breach.</p>`;
      }
      return `<div class="pg pg-plain"><h1>LeakCheck</h1><p class="muted">Was your email address in a data breach? Type it below.</p>
        <form class="sec-search" onsubmit="return false"><label class="br-addr"><input id="leak-q" value="${esc(B.leakQuery)}" placeholder="name@example.com" aria-label="Email address" autocomplete="off" spellcheck="false"></label>
        <button type="submit" class="btn small" data-act="leakSearch">Check</button></form>${out}</div>`;
    }
    if (r.host === 'restore.nightshade.top') {
      return `<div class="pg pg-plain ransom"><h1>NIGHTSHADE</h1><p>Victim: <b>Pixelforge Studios</b> · ID pf-0414</p>
        <p>Price: <b>10 BTC</b> · Time left: <b>41:12:09</b></p><p class="muted">Your servers are encrypted and your backups no longer exist.
        Special thanks to our friend at Pixelforge for a quiet night.</p></div>`;
    }
    return `<div class="pg pg-error"><h1>Can't reach this page</h1><p>Check the address for typos: <code>${esc(S.browser.url)}</code></p></div>`;
  }

  /* ---------- finishing ---------- */
  function fileReport() {
    const R = S.report;
    if (!R.who || !R.how || R.evidence.length !== 2) {
      S.reportMsg = 'Pick one person, one way in and exactly 2 pieces of evidence first.';
      render('casefile');
      return;
    }
    if (hash(R.who) === L3.secret.who) discover('who');
    if (hash(R.how) === L3.secret.how) discover('how');
    if (hash([...R.evidence].sort().join('+')) === L3.secret.evidence) discover('evidence');
    S.done = true;
    const seconds = Math.round((Date.now() - S.startedAt) / 1000);
    const result = { level: 3, player: S.player, date: new Date().toISOString(), found: S.found.length, of: MAX, clicks: S.clicks, seconds };
    let runs = [];
    try { runs = JSON.parse(localStorage.getItem('pixelforge-runs-l3') || '[]'); } catch (e) { runs = []; }
    runs.push(result);
    try { localStorage.setItem('pixelforge-runs-l3', JSON.stringify(runs)); } catch (e) { /* ignore */ }
    window.pixelforgeLastResult = result;
    renderAll();
    const rows = L3.milestones.map((m) => `<tr><td>${S.found.includes(m.id) ? '✓' : '✗'}</td><td>${esc(m.name)}</td></tr>`).join('');
    modal(`<div class="modal-kicker">Report filed · Level 3</div>
      <h2>${S.found.length} of ${MAX} discoveries</h2>
      <p>The attackers bought Kai's password from an old GamerForums leak; he used the same one at work. At night they spammed his phone with
      login pop-ups while a fake "IT Support" guest in the chat told him to tap Approve (MFA fatigue). The guest had been invited by
      <b>Sofia Romano</b>, the release manager, who also deleted every backup at 01:52, just before the attack began.</p>
      <table class="score"><tbody>${rows}</tbody></table>
      <div class="modal-score">${S.clicks} clicks · ${fmtTime(seconds)}</div>
      <div class="modal-actions">
        <button class="btn" data-act="copy" data-nocount>Copy results</button>
        <button class="btn primary" data-act="again" data-nocount>Play again</button>
      </div>`);
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

    mailSel: (d) => { S.mail.sel = d.id; S.mail.read[d.id] = true; render('mail'); },
    chatSel: (d) => {
      S.chat.sel = d.id; S.chat.person = null;
      const c = L3.chats.find((x) => x.id === d.id);
      render('chat');
      if (c && c.key) discover(c.key);
    },
    person: (d) => {
      if (!L3.people[d.id]) return;
      S.chat.person = d.id;
      render('chat');
      if (L3.people[d.id].key) discover(L3.people[d.id].key);
    },
    personClose: () => { S.chat.person = null; render('chat'); },

    devSearch: () => {
      const q = (($('#dev-q') || {}).value || '').trim();
      S.sec.query = q;
      S.sec.lastFlag = null;
      const key = q.toLowerCase();
      if (L3.devices[key]) {
        S.sec.device = key; S.sec.err = '';
        render('security');
        if (key === 'build-srv-02') discover('patient0');
      } else {
        S.sec.device = null;
        S.sec.err = q ? `No device called "${esc(q)}". Device names look like WEB-SRV-01.` : 'Type a device name first.';
        render('security');
      }
    },
    flagRow: (d) => {
      const dev = L3.devices[S.sec.device];
      if (!dev || S.sec.wrongFlags >= MAX_WRONG_FLAGS || S.found.includes('mfa')) return;
      const row = dev.rows[+d.id];
      if (row && row.bad) { S.sec.lastFlag = null; render('security'); discover('mfa'); return; }
      S.sec.wrongFlags += 1;
      S.sec.lastFlag = +d.id;
      render('security');
    },

    filesView: (d) => { S.files.view = d.id; S.files.open = null; render('files'); if (d.id === 'backups') discover('backups'); },
    fileOpen: (d) => {
      S.files.open = d.id;
      render('files');
      const f = L3.sharedFiles.find((x) => x.id === d.id);
      if (f && f.key) discover(f.key);
    },
    fileClose: () => { S.files.open = null; render('files'); },

    nav: (d) => { openApp('browser'); navigate(d.url); },
    back: () => { const p = S.browser.hist.pop(); if (p) navigate(p, false); },
    go: () => { const v = $('#addr'); if (v) navigate(v.value); },
    leakSearch: () => {
      const q = (($('#leak-q') || {}).value || '').trim().toLowerCase();
      S.browser.leakQuery = q;
      if (!q) return;
      const email = q.includes('@') ? q : `${q}@pixelforge.studio`;
      const hit = L3.leaks[email] || { found: [] };
      S.browser.leakShown = { email, found: hit.found };
      render('browser');
      if (hit.key) discover(hit.key);
    },

    pick: (d) => {
      if (S.done) return;
      const R = S.report;
      if (d.group === 'evidence') {
        if (R.evidence.includes(d.id)) R.evidence = R.evidence.filter((x) => x !== d.id);
        else if (R.evidence.length >= 2) { S.reportMsg = 'You already picked 2 pieces of evidence. Click one of them again to unpick it first.'; render('casefile'); return; }
        else R.evidence = [...R.evidence, d.id];
      } else {
        R[d.group] = d.id;
      }
      S.reportMsg = '';
      render('casefile');
    },
    file: () => { if (!S.done) fileReport(); },

    start: () => {
      S.player = (($('#player') || {}).value || '').trim().slice(0, 24) || 'Player';
      S.started = true;
      S.startedAt = Date.now();
      closeModal();
      renderAll();
      openApp('casefile');
    },
    level2: () => { location.href = 'level2.html'; },
    level4: () => { location.href = 'level4.html'; },
    continue: () => closeModal(),
    copy: () => {
      const txt = JSON.stringify(window.pixelforgeLastResult, null, 2);
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('Results copied', 'good'), () => toast('Could not copy'));
    },
    again: () => location.reload(),
  };

  /* every click inside the desktop counts */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const inApp = !!t.closest('#app');
    const lab = t.closest('label');
    const forwarded = lab && lab.control && t !== lab.control;
    const counted = S.started && !S.done && inApp && $('#overlay').hidden && !forwarded && !t.closest('[data-nocount]');
    if (counted) { S.clicks += 1; updateTop(); }
    const a = t.closest('[data-act]');
    if (a && a.getAttribute('aria-disabled') !== 'true') {
      e.preventDefault();
      const fn = ACTS[a.dataset.act];
      if (fn) fn(a.dataset);
    }
  });
  document.addEventListener('input', (e) => {
    const id = e.target.id;
    if (id === 'addr') S.browser.addrDraft = e.target.value;
    else if (id === 'dev-q') S.sec.query = e.target.value;
    else if (id === 'leak-q') S.browser.leakQuery = e.target.value;
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
    $('#icons').innerHTML = [['casefile', 'Case File', 'casefile'], ['mail', 'Mail', 'mail'], ['chat', 'Chat', 'chat'], ['security', 'Security', 'shield'], ['files', 'Files', 'files'], ['browser', 'Browser', 'browser']]
      .map(([id, l, ic]) => `<button class="dicon" data-act="open" data-id="${id}">${px(ic, 3)}<span>${l}</span></button>`).join('');
    tickClock();
    setInterval(tickClock, 15000);
    updateTop();
    modal(`<div class="intro">${px('spark', 6)}
      <div class="modal-kicker">Level 3 · Pixelforge Studios · ${L3.incident}</div>
      <h2>Ransomware on launch day</h2>
      <p>It's the morning Emberfall launches, and most of Pixelforge's servers are locked. The attackers want 10 bitcoin.
      You have full access to the company's mail, chat, security logs, files and a browser.</p>
      <p class="muted small">Nobody tells you where to look. Make discoveries, then file one report.
      Your score is how many of the ${MAX} discoveries you make, then how few clicks you need.</p>
      <label class="name">Your name<input id="player" maxlength="24" autocomplete="off" placeholder="Player"></label>
      <div class="modal-actions start-actions">
        <button class="btn ghost" data-act="level2" data-nocount>← Level 2</button>
        <button class="btn ghost" data-act="level4" data-nocount>Level 4 (hardest) →</button>
        <button class="btn primary" data-act="start" data-nocount>Start Level 3</button>
      </div></div>`);
    setTimeout(() => { const i = $('#player'); if (i) i.focus(); }, 50);
  }

  window.pixelforgeScore = () => ({ player: S.player, game: 3, tasks: 1, level: 1, done: S.done, clicks: [S.clicks],
    progress: S.found.length, progressMax: MAX, found: [...S.found] });
  window.pixelforgeTeacherState = () => ({
    done: S.done, found: [...S.found], openApps: [...document.querySelectorAll('.win')].map((w) => w.id.replace('win-', '')),
    url: S.browser.url, chat: S.chat.sel, files: S.files.view, device: S.sec.device,
    report: { who: S.report.who, how: S.report.how, evidence: [...S.report.evidence] },
  });
  boot();
})();
