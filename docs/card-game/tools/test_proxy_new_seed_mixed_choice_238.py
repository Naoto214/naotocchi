import unittest
import proxy_new_seed_mixed_choice_238 as subject
class MixedChoice238Test(unittest.TestCase):
    def test_three_passes_and_one_free_placement(self):
        rows={x['path_id']:x for x in subject.build_report()['results']}
        self.assertEqual(3,sum(x['selected_candidate']=='response-pass' for x in rows.values()))
        self.assertEqual('candidate-place-partner-A-017#1',rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual(2,len(rows['probe-01-b-first']['paid_comparisons']))
        self.assertTrue(all(not subject.validate_result(x) for x in rows.values()))
if __name__=='__main__':unittest.main()
