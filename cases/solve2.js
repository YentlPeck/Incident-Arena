/* Visible-data solver. No hidden fields are consulted, including in helper functions.
   hypotheses() deliberately evaluates all three branches rather than an if/else guess. */
'use strict';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function text(html) {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function tzOffset(label) {
  const m = /UTC\s*([+\-\u2212])\s*(\d{1,2})(?::(\d\d))?/i.exec(label || '');
  return m ? (m[1] === '+' ? 1 : -1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : /UTC/i.test(label || '') ? 0 : NaN;
}
function stamp(value, label, naive = false) {
  const m = /(\d{1,2}) ([A-Z][a-z]{2}) (\d{4}) (\d\d):(\d\d)/.exec(value);
  if (!m || !MONTHS.includes(m[2]) || +m[4] > 23 || +m[5] > 59) return NaN;
  const inline = /UTC(?:\s*[+\-\u2212]\s*\d{1,2}(?::\d\d)?)?/i.exec(value);
  const offset = naive ? 0 : tzOffset(inline ? inline[0] : label);
  return Date.UTC(+m[3], MONTHS.indexOf(m[2]), +m[1], +m[4], +m[5]) / 60000 - offset;
}
const iban = (value) => String(value).replace(/\s/g, '').toUpperCase();
const ibans = (value) => (text(value).match(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}\b/g) || []).map(iban);
const hostOf = (value) => String(value).split('@').pop().toLowerCase();
const nearDomain = (a, b) => {
  // Conservative edit distance: the rendered domains still need independent whois records.
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/rn/g, 'm').replace(/1/g, 'l');
  a = norm(a); b = norm(b);
  if (a === b) return true;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = old;
    }
  }
  return row[b.length] <= 2;
};
const normal = (s) => String(s).trim().replace(/\s+/g, ' ').toLowerCase();

// Read the supplier's rendered, dated account schedule, never a hidden bank map.
// The standard account is historical; it need not be genuine at payment time.
function genuineAt(site, at) {
  const history = [...String(site?.html || '').matchAll(/<tr><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/g)]
    .map(m => ({ at: stamp(text(m[1]), 'UTC+1'), bank: ibans(m[2])[0] }))
    .filter(h => Number.isFinite(h.at) && h.bank && h.at <= at).sort((a,b) => b.at-a.at);
  return history[0]?.bank || null;
}

function trace(C, opts = {}) {
  const fail = (why) => ({ ok: false, why });
  const naive = !!opts.naive;
  const unpaid = C.emails.filter((m) => /\bunpaid\b/i.test(text(m.subject + ' ' + m.body)));
  const invoiceIds = [...new Set(unpaid.flatMap((m) => (text(m.subject + ' ' + m.body).match(/\bINV-\d{4}\b/g) || [])))];
  if (invoiceIds.length !== 1) return fail(`unpaid invoice references: ${invoiceIds.length}`);
  const invoice = invoiceIds[0];
  const candidates = [];
  C.finance.payments.rows.forEach((p, paymentRow) => {
    if (p[2] !== invoice || p[5] !== 'Executed') return;
    const supplier = C.finance.suppliers.find((s) => s.id === p[3]);
    const mail = unpaid.find((m) => hostOf(m.addr) === supplier?.domain);
    const site = supplier && C.web.suppliers[supplier.domain];
    if (!site || !mail) return;
    const genuine = genuineAt(site, stamp(p[0], C.finance.payments.tz, naive));
    if (genuine && iban(p[6]) !== genuine) candidates.push({ p, paymentRow, supplier, genuine, invoice });
  });
  if (candidates.length !== 1) return fail(`executed non-genuine payments: ${candidates.length}`);
  const result = candidates[0];
  const paidAt = stamp(result.p[0], C.finance.payments.tz, naive);
  const changes = C.finance.changes.rows.map((c, changeRow) => ({ c, changeRow, at: stamp(c[0], C.finance.changes.tz, naive) }))
    .filter((x) => x.c[2] === result.supplier.id && x.c[3] === 'IBAN' && x.at <= paidAt).sort((a, b) => b.at - a.at);
  if (!changes.length) return fail('no supplier change before the payment');
  const last = changes[0];
  if (changes[1]?.at === last.at) return fail('simultaneous changes are ambiguous');
  if (iban(last.c[5]) !== iban(result.p[6])) return fail('latest supplier change does not set the receiving IBAN');
  const changer = C.staff.find((s) => s.user === last.c[6]);
  if (!changer) return fail('unknown changing account');
  return { ok: true, ...result, ...last, changer, paidAt, naive };
}

function hypotheses(C, opts = {}) {
  const chain = trace(C, opts);
  if (!chain.ok) return { ...chain, supported: [] };
  const { c, at, changer: V, supplier, naive } = chain;
  const signinTab = C.security.tabs.find((t) => t.id === 'signins');
  const mfaTab = C.security.tabs.find((t) => t.id === 'mfa');
  const accountTab = C.security.tabs.find((t) => t.kind === 'accounts');
  const signinRows = signinTab?.byUser[V.user] || [];
  const signins = signinRows.filter((s) => s[1] === c[7] && s[5] === 'Success');
  const session = signins.length === 1 ? signins[0] : null;
  const signedAt = session ? stamp(session[0], signinTab.tz, naive) : NaN;
  const guide = C.files.map((f) => text(f.text)).join(' ');
  const duration = /sessions expire exactly (\d+) minutes/i.exec(guide);
  const active = !!session && !!duration && signedAt <= at && at < signedAt + Number(duration[1]);
  const ownSession = active && session[2] === V.pc && /office/i.test(session[3]) && session[4] === 'Existing trusted device';
  const supported = [];
  const references = text(c[8]).match(/\bREQ-[A-Z0-9-]+\b/g) || [];
  const requestMails = C.emails.filter((m) => {
    const body = text(m.body), domain = hostOf(m.addr);
    const to = Array.isArray(m.to) ? m.to : [m.to];
    return ownSession && to.some((x) => [V.email, V.user, V.name].some((v) => normal(x) === normal(v))) &&
      domain !== supplier.domain && nearDomain(domain, supplier.domain) && !!C.web.whois[domain] &&
      body.includes(supplier.id) && references.some((ref) => new RegExp(`\\b${ref}\\b`).test(body)) &&
      ibans(body).includes(iban(c[5])) && stamp(m.time, C.mailTz, naive) <= at;
  });
  if (requestMails.length === 1) supported.push({ who: 'outsider', how: 'lookalike', evidence: ['changelog+mail', 'mail+ownership'], request: requestMails[0].id });
  if (active && session[2] === 'Web browser' && /cloud server/i.test(session[3])) {
    const prompts = (mfaTab?.byUser[V.user] || []).filter((p) => p[1] === session[4] && p[2] === 'Approved');
    const approval = prompts.length === 1 ? prompts[0] : null;
    const approvedAt = approval ? stamp(approval[0], mfaTab.tz, naive) : NaN;
    // Independent confirmation names the exact challenge, is attributed to this user and is contemporaneous. Chat never quotes session IDs.
    const denied = (mfaTab?.byUser[V.user] || []).filter((p) => p[2] === 'Denied' && p[3] === session[3] &&
      stamp(p[0], mfaTab.tz, naive) < approvedAt && approvedAt - stamp(p[0], mfaTab.tz, naive) <= 10);
    const confirmation = C.chats.flatMap((ch) => ch.msgs).some((m) => normal(m[0]) === normal(V.name) &&
      /did not initiate a sign-in/i.test(text(m[2])) && text(m[2]).includes(session[4]) &&
      stamp(m[1], C.chatTz, naive) >= approvedAt && stamp(m[1], C.chatTz, naive) <= approvedAt + 90);
    if (approval && approvedAt <= signedAt && signedAt - approvedAt <= 5 && approval[3] === session[3] && denied.length >= 2 && confirmation)
      supported.push({ who: 'outsider', how: 'mfa', evidence: ['auth+changelog', 'auth+ownership'], session: session[1], challenge: session[4] });
  }
  const bank = C.web.banklookup[iban(c[5])];
  const companies = bank ? C.web.registry.companies.filter((co) => co.id === bank.companyId && normal(co.name) === normal(bank.holder)) : [];
  const home = (accountTab?.accounts[V.id] || []).find((r) => r[0] === 'Home address')?.[1];
  if (ownSession && home && companies.length === 1 && normal(companies[0].director) === normal(V.name) && normal(companies[0].address) === normal(home))
    supported.push({ who: V.id, how: 'self', evidence: ['changelog+ownership', 'ownership+payment'], company: companies[0].id });
  return { ok: true, chain, supported };
}

function solve(C, opts = {}) {
  const h = hypotheses(C, opts);
  if (!h.ok) return { ok: false, why: h.why };
  if (h.supported.length !== 1) return { ok: false, why: `supported branch hypotheses: ${h.supported.length}` };
  const answer = h.supported[0];
  return { ok: true, who: answer.who, how: answer.how, paymentRow: h.chain.paymentRow, changeRow: h.chain.changeRow, evidence: answer.evidence };
}
module.exports = { solve, hypotheses, trace, text, iban, ibans, stamp, tzOffset, nearDomain, genuineAt };
