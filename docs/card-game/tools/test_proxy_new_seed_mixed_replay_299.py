import unittest
import proxy_new_seed_mixed_replay_299 as subject


class MixedReplay299Tests(unittest.TestCase):
    def test_two_seeded_eggs_and_two_response_passes(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(4, report['new_events'])
        self.assertEqual(2, sum(x['new_events'][0]['action_type'] == 'egg_exchange_bottom' for x in rows))
        self.assertEqual(2, sum(x['new_events'][0]['action_type'] == 'response_pass' for x in rows))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
