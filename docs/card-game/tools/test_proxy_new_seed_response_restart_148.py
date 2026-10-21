import unittest

import proxy_new_seed_response_restart_148 as restart


class NewSeedResponseRestart148Tests(unittest.TestCase):
    def test_current_windows(self):
        report = restart.build_report()
        self.assertEqual((report['planned'], report['new_events'], report['completed'],
                          report['independent_balance_sample_count']), (4, 4, 0, 0))
        rows = {r['path_id']: r for r in report['results']}
        for path in ('probe-01-a-first', 'probe-01-b-first'):
            self.assertEqual(rows[path]['final_continuation_state']['game_state']['phase'], 'turn_end')
            self.assertEqual(rows[path]['last_valid_event_seq'], 9)
        self.assertEqual(rows['probe-02-a-first']['last_valid_event_seq'], 9)
        self.assertEqual(rows['probe-02-a-first']['final_continuation_state']['game_state']['phase'], 'normal_action')
        self.assertEqual(rows['probe-02-b-first']['new_events'], [])

    def test_canonical_chain(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(restart.validate_result(row), [])


if __name__ == '__main__': unittest.main()
