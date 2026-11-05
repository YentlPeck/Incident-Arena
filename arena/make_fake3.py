"""Length-matched fake book for Experiment 3 (DESIGN-exp3.md, decision 5): trims the studio-craft placebo
(same source as every earlier fake) to the general book's length. Usage: python make_fake3.py <general frozen book>"""
import hashlib
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent


def make(target_text):
    target = len(target_text)
    sections, current = [], None
    for line in (HERE / 'placebo.md').read_text(encoding='utf-8').splitlines():
        if line.startswith('#'):
            current = [line, []]
            sections.append(current)
        elif line.strip():
            current[1].append(line)

    def render():
        out = []
        for head, bullets in sections:
            if bullets or head.startswith('# '):
                out.append(head)
                out.extend(bullets)
                out.append('')
        return '\n'.join(out).strip() + '\n'
    # Drop the last bullet of the fullest section until the book is no longer than the general book.
    while len(render()) > target:
        max(sections, key=lambda s: len(s[1]))[1].pop()
    return render()


def main():
    book = pathlib.Path(sys.argv[1])
    text = make(book.read_text(encoding='utf-8'))
    sha = hashlib.sha256(text.encode('utf-8')).hexdigest()
    out = HERE / 'general-books' / f'playbook-frozen-{sha[:8]}.md'
    out.write_bytes(text.encode('utf-8'))
    src = book.read_text(encoding='utf-8')
    print(f'{out.name}: {len(text)} chars, {sum(1 for l in text.splitlines() if l.strip())} lines '
          f'(general book {len(src)} chars, {sum(1 for l in src.splitlines() if l.strip())} lines)')
    return out


if __name__ == '__main__':
    main()
