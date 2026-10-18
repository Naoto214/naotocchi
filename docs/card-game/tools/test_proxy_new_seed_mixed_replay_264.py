import hashlib
import unittest

import proxy_new_seed_mixed_replay_264 as subject


class MixedReplay264Tests(unittest.TestCase):
    def test_two_passes_companion_placement_and_egg(self):
        report = subject.build_report()
        self.assertEqual(4, report['new_events'])
        expected = {'probe-01-a-first': 'turn_end_response',
                    'probe-01-b-first': 'post_placement_response',
                    'probe-02-a-first': 'turn_end_response',
                    'probe-02-b-first': 'response_window'}
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            self.assertEqual(expected[row['path_id']], row['final_continuation_state']['game_state']['phase'])
            self.assertEqual(1, len(row['new_events']))
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
