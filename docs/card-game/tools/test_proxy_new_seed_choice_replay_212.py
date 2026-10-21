import copy
import unittest
import proxy_new_seed_choice_replay_212 as subject

class ChoiceReplay212Test(unittest.TestCase):
    def test_four_selected_choices_advance_one_event_each(self):
        report=subject.build_report()
        self.assertEqual(4,report['new_events'])
        self.assertEqual(4,report['new_snapshots'])
        self.assertEqual({'response_pass','place_partner','normal_pass_end_request'},
                         {row['new_events'][0]['action_type'] for row in report['results']})
        self.assertTrue(all(not subject.validate_result(row) for row in report['results']))

    def test_hash_mutation_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['final_game_state_sha256']='bad'
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
