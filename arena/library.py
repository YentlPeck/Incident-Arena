"""Library test (2026-11-05, Yentl's idea): one book with three chapters, one per crime, and the player must pick
the right chapter itself. Neutral prompt: the instructions do not say which kind of crime it is. Pre-registered in DESIGN-exp3.md ("Library test") before any library game runs.

  python library.py make      -> writes arena/library-books/playbook-frozen-<sha8>.md from the three frozen books
  python library.py run       -> unattended: Haiku and Luna play leak 1001-1055, invoice 2001-2055, prototype 6001-6055
  python library.py story     -> read-only analysis and verdict

Controls are reused (same seeds, same versions, manifest-checked): alone, and each crime's own specialised book."""
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
import run_batch  # noqa: E402
import story  # noqa: E402

FAMILIES = {
    # family: (job class, seeds, specialised frozen book, chapter title)
    'leak': (run_batch.Job, (1001, 1055), HERE / 'playbook-frozen-9693baa4.md', 'A leaked game build'),
    'invoice': (run_batch.InvoiceJob, (2001, 2055), HERE / 'invoice-books' / 'playbook-frozen-131af10b.md',
                'A diverted supplier payment'),
    'proto': (run_batch.ProtoJob, (6001, 6055), HERE / 'proto-books' / 'playbook-frozen-4e45bae9.md',
              'A prototype missing from a locked room'),
}
DIR = HERE / 'library-books'
ALPHA, NET = 0.025, 9


def make():
    parts = ['# Investigation Library',
             '',
             'This library has one chapter per kind of case. First read the case on screen and decide which chapter fits.',
             'Follow only that chapter. If no chapter fits, use the general habits that the chapters share.',
             '']
    for _, (_, _, book, title) in FAMILIES.items():
        text = run_batch.frozen_playbook(book).strip()
        # Demote the book's own headings one level, so the chapter title stays on top.
        text = '\n'.join(('#' + line) if line.startswith('#') else line for line in text.splitlines())
        parts += [f'# Chapter: {title}', '', text, '']
    content = '\n'.join(parts).rstrip() + '\n'
    sha = hashlib.sha256(content.encode('utf-8')).hexdigest()
    DIR.mkdir(exist_ok=True)
    out = DIR / f'playbook-frozen-{sha[:8]}.md'
    out.write_bytes(content.encode('utf-8'))
    print(f'{out.name}: {len(content)} chars')
    return out


def library_book():
    books = sorted(DIR.glob('playbook-frozen-*.md'))
    if len(books) != 1:
        raise SystemExit('Expected exactly one frozen library book in arena/library-books/')
    return books[0].resolve()


def run():
    book = library_book()
    log = HERE / 'library.log'

    def player(name):
        out = HERE / f'library-{name}.log'
        for family, (_, (a, b), _, _) in FAMILIES.items():
            cmd = [sys.executable, '-u', str(HERE / 'run_batch.py'), '--family', family, '--seeds', f'{a}..{b}',
                   '--player', name, '--parallel', '4', '--retry-invalid', '--condition', f'neutral:{book}']
            for _ in range(8):
                with out.open('a', encoding='utf-8') as o:
                    o.write(f'\nRUN {family} {datetime.datetime.now().isoformat(timespec="seconds")}\n'); o.flush()
                    code = subprocess.run(cmd, cwd=HERE, stdout=o, stderr=subprocess.STDOUT).returncode
                if code == 0:
                    break
                if 'usage limit' in out.read_text(encoding='utf-8').split('\nRUN ')[-1].lower():
                    time.sleep(1800)
    with log.open('a', encoding='utf-8') as o:
        o.write(f'{datetime.datetime.now().isoformat(timespec="seconds")} started {book.name}\n')
    threads = [threading.Thread(target=player, args=(p,)) for p in ('haiku', 'luna')]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    with log.open('a', encoding='utf-8') as o:
        o.write(f'{datetime.datetime.now().isoformat(timespec="seconds")} test finished\n')


def outcome(family, player, book, seed, neutral=False):
    job_type = FAMILIES[family][0]
    cond = 'alone' if book is None else f'{"neutral" if neutral else "playbook"}:{pathlib.Path(book).resolve()}'
    d = run_batch.ARENA / 'games' / job_type(seed, player, cond).gid
    try:
        res, audit, rn, man = (json.loads((d / f).read_text(encoding='utf-8'))
                               for f in ('result.json', 'audit.json', 'run.json', 'manifest.json'))
    except (OSError, ValueError):
        return None
    text = None if book is None else run_batch.frozen_playbook(book)
    if not audit.get('ok') or rn.get('exitcode') != 0 or rn.get('error'):
        return None
    if man != run_batch.build_manifest(text, run_batch.MODELS[player], family, 'neutral' if neutral else None):
        return None
    return bool((res.get('report') or {}).get('correct'))


def show():
    lib = library_book()
    print('library book:', lib.name)
    passes, complete = [], True
    for family, (_, (a, b), spec, _) in FAMILIES.items():
        seeds = range(a, b + 1)
        for player in ('haiku', 'luna'):
            got = {k: {s: outcome(family, player, bk, s, k == 'library') for s in seeds}
                   for k, bk in (('alone', None), ('specialised', spec), ('library', lib))}
            n = {k: sum(v is not None for v in got[k].values()) for k in got}
            solved = {k: sum(bool(v) for v in got[k].values()) for k in got}
            line = f'{family:8} {player:6} valid {n} | solved {solved}'
            for ctrl in ('alone', 'specialised'):
                pairs = [s for s in seeds if got['library'][s] is not None and got[ctrl][s] is not None]
                w = sum(got['library'][s] and not got[ctrl][s] for s in pairs)
                l = sum(got[ctrl][s] and not got['library'][s] for s in pairs)
                line += f' | vs {ctrl}: +{w}/-{l}'
                if ctrl == 'alone':
                    p = story.sign_test(w, l)
                    line += f' p={p:.4f}'
                    passes.append((p <= ALPHA, w - l >= NET))
                    complete &= len(pairs) == len(seeds)
                else:
                    line += f' (net {w - l:+d})'
            print(line)
    if not complete:
        verdict = 'Too early'
    elif all(ok for ok, _ in passes):
        verdict = 'Yes' if all(big for _, big in passes) else 'A little'
    else:
        verdict = 'Not yet'
    print('VERDICT (library beats alone, all three crimes, both AIs):', verdict)
    print('Secondary, descriptive: library vs each specialised book (net solves); within five is "about as good".')


if __name__ == '__main__':
    {'make': make, 'run': run, 'story': show}[sys.argv[1]]()
