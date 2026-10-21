import unittest

import proxy_new_seed_mixed_replay_308 as subject


class MixedReplay308Tests(unittest.TestCase):
    def test_four_selected_transitions_and_hashes(self):
        report = subject.build_report()
        self.assertEqual(4, report['new_events'])
        self.assertEqual(4, report['new_snapshots'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
