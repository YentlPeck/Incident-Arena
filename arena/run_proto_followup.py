"""Specialised-book follow-up (2026-11-05), unattended: Opus practice on 6501-6520 -> freeze -> Haiku and Luna
play the 55 test seeds with the specialised book. Alone and fake-book games on the same seeds already exist
(Experiment 3) and are reused as controls. Resumable."""
import datetime
import pathlib
import shutil
import subprocess
import sys
import threading
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import practice_proto  # noqa: E402
import run_batch  # noqa: E402

LOG = HERE / 'proto-followup.log'


def log(msg):
    with LOG.open('a', encoding='utf-8') as out:
        out.write(f'{datetime.datetime.now().isoformat(timespec="seconds")} {msg}\n')


def run(cmd, out_path):
    with out_path.open('a', encoding='utf-8') as out:
        out.write(f'\nRUN {datetime.datetime.now().isoformat(timespec="seconds")}\n'); out.flush()
        return subprocess.run(cmd, cwd=HERE, stdout=out, stderr=subprocess.STDOUT).returncode


def practice():
    out = HERE / 'proto-practice.log'
    for _ in range(12):
        if run([sys.executable, '-u', str(HERE / 'practice_proto.py')], out) == 0:
            return
        tail = out.read_text(encoding='utf-8').split('\nRUN ')[-1].lower()
        for d in (run_batch.ARENA / 'games').glob('prt-65*-opus-practice'):
            if not (practice_proto.HISTORY / f'after-seed-{d.name.split("-")[1]}.md').exists():
                shutil.move(str(d), str(run_batch.ARENA / 'games-invalid' / f'proto-practice-{d.name}-{int(time.time())}'))
        if 'usage limit' in tail or 'rate limit' in tail:
            time.sleep(1800)
    raise SystemExit('practice failed repeatedly')


def test(player, book):
    out = HERE / f'proto-followup-{player}.log'
    cmd = [sys.executable, '-u', str(HERE / 'run_batch.py'), '--family', 'proto', '--seeds', '6001..6055',
           '--player', player, '--parallel', '4', '--retry-invalid', '--condition', f'playbook:{book}']
    for _ in range(8):
        if run(cmd, out) == 0:
            return
        if 'usage limit' in out.read_text(encoding='utf-8').split('\nRUN ')[-1].lower():
            time.sleep(1800)


def main():
    log('started')
    frozen = sorted((HERE / 'proto-books').glob('playbook-frozen-*.md')) if (HERE / 'proto-books').exists() else []
    if not frozen:
        practice()
        frozen = [practice_proto.freeze()]
        log(f'frozen {frozen[0].name} ({len(frozen[0].read_text(encoding="utf-8"))} chars)')
    book = frozen[0].resolve()
    threads = [threading.Thread(target=test, args=(p, book)) for p in ('haiku', 'luna')]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    log('test finished')


if __name__ == '__main__':
    main()
