import copy
import unittest

import proxy_new_seed_turn_end_replay_185 as subject


class TurnEndReplay185Test(unittest.TestCase):
    def test_four_turn_ends_and_draws(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(8, sum(len(row['new_events']) for row in report['results']))
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            self.assertEqual('egg_exchange_choice',row['final_continuation_state']['game_state']['phase'])

    def test_modified_snapshot_fails(self):
        row = copy.deepcopy(subject.build_report()['results'][0])
        row['new_snapshots'][0]['game_state_sha256'] = '0'*64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
