import unittest
import proxy_new_seed_followup_choice_244 as subject


class FollowupChoice244Test(unittest.TestCase):
    def test_priority_selects_four_opportunities(self):
        rows = {row['path_id']: row for row in subject.build_report()['results']}
        self.assertEqual('pass', rows['probe-01-a-first']['selected_candidate'])
        self.assertEqual('response-pass', rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual('pass', rows['probe-02-a-first']['selected_candidate'])
        self.assertEqual('candidate-place-companion-B-013#1',
                         rows['probe-02-b-first']['selected_candidate'])
        self.assertTrue(all(not subject.validate_result(row) for row in rows.values()))


if __name__ == '__main__':
    unittest.main()
