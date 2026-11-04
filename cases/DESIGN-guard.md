# Guard duty: a prevention mode (design v2)

Status: v2 after a review by GPT-6.1-Sol on 2026-11-04 (verdict: "Ready after changes"). The decisions below override the draft that follows them. The mode comes from Yentl's idea: "someone tries to trick us with a mail; we get a warning when we're about to do it wrong, and it stops the click until we are sure."

## Decisions after review
1. **Endpoint.** "Safe day" stays the binary main endpoint. A player must decide on **all 8 items**, and an unfinished day counts as a fail. Scams stopped, false stops, work done and commands used are reported only as descriptions.
2. **No count clue.** Each item is a scam **independently with p = 0.3**, and that probability is the same for every item type. The number of scams therefore varies from 0 to 8 and tells the player nothing about the remaining items. The game gives no correctness feedback until the day ends. Baselines under this design:
   - "Do everything" is safe only on 0-scam days (0.7^8 ≈ 5.8%).
   - "Stop everything" is safe only when at least 7 items are scams (≈ 0.1%).
   - Random coin flips and type rules are measured by `check-guard.js`, and every baseline is printed next to the results.
3. **Command budget.** The budget is not 60 by default. We first write a full action ledger (open, navigate, check, return, decide) and run isolated pilot days with a big AI. The budget is fixed only after that, so careful checking fits but "check everything twice" does not. One decisive check is enough to decide; two checks are available, but they are not required.
4. **Generator protections**, all audited by `check-guard.js` on fresh validation seeds after every change:
   - Surface wording, urgency, punctuation, the lengths of domains and names, formatting and which check buttons exist all have **matching distributions** for scam and harmless items. This includes relational features, such as the gap between a display name and the address length (Round 6).
   - Position, arrival time, gaps, order, prominence, repeated people or companies, and queue composition are all independent of the truth (Rounds 4–5).
   - The scam rate is **equal within every item type and every pair of types**.
   - Check outputs: "not applicable", missing records, output length and wording style must not reveal the truth. **No universal oracle**: a call-back answers one specific question ("did you send this file?", "is this your new bank account?"). The password manager, domain age and every other check each settle only *some* item kinds.
   - **Harmless twins are really harmless** (Round 7). Example: a real IT colleague asking for a password is still a scam-like request that must be stopped, so the game can never use it as a harmless twin. Every label is verified independently by the solver, and a test removes the decisive evidence to confirm the label cannot be guessed without it.
5. **Experiment A carries over every safeguard from `DESIGN-exp3.md`:**
   - one frozen book with a token cap, plus a length-matched fake book
   - fixed seeds, endpoint, retry rule and condition order (interleaved per seed, fresh session per game)
   - 55 paired **days** as the unit, not 440 separate items
   - the book must beat both alone and the fake book, for both AIs, each at exact one-sided p ≤ 0.025
   - "Yes" also needs at least 9 net extra safe days against each control
   - results reported with wins, losses, ties and paired 95% confidence intervals
6. **Experiment B (Yentl + AI guard) is a demo.** We log, per attempted action:
   - the screen sent to the guard, its answer and how long it took
   - which checks it named and which were opened
   - overrides, the final decision and timestamps
   - the hidden truth, attached after the day

   We report the warning rate on harmless actions, repeat warnings, compliance, overrides and time cost. We claim only "what happened for this person in these days": no general protection effect and no fatigue claim unless compliance visibly drops over time. A short rating question is asked after each day.

## Code review rounds (GPT-6.1-Sol, 2026-11-04)
- **Round 1** ("Ready after changes") found these leaks:
  - repeated bank accounts and requester names gave away labels
  - domain relationships within a day were visible
  - lookup owners existed only for scams, and one domain collided
  - invoice numbers repeated, and IBANs were invalid
  - the answer was exposed before the day ended
  - the checker had no relational features, and the coin-flip baseline was wrong

  **Fixed by:**
  - one organisation and one person per item, drawn before labels
  - separate random streams for presentation and labels
  - valid mod-97 IBANs and unique invoice numbers
  - truth hidden until the day ends
  - a checker that now tests identity uniqueness, relational features and real baselines
- **Round 2** ("Ready after changes") found that comparing the domain words with the lookup owner settled 100% of items: a universal oracle.

  **Fixed by:**
  - Every organisation now has two legal names from the same generator. A look-alike domain is registered to the look-alike legal name, which carries the same brand words.
  - Real legal names appear only in the supplier register and on vendor pages, so a lookup decides only payments and updates.
  - Half of payment and access scams now come from the **genuine** address: a misused real mailbox, or a request that was never approved. For these, only the account check or a call-back settles it.
  - Link items gained a second check, the "Sign-in pages" bookmark.
  - Regression checks: the owner-prefix rule now sits at the prior (0.697 vs 0.697), and owner repeats are 0.016 for scams vs 0.039 for real items.
  - The classifier uses only what is visible without checks: AUC 0.485.
- **Pilot (2026-11-04)**: Sonnet 5.5 played pilot seeds 7901–7904 alone, with a budget of 100 commands.
  - Result: 3 of 4 safe days, using 31–40 commands per day, and every audit passed.
  - On 7902 it stopped a real partner file. Two causes: partner senders showed no company name, and the partner list sat below the fold of the Directory window.
  - Fixed: partner senders now show "(Company)", and the Directory now fits without scrolling.
  - **Budget fixed at 60 commands** (`arena/prompts_guard.py`).
  - Arena wiring: `server_guard.py`, `prompts_guard.py`, and `run_batch.py --family guard` with ids `grd-…`. Seeds are 7001–7055 for the test and 7901–7999 for the pilot.
- Checks that expose a scam, per type:
  - link: 2
  - update: 2
  - file: 2
  - payment: 2 or 4
  - access: 1 (unapproved request from a genuine address) or 3
- One decisive check is enough. "Show address" on a staff file is accepted as one intended check.

---

## Draft v1 (kept for the record)

## Idea
The existing families are **forensics**: the incident already happened and the player works out who did it and how. Guard duty is **prevention**: the player has to stop the scam *before* it works, without blocking normal work.

## Story
It is a workday at Pixelforge (the same fake computer and look). The player is the on-duty helper for one employee. A **queue of 8 items** arrives during the day. Each item asks for one action:
- open a link, or sign in on a page
- open or download a shared file
- approve a payment, or change bank details
- install an update or plugin
- give a code or password to someone in chat

For each item the player chooses **Do it** or **Stop it**, which reports it as a scam. Nothing can be undone.

## Hidden truth per day
- 8 items. **2 or 3 are scams**, drawn at random so the count itself is no clue. The rest are real work.
- Scam kinds:
  - fake login page (lookalike domain)
  - reply-to / sender mismatch
  - fake "IT" chat asking for a code
  - bank-detail change from a lookalike supplier
  - fake update from a non-vendor domain
  - shared file from an outside account posing as a colleague
- Every real item has a **look-alike twin risk**: it looks scary but is fine. Examples: a real IT mail from the real but unusual helpdesk domain, a real supplier with a new but verified address, a real urgent request from the boss. Real items must be just as "scary-looking" on the surface as scams. Only checks reveal the difference.

## Checks the player can do (each costs clicks)
- show the full sender address and reply-to
- hover or inspect where a link really goes
- domain lookup: age, owner
- the password manager: does it know this site?
- the staff directory, then a **call-back** to the real person (slow, two clicks, always truthful)
- the supplier register (official bank details)
- the vendor's official update page

Every scam can be proven by **at least two different checks**, and every harmless twin can be cleared by at least two. No single check works for every kind, so the player has to pick the right one.

## Scoring (fixed before any AI plays)
- **Main endpoint, binary per day: "safe day"** = every scam stopped **and** no more than one real item stopped.
  - A guard that stops everything fails, because it stops 5–6 real items.
  - A guard that allows everything fails, because scams get through.
- Secondary counts, descriptive only:
  - scams stopped
  - false alarms
  - real work done
  - clicks used
- Budget: 60 commands, same as the other families.

## Experiment A: AIs as the guard (same method as before)
- Players: Haiku 5.5 and GPT-6-Luna.
- Conditions:
  - alone
  - with a playbook written by Opus after 20 practice days
  - with a length-matched fake playbook
- 55 paired test days.
- Same verdict rule:
  - exact one-sided paired sign test
  - the playbook must beat both alone and fake, for both AIs, at p ≤ 0.025
  - "Yes" also needs ≥ 15 points
- Test seeds reserved and never inspected. Same audit (only the game's own commands count).

## Experiment B: an AI guard for a human (Yentl's warning idea; demo, small sample)
- Yentl plays guard duty themselves.
- In "guarded" mode, every time they click **Do it** on an item, the game pauses before the action runs. It sends the current screen to a small AI guard, Haiku with the playbook.
- The guard answers either "OK", or "Wait: check X first" together with a reason.
- While a warning is open, **Do it is locked**. They must first open at least one check the guard named, or explicitly override.
- They play some days without the guard and some with it, in random order and on different seeds.
- We count:
  - scams that got through
  - false alarms
  - how often the guard warned on harmless items, i.e. alarm fatigue
  - time per day
- This is a demo with one person, not a statistical test.

## Fairness tooling (same bar as families 2 and 3)
- seeded generator `gen-guard.js`
- reference solver that agrees with the hidden truth
- checker with:
  - rendered-text naive-Bayes and construction classifiers, which must not predict "scam" above prior + 10 points from surface text, position, length, timing, sender-name style or item type
  - the scam count is not predictable from the queue
  - every item has a twin of the same type in the opposite class across seeds

## Open questions for the reviewer
1. Is "safe day" the right binary endpoint? Or should it be "all scams stopped" with false alarms as a guardrail?
2. 8 items and 60 clicks: is that enough room to check properly without making "check everything" trivially possible?
3. For Experiment B, does the lock with an override make sense? What should we log so alarm fatigue is measurable?
4. Anything in this design that lets a player score well without real checking, for example a surface cue that gives scams away?
