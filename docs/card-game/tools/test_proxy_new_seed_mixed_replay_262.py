import hashlib
import unittest

import proxy_new_seed_mixed_replay_262 as subject


class MixedReplay262Tests(unittest.TestCase):
    def test_one_proved_turn_end_and_three_held_normals(self):
        report = subject.build_report()
        self.assertEqual(2, report['new_events'])
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            if row['path_id'] == 'probe-02-b-first':
                self.assertEqual('egg_exchange_choice', row['final_continuation_state']['game_state']['phase'])
                self.assertEqual(2, len(row['new_events']))
            else:
                self.assertEqual('normal_action', row['final_continuation_state']['game_state']['phase'])
                self.assertEqual([], row['new_events'])
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
