"""Print a one-screen status of the invoice transfer test (read-only)."""
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
state = json.loads((HERE / 'transfer-progress.json').read_text(encoding='utf-8'))
for player, info in state['players'].items():
    print(player, info.get('status'), 'checked', info.get('checked', '-'))
text = (HERE.parent / 'results' / 'story2.js').read_text(encoding='utf-8')
data = json.loads(re.sub(r'^window\.PF_STORY2 = |;\s*$', '', text.strip()))
for ai, v in data.get('per_ai', {}).items():
    conds = v.get('conditions', {})
    print(' ', ai, ' | '.join(f"{k} {c.get('solved', '?')}/{c.get('n', 0)}" for k, c in conds.items()))
print('updated', state.get('updated'))
