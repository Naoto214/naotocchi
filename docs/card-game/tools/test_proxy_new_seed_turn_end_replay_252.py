import hashlib
import unittest

import proxy_new_seed_turn_end_replay_252 as subject


class TurnEndReplay252Tests(unittest.TestCase):
    def test_three_transitions_and_held_normal_action(self):
        report = subject.build_report()
        self.assertEqual(6, report['new_events'])
        self.assertEqual(6, report['new_snapshots'])
        self.assertEqual(4, len(report['results']))
        for result in report['results']:
            self.assertEqual([], subject.validate_result(result))
            if result['path_id'] == 'probe-02-b-first':
                self.assertEqual([], result['new_events'])
                self.assertEqual('normal_action', result['final_continuation_state']['game_state']['phase'])
                self.assertEqual(result['source_game_state_sha256'], result['final_game_state_sha256'])
            else:
                self.assertEqual(2, len(result['new_events']))
                self.assertEqual('egg_exchange_choice', result['final_continuation_state']['game_state']['phase'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())


if __name__ == '__main__':
    unittest.main()
