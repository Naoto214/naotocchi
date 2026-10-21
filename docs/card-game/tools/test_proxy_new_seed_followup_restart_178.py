import copy
import unittest

import proxy_new_seed_followup_restart_178 as subject


class FollowupRestart178Test(unittest.TestCase):
    def test_four_unique_passes_reach_next_phase(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(4, report['new_events'])
        self.assertEqual(4, report['new_decisions'])
        self.assertTrue(all(not subject.validate_result(row) for row in report['results']))
        self.assertEqual(1, sum(row['final_continuation_state']['game_state']['phase'] == 'turn_end'
                                for row in report['results']))
        self.assertEqual(1, sum(row['final_continuation_state']['game_state']['phase'] == 'turn_end_response'
                                for row in report['results']))

    def test_corrupt_event_chain_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][0])
        row['new_events'][0]['continuation_state_after_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
