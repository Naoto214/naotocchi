import hashlib
import unittest

import proxy_new_seed_mixed_replay_255 as subject


class MixedReplay255Tests(unittest.TestCase):
    def test_four_decisions_replay_from_saved_state(self):
        report = subject.build_report()
        self.assertEqual(4, report['new_events'])
        self.assertEqual(4, len(report['results']))
        for row in report['results']:
            self.assertEqual(1, len(row['new_decisions']))
            self.assertEqual(1, len(row['new_events']))
            self.assertEqual([], subject.validate_result(row))
            if row['path_id'] == 'probe-02-b-first':
                self.assertEqual('turn_end_response', row['final_continuation_state']['game_state']['phase'])
            else:
                self.assertEqual('response_window', row['final_continuation_state']['game_state']['phase'])
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
