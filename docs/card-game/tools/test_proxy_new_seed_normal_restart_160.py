import unittest

import proxy_new_seed_normal_restart_160 as restart


class NewSeedNormalRestart160Tests(unittest.TestCase):
    def test_three_normal_passes_and_held_end(self):
        report = restart.build_report()
        self.assertEqual((report['planned'], report['new_decisions'], report['new_events'],
                          report['completed'], report['independent_balance_sample_count']),
                         (4, 3, 3, 0, 0))
        for row in report['results']:
            if row['path_id'] == 'probe-02-a-first':
                self.assertEqual(row['new_events'], [])
                self.assertEqual(row['final_continuation_state']['game_state']['phase'], 'turn_end')
            else:
                self.assertEqual(row['new_events'][0]['action_type'], 'normal_pass_end_request')
                self.assertEqual(row['final_continuation_state']['game_state']['phase'],
                                 'turn_end_response')

    def test_canonical_hash_chain(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(restart.validate_result(row), [])


if __name__ == '__main__': unittest.main()
