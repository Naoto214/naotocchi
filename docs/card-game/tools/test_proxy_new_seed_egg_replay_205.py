import copy
import unittest

import proxy_new_seed_egg_replay_205 as subject


class EggReplay205Test(unittest.TestCase):
    def test_four_seeded_choices_have_actual_turn_index(self):
        report=subject.build_report()
        self.assertEqual(4,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            decision=row['new_decisions'][0]
            self.assertEqual('seeded_fallback',decision['resolution_mode'])
            self.assertEqual(row['final_continuation_state']['game_state']['round'],
                             decision['seed_context']['actor_turn_index'])
            self.assertEqual('response_window',row['final_continuation_state']['game_state']['phase'])
            self.assertEqual(0,row['balance_sample_count'])

    def test_tampered_seed_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['new_decisions'][0]['seed_proof']['selected_index']=999
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
