import copy
import unittest
import proxy_new_seed_followup_replay_214 as subject

class FollowupReplay214Test(unittest.TestCase):
    def test_four_unique_passes_advance_the_saved_states(self):
        report=subject.build_report()
        self.assertEqual(4,report['new_events'])
        self.assertEqual(4,report['new_snapshots'])
        self.assertTrue(all(not subject.validate_result(r) for r in report['results']))
        self.assertEqual(1,sum(r['stop_reason_code']=='unproved_current_board_ability_chain_resolution'
                               for r in report['results']))

    def test_changed_hash_is_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['final_continuation_state_sha256']='bad'
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
