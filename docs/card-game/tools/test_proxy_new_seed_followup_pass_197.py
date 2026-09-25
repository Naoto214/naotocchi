import copy
import unittest

import proxy_new_seed_followup_pass_197 as subject


class FollowupPass197Test(unittest.TestCase):
    def test_second_postplacement_priority_pass_is_unique(self):
        report=subject.build_report()
        self.assertEqual(1,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            if row['new_events']:
                self.assertEqual(['response-pass'],row['legal_candidate_ids'])
                self.assertTrue(row['candidate_set_complete'])
                self.assertEqual('normal_action',row['final_continuation_state']['game_state']['phase'])
                self.assertEqual('response_unique',row['new_decisions'][0]['resolution_mode'])

    def test_tampered_hash_rejected(self):
        row=copy.deepcopy(next(x for x in subject.build_report()['results'] if x['new_events']))
        row['final_continuation_state_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
