import copy
import unittest
import proxy_new_seed_mixed_choice_223 as subject

class MixedChoice223Test(unittest.TestCase):
    def test_all_saved_choices_and_priority(self):
        report=subject.build_report();rows={r['path_id']:r for r in report['results']}
        self.assertEqual('response-pass',rows['probe-01-a-first']['selected_candidate'])
        self.assertEqual('response-activate-ability-A-015#1',rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual('pass',rows['probe-02-a-first']['selected_candidate'])
        self.assertEqual('time_after_certain_resolution',rows['probe-02-a-first']['comparison']['decided_at'])
        self.assertEqual('response-pass',rows['probe-02-b-first']['selected_candidate'])
        self.assertTrue(all(not subject.validate_result(r) for r in report['results']))

    def test_mutated_choice_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['selected_candidate']='invalid'
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
