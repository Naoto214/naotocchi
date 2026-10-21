import unittest
import proxy_new_seed_current_audit_226 as subject
class CurrentAudit226Test(unittest.TestCase):
    def test_four_reached_boundaries(self):
        rows={r['path_id']:r for r in subject.build_report()['results']}
        self.assertEqual(['response-pass'],rows['probe-01-a-first']['candidate_ids'])
        self.assertEqual(['response-activate-ability-A-015#1'],rows['probe-01-b-first']['candidate_ids'])
        self.assertEqual(['response-pass'],rows['probe-02-a-first']['candidate_ids'])
        self.assertEqual(['response-pass'],rows['probe-02-b-first']['candidate_ids'])
        self.assertTrue(all(not subject.validate_result(r) for r in rows.values()))
if __name__=='__main__':unittest.main()
