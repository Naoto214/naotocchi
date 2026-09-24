"""134 response-triggered board classification and independent replay."""
import hashlib
import unittest

import proxy_board_response_134 as subject


class BoardResponse134Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = subject.load_sources()

    def test_sources_and_stop_boundaries(self):
        for path, stop in self.inputs['stops'].items():
            raw = (subject.DATA / subject.SOURCE_FOLDER / f'stop-133-{path}.json').read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), subject.SOURCE_SHA[path])
            self.assertEqual(stop['last_valid_event_seq'], stop['events'][-1]['seq'])

    def test_response_triggered_classification_is_not_normal_action(self):
        row = subject.classify_response_triggered('C-bat', self.inputs['candidate_table'])
        self.assertEqual(row['kind'], 'response_triggered')
        self.assertEqual(row['response_candidate_family'], 'triggered_ability')
        self.assertFalse(row['independent_normal_action'])

    def test_current_candidate_sets_exclude_c_bat_with_timing_reason(self):
        with subject.response_board_scope(self.inputs):
            for path, route in self.inputs['stops'].items():
                audit = subject.prior.prior.audit_current(route, self.inputs['candidate_table'], strict_usage=True)
                self.assertTrue(audit['candidate_set_complete'], (path, audit['contract_stop_codes']))
                rows = [x for x in audit['enumeration_units'] if x['card_id'] == 'C-bat']
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0]['candidate_variant'], 'response_triggered')
                self.assertEqual(rows[0]['reason_codes'], ['timing_not_normal_action'])
                self.assertIsNone(rows[0]['candidate_id'])
                self.assertEqual(rows[0]['evidence']['template.timing'], 'response_window')

    def test_two_independent_replays(self):
        outcomes = subject.run_all(self.inputs)
        self.assertEqual(set(outcomes), set(subject.SOURCE_SHA))
        for path, row in outcomes.items():
            self.assertEqual(row['source_stop_sha256'], subject.SOURCE_SHA[path])
            self.assertEqual(row['source_game_state_sha256'], self.inputs['stops'][path]['game_state_sha256'])
            self.assertEqual(row['events'][0]['game_state_before_sha256'], row['source_game_state_sha256'])
            self.assertEqual(row['events'][-1]['seq'], row['last_valid_event_seq'])
            self.assertIn(row['status'], ('completed', 'stopped_rules_adjudication'))
            if row['status'] == 'stopped_rules_adjudication':
                self.assertIsNotNone(row['reason'])
            self.assertFalse(row['counts_as_independent_balance_sample'])
            for left, right in zip(row['events'], row['events'][1:]):
                self.assertEqual(right['seq'], left['seq'] + 1)
                self.assertEqual(left['game_state_after_sha256'], right['game_state_before_sha256'])
                self.assertEqual(left['continuation_state_after_sha256'], right['continuation_state_before_sha256'])

    def test_saved_json_canonical(self):
        self.assertEqual(subject.check_outputs(inputs=self.inputs), [])


if __name__ == '__main__':
    unittest.main()
