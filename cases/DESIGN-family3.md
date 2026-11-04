# Family 3 "The missing prototype": design and decisions (v1)

## Story

Friday morning the studio's only Emberfall handheld prototype is on its shelf in the locked Hardware room
(shelf check, Fri ~09:00). Monday morning it is missing. The player (office manager) reads Friday's records
and files one report: who, how it left the building, and two records that prove it. Light Cluedo tone:
nobody is hurt, the end screen tells what happened in two or three sentences.

Apps: Case file, Door badges (door and person filters), Calendar (person filter), Chat (#studio),
Mail (reception inbox), Courier log, Visitor log, Hardware inventory (repair tickets, items, shelf checks),
Staff directory.

## The core idea: one moment, many look-alike moments

Every case has `3k` Hardware-room door rows on Friday after the shelf check (`k` = 2 or 3, drawn from P).
Each row is one *event*, and there are exactly `k` events of each kind:

| kind | what happens | harmless when | the real one when |
|---|---|---|---|
| S, staff visit | a staff member badges into the Hardware room | a Hardware-room booking of that person covers the time | the person's calendar has them in another meeting then (and they said so in chat) → **own bag** |
| C, courier fetch | a staff member fetches a unit; a courier picks it up 5-20 min later quoting a repair ticket | the quoted ticket is open and for another item | the quoted ticket is an old, closed ticket for the prototype → **fake pickup request** |
| V, tour door | a staff member with a booked test opens the door while a studio tour is on | the tour's route passes the "Hardware room corridor" at another time | the tour is at the Hardware room corridor right then → **visitor slipped in** |

L picks the layout (1/3 each) and then one of the `k` events of that kind. All other events are
harmless look-alikes, so every layout always shows `k` staff visits, `k` repair pickups and `k` tours
that pass the Hardware room. Every Hardware-room row looks the same on the surface
(time, door, name, "door open N s"); each needs a second record to clear it.

## Decisive fields are swaps, never additions

Rule: P draws every shown value, including both possible values of each decisive field, before L is used.
L only chooses which of the two pre-drawn values is shown. So names, ids, counts, word counts and
time distributions are the same in every layout.

- **S**: the person has two Friday bookings drawn from P: a Hardware-room test and another meeting, in two
  time slots T (around the badge time) and U (another time, at least 80 min away). Harmless: test in T,
  meeting in U. Real: meeting in T, test in U. Their chat message "Heading into <meeting>" goes with the
  meeting's slot.
- **C**: each repair event has two tickets drawn from P: an open ticket for a dev kit and an old closed
  ticket for the prototype. The request mail and the pickup row quote **both** ("ticket X (earlier
  ticket Y)"); L only decides which one is the main ticket. This keeps every ticket ref repeated the same
  number of times (see "Leaks found" below).
- **V**: each tour route is drawn from P with its stop times. The coupled door row sits at stop `j`;
  P also draws an alternative stop `alt` (more than 5 min, in fact at least 8 min, from every Hardware
  door time, and inside 10:00-17:00). Harmless: "Hardware room corridor" is the name at `alt`; real: at `j`.
  The host's chat "at the Hardware room corridor with <visitor>" is posted at that stop's time.

## Discoveries and grading

1. Flag 1: the Hardware-room door row of the real event.
2. Flag 2: Main exit row of the culprit (bag) / the pickup row (courier) / the visitor's log row (visitor).
3-5. Report: who, how, two evidence records. Main score `correct` = all three right.

Evidence: two valid pairs per layout (table in CASE3-FORMAT.md). Each pair needs both records; no single
record identifies the answer. I chose pairs that are each a complete small proof ("moment + why it was
not legit"), rather than "flag 1 + flag 2", because "door row + exit row" fits every look-alike staff
visit too and so proves nothing.

## Fairness checks (cases/check3.js) and current numbers

Run `node cases/check3.js 1 5000` and `node cases/check3.js 8001 13000`. Both pass with 0 problems.
The script refuses ranges that touch the reserved seeds 6001-6055 and 6901-6999.

| check | 1-5000 | 8001-13000 |
|---|---|---|
| solver agrees (layout, who, flags, both pairs; exactly 1 unexplained moment) | all | all |
| layouts | .336 / .333 / .330 | .320 / .335 / .345 |
| hour TV, true vs look-alike event | .024 | .011 |
| hour TV, culprit's Hardware booking | .042 | .022 |
| TV, Hardware stop position in true vs look-alike tours | .060 | .044 |
| text NB, layout (base) | .348 (.355) | .353 (.343) |
| record-feature NB, layout (base) | .330 (.355) | .320 (.343) |
| worst single log, record features | chat .348 | courier .350 |
| worst single log, text | visitors .342 | mail .351 |
| flag 1 pick, text / features (prior) | .132 / .129 (.139) | .140 / .148 (.139) |
| flag 2 pick, text / features (prior) | .137 / .118 (.148) | .139 / .127 (.138) |
| person pick, text / features (prior) | .141 / .150 (.148) | .130 / .148 (.138) |

Also checked on every seed: one disappearance; every look-alike harmless by an independent rule set
from generator internals; equal `k` per kind; each tour passes the Hardware room exactly once; no S or C
event coincides with a tour at the corridor; unique first names, tags, ticket refs, visitor badges and
courier refs; culprit's place in its option list uniform (observed vs expected per quarter);
a single-record oracle (normalised record templates; none concentrated in one layout, z-test).

Baselines: "chance" is 1/number of candidates; "prior" is the best feature-free strategy that knows only
the row kind (e.g. "pick a random Hardware-room row" = 1/(3k) ≈ .14). Classifiers use held-out seeds
(last 20% of the range).

## Leaks found during development (and fixed)

1. **Asset tags in ticket rows.** The prototype's tag is repeated in many records, dev-kit tags only once
   or twice. A ticket row with "ref repeated 3x + tag repeated many times" was exactly the true courier
   ticket: layout accuracy .67 from ticket rows alone. Fix: ticket rows show the item name, not the tag.
2. **Quoted closed ticket.** Even without tags, "this ticket ref appears elsewhere" + "this ticket is
   closed" (one row) only happened in the courier layout (.68 on ticket rows, with within-row feature
   combinations). Fix: pickups and request mails quote both of the event's tickets.
3. **Mail subject repeated the main ref** (main 4x vs earlier 3x). Fix: subject names the courier instead.
4. **Tour alternative stop outside working hours** (true stop always 10:00-17:00). Fix: `alt` is limited
   to 10:00-17:00.
5. Rare duplicate courier tracking refs. Fix: unique per case.

The checker now includes per-log classifiers and within-row feature combinations, so leaks like 1-2 are
caught instead of being diluted in the whole case.

## Things I am unsure about

- **Complement shortcuts are left in on purpose.** A swap always leaves a "complement" pattern that
  needs two records: in the bag layout a Hardware booking with no Hardware badge at its time; in the
  visitor layout a tour corridor stop with a door row next to it; in the courier layout a main ticket
  that is closed. Each needs two records lined up, and lining them up is the reasoning itself, so I did
  not try to hide them. A careful solver could also use them to find the answer.
- Tour stop-position TV is .060 on 1-5000 (threshold .07). It comes from the "at least 8 min from any door
  time" rule on the alternative stop. It is under the threshold but is the closest number to it.
- "Who" for the courier layout is the courier company (the hidden sender is never named). The how options
  follow from the who group (a staff name means bag, and so on); I kept "how" as its own question anyway,
  as asked.
- Records cover Friday only (plus Thursday mails and the Monday check). The brief's example "a real repair
  pickup on another day" became "a real repair pickup on Friday, plus older closed tickets for the
  prototype", because look-alikes on other days would have their own time distribution (rule 5).
- Evidence rubric: I accept exactly the two pairs above. Other sensible pairs (e.g. pickup row + the
  request mail) are graded wrong.
- `pixelforgeScore` runs in the page's main world. In the headless driver used for testing,
  `page.evaluate` runs in an isolated world and cannot see it; reading through an injected `<script>` tag works.
- Click budget: the direct path in my test run on dev seed 12 took 24 clicks, including flags, pins and
  the report. A careful read (door filter, calendar, chat, courier log, tickets, two to three mails,
  visitor log) should fit in about 60.
