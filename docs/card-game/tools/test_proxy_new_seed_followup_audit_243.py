import unittest
import proxy_new_seed_followup_audit_243 as subject


class FollowupAudit243Test(unittest.TestCase):
    def test_four_current_opportunities(self):
        rows = subject.build_report()['results']
        self.assertEqual(4, len(rows))
        self.assertEqual(3, sum(row['next_opportunity'] == 'normal_action' for row in rows))
        self.assertEqual(['response-pass'], next(row['candidate_ids'] for row in rows
                                                  if row['path_id'] == 'probe-01-b-first'))
        self.assertTrue(all(row['candidate_set_complete'] for row in rows))
        self.assertTrue(all(not subject.validate_result(row) for row in rows))


if __name__ == '__main__':
    unittest.main()
