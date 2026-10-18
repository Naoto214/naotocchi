import unittest
import proxy_new_seed_followup_replay_242 as subject
import proxy_new_seed_followup_replay_241 as previous


class FollowupReplay242Test(unittest.TestCase):
    def test_four_unique_passes_from_saved_state(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(4, len(rows))
        self.assertEqual(4, sum(len(row['new_events']) for row in rows))
        self.assertEqual(3, sum(row['final_continuation_state']['game_state']['phase'] == 'normal_action' for row in rows))
        self.assertEqual(1, sum(row['final_continuation_state']['game_state']['phase'] == 'post_placement_response' for row in rows))
        self.assertTrue(all(not subject.validate_result(row) for row in rows))

    def test_correction_only_changes_partner_response_phase(self):
        original = {row['path_id']: row for row in previous.build_report()['results']}
        corrected = {row['path_id']: row for row in subject.build_report()['results']}
        for path, row in corrected.items():
            if path != 'probe-01-b-first':
                self.assertEqual(original[path], row)
                continue
            self.assertEqual(row['source_continuation_state_sha256'],
                             original[path]['source_continuation_state_sha256'])
            self.assertEqual(row['last_valid_event_seq'], original[path]['last_valid_event_seq'])
            self.assertEqual('post_placement_response', row['final_continuation_state']['game_state']['phase'])
            self.assertEqual('response_window', original[path]['final_continuation_state']['game_state']['phase'])


if __name__ == '__main__':
    unittest.main()
