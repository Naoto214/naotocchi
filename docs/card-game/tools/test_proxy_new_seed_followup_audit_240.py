import unittest
import proxy_new_seed_followup_audit_240 as subject
class FollowupAudit240Test(unittest.TestCase):
    def test_four_pass_only_responses(self):
        rows=subject.build_report()['results']
        self.assertEqual(4,len(rows))
        self.assertTrue(all(x['candidate_set_complete'] and x['candidate_ids']==['response-pass']
                            and not subject.validate_result(x) for x in rows))
if __name__=='__main__':unittest.main()
