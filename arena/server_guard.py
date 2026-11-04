"""Guard duty days using the original arena server's CLI and controller."""
import contextlib
import io
import json
import sys

try:
    from . import server
except ImportError:
    import server


class GuardRoot:
    """Redirect the base server's initial case URL before any page is loaded."""
    def __init__(self, root):
        self.root = root

    def __truediv__(self, name):
        return self.root / ('case-guard.html' if name == 'case.html' else name)


def progress_text(sc):
    return f"Decided {sc.get('progress', 0)} of {sc.get('progressMax', 8)} items"


class Game(server.Game):
    def __init__(self, *args, **kwargs):
        root = server.ROOT
        server.ROOT = GuardRoot(root)
        try:
            super().__init__(*args, **kwargs)
        finally:
            server.ROOT = root

    def finish(self, msg):
        already_over = self.over
        reply = super().finish(msg)
        if not already_over and self.seed is not None:
            path = self.dir / 'result.json'
            result = json.loads(path.read_text(encoding='utf-8'))
            result['family'] = 'guard'
            pending = path.with_suffix('.json.tmp')
            pending.write_text(json.dumps(result, indent=2), encoding='utf-8')
            pending.replace(path)
        return reply


def main():
    original, original_progress = server.Game, server.progress_text
    server.Game, server.progress_text = Game, progress_text
    try:
        if '--dry-run' in sys.argv:
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                server.main()
            print(output.getvalue().replace('case.html?seed=', 'case-guard.html?seed='), end='')
        else:
            server.main()
    finally:
        server.Game, server.progress_text = original, original_progress


if __name__ == '__main__':
    main()
