import unittest
import proxy_new_seed_followup_choice_247 as subject


class FollowupChoice247Test(unittest.TestCase):
    def test_three_unique_responses_and_one_normal_pass(self):
        rows = subject.build_report()['results']
        self.assertEqual(3, sum(row['selected_candidate'] == 'response-pass' for row in rows))
        self.assertEqual('pass', next(row['selected_candidate'] for row in rows
                                      if row['path_id'] == 'probe-01-b-first'))
        self.assertTrue(all(not subject.validate_result(row) for row in rows))


if __name__ == '__main__':
    unittest.main()
