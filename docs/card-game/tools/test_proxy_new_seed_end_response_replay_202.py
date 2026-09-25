import copy
import unittest

import proxy_new_seed_end_response_replay_202 as subject


class EndResponseReplay202Test(unittest.TestCase):
    def test_four_turn_end_entries_after_two_unique_passes(self):
        report=subject.build_report()
        self.assertEqual(2,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertEqual('turn_end',row['final_continuation_state']['game_state']['phase'])
            if row['new_events']:
                self.assertEqual('response_pass',row['new_events'][0]['action_type'])
                self.assertEqual('response_unique',row['new_decisions'][0]['resolution_mode'])

    def test_changed_hash_rejected(self):
        row=copy.deepcopy(next(x for x in subject.build_report()['results'] if x['new_events']))
        row['final_continuation_state_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
