import unittest
import proxy_new_seed_mixed_replay_290 as subject


class MixedReplay290Tests(unittest.TestCase):
    def test_two_normal_passes_and_two_end_response_passes(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(2, sum(x['new_events'][0]['action_type'] == 'normal_pass_end_request' for x in rows.values()))
        self.assertEqual(2, sum(x['new_events'][0]['action_type'] == 'response_pass' for x in rows.values()))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
