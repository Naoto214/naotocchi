import copy
import unittest
import proxy_new_seed_mixed_choice_217 as subject

class MixedChoice217Test(unittest.TestCase):
    def test_safe_free_person_wins_one_reached_normal_action(self):
        report=subject.build_report()
        selected=[r for r in report['results'] if r['selected_candidate']]
        self.assertEqual(1,len(selected))
        self.assertEqual('candidate-place-partner-A-017#1',selected[0]['selected_candidate'])
        self.assertTrue(all(not subject.validate_result(r) for r in report['results']))

    def test_changed_choice_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['selected_candidate']='pass'
        self.assertTrue(subject.validate_result(row))

if __name__=='__main__':unittest.main()
