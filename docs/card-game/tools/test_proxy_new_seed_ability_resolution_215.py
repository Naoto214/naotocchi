import copy
import unittest
import proxy_new_seed_ability_resolution_215 as subject

class AbilityResolution215Test(unittest.TestCase):
    def test_one_chain_resolves_and_three_states_remain(self):
        report=subject.build_report()
        self.assertEqual(1,report['new_events'])
        self.assertEqual(1,report['new_snapshots'])
        self.assertEqual(4,len(report['results']))
        self.assertTrue(all(not subject.validate_result(r) for r in report['results']))

    def test_changed_resolution_hash_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['final_game_state_sha256']='bad'
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
