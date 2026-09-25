import copy
import unittest
import proxy_new_seed_turn_end_proof_219 as subject

class TurnEndProof219Test(unittest.TestCase):
    def test_two_turn_ends_have_six_stage_history(self):
        report=subject.build_report()
        proved=[r for r in report['results'] if r['turn_end_set_complete']]
        self.assertEqual(2,len(proved))
        self.assertTrue(all(all(r['completeness_checks'].values()) for r in proved))
        self.assertTrue(all(not subject.validate_result(r) for r in report['results']))

    def test_changed_end_hash_rejected(self):
        row=next(copy.deepcopy(r) for r in subject.build_report()['results'] if r['turn_end_set_complete'])
        row['source_game_state_sha256']='bad'
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
