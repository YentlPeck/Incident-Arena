"""Read-only analysis of the pre-registered guard duty test (DESIGN-guard.md).
Usage: python arena/story_guard.py   -> prints counts, paired tests and the verdict.
A game counts only if it finished, its audit passed and its manifest matches the planned versions."""
import json
import pathlib

import run_batch
import story

HERE = pathlib.Path(__file__).resolve().parent
GAMES = run_batch.ARENA / 'games'
SEEDS = list(range(7001, 7056))
PLAYERS = ('haiku', 'luna')
BOOKS = {'book': HERE / 'guard-books' / 'playbook-frozen-6c1bc2af.md', 'fake': HERE / 'guard-books' / 'playbook-frozen-609fe32c.md'}
ALPHA, NET = 0.025, 9


def condition(key):
    return 'alone' if key == 'alone' else f'playbook:{BOOKS[key].resolve()}'


def outcome(player, key, seed):
    job = run_batch.GuardJob(seed, player, condition(key))
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
    if man != run_batch.build_manifest(text, run_batch.MODELS[player], 'guard'):
        return None
    rep = res.get('report') or {}
    return {'safe': bool(rep.get('correct')), 'missed': rep.get('missed'), 'false': rep.get('falseStops'),
            'decided': rep.get('decided'), 'cmds': res.get('commands_used')}


def main():
    verdict_parts, complete = [], True
    for p in PLAYERS:
        got = {k: {s: outcome(p, k, s) for s in SEEDS} for k in ('alone', 'book', 'fake')}
        n = {k: sum(v is not None for v in got[k].values()) for k in got}
        safe = {k: sum(bool(v and v['safe']) for v in got[k].values()) for k in got}
        print(f'{p}: valid games {n} | safe days {safe}')
        for ctrl in ('alone', 'fake'):
            pairs = [s for s in SEEDS if got['book'][s] and got[ctrl][s]]
            w = sum(got['book'][s]['safe'] and not got[ctrl][s]['safe'] for s in pairs)
            l = sum(got[ctrl][s]['safe'] and not got['book'][s]['safe'] for s in pairs)
            pv = story.sign_test(w, l)
            print(f'   book vs {ctrl}: {len(pairs)} pairs, +{w}/-{l}, p = {pv:.4f}')
            complete &= len(pairs) == len(SEEDS)
            verdict_parts.append((pv <= ALPHA, w - l >= NET))
        for k in got:
            vs = [v for v in got[k].values() if v]
            if vs:
                print(f'   {k}: missed scams {sum(v["missed"] or 0 for v in vs)}, false stops {sum(v["false"] or 0 for v in vs)}, '
                      f'unfinished days {sum((v["decided"] or 0) < 8 for v in vs)}, avg commands {sum(v["cmds"] or 0 for v in vs) / len(vs):.1f}')
    if not complete:
        verdict = 'Too early'
    elif all(ok for ok, _ in verdict_parts):
        verdict = 'Yes' if all(big for _, big in verdict_parts) else 'A little'
    else:
        verdict = 'Not yet'
    print('VERDICT:', verdict)


if __name__ == '__main__':
    main()
