"""Read-only analysis of the crime-2 specialised book: the frozen invoice book against the reused transfer-test
alone and fake-book (cc9c908d) games on invoice seeds 2001-2055. Same validity checks and verdict as story3.py."""
import json
import pathlib

import run_batch
import story3

HERE = pathlib.Path(__file__).resolve().parent
books = sorted((HERE / 'invoice-books').glob('playbook-frozen-*.md'))
if len(books) != 1:
    raise SystemExit('Expected exactly one frozen invoice book in arena/invoice-books/')
story3.SEEDS = list(range(2001, 2056))
story3.BOOKS.update(book=books[0], fake=HERE / 'playbook-frozen-cc9c908d.md')


def outcome(player, key, seed):
    job = run_batch.InvoiceJob(seed, player, story3.condition(key))
    d = story3.GAMES / job.gid
    try:
        res, audit, run, man = (json.loads((d / f).read_text(encoding='utf-8'))
                                for f in ('result.json', 'audit.json', 'run.json', 'manifest.json'))
    except (OSError, ValueError):
        return None
    text = None if key == 'alone' else run_batch.frozen_playbook(story3.BOOKS[key])
    if not audit.get('ok') or run.get('exitcode') != 0 or run.get('error'):
        return None
    if man != run_batch.build_manifest(text, run_batch.MODELS[player], 'invoice'):
        return None
    rep = res.get('report') or {}
    return {'solved': bool(rep.get('correct')), 'filed': bool(rep.get('filed')), 'who': bool(rep.get('who_ok')),
            'how': bool(rep.get('how_ok')), 'evidence': bool(rep.get('evidence_ok')), 'cmds': res.get('commands_used')}


story3.outcome = outcome
print('specialised invoice book:', books[0].name)
story3.main()
