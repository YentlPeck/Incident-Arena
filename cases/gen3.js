/* Family 3, "The missing prototype": seeded generator.
   Data contract: cases/CASE3-FORMAT.md. Design and decisions: cases/DESIGN-family3.md.

   Fairness construction (summary):
   - Two random streams. P draws EVERYTHING that is shown (people, counts, times, wording, ids, filler,
     and both possible values of every decisive field). L draws only the layout and which event of that
     layout's kind is the real one. P never depends on L, so the answer changes only decisive fields.
   - Every case has k staff visits (S), k courier fetches (C) and k studio tours (V), k = 2 or 3.
     Each kind has exactly one event that could be "the one"; L picks the kind (layout) and the event.
   - Studio rules shown to the player: every Hardware-room entry needs a booking of the person who badges
     in (a test, or packing a unit for a repair courier); one Hardware-room booking per person per day;
     nobody is double-booked. Some bookings are never used (no-shows) and some are cancelled in chat.
   - Decisive fields are swaps, never additions, so counts, names, ids and words stay identical:
       S: the person's two Friday entries (a Hardware-room test and another meeting) swap time slots.
       C: the pickup quotes either the event's open dev-kit ticket or its old closed prototype ticket first.
       V: the tour route has two neighbouring candidate stops that straddle the tester's badge time, both
          inside the tester's booking; the badge sits at one of them (P), L names one of them
          "Hardware room corridor". So true and look-alike corridor stops are exchangeable in everything
          except their distance to the door row. */
(function (root) {
  'use strict';
  function rng(seed, salt) {
    let a = Math.imul((seed >>> 0) ^ salt, 0x9e3779b1) >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
    const pick = (xs) => xs[int(0, xs.length - 1)];
    const shuffle = (xs) => { const o = xs.slice(); for (let i = o.length - 1; i > 0; i--) { const j = int(0, i); [o[i], o[j]] = [o[j], o[i]]; } return o; };
    const take = (xs, n) => shuffle(xs).slice(0, n);
    return { next, int, pick, shuffle, take };
  }

  const LAYOUTS = ['bag', 'courier', 'visitor'];
  const HOW = {
    bag: 'Took it home in their own bag',
    courier: 'Handed to a courier after a fake pickup request',
    visitor: 'A visitor on a studio tour slipped in behind a staff member',
  };
  // "who" is the one who carried it out of the building; its option group fixes "how" (see DESIGN-family3.md).
  const GROUP_HOW = { Staff: 'bag', Couriers: 'courier', Visitors: 'visitor' };
  const PROTO = 'Emberfall prototype';
  const HW = 'Hardware room', HW_STOP = 'Hardware room corridor';
  const PACK = 'Pack repair unit for courier';
  const FIRST = ['Alice', 'Bruno', 'Celia', 'Dario', 'Edith', 'Felix', 'Grace', 'Idris', 'Jules', 'Katja', 'Malik', 'Niels', 'Oscar', 'Petra', 'Quinn', 'Ruben', 'Sofia', 'Tomas', 'Xenia', 'Yusuf', 'Clara', 'David', 'Elise', 'Flora', 'Hanna', 'Iker', 'Lotte', 'Milan', 'Nadia', 'Otto'];
  const LAST = ['Verbeek', 'Laurent', 'Peeters', 'Mercier', 'Willems', 'Bergman', 'Lambert', 'Nielsen', 'Pereira', 'Schulte', 'Leclerc', 'Bernard', 'Janssen', 'Maesens', 'Fontane', 'Moreaux', 'Delorme', 'Rosberg', 'Delaere', 'Martens'];
  const VFIRST = ['Amara', 'Benedikt', 'Chiara', 'Dmitri', 'Esme', 'Farid', 'Greta', 'Hugo', 'Ines', 'Joost', 'Kenji', 'Leila', 'Mateo', 'Noor', 'Orla', 'Pim', 'Rosa', 'Stellan', 'Tess', 'Ugo'];
  const VLAST = ['Okafor', 'Lindqvist', 'Moreno', 'Haddad', 'Novak', 'Brennan', 'Sato', 'Varga', 'Costa', 'Holm', 'Ibarra', 'Quist'];
  const ROLES = ['Producer', 'Lead artist', 'Animator', 'Gameplay programmer', 'Tools programmer', 'QA tester', 'Level designer', 'Sound designer', 'Community manager', 'Build engineer', 'UI artist', 'Narrative designer', 'Office coordinator', 'Hardware tester'];
  const VCOMP = ['Moonlit Arcade magazine', 'Brightside School', 'Pixel Parents Club', 'Tidewater Games', 'Northwind Publishing', 'Byte-size Podcast', 'Riverside Library', 'Lumen Ventures', 'Kestrel College', 'Little Lantern Toys'];
  const COURIERS = ['SwiftLine Couriers', 'ParcelPigeon', 'Kitebox Express', 'RoadRunner Parcels', 'BlueVan Courier'];
  const PARTNERS = [['Fixwell Repairs', 'fixwell-repairs.com'], ['Handheld Doctors', 'handhelddoctors.eu'], ['CircuitCare', 'circuitcare.io'], ['SolderSmith Repairs', 'soldersmith.net']];
  const ASSETS = ['Dev kit #1', 'Dev kit #2', 'Dev kit #3', 'Dev kit #4', 'Controller test rig', 'Capture card', 'VR headset (test)', 'Handheld dev board', 'Battery tester', 'Spare screen panel'];
  const HW_TESTS = ['Battery drain test', 'Button latency test', 'Screen glare test', 'Drop test prep', 'Speaker check', 'Firmware flash', 'Thermal test', 'Rumble motor test'];
  const MEETINGS = ['Sprint review', 'Art sync', 'Level design jam', 'Build triage', 'Audio pass', 'Lunch & learn', 'Marketing check-in', 'Playtest debrief', 'Roadmap chat', 'Bug bash', 'Trailer review', 'Story read-through'];
  const ROOMS = ['Meeting room 1', 'Meeting room 2', 'Studio floor', 'Kitchen table', 'Sofa corner'];
  const EXTRA_DOORS = ['Sound booth', 'Server room', 'Roof terrace', 'Art storage'];
  const STOPS = ['Art floor', 'Sound booth', 'Motion-capture corner', 'Playtest lounge', 'Kitchen', 'Roof terrace', 'Level design pit'];
  const HEADING = ['Heading into {t} ({a}–{b}) now.', 'Off to {t} in {r}, {a}–{b}.', 'Joining {t} ({a}–{b}), back after.'];
  const CANCEL = ['Cancelled my {t} at {a}, the rig is not ready.', 'Moving my {a} {t} to Monday, sorry.', 'No {t} for me today, the {a} Hardware slot is free again.'];
  const AT_HW = ['Showing {v} the Hardware room corridor now.', 'At the Hardware room corridor with {v}.', '{v} and I are passing the Hardware room corridor now.'];
  // The studio rules, shown to the player in the intro and the Case File (review round 2, point 3).
  // Every accepted evidence pair is sufficient under these rules alone (check3.js derives it from them).
  const RULES = [
    ['Rule 1', 'Last seen', 'The prototype was on its shelf at the Friday morning shelf check.'],
    ['Rule 2', 'Bookings', 'Every Hardware-room entry needs a calendar booking of the person who badges in: a test, or a "Pack repair unit for courier" slot. Each person has at most one Hardware-room booking on Friday (cancelled ones stay listed and still count). Nobody is double-booked, and a chat message announcing a meeting with its times (like "Heading into … (HH:MM–HH:MM)") is the sender\'s own calendar entry.'],
    ['Rule 3', 'What a booking allows', 'A booked test takes nothing out of the room. A packing slot takes out one unit for a repair courier: the unit of the ticket that the courier pickup quotes first (a ticket listed "also" is only for reference). A ticket with a Closed date is finished: nothing may be collected for it.'],
    ['Rule 4', 'Visitors', 'Visitors have no badge. If a studio tour is at the Hardware room corridor (in its calendar route or in the host\'s chat) within 5 minutes of a Hardware-room door opening, the visitor slipped into the room behind the staff member.'],
    ['Rule 5', 'One thing went wrong', 'Exactly one thing broke these rules on Friday, and that is how the prototype left: a staff entry that no booking of theirs covers (they carried it out in their own bag), a visitor slipping in (they carried it out when they signed out), or a courier pickup that quotes first a closed ticket (that courier carried it out). Everything else was authorised and took nothing.'],
    ['Rule 6', 'Names', 'First names are unique, so a first name in chat points to one person.'],
  ];
  const rulesHtml = () => `<ol class="c3-rules">${RULES.map(([, h, t]) => `<li><b>${h}.</b> ${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</li>`).join('')}</ol>`;
  const CHATTER = ['Who finished the oat milk? Asking for a friend.', 'Build {b} is green, nice work everyone.', 'Pizza is here, kitchen table!', 'Reminder: playtest feedback forms by Monday.', 'Anyone seen the blue HDMI cable?', 'The coffee machine is making the noise again.', 'New boss sprites are in the art folder.', 'Can someone water the plant by reception?', 'Lovely weather on the roof terrace today.', 'Merged the save-file fix, please pull.', 'Thanks for the cake, it was great.', 'Printer on the art floor is out of paper.', 'Who booked Meeting room 2 for the whole afternoon?', 'The Hardware room door beeps if you hold it open too long, just so you know.', 'Weekend plans? I am finally finishing that puzzle game.', 'Lost a grey hoodie, probably in the sofa corner.'];
  const FILLER_MAIL = [
    ['Facilities', 'facilities', 'Wi-Fi maintenance on Saturday', 'The studio Wi-Fi will be down on Saturday morning for maintenance. Nothing to do on your side.'],
    ['People team', 'people', 'Summer party sign-up', 'The sign-up sheet for the summer party is open. Bring your best karaoke song.'],
    ['Office', 'office', 'Pizza Friday order', 'Pizza order closes at 11:30. Vegan options as always.'],
    ['IT desk', 'it', 'New badge readers next month', 'The door badge readers get a firmware update next month. Your badge keeps working.'],
    ['Finance', 'finance', 'Expense reports due', 'Please send this month\'s expense reports before Wednesday.'],
    ['Community team', 'community', 'Fan art of the week', 'Look at this lovely fan art of the Emberfall dragon! Sharing it on the wall.'],
  ];
  const DELIVERIES = ['Desk chairs (2 boxes)', 'Art books', 'Coffee beans', 'Cable organisers', 'Printer paper', 'Microphone stand', 'Office plants', 'Monitor arms'];
  const OUTGOING = ['Merch samples', 'Signed posters for a giveaway', 'Returned keyboard', 'Press kit boxes'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY = 86400000;
  const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const floor5 = (m) => Math.floor(m / 5) * 5;
  const fmtDate = (ms) => { const d = new Date(ms); return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
  const first = (n) => n.split(' ')[0];
  const fill = (tpl, o) => tpl.replace(/\{(\w)\}/g, (_, k) => o[k]);

  /* ---------- 1) everything shown, from P only ---------- */
  function build(P) {
    const k = P.int(2, 3), n = 3 * k, nStaff = n + P.int(7, 9);
    const firsts = P.take(FIRST, nStaff + 1);
    const staff = firsts.slice(0, nStaff).map((f) => ({ name: `${f} ${P.pick(LAST)}`, role: P.pick(ROLES) }));
    const me = `${firsts[nStaff]} ${P.pick(LAST)}`;
    const vf = P.take(VFIRST, k + 1), vc = P.take(VCOMP, k);
    const visitors = vc.map((c, i) => ({ name: `${vf[i]} ${P.pick(VLAST)}`, company: c }));
    const pp = P.pick(PARTNERS);
    const partner = { name: pp[0], email: `service@${pp[1]}`, contact: `${vf[k]} ${P.pick(VLAST)}` };
    const couriers = P.take(COURIERS, 3);
    const fri = Date.UTC(2026, 0, 2) + 7 * DAY * P.int(0, 46);
    const dates = { thu: fmtDate(fri - DAY), fri: fmtDate(fri), mon: fmtDate(fri + 3 * DAY) };

    // the 3k Hardware-room door events: anchor times first, then kinds and people
    const times = [];
    for (let g = 0; times.length < n && g < 3000; g++) { const x = P.int(600, 1020); if (times.every((y) => Math.abs(x - y) >= 30)) times.push(x); }
    if (times.length < n) return null;
    times.sort((a, b) => a - b);
    const kinds = P.shuffle([...Array(k).fill('S'), ...Array(k).fill('C'), ...Array(k).fill('V')]);
    const evStaff = P.take(staff, n);
    const busy = new Map(staff.map((s) => [s.name, []]));
    const addBusy = (name, a, b) => busy.get(name).push([a, b]);
    const isFree = (name, a, b) => busy.get(name).every(([x, y]) => b + 5 <= x || a >= y + 5);
    const events = times.map((x, i) => ({ kind: kinds[i], x, t: x, person: evStaff[i].name, open: P.int(6, 40) }));
    // V: two neighbouring route stops a, a+1 straddle the anchor; the tester's badge sits at one of them (P).
    for (const e of events.filter((v) => v.kind === 'V')) {
      const m = P.int(4, 5), gaps = Array.from({ length: m - 1 }, () => P.int(10, 14));
      const a = P.int(2, m - 1), g = gaps[a - 1], tau = [];
      tau[a] = e.x - Math.floor(g / 2) - P.int(0, 1); tau[a + 1] = tau[a] + g;
      for (let i = a - 1; i >= 1; i--) tau[i] = tau[i + 1] - gaps[i - 1];
      for (let i = a + 2; i <= m; i++) tau[i] = tau[i - 1] + gaps[i - 2];
      const jFirst = P.next() < 0.5;
      e.j = jFirst ? a : a + 1; e.alt = jFirst ? a + 1 : a; e.a = a;
      e.t = tau[e.j] + P.int(0, 2);
      e.tau = tau; e.m = m;
    }
    events.forEach((e) => addBusy(e.person, e.t - 2, e.t + 8));
    const evNames = new Set(events.map((e) => e.person));
    const nonEvent = staff.filter((s) => !evNames.has(s.name));

    // assets and repair tickets
    const tagSet = new Set(), refSet = new Set();
    const newTag = () => { let v; do { v = `HW-${P.int(1000, 9999)}`; } while (tagSet.has(v)); tagSet.add(v); return v; };
    const newRef = () => { let v; do { v = `RP-${P.int(1000, 9999)}`; } while (refSet.has(v)); refSet.add(v); return v; };
    const shelf = () => `${P.pick(['A', 'B', 'C', 'D'])}${P.int(1, 5)}`;
    const proto = { tag: newTag(), name: PROTO, shelf: shelf() };
    const others = P.take(ASSETS, P.int(k + 3, k + 5)).map((name) => ({ tag: newTag(), name, shelf: shelf() }));
    const tickets = [];
    const oldTicket = (asset) => { const o = P.int(25, 150); const c = o - P.int(4, 14); return { ref: newRef(), asset, opened: fmtDate(fri - o * DAY), closed: fmtDate(fri - c * DAY), sort: o }; };

    const slotAt = (x) => { const start = floor5(x - P.int(0, 10)); return { start, end: start + P.pick([30, 45, 60]) }; };
    let cIdx = 0;
    for (const e of events) {
      if (e.kind === 'S') {
        // Two slots: T (around the badge) and U (another time). L decides which holds the test booking.
        let u, g = 0;
        do { u = P.int(600, 1020); } while ((Math.abs(u - e.t) < 80) && g++ < 200);
        if (Math.abs(u - e.t) < 80) return null;
        e.slotT = slotAt(e.t); e.slotU = slotAt(u);
        if (!isFree(e.person, e.slotU.start, e.slotU.end)) return null;
        addBusy(e.person, e.slotT.start, e.slotT.end); addBusy(e.person, e.slotU.start, e.slotU.end);
        e.test = P.pick(HW_TESTS); e.meet = P.pick(MEETINGS); e.room = P.pick(ROOMS);
        e.heading = P.pick(HEADING); e.chatOff = P.int(0, 4);
        e.othersN = P.int(1, 2);
      } else if (e.kind === 'C') {
        e.book = slotAt(e.t); addBusy(e.person, e.book.start, e.book.end);
        e.pickup = e.t + P.int(5, 20);
        addBusy(e.person, e.t - 5, e.pickup + 5);
        const asset = others[cIdx++];
        const o = P.int(1, 9);
        e.ticketOpen = { ref: newRef(), asset, opened: fmtDate(fri - o * DAY), closed: '—', sort: o };
        e.ticketOld = oldTicket(proto);
        tickets.push(e.ticketOpen, e.ticketOld);
        const latest = e.t - 40;
        e.mailDay = latest >= 495 && P.next() < 0.6 ? 'fri' : 'thu';
        e.mailAt = e.mailDay === 'fri' ? P.int(480, latest) : P.int(780, 1080);
      } else {
        // the tester's booking covers the badge and both candidate stops
        const start = floor5(e.tau[e.a] - P.int(0, 10));
        e.book = { start, end: start + P.pick([45, 60, 75]) };
        if (e.book.end < Math.max(e.tau[e.a + 1], e.t) + 3) return null;
        addBusy(e.person, e.book.start, e.book.end);
        e.test = P.pick(HW_TESTS);
        e.stopNames = P.take(STOPS, e.m - 2); // non-Hardware stops after Reception, in route order
        e.atHw = P.pick(AT_HW); e.startMsg = P.int(1, 3);
        e.inAt = e.tau[1] - P.int(3, 10); e.outAt = e.tau[e.m] + P.int(8, 20);
      }
    }
    // safety: no stop or door row may sit near another event's door row
    for (const e of events.filter((x) => x.kind === 'V')) {
      if (!events.every((o) => Math.abs(e.tau[e.alt] - o.t) >= 8)) return null;
      if (!events.every((o) => o === e || Math.abs(e.tau[e.j] - o.t) >= 8)) return null;
    }
    // filler tickets (old, closed, other assets) and one or two open tickets with no pickup yet
    for (let i = P.int(1, 3); i > 0; i--) tickets.push(oldTicket(P.pick(others)));
    for (let i = P.int(1, 2); i > 0; i--) { const o = P.int(1, 12); tickets.push({ ref: newRef(), asset: P.pick(others.slice(k)), opened: fmtDate(fri - o * DAY), closed: '—', sort: o }); }

    // people for S meetings, tour hosts and visitors
    for (const e of events) {
      if (e.kind === 'S') {
        const pool = P.shuffle(staff.filter((s) => s.name !== e.person && isFree(s.name, e.slotT.start, e.slotT.end) && isFree(s.name, e.slotU.start, e.slotU.end)));
        if (pool.length < e.othersN) return null;
        e.others = pool.slice(0, e.othersN).map((s) => s.name);
        e.others.forEach((nm) => { addBusy(nm, e.slotT.start, e.slotT.end); addBusy(nm, e.slotU.start, e.slotU.end); });
        e.order = P.shuffle([e.person, ...e.others]);
      }
    }
    const badgeIds = P.take(Array.from({ length: 90 }, (_, i) => `V-${String(i + 10)}`), k);
    events.filter((e) => e.kind === 'V').forEach((e, i) => {
      e.visitor = visitors[i]; e.badge = badgeIds[i];
      const hosts = P.shuffle(staff.filter((s) => s.name !== e.person && isFree(s.name, e.inAt, e.outAt)));
      e.host = hosts.length ? hosts[0].name : null;
      if (e.host) addBusy(e.host, e.inAt, e.outAt);
      e.bookMail = P.int(600, 1050);
    });
    if (events.some((e) => e.kind === 'V' && !e.host)) return null;
    const cComp = P.shuffle(couriers);
    events.filter((e) => e.kind === 'C').forEach((e, i) => { e.company = cComp[i]; });

    // filler Hardware bookings by staff with no Hardware-room event: some cancelled in chat, some no-shows.
    // Every case has both kinds, so an unused booking on its own says nothing (review round 1, point 3a).
    const owners = P.shuffle(nonEvent);
    const nCancel = P.int(1, 2), nNoShow = Math.min(P.int(1, 5), owners.length - nCancel);
    const fillBook = [];
    for (let i = 0; i < nCancel + nNoShow; i++) {
      const owner = owners[i].name;
      let s = null;
      for (let g = 0; g < 60 && !s; g++) { const c = slotAt(P.int(600, 1020)); if (isFree(owner, c.start, c.end)) s = c; }
      if (!s) return null;
      addBusy(owner, s.start, s.end);
      const b = { owner, start: s.start, end: s.end, test: P.pick(HW_TESTS), cancelled: i < nCancel };
      if (b.cancelled) { b.msgAt = Math.max(525, s.start - P.int(20, 120)); b.msgTpl = P.pick(CANCEL); addBusy(owner, b.msgAt, b.msgAt + 1); }
      fillBook.push(b);
    }

    // filler meetings
    const meetings = [];
    for (let i = P.int(4, 7); i > 0; i--) {
      const start = floor5(P.int(560, 1040)), end = start + P.pick([30, 45, 60]);
      const pool = P.shuffle(staff.filter((s) => isFree(s.name, start, end)));
      const want = P.int(2, 4);
      const title = P.pick(MEETINGS), room = P.pick(ROOMS), heading = P.pick(HEADING), chat = P.next() < 0.6, off = P.int(0, 4);
      if (pool.length < want) continue;
      const people = pool.slice(0, want).map((s) => s.name);
      people.forEach((nm) => addBusy(nm, start, end));
      meetings.push({ start, end, title, room, people, heading, chat, off });
    }

    // door filler: entrance, exit, extra doors. Everyone has the same number of "extra" door rows
    // whether or not they are in a Hardware-room event (the Hardware row replaces one of them).
    const door = [];
    const staffDays = staff.map((s) => {
      const firstStart = Math.min(9999, ...busy.get(s.name).map(([a]) => a));
      const inAt = Math.min(P.int(500, 590), firstStart - 5 - P.int(0, 15));
      const lastEnd = Math.max(0, ...busy.get(s.name).map(([, b]) => b));
      const outAt = Math.max(1025, lastEnd + 10) + P.int(0, 60);
      const nExtra = P.int(1, 3) - (evNames.has(s.name) ? 1 : 0);
      const extra = [];
      for (let i = 0; i < nExtra; i++) {
        let x, g = 0;
        do { x = P.int(inAt + 15, outAt - 15); } while (!isFree(s.name, x, x + 2) && g++ < 50);
        extra.push({ time: x, door: P.pick(EXTRA_DOORS) });
      }
      return { name: s.name, inAt, outAt, extra };
    });
    const dayOf = new Map(staffDays.map((d) => [d.name, d]));
    const present = (name, t) => { const d = dayOf.get(name); return d.inAt + 2 <= t && t <= d.outAt - 2; };
    staffDays.forEach((d) => {
      door.push({ time: d.inAt, door: 'Main entrance', person: d.name, note: 'badge in' });
      door.push({ time: d.outAt, door: 'Main exit', person: d.name, note: 'badge out' });
      d.extra.forEach((x) => door.push({ time: x.time, door: x.door, person: d.name, note: '' }));
    });

    // shelf checks
    const checkAt = P.int(530, 570);
    const early = staffDays.filter((d) => d.inAt <= checkAt - 5);
    if (!early.length) return null;
    const checker = P.pick(early);
    const checks = [
      { day: 'thu', time: P.int(1000, 1050), text: 'Weekly count: all hardware on its shelf', by: P.pick(staff).name },
      { day: 'fri', time: checkAt, text: `${PROTO} (${proto.tag}) on shelf ${proto.shelf}: present`, by: checker.name },
      { day: 'mon', time: P.int(540, 580), text: `${PROTO} (${proto.tag}) on shelf ${proto.shelf}: MISSING`, by: P.pick(staff).name },
    ];

    // courier filler: every row is handled by someone who is in the building at that time
    const courier = [], cref = new Set();
    const uniq = (mk) => { let v; do { v = mk(); } while (cref.has(v)); cref.add(v); return v; };
    for (let i = P.int(2, 4); i > 0; i--) {
      const time = P.int(540, 990), here = staff.filter((s) => present(s.name, time));
      const company = P.pick(couriers), ref = uniq(() => `TRK-${P.int(100000, 999999)}`), contents = P.pick(DELIVERIES);
      if (!here.length) continue;
      courier.push({ time, type: 'Delivery', company, ref, contents, staff: P.pick(here).name });
    }
    for (let i = P.int(1, 2); i > 0; i--) {
      const time = P.int(600, 1020), here = nonEvent.filter((s) => present(s.name, time));
      const company = P.pick(couriers), ref = uniq(() => `PF-${P.int(1000, 9999)}`), contents = P.pick(OUTGOING);
      if (!here.length) continue;
      courier.push({ time, type: 'Pickup', company, ref, contents, staff: P.pick(here).name });
    }

    // chat filler (only people who are in the building at that time)
    const chat = [];
    for (let i = P.int(8, 12); i > 0; i--) {
      const time = P.int(520, 1080), here = staff.filter((s) => present(s.name, time));
      const text = fill(P.pick(CHATTER), { b: `0.${P.int(7, 9)}.${P.int(1, 40)}` });
      if (here.length) chat.push({ time, who: P.pick(here).name, text });
    }
    meetings.forEach((mt) => { if (mt.chat) chat.push({ time: mt.start - mt.off, who: P.pick(mt.people), text: fill(mt.heading, { t: mt.title, r: mt.room, a: hm(mt.start), b: hm(mt.end) }) }); });

    // mail filler
    const mail = [];
    P.take(FILLER_MAIL, P.int(3, 5)).forEach(([nm, box, subj, body]) => {
      const day = P.pick(['thu', 'fri']);
      mail.push({ day, time: day === 'fri' ? P.int(480, 1000) : P.int(540, 1080), fromName: nm, from: `${box}@pixelforge.studio`, to: 'Reception', subject: subj, body });
    });
    mail.push({ day: 'thu', time: P.int(540, 1000), fromName: `${partner.contact} (${partner.name})`, from: partner.email, to: 'Reception', subject: `${partner.name}: new repair price list`, body: `Hello Pixelforge! Our new price list for handheld repairs is attached. Thanks for working with us. ${first(partner.contact)}, ${partner.name}` });
    const ticketsSorted = tickets.slice().sort((a, b) => a.sort - b.sort || (a.ref < b.ref ? -1 : 1));
    return { k, staff, me, visitors, partner, couriers, dates, proto, others, tickets: ticketsSorted, events, meetings, fillBook, door, checks, courier, chat, mail, staffDays };
  }

  /* ---------- 2) the hidden answer, from L only; 3) assembly ---------- */
  function generate(seed) {
    const P = rng(seed, 0x3c6ef372), L = rng(seed, 0x1b873593);
    let B = null;
    for (let g = 0; !B && g < 80; g++) B = build(P);
    if (!B) throw new Error(`seed ${seed}: could not build a case`);
    const layout = LAYOUTS[L.int(0, 2)], ti = L.int(0, B.k - 1);
    const kindOf = { bag: 'S', courier: 'C', visitor: 'V' }[layout];
    const trueEv = B.events.filter((e) => e.kind === kindOf)[ti];

    const door = B.door.slice(), calendar = [], chat = B.chat.slice(), mail = B.mail.slice(), courier = B.courier.slice(), vlog = [];
    const cal = (start, end, title, room, people, route = '') => { const r = { start, end, title, room, people, route }; calendar.push(r); return r; };
    B.meetings.forEach((mt) => cal(mt.start, mt.end, mt.title, mt.room, mt.people));
    B.fillBook.forEach((b) => {
      cal(b.start, b.end, b.test, HW, [b.owner]);
      if (b.cancelled) chat.push({ time: b.msgAt, who: b.owner, text: fill(b.msgTpl, { t: b.test, a: hm(b.start) }) });
    });
    B.events.forEach((e) => {
      const isTrue = e === trueEv;
      const hwRow = { time: e.t, door: HW, person: e.person, note: `door open ${e.open} s` };
      door.push(hwRow);
      e.rec = { hwRow };
      if (e.kind === 'S') {
        const hwSlot = isTrue ? e.slotU : e.slotT, meetSlot = isTrue ? e.slotT : e.slotU;
        const hwBook = cal(hwSlot.start, hwSlot.end, e.test, HW, [e.person]);
        const meet = cal(meetSlot.start, meetSlot.end, e.meet, e.room, e.order);
        const msg = { time: meetSlot.start - e.chatOff, who: e.person, text: fill(e.heading, { t: e.meet, r: e.room, a: hm(meetSlot.start), b: hm(meetSlot.end) }) };
        chat.push(msg);
        Object.assign(e.rec, { hwBook, meet, msg });
      } else if (e.kind === 'C') {
        const hwBook = cal(e.book.start, e.book.end, PACK, HW, [e.person]);
        const tk = isTrue ? e.ticketOld : e.ticketOpen, twin = isTrue ? e.ticketOpen : e.ticketOld;
        const pick = { time: e.pickup, type: 'Pickup', company: e.company, ref: tk.ref, contents: '1 parcel for repair', staff: e.person, ref2: twin.ref };
        const req = { day: e.mailDay, time: e.mailAt, fromName: `${B.partner.contact} (${B.partner.name})`, from: B.partner.email, to: 'Reception', subject: `Courier pickup on Friday: ${e.company}`, body: `Hi! Our courier ${e.company} will collect the unit for repair ticket ${tk.ref} (also on file: ${twin.ref}) on Friday ${e.pickup < 720 ? 'morning' : 'afternoon'}. Please have it packed at reception. Thanks, ${first(B.partner.contact)}, ${B.partner.name}` };
        courier.push(pick); mail.push(req);
        Object.assign(e.rec, { hwBook, pick, req, ticket: tk, twin });
      } else {
        const hwBook = cal(e.book.start, e.book.end, e.test, HW, [e.person]);
        const hwAt = isTrue ? e.j : e.alt;
        const names = ['Reception']; let q = 0;
        for (let i = 2; i <= e.m; i++) names[i - 1] = i === hwAt ? HW_STOP : e.stopNames[q++];
        const route = names.map((nm, i) => `${hm(e.tau[i + 1])} ${nm}`).join(' → ');
        const tour = cal(e.tau[1], e.tau[e.m] + 10, `Studio tour: ${e.visitor.name} (${e.visitor.company})`, 'Whole studio', [e.host], route);
        const startMsg = { time: e.tau[1] - e.startMsg, who: e.host, text: `Starting the studio tour with ${first(e.visitor.name)} at reception.` };
        const hwMsg = { time: e.tau[hwAt], who: e.host, text: fill(e.atHw, { v: first(e.visitor.name) }) };
        const visit = { name: e.visitor.name, company: e.visitor.company, host: e.host, in: e.inAt, out: e.outAt, badge: e.badge };
        const booking = { day: 'thu', time: e.bookMail, fromName: 'Reception', from: 'reception@pixelforge.studio', to: e.host, subject: `Studio tour on Friday: ${e.visitor.name}`, body: `Hi ${first(e.host)}, ${e.visitor.name} from ${e.visitor.company} is booked for a studio tour on Friday at ${hm(e.tau[1])}. You are the host. Thanks!` };
        chat.push(startMsg, hwMsg); vlog.push(visit); mail.push(booking);
        Object.assign(e.rec, { hwBook, tour, hwMsg, visit, booking });
      }
    });

    // sort and number every log (ids follow display order only)
    const by = (...keys) => (a, b) => { for (const f of keys) { const x = f(a), y = f(b); if (x < y) return -1; if (x > y) return 1; } return 0; };
    const dayN = { thu: 0, fri: 1, mon: 2 };
    door.sort(by((r) => r.time, (r) => r.door, (r) => r.person)).forEach((r, i) => { r.id = `d${i + 1}`; });
    calendar.sort(by((r) => r.start, (r) => r.title, (r) => r.people.join())).forEach((r, i) => { r.id = `e${i + 1}`; });
    chat.sort(by((r) => r.time, (r) => r.who, (r) => r.text)).forEach((r, i) => { r.id = `h${i + 1}`; });
    mail.sort(by((r) => dayN[r.day], (r) => r.time, (r) => r.subject)).forEach((r, i) => { r.id = `m${i + 1}`; });
    courier.sort(by((r) => r.time, (r) => r.ref)).forEach((r, i) => { r.id = `k${i + 1}`; });
    vlog.sort(by((r) => r.in, (r) => r.name)).forEach((r, i) => { r.id = `v${i + 1}`; });
    const tickets = B.tickets.map((t, i) => ({ id: `t${i + 1}`, ref: t.ref, tag: t.asset.tag, item: t.asset.name, opened: t.opened, closed: t.closed }));
    const tid = (ref) => tickets.find((t) => t.ref === ref).id;
    const assets = [B.proto, ...B.others].slice().sort(by((a) => a.tag)).map((a, i) => ({ id: `a${i + 1}`, tag: a.tag, name: a.name, shelf: a.shelf }));
    const checks = B.checks.map((c, i) => ({ id: `s${i + 1}`, ...c }));

    // the answer: every logically sufficient evidence pair (see DESIGN-family3.md, "Evidence rubric"),
    // plus the reasonable-looking pairs that are rejected, each with its reason
    const R = trueEv.rec;
    let who, flag2, pairs, rejected, story;
    const at = hm(trueEv.t);
    if (layout === 'bag') {
      who = trueEv.person;
      const exit = door.find((r) => r.door === 'Main exit' && r.person === trueEv.person);
      flag2 = exit.id;
      pairs = [[R.hwRow.id, R.meet.id], [R.hwRow.id, R.msg.id], [R.hwRow.id, R.hwBook.id]];
      rejected = [
        [[R.hwRow.id, exit.id], 'Every staff member badges out of the main exit. These two records do not show that the Hardware-room entry was unbooked.'],
        [[R.meet.id, R.msg.id], 'Neither record shows anyone entering the Hardware room.'],
        [[R.meet.id, R.hwBook.id], 'Neither record shows anyone entering the Hardware room.'],
        [[exit.id, R.meet.id], 'Neither record shows the Hardware-room entry.'],
      ];
      story = `${who} badged into the Hardware room at ${at}, while the calendar (and their own chat message) had them in ${R.meet.title}. Their only Hardware-room booking that day was at ${hm(R.hwBook.start)}, so this entry was not a test. They slipped the prototype into their bag and badged out of the main exit at ${hm(exit.time)}.`;
    } else if (layout === 'courier') {
      who = trueEv.company; flag2 = R.pick.id;
      const t = tid(R.ticket.ref), t2 = tid(R.twin.ref);
      pairs = [[R.pick.id, t]];
      rejected = [
        [[R.pick.id, R.req.id], 'Neither record shows that the quoted ticket is closed or that it is for the prototype.'],
        [[R.req.id, t], 'Shows a request that quoted a closed prototype ticket, but not that a courier collected anything. The courier log pickup row is the record of collection.'],
        [[R.pick.id, t2], 'That ticket is only quoted alongside ("also"). A pickup carries the unit of the ticket it quotes first, and this one is open and for another item.'],
        [[R.hwRow.id, t], 'Shows a booked packing slot and a closed ticket, but not which courier carried anything out.'],
        [[R.hwRow.id, R.pick.id], 'A packing fetch followed by a pickup is normal. Neither record shows the ticket is invalid.'],
      ];
      story = `A pickup request that looked like it came from ${B.partner.name} quoted ticket ${R.ticket.ref}: an old, closed repair ticket for the prototype. ${trueEv.person} fetched the prototype from the Hardware room at ${at} in a booked packing slot and handed it to ${who} at ${hm(R.pick.time)}. The real ${B.partner.name} never asked for it.`;
    } else {
      who = trueEv.visitor.name; flag2 = R.visit.id;
      pairs = [[R.hwRow.id, R.tour.id], [R.hwRow.id, R.hwMsg.id]];
      rejected = [
        [[R.tour.id, R.visit.id], 'Neither record shows the Hardware-room door opening.'],
        [[R.hwRow.id, R.visit.id], 'The visitor log shows sign-in and sign-out times, not where the visitor was when the door opened.'],
        [[R.hwRow.id, R.hwBook.id], 'Shows the door opening was a booked test, which is fine for the staff member. It says nothing about the visitor.'],
        [[R.tour.id, R.hwMsg.id], 'Neither record shows the Hardware-room door opening.'],
      ];
      story = `${who} (${trueEv.visitor.company}) was on a studio tour with ${trueEv.host}. At ${at} the tour passed the Hardware room corridor just as ${trueEv.person} opened the door for a booked test. ${first(who)} slipped in behind them, pocketed the prototype and signed out at ${hm(R.visit.out)}.`;
    }
    const secret = {
      layout, how: layout, who, flag1: R.hwRow.id, flag2, pairs: pairs.map((p) => p.slice().sort()), story,
      rejected: rejected.map(([p, reason]) => ({ pair: p.slice().sort(), reason })),
      events: B.events.map((e) => ({ kind: e.kind, t: e.t, person: e.person, isTrue: e === trueEv, hwRow: e.rec.hwRow.id, hwBook: e.rec.hwBook.id, company: e.company || null, visitor: e.visitor ? e.visitor.name : null, ticket: e.rec.ticket ? tid(e.rec.ticket.ref) : null })),
    };
    const whoOptions = [
      ...B.staff.map((s) => ({ id: s.name, label: s.name, group: 'Staff' })),
      ...vlog.map((v) => ({ id: v.name, label: `${v.name} (visitor)`, group: 'Visitors' })),
      ...B.couriers.map((c) => ({ id: c, label: `${c} (courier)`, group: 'Couriers' })),
    ];
    return {
      family: 'case3', seed, title: `The missing prototype · Case #${seed}`, me: B.me, dates: B.dates,
      intro: `<p>Friday morning the studio's only <b>${PROTO}</b> (a handheld test unit) was on its shelf in the locked Hardware room. On Monday morning it is gone. Every staff badge opens the Hardware room; visitors and couriers have no badge for it.</p><p><b>Studio rules</b> (also in your Case file):</p>${rulesHtml()}<p>You are <b>${B.me}</b>, office manager. Read the studio's records and file <b>one report</b>: the record of the moment it left the Hardware room, the record of how it left the building, <b>who carried it out of the building</b>, <b>how</b>, and the <b>two records</b> that prove it. Nothing is checked until you file.</p>`,
      rules: RULES.map(([id, title, text]) => ({ id, title, text })),
      staff: B.staff, partner: B.partner, couriers: B.couriers, door, calendar, chat, mail, courier, visitors: vlog, tickets, assets, checks,
      whoOptions, howOptions: LAYOUTS.map((l) => ({ id: l, label: HOW[l] })), secret,
    };
  }

  /* ---------- what the apps show (the game and the solver/checker read only this) ---------- */
  function views(C) {
    const D = C.dates;
    const t = (cols, rows) => ({ cols, rows });
    return {
      directory: t(['Name', 'Role'], C.staff.map((s, i) => ({ id: `p${i + 1}`, cells: [s.name, s.role] }))),
      door: t(['Time', 'Door', 'Person', 'Note'], C.door.map((r) => ({ id: r.id, cells: [hm(r.time), r.door, r.person, r.note] }))),
      visitors: t(['Visitor', 'Company', 'Host', 'Signed in', 'Signed out', 'Visitor badge'], C.visitors.map((r) => ({ id: r.id, cells: [r.name, r.company, r.host, hm(r.in), hm(r.out), r.badge] }))),
      courier: t(['Time', 'Type', 'Courier', 'Reference', 'Contents', 'Handled by'], C.courier.map((r) => ({ id: r.id, cells: [hm(r.time), r.type, r.company, r.ref2 ? `${r.ref} (also ${r.ref2})` : r.ref, r.contents, r.staff] }))),
      calendar: t(['Time', 'Event', 'Room', 'People', 'Route'], C.calendar.map((r) => ({ id: r.id, cells: [`${hm(r.start)}–${hm(r.end)}`, r.title, r.room, r.people.join(', '), r.route] }))),
      chat: t(['Time', 'Who', 'Message'], C.chat.map((r) => ({ id: r.id, cells: [hm(r.time), r.who, r.text] }))),
      mail: t(['Date', 'From', 'Address', 'To', 'Subject', 'Message'], C.mail.map((r) => ({ id: r.id, cells: [`${D[r.day]} ${hm(r.time)}`, r.fromName, r.from, r.to, r.subject, r.body] }))),
      assets: t(['Tag', 'Item', 'Shelf'], C.assets.map((r) => ({ id: r.id, cells: [r.tag, r.name, r.shelf] }))),
      checks: t(['Date', 'Check', 'By'], C.checks.map((r) => ({ id: r.id, cells: [`${D[r.day]} ${hm(r.time)}`, r.text, r.by] }))),
      tickets: t(['Ticket', 'Item', 'Opened', 'Closed'], C.tickets.map((r) => ({ id: r.id, cells: [r.ref, r.item, r.opened, r.closed] }))),
      partner: { name: C.partner.name, email: C.partner.email, contact: C.partner.contact },
      dates: D,
    };
  }
  const LOG_NAMES = { directory: 'Directory', door: 'Door badges', visitors: 'Visitor log', courier: 'Courier log', calendar: 'Calendar', chat: 'Chat', mail: 'Mail', assets: 'Hardware items', checks: 'Shelf checks', tickets: 'Repair tickets' };
  const api = { generate, views, rng, LAYOUTS, HOW, GROUP_HOW, PROTO, HW, HW_STOP, PACK, LOG_NAMES, RULES, hm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PFCase3 = api;
})(typeof window !== 'undefined' ? window : globalThis);
