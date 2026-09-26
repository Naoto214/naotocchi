import hashlib
import unittest

import proxy_new_seed_mixed_audit_253 as subject


class MixedAudit253Tests(unittest.TestCase):
    def test_egg_choices_and_normal_action(self):
        report = subject.build_report()
        self.assertEqual(4, len(report['results']))
        self.assertEqual(3, sum(row['next_opportunity'] == 'mandatory_egg_exchange'
                                for row in report['results']))
        for row in report['results']:
            self.assertTrue(row['candidate_set_complete'])
            self.assertEqual([], subject.validate_result(row))
            if row['path_id'] == 'probe-02-b-first':
                self.assertEqual(['candidate-play-main-B-001#1-birth', 'pass'], row['candidate_ids'])
                self.assertEqual('normal_action', row['next_opportunity'])
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
