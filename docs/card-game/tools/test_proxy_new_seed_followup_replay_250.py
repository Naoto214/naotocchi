import unittest
import proxy_new_seed_followup_replay_250 as subject


class FollowupReplay250Test(unittest.TestCase):
    def test_two_response_passes_and_two_held_turn_ends(self):
        rows = subject.build_report()['results']
        self.assertEqual(2, sum(len(row['new_events']) for row in rows))
        self.assertEqual(3, sum(row['final_continuation_state']['game_state']['phase'] == 'turn_end'
                                for row in rows))
        self.assertTrue(all(not subject.validate_result(row) for row in rows))


if __name__ == '__main__':
    unittest.main()
