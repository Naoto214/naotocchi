import copy
import unittest

import proxy_new_seed_end_response_replay_183 as subject


class EndResponseReplay183Test(unittest.TestCase):
    def test_two_unique_passes_and_four_turn_ends(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(2, sum(len(row['new_events']) for row in report['results']))
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            self.assertEqual('turn_end', row['final_continuation_state']['game_state']['phase'])

    def test_modified_final_hash_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][0])
        row['final_game_state_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
