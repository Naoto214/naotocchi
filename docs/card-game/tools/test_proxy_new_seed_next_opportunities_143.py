import copy
import unittest

import proxy_new_seed_next_opportunities_143 as audit


class NextOpportunity143Tests(unittest.TestCase):
    def test_four_current_boundaries_and_no_progress(self):
        report = audit.build_report()
        self.assertEqual(report['planned'], 4)
        self.assertEqual(report['new_events'], 0)
        self.assertEqual(report['independent_balance_sample_count'], 0)
        rows = {row['path_id']: row for row in report['results']}
        for path in ('probe-01-a-first', 'probe-01-b-first'):
            self.assertFalse(rows[path]['candidate_set_complete'])
            self.assertEqual(rows[path]['missing_contract'], 'board_triggered_response_enumeration')
        self.assertTrue(rows['probe-02-a-first']['candidate_set_complete'])
        self.assertEqual(rows['probe-02-a-first']['candidate_ids'], [
            'candidate-place-partner-A-016#1', 'candidate-place-partner-A-018#1',
            'candidate-place-partner-A-019#1', 'pass'])
        self.assertTrue(rows['probe-02-b-first']['candidate_set_complete'])
        self.assertEqual(rows['probe-02-b-first']['candidate_ids'], ['response-pass'])

    def test_source_hash_and_no_protected_mutation(self):
        report = audit.build_report()
        self.assertEqual(audit.OUTPUT.read_bytes(), audit.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(audit.validate_result(row), [])
        changed = copy.deepcopy(report['results'][0])
        changed['source_game_state_sha256'] = '0' * 64
        self.assertNotEqual(audit.validate_result(changed), [])


if __name__ == '__main__':
    unittest.main()
