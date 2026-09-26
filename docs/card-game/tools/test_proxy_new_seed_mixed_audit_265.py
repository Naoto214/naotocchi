import hashlib
import unittest

import proxy_new_seed_mixed_audit_265 as subject


class MixedAudit265Tests(unittest.TestCase):
    def test_four_current_response_opportunities(self):
        report = subject.build_report()
        self.assertEqual(4, len(report['results']))
        for row in report['results']:
            expected = (['response-pass', 'response-use-item-A-033#1'] if row['path_id'] == 'probe-02-b-first'
                        else ['response-pass'])
            self.assertEqual(expected, row['candidate_ids'])
            self.assertTrue(row['candidate_set_complete'])
            self.assertEqual([], subject.validate_result(row))
        self.assertEqual(subject.SOURCE_RAW_SHA256,
                         hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
