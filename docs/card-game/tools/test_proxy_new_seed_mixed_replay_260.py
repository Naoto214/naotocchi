import hashlib
import unittest

import proxy_new_seed_mixed_replay_260 as subject


class MixedReplay260Tests(unittest.TestCase):
    def test_three_unique_passes_and_held_turn_end(self):
        report = subject.build_report()
        self.assertEqual(3, report['new_events'])
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            if row['path_id'] == 'probe-02-b-first':
                self.assertEqual([], row['new_events'])
                self.assertEqual('turn_end', row['final_continuation_state']['game_state']['phase'])
            else:
                self.assertEqual(1, len(row['new_events']))
                self.assertEqual('normal_action', row['final_continuation_state']['game_state']['phase'])
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
