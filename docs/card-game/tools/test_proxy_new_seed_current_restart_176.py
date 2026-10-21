import copy
import unittest

import proxy_new_seed_current_restart_176 as subject


class CurrentRestart176Test(unittest.TestCase):
    def test_three_passes_and_one_item_resolution(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(4, report['new_events'])
        self.assertEqual(3, report['new_decisions'])
        self.assertTrue(all(not subject.validate_result(row) for row in report['results']))
        self.assertEqual('resolve_item', report['results'][-1]['new_events'][0]['action_type'])

    def test_tampered_event_hash_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][-1])
        row['new_events'][0]['game_state_after_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
