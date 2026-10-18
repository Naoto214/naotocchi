import unittest

import proxy_new_seed_egg_restart_152 as restart


class NewSeedEggRestart152Tests(unittest.TestCase):
    def test_three_egg_exchanges(self):
        report = restart.build_report()
        self.assertEqual((report['planned'], report['new_decisions'], report['new_events'],
                          report['completed'], report['independent_balance_sample_count']),
                         (3, 3, 3, 0, 0))
        for row in report['results']:
            self.assertEqual(row['last_valid_event_seq'], row['source_last_valid_event_seq'] + 1)
            self.assertEqual(row['final_continuation_state']['game_state']['phase'], 'response_window')
            self.assertEqual(row['final_continuation_state']['response_context']['window_kind'], 'turn_start')
            self.assertEqual(row['new_decisions'][0]['resolution_mode'], 'seeded_fallback')

    def test_canonical_replay(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(restart.validate_result(row), [])


if __name__ == '__main__': unittest.main()
