"""Read-only analysis of the pre-registered Experiment 3 test (DESIGN-exp3.md, v2) on the missing prototype.
Usage: python arena/story3.py -> counts, paired tests and the verdict.
The books are fixed in general-books/test-plan.json before any test game runs. A game counts only if it
finished, its audit passed and its manifest matches the planned versions. Endpoint: report correct."""
import json
import pathlib

import run_batch
import story

HERE = pathlib.Path(__file__).resolve().parent
GAMES = run_batch.ARENA / 'games'
PLAN = json.loads((HERE / 'general-books' / 'test-plan.json').read_text(encoding='utf-8'))
SEEDS = list(range(PLAN['seeds'][0], PLAN['seeds'][1] + 1))
PLAYERS = tuple(PLAN['players'])
BOOKS = {k: HERE / 'general-books' / v for k, v in PLAN['books'].items()}   # 'book' and 'fake'
ALPHA, NET = 0.025, 9


def condition(key):
    return 'alone' if key == 'alone' else f'playbook:{BOOKS[key].resolve()}'


def outcome(player, key, seed):
    job = run_batch.ProtoJob(seed, player, condition(key))
    d = GAMES / job.gid
    try:
        res = json.loads((d / 'result.json').read_text(encoding='utf-8'))
        audit = json.loads((d / 'audit.json').read_text(encoding='utf-8'))
        run = json.loads((d / 'run.json').read_text(encoding='utf-8'))
        man = json.loads((d / 'manifest.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return None
    text = None if key == 'alone' else run_batch.frozen_playbook(BOOKS[key])
    if not audit.get('ok') or run.get('exitcode') != 0 or run.get('error'):
        return None
    if man != run_batch.build_manifest(text, run_batch.MODELS[player], 'proto'):
        return None
    rep = res.get('report') or {}
    return {'solved': bool(rep.get('correct')), 'filed': bool(rep.get('filed')), 'who': bool(rep.get('who_ok')),
            'how': bool(rep.get('how_ok')), 'evidence': bool(rep.get('evidence_ok')), 'cmds': res.get('commands_used')}


def main():
    verdict_parts, complete = [], True
    for p in PLAYERS:
        got = {k: {s: outcome(p, k, s) for s in SEEDS} for k in ('alone', 'book', 'fake')}
        n = {k: sum(v is not None for v in got[k].values()) for k in got}
        solved = {k: sum(bool(v and v['solved']) for v in got[k].values()) for k in got}
        print(f'{p}: valid games {n} | solved {solved}')
        for ctrl in ('alone', 'fake'):
            pairs = [s for s in SEEDS if got['book'][s] and got[ctrl][s]]
            w = sum(got['book'][s]['solved'] and not got[ctrl][s]['solved'] for s in pairs)
            l = sum(got[ctrl][s]['solved'] and not got['book'][s]['solved'] for s in pairs)
            pv = story.sign_test(w, l)
            print(f'   book vs {ctrl}: {len(pairs)} pairs, +{w}/-{l}, p = {pv:.4f}')
            complete &= len(pairs) == len(SEEDS)
            verdict_parts.append((pv <= ALPHA, w - l >= NET))
        for k in got:
            vs = [v for v in got[k].values() if v]
            if vs:
                print(f'   {k}: filed {sum(v["filed"] for v in vs)}, who right {sum(v["who"] for v in vs)}, '
                      f'how right {sum(v["how"] for v in vs)}, evidence right {sum(v["evidence"] for v in vs)}, '
                      f'avg commands {sum(v["cmds"] or 0 for v in vs) / len(vs):.1f}')
    if not complete:
        verdict = 'Too early'
    elif all(ok for ok, _ in verdict_parts):
        verdict = 'Yes' if all(big for _, big in verdict_parts) else 'A little'
    else:
        verdict = 'Not yet'
    print('VERDICT:', verdict)


if __name__ == '__main__':
    main()
