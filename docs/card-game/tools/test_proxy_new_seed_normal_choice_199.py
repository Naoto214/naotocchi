import copy
import unittest

import proxy_new_seed_normal_choice_199 as subject


class NormalChoice199Test(unittest.TestCase):
    def test_paid_actions_lose_to_pass_at_current_time(self):
        report=subject.build_report()
        decisions=[x for x in report['results'] if x['selected_candidate']]
        self.assertEqual(2,len(decisions))
        for row in report['results']:self.assertEqual([],subject.validate_result(row))
        self.assertTrue(all(x['selected_candidate']=='pass' and
                            x['comparison']['decided_at']=='time_after_certain_resolution'
                            for x in decisions))

    def test_changed_winner_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['selected_candidate']='candidate-invalid'
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
