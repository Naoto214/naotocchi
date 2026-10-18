import copy
import unittest

import proxy_start_response_138 as start


class StartResponse138Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = start.load_source()
        cls.rows = start.load_candidate_rows()

    def test_response_id_namespace_is_generic_and_disjoint(self):
        self.assertEqual(start.response_id('use_play', 'A-001#1', variant='main',
                                           registered_variants=['main', 'event']),
                         'response-use-play-A-001#1-variant-main')
        self.assertEqual(start.response_id('use_item', 'B-033#1'),
                         'response-use-item-B-033#1')
        with self.assertRaises(ValueError):
            start.response_id('use_play', 'A-001#1', variant='main',
                              registered_variants=['main', 'main'])
        with self.assertRaises(ValueError):
            start.response_id('use_play', 'A-001#1', variant='unknown',
                              registered_variants=['main'])
        with self.assertRaises(ValueError):
            start.response_id('use_play', 'A-001#1', registered_variants=['main', 'event'])

    def test_source_gate_rejects_event_and_hash_tampering(self):
        for result in self.source['results']:
            start.verify_source_route(result)
        broken = copy.deepcopy(self.source['results'][0])
        broken['events'][1]['state_before_sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            start.verify_source_route(broken)
        broken = copy.deepcopy(self.source['results'][0])
        broken['final_state']['players']['A']['time'] = 0
        with self.assertRaises(ValueError):
            start.verify_source_route(broken)

    def test_four_opening_candidate_sets_are_complete(self):
        expected_counts = {'probe-01-a-first': 1, 'probe-01-b-first': 1,
                           'probe-02-a-first': 8, 'probe-02-b-first': 2}
        for result in self.source['results']:
            continuation = start.build_resume_state(result)
            audit = start.enumerate_opportunity(continuation, result['first_player'], self.rows)
            self.assertEqual(len(audit['legal_candidate_ids']), expected_counts[result['path_id']])
            self.assertTrue(audit['candidate_set_complete'])
            self.assertIn('response-pass', audit['legal_candidate_ids'])
            self.assertEqual(len(audit['legal_candidate_ids']), len(set(audit['legal_candidate_ids'])))
            self.assertNotIn('opponent_hand', audit['inspected_information'])
            self.assertNotIn('opponent_deck_order', audit['inspected_information'])
        ids = start.enumerate_opportunity(start.build_resume_state(self.source['results'][2]),
                                          'A', self.rows)['legal_candidate_ids']
        self.assertEqual({x.split('-variant-')[-1] for x in ids if '-variant-' in x},
                         {'main', 'companion', 'partner', 'world', 'play', 'item', 'event'})

    def test_unknown_affordable_quick_use_stops_instead_of_excluding(self):
        result = self.source['results'][2]
        continuation = start.build_resume_state(result)
        rows = copy.deepcopy(self.rows)
        rows['G-hit-blow']['actions'][0]['candidate_variants'].append('unregistered')
        with self.assertRaises(ValueError):
            start.enumerate_opportunity(continuation, 'A', rows)
        rows = copy.deepcopy(self.rows)
        rows['G-hit-blow']['actions'][0]['target_rule'] = 'unknown'
        with self.assertRaises(ValueError):
            start.enumerate_opportunity(continuation, 'A', rows)

    def test_saved_resumes_keep_balance_zero_and_hash_chains(self):
        report = start.build_report(self.source)
        self.assertEqual(report['planned'], 4)
        self.assertEqual(report['independent_balance_sample_count'], 0)
        for source, result in zip(self.source['results'], report['results']):
            self.assertEqual(result['source_game_state_sha256'], source['final_state_sha256'])
            self.assertEqual(result['snapshots'][0]['game_state_sha256'], source['final_state_sha256'])
            if result['events']:
                self.assertEqual(result['events'][0]['game_state_before_sha256'], source['final_state_sha256'])
            self.assertEqual(result['balance_sample_count'], 0)
            self.assertEqual(start.validate_result(result, source), [])
            self.assertEqual(result['last_valid_event_seq'], source['last_valid_event_seq'] + len(result['events']))
            for decision in result['decisions']:
                self.assertEqual(decision['pre_game_state_sha256'],
                                 result['snapshots'][decision['event_seq'] - 2]['game_state_sha256'])
                self.assertEqual(decision['pre_continuation_state_sha256'],
                                 result['snapshots'][decision['event_seq'] - 2]['continuation_state_sha256'])

    def test_normal_action_stop_uses_current_121_completeness_proof(self):
        for result in start.build_report(self.source)['results']:
            if result['stop_phase'] == 'normal_action':
                self.assertEqual(result['stop_reason_code'], 'incomplete_legal_candidates')
                self.assertEqual(result['normal_action_candidate_audit']['contract_stop_codes'],
                                 ['missing_exclusion_reason'])
                self.assertFalse(result['normal_action_candidate_audit']['candidate_set_complete'])
            else:
                self.assertIsNone(result['normal_action_candidate_audit'])


if __name__ == '__main__':
    unittest.main()
