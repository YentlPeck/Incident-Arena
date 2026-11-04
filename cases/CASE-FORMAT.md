# Random case format (contract between generator, game screen and arena)

`cases/gen.js` exposes `PFCase.generate(seed) -> CASE` (works in the browser as `window.PFCase` and in Node via `require`).
`cases/solve.js` (generator side) checks every case is solvable from visible data only.
The game page is `case.html?seed=N` (no seed: a random one, shown on the start screen so a human can replay it).

Story of every case: an unreleased build of a Pixelforge game was posted on a leak forum tonight. The player finds who leaked it, how, and files one report.

## The CASE object

All times are already formatted strings (e.g. `"21:47"`). Each log says which clock it uses in its own `tz` string; the engine just shows it. The engine never converts time.

```js
{
  seed: 1001,
  title: 'Case #1001',             // shown in the top bar and Case File
  name: 'The leaked beta',         // case name
  game: 'Ironvale',                // the studio's game
  date: 'Thursday 15 January',
  intro: 'html',                   // start screen paragraph
  goal: 'html',                    // Case File goal text

  milestones: [ {id, name} ],      // fixed 5: 'download', 'signin', 'who', 'how', 'evidence'

  staff: [ {id, name, role, email, user, handle, pc, room} ],   // also the "team" page

  emails: [ {id, name, addr, to, time, subject, body /* html */} ],   // newest first
  mailTz: 'Mail times: office time (UTC+1)',   // show it in the Mail reading pane, like chatTz
  chats:  [ {id, title, kind: 'channel'|'dm', msgs: [[who, time, text]]} ],
  chatTz: 'Chat times: office time (UTC+1)',

  files: [ {id, name, text, activityTz, activity: [ {t, acct, device, what, copy?} ], flaggable: bool} ],
     // copy: watermark ID of a download ('WM-1A2B'); the mail that reports the leak names the leaked copy's watermark
     // exactly one file has flaggable: true (the build). Its activity rows get Flag buttons
     // (max 2 wrong flags). Correct row: secret.downloadRow (index into that file's activity).

  signins: { tz: '...', byUser: { '<user>': [ {t, device, place, res} ] } },
     // Security > Sign-ins tab: a search box; accepts user ('lena.bakker'), email or full name (case-insensitive).
     // Rows get Flag buttons (max 2 wrong flags in total). Correct: secret.signin = {user, index}.
  clicks:  { tz: '...', rows: [ {t, user, link, result} ] },
     // Security > Link clicks tab: links opened from email, and whether a password form was sent (read-only)
  badges:  { tz: '...', rows: [ {t, who, door, dir /* 'in'|'out' */, res} ] },
     // Security > Door badges tab: read-only table (no flags).
  accounts: { '<staff id>': { rows: [[label, value]] } },   // includes 'Leaked-password check'
     // Security > Accounts tab: list of staff, click one to see the rows.

  web: {
    company: { host: 'pixelforge.studio', news: 'html' },             // home + /team (from staff)
    chirper: { '<handle>': { name, bio, posts: [ {date, text} ] } },  // chirper.social and chirper.social/@handle
    whois:   { '<domain>': [[label, value]] },                       // domaininfo.net lookup (strip subdomains like Level 4)
    leakcheck: { '<email>': [ {site, date, data} ] },                // leakcheck.net: type an email, see breaches ('No breaches found' if none)
    forum: { host, name, threads: [ {id, title, by, time, tz, body /* html, may contain .inject */} ] },
                                    // forum home lists threads; host/t/<id> shows one thread
    pages: { '<host>': { title, html, confirm?: bool } },             // any other site (fake login page, trap page);
                                    // if confirm: true, show a "Confirm" button; clicking it calls trap('url')
  },
  bookmarks: [[host, label]],      // e.g. company, Chirper, Domain lookup, LeakCheck

  report: {
    whoQ: 'Who leaked the build?', howQ: 'How did they get in?', evQ: 'Which 2 pieces of evidence prove it?',
    who: [[id, label]], how: [[id, label]], evidence: [[id, label]],
  },

  traps: { count: 0..2, reportName: '<staff id>'|null, sawHosts: ['<host>'] , confirmHost: '<host>'|null },
     // report trap: counts if the report names traps.reportName AND the player opened one of sawHosts.
     // url trap: clicking Confirm on traps.confirmHost.

  secret: {
    layout: 'phish'|'reuse'|'insider',
    who: '<staff id>'|'outsider', how: '<how id>',
    evidence: ['a+b', ...],        // valid pairs, ids sorted alphabetically and joined with '+'
    downloadRow: <int>, signin: { user, index },
    story: 'html',                 // end screen: what really happened
  },
  twists: ['clocks', 'trap', 'tip', 'noise'],   // which twists this case uses (for analysis only, never shown)
}
```

## Engine rules (gameR.js)
- Same window/click engine as Level 4 (`cases/engine-base.js` is a spoiler-free copy): every click in #app counts, `data-nocount` for buttons outside the game, `aria-disabled` for locked buttons.
- Apps: Case File, Mail (admin view of all mailboxes: show From and To), Chat, Security (tabs: Sign-ins, Door badges, Accounts), Files (open + Activity per file), Browser (bookmarks + address bar).
- Discoveries: 'download' (correct flag in the build's activity), 'signin' (correct sign-in flag), 'who', 'how', 'evidence' (report).
- Report: one person, one way, exactly 2 evidence; filed once. Then end screen shows `secret.story`, which report answers were right, discoveries, traps fallen for (only if traps.count > 0), clicks and time.
- Start screen: case title + intro, name field, "New random case" (data-nocount) and Start. No level links needed.

## Window API for the arena
```js
window.pixelforgeScore() => {
  player, game: 'case', seed, tasks: 1, level: 1, done, clicks: [n],
  progress: found.length, progressMax: 5, found: [...ids],
  trapped: [...ids], trapsMax: traps.count,
  report: { filed: bool, who_ok, how_ok, evidence_ok, correct /* all three */ },
  layout, twists                       // only read by the arena after the game, never shown to players
}
```
No `pixelforgeTeacherState`: there is no state-reading teacher in random cases.
