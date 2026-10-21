import unittest
import proxy_new_seed_followup_replay_241 as subject


class FollowupReplay241Test(unittest.TestCase):
    def test_four_unique_passes_from_saved_state(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(4, len(rows))
        self.assertEqual(4, sum(len(row['new_events']) for row in rows))
        self.assertEqual(3, sum(row['final_continuation_state']['game_state']['phase'] == 'normal_action' for row in rows))
        self.assertEqual(1, sum(row['final_continuation_state']['game_state']['phase'] == 'response_window' for row in rows))
        self.assertTrue(all(not subject.validate_result(row) for row in rows))


if __name__ == '__main__':
    unittest.main()
