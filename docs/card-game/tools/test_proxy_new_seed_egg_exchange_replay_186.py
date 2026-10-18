import copy
import unittest

import proxy_new_seed_egg_exchange_replay_186 as subject


class EggExchangeReplay186Test(unittest.TestCase):
    def test_four_seeded_choices_preserve_balance_exclusion(self):
        report=subject.build_report()
        self.assertEqual(4,report['new_events'])
        self.assertEqual(0,report['independent_balance_sample_count'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertEqual('response_window',row['final_continuation_state']['game_state']['phase'])
            self.assertEqual('seeded_fallback',row['new_decisions'][0]['resolution_mode'])

    def test_modified_choice_is_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['new_decisions'][0]['selected_candidate']='invalid'
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
