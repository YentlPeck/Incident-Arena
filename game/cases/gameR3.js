/* Family 3 engine, "The missing prototype". Same desktop look and click semantics as gameG.js.
   Flags are part of the report: setting one gives no feedback, and nothing on screen or in
   window.pixelforgeScore() says whether a flag, a pin or an answer is right until the report is filed.
   The report is filed once and is final. The hidden answer (C.secret) is read only inside fileReport(). */
(() => {
  'use strict';
  const url = new URL(location.href);
  const raw = url.searchParams.get('seed');
  let seed = raw !== null && /^[+-]?\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(seed)) { seed = Math.floor(Math.random() * 999999) + 1; url.searchParams.set('seed', String(seed)); history.replaceState(null, '', url.href); }
  const G = window.PFCase3;
  const C = G.generate(seed);
  const V = G.views(C);
  const $= (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = (sec) => { const s = Math.round(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  // extra pixel icons for this family (added at runtime; icons.js and data.js stay untouched)
  ICONS.door = ['..kkkkkkkk..', '..knnnnnnk..', '..knNNNNnk..', '..knNnnNnk..', '..knNnnNnk..', '..knnnnnnk..', '..knnnnyyk..', '..knnnnnnk..', '..knNNNNnk..', '..knNnnNnk..', '..knnnnnnk..', 'kkkkkkkkkkkk'];
  ICONS.cal = ['..k......k..', 'kkkkkkkkkkkk', 'krrrrrrrrrrk', 'krrrrrrrrrrk', 'kkkkkkkkkkkk', 'kwwswwswwswk', 'kwwswwswwswk', 'kssssssssssk', 'kwwswwswwswk', 'kwwswwsyyswk', 'kwwswwsyyswk', 'kkkkkkkkkkkk'];
  ICONS.box = ['............', '...kkkkkk...', '..kooooook..', '.kooooooook.', 'kkkkkkkkkkkk', 'kOOOOkkOOOOk', 'kOOOOyyOOOOk', 'kOOOOkkOOOOk', 'kOOOOOOOOOOk', 'kOOOOOOOOOOk', 'kOOOOOOOOOOk', 'kkkkkkkkkkkk'];
  ICONS.truck = ['............', 'kkkkkkkk....', 'kbbbbbbkkkk.', 'kbbbbbbkwwkk', 'kbbbbbbkwwwk', 'kbbbbbbkbbbk', 'kbbbbbbkbbbk', 'kkkkkkkkkkkk', '..kk....kk..', '.kssk..kssk.', '..kk....kk..', '............'];
  ICONS.people = ['............', '....kkkk....', '...kooook...', '...kooook...', '...kooook...', '....kkkk....', '..kkggggkk..', '.kggggggggk.', '.kggggggggk.', '.kggggggggk.', '.kkkkkkkkkk.', '............'];
  function px(name, scale = 3, cls = '') {
    const g = ICONS[name]; let rects = '';
    g.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PALETTE[c]}"/>`; }));
    return `<svg class="px ${cls}" viewBox="0 0 ${g[0].length} ${g.length}" width="${g[0].length * scale}" height="${g.length * scale}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }

  // every record by id, with the log it lives in
  const REC = {};
  for (const [log, tb] of Object.entries(V)) if (tb && tb.rows) tb.rows.forEach((r) => { REC[r.id] = { log, cells: r.cells }; });
  const flagKind = (id) => { const r = REC[id]; if (r.log === 'door') return r.cells[1] === G.HW ? 'room' : r.cells[1] === 'Main exit' ? 'building' : null; return r.log === 'courier' || r.log === 'visitors' ? 'building' : null; };
  const FLAG_LABEL = { room: 'the moment it left the Hardware room', building: 'how it left the building' };
  const DISC = [
    ['left-room', 'Flag: the moment the prototype left the Hardware room'],
    ['left-building', 'Flag: the record of how it left the building'],
    ['who', 'Who carried it out of the building'],
    ['how', 'How it left the building'],
    ['evidence', 'Two records that prove it'],
  ];

  const S = {
    started: false, done: false, player: '', clicks: 0, startedAt: 0, seconds: 0,
    found: new Set(), flags: { room: null, building: null }, pins: [],
    report: { who: null, how: null, ev: [] }, result: null,
    doorF: 'All', doorP: 'All', calP: 'All', hwTab: 'tickets', mailSel: null,
  };

  /* ---------- windows (as gameG) ---------- */
  const APPS = {
    casefile: { title: 'Case file', icon: 'casefile', w: 760, h: 700, x: 110, y: 10, render: renderCase },
    door: { title: 'Door badges · Friday', icon: 'door', w: 760, h: 640, x: 'right', y: 14, render: renderDoor },
    calendar: { title: 'Calendar · Friday', icon: 'cal', w: 1060, h: 640, x: 'right', y: 22, render: renderCalendar },
    chat: { title: 'Chat · #studio', icon: 'chat', w: 720, h: 620, x: 'right', y: 30, render: renderChat },
    mail: { title: 'Mail · reception inbox', icon: 'mail', w: 1000, h: 620, x: 'right', y: 18, render: renderMail },
    courier: { title: 'Courier log · Friday', icon: 'truck', w: 900, h: 420, x: 'right', y: 40, render: renderCourier },
    visitors: { title: 'Reception visitor log · Friday', icon: 'people', w: 860, h: 360, x: 'right', y: 50, render: renderVisitors },
    hardware: { title: 'Hardware inventory', icon: 'box', w: 760, h: 520, x: 'right', y: 34, render: renderHardware },
    directory: { title: 'Staff directory', icon: 'files', w: 520, h: 520, x: 'right', y: 60, render: renderDirectory },
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
  function render(id) { const win = $(`#win-${id}`); if (!win) return; const body = $('.win-body', win); const top = body.firstElementChild ? [...body.querySelectorAll('[data-keep-scroll]')].map((e) => e.scrollTop) : []; body.innerHTML = APPS[id].render(); [...body.querySelectorAll('[data-keep-scroll]')].forEach((e, i) => { if (top[i]) e.scrollTop = top[i]; }); }
  function renderAll() { Object.keys(APPS).forEach(render); updateTop(); }
  let drag = null;
  document.addEventListener('pointerdown', (e) => { const win = e.target.closest('.win'); if (win) focusWin(win); const bar = e.target.closest('[data-drag]'); if (bar && !e.target.closest('button')) { const r = win.getBoundingClientRect(); drag = { win, dx: e.clientX - r.left, dy: e.clientY - r.top }; bar.setPointerCapture(e.pointerId); } });
  document.addEventListener('pointermove', (e) => { if (!drag) return; const d = $('#desktop').getBoundingClientRect(); drag.win.style.left = `${Math.max(-drag.win.offsetWidth + 80, Math.min(e.clientX - d.left - drag.dx, d.width - 80))}px`; drag.win.style.top = `${Math.max(0, Math.min(e.clientY - d.top - drag.dy, d.height - 40))}px`; });
  document.addEventListener('pointerup', () => { drag = null; });
  function updateTop() { $('#tb-clicks').textContent = `Clicks: ${S.clicks}`; $('#tb-task').textContent = S.started ? `${C.title} · Found ${S.found.size} of 5${S.done ? ' · Report filed' : ''}` : C.title; }
  function tickClock() { $('#tb-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function modal(html) { const o = $('#overlay'); o.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`; o.hidden = false; $('#app').inert = true; }
  function closeModal() { $('#overlay').hidden = true; $('#overlay').innerHTML = ''; $('#app').inert = false; }
  function toast(msg, kind = '') { const t = document.createElement('div'); t.className = `toast ${kind}`; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3700); }

  /* ---------- record tables with Pin / Flag ---------- */
  function rowTools(id) {
    const pinned = S.pins.includes(id);
    let flag = '';
    const fk = flagKind(id);
    if (fk) {
      const on = S.flags[fk] === id;
      flag = `<button class="btn small c3-flag ${on ? 'on' : ''}" data-act="flag" data-id="${id}" ${S.done ? 'aria-disabled="true"' : ''} title="Flag: ${FLAG_LABEL[fk]}">${on ? '⚑ Flagged' : 'Flag'}</button>`;
    }
    return `<td class="c3-tools">${flag}<button class="btn small c3-pin ${pinned ? 'on' : ''}" data-act="pin" data-id="${id}" ${S.done ? 'aria-disabled="true"' : ''}>${pinned ? 'Pinned' : 'Pin'}</button></td>`;
  }
  function table(tb, rows, opts = {}) {
    const head = tb.cols.map((h) => `<th>${esc(h)}</th>`).join('') + '<th></th>';
    const body = rows.map((r) => `<tr class="${S.pins.includes(r.id) ? 'c3-pinned' : ''}">${r.cells.map((c, i) => `<td class="${opts.wrap && opts.wrap.includes(i) ? 'c3-wrap' : ''}">${esc(c)}</td>`).join('')}${rowTools(r.id)}</tr>`).join('');
    return `<div class="log-wrap" data-keep-scroll><table class="log c3-log"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${tb.cols.length + 1}" class="muted">Nothing here.</td></tr>`}</tbody></table></div>`;
  }
  const tabs = (act, list, cur) => `<div class="tabs">${list.map(([id, label]) => `<button class="tab ${cur === id ? 'sel' : ''}" data-act="${act}" data-id="${esc(id)}">${esc(label)}</button>`).join('')}</div>`;
  const people = () => C.staff.map((s) => s.name);
  const flagNote = () => '<p class="muted small c3-note">Flags go into your report. You can move them until you file; nothing is checked before that.</p>';

  function renderDoor() {
    const doors = ['All', G.HW, 'Main entrance', 'Main exit', 'Other doors'];
    const rows = V.door.rows.filter((r) => (S.doorF === 'All' || (S.doorF === 'Other doors' ? !['Hardware room', 'Main entrance', 'Main exit'].includes(r.cells[1]) : r.cells[1] === S.doorF)) && (S.doorP === 'All' || r.cells[2] === S.doorP));
    return `<div class="pad c3-app"><p class="muted small">Every badge swipe on ${esc(C.dates.fri)}. The Hardware room logs how long its door stayed open.</p>${tabs('doorF', doors.map((d) => [d, d]), S.doorF)}
      ${tabs('doorP', [['All', 'Everyone'], ...people().map((n) => [n, n.split(' ')[0]])], S.doorP)}${flagNote('door')}${table(V.door, rows)}</div>`;
  }
  function renderCalendar() {
    const rows = V.calendar.rows.filter((r) => S.calP === 'All' || r.cells[3].split(', ').includes(S.calP));
    return `<div class="pad c3-app"><p class="muted small">All bookings and meetings on ${esc(C.dates.fri)}. Every Hardware-room entry needs a booking here of the person who badges in (a test, or packing a repair unit). One Hardware-room booking per person per day; nobody is double-booked. Cancelled bookings stay listed (people cancel in chat).</p>${tabs('calP', [['All', 'Everyone'], ...people().map((n) => [n, n.split(' ')[0]])], S.calP)}${calTable(rows)}</div>`;
  }
  function calTable(rows) {
    const body = rows.map((r) => `<tr class="${S.pins.includes(r.id) ? 'c3-pinned' : ''}"><td>${esc(r.cells[0])}</td><td class="c3-wrap"><b>${esc(r.cells[1])}</b>${r.cells[4] ? `<div class="c3-route">Route: ${esc(r.cells[4])}</div>` : ''}</td><td>${esc(r.cells[2])}</td><td class="c3-wrap c3-people">${esc(r.cells[3])}</td>${rowTools(r.id)}</tr>`).join('');
    return `<div class="log-wrap" data-keep-scroll><table class="log c3-log c3-cal"><thead><tr><th>Time</th><th>Event</th><th>Room</th><th>People</th><th></th></tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function renderChat() { return `<div class="pad c3-app"><p class="muted small">#studio channel, ${esc(C.dates.fri)}.</p>${table(V.chat, V.chat.rows, { wrap: [2] })}</div>`; }
  function renderCourier() { return `<div class="pad c3-app"><p class="muted small">Pickups and deliveries at reception, ${esc(C.dates.fri)}.</p>${flagNote('courier')}${table(V.courier, V.courier.rows)}</div>`; }
  function renderVisitors() { return `<div class="pad c3-app"><p class="muted small">Visitors sign in and out at reception. Visitor badges do not open any inside door.</p>${flagNote('visitors')}${table(V.visitors, V.visitors.rows)}</div>`; }
  function renderDirectory() { return `<div class="pad c3-app"><p class="muted small">Pixelforge staff. Every staff badge opens the Hardware room.</p>${table(V.directory, V.directory.rows)}</div>`; }
  function renderHardware() {
    const t = S.hwTab, P = V.partner;
    const body = t === 'items' ? table(V.assets, V.assets.rows) : t === 'checks' ? table(V.checks, V.checks.rows) : `<p class="muted small">Repair partner: <b>${esc(P.name)}</b> (${esc(P.contact)}, ${esc(P.email)}). Tickets are opened by Pixelforge; a ticket with a Closed date is finished and the unit came back.</p>${table(V.tickets, V.tickets.rows)}`;
    return `<div class="pad c3-app">${tabs('hwTab', [['tickets', 'Repair tickets'], ['items', 'Hardware items'], ['checks', 'Shelf checks']], t)}${body}</div>`;
  }
  function renderMail() {
    const list = V.mail.rows.map((r) => `<button class="mail-item ${S.mailSel === r.id ? 'sel' : ''}" data-act="mailSel" data-id="${r.id}"><span class="mi-top"><b class="mi-from">${esc(r.cells[1])}</b><span class="mi-time">${esc(r.cells[0])}</span></span><span class="mi-subj">${esc(r.cells[4])}</span></button>`).join('');
    const r = V.mail.rows.find((x) => x.id === S.mailSel);
    const right = r ? `<div class="c3-mail"><h2 class="mr-subj">${esc(r.cells[4])}</h2><p class="g-from"><b>${esc(r.cells[1])}</b> <span class="g-addr">${esc(r.cells[2])}</span></p><p class="muted small">To: ${esc(r.cells[3])} · ${esc(r.cells[0])}</p><div class="g-body">${esc(r.cells[5])}</div>
      <table class="c3-inline"><tr>${rowTools(r.id)}</tr></table></div>` : '<div class="mail-empty"><p>Pick a mail to read it.</p></div>';
    return `<div class="mail"><div class="mail-list" data-keep-scroll><div class="ml-head">Reception inbox · ${V.mail.rows.length} mails</div>${list}</div><div class="mail-read">${right}</div></div>`;
  }
  const short = (id) => { const r = REC[id]; const name = G.LOG_NAMES[r.log] || r.log; return `${name}: ${r.cells.filter(Boolean).join(' · ')}`.slice(0, 150); };
  function renderCase() {
    const disc = DISC.map(([id, label]) => `<li class="${S.found.has(id) ? 'got' : ''}"><span class="mk">${S.found.has(id) ? '✓' : '·'}</span>${esc(label)}</li>`).join('');
    const R = S.report, dis = S.done ? 'aria-disabled="true"' : '';
    const groups = ['Staff', 'Visitors', 'Couriers'].map((g) => `<div class="rq">${g}</div><div class="ropts">${C.whoOptions.filter((o) => o.group === g).map((o) => `<button class="ropt ${R.who === o.id ? 'on' : ''}" data-act="who" data-id="${esc(o.id)}" ${dis}>${esc(o.label)}</button>`).join('')}</div>`).join('');
    const how = C.howOptions.map((o) => `<button class="ropt ${R.how === o.id ? 'on' : ''}" data-act="how" data-id="${o.id}" ${dis}>${esc(o.label)}</button>`).join('');
    const ev = S.pins.length ? S.pins.map((id) => `<button class="ropt ${R.ev.includes(id) ? 'on' : ''}" data-act="ev" data-id="${id}" ${dis}>${esc(short(id))}</button>`).join('') : '<p class="muted small">Pin records in the apps (Pin button on each row) to use them here.</p>';
    const fl = (fk) => (S.flags[fk] ? `<p class="c3-flagline">⚑ ${esc(short(S.flags[fk]))}</p>` : `<p class="muted small">Not flagged yet: use the Flag button on a row in ${fk === 'room' ? 'Door badges (a Hardware-room row)' : 'Door badges (a Main-exit row), the Courier log or the Visitor log'}.</p>`);
    const ready = S.flags.room && S.flags.building && R.who && R.how && R.ev.length === 2 && !S.done;
    return `<div class="cf"><div class="cf-head">${px('casefile', 3)}<div><div class="cf-kicker">Case file · ${esc(C.dates.mon)}</div><div class="cf-name">${esc(C.title)}</div></div></div>
      <div class="cf-task"><p>The <b>${G.PROTO}</b> was on its shelf on Friday morning and is gone on Monday. Find out who carried it out of the building and how. Nothing is checked until you file the report.</p></div>
      <h3>Studio rules</h3><ol class="c3-rules">${C.rules.map((r) => `<li><b>${esc(r.title)}.</b> ${esc(r.text)}</li>`).join('')}</ol>
      <h3>Discoveries</h3><ul class="disc">${disc}</ul>
      <h3>Report (final, one try)</h3><div class="report">
      <div class="rq">1. The moment it left the Hardware room (flag)</div>${fl('room')}
      <div class="rq">2. The record of how it left the building (flag)</div>${fl('building')}
      <div class="rq">3. Who carried it out of the building?</div>${groups}
      <div class="rq">4. How did it leave the building?</div><div class="ropts col">${how}</div>
      <div class="rq">5. Which two records prove it? (pick 2 pinned records, ${R.ev.length}/2)</div><div class="ropts col">${ev}</div>
      <button class="btn primary" id="file-report" data-act="file" ${ready ? '' : 'aria-disabled="true"'}>${S.done ? 'Report filed' : 'File report'}</button></div></div>`;
  }

  /* ---------- flags, report, end ---------- */
  // setting a flag is part of filling in the report: no feedback, freely movable until filing
  function flag(id) {
    if (S.done || !S.started) return;
    const fk = flagKind(id); if (!fk) return;
    S.flags[fk] = S.flags[fk] === id ? null : id;
    toast(S.flags[fk] ? `Flag set: ${FLAG_LABEL[fk]}. It goes into your report.` : 'Flag removed.');
    renderAll();
  }
  function score() {
    if (!S.result) return { filed: false };
    const { layout, ...rest } = S.result;
    return rest;
  }
  function fileReport() {
    const R = S.report;
    if (S.done || !S.started || !(S.flags.room && S.flags.building && R.who && R.how && R.ev.length === 2)) return;
    const X = C.secret;
    const pair = R.ev.slice().sort().join('|');
    const flag1_ok = S.flags.room === X.flag1, flag2_ok = S.flags.building === X.flag2;
    const who_ok = R.who === X.who, how_ok = R.how === X.how, evidence_ok = X.pairs.some((p) => p.join('|') === pair);
    S.result = { filed: true, flag1_ok, flag2_ok, who_ok, how_ok, evidence_ok, correct: who_ok && how_ok && evidence_ok, layout: X.layout };
    if (flag1_ok) S.found.add('left-room'); if (flag2_ok) S.found.add('left-building');
    if (who_ok) S.found.add('who'); if (how_ok) S.found.add('how'); if (evidence_ok) S.found.add('evidence');
    S.done = true; S.seconds = Math.round((Date.now() - S.startedAt) / 1000);
    window.pixelforgeLastResult = { ...window.pixelforgeScore(), seconds: S.seconds };
    renderAll();
    const res = S.result;
    const howLabel = C.howOptions.find((o) => o.id === X.how).label;
    const why = !evidence_ok && (X.rejected.find((r) => r.pair.join('|') === pair) || {}).reason;
    const rows = [
      ['Flag: left the room', short(S.flags.room), short(X.flag1), flag1_ok],
      ['Flag: left the building', short(S.flags.building), short(X.flag2), flag2_ok],
      ['Who carried it out', R.who, X.who, who_ok],
      ['How', C.howOptions.find((o) => o.id === R.how).label, howLabel, how_ok],
      ['Evidence', R.ev.map(short).join(' + ') + (why ? ` (Why not: ${why})` : ''), X.pairs.map((p) => p.map(short).join(' + ')).join('  OR  '), evidence_ok],
    ].map(([k, you, truth, ok]) => `<tr><td>${k}</td><td>${esc(you)}</td><td>${esc(truth)}</td><td class="${ok ? 'res-ok' : 'res-fail'}">${ok ? '✓' : '✗'}</td></tr>`).join('');
    const disc = DISC.map(([id, label]) => `<li class="${S.found.has(id) ? 'got' : ''}"><span class="mk">${S.found.has(id) ? '✓' : '✗'}</span>${esc(label)}</li>`).join('');
    modal(`<div class="modal-kicker">Report filed · ${esc(C.title)}</div><h2>${res.correct ? 'Case solved ✓' : 'Not quite ✗'}</h2>
      <p class="end-story">${esc(X.story)}</p>
      <table class="score report-results c3-results"><thead><tr><th></th><th>You</th><th>Truth</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <ul class="disc">${disc}</ul>
      <div class="modal-score">${S.clicks} clicks · ${fmtTime(S.seconds)} · ${S.found.size}/5 discoveries</div><div class="modal-actions"><button class="btn" data-act="new" data-nocount>New random case</button><button class="btn" data-act="closeEnd" data-nocount>Look at the records</button><button class="btn primary" data-act="again" data-nocount>Play again</button></div>`);
  }

  const ACTS = {
    open: (d) => openApp(d.id),
    close: (d) => { const w = $(`#win-${d.id}`); if (w) w.remove(); },
    doorF: (d) => { S.doorF = d.id; render('door'); },
    doorP: (d) => { S.doorP = d.id; render('door'); },
    calP: (d) => { S.calP = d.id; render('calendar'); },
    hwTab: (d) => { S.hwTab = d.id; render('hardware'); },
    mailSel: (d) => { S.mailSel = d.id; render('mail'); },
    pin: (d) => { if (S.done) return; const i = S.pins.indexOf(d.id); if (i >= 0) { S.pins.splice(i, 1); S.report.ev = S.report.ev.filter((x) => x !== d.id); } else S.pins.push(d.id); renderAll(); },
    flag: (d) => flag(d.id),
    who: (d) => { if (S.done) return; S.report.who = d.id; render('casefile'); },
    how: (d) => { if (S.done) return; S.report.how = d.id; render('casefile'); },
    ev: (d) => { if (S.done) return; const R = S.report; const i = R.ev.indexOf(d.id); if (i >= 0) R.ev.splice(i, 1); else { if (R.ev.length >= 2) R.ev.shift(); R.ev.push(d.id); } render('casefile'); },
    file: () => fileReport(),
    start: () => { if (S.started) return; S.player = ($('#player').value || '').trim().slice(0, 24) || 'Player'; S.started = true; S.startedAt = Date.now(); closeModal(); renderAll(); openApp('casefile'); },
    closeEnd: () => closeModal(),
    again: () => location.reload(),
    new: () => { const u = new URL(location.href); let n; do { n = Math.floor(Math.random() * 999999) + 1; } while (n === seed); u.searchParams.set('seed', String(n)); location.href = u.href; },
  };
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (S.started && !S.done && t.closest('#app') && $('#overlay').hidden && !t.closest('[data-nocount]')) { S.clicks++; updateTop(); }
    const a = t.closest('[data-act]');
    if (a) { e.preventDefault(); if (a.getAttribute('aria-disabled') !== 'true' && ACTS[a.dataset.act]) ACTS[a.dataset.act](a.dataset); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('#overlay').hidden) { const b = $('#overlay [data-act="start"]'); if (b) { e.preventDefault(); b.click(); } } });

  window.pixelforgeScore = () => ({
    player: S.player, game: 'case3', seed, tasks: 1, level: 1, done: S.done, clicks: [S.clicks],
    progress: S.found.size, progressMax: 5, found: DISC.map(([id]) => id).filter((id) => S.found.has(id)), trapped: [], trapsMax: 0,
    report: score(), layout: S.result ? S.result.layout : null, twists: [],
  });
  function boot() {
    document.title = `Pixelforge · ${C.title}`;
    $('.logo').innerHTML = px('spark', 2);
    $('#icons').innerHTML = [['casefile', 'Case file', 'casefile'], ['door', 'Door badges', 'door'], ['calendar', 'Calendar', 'cal'], ['chat', 'Chat', 'chat'], ['mail', 'Mail', 'mail'], ['courier', 'Courier log', 'truck'], ['visitors', 'Visitor log', 'people'], ['hardware', 'Hardware', 'box'], ['directory', 'Directory', 'files']]
      .map(([id, label, icon]) => `<button class="dicon" data-act="open" data-id="${id}">${px(icon, 3)}<span>${label}</span></button>`).join('');
    tickClock(); setInterval(tickClock, 15000); updateTop();
    modal(`<div class="intro">${px('box', 6)}<div class="modal-kicker">${esc(C.title)} · Seed ${seed}</div><h2>The missing prototype</h2><div>${C.intro}</div><label class="name">Your name<input id="player" maxlength="24" autocomplete="off" placeholder="Player"></label><div class="modal-actions start-actions"><button class="btn ghost" data-act="new" data-nocount>New random case</button><button class="btn primary" data-act="start" data-nocount>Start</button></div></div>`);
    $('#player').focus();
  }
  boot();
})();
