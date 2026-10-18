import unittest
import proxy_new_seed_mixed_replay_296 as subject


class MixedReplay296Tests(unittest.TestCase):
    def test_two_end_draw_pairs_and_two_seeded_eggs(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(6, report['new_events'])
        self.assertEqual(2, sum(len(x['new_events']) == 2 for x in rows))
        self.assertEqual(2, sum(x['new_events'][0]['action_type'] == 'egg_exchange_bottom' for x in rows))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
