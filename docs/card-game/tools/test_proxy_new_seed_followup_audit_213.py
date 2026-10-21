import copy
import unittest
import proxy_new_seed_followup_audit_213 as subject

class FollowupAudit213Test(unittest.TestCase):
    def test_four_reached_response_opportunities_are_complete(self):
        report=subject.build_report()
        self.assertEqual(4,len(report['results']))
        self.assertTrue(all(r['candidate_set_complete'] and r['candidate_ids']==['response-pass']
                            and not subject.validate_result(r) for r in report['results']))

    def test_changed_candidate_is_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['candidate_ids']=['response-invalid']
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
