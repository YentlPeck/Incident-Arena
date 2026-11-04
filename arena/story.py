"""Write results/story.js: the random-case numbers for the story page.

Only valid games count: the same checks as collect.py (audit passed, player exited cleanly, no run error,
every recorded version matches the planned setup, command budget respected, report consistent).
Test games are paired by seed: one game alone and one with the pinned frozen playbook, per AI.
The headline is decided only when the planned test set is complete, with an exact paired sign test.
Usage: python arena/story.py
"""
import json
import math
import pathlib

try:
    from . import collect, run_batch
except ImportError:
    import collect
    import run_batch

HERE = pathlib.Path(__file__).resolve().parent
GAMES = run_batch.ARENA / 'games'
OUT = HERE.parent / 'results' / 'story.js'
PLAYBOOK = HERE / 'playbook-frozen-79f7540b.md'      # the playbook under test (pinned, never "latest")
PLANNED = list(range(1001, 1056))                       # 55 paired test seeds per AI, fixed before the results
PLAYERS = {'haiku': 'Claude Haiku 5.5', 'luna': 'GPT-6-Luna'}
TEACHERS = {
    'sonnet': {'name': 'Claude Sonnet 5.5', 'maker': 'Anthropic', 'player': 'sonnet',
               'history': HERE / 'playbook-history', 'frozen': PLAYBOOK},
    'opus': {'name': 'Claude Opus', 'maker': 'Anthropic', 'player': 'opus',
             'history': HERE / 'playbook-history-opus', 'frozen': HERE / 'playbook-frozen-9693baa4.md'},
    'sol': {'name': 'GPT-6.1-Sol', 'maker': 'OpenAI', 'player': 'sol',
            'history': HERE / 'playbook-history-sol', 'source': HERE / 'playbook-sol.md'},
    # Control, not a teacher: same length and format as a playbook, but only game-making tips (arena/placebo.md).
    'placebo': {'name': 'Fake playbook (no lessons)', 'maker': '-', 'player': 'none',
                'history': HERE / 'no-history', 'frozen': HERE / 'playbook-frozen-cc9c908d.md', 'control': True},
}
ALPHA, BIG_GAIN = 0.025, 0.15


def practice_games(player, history):
    """Practice games of one teacher that passed the audit and were followed by a successful lesson update."""
    out = []
    for seed in range(1, 21):
        d = GAMES / f'case-{seed}-{player}-practice'
        try:
            result = json.loads((d / 'result.json').read_text(encoding='utf-8'))
            audit = json.loads((d / 'audit.json').read_text(encoding='utf-8'))
            run = json.loads((d / 'run.json').read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
        if not all(isinstance(v, dict) for v in (result, audit, run)):
            continue
        if audit.get('ok') is not True or run.get('error') or run.get('exitcode') != 0 or result.get('seed') != seed:
            continue
        if not (history / f'after-seed-{seed}.md').exists():
            continue
        report = result.get('report')
        if not isinstance(report, dict):
            continue
        out.append({'seed': seed, 'correct': report.get('correct') is True,
                    'parts': sum(report.get(k) is True for k in ('who_ok', 'how_ok', 'evidence_ok'))})
    return out


def sign_test(wins, losses):
    """One-sided exact sign test: chance of at least `wins` playbook-only successes if the playbook did nothing."""
    n = wins + losses
    if n == 0:
        return 1.0
    return sum(math.comb(n, k) for k in range(wins, n + 1)) / 2 ** n


def resolve_playbook(teacher):
    """Return only validated frozen text; Sol must exactly match its current practice book."""
    text = None
    try:
        if teacher.get('frozen'):
            path = teacher['frozen']
            return path, run_batch.frozen_playbook(path)
        text = teacher['source'].read_bytes().decode('utf-8')
        path = HERE / f'playbook-frozen-{run_batch.text_sha(text)[:8]}.md'
        frozen = run_batch.frozen_playbook(path)
        if frozen == text:
            return path, frozen
    except (OSError, ValueError, KeyError):
        pass
    return None, text


# Experiment 1 ran on exactly these source files. Pinned here so later work on new case types
# (which changes these files) can never silently invalidate or alter experiment 1's results.
EXP1_FILES = {
    'gen_sha256': '0a1b1249384cbeff95bdb324c404190946b800cd75063d73f54fe07aa09b0f2e',
    'gameR_sha256': 'b74fbaad0b3a36f096f28baca0c9dfe0de463bda69113f992b58937cdd387278',
    'case_html_sha256': 'a1c96bb1529238693f23e47411333fab252c4771edc8abf4fa7744cfcc3cfb92',
    'prompts_sha256': '5ef9967e15c83f18353c80b8f9caa108ea7a2ecac9bf05d94fa896fe1d04e328',
    'server_sha256': 'c19c62d4d700cb75bc7f7ac0b1f7dc7c25507612d70a874d2ce922ad56e5710f',
    'case_css_sha256': '534816ef02055c3869b7911e7ce9d4f35a8aa69d91e6192455d82e9392da8d1a',
    'icons_sha256': 'fbcf93379930dd721d054a9485f9b0bcec2f47d64b07acb6325bda69b733a3a1',
    'data_js_sha256': 'c5309d76899ddaa8323c6d6ec9427b54f916a49dd511b5a543cf2e254f4db1ef',
    'style_css_sha256': '3a75a203ccd605caafe1006816a2655dd64f28b131acb8cd08b8c7c0677bc08b',
}


def exp1_manifest(book, model):
    return {'playbook_sha256': run_batch.text_sha(book) if book is not None else 'none', **EXP1_FILES,
            'model': model, 'command_budget': 60, 'view': 'screen'}


def test_games(player, book, playbook=PLAYBOOK, cache=None):
    """Validate pairs against this teacher's frozen book, sharing alone validation across teachers."""
    cache = {} if cache is None else cache
    model = run_batch.MODELS[player]
    conds = {'alone': ('alone', exp1_manifest(None, model)),
             'playbook': (f'playbook:{playbook}', exp1_manifest(book, model))}  # absolute: gid hash must not depend on cwd
    pairs, invalid = [], 0
    for seed in PLANNED:
        pair = {}
        for key, (condition, versions) in conds.items():
            gid = run_batch.Job(seed, player, condition).gid
            if gid in cache:
                if cache[gid] is not None:
                    pair[key] = cache[gid]
                continue
            if not (GAMES / gid / 'result.json').exists():
                continue
            g = {'id': gid, 'seed': seed, 'player': player, 'maker': 'OpenAI' if player == 'luna' else 'Anthropic',
                 'condition': condition}
            try:
                collect.case_result(g, GAMES, {'seeds': PLANNED, 'versions': versions,
                                               'command_budget': run_batch.prompts.COMMANDS})
            except (collect.BadData, OSError, ValueError, TypeError, KeyError, AttributeError):
                invalid += 1
                cache[gid] = None
                continue
            pair[key] = {'correct': g['correct'], 'progress': g['progress'], 'progress_max': g['progress_max'],
                         'filed': g['report']['filed']}
            cache[gid] = pair[key]
        if len(pair) == 2:
            pairs.append({'seed': seed, **pair})
    return pairs, invalid


def pair_summary(pairs):
    wins = sum(p['playbook']['correct'] and not p['alone']['correct'] for p in pairs)
    losses = sum(p['alone']['correct'] and not p['playbook']['correct'] for p in pairs)
    return {'pairs': pairs, 'wins': wins, 'losses': losses, 'p': sign_test(wins, losses),
            'gain': (wins - losses) / len(pairs) if pairs else 0.0}


def best_teacher(teachers):
    """Descriptive counts only: intersect the valid seeds of every available frozen teacher."""
    available = [key for key, t in teachers.items() if t['frozen']]
    per_ai = {}
    for name in PLAYERS.values():
        indexed = {key: {p['seed']: p for p in teachers[key]['test'][name]['pairs']} for key in available}
        seeds = sorted(set.intersection(*(set(v) for v in indexed.values()))) if indexed else []
        solved = {'alone': sum(indexed[available[0]][s]['alone']['correct'] for s in seeds)}
        solved.update({key: sum(indexed[key][s]['playbook']['correct'] for s in seeds) for key in available})
        per_ai[name] = {'n': len(seeds), 'seeds': seeds, 'solved': solved}
    return {'teachers': available, 'per_ai': per_ai}


def verdict(per_ai):
    if len(per_ai) != len(PLAYERS) or any(len(v['pairs']) < len(PLANNED) for v in per_ai.values()):
        return 'Too early'
    gains = [v['gain'] for v in per_ai.values()]
    if all(v['p'] <= ALPHA for v in per_ai.values()):
        return 'Yes' if all(g >= BIG_GAIN for g in gains) else 'A little'
    return 'Not yet'


def main():
    teachers, cache, invalid = {}, {}, 0
    for key, teacher in TEACHERS.items():
        path, book = resolve_playbook(teacher)
        per_ai = {}
        for player, name in PLAYERS.items():
            pairs, bad = test_games(player, book, path, cache) if path else ([], 0)
            invalid += bad
            per_ai[name] = pair_summary(pairs)
        teachers[key] = {'name': teacher['name'], 'maker': teacher['maker'],
                         'practice': practice_games(teacher['player'], teacher['history']),
                         'frozen': path is not None,
                         'playbook': {'file': f'../arena/{path.name}' if path else None,
                                      'lessons': sum(ln.startswith('- ') for ln in (book or '').splitlines())},
                         'test': per_ai}
    # The pre-registered headline is exclusively Sonnet's original paired test.
    main_teacher = teachers['sonnet']
    per_ai = main_teacher['test']
    data = {'planned': len(PLANNED), 'alpha': ALPHA, 'big_gain': BIG_GAIN, 'verdict': verdict(per_ai),
            'test': per_ai, 'practice': {t['name']: t['practice'] for t in teachers.values()},
            'teachers': teachers, 'best_teacher': best_teacher(teachers), 'invalid_games': invalid,
            'playbook': main_teacher['playbook']}
    OUT.write_text('window.PF_STORY = ' + json.dumps(data, indent=1, ensure_ascii=False) + ';\n', encoding='utf-8')
    print(f'wrote {OUT}: verdict {data["verdict"]}; '
          + '; '.join(f'{k}: {len(v["pairs"])}/{len(PLANNED)} pairs, +{v["wins"]}/-{v["losses"]}, p={v["p"]:.3f}'
                      for k, v in per_ai.items())
          + '; practice: ' + ', '.join(f'{k} {len(v["practice"])}/20 ({"frozen" if v["frozen"] else "not frozen"})'
                                       for k, v in teachers.items()) + f'; invalid {invalid}')


if __name__ == '__main__':
    main()
