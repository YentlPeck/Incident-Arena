"""Run fresh screenshot-only players against seeded cases (no players in --dry-run)."""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import os
import pathlib
import re
import shutil
import signal
import subprocess
import sys
import time
import threading
import urllib.request
from dataclasses import dataclass

try:
    from . import prompts
except ImportError:
    import prompts

HERE = pathlib.Path(__file__).resolve().parent
ARENA = prompts.ARENA
MODELS = {'haiku': 'claude-haiku-5-5', 'luna': 'gpt-6-luna', 'sonnet': 'claude-sonnet-5-5',
          'opus': 'claude-opus-5-5', 'sol': 'gpt-6.1-sol'}
# The experiment split is declared here once; both runners and collection use it.
SEED_SPLIT = {'practice': (1, 999), 'test': (1001, None)}
PRACTICE_RECORD = HERE / 'playbook-history' / 'practice-seeds.json'
_record_lock = threading.Lock()
VERSION_FILES = {'gen_sha256': 'cases/gen.js', 'gameR_sha256': 'cases/gameR.js',
                 'case_html_sha256': 'case.html', 'prompts_sha256': 'arena/prompts.py',
                 'server_sha256': 'arena/server.py', 'case_css_sha256': 'cases/case.css',
                 'icons_sha256': 'cases/icons.js', 'data_js_sha256': 'data.js', 'style_css_sha256': 'style.css'}
INVOICE_VERSION_FILES = {
    'gen2_sha256': 'cases/gen2.js', 'gameR2_sha256': 'cases/gameR2.js',
    'case2_html_sha256': 'case2.html', 'case2_css_sha256': 'cases/case2.css',
    'case_css_sha256': 'cases/case.css', 'icons_sha256': 'cases/icons.js',
    'prompts2_sha256': 'arena/prompts2.py', 'server2_sha256': 'arena/server2.py',
    'server_sha256': 'arena/server.py', 'data_js_sha256': 'data.js', 'style_css_sha256': 'style.css',
}
GUARD_VERSION_FILES = {
    'gen_guard_sha256': 'cases/gen-guard.js', 'gameG_sha256': 'cases/gameG.js',
    'case_guard_html_sha256': 'case-guard.html', 'guard_css_sha256': 'cases/guard.css',
    'case2_css_sha256': 'cases/case2.css', 'case_css_sha256': 'cases/case.css', 'icons_sha256': 'cases/icons.js',
    'prompts_guard_sha256': 'arena/prompts_guard.py', 'server_guard_sha256': 'arena/server_guard.py',
    'server_sha256': 'arena/server.py', 'data_js_sha256': 'data.js', 'style_css_sha256': 'style.css',
}
# Guard duty seeds (DESIGN-guard.md): test 7001-7099, pilot 7901-7999; practice 7501-7599 only via condition 'practice'.
GUARD_SEEDS = (7001, 7999)
GUARD_PRACTICE = (7501, 7599)


def prompt_module(family):
    if family == 'leak':
        return prompts
    if family == 'guard':
        try:
            from . import prompts_guard
        except ImportError:
            import prompts_guard
        return prompts_guard
    if family != 'invoice':
        raise ValueError(f'Unknown case family: {family}')
    try:
        from . import prompts2
    except ImportError:
        import prompts2
    return prompts2


def validate_family_seeds(seeds, family, *, check_practice=True):
    if family == 'invoice':
        for seed in seeds:
            if type(seed) is not int or not 2001 <= seed <= 2999:
                raise ValueError(f'Seed {seed!r} is outside the invoice test range 2001..2999')
    elif family == 'leak':
        (validate_test_seeds if check_practice else lambda s: validate_seeds(s, 'test'))(seeds)
    elif family == 'guard':
        for seed in seeds:
            if (type(seed) is not int or not GUARD_SEEDS[0] <= seed <= GUARD_SEEDS[1]
                    or GUARD_PRACTICE[0] <= seed <= GUARD_PRACTICE[1]):
                raise ValueError(f'Seed {seed!r} is outside the guard range {GUARD_SEEDS[0]}..{GUARD_SEEDS[1]}')
    else:
        raise ValueError(f'Unknown case family: {family}')


def validate_seeds(seeds, split):
    first, last = SEED_SPLIT[split]
    for seed in seeds:
        if type(seed) is not int or seed < first or (last is not None and seed > last):
            raise ValueError(f'Seed {seed!r} is outside the {split} range {first}..{last or "+"}')


def practiced_seeds():
    if not PRACTICE_RECORD.exists():
        return set()
    seeds = json.loads(PRACTICE_RECORD.read_text(encoding='utf-8'))
    if not isinstance(seeds, list) or any(type(s) is not int for s in seeds):
        raise ValueError(f'Invalid practice seed record: {PRACTICE_RECORD}')
    return set(seeds)


def validate_test_seeds(seeds):
    validate_seeds(seeds, 'test')
    overlap = set(seeds) & practiced_seeds()
    if overlap:
        raise ValueError(f'Test seeds already used in practice: {sorted(overlap)}')


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    pending = path.with_name(path.name + '.tmp')
    pending.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
    pending.replace(path)


def record_practice_seed(seed):
    # Record before launching the player, including interrupted or failed games.
    with _record_lock:
        write_json(PRACTICE_RECORD, sorted(practiced_seeds() | {seed}))


def text_sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def frozen_playbook(path):
    path = pathlib.Path(path)
    match = re.fullmatch(r'playbook-frozen-([0-9a-f]{8})\.md', path.name)
    if not match:
        raise ValueError('Testing requires a playbook-frozen-<sha8>.md file; run practice.py --freeze')
    text = path.read_bytes().decode('utf-8')
    if not text.strip() or text_sha(text)[:8] != match[1]:
        raise ValueError(f'Frozen playbook content does not match its filename: {path}')
    return text


def build_manifest(book, model, family='leak'):
    files = {'leak': VERSION_FILES, 'invoice': INVOICE_VERSION_FILES, 'guard': GUARD_VERSION_FILES}[family]
    module = prompt_module(family)
    manifest = {'playbook_sha256': text_sha(book) if book is not None else 'none',
            **{key: hashlib.sha256((HERE.parent / name).read_bytes()).hexdigest()
               for key, name in files.items()},
            'model': model, 'command_budget': module.COMMANDS, 'view': 'screen'}
    if family in ('invoice', 'guard'):
        manifest['family'] = family
    return manifest


def check_resume(directory, manifest, allow_version_mismatch=False):
    if not (directory / 'result.json').exists():
        return False
    path = directory / 'manifest.json'
    try:
        previous = json.loads(path.read_text(encoding='utf-8')) if path.exists() else None
    except (OSError, ValueError):
        previous = None  # An unreadable manifest cannot establish version equality.
    if previous != manifest:
        message = f'{directory.name}: experiment version mismatch (manifest.json); use --allow-version-mismatch to skip explicitly'
        if not allow_version_mismatch:
            raise ValueError(message)
        print('WARNING: ' + message + '; old result retained and subject to collection validation', file=sys.stderr)
    return True


class UsageLimitError(RuntimeError):
    """The provider cannot accept more games; do not spend the rest of the queue."""


def provider_limit(directory):
    """Read provider metadata, never an assistant's claim or text in game evidence."""
    path = pathlib.Path(directory) / 'transcript.jsonl'
    if not path.exists():
        return None
    with path.open(encoding='utf-8', errors='replace') as stream:
        for line in stream:
            try:
                event = json.loads(line)
            except ValueError:
                continue
            if not isinstance(event, dict) or event.get('type') != 'result':
                continue
            if event.get('api_error') in ('usage_limit_reached', 'rate_limit_error') or (
                    event.get('is_error') is True and event.get('api_error_status') == 429):
                return str(event.get('result') or event.get('api_error') or 'Provider rate limit')
    return None


def retry_reason(directory):
    """A lost game is valid. Only execution failures may be retried."""
    directory = pathlib.Path(directory)
    if not directory.exists():
        return None
    try:
        run = json.loads((directory / 'run.json').read_text(encoding='utf-8'))
        if run.get('error') or type(run.get('exitcode')) is not int or run['exitcode'] != 0:
            return 'execution failed or interrupted'
        if not (directory / 'result.json').exists():
            return 'missing result'
        audit_path = directory / 'audit.json'
        if audit_path.exists() and json.loads(audit_path.read_text(encoding='utf-8')).get('ok') is not True:
            return 'audit did not pass'
    except (OSError, ValueError, AttributeError):
        return 'missing or unreadable execution metadata'
    return None


def archive_invalid(arena, jobs):
    """Preserve rejected attempts outside collection before an explicit retry."""
    arena = pathlib.Path(arena).resolve()
    games = (arena / 'games').resolve()
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    archive = (arena / 'games-invalid' / f'recovery-{stamp}').resolve()
    if not archive.is_relative_to(arena):
        raise ValueError('Archive must stay inside the arena')
    records = []
    for job in jobs:
        source = games / job.gid
        reason = retry_reason(source)
        if reason is None:
            continue
        destination = archive / job.gid
        if source.is_symlink() or source.resolve().parent != games or destination.parent != archive:
            raise ValueError(f'Unsafe recovery path: {source}')
        archive.mkdir(parents=True, exist_ok=True)
        # Save intent first, so an interrupted move still has a provenance record.
        records.append({'id': job.gid, 'reason': reason, 'source': str(source),
                        'archive': str(destination), 'moved': False})
        write_json(archive / 'recovery.json', records)
        shutil.move(str(source), str(destination))
        records[-1]['moved'] = True
        write_json(archive / 'recovery.json', records)
    return records


@dataclass(frozen=True)
class Job:
    seed: int
    player: str
    condition: str
    family = 'leak'  # Class setting: the original dataclass fields/serialization stay unchanged.

    @property
    def gid(self):
        return f'case-{self.seed}-{self.player}-{condition_id(self.condition)}'


@dataclass(frozen=True)
class InvoiceJob(Job):
    family = 'invoice'

    @property
    def gid(self):
        return f'inv-{self.seed}-{self.player}-{condition_id(self.condition)}'


@dataclass(frozen=True)
class GuardJob(Job):
    family = 'guard'

    @property
    def gid(self):
        return f'grd-{self.seed}-{self.player}-{condition_id(self.condition)}'


def condition_id(condition):
    if condition in ('alone', 'practice'):
        return condition
    if not condition.startswith('playbook:') or not condition[9:]:
        raise ValueError('Condition must be alone or playbook:<path>')
    path = str(pathlib.Path(condition[9:]).resolve())
    return 'playbook-' + hashlib.sha256(os.path.normcase(path).encode()).hexdigest()[:10]


def parse_seeds(values):
    result = []
    for value in values:
        for part in value.split(','):
            match = re.fullmatch(r'(\d+)\.\.(\d+)', part)
            if match:
                first, last = map(int, match.groups())
                if first > last:
                    raise ValueError('Seed ranges must be increasing')
                result.extend(range(first, last + 1))
            elif re.fullmatch(r'\d+', part):
                result.append(int(part))
            else:
                raise ValueError(f'Bad seed or range: {part!r}')
    return list(dict.fromkeys(result))


def plan_jobs(seeds, player, conditions, family='leak'):
    if family not in ('leak', 'invoice', 'guard'):
        raise ValueError(f'Unknown case family: {family}')
    job_type = {'invoice': InvoiceJob, 'guard': GuardJob}.get(family, Job)
    for condition in conditions:
        condition_id(condition)
    jobs = []
    for index, seed in enumerate(seeds):
        ordered = conditions if index % 2 == 0 else list(reversed(conditions))
        jobs.extend(job_type(seed, player, condition) for condition in ordered)
    return jobs


def player_command(gid, player, arena=ARENA, model=None):
    model = model or MODELS[player]
    if player in ('luna', 'sol'):
        command = ['codex', 'exec', '-m', model, '-C', str(arena), '--skip-git-repo-check',
                   '-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=true', '--json', '-']
        if player == 'sol':
            command[-1:-1] = ['-c', 'forced_login_method="chatgpt"']
        return command
    return ['claude', '-p', '--model', model, '--tools', 'Bash,Read',
            '--allowedTools', f'Bash(python play.py {gid}:*)',
            '--disallowedTools', 'Glob,Grep,WebFetch,WebSearch,Agent,Task',
            '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
            '--permission-mode', 'dontAsk', '--output-format', 'stream-json', '--verbose']


def executable_command(command):
    executable = shutil.which(command[0])
    if not executable:
        raise RuntimeError(f'{command[0]} is not installed or not on PATH')
    return [executable, *command[1:]]


def start_process(command, **kwargs):
    if os.name == 'nt':
        kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
    else:
        kwargs['start_new_session'] = True
    return subprocess.Popen(command, **kwargs)


def stop_process(process):
    if process is None or process.poll() is not None:
        return
    if os.name == 'nt':
        subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    else:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    process.wait(timeout=15)


def wait_ready(process, directory, timeout=45):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError('Game server exited before startup; see server.log')
        if (directory / 'port.txt').exists():
            return int((directory / 'port.txt').read_text(encoding='utf-8'))
        time.sleep(0.1)
    raise TimeoutError('Game server startup timed out')


def finalize_live(directory):
    if (directory / 'result.json').exists():
        return
    port = int((directory / 'port.txt').read_text(encoding='utf-8').strip())
    with urllib.request.urlopen(f'http://127.0.0.1:{port}/?op=finish', timeout=90) as response:
        response.read()
    if not (directory / 'result.json').exists():
        raise RuntimeError('Server did not write result.json after finalization')


def run_audit(gid, arena, directory):
    # Never leave a stale passing verdict after an audit process fails.
    write_json(directory / 'audit.json', {'ok': False, 'error': 'Audit did not complete'})
    with (directory / 'audit.txt').open('w', encoding='utf-8') as output:
        result = subprocess.run([sys.executable, str(HERE / 'audit.py'), '--arena-dir', str(arena), gid],
                                stdout=output, stderr=subprocess.STDOUT, check=False)
    verdict = json.loads((directory / 'audit.json').read_text(encoding='utf-8'))
    ok = result.returncode == 0 and verdict.get('ok') is True
    if not ok:
        verdict['ok'] = False
        write_json(directory / 'audit.json', verdict)
    return ok


def describe(job, arena=ARENA, model=None):
    directory = pathlib.Path(arena) / 'games' / job.gid
    server_file = {'invoice': 'server2.py', 'guard': 'server_guard.py'}.get(job.family, 'server.py')
    server = [sys.executable, str(HERE / server_file), job.gid, '--case', str(job.seed),
              '--view', 'screen', '--commands', str(prompt_module(job.family).COMMANDS), '--arena-dir', str(arena)]
    return {'id': job.gid, 'seed': job.seed, 'condition': job.condition, 'server': server,
            'player': player_command(job.gid, job.player, arena, model),
            'prompt': 'new temporary folder outside both projects', 'result': str(directory / 'result.json'),
            'after_player': 'finalize live page, then audit transcript',
            'resume': 'skip existing results only with matching experiment manifest'}


def run_game(job, arena=ARENA, timeout=1800, model=None, playbook=None, *,
             book_text=None, manifest=None, allow_version_mismatch=False):
    arena = pathlib.Path(arena).resolve()
    directory = arena / 'games' / job.gid
    prompt_builder = prompt_module(job.family)
    if job.condition == 'practice':
        if job.family == 'guard':
            if type(job.seed) is not int or not GUARD_PRACTICE[0] <= job.seed <= GUARD_PRACTICE[1]:
                raise ValueError(f'Guard practice seed {job.seed!r} is outside {GUARD_PRACTICE[0]}..{GUARD_PRACTICE[1]}')
        elif job.family != 'leak':
            raise ValueError('Invoice cases are test games only')
        else:
            validate_seeds([job.seed], 'practice')
    else:
        validate_family_seeds([job.seed], job.family)
    if manifest is None:
        if job.condition.startswith('playbook:'):
            book_text = frozen_playbook(job.condition[9:])
        elif playbook is not None:
            if job.condition != 'practice':
                raise ValueError('Only practice can use a mutable playbook')
            book_text = pathlib.Path(playbook).read_bytes().decode('utf-8')
        manifest = build_manifest(book_text, model or MODELS[job.player], job.family)
    if check_resume(directory, manifest, allow_version_mismatch):
        # Recover an audit interrupted after result.json was saved.
        if not (directory / 'audit.json').exists():
            run_audit(job.gid, arena, directory)
        return {'id': job.gid, 'status': 'skipped'}
    if build_manifest(book_text, model or MODELS[job.player], job.family) != manifest:
        raise ValueError(f'{job.gid}: source versions changed since batch planning; start a new batch')
    page, generator = {'invoice': ('case2.html', 'gen2.js'), 'guard': ('case-guard.html', 'gen-guard.js')}.get(job.family, ('case.html', 'gen.js'))
    if not (HERE.parent / page).exists() or not (HERE.parent / 'cases' / generator).exists():
        raise RuntimeError(f'{page} and cases/{generator} must exist before running players')
    if not (arena / 'play.py').exists():
        raise RuntimeError(f'Missing controller: {arena / "play.py"}')
    command = executable_command(player_command(job.gid, job.player, arena, model))
    prompt = prompt_builder.write_prompt(job.gid, book_text, arena)
    if book_text is not None:
        # The general prompt builder trims lessons. Insert the frozen snapshot
        # verbatim here, preserving even its whitespace and CRLF line endings.
        marker = '\x00FROZEN_PLAYBOOK\x00'
        content = prompt_builder.build_prompt(job.gid, marker).replace(marker, book_text, 1)
        with prompt.open('w', encoding='utf-8', newline='') as stream:
            stream.write(content)
    directory.mkdir(parents=True, exist_ok=True)
    write_json(directory / 'manifest.json', manifest)
    write_json(directory / 'run.json', {'error': 'Run did not complete', 'exitcode': None})
    # A stale port from an interrupted run must not be mistaken for the new server.
    (directory / 'port.txt').unlink(missing_ok=True)
    (directory / 'log.jsonl').unlink(missing_ok=True)
    plan = describe(job, arena, model)
    server = player = None
    ready, error, exitcode = False, None, None
    try:
        with (directory / 'server.log').open('w', encoding='utf-8') as output:
            server = start_process(plan['server'], cwd=HERE.parent, stdout=output, stderr=subprocess.STDOUT)
            try:
                wait_ready(server, directory)
                ready = True
                if job.condition == 'practice' and job.family == 'leak':
                    record_practice_seed(job.seed)
                with prompt.open('r', encoding='utf-8') as stdin, \
                        (directory / 'transcript.jsonl').open('w', encoding='utf-8') as stdout, \
                        (directory / 'player.stderr.txt').open('w', encoding='utf-8') as stderr:
                    player = start_process(command, cwd=arena, stdin=stdin, stdout=stdout, stderr=stderr)
                    try:
                        exitcode = player.wait(timeout=timeout)
                    except subprocess.TimeoutExpired:
                        error = 'Player timed out'
                    finally:
                        stop_process(player)
            finally:
                try:
                    if ready:
                        finalize_live(directory)
                        server.wait(timeout=15)
                finally:
                    stop_process(server)
    except Exception as exc:
        error = str(exc)
    finally:
        # Prompts may contain case-specific learning feedback; do not retain them.
        prompt.unlink(missing_ok=True)
        prompt.parent.rmdir()
    try:
        if build_manifest(book_text, model or MODELS[job.player], job.family) != manifest:
            error = error or 'Source versions changed during the game; result is invalid'
    except OSError as exc:
        error = error or f'Cannot verify source versions after game: {exc}'
    if (directory / 'result.json').exists():
        audit_ok = run_audit(job.gid, arena, directory)
    else:
        audit_ok = False
        write_json(directory / 'audit.json', {'ok': False, 'error': 'No result to audit'})
    metadata = {'id': job.gid, 'seed': job.seed, 'player': job.player, 'model': model or MODELS[job.player],
                'condition': job.condition, 'exitcode': exitcode, 'audit_ok': audit_ok, 'error': error}
    limit = provider_limit(directory)
    if limit:
        metadata['error'] = 'Provider usage limit: ' + limit
    write_json(directory / 'run.json', metadata)
    if limit:
        raise UsageLimitError(f'{job.gid}: {limit}')
    if error or exitcode != 0 or not audit_ok:
        raise RuntimeError(f'{job.gid}: {error or "player/audit failed"}; see run.json and audit.txt')
    return {'id': job.gid, 'status': 'completed', 'audit_ok': audit_ok}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--family', choices=['leak', 'invoice', 'guard'], default='leak')
    ap.add_argument('--seeds', nargs='+', required=True, help='integers, comma lists, or inclusive A..B')
    ap.add_argument('--player', choices=['haiku', 'luna'], required=True)
    ap.add_argument('--condition', action='append', help='alone or playbook:<path>; repeat for both')
    ap.add_argument('--parallel', type=int, default=2)
    ap.add_argument('--timeout', type=float, default=1800)
    ap.add_argument('--arena-dir', type=pathlib.Path, default=ARENA)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--retry-invalid', action='store_true',
                    help='archive failed/interrupted attempts before retrying; never replay a valid loss')
    ap.add_argument('--allow-version-mismatch', action='store_true',
                    help='explicitly retain/skip old results; collection still validates round versions')
    a = ap.parse_args(argv)
    try:
        if a.parallel < 1 or a.timeout <= 0:
            raise ValueError('parallel and timeout must be positive')
        conditions = list(dict.fromkeys(a.condition or ['alone']))
        if 'practice' in conditions:
            raise ValueError('Use practice.py for practice games')
        seeds = parse_seeds(a.seeds)
        validate_family_seeds(seeds, a.family, check_practice=False)
        jobs = plan_jobs(seeds, a.player, conditions, a.family)
    except ValueError as exc:
        ap.error(str(exc))
    if a.dry_run:
        for job in jobs:
            print(json.dumps(describe(job, a.arena_dir), ensure_ascii=False))
        return
    # Snapshot each condition once before launching any player. Check every resume
    # up front so a mismatch cannot spend part of a batch before stopping it.
    snapshots = {}
    try:
        validate_family_seeds(seeds, a.family)
        for condition in conditions:
            book = frozen_playbook(condition[9:]) if condition.startswith('playbook:') else None
            manifest = build_manifest(book, MODELS[a.player], a.family)
            snapshots[condition] = (book, manifest)
        for job in jobs:
            check_resume(a.arena_dir / 'games' / job.gid, snapshots[job.condition][1], a.allow_version_mismatch)
    except (OSError, ValueError) as exc:
        ap.error(str(exc))
    if a.retry_invalid:
        records = archive_invalid(a.arena_dir, jobs)
        print(json.dumps({'archived_invalid_attempts': len(records)}), flush=True)
    for condition, (_, manifest) in snapshots.items():
        print(json.dumps({'condition': condition, 'versions': manifest,
                          'note': 'Declare these versions in the case round registry before collecting.'}), flush=True)
    failed = False
    with concurrent.futures.ThreadPoolExecutor(max_workers=a.parallel) as pool:
        remaining = iter(jobs)
        pending, limited = set(), False
        while True:
            while not limited and len(pending) < a.parallel:
                job = next(remaining, None)
                if job is None:
                    break
                pending.add(pool.submit(run_game, job, a.arena_dir, a.timeout,
                                        book_text=snapshots[job.condition][0], manifest=snapshots[job.condition][1],
                                        allow_version_mismatch=a.allow_version_mismatch))
            if not pending:
                break
            done, pending = concurrent.futures.wait(pending, return_when=concurrent.futures.FIRST_COMPLETED)
            for future in done:
                try:
                    print(json.dumps(future.result()), flush=True)
                except Exception as exc:
                    failed = True
                    if isinstance(exc, UsageLimitError):
                        limited = True
                    print(str(exc), file=sys.stderr, flush=True)
        if limited:
            print('PAUSED: provider usage limit; unstarted games left untouched. Resume with --retry-invalid after reset.',
                  file=sys.stderr, flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
