/* Solves a random case from VISIBLE data only (never reads case.secret or case.twists), the way a careful player would.
   Used by check.js to prove each case has exactly one answer that follows from the evidence.
   solve(CASE, {naive}) -> { ok, who, how, downloadRow, signin, why }   naive: ignore all time zones and drift (a sloppy player).

   The chain:
   1. The community manager's mail gives the leaked copy's watermark -> exactly one download row -> the account and device.
   2a. Device is an office PC -> someone sat there: the last sign-in on that PC before the download; the door log (clock-converted)
       must show exactly one person in that room at both the sign-in and the download; that person must have opened the file
       that contains the account's password -> insider, "note".
   2b. Device is a web browser with an IP -> the account's sign-ins from that IP; the first one is the break-in. Then exactly one of:
       - phish: the link-click log shows the account owner sent a password form to an outside site before the break-in, AND that
         site's registrant (domain lookup) is the forum user who posted the leak;
       - reuse: the Accounts tab says the current password appears in a known breach, AND the forum user who posted the leak also
         sells a breach list from a site in the owner's LeakCheck result. */
'use strict';

const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function tzOffset(s) {             // minutes ahead of UTC that a label describes
  const m = /UTC\s*([+\-−])\s*(\d+)/.exec(s || '');
  if (m) return (m[1] === '+' ? 1 : -1) * Number(m[2]) * 60;
  return /UTC/.test(s || '') ? 0 : null;
}
const hmToMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
function stamp(s) {                // "15 Jan 21:12" -> absolute minutes (only order and differences matter)
  const m = /(\d+) (\w{3}) (\d\d:\d\d)/.exec(s);
  return (MON[m[2]] * 31 + Number(m[1])) * 1440 + hmToMin(m[3]);
}

function solve(C, opts = {}) {
  const naive = !!opts.naive;
  const off = (label) => (naive ? 0 : tzOffset(label));
  const fail = (why) => ({ ok: false, why });
  const staffByUser = Object.fromEntries(C.staff.map((s) => [s.user, s]));
  const acctRow = (s, label) => (C.accounts[s.id].rows.find((r) => r[0] === label) || [])[1];

  // 1. the leaked copy: watermark from the mail that reported the leak
  const wmMail = C.emails.map((e) => ({ e, wm: /watermark <b>(WM-[0-9A-F]+)<\/b>/.exec(e.body), link: /https:\/\/([^/\s<]+)\/t\/(\d+)/.exec(e.body) })).find((x) => x.wm && x.link);
  if (!wmMail) return fail('no watermark mail');
  const build = C.files.find((f) => f.flaggable);
  const hits = build.activity.map((r, i) => ({ ...r, i })).filter((r) => r.copy === wmMail.wm[1]);
  if (hits.length !== 1) return fail(`watermark rows: ${hits.length}`);
  const leak = hits[0];
  const thread = C.web.forum.threads.find((t) => t.id === wmMail.link[2]);
  if (!thread) return fail('forum thread missing');
  const A = staffByUser[leak.acct];
  if (!A) return fail('unknown account');
  const logOff = off(build.activityTz);
  const leakUtc = stamp(leak.t) - logOff;
  const leakMin = ((leakUtc % 1440) + 1440) % 1440;
  const sOff = off(C.signins.tz);
  const sRows = (C.signins.byUser[A.user] || []).map((r, i) => ({ ...r, i, utc: hmToMin(r.t) - sOff }));

  if (/^PC-/.test(leak.device)) {
    const before = sRows.filter((r) => r.device === leak.device && r.utc <= leakMin);
    if (!before.length) return fail('no sign-in on that PC before the download');
    const si = before[before.length - 1];
    const owner = C.staff.find((s) => s.pc === leak.device);
    const room = (acctRow(owner, 'Desk') || '').split(' · ')[1];
    if (!room) return fail('room unknown');
    let drift = 0;
    if (!naive) {
      const all = C.chats.flatMap((c) => c.msgs.map((m) => m[2])).join('\n');
      const d = /readers? run (\d+) minutes (fast|slow)/.exec(all);
      if (d) drift = (d[2] === 'fast' ? 1 : -1) * Number(d[1]);
      else if (!/clocks are correct/.test(all)) return fail('door reader clock unknown');
    }
    const officeOff = naive ? 0 : tzOffset(C.badges.tz);
    const insideAt = (utcMin) => {
      const tr = utcMin + officeOff + drift;
      const byWho = {};
      C.badges.rows.forEach((r) => { (byWho[r.who] = byWho[r.who] || []).push({ m: hmToMin(r.t), door: r.door, dir: r.dir }); });
      return Object.entries(byWho).filter(([, evs]) => {
        evs.sort((a, b) => a.m - b.m);
        let where = evs[0].dir === 'out' ? evs[0].door : null;   // badged out later = was inside when the log starts
        for (const e of evs) { if (e.m > tr) break; where = e.dir === 'in' ? e.door : null; }
        return where === room;
      }).map(([name]) => name);
    };
    const atDl = insideAt(leakMin), atSi = insideAt(si.utc);
    if (atDl.length !== 1 || atSi.length !== 1 || atDl[0] !== atSi[0]) return fail(`people in ${room}: ${atSi.length} at sign-in, ${atDl.length} at download`);
    const P = C.staff.find((s) => s.name === atDl[0]);
    if (P === A) return fail('owner was inside');
    const note = C.files.find((f) => f.text.includes(`${A.user} /`));
    if (!note || !note.activity.some((r) => r.acct === P.user && r.what === 'Opened')) return fail('insider never opened a file with the password');
    return { ok: true, who: P.id, how: 'note', downloadRow: leak.i, signin: { user: A.user, index: si.i } };
  }

  // outsider: the account's sign-ins from the download's IP
  const ip = leak.device.split(' · ')[1];
  const fromIp = sRows.filter((r) => r.place.startsWith(`${ip} `));
  if (!fromIp.length) return fail('no sign-in from the download IP');
  const first = fromIp[0];
  const cOff = off(C.clicks.tz);
  const sentBefore = C.clicks.rows.filter((c) => c.user === A.user && /password form sent/.test(c.result) && hmToMin(c.t) - cOff <= first.utc);
  const domainOf = (link) => /https:\/\/([^/]+)/.exec(link)[1];
  const registrant = (d) => ((C.web.whois[d] || []).find((r) => r[0] === 'Registrant email') || [])[1] || '';
  const phished = sentBefore.some((c) => !domainOf(c.link).endsWith('pixelforge.studio') && registrant(domainOf(c.link)).split('@')[0] === thread.by);
  const sites = (C.web.leakcheck[A.email] || []).map((b) => b.site);
  const sells = C.web.forum.threads.some((t) => t.by === thread.by && sites.some((x) => t.title.includes(`${x} breach list`)));
  const reused = /appears in a known breach/.test(acctRow(A, 'Leaked-password check') || '') && sells;
  if (phished === reused) return fail(`ambiguous way in (phished ${phished}, reused ${reused})`);
  return { ok: true, who: 'outsider', how: phished ? 'phish' : 'reuse', downloadRow: leak.i, signin: { user: A.user, index: first.i } };
}

module.exports = { solve, tzOffset, stamp };
