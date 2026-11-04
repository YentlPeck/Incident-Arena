/* Checks the generator over many seeds:  node cases/check.js [from] [to]
   1. every case is solvable from visible data and the solver's answer equals the generator's answer
   2. the data is consistent (unique people, valid report ids, evidence pairs, traps)
   3. no cheap shortcuts: answer spread, list positions, how often naive time-reading still works */
'use strict';
const { generate } = require('./gen.js');
const { solve } = require('./solve.js');

const from = Number(process.argv[2] || 1), to = Number(process.argv[3] || 3000);
const problems = [];
const stats = { fp: {}, layouts: {}, twists: {}, whoPos: [], outsider: 0, naiveRight: { clocks: [0, 0], plain: [0, 0] }, mentions: [], firstPick: 0, n: 0 };
const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };

for (let seed = from; seed <= to; seed++) {
  let C;
  try { C = generate(seed); } catch (e) { problems.push(`${seed}: generator crashed: ${e.message}`); continue; }
  stats.n++;
  const S = C.secret;
  bump(stats.layouts, S.layout);
  C.twists.forEach((t) => bump(stats.twists, t));
  if (S.who === 'outsider') stats.outsider++;

  // 1. solvable, one answer, same answer
  const r = solve(C);
  if (!r.ok) problems.push(`${seed} (${S.layout}, ${C.twists}): not solvable: ${r.why}`);
  else {
    const diff = ['who', 'how', 'downloadRow'].filter((k) => r[k] !== S[k]);
    if (r.signin.user !== S.signin.user || r.signin.index !== S.signin.index) diff.push('signin');
    if (diff.length) problems.push(`${seed} (${S.layout}): solver disagrees on ${diff.join(', ')}`);
  }
  // a sloppy player who ignores every clock label
  const nv = solve(C, { naive: true });
  const nvRight = nv.ok && nv.who === S.who && nv.how === S.how;
  const bucket = C.twists.includes('clocks') ? 'clocks' : 'plain';
  stats.naiveRight[bucket][0] += nvRight ? 1 : 0; stats.naiveRight[bucket][1]++;

  // 2. consistency
  const names = C.staff.map((s) => s.name), users = C.staff.map((s) => s.user), handles = C.staff.map((s) => s.handle), pcs = C.staff.map((s) => s.pc);
  [names, users, handles, pcs].forEach((arr) => { if (new Set(arr).size !== arr.length) problems.push(`${seed}: duplicate ${arr[0]}`); });
  const whoIds = C.report.who.map((w) => w[0]), howIds = C.report.how.map((w) => w[0]), evIds = C.report.evidence.map((w) => w[0]);
  if (!whoIds.includes(S.who)) problems.push(`${seed}: secret.who not an option`);
  if (!howIds.includes(S.how)) problems.push(`${seed}: secret.how not an option`);
  S.evidence.forEach((p) => { const ids = p.split('+'); if (ids.length !== 2 || ids.some((x) => !evIds.includes(x)) || [...ids].sort().join('+') !== p) problems.push(`${seed}: bad evidence pair ${p}`); });
  if (C.files.filter((f) => f.flaggable).length !== 1) problems.push(`${seed}: flaggable files != 1`);
  const bf = C.files.find((f) => f.flaggable);
  if (!bf.activity[S.downloadRow] || bf.activity[S.downloadRow].what !== 'Downloaded') problems.push(`${seed}: downloadRow not a download`);
  if (!C.signins.byUser[S.signin.user] || !C.signins.byUser[S.signin.user][S.signin.index]) problems.push(`${seed}: signin row missing`);
  if (C.traps.count) {
    if (C.traps.reportName === S.who) problems.push(`${seed}: trap names the culprit`);
    if (!C.web.pages[C.traps.confirmHost] || !C.web.pages[C.traps.confirmHost].confirm) problems.push(`${seed}: trap confirm page missing`);
  }
  const visible = JSON.stringify({ ...C, secret: undefined, twists: undefined });
  if (/undefined|NaN|\[object/.test(visible.replace(/"(secret|twists)":undefined/g, ''))) problems.push(`${seed}: undefined/NaN in visible data`);
  if (C.badges.rows.some((b) => hmOk(b.t) === false)) problems.push(`${seed}: bad badge time`);
  // one consistent timeline per person: starts in their own room, then alternating in/out of the same door, never two places at once
  const evs = {};
  C.badges.rows.forEach((b) => (evs[b.who] = evs[b.who] || []).push(b));
  Object.entries(evs).forEach(([who, list]) => {
    const person = C.staff.find((x) => x.name === who);
    let where = list[0].dir === 'out' ? list[0].door : null;
    if (list[0].dir === 'out' && list[0].door !== person.room) problems.push(`${seed}: ${who} first leaves a room that isn't theirs`);
    list.forEach((b, i) => {
      if (i === 0 && b.dir === 'out') { where = null; return; }
      if (b.dir === 'in') { if (where) problems.push(`${seed}: ${who} enters ${b.door} while in ${where}`); where = b.door; }
      else { if (where !== b.door) problems.push(`${seed}: ${who} leaves ${b.door} without being in it`); where = null; }
    });
    if (where) problems.push(`${seed}: ${who} never leaves ${where}`);
  });
  // structure fingerprint: counts that must not depend on the hidden layout
  const fp = { emails: C.emails.length - (C.twists.includes('noise') ? 3 : 0) - (C.twists.includes('tip') ? 1 : 0), threads: C.web.forum.threads.length, files: C.files.length,
    chats: C.chats.length - (C.twists.includes('noise') ? 1 : 0), whois: Object.keys(C.web.whois).length - (C.traps.count ? 1 : 0), evidence: C.report.evidence.length,
    ownerRoomRows: (() => { const bf = C.files.find((f) => f.flaggable); const own = C.staff.find((x) => x.user === bf.activity[S.downloadRow].acct);
      const n = C.badges.rows.filter((b) => b.door === own.room && b.dir === 'in').length; return Math.min(n, 9); })(),
    clickRows: C.clicks.rows.length, badgeRows: Math.round(C.badges.rows.length / 3) };
  Object.entries(fp).forEach(([k2, v]) => { const key = `${k2}`; (stats.fp[key] = stats.fp[key] || {}); (stats.fp[key][S.layout] = stats.fp[key][S.layout] || new Set()).add(v); });

  // 3. shortcuts: where the culprit sits in the list, how often they are named compared with others
  if (S.who !== 'outsider') {
    stats.whoPos.push(whoIds.indexOf(S.who) / (whoIds.length - 2));
    const culprit = C.staff.find((s) => s.id === S.who);
    const count = (name) => visible.split(name).length - 1;
    const others = C.staff.filter((s) => s !== culprit).map((s) => count(s.name));
    stats.mentions.push(count(culprit.name) - others.reduce((a, b) => a + b, 0) / others.length);
  }
}
function hmOk(t) { const m = /^(\d\d):(\d\d)$/.exec(t); return !!m && Number(m[1]) < 24 && Number(m[2]) < 60; }

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = ([a, b]) => (b ? `${Math.round((100 * a) / b)}% of ${b}` : 'n/a');
console.log(`seeds ${from}..${to}: ${stats.n} cases, ${problems.length} problems`);
console.log('layouts', stats.layouts, '| twists', stats.twists, `| outsider answer ${Math.round((100 * stats.outsider) / stats.n)}%`);
console.log(`culprit position in the who-list (0 = first, 1 = last): mean ${mean(stats.whoPos).toFixed(2)}`);
console.log(`culprit named more often than an average colleague by: ${mean(stats.mentions).toFixed(2)} mentions`);
console.log(`sloppy player who ignores clocks gets who+how right: clocks cases ${pct(stats.naiveRight.clocks)}, other cases ${pct(stats.naiveRight.plain)}`);
Object.entries(stats.fp).forEach(([k2, byLayout]) => {
  const sets = Object.entries(byLayout).map(([l, set]) => `${l}:${[...set].sort((x, y) => x - y).join('/')}`);
  const all = Object.values(byLayout).map((set) => [...set].sort().join('/'));
  console.log(`  ${new Set(all).size === 1 ? 'same' : 'DIFFERS'}  ${k2.padEnd(9)} ${sets.join('  ')}`);
});
problems.slice(0, 25).forEach((p) => console.log('  -', p));
process.exitCode = problems.length ? 1 : 0;
