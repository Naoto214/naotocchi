import copy
import unittest

import proxy_new_seed_turn_end_audit_163 as subject


class TurnEndAudit163Test(unittest.TestCase):
    def test_all_four_six_stage_audits_complete(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        self.assertEqual(0,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertTrue(row['turn_end_set_complete'])
            self.assertEqual([],row['contract_stop_codes'])
            self.assertTrue(all(row['completeness_checks'].values()))

    def test_altered_proof_fails_validation(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['turn_end_set_complete']=False
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
