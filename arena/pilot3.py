"""Pilot only (not part of any experiment): a big model plays missing prototype pilot cases (6901-6999) alone,
to measure how many commands a careful day needs before the budget is fixed (DESIGN-exp3.md, point 4: isolated validator, never shown to the teacher)."""
import json
import sys
from concurrent.futures import ThreadPoolExecutor

import run_batch

PLAYER = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].isdigit() else 'sonnet'
SEEDS = [int(s) for s in sys.argv[1:] if s.isdigit()] or [6901, 6902, 6903, 6904]


def one(seed):
    job = run_batch.ProtoJob(seed, PLAYER, 'alone')
    try:
        run_batch.run_game(job, run_batch.ARENA, 2400, run_batch.MODELS[PLAYER])
    except Exception as exc:  # report and continue with the other seeds
        return {'id': job.gid, 'error': str(exc)[:300]}
    r = json.loads((run_batch.ARENA / 'games' / job.gid / 'result.json').read_text(encoding='utf-8'))
    return {'id': job.gid, 'layout': r.get('layout'), 'report': r.get('report'), 'commands': r.get('commands_used'),
            'clicks': r.get('total_clicks'), 'seconds': r.get('seconds')}


with ThreadPoolExecutor(4) as pool:
    for out in pool.map(one, SEEDS):
        print(json.dumps(out), flush=True)
