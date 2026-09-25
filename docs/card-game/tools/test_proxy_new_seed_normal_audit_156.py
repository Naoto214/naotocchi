import unittest

import proxy_new_seed_normal_audit_156 as audit


class NewSeedNormalAudit156Tests(unittest.TestCase):
    def test_four_current_normal_opportunities(self):
        report = audit.build_report()
        self.assertEqual((report['planned'], report['new_events'], report['completed'],
                          report['independent_balance_sample_count']), (4, 0, 0, 0))
        rows = {x['path_id']: x for x in report['results']}
        for row in rows.values():
            self.assertTrue(row['candidate_set_complete'])
            self.assertIn('pass', row['candidate_ids'])
        self.assertEqual([x['card_id'] for x in rows['probe-02-a-first']['board_response_exclusions']],
                         ['P-anglerfish'])

    def test_saved_canonical_bytes(self):
        report = audit.build_report()
        self.assertEqual(audit.OUTPUT.read_bytes(), audit.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(audit.validate_result(row), [])


if __name__ == '__main__': unittest.main()
