"""Pixelforge arena: runs one game in a headless browser and lets an AI player drive it.

Start one server per game:  python server.py <game-id> [--commands 200]
The AI player then uses play.py (in the arena folder) to send:  look | click N | type N text | enter
With --view screen the player gets no text view, only screenshots, and clicks on pixel positions:
  look | click X Y | type text | enter | scroll X Y up|down
Every real click lands in the game exactly like a human click, so the game's own click counter is the score.
"""
import argparse
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEVEL_PAGES = {1: ROOT / 'index.html', 2: ROOT / 'level2.html', 3: ROOT / 'level3.html', 4: ROOT / 'level4.html'}
ARENA = pathlib.Path(r'C:\Users\yentl\pixelforge-arena')
CHROME = r'C:\Users\yentl\AppData\Local\ms-playwright\chromium-1243\chrome-win64\chrome.exe'

SNAPSHOT_JS = r"""
() => {
  document.querySelectorAll('[data-arena]').forEach(e => { e.removeAttribute('data-arena'); delete e.dataset.arenaPt; });
  let n = 0;
  const INTER = 'button, input, textarea, select, summary, [data-act]';
  const label = (el) => {
    if (el.tagName === 'INPUT') {
      const lab = el.closest('label');
      const name = el.getAttribute('aria-label') || (lab && lab.firstChild && lab.firstChild.nodeType === 3 ? lab.firstChild.textContent.trim() : '') || el.placeholder || 'text';
      const v = el.type === 'password' ? '*'.repeat(el.value.length) : el.value;
      return `${name} field ${v ? `(contains "${v}")` : '(empty)'}`;
    }
    let t = el.getAttribute('aria-label') || el.title || (el.innerText || '').replace(/\s+/g, ' ').trim() || 'button';
    if (el.getAttribute('aria-disabled') === 'true') t += ' (disabled)';
    return t;
  };
  const walk = (node, out, numbered) => {
    if (node.nodeType === 3) { const t = node.textContent.replace(/\s+/g, ' '); if (t.trim()) out.push(t); return; }
    if (node.nodeType !== 1) return;
    const el = node, s = getComputedStyle(el);
    if (el.hidden || s.display === 'none' || s.visibility === 'hidden') return;
    if (el.tagName.toLowerCase() === 'svg') {
      const pic = el.closest('[data-pic]');
      if (pic) out.push(` [picture: ${pic.dataset.pic}] `);
      else if (el.closest('.art')) out.push(' [picture: pixel-art dragon] ');
      return;
    }
    if (numbered && el.matches(INTER)) {
      // something else drawn on top of it (and it is on screen)? then it can't be clicked: show it without a number
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) {
        const hit = document.elementFromPoint(cx, cy);
        if (hit && !el.contains(hit) && !hit.contains(el) && !(el.closest('label') && el.closest('label').contains(hit))) { out.push(` ${label(el)} `); return; }
      }
      n += 1; el.setAttribute('data-arena', n); out.push(` [${n}] ${label(el)} `); return;
    }
    const block = /^(block|flex|grid|table|list-item|table-row|table-row-group)$/.test(s.display);
    if (block) out.push('\n');
    if (s.display === 'table-cell') out.push(' | ');
    for (const c of el.childNodes) walk(c, out, numbered);
    if (block) out.push('\n');
  };
  const parts = [];
  const overlay = document.getElementById('overlay');
  if (!overlay.hidden) {
    const o = []; walk(overlay, o, true);
    parts.push('=== POP-UP (close it before doing anything else) ===\n' + o.join(''));
    return { text: parts.join('\n'), count: n };
  }
  const tb = []; walk(document.getElementById('topbar'), tb, false);
  parts.push('=== TOP BAR ===\n' + tb.join(' '));
  const ic = []; walk(document.getElementById('icons'), ic, true);
  parts.push('=== DESKTOP ICONS ===\n' + ic.join(''));
  const wins = [...document.querySelectorAll('.win')].sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0));
  wins.forEach((w, i) => {
    const title = w.querySelector('.win-title').textContent;
    if (i === 0) {
      const o = []; walk(w.querySelector('.win-bar .win-close'), o, true); walk(w.querySelector('.win-body'), o, true);
      parts.push(`=== WINDOW IN FRONT: ${title} ===\n` + o.join(''));
    } else {
      const bar = w.querySelector('.win-bar'), r = bar.getBoundingClientRect();
      let pt = null;
      for (let x = r.left + 20; x < r.right - 40; x += 20) {
        const hit = document.elementFromPoint(x, r.top + r.height / 2);
        if (hit && w.contains(hit)) { pt = `${x},${r.top + r.height / 2}`; break; }
      }
      if (pt) { n += 1; bar.setAttribute('data-arena', n); bar.dataset.arenaPt = pt; }
      parts.push(`=== WINDOW BEHIND: ${title} === ` + (pt ? `[${n}] bring this window to the front` : '(completely covered: move or close the front window)'));
    }
  });
  const toasts = [...document.querySelectorAll('.toast:not(.out)')].map(t => t.innerText.trim());
  if (toasts.length) parts.push('=== NOTIFICATIONS ===\n' + toasts.join('\n'));
  return { text: parts.join('\n\n'), count: n };
}
"""


def progress_text(sc):
    if 'progress' in sc:
        return f"Discoveries {sc['progress']} of {sc['progressMax']}"
    return f"Task {sc['level']} of {sc.get('tasks', 3)}"


def tidy(text):
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r' *\n *', '\n', text)
    return re.sub(r'\n{2,}', '\n', text).strip()


MAX_FREE_ASKS = 20


class Game:
    def __init__(self, gid, commands, level=1, view='text', with_teacher=False, free_asks=False, seed=None, arena=ARENA):
        if seed is not None and with_teacher:
            raise ValueError('Case games do not support a teacher')
        self.gid, self.left, self.max, self.view = gid, commands, commands, view
        self.seed = seed
        self.level, self.with_teacher, self.asks = level, with_teacher, 0
        self.free_asks = free_asks  # questions to the teacher don't use up commands (capped, see MAX_FREE_ASKS)
        self.size = (1440, 900)
        self.dir = pathlib.Path(arena) / 'games' / gid
        self.dir.mkdir(parents=True, exist_ok=True)
        self.log = (self.dir / 'log.jsonl').open('a', encoding='utf-8')
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch(executable_path=CHROME)
        self.page = self.browser.new_page(viewport={'width': self.size[0], 'height': self.size[1]})
        url = (ROOT / 'case.html').as_uri() + f'?seed={seed}' if seed is not None else LEVEL_PAGES[level].as_uri()
        self.page.goto(url)
        self.page.wait_for_timeout(600)
        self.page.fill('#player', gid)
        self.page.click('[data-act=start]')
        self.page.wait_for_timeout(300)
        self.started = time.time()
        self.over = False

    def score(self):
        return self.page.evaluate('pixelforgeScore()')

    def look(self, note=''):
        snap = self.page.evaluate(SNAPSHOT_JS)
        shot = self.dir / 'screen.png'
        self.page.screenshot(path=str(shot))
        sc = self.score()
        head = f"{progress_text(sc)} | clicks so far: {sum(sc['clicks'])} | commands left: {self.left}\nScreenshot: {shot}"
        if note:
            head = note + '\n' + head
        return head + '\n\n' + tidy(snap['text'])

    def point(self, n):
        return self.page.evaluate("""(n) => {
          const el = document.querySelector(`[data-arena="${n}"]`);
          if (!el) return null;
          if (el.dataset.arenaPt) { const [x, y] = el.dataset.arenaPt.split(',').map(Number); return {x, y}; }
          el.scrollIntoView({block: 'nearest', inline: 'nearest'});
          const r = el.getClientRects()[0] || el.getBoundingClientRect();
          const x = r.left + r.width / 2, y = r.top + r.height / 2;
          const hit = document.elementFromPoint(x, y);
          if (!hit || !(el.contains(hit) || hit.contains(el) || (el.closest('label') && el.closest('label').contains(hit)))) return {covered: true};
          return {x, y};
        }""", n)

    def ask(self, question):
        if not self.with_teacher:
            return 'There is no teacher in this game. Nothing happened.'
        if self.over:
            return 'GAME OVER. No more commands are accepted.'
        if self.left <= 0:
            return self.finish('OUT OF COMMANDS. The game has ended.')
        if self.free_asks and self.asks >= MAX_FREE_ASKS:
            return f'The teacher has answered {MAX_FREE_ASKS} questions already and is not taking more. Nothing happened.\n(commands left: {self.left})'
        if not self.free_asks:
            self.left -= 1
        self.asks += 1
        st = self.page.evaluate('window.pixelforgeTeacherState ? pixelforgeTeacherState() : null') or {}
        import teacher  # legacy level games only; cases never load this module
        reply = teacher.answer(self.level, st, question)
        self.log.write(json.dumps({'t': round(time.time() - self.started, 1), 'op': 'ask', 'args': question, 'reply': reply, 'score': self.score()}) + '\n')
        self.log.flush()
        if self.left <= 0:
            return f'TEACHER: {reply}\n' + self.finish('OUT OF COMMANDS. The game has ended.')
        return f'TEACHER: {reply}\n(commands left: {self.left})'

    def run(self, op, n=None, text='', args=''):
        if op == 'finish':
            return self.finish('PLAYER STOPPED. The final score has been saved.')
        if op == 'ask':
            return self.ask(args)
        if self.view == 'screen':
            return self.run_screen(op, args)
        if self.over:
            return 'GAME OVER. No more commands are accepted.'
        if self.left <= 0:
            return self.finish('OUT OF COMMANDS. The game has ended.')
        if op not in ('look', 'click', 'type', 'enter'):
            return 'Unknown command. Use: look | click N | type N your text | enter'
        self.left -= 1
        note = ''
        if op in ('click', 'type'):
            pt = self.point(n)
            if not pt:
                note = f'There is no element [{n}] on the screen right now. Nothing happened.'
            elif pt.get('covered'):
                note = f'Element [{n}] is covered by something else right now. Nothing happened.'
            else:
                self.page.mouse.click(pt['x'], pt['y'])
                if op == 'type':
                    self.page.keyboard.press('Control+A')
                    self.page.keyboard.type(text)
        elif op == 'enter':
            self.page.keyboard.press('Enter')
        self.page.wait_for_timeout(250)
        self.log.write(json.dumps({'t': round(time.time() - self.started, 1), 'op': op, 'n': n, 'text': text, 'score': self.score()}) + '\n')
        self.log.flush()
        if self.score()['done']:
            return self.finish('CASE CLOSED! You finished the game.' if 'progress' not in self.score() else 'REPORT FILED. The game is over.')
        if self.left <= 0:
            return self.look(note) + '\n\n' + self.finish('OUT OF COMMANDS. The game has ended.')
        return self.look(note)

    def look_screen(self, note=''):
        shot = self.dir / 'screen.png'
        self.page.screenshot(path=str(shot))
        sc = self.score()
        w, h = self.size
        out = (f"{progress_text(sc)} | clicks so far: {sum(sc['clicks'])} | commands left: {self.left}\n"
               f"Screenshot: {shot}\n"
               f"Open the screenshot image to see the screen. It is {w} wide and {h} high: x goes from 0 (left) to {w - 1} (right), "
               f"y from 0 (top) to {h - 1} (bottom).")
        return (note + '\n' + out) if note else out

    def run_screen(self, op, args):
        if self.over:
            return 'GAME OVER. No more commands are accepted.'
        if self.left <= 0:
            return self.finish('OUT OF COMMANDS. The game has ended.')
        usage = 'Use: look | click X Y | type your text | enter | scroll X Y up|down'
        parts = args.split()
        w, h = self.size
        def xy():
            try:
                x, y = int(round(float(parts[0]))), int(round(float(parts[1])))
            except (IndexError, ValueError):
                return None
            return (x, y) if 0 <= x < w and 0 <= y < h else None
        if op not in ('look', 'click', 'type', 'enter', 'scroll'):
            return f'Unknown command. {usage}'
        if op == 'click' and not xy():
            return f'click needs two numbers inside the screen, like: click 640 210. Nothing happened. {usage}'
        if op == 'scroll' and (not xy() or len(parts) < 3 or parts[2] not in ('up', 'down')):
            return f'scroll needs a position and a direction, like: scroll 600 400 down. Nothing happened. {usage}'
        self.left -= 1
        if op == 'click':
            self.page.mouse.click(*xy())
        elif op == 'type':
            self.page.keyboard.press('Control+A')
            self.page.keyboard.type(args)
        elif op == 'enter':
            self.page.keyboard.press('Enter')
        elif op == 'scroll':
            self.page.mouse.move(*xy())
            self.page.mouse.wheel(0, 400 if parts[2] == 'down' else -400)
        self.page.wait_for_timeout(300)
        self.log.write(json.dumps({'t': round(time.time() - self.started, 1), 'op': op, 'args': args, 'score': self.score()}) + '\n')
        self.log.flush()
        if self.score()['done']:
            return self.finish('CASE CLOSED! You finished the game.' if 'progress' not in self.score() else 'REPORT FILED. The game is over.')
        if self.left <= 0:
            return self.look_screen() + '\n\n' + self.finish('OUT OF COMMANDS. The game has ended.')
        return self.look_screen()

    def finish(self, msg):
        if self.over:
            return 'GAME OVER. The final score has already been saved.'
        sc = self.score()
        result = {'game': self.gid, 'level': sc.get('game', 1), 'view': self.view, 'teacher': self.with_teacher, 'free_asks': self.free_asks, 'asks': self.asks, 'done': sc['done'], 'reached_task': sc['level'], 'clicks': sc['clicks'],
                  'total_clicks': sum(sc['clicks']), 'commands_used': self.max - self.left,
                  'progress': sc.get('progress'), 'progress_max': sc.get('progressMax'), 'found': sc.get('found'), 'trapped': sc.get('trapped'),
                  'seconds': round(time.time() - self.started)}
        if self.seed is not None:
            result.update(kind='cases', seed=sc.get('seed', self.seed), layout=sc.get('layout'),
                          twists=sc.get('twists', []), report=sc.get('report'), traps_max=sc.get('trapsMax'))
        pending = self.dir / 'result.json.tmp'
        pending.write_text(json.dumps(result, indent=2), encoding='utf-8')
        pending.replace(self.dir / 'result.json')
        self.over = True
        try:
            self.page.screenshot(path=str(self.dir / 'final.png'))
        except Exception as exc:
            print(f'Final screenshot unavailable: {exc}', file=sys.stderr)
        return f"{msg}\nTotal clicks: {result['total_clicks']}"

    def close(self):
        try:
            self.browser.close()
        finally:
            self.pw.stop()
            self.log.close()


def finalize(gid, arena=ARENA):
    """Ask the live server to save its score, including an unfinished report."""
    directory = pathlib.Path(arena) / 'games' / gid
    if (directory / 'result.json').exists():
        return 'Final result already exists.'
    port = int((directory / 'port.txt').read_text(encoding='utf-8').strip())
    with urllib.request.urlopen(f'http://127.0.0.1:{port}/?op=finish', timeout=90) as response:
        return response.read().decode('utf-8')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('game', nargs='?')
    ap.add_argument('--commands', type=int, help='default: 60 for cases, 200 for levels')
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument('--level', type=int, default=1, choices=sorted(LEVEL_PAGES))
    mode.add_argument('--case', type=int, dest='seed')
    ap.add_argument('--finalize', metavar='ID')
    ap.add_argument('--arena-dir', type=pathlib.Path, default=ARENA)
    ap.add_argument('--port', type=int, default=0)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--view', default='text', choices=['text', 'screen'])
    ap.add_argument('--teacher', action='store_true', help='players may use: ask your question')
    ap.add_argument('--free-asks', action='store_true', help='asking the teacher does not use up a command')
    a = ap.parse_args()
    gid = a.finalize or a.game
    if not gid or not re.fullmatch(r'[A-Za-z0-9_-]+', gid):
        ap.error('a game id containing only letters, digits, underscores and hyphens is required')
    if a.dry_run:
        if a.finalize:
            print(f'Would finalize live game {gid} using its port.txt')
        else:
            page = f'case.html?seed={a.seed}' if a.seed is not None else LEVEL_PAGES[a.level].name
            print(f'Would start {gid} on {page}, view={a.view}, commands={a.commands or (60 if a.seed is not None else 200)}')
        return
    if a.finalize:
        print(finalize(gid, a.arena_dir))
        return
    if a.seed is not None and a.teacher:
        ap.error('--case cannot be combined with --teacher')
    a.commands = a.commands if a.commands is not None else (60 if a.seed is not None else 200)
    if a.commands < 1:
        ap.error('--commands must be positive')
    game = Game(a.game, a.commands, a.level, a.view, a.teacher, a.free_asks, a.seed, a.arena_dir)

    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(self.path).query))
            try:
                n = int(q['n']) if game.view == 'text' and q.get('n') else None
                out = game.run(q.get('op', ''), n, q.get('text', ''), q.get('args', ''))
            except Exception as e:  # keep the game alive on bad input
                out = f'Error: {e}'
            body = out.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    srv = HTTPServer(('127.0.0.1', a.port), H)
    (game.dir / 'port.txt').write_text(str(srv.server_address[1]), encoding='utf-8')
    print(f'game {a.game} ready on port {srv.server_address[1]}', flush=True)
    try:
        while not game.over:
            srv.handle_request()
    finally:
        if not game.over:
            game.finish('SERVER STOPPED. The final score has been saved.')
        srv.server_close()
        game.close()
    print('game over', flush=True)


if __name__ == '__main__':
    main()
