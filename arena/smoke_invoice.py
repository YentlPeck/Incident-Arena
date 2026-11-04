"""Scripted invoice smoke test in a temporary arena; never launches an AI player."""
import argparse
import json
import pathlib
import shutil
import struct
import subprocess
import sys
import tempfile

try:
    from . import run_batch, server
except ImportError:
    import run_batch
    import server


def smoke(seed=5):
    gid = f'inv-{seed}-smoke-alone'
    with tempfile.TemporaryDirectory(prefix='pf-invoice-smoke-') as temp:
        arena = pathlib.Path(temp)
        # Use the real client, relocated so it only sees this temporary arena.
        shutil.copyfile(run_batch.ARENA / 'play.py', arena / 'play.py')
        directory = arena / 'games' / gid
        directory.mkdir(parents=True)
        command = [sys.executable, str(run_batch.HERE / 'server2.py'), gid, '--case', str(seed),
                   '--view', 'screen', '--commands', '10', '--arena-dir', str(arena)]
        with (directory / 'server.log').open('w', encoding='utf-8') as log:
            process = run_batch.start_process(command, cwd=run_batch.HERE.parent, stdout=log, stderr=subprocess.STDOUT)
            try:
                run_batch.wait_ready(process, directory)
                for op, args in [('look', []), ('click', ['1430', '890']), ('type', ['smoke']),
                                 ('enter', []), ('scroll', ['1430', '890', 'down']), ('finish', [])]:
                    response = subprocess.run([sys.executable, str(arena / 'play.py'), gid, op, *args],
                                              cwd=arena, capture_output=True, text=True, timeout=90, check=True)
                    assert 'Error:' not in response.stdout, response.stdout
                    if op == 'look':
                        assert 'commands left: 9' in response.stdout, response.stdout
                        assert 'clicks so far: 0' in response.stdout, response.stdout
                process.wait(timeout=20)
                assert process.returncode == 0, 'Server exited unsuccessfully'
                result = json.loads((directory / 'result.json').read_text(encoding='utf-8'))
                events = [json.loads(line) for line in (directory / 'log.jsonl').read_text(encoding='utf-8').splitlines()]
                assert [e['op'] for e in events] == ['look', 'click', 'type', 'enter', 'scroll']
                assert events[0]['score']['game'] == 'case2', 'First look was not the invoice game'
                assert events[0]['score']['clicks'] == [0], 'Unexpected initial counted click'
                assert result['family'] == 'invoice' and result['kind'] == 'cases'
                assert result['level'] == 'case2' and result['seed'] == seed and result['game'] == gid
                assert result['commands_used'] == 5 and result['view'] == 'screen'
                assert result['done'] is False and result['report']['filed'] is False
                assert result['teacher'] is False and result['asks'] == 0
                assert result['progress_max'] == 5 and result['found'] == []
                assert result['layout'] in ('insider', 'lookalike', 'mfa')
                assert result['total_clicks'] == sum(result['clicks']) == 1
                assert isinstance(result['twists'], list) and 0 <= result['traps_max'] <= 2
                for image in ('screen.png', 'final.png'):
                    with (directory / image).open('rb') as stream:
                        header = stream.read(24)
                    assert struct.unpack('>II', header[16:24]) == (1440, 900)
                original = (directory / 'result.json').read_bytes()
                assert server.finalize(gid, arena) == 'Final result already exists.'
                assert (directory / 'result.json').read_bytes() == original
                return {key: result[key] for key in ('game', 'family', 'level', 'seed', 'view', 'commands_used',
                                                       'clicks', 'total_clicks', 'done', 'layout', 'report')}
            finally:
                run_batch.stop_process(process)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--seed', type=int, default=5, help='pilot seed; deliberately outside the invoice test set')
    a = ap.parse_args(argv)
    if 2001 <= a.seed <= 2999:
        ap.error('Smoke tests must use a pilot seed outside the invoice test set')
    print(json.dumps({'ok': True, 'result': smoke(a.seed)}, indent=2))


if __name__ == '__main__':
    main()
