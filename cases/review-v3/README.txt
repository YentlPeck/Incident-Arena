The four JavaScript files in this folder are verbatim copies of the second
adversarial review (Temp/pf-adv3). They document the original exploit algorithms.
Their hard-coded old paths and diagnostic examples are preserved for provenance.

Run the permanent, range-aware, null-safe versions of every attack via:
  node cases/check2-construction.js 1 10000
or via the full checker:
  node cases/check2.js 1 5000
  node cases/check2.js 5001 10000

GEN2 selects a development generator. Missing/ambiguous exploit candidates
abstain instead of crashing. Each attack reports its own actual class prior,
denominator and prior+10-percentage-point limit. The construction classifiers
add an independent train split (100001..104000), depth-4 trees and categorical
NB for episode ranking, global layout and insider identity. No model/player is
invoked; these are deterministic statistical audits of visible fixture data.

UI replay (local file URL; no server):
  python cases/replay2.py --dev
  python cases/replay2.py
Screenshots and the complete table geometry report go to Temp/pf-case2-shots/v4.
