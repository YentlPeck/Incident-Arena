"""Fair 'no book' control for the library test (2026-11-05, Yentl's design): 55 cases drawn at random from the three
crimes' test seeds, played alone with the same neutral prompt as the library games (condition 'neutral-alone').
Compared pairwise with the library games on the same 55 cases.

  python mixed_alone.py run     -> waits for the library test, then plays the 110 games (unattended)
  python mixed_alone.py story   -> read-only analysis"""
import datetime
import pathlib
import random
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import library  # noqa: E402
import story  # noqa: E402

# Fixed draw (seed 20261105), decided before any neutral-alone game: 55 (crime, seed) pairs from the 165 test cases.
POOL = [(f, s) for f, (_, (a, b), _, _) in library.FAMILIES.items() for s in range(a, b + 1)]
SAMPLE = sorted(random.Random(20261105).sample(POOL, 55))
ALPHA = 0.025


def run():
    log = HERE / 'mixed-alone.log'
    while 'test finished' not in (HERE / 'library.log').read_text(encoding='utf-8'):
        time.sleep(60)
    procs = []
    for player in ('haiku', 'luna'):
        def go(player=player):
            out = HERE / f'mixed-alone-{player}.log'
            for family in library.FAMILIES:
                seeds = [str(s) for f, s in SAMPLE if f == family]
                cmd = [sys.executable, '-u', str(HERE / 'run_batch.py'), '--family', family, '--seeds', ','.join(seeds),
                       '--player', player, '--parallel', '4', '--retry-invalid', '--condition', 'neutral-alone']
                for _ in range(8):
                    with out.open('a', encoding='utf-8') as o:
                        o.write(f'\nRUN {family} {datetime.datetime.now().isoformat(timespec="seconds")}\n'); o.flush()
                        if subprocess.run(cmd, cwd=HERE, stdout=o, stderr=subprocess.STDOUT).returncode == 0:
                            break
                    if 'usage limit' in out.read_text(encoding='utf-8').split('\nRUN ')[-1].lower():
                        time.sleep(1800)
        import threading
        t = threading.Thread(target=go)
        t.start()
        procs.append(t)
    with log.open('a', encoding='utf-8') as o:
        o.write(f'{datetime.datetime.now().isoformat(timespec="seconds")} started\n')
    for t in procs:
        t.join()
    with log.open('a', encoding='utf-8') as o:
        o.write(f'{datetime.datetime.now().isoformat(timespec="seconds")} test finished\n')


def outcome_alone_neutral(family, player, seed):
    import json
    import run_batch
    job = library.FAMILIES[family][0](seed, player, 'neutral-alone')
    d = run_batch.ARENA / 'games' / job.gid
    try:
        res, audit, rn, man = (json.loads((d / f).read_text(encoding='utf-8'))
                               for f in ('result.json', 'audit.json', 'run.json', 'manifest.json'))
    except (OSError, ValueError):
        return None
    if not audit.get('ok') or rn.get('exitcode') != 0 or rn.get('error'):
        return None
    if man != run_batch.build_manifest(None, run_batch.MODELS[player], family, 'neutral'):
        return None
    return bool((res.get('report') or {}).get('correct'))


def show():
    lib = library.library_book()
    print('sample per crime:', {f: sum(x == f for x, _ in SAMPLE) for f in library.FAMILIES})
    verdicts, complete = [], True
    for player in ('haiku', 'luna'):
        alone = {k: outcome_alone_neutral(*k[:1], player, k[1]) for k in SAMPLE}
        libr = {k: library.outcome(k[0], player, lib, k[1], True) for k in SAMPLE}
        pairs = [k for k in SAMPLE if alone[k] is not None and libr[k] is not None]
        w = sum(libr[k] and not alone[k] for k in pairs)
        l = sum(alone[k] and not libr[k] for k in pairs)
        p = story.sign_test(w, l)
        complete &= len(pairs) == len(SAMPLE)
        verdicts.append(p <= ALPHA)
        print(f'{player}: {len(pairs)} pairs | solved alone {sum(bool(alone[k]) for k in pairs)}, '
              f'library {sum(bool(libr[k]) for k in pairs)} | +{w}/-{l}, p = {p:.4f}')
    print('VERDICT (library beats neutral alone, both AIs, p <= 0.025):',
          'Too early' if not complete else ('Yes' if all(verdicts) else 'Not yet'))


if __name__ == '__main__':
    {'run': run, 'story': show}[sys.argv[1]]()
