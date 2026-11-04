/* Family 3 fairness checker. Usage: node cases/check3.js [fromSeed] [toSeed]
   Reserved seeds (never use here): 6001-6055 (test) and 6901-6999 (pilot).
   1. Reference solver (cases/solve3.js, reads only the app tables) agrees with the hidden answer on every
      seed: layout, who, both flags, both evidence pairs; exactly one unexplained Hardware-room moment.
   2. Independent truth check from generator internals: one disappearance per case, every look-alike
      harmless, every kind (staff visit, courier fetch, tour) present at least twice in every case.
   3. Balance: layouts 1/3 each; within a layout the culprit's place in its list is uniform.
   4. Identity rules: unique first names, tags, ticket refs, visitor badges; every Hardware-room row
      belongs to exactly one event.
   5. Timing: the true event's times have the same distribution as look-alike times.
   6. Single-record oracle: no normalised record template is concentrated in one layout.
   7. Naive-Bayes classifiers on (a) rendered text and (b) per-record features (position, time, length,
      id shapes, counts, repeats) predicting the layout, the two flagged rows and the person. Each must
      stay within its baseline (chance or majority prior) + 10 points on held-out seeds. */
'use strict';
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

const cases = [];
const layoutN = {}, posStats = { bag: {}, courier: {}, visitor: {} };
const timeTrue = {}, timeLook = {}, bookTrue = {}, bookLook = {}, stopTrue = {}, stopLook = {}, dtTrue = {}, dtLook = {};
const templates = new Map(); // template -> {bag, courier, visitor}
for (let seed = from; seed <= to; seed++) {
  if (RESERVED(seed)) continue;
  const C = G.generate(seed), V = G.views(C), X = C.secret;
  inc(layoutN, X.layout);
  // 1. solver
  const r = solve(V);
  if (r.thefts !== 1) say(`seed ${seed}: solver finds ${r.thefts} unexplained moments`);
  else {
    if (r.layout !== X.layout) say(`seed ${seed}: solver layout ${r.layout} vs ${X.layout}`);
    if (r.who !== X.who) say(`seed ${seed}: solver who ${r.who} vs ${X.who}`);
    if (r.flag1 !== X.flag1 || r.flag2 !== X.flag2) say(`seed ${seed}: solver flags differ`);
    if (JSON.stringify(r.pairs) !== JSON.stringify(X.pairs)) say(`seed ${seed}: solver evidence pairs differ`);
  }
  // 2. independent truth check from internals
  const ev = X.events, hwRows = V.door.rows.filter((d) => d.cells[1] === 'Hardware room');
  const kinds = { S: 0, C: 0, V: 0 }; ev.forEach((e) => kinds[e.kind]++);
  if (Object.values(kinds).some((n) => n < 2) || new Set(Object.values(kinds)).size !== 1) say(`seed ${seed}: kinds unbalanced ${JSON.stringify(kinds)}`);
  if (ev.filter((e) => e.isTrue).length !== 1) say(`seed ${seed}: not exactly one disappearance`);
  if (hwRows.length !== ev.length || new Set(ev.map((e) => e.hwRow)).size !== ev.length) say(`seed ${seed}: Hardware rows do not match events`);
  const cal = V.calendar.rows.map((c) => { const [a, b] = c.cells[0].split('–'); return { start: toMin(a), end: toMin(b), room: c.cells[2], people: c.cells[3].split(', '), route: c.cells[4] ? c.cells[4].split(' → ').map((x) => ({ t: toMin(x.slice(0, 5)), place: x.slice(6) })) : [] }; });
  const hwStops = cal.flatMap((c) => c.route.filter((s) => s.place === G.HW_STOP).map((s) => s.t));
  const protoTag = V.assets.rows.find((a) => a.cells[1] === G.PROTO).cells[0];
  if (V.assets.rows.filter((a) => a.cells[1] === G.PROTO).length !== 1) say(`seed ${seed}: prototype listed more than once`);
  const lastSeen = toMin(V.checks.rows[1].cells[0].slice(-5));
  ev.forEach((e) => {
    if (e.t <= lastSeen + 15) say(`seed ${seed}: event before the Friday shelf check`);
    const booked = cal.some((c) => c.room === G.HW && c.people.includes(e.person) && c.start <= e.t && e.t <= c.end);
    const tourAt = hwStops.some((s) => Math.abs(s - e.t) <= 5);
    let harmful;
    if (e.kind === 'S') harmful = !booked;
    else if (e.kind === 'C') { const tk = V.tickets.rows.find((t) => t.id === e.ticket); harmful = tk.cells[3] !== '—' || tk.cells[1] === G.PROTO; if (booked) say(`seed ${seed}: courier fetcher also booked`); }
    else { harmful = tourAt; if (!booked) say(`seed ${seed}: tour-time staff not booked`); }
    if (e.kind !== 'V' && tourAt) say(`seed ${seed}: ${e.kind} event coincides with a tour at the Hardware room`);
    if (e.kind === 'S' && e.isTrue && !cal.some((c) => c.room !== G.HW && c.people.includes(e.person) && c.start <= e.t && e.t <= c.end)) say(`seed ${seed}: culprit has no other meeting at the time`);
    if (harmful !== e.isTrue) say(`seed ${seed}: ${e.kind} event at ${e.t} ${e.isTrue ? 'is true but looks harmless' : 'is a look-alike but is not harmless'}`);
    // 5. timing distributions
    const h = Math.floor(e.t / 60);
    inc(e.isTrue ? timeTrue : timeLook, `${e.kind}:${h}`); inc(e.isTrue ? timeTrue : timeLook, `all:${h}`);
  });
  if (hwStops.length !== kinds.V) say(`seed ${seed}: each tour must pass the Hardware room exactly once`);
  // timing of decisive records: Hardware bookings and tour Hardware stops
  ev.forEach((e) => {
    if (e.kind === 'S') {
      const b = cal.find((c) => c.room === G.HW && c.people.includes(e.person));
      inc(e.isTrue ? bookTrue : bookLook, Math.floor(b.start / 60));
    }
  });
  cal.filter((c) => c.route.length).forEach((c) => {
    const i = c.route.findIndex((s) => s.place === G.HW_STOP);
    const isTrueTour = X.layout === 'visitor' && c.route.some((s) => s.place === G.HW_STOP && Math.abs(s.t - ev.find((e) => e.isTrue).t) <= 5);
    inc(isTrueTour ? stopTrue : stopLook, `${c.route.length}:${i}`);
    inc(isTrueTour ? dtTrue : dtLook, Math.floor(c.route[i].t / 60));
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
  if (X.pairs[0].join() === X.pairs[1].join()) say(`seed ${seed}: the two evidence pairs are the same`);

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
  cases.push({ seed, X, C, recs, names: C.whoOptions });
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
function pickTest(candFn, isTarget, groupOf, featFn, label) {
  const items = []; train.forEach((c) => candFn(c).forEach((x) => items.push({ x, y: isTarget(c, x) ? 1 : 0 })));
  const score = nbPick(items, featFn);
  let ok = 0, chance = 0; const groupHit = {};
  test.forEach((c) => {
    const cs = candFn(c); let best = null, bs = -Infinity;
    cs.forEach((x) => { const s = score(x); if (s > bs) { bs = s; best = x; } });
    ok += isTarget(c, best) ? 1 : 0; chance += 1 / cs.length;
    const gs = {}; cs.forEach((x) => { const g = groupOf(x); (gs[g] ||= { n: 0, hit: 0 }); gs[g].n++; if (isTarget(c, x)) gs[g].hit = 1; });
    for (const [g, v] of Object.entries(gs)) inc(groupHit, g, v.hit / v.n);
  });
  const acc = ok / test.length, ch = chance / test.length, prior = Math.max(...Object.values(groupHit)) / test.length, base = Math.max(ch, prior);
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

console.log(`Missing prototype check, seeds ${from}..${to} (${nCases} cases, train < ${split} <= test)`);
console.log('layouts:', Object.fromEntries(Object.entries(layoutN).map(([k, v]) => [k, +(v / nCases).toFixed(3)])));
console.log(`timing TV (true vs look-alike): event hour ${tvAll.toFixed(3)}, culprit booking hour ${tvBook.toFixed(3)}, tour stop position ${tvStop.toFixed(3)}, tour stop hour ${tvStopHour.toFixed(3)}`);
console.log(`most layout-concentrated record template: ${(worstTpl.share * 100).toFixed(1)}% of ${worstTpl.tot} cases`);
console.log('classifiers (held out):');
for (const [k, v] of Object.entries(R)) console.log(`  ${k.padEnd(10)} ${JSON.stringify(v)}`);
console.log(problems.length ? `PROBLEMS (${problems.length}${problems.length >= 300 ? '+' : ''}):\n  ` + problems.slice(0, 40).join('\n  ') : 'No problems.');
process.exit(problems.length ? 1 : 0);
