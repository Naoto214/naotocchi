import copy
import unittest

import proxy_new_seed_followup_opportunity_189 as subject


class FollowupOpportunity189Test(unittest.TestCase):
    def test_three_followup_passes_and_one_ability_activation(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertTrue(row['candidate_set_complete'])
        self.assertEqual(3,sum(row['next_opportunity']=='response_window' for row in report['results']))
        self.assertEqual(1,sum(row['next_opportunity']=='selected_board_ability_activation'
                               for row in report['results']))

    def test_changed_candidate_is_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['candidate_ids'].append('invalid')
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
