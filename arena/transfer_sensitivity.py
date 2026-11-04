"""Read-only robustness check for the invoice transfer test.

Main analysis: games that broke a rule (audit did not pass) were archived and replayed.
Here we instead count every such rule-breaking attempt as UNSOLVED for that seed and
condition, then redo the primary Sonnet-vs-alone sign test. Quota/interrupted attempts
are not counted (they say nothing about the player).
"""
import json
import pathlib

import story
import story2

INVALID = pathlib.Path(r'C:\Users\yentl\pixelforge-arena\games-invalid')


def rule_breaks():
    out = set()
    for rec in INVALID.glob('recovery-*/recovery.json'):
        for item in json.loads(rec.read_text(encoding='utf-8')):
            if item.get('reason') == 'audit did not pass' and item['id'].startswith('inv-'):
                out.add(item['id'])
    return out


def outcomes(player, key, conds, versions):
    """seed -> (gid, correct) for every valid collected game."""
    out = {}
    for seed in story2.PLANNED:
        job = story2.run_batch.InvoiceJob(seed, player, conds[key]['condition'])
        if not (story2.GAMES / job.gid / 'result.json').exists():
            continue
        g = {'id': job.gid, 'seed': seed, 'player': player, 'condition': conds[key]['condition']}
        try:
            story2.invoice_result(g, story2.GAMES, {'seeds': story2.PLANNED, 'versions': versions[player][key]})
        except Exception:
            continue
        out[seed] = (job.gid, bool(g['correct']))
    return out


def main():
    versions = json.loads((story2.HERE / 'invoice-versions.json').read_text(encoding='utf-8'))
    conds = story2.conditions()
    broken = rule_breaks()
    print(f'rule-breaking attempts archived: {len(broken)}')
    for player in story2.PLAYERS:
        alone, book = outcomes(player, 'alone', conds, versions), outcomes(player, 'sonnet', conds, versions)
        seeds = sorted(alone.keys() & book.keys())
        main_w = sum(book[s][1] and not alone[s][1] for s in seeds)
        main_l = sum(alone[s][1] and not book[s][1] for s in seeds)
        ok = lambda r: r[1] and r[0] not in broken
        w = sum(ok(book[s]) and not ok(alone[s]) for s in seeds)
        l = sum(ok(alone[s]) and not ok(book[s]) for s in seeds)
        hit = sum(r[0] in broken for s in seeds for r in (alone[s], book[s]))
        print(f'{player}: {len(seeds)} pairs | main +{main_w}/-{main_l} p={story.sign_test(main_w, main_l):.3f} | '
              f'rule-breaks as unsolved ({hit} affected) +{w}/-{l} p={story.sign_test(w, l):.3f}')


if __name__ == '__main__':
    main()
