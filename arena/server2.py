"""Invoice cases using the original arena server's CLI and controller."""
import contextlib
import io
import json
import sys

try:
    from . import server
except ImportError:
    import server


class InvoiceRoot:
    """Redirect the base server's initial case URL before any page is loaded."""
    def __init__(self, root):
        self.root = root

    def __truediv__(self, name):
        return self.root / ('case2.html' if name == 'case.html' else name)


class Game(server.Game):
    def __init__(self, *args, **kwargs):
        root = server.ROOT
        server.ROOT = InvoiceRoot(root)
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
            result['family'] = 'invoice'
            pending = path.with_suffix('.json.tmp')
            pending.write_text(json.dumps(result, indent=2), encoding='utf-8')
            pending.replace(path)
        return reply


def main():
    original = server.Game
    server.Game = Game
    try:
        if '--dry-run' in sys.argv:
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                server.main()
            print(output.getvalue().replace('case.html?seed=', 'case2.html?seed='), end='')
        else:
            server.main()
    finally:
        server.Game = original


if __name__ == '__main__':
    main()
