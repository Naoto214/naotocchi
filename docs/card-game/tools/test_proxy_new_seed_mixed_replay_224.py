import copy
import unittest
import proxy_new_seed_mixed_replay_224 as subject

class MixedReplay224Test(unittest.TestCase):
    def test_four_choices_replayed(self):
        rows={r['path_id']:r for r in subject.build_report()['results']}
        self.assertEqual([1,0,1,1],[len(rows[p]['new_events']) for p in
            ('probe-01-a-first','probe-01-b-first','probe-02-a-first','probe-02-b-first')])
        self.assertTrue(all(not subject.validate_result(r) for r in rows.values()))
        self.assertEqual('unproved_selected_board_ability_activation',
                         rows['probe-01-b-first']['stop_reason_code'])

    def test_corrupted_state_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['final_game_state_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
