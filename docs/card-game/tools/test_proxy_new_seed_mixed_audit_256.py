import hashlib
import unittest

import proxy_new_seed_mixed_audit_256 as subject


class MixedAudit256Tests(unittest.TestCase):
    def test_four_response_windows(self):
        report = subject.build_report()
        self.assertEqual(4, len(report['results']))
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            self.assertTrue(row['candidate_set_complete'])
            if row['path_id'] == 'probe-01-a-first':
                self.assertEqual(['response-activate-ability-A-015#1', 'response-pass'], row['candidate_ids'])
            else:
                self.assertEqual(['response-pass'], row['candidate_ids'])
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
