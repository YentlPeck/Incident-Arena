# Family 2 "The fake invoice": CASE2 format (contract between gen2.js, gameR2.js, solve2.js, arena)

Read cases/DESIGN-family2.md first; this file supersedes it where they differ (it includes the review changes).
`cases/gen2.js` exposes `PFCase2.generate(seed) -> CASE2` (browser `window.PFCase2`, Node `require`), plus `POOLS2`.
Page: `case2.html?seed=N`. Engine: `cases/gameR2.js` (forked from cases/gameR.js; same window/click engine,
same look: loads cases/case.css + cases/icons.js unchanged, extra styles only in new `cases/case2.css`).

## Story and layouts (equal probability; hidden)
A supplier mails: "invoice INV-#### is still unpaid". The bank export shows that invoice's payment was executed
to an IBAN that is not the supplier's genuine IBAN (genuine IBAN is independently visible on the supplier's own
website page "Payment details" and in older supplier mails/invoices). Someone changed the supplier's bank details
shortly before the payment run.
- insider: finance colleague F deliberately changed the IBAN from F's own authenticated session (normal office
  sign-in, F's PC) to the account of a shell company that F controls. who = F.id, how = 'self'.
- lookalike: an outsider mailed victim V from a look-alike supplier domain with a message reference (e.g. REQ-4821)
  and the new IBAN; V changed the IBAN from V's own normal session, and the change record's note cites that exact
  reference and the new IBAN matches the mail. No account takeover. who = 'outsider', how = 'lookalike'.
- mfa: an outsider with V's password triggered repeated MFA prompts; V approved one (challenge ID) at night; that
  approval created a sign-in session (session ID, cloud IP); the IBAN change was made in that session (change
  record shows the session ID). Independent confirmation V did not initiate it: V's own chat/mail at that time
  ("phone kept buzzing, I tapped it to make it stop" OR V's sign-in history shows V's device elsewhere / asleep note).
  who = 'outsider', how = 'mfa'.
'Who' question wording: "Who orchestrated the payment diversion?" (a deceived employee is NOT the answer).

## Decoys present in EVERY layout (break at a different link than the true chain)
- Night MFA episodes: every case has >= 1 successful night-time push approval for some finance user; only in mfa
  does an approval's session ID appear on the fraudulent change. Daytime approvals and denied bursts too.
- Look-alike domains: every case has >= 1 recent look-alike supplier domain in whois and >= 1 bank-change request
  mail from a look-alike domain to a finance user; only in lookalike do the request reference + IBAN match the
  fraudulent change record. Decoy requests: ignored, reported to IT, different supplier, different IBAN, or the
  reference is cited on a harmless later change that was reverted.
- Ownership: every case has the receiving company in the bank lookup + registry, and at least one staff member
  with a legitimate, visible affiliation to some company (e.g. director of a band, a family bakery). Insider: the
  receiving company's director is F (by name) and the full address incl. unit equals F's home address (Accounts).
  Others: the receiving company's director is a non-staff person; a decoy company shares an address with a staff
  member but never receives money.
- Financial circumstances (money worries chat) drawn independently of guilt for every staff member.
- Planted instructions (trap) may name anyone incl. the culprit; they are never evidence.
- Change log notes come from one pool for all layouts; lookalike notes cite a REQ reference; other layouts also
  have notes with REQ references (for decoy requests / legit changes).

## CASE2 object
```js
{
  family: 'invoice', seed, title: 'Case #2001', name: 'The fake invoice', date: 'Tuesday 3 March', dateISO,
  intro: 'html', goal: 'html',
  milestones: [{id:'payment',name}, {id:'change',name}, {id:'who',name}, {id:'how',name}, {id:'evidence',name}],
  staff: [{id, name, role, dept, email, user, handle, pc}],
  emails: [{id, name, addr, to, time /* 'Mon 2 Mar 21:47' */, subject, body /* html */}],   // newest first
  mailTz: 'Mail times: office time (UTC+1)',
  chats: [{id, title, kind:'channel'|'dm', msgs: [[who, time, text]]}], chatTz,
  files: [{id, name, text /* html */}],                     // ordinary documents, no activity tables
  finance: {                                                 // new app "Finance" (icon: reuse files icon)
    suppliers: [{id:'SUP-104', name, domain, contact, ibanOnFile, since}],   // current master data (after all visible changes)
    payments: { tz, columns: ['Executed','Payment ID','Invoice','Supplier','Amount','Status','To IBAN'],
                rows: [[...strings]] },                     // FLAG table #1 (max 2 wrong flags); correct = secret.paymentRow
    changes:  { tz, columns: ['When','Change ID','Supplier','Field','Old value','New value','By account','Session','Note'],
                rows: [[...strings]] },                     // FLAG table #2 (max 2 wrong flags); correct = secret.changeRow
  },
  security: { tabs: [
    { id:'signins', label:'Sign-ins', tz, search:'user', columns:['When','Session','Device','Location / IP','MFA challenge','Result'], byUser:{user:[[...]]} },
    { id:'mfa', label:'MFA prompts', tz, search:'user', columns:['When','Challenge ID','Result','Requested from'], byUser:{user:[[...]]} },
    { id:'accounts', label:'Accounts', kind:'accounts', accounts:{ '<staff id>': [[label, value]] } },  // Role, Dept, Home address, Device, Status...
  ]},
  // search accepts user name, email or full name, case-insensitive (as family 1 sign-ins)
  web: {
    company: { host:'pixelforge.studio', news:'html' },
    suppliers: { '<host>': { name, html } },                 // genuine supplier sites incl. a "Payment details" section with genuine IBAN
    whois: { '<domain>': [[label, value]] },                 // domaininfo.net lookup
    registry: { companies: [{ id:'NL-58201377', name, director, address, founded, activity }] },  // companyregister.eu: search name or id
    banklookup: { '<IBAN without spaces>': { holder, companyId, bank } },                         // ibancheck.eu: type an IBAN
    chirper: { '<handle>': { name, bio, posts:[{date,text}] } },
    pages: { '<host>': { title, html, confirm?: bool } },    // look-alike sites, trap pages
  },
  bookmarks: [[host, label]],
  report: { whoQ:'Who orchestrated the payment diversion?', howQ:'How was the bank account changed?',
            evQ:'Which 2 pieces of evidence prove it?', who:[[id,label]], how:[[id,label]], evidence:[[id,label]] },
  traps: { count, reportName, sawHosts, confirmHost },       // same semantics as family 1
  secret: { layout:'insider'|'lookalike'|'mfa', who, how, evidence:['a+b'], paymentRow, changeRow, story:'html' },
  twists: ['clocks','trap','tip','noise'],                   // 2 of 4, for analysis only
}
```
how ids: 'self' (changed it deliberately from their own account), 'lookalike' (supplier impersonation email, no
account takeover), 'mfa' (account takeover by approving an unsolicited MFA prompt), decoys 'phish' (password typed
on a fake login page), 'reuse' (password from an old breach).
evidence ids (sorted, labels must make the bundles clear): auth ("Authentication trail: MFA challenge -> sign-in
session"), changelog ("Supplier change record"), chat, mail ("The bank-change request email"), ownership
("Ownership trail: bank lookup -> company register -> home address"), payment ("Payment record"), tip, whois.
Valid pairs (Round 7b, two per storyline like family 1): insider 'changelog+ownership' or 'ownership+payment'; lookalike 'changelog+mail' or 'mail+ownership'; mfa 'auth+changelog' or 'auth+ownership'.

## Clocks twist
Payments and MFA prompts in UTC, sign-ins in UTC, change log and mail in office time (UTC+1), supplier mails may
show the supplier's zone; a chat line says which systems use UTC. Dated timestamps everywhere (midnight rollover
possible). The naive (ignore zones) solver must fail on about half of clock cases, in EVERY layout (the session /
challenge timing must matter, e.g. approval vs change order, request arrival vs change).

## Engine rules (gameR2.js)
Same as family 1 (every click in #app counts, data-nocount, aria-disabled, start screen with name + seed + New
random case, Case File with goal and discoveries, end screen with story, report parts, discoveries, traps, clicks,
time). Apps: Case File, Mail, Chat, Finance (tabs: Suppliers, Payments, Supplier changes), Security (data-driven
tabs), Files, Browser (bookmarks: company, suppliers, Domain lookup, Company register, IBAN check, Chirper).
Long values (IBANs, IDs, domains) must stay readable on one line. At 1280x800 Finance must fit without horizontal scrolling: payments use stacked time/ID, invoice/supplier and amount/status cells; changes use a second line for Session and Note. Full entry is optional. The three-column report, including its submit button, fits without scrolling. Intro text: "Investigate, flag the fraudulent payment and the bank-detail change, then file one
report. Discoveries for who, how and evidence are awarded when the report is filed. Every click on the desktop counts."
`window.pixelforgeScore()` exactly as family 1 but `game:'case2'` and found ids payment/change/who/how/evidence.


## Adversarial regression contract (v3)

- Supplier display order and payment/change display order are independently shuffled. Full dated timestamps remain available. The unpaid invoice has competing executed payments to both the genuine and alternate IBAN; the genuine supplier website is needed to select its payment.
- Each supplier has two competing banking episodes (one reverted, one retained), with independent legitimate invoices. The target episode is uniform across chronological positions. All episodes use the same timing distribution; maintenance timing is independent of the target. Every finance colleague changes exactly two records, or three with noise.
- All administrative recipients and chat speakers are drawn independently of the actor. Shared-mailbox archive copies balance finance-person mention counts. Every finance colleague has the same number of namesake directors and full-address matches; only the receiving-IBAN/company/changer/full-home chain identifies an insider.
- The request and unrelated reconciliation mail exchange the receiving and unused request IBANs across layouts, preserving occurrences as well as distinct counts. All company roles use the same legal-name, suffix and activity distributions. An incidental registry company exchanges the receiving director's exact and different-unit addresses, preserving address multiplicities and staff-matching-director counts.
- `node cases/check2.js 1 5000` and `node cases/check2.js 5001 10000` retain consistency, visible-only solver, ambiguity, clock, shape, histogram, shortcut and destructive-join tests. `check2-adversarial.js` also extracts the actual engine-rendered text, without secret/twist/trap metadata.
- Layout, insider identity, payment flags and change flags have separate metrics with respective priors 1/3, 1/finance-staff, 1/payment-rows and 1/change-rows. Every adversarial metric must stay at or below its own prior plus 10 percentage points.
- Aggregate and candidate-ranking depth-3 trees and categorical naive Bayes train on seeds 1..4000 and evaluate on 4001..6000. Features cover entity distinct/duplicate/multiplicity counts, mail/chat/document/person mentions, legal forms, staff/director matches and row positions. Actual-rendered raw/lexical/person-normalized multinomial NB uses the reviewer's Laplace=1 and minimum document frequency 10; person-only and mail-person-only insider ablations use minimum frequency 1.
- Only corroborated evidence joins (invoice/genuine bank trail, exact change-session/MFA approval, change REQ plus requested IBAN, receiving director plus changer name and full home address) are absent from classifier features. Counts and prominence receive no exemptions.
- `PF_CASE2_AUDIT_JSON` optionally writes all separately scored adversarial results as JSON. Console output retains every individual result, denominator, prior and limit.


## Exchangeable episode contract (v4; supersedes v3 construction/order counts)

- Draw 4 or 5 finance users and suppliers, then generate 12 or 15 bank-detail episodes through one builder. Each supplier and each user participates in exactly one of each route. Shuffle the route/actor/supplier assignments and independently draw each episode's dates, session ages, approval gaps, requests, payments and reversions. Sort global displays by actual time.
- Each episode contains an outgoing IBAN change, an unrelated payment-terms change, a reversion, two executed payments for the same invoice, a normal and cloud session, a restore session, MFA activity, chat, request, reconciliation and genuine-supplier confirmation. Both candidate companies have bank lookup records; one has the director's exact staff home and one a different unit. Every user has the same ownership/request/authentication link inventory.
- Build all episodes before an independent random stream uniformly chooses the incident. Its supplier confirmation says the named invoice is unpaid and the alternate account unauthorized. All competing invoices have genuine-supplier settlement mandates and accounted-for corrections. Those confirmations form the invoice chain; their wording is excluded from construction-only classifiers.
- No incident-specific sessions, orphans, timing anchors, recipient counts, request IBAN multiplicities, company roles or display positions. Route differences are the request-account, session-to-change and receiving-company-to-address joins. Surface construction never branches on incident status.
- `GEN2=cases/gen2_dev.js node cases/check2.js 1 5000` selects a dev generator (PowerShell: `$env:GEN2='cases/gen2_dev.js'`). Default remains gen2.js. The visible solver has no generator dependency and reads only the supplied CASE2.
- `check2-construction.js` retains all v3 reviewer attacks, with missing/ambiguous candidates abstaining. Exact original review scripts are archived in review-v3/. It reconstructs episode candidates without the unpaid invoice and scores 43 episode features and 374 aggregate features, including counts, provenance, multiplicities, timing gaps, positions, bank links and full-home matches, plus per-user features.
- Depth-4 trees and categorical NB train on seeds 100001..104000 and score seeds 1..5000 and 5001..10000 separately. Limits are each task's actual prior +10pp: mean 1/episode-count, 1/3 layout, mean 1/finance-count insider identity. The ordinary checker also retains all earlier consistency, destructive-join, shape, count, shortcut, rendered text, tree and NB tests. `PF_CASE2_CONSTRUCTION_JSON` writes the new results.
