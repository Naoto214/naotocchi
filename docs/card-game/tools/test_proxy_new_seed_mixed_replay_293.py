import unittest
import proxy_new_seed_mixed_replay_293 as subject


class MixedReplay293Tests(unittest.TestCase):
    def test_two_response_passes_and_two_end_draw_pairs(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(6, report['new_events'])
        self.assertEqual(2, sum(len(x['new_events']) == 1 for x in rows))
        self.assertEqual(2, sum(len(x['new_events']) == 2 for x in rows))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
