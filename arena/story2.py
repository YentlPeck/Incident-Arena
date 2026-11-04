"""Validate invoice experiments and write results/story2.js, independently of family 1.

Freeze versions before players run with --snapshot-versions FILE; collect with
--versions FILE. --plan-only writes the planned empty story without reading games.
"""
import argparse
import datetime
import json
import pathlib
import re

try:
    from . import collect, run_batch, story
except ImportError:
    import collect
    import run_batch
    import story

HERE = pathlib.Path(__file__).resolve().parent
GAMES = run_batch.ARENA / 'games'
OUT = HERE.parent / 'results' / 'story2.js'
PLANNED = list(range(2001, 2056))
PLAYERS = ('haiku', 'luna')
LAYOUTS = ('insider', 'lookalike', 'mfa')
FOUND = {'payment', 'change', 'who', 'how', 'evidence'}
BOOK_NAMES = {'79f7540b': 'sonnet', '9693baa4': 'opus', '14aa9acc': 'sol', 'cc9c908d': 'placebo'}
need, BadData = collect.need, collect.BadData


def conditions():
    """Include every frozen snapshot, never a mutable or newly trained book."""
    out = {'alone': {'condition': 'alone', 'text': None, 'file': None}}
    for path in sorted(HERE.glob('playbook-frozen-*.md')):
        text = run_batch.frozen_playbook(path)
        short = path.stem.removeprefix('playbook-frozen-')
        key = BOOK_NAMES.get(short, short)
        out[key] = {'condition': f'playbook:{path.resolve()}', 'text': text, 'file': path.name}
    need('sonnet' in out, 'Missing primary Sonnet frozen playbook')
    return out


def version_snapshot(conds):
    return {player: {key: run_batch.build_manifest(c['text'], run_batch.MODELS[player], 'invoice')
                     for key, c in conds.items()} for player in PLAYERS}


def invoice_result(g, arena_games, round_info):
    """Family-2 equivalent of collect.case_result, with invoice identities and versions."""
    gid = g['id']
    directory = pathlib.Path(arena_games) / gid
    try:
        run_batch.validate_family_seeds([g['seed']], 'invoice')
    except ValueError as exc:
        raise BadData(f'{gid}: {exc}') from exc
    need(gid == run_batch.InvoiceJob(g['seed'], g['player'], g['condition']).gid,
         f'{gid}: id does not match invoice seed/player/condition')
    need(g['seed'] in round_info.get('seeds', []), f'{gid}: seed is not in the round test set')
    result = json.loads((directory / 'result.json').read_text(encoding='utf-8'))
    audit = json.loads((directory / 'audit.json').read_text(encoding='utf-8'))
    run = json.loads((directory / 'run.json').read_text(encoding='utf-8'))
    manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
    need(audit.get('ok') is True, f'{gid}: audit did not pass')
    need(not run.get('error') and type(run.get('exitcode')) is int and run['exitcode'] == 0,
         f'{gid}: run error or unsuccessful player exit')
    need(not result.get('error'), f'{gid}: result contains a run error')
    need(result.get('family') == 'invoice' and result.get('kind') == 'cases'
         and result.get('level') == 'case2', f'{gid}: result is not an invoice case')
    need(result.get('game') == gid, f'{gid}: result game id does not match')
    need(type(result.get('seed')) is int and result['seed'] == g['seed'], f'{gid}: seed does not match round')
    need(result.get('view') == 'screen', f'{gid}: view must be screen')
    need(result.get('teacher') is False and result.get('asks') == 0, f'{gid}: teachers are not allowed')
    need(isinstance(manifest, dict), f'{gid}: missing experiment manifest')
    versions = round_info.get('versions')
    required = ['playbook_sha256', *run_batch.INVOICE_VERSION_FILES, 'family', 'model', 'command_budget', 'view']
    need(isinstance(versions, dict) and all(k in versions for k in required),
         f'{gid}: round must declare versions for every recorded setting')
    for key in run_batch.INVOICE_VERSION_FILES:
        need(isinstance(manifest.get(key), str) and re.fullmatch('[0-9a-f]{64}', manifest[key]),
             f'{gid}: missing or invalid manifest {key}')
    expected_book = 'none' if g['condition'] == 'alone' else run_batch.text_sha(run_batch.frozen_playbook(g['condition'][9:]))
    need(manifest.get('playbook_sha256') == expected_book, f'{gid}: playbook hash does not match condition')
    for key, expected in versions.items():
        need(key in manifest and manifest[key] == expected, f'{gid}: manifest {key} does not match round versions')
    need(manifest.get('family') == 'invoice', f'{gid}: manifest family must be invoice')
    need(manifest.get('model') == run_batch.MODELS[g['player']], f'{gid}: model does not match player')
    need(manifest.get('view') == 'screen', f'{gid}: manifest view must be screen')
    budget = manifest.get('command_budget')
    need(type(budget) is int and budget > 0 and budget == round_info.get('command_budget', run_batch.prompts.COMMANDS),
         f'{gid}: command budget does not match round')
    used = result.get('commands_used')
    need(type(used) is int and 0 <= used <= budget, f'{gid}: commands_used exceeds budget or is invalid')
    report = result.get('report')
    need(isinstance(report, dict), f'{gid}: missing report')
    for key in ('filed', 'who_ok', 'how_ok', 'evidence_ok', 'correct'):
        need(type(report.get(key)) is bool, f'{gid}: report.{key} must be true or false')
    need(report['correct'] == (report['filed'] and all(report[k] for k in ('who_ok', 'how_ok', 'evidence_ok'))),
         f'{gid}: inconsistent report correctness')
    need(type(result.get('done')) is bool and result['done'] == report['filed'],
         f'{gid}: done disagrees with report.filed')
    collect.counts(result.get('clicks'), 1, 'clicks', gid)
    collect.counts([result.get('seconds')], 1, 'time', gid)
    need(result.get('total_clicks') == sum(result['clicks']), f'{gid}: total_clicks is inconsistent')
    progress, pmax = result.get('progress'), result.get('progress_max')
    need(type(pmax) is int and pmax == 5 and type(progress) is int and 0 <= progress <= 5,
         f'{gid}: discoveries must be 0..5 with progress_max=5')
    found = result.get('found')
    need(isinstance(found, list) and all(isinstance(f, str) and f in FOUND for f in found)
         and len(set(found)) == len(found) == progress, f'{gid}: invalid invoice found ids or progress')
    for key in ('who', 'how', 'evidence'):
        need((key in found) == (report['filed'] and report[key + '_ok']),
             f'{gid}: found {key} disagrees with report')
    trapped, tmax = result.get('trapped'), result.get('traps_max')
    need(isinstance(trapped, list), f'{gid}: trapped must be a list')
    need(type(tmax) is int and 0 <= len(trapped) <= tmax <= 2, f'{gid}: bad per-case traps_max or trapped count')
    need(result.get('layout') in LAYOUTS, f'{gid}: invalid invoice layout')
    g.update(correct=report['correct'], report=report, layout=result['layout'], found=found,
             progress=progress, progress_max=pmax, clicks=result['clicks'], seconds=result['seconds'],
             commands=used, traps_max=tmax, trapped=len(trapped), audit_ok=True)
    return g


def solved_summary(games):
    return {'n': len(games), 'solved': sum(g['correct'] for g in games),
            'seeds': sorted(g['seed'] for g in games)}


def paired_summary(pairs):
    wins = sum(not p['alone']['correct'] and p['playbook']['correct'] for p in pairs)
    losses = sum(p['alone']['correct'] and not p['playbook']['correct'] for p in pairs)
    return {'n': len(pairs), 'seeds': [p['seed'] for p in pairs], 'wins': wins, 'losses': losses,
            'ties': len(pairs) - wins - losses, 'solved': {
                'alone': sum(p['alone']['correct'] for p in pairs),
                'playbook': sum(p['playbook']['correct'] for p in pairs)},
            'gain': (wins - losses) / len(pairs) if pairs else 0.0,
            'p': story.sign_test(wins, losses), 'alternative': 'playbook improves report correctness'}


def shared_summary(indexed):
    """A side-by-side teacher chart must use the same checked seeds in every bar."""
    seeds = sorted(set.intersection(*(set(games) for games in indexed.values()))) if indexed else []
    seeds = [seed for seed in seeds if len({games[seed]['layout'] for games in indexed.values()}) == 1]
    return {'n': len(seeds), 'seeds': seeds,
            'solved': {key: sum(games[seed]['correct'] for seed in seeds) for key, games in indexed.items()}}


def build_data(arena_games=GAMES, *, versions=None, plan_only=False):
    conds = conditions()
    versions = version_snapshot(conds) if versions is None else versions
    per_ai, invalid = {}, []
    for player in PLAYERS:
        indexed, summaries = {}, {}
        for key, c in conds.items():
            need(isinstance(versions.get(player, {}).get(key), dict), f'Missing declared versions: {player}/{key}')
            indexed[key] = {}
            if not plan_only:
                for seed in PLANNED:
                    job = run_batch.InvoiceJob(seed, player, c['condition'])
                    if not (pathlib.Path(arena_games) / job.gid / 'result.json').exists():
                        continue
                    g = {'id': job.gid, 'seed': seed, 'player': player, 'condition': c['condition']}
                    try:
                        invoice_result(g, arena_games, {'seeds': PLANNED, 'versions': versions[player][key]})
                    except (BadData, OSError, ValueError, TypeError, KeyError, AttributeError) as exc:
                        invalid.append({'id': job.gid, 'reason': str(exc)})
                        continue
                    indexed[key][seed] = g
            games = list(indexed[key].values())
            summaries[key] = {**solved_summary(games), 'by_layout': {
                layout: solved_summary([g for g in games if g['layout'] == layout]) for layout in LAYOUTS}}
        comparisons = {}
        for key in conds:
            if key == 'alone':
                continue
            seeds = sorted(indexed['alone'].keys() & indexed[key].keys())
            pairs = []
            for seed in seeds:
                alone, helped = indexed['alone'][seed], indexed[key][seed]
                if alone['layout'] != helped['layout']:
                    invalid.append({'id': helped['id'], 'reason': 'paired layouts do not match'})
                    continue
                pairs.append({'seed': seed, 'alone': alone, 'playbook': helped})
            comparisons[key] = {**paired_summary(pairs), 'primary': key == 'sonnet',
                                'complete': len(pairs) == len(PLANNED),
                                'missing_seeds': sorted(set(PLANNED) - {p['seed'] for p in pairs}),
                                'by_layout': {layout: paired_summary([p for p in pairs if p['alone']['layout'] == layout])
                                              for layout in LAYOUTS}}
        per_ai[player] = {'conditions': summaries, 'comparisons': comparisons,
                          'shared': shared_summary(indexed)}
    return {'family': 'invoice', 'updated': datetime.date.today().isoformat(), 'planned_seeds': PLANNED,
            'planned': len(PLANNED), 'primary_comparison': 'sonnet vs alone',
            'test': 'exact one-sided paired sign test; ties excluded',
            'status': 'plan only; no games read' if plan_only else 'collected',
            'conditions': {key: {'file': c['file'], 'condition': c['condition']} for key, c in conds.items()},
            'versions': versions, 'per_ai': per_ai, 'invalid_games': invalid, 'invalid_count': len(invalid)}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--arena-games', type=pathlib.Path, default=GAMES)
    ap.add_argument('--out', type=pathlib.Path, default=OUT)
    ap.add_argument('--versions', type=pathlib.Path, help='predeclared snapshot from --snapshot-versions')
    ap.add_argument('--snapshot-versions', type=pathlib.Path, help='write current invoice versions without reading games')
    ap.add_argument('--plan-only', action='store_true', help='write planned empty data without accessing games')
    a = ap.parse_args(argv)
    try:
        if a.snapshot_versions:
            run_batch.write_json(a.snapshot_versions, version_snapshot(conditions()))
            print(f'Wrote invoice version snapshot: {a.snapshot_versions}')
            return
        versions = json.loads(a.versions.read_text(encoding='utf-8')) if a.versions else None
        data = build_data(a.arena_games, versions=versions, plan_only=a.plan_only)
        a.out.parent.mkdir(parents=True, exist_ok=True)
        a.out.write_text('window.PF_STORY2 = ' + json.dumps(data, indent=1, ensure_ascii=False) + ';\n', encoding='utf-8')
        print(f'Wrote {a.out}: {data["status"]}; {data["invalid_count"]} invalid invoice games excluded')
        for game in data['invalid_games']:
            print(f'  INVALID {game["id"]}: {game["reason"]}')
    except (BadData, OSError, ValueError) as exc:
        ap.exit(1, f'STOPPED, nothing written: {exc}\n')


if __name__ == '__main__':
    main()
