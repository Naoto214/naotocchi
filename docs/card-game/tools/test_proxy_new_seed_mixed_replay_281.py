import unittest
import proxy_new_seed_mixed_replay_281 as subject


class MixedReplay281Tests(unittest.TestCase):
    def test_four_events_chain_to_saved_hashes(self):
        report = subject.build_report()
        self.assertEqual(4, len(report['results']))
        self.assertEqual(4, report['new_events'])
        self.assertEqual(['place_companion', 'egg_exchange_bottom', 'response_pass', 'response_pass'],
                         [row['new_events'][0]['action_type'] for row in report['results']])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
