import copy
import unittest
import proxy_new_seed_turn_end_replay_220 as subject

class TurnEndReplay220Test(unittest.TestCase):
    def test_two_end_routes_draw_and_two_other_routes_hold(self):
        report=subject.build_report()
        self.assertEqual(4,report['new_events'])
        self.assertEqual(4,report['new_snapshots'])
        self.assertEqual(2,sum(len(r['new_events'])==2 for r in report['results']))
        self.assertTrue(all(not subject.validate_result(r) for r in report['results']))

    def test_tampered_game_hash_rejected(self):
        row=next(copy.deepcopy(r) for r in subject.build_report()['results'] if r['new_events'])
        row['final_game_state_sha256']='bad'
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
