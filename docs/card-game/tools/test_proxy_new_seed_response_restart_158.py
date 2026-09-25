import unittest

import proxy_new_seed_response_restart_158 as restart


class NewSeedResponseRestart158Tests(unittest.TestCase):
    def test_four_response_windows(self):
        report = restart.build_report()
        self.assertEqual((report['planned'], report['new_events'], report['completed'],
                          report['independent_balance_sample_count']), (4, 7, 0, 0))
        rows = {x['path_id']: x for x in report['results']}
        for path in ('probe-01-a-first','probe-01-b-first','probe-02-b-first'):
            self.assertEqual([e['action_type'] for e in rows[path]['new_events']],
                             ['response_pass','response_pass'])
            self.assertEqual(rows[path]['final_continuation_state']['game_state']['phase'], 'normal_action')
        self.assertEqual(rows['probe-02-a-first']['final_continuation_state']['game_state']['phase'],
                         'turn_end')

    def test_saved_canonical_chain(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(restart.validate_result(row), [])


if __name__ == '__main__': unittest.main()
