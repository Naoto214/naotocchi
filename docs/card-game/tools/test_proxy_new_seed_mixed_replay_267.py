import hashlib
import unittest

import proxy_new_seed_mixed_replay_267 as subject


class MixedReplay267Tests(unittest.TestCase):
    def test_selected_responses_link_to_four_new_snapshots(self):
        report = subject.build_report()
        self.assertEqual((4, 4, 4), (report['new_decisions'], report['new_events'], report['new_snapshots']))
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            self.assertEqual(row['source_last_valid_event_seq'] + 1, row['last_valid_event_seq'])
        self.assertEqual(subject.SOURCE_RAW_SHA256,
                         hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
