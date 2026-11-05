"""Crime 2 specialised book (2026-11-05), unattended: waits for the crime-3 follow-up, then Opus practice on 2511-2530 -> freeze -> Haiku and Luna
play invoice test seeds 2001-2055 with the book. Alone and fake-book (cc9c908d) games on the same seeds already
exist (transfer test) and are reused as controls. Resumable."""
import datetime
import pathlib
import shutil
import subprocess
import sys
import threading
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import practice_invoice as practice_proto  # noqa: E402
import run_batch  # noqa: E402

LOG = HERE / 'invoice-followup.log'


def log(msg):
    with LOG.open('a', encoding='utf-8') as out:
        out.write(f'{datetime.datetime.now().isoformat(timespec="seconds")} {msg}\n')


def run(cmd, out_path):
    with out_path.open('a', encoding='utf-8') as out:
        out.write(f'\nRUN {datetime.datetime.now().isoformat(timespec="seconds")}\n'); out.flush()
        return subprocess.run(cmd, cwd=HERE, stdout=out, stderr=subprocess.STDOUT).returncode


def practice():
    out = HERE / 'invoice-practice.log'
    for _ in range(12):
        if run([sys.executable, '-u', str(HERE / 'practice_invoice.py')], out) == 0:
            return
        tail = out.read_text(encoding='utf-8').split('\nRUN ')[-1].lower()
        for d in (run_batch.ARENA / 'games').glob('inv-25*-opus-practice'):
            if not (practice_proto.HISTORY / f'after-seed-{d.name.split("-")[1]}.md').exists():
                shutil.move(str(d), str(run_batch.ARENA / 'games-invalid' / f'invoice-practice-{d.name}-{int(time.time())}'))
        if 'usage limit' in tail or 'rate limit' in tail:
            time.sleep(1800)
    raise SystemExit('practice failed repeatedly')


def test(player, book):
    out = HERE / f'invoice-followup-{player}.log'
    cmd = [sys.executable, '-u', str(HERE / 'run_batch.py'), '--family', 'invoice', '--seeds', '2001..2055',
           '--player', player, '--parallel', '4', '--retry-invalid', '--condition', f'playbook:{book}']
    for _ in range(8):
        if run(cmd, out) == 0:
            return
        if 'usage limit' in out.read_text(encoding='utf-8').split('\nRUN ')[-1].lower():
            time.sleep(1800)


def main():
    log('waiting for the crime-3 follow-up')
    while 'test finished' not in (HERE / 'proto-followup.log').read_text(encoding='utf-8'):
        time.sleep(60)
    log('started')
    frozen = sorted((HERE / 'invoice-books').glob('playbook-frozen-*.md')) if (HERE / 'invoice-books').exists() else []
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
