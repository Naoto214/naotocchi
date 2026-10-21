import copy
import unittest
import proxy_new_seed_mixed_audit_216 as subject

class MixedAudit216Test(unittest.TestCase):
    def test_normal_response_and_two_history_entries(self):
        report=subject.build_report()
        kinds={r['path_id']:r['next_opportunity'] for r in report['results']}
        self.assertEqual(1,list(kinds.values()).count('normal_action'))
        self.assertEqual(1,list(kinds.values()).count('response_window'))
        self.assertEqual(2,list(kinds.values()).count('turn_end_provenance'))
        self.assertTrue(all(not subject.validate_result(r) for r in report['results']))

    def test_changed_candidate_is_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['candidate_ids']=['invalid']
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
