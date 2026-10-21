import copy
import unittest

import proxy_new_seed_end_response_restart_161 as subject


class EndResponseRestart161Test(unittest.TestCase):
    def test_saved_four_paths_and_hashes(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(3, report['new_decisions'])
        self.assertEqual(3, report['new_events'])
        self.assertEqual(0, report['independent_balance_sample_count'])
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            self.assertEqual('turn_end', row['final_continuation_state']['game_state']['phase'])

    def test_modified_event_is_rejected(self):
        row = next(x for x in subject.build_report()['results'] if x['new_events'])
        changed = copy.deepcopy(row)
        changed['new_events'][0]['game_state_before_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(changed))


if __name__ == '__main__':
    unittest.main()
