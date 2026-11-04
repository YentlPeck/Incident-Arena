"""Collect every game into results/data.js for the results page.

python arena/collect.py
Reads arena/games.json (rounds + games) and, for AI games, the arena's result.json files.
Checks everything and stops with a clear message on bad data, so the page never shows nonsense.
Writes results/data.js as `window.PF_RESULTS = {...}` so the page also works when opened from disk.
"""
import datetime
import argparse
import json
import math
import pathlib
import re
import sys

try:
    from . import run_batch
except ImportError:
    import run_batch

HERE = pathlib.Path(__file__).resolve().parent
ARENA_GAMES = pathlib.Path(r'C:\Users\yentl\pixelforge-arena\games')
OUT = HERE.parent / 'results' / 'data.js'

KINDS = {'ai', 'human', 'cases'}

# API list prices in USD per million tokens, used only to estimate what a game would cost.
# We play on subscriptions, so the real cost is $0. Claude Code reports its own cost (total_cost_usd).
# GPT-6-Luna: input 0.10, cached input 0.01, output 0.50 (same prices as the Pokemon teacher project).
LUNA_PRICE = {'input': 0.10, 'cached': 0.01, 'output': 0.50}


def ai_cost(gid, maker, arena_games=None):
    tr = (arena_games or ARENA_GAMES) / gid / 'transcript.jsonl'
    need(tr.exists(), f'{gid}: no transcript to measure its cost')
    events = [json.loads(line) for line in tr.read_text(encoding='utf-8').splitlines() if line.strip().startswith('{')]
    if maker == 'Anthropic':
        res = [e for e in events if e.get('type') == 'result']
        need(res, f'{gid}: transcript has no final result with a cost')
        cost = res[-1].get('total_cost_usd')
        need(isinstance(cost, (int, float)) and not isinstance(cost, bool) and math.isfinite(cost) and cost >= 0,
             f'{gid}: bad cost {cost!r}')
        return cost
    if maker == 'OpenAI':
        turns = [e for e in events if e.get('type') == 'turn.completed']
        need(turns, f'{gid}: transcript has no completed turn with token usage')
        cost = 0.0
        for t in turns:
            u = t.get('usage')
            need(isinstance(u, dict), f'{gid}: a turn has no usage')
            vals = {}
            for k in ('input_tokens', 'cached_input_tokens', 'output_tokens'):
                v = u.get(k)
                need(isinstance(v, int) and not isinstance(v, bool) and v >= 0, f'{gid}: usage {k} is missing or bad ({v!r})')
                vals[k] = v
            need(vals['cached_input_tokens'] <= vals['input_tokens'], f'{gid}: cached input is larger than all input')
            p = LUNA_PRICE  # output_tokens already includes the reasoning tokens
            cost += ((vals['input_tokens'] - vals['cached_input_tokens']) * p['input']
                     + vals['cached_input_tokens'] * p['cached'] + vals['output_tokens'] * p['output']) / 1e6
        return cost
    raise BadData(f'{gid}: no price known for maker {maker!r}')
COACH = {'none', 'hints', 'coach'}


class BadData(Exception):
    pass


def need(cond, msg):
    if not cond:
        raise BadData(msg)


def counts(values, n, what, gid):
    need(isinstance(values, list) and len(values) == n, f'{gid}: {what} must be a list of {n} numbers (one per task)')
    for v in values:
        need(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v >= 0,
             f'{gid}: {what} has a bad value {v!r} (must be a number of 0 or more)')
    return values


def case_jobs(rounds):
    try:
        from .run_batch import Job, condition_id
    except ImportError:
        from run_batch import Job, condition_id
    games = []
    next_order = max((r['order'] for r in rounds.values()
                      if isinstance(r.get('order'), int) and not isinstance(r['order'], bool)), default=0) + 1
    for rid, r in rounds.items():
        if r.get('kind') != 'cases':
            continue
        seeds = r.get('seeds')
        need(isinstance(seeds, list) and seeds and all(isinstance(s, int) and not isinstance(s, bool) and s >= 0 for s in seeds),
             f'round {rid}: seeds must be a nonempty list of nonnegative integers')
        need(len(set(seeds)) == len(seeds), f'round {rid}: repeated seed')
        player, condition = r.get('player'), r.get('condition')
        need(player in ('haiku', 'luna'), f'round {rid}: player must be haiku or luna')
        try:
            need(isinstance(condition, str) and condition != 'practice', f'round {rid}: condition must be alone or playbook:<path>')
            condition_id(condition)
        except ValueError as exc:
            raise BadData(f'round {rid}: {exc}') from exc
        defaults = {'order': next_order, 'name': f'Random cases: {player} ({condition.split(":")[0]})',
                    'case': 'Random cases', 'level': 'case', 'date': datetime.date.today().isoformat(),
                    'tasks': ['Report correct'], 'note': 'Main score: all report answers correct.',
                    'progress_max': 5, 'traps': True, 'score': 'report_correct'}
        for key, value in defaults.items():
            r.setdefault(key, value)
        next_order += 1
        for seed in seeds:
            games.append({'id': Job(seed, player, condition).gid, 'round': rid, 'kind': 'cases',
                          'seed': seed, 'player': player, 'maker': 'OpenAI' if player == 'luna' else 'Anthropic',
                          'condition': condition, 'coach': 'none' if condition == 'alone' else 'hints', 'check': 'audit pending'})
    return games


def validate_case_run(g, result, directory, round_info):
    gid = g['id']
    try:
        run_batch.validate_test_seeds([g['seed']])
    except ValueError as exc:
        raise BadData(f'{gid}: {exc}') from exc
    need(g['seed'] in round_info.get('seeds', []), f'{gid}: seed is not in the round test set')
    audit = json.loads((directory / 'audit.json').read_text(encoding='utf-8'))
    need(audit.get('ok') is True, f'{gid}: audit did not pass')
    run = json.loads((directory / 'run.json').read_text(encoding='utf-8'))
    need(not run.get('error') and type(run.get('exitcode')) is int and run['exitcode'] == 0,
         f'{gid}: run error or unsuccessful player exit: {run.get("error") or run.get("exitcode")}')
    need(not result.get('error'), f'{gid}: result contains a run error')
    need(result.get('view') == 'screen', f'{gid}: view must be screen')
    manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
    need(isinstance(manifest, dict), f'{gid}: missing experiment manifest')
    versions = round_info.get('versions')
    required = ['playbook_sha256', *run_batch.VERSION_FILES, 'model', 'command_budget', 'view']
    missing = [k for k in required if not isinstance(versions, dict) or k not in versions]
    need(not missing, f'{gid}: round must declare versions for every recorded setting; missing: {", ".join(missing)}')
    for key in run_batch.VERSION_FILES:
        need(isinstance(manifest.get(key), str) and re.fullmatch(r'[0-9a-f]{64}', manifest[key]),
             f'{gid}: missing or invalid manifest {key}')
    playbook_sha = manifest.get('playbook_sha256')
    if g.get('condition') == 'alone':
        need(playbook_sha == 'none', f'{gid}: alone condition must have playbook_sha256=none')
    else:
        need(isinstance(playbook_sha, str) and re.fullmatch(r'[0-9a-f]{64}', playbook_sha),
             f'{gid}: playbook condition must declare a playbook hash')
    for key, expected in versions.items():
        need(key in manifest and manifest[key] == expected, f'{gid}: manifest {key} does not match round versions')
    need(isinstance(manifest.get('model'), str) and manifest['model'], f'{gid}: missing model id')
    need(manifest.get('view') == 'screen', f'{gid}: manifest view must be screen')
    budget = manifest.get('command_budget')
    need(type(budget) is int and budget > 0 and budget == round_info.get('command_budget', run_batch.prompts.COMMANDS),
         f'{gid}: command budget does not match round')
    used = result.get('commands_used')
    need(type(used) is int and 0 <= used <= budget, f'{gid}: commands_used exceeds budget or is invalid')


def case_result(g, arena_games, round_info):
    gid = g['id']
    directory = arena_games / gid
    result = json.loads((directory / 'result.json').read_text(encoding='utf-8'))
    validate_case_run(g, result, directory, round_info)
    need(result.get('seed') == g['seed'], f'{gid}: seed does not match round')
    report = result.get('report')
    need(isinstance(report, dict), f'{gid}: missing report')
    for key in ('filed', 'who_ok', 'how_ok', 'evidence_ok', 'correct'):
        need(isinstance(report.get(key), bool), f'{gid}: report.{key} must be true or false')
    need(report['correct'] == (report['filed'] and all(report[k] for k in ('who_ok', 'how_ok', 'evidence_ok'))),
         f'{gid}: inconsistent report correctness')
    need(result.get('done') == report['filed'], f'{gid}: done disagrees with report.filed')
    counts(result.get('clicks'), 1, 'clicks', gid)
    counts([result.get('seconds')], 1, 'time', gid)
    progress, pmax = result.get('progress'), result.get('progress_max')
    need(pmax == 5 and isinstance(progress, int) and not isinstance(progress, bool) and 0 <= progress <= 5,
         f'{gid}: discoveries must be 0..5 with progress_max=5')
    trapped, tmax = result.get('trapped'), result.get('traps_max')
    need(isinstance(trapped, list), f'{gid}: trapped must be a list')
    need(isinstance(tmax, int) and not isinstance(tmax, bool) and 0 <= len(trapped) <= tmax <= 2,
         f'{gid}: bad per-case traps_max or trapped count')
    g.update(done=result['done'], report=report, score=report['correct'], correct=report['correct'],
             who_ok=report['who_ok'], how_ok=report['how_ok'], evidence_ok=report['evidence_ok'],
             clicks=result['clicks'], total=sum(result['clicks']), total_seconds=result['seconds'],
             commands=result.get('commands_used'), view=result.get('view', 'screen'), asks=0,
             progress=progress, progress_max=pmax, discoveries=progress, discoveries_max=pmax,
             trapped=len(trapped), traps_max=tmax, layout=result.get('layout'), twists=result.get('twists', []))
    try:
        g['cost_usd'] = ai_cost(gid, g['maker'], arena_games)
    except (BadData, OSError, ValueError) as exc:
        g['cost_usd'] = None
        g['cost_note'] = str(exc)
    g['audit_ok'] = True
    g['check'] = 'audit passed'
    return g


def load(registry=None, arena_games=None):
    reg = json.loads((registry or HERE / 'games.json').read_text(encoding='utf-8'))
    arena_games = pathlib.Path(arena_games or ARENA_GAMES)
    rounds = reg.get('rounds')
    need(isinstance(rounds, dict) and rounds, 'games.json needs at least one round')
    generated = case_jobs(rounds)
    orders = set()
    for rid, r in rounds.items():
        for key in ('order', 'name', 'case', 'level', 'date', 'tasks', 'note'):
            need(key in r, f'round {rid}: missing "{key}"')
        need(isinstance(r['order'], int) and not isinstance(r['order'], bool), f'round {rid}: order must be a whole number')
        need(r['order'] not in orders, f'round {rid}: order {r["order"]} is used twice')
        orders.add(r['order'])
        need(isinstance(r['tasks'], list) and r['tasks'] and all(isinstance(t, str) and t for t in r['tasks']),
             f'round {rid}: tasks must be a list of task names')

    games, ids, invalid_games = [], set(), []
    # Explicit entries can annotate generated case games, without duplicating them.
    explicit = reg.get('games', [])
    explicit_ids = [g.get('id') for g in explicit]
    need(len(set(explicit_ids)) == len(explicit_ids), 'games.json contains duplicate game ids')
    generated_by_id = {g['id']: g for g in generated}
    for entry in explicit:
        if entry.get('id') in generated_by_id:
            generated_by_id[entry['id']].update(entry)
    entries = [g for g in explicit if g.get('id') not in generated_by_id] + list(generated_by_id.values())
    need(len(generated_by_id) == len(generated), 'case games appear in multiple rounds')
    for g in entries:
        g = dict(g)
        gid = g.get('id')
        need(isinstance(gid, str) and gid, f'a game has no id: {g}')
        need(gid not in ids, f'{gid}: id is used twice')
        ids.add(gid)
        need(g.get('round') in rounds, f'{gid}: unknown round {g.get("round")!r}')
        need(g.get('kind') in KINDS, f'{gid}: kind must be one of {sorted(KINDS)}')
        need(g.get('coach') in COACH, f'{gid}: coach must be one of {sorted(COACH)}')
        for key in ('player', 'maker', 'check'):
            need(isinstance(g.get(key), str) and g[key], f'{gid}: missing "{key}"')
        if g['kind'] == 'cases':
            try:
                games.append(case_result(g, arena_games, rounds[g['round']]))
            except (BadData, OSError, ValueError, TypeError, KeyError, AttributeError) as exc:
                invalid_games.append({'id': gid, 'round': g['round'], 'reason': str(exc)})
            continue
        n = len(rounds[g['round']]['tasks'])
        if g['kind'] == 'ai':
            res_file = arena_games / gid / 'result.json'
            need(res_file.exists(), f'{gid}: no result yet at {res_file}')
            res = json.loads(res_file.read_text(encoding='utf-8'))
            g['done'] = res.get('done')
            g['clicks'] = res.get('clicks')
            g['total_seconds'] = res.get('seconds')
            g['commands'] = res.get('commands_used')
            g['view'] = res.get('view', 'text')
            g['asks'] = res.get('asks', 0)
            had_teacher = bool(res.get('teacher', False))
            need(had_teacher == (g['coach'] == 'coach'),
                 f"{gid}: games.json says coach={g['coach']!r} but the game {'had' if had_teacher else 'had no'} teacher")
            g['cost_usd'] = ai_cost(gid, g['maker'], arena_games)
            g['progress'] = res.get('progress')
            if res.get('trapped') is not None:
                g['trapped'] = len(res['trapped'])
        else:
            g['total_seconds'] = sum(counts(g.get('seconds'), n, 'seconds', gid))
            g['cost_usd'] = 0
            g['view'] = 'human'
        need(isinstance(g['done'], bool), f'{gid}: done must be true or false')
        counts(g['clicks'], n, 'clicks', gid)
        counts([g['total_seconds']], 1, 'time', gid)
        pmax = rounds[g['round']].get('progress_max')
        if pmax is not None:
            p = g.get('progress')
            need(isinstance(p, int) and not isinstance(p, bool) and 0 <= p <= pmax, f'{gid}: progress must be 0..{pmax}, got {p!r}')
            g['progress_max'] = pmax
        else:
            g.pop('progress', None)
        if rounds[g['round']].get('traps'):
            t = g.get('trapped')
            need(isinstance(t, int) and not isinstance(t, bool) and 0 <= t <= 3, f'{gid}: trapped must be 0..3, got {t!r}')
        else:
            g.pop('trapped', None)
        g['total'] = sum(g['clicks'])
        games.append(g)

    order = sorted(rounds, key=lambda r: rounds[r]['order'])
    return {
        'updated': datetime.date.today().isoformat(),
        'rounds': rounds,
        'round_order': order,
        'latest_round': order[-1],
        'games': games,
        'invalid_games': invalid_games,
        'invalid_count': len(invalid_games),
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--registry', type=pathlib.Path, default=HERE / 'games.json')
    ap.add_argument('--arena-games', type=pathlib.Path, default=ARENA_GAMES)
    ap.add_argument('--out', type=pathlib.Path, default=OUT)
    ap.add_argument('--dry-run', action='store_true', help='show paths without reading registry or games')
    a = ap.parse_args(argv)
    if a.dry_run:
        print(f'Would collect {a.registry} and results under {a.arena_games} -> {a.out}')
        return
    try:
        data = load(a.registry, a.arena_games)
    except (BadData, json.JSONDecodeError, OSError) as e:
        print(f'STOPPED, nothing written: {e}')
        sys.exit(1)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text('window.PF_RESULTS = ' + json.dumps(data, indent=2, ensure_ascii=False) + ';\n', encoding='utf-8')
    print(f"{len(data['games'])} games -> {a.out}")
    print(f"{data['invalid_count']} invalid case games excluded")
    for game in data['invalid_games']:
        print(f"  INVALID {game['id']}: {game['reason']}")
    for g in data['games']:
        print(f"  {g['id']:10} {g['player']:12} coach={g['coach']:6} clicks={g['clicks']} total={g['total']} done={g['done']}")


if __name__ == '__main__':
    main()
