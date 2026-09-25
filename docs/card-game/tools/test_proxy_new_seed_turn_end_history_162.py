import copy
import unittest

import proxy_new_seed_turn_end_history_162 as subject


class CurrentTurnEndHistory162Test(unittest.TestCase):
    def test_four_paths_have_continuous_public_history(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(0, report['new_events'])
        self.assertEqual(0, report['independent_balance_sample_count'])
        for result in report['results']:
            self.assertEqual([], subject.validate_result(result))
            self.assertEqual([], result['active_expiring_effects'])
            self.assertEqual([], result['growth_reach_100'])
        by_path = {x['path_id']: x for x in report['results']}
        self.assertEqual({'A':25,'B':20}, by_path['probe-02-a-first']['growth_trace'][-1]['growth'])

    def test_changed_history_is_rejected(self):
        result = copy.deepcopy(subject.build_report()['results'][0])
        result['growth_trace'][-1]['growth']['B'] += 1
        self.assertTrue(subject.validate_result(result))


if __name__ == '__main__':
    unittest.main()
