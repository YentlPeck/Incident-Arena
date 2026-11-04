/* Guard duty: a seeded workday of 8 items, each a scam with p = 0.3 independently.
   Design: cases/DESIGN-guard.md (v2 + code review round 1).
   Fairness rules (code review round 1, GPT-6.1-Sol):
   - Identities are allocated BEFORE labels: every item gets its own organisation and its own person,
     never shared with another item that day, so repetition (names, accounts, domains, invoice ids)
     carries no information.
   - Every domain an item shows comes from the same spelling generator whether it is a scam or not.
     For each organisation two spellings are drawn and a coin decides which is real.
   - Domain lookup on a look-alike shows the name of ANOTHER legitimate organisation, so the owner
     only helps when compared with the specific claim. All domains in a day are unique.
   - IBANs are structurally valid fictional IBANs (country length + mod-97 check digits). */
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

  const P_SCAM = 0.3, N_ITEMS = 8;
  const TYPES = ['link', 'file', 'payment', 'update', 'access'];
  const FIRST = ['Alice', 'Bruno', 'Celia', 'Dario', 'Edith', 'Felix', 'Grace', 'Idris', 'Jules', 'Katja', 'Malik', 'Niels', 'Oscar', 'Petra', 'Quinn', 'Ruben', 'Sofia', 'Tomas', 'Xenia', 'Yusuf', 'Clara', 'David', 'Elise', 'Flora', 'Hanna', 'Iker', 'Lotte', 'Milan', 'Nadia', 'Otto', 'Paula', 'Rania', 'Sven', 'Talia', 'Viggo', 'Wanda'];
  const LAST = ['Verbeek', 'Laurent', 'Peeters', 'Mercier', 'Willems', 'Bergman', 'Lambert', 'Nielsen', 'Pereira', 'Schulte', 'Leclerc', 'Bernard', 'Janssen', 'Maesens', 'Dubouin', 'Fontane', 'Moreaux', 'Delorme', 'Rosberg', 'Delaere', 'Rivelli', 'Martens', 'Bekaert', 'Declerc'];
  const ROLES = ['Producer', 'Lead artist', 'Animator', 'Gameplay programmer', 'Tools programmer', 'QA tester', 'Level designer', 'Sound designer', 'Community manager', 'Build engineer', 'UI artist', 'Narrative designer'];
  // [name, word parts for domains, legal suffix]
  const SERVICES = [['ArtVault', ['art', 'vault'], 'Software Ltd'], ['TaskHive', ['task', 'hive'], 'Inc.'], ['CloudCanvas', ['cloud', 'canvas'], 'BV'], ['SoundShelf', ['sound', 'shelf'], 'GmbH'], ['PixelPay', ['pixel', 'pay'], 'Payments SA'], ['BuildBay', ['build', 'bay'], 'Oy'], ['DocDock', ['doc', 'dock'], 'Ltd'], ['MeetMoss', ['meet', 'moss'], 'SRL'], ['FrameFolio', ['frame', 'folio'], 'BV'], ['NoteNest', ['note', 'nest'], 'Ltd'], ['BoardBirch', ['board', 'birch'], 'AB'], ['ClipCove', ['clip', 'cove'], 'GmbH']];
  const ORGS = [['Copper Finch Audio', ['copper', 'finch']], ['Paper Lantern Art', ['paper', 'lantern']], ['Moss Ribbon Motion', ['moss', 'ribbon']], ['Amber Kite Studio', ['amber', 'kite']], ['Silver Fern Foley', ['silver', 'fern']], ['Blue Thistle Assets', ['blue', 'thistle']], ['Night Heron QA', ['night', 'heron']], ['Iron Quill Localisation', ['iron', 'quill']], ['Red Maple Voices', ['red', 'maple']], ['Glass Otter Rigging', ['glass', 'otter']], ['Salt Marsh Music', ['salt', 'marsh']], ['Pale Wren Props', ['pale', 'wren']], ['Velvet Lynx Mocap', ['velvet', 'lynx']], ['Quiet Oak Printing', ['quiet', 'oak']], ['Bright Gull Catering', ['bright', 'gull']], ['Dune Fox Hardware', ['dune', 'fox']], ['Hollow Reed Translation', ['hollow', 'reed']], ['Tin Sparrow Studio', ['tin', 'sparrow']], ['Wild Plum Animation', ['wild', 'plum']], ['Stone Hare Testing', ['stone', 'hare']]];
  const VENDORS = [['Shaderly', ['shader', 'ly'], 'Bloom'], ['RigForge', ['rig', 'forge'], 'Bones'], ['TileWright', ['tile', 'wright'], 'Maps'], ['AudioNest', ['audio', 'nest'], 'Mixer'], ['LocaLoop', ['loca', 'loop'], 'Strings'], ['PathPilot', ['path', 'pilot'], 'Nav'], ['FontFable', ['font', 'fable'], 'Type'], ['LightLark', ['light', 'lark'], 'Bake'], ['MeshMint', ['mesh', 'mint'], 'Decimate'], ['CueCrane', ['cue', 'crane'], 'Dialogue']];
  const LEGAL = ['BV', 'SRL', 'GmbH', 'Ltd', 'Oy', 'SA', 'AB'];
  const TLDS = ['com', 'net', 'io', 'eu', 'app', 'studio', 'cloud', 'co'];
  const EXTRA = ['', '', '', 'hq', 'app', 'online', 'group', 'team'];
  const FILES = ['boss-fight-storyboard.pdf', 'sprint-review-deck.pptx', 'level-3-greybox.zip', 'voice-lines-batch2.wav', 'ui-icons-v4.psd', 'patch-notes-draft.docx', 'trailer-cut-02.mp4', 'localisation-sheet.xlsx', 'menu-music-loop.ogg', 'character-turnaround.png'];
  const REPOS = ['emberfall-client', 'emberfall-tools', 'starlit-hollow', 'build-scripts', 'audio-assets', 'ui-kit', 'localisation', 'level-editor'];
  const URGENT = ['', '', 'Today please.', 'Needed before the 3 pm review.', 'Quick one, sorry for the rush.', 'No hurry, but today would be great.', 'Urgent: the build is waiting on this.'];
  const IBAN_FMT = { NL: (R) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[R.int(0, 25)].repeat(1) + [0, 1, 2].map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[R.int(0, 25)]).join('') + digits(R, 10), BE: (R) => digits(R, 12), DE: (R) => digits(R, 18), FR: (R) => digits(R, 23) };
  function digits(R, n) { let d = ''; for (let i = 0; i < n; i++) d += R.int(0, 9); return d; }
  function mod97(s) { let r = 0; for (const ch of s) { const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch; for (const c of v) r = (r * 10 + Number(c)) % 97; } return r; }
  function iban(R) {
    const cc = R.pick(Object.keys(IBAN_FMT)), bban = IBAN_FMT[cc](R);
    const check = String(98 - mod97(bban + cc + '00')).padStart(2, '0');
    return (cc + check + bban).replace(/(.{4})/g, '$1 ').trim();
  }
  function validIban(s) { const x = s.replace(/\s/g, ''); return mod97(x.slice(4) + x.slice(0, 4)) === 1; }
  const fmtHM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const dateIn = (R, y0, y1) => `${R.int(y0, y1)}-${String(R.int(1, 12)).padStart(2, '0')}-${String(R.int(1, 28)).padStart(2, '0')}`;
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  function generate(seed) {
    // Separate random streams: identities/presentation (P) and labels (L). Changing one never shifts the other.
    const P = rng(seed, 0x2f6b13c9), L = rng(seed, 0x5bd1e995);
    const used = new Set();
    function variants(parts) {
      const make = () => { const join = P.pick(['', '', '-']), extra = P.pick(EXTRA); return `${parts.join(join)}${extra ? P.pick(['', '-']) + extra : ''}.${P.pick(TLDS)}`; };
      let a, b, g = 0;
      do { a = make(); } while (used.has(a) && g++ < 200);
      g = 0; do { b = make(); } while ((b === a || used.has(b)) && g++ < 200);
      used.add(a); used.add(b);
      return P.next() < 0.5 ? [a, b] : [b, a]; // [real, look-alike]
    }
    const people = P.take(FIRST, 30).map((f) => `${f} ${P.pick(LAST)}`);
    let pi = 0; const person = () => people[pi++];
    const [companyDomain] = variants(['pixel', 'forge']);
    const me = { name: person(), role: 'Producer' }; me.email = `${me.name.split(' ')[0].toLowerCase()}@${companyDomain}`;
    const staffMail = (n) => `${n.toLowerCase().replace(/[^a-z ]/g, '').replace(' ', '.')}@${companyDomain}`;
    const staff = Array.from({ length: 9 }, (_, i) => { const name = person(); return { id: `s${i}`, name, role: P.pick(ROLES), email: staffMail(name), phone: `ext. ${P.int(200, 899)}` }; });
    staff.forEach((s) => { s.manager = P.pick(staff.filter((t) => t !== s)).name; });

    // Organisation pools, drawn without replacement (one per item, plus extras for the reference apps).
    const orgPool = P.shuffle(ORGS), svcPool = P.shuffle(SERVICES), venPool = P.shuffle(VENDORS);
    // Two legal names per organisation from ONE generator, coin flip for the real one (review round 2):
    // a look-alike domain is registered to a look-alike legal name with the same brand words, so the
    // lookup alone never settles anything; only comparing with a reference that lists the legal name does.
    const legalPair = (name) => {
      const make = () => `${name}${P.pick(['', '', ' Digital', ' Studio', ' Group', ' Services', ' Media'])} ${P.pick(LEGAL)}`;
      const a = make(); let b = make(), g = 0; while (b === a && g++ < 50) b = make();
      return P.next() < 0.5 ? [a, b] : [b, a];
    };
    const mkOrg = ([name, parts]) => { const [real, fake] = variants(parts); const [owner, fakeOwner] = legalPair(name); return { name, owner, fakeOwner, real, fake }; };
    const contacts = [], suppliers = [], services = [], vendors = [];
    const newContact = () => { const o = mkOrg(orgPool.pop()); const n = person(); const c = { id: `c${contacts.length}`, name: n, company: o.name, email: `${n.split(' ')[0].toLowerCase()}@${o.real}`, fakeEmail: `${n.split(' ')[0].toLowerCase()}@${o.fake}`, phone: `+32 ${P.int(400, 499)} ${P.int(10, 99)} ${P.int(10, 99)} ${P.int(10, 99)}`, org: o }; contacts.push(c); return c; };
    const invoices = new Set();
    const newInvoice = () => { let v; do { v = `INV-${P.int(1000, 9999)}`; } while (invoices.has(v)); invoices.add(v); return v; };
    const newSupplier = () => { const o = mkOrg(orgPool.pop()); const s = { ...o, iban: iban(P), contact: person(), phone: `+31 ${P.int(10, 99)} ${P.int(100, 999)} ${P.int(1000, 9999)}`, invoice: newInvoice() }; suppliers.push(s); return s; };
    const newService = () => { const [name, parts] = svcPool.pop(); const [real, fake] = variants(parts); const [owner, fakeOwner] = legalPair(name); const s = { name, owner, fakeOwner, real, fake }; services.push(s); return s; };
    const newVendor = () => { const [name, parts, tool] = venPool.pop(); const [site] = variants(parts); const [real, fake] = variants([...parts, P.pick(['dl', 'get', 'files'])]); const [owner, fakeOwner] = legalPair(name); const v = { name, owner, fakeOwner, plugin: `${name} ${tool}`, site, real, fake, version: `${P.int(2, 6)}.${P.int(0, 9)}.${P.int(0, 9)}` }; vendors.push(v); return v; };
    const [companyOwner, companyFakeOwner] = legalPair('Pixelforge');

    // 1) presentation: types, people, organisations, wording, times (no labels yet)
    const times = Array.from({ length: N_ITEMS }, () => P.int(8 * 60 + 30, 17 * 60)).sort((a, b) => a - b);
    const usedStaff = new Set();
    const items = times.map((t, i) => {
      const type = P.pick(TYPES);
      const it = { id: `i${i + 1}`, n: i + 1, type, arrive: fmtHM(t), channel: P.pick(['mail', 'mail', 'chat']), urgent: P.pick(URGENT) };
      if (type === 'link') {
        const s = newService(), what = P.pick(['the art review board', 'this week\'s task list', 'the shared moodboard', 'the meeting recording', 'the sprint dashboard']);
        Object.assign(it, { org: s, fromName: s.name, subject: P.pick([`Your ${s.name} session expired`, `New comment on ${what}`, `Action needed: sign in to ${s.name}`, `${s.name}: you were mentioned`]),
          body: `${P.pick([`Someone shared ${what} with you.`, `There is a new update on ${what}.`, `Your access to ${what} needs a fresh sign-in.`])} Sign in to ${s.name} to see it.`,
          action: `Sign in to ${s.name}`, claims: { service: s.name } });
      } else if (type === 'file') {
        const fromPartner = P.next() < 0.5, file = P.pick(FILES);
        let who, local;
        if (fromPartner) { who = newContact(); local = who.email.split('@')[0]; }
        else { who = P.pick(staff.filter((s) => !usedStaff.has(s.name))); usedStaff.add(who.name); local = who.email.split('@')[0]; }
        // each internal-looking item gets its own unused company look-alike, drawn whatever the label
        const ownFake = fromPartner ? null : variants(['pixel', 'forge'])[0];
        Object.assign(it, { who, fromPartner, local, ownFake, fromName: fromPartner ? `${who.name} (${who.company})` : who.name, subject: P.pick([`Shared with you: ${file}`, `${file} (latest)`, `Can you check ${file}?`, `Files for today: ${file}`]),
          body: `${P.pick(['Here is the file we talked about.', 'Latest version attached, have a look.', 'Can you open this and tell me what you think?', 'Sharing this before the review.'])} ${P.pick(['Thanks!', 'Cheers,', 'Talk soon,', ''])} ${who.name.split(' ')[0]}`,
          action: `Open ${file}`, attachment: file, claims: { person: who.name } });
      } else if (type === 'payment') {
        const s = newSupplier(), amount = P.int(8, 95) * 100 + P.pick([0, 50]);
        Object.assign(it, { org: s, amount, fromName: `${s.contact} (${s.name})`, subject: P.pick([`Invoice ${s.invoice}`, `${s.invoice}: payment due`, `Reminder: ${s.invoice}`, `Invoice ${s.invoice} for this month`]),
          intro: P.pick(['Please find our invoice below.', 'As agreed, here is the invoice for the work delivered.', 'Friendly reminder for the open invoice.', 'Invoice for the latest milestone.']),
          altIban: iban(P), action: `Pay EUR ${amount.toLocaleString('en-US')}`, claims: { supplier: s.name, contact: s.contact, invoice: s.invoice } });
      } else if (type === 'update') {
        const v = newVendor();
        Object.assign(it, { org: v, fromName: `${v.name} Updates`, subject: P.pick([`${v.plugin} ${v.version} is available`, `Update ready: ${v.plugin} ${v.version}`, `Please install ${v.plugin} ${v.version}`, `${v.plugin}: new version ${v.version}`]),
          intro: P.pick(['A new version fixes several bugs.', 'This release improves stability.', 'Your team asked us to notify you of new releases.', 'This update is recommended for all users.']),
          action: `Install ${v.plugin} ${v.version}`, claims: { vendor: v.name } });
      } else {
        const c = newContact(), repo = P.pick(REPOS), approver = P.pick(staff);
        Object.assign(it, { who: c, fromName: `${c.name} (${c.company})`, subject: P.pick([`Access to ${repo}`, `Can you add me to ${repo}?`, `${repo} access request`, `Quick access request: ${repo}`]),
          body: `${P.pick(['I am starting on the new task today and need access.', 'I could not open the repository yet.', 'My access seems to be missing.', 'I need this for the sprint work.'])} ${approver.name} approved it. Could you add me to ${repo}?`,
          action: `Give ${c.name.split(' ')[0]} access to ${repo}`, claims: { requester: c.name, approver: approver.name, repo } });
      }
      return it;
    });
    // extra reference entries that no item uses
    for (let k = 0; k < 2; k++) { newContact(); newSupplier(); }
    newService(); newVendor();

    // 2) labels, from their own stream; then the label-dependent fields
    const whois = {};
    const setOwner = (d, owner) => { whois[d] = { owner, created: dateIn(P, 2009, 2025) }; };
    setOwner(companyDomain, companyOwner);
    [...contacts.map((c) => c.org), ...suppliers, ...services].forEach((o) => setOwner(o.real, o.owner));
    vendors.forEach((v) => { setOwner(v.site, v.owner); setOwner(v.real, v.owner); });
    items.forEach((it) => {
      it.scam = L.next() < P_SCAM;
      // Review round 2: for payments and access requests, half of the scams come from the GENUINE address
      // (the partner's real mailbox was misused, or the request was never approved). Then the address and
      // the domain lookup look fine, and only the account check or the call-back settles it.
      it.genuineAddr = it.scam && (it.type === 'payment' || it.type === 'access') && L.next() < 0.5;
      if (it.type === 'link') {
        const host = it.scam ? it.org.fake : it.org.real;
        it.fromAddr = `no-reply@${host}`; it.link = { text: `Open ${it.org.name}`, target: `https://${host}/login` };
        if (it.scam) setOwner(host, it.org.fakeOwner);
      } else if (it.type === 'file') {
        const dom = it.fromPartner ? (it.scam ? it.who.org.fake : it.who.org.real) : (it.scam ? it.ownFake : companyDomain);
        it.fromAddr = `${it.local}@${dom}`;
        if (it.scam) setOwner(dom, it.fromPartner ? it.who.org.fakeOwner : companyFakeOwner);
      } else if (it.type === 'payment') {
        const s = it.org, fakeDom = it.scam && !it.genuineAddr, dom = fakeDom ? s.fake : s.real, acct = it.scam ? it.altIban : s.iban;
        it.fromAddr = `billing@${dom}`;
        it.body = `${it.intro} Amount: EUR ${it.amount.toLocaleString('en-US')}. Pay to account ${acct}, holder ${s.owner}.`;
        it.iban = acct;
        if (fakeDom) setOwner(dom, s.fakeOwner);
      } else if (it.type === 'update') {
        const v = it.org, host = it.scam ? v.fake : v.real, path = `${slug(v.plugin)}-${v.version}.zip`;
        it.fromAddr = `updates@${host}`; it.body = `${it.intro} Download: ${host}/${path}`; it.link = { text: `Download ${v.plugin}`, target: `https://${host}/${path}` };
        if (it.scam) setOwner(host, v.fakeOwner);
      } else {
        const fakeDom = it.scam && !it.genuineAddr;
        it.fromAddr = fakeDom ? it.who.fakeEmail : it.who.email;
        if (fakeDom) setOwner(it.who.org.fake, it.who.org.fakeOwner);
      }
    });

    // 3) call-backs: one specific question per item, truthful
    const phoneBook = [...staff.map((s) => ({ name: s.name, label: `${s.role}, Pixelforge`, phone: s.phone })), ...contacts.map((c) => ({ name: c.name, label: c.company, phone: c.phone })), ...suppliers.map((s) => ({ name: s.contact, label: s.name, phone: s.phone }))];
    function answer(name, it) {
      const c = it.claims;
      if (it.type === 'file' && name === c.person) return it.scam ? `No, I didn't send you ${it.attachment}. That wasn't me.` : `Yes, I shared ${it.attachment} with you today.`;
      if (it.type === 'payment' && name === c.contact) return it.scam ? `No, that is not our account. Our bank details have not changed.` : `Yes, ${c.invoice} is ours, to our usual account.`;
      if (it.type === 'access' && name === c.approver) return it.scam ? `No, I never approved access for ${c.requester}.` : `Yes, I approved ${c.requester} for ${c.repo}.`;
      if (it.type === 'access' && name === c.requester) return it.scam && !it.genuineAddr ? `No, I never asked for that. I already have what I need.` : `Yes, that request is from me.`;
      return `Sorry, I don't know anything about that.`;
    }
    const answers = {};
    phoneBook.forEach((p) => { answers[p.name] = {}; items.forEach((it) => { answers[p.name][it.id] = answer(p.name, it); }); });

    // strip generator-only fields from items (orgs stay referenced only through the reference apps)
    const pub = items.map(({ org, who, local, altIban, intro, fromPartner, ownFake, genuineAddr, ...rest }) => rest);
    const scams = items.filter((i) => i.scam).map((i) => i.id);
    return {
      family: 'guard', seed, title: `Guard duty · Day #${seed}`, me, companyDomain,
      intro: `<p>You are on guard duty for <b>${me.name}</b> (producer at Pixelforge Studios, ${me.email}). Today ${N_ITEMS} work items will ask ${me.name.split(' ')[0]} to do something: sign in, open a file, pay, install or give access.</p><p>Some items may be scams, or none. For <b>every</b> item choose <b>Do it</b> or <b>Stop it</b>. Use the tools to check first. A day is safe only if every scam is stopped and at most one real item is stopped.</p>`,
      items: pub, staff, contacts: contacts.map(({ org, fakeEmail, ...c }) => c), services: services.map(({ fake, fakeOwner, owner, ...s }) => s), suppliers: suppliers.map(({ fake, fakeOwner, invoice, ...s }) => s), vendors: vendors.map(({ fake, fakeOwner, ...v }) => v), whois, phoneBook, answers,
      secret: { scams, n: scams.length },
    };
  }
  // Vocabulary that a playbook must never contain (checked when the playbook is updated and frozen).
  const POOLS = { FIRST, LAST, SERVICES: SERVICES.map((s) => s[0]), ORGS: ORGS.map((o) => o[0]), VENDORS: VENDORS.map((v) => [v[0], `${v[0]} ${v[2]}`]), FILES, REPOS };
  const api = { generate, P_SCAM, N_ITEMS, TYPES, validIban, POOLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PFGuard = api;
})(typeof window !== 'undefined' ? window : globalThis);
