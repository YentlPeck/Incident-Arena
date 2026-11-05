# Design: random cases + a learned playbook

## Why
Today's teacher (`arena/teacher.py`) is hand-written by someone who knows each level's answer, so it is partly a walkthrough. Results so far (Level 4): small AIs reach 5–7 of 10 discoveries alone and 6–7 with that teacher, so even an answer-aware teacher barely helps.
The project goal: find the limits of small LLMs, then build a wrapper/teacher that makes them do significantly better. To make that claim honest, nobody (not the builder, not the teacher) may know a case's answer in advance.

## 1. Case generator
- Every case is built from a **seed** (number). Same seed = same case (replayable); new seed = new case.
- Same apps and engine as Level 4: Mail, Chat, Files (with activity), Security (device timelines, door badges, accounts), Browser (company site, Chirper social, domain lookup, leak check).
- Building blocks, picked at random:

| Block | Version 1 options |
|---|---|
| What happened | ransomware · leaked game build · poisoned update · fake invoice (stolen money) |
| Way in | phishing link · leaked password reused · MFA fatigue · old account never switched off · password written down |
| Who did it | outsider · insider · insider helping an outsider |
| Twists (0–3) | fake suspect with alibi · mismatched clocks (UTC / local / drifting badge reader) · prompt-injection trap in evidence · noise (extra mails, people) |
| Details | names, roles, times, devices, domains: random |

- Each case is a chain of clues (discoveries). The final report asks: who, how, 2 pieces of evidence.
- **Solvability check**: an automatic test that every clue in the chain exists on screen and that the evidence logically points to exactly one answer (no second person fits).
- Score: discoveries as % (cases differ in size), plus clicks/commands; traps fallen for counted separately.

## 2. Learning loop (like the earlier Pokémon teacher project)
1. **Practice**: a big AI plays practice seeds 1–20. It never sees answers during play. After each case the end screen explains what really happened; the AI then writes/updates a **playbook** of general lessons (methods, not case answers).
2. **Test**: small AIs (Claude Haiku, GPT-6-Luna) play unseen seeds 1001+, once alone and once with the playbook. Same seeds for both conditions.
3. Result on the website: one question ("Can a learned playbook help small AIs?"), one answer, one chart.

## 3. Also
- The human player can play random cases (no spoiler problem any more).
- Levels 1–4 stay as they are.

## Open questions
- Playbook delivery: in the starting prompt (simple) or as an `ask` teacher (an LLM that reads the playbook + the screen)?
- How many test seeds per condition are needed for a result that isn't luck?

---

## Version 1 as built (after Sol 6.1's review: "build with changes")
- **One incident** ("the leaked beta") with **3 hidden layouts**: insider using a holiday colleague's written-down login · outsider via a fake email · outsider via a password reused from an old breach. Every case contains the decoys of all three (fake email, breach, handover note, holiday, late workers), so the presence of a clue never reveals the layout.
- **2 of 4 twists per case**: clocks (UTC logs, UTC+1 office, drifting door readers, forum in another zone) · AI trap (instructions inside the forum post) · false anonymous tip · noise (10 staff instead of 7, extra mail).
- **Main score: correct report** (who + how + 2 evidence) within 60 commands. Side scores: each report part, discoveries (5), traps, clicks.
- **Checker** (`node cases/check.js 1 5000`): a solver that sees only on-screen data must reach the generator's answer in every case; plus consistency checks and shortcut tests (list position, how often the culprit is named, "last person in the room", sloppy clock reading).
- **No state-reading teacher.** The playbook goes in the starting prompt; it is frozen before testing; test seeds (1001+) never feed back into it.
- **Test size**: ~50 shared seeds per model, alone vs playbook, alternating order. Ask the owner before spending on it.
