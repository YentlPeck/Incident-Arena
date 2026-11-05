# arena

The scripts that make AIs play the game and measure the results, plus every playbook.

| Files | What they do |
|---|---|
| `server*.py`, `prompts*.py` | run one game in a headless browser and give the AI player its instructions |
| `run_batch.py` | plays many games in parallel and records the exact versions used |
| `audit.py` | checks every transcript; a game that breaks the rules does not count |
| `practice*.py` | a big AI practises and writes or updates a playbook |
| `story*.py`, `library.py`, `mixed_alone.py` | the analyses: paired tests and the pre-registered verdicts |
| `test_*.py` | unit tests (`python -m unittest discover -s arena -p "test*.py"`) |
| `playbook-frozen-*.md`, `*-books/` | the frozen playbooks used in the tests, each with its content hash in the name |
