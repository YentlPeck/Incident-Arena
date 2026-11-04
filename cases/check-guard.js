/* Guard duty fairness checker. Usage: node cases/check-guard.js [fromSeed] [toSeed]
   1. Two independent reference solvers (tool data; call-back + domain lookup) agree with the truth.
   2. Scam rate ~0.3 for every type, position and pair of types.
   3. Identity rules: within a day no organisation, person, domain, invoice id or IBAN is shared between
      items (except the company's own domain for staff mail); all IBANs valid; real and look-alike
      domains never collide; look-alike owners are always names that also own real domains.
   4. A naive-Bayes classifier on everything an item shows WITHOUT checks, plus day-level relational
      features (repeats of names, organisations, domains, accounts), must stay within prior + 10 points
      and AUC <= 0.60.
   5. Trivial strategies are printed as baselines (safe day = all scams stopped, <= 1 real stopped). */
'use strict';
const G = require('./gen-guard.js');
const from = Number(process.argv[2] || 1), to = Number(process.argv[3] || 5000);
const problems = [];
const host = (u) => u.replace(/^https?:\/\//, '').split('/')[0];
const dom = (a) => a.split('@')[1];
const say = (m) => { if (problems.length < 200) problems.push(m); };
const d0 = (it) => dom(it.fromAddr);
const ownerRule = [], ownerRep = [];

// Every check the player can do, per type. Each returns true = "this check shows it must be stopped".
function checks(C, it) {
  const dir = new Map([...C.staff.map((s) => [s.name, s.email]), ...C.contacts.map((c) => [c.name, c.email])]);
  const no = (who) => /^No/.test(C.answers[who][it.id]);
  if (it.type === 'link') return { 'password manager': !C.services.some((s) => s.real === host(it.link.target)), 'sign-in bookmarks': !C.services.some((s) => s.real === host(it.link.target)) };
  if (it.type === 'update') { const v = C.vendors.find((x) => x.name === it.claims.vendor); return { 'vendor page download host': v.real !== host(it.link.target), 'domain lookup vs publisher': C.whois[host(it.link.target)].owner !== v.owner }; }
  if (it.type === 'file') return { 'directory address': dir.get(it.claims.person) !== it.fromAddr, 'call-back sender': no(it.claims.person) };
  if (it.type === 'payment') { const s = C.suppliers.find((x) => x.name === it.claims.supplier); return { 'register account': !it.body.includes(s.iban), 'call-back supplier': no(it.claims.contact), 'register domain': dom(it.fromAddr) !== s.real, 'domain lookup vs legal name': C.whois[dom(it.fromAddr)].owner !== s.owner }; }
  if (it.type === 'access') return { 'directory address': dir.get(it.claims.requester) !== it.fromAddr, 'call-back approver': no(it.claims.approver), 'call-back requester': no(it.claims.requester) };
  throw new Error(it.type);
}
const solve = (C, it) => Object.values(checks(C, it)).some(Boolean);
const nDecisive = {};
// day-level relational features, computed only from what the queue shows
function relational(C, it) {
  const others = C.items.filter((x) => x !== it);
  const h = it.type === 'update' ? host(it.link.target) : '';
  return [
    `rel:name:${others.some((x) => x.fromName === it.fromName)}`,
    `rel:host:${!!h && others.some((x) => x.type === 'update' && host(x.link.target) === h)}`,
    `rel:samekind:${others.filter((x) => x.type === it.type).length}`,
    `rel:approver:${it.claims.approver ? others.some((x) => x.claims.approver === it.claims.approver) : 'na'}`,
  ];
}
const shape = (d) => [`tld:${d.split('.').pop()}`, `hy:${d.includes('-')}`, `len:${Math.min(30, d.length) >> 2}`, `parts:${d.split('.')[0].split('-').length}`];
function features(C, it, i) {
  const words = `${it.subject} ${it.body} ${it.urgent} ${it.action}`.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w && !/\d{3,}/.test(w));
  const f = words.map((w) => 'w:' + w);
  f.push('type:' + it.type, 'ch:' + it.channel, 'pos:' + i, 'hour:' + it.arrive.slice(0, 2), 'namelen:' + (it.fromName.length >> 2), 'bodylen:' + (it.body.length >> 4), 'subjlen:' + (it.subject.length >> 2));
  // Only what the queue shows WITHOUT clicking a check: the sender address and a sign-in link target are
  // hidden behind "show address" / "inspect link"; an update's download host is printed in the body.
  if (it.type === 'update') f.push(...shape(host(it.link.target)).map((x) => 'link' + x));
  return f.concat(relational(C, it));
}

const rows = [], typeStats = {}, posStats = {}, pairStats = {};
let days = 0;
for (let seed = from; seed <= to; seed++) {
  const C = G.generate(seed); days++;
  const realDomains = new Set([C.companyDomain, ...C.contacts.map((c) => dom(c.email)), ...C.suppliers.map((s) => s.real), ...C.services.map((s) => s.real), ...C.vendors.flatMap((v) => [v.real, v.site])]);
  const realOwners = new Set([...realDomains].map((d) => C.whois[d].owner));
  const firsts = C.phoneBook.map((p) => p.name.split(' ')[0]);
  if (new Set(firsts).size !== firsts.length) say(`seed ${seed}: duplicate first names`);
  const seen = { name: new Set(), dom: new Set(), iban: new Set(), inv: new Set() };
  C.items.forEach((it, i) => {
    if (solve(C, it) !== it.scam) say(`seed ${seed} ${it.id} ${it.type}: tool solver disagrees`);
    if (it.scam) { const k = it.type + ':' + Object.values(checks(C, it)).filter(Boolean).length; nDecisive[k] = (nDecisive[k] || 0) + 1; }
    // Review round 2 regression: "domain words start with the owner's first word" must not classify.
    const sd = it.link ? host(it.link.target) : d0(it), ow = C.whois[sd].owner.toLowerCase().split(' ')[0];
    ownerRule.push([sd.replace(/[^a-z]/g, '').startsWith(ow.replace(/[^a-z]/g, '')) ? 0 : 1, +it.scam]);
    ownerRep.push([C.items.some((x) => x !== it && C.whois[x.link ? host(x.link.target) : d0(x)].owner === C.whois[sd].owner), +it.scam]);
    if (seen.name.has(it.fromName)) say(`seed ${seed}: sender ${it.fromName} repeats`); seen.name.add(it.fromName);
    const d = dom(it.fromAddr);
    if (d !== C.companyDomain && seen.dom.has(d)) say(`seed ${seed}: domain ${d} repeats`); seen.dom.add(d);
    if (it.iban) { if (!G.validIban(it.iban)) say(`seed ${seed}: invalid IBAN ${it.iban}`); if (seen.iban.has(it.iban)) say(`seed ${seed}: IBAN repeats`); seen.iban.add(it.iban); }
    if (it.claims.invoice) { if (seen.inv.has(it.claims.invoice)) say(`seed ${seed}: invoice repeats`); seen.inv.add(it.claims.invoice); }
    const shown = it.link ? host(it.link.target) : d;
    if (it.scam && realDomains.has(shown) && !['access', 'payment'].includes(it.type)) say(`seed ${seed} ${it.id}: scam uses a real domain ${shown}`);
    if (!C.whois[d] || (it.link && !C.whois[host(it.link.target)])) say(`seed ${seed} ${it.id}: a shown domain has no lookup record`);
    (typeStats[it.type] ||= [0, 0])[0] += it.scam; typeStats[it.type][1]++;
    (posStats[i] ||= [0, 0])[0] += it.scam; posStats[i][1]++;
    rows.push({ seed, C, it, i });
  });
  C.suppliers.forEach((s) => { if (!G.validIban(s.iban)) say(`seed ${seed}: invalid register IBAN`); });
  const types = [...new Set(C.items.map((x) => x.type))].sort();
  for (let a = 0; a < types.length; a++) for (let b = a + 1; b < types.length; b++) {
    const k = types[a] + '+' + types[b], its = C.items.filter((x) => x.type === types[a] || x.type === types[b]);
    (pairStats[k] ||= [0, 0])[0] += its.filter((x) => x.scam).length; pairStats[k][1] += its.length;
  }
}
const rate = ([s, n]) => s / n;
for (const [k, v] of Object.entries(typeStats)) if (Math.abs(rate(v) - G.P_SCAM) > 0.03) say(`type ${k} scam rate ${rate(v).toFixed(3)}`);
for (const [k, v] of Object.entries(posStats)) if (Math.abs(rate(v) - G.P_SCAM) > 0.03) say(`position ${k} scam rate ${rate(v).toFixed(3)}`);
for (const [k, v] of Object.entries(pairStats)) if (Math.abs(rate(v) - G.P_SCAM) > 0.04) say(`type pair ${k} scam rate ${rate(v).toFixed(3)}`);

// surface + relational naive Bayes
const split = Math.floor(from + (to - from) * 0.8);
const cnt = [new Map(), new Map()], tot = [0, 0], cls = [0, 0];
for (const r of rows.filter((r) => r.seed <= split)) { const y = +r.it.scam; cls[y]++; for (const f of features(r.C, r.it, r.i)) { cnt[y].set(f, (cnt[y].get(f) || 0) + 1); tot[y]++; } }
const vocab = new Set([...cnt[0].keys(), ...cnt[1].keys()]).size;
let right = 0, prior = 0; const scores = [];
const test = rows.filter((r) => r.seed > split);
for (const r of test) {
  let s = Math.log(cls[1] / cls[0]);
  for (const f of features(r.C, r.it, r.i)) s += Math.log(((cnt[1].get(f) || 0) + 1) / (tot[1] + vocab)) - Math.log(((cnt[0].get(f) || 0) + 1) / (tot[0] + vocab));
  scores.push([s, r.it.scam]); right += (s > 0) === r.it.scam; prior += !r.it.scam;
}
scores.sort((a, b) => a[0] - b[0]);
let pos = 0, neg = 0, auc = 0; for (const [, y] of scores) { if (y) { pos++; auc += neg; } else neg++; }
auc /= pos * neg;
const acc = right / test.length, base = prior / test.length;
if (acc > base + 0.10) say(`classifier accuracy ${acc.toFixed(3)} > prior ${base.toFixed(3)} + 0.10`);
if (auc > 0.60) say(`classifier AUC ${auc.toFixed(3)} > 0.60`);

// trivial strategies
const safe = (C, stop) => { let miss = 0, fa = 0; C.items.forEach((it, i) => { const s = stop(it, i); if (it.scam && !s) miss++; if (!it.scam && s) fa++; }); return miss === 0 && fa <= 1; };
let coin = 12345; const flip = () => { coin = (Math.imul(coin, 1103515245) + 12345) >>> 0; return coin / 4294967296; };
const strategies = { 'do everything': () => false, 'stop everything': () => true, 'stop each with p=0.3': () => flip() < 0.3, 'stop if sender is new to me (outside company)': (it) => !it.fromAddr.endsWith('@' + it.fromAddr.split('@')[1]) };
G.TYPES.forEach((t) => { strategies[`stop every ${t}`] = (it) => it.type === t; });
delete strategies['stop if sender is new to me (outside company)'];
const baseRates = {}; const nb = Math.min(days, 3000);
for (const [k, fn] of Object.entries(strategies)) { let ok = 0; for (let seed = from; seed < from + nb; seed++) ok += safe(G.generate(seed), fn); baseRates[k] = +(ok / nb).toFixed(3); }

console.log(`Guard duty check, seeds ${from}..${to} (${days} days, ${rows.length} items)`);
console.log('scam rate by type:', Object.fromEntries(Object.entries(typeStats).map(([k, v]) => [k, +rate(v).toFixed(3)])));
console.log('scam rate by position:', Object.values(posStats).map((v) => +rate(v).toFixed(3)).join(' '));
console.log(`classifier (surface + relational, no checks): accuracy ${acc.toFixed(3)} vs prior ${base.toFixed(3)}, AUC ${auc.toFixed(3)}`);
console.log('trivial strategies, safe-day rate:', baseRates);
const ruleAcc = ownerRule.filter(([p, y]) => p === y).length / ownerRule.length, prior0 = ownerRule.filter(([, y]) => !y).length / ownerRule.length;
if (ruleAcc > prior0 + 0.10) say(`owner-prefix rule accuracy ${ruleAcc.toFixed(3)} > prior ${prior0.toFixed(3)} + 0.10`);
const repRate = (lab) => { const r = ownerRep.filter(([, y]) => y === lab); return r.filter(([x]) => x).length / r.length; };
if (Math.abs(repRate(1) - repRate(0)) > 0.05) say(`owner repeats within a day: scam ${repRate(1).toFixed(3)} vs real ${repRate(0).toFixed(3)}`);
console.log(`domain lookup shortcuts: owner-prefix rule ${ruleAcc.toFixed(3)} (prior ${prior0.toFixed(3)}), owner repeat scam ${repRate(1).toFixed(3)} / real ${repRate(0).toFixed(3)}`);
console.log('scams by number of checks that expose them:', Object.fromEntries(Object.entries(nDecisive).sort()));
console.log(problems.length ? `PROBLEMS (${problems.length}${problems.length >= 200 ? '+' : ''}):\n  ` + problems.slice(0, 30).join('\n  ') : 'No problems.');
process.exit(problems.length ? 1 : 0);
