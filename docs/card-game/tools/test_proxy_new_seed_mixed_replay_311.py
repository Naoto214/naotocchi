import unittest

import proxy_new_seed_mixed_replay_311 as subject


class MixedReplay311Tests(unittest.TestCase):
    def test_resolution_two_passes_and_end_draw(self):
        report = subject.build_report()
        self.assertEqual(5, report['new_events'])
        self.assertEqual(5, report['new_snapshots'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
