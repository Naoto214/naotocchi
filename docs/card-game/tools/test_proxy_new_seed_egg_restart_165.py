import copy
import unittest

import proxy_new_seed_egg_restart_165 as subject


class EggRestart165Test(unittest.TestCase):
    def test_four_exchange_records(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        self.assertEqual(4,report['new_decisions'])
        self.assertEqual(4,report['new_events'])
        self.assertEqual(0,report['independent_balance_sample_count'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertEqual('response_window',row['final_continuation_state']['game_state']['phase'])

    def test_bad_event_before_hash(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['new_events'][0]['game_state_before_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
