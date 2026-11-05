"""Missing prototype cases (family 3) using the original arena server's CLI and controller."""
import contextlib
import io
import json
import sys

try:
    from . import server
except ImportError:
    import server


class ProtoRoot:
    """Redirect the base server's initial case URL before any page is loaded."""
    def __init__(self, root):
        self.root = root

    def __truediv__(self, name):
        return self.root / ('case3.html' if name == 'case.html' else name)


def progress_text(sc):
    # Family 3 scores nothing before filing, so a discovery count would always read 0.
    return 'Report filed' if sc.get('done') else 'Report not filed yet'


class Game(server.Game):
    def __init__(self, *args, **kwargs):
        root = server.ROOT
        server.ROOT = ProtoRoot(root)
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
            result['family'] = 'proto'
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
            print(output.getvalue().replace('case.html?seed=', 'case3.html?seed='), end='')
        else:
            server.main()
    finally:
        server.Game, server.progress_text = original, original_progress


if __name__ == '__main__':
    main()
