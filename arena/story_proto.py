"""Read-only analysis of the specialised-book follow-up (DESIGN-exp3.md): the frozen case-3 book against the
reused Experiment 3 alone and fake-book games on seeds 6001-6055. Same validity checks and verdict as story3.py."""
import pathlib

import story3

books = sorted((pathlib.Path(__file__).resolve().parent / 'proto-books').glob('playbook-frozen-*.md'))
if len(books) != 1:
    raise SystemExit('Expected exactly one frozen case-3 book in arena/proto-books/')
story3.BOOKS['book'] = books[0]
print('specialised book:', books[0].name)
story3.main()
