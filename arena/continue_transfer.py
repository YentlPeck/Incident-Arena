"""Continue the approved invoice experiment and refresh its page data as games finish.

Uses the existing subscriptions, frozen settings, seeds and four playbooks.
An attached batch is allowed to finish before this process resumes its remaining games.
"""
import argparse
import concurrent.futures
import datetime
import json
import os
import pathlib
import subprocess
import sys
import threading
import time

import psutil

import run_batch
import story2

HERE = pathlib.Path(__file__).resolve().parent
BOOKS = ('79f7540b', '9693baa4', '14aa9acc', 'cc9c908d')
STATE = HERE / 'transfer-progress.json'
_lock = threading.Lock()
_state = {'supervisor_pid': os.getpid(), 'players': {}}


def now():
    return datetime.datetime.now(datetime.timezone.utc)


def update(player, **values):
    with _lock:
        _state['updated'] = now().isoformat()
        _state['players'].setdefault(player, {}).update(values)
        run_batch.write_json(STATE, _state)


def refresh():
    with _lock:
        versions = json.loads((HERE / 'invoice-versions.json').read_text(encoding='utf-8'))
        data = story2.build_data(versions=versions)
        pending = story2.OUT.with_suffix('.js.tmp')
        pending.write_text('window.PF_STORY2 = ' + json.dumps(data, indent=1, ensure_ascii=False) + ';\n', encoding='utf-8')
        pending.replace(story2.OUT)
        return data


def completed(data, player):
    summaries = data['per_ai'][player]['conditions']
    return all(summaries.get(key, {}).get('n') == len(story2.PLANNED)
               for key in ('alone', 'sonnet', 'opus', 'sol', 'placebo'))


def verify_versions(player):
    versions = json.loads((HERE / 'invoice-versions.json').read_text(encoding='utf-8'))
    for key, condition in story2.conditions().items():
        current = run_batch.build_manifest(condition['text'], run_batch.MODELS[player], 'invoice')
        if current != versions[player][key]:
            raise ValueError(f'Frozen invoice settings changed for {player}/{key}; refusing to launch')


def wait_existing(pid, player):
    """Track actual process objects to avoid confusing a reused PID with this batch."""
    try:
        process = psutil.Process(pid)
        args = process.cmdline()
    except psutil.NoSuchProcess:
        return
    if not any(pathlib.Path(arg).name == 'run_batch.py' for arg in args) or '--player' not in args \
            or args[args.index('--player') + 1] != player:
        raise ValueError(f'PID {pid} is not the expected {player} experiment batch')
    update(player, status='existing batch running', batch_pid=pid)
    children = set()
    while process.is_running():
        try:
            children.update(process.children(recursive=True))
        except psutil.NoSuchProcess:
            break
        refresh()
        time.sleep(30)
    # A host timeout may kill the parent but leave its current game processes.
    # Give them time to exit; then stop only these captured children before replay.
    _, alive = psutil.wait_procs(list(children), timeout=30)
    for child in alive:
        try:
            child.kill()
        except psutil.NoSuchProcess:
            pass
    _, alive = psutil.wait_procs(alive, timeout=15)
    if alive:
        raise RuntimeError('Previous batch still has live children; refusing duplicate games')


def continue_player(player, *, attach=None, not_before=None):
    try:
        if attach:
            wait_existing(attach, player)
        if not_before:
            update(player, status='waiting for subscription reset', not_before=not_before.isoformat())
            while now() < not_before:
                time.sleep(min(30, (not_before - now()).total_seconds()))
        data = refresh()
        if completed(data, player):
            update(player, status='complete', checked=275)
            return
        verify_versions(player)
        command = [sys.executable, '-u', str(HERE / 'run_batch.py'), '--family', 'invoice',
                   '--seeds', '2001..2055', '--player', player, '--parallel', '4', '--retry-invalid',
                   '--condition', 'alone']
        for short in BOOKS:
            command.extend(['--condition', f'playbook:{HERE / ("playbook-frozen-" + short + ".md")}'])
        flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        quota, last_refresh = False, 0
        with (HERE / f'test2-{player}-continued.log').open('a', encoding='utf-8') as log:
            log.write(f'\nCONTINUED {now().isoformat()}\n')
            log.flush()
            with subprocess.Popen(command, cwd=HERE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                  text=True, encoding='utf-8', errors='replace', creationflags=flags) as batch:
                update(player, status='running', batch_pid=batch.pid)
                for line in batch.stdout:
                    log.write(line)
                    log.flush()
                    quota = quota or line.startswith('PAUSED: provider usage limit')
                    if time.monotonic() - last_refresh >= 30:
                        refresh()
                        last_refresh = time.monotonic()
                code = batch.wait()
                log.write(f'EXIT {code} {now().isoformat()}\n')
        data = refresh()
        checked = sum(g['n'] for g in data['per_ai'][player]['conditions'].values())
        update(player, status='complete' if completed(data, player) else 'paused: subscription limit' if quota
               else 'stopped with incomplete games', exitcode=code, checked=checked)
    except Exception as exc:
        update(player, status='stopped', error=str(exc))
        raise


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--attach-luna', type=int, help='wait for this existing Luna batch; never run two at once')
    ap.add_argument('--haiku-not-before', help='UTC ISO timestamp from the provider reset notice')
    a = ap.parse_args()
    # A configured API key could silently change billing. Never print its value.
    if any(os.environ.get(key) for key in ('ANTHROPIC_API_KEY', 'OPENAI_API_KEY')):
        ap.error('API-key environment detected; experiment requires subscription login')
    not_before = datetime.datetime.fromisoformat(a.haiku_not_before.replace('Z', '+00:00')) if a.haiku_not_before else None
    if not_before and not_before.tzinfo is None:
        ap.error('Reset time needs an explicit UTC offset')
    # A kernel lock is released even if this supervisor crashes.
    import msvcrt
    with (HERE / 'transfer-run.lock').open('a+b') as lease:
        if lease.tell() == 0:
            lease.write(b'0')
            lease.flush()
        lease.seek(0)
        try:
            msvcrt.locking(lease.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            ap.error('A transfer supervisor is already running')
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(continue_player, 'luna', attach=a.attach_luna),
                       pool.submit(continue_player, 'haiku', not_before=not_before)]
            for future in concurrent.futures.as_completed(futures):
                future.result()
        refresh()


if __name__ == '__main__':
    main()
