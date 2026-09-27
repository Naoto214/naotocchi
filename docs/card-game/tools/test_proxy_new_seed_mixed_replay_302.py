import unittest
import proxy_new_seed_mixed_replay_302 as subject


class MixedReplay302Tests(unittest.TestCase):
    def test_board_activation_and_three_passes(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(4, report['new_events'])
        self.assertEqual('activate_response', rows['probe-01-a-first']['new_events'][0]['action_type'])
        self.assertEqual(3, sum(x['new_events'][0]['action_type'] == 'response_pass' for x in rows.values()))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
