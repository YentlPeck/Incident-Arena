"""Pilot only (not part of any experiment): a big model plays guard duty pilot days (7901-7999) alone,
to measure how many commands a careful day needs before the budget is fixed (DESIGN-guard.md, decision 3)."""
import json
import sys
from concurrent.futures import ThreadPoolExecutor

import run_batch

PLAYER = 'sonnet'
SEEDS = [int(s) for s in sys.argv[1:]] or [7901, 7902, 7903, 7904]


def one(seed):
    job = run_batch.GuardJob(seed, PLAYER, 'alone')
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
