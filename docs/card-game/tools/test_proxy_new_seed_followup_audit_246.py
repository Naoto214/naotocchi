import unittest
import proxy_new_seed_followup_audit_246 as subject


class FollowupAudit246Test(unittest.TestCase):
    def test_all_four_current_opportunities_are_complete(self):
        report = subject.build_report()
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual(3, sum(row['candidate_ids'] == ['response-pass']
                                for row in rows.values()))
        self.assertEqual(['candidate-place_world-A-020#1',
                          'candidate-set_item-A-034#1', 'pass'],
                         rows['probe-01-b-first']['candidate_ids'])
        self.assertTrue(all(row['candidate_set_complete'] for row in rows.values()))
        self.assertTrue(all(not subject.validate_result(row) for row in rows.values()))


if __name__ == '__main__':
    unittest.main()
