import unittest

import proxy_new_seed_turn_end_restart_151 as restart


class NewSeedTurnEndRestart151Tests(unittest.TestCase):
    def test_three_turn_end_and_next_turn_draws(self):
        report = restart.build_report()
        self.assertEqual((report['planned'], report['new_events'], report['completed'],
                          report['independent_balance_sample_count']), (3, 6, 0, 0))
        for row in report['results']:
            self.assertEqual([e['action_type'] for e in row['new_events']],
                             ['turn_end_completed', 'turn_start_and_egg_draw'])
            self.assertEqual(row['final_continuation_state']['game_state']['phase'],
                             'egg_exchange_choice')
            self.assertEqual(row['last_valid_event_seq'], row['source_last_valid_event_seq'] + 2)

    def test_saved_hash_chain(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(restart.validate_result(row), [])


if __name__ == '__main__': unittest.main()
