import copy
import json
import unittest

import proxy_new_seed_normal_audit_140 as audit


class NewSeedNormalAudit140Tests(unittest.TestCase):
    def test_source_is_protected_and_tampering_stops(self):
        source = audit.load_source()
        self.assertEqual(len(source['results']), 4)
        row = copy.deepcopy(source['results'][0])
        audit.verify_route(row, audit.start.load_source()['results'][0])
        row['final_game_state']['players'][row['final_game_state']['turn_player']]['time'] += 1
        with self.assertRaises(ValueError):
            audit.verify_route(row, audit.start.load_source()['results'][0])

    def test_three_normal_audits_are_complete_without_private_opponent_order(self):
        result = audit.build_report()
        self.assertEqual(result['planned'], 4)
        self.assertEqual(result['normal_action_audited'], 3)
        self.assertEqual(result['new_events'], 0)
        self.assertEqual(result['independent_balance_sample_count'], 0)
        expected = {
            'probe-01-a-first': {'candidate-place-companion-A-013#1', 'candidate-place-companion-A-015#1', 'pass'},
            'probe-01-b-first': {'candidate-place-companion-B-011#1', 'candidate-play-main-B-001#1-birth', 'pass'},
            'probe-02-b-first': {'candidate-play-main-B-001#1-birth', 'candidate-use_item-B-033#1', 'pass'},
        }
        sources = {x['path_id']: x for x in audit.load_source()['results']}
        for row in result['results']:
            self.assertEqual(row['new_events'], 0)
            if row['path_id'] in expected:
                current = row['normal_action_candidate_audit']
                self.assertTrue(current['candidate_set_complete'])
                self.assertTrue(all(current['completeness_checks'].values()))
                self.assertEqual(set(current['legal_candidate_ids']), expected[row['path_id']])
                self.assertEqual(current['forbidden_information_used'], [])
                opponent = 'B' if current['opportunity_context']['actor'] == 'A' else 'A'
                self.assertNotIn('hand', current['public_information'][opponent])
                self.assertNotIn('deck', current['public_information'][opponent])
                self.assertTrue(all(detail['source_instance_id'] is None or detail['source_instance_id'] not in
                                    sources[row['path_id']]['final_game_state']['players'][opponent]['hand']
                                    for detail in current['legal_candidate_details']))
                self.assertEqual(row['stop_reason_code'], 'unproved_new_seed_normal_action_decision')
            else:
                self.assertIsNone(row['normal_action_candidate_audit'])
                self.assertEqual(row['stop_reason_code'], 'unproved_start_quick_use_activation_resolution')

    def test_canonical_output_replays_exactly(self):
        report = audit.build_report()
        self.assertEqual(audit.OUTPUT.read_bytes(), audit.canonical_bytes(report))
        self.assertEqual(json.loads(audit.OUTPUT.read_bytes()), report)


if __name__ == '__main__':
    unittest.main()
