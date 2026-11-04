"""Audit one arena game: did the player only use the game controller (and its own screenshot)?

Usage: python arena/audit.py <game-id> [<game-id> ...]
Every shell command must be exactly one plain controller call (no second command, no substitutions,
no redirections); every file read must be exactly that game's screenshot. Anything else is listed as ODD.
"""
import collections
import argparse
import json
import pathlib
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
ARENA = 'C:/Users/yentl/pixelforge-arena'
FORBIDDEN = re.compile(r'[\x00\n\r;&|<>`(){}]|\$\(|\$\{|\$[A-Za-z_]|%[A-Za-z_]+%')


def controller_ok(cmd, gid):
    """True only for one literal call like `python play.py <gid> click 3 4`."""
    if FORBIDDEN.search(cmd):
        return False
    ops = (r'look', r'enter', r'click \d+( \d+)?', r'scroll \d+ \d+ (up|down)', r'type( .*)?', r'ask( .*)?')
    if gid.startswith(('case-', 'inv-')):
        ops = (r'look', r'enter', r'click \d+ \d+', r'scroll \d+ \d+ (up|down)', r'type( .*)?')
    return re.fullmatch(rf'python play\.py {re.escape(gid)} ({"|".join(ops)})', cmd.strip()) is not None


def unwrap_powershell(c):
    """Codex runs commands as: "...powershell.exe" -Command '<cmd>'. Return <cmd>, or None if wrapped in anything else."""
    m = re.fullmatch(r'"[^"]*(?:powershell|pwsh)\.exe" (?:-NoProfile )?-Command \'(.*)\'', c.strip(), flags=re.S | re.I)
    if m:
        return m.group(1)
    return c if not re.search(r'powershell|pwsh', c, re.I) else None


def screenshot_ok(path, gid, arena=ARENA):
    p = path.replace('\\', '/').strip().lower()
    root = str(arena).replace('\\', '/').rstrip('/')
    allowed = {f'{root}/games/{gid}/screen.png'.lower(), f'games/{gid}/screen.png'.lower(), f'./games/{gid}/screen.png'.lower()}
    return p in allowed


def audit_events(raw, gid, arena=ARENA):
    events = [json.loads(line) for line in raw.splitlines() if line.strip().startswith('{')]
    odd, tools, final = [], collections.Counter(), ''
    if any(e.get('type') in ('result', 'assistant') for e in events):  # also audit interrupted Claude sessions
        for e in events:
            if e.get('type') == 'assistant':
                for b in e.get('message', {}).get('content', []):
                    if not isinstance(b, dict):
                        continue
                    if b.get('type') != 'tool_use':
                        continue
                    tools[b['name']] += 1
                    inp = b['input']
                    if b['name'] == 'Bash' and controller_ok(inp.get('command', ''), gid):
                        continue
                    if b['name'] == 'Read' and screenshot_ok(inp.get('file_path', ''), gid, arena) and set(inp) <= {'file_path'}:
                        continue
                    odd.append((b['name'], json.dumps(inp)[:160]))
            if e.get('type') == 'user':
                for b in e.get('message', {}).get('content', []):
                    if isinstance(b, dict) and b.get('type') == 'tool_result' and b.get('is_error'):
                        odd.append(('DENIED/ERROR', str(b.get('content'))[:160]))
            if e.get('type') == 'result':
                final = e.get('result', '')
    else:  # Codex transcript
        for e in events:
            it = e.get('item') or {}
            if e.get('type') != 'item.completed' or not it:
                continue
            tools[it.get('type')] += 1
            if it.get('type') == 'command_execution':
                inner = unwrap_powershell(it.get('command', ''))
                if inner is None or not controller_ok(inner, gid):
                    odd.append(('cmd', it.get('command', '')[:160]))
            elif it.get('type') == 'agent_message':
                final = it.get('text', '')
            elif it.get('type') == 'image_view' and screenshot_ok(it.get('path', ''), gid, arena):
                continue
            elif it.get('type') == 'mcp_tool_call' and it.get('tool') == 'view_image':
                args = it.get('arguments') or {}
                if not (isinstance(args, dict) and set(args) <= {'path', 'detail'}
                        and screenshot_ok(args.get('path', ''), gid, arena)):
                    odd.append(('image', str(it)[:160]))
            elif it.get('type') not in ('reasoning',):
                odd.append((it.get('type'), str(it)[:160]))
    injections = raw.count('claude-mem-retrieved-data')
    if gid.startswith(('case-', 'inv-')) and injections:
        odd.append(('MEMORY', f'{injections} memory injection markers'))
    if not events:
        odd.append(('TRANSCRIPT', 'No JSON events'))
    return {'ok': not odd, 'tools': dict(tools), 'memory_injections': injections, 'odd': odd, 'final': final}


def audit(gid, arena=ARENA):
    if not re.fullmatch(r'[A-Za-z0-9_-]+', gid):
        raise ValueError('Unsafe game id')
    base = pathlib.Path(arena) / 'games' / gid
    res = json.loads((base / 'result.json').read_text(encoding='utf-8'))
    print(gid, {k: res[k] for k in ('done', 'clicks', 'total_clicks', 'commands_used', 'seconds', 'teacher', 'asks') if k in res})
    try:
        report = audit_events((base / 'transcript.jsonl').read_text(encoding='utf-8'), gid, arena)
    except (OSError, ValueError, TypeError, KeyError) as exc:
        report = {'ok': False, 'tools': {}, 'memory_injections': 0,
                  'odd': [('TRANSCRIPT', str(exc))], 'final': ''}
    (base / 'audit.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('  tools:', report['tools'], '| memory injections:', report['memory_injections'])
    print('  ODD:', report['odd'] if report['odd'] else 'none')
    print('  FINAL:', report['final'][:200].replace('\n', ' '))
    return report['ok']


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('games', nargs='+')
    ap.add_argument('--arena-dir', type=pathlib.Path, default=pathlib.Path(ARENA))
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    if args.dry_run:
        for gid in args.games:
            print(f'Would audit {gid}: controller-only shell calls and its own screen.png')
        sys.exit(0)
    ok = all([audit(g, args.arena_dir) for g in args.games])
    sys.exit(0 if ok else 1)
