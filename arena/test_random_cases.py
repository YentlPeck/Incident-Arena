"""Isolated tests: synthetic cases, a temp-only page, and fake CLI players. No paid AI calls.

Run: python -m unittest discover -s arena -p test_random_cases.py -v
"""
import concurrent.futures
import contextlib
import io
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

import audit
import collect
import practice
import prompts
import run_batch
import server


def setUpModule():
    # No test reads or writes the owner's practice record.
    global _record_temp, _record_patch
    _record_temp = tempfile.TemporaryDirectory(prefix='pf-seed-record-test-')
    _record_patch = mock.patch.object(run_batch, 'PRACTICE_RECORD', pathlib.Path(_record_temp.name) / 'practice-seeds.json')
    _record_patch.start()


def tearDownModule():
    _record_patch.stop()
    _record_temp.cleanup()

STUB_PAGE = """<!doctype html><input id="player"><button data-act="start">Start</button>
<button id="report" onclick="fileReport()">File report</button>
<script>
let started=false, done=false, clicks=0;
document.querySelector('[data-act=start]').onclick=()=>{started=true;};
function fileReport(){clicks++;done=true;}
window.pixelforgeScore=()=>({player:'stub', game:'case',seed:Number(new URLSearchParams(location.search).get('seed')),
tasks:1,level:1,done,clicks:[clicks], progress:done?5:0,progressMax:5,found:[],trapped:[],trapsMax:0,
report:{filed:done,who_ok:done,how_ok:done,evidence_ok:done,correct:done},layout:'phish',twists:[]});
</script>"""

FAKE_PLAYER = """import json, sys, time
gid=sys.argv[1]
print(json.dumps({'type':'assistant','message':{'content':[{'type':'tool_use','name':'Bash','input':{'command':f'python play.py {gid} look'}}]}}),flush=True)
print(json.dumps({'type':'result','result':'Stopped early in a synthetic test','total_cost_usd':0.0}),flush=True)
time.sleep(float(sys.argv[2]))
"""


def synthetic_case(seed=1001):
    return {'seed': seed, 'staff': [{'name': 'Mira Velden', 'user': 'mira.velden',
                                    'email': 'mira@studio.test', 'handle': '@mirav'}],
            'web': {'whois': {'suspect.test': []}, 'pages': {'confirm.test': {}}},
            'secret': {'story': '<p>A synthetic explanation.</p>'}}


def synthetic_manifest(book=None):
    return {**{key: 'a' * 64 for key in run_batch.VERSION_FILES},
            'playbook_sha256': run_batch.text_sha(book) if book is not None else 'none',
            'model': run_batch.MODELS['haiku'], 'command_budget': 60, 'view': 'screen'}


def synthetic_result(seed=1001, correct=True, traps=0):
    return {'seed': seed, 'done': True, 'clicks': [12], 'commands_used': 20, 'seconds': 30,
            'view': 'screen', 'teacher': False, 'asks': 0, 'progress': 5 if correct else 3,
            'progress_max': 5, 'trapped': ['url'][:traps], 'traps_max': traps,
            'layout': 'phish', 'twists': [],
            'report': {'filed': True, 'who_ok': correct, 'how_ok': True, 'evidence_ok': True, 'correct': correct}}


class PromptTests(unittest.TestCase):
    def test_lessons_before_rules_and_no_internal_details(self):
        text = prompts.build_prompt('case-1001-haiku-alone', 'Compare independent sources.')
        self.assertLess(text.index('Lessons from earlier investigations'), text.index('\nRules\n'))
        for forbidden in ('teacher', 'layout', 'trap'):
            self.assertNotIn(forbidden, text.lower())
        self.assertIn('60 controller commands', text)
        self.assertIn('file the report before you run out', text)

    def test_prompt_is_outside_projects(self):
        path = prompts.write_prompt('case-1001-haiku-alone')
        try:
            self.assertNotIn(prompts.PROJECT.resolve(), path.parents)
            self.assertNotIn(prompts.ARENA.resolve(), path.parents)
            self.assertIn('screen.png', path.read_text(encoding='utf-8'))
        finally:
            path.unlink()
            path.parent.rmdir()

    def test_id_rejection(self):
        with self.assertRaises(ValueError):
            prompts.build_prompt('../other')


class PlanningTests(unittest.TestCase):
    def test_seed_split_rejected_before_any_launch(self):
        with mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('must not launch')), \
                contextlib.redirect_stderr(io.StringIO()):
            for seed in ('0', '1000', '1001'):
                with self.subTest(practice=seed), self.assertRaises(SystemExit):
                    practice.main(['--seeds', seed, '--dry-run'])
            for seed in ('1', '999', '1000'):
                with self.subTest(test=seed), self.assertRaises(SystemExit):
                    run_batch.main(['--seeds', seed, '--player', 'haiku', '--dry-run'])
        run_batch.validate_seeds([1, 999], 'practice')
        run_batch.validate_seeds([1001, 100000], 'test')

    def test_practice_record_blocks_legacy_test_overlap(self):
        with tempfile.TemporaryDirectory(prefix='pf-split-test-') as tmp, \
                mock.patch.object(run_batch, 'PRACTICE_RECORD', pathlib.Path(tmp) / 'practice-seeds.json'), \
                mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('must not launch')), \
                contextlib.redirect_stderr(io.StringIO()):
            run_batch.record_practice_seed(1001)  # A legacy record predating the enforced split.
            run_batch.record_practice_seed(7)
            run_batch.record_practice_seed(7)
            self.assertEqual(json.loads(run_batch.PRACTICE_RECORD.read_text()), [7, 1001])
            with self.assertRaisesRegex(ValueError, 'already used in practice'):
                run_batch.run_game(run_batch.Job(1001, 'haiku', 'alone'), pathlib.Path(tmp))
            with self.assertRaises(SystemExit):
                run_batch.main(['--seeds', '1001', '--player', 'haiku', '--arena-dir', tmp])

    def test_condition_order_and_ids(self):
        jobs = run_batch.plan_jobs([1001, 1002], 'haiku', ['alone', 'playbook:lessons.md'])
        self.assertEqual([j.condition for j in jobs], ['alone', 'playbook:lessons.md', 'playbook:lessons.md', 'alone'])
        self.assertEqual(jobs[0].gid, 'case-1001-haiku-alone')
        self.assertNotEqual(run_batch.condition_id('playbook:a.md'), run_batch.condition_id('playbook:b.md'))
        self.assertEqual(run_batch.parse_seeds(['1..3', '3,4']), [1, 2, 3, 4])
        with self.assertRaises(ValueError):
            run_batch.parse_seeds(['3..1'])

    def test_restricted_launch_and_no_resumption(self):
        cmd = run_batch.player_command('case-1-haiku-alone', 'haiku')
        self.assertIn('Bash(python play.py case-1-haiku-alone:*)', cmd)
        self.assertIn('Bash,Read', cmd)
        self.assertIn('--strict-mcp-config', cmd)
        self.assertNotIn('--resume', cmd)
        self.assertNotIn('--continue', cmd)
        self.assertIn('gpt-6-luna', run_batch.player_command('case-1-luna-alone', 'luna'))

    def test_all_dry_runs_are_read_free(self):
        with mock.patch.object(pathlib.Path, 'read_text', side_effect=AssertionError('must not read files')), \
                mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('must not launch')), \
                contextlib.redirect_stdout(io.StringIO()) as output:
            prompts.main(['case-1001-haiku-alone', '--playbook', 'missing.md', '--dry-run'])
            run_batch.main(['--seeds', '1001..1002', '--player', 'haiku', '--condition', 'alone',
                            '--condition', 'playbook:missing.md', '--dry-run'])
            run_batch.main(['--seeds', '1001', '--player', 'luna', '--dry-run'])
            practice.main(['--seeds', '1..2', '--dry-run'])
            collect.main(['--dry-run'])
        self.assertIn('case-1001-haiku-alone', output.getvalue())

    def test_teacher_dry_run_defaults_and_overrides_are_read_free(self):
        for player in ('sonnet', 'opus', 'sol'):
            with self.subTest(player=player), \
                    mock.patch.object(pathlib.Path, 'read_text', side_effect=AssertionError('must not read')), \
                    mock.patch.object(pathlib.Path, 'read_bytes', side_effect=AssertionError('must not read')), \
                    mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('must not launch')), \
                    contextlib.redirect_stdout(io.StringIO()) as output:
                practice.main(['--player', player, '--seeds', '1..2', '--dry-run'])
                rows = [json.loads(line) for line in output.getvalue().splitlines()]
                suffix = '' if player == 'sonnet' else f'-{player}'
                self.assertEqual([r['game']['id'] for r in rows], [f'case-{s}-{player}-practice' for s in (1, 2)])
                self.assertEqual(rows[0]['playbook'], str(practice.HERE / f'playbook{suffix}.md'))
                self.assertEqual(rows[1]['history'], str(practice.HERE / f'playbook-history{suffix}' / 'after-seed-2.md'))
                self.assertIn(run_batch.MODELS[player], rows[0]['game']['player'])
                self.assertIn(run_batch.MODELS[player], rows[0]['learning_command'])
                output.seek(0)
                output.truncate()
                practice.main(['--player', player, '--seeds', '1', '--playbook', 'custom.md',
                               '--history-dir', 'custom-history', '--arena-dir', 'custom-arena',
                               '--model', run_batch.MODELS[player], '--dry-run'])
                row = json.loads(output.getvalue())
                self.assertEqual(row['playbook'], 'custom.md')
                self.assertEqual(row['history'], str(pathlib.Path('custom-history/after-seed-1.md')))
                if player == 'sol':
                    self.assertEqual(row['learning_command'][row['learning_command'].index('-C') + 1], 'custom-arena')

    def test_existing_player_commands_and_new_teacher_routes(self):
        arena = pathlib.Path('synthetic-arena')
        for player in ('haiku', 'sonnet', 'opus'):
            gid = f'case-1-{player}-practice'
            self.assertEqual(run_batch.player_command(gid, player, arena),
                ['claude', '-p', '--model', run_batch.MODELS[player], '--tools', 'Bash,Read',
                 '--allowedTools', f'Bash(python play.py {gid}:*)',
                 '--disallowedTools', 'Glob,Grep,WebFetch,WebSearch,Agent,Task',
                 '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
                 '--permission-mode', 'dontAsk', '--output-format', 'stream-json', '--verbose'])
        luna = ['codex', 'exec', '-m', 'gpt-6-luna', '-C', str(arena), '--skip-git-repo-check',
                '-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=true', '--json', '-']
        self.assertEqual(run_batch.player_command('synthetic', 'luna', arena), luna)
        sol = run_batch.player_command('synthetic', 'sol', arena)
        self.assertEqual(sol[sol.index('-m') + 1], 'gpt-6.1-sol')
        self.assertIn('forced_login_method="chatgpt"', sol)
        self.assertEqual(sol[:3], luna[:3])


class VersionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='pf-versions-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.scripts = self.root / 'arena'
        self.scripts.mkdir()
        for key, name in run_batch.VERSION_FILES.items():
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(f'Synthetic {key}', encoding='utf-8')
        patch = mock.patch.object(run_batch, 'HERE', self.scripts)
        patch.start()
        self.addCleanup(patch.stop)

    def test_manifest_covers_all_sources_and_experiment_settings(self):
        book = 'Compare sources.\r\n'
        manifest = run_batch.build_manifest(book, 'synthetic-model')
        self.assertEqual(manifest['playbook_sha256'], hashlib.sha256(book.encode()).hexdigest())
        self.assertEqual(manifest['model'], 'synthetic-model')
        self.assertEqual(manifest['command_budget'], 60)
        self.assertEqual(manifest['view'], 'screen')
        self.assertEqual(run_batch.build_manifest(None, 'synthetic-model')['playbook_sha256'], 'none')
        for key, name in run_batch.VERSION_FILES.items():
            self.assertEqual(manifest[key], hashlib.sha256((self.root / name).read_bytes()).hexdigest())
            (self.root / name).write_text('Changed source', encoding='utf-8')
            self.assertNotEqual(run_batch.build_manifest(book, 'synthetic-model')[key], manifest[key])

    def test_resume_checks_every_manifest_field_and_explicit_override(self):
        job = run_batch.Job(1001, 'haiku', 'alone')
        directory = self.root / 'games' / job.gid
        directory.mkdir(parents=True)
        run_batch.write_json(directory / 'result.json', synthetic_result())
        run_batch.write_json(directory / 'audit.json', {'ok': True})
        manifest = run_batch.build_manifest(None, run_batch.MODELS['haiku'])
        with mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('must not launch')):
            with self.assertRaisesRegex(ValueError, 'version mismatch'):
                run_batch.run_game(job, self.root)
            (directory / 'manifest.json').write_text('{broken', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'version mismatch'):
                run_batch.run_game(job, self.root)
            for key in manifest:
                changed = {**manifest, key: 'different'}
                run_batch.write_json(directory / 'manifest.json', changed)
                with self.subTest(field=key), self.assertRaisesRegex(ValueError, '--allow-version-mismatch'):
                    run_batch.run_game(job, self.root)
            original = (directory / 'manifest.json').read_bytes()
            with contextlib.redirect_stderr(io.StringIO()) as output:
                self.assertEqual(run_batch.run_game(job, self.root, allow_version_mismatch=True)['status'], 'skipped')
            self.assertIn('WARNING', output.getvalue())
            self.assertEqual((directory / 'manifest.json').read_bytes(), original)
            run_batch.write_json(directory / 'manifest.json', manifest)
            self.assertEqual(run_batch.run_game(job, self.root)['status'], 'skipped')

    def test_batch_snapshots_frozen_text_once_for_every_game(self):
        text = '  Compare sources.\r\n\r\n'
        book = self.root / f'playbook-frozen-{run_batch.text_sha(text)[:8]}.md'
        book.write_bytes(text.encode())
        captured = []
        def fake_game(job, arena, timeout, **kwargs):
            captured.append(kwargs)
            book.write_text('Changed after planning', encoding='utf-8')
            return {'id': job.gid, 'status': 'fake'}
        with mock.patch.object(run_batch, 'run_game', side_effect=fake_game), \
                contextlib.redirect_stdout(io.StringIO()):
            run_batch.main(['--seeds', '1001..1002', '--player', 'haiku', '--parallel', '1',
                            '--condition', f'playbook:{book}', '--arena-dir', str(self.root)])
        self.assertEqual([c['book_text'] for c in captured], [text, text])
        self.assertEqual(captured[0]['manifest'], captured[1]['manifest'])
        self.assertEqual(captured[0]['manifest']['playbook_sha256'], run_batch.text_sha(text))

    def test_mutable_or_tampered_books_and_stale_batch_stop_before_players(self):
        book = self.root / 'playbook.md'
        book.write_text('Compare sources.', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'requires a playbook-frozen'):
            run_batch.frozen_playbook(book)
        book = book.rename(self.root / 'playbook-frozen-00000000.md')
        with self.assertRaisesRegex(ValueError, 'does not match'):
            run_batch.frozen_playbook(book)
        manifest = run_batch.build_manifest(None, run_batch.MODELS['haiku'])
        (self.root / 'game' / 'cases' / 'gen.js').write_text('Changed source')
        with mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('must not launch')):
            with self.assertRaisesRegex(ValueError, 'source versions changed'):
                run_batch.run_game(run_batch.Job(1001, 'haiku', 'alone'), self.root, manifest=manifest)

    def test_batch_preflights_all_resumes_before_spending(self):
        directory = self.root / 'games' / run_batch.Job(1002, 'haiku', 'alone').gid
        run_batch.write_json(directory / 'result.json', synthetic_result(1002))
        with mock.patch.object(run_batch, 'run_game', side_effect=AssertionError('must not run any game')), \
                contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            run_batch.main(['--seeds', '1001..1002', '--player', 'haiku', '--arena-dir', str(self.root)])


class AuditTests(unittest.TestCase):
    def test_case_controller_rules(self):
        gid = 'case-1001-haiku-alone'
        for cmd in ('look', 'click 100 200', 'type words here', 'scroll 100 200 down', 'enter'):
            self.assertTrue(audit.controller_ok(f'python play.py {gid} {cmd}', gid))
        for cmd in ('click 3', 'ask help', 'finish', 'look; cat secret', 'look | more', 'type $(secret)', 'type (Get-Content secret)'):
            self.assertFalse(audit.controller_ok(f'python play.py {gid} {cmd}', gid))
        self.assertTrue(audit.controller_ok('python play.py old-game click 3', 'old-game'))

    def test_interrupted_claude_and_own_screenshot(self):
        gid = 'case-1001-haiku-alone'
        event = {'type': 'assistant', 'message': {'content': [
            {'type': 'tool_use', 'name': 'Read', 'input': {'file_path': f'games/{gid}/screen.png'}}]}}
        self.assertTrue(audit.audit_events(json.dumps(event), gid)['ok'])
        event['message']['content'][0]['input']['file_path'] = 'cases/gen.js'
        self.assertFalse(audit.audit_events(json.dumps(event), gid)['ok'])
        self.assertFalse(audit.screenshot_ok(f'games/{gid}/../screen.png', gid))

    def test_luna_shell_wrapper_and_image(self):
        gid = 'case-1001-luna-alone'
        events = [{'type': 'item.completed', 'item': {'type': 'command_execution',
                   'command': f'"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command \'python play.py {gid} look\''}},
                  {'type': 'item.completed', 'item': {'type': 'image_view', 'path': f'games/{gid}/screen.png'}}]
        self.assertTrue(audit.audit_events('\n'.join(map(json.dumps, events)), gid)['ok'])
        events[-1]['item']['path'] = 'result.json'
        self.assertFalse(audit.audit_events('\n'.join(map(json.dumps, events)), gid)['ok'])

    def test_empty_transcript_and_memory_rejected(self):
        self.assertFalse(audit.audit_events('', 'case-1-haiku-alone')['ok'])
        self.assertFalse(audit.audit_events('{"type":"result","result":"claude-mem-retrieved-data"}', 'case-1-haiku-alone')['ok'])


class LearningTests(unittest.TestCase):
    def setUp(self):
        self.pools = {'FIRST': ['Mira', 'Elif'], 'LAST': ['Velden', 'de Vries'],
                      'GAMES': ['Cobalt Drift'], 'FORUMS': ['Synthetic Forum'],
                      'CLOUDS': ['SyntheticCloud'], 'TRAVEL': ['SyntheticCity'],
                      'BREACHES': ['SyntheticBreach'], 'PHISH_DOMAINS': ['synthetic-login.test'],
                      'PHISH_SUBJECTS': ['Synthetic subject'], 'PW_WORDS': ['SyntheticPassword'],
                      'ROOMS': ['SyntheticRoom']}
        self.pool_patch = mock.patch.object(practice, 'load_pools', return_value=self.pools)
        self.pool_patch.start()
        self.addCleanup(self.pool_patch.stop)

    def test_every_pool_and_unseen_identifiers_are_blocked(self):
        for pool, terms in self.pools.items():
            for term in terms:
                with self.subTest(pool=pool, term=term):
                    self.assertTrue(practice.validate_playbook(f'Investigate {term.upper()}.', []))
        for text in ('For Cobalt Drift, choose a password written down in a shared file.',
                     'For Cobalt\n  Drift, choose a password.', 'Use PC-123.', 'Use pc-3.',
                     'Connect to 192.0.2.4.', 'Connect to [2001:db8::1].', 'Connect to ::1.',
                     'For seed 12, choose this.', 'For case #12, choose this.', 'seed: #12',
                     'Use new-person.example.', 'Use https://somewhere.invalid/path.', 'Find unknown.user.'):
            with self.subTest(text=text):
                self.assertTrue(practice.validate_playbook(text, []))
        self.assertFalse(practice.validate_playbook('Compare sources carefully and verify accounts.'))
        self.assertFalse(practice.validate_playbook('Mirage evidence can be misleading.'))

    def test_freeze_copies_exact_content_hash_and_reminder_without_players(self):
        with tempfile.TemporaryDirectory(prefix='pf-freeze-test-') as tmp, \
                mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('must not launch')), \
                contextlib.redirect_stdout(io.StringIO()) as output:
            book = pathlib.Path(tmp) / 'playbook.md'
            content = b'  Compare independent sources.\r\nCheck clocks.\r\n'
            book.write_bytes(content)
            practice.main(['--freeze', '--playbook', str(book)])
            sha = hashlib.sha256(content).hexdigest()
            frozen = book.with_name(f'playbook-frozen-{sha[:8]}.md')
            self.assertEqual(frozen.read_bytes(), content)
            self.assertEqual(run_batch.frozen_playbook(frozen), content.decode())
            self.assertIn(sha, output.getvalue())
            self.assertIn('human must read', output.getvalue())
            self.assertIn('answer recipes', output.getvalue())
            book.write_text('For Cobalt Drift, choose a password written down in a shared file.')
            with self.assertRaisesRegex(ValueError, 'Cannot freeze'):
                practice.freeze_playbook(book)

    def test_leakage_and_length_checks(self):
        case = synthetic_case()
        for text in ('Ask Mira.', 'Ask Velden.', 'mira.velden did it.', 'Read suspect.test.',
                     'Read studio.test.', 'Read confirm.test.', 'Search @mirav.', 'At 21:47.',
                     'Case 1001.', 'Lesson\n' * 61, ''):
            with self.subTest(text=text):
                self.assertTrue(practice.validate_playbook(text, [case]))
        self.assertFalse(practice.validate_playbook('Compare account activity with physical access records.\n', [case]))

    def test_retry_once_and_preserve_previous_on_failure(self):
        caller = mock.Mock(side_effect=['Mira did it.', 'Compare independent sources.\n'])
        result = practice.learn('', {}, [synthetic_case()], 'student', pathlib.Path('.'), pathlib.Path('.'), 5, caller)
        self.assertEqual(result, 'Compare independent sources.\n')
        self.assertEqual(caller.call_count, 2)
        bad = mock.Mock(return_value='mira.velden')
        with self.assertRaisesRegex(ValueError, 'rejected three times'):
            practice.learn('Old lesson', {}, [synthetic_case()], 'student', pathlib.Path('.'), pathlib.Path('.'), 5, bad)
        self.assertEqual(bad.call_count, 3)

    def test_debrief_and_tool_free_response(self):
        result = synthetic_result(correct=False)
        debrief = practice.make_debrief(synthetic_case(), result)
        self.assertEqual(debrief['story'], 'A synthetic explanation.')
        self.assertFalse(debrief['report']['who_ok'])
        self.assertTrue(debrief['report']['how_ok'])
        self.assertEqual(practice.extract_update('{"type":"result","result":"Compare sources."}'), 'Compare sources.\n')
        with self.assertRaises(ValueError):
            practice.extract_update('{"type":"assistant","message":{"content":[{"type":"tool_use"}]}}\n'
                                    '{"type":"result","result":"Compare sources."}')

    def test_codex_learning_command_is_isolated_and_claude_unchanged(self):
        command = practice.update_command('gpt-6.1-sol', pathlib.Path('synthetic-arena'))
        self.assertEqual(command[:6], ['codex', 'exec', '-m', 'gpt-6.1-sol', '-C', 'synthetic-arena'])
        for flag in ('--json', '--ephemeral', '--ignore-user-config', '--ignore-rules', '--skip-git-repo-check'):
            self.assertIn(flag, command)
        self.assertEqual(command[command.index('-s') + 1], 'read-only')
        for config in ('mcp_servers={}', 'forced_login_method="chatgpt"', 'approval_policy="never"',
                       'web_search="disabled"', 'project_doc_max_bytes=0',
                       'memories.use_memories=false', 'memories.generate_memories=false'):
            self.assertIn(config, command)
        self.assertTrue(any(value.endswith('.trust_level="untrusted"') for value in command))
        self.assertTrue(any('shell_tool=false' in value and 'plugins=false' in value for value in command))
        self.assertEqual(command[-1], '-')
        for model in ('claude-sonnet-5-5', 'claude-opus-5-5'):
            self.assertEqual(practice.update_command(model),
                ['claude', '-p', '--model', model, '--tools', '', '--strict-mcp-config',
                 '--mcp-config', '{"mcpServers":{}}', '--permission-mode', 'dontAsk',
                 '--output-format', 'stream-json', '--verbose'])

    def test_codex_extracts_last_message_and_rejects_tools_at_every_stage(self):
        events = [{'type': 'thread.started'}, {'type': 'turn.started'},
                  {'type': 'item.completed', 'item': {'type': 'reasoning', 'text': 'Thinking'}},
                  {'type': 'item.completed', 'item': {'type': 'agent_message', 'text': 'Earlier draft'}},
                  {'type': 'item.completed', 'item': {'type': 'agent_message', 'text': ' Compare sources. '}},
                  {'type': 'turn.completed', 'usage': {}}]
        def extract(stream):
            return practice.extract_update('\n'.join(map(json.dumps, stream)), 'gpt-6.1-sol')
        self.assertEqual(extract(events), 'Compare sources.\n')
        for kind in ('command_execution', 'mcp_tool_call', 'file_change', 'web_search', 'image_view',
                     'collab_tool_call', 'tool_call', 'unknown_future_tool'):
            for stage in ('started', 'updated', 'completed'):
                with self.subTest(kind=kind, stage=stage), self.assertRaisesRegex(ValueError, 'tool'):
                    extract(events[:2] + [{'type': f'item.{stage}', 'item': {'type': kind}}] + events[2:])
        for stream in ([], events[:-1], [events[-1]], events + [{'type': 'turn.failed'}],
                       events + [{'type': 'error', 'message': 'Failure'}],
                       events + [{'type': 'turn.started'}, {'type': 'turn.completed'}],
                       [{'type': 'item.completed', 'item': {'type': 'agent_message', 'text': ''}}, events[-1]],
                       [{'type': 'item.completed', 'item': {'type': 'agent_message',
                           'text': 'claude-mem-retrieved-data'}}, events[-1]], [None]):
            with self.subTest(stream=stream), self.assertRaises(ValueError):
                extract(stream)

    def test_codex_learning_subprocess_is_mocked_and_tool_rejections_retry(self):
        with tempfile.TemporaryDirectory(prefix='pf-codex-learning-test-') as tmp:
            root = pathlib.Path(tmp)
            arena = root / 'client'
            root.joinpath('learning').mkdir()
            directory = root / 'learning'
            prompt_paths = []
            def prompt_file(*args, **kwargs):
                parent = root / f'prompt-{len(prompt_paths)}'
                parent.mkdir()
                path = parent / 'prompt.txt'
                prompt_paths.append(path)
                return path
            def start(command, **kwargs):
                self.assertEqual(command, practice.update_command('gpt-6.1-sol', arena))
                self.assertEqual(kwargs['cwd'], arena)
                item = {'type': 'agent_message', 'text': 'Compare independent sources.'}
                if len(prompt_paths) < 3:
                    item = {'type': 'command_execution', 'command': 'synthetic rejected tool'}
                kwargs['stdout'].write(json.dumps({'type': 'item.completed', 'item': item}) + '\n')
                kwargs['stdout'].write('{"type":"turn.completed"}\n')
                return mock.Mock(wait=mock.Mock(return_value=0))
            with mock.patch.object(prompts, 'write_prompt', side_effect=prompt_file), \
                    mock.patch.object(run_batch, 'executable_command', side_effect=lambda command: command), \
                    mock.patch.object(run_batch, 'start_process', side_effect=start) as launched, \
                    mock.patch.object(run_batch, 'stop_process') as stopped:
                result = practice.learn('Old lesson', {}, [], 'gpt-6.1-sol', directory, arena, 5)
                self.assertEqual(result, 'Compare independent sources.\n')
                self.assertEqual(launched.call_count, 3)
                self.assertEqual(stopped.call_count, 3)
                self.assertTrue(all(not path.parent.exists() for path in prompt_paths))

    def test_new_teacher_books_freeze_beside_source_and_preserve_existing_snapshot(self):
        with tempfile.TemporaryDirectory(prefix='pf-teacher-freeze-test-') as tmp, \
                mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('must not launch')), \
                contextlib.redirect_stdout(io.StringIO()):
            root = pathlib.Path(tmp)
            old = root / 'playbook-frozen-79f7540b.md'
            old.write_bytes(b'Existing frozen snapshot')
            for player, text in (('opus', 'Compare sources.\n'), ('sol', 'Check clocks.\r\n')):
                book = root / f'playbook-{player}.md'
                content = text.encode()
                book.write_bytes(content)
                practice.main(['--player', player, '--freeze', '--playbook', str(book)])
                frozen = root / f'playbook-frozen-{hashlib.sha256(content).hexdigest()[:8]}.md'
                self.assertEqual(frozen.read_bytes(), content)
                self.assertEqual(run_batch.frozen_playbook(frozen), text)
                self.assertEqual(old.read_bytes(), b'Existing frozen snapshot')

    def test_node_generator_contract_uses_only_temp_stub(self):
        with tempfile.TemporaryDirectory(prefix='pf-case-gen-test-') as tmp:
            path = pathlib.Path(tmp) / 'gen.js'
            path.write_text('module.exports={generate:seed=>({seed,staff:[],secret:{story:"Synthetic"}})};', encoding='utf-8')
            case = practice.load_case(7, path)
            self.assertEqual(case['seed'], 7)

    def test_pool_loader_requires_export_without_generating_cases(self):
        with tempfile.TemporaryDirectory(prefix='pf-pools-test-') as tmp:
            path = pathlib.Path(tmp) / 'gen.js'
            path.write_text('module.exports={POOLS:{FIRST:["SyntheticName"],GAMES:["Synthetic Title"]},'
                            'generate:()=>{throw Error("Must not generate cases")}};', encoding='utf-8')
            # Bypass this class's vocabulary fake; exercise Node only against our stub.
            self.pool_patch.stop()
            self.assertEqual(practice.load_pools(path)['FIRST'], ['SyntheticName'])
            path.write_text('module.exports={};', encoding='utf-8')
            with self.assertRaises(subprocess.CalledProcessError):
                practice.load_pools(path)

    def test_learning_loop_writes_history_and_resumes_without_players(self):
        with tempfile.TemporaryDirectory(prefix='pf-case-learning-test-') as tmp:
            root = pathlib.Path(tmp)
            book, history, client = root / 'playbook.md', root / 'history', root / 'client'
            def fake_game(job, arena, timeout, model, previous_book):
                directory = arena / 'games' / job.gid
                directory.mkdir(parents=True)
                (directory / 'result.json').write_text(json.dumps(synthetic_result(job.seed)), encoding='utf-8')
                (directory / 'audit.json').write_text('{"ok":true}', encoding='utf-8')
            args = ['--seeds', '1..2', '--playbook', str(book), '--history-dir', str(history), '--arena-dir', str(client)]
            with mock.patch.object(run_batch, 'PRACTICE_RECORD', root / 'practice-seeds.json'), \
                    mock.patch.object(run_batch, 'run_game', side_effect=fake_game) as games, \
                    mock.patch.object(practice, 'load_case', side_effect=synthetic_case), \
                    mock.patch.object(practice, 'learn', side_effect=['Compare sources.\n', 'Compare sources.\nCheck clocks.\n']) as learning, \
                    contextlib.redirect_stdout(io.StringIO()):
                practice.main(args)
                self.assertEqual(games.call_count, 2)
                self.assertEqual(learning.call_count, 2)
                self.assertIsNone(games.call_args_list[0].args[-1])
                self.assertEqual(games.call_args_list[1].args[-1], book)
                self.assertEqual((history / 'after-seed-1.md').read_text(), 'Compare sources.\n')
                self.assertEqual(book.read_text(), (history / 'after-seed-2.md').read_text())
                self.assertTrue((client / 'games' / 'case-1-sonnet-practice' / 'debrief.json').exists())
                self.assertEqual(json.loads(run_batch.PRACTICE_RECORD.read_text()), [1, 2])
                games.reset_mock()
                learning.reset_mock()
                practice.main(args)
                games.assert_not_called()
                learning.assert_not_called()
                self.assertIn('Check clocks.', book.read_text())

    def test_each_teacher_default_history_resumes_and_records_practice_seeds(self):
        for player in ('sonnet', 'opus', 'sol'):
            with self.subTest(player=player), tempfile.TemporaryDirectory(prefix='pf-teacher-resume-test-') as tmp:
                root = pathlib.Path(tmp)
                client = root / 'client'
                suffix = '' if player == 'sonnet' else f'-{player}'
                book = root / f'playbook{suffix}.md'
                history = root / f'playbook-history{suffix}'
                def fake_game(job, arena, timeout, model, previous_book):
                    self.assertEqual(job.player, player)
                    self.assertEqual(model, run_batch.MODELS[player])
                    directory = arena / 'games' / job.gid
                    run_batch.write_json(directory / 'result.json', synthetic_result(job.seed))
                    run_batch.write_json(directory / 'audit.json', {'ok': True})
                with mock.patch.object(practice, 'HERE', root), \
                        mock.patch.object(run_batch, 'PRACTICE_RECORD', root / 'practice-seeds.json'), \
                        mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('must not launch')), \
                        mock.patch.object(run_batch, 'run_game', side_effect=fake_game) as games, \
                        mock.patch.object(practice, 'load_case', side_effect=synthetic_case), \
                        mock.patch.object(practice, 'learn', side_effect=['Compare sources.\n', 'Check clocks.\n']) as learning, \
                        contextlib.redirect_stdout(io.StringIO()) as output:
                    args = ['--player', player, '--seeds', '1..2', '--arena-dir', str(client)]
                    practice.main(args)
                    self.assertEqual(games.call_count, 2)
                    self.assertIsNone(games.call_args_list[0].args[-1])
                    self.assertEqual(games.call_args_list[1].args[-1], book)
                    self.assertEqual(learning.call_args.args[3], run_batch.MODELS[player])
                    self.assertTrue((client / 'games' / f'case-1-{player}-practice' / 'debrief.json').exists())
                    self.assertEqual(book.read_text(), (history / 'after-seed-2.md').read_text())
                    # Resume is determined by the existing history, even without a working copy.
                    book.unlink()
                    run_batch.PRACTICE_RECORD.unlink()
                    games.reset_mock()
                    learning.reset_mock()
                    practice.main(args)
                    games.assert_not_called()
                    learning.assert_not_called()
                    self.assertEqual(book.read_text(), 'Check clocks.\n')
                    self.assertEqual(json.loads(run_batch.PRACTICE_RECORD.read_text()), [1, 2])
                    self.assertIn('learning already complete', output.getvalue())


class CollectTests(unittest.TestCase):
    def test_invalid_case_runs_are_excluded_with_reasons(self):
        scenarios = (
            ('audit failed', 'audit.json', {'ok': False}, 'audit did not pass'),
            ('audit missing', 'audit.json', None, 'audit.json'),
            ('run error', 'run.json', {'exitcode': 0, 'error': 'Synthetic failure'}, 'run error'),
            ('nonzero exit', 'run.json', {'exitcode': 2, 'error': None}, 'unsuccessful'),
            ('run missing', 'run.json', None, 'run.json'),
            ('result error', 'result.json', {'error': 'Synthetic failure'}, 'run error'),
            ('text view', 'result.json', {'view': 'text'}, 'view must be screen'),
            ('view absent', 'result.json', {'view': None}, 'view must be screen'),
            ('over budget', 'result.json', {'commands_used': 61}, 'commands_used'),
            ('negative commands', 'result.json', {'commands_used': -1}, 'commands_used'),
            ('missing commands', 'result.json', {'commands_used': None}, 'commands_used'),
            ('boolean commands', 'result.json', {'commands_used': True}, 'commands_used'),
            ('manifest missing', 'manifest.json', None, 'manifest.json'),
            ('generator changed', 'manifest.json', {'gen_sha256': 'b' * 64}, 'gen_sha256'),
            ('engine changed', 'manifest.json', {'gameR_sha256': 'b' * 64}, 'gameR_sha256'),
            ('playbook changed', 'manifest.json', {'playbook_sha256': 'b' * 64}, 'playbook'),
            ('source absent', 'manifest.json', {'server_sha256': None}, 'server_sha256'),
            ('budget inflated', 'manifest.json', {'command_budget': 100}, 'command_budget'),
            ('model changed', 'manifest.json', {'model': 'another-model'}, 'model'),
            ('wrong seed', 'result.json', {'seed': 1002}, 'seed does not match'),
            ('malformed report', 'result.json', {'report': None}, 'missing report'),
        )
        for label, filename, patch, reason in scenarios:
            with self.subTest(label=label), tempfile.TemporaryDirectory(prefix='pf-invalid-test-') as tmp:
                root = pathlib.Path(tmp)
                directory = root / 'case-1001-haiku-alone'
                originals = {'audit.json': {'ok': True}, 'run.json': {'exitcode': 0, 'error': None},
                             'result.json': synthetic_result(), 'manifest.json': synthetic_manifest()}
                for name, value in originals.items():
                    if name == filename:
                        if patch is None:
                            continue
                        value = {**value, **patch}
                    run_batch.write_json(directory / name, value)
                registry = root / 'registry.json'
                run_batch.write_json(registry, {'rounds': {'cases': {'kind': 'cases', 'seeds': [1001],
                    'player': 'haiku', 'condition': 'alone', 'versions': synthetic_manifest()}}})
                data = collect.load(registry, root)
                self.assertEqual(data['games'], [])
                self.assertEqual(data['invalid_count'], 1)
                self.assertIn(reason, data['invalid_games'][0]['reason'])

    def test_test_set_and_round_version_declarations_are_required_and_invalids_print(self):
        for seed, versions, practiced, reason in (
                (999, synthetic_manifest(), [], 'outside the test range'),
                (1000, synthetic_manifest(), [], 'outside the test range'),
                (1001, synthetic_manifest(), [1001], 'already used in practice'),
                (1001, {}, [], 'round must declare versions'),
                (1001, {'gen_sha256': 'a' * 64}, [], 'round must declare versions')):
            with self.subTest(seed=seed, versions=versions, practiced=practiced), \
                    tempfile.TemporaryDirectory(prefix='pf-collect-gates-test-') as tmp:
                root = pathlib.Path(tmp)
                directory = root / f'case-{seed}-haiku-alone'
                for name, value in {'audit.json': {'ok': True}, 'run.json': {'error': None, 'exitcode': 0},
                                    'result.json': synthetic_result(seed), 'manifest.json': synthetic_manifest()}.items():
                    run_batch.write_json(directory / name, value)
                registry = root / 'registry.json'
                run_batch.write_json(registry, {'rounds': {'cases': {'kind': 'cases', 'seeds': [seed],
                    'player': 'haiku', 'condition': 'alone', 'versions': versions}}})
                record = root / 'practice-seeds.json'
                run_batch.write_json(record, practiced)
                with mock.patch.object(run_batch, 'PRACTICE_RECORD', record), \
                        contextlib.redirect_stdout(io.StringIO()) as output:
                    collect.main(['--registry', str(registry), '--arena-games', str(root), '--out', str(root / 'out.js')])
                self.assertIn('1 invalid case games excluded', output.getvalue())
                self.assertIn('INVALID case-', output.getvalue())
                self.assertIn(reason, output.getvalue())
                self.assertIn('"games": []', (root / 'out.js').read_text())

    def test_mixed_case_and_legacy_rounds_and_per_game_traps(self):
        with tempfile.TemporaryDirectory(prefix='pf-case-collect-test-') as tmp:
            root = pathlib.Path(tmp)
            rounds = {'old': {'order': 1, 'name': 'Synthetic legacy', 'case': 'Synthetic', 'level': 1,
                              'date': '2026-01-01', 'tasks': ['one'], 'note': ''},
                      'cases': {'kind': 'cases', 'seeds': [1001, 1002], 'player': 'haiku', 'condition': 'alone',
                                'versions': synthetic_manifest()}}
            registry = root / 'registry.json'
            registry.write_text(json.dumps({'rounds': rounds, 'games': [
                {'id': 'old-human', 'round': 'old', 'kind': 'human', 'player': 'Human', 'maker': 'Human',
                 'coach': 'none', 'check': 'Synthetic', 'done': True, 'clicks': [2], 'seconds': [3]}]}), encoding='utf-8')
            for seed, correct, traps in ((1001, True, 0), (1002, False, 1)):
                directory = root / f'case-{seed}-haiku-alone'
                directory.mkdir()
                (directory / 'result.json').write_text(json.dumps(synthetic_result(seed, correct, traps)), encoding='utf-8')
                (directory / 'audit.json').write_text('{"ok":true}', encoding='utf-8')
                run_batch.write_json(directory / 'run.json', {'exitcode': 0, 'error': None})
                run_batch.write_json(directory / 'manifest.json', synthetic_manifest())
                if seed == 1001:
                    (directory / 'transcript.jsonl').write_text('{"type":"result","total_cost_usd":0.123}', encoding='utf-8')
            data = collect.load(registry, root)
            self.assertEqual(len(data['games']), 3)
            cases = [g for g in data['games'] if g['kind'] == 'cases']
            self.assertEqual([g['score'] for g in cases], [True, False])
            self.assertEqual([g['traps_max'] for g in cases], [0, 1])
            self.assertEqual(cases[0]['cost_usd'], 0.123)
            self.assertIsNone(cases[1]['cost_usd'])
            self.assertTrue(cases[1]['audit_ok'])

    def test_luna_cost_logic_unchanged(self):
        with tempfile.TemporaryDirectory(prefix='pf-case-cost-test-') as tmp:
            root = pathlib.Path(tmp)
            directory = root / 'synthetic'
            directory.mkdir()
            (directory / 'transcript.jsonl').write_text(json.dumps({'type': 'turn.completed', 'usage':
                {'input_tokens': 100, 'cached_input_tokens': 40, 'output_tokens': 20}}), encoding='utf-8')
            self.assertAlmostEqual(collect.ai_cost('synthetic', 'OpenAI', root), (60 * .1 + 40 * .01 + 20 * .5) / 1e6)


@unittest.skipUnless(pathlib.Path(server.CHROME).exists(), 'Configured Chromium not installed')
class BrowserIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='pf-case-browser-test-')
        self.root = pathlib.Path(self.temp.name)
        self.client = self.root / 'client'
        self.client.mkdir()
        (self.client / 'play.py').write_text('# synthetic controller placeholder', encoding='utf-8')
        self.game = self.root / 'game'  # the copied server.py serves <root>/game
        (self.game / 'cases').mkdir(parents=True)
        (self.game / 'case.html').write_text(STUB_PAGE, encoding='utf-8')
        (self.game / 'cases' / 'gen.js').write_text('module.exports={generate:seed=>({seed})}', encoding='utf-8')
        (self.game / 'cases' / 'gameR.js').write_text('// synthetic engine', encoding='utf-8')
        for name in ('cases/case.css', 'cases/icons.js', 'data.js', 'style.css'):
            (self.game / name).write_text('/* synthetic */', encoding='utf-8')
        self.scripts = self.root / 'arena'
        self.scripts.mkdir()
        for name in ('server.py', 'audit.py', 'prompts.py'):
            shutil.copyfile(run_batch.HERE / name, self.scripts / name)
        self.fake = self.root / 'fake_player.py'
        self.fake.write_text(FAKE_PLAYER, encoding='utf-8')

    def tearDown(self):
        self.temp.cleanup()

    def test_case_url_report_result_and_idempotent_finalization(self):
        with mock.patch.object(server, 'ROOT', self.game):
            game = server.Game('case-1001-stub-alone', 60, view='screen', seed=1001, arena=self.client)
        try:
            self.assertTrue(game.page.url.endswith('case.html?seed=1001'))
            game.page.click('#report')
            game.finish('test')
            result_path = game.dir / 'result.json'
            original = result_path.read_text(encoding='utf-8')
            result = json.loads(original)
            self.assertTrue(result['report']['correct'])
            self.assertEqual(result['seed'], 1001)
            self.assertEqual(result['progress_max'], 5)
            self.assertEqual(result['traps_max'], 0)
            game.finish('again')
            self.assertEqual(original, result_path.read_text(encoding='utf-8'))
            self.assertTrue((game.dir / 'final.png').exists())
        finally:
            game.close()

    def test_parallel_fake_players_finalize_and_resume(self):
        def fake_command(_command):
            gid = _command[_command.index('--allowedTools') + 1].split('play.py ', 1)[1].split(':', 1)[0]
            return [sys.executable, str(self.fake), gid, '0.05']
        jobs = [run_batch.Job(seed, 'haiku', 'alone') for seed in (1001, 1002)]
        with mock.patch.object(run_batch, 'HERE', self.scripts), \
                mock.patch.object(run_batch, 'executable_command', side_effect=fake_command):
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(lambda job: run_batch.run_game(job, self.client, timeout=20), jobs))
            self.assertTrue(all(r['status'] == 'completed' for r in results))
            ports = []
            for job in jobs:
                directory = self.client / 'games' / job.gid
                ports.append((directory / 'port.txt').read_text())
                result = json.loads((directory / 'result.json').read_text(encoding='utf-8'))
                self.assertFalse(result['done'])
                self.assertFalse(result['report']['filed'])
                self.assertTrue(json.loads((directory / 'audit.json').read_text())['ok'])
                self.assertEqual(server.finalize(job.gid, self.client), 'Final result already exists.')
            self.assertNotEqual(ports[0], ports[1])
            with mock.patch.object(run_batch, 'start_process', side_effect=AssertionError('resume launched a process')):
                self.assertEqual(run_batch.run_game(jobs[0], self.client)['status'], 'skipped')

    def test_timeout_still_writes_result(self):
        job = run_batch.Job(1003, 'haiku', 'alone')
        with mock.patch.object(run_batch, 'HERE', self.scripts), \
                mock.patch.object(run_batch, 'executable_command', return_value=[sys.executable, str(self.fake), job.gid, '30']):
            with self.assertRaisesRegex(RuntimeError, 'timed out'):
                run_batch.run_game(job, self.client, timeout=0.5)
        directory = self.client / 'games' / job.gid
        self.assertTrue((directory / 'result.json').exists())
        self.assertTrue((directory / 'audit.json').exists())

    def test_frozen_text_is_verbatim_in_every_prompt_and_version_is_recorded(self):
        text = '  Compare independent sources.\r\nCheck clocks.\r\n\r\n'
        book = self.root / f'playbook-frozen-{run_batch.text_sha(text)[:8]}.md'
        book.write_bytes(text.encode())
        job = run_batch.Job(1004, 'haiku', f'playbook:{book}')
        captured = []
        original_start = run_batch.start_process
        def capture_prompt(command, **kwargs):
            if 'stdin' in kwargs:
                captured.append(pathlib.Path(kwargs['stdin'].name).read_bytes())
            return original_start(command, **kwargs)
        with mock.patch.object(run_batch, 'HERE', self.scripts), \
                mock.patch.object(run_batch, 'start_process', side_effect=capture_prompt), \
                mock.patch.object(run_batch, 'executable_command',
                                  return_value=[sys.executable, str(self.fake), job.gid, '0']):
            self.assertEqual(run_batch.run_game(job, self.client, timeout=20)['status'], 'completed')
            expected = run_batch.build_manifest(text, run_batch.MODELS['haiku'])
        self.assertEqual(len(captured), 1)
        self.assertIn(text.encode(), captured[0])
        directory = self.client / 'games' / job.gid
        self.assertEqual(json.loads((directory / 'manifest.json').read_text()), expected)
        self.assertIs(json.loads((directory / 'audit.json').read_text())['ok'], True)
        self.assertIsNone(json.loads((directory / 'run.json').read_text())['error'])

    def test_failed_practice_game_still_records_seed(self):
        job = run_batch.Job(5, 'sonnet', 'practice')
        record = self.root / 'history' / 'practice-seeds.json'
        with mock.patch.object(run_batch, 'HERE', self.scripts), \
                mock.patch.object(run_batch, 'PRACTICE_RECORD', record), \
                mock.patch.object(run_batch, 'executable_command',
                                  return_value=[sys.executable, str(self.fake), job.gid, '30']):
            with self.assertRaisesRegex(RuntimeError, 'timed out'):
                run_batch.run_game(job, self.client, timeout=0.5)
        self.assertEqual(json.loads(record.read_text()), [5])


if __name__ == '__main__':
    unittest.main()
