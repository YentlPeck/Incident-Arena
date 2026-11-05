"""Supervisor for Experiment 3 mixed practice (practice_general.py). Resumable: finished cases are kept in
playbook-history-general/. A practice game that failed its audit is archived to games-invalid and replayed;
provider usage limits are waited out. Never touches family-3 seeds."""
import datetime
import pathlib
import shutil
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import run_batch  # noqa: E402

LOG = HERE / 'general-practice.log'
GAMES = run_batch.ARENA / 'games'
INVALID = run_batch.ARENA / 'games-invalid'
for attempt in range(1, 13):
    with LOG.open('a', encoding='utf-8') as out:
        out.write(f'\nATTEMPT {attempt} {datetime.datetime.now().isoformat(timespec="seconds")}\n'); out.flush()
        code = subprocess.run([sys.executable, '-u', str(HERE / 'practice_general.py')], cwd=HERE,
                              stdout=out, stderr=subprocess.STDOUT).returncode
        out.write(f'EXIT {code}\n')
    if code == 0:
        break
    tail = LOG.read_text(encoding='utf-8').split(f'ATTEMPT {attempt} ')[-1]
    # Archive any practice game of this run that did not finish validly, so it is replayed fresh.
    for d in list(GAMES.glob('case-*-opus-practice')) + list(GAMES.glob('inv-*-opus-practice')):
        seed = d.name.split('-')[1]
        family = 'leak' if d.name.startswith('case-') else 'invoice'
        if (HERE / 'playbook-history-general' / f'after-{family}-{seed}.md').exists():
            continue
        if int(seed) <= 20:
            continue  # the original leak practice (seeds 1-20) is history, never touched
        INVALID.mkdir(exist_ok=True)
        shutil.move(str(d), str(INVALID / f'general-practice-{d.name}-{int(time.time())}'))
    if 'usage limit' in tail.lower() or 'rate limit' in tail.lower():
        time.sleep(1800)
