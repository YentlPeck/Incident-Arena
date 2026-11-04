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
| `seed`, `title`, `intro` (HTML), `me` | case number, window title, intro text, the player's name (office manager) |
| `dates` | `{ thu, fri, mon }`, e.g. `'Fri 31 Jul'` |
| `staff[]` | `{ name, role }`, 10-12 people; every staff badge opens the Hardware room |
| `partner` | repair partner `{ name, email, contact }` |
| `couriers[]` | the 3 courier companies of this case |
| `door[]` | `{ id: 'dN', time (min), door, person, note }` sorted by time. Doors: `Main entrance`, `Main exit`, `Hardware room`, `Sound booth`, `Server room`, `Roof terrace`, `Art storage`. Hardware rows have note `door open N s`. |
| `calendar[]` | `{ id: 'eN', start, end, title, room, people[], route }`. Hardware-room bookings have `room: 'Hardware room'` and one person. Tours have `title: 'Studio tour: Name (Company)'`, `room: 'Whole studio'`, `people: [host]`, `route: 'HH:MM Reception → HH:MM Stop → …'`. |
| `chat[]` | `{ id: 'hN', time, who, text }` |
| `mail[]` | `{ id: 'mN', day: 'thu'|'fri', time, fromName, from, to, subject, body }` |
| `courier[]` | `{ id: 'kN', time, type: 'Pickup'|'Delivery', company, ref, ref2?, contents, staff }`. Repair pickups have `ref` (main ticket) and `ref2` (earlier ticket), shown as `RP-1234 (earlier RP-5678)`. |
| `visitors[]` | `{ id: 'vN', name, company, host, in, out, badge }` (all Friday visitors are tour visitors) |
| `tickets[]` | `{ id: 'tN', ref, tag, item, opened, closed }`; `closed: '—'` means still open. The tag is NOT shown in the app. |
| `assets[]` | `{ id: 'aN', tag, name, shelf }`; exactly one `Emberfall prototype` |
| `checks[]` | `{ id: 'sN', day, time, text, by }`: Thursday weekly count, Friday morning "present", Monday "MISSING" |
| `whoOptions[]` | `{ id, label, group: 'Staff'|'Visitors'|'Couriers' }` |
| `howOptions[]` | `{ id: 'bag'|'courier'|'visitor', label }` |
| `secret` | the answer, see below. The game only reads it to grade flags and the filed report. |

Record ids are unique across the whole case (prefix = log) and follow display order only.

### `C.secret`

```js
{
  layout: 'bag' | 'courier' | 'visitor',
  how: same as layout,
  who: staff name | visitor name | courier company,
  flag1: 'dN',              // Hardware-room door row: the moment it left the room
  flag2: 'dN' | 'kN' | 'vN',// Main exit row (bag) | pickup row (courier) | visitor log row (visitor)
  pairs: [[id, id], [id, id]],  // the two valid evidence pairs, each sorted
  story: '…',               // end-screen explanation
  events: [{ kind: 'S'|'C'|'V', t, person, isTrue, hwRow, company, visitor, ticket }]  // checker only
}
```

Valid evidence pairs:

| layout | pair 1 | pair 2 |
|---|---|---|
| bag | Hardware door row + the calendar meeting that had the person elsewhere at that time | Hardware door row + the person's "heading into that meeting" chat message |
| courier | pickup row + the quoted (main) ticket, closed, for the prototype | request mail + the same ticket |
| visitor | Hardware door row + the tour's calendar entry (route at the Hardware room corridor then) | Hardware door row + the host's chat "at the Hardware room corridor" |

## Views `V = G.views(C)`

Each table is `{ cols: [...], rows: [{ id, cells: [string, ...] }] }`:
`directory`, `door`, `visitors`, `courier`, `calendar`, `chat`, `mail`, `assets`, `checks`, `tickets`.
Also `partner` and `dates`. Times are `HH:MM`. The solver and the checker's classifiers read only these.

## Game score: `window.pixelforgeScore()`

```js
{ player, game: 'case3', seed, tasks: 1, level: 1, done, clicks: [n],
  progress, progressMax: 5, found: [...], trapped: [], trapsMax: 0,
  report,            // { filed: false } before filing; then { filed: true, who_ok, how_ok, evidence_ok, correct }
  layout,            // null before filing; then 'bag' | 'courier' | 'visitor'
  twists: [] }
```

`found` ids, in order: `left-room` (flag 1), `left-building` (flag 2), `who`, `how`, `evidence`
(the last three only after filing, and only if right). `correct = who_ok && how_ok && evidence_ok`.
`done` becomes true when the report is filed. After filing, `window.pixelforgeLastResult` also holds the
score plus `seconds`.

## Game rules

- Flaggable rows: Hardware-room and Main-exit rows in Door badges, every Courier log row, every Visitor log row.
  A Hardware-room row is checked against flag 1, the others against flag 2. Feedback is immediate.
- At most 2 wrong flags per log (Door badges, Courier log, Visitor log); after that the log's flag buttons are disabled.
- Every row in every app has a Pin button. The report's evidence picks exactly 2 pinned records.
- The report is filed once and is final. Clicks count like `gameG.js` (start/end modal buttons excluded).
