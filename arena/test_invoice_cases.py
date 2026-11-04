"""Invoice tests use synthetic data, temporary games, and no AI players."""
import contextlib
import dataclasses
import hashlib
import io
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

import audit
import collect
import prompts
import prompts2
import run_batch
import server
import server2
import story2


ROOT = pathlib.Path(__file__).resolve().parent.parent


@contextlib.contextmanager
def project_cwd():
    previous = pathlib.Path.cwd()
    os.chdir(ROOT)
    try:
        yield
    finally:
        os.chdir(previous)


def manifest(player='haiku', book=None):
    return {**{key: 'a' * 64 for key in run_batch.INVOICE_VERSION_FILES},
            'playbook_sha256': 'none' if book is None else run_batch.text_sha(book),
            'model': run_batch.MODELS[player], 'command_budget': 60, 'view': 'screen', 'family': 'invoice'}


def result(job, correct=True, layout='insider'):
    return {'game': job.gid, 'seed': job.seed, 'family': 'invoice', 'kind': 'cases', 'level': 'case2',
            'done': True, 'view': 'screen', 'teacher': False, 'asks': 0, 'clicks': [12], 'total_clicks': 12,
            'commands_used': 20, 'seconds': 30, 'progress': 5 if correct else 3, 'progress_max': 5,
            'found': ['payment', 'change', 'who', 'how', 'evidence'] if correct else ['payment', 'change', 'how'],
            'trapped': [], 'traps_max': 0, 'layout': layout, 'twists': [],
            'report': {'filed': True, 'who_ok': correct, 'how_ok': True, 'evidence_ok': correct, 'correct': correct}}


def save_game(root, job, versions, value=None):
    for name, data in {'manifest.json': versions, 'result.json': result(job) if value is None else value,
                       'audit.json': {'ok': True}, 'run.json': {'exitcode': 0, 'error': None}}.items():
        run_batch.write_json(root / job.gid / name, data)


class Family1CompatibilityTests(unittest.TestCase):
    def test_original_job_serialization_is_unchanged(self):
        job = run_batch.Job(1001, 'haiku', 'alone')
        self.assertEqual(dataclasses.asdict(job), {'seed': 1001, 'player': 'haiku', 'condition': 'alone'})
        self.assertEqual(repr(job), "Job(seed=1001, player='haiku', condition='alone')")

    def test_original_ids_commands_manifest_values_and_prompt_text_are_identical(self):
        baseline = json.loads((ROOT / 'arena/family1_baseline.json').read_text(encoding='utf-8'))
        self.assertEqual(run_batch.VERSION_FILES, baseline['version_files'])
        with project_cwd():
            for row in baseline['rows']:
                with self.subTest(player=row['player'], condition=row['condition']):
                    job = run_batch.Job(2001, row['player'], row['condition'])
                    self.assertEqual(job.gid, row['gid'])
                    expected = row['describe']
                    expected['server'][0] = sys.executable
                    self.assertEqual(run_batch.describe(job), expected)
                    book = run_batch.frozen_playbook(row['condition'][9:]) if row['condition'].startswith('playbook:') else None
                    self.assertEqual(prompts.build_prompt(job.gid, book), row['prompt'])
                    actual = run_batch.build_manifest(book, run_batch.MODELS[job.player])
                    self.assertEqual(actual, row['manifest'])
                    self.assertEqual(list(actual), list(row['manifest']))
                    self.assertNotIn('family', actual)

    def test_pinned_files_are_byte_identical(self):
        baseline = json.loads((ROOT / 'arena/family1_baseline.json').read_text(encoding='utf-8'))
        for name, sha in baseline['pinned'].items():
            with self.subTest(path=name):
                self.assertEqual(hashlib.sha256((ROOT / name).read_bytes()).hexdigest(), sha)

    def test_default_and_explicit_leak_dry_runs_match_original_rows(self):
        args = ['--seeds', '2001', '--player', 'luna', '--condition', 'alone',
                '--condition', 'playbook:arena/playbook-frozen-79f7540b.md', '--dry-run']
        with project_cwd(), mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('no players')):
            outputs = []
            for prefix in ([], ['--family', 'leak']):
                with contextlib.redirect_stdout(io.StringIO()) as output:
                    run_batch.main(prefix + args)
                outputs.append(output.getvalue())
            self.assertEqual(*outputs)
            baseline = json.loads((ROOT / 'arena/family1_baseline.json').read_text(encoding='utf-8'))
            expected = [row['describe'] for row in baseline['rows'] if row['player'] == 'luna']
            for row in expected:
                row['server'][0] = sys.executable
            self.assertEqual([json.loads(line) for line in outputs[0].splitlines()], expected)


class InvoicePlanningTests(unittest.TestCase):
    def test_prompts_differ_only_in_intro_with_and_without_lessons(self):
        for book in (None, '  Compare independent records.\r\n\r\n'):
            gid = 'inv-2001-luna-alone'
            actual = prompts2.build_prompt(gid, book)
            self.assertEqual(actual.split('\n', 1)[1], prompts.build_prompt(gid, book).split('\n', 1)[1])
            self.assertEqual(actual.split('\n')[0], prompts2.INTRO)
        with self.assertRaises(ValueError):
            prompts2.build_prompt('../bad')

    def test_invoice_dry_run_is_read_free_and_uses_server2(self):
        with mock.patch.object(pathlib.Path, 'read_bytes', side_effect=AssertionError('no reads')), \
                mock.patch.object(pathlib.Path, 'read_text', side_effect=AssertionError('no reads')), \
                mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('no players')), \
                contextlib.redirect_stdout(io.StringIO()) as output:
            run_batch.main(['--family', 'invoice', '--seeds', '2001..2002', '--player', 'luna', '--dry-run'])
        rows = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual([r['id'] for r in rows], ['inv-2001-luna-alone', 'inv-2002-luna-alone'])
        self.assertTrue(all(pathlib.Path(r['server'][1]).name == 'server2.py' for r in rows))
        self.assertTrue(all(r['player'][3] == 'gpt-6-luna' for r in rows))

    def test_invoice_seed_boundaries_do_not_change_leak_or_practice(self):
        with mock.patch.object(run_batch, 'practiced_seeds', side_effect=AssertionError('invoice does not read leak practice')):
            run_batch.validate_family_seeds([2001, 2999], 'invoice')
        for seed in (5, 1001, 2000, 3000, True):
            with self.subTest(seed=seed), self.assertRaisesRegex(ValueError, '2001..2999'):
                run_batch.validate_family_seeds([seed], 'invoice')
        run_batch.validate_seeds([1, 999], 'practice')
        run_batch.validate_family_seeds([1001, 3000, 100000], 'leak', check_practice=False)

    def test_invoice_manifest_covers_exactly_its_sources_and_resume_is_strict(self):
        expected_paths = {'cases/gen2.js', 'cases/gameR2.js', 'case2.html', 'cases/case2.css', 'cases/case.css',
                          'cases/icons.js', 'arena/prompts2.py', 'arena/server2.py', 'arena/server.py', 'data.js', 'style.css'}
        self.assertEqual(set(run_batch.INVOICE_VERSION_FILES.values()), expected_paths)
        with tempfile.TemporaryDirectory(prefix='pf-invoice-versions-') as temp:
            root = pathlib.Path(temp)
            for key, name in run_batch.INVOICE_VERSION_FILES.items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('Synthetic ' + key, encoding='utf-8')
            with mock.patch.object(run_batch, 'HERE', root / 'arena'):
                actual = run_batch.build_manifest(None, run_batch.MODELS['luna'], 'invoice')
                self.assertEqual(set(actual), set(manifest()))
                self.assertEqual(actual['family'], 'invoice')
                for key, name in run_batch.INVOICE_VERSION_FILES.items():
                    self.assertEqual(actual[key], hashlib.sha256((root / name).read_bytes()).hexdigest())
                job = run_batch.InvoiceJob(2001, 'luna', 'alone')
                save_game(root / 'games', job, actual)
                with mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('resume must not launch')):
                    self.assertEqual(run_batch.run_game(job, root)['status'], 'skipped')
                    for key in actual:
                        run_batch.write_json(root / 'games' / job.gid / 'manifest.json', {**actual, key: 'changed'})
                        with self.subTest(key=key), self.assertRaisesRegex(ValueError, 'version mismatch'):
                            run_batch.run_game(job, root)

    def test_invoice_audit_matches_case_verdicts_including_memory(self):
        for suffix in ('look', 'click 3 4', 'type some text', 'scroll 3 4 down', 'enter', 'click 3',
                       'ask help', 'finish', 'look; more', 'type $(secret)'):
            verdicts = []
            for prefix in ('case', 'inv'):
                gid = f'{prefix}-2001-haiku-alone'
                verdicts.append(audit.controller_ok(f'python play.py {gid} {suffix}', gid))
            self.assertEqual(*verdicts)
        for prefix in ('case', 'inv'):
            gid = f'{prefix}-2001-luna-alone'
            raw = json.dumps({'type': 'item.completed', 'item': {'type': 'command_execution',
                             'command': f'python play.py {gid} look'}})
            self.assertTrue(audit.audit_events(raw, gid)['ok'])
            self.assertFalse(audit.audit_events(raw + '\nclaude-mem-retrieved-data', gid)['ok'])

    def test_first_navigation_is_invoice_and_start_is_unchanged(self):
        with tempfile.TemporaryDirectory(prefix='pf-invoice-navigation-') as temp, \
                mock.patch.object(server, 'sync_playwright') as playwright:
            page = playwright.return_value.start.return_value.chromium.launch.return_value.new_page.return_value
            original_root = server.ROOT
            game = server2.Game('inv-5-smoke-alone', 60, view='screen', seed=5, arena=pathlib.Path(temp))
            try:
                page.goto.assert_called_once_with((original_root / 'case2.html').as_uri() + '?seed=5')
                page.click.assert_called_once_with('[data-act=start]')
                page.fill.assert_called_once_with('#player', 'inv-5-smoke-alone')
                self.assertIs(server.ROOT, original_root)
                self.assertEqual(game.left, 60)
            finally:
                game.close()

    def test_server2_cli_dry_run_uses_case2(self):
        proc = subprocess.run([sys.executable, str(ROOT / 'arena/server2.py'), 'inv-5-smoke-alone',
                               '--case', '5', '--view', 'screen', '--dry-run'], capture_output=True, text=True, check=True)
        self.assertIn('case2.html?seed=5, view=screen, commands=60', proc.stdout)

    def test_finish_preserves_every_original_field_and_is_idempotent(self):
        with tempfile.TemporaryDirectory(prefix='pf-invoice-finish-') as temp:
            outputs = []
            for cls, name in ((server.Game, 'base'), (server2.Game, 'invoice')):
                game = cls.__new__(cls)
                game.gid, game.max, game.left = 'inv-2001-haiku-alone', 60, 58
                game.view, game.with_teacher, game.free_asks, game.asks = 'screen', False, False, 0
                game.seed, game.started, game.over = 2001, 100, False
                game.dir = pathlib.Path(temp) / name
                game.dir.mkdir()
                game.page = mock.Mock()
                game.score = lambda: {'game': 'case2', 'seed': 2001, 'level': 1, 'done': False, 'clicks': [1],
                                     'progress': 0, 'progressMax': 5, 'found': [], 'trapped': [], 'trapsMax': 0,
                                     'layout': 'mfa', 'twists': ['noise', 'clocks'],
                                     'report': {'filed': False, 'who_ok': False, 'how_ok': False,
                                                'evidence_ok': False, 'correct': False}}
                with mock.patch.object(server.time, 'time', return_value=120):
                    game.finish('test')
                path = game.dir / 'result.json'
                original = path.read_bytes()
                outputs.append(json.loads(original))
                game.finish('again')
                self.assertEqual(path.read_bytes(), original)
            self.assertEqual(outputs[1], {**outputs[0], 'family': 'invoice'})

    @unittest.skipUnless(pathlib.Path(server.CHROME).exists(), 'Configured Chromium not installed')
    def test_invoice_batch_route_with_scripted_fake_player_and_frozen_prompt(self):
        # Synthetic page and transcript; no model CLI is invoked.
        page = '''<!doctype html><input id="player"><button data-act="start">Start</button><script>
        window.pixelforgeScore=()=>({game:'case2',seed:2001,level:1,done:false,clicks:[0],progress:0,
        progressMax:5,found:[],trapped:[],trapsMax:0,layout:'mfa',twists:[],
        report:{filed:false,who_ok:false,how_ok:false,evidence_ok:false,correct:false}});
        </script>'''
        with tempfile.TemporaryDirectory(prefix='pf-invoice-batch-') as temp:
            root = pathlib.Path(temp)
            scripts = root / 'arena'
            scripts.mkdir()
            for name in run_batch.INVOICE_VERSION_FILES.values():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                if name.startswith('arena/'):
                    shutil.copyfile(ROOT / name, path)
                else:
                    path.write_text('/* synthetic */', encoding='utf-8')
            for name in ('audit.py', 'prompts.py'):
                shutil.copyfile(ROOT / 'arena' / name, scripts / name)
            (root / 'case2.html').write_text(page, encoding='utf-8')
            client = root / 'client'
            client.mkdir()
            (client / 'play.py').write_text('# synthetic controller placeholder', encoding='utf-8')
            fake = root / 'fake_player.py'
            fake.write_text("import json,sys\nprint(json.dumps({'type':'assistant','message':{'content':["
                            "{'type':'tool_use','name':'Bash','input':{'command':'python play.py '+sys.argv[1]+' look'}}]}}))\n",
                            encoding='utf-8')
            text = '  Compare independent records.\r\n\r\n'
            book = root / f'playbook-frozen-{run_batch.text_sha(text)[:8]}.md'
            book.write_bytes(text.encode())
            job = run_batch.InvoiceJob(2001, 'haiku', f'playbook:{book}')
            with mock.patch.object(run_batch, 'HERE', scripts), \
                    mock.patch.object(run_batch, 'executable_command', return_value=[sys.executable, str(fake), job.gid]), \
                    mock.patch.object(prompts2, 'build_prompt', wraps=prompts2.build_prompt) as builder, \
                    mock.patch.object(prompts, 'write_prompt', side_effect=AssertionError('leak prompt selected')):
                outcome = run_batch.run_game(job, client, timeout=20)
            self.assertEqual(outcome['status'], 'completed')
            self.assertTrue(any(call.args == (job.gid, text) for call in builder.call_args_list))
            self.assertTrue(any(call.args == (job.gid, '\x00FROZEN_PLAYBOOK\x00') for call in builder.call_args_list))
            directory = client / 'games' / job.gid
            actual = json.loads((directory / 'result.json').read_text(encoding='utf-8'))
            self.assertEqual((actual['family'], actual['level']), ('invoice', 'case2'))
            self.assertTrue(json.loads((directory / 'audit.json').read_text(encoding='utf-8'))['ok'])
            self.assertEqual(json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))['playbook_sha256'],
                             run_batch.text_sha(text))


class InvoiceCollectionTests(unittest.TestCase):
    def test_valid_and_invalid_invoice_results(self):
        job = run_batch.InvoiceJob(2001, 'haiku', 'alone')
        versions = manifest()
        mutations = [({'family': 'leak'}, 'not an invoice'), ({'seed': 2002}, 'seed does not match'),
                     ({'found': ['download', 'signin']}, 'found ids'), ({'found': ['payment'] * 5}, 'found ids'),
                     ({'commands_used': 61}, 'exceeds budget'), ({'layout': 'phish'}, 'layout'),
                     ({'traps_max': 3}, 'traps_max'), ({'done': False}, 'done disagrees'),
                     ({'clicks': [-1]}, 'bad value'), ({'seconds': float('nan')}, 'bad value'),
                     ({'report': {'filed': True, 'who_ok': False, 'how_ok': True, 'evidence_ok': True,
                                  'correct': True}}, 'inconsistent report')]
        with tempfile.TemporaryDirectory(prefix='pf-invoice-validation-') as temp:
            root = pathlib.Path(temp)
            save_game(root, job, versions)
            def validate():
                return story2.invoice_result({'id': job.gid, 'seed': job.seed, 'player': job.player,
                                              'condition': job.condition}, root, {'seeds': [2001], 'versions': versions})
            self.assertTrue(validate()['correct'])
            for changed, message in mutations:
                save_game(root, job, versions, {**result(job), **changed})
                with self.subTest(changed=changed), self.assertRaisesRegex(collect.BadData, message):
                    validate()
            save_game(root, job, versions)
            for filename, data, message in (
                    ('audit.json', {'ok': False}, 'audit did not pass'),
                    ('run.json', {'exitcode': 1, 'error': None}, 'unsuccessful'),
                    ('manifest.json', {**versions, 'gen2_sha256': 'b' * 64}, 'does not match'),
                    ('manifest.json', {**versions, 'family': 'leak'}, 'does not match')):
                save_game(root, job, versions)
                run_batch.write_json(root / job.gid / filename, data)
                with self.subTest(file=filename, data=data), self.assertRaisesRegex(collect.BadData, message):
                    validate()
            with self.assertRaisesRegex(collect.BadData, 'declare versions'):
                story2.invoice_result({'id': job.gid, 'seed': 2001, 'player': 'haiku', 'condition': 'alone'}, root,
                                      {'seeds': [2001], 'versions': {}})

    def test_pair_intersection_counts_layouts_and_primary_comparison(self):
        books = story2.conditions()
        versions = {p: {k: manifest(p, c['text']) for k, c in books.items()} for p in story2.PLAYERS}
        self.assertTrue({'alone', 'sonnet', 'opus', 'sol', 'placebo'} <= books.keys())
        with tempfile.TemporaryDirectory(prefix='pf-invoice-pairs-') as temp:
            root = pathlib.Path(temp)
            for player in story2.PLAYERS:
                for key, c in books.items():
                    for seed in (2001, 2002, 2003, 2004):
                        if key == 'opus' and seed == 2004:
                            continue
                        job = run_batch.InvoiceJob(seed, player, c['condition'])
                        correct = seed == 2004 if key == 'alone' else seed in (2001, 2002, 2004)
                        layout = 'insider' if seed in (2001, 2004) else 'mfa'
                        value = result(job, correct, layout)
                        if key == 'sol' and seed == 2003:
                            value['family'] = 'leak'
                        save_game(root, job, versions[player][key], value)
            with mock.patch.object(story2, 'PLANNED', [2001, 2002, 2003, 2004]):
                data = story2.build_data(root, versions=versions)
            self.assertEqual(data['invalid_count'], 2)
            self.assertEqual(data['primary_comparison'], 'sonnet vs alone')
            for player in story2.PLAYERS:
                per_ai = data['per_ai'][player]
                self.assertEqual(per_ai['conditions']['alone']['solved'], 1)
                sonnet = per_ai['comparisons']['sonnet']
                self.assertEqual((sonnet['n'], sonnet['wins'], sonnet['losses'], sonnet['p']), (4, 2, 0, .25))
                self.assertTrue(sonnet['primary'])
                self.assertTrue(sonnet['complete'])
                self.assertEqual(sonnet['by_layout']['insider']['solved'], {'alone': 1, 'playbook': 2})
                self.assertEqual(per_ai['comparisons']['opus']['n'], 3)
                self.assertEqual(per_ai['comparisons']['sol']['missing_seeds'], [2003])
                self.assertFalse(per_ai['comparisons']['placebo']['primary'])
                # Opus lacks seed 4 and Sol's seed 3 is invalid: all side bars use only 1 and 2.
                self.assertEqual(per_ai['shared']['seeds'], [2001, 2002])
                self.assertEqual(per_ai['shared']['solved']['alone'], 0)
                self.assertTrue(all(per_ai['shared']['solved'][k] == 2 for k in books if k != 'alone'))

    def test_exact_sign_test_counts_discordant_pairs_only(self):
        pairs = [{'seed': i, 'alone': {'correct': a}, 'playbook': {'correct': b}}
                 for i, (a, b) in enumerate([(False, True), (False, True), (True, False), (True, True)])]
        summary = story2.paired_summary(pairs)
        self.assertEqual((summary['wins'], summary['losses'], summary['ties'], summary['p']), (2, 1, 1, .5))
        self.assertEqual(story2.paired_summary([])['p'], 1)

    def test_plan_only_never_accesses_games_and_writes_separate_js(self):
        with tempfile.TemporaryDirectory(prefix='pf-invoice-story-') as temp:
            out = pathlib.Path(temp) / 'story2.js'
            with mock.patch.object(pathlib.Path, 'exists', side_effect=AssertionError('must not inspect games')), \
                    contextlib.redirect_stdout(io.StringIO()):
                story2.main(['--plan-only', '--out', str(out)])
            raw = out.read_text(encoding='utf-8')
            self.assertTrue(raw.startswith('window.PF_STORY2 = '))
            data = json.loads(raw.removeprefix('window.PF_STORY2 = ').strip().removesuffix(';'))
            self.assertEqual(data['planned_seeds'], list(range(2001, 2056)))
            self.assertEqual(data['status'], 'plan only; no games read')


if __name__ == '__main__':
    unittest.main()
