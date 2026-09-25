import copy
import unittest

import proxy_new_seed_normal_pass_200 as subject


class NormalPass200Test(unittest.TestCase):
    def test_two_selected_normal_passes_enter_end_response(self):
        report=subject.build_report()
        self.assertEqual(2,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            if row['new_events']:
                self.assertEqual('normal_pass_end_request',row['new_events'][0]['action_type'])
                self.assertEqual('turn_end_response',row['final_continuation_state']['game_state']['phase'])
                self.assertEqual('pass',row['new_decisions'][0]['selected_candidate'])

    def test_changed_event_hash_rejected(self):
        row=copy.deepcopy(next(x for x in subject.build_report()['results'] if x['new_events']))
        row['new_events'][0]['game_state_after_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
