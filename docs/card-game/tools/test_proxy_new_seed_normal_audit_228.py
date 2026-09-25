import unittest
import proxy_new_seed_normal_audit_228 as subject
class NormalAudit228Test(unittest.TestCase):
    def test_four_opportunities_complete(self):
        rows={r['path_id']:r for r in subject.build_report()['results']}
        self.assertEqual(['response-pass'],rows['probe-01-b-first']['candidate_ids'])
        self.assertEqual([1,2,3,3],sorted(len(r['candidate_ids']) for r in rows.values()))
        self.assertTrue(all(r['candidate_set_complete'] and not subject.validate_result(r)
                            for r in rows.values()))
if __name__=='__main__':unittest.main()
