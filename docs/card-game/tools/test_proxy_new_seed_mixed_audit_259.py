import hashlib
import unittest

import proxy_new_seed_mixed_audit_259 as subject


class MixedAudit259Tests(unittest.TestCase):
    def test_three_second_priority_windows_and_turn_end(self):
        report = subject.build_report()
        self.assertEqual(4, len(report['results']))
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            if row['path_id'] == 'probe-02-b-first':
                self.assertEqual('turn_end_provenance', row['next_opportunity'])
            else:
                self.assertEqual(['response-pass'], row['candidate_ids'])
                self.assertTrue(row['candidate_set_complete'])
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
