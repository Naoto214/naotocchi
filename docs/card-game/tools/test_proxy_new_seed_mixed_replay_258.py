import hashlib
import unittest

import proxy_new_seed_mixed_replay_258 as subject


class MixedReplay258Tests(unittest.TestCase):
    def test_four_passes_and_hash_chains(self):
        report = subject.build_report()
        self.assertEqual(4, report['new_events'])
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            self.assertEqual(1, len(row['new_events']))
            if row['path_id'] == 'probe-02-b-first':
                self.assertEqual('turn_end', row['final_continuation_state']['game_state']['phase'])
            else:
                self.assertEqual('response_window', row['final_continuation_state']['game_state']['phase'])
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
