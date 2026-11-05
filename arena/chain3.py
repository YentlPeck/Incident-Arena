"""Experiment 3 chain (DESIGN-exp3.md, v2), unattended:
wait for mixed practice -> freeze the general book -> make the length-matched fake -> write test-plan.json
-> run the pre-registered 330-game test on the missing prototype (seeds 6001-6055, Haiku and Luna,
alone / general / fake). Resumable: every step is skipped when its output already exists."""
import datetime
import hashlib
import json
import pathlib
import subprocess
import sys
import threading
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import make_fake3  # noqa: E402
import practice_general  # noqa: E402

LOG = HERE / 'chain3.log'
PLAN = HERE / 'general-books' / 'test-plan.json'


def log(msg):
    with LOG.open('a', encoding='utf-8') as out:
        out.write(f'{datetime.datetime.now().isoformat(timespec="seconds")} {msg}\n')


def practice_done():
    p = HERE / 'general-practice.log'
    return p.exists() and 'PRACTICE COMPLETE' in p.read_text(encoding='utf-8')


def run_player(player, book, fake):
    out_path = HERE / f'proto-test-{player}.log'
    cmd = [sys.executable, '-u', str(HERE / 'run_batch.py'), '--family', 'proto', '--seeds', '6001..6055',
           '--player', player, '--parallel', '4', '--retry-invalid', '--condition', 'alone',
           '--condition', f'playbook:{book}', '--condition', f'playbook:{fake}']
    for attempt in range(1, 9):
        with out_path.open('a', encoding='utf-8') as out:
            out.write(f'\nATTEMPT {attempt} {datetime.datetime.now().isoformat(timespec="seconds")}\n'); out.flush()
            code = subprocess.run(cmd, cwd=HERE, stdout=out, stderr=subprocess.STDOUT).returncode
            out.write(f'EXIT {code}\n')
        if code == 0:
            return
        tail = out_path.read_text(encoding='utf-8').split(f'ATTEMPT {attempt} ')[-1].lower()
        if 'usage limit' in tail or 'rate limit' in tail:
            time.sleep(1800)


def main():
    log('chain started')
    while not practice_done():
        time.sleep(60)
    if PLAN.exists():
        plan = json.loads(PLAN.read_text(encoding='utf-8'))
        book, fake = (HERE / 'general-books' / plan['books'][k] for k in ('book', 'fake'))
    else:
        book = practice_general.freeze()
        text = make_fake3.make(book.read_text(encoding='utf-8'))
        fake = HERE / 'general-books' / f'playbook-frozen-{hashlib.sha256(text.encode("utf-8")).hexdigest()[:8]}.md'
        fake.write_bytes(text.encode('utf-8'))
        plan = {'experiment': 'exp3 v2', 'family': 'proto', 'seeds': [6001, 6055], 'players': ['haiku', 'luna'],
                'books': {'book': book.name, 'fake': fake.name},
                'book_chars': len(book.read_text(encoding='utf-8')), 'fake_chars': len(text),
                'verdict': 'book beats alone AND fake for both players, exact one-sided paired sign test p <= 0.025; '
                           '"Yes" also needs >= 9 net extra solves vs each control; otherwise "A little"; else "Not yet"',
                'frozen_at': datetime.datetime.now().isoformat(timespec='seconds')}
        PLAN.write_text(json.dumps(plan, indent=2) + '\n', encoding='utf-8')
        log(f'frozen: {plan}')
    threads = [threading.Thread(target=run_player, args=(p, book.resolve(), fake.resolve())) for p in ('haiku', 'luna')]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    log('test finished')


if __name__ == '__main__':
    main()
