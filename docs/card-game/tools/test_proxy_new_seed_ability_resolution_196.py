import copy
import unittest

import proxy_new_seed_ability_resolution_196 as subject


class AbilityResolution196Test(unittest.TestCase):
    def test_board_ability_reveals_noncompanion_without_moving_deck(self):
        report=subject.build_report()
        self.assertEqual(1,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            if row['new_events']:
                event=row['new_events'][0]
                self.assertEqual('resolve_board_ability',event['action_type'])
                self.assertEqual('partner',event['result']['revealed_card_type'])
                self.assertIsNone(event['result']['drawn_instance_id'])
                original=next(x for x in subject.load_source()['results'] if x['path_id']==row['path_id'])
                before=original['final_continuation_state']['game_state']['players']['A']
                after=row['final_continuation_state']['game_state']['players']['A']
                self.assertEqual(before['deck'],after['deck'])
                self.assertEqual(before['hand'],after['hand'])
                self.assertEqual(before['board'],after['board'])
                self.assertEqual([],row['final_continuation_state']['activation_zone'])
                self.assertEqual('normal_action',row['final_continuation_state']['game_state']['phase'])

    def test_mutated_result_rejected(self):
        row=copy.deepcopy(next(x for x in subject.build_report()['results'] if x['new_events']))
        row['final_game_state_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__': unittest.main()
