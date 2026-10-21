import unittest

import proxy_new_seed_response_restart_145 as restart


class NewSeedResponseRestart145Tests(unittest.TestCase):
    def test_three_response_windows_and_held_normal_choice(self):
        report = restart.build_report()
        self.assertEqual(report['planned'], 4)
        self.assertEqual(report['new_decisions'], 5)
        self.assertEqual(report['new_events'], 5)
        self.assertEqual(report['completed'], 0)
        self.assertEqual(report['independent_balance_sample_count'], 0)
        rows = {r['path_id']: r for r in report['results']}
        for path in ('probe-01-a-first', 'probe-01-b-first'):
            row = rows[path]
            self.assertEqual(row['last_valid_event_seq'], 7)
            self.assertEqual(row['final_continuation_state']['game_state']['phase'], 'normal_action')
            self.assertEqual([e['action_type'] for e in row['new_events']], ['response_pass'] * 2)
        row = rows['probe-02-b-first']
        self.assertEqual(row['last_valid_event_seq'], 6)
        self.assertEqual(row['final_continuation_state']['game_state']['phase'], 'turn_end')
        self.assertEqual(row['final_continuation_state']['return_target'], 'turn_end')
        self.assertEqual(rows['probe-02-a-first']['new_events'], [])

    def test_protected_source_and_canonical_hash_chain(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(restart.validate_result(row), [])


if __name__ == '__main__': unittest.main()
