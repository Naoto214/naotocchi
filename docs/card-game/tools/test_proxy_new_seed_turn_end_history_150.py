import unittest

import proxy_new_seed_turn_end_history_150 as history


class NewSeedTurnEndHistory150Tests(unittest.TestCase):
    def test_three_history_proofs(self):
        report = history.build_report()
        self.assertEqual((report['planned'], report['completed'], report['new_events'],
                          report['independent_balance_sample_count']), (3, 0, 0, 0))
        expected = {'probe-01-a-first': 9, 'probe-01-b-first': 9, 'probe-02-b-first': 6}
        for row in report['results']:
            self.assertEqual(row['source_last_valid_event_seq'], expected[row['path_id']])
            self.assertEqual(len(row['classified_events']), expected[row['path_id']])
            self.assertEqual(row['growth_reach_100'], [])
            self.assertEqual(row['active_expiring_effects'], [])
            self.assertEqual(row['unresolved_codes'], [])
            self.assertEqual(row['growth_trace'][-1]['growth'], {'A': 20, 'B': 20})

    def test_saved_bytes_and_independent_replay(self):
        report = history.build_report()
        self.assertEqual(history.OUTPUT.read_bytes(), history.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(history.validate_result(row), [])


if __name__ == '__main__': unittest.main()
