import copy
import unittest

import proxy_new_seed_normal_restart_141 as restart


class NewSeedNormalRestart141Tests(unittest.TestCase):
    def test_saved_source_proof_and_tamper_gate(self):
        source = restart.load_source()
        self.assertEqual(len(source['results']), 4)
        row = copy.deepcopy(source['results'][0])
        row['source_game_state_sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            restart.verify_route(row)

    def test_three_first_actions_and_unchanged_quick_use_stop(self):
        report = restart.build_report()
        self.assertEqual(report['planned'], 4)
        self.assertEqual(report['new_decisions'], 3)
        self.assertEqual(report['new_events'], 3)
        self.assertEqual(report['independent_balance_sample_count'], 0)
        expected = {'probe-01-a-first': ('candidate-place-companion-A-015#1', 'seeded_fallback', 'place_companion'),
                    'probe-01-b-first': ('candidate-place-companion-B-011#1', 'safe_free_development', 'place_companion'),
                    'probe-02-b-first': ('pass', 'priority_unique', 'normal_pass_end_request')}
        for row in report['results']:
            self.assertEqual(row['balance_sample_count'], 0)
            if row['path_id'] not in expected:
                self.assertEqual(row['new_events'], [])
                self.assertEqual(row['stop_reason_code'], 'unproved_start_quick_use_activation_resolution')
                continue
            candidate, mode, kind = expected[row['path_id']]
            self.assertEqual(row['new_decisions'][0]['selected_candidate'], candidate)
            self.assertEqual(row['new_decisions'][0]['resolution_mode'], mode)
            self.assertEqual(row['new_events'][0]['action_type'], kind)
            self.assertEqual(row['new_events'][0]['game_state_before_sha256'], row['source_game_state_sha256'])
            self.assertEqual(row['new_events'][0]['continuation_state_before_sha256'], row['source_continuation_state_sha256'])
            self.assertEqual(row['new_events'][0]['seq'], row['source_last_valid_event_seq'] + 1)
            self.assertEqual(row['stop_reason_code'], 'unproved_next_response_candidates')
            self.assertEqual(restart.validate_result(row), [])

    def test_canonical_output_and_original_unchanged(self):
        report = restart.build_report()
        self.assertEqual(restart.OUTPUT.read_bytes(), restart.canonical_bytes(report))
        self.assertEqual(restart.SOURCE_RAW_SHA256, restart.source_sha())


if __name__ == '__main__':
    unittest.main()
