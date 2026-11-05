/* Family 3 fairness checker. Usage: node cases/check3.js [fromSeed] [toSeed]
   Reserved seeds (never use here): 6001-6055 (test) and 6901-6999 (pilot).
   1. Reference solver (cases/solve3.js, reads only the app tables) agrees with the hidden answer on every
      seed: layout, who, both flags, all evidence pairs; exactly one unexplained Hardware-room moment.
   2. Independent truth check from generator internals: one disappearance per case, every look-alike
      harmless, every kind (staff visit, courier fetch, tour) present at least twice in every case,
      studio rules hold (one Hardware booking per person, nobody double-booked, every harmless entry booked).
   3. Balance: layouts 1/3 each; within a layout the culprit's place in its list is uniform.
   4. Identity rules: unique first names, tags, ticket refs, visitor badges; every Hardware-room row
      belongs to exactly one event.
   5. Timing: the true event's times have the same distribution as look-alike times.
   6. Single-record oracle: no normalised record template is concentrated in one layout.
   7. Naive-Bayes classifiers on (a) rendered text and (b) per-record features (position, time, length,
      id shapes, counts, repeats) predicting the layout, the two flagged rows and the person. Each must
      stay within its baseline (chance or majority prior) + 10 points on held-out seeds.
   R. Review round 1 regression checks (numbered as the review findings):
      R1  calendar-proximity rule (exact rule from the review) + timing relations of tours (single-feature
          interval rules, pairwise-combination Naive Bayes) + timing relations of Hardware rows
      R2  tour stop position TV (see 5)
      R3a unused-booking rules (presence, count, uncancelled presence/count)
      R3b closed main ticket needs two records (ticket log alone and courier log alone carry no signal)
      R4  flags give no feedback before filing (static check of gameR3.js)
      R5  who/how dependence (mapping holds in every case and is documented), attendance consistency,
          neutral ticket wording
      R6  evidence rubric: an independent pair prover (each rule reads only the two records plus the
          studio rules shown to the player) finds exactly the accepted pairs; every listed rejected pair
          fails it and carries a stated reason
   R2. Review round 2 checks:
      point 1  per-value layout share of single counts (raw counts enforced; unused counts reported) and the
               identity unused = (bookings - people in Hardware rows) + [bag] in every case
      point 2  the repair request's "Friday morning/afternoon" matches the pickup time
      point 3  rules shown in the intro and the Case File; prover rewritten as facts -> rule violations ->
               Rule 5 (exactly one violation, and it is how the prototype left), over every pair of
               fact-bearing records; a pair proving two different answers is a problem
   Every predictive rule must stay within its prior + 10 points on held-out seeds (last 20% of range). */
'use strict';
const fs = require('fs');
const path = require('path');
const G = require('./gen3.js');
const { solve } = require('./solve3.js');
const from = Number(process.argv[2] || 1), to = Number(process.argv[3] || 5000);
const RESERVED = (s) => (s >= 6001 && s <= 6055) || (s >= 6901 && s <= 6999);
if (RESERVED(from) || RESERVED(to) || (from <= 6001 && to >= 6001) || (from <= 6901 && to >= 6901)) { console.error('Seed range touches reserved seeds 6001-6055 / 6901-6999. Refusing.'); process.exit(2); }
const problems = [];
const say = (m) => { if (problems.length < 300) problems.push(m); };
const LOGS = ['directory', 'door', 'visitors', 'courier', 'calendar', 'chat', 'mail', 'assets', 'checks', 'tickets'];
const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
const tokens = (s) => s.toLowerCase().split(/[^a-z0-9#:\-]+/).filter(Boolean);
const kindOf = (log, cells) => (log === 'door' ? cells[1] : log === 'courier' ? cells[1] : log === 'calendar' ? (cells[2] === 'Hardware room' ? 'hwroom' : cells[4] ? 'tour' : 'meet') : '');
const isFlaggable = (log, cells) => (log === 'door' && (cells[1] === 'Hardware room' || cells[1] === 'Main exit')) || log === 'courier' || log === 'visitors';
const timeOf = (cells) => { for (const c of cells) { const m = /(\d\d):(\d\d)/.exec(c); if (m) return Number(m[1]); } return -1; };
const shape = (s) => s.replace(/[A-Za-z]/g, 'A').replace(/\d/g, '9');
const tv = (a, b) => { const ka = new Set([...Object.keys(a), ...Object.keys(b)]); const na = Object.values(a).reduce((x, y) => x + y, 0) || 1, nb = Object.values(b).reduce((x, y) => x + y, 0) || 1; let d = 0; for (const k of ka) d += Math.abs((a[k] || 0) / na - (b[k] || 0) / nb); return d / 2; };
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const key = (p) => p.slice().sort().join('|');
const srt = (ps) => ps.map((p) => p.slice().sort()).sort((a, b) => (a.join() < b.join() ? -1 : 1));
const clip = (v, lim = 60) => Math.max(-lim, Math.min(lim, v));
const nearest = (s, xs) => { let best = 999; for (const x of xs) if (Math.abs(s - x) < Math.abs(best)) best = s - x; return best === 999 ? 99 : clip(best); };

/* parse the app tables (views) of one case */
function parse(V) {
  const door = V.door.rows.map((r) => ({ id: r.id, t: toMin(r.cells[0]), door: r.cells[1], person: r.cells[2] }));
  const cal = V.calendar.rows.map((c) => { const [a, b] = c.cells[0].split('–'); return { id: c.id, start: toMin(a), end: toMin(b), title: c.cells[1], room: c.cells[2], people: c.cells[3].split(', '), route: c.cells[4] ? c.cells[4].split(' → ').map((x) => ({ t: toMin(x.slice(0, 5)), place: x.slice(6) })) : [] }; });
  const chat = V.chat.rows.map((r) => ({ id: r.id, t: toMin(r.cells[0]), who: r.cells[1], text: r.cells[2] }));
  const courier = V.courier.rows.map((r) => { const m = /^(\S+)(?: \(also (\S+)\))?$/.exec(r.cells[3]); return { id: r.id, t: toMin(r.cells[0]), type: r.cells[1], company: r.cells[2], ref: m[1], ref2: m[2] || null, raw: r.cells[3], contents: r.cells[4], staff: r.cells[5] }; });
  const visitors = V.visitors.rows.map((r) => ({ id: r.id, name: r.cells[0], host: r.cells[2], in: toMin(r.cells[3]), out: toMin(r.cells[4]) }));
  const tickets = V.tickets.rows.map((r) => ({ id: r.id, ref: r.cells[0], item: r.cells[1], closed: r.cells[3] }));
  const fri = V.checks.rows.find((r) => r.cells[0].startsWith(V.dates.fri) && /present/.test(r.cells[1]));
  const mailFri = V.mail.rows.filter((r) => r.cells[0].startsWith(V.dates.fri)).map((r) => toMin(r.cells[0].slice(-5)));
  return { door, cal, chat, courier, visitors, tickets, lastSeen: toMin(fri.cells[0].slice(-5)), friCheckBy: fri.cells[2], friCheckT: toMin(fri.cells[0].slice(-5)), mailFri, hwRows: door.filter((d) => d.door === G.HW) };
}

/* R6 (rewritten in review round 2): independent pair prover that derives the answer from the studio
   rules SHOWN TO THE PLAYER (C.rules, Rules 1-6) and nothing else.
   Step 1, facts: each displayed record yields the facts it states, read from the app tables only.
     door row (Hardware room)        open(t, person)
     calendar entry, not Hardware    busy(person, a, b) for every listed person (tours: the host)
     calendar Hardware booking       hwBook(person, a, b)
     tour route stop at the corridor corridor(visitor, t)
     chat "Heading into … (a–b)"     busy(sender, a, b)                         (Rule 2)
     chat "... Hardware room corridor ... <first name>"  corridor(visitor, t)   (Rules 4, 6)
     courier pickup                  pickupFirst(company, ref)
     repair ticket                   ticket(ref, closed?)
   Step 2, violations (the only ways to break the rules):
     open(t,p) + busy(p,a,b), a<=t<=b      -> no booking of p covers t (Rule 2: not double-booked)   -> unauthorised staff entry by p
     open(t,p) + hwBook(p,a,b), t outside  -> p's only booking is elsewhere (Rule 2)                 -> unauthorised staff entry by p
     open(t,_) + corridor(v,s), |s-t|<=5   -> v slipped in (Rule 4)                                  -> unauthorised visitor entry by v
     pickupFirst(co,ref) + ticket(ref, closed) -> pickup for a finished ticket (Rule 3)              -> invalid pickup by co
   Step 3, Rule 5: exactly one violation happened and it is how the prototype left, so a violation fixes
     who and how (staff -> own bag, visitor -> visitor, courier -> courier).
   Every pair of fact-bearing records is tried. Records with no facts (visitor log, mails, exits, shelf
   checks, items, directory) cannot complete a proof under the displayed rules. */
function factsOf(Q) {
  const F = [];
  const firsts = new Map(Q.visitors.map((v) => [v.name.split(' ')[0], v.name]));
  Q.hwRows.forEach((d) => F.push({ id: d.id, fs: [{ f: 'open', t: d.t, p: d.person }] }));
  Q.cal.forEach((c) => {
    const fs = [];
    if (c.room === G.HW) c.people.forEach((p) => fs.push({ f: 'hwBook', p, a: c.start, b: c.end }));
    else c.people.forEach((p) => fs.push({ f: 'busy', p, a: c.start, b: c.end }));
    c.route.filter((s) => s.place === G.HW_STOP).forEach((s) => fs.push({ f: 'corridor', v: c.title.slice('Studio tour: '.length, c.title.lastIndexOf(' (')), t: s.t }));
    F.push({ id: c.id, fs });
  });
  Q.chat.forEach((m) => {
    const fs = [], w = /(\d\d:\d\d)–(\d\d:\d\d)/.exec(m.text); // only meeting announcements carry a time window
    if (w) fs.push({ f: 'busy', p: m.who, a: toMin(w[1]), b: toMin(w[2]) });
    if (/Hardware room corridor/.test(m.text)) for (const [f, name] of firsts) if (new RegExp(`\\b${f}\\b`).test(m.text)) fs.push({ f: 'corridor', v: name, t: m.t });
    if (fs.length) F.push({ id: m.id, fs });
  });
  Q.courier.filter((k) => k.type === 'Pickup').forEach((k) => F.push({ id: k.id, fs: [{ f: 'pickupFirst', co: k.company, ref: k.ref }] }));
  Q.tickets.forEach((t) => F.push({ id: t.id, fs: [{ f: 'ticket', ref: t.ref, closed: t.closed !== '—' }] }));
  return F;
}
function violations(fs) {
  const out = [];
  for (const o of fs.filter((x) => x.f === 'open')) {
    for (const x of fs) {
      if (x.f === 'busy' && x.p === o.p && x.a <= o.t && o.t <= x.b) out.push({ who: o.p, how: 'bag', rule: 'Rule 2 (not double-booked) + Rule 5' });
      if (x.f === 'hwBook' && x.p === o.p && (o.t < x.a || o.t > x.b)) out.push({ who: o.p, how: 'bag', rule: 'Rule 2 (one booking, elsewhere) + Rule 5' });
      if (x.f === 'corridor' && Math.abs(x.t - o.t) <= 5) out.push({ who: x.v, how: 'visitor', rule: 'Rule 4 + Rule 5' });
    }
  }
  for (const k of fs.filter((x) => x.f === 'pickupFirst')) for (const t of fs) if (t.f === 'ticket' && t.ref === k.ref && t.closed) out.push({ who: k.co, how: 'courier', rule: 'Rule 3 + Rule 5' });
  return out;
}
function provePairs(Q) {
  const F = factsOf(Q), out = new Map(), conflicts = [];
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
    if (F[i].id === F[j].id) continue;
    const vs = violations(F[i].fs.concat(F[j].fs));
    if (!vs.length) continue;
    const ans = new Set(vs.map((v) => `${v.how}/${v.who}`));
    if (ans.size > 1) conflicts.push(key([F[i].id, F[j].id]));
    out.set(key([F[i].id, F[j].id]), { how: vs[0].how, who: vs[0].who, rule: vs[0].rule });
  }
  return { proven: out, conflicts };
}

const cases = [];
const layoutN = {}, posStats = { bag: {}, courier: {}, visitor: {} };
const timeTrue = {}, timeLook = {}, bookTrue = {}, bookLook = {}, stopTrue = {}, stopLook = {}, dtTrue = {}, dtLook = {};
const templates = new Map(); // template -> {bag, courier, visitor}
const R6 = { pairsAccepted: 0, pairsProven: 0, rejectedChecked: 0, byLayout: {}, byRule: {} };
const RR2 = { pickupWording: { morning: 0, afternoon: 0, bad: 0 }, identityOk: 0, rulesShown: 0 };
const R5 = { attendanceRecords: 0, attendanceBad: 0, whoHowCases: 0, whoHowBad: 0 };
const R3b = { closedProtoTickets: {}, repairPickups: {} };
for (let seed = from; seed <= to; seed++) {
  if (RESERVED(seed)) continue;
  const C = G.generate(seed), V = G.views(C), X = C.secret, Q = parse(V);
  inc(layoutN, X.layout);
  // 1. solver
  const r = solve(V);
  if (r.thefts !== 1) say(`seed ${seed}: solver finds ${r.thefts} unexplained moments`);
  else {
    if (r.layout !== X.layout) say(`seed ${seed}: solver layout ${r.layout} vs ${X.layout}`);
    if (r.who !== X.who) say(`seed ${seed}: solver who ${r.who} vs ${X.who}`);
    if (r.flag1 !== X.flag1 || r.flag2 !== X.flag2) say(`seed ${seed}: solver flags differ`);
    if (JSON.stringify(r.pairs) !== JSON.stringify(srt(X.pairs))) say(`seed ${seed}: solver evidence pairs differ`);
  }
  // 2. independent truth check from internals
  const ev = X.events, hwRows = Q.hwRows, cal = Q.cal;
  const kinds = { S: 0, C: 0, V: 0 }; ev.forEach((e) => kinds[e.kind]++);
  if (Object.values(kinds).some((n) => n < 2) || new Set(Object.values(kinds)).size !== 1) say(`seed ${seed}: kinds unbalanced ${JSON.stringify(kinds)}`);
  if (ev.filter((e) => e.isTrue).length !== 1) say(`seed ${seed}: not exactly one disappearance`);
  if (hwRows.length !== ev.length || new Set(ev.map((e) => e.hwRow)).size !== ev.length) say(`seed ${seed}: Hardware rows do not match events`);
  const hwStops = cal.flatMap((c) => c.route.filter((s) => s.place === G.HW_STOP).map((s) => s.t));
  if (V.assets.rows.filter((a) => a.cells[1] === G.PROTO).length !== 1) say(`seed ${seed}: prototype listed more than once`);
  // studio rules: one Hardware booking per person, nobody double-booked
  const hwBy = {}; cal.filter((c) => c.room === G.HW).forEach((c) => { if (c.people.length !== 1) say(`seed ${seed}: Hardware booking with ${c.people.length} people`); inc(hwBy, c.people[0]); });
  if (Object.values(hwBy).some((n) => n > 1)) say(`seed ${seed}: someone has two Hardware bookings`);
  const perPerson = {}; cal.forEach((c) => c.people.forEach((p) => (perPerson[p] ||= []).push(c)));
  for (const [p, xs] of Object.entries(perPerson)) { xs.sort((a, b) => a.start - b.start); for (let i = 1; i < xs.length; i++) if (xs[i].start < xs[i - 1].end) say(`seed ${seed}: ${p} is double-booked`); }
  ev.forEach((e) => {
    if (e.t <= Q.lastSeen + 15) say(`seed ${seed}: event before the Friday shelf check`);
    const booked = cal.some((c) => c.room === G.HW && c.people.includes(e.person) && c.start <= e.t && e.t <= c.end);
    const tourAt = hwStops.some((s) => Math.abs(s - e.t) <= 5);
    let harmful;
    if (e.kind === 'S') harmful = !booked;
    else if (e.kind === 'C') { const tk = V.tickets.rows.find((t) => t.id === e.ticket); harmful = tk.cells[3] !== '—' || tk.cells[1] === G.PROTO; if (!booked) say(`seed ${seed}: courier fetcher has no packing booking`); }
    else { harmful = tourAt; if (!booked) say(`seed ${seed}: tour-time staff not booked`); }
    if (e.kind !== 'V' && tourAt) say(`seed ${seed}: ${e.kind} event coincides with a tour at the Hardware room`);
    if (e.kind === 'S' && e.isTrue && !cal.some((c) => c.room !== G.HW && c.people.includes(e.person) && c.start <= e.t && e.t <= c.end)) say(`seed ${seed}: culprit has no other meeting at the time`);
    if (harmful !== e.isTrue) say(`seed ${seed}: ${e.kind} event at ${e.t} ${e.isTrue ? 'is true but looks harmless' : 'is a look-alike but is not harmless'}`);
    // 5. timing distributions
    const h = Math.floor(e.t / 60);
    inc(e.isTrue ? timeTrue : timeLook, `${e.kind}:${h}`); inc(e.isTrue ? timeTrue : timeLook, `all:${h}`);
  });
  if (hwStops.length !== kinds.V) say(`seed ${seed}: each tour must pass the Hardware room exactly once`);
  ev.forEach((e) => {
    if (e.kind === 'S') {
      const b = cal.find((c) => c.room === G.HW && c.people.includes(e.person));
      inc(e.isTrue ? bookTrue : bookLook, Math.floor(b.start / 60));
    }
  });
  const trueEv = ev.find((e) => e.isTrue);
  const tours = cal.filter((c) => c.route.length).map((c) => {
    const i = c.route.findIndex((s) => s.place === G.HW_STOP);
    const isTrueTour = X.layout === 'visitor' && Math.abs(c.route[i].t - trueEv.t) <= 5;
    inc(isTrueTour ? stopTrue : stopLook, `${c.route.length}:${i}`);
    inc(isTrueTour ? dtTrue : dtLook, Math.floor(c.route[i].t / 60));
    return { c, i, s: c.route[i].t, isTrue: isTrueTour, visitor: c.title.slice('Studio tour: '.length, c.title.lastIndexOf(' (')) };
  });
  // 3. culprit position uniformity
  const opts = C.whoOptions.filter((o) => o.group === { bag: 'Staff', courier: 'Couriers', visitor: 'Visitors' }[X.layout]);
  const idx = opts.findIndex((o) => o.id === X.who);
  if (idx < 0) say(`seed ${seed}: culprit not in options`);
  inc(posStats[X.layout], 'o' + Math.floor((4 * idx) / opts.length)); for (let q = 0; q < opts.length; q++) inc(posStats[X.layout], 'e' + Math.floor((4 * q) / opts.length), 1 / opts.length);
  // 4. identities
  const firsts = [...C.staff.map((s) => s.name), ...C.visitors.map((v) => v.name), C.me, C.partner.contact].map((n) => n.split(' ')[0]);
  if (new Set(firsts).size !== firsts.length) say(`seed ${seed}: repeated first names`);
  for (const [lab, xs] of [['tags', V.assets.rows.map((a) => a.cells[0])], ['refs', V.tickets.rows.map((t) => t.cells[0])], ['badges', V.visitors.rows.map((v) => v.cells[5])], ['courier refs', V.courier.rows.map((k) => k.cells[3].split(' ')[0])]]) if (new Set(xs).size !== xs.length) say(`seed ${seed}: repeated ${lab}`);
  for (const p of X.pairs) if (p.length !== 2 || p[0] === p[1] || !p.every(Boolean)) say(`seed ${seed}: bad evidence pair`);
  if (new Set(X.pairs.map(key)).size !== X.pairs.length) say(`seed ${seed}: repeated evidence pair`);

  // R5a. who/how: the who option group fixes how, in every case
  R5.whoHowCases++;
  const whoGroup = C.whoOptions.find((o) => o.id === X.who).group;
  if (G.GROUP_HOW[whoGroup] !== X.how) { R5.whoHowBad++; say(`seed ${seed}: who group ${whoGroup} does not fix how ${X.how}`); }
  // R5b. attendance: every Friday record of a staff member falls inside their badge-in .. badge-out
  const inOut = {}; Q.door.forEach((d) => { if (d.door === 'Main entrance') (inOut[d.person] ||= {}).in = d.t; if (d.door === 'Main exit') (inOut[d.person] ||= {}).out = d.t; });
  const att = (p, a, b, what) => { if (!inOut[p]) return; R5.attendanceRecords++; if (a < inOut[p].in || b > inOut[p].out) { R5.attendanceBad++; say(`seed ${seed}: ${p} has a ${what} at ${G.hm(a)} outside their badge-in/out`); } };
  Q.door.forEach((d) => att(d.person, d.t, d.t, `${d.door} row`));
  Q.chat.forEach((m) => att(m.who, m.t, m.t, 'chat message'));
  Q.courier.forEach((k) => att(k.staff, k.t, k.t, `courier ${k.type.toLowerCase()}`));
  Q.cal.forEach((c) => c.people.forEach((p) => att(p, c.start, c.end, 'calendar entry')));
  Q.visitors.forEach((v) => att(v.host, v.in, v.out, 'hosted visit'));
  att(Q.friCheckBy, Q.friCheckT, Q.friCheckT, 'shelf check');
  // R5c. neutral ticket wording
  if (V.courier.rows.some((k) => /earlier/i.test(k.cells[3])) || V.mail.rows.some((m) => /earlier ticket/i.test(m.cells[5]))) say(`seed ${seed}: ticket wording calls one ticket "earlier"`);
  // Round 2, point 2: the request's time-of-day word matches the pickup (before 12:00 morning, else afternoon)
  for (const k of Q.courier.filter((x) => x.ref2)) {
    const m = V.mail.rows.find((r) => r.cells[5].includes(`repair ticket ${k.ref} `));
    const w = m && /on Friday (morning|afternoon)/.exec(m.cells[5]);
    const want = k.t < 720 ? 'morning' : 'afternoon';
    if (!w || w[1] !== want) { RR2.pickupWording.bad++; say(`seed ${seed}: request for ${k.ref} says "${w ? w[1] : 'no time word'}" but the pickup is at ${G.hm(k.t)}`); } else RR2.pickupWording[want]++;
  }
  // Round 2, point 3: every rule the prover uses is shown to the player in the intro
  if (C.rules.length === 6 && C.rules.every((r) => C.intro.includes(`<b>${r.title}.</b>`))) RR2.rulesShown++; else say(`seed ${seed}: intro does not show every studio rule`);

  // R6. evidence: proven pairs == accepted pairs; each rejected pair fails the prover and has a reason
  const { proven, conflicts } = provePairs(Q);
  conflicts.forEach((k) => say(`seed ${seed}: pair ${k} proves two different answers under the displayed rules`));
  const acc = new Set(X.pairs.map(key));
  R6.pairsAccepted += acc.size; R6.pairsProven += proven.size;
  inc(R6.byLayout, `${X.layout}:${acc.size}`);
  for (const [k, cl] of proven) if (acc.has(k)) inc(R6.byRule, `${X.layout}: ${cl.rule} [${k.split('|').map((id) => id.replace(/\d+/, '')).sort().join('+')}]`);
  for (const [k, cl] of proven) {
    if (!acc.has(k)) say(`seed ${seed}: pair ${k} proves "${cl.how} / ${cl.who}" (${cl.rule}) but is not accepted`);
    else if (cl.how !== X.how || cl.who !== X.who) say(`seed ${seed}: accepted pair ${k} proves the wrong answer ${cl.how}/${cl.who}`);
  }
  for (const k of acc) if (!proven.has(k)) say(`seed ${seed}: accepted pair ${k} is not logically sufficient on its own`);
  for (const rj of X.rejected) {
    R6.rejectedChecked++;
    const k = key(rj.pair);
    if (acc.has(k) || proven.has(k)) say(`seed ${seed}: rejected pair ${k} is accepted or provable`);
    if (!rj.reason || rj.reason.length < 25) say(`seed ${seed}: rejected pair ${k} has no stated reason`);
  }

  // R3a. unused Hardware bookings (no Hardware row of the owner inside the booking)
  const hwBooks = cal.filter((c) => c.room === G.HW);
  const unused = hwBooks.filter((b) => !hwRows.some((d) => d.person === b.people[0] && b.start <= d.t && d.t <= b.end));
  const cancelled = (b) => Q.chat.some((m) => m.who === b.people[0] && m.text.includes(b.title) && m.text.includes(G.hm(b.start)) && /Cancelled my|Moving my|for me today/.test(m.text));
  const unusedOpen = unused.filter((b) => !cancelled(b));
  // Round 2, point 1: single count statistics, and the identity that ties the unused count to two plain counts
  const hwPeople = new Set(hwRows.map((d) => d.person)).size, nCancel = hwBooks.filter(cancelled).length;
  const isBag = X.layout === 'bag' ? 1 : 0;
  if (unused.length - (hwBooks.length - hwPeople) === isBag && hwBooks.length - unused.length === hwPeople - isBag) RR2.identityOk++;
  else say(`seed ${seed}: unused-booking identity does not hold`);
  const counts = {
    'Hardware bookings': hwBooks.length, 'Hardware door rows': hwRows.length, 'people in Hardware rows': hwPeople,
    'bookings minus people in Hardware rows': hwBooks.length - hwPeople, 'same, not cancelled': hwBooks.length - hwPeople - nCancel,
    'cancelled bookings': nCancel, 'staff': V.directory.rows.length, 'staff never in Hardware room': V.directory.rows.length - hwPeople,
    'calendar entries': V.calendar.rows.length, 'chat messages': V.chat.rows.length, 'mails': V.mail.rows.length,
    'courier rows': V.courier.rows.length, 'tickets': V.tickets.rows.length, 'meetings': cal.filter((c) => c.room !== G.HW && !c.route.length).length,
  };
  const countsInfo = { 'unused bookings': unused.length, 'unused, not cancelled': unusedOpen.length };
  // R3b. the ticket log alone and the courier log alone: same structure in every layout
  inc(R3b.closedProtoTickets, `${X.layout}:${Q.tickets.filter((t) => t.item === G.PROTO && t.closed !== '—').length - kinds.C}`);
  inc(R3b.repairPickups, `${X.layout}:${Q.courier.filter((k) => k.ref2).length - kinds.C}`);

  // R1 / relational features: tours (anchors other than the Hardware door rows, which are the intended join)
  const hwStarts = hwBooks.map((b) => b.start), hwEnds = hwBooks.map((b) => b.end);
  const meets = cal.filter((c) => c.room !== G.HW && !c.route.length);
  const otherDoor = Q.door.filter((d) => d.door !== G.HW).map((d) => d.t);
  const tourRel = tours.map((tr) => {
    const s = tr.s, v = Q.visitors.find((x) => x.name === tr.visitor);
    const inside = hwBooks.filter((b) => b.start <= s && s <= b.end);
    const chatT = Q.chat.filter((m) => !(m.who === tr.c.people[0] && m.t === s && /Hardware room/.test(m.text))).map((m) => m.t);
    const f = {
      hbS: nearest(s, hwStarts), hbE: nearest(s, hwEnds), inN: inside.length, inS: inside.length ? clip(s - inside[0].start) : 99, inE: inside.length ? clip(inside[0].end - s) : 99,
      tS: clip(s - tr.c.start), tE: clip(tr.c.end - s), vin: clip(s - v.in), vout: clip(v.out - s), mS: nearest(s, meets.map((x) => x.start)), mE: nearest(s, meets.map((x) => x.end)),
      ch: nearest(s, chatT), ck: nearest(s, Q.courier.map((x) => x.t)), dr: nearest(s, otherDoor), oth: nearest(s, tours.filter((o) => o !== tr).map((o) => o.s)),
      pos: tr.i, len: tr.c.route.length, hr: Math.floor(s / 60),
    };
    // the exact rule from the review: stop between 2 min before and 14 min after any Hardware booking start
    const prox = hwStarts.some((b) => s - b >= -2 && s - b <= 14);
    return { isTrue: tr.isTrue, visitor: tr.visitor, f, prox };
  });
  // Hardware rows: anchors other than calendar/chat/pickups/tour stops (those are the intended joins)
  const deliveries = Q.courier.filter((k) => k.type === 'Delivery').map((k) => k.t);
  const rowRel = hwRows.map((d) => {
    const io = inOut[d.person] || { in: 0, out: 0 };
    const open = Number(/(\d+)/.exec(V.door.rows.find((x) => x.id === d.id).cells[3])[1]);
    return { id: d.id, isTrue: d.id === X.flag1, f: {
      ent: clip(d.t - io.in, 200) >> 3, ext: clip(io.out - d.t, 200) >> 3, open: open >> 2, hw: nearest(d.t, hwRows.filter((o) => o !== d).map((o) => o.t)) >> 2,
      dr: nearest(d.t, Q.door.filter((o) => o.door !== G.HW && o.person !== d.person).map((o) => o.t)) >> 1, dl: nearest(d.t, deliveries) >> 2,
      tS: nearest(d.t, tours.map((o) => o.c.start)) >> 2, tE: nearest(d.t, tours.map((o) => o.c.end)) >> 2,
      vi: nearest(d.t, Q.visitors.map((o) => o.in)) >> 2, vo: nearest(d.t, Q.visitors.map((o) => o.out)) >> 2, ml: nearest(d.t, Q.mailFri) >> 2, hr: Math.floor(d.t / 60),
    } };
  });

  // collect records for 6 and 7
  const names = [...C.staff.map((s) => s.name), ...C.visitors.map((v) => v.name), C.partner.contact, ...C.couriers, ...C.visitors.map((v) => v.company), C.partner.name, C.me];
  const firstNames = names.slice(0, C.staff.length + C.visitors.length + 1).map((n) => n.split(' ')[0]).concat(C.me.split(' ')[0]);
  const recs = [];
  LOGS.forEach((log) => V[log].rows.forEach((row, i, all) => recs.push({ log, id: row.id, cells: row.cells, text: row.cells.join(' | '), i, n: all.length, kind: kindOf(log, row.cells) })));
  const caseText = recs.map((r) => r.text).join('\n');
  const ent = new Map();
  const ids = caseText.match(/\b[A-Z]{1,3}-\d{2,6}\b/g) || [];
  ids.forEach((x) => ent.set(x, (ent.get(x) || 0) + 1));
  names.forEach((nm) => ent.set(nm, caseText.split(nm).length - 1));
  for (const r of recs) {
    const es = [...ent.keys()].filter((e) => r.text.includes(e)).map((e) => ent.get(e));
    r.repMax = es.length ? Math.min(12, Math.max(...es)) : 0; r.repMin = es.length ? Math.min(12, Math.min(...es)) : 0;
    // 6. normalised template
    let norm = r.text; for (const nm of names) norm = norm.split(nm).join('N'); for (const f of firstNames) norm = norm.split(f).join('N');
    norm = `${r.log}|${norm.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g, 'W').replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, 'M').replace(/\d/g, '9')}`;
    r.norm = norm;
  }
  new Set(recs.map((r) => r.norm)).forEach((tpl) => { if (!templates.has(tpl)) templates.set(tpl, { bag: 0, courier: 0, visitor: 0 }); templates.get(tpl)[X.layout]++; });
  cases.push({ seed, X, C, recs, names: C.whoOptions, k: kinds.V, nStaff: C.staff.length, nHw: hwRows.length, tourRel, rowRel, unused: unused.map((b) => b.people[0]), unusedOpen: unusedOpen.map((b) => b.people[0]), counts, countsInfo });
}
const nCases = cases.length;

// 3. balance
for (const l of G.LAYOUTS) if (Math.abs((layoutN[l] || 0) / nCases - 1 / 3) > 0.025) say(`layout ${l} rate ${((layoutN[l] || 0) / nCases).toFixed(3)}`);
for (const l of G.LAYOUTS) { const tot = layoutN[l] || 0; for (let q = 0; q < 4; q++) { const o = posStats[l]['o' + q] || 0, e = posStats[l]['e' + q] || 0; if (tot > 300 && Math.abs(o - e) / tot > 0.04) say(`layout ${l}: culprit list quarter ${q} observed ${(o / tot).toFixed(3)} expected ${(e / tot).toFixed(3)}`); } }
// 5. timing
const tvAll = tv(Object.fromEntries(Object.entries(timeTrue).filter(([k]) => k.startsWith('all'))), Object.fromEntries(Object.entries(timeLook).filter(([k]) => k.startsWith('all'))));
const tvBook = tv(bookTrue, bookLook), tvStop = tv(stopTrue, stopLook), tvStopHour = tv(dtTrue, dtLook);
if (tvAll > 0.05) say(`true event hour distribution differs from look-alikes (TV ${tvAll.toFixed(3)})`);
for (const kd of ['S', 'C', 'V']) { const a = {}, b = {}; for (const [k, v] of Object.entries(timeTrue)) if (k.startsWith(kd + ':')) a[k] = v; for (const [k, v] of Object.entries(timeLook)) if (k.startsWith(kd + ':')) b[k] = v; const d = tv(a, b); if (d > 0.07) say(`kind ${kd}: true hour distribution TV ${d.toFixed(3)}`); }
if (tvBook > 0.07) say(`Hardware booking hour of the culprit differs (TV ${tvBook.toFixed(3)})`);
if (tvStop > 0.07) say(`Hardware stop position in true tours differs (TV ${tvStop.toFixed(3)})`);
if (tvStopHour > 0.07) say(`Hardware stop hour in true tours differs (TV ${tvStopHour.toFixed(3)})`);
// 6. single-record oracle
let worstTpl = { share: 0 };
for (const [tpl, c] of templates) {
  const tot = c.bag + c.courier + c.visitor; if (tot < 30) continue;
  const share = Math.max(c.bag, c.courier, c.visitor) / tot;
  if (share > worstTpl.share) worstTpl = { share, tpl, tot };
  const z = (Math.max(c.bag, c.courier, c.visitor) - tot / 3) / Math.sqrt(tot * 2 / 9);
  if (share > 0.5 && z > 4.5) say(`record template concentrated in one layout (${(share * 100).toFixed(0)}% of ${tot}): ${tpl.slice(0, 120)}`);
}

// 7. classifiers
const split = cases[Math.floor(nCases * 0.8)].seed;
const train = cases.filter((c) => c.seed < split), test = cases.filter((c) => c.seed >= split);
function recFeatures(r) {
  const p = `${r.log}:${r.kind}`;
  return [`L:${p}`, `pos:${p}:${Math.floor((10 * r.i) / r.n)}`, `abs:${r.log}:${Math.min(r.i, 40)}`, `hr:${p}:${timeOf(r.cells)}`, `len:${p}:${r.text.length >> 3}`,
    `ids:${p}:${(r.text.match(/\b[A-Z]{1,3}-\d+\b/g) || []).map(shape).join(',')}`, `rmax:${p}:${r.repMax}`, `rmin:${p}:${r.repMin}`, `n:${r.log}:${r.n}`,
    // within-row combinations, so a naive classifier can still see joint patterns inside one record
    `rr:${p}:${r.repMax}:${r.repMin}`, `rl:${p}:${r.repMax}:${r.text.length >> 4}`, `hp:${p}:${timeOf(r.cells)}:${Math.floor((5 * r.i) / r.n)}`];
}
const recText = (r) => tokens(r.text).map((w) => `${r.log}:${w}`).concat([`L:${r.log}:${r.kind}`]);
// multinomial NB, multi-class
function nbMulti(trainX, trainY, classes) {
  const cnt = {}, tot = {}, prior = {}, vocab = new Set();
  classes.forEach((c) => { cnt[c] = new Map(); tot[c] = 0; prior[c] = 0; });
  trainX.forEach((fs, i) => { const y = trainY[i]; prior[y]++; for (const f of fs) { cnt[y].set(f, (cnt[y].get(f) || 0) + 1); tot[y]++; vocab.add(f); } });
  const V = vocab.size, N = trainX.length;
  return (fs) => { let best = null, bs = -Infinity; for (const c of classes) { let s = Math.log(prior[c] / N); for (const f of fs) s += Math.log(((cnt[c].get(f) || 0) + 1) / (tot[c] + V)); if (s > bs) { bs = s; best = c; } } return best; };
}
function layoutTest(featFn, label) {
  const pred = nbMulti(train.map(featFn), train.map((c) => c.X.layout), G.LAYOUTS);
  let ok = 0; const cnt = {}; test.forEach((c) => { ok += pred(featFn(c)) === c.X.layout; inc(cnt, c.X.layout); });
  const acc = ok / test.length, base = Math.max(...Object.values(cnt)) / test.length;
  if (acc > base + 0.10) say(`${label}: layout accuracy ${acc.toFixed(3)} > prior ${base.toFixed(3)} + 0.10`);
  return { acc: +acc.toFixed(3), base: +base.toFixed(3) };
}
// binary NB scorer for picking one item per case
function nbPick(trainItems, featFn) {
  const cnt = [new Map(), new Map()], tot = [0, 0], vocab = new Set();
  trainItems.forEach(({ x, y }) => { for (const f of featFn(x)) { cnt[y].set(f, (cnt[y].get(f) || 0) + 1); tot[y]++; vocab.add(f); } });
  const V = vocab.size;
  return (x) => { let s = 0; for (const f of featFn(x)) s += Math.log(((cnt[1].get(f) || 0) + 1) / (tot[1] + V)) - Math.log(((cnt[0].get(f) || 0) + 1) / (tot[0] + V)); return s; };
}
function pickTest(candFn, isTarget, groupOf, featFn, label, tr = train, te = test) {
  const items = []; tr.forEach((c) => candFn(c).forEach((x) => items.push({ x, y: isTarget(c, x) ? 1 : 0 })));
  const score = nbPick(items, featFn);
  let ok = 0, chance = 0; const groupHit = {};
  te.forEach((c) => {
    const cs = candFn(c); let best = null, bs = -Infinity;
    cs.forEach((x) => { const s = score(x); if (s > bs) { bs = s; best = x; } });
    ok += isTarget(c, best) ? 1 : 0; chance += 1 / cs.length;
    const gs = {}; cs.forEach((x) => { const g = groupOf(x); (gs[g] ||= { n: 0, hit: 0 }); gs[g].n++; if (isTarget(c, x)) gs[g].hit = 1; });
    for (const [g, v] of Object.entries(gs)) inc(groupHit, g, v.hit / v.n);
  });
  const acc = ok / te.length, ch = chance / te.length, prior = Math.max(...Object.values(groupHit)) / te.length, base = Math.max(ch, prior);
  if (acc > base + 0.10) say(`${label}: accuracy ${acc.toFixed(3)} > baseline ${base.toFixed(3)} + 0.10`);
  return { acc: +acc.toFixed(3), chance: +ch.toFixed(3), prior: +prior.toFixed(3) };
}
const caseText = (c) => c.recs.flatMap(recText);
const caseFeat = (c) => c.recs.flatMap(recFeatures);
const R = {};
R.layoutText = layoutTest(caseText, 'text classifier');
R.layoutFeat = layoutTest(caseFeat, 'record-feature classifier');
// the same classifier on one log at a time, so a leak in a small log is not diluted by the rest
const perLog = {};
for (const log of LOGS) perLog[log] = layoutTest((c) => c.recs.filter((r) => r.log === log).flatMap(recFeatures), `record-feature classifier on ${log} only`).acc;
R.layoutFeatWorstLog = Object.entries(perLog).sort((a, b) => b[1] - a[1])[0];
const perLogText = {};
for (const log of LOGS) perLogText[log] = layoutTest((c) => c.recs.filter((r) => r.log === log).flatMap(recText), `text classifier on ${log} only`).acc;
R.layoutTextWorstLog = Object.entries(perLogText).sort((a, b) => b[1] - a[1])[0];
const flagCands = (c) => c.recs.filter((r) => isFlaggable(r.log, r.cells)).map((r) => ({ c, r }));
const grpRow = ({ r }) => `${r.log}:${r.kind}`;
for (const f of ['flag1', 'flag2']) {
  R[`${f}Text`] = pickTest(flagCands, (c, x) => x.r.id === c.X[f], grpRow, ({ r }) => recText(r), `text classifier ${f}`);
  R[`${f}Feat`] = pickTest(flagCands, (c, x) => x.r.id === c.X[f], grpRow, ({ r }) => recFeatures(r), `record-feature classifier ${f}`);
}
// person: features of every record that mentions the candidate
const personCands = (c) => c.names.map((o) => ({ c, o, recs: c.recs.filter((r) => r.text.includes(o.id)) }));
const personText = ({ o, recs }) => [`G:${o.group}`, ...recs.flatMap(recText)];
const personFeat = ({ o, recs }) => { const per = {}; recs.forEach((r) => inc(per, `${r.log}:${r.kind}`)); return [`G:${o.group}`, `n:${o.group}:${Math.min(recs.length, 20)}`, ...Object.entries(per).map(([k, v]) => `c:${k}:${Math.min(v, 6)}`), ...recs.flatMap(recFeatures)]; };
R.whoText = pickTest(personCands, (c, x) => x.o.id === c.X.who, ({ o }) => o.group, personText, 'text classifier person');
R.whoFeat = pickTest(personCands, (c, x) => x.o.id === c.X.who, ({ o }) => o.group, personFeat, 'record-feature classifier person');

/* ---------- R. review round 1 regression checks ---------- */
const RR = {};
const priorOf = (set) => { const cnt = {}; set.forEach((c) => inc(cnt, c.X.layout)); return Math.max(...Object.values(cnt)) / set.length; };
const lim = (label, acc, base) => { if (acc > base + 0.10) say(`${label}: ${acc.toFixed(3)} > prior ${base.toFixed(3)} + 0.10`); return { acc: +acc.toFixed(3), prior: +base.toFixed(3) }; };
const testVis = test.filter((c) => c.X.layout === 'visitor'), trainVis = train.filter((c) => c.X.layout === 'visitor');
const pPrior = (set) => set.reduce((a, c) => a + 1 / c.k, 0) / set.length;

// R1a. the exact calendar-proximity rule from the review
{
  const acc = test.reduce((a, c) => a + ((c.tourRel.some((t) => t.prox) ? 'visitor' : 'courier') === c.X.layout ? 1 : 0), 0) / test.length;
  RR.proxLayout = lim('R1 calendar-proximity rule, layout', acc, priorOf(test));
  const pa = testVis.reduce((a, c) => { const t = c.tourRel.find((x) => x.prox); return a + (t ? (t.isTrue ? 1 : 0) : 1 / c.k); }, 0) / testVis.length;
  RR.proxPerson = lim('R1 calendar-proximity rule, first matching visitor', pa, pPrior(testVis));
  RR.proxFires = +(test.reduce((a, c) => a + (c.tourRel.some((t) => t.prox) ? 1 : 0), 0) / test.length).toFixed(3);
}
// R1b. every single timing relation of a tour, every interval: "a tour in [lo, hi] -> visitor"
{
  const FEATS = Object.keys(cases[0].tourRel[0].f);
  const val = (t, f) => (Math.abs(t.f[f]) >= 99 ? 99 : t.f[f] >> 1); // 2-minute buckets, 99 = none
  let best = { acc: 0 }, bestP = { acc: 0 };
  for (const f of FEATS) {
    const vals = [...new Set(train.flatMap((c) => c.tourRel.map((t) => val(t, f))))].sort((a, b) => a - b);
    if (vals.length > 70) continue;
    for (let i = 0; i < vals.length; i++) for (let j = i; j < vals.length; j++) {
      const lo = vals[i], hi = vals[j], hit = (t) => { const v = val(t, f); return v >= lo && v <= hi; };
      let ok = 0; for (const c of train) ok += ((c.tourRel.some(hit) ? 'visitor' : 'courier') === c.X.layout) ? 1 : 0;
      if (ok / train.length > best.acc) best = { acc: ok / train.length, f, lo, hi, hit };
      let okp = 0; for (const c of trainVis) { const t = c.tourRel.find(hit); okp += t ? (t.isTrue ? 1 : 0) : 1 / c.k; }
      if (okp / trainVis.length > bestP.acc) bestP = { acc: okp / trainVis.length, f, lo, hi, hit };
    }
  }
  const acc = test.reduce((a, c) => a + ((c.tourRel.some(best.hit) ? 'visitor' : 'courier') === c.X.layout ? 1 : 0), 0) / test.length;
  RR.tourInterval = { ...lim(`R1 best single tour timing interval (${best.f} ${best.lo * 2}..${best.hi * 2 + 1})`, acc, priorOf(test)), rule: `${best.f} ${best.lo * 2}..${best.hi * 2 + 1}` };
  const pa = testVis.reduce((a, c) => { const t = c.tourRel.find(bestP.hit); return a + (t ? (t.isTrue ? 1 : 0) : 1 / c.k); }, 0) / testVis.length;
  RR.tourIntervalPerson = { ...lim(`R1 best single tour timing interval, person (${bestP.f})`, pa, pPrior(testVis)), rule: `${bestP.f} ${bestP.lo * 2}..${bestP.hi * 2 + 1}` };
}
// R1c. combinations: Naive Bayes over every feature AND every pair of features (joint 6-min buckets)
{
  const FEATS = Object.keys(cases[0].tourRel[0].f);
  const b6 = (v) => (Math.abs(v) >= 99 ? 'x' : Math.floor(v / 6));
  const feats = (t) => { const o = FEATS.map((f) => `${f}:${b6(t.f[f])}`); for (let i = 0; i < FEATS.length; i++) for (let j = i + 1; j < FEATS.length; j++) o.push(`${FEATS[i]}*${FEATS[j]}:${b6(t.f[FEATS[i]])}:${b6(t.f[FEATS[j]])}`); return o; };
  const tc = (c) => c.tourRel.map((t) => ({ c, t }));
  RR.tourPairNBperson = pickTest(tc, (c, x) => x.t.isTrue, () => 'tour', ({ t }) => feats(t), 'R1 pairwise tour-timing NB, person', trainVis, testVis);
  // layout from the best tour score: train the scorer on visitor cases, threshold on all training cases
  const items = []; trainVis.forEach((c) => c.tourRel.forEach((t) => items.push({ x: t, y: t.isTrue ? 1 : 0 })));
  const score = nbPick(items, feats);
  const mx = (c) => Math.max(...c.tourRel.map(score));
  const ths = [...new Set(train.map(mx))].sort((a, b) => a - b).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 200)) === 0);
  let bt = { acc: 0 };
  for (const th of ths) { let ok = 0; for (const c of train) ok += ((mx(c) > th ? 'visitor' : 'courier') === c.X.layout) ? 1 : 0; if (ok / train.length > bt.acc) bt = { acc: ok / train.length, th }; }
  const acc = test.reduce((a, c) => a + ((mx(c) > bt.th ? 'visitor' : 'courier') === c.X.layout ? 1 : 0), 0) / test.length;
  RR.tourPairNBlayout = lim('R1 pairwise tour-timing NB, layout', acc, priorOf(test));
}
// R1d. Hardware-row timing relations (entrance/exit, other rows, open seconds, other doors, deliveries,
// tours' start/end, visitor sign-in/out, Friday mail), single features and pairs
{
  const FEATS = Object.keys(cases[0].rowRel[0].f);
  const feats = (r) => { const o = FEATS.map((f) => `${f}:${r.f[f]}`); for (let i = 0; i < FEATS.length; i++) for (let j = i + 1; j < FEATS.length; j++) o.push(`${FEATS[i]}*${FEATS[j]}:${r.f[FEATS[i]]}:${r.f[FEATS[j]]}`); return o; };
  RR.rowPairNBflag1 = pickTest((c) => c.rowRel.map((r) => ({ c, r })), (c, x) => x.r.isTrue, () => 'row', ({ r }) => feats(r), 'R1 pairwise Hardware-row timing NB, flag 1');
}
// R3a. unused Hardware bookings
{
  const binAcc = (set, rule) => set.reduce((a, c) => a + ((rule(c) ? 'bag' : 'other') === (c.X.layout === 'bag' ? 'bag' : 'other') ? 1 : 0), 0) / set.length;
  const binPrior = (set) => { const b = set.filter((c) => c.X.layout === 'bag').length / set.length; return Math.max(b, 1 - b); };
  const triAcc = (set, rule) => set.reduce((a, c) => a + ((rule(c) ? 'bag' : 'courier') === c.X.layout ? 1 : 0), 0) / set.length;
  const anyU = (c) => c.unused.length > 0, anyO = (c) => c.unusedOpen.length > 0;
  RR.unusedAnyBinary = lim('R3a unused booking exists -> bag (bag vs not)', binAcc(test, anyU), binPrior(test));
  RR.unusedAny = lim('R3a unused booking exists -> bag', triAcc(test, anyU), priorOf(test));
  RR.unusedOpenAnyBinary = lim('R3a unused, not-cancelled booking exists -> bag (bag vs not)', binAcc(test, anyO), binPrior(test));
  RR.unusedPresentShare = +(cases.filter(anyU).length / nCases).toFixed(3);
  const countRule = (fn, label) => {
    const tab = {}; train.forEach((c) => { (tab[fn(c)] ||= {}); inc(tab[fn(c)], c.X.layout); });
    const map = Object.fromEntries(Object.entries(tab).map(([k, v]) => [k, Object.entries(v).sort((a, b) => b[1] - a[1])[0][0]]));
    const acc = test.reduce((a, c) => a + ((map[fn(c)] || 'courier') === c.X.layout ? 1 : 0), 0) / test.length;
    return lim(label, acc, priorOf(test));
  };
  RR.unusedCount = countRule((c) => c.unused.length, 'R3a number of unused bookings -> layout');
  RR.unusedOpenCount = countRule((c) => c.unusedOpen.length, 'R3a number of unused, not-cancelled bookings -> layout');
  RR.unusedCountPerStaff = countRule((c) => `${c.unusedOpen.length}:${c.nStaff - c.nHw}`, 'R3a unused not-cancelled count x staff without a Hardware row -> layout');
  // person (info, intended reasoning once the owner's door rows are looked at, see DESIGN-family3.md)
  const bagT = test.filter((c) => c.X.layout === 'bag');
  RR.unusedOwnerPersonInfo = { acc: +(bagT.reduce((a, c) => a + (c.unusedOpen.includes(c.X.who) ? 1 / c.unusedOpen.length : 0), 0) / bagT.length).toFixed(3), prior: +(bagT.reduce((a, c) => a + 1 / c.nStaff, 0) / bagT.length).toFixed(3) };
}
// R3b. single logs carry no courier signal: closed prototype tickets and repair pickups are exactly k per case
{
  const bad = (o) => Object.keys(o).filter((k) => !k.endsWith(':0'));
  if (bad(R3b.closedProtoTickets).length) say(`R3b closed prototype tickets per case vary with the layout: ${JSON.stringify(R3b.closedProtoTickets)}`);
  if (bad(R3b.repairPickups).length) say(`R3b repair pickups per case vary with the layout: ${JSON.stringify(R3b.repairPickups)}`);
  RR.closedTicketJoin = { intended: 'pickup row + ticket row', courierLogOnly: perLog.courier, ticketLogOnly: perLog.tickets };
}
// Round 2, point 1: per-value layout shares of single counts. Among cases with a given value, no layout's
// share may exceed its prior + 10 points (values with at least MIN_N cases; all cases of the range).
// The unused counts are reported, not enforced: unused = (bookings - people in Hardware rows) + [bag] holds
// in every case (checked above), so one of the two counts must carry the +1 (see DESIGN-family3.md, round 2).
{
  const MIN_N = Math.max(150, Math.ceil(0.03 * nCases));
  const prior = Object.fromEntries(G.LAYOUTS.map((l) => [l, (layoutN[l] || 0) / nCases]));
  const perValue = (fn) => {
    const tab = {}; cases.forEach((c) => { const v = fn(c); (tab[v] ||= { n: 0 }); tab[v].n++; inc(tab[v], c.X.layout); });
    let worst = { excess: -1 }; const onlyOne = [];
    for (const [v, t] of Object.entries(tab)) {
      const present = G.LAYOUTS.filter((l) => t[l]);
      if (present.length === 1) onlyOne.push(`${v}→${present[0]} (${t.n})`);
      if (t.n < MIN_N) continue;
      for (const l of G.LAYOUTS) { const ex = (t[l] || 0) / t.n - prior[l]; if (ex > worst.excess) worst = { excess: ex, value: v, layout: l, share: (t[l] || 0) / t.n, n: t.n }; }
    }
    return { worst, onlyOne };
  };
  RR.countValues = { minN: MIN_N, enforced: {}, reported: {} };
  for (const name of Object.keys(cases[0].counts)) {
    const { worst, onlyOne } = perValue((c) => c.counts[name]);
    if (worst.excess > 0.10) say(`R2-1 count "${name}" = ${worst.value}: ${worst.layout} share ${worst.share.toFixed(3)} > prior + 0.10 (${worst.n} cases)`);
    RR.countValues.enforced[name] = `+${(worst.excess * 100).toFixed(1)} pts${onlyOne.length ? `, single-layout values ${onlyOne.join(' ')}` : ''}`;
  }
  for (const name of Object.keys(cases[0].countsInfo)) {
    const { worst, onlyOne } = perValue((c) => c.countsInfo[name]);
    RR.countValues.reported[name] = `worst ${worst.layout} at ${worst.value}: +${(worst.excess * 100).toFixed(1)} pts; single-layout values ${onlyOne.join(' ') || 'none'}`;
  }
}
// R4. flags: no correctness feedback before filing (static check of the game script)
{
  const src = fs.readFileSync(path.join(__dirname, 'gameR3.js'), 'utf8');
  const fr = src.indexOf('function fileReport('), frEnd = src.indexOf('\n  }\n', fr);
  const outside = src.slice(0, fr) + src.slice(frEnd);
  const leaks = [];
  if (/\bsecret\b/.test(outside.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))) leaks.push('C.secret is read outside fileReport()');
  if (/flag1|flag2/.test(outside.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/flag[12]_ok/g, ''))) leaks.push('flag answers referenced outside fileReport()');
  if (/⚑ correct|⚑ wrong|Not that one|Wrong flags/.test(src)) leaks.push('flag feedback strings present');
  if (fr < 0) leaks.push('no fileReport() found');
  leaks.forEach((l) => say(`R4 ${l}`));
  RR.flagFeedback = leaks.length ? leaks : 'none before filing';
  // R5a doc: question wording and the documented dependence
  const doc = fs.readFileSync(path.join(__dirname, 'DESIGN-family3.md'), 'utf8');
  if (!/how is dependent on the who group/i.test(doc)) say('R5 DESIGN-family3.md does not state that how is dependent on the who group');
  if (!/Who carried it out of the building\?/.test(src)) say('R5 report question is not "Who carried it out of the building?"');
  // round 2, point 3: the Case File shows the studio rules
  if (!/C\.rules\.map\(/.test(src.slice(src.indexOf('function renderCase('), src.indexOf('function renderCase(') + 2500))) say('R2-3 the Case File does not render the studio rules');
  if (!/review round 2/i.test(doc)) say('R2 DESIGN-family3.md has no "Review round 2" section');
}

console.log(`Missing prototype check, seeds ${from}..${to} (${nCases} cases, train < ${split} <= test)`);
console.log('layouts:', Object.fromEntries(Object.entries(layoutN).map(([k, v]) => [k, +(v / nCases).toFixed(3)])));
console.log(`timing TV (true vs look-alike): event hour ${tvAll.toFixed(3)}, culprit booking hour ${tvBook.toFixed(3)}, tour stop position ${tvStop.toFixed(3)}, tour stop hour ${tvStopHour.toFixed(3)}`);
console.log(`most layout-concentrated record template: ${(worstTpl.share * 100).toFixed(1)}% of ${worstTpl.tot} cases`);
console.log('classifiers (held out):');
for (const [k, v] of Object.entries(R)) console.log(`  ${k.padEnd(10)} ${JSON.stringify(v)}`);
console.log('review round 1 (held out):');
for (const [k, v] of Object.entries(RR)) console.log(`  ${k.padEnd(22)} ${JSON.stringify(v)}`);
console.log(`  evidence: ${R6.pairsAccepted} accepted pairs, ${R6.pairsProven} provable pairs, ${R6.rejectedChecked} rejected pairs checked; pairs per case ${JSON.stringify(R6.byLayout)}`);
console.log(`  attendance: ${R5.attendanceRecords} staff records checked, ${R5.attendanceBad} outside badge-in/out; who group fixes how in ${R5.whoHowCases - R5.whoHowBad}/${R5.whoHowCases}`);
console.log('review round 2:');
console.log(`  point 1: unused = (bookings - people in Hardware rows) + [bag] in ${RR2.identityOk}/${nCases} cases`);
console.log(`  point 2: repair requests: ${RR2.pickupWording.morning} say morning, ${RR2.pickupWording.afternoon} afternoon, ${RR2.pickupWording.bad} mismatched`);
console.log(`  point 3: rules shown in intro in ${RR2.rulesShown}/${nCases}; accepted pairs by rule (all proven from displayed rules):`);
for (const [k, v] of Object.entries(R6.byRule).sort()) console.log(`    ${k}: ${v}`);
console.log(problems.length ? `PROBLEMS (${problems.length}${problems.length >= 300 ? '+' : ''}):\n  ` + problems.slice(0, 40).join('\n  ') : 'No problems.');
process.exit(problems.length ? 1 : 0);
