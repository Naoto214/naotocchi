import copy
import unittest

import proxy_new_seed_chain_normal_audit_210 as subject


class ChainNormal210Test(unittest.TestCase):
    def test_three_normal_and_one_chain_pass_opportunities(self):
        report=subject.build_report()
        self.assertEqual(3,sum(x['next_opportunity']=='normal_action' for x in report['results']))
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertTrue(row['candidate_set_complete'])
        chain=next(x for x in report['results'] if x['next_opportunity']=='response_window')
        self.assertEqual(['response-pass'],chain['candidate_ids'])
        self.assertTrue(any(x['card_id']=='I-poop1' for x in chain['hand_conditional_exclusions']))

    def test_changed_candidate_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['candidate_ids']=[]
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
