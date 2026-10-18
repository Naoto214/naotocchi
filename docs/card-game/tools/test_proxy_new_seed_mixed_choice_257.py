import hashlib
import unittest

import proxy_new_seed_mixed_choice_257 as subject


class MixedChoice257Tests(unittest.TestCase):
    def test_seeded_pass_and_three_unique_passes(self):
        report = subject.build_report()
        self.assertEqual(4, len(report['results']))
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            if row['path_id'] == 'probe-01-a-first':
                self.assertEqual('response-pass', row['selected_candidate'])
                self.assertEqual('response_seeded_fallback', row['resolution_mode'])
            else:
                self.assertEqual('response-pass', row['selected_candidate'])
                self.assertEqual('response_unique', row['resolution_mode'])
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
