import copy
import unittest

import proxy_new_seed_next_response_restart_170 as subject


class NextResponseRestart170Test(unittest.TestCase):
    def test_three_closed_windows_and_one_item_chain(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        self.assertEqual(4,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            if row['path_id']=='probe-02-a-first':
                self.assertEqual('activate_response',row['new_events'][0]['action_type'])
                self.assertEqual('building',row['final_continuation_state']['response_context']['chain_status'])
            else:
                self.assertEqual('normal_action',row['final_continuation_state']['game_state']['phase'])

    def test_tampered_hash_fails(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['new_events'][0]['continuation_state_after_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
