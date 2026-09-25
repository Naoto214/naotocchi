import copy
import unittest

import proxy_new_seed_start_choice_207 as subject


class StartChoice207Test(unittest.TestCase):
    def test_one_seeded_ability_and_three_unique_passes(self):
        report=subject.build_report()
        self.assertEqual(3,report['new_events'])
        self.assertEqual(1,sum(x['stop_reason_code']=='unproved_selected_board_ability_activation'
                               for x in report['results']))
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            if row['new_events']:
                self.assertEqual('response_unique',row['new_decisions'][0]['resolution_mode'])
                self.assertEqual('response_pass',row['new_events'][0]['action_type'])

    def test_changed_decision_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['new_decisions'][0]['selected_candidate']='response-pass'
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
