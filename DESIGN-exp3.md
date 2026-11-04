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
