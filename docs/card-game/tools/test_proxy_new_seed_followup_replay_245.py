import unittest
import proxy_new_seed_followup_replay_245 as subject


class FollowupReplay245Test(unittest.TestCase):
    def test_four_selected_actions_replay(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(4, sum(len(row['new_events']) for row in rows))
        self.assertEqual(1, sum(row['new_events'][0]['action_type'] == 'place_companion'
                                for row in rows))
        self.assertTrue(all(not subject.validate_result(row) for row in rows))


if __name__ == '__main__':
    unittest.main()
