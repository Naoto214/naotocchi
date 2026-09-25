import copy
import unittest

import proxy_new_seed_r2_turn_end_history_181 as subject


class R2TurnEndHistory181Test(unittest.TestCase):
    def test_four_full_event_and_growth_histories(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(0, report['new_events'])
        self.assertTrue(all(not subject.validate_result(row) for row in report['results']))
        self.assertEqual(2, sum(row['current_phase'] == 'turn_end' for row in report['results']))
        self.assertEqual(2, sum(row['current_phase'] == 'turn_end_response' for row in report['results']))
        for row in report['results']:
            self.assertEqual(row['source_last_valid_event_seq'], row['growth_trace'][-1]['event_seq'])

    def test_modified_growth_trace_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][0])
        row['growth_trace'][-1]['growth']['A'] = 999
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
