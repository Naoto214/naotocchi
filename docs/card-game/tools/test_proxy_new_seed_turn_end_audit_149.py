import unittest

import proxy_new_seed_turn_end_audit_149 as audit


class NewSeedTurnEndAudit149Tests(unittest.TestCase):
    def test_three_turn_end_inventories(self):
        report = audit.build_report()
        self.assertEqual((report['planned'], report['new_events'], report['completed'],
                          report['independent_balance_sample_count']), (3, 0, 0, 0))
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(rows['probe-01-a-first']['excluded_board_cards'], ['C-chicken'])
        self.assertEqual(rows['probe-01-b-first']['excluded_board_cards'], ['C-bat'])
        self.assertEqual(rows['probe-02-b-first']['excluded_board_cards'], [])
        for row in rows.values():
            self.assertIn('unresolved_expiration', row['contract_stop_codes'])
            self.assertIn('missing_growth_reach_history', row['contract_stop_codes'])

    def test_saved_canonical_bytes(self):
        report = audit.build_report()
        self.assertEqual(audit.OUTPUT.read_bytes(), audit.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(audit.validate_result(row), [])


if __name__ == '__main__': unittest.main()
