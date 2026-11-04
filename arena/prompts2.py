"""Invoice prompt: the original screenshot-only rules with a new case intro."""
import argparse
import pathlib
import tempfile

try:
    from . import prompts
except ImportError:
    import prompts

ARENA, PROJECT, COMMANDS = prompts.ARENA, prompts.PROJECT, prompts.COMMANDS
INTRO = ('You are investigating a fraudulent supplier payment at Pixelforge. '
         'Play the investigation on screen and file a report identifying who orchestrated '
         'the payment diversion, how the bank details were changed, and two pieces of evidence.')


def build_prompt(gid, playbook=None):
    original = prompts.build_prompt(gid, playbook)
    return INTRO + '\n' + original.split('\n', 1)[1]


def write_prompt(gid, playbook=None, arena=ARENA):
    content = build_prompt(gid, playbook)
    directory = pathlib.Path(tempfile.mkdtemp(prefix='pixelforge-invoice-prompt-')).resolve()
    for root in (PROJECT.resolve(), pathlib.Path(arena).resolve()):
        if directory == root or root in directory.parents:
            directory.rmdir()
            raise ValueError('The system temp directory must be outside both project folders')
    path = directory / 'prompt.txt'
    path.write_text(content, encoding='utf-8')
    return path


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('game')
    ap.add_argument('--playbook', type=pathlib.Path)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args(argv)
    if a.dry_run:
        print(f'Would write a {COMMANDS}-command screen prompt for {a.game} outside both project folders'
              + (f', with lessons from {a.playbook}' if a.playbook else ''))
        return
    book = a.playbook.read_text(encoding='utf-8') if a.playbook else None
    print(write_prompt(a.game, book))


if __name__ == '__main__':
    main()
