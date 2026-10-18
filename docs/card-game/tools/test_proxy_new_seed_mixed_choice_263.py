import hashlib
import unittest

import proxy_new_seed_mixed_choice_263 as subject


class MixedChoice263Tests(unittest.TestCase):
    def test_three_normal_choices_and_mandatory_egg(self):
        report = subject.build_report()
        expected = {'probe-01-a-first': 'pass',
                    'probe-01-b-first': 'candidate-place-companion-B-013#1',
                    'probe-02-a-first': 'pass',
                    'probe-02-b-first': 'A-029'}
        self.assertEqual(4, len(report['results']))
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            self.assertEqual(expected[row['path_id']], row['selected_candidate'])
            self.assertIn(row['selected_candidate'], row['candidate_ids'])
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
