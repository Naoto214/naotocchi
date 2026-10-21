import unittest
import proxy_new_seed_mixed_audit_237 as subject
class MixedAudit237Test(unittest.TestCase):
    def test_three_start_responses_one_normal(self):
        rows={r['path_id']:r for r in subject.build_report()['results']}
        self.assertEqual(3,sum(x['next_opportunity']=='response_window' for x in rows.values()))
        self.assertEqual(['response-pass'],rows['probe-02-b-first']['candidate_ids'])
        self.assertEqual(1,sum(x['next_opportunity']=='normal_action' for x in rows.values()))
        self.assertTrue(all(x['candidate_set_complete'] and not subject.validate_result(x)
                            for x in rows.values()))
if __name__=='__main__':unittest.main()
