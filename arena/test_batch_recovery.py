"""Recovery must preserve outcomes and stop spending after provider quota errors."""
import contextlib
import io
import json
import pathlib
import tempfile
import unittest
from unittest import mock

import run_batch
import continue_transfer


class RecoveryTests(unittest.TestCase):
    def test_retry_preserves_a_valid_loss_and_archives_failed_attempt_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            arena = pathlib.Path(temp)
            loss = run_batch.InvoiceJob(2001, 'haiku', 'alone')
            failed = run_batch.InvoiceJob(2002, 'haiku', 'alone')
            for job, code in ((loss, 0), (failed, 1)):
                directory = arena / 'games' / job.gid
                run_batch.write_json(directory / 'run.json', {'exitcode': code, 'error': None})
                run_batch.write_json(directory / 'result.json', {'report': {'correct': False}})
                run_batch.write_json(directory / 'audit.json', {'ok': True})
                (directory / 'transcript.jsonl').write_bytes(b'exact original bytes\r\n')
            records = run_batch.archive_invalid(arena, [loss, failed])
            self.assertEqual([r['id'] for r in records], [failed.gid])
            self.assertTrue((arena / 'games' / loss.gid).exists())
            self.assertFalse((arena / 'games' / failed.gid).exists())
            archived = pathlib.Path(records[0]['archive'])
            self.assertEqual((archived / 'transcript.jsonl').read_bytes(), b'exact original bytes\r\n')
            saved = json.loads((archived.parent / 'recovery.json').read_text())
            self.assertEqual(saved, records)
            self.assertTrue(saved[0]['moved'])

    def test_rate_limit_uses_provider_metadata_not_evidence_or_assistant_text(self):
        with tempfile.TemporaryDirectory() as temp:
            path = pathlib.Path(temp) / 'transcript.jsonl'
            events = [{'type': 'assistant', 'api_error': 'usage_limit_reached'},
                      {'type': 'result', 'result': 'You have hit your usage limit', 'is_error': False}]
            path.write_text('\n'.join(map(json.dumps, events)), encoding='utf-8')
            self.assertIsNone(run_batch.provider_limit(temp))
            with path.open('a', encoding='utf-8') as stream:
                stream.write('\n' + json.dumps({'type': 'result', 'api_error': 'usage_limit_reached',
                                               'is_error': True, 'result': 'Resets at 8:20pm'}))
            self.assertEqual(run_batch.provider_limit(temp), 'Resets at 8:20pm')

    def test_quota_stops_queue_before_starting_next_game(self):
        with tempfile.TemporaryDirectory() as temp, \
                mock.patch.object(run_batch, 'run_game', side_effect=run_batch.UsageLimitError('quota')) as game, \
                mock.patch.object(run_batch, 'build_manifest', return_value={}), \
                mock.patch.object(run_batch, 'check_resume', return_value=False), \
                contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as stderr:
            with self.assertRaises(SystemExit) as stopped:
                run_batch.main(['--family', 'invoice', '--seeds', '2001..2055', '--player', 'haiku',
                                '--arena-dir', temp, '--parallel', '1'])
            self.assertEqual(stopped.exception.code, 1)
            self.assertEqual(game.call_count, 1)
            self.assertIn('PAUSED', stderr.getvalue())

    def test_dry_run_with_retry_flag_does_not_archive(self):
        with mock.patch.object(run_batch, 'archive_invalid', side_effect=AssertionError('must not mutate')), \
                contextlib.redirect_stdout(io.StringIO()):
            run_batch.main(['--family', 'invoice', '--seeds', '2001', '--player', 'haiku',
                            '--retry-invalid', '--dry-run'])

    def test_supervisor_rejects_changed_settings_before_launching(self):
        with mock.patch.object(continue_transfer, 'refresh', return_value={}), \
                mock.patch.object(continue_transfer, 'completed', return_value=False), \
                mock.patch.object(continue_transfer, 'verify_versions', side_effect=ValueError('changed')), \
                mock.patch.object(continue_transfer, 'update') as status, \
                mock.patch.object(continue_transfer.subprocess, 'Popen', side_effect=AssertionError('must not launch')):
            with self.assertRaisesRegex(ValueError, 'changed'):
                continue_transfer.continue_player('haiku')
            self.assertEqual(status.call_args.kwargs['status'], 'stopped')

    def test_supervisor_will_not_attach_to_another_players_batch(self):
        process = mock.Mock()
        process.cmdline.return_value = ['python', 'run_batch.py', '--player', 'haiku']
        with mock.patch.object(continue_transfer.psutil, 'Process', return_value=process), \
                mock.patch.object(continue_transfer.time, 'sleep', side_effect=AssertionError('must not wait')):
            with self.assertRaisesRegex(ValueError, 'not the expected luna'):
                continue_transfer.wait_existing(123, 'luna')


if __name__ == '__main__':
    unittest.main()
