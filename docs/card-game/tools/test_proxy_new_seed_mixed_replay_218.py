import copy
import unittest
import proxy_new_seed_mixed_replay_218 as subject

class MixedReplay218Test(unittest.TestCase):
    def test_two_events_and_two_held_end_states(self):
        report=subject.build_report()
        self.assertEqual(2,report['new_events'])
        self.assertEqual(2,report['new_snapshots'])
        self.assertEqual({'place_partner','response_pass'},
                         {r['new_events'][0]['action_type'] for r in report['results'] if r['new_events']})
        self.assertTrue(all(not subject.validate_result(r) for r in report['results']))

    def test_hash_mutation_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['final_game_state_sha256']='bad'
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
