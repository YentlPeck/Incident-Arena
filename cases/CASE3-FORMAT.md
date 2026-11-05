# Family 3 "The missing prototype": data contract

Files: `cases/gen3.js` (generator), `cases/gameR3.js` + `case3.html` + `cases/case3.css` (game),
`cases/solve3.js` (reference solver), `cases/check3.js` (fairness checker).

## API

```js
const G = window.PFCase3            // browser
const G = require('./cases/gen3.js') // node
const C = G.generate(seed)          // whole case, including C.secret
const V = G.views(C)                // exactly what the apps show (cell strings only)
```

`generate` is deterministic per seed. Two streams: `rng(seed, 0x3c6ef372)` (P, everything shown) and
`rng(seed, 0x1b873593)` (L, two draws only: layout, then which event of that kind is the real one).

## Case object `C`

| field | meaning |
|---|---|
| `family` | `'case3'` |
| `seed`, `title`, `intro` (HTML), `me` | case number, window title, intro text (includes the studio rules as an `<ol class="c3-rules">`), the player's name (office manager) |
| `rules[]` | `{ id: 'Rule 1'..'Rule 6', title, text }`: the studio rules shown in the intro and the Case File (`G.RULES`). Every accepted evidence pair is sufficient under these alone. |
| `dates` | `{ thu, fri, mon }`, e.g. `'Fri 31 Jul'` |
| `staff[]` | `{ name, role }`, 3k+7 to 3k+9 people (13-18); every staff badge opens the Hardware room |
| `partner` | repair partner `{ name, email, contact }` |
| `couriers[]` | the 3 courier companies of this case |
| `door[]` | `{ id: 'dN', time (min), door, person, note }` sorted by time. Doors: `Main entrance`, `Main exit`, `Hardware room`, `Sound booth`, `Server room`, `Roof terrace`, `Art storage`. Hardware rows have note `door open N s`. |
| `calendar[]` | `{ id: 'eN', start, end, title, room, people[], route }`. Hardware-room bookings have `room: 'Hardware room'` and one person (tests, `Pack repair unit for courier` slots, and filler bookings that are no-shows or cancelled in chat); at most one per person; nobody's entries overlap. Tours have `title: 'Studio tour: Name (Company)'`, `room: 'Whole studio'`, `people: [host]`, `route: 'HH:MM Reception → HH:MM Stop → …'`. |
| `chat[]` | `{ id: 'hN', time, who, text }`. Meeting messages carry the window: `Heading into X (HH:MM–HH:MM) now.` Cancel messages name the test and its start time. The tour host posts `… Hardware room corridor …` with the visitor's first name at the corridor stop time. |
| `mail[]` | `{ id: 'mN', day: 'thu'|'fri', time, fromName, from, to, subject, body }`. A repair pickup request says `on Friday morning` if its pickup is before 12:00, else `on Friday afternoon`. |
| `courier[]` | `{ id: 'kN', time, type: 'Pickup'|'Delivery', company, ref, ref2?, contents, staff }`. Repair pickups have `ref` (the ticket quoted first, whose unit is carried) and `ref2` (the other ticket), shown as `RP-1234 (also RP-5678)`. Every row is handled by someone in the building at that time. |
| `visitors[]` | `{ id: 'vN', name, company, host, in, out, badge }` (all Friday visitors are tour visitors) |
| `tickets[]` | `{ id: 'tN', ref, tag, item, opened, closed }`; `closed: '—'` means still open. The tag is NOT shown in the app. |
| `assets[]` | `{ id: 'aN', tag, name, shelf }`; exactly one `Emberfall prototype` |
| `checks[]` | `{ id: 'sN', day, time, text, by }`: Thursday weekly count, Friday morning "present", Monday "MISSING" |
| `whoOptions[]` | `{ id, label, group: 'Staff'|'Visitors'|'Couriers' }` |
| `howOptions[]` | `{ id: 'bag'|'courier'|'visitor', label }` |
| `secret` | the answer, see below. The game reads it only inside `fileReport()`. |

Record ids are unique across the whole case (prefix = log) and follow display order only.

### `C.secret`

```js
{
  layout: 'bag' | 'courier' | 'visitor',
  how: same as layout,
  who: staff name | visitor name | courier company,
  flag1: 'dN',              // Hardware-room door row: the moment it left the room
  flag2: 'dN' | 'kN' | 'vN',// Main exit row (bag) | pickup row (courier) | visitor log row (visitor)
  pairs: [[id, id], ...],   // every logically sufficient evidence pair, each sorted (bag 3, courier 1, visitor 2)
  rejected: [{ pair, reason }], // reasonable-looking pairs that do not suffice, with the reason (end screen, checker)
  story: '…',               // end-screen explanation
  events: [{ kind: 'S'|'C'|'V', t, person, isTrue, hwRow, hwBook, company, visitor, ticket }]  // checker only
}
```

Valid evidence pairs (all logically sufficient pairs under the displayed Rules 1-6, `C.rules`; design labels A1-A8 in DESIGN-family3.md):

| layout | accepted pairs |
|---|---|
| bag | Hardware door row + the culprit's meeting at that time; door row + the culprit's "Heading into … (HH:MM–HH:MM)" chat; door row + the culprit's one Hardware booking (at another time) |
| courier | pickup row + the ticket it quotes first (closed, for the prototype) |
| visitor | Hardware door row + the tour's calendar entry (route at the corridor then); door row + the host's chat "at the Hardware room corridor with <first name>" |

`G.GROUP_HOW` maps the who option group to how (Staff → bag, Visitors → visitor, Couriers → courier); it holds in every case.

## Views `V = G.views(C)`

Each table is `{ cols: [...], rows: [{ id, cells: [string, ...] }] }`:
`directory`, `door`, `visitors`, `courier`, `calendar`, `chat`, `mail`, `assets`, `checks`, `tickets`.
Also `partner` and `dates`. Times are `HH:MM`. The solver and the checker's classifiers read only these.

## Game score: `window.pixelforgeScore()`

```js
{ player, game: 'case3', seed, tasks: 1, level: 1, done, clicks: [n],
  progress, progressMax: 5, found: [...], trapped: [], trapsMax: 0,
  report,            // { filed: false } before filing; then { filed: true, flag1_ok, flag2_ok, who_ok, how_ok, evidence_ok, correct }
  layout,            // null before filing; then 'bag' | 'courier' | 'visitor'
  twists: [] }
```

`found` ids, in order: `left-room` (flag 1), `left-building` (flag 2), `who`, `how`, `evidence`;
all are awarded only at filing, and only if right. Before filing `found` is empty and `layout` is null. `correct = who_ok && how_ok && evidence_ok`.
`done` becomes true when the report is filed. After filing, `window.pixelforgeLastResult` also holds the
score plus `seconds`.

## Game rules

- Flaggable rows: Hardware-room and Main-exit rows in Door badges, every Courier log row, every Visitor log row.
  A Hardware-room row sets flag 1 ("the moment it left the Hardware room"), the others set flag 2 ("how it
  left the building"). One flag of each kind; clicking another row moves it, clicking the flagged row clears it.
- Flags are part of the report. Setting one gives no feedback; nothing on screen or in `pixelforgeScore()`
  depends on the answer until the report is filed.
- Every row in every app has a Pin button. The report's evidence picks exactly 2 pinned records.
- The report (two flags, who carried it out of the building, how, two records) is filed once and is final.
  The end screen shows the truth, all accepted pairs, and the reason when the chosen pair is a known
  rejected one. Clicks count like `gameG.js` (start/end modal buttons excluded).
