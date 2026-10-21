import unittest
import proxy_new_seed_response_audit_231 as subject
class ResponseAudit231Test(unittest.TestCase):
    def test_four_unique_responses(self):
        rows=subject.build_report()['results']
        self.assertEqual(4,len(rows))
        self.assertTrue(all(r['candidate_ids']==['response-pass'] and r['candidate_set_complete']
                            and not subject.validate_result(r) for r in rows))
if __name__=='__main__':unittest.main()
