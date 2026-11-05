"""Run the pre-registered guard duty test (DESIGN-guard.md) for one player until complete.
Retries only invalid attempts (run_batch --retry-invalid archives audit/usage failures); waits out
provider usage limits. Never changes seeds, conditions or books."""
import datetime
import pathlib
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
BOOKS = [HERE / 'guard-books' / 'playbook-frozen-6c1bc2af.md', HERE / 'guard-books' / 'playbook-frozen-609fe32c.md']
player = sys.argv[1]
log = HERE / f'guard-test-{player}.log'
cmd = [sys.executable, '-u', str(HERE / 'run_batch.py'), '--family', 'guard', '--seeds', '7001..7055',
       '--player', player, '--parallel', '4', '--retry-invalid', '--condition', 'alone']
for b in BOOKS:
    cmd += ['--condition', f'playbook:{b}']
for attempt in range(1, 9):
    with log.open('a', encoding='utf-8') as out:
        out.write(f'\nATTEMPT {attempt} {datetime.datetime.now().isoformat(timespec="seconds")}\n'); out.flush()
        code = subprocess.run(cmd, cwd=HERE, stdout=out, stderr=subprocess.STDOUT).returncode
        out.write(f'EXIT {code}\n')
    text = log.read_text(encoding='utf-8')
    if code == 0:
        break
    if 'usage limit' in text.split(f'ATTEMPT {attempt}')[-1].lower():
        time.sleep(1800)  # wait for the subscription window to reset
