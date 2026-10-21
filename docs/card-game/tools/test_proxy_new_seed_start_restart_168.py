import copy
import unittest

import proxy_new_seed_start_restart_168 as subject


class StartRestart168Test(unittest.TestCase):
    def test_four_current_choices_and_valid_hash_chains(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        self.assertEqual(0,report['independent_balance_sample_count'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertEqual(1,len(row['new_decisions']))
            self.assertEqual(row['last_valid_event_seq']-row['source_last_valid_event_seq'],
                             len(row['new_events']))

    def test_tampered_choice_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['new_decisions'][0]['selected_candidate']='response-pass-fake'
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
