import unittest

import proxy_new_seed_start_response_153 as restart


class NewSeedStartResponse153Tests(unittest.TestCase):
    def test_three_start_response_routes(self):
        report = restart.build_report()
        self.assertEqual((report['planned'], report['new_events'], report['completed'],
                          report['independent_balance_sample_count']), (3, 6, 0, 0))
        rows = {x['path_id']: x for x in report['results']}
        for path in ('probe-01-a-first','probe-01-b-first'):
            self.assertEqual([e['action_type'] for e in rows[path]['new_events']],
                             ['response_pass','response_pass'])
        self.assertEqual([e['action_type'] for e in rows['probe-02-b-first']['new_events']],
                         ['activate_response','response_pass'])
        self.assertEqual(rows['probe-02-b-first']['stop_reason_code'],
                         'unproved_selected_item_chain_activation')
        self.assertEqual(rows['probe-02-b-first']['new_decisions'][-1]['selected_action']['card_id'],
                         'I-c_coin2')
        for row in (rows['probe-01-a-first'], rows['probe-01-b-first']):
            self.assertEqual(row['final_continuation_state']['game_state']['phase'], 'normal_action')

    def test_saved_canonical_chain(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(restart.validate_result(row), [])


if __name__ == '__main__': unittest.main()
