import copy
import unittest

import proxy_new_seed_turn_end_restart_164 as subject


class TurnEndRestart164Test(unittest.TestCase):
    def test_all_four_turns_end_and_draw(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        self.assertEqual(8,report['new_events'])
        self.assertEqual(0,report['independent_balance_sample_count'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertEqual(['turn_end_completed','turn_start_and_egg_draw'],
                             [e['action_type'] for e in row['new_events']])
            self.assertEqual('egg_exchange_choice',row['final_continuation_state']['game_state']['phase'])
        first=next(x for x in report['results'] if x['path_id']=='probe-01-a-first')
        game=first['final_continuation_state']['game_state']
        self.assertEqual('C-chicken',game['cards'][game['players']['A']['board']['companions'][0]]['card_id'])

    def test_tampered_event_fails(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['new_events'][0]['game_state_before_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
