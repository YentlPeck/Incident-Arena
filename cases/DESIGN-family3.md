# Family 3 "The missing prototype": design and decisions (v3, after review round 2)

## Story

Friday morning the studio's only Emberfall handheld prototype is on its shelf in the locked Hardware room
(shelf check, Fri ~09:00). Monday morning it is missing. The player (office manager) reads Friday's records
and files one report: two flags (the moment it left the room, the record of how it left the building),
who carried it out of the building, how, and two records that prove it. Light Cluedo tone: nobody is hurt,
the end screen tells what happened in two or three sentences.

Apps: Case file, Door badges (door and person filters), Calendar (person filter), Chat (#studio),
Mail (reception inbox), Courier log, Visitor log, Hardware inventory (repair tickets, items, shelf checks),
Staff directory.

## Studio rules and inference assumptions

Since review round 2 the player sees these as **Rules 1-6** (`G.RULES`, `C.rules`), in the intro and in the
Case File, in plain language. Every accepted evidence pair is sound under the displayed rules alone, and
`check3.js` derives it from them (see "Review round 2"). The A-labels below are the design names; the
mapping is A1 = Rule 1, A2-A4 = Rule 2 + Rule 3, A5/A6 = Rule 4 + Rule 5, A7 = Rule 3, A8 = Rule 6.

- **A1 Last seen.** The prototype was on its shelf at the Friday shelf check. Only Hardware-room door
  openings after that check can be the moment it left the room. Exactly one of them is (the case guarantees
  one disappearance).
- **A2 Access rule.** Every Hardware-room entry needs a calendar booking of the person who badges in: a
  test, or a "Pack repair unit for courier" slot. A booked test takes nothing out of the room. **Packing
  exception (round 2):** a packing slot takes out exactly one unit, the unit of the ticket that the courier
  pickup quotes first. That is authorised when the ticket is open (a real repair); when the ticket is closed
  the pickup itself breaks Rule 3 and is the one violation (courier layout). The packer is never the answer.
- **A3 One booking per person per day.** Each person has at most one Hardware-room booking on Friday
  (cancelled ones stay listed and still count). So "their booking is at another time" proves "no booking
  covers this entry".
- **A4 Nobody is double-booked.** Calendar entries of one person never overlap. A person listed in another
  calendar entry at the badge time cannot also have had a Hardware booking then. A chat message
  "Heading into <meeting> (HH:MM–HH:MM)" is that person's own statement of such an entry.
- **A5 One violation (Rule 5, shown since round 2).** Exactly one thing broke the rules on Friday, and it is
  how the prototype left: a staff entry no booking of theirs covers (own bag), a visitor slipping in
  (visitor carried it out at sign-out), or a courier pickup quoting first a closed ticket (that courier).
  Everything else was authorised and took nothing. This is the guarantee that makes a two-record pair
  sufficient: a pair only has to show *one* violation, and Rule 5 says that violation is the answer.
- **A6 Corridor timing means entry (Rule 4, shown since round 2).** Visitors have no badge. A studio tour at
  the "Hardware room corridor" (calendar route, or the host's chat) within 5 minutes of a Hardware-room
  door opening means the visitor slipped in behind the staff member. That is a violation, so by Rule 5 the
  visitor took the prototype. A tour passing the corridor at another time found the door closed. (v2 only
  said "slipped in"; without Rule 5 on screen that did not prove the visitor took anything.)
- **A7 Repair custody.** A repair courier carries the unit of the ticket its pickup quotes first (the other
  ticket is only listed "also"). A ticket with a Closed date is finished: the unit came back and nothing may
  be collected for it. So a pickup quoting first a closed ticket for the prototype handed the prototype to
  that courier under a fake request.
- **A8 First names are unique** (staff, visitors, partner contact), so a chat message naming a visitor's
  first name identifies the visitor.
- Not assumed: that an unused booking means anything. People skip booked tests (no-shows) or cancel them
  in chat; every case has both.

## The core idea: one moment, many look-alike moments

Every case has `3k` Hardware-room door rows on Friday after the shelf check (`k` = 2 or 3, drawn from P).
Each row is one *event*, and there are exactly `k` events of each kind:

| kind | what happens | harmless when | the real one when |
|---|---|---|---|
| S, staff visit | a staff member badges into the Hardware room | their test booking covers the time | their calendar has them in another meeting then (their one Hardware booking is at another time) → **own bag** |
| C, courier fetch | a staff member fetches a unit in a booked packing slot; a courier picks it up 5-20 min later | the pickup quotes first an open ticket for another item | the pickup quotes first an old, closed ticket for the prototype → **fake pickup request** |
| V, tour door | a staff member opens the door for a booked test while a studio tour is on | the tour's route passes the "Hardware room corridor" at another time | the tour is at the Hardware room corridor right then → **visitor slipped in** |

L picks the layout (1/3 each) and then one of the `k` events of that kind. All other events are
harmless look-alikes. Every Hardware-room row looks the same on the surface (time, door, name,
"door open N s"); each needs a second record to clear it.

## Decisive fields are swaps, never additions

Rule: P draws every shown value, including both possible values of each decisive field, before L is used.
L only chooses which of the two pre-drawn values is shown. So names, ids, counts, word counts and
time distributions are the same in every layout.

- **S**: the person has two Friday entries drawn from P: a Hardware-room test and another meeting, in two
  time slots T (around the badge time) and U (another time, at least 80 min away). Harmless: test in T,
  meeting in U. Real: meeting in T, test in U (it becomes a no-show). Their chat message
  "Heading into <meeting> (HH:MM–HH:MM)" goes with the meeting's slot.
- **C**: each repair event has a packing booking covering the fetch and two tickets drawn from P: an open
  ticket for a dev kit and an old closed ticket for the prototype. The request mail and the pickup row
  quote **both** ("RP-x (also RP-y)"); L only decides which one is quoted first.
- **V** (rebuilt in round 1): the route has two neighbouring candidate stops `a`, `a+1` that straddle the
  event's anchor time. P puts the tester's badge at one of them (`j`, a fair coin) and the other is `alt`.
  The tester's booking covers both stops and the badge. L names either `j` (real) or `alt` (harmless)
  "Hardware room corridor". True and look-alike corridor stops are therefore exchangeable in every
  calendar-only relation (stop vs booking start/end, tour start/end, visitor sign-in/out, position, hour):
  only the distance to the door row differs. The host's chat "at the Hardware room corridor with <visitor>"
  is posted at that stop's time.
- **Filler bookings**: 1-2 cancelled (cancelled or moved in chat) and 1-5 no-show Hardware bookings, owned by
  staff who never enter the Hardware room that day (A3 keeps them to people without another booking).

## Who and how

The report asks **"Who carried it out of the building?"** (staff member / visitor / courier company) and
**"How did it leave the building?"**. *How is dependent on the who group*: a staff name means own bag,
a visitor means the visitor route, a courier company means the fake pickup, in 100% of cases by
construction (`G.GROUP_HOW`, checked by `check3.js` on every seed). I kept both questions on purpose,
with the dependence stated here: "how" makes the player commit to the mechanism in words, and the five
report parts are graded separately (`who_ok`, `how_ok`). Nobody should treat `how_ok` as independent
evidence of skill; `correct` = who + how + evidence, and who + evidence already imply how.
For the courier layout "who" is the courier company because the question asks who *carried it out of the
building*; the person behind the fake request is never named. The staff member who fetched the unit is
innocent and is not the answer.

## Report, flags and grading

The report has five parts, all filed together and final:
1. Flag 1: the Hardware-room door row of the real event.
2. Flag 2: Main exit row of the culprit (bag) / the pickup row (courier) / the visitor's log row (visitor).
3. Who carried it out of the building. 4. How. 5. Two pinned records as evidence.

Flags are part of the report (round 1): setting a flag gives no feedback, flags can be moved freely, and
nothing on screen or in `pixelforgeScore()` says whether anything is right until the report is filed.
The secret is read only inside `fileReport()`. Discoveries (`left-room`, `left-building`, `who`, `how`,
`evidence`) are awarded at filing. Main score `correct` = who, how and evidence right.

### Evidence rubric: every logically sufficient pair is accepted

A pair is accepted iff it proves the answer on its own under A1-A8. `check3.js` re-derives this with an
independent pair prover over every pair of records in every case.

| layout | accepted pair | why it suffices |
|---|---|---|
| bag | Hardware door row + the culprit's meeting at that time | A4: in a meeting, so no booking covers the entry; A2, A5 |
| bag | Hardware door row + the culprit's "Heading into <meeting> (HH:MM–HH:MM)" chat | A4 via their own statement; A2, A5 |
| bag | Hardware door row + the culprit's Hardware booking at another time | A3: their one booking is elsewhere, so the entry is unbooked; A2, A5 |
| courier | pickup row + the ticket it quotes first (closed, prototype) | A7: the parcel was the prototype, collected under a finished ticket, by that courier |
| visitor | Hardware door row + the tour's calendar entry (route at the corridor then) | A6, names the visitor |
| visitor | Hardware door row + the host's chat "at the Hardware room corridor with <first name>" | A6, A8 |

Rejected reasonable pairs, each with the reason shown on the end screen (`secret.rejected`):

| layout | rejected pair | reason |
|---|---|---|
| bag | door row + culprit's Main exit row | every staff member badges out; does not show the entry was unbooked |
| bag | meeting + chat, meeting + booking, exit + meeting | no record of the Hardware-room entry |
| courier | pickup row + request mail | neither shows the quoted ticket is closed or for the prototype |
| courier | request mail + quoted ticket | shows a fake request, not that a courier collected anything (the pickup row is the record of collection) |
| courier | pickup row + the "also" ticket | that ticket is open and for another item; the pickup carries the unit of its first ticket |
| courier | fetch door row + quoted ticket | shows a booked packing slot, not which courier carried it out |
| courier | fetch door row + pickup row | a packing fetch followed by a pickup is normal; nothing shows the ticket is invalid |
| visitor | tour + visitor log row, tour + host chat | no record of the door opening |
| visitor | door row + visitor log row | the visitor log has sign-in times, not where the visitor was |
| visitor | door row + the tester's booking | shows a booked test (fine for the staff member), says nothing about the visitor |

The v1 rubric accepted "request mail + ticket" for the courier layout. Under A7 it does not prove a
collection, so v2 rejects it with that reason. That leaves one accepted pair for the courier layout.

## Fairness checks (cases/check3.js) and current numbers

Run `node cases/check3.js 1 5000` and `node cases/check3.js 8001 13000`. Both pass with 0 problems.
The script refuses ranges that touch the reserved seeds 6001-6055 and 6901-6999.
Classifiers and rules are trained / chosen on the first 80% of the range and scored on the last 20%.

| check | 1-5000 | 8001-13000 |
|---|---|---|
| solver agrees (layout, who, flags, all pairs; exactly 1 unexplained moment) | all | all |
| layouts (bag / courier / visitor) | .336 / .333 / .330 | .320 / .335 / .345 |
| hour TV, true vs look-alike event | .014 | .020 |
| hour TV, culprit's Hardware booking | .016 | .051 |
| TV, Hardware stop position in true vs look-alike tours | .028 | .017 |
| TV, Hardware stop hour in true vs look-alike tours | .017 | .041 |
| text NB, layout (base) | .322 (.355) | .345 (.343) |
| record-feature NB, layout (base) | .334 (.355) | .337 (.343) |
| worst single log, record features / text | courier .368 / tickets .356 | mail .355 / visitors .359 |
| flag 1 pick, text / features (prior) | .145 / .149 (.140) | .125 / .127 (.137) |
| flag 2 pick, text / features (prior) | .129 / .124 (.148) | .136 / .145 (.138) |
| person pick, text / features (prior) | .127 / .132 (.148) | .131 / .137 (.138) |

The review-round-1 numbers are in the table under "Review round 1".

Also checked on every seed: one disappearance; every look-alike harmless by an independent rule set from
generator internals; studio rules A2-A4 hold in the data (one Hardware booking per person, nobody
double-booked, every harmless entry booked); equal `k` per kind; each tour passes the Hardware room once;
no S or C event coincides with a tour at the corridor; unique first names, tags, ticket refs, visitor
badges and courier refs; culprit's place in its option list uniform; a single-record oracle (normalised
record templates; none concentrated in one layout, z-test).

## Review round 1

An independent statistician reviewed v1 and measured seven problems on fresh seeds. Each finding, its fix,
and the regression check now in `check3.js` (all numbers held-out, seeds 1-5000 / 8001-13000):

| # | finding | fix | check (1-5000 / 8001-13000) |
|---|---|---|---|
| 1 | Calendar-only shortcut: a tour whose corridor stop is 2 min before to 14 min after a Hardware booking start predicted the layout at 55.7% (prior 33.6%) and the visitor at 88.2% (prior 41.8%). Cause: the true stop sat next to the tester's booking start, the look-alike stop far from all bookings. | V rebuilt as a swap between two neighbouring stops that straddle the anchor, both inside the tester's booking, badge at a fair-coin one of them. Calendar relations of the true and look-alike stop are exchangeable. | exact rule: layout .350 (prior .355), first matching visitor .429 (prior .418) / layout .329 (prior .343), visitor .435 (prior .413). Best single tour-timing interval over 17 relations: .322 / .325. Pairwise-combination NB (all feature pairs), person .383 (prior .418), layout .318 / person .349 (prior .413), layout .326. Hardware-row timing relations, pairwise NB flag 1: .149 (prior .140) / .133 (prior .137). |
| 2 | Tour stop position TV .040, ok. | kept the check | .028 / .017 |
| 3a | An unused Hardware booking meant bag 100% (prior 66.7%). | Every case now has 1-5 no-show and 1-2 cancelled (in chat) Hardware bookings by staff who never enter the room. | unused booking exists in 100% of cases; rule "exists → bag": .321 bag-vs-not (prior .679). Count of unused bookings → layout .408, not-cancelled count .411 (prior .355) / exists → bag .322 (prior .678); counts .404 / .399 (prior .343). |
| 3b | Closed main pickup ticket means courier 100%. Intended, must need two records. | Kept. Every case has exactly `k` closed prototype tickets and `k` repair pickups quoting two tickets; ticket wording is neutral (see 5). | ticket log alone .331, courier log alone .368 (prior .355); closed-prototype-ticket and repair-pickup counts identical in every layout / tickets .354, courier .344 (prior .343) |
| 4 | Flags were an oracle (try the first two visitor rows: layout 61.2% vs 34.0%). | Flags are report fields: no feedback, movable, graded at filing; secret read only in `fileReport()`; nothing on screen shows it before filing. | static check of `gameR3.js`: no secret / flag answer outside `fileReport()`, no feedback strings; browser check on seed 12 |
| 5 | "Who" duplicated "how"; the courier "who" was the carrier. 2.9% of deliveries were handled before that person badged in. True courier events called a newer ticket "earlier". | Question is "Who carried it out of the building?" everywhere; *how is dependent on the who group*, stated above and checked. Every staff-attributed Friday record (door, chat, courier, calendar, hosting, shelf check) is drawn from people in the building at that time. Wording is "RP-x (also RP-y)" / "also on file". | who group fixes how in 5000/5000 / 5000/5000; 657,149 / 659,652 staff records checked, 0 outside badge-in/out; no "earlier" wording |
| 6 | (a) "badge row + that person's booking at another time" was rejected in 1,329 bag cases although sufficient. (b) "pickup + request mail" does not prove the ticket is invalid. | Stated assumptions A1-A8. Rubric enumerates every sufficient pair: bag now accepts the booking-elsewhere pair (A3); courier accepts only pickup + ticket; "mail + ticket" and "pickup + mail" are rejected with reasons. Added the packing-slot booking so A2 covers courier fetches too. | independent pair prover: provable pairs = accepted pairs in every case (10,016 / 9,928 pairs); 21,666 / 21,673 listed rejected pairs all unprovable, all with a reason. (The prover was rewritten in round 2, see below.) |
| 7 | Checker missed 1, 3a, 4, 5. | Added the R-section checks above. Every predictive rule must stay within prior + 10 points. | both ranges pass with 0 problems |

## Review round 2

An independent statistician re-checked v2 on fresh seeds 20001-30000: calendar/tours, flags, attendance and
courier clues were fine. Three points remained. Numbers below are seeds 1-5000 / 8001-13000 (all cases of
the range for the per-value test, held-out last 20% for the predictive rules).

| # | finding | what changed | check (1-5000 / 8001-13000) |
|---|---|---|---|
| 1 | Six uncancelled unused bookings → always bag (139/2000). Asked: same support of the count in every layout, plus a per-value share test. | **Not fixed, by proof (below).** The generator is unchanged for this point. Added the per-value test (no layout share above prior + 10 among cases with that value, values with ≥ max(150, 3% of cases) cases) on 14 plain counts, enforced; on the two unused counts, reported; and a per-case check of the identity that makes the unused count's top value bag-only. | enforced counts, worst excess: +4.7 / +8.8 pts (calendar entries; next worst +4.0 / +4.4). Identity holds in 5000/5000 / 5000/5000. Unused total = 8 → bag only (175 / 162 cases); uncancelled = 6 → bag only (347 / 325); uncancelled = 1 → never bag. Count → layout rule still .408 / .404 (prior .355 / .343). |
| 2 | 26.2% of repair pickups were before noon but the request said "Friday afternoon". | Request says "Friday morning" when the pickup is before 12:00, "Friday afternoon" otherwise (pickup time is drawn by P, so the word carries no layout signal). | 3,215 morning + 9,250 afternoon, 0 mismatched / 3,305 + 9,266, 0 mismatched |
| 3 | Visitor pairs not sufficient as stated ("slipped in" does not mean "took it"); A2 needed a packing exception; A5/A6 guarantees were not on screen. | (a) The six studio rules (`G.RULES`) are shown in plain language in the intro and in the Case File. Rule 5 is the guarantee: exactly one rule violation happened and it is how the prototype left; Rule 4 makes a visitor at the corridor within 5 min of a door opening a violation. (b) Rule 3 states the packing exception (a packing slot takes out the unit of the ticket the pickup quotes first; a closed ticket makes the pickup the violation). (c) Prover rewritten: displayed records → facts → rule violations → Rule 5 → (who, how), tried on every pair of fact-bearing records, citing rule numbers. The third host-chat template now also says "Hardware room corridor". | rules in the intro 5000/5000 / 5000/5000, Case File rendering checked statically. Proven pairs = accepted pairs in every case (10,016 / 9,928), no pair proves two answers, 21,666 / 21,673 rejected pairs unprovable. Accepted pairs by rule: bag: Rule 2 (no double-booking) + 5 via meeting and via chat, Rule 2 (one booking, elsewhere) + 5 via the booking; courier: Rule 3 + 5 (pickup + ticket); visitor: Rule 4 + 5 via tour route and via host chat. No other pair proves anything. |
| 4 | Keep all checks, every predictive rule within prior + 10. | All round-1 and earlier checks kept and unchanged. | both ranges: 0 problems |

### Why point 1 cannot be fixed under the displayed rules

Under Rule 2 every person in a Hardware door row has exactly one Hardware booking, and every row is covered
by it except the bag culprit's one row. So in every case:

    used bookings   = people in Hardware rows − [bag]
    unused bookings = (Hardware bookings − people in Hardware rows) + [bag]

`Hardware bookings` and `people in Hardware rows` are plain counts (count calendar rows in the Hardware room;
count distinct names in Hardware door rows), no time comparison needed. If their difference X has the same
distribution in every layout (it does now, enforced above: +3.1 / +1.9 pts), the unused count is X + 1 in bag
cases, so its largest value can only occur in bag cases and its smallest only outside bag. If instead the
filler count is drawn so the unused count has the same range in every layout (the suggested fix), X becomes
X − 1 in bag cases and the same deterministic extreme moves onto a plain count of calendar rows, which is
easier to read than the unused count. One variable that differs by exactly [bag] from another cannot have the
same support as it in every layout; no swap, doubled entry or extra filler changes the two equations above,
because they follow from Rule 2. The same identity also makes "used bookings < people in Hardware rows" a
100% bag test at every value; that is literally the deduction "some entry is not covered by a booking".

I kept the current state (plain counts clean, the +1 on the unused count, which needs the same row-to-booking
matching that solves the case). Options if this must go: (i) allow several Hardware bookings per person
(drop the one-booking rule); then the +1 can sit on a count that needs the full per-person coverage check, but
the bag pair "door row + booking at another time" stops being sufficient and the rubric changes; or (ii) taper
the no-show count so the extreme values are rarer (it cannot remove them, and the prior + 10 limit at the
inner values caps how much this helps: about 13% of cases instead of 20%).

## Things I am unsure about / left open

- **The unused-booking count cannot be made uninformative.** See "Why point 1 cannot be fixed" above: it is
  forced by Rule 2. The plain counts are clean; the unused count's extremes are layout-specific (top value
  bag only, uncancelled = 1 never bag). Diluted with 1-5 no-shows (uniform), which keeps "count of unused
  bookings → layout" at about +5 points (limit +10). It costs a bigger studio (13-18 staff).
- "Calendar entries" per-value share reaches +8.8 pts on 8001-13000 (limit +10, at a value with just over
  150 cases); +4.7 on 1-5000. Probably noise at the minimum sample size, but it is the closest count to its limit.
- **Person from an unused booking (reported, not limited).** Within bag cases, picking a random owner of a
  not-cancelled unused booking finds the culprit about 29% of the time (random staff member 6.5%). To know a
  booking is unused you look up its owner's Hardware rows, and the culprit is the only owner with one: that
  is accepted evidence pair "door row + booking at another time" (A3). I count it as intended reasoning.
- Tour-timing pairwise NB for the person scores below its prior on both full ranges (.383 / .349) and about
  +5 points on the smaller 1-2000 range: noise around the prior. The culprit-booking hour TV is .051 on
  8001-13000 (limit .07), the closest timing number to its limit.
- Records cover Friday only (plus Thursday mails and the Monday check).
- `pixelforgeScore` runs in the page's main world. In the headless driver used for testing,
  `page.evaluate` runs in an isolated world and cannot see it; reading through an injected `<script>` tag works.
- Click budget: a careful read (door filter, calendar, chat, courier log, tickets, two to three mails,
  visitor log) plus two flags, pins and the report should fit in about 60-70 clicks; the bigger staff list
  adds some scrolling, not clicks.

## Decision on review round 2, point 1 (project lead, 2026-11-04)
The extreme unused-booking counts (uncancelled = 6, or unused total = 8, which happen only in bag cases; about 3.5–7% of cases) are **accepted as a documented limitation**, not fixed.
- They follow from the bag layout's defining fact: one Hardware entry has no booking.
- Using them still requires reading the whole calendar AND the whole door log and comparing the two. That is a coarser form of the intended inference ("someone entered without a booking"), not a way around the evidence.
- Both alternatives are worse:
  - several bookings per person would break the "booking at another time" evidence pair;
  - rarer extremes only shrink the effect, and the builder showed it cannot be removed.
- The per-value report in check3.js stays, so the size of this effect is visible on every run.
