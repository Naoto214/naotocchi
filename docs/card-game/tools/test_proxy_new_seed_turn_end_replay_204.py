import copy
import unittest

import proxy_new_seed_turn_end_replay_204 as subject


class TurnEndReplay204Test(unittest.TestCase):
    def test_four_next_turns_draw_two_and_keep_board(self):
        report=subject.build_report()
        self.assertEqual(8,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertEqual('egg_exchange_choice',row['final_continuation_state']['game_state']['phase'])
            self.assertEqual(2,len(row['drawn_instance_ids']))
            self.assertEqual(['turn_end_completed','turn_start_and_egg_draw'],
                             [x['action_type'] for x in row['new_events']])
        self.assertEqual(1,sum(any(x['card_id']=='P-cat_ceo' and
                                   x['trigger_kind']=='event_trigger_not_turn_start'
                                   for x in row['next_actor_board_inventory']) for row in report['results']))

    def test_corrupted_draw_hash_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['final_game_state_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
