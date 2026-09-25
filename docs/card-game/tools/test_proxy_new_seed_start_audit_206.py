import copy
import unittest

import proxy_new_seed_start_audit_206 as subject


class StartAudit206Test(unittest.TestCase):
    def test_complete_four_start_opportunities(self):
        report=subject.build_report()
        self.assertEqual(4,len(report['results']))
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertTrue(row['candidate_set_complete'])
        self.assertEqual(['response-activate-ability-A-015#1','response-pass'],
                         report['results'][0]['candidate_ids'])
        self.assertTrue(all(x['candidate_ids']==['response-pass'] for x in report['results'][1:]))
        self.assertTrue(any(x['card_id']=='I-poop1' for x in report['results'][0]['hand_conditional_exclusions']))

    def test_changed_exclusion_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['hand_conditional_exclusions']=[]
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
