import hashlib
import unittest

import proxy_new_seed_mixed_choice_266 as subject


class MixedChoice266Tests(unittest.TestCase):
    def test_three_unique_passes_and_seeded_coin(self):
        report = subject.build_report()
        self.assertEqual(4, len(report['results']))
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            if row['path_id'] == 'probe-02-b-first':
                self.assertEqual('response_seeded_fallback', row['resolution_mode'])
                self.assertEqual('response-use-item-A-033#1', row['selected_candidate'])
            else:
                self.assertEqual('response_unique', row['resolution_mode'])
                self.assertEqual('response-pass', row['selected_candidate'])
        self.assertEqual(subject.SOURCE_RAW_SHA256,
                         hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
