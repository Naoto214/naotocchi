import unittest
import proxy_new_seed_followup_audit_249 as subject


class FollowupAudit249Test(unittest.TestCase):
    def test_four_current_boundaries(self):
        results = subject.build_report()['results']
        self.assertEqual(2, sum(row['next_opportunity'] == 'turn_end_provenance'
                                for row in results))
        self.assertEqual(2, sum(row['candidate_ids'] == ['response-pass']
                                for row in results))
        self.assertTrue(all(not subject.validate_result(row) for row in results))


if __name__ == '__main__':
    unittest.main()
