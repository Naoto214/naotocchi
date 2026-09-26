import hashlib
import unittest

import proxy_new_seed_mixed_choice_254 as subject


class MixedChoice254Tests(unittest.TestCase):
    def test_three_seeded_eggs_and_one_normal_pass(self):
        report = subject.build_report()
        self.assertEqual(4, len(report['results']))
        self.assertEqual(3, sum(row['resolution_mode'] == 'seeded_fallback'
                                for row in report['results']))
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            self.assertIn(row['selected_candidate'], row['candidate_ids'])
            if row['path_id'] == 'probe-02-b-first':
                self.assertEqual('pass', row['selected_candidate'])
                self.assertEqual('time_after_certain_resolution', row['comparison']['decided_at'])
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
