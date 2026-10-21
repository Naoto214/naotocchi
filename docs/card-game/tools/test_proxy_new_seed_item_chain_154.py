import unittest

import proxy_new_seed_item_chain_154 as restart


class NewSeedItemChain154Tests(unittest.TestCase):
    def test_selected_item_activation(self):
        report = restart.build_report()
        self.assertEqual((report['planned'], report['new_decisions'], report['new_events'],
                          report['completed'], report['independent_balance_sample_count']),
                         (3, 0, 1, 0, 0))
        rows = {x['path_id']: x for x in report['results']}
        for path in ('probe-01-a-first','probe-01-b-first'):
            self.assertEqual(rows[path]['new_events'], [])
        row = rows['probe-02-b-first']
        self.assertEqual(row['new_events'][0]['action_type'], 'activate_response')
        self.assertEqual(len(row['final_continuation_state']['activation_zone']), 2)
        self.assertEqual(row['final_continuation_state']['response_context']['consecutive_passes'], 0)

    def test_canonical_chain(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(restart.validate_result(row), [])


if __name__ == '__main__': unittest.main()
