import unittest
import proxy_new_seed_turn_end_proof_233 as subject
class TurnEndProof233Test(unittest.TestCase):
    def test_three_six_stage_turn_ends_and_held_chain(self):
        rows=subject.build_report()['results']
        self.assertEqual(3,sum(r['turn_end_set_complete'] for r in rows))
        self.assertEqual(1,sum(r.get('next_opportunity')=='unproved_current_board_ability_chain_resolution' for r in rows))
        self.assertTrue(all(not subject.validate_result(r) for r in rows))
if __name__=='__main__':unittest.main()
