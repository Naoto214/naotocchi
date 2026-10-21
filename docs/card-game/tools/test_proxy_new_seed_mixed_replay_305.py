import unittest

import proxy_new_seed_mixed_replay_305 as subject


class MixedReplay305Tests(unittest.TestCase):
    def test_four_event_snapshot_hash_chains(self):
        report = subject.build_report()
        self.assertEqual(4, report['new_events'])
        self.assertEqual(4, report['new_snapshots'])
        self.assertEqual(4, report['new_decisions'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
