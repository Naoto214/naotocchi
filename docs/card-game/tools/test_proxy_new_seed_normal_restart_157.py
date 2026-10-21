import unittest

import proxy_new_seed_normal_restart_157 as restart


class NewSeedNormalRestart157Tests(unittest.TestCase):
    def test_four_current_decisions(self):
        report = restart.build_report()
        self.assertEqual((report['planned'], report['new_decisions'], report['new_events'],
                          report['completed'], report['independent_balance_sample_count']),
                         (4, 4, 4, 0, 0))
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(rows['probe-02-a-first']['new_events'][0]['action_type'],
                         'normal_pass_end_request')
        self.assertEqual(rows['probe-01-a-first']['new_events'][0]['action_type'], 'place_companion')
        self.assertEqual(rows['probe-01-b-first']['new_decisions'][0]['resolution_mode'],
                         'seeded_fallback')
        self.assertEqual(rows['probe-02-b-first']['new_decisions'][0]['resolution_mode'],
                         'seeded_fallback')

    def test_saved_canonical_chain(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(restart.validate_result(row), [])


if __name__ == '__main__': unittest.main()
