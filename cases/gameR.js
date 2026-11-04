/* Random cases. Window management and click semantics reused from engine-base.js. */
(() => {
  'use strict';
  const replayURL = new URL(location.href);
  const rawSeed = replayURL.searchParams.get('seed');
  let seed = rawSeed !== null && /^[+-]?\d+$/.test(rawSeed) ? Number(rawSeed) : NaN;
  if (!Number.isSafeInteger(seed)) {
    seed = Math.floor(Math.random() * 999999) + 1;
    replayURL.searchParams.set('seed', String(seed));
    history.replaceState(null, '', replayURL.href);
  }
  const C = window.PFCase.generate(seed);
  const MAX = 5, MAX_WRONG_FLAGS = 2;
  /* ---------- helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = (sec) => { const s = Math.round(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const initials = (n) => n.split(' ').map((w) => w[0]).join('');
  function px(name, scale = 3, cls = '') {
    const g = ICONS[name];
    let rects = '';
    g.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== '.') rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PALETTE[c]}"/>`;
    }));
    return `<svg class="px ${cls}" viewBox="0 0 ${g[0].length} ${g.length}" width="${g[0].length * scale}" height="${g.length * scale}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }


  const S = {
    started: false, done: false, player: '', clicks: 0, startedAt: 0, seconds: 0,
    found: [], foundAt: {}, trapped: [],
    report: { who: null, how: null, evidence: [] }, reportMsg: '',
    verdict: { filed: false, who_ok: false, how_ok: false, evidence_ok: false, correct: false },
    mail: { sel: null, read: {} }, chat: { sel: null },
    sec: { tab: 'signins', query: '', user: null, wrongFlags: 0, lastFlag: null, err: '', person: null },
    files: { open: null, activity: null, wrongFlags: 0, lastFlag: null },
    browser: { url: norm(C.web.company.host), hist: [], addrDraft: null, whoisQuery: '', whoisShown: null,
      leakQuery: '', leakShown: null, confirmed: [], sawHosts: [] },
  };
  function discover(id) {
    if (S.done || S.found.includes(id)) return;
    S.found.push(id);
    S.foundAt[id] = { clicks: S.clicks, seconds: Math.round((Date.now() - S.startedAt) / 1000) };
    const m = C.milestones.find(x => x.id === id);
    if (S.started) toast(`Discovery ${S.found.length} of ${MAX}: ${esc(m.name)}`, 'good');
    updateTop(); render('casefile');
  }
  // Traps are recorded silently and revealed only after the report is filed.
  function trap(id) {
    if (S.started && !S.done && C.traps.count > 0 && !S.trapped.includes(id)) S.trapped.push(id);
  }
  /* ---------- windows ---------- */
  const APPS = {
    casefile: { title: 'Case File', icon: 'casefile', w: 400, h: 640, x: 'right', y: 12, render: renderCase },
    mail: { title: 'Mail · admin view', icon: 'mail', w: 780, h: 500, x: 120, y: 24, render: renderMail },
    chat: { title: 'Chat · admin view', icon: 'chat', w: 780, h: 500, x: 130, y: 34, render: renderChat },
    security: { title: 'Security Center', icon: 'shield', w: 860, h: 540, x: 140, y: 44, render: renderSecurity },
    files: { title: 'Files · shared folder', icon: 'files', w: 980, h: 540, x: 150, y: 54, render: renderFiles },
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
    $('#tb-task').textContent = S.started ? `${C.title} · Discoveries ${S.found.length} of ${MAX}${S.done ? ' · Report filed' : ''}` : C.title;
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
    o.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Case details">${html}</div>`;
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


  /* ---------- Case File ---------- */
  function renderCase() {
    const list = C.milestones.map((m, i) => `<li class="${S.found.includes(m.id) ? 'got' : ''}"><span class="mk">${S.found.includes(m.id) ? '✓' : i + 1}</span>${S.found.includes(m.id) ? esc(m.name) : '<span class="muted">???</span>'}</li>`).join('');
    const R = S.report;
    const options = group => C.report[group].map(([id, label]) => {
      const on = group === 'evidence' ? R.evidence.includes(id) : R[group] === id;
      return `<button type="button" class="ropt ${on ? 'on' : ''}" data-act="pick" data-group="${group}" data-id="${esc(id)}" aria-pressed="${on}">${esc(label)}</button>`;
    }).join('');
    return `<div class="cf"><div class="cf-head">${px('casefile', 2)}<div><div class="cf-kicker">${esc(C.title)}</div><div class="cf-name">${esc(C.name)}</div></div></div>
      <div class="cf-task">${C.goal}</div><h3>Discoveries · ${S.found.length} of ${MAX}</h3><ol class="disc">${list}</ol><h3>Your report</h3>
      ${S.done ? '<p class="cf-task">Report filed. The case is closed.</p>' : `<div class="report">
        <p class="rq">1. ${esc(C.report.whoQ)}</p><div class="ropts col">${options('who')}</div>
        <p class="rq">2. ${esc(C.report.howQ)}</p><div class="ropts col">${options('how')}</div>
        <p class="rq">3. ${esc(C.report.evQ)} <span class="muted">(${R.evidence.length} of 2 picked)</span></p><div class="ropts col">${options('evidence')}</div>
        ${S.reportMsg ? `<p class="warn small" role="status">${esc(S.reportMsg)}</p>` : ''}
        <button type="button" id="file-report" class="btn primary" data-act="file">File report (only once)</button></div>`}</div>`;
  }

  /* ---------- Mail and Chat ---------- */
  function renderMail() {
    const M = S.mail, m = C.emails.find(x => x.id === M.sel);
    const list = C.emails.map(x => `<button class="mail-item ${M.sel === x.id ? 'sel' : ''} ${M.read[x.id] ? '' : 'unread'}" data-act="mailSel" data-id="${esc(x.id)}"><span class="mi-top"><span class="mi-from">${esc(x.name)}</span><span class="mi-time">${esc(x.time)}</span></span><span class="mi-subj">${esc(x.subject)}</span></button>`).join('');
    const read = m ? `<h2 class="mr-subj">${esc(m.subject)}</h2><div class="mr-meta"><div class="mr-from"><span class="avatar sm">${esc(initials(m.name))}</span><span>From: <b>${esc(m.name)}</b> <span class="addr">&lt;${esc(m.addr)}&gt;</span></span></div><span class="mr-time">${esc(m.time)}</span></div><div class="mr-to">To: <span class="addr">${esc(m.to)}</span></div>${C.mailTz ? `<p class="muted small tz">${esc(C.mailTz)}</p>` : ''}<div class="mr-body">${m.body}</div>` : '<div class="mail-empty">Select an email to read it.</div>';
    return `<div class="mail"><aside class="mail-list"><div class="mail-folder">All mailboxes · admin <span>${C.emails.length}</span></div>${list}</aside><section class="mail-read">${read}</section></div>`;
  }
  function renderChat() {
    const c = C.chats.find(x => x.id === S.chat.sel);
    const list = C.chats.map(x => `<button class="mail-item ${S.chat.sel === x.id ? 'sel' : ''}" data-act="chatSel" data-id="${esc(x.id)}"><span class="mi-from">${esc(x.title)}</span><span class="mi-subj">${x.kind === 'channel' ? 'Channel' : 'Direct messages'}</span></button>`).join('');
    const read = c ? `<div class="chat-head">${esc(c.title)}</div><p class="muted small tz">${esc(C.chatTz)}</p>${c.msgs.map(([who, t, txt]) => `<div class="msg"><div class="msg-top"><b>${esc(who)}</b><span class="muted small">${esc(t)}</span></div><div>${esc(txt)}</div></div>`).join('')}` : '<div class="mail-empty">Pick a conversation. As the investigator you can read all of them.</div>';
    return `<div class="mail"><aside class="mail-list"><div class="mail-folder">Conversations <span>${C.chats.length}</span></div>${list}</aside><section class="mail-read">${read}</section></div>`;
  }

  const table = (heads, rows) => `<div class="log-wrap"><table class="log"><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  const cells = row => row.map(v => `<td>${esc(v)}</td>`).join('');
  function flagNote(id, wrong) {
    if (S.found.includes(id)) return '<p class="res-ok small">Suspicious entry flagged.</p>';
    if (wrong >= MAX_WRONG_FLAGS) return '<p class="warn small">Flagging is locked: you flagged too many wrong entries.</p>';
    return `<p class="muted small">Flag the suspicious ${id === 'download' ? 'build download' : 'sign-in'}. Wrong flags left: ${MAX_WRONG_FLAGS - wrong}.</p>`;
  }
  function flagButton(act, index, locked) {
    return `<button type="button" class="btn small flagbtn" data-act="${act}" data-id="${index}" aria-disabled="${locked}">Flag</button>`;
  }
  function renderSecurity() {
    const Q = S.sec;
    const tabs = [['signins', 'Sign-ins'], ['clicks', 'Link clicks'], ['badges', 'Door badges'], ['accounts', 'Accounts']].filter(([id]) => id !== 'clicks' || C.clicks).map(([id, title]) => `<button type="button" class="tab ${Q.tab === id ? 'sel' : ''}" data-act="secTab" data-id="${id}">${title}</button>`).join('');
    let body;
    if (Q.tab === 'signins') {
      const rows = Q.user ? C.signins.byUser[Q.user] : null;
      const locked = Q.wrongFlags >= MAX_WRONG_FLAGS || S.found.includes('signin');
      body = `<form class="sec-search" data-form="signin"><label class="br-addr"><input id="signin-q" value="${esc(Q.query)}" placeholder="Username, email or full name" aria-label="Sign-in account" autocomplete="off" spellcheck="false"></label><button type="submit" class="btn small">Search</button></form><p class="muted small tz">${esc(C.signins.tz)}</p>`;
      body += rows ? `<h3 class="sec-dev">${esc(Q.user)}</h3>${flagNote('signin', Q.wrongFlags)}${table(['When', 'Device', 'Place', 'Result', ''], rows.map((r, i) => `<tr>${cells([r.t, r.device, r.place, r.res])}<td>${flagButton('flagSignin', i, locked)}</td></tr>${Q.lastFlag === i ? '<tr class="why-row"><td colspan="5">↳ Not this entry.</td></tr>' : ''}`))}` : `<p class="muted">${esc(Q.err || 'Search for a staff account to inspect its sign-ins.')}</p>`;
    } else if (Q.tab === 'clicks') {
      body = `<h3 class="sec-dev">Link clicks from email</h3><p class="muted small">Mail link protection records every link opened from an email, and whether a form was sent on that page.</p><p class="muted small tz">${esc(C.clicks.tz)}</p>${table(['When', 'Account', 'Link', 'Result'], C.clicks.rows.map(r => `<tr>${cells([r.t, r.user, r.link, r.result])}</tr>`))}`;
    } else if (Q.tab === 'badges') {
      body = `<h3 class="sec-dev">Door badge log</h3><p class="muted small tz">${esc(C.badges.tz)}</p>${table(['When', 'Person', 'Door', 'Direction', 'Result'], C.badges.rows.map(r => `<tr>${cells([r.t, r.who, r.door, r.dir, r.res])}</tr>`))}`;
    } else {
      const p = C.staff.find(x => x.id === Q.person), a = p && C.accounts[p.id];
      const list = C.staff.map(x => `<button type="button" class="file acct ${Q.person === x.id ? 'sel' : ''}" data-act="acctSel" data-id="${esc(x.id)}"><span class="avatar sm">${esc(initials(x.name))}</span><span><b>${esc(x.name)}</b><small>${esc(x.role)}</small></span></button>`).join('');
      body = `<div class="acct-grid"><div class="files">${list}</div><div>${a ? `<h3 class="sec-dev">${esc(p.name)} · account</h3>${table(['System', 'Status'], a.rows.map(r => `<tr>${cells(r)}</tr>`))}` : '<p class="muted small">Pick a person to see their account details.</p>'}</div></div>`;
    }
    return `<div class="sec"><div class="tabs">${tabs}</div>${body}</div>`;
  }

  /* ---------- Files ---------- */
  function renderFiles() {
    const F = S.files, f = C.files.find(x => x.id === (F.open || F.activity));
    let right;
    if (f && F.activity) {
      const locked = F.wrongFlags >= MAX_WRONG_FLAGS || S.found.includes('download');
      right = `<button type="button" class="linkish small" data-act="fileClose">← All shared files</button><h3 class="sec-dev">Activity · ${esc(f.name)}</h3><p class="muted small tz">${esc(f.activityTz)}</p>${f.flaggable ? flagNote('download', F.wrongFlags) : ''}${table(['When', 'Account', 'Device', 'What', ...(f.activity.some(r => r.copy) ? ['Copy ID'] : []), ...(f.flaggable ? [''] : [])], f.activity.map((r, i) => `<tr>${cells([r.t, r.acct, r.device, r.what, ...(f.activity.some(x => x.copy) ? [r.copy || ''] : [])])}${f.flaggable ? `<td>${flagButton('flagDownload', i, locked)}</td>` : ''}</tr>${f.flaggable && F.lastFlag === i ? '<tr class="why-row"><td colspan="6">↳ Not this entry.</td></tr>' : ''}`))}`;
    } else if (f) {
      right = `<div class="file-bar"><button type="button" class="linkish small" data-act="fileClose">← All shared files</button><button type="button" class="btn small" data-act="fileActivity" data-id="${esc(f.id)}">ⓘ Activity</button></div><h3 class="sec-dev">${esc(f.name)}</h3><pre class="source">${esc(f.text)}</pre>`;
    } else {
      right = `<div class="files">${C.files.map(x => `<div class="file-row"><button class="file" data-act="fileOpen" data-id="${esc(x.id)}"><span class="file-ico">▤</span><b>${esc(x.name)}</b></button><button type="button" class="btn small" data-act="fileActivity" data-id="${esc(x.id)}" aria-label="Activity of ${esc(x.name)}">ⓘ Activity</button></div>`).join('')}</div>`;
    }
    return `<div class="mail"><aside class="mail-list"><div class="mail-folder">File server</div><button class="mail-item sel" data-act="fileClose"><span class="mi-from">Shared</span></button></aside><section class="mail-read">${right}</section></div>`;
  }

  /* ---------- Simulated browser; evidence links never leave the game ---------- */
  function norm(u) {
    return String(u).trim().replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '').replace(/\/+(\?|$)/, '$1').replace(/\/+$/, '').replace(/^[^/?#]+/, h => h.toLowerCase());
  }
  function route(u) {
    const [hp, query = ''] = u.split('?'), i = hp.indexOf('/');
    return { host: (i < 0 ? hp : hp.slice(0, i)).split('#')[0], path: (i < 0 ? '' : hp.slice(i)).split('#')[0], q: new URLSearchParams(query) };
  }
  function navigate(u, push = true) {
    const url = norm(u);
    if (!url) return;
    if (push && url !== S.browser.url) S.browser.hist.push(S.browser.url);
    Object.assign(S.browser, { url, addrDraft: null, whoisShown: null, leakShown: null });
    const host = route(url).host;
    if (!S.browser.sawHosts.includes(host)) S.browser.sawHosts.push(host);
    render('browser');
  }
  function navButton(url, label, cls = 'linkish') {
    return `<button type="button" class="${cls}" data-act="nav" data-url="${esc(url)}">${esc(label)}</button>`;
  }
  function renderBrowser() {
    const B = S.browser;
    const host = route(B.url).host;
    if (S.started && !S.done && !B.sawHosts.includes(host)) B.sawHosts.push(host);
    return `<div class="br"><form class="br-tools" data-form="address"><button type="button" class="br-btn" data-act="back" title="Back" aria-label="Back" aria-disabled="${!B.hist.length}">←</button><label class="br-addr"><span class="lock">●</span><input id="addr" value="${esc(B.addrDraft !== null ? B.addrDraft : `https://${B.url}`)}" spellcheck="false" autocomplete="off" aria-label="Address"></label><button type="submit" class="br-btn go">Go</button></form><div class="br-marks">${C.bookmarks.map(([u, l]) => navButton(u, l, 'mark')).join('')}</div><div class="br-page">${page(route(B.url))}</div></div>`;
  }
  function page(r) {
    const W = C.web, B = S.browser;
    if (r.host === norm(W.company.host)) {
      const nav = `<div class="pf-nav">${navButton(W.company.host, '✦ Pixelforge Studios')}${navButton(`${W.company.host}/team`, 'Team')}</div>`;
      if (r.path === '/team') return `<div class="pg pf">${nav}<h1 class="pf-h">Meet the team</h1><div class="team">${C.staff.map(t => `<div class="tcard"><span class="avatar lg">${esc(initials(t.name))}</span><b>${esc(t.name)}</b><small>${esc(t.role)}</small><small>${esc(t.email)}</small><small>Account: ${esc(t.user)}</small><small>Device: ${esc(t.pc)} · ${esc(t.room)}</small>${navButton(`chirper.social/@${t.handle.replace(/^@/, '')}`, `@${t.handle.replace(/^@/, '')} on Chirper`)}</div>`).join('')}</div></div>`;
      if (!r.path) return `<div class="pg pf">${nav}<div class="pf-hero"><div class="pf-tag">Pixelforge Studios</div><h1>${esc(C.game)}</h1>${W.company.news}${navButton(`${W.company.host}/team`, 'Meet the team →', 'btn primary')}</div></div>`;
    }
    if (r.host === 'chirper.social') {
      const h = r.path.replace(/^\/@?/, ''), entries = Object.entries(W.chirper);
      const p = entries.find(([key]) => key.replace(/^@/, '').toLowerCase() === h.toLowerCase());
      if (h && !p) return '<div class="pg ch"><div class="ch-brand">chirper</div><p>This account does not exist.</p></div>';
      if (p) return `<div class="pg ch"><div class="ch-brand">${navButton('chirper.social', 'chirper')}</div><div class="ch-prof"><span class="avatar lg">${esc(initials(p[1].name))}</span><div><b>${esc(p[1].name)}</b><div class="muted">@${esc(h)}</div><p>${esc(p[1].bio)}</p></div></div>${p[1].posts.map(post => `<div class="ch-post"><div class="muted small">${esc(post.date)}</div><p>${esc(post.text)}</p></div>`).join('')}</div>`;
      return `<div class="pg ch"><div class="ch-brand">chirper</div><h2>People</h2><div class="ch-people">${entries.map(([h2, person]) => `<button class="ch-person" data-act="nav" data-url="chirper.social/@${esc(h2.replace(/^@/, ''))}"><span class="avatar sm">${esc(initials(person.name))}</span><span><b>${esc(person.name)}</b><small>@${esc(h2.replace(/^@/, ''))}</small></span></button>`).join('')}</div></div>`;
    }
    if (r.host === 'domaininfo.net') {
      const res = B.whoisShown;
      return `<div class="pg pg-plain"><h1>Domain lookup</h1><p class="muted">Who owns a website? Enter a domain or website address.</p><form class="sec-search" data-form="whois"><label class="br-addr"><input id="whois-q" value="${esc(B.whoisQuery)}" placeholder="example.com" aria-label="Domain name" autocomplete="off" spellcheck="false"></label><button type="submit" class="btn small">Look up</button></form>${res ? `<div class="lookup-results"><p>Domain: <b>${esc(res.domain)}</b></p>${res.rows ? table(['Field', 'Value'], res.rows.map(row => `<tr>${cells(row)}</tr>`)) : '<p class="muted">No record found.</p>'}</div>` : ''}</div>`;
    }
    if (r.host === 'leakcheck.net') {
      const res = B.leakShown;
      return `<div class="pg pg-plain"><h1>LeakCheck</h1><p class="muted">Search an email address for known data breaches.</p><form class="sec-search" data-form="leak"><label class="br-addr"><input id="leak-q" type="text" value="${esc(B.leakQuery)}" placeholder="name@example.com" aria-label="Email address" autocomplete="off" spellcheck="false"></label><button type="submit" class="btn small">Search</button></form>${res ? `<div class="lookup-results"><p>Results for <b>${esc(res.email)}</b></p>${res.rows.length ? table(['Site', 'Date', 'Exposed data'], res.rows.map(row => `<tr>${cells([row.site, row.date, row.data])}</tr>`)) : '<p>No breaches found.</p>'}</div>` : ''}</div>`;
    }
    if (r.host === norm(W.forum.host)) {
      const f = W.forum, heading = `<h1>${navButton(f.host, f.name)}</h1>`;
      if (!r.path) return `<div class="pg pg-plain">${heading}${f.threads.map(t => `<article class="forum-thread"><h2>${navButton(`${f.host}/t/${t.id}`, t.title)}</h2><div class="muted small">${esc(t.by)} · ${esc(t.time)} · ${esc(t.tz)}</div></article>`).join('')}</div>`;
      const t = f.threads.find(x => r.path === `/t/${x.id}`);
      if (t) return `<div class="pg pg-plain">${heading}<article class="forum-thread"><h2>${esc(t.title)}</h2><div class="muted small">${esc(t.by)} · ${esc(t.time)}</div><p class="muted small">${esc(t.tz)}</p><div class="forum-body">${t.body}</div></article></div>`;
    }
    const p = W.pages[r.host];
    if (p) return `<div class="pg pg-plain"><h1>${esc(p.title)}</h1>${p.html}${p.confirm ? `<button type="button" class="btn primary" data-act="trapConfirm" aria-disabled="${B.confirmed.includes(r.host)}">${B.confirmed.includes(r.host) ? 'Confirmed' : 'Confirm'}</button>` : ''}</div>`;
    return `<div class="pg pg-error"><h1>Can't reach this page</h1><p>Check the address: <code>${esc(B.url)}</code></p></div>`;
  }

  /* ---------- Report and final score ---------- */
  function fileReport() {
    const R = S.report;
    if (!R.who || !R.how || R.evidence.length !== 2) {
      S.reportMsg = 'Pick one person, one way and exactly 2 pieces of evidence first.';
      render('casefile'); return;
    }
    if (C.traps.reportName !== null && R.who === C.traps.reportName && C.traps.sawHosts.some(h => S.browser.sawHosts.includes(route(norm(h)).host))) trap('report');
    const who_ok = R.who === C.secret.who, how_ok = R.how === C.secret.how;
    const evidence_ok = C.secret.evidence.includes([...R.evidence].sort().join('+'));
    if (who_ok) discover('who');
    if (how_ok) discover('how');
    if (evidence_ok) discover('evidence');
    S.verdict = { filed: true, who_ok, how_ok, evidence_ok, correct: who_ok && how_ok && evidence_ok };
    S.done = true; S.seconds = Math.round((Date.now() - S.startedAt) / 1000);
    window.pixelforgeLastResult = { ...window.pixelforgeScore(), seconds: S.seconds };
    renderAll();
    const label = group => C.report[group].filter(([id]) => group === 'evidence' ? R.evidence.includes(id) : R[group] === id).map(([, l]) => l).join(' + ');
    const checks = [['who', C.report.whoQ, who_ok], ['how', C.report.howQ, how_ok], ['evidence', C.report.evQ, evidence_ok]];
    modal(`<div class="modal-kicker">Report filed · ${esc(C.title)}</div><h2>${S.found.length} of ${MAX} discoveries</h2><div class="end-story">${C.secret.story}</div>
      <h3>Your report</h3><table class="score report-results"><tbody>${checks.map(([group, q, ok]) => `<tr><td><b>${esc(q)}</b><br><span class="muted small">${esc(label(group))}</span></td><td class="${ok ? 'res-ok' : 'res-fail'}">${ok ? '✓ Right' : '✗ Wrong'}</td></tr>`).join('')}</tbody></table>
      <h3>Discoveries</h3><table class="score discovery-results"><tbody>${C.milestones.map(m => `<tr><td class="${S.found.includes(m.id) ? 'res-ok' : 'res-fail'}">${S.found.includes(m.id) ? '✓' : '✗'}</td><td>${esc(m.name)}</td></tr>`).join('')}</tbody></table>
      ${C.traps.count > 0 ? `<p class="${S.trapped.length ? 'warn' : 'res-ok'} small">Traps fallen for: ${S.trapped.length} of ${C.traps.count}${S.trapped.length ? ` (${S.trapped.map(id => id === 'url' ? 'confirmation page' : 'misleading report instruction').join(', ')})` : ''}</p>` : ''}
      <div class="modal-score">${S.clicks} clicks · ${fmtTime(S.seconds)}</div><div class="modal-actions"><button class="btn" data-act="new" data-nocount>New random case</button><button class="btn primary" data-act="again" data-nocount>Play again</button></div>`);
  }

  /* ---------- Actions ---------- */
  function searchSignins() {
    const Q = S.sec, q = ($('#signin-q').value || '').trim(), key = q.toLowerCase();
    Q.query = q; Q.lastFlag = null;
    const person = C.staff.find(p => [p.user, p.email, p.name].some(v => v.toLowerCase() === key));
    Q.user = Object.keys(C.signins.byUser).find(u => u.toLowerCase() === (person ? person.user.toLowerCase() : key)) || null;
    Q.err = Q.user ? '' : q ? `No sign-ins found for "${q}".` : 'Type a username, email or full name first.';
    render('security');
  }
  const ACTS = {
    open: d => openApp(d.id),
    close: d => { const w = $(`#win-${d.id}`); if (w) w.remove(); },
    max: d => {
      const w = $(`#win-${d.id}`); if (!w) return;
      const btn = $('.win-max', w);
      if (w.dataset.restore) {
        w.style.cssText = w.dataset.restore; delete w.dataset.restore;
        btn.setAttribute('aria-label', 'Maximize'); btn.title = 'Maximize'; btn.textContent = '□';
        clampWin(w);
      } else {
        const desk = $('#desktop').getBoundingClientRect(); w.dataset.restore = w.style.cssText;
        Object.assign(w.style, { left: '110px', top: '10px', width: `${desk.width - 120}px`, height: `${desk.height - 20}px` });
        btn.setAttribute('aria-label', 'Restore size'); btn.title = 'Restore size'; btn.textContent = '❐';
      }
      focusWin(w);
    },
    mailSel: d => { S.mail.sel = d.id; S.mail.read[d.id] = true; render('mail'); },
    chatSel: d => { S.chat.sel = d.id; render('chat'); },
    secTab: d => { S.sec.tab = d.id; render('security'); },
    acctSel: d => { S.sec.person = d.id; render('security'); },
    flagSignin: d => {
      const Q = S.sec, i = Number(d.id);
      if (Q.wrongFlags >= MAX_WRONG_FLAGS || S.found.includes('signin') || !Q.user || !C.signins.byUser[Q.user][i]) return;
      if (Q.user === C.secret.signin.user && i === C.secret.signin.index) { Q.lastFlag = null; discover('signin'); }
      else { Q.wrongFlags++; Q.lastFlag = i; }
      render('security');
    },
    flagDownload: d => {
      const F = S.files, f = C.files.find(x => x.id === F.activity), i = Number(d.id);
      if (!f || !f.flaggable || !f.activity[i] || F.wrongFlags >= MAX_WRONG_FLAGS || S.found.includes('download')) return;
      if (i === C.secret.downloadRow) { F.lastFlag = null; discover('download'); }
      else { F.wrongFlags++; F.lastFlag = i; }
      render('files');
    },
    fileOpen: d => { S.files.open = d.id; S.files.activity = null; render('files'); },
    fileActivity: d => { S.files.activity = d.id; S.files.open = null; render('files'); },
    fileClose: () => { S.files.open = null; S.files.activity = null; render('files'); },
    nav: d => { openApp('browser'); navigate(d.url); },
    back: () => { const previous = S.browser.hist.pop(); if (previous) navigate(previous, false); },
    trapConfirm: () => {
      const host = route(S.browser.url).host;
      if (!C.web.pages[host]?.confirm || S.browser.confirmed.includes(host)) return;
      S.browser.confirmed.push(host);
      if (C.traps.confirmHost && host === route(norm(C.traps.confirmHost)).host) trap('url');
      render('browser');
    },
    pick: d => {
      if (S.done || !['who', 'how', 'evidence'].includes(d.group) || !C.report[d.group].some(([id]) => id === d.id)) return;
      const R = S.report;
      if (d.group === 'evidence') {
        if (R.evidence.includes(d.id)) R.evidence = R.evidence.filter(id => id !== d.id);
        else if (R.evidence.length === 2) { S.reportMsg = 'You already picked 2 pieces of evidence. Unpick one first.'; render('casefile'); return; }
        else R.evidence.push(d.id);
      } else R[d.group] = d.id;
      S.reportMsg = ''; render('casefile');
    },
    file: () => { if (!S.done && S.started) fileReport(); },
    start: () => {
      if (S.started) return;
      S.player = ($('#player').value || '').trim().slice(0, 24) || 'Player';
      S.started = true; S.startedAt = Date.now(); closeModal(); renderAll(); openApp('casefile');
    },
    continue: () => closeModal(),
    again: () => location.reload(),
    new: () => {
      const u = new URL(location.href);
      let next; do { next = Math.floor(Math.random() * 999999) + 1; } while (next === seed);
      u.searchParams.set('seed', String(next)); location.href = u.href;
    },
  };
  document.addEventListener('click', e => {
    const t = e.target, lab = t.closest('label');
    const forwarded = lab && lab.control && t !== lab.control;
    if (S.started && !S.done && t.closest('#app') && $('#overlay').hidden && !forwarded && !t.closest('[data-nocount]')) { S.clicks++; updateTop(); }
    const a = t.closest('[data-act]');
    if (a) {
      e.preventDefault();
      if (a.getAttribute('aria-disabled') !== 'true' && ACTS[a.dataset.act]) ACTS[a.dataset.act](a.dataset);
      return;
    }
    const link = t.closest('a[href]');
    if (link && t.closest('#app')) {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || /^(javascript|data|file|mailto):/i.test(href)) return;
      const current = `https://${S.browser.url}`;
      const url = new URL(href.startsWith('//') || /^[a-z]+:\/\//i.test(href) || href.startsWith('/') || href.startsWith('.') ? href : `https://${href}`, current);
      if (/^https?:$/.test(url.protocol)) ACTS.nav({ url: url.href });
    }
  });
  document.addEventListener('submit', e => {
    const form = e.target.closest('[data-form]'); if (!form) return;
    e.preventDefault();
    if (S.done || !S.started) return;
    const B = S.browser;
    if (form.dataset.form === 'signin') searchSignins();
    if (form.dataset.form === 'address') navigate($('#addr').value);
    if (form.dataset.form === 'whois') {
      B.whoisQuery = $('#whois-q').value.trim();
      const host = route(norm(B.whoisQuery)).host;
      if (!host) return;
      const parts = host.split('.').filter(Boolean);
      const domain = WDomain(host, parts);
      B.whoisShown = { domain, rows: C.web.whois[domain] || null }; render('browser');
    }
    if (form.dataset.form === 'leak') {
      B.leakQuery = $('#leak-q').value.trim();
      if (!B.leakQuery) return;
      const email = B.leakQuery.toLowerCase(), hit = Object.keys(C.web.leakcheck).find(k => k.toLowerCase() === email);
      B.leakShown = { email, rows: hit ? C.web.leakcheck[hit] : [] }; render('browser');
    }
  });
  function WDomain(host, parts) {
    // Keep a known complete domain; otherwise strip subdomains as in the base engine.
    for (let i = 0; i < parts.length - 1; i++) {
      const candidate = parts.slice(i).join('.');
      if (C.web.whois[candidate]) return candidate;
    }
    return parts.length > 2 ? parts.slice(-2).join('.') : host;
  }
  document.addEventListener('input', e => {
    const v = e.target.value;
    if (e.target.id === 'addr') S.browser.addrDraft = v;
    else if (e.target.id === 'signin-q') S.sec.query = v;
    else if (e.target.id === 'whois-q') S.browser.whoisQuery = v;
    else if (e.target.id === 'leak-q') S.browser.leakQuery = v;
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !$('#overlay').hidden) {
      const b = $('#overlay [data-act="start"]');
      if (b) { e.preventDefault(); b.click(); }
    }
  });

  window.pixelforgeScore = () => ({
    player: S.player, game: 'case', seed, tasks: 1, level: 1, done: S.done, clicks: [S.clicks],
    progress: S.found.length, progressMax: MAX, found: [...S.found], trapped: [...S.trapped],
    trapsMax: C.traps.count, report: { ...S.verdict }, layout: C.secret.layout, twists: [...C.twists],
  });
  function boot() {
    document.title = `Pixelforge · ${C.title}`;
    $('.logo').innerHTML = px('spark', 2);
    $('#icons').innerHTML = [['casefile', 'Case File', 'casefile'], ['mail', 'Mail', 'mail'], ['chat', 'Chat', 'chat'], ['security', 'Security', 'shield'], ['files', 'Files', 'files'], ['browser', 'Browser', 'browser']].map(([id, label, icon]) => `<button class="dicon" data-act="open" data-id="${id}">${px(icon, 3)}<span>${label}</span></button>`).join('');
    tickClock(); setInterval(tickClock, 15000); updateTop();
    modal(`<div class="intro">${px('spark', 6)}<div class="modal-kicker">${esc(C.title)} · Seed ${seed}</div><h2>${esc(C.name)}</h2><div>${C.intro}</div><p class="muted small">${esc(C.date)} · Investigate, flag the leaked download and the break-in sign-in, then file one report. Every click on the desktop counts.</p><label class="name">Your name<input id="player" maxlength="24" autocomplete="off" placeholder="Player"></label><div class="modal-actions start-actions"><button class="btn ghost" data-act="new" data-nocount>New random case</button><button class="btn primary" data-act="start" data-nocount>Start</button></div></div>`);
    $('#player').focus();
  }
  boot();
})();
