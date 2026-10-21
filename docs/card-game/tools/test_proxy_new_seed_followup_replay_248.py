import unittest
import proxy_new_seed_followup_replay_248 as subject


class FollowupReplay248Test(unittest.TestCase):
    def test_four_selected_passes_replay(self):
        rows = subject.build_report()['results']
        self.assertEqual(4, sum(len(row['new_events']) for row in rows))
        self.assertEqual(2, sum(row['final_continuation_state']['game_state']['phase'] == 'turn_end'
                                for row in rows))
        self.assertEqual(1, sum(row['final_continuation_state']['game_state']['phase'] == 'turn_end_response'
                                for row in rows))
        self.assertTrue(all(not subject.validate_result(row) for row in rows))


if __name__ == '__main__':
    unittest.main()
