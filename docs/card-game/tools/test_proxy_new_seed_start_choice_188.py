import copy
import unittest

import proxy_new_seed_start_choice_188 as subject


class StartChoice188Test(unittest.TestCase):
    def test_four_choices_use_complete_response_sets(self):
        report=subject.build_report()
        self.assertEqual(4,report['new_decisions'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertEqual(0,row['balance_sample_count'])
            self.assertIn(row['new_decisions'][0]['selected_candidate'],
                          row['new_decisions'][0]['legal_candidate_ids'])

    def test_modified_decision_is_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['new_decisions'][0]['selected_candidate']='invalid'
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
