"""Pilot only (not part of any experiment): Sonnet plays family-2 pilot seeds alone to check the 60-command budget."""
import json
import sys
from concurrent.futures import ThreadPoolExecutor

import run_batch

SEEDS = [int(s) for s in sys.argv[1:]] or [2901, 2902, 2903]


def one(seed):
    job = run_batch.InvoiceJob(seed, 'sonnet', 'alone')
    try:
        run_batch.run_game(job, run_batch.ARENA, 1800, run_batch.MODELS['sonnet'])
    except Exception as exc:  # report and continue with the other seeds
        return {'id': job.gid, 'error': str(exc)}
    r = json.loads((run_batch.ARENA / 'games' / job.gid / 'result.json').read_text(encoding='utf-8'))
    return {'id': job.gid, 'layout': r.get('layout'), 'report': r.get('report'), 'found': r.get('found'),
            'commands': r.get('commands_used')}


with ThreadPoolExecutor(3) as pool:
    for out in pool.map(one, SEEDS):
        print(json.dumps(out), flush=True)
