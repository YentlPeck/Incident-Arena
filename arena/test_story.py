"""Story aggregation tests using synthetic results only; no recorded games are read."""
import pathlib
import tempfile
import unittest
from unittest.mock import patch

try:
    from . import story
except ImportError:
    import story


def pair(seed, alone, helped):
    return {'seed': seed, 'alone': {'correct': alone}, 'playbook': {'correct': helped}}


def teacher(pairs, frozen=True):
    return {'frozen': frozen, 'test': {name: story.pair_summary(pairs) for name in story.PLAYERS.values()}}


class StoryTests(unittest.TestCase):
    def test_paired_statistics_and_no_discordant_pairs(self):
        summary = story.pair_summary([pair(1, False, True), pair(2, False, True),
                                      pair(3, True, False), pair(4, True, True)])
        self.assertEqual((summary['wins'], summary['losses'], summary['gain']), (2, 1, .25))
        self.assertEqual(summary['p'], .5)
        self.assertEqual(story.pair_summary([])['p'], 1)
        self.assertEqual(story.pair_summary([])['gain'], 0)
        self.assertEqual(story.pair_summary([pair(1, True, True)])['p'], 1)

    def test_comparison_uses_intersection_and_ignores_unfrozen_teacher(self):
        teachers = {'sonnet': teacher([pair(1, True, False), pair(2, False, True)]),
                    'opus': teacher([pair(2, False, False), pair(3, True, True)]),
                    'sol': teacher([], frozen=False)}
        comparison = story.best_teacher(teachers)
        self.assertEqual(comparison['teachers'], ['sonnet', 'opus'])
        for group in comparison['per_ai'].values():
            self.assertEqual(group, {'n': 1, 'seeds': [2],
                                     'solved': {'alone': 0, 'sonnet': 1, 'opus': 0}})
        teachers['sol'] = teacher([])
        self.assertTrue(all(g['n'] == 0 for g in story.best_teacher(teachers)['per_ai'].values()))
        self.assertTrue(all(g['n'] == 0 for g in story.best_teacher({})['per_ai'].values()))

    def test_comparison_intersects_separately_for_each_small_ai(self):
        teachers = {'sonnet': teacher([pair(1, False, True)]),
                    'opus': teacher([pair(1, False, False)])}
        names = list(story.PLAYERS.values())
        teachers['opus']['test'][names[1]] = story.pair_summary([])
        groups = story.best_teacher(teachers)['per_ai']
        self.assertEqual(groups[names[0]]['n'], 1)
        self.assertEqual(groups[names[1]]['n'], 0)

    def test_original_verdict_thresholds_and_completeness(self):
        def results(wins, losses=0):
            pairs = [pair(i, False, True) for i in range(wins)]
            pairs += [pair(i + wins, True, False) for i in range(losses)]
            pairs += [pair(i + wins + losses, False, False)
                      for i in range(len(story.PLANNED) - wins - losses)]
            return {name: story.pair_summary(pairs) for name in story.PLAYERS.values()}
        self.assertEqual(story.verdict(results(9)), 'Yes')
        self.assertEqual(story.verdict(results(8)), 'A little')
        self.assertEqual(story.verdict(results(4)), 'Not yet')
        self.assertEqual(story.verdict(results(9, 9)), 'Not yet')
        incomplete = results(9)
        next(iter(incomplete.values()))['pairs'].pop()
        self.assertEqual(story.verdict(incomplete), 'Too early')
        self.assertEqual(story.verdict({}), 'Too early')

    def test_sol_requires_matching_validated_frozen_text(self):
        with tempfile.TemporaryDirectory(prefix='story-test-') as directory:
            root = pathlib.Path(directory)
            source = root / 'playbook-sol.md'
            text = '- A synthetic general lesson.\n'
            source.write_bytes(text.encode('utf-8'))
            frozen = root / f'playbook-frozen-{story.run_batch.text_sha(text)[:8]}.md'
            config = {'source': source}
            with patch.object(story, 'HERE', root):
                self.assertEqual(story.resolve_playbook(config), (None, text))
                frozen.write_bytes(b'- Wrong content.\n')
                self.assertEqual(story.resolve_playbook(config), (None, text))
                frozen.write_bytes(text.encode('utf-8'))
                self.assertEqual(story.resolve_playbook(config), (frozen, text))
                source.write_bytes(b'- New draft.\n')
                self.assertIsNone(story.resolve_playbook(config)[0])
            self.assertEqual(story.resolve_playbook({'frozen': root / 'missing.md'}), (None, None))

    def test_each_teacher_validates_its_own_condition_and_shares_alone(self):
        with tempfile.TemporaryDirectory(prefix='story-test-') as directory:
            root = pathlib.Path(directory)
            books = [pathlib.Path('playbook-frozen-11111111.md'),
                     pathlib.Path('playbook-frozen-22222222.md')]
            for condition in ['alone'] + [f'playbook:{book.name}' for book in books]:
                game = root / story.run_batch.Job(1001, 'haiku', condition).gid
                game.mkdir()
                (game / 'result.json').write_text('{}', encoding='utf-8')
            conditions = []

            def validate(game, *_):
                conditions.append(game['condition'])
                if game['condition'].endswith(books[1].name):
                    raise story.collect.BadData('synthetic invalid game')
                game.update(correct=True, progress=5, progress_max=5, report={'filed': True})

            cache = {}
            with patch.object(story, 'GAMES', root), patch.object(story, 'PLANNED', [1001]), \
                    patch.object(story.run_batch, 'build_manifest', return_value={}), \
                    patch.object(story.collect, 'case_result', side_effect=validate):
                first, bad1 = story.test_games('haiku', 'synthetic book', books[0], cache)
                second, bad2 = story.test_games('haiku', 'other synthetic book', books[1], cache)
            self.assertEqual((len(first), len(second), bad1, bad2), (1, 0, 0, 1))
            self.assertEqual(conditions, ['alone'] + [f'playbook:{book.name}' for book in books])


if __name__ == '__main__':
    unittest.main()
