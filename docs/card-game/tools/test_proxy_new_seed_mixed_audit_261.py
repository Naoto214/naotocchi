import hashlib
import unittest

import proxy_new_seed_mixed_audit_261 as subject


class MixedAudit261Tests(unittest.TestCase):
    def test_three_normal_opportunities_and_proved_turn_end(self):
        report = subject.build_report()
        self.assertEqual(4, len(report['results']))
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            if row['path_id'] == 'probe-02-b-first':
                self.assertTrue(row['turn_end_set_complete'])
                self.assertTrue(all(row['completeness_checks'].values()))
            else:
                self.assertTrue(row['candidate_set_complete'])
                self.assertEqual('normal_action', row['next_opportunity'])
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
