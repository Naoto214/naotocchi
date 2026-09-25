import copy
import unittest

import proxy_new_seed_turn_end_proof_184 as subject


class TurnEndProof184Test(unittest.TestCase):
    def test_four_turn_ends_have_full_history_and_six_stages(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(0, report['new_events'])
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            self.assertEqual([], row['contract_stop_codes'])
            self.assertTrue(row['turn_end_set_complete'])
            self.assertTrue(all(row['completeness_checks'].values()))
            self.assertEqual(row['source_last_valid_event_seq'], row['growth_trace'][-1]['event_seq'])

    def test_mutated_growth_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][0])
        row['growth_trace'][-1]['growth']['B'] = 999
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
