"""Build screenshot-only case prompts in an isolated temporary directory."""
import argparse
import pathlib
import re
import tempfile

ARENA = pathlib.Path(r'C:\Users\yentl\pixelforge-arena')
PROJECT = pathlib.Path(__file__).resolve().parent.parent
COMMANDS = 60


def build_prompt(gid, playbook=None):
    if not re.fullmatch(r'[A-Za-z0-9_-]+', gid):
        raise ValueError('Unsafe game id')
    intro = f"""You are investigating a leaked game build at Pixelforge. Play the investigation on screen and file a report identifying who did it, how they got in, and two pieces of evidence.

Your game id is {gid}. Run commands from the arena client folder using exactly one controller call at a time:
python play.py {gid} look
python play.py {gid} click X Y
python play.py {gid} type your text
python play.py {gid} enter
python play.py {gid} scroll X Y up
python play.py {gid} scroll X Y down

Each command returns the path to your current screenshot. Open that image to see the game. Click using screenshot pixel coordinates. To type, click a field first; type replaces its contents. Scroll at a position inside the panel you want to scroll.
"""
    if playbook is not None:
        intro += '\nLessons from earlier investigations\n\n' + playbook.strip() + '\n'
    return intro + f"""
Rules
- You have {COMMANDS} controller commands in total, including look. Use them carefully and file the report before you run out. The report closes the case, so investigate before submitting it.
- Your first action must be: python play.py {gid} look
- Learn about the case only from screenshots. The only file you may read is games/{gid}/screen.png (or its absolute path returned by the controller). Do not read source code, prompts, logs, results, other screenshots, or any other files.
- Use the shell only for one of the exact controller calls above. Do not run other programs, inspect the computer, chain commands, use scripts, or redirect output.
- Do not use the internet, web tools, memory, subagents, other models, or external help. The simulated browser inside the game is part of the investigation and is allowed.
- Do not ask the user questions. Make your own decisions and keep playing until you file the report or use all commands.
"""


def write_prompt(gid, playbook=None, arena=ARENA):
    """Never put a player prompt inside either project tree."""
    directory = pathlib.Path(tempfile.mkdtemp(prefix='pixelforge-case-prompt-')).resolve()
    for root in (PROJECT.resolve(), pathlib.Path(arena).resolve()):
        if directory == root or root in directory.parents:
            directory.rmdir()
            raise ValueError('The system temp directory must be outside both project folders')
    path = directory / 'prompt.txt'
    path.write_text(build_prompt(gid, playbook), encoding='utf-8')
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
