# Experiment 3: lessons that travel

Status: plan v2, after review by GPT-6.1-Sol on 2026-11-04 (verdict "Ready after changes"). Nothing has been built or run yet.

## Decisions after review (these override the draft below)
1. **No rule-selection runs and no "rule → solved games" table.** Opus merges and deduplicates the three books using its own 20 mixed practice cases, solved and failed alike. One book is written and frozen. We test only whether the **whole book** helps and make no claims about individual rules.
2. **Exactly one candidate book.** We never write several and pick one, and family-3 results never reach book development.
3. **Update 2, 2026-11-04: family 3 is now "The missing prototype".** The leaderboard theme was also flagged by the builder's safety filter. The new case is a physical whodunit: a handheld test unit has disappeared from the locked Hardware room. It left the building one of three ways:
   - an employee took it home in their bag
   - reception handed it to a courier after a fake pickup request
   - a visitor walked into the room behind a staff member

   The evidence is door badges, the visitor log, the courier log, calendars and the inventory, which is clearly different from families 1 and 2. The builder gets a self-contained fairness checklist and does not read the older family notes. Earlier history:
   **Update, 2026-11-04: family 3 was "The rigged leaderboard".** "The poisoned build" was dropped because the builder model's safety filter stopped work on its malicious-code story. In the new case, an Emberfall tournament score was changed so one player won the prize. The three ways it could have happened:
   - an insider moderator changed it
   - a support desk was tricked into resetting the admin login
   - an admin key had been pasted in a public forum post

   The evidence is the score change log, support tickets, the moderator roster and forum edit history. That is still different from families 1 and 2. The original point 3 below is kept for the record.
   Original point 3: **Family 3 must have a clearly different evidence structure.** Payroll/bank changes are too close to the invoice case. Chosen: **"The poisoned build"**. Someone slips malicious code into a Pixelforge game build; the evidence is code commits, code reviews, build-server logs, access tokens and plugin updates. The three ways in are:
   - an access token leaked in a public repo
   - a compromised third-party plugin update (supply chain)
   - an insider commit hidden behind a fake co-author

   This matches real 2026 incidents such as poisoned packages and compromised CLI releases.
4. **Sonnet pilots family 3 as an isolated validator.** Its outputs and transcripts never reach Opus. The claim is worded as "transfer to one held-out case type", not "general investigation skill".
5. **Length is capped in tokens, not lines.** The cap is fixed before Opus writes. A **new fake book is length-matched** to the general book in tokens, formatting and placement in the prompt. Family-specific assumptions, such as "wait for all discoveries before filing", are removed during synthesis.
6. **Test: 3 conditions, 330 games.** The conditions are alone, the general book and the length-matched fake book, played by 2 AIs on 55 paired seeds.
   - **Pre-registered:** the general book must beat **both** alone **and** the fake book, for **both** AIs, each at exact one-sided paired sign test p ≤ 0.025.
   - "Yes" also needs a gain of ≥ 15 points (at least 9 net extra solves out of 55) against both controls.
   - Reported with wins, losses, ties and paired 95% confidence intervals.
   - "Not yet" means *not enough evidence*, not *proven no transfer*.
7. **Fixed before any test game runs:**
   - seed lists for practice, pilot, fairness-validation and test
   - endpoint: "solved" = report correct, meaning right person, right way in and right evidence pair, the same as `story2.py`
   - retry rule: only audit or quota failures are replayed
   - condition order interleaved per seed, a fresh session per game
   - an explicit list of conditions; no automatic pick-up of other frozen books
8. **Fresh fairness-validation seeds after every generator change.** Classifier limits stay at "prior + 10 points".
9. Dropped: the old Opus-book arm and the optional leak retest. They can be added later as separate, clearly labelled side runs.

---

## Original draft (kept for the record)

## What we know so far

- **Leak case (family 1, `cases/gen.js`).** Frozen playbooks from three teachers, each after the same 20 practice cases. Small AIs, 55 paired test cases (seeds 1001–1055), solved out of 55:
  | | alone | fake playbook | Sol | Sonnet | Opus |
  |---|---|---|---|---|---|
  | Haiku 5.5 | 8 | 12 | 11 | 19 | 40 |
  | GPT-6-Luna | 5 | 3 | 13 | 27 | 29 |
  The main pre-registered test (Sonnet book) passed for both AIs.
- **Fake invoice (family 2, `cases/gen2.js`), same frozen books, seeds 2001–2055:** Haiku 15 → 16, Luna 12 → 16 with Sonnet's book. Every book, including the fake one, moved results by a few cases. Verdict "Not yet", meaning no transfer.
- So the lessons are specific to one case type.

## Question

Can a teacher write **general** investigation lessons that help small AIs on a case type that no teacher has ever seen?

## Plan

### Step 1: a third case type (family 3)
- A new crime with a different evidence structure. Candidate: a stolen admin session used to change payroll bank details. Final choice is open.
- It must pass the same fairness process as family 2 (`DESIGN-family2.md`, `CASE2-FORMAT.md`):
  - seeded generator
  - exactly one crime per case
  - harmless decoys
  - two valid evidence pairs per layout
  - rendered-text and construction classifiers at chance
  - timing/length checks
  - a solver that matches the generator
- Pilot it with a big AI (Sonnet) on pilot seeds so it is hard but solvable.

### Step 2: a "general" playbook
Two sources are combined:
1. **Merge (Yentl's idea).** Combine the three existing books (Sonnet 48, Opus 45, Sol 55 lessons) into one book with the best rules from each.
2. **Mixed practice.** Opus practises on a mix of 10 leak + 10 invoice cases on *new* practice seeds. It is told to keep only lessons that help on both kinds of case.

Rule selection must use evidence that is **not** a test set:
- Selection runs: Haiku and Luna play new *selection* seeds of the leak and invoice cases (for example 3001–3020 and 4001–4020) with each of the three books.
- For every solved selection game, we extract which book rules the player visibly applied in its transcript (named or clearly followed).
- Opus gets the three books plus this "rule → solved games" table. It writes the general book, at most 55 non-empty lines, with methods only and no names or answers. The existing vocabulary filter applies.
- The general book is then frozen (sha8 recorded) before any family-3 test game runs.
- Test seeds 1001–1055 and 2001–2055 are never used for selection, because the books have already been scored on them.

### Step 3: the test
- Family 3, 55 new paired test seeds.
- Players: Haiku 5.5 and GPT-6-Luna, same commands, budget and audit as before.
- Conditions:
  - alone
  - Opus leak book (old, frozen `9693baa4`)
  - general book (new, frozen)
  - fake playbook (control, `cc9c908d`)
- **Pre-registered primary comparison:** general book vs alone, on family 3.
- Same verdict rule as before: exact one-sided paired sign test, both AIs p ≤ 0.025. "Yes" if the gain is ≥ 15 points for both, otherwise "A little". Otherwise "Not yet". "Too early" until all 55 pairs exist.
- Secondary, descriptive only: general book vs Opus leak book, and general book vs fake book.
- Optional secondary: the general book on *fresh* leak seeds (for example 5001–5055), to check it did not lose the leak-case gain.

## Known risks / open questions for the reviewer
1. **Rule attribution is weak.** A rule appearing in a solved transcript does not mean it caused the solve. Is the "rule → solved games" table worth its cost, or should Opus merge from the books and practice outcomes only?
2. **Selection on small numbers** (20 seeds per family per book) could just pick noise.
3. **The general book is also trained on the invoice case.** Does that make the family-3 test fair? Is one unseen family enough to claim "general"?
4. **Length.** A merged book might exceed 55 lines. Should the line limit stay the same as before so length is not a confound?
5. **Budget.**
   - Selection runs: 2 AIs × 3 books × 40 seeds = 240 games.
   - Test: 2 AIs × 4 conditions × 55 = 440 games.
   - At subscription speed this is roughly 2 nights. Is there a cheaper design with the same strength?
6. Anything in the verdict rule or seeds that would let the result look better than it is.

## Run log (2026-11-04 evening)
- **Wiring:** `run_batch.py --family proto` (ids `prt-…`), `arena/server3.py`, `arena/prompts3.py`. Audit now applies the strict controller rules to `grd-` and `prt-` too. Earlier guard transcripts were re-checked: no memory injections, no `ask` commands.
- **Sonnet pilot** (6901–6904, alone, budget 100), an isolated validator never shown to the teacher:
  - 1 of 4 solved, 21–30 commands per case.
  - Misses: twice a weak evidence pair (door row + exit row), once naming the staff member instead of the courier company.
  - **Budget fixed at 60 commands**, the same as the other families.
- **Small-AI floor check** (6905–6908, alone, 60 commands, never shown to the teacher): Haiku solved 1 of 2 (two games cut off by the runner), Luna 1 of 3 valid. One Luna game broke the controller rule once (a typo command), and the test's `--retry-invalid` replays such games. 36–39 commands per case. No floor effect.
- **Fixed before the teacher wrote:**
  - cap of 55 non-empty lines and 6,400 characters (about 1,600 tokens)
  - fresh practice seeds: leak 21–30, invoice 2501–2510, alternating
  - general book frozen to `arena/general-books/`
  - fake book made by trimming the same studio-craft placebo to the general book's length (`arena/make_fake3.py`)
- **Pre-registered test:**
  - seeds 6001–6055
  - Haiku 5.5 and GPT-6-Luna
  - conditions: alone, general book, fake book (interleaved)
  - endpoint: report correct
  - verdict as in decision 6
  - analysis: `arena/story3.py`
  - books recorded in `arena/general-books/test-plan.json` at freeze time
- **Unattended:** `arena/run_general_practice.py` (practice supervisor) and `arena/chain3.py` (practice → freeze → fake → test).
- **Paused 2026-11-05 ~00:00** by Yentl (PC off), at about 80% done (Haiku 48–50 per condition, Luna about 35).
  - **To resume:** start `arena/chain3.py` detached again. It skips the freeze because `test-plan.json` exists, and `run_batch --retry-invalid` archives the interrupted games and plays only the missing ones.
  - Interim: Haiku alone 22, general book 7, fake 22 (book vs alone +1/−17). The verdict will be "Not yet".

## Result (2026-11-05, complete: 330 valid games): VERDICT "Not yet"
| solved of 55 | alone | general book | fake book |
|---|---|---|---|
| Haiku 5.5 | 26 | **11** | 26 |
| GPT-6-Luna | 14 | 20 | 14 |
- **Haiku:** the book hurts. Against alone it went +3/−18, an exact one-sided p ≈ 0.0007 in the *harmful* direction (exploratory, not pre-registered). Against the fake book it went +2/−17. Haiku still named the right culprit (53/55), but chose the accepted evidence pair only 12 times, against 26 alone. It also used more commands (45 vs 38).
- **Luna:** +14/−8 against alone (p = 0.14) and +15/−9 against the fake book (p = 0.15). The trend is positive but not significant, and it used more commands (50 vs 40).
- **Reading:** general lessons distilled from two other case types did not transfer to an unseen one. For Haiku, the proof-pair rules learned elsewhere actively misled its choice of evidence.

## Follow-up: a specialised case-3 book (pre-registered 2026-11-05, before practice)
- **Question:** does a book written *for* this case type help, where the general book did not?
- **Practice:** Opus 5.5 plays practice seeds 6501–6520 (`run_batch.PROTO_PRACTICE` = 6501–6599, never test or pilot seeds), starting from an empty book. After each case, a tool-free learning call revises the book from a debrief containing:
  - the story
  - which report parts were right
  - the generic reasons tempting pairs fail
- **Caps:** the same as the general book, 55 lines and 6,400 characters. The book is frozen to `arena/proto-books/` (`arena/practice_proto.py`).
- **Test:**
  - Haiku and Luna play seeds 6001–6055 with the frozen book.
  - **Controls are reused** from Experiment 3: the existing alone and fake-book games on the same seeds, with the same source versions (manifest-checked).
  - Deviation from the usual design: the book games run later rather than interleaved per seed.
  - The fake book stays `a22a2587` (5,923 characters).
- **Verdict:** the same rule. The book must beat alone and fake for both AIs at an exact one-sided paired sign test p ≤ 0.025, "Yes" needs ≥ 9 net extra solves against each control, and otherwise "A little" or "Not yet".
- **Runner:** `arena/run_proto_followup.py` (log `proto-followup.log`).

- **Result (2026-11-05): VERDICT "Yes".** Book `4e45bae9`, 6,087 characters; Opus solved 20 of 20 in practice.
  | solved of 55 | alone | fake | general | **specialised** |
  |---|---|---|---|---|
  | Haiku | 26 | 26 | 11 | **39** (+17/−4 vs alone, p = .004; +19/−6 vs fake, p = .007) |
  | Luna | 14 | 14 | 20 | **48** (+36/−2 vs both, p < .0001) |
  Both AIs used fewer commands with the book (Haiku 32 vs 38, Luna 36 vs 40).

## Follow-up 2: a specialised crime-2 (invoice) book (pre-registered 2026-11-05, before practice)
- **Method:** the same as the case-3 follow-up (`arena/practice_invoice.py`, `run_invoice_followup.py`, analysis `story_invoice_book.py`).
- **Practice:** Opus practises on fresh invoice seeds 2511–2530 from an empty book. The debrief contains the story, which report parts were right, and the discoveries.
- **Caps:** 55 lines and 6,400 characters. The book is frozen to `arena/invoice-books/`.
- **Test:** Haiku and Luna play invoice seeds 2001–2055 with the book.
- **Reused controls:** the transfer-test alone and fake-book (`cc9c908d`, 6,608 characters) games on the same seeds. All 220 were re-checked as valid with matching versions:
  - Haiku: alone 15, fake 16 solved
  - Luna: alone 12, fake 16 solved
- **Verdict:** the same rule as decision 6.
- **Starts automatically** when the case-3 follow-up has finished.
- **Result (2026-11-05): VERDICT "Yes".** Book `131af10b`, 6,047 characters; Opus solved 20 of 20 in practice.
  | solved of 55 | alone | fake (cc9c908d) | Sonnet leak book (transfer test) | **specialised** |
  |---|---|---|---|---|
  | Haiku | 15 | 16 | 16 | **55** (+40/−0) |
  | Luna | 12 | 16 | 16 | **49** (+39/−2) |
  - Without a book, both AIs often ran out of commands (filed 34 and 32 of 55, at about 58 commands). With the book they filed nearly always, at 37 and 46 commands.
  - A human read the book. It holds methods only, but it encodes this case family's three methods and their proof pairs, plus budget routes. It is game-structure knowledge, not answers. Real incidents would vary more than one generator does.

## Library test (pre-registered 2026-11-05, before any library game)
- **Idea (Yentl):** one book with one chapter per crime. The player picks the chapter itself.
- **Book:** `arena/library-books/playbook-frozen-1dcb3eca.md`, 18,993 characters. It is a short router intro plus three unchanged chapters:
  - leak book `9693baa4`
  - invoice book `131af10b`
  - prototype book `4e45bae9`
- **Note:** each game's prompt already names the kind of case ("investigating a leaked game build", and so on), so picking the chapter is easy. The real question is whether a three-times-longer book with two irrelevant chapters still helps small players as much as their own chapter alone.
- **Test:** Haiku and Luna play with the library book on leak 1001–1055, invoice 2001–2055 and prototype 6001–6055, 330 games in all.
- **Reused controls:** alone and each crime's specialised book, on the same seeds with the same versions, manifest-checked.
- **Primary verdict:**
  - "Yes" means the library beats alone for both AIs in all three crimes, each at an exact one-sided paired sign test p ≤ 0.025, with ≥ 9 net extra solves.
  - "A little" means the tests pass but a gain is smaller.
  - "Not yet" otherwise.
- **Secondary, descriptive:** library vs each specialised book as net solves. A net difference within ±5 is read as "about as good".
- **Script:** `arena/library.py` (make / run / story).
- **Amended before any counted game (2026-11-05, Yentl):**
  - The named-prompt library run was stopped after a few minutes. Its few games (condition `playbook:`) are not used.
  - The test now uses a **neutral prompt** (`arena/prompts_neutral.py`, run_batch condition `neutral:<book>`, manifest `prompt_variant: neutral`): "You are investigating an incident at Pixelforge… who is responsible, how it was done, and two pieces of evidence." The player must read the case on screen to pick the chapter.
  - Everything else is unchanged: book `1dcb3eca`, seeds, reused controls (which used the named prompts) and the verdict.
- **Fair "no book" control (Yentl, 2026-11-05, fixed before any such game):** `arena/mixed_alone.py`.
  - Cases: 55 drawn at random (`random.Random(20261105)`) from the 165 test cases: leak 17, invoice 16, prototype 22.
  - Play: alone, with the same neutral prompt (condition `neutral-alone`), Haiku and Luna, 110 games, after the library run.
  - Verdict: the library beats neutral-alone on these 55 pairs for both AIs at exact one-sided p ≤ 0.025.
- **Result (2026-11-05 20:39): VERDICT "Yes"**, with the neutral prompt. The library beats alone for both AIs in all three crimes (all p < 0.0001, every net gain ≥ 18).
  | solved of 55 | alone (named prompt) | own specialised book | **library, neutral prompt** |
  |---|---|---|---|
  | Haiku leak | 8 | 40 | **45** |
  | Haiku invoice | 15 | 55 | **51** |
  | Haiku prototype | 26 | 39 | **54** |
  | Luna leak | 5 | 29 | **28** |
  | Luna invoice | 12 | 49 | **48** |
  | Luna prototype | 14 | 48 | **50** |
  - Library vs specialised is within ±5 everywhere except Haiku on the prototype (+15). That one is unexplained, and it is descriptive only:
    - the games ran at different times
    - another chapter's evidence lessons may help
  - The neutral-prompt "no book" control (`mixed_alone.py`) is running.
- **No-book control result (2026-11-05 ~22:00): VERDICT "Yes".** The same neutral prompt and the same 55 mixed cases.
  - Haiku: alone 13, library 51 (+38/−0).
  - Luna: alone 9, library 38 (+30/−1).
  - Both p < 0.0001.
