"""Neutral case prompt (library test, 2026-11-05): the same screenshot-only rules as each case family, but the
first line no longer says which kind of crime it is. The player must read the case on screen to find out.
Used only through the run_batch condition 'neutral:<frozen book>'; the manifest records prompt_variant=neutral."""

INTRO = ('You are investigating an incident at Pixelforge. Play the investigation on screen and file a report '
         'identifying who is responsible, how it was done, and two pieces of evidence.')


class Builder:
    """Wraps a family prompt module and swaps only its first line."""

    def __init__(self, module):
        self.module = module
        self.COMMANDS = module.COMMANDS
        self.ARENA = module.ARENA

    def build_prompt(self, gid, playbook=None):
        original = self.module.build_prompt(gid, playbook)
        return INTRO + '\n' + original.split('\n', 1)[1]

    def write_prompt(self, gid, playbook=None, arena=None):
        path = self.module.write_prompt(gid, playbook, arena or self.module.ARENA)
        path.write_text(self.build_prompt(gid, playbook), encoding='utf-8')
        return path
