import unittest

import proxy_new_seed_chain_resolution_155 as restart


class NewSeedChainResolution155Tests(unittest.TestCase):
    def test_two_passes_and_reverse_chain_resolution(self):
        report = restart.build_report()
        self.assertEqual((report['planned'], report['new_events'], report['completed'],
                          report['independent_balance_sample_count']), (3, 4, 0, 0))
        row = next(x for x in report['results'] if x['path_id'] == 'probe-02-b-first')
        self.assertEqual([e['action_type'] for e in row['new_events']],
                         ['response_pass','response_pass','resolve_item','resolve_play'])
        self.assertEqual(row['final_continuation_state']['game_state']['phase'], 'normal_action')
        self.assertEqual(row['new_events'][2]['result']['revealed_card_type'], 'world')
        self.assertEqual(row['new_events'][3]['result']['revealed_card_type'], 'partner')

    def test_saved_canonical_chain(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(restart.validate_result(row), [])


if __name__ == '__main__': unittest.main()
