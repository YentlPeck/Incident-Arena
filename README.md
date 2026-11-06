# Written by Yentl

The news is nowadays full of cybersecurity incidents, strongly caused by the increased capabilities of AI Agents. As such it is important to educate ourselves on how these things are done and how we can prevent them. With Incident Arena I created a small game to find out to what degree AI models can solve typical cyberincidents like pishing and leaked information. Stronger models are already quite capable at solving these but smaller ones tend to perform better when presented with a knowledge book. Overall I was able to increase the capabilties of smaller models while keeping the cost per solved case quite low.

One important side node: these incidents are quite simple and harmless (given they are just a game). The rabbit hole of cybersecurity goes a lot deeper and in my opinion it is much easier nowadays to cause harm than prevent it. Because of this ease I believe frontier labs should lower their barriers on cybersecurity flags and make it easier to create more protective tools. Just my opinion though.

# Written by Claude

# Incident Arena

A browser detective game that small AIs play from screenshots, with and without a playbook written by a big AI.

A fake game studio, *Pixelforge*, on a fake computer. A crime has happened. The AI must find **who did it, how, and the
two records that prove it**, using only screenshots, a mouse and 60 commands.

## How it works

1. **A big AI practises.** Claude Opus plays 20 practice cases of a crime.
2. **It writes a playbook.** General lessons only: no names and no answers. Then the playbook is frozen.
3. **Small AIs play.** Claude Haiku 5.5 and GPT-6-Luna each play 55 new cases, with and without the playbook.
4. **Every game is checked.** A game that breaks the rules is replayed, never counted.

The game has three crimes. Each one can happen three ways:

| Crime | What happened |
|---|---|
| The leaked beta | An unreleased build of the game was downloaded with a stolen login and posted on a forum. |
| The fake invoice | A supplier's bank account was swapped, and the next invoice was paid to a thief. |
| The missing prototype | The only handheld prototype left the locked hardware room over the weekend. |

## Result

55 new cases, mixed from the three crimes. The playbook has a chapter per crime. The AI is told only "an incident at
Pixelforge" and has to pick the right chapter itself.

| Model | Alone | With the playbook |
|---|---|---|
| Claude Haiku 5.5 | 13 of 55 solved, $0.36 per solved case | **51** of 55, $0.10 per solved case |
| GPT-6-Luna | 9 of 55 solved, $0.30 per solved case | **38** of 55, $0.07 per solved case |

What we learned along the way:

- **A playbook for one kind of crime works.** On the fake invoice, Haiku went from 15 to 55 solved.
- **Lessons do not travel.** A book from another crime did not help. One merged "general" book even made Haiku worse
  on the prototype (26 → 11).
- **A fake playbook barely helps.** One of the same length, with no useful lessons, was always tested too.

Each verdict rule was fixed before the first test game. All numbers and statistics are in
[docs/DESIGN-exp3.md](docs/DESIGN-exp3.md).

**Limits:** each crime comes from one case generator, so the playbooks learn how this game's crimes work, and real
incidents vary far more. The test used two small models and 55 cases per test.

## Try it

Open `game/index.html` (the hand-made levels) or `game/case.html` (a random case) in a browser. There is nothing to
install. The website with the whole story is [`results/index.html`](results/index.html).

## What is where

| Folder | Contents |
|---|---|
| [`game/`](game/) | the browser game: levels, random cases, case generators |
| [`arena/`](arena/) | the scripts that make AIs play and measure them, plus the playbooks |
| [`results/`](results/) | the website |
| [`docs/`](docs/) | the design notes, with every result and its statistics |

The AIs played through ordinary subscriptions (the `claude` and `codex` CLIs). The studio and every case are made up;
no real system was touched.
