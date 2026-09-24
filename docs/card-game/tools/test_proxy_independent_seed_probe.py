import copy
import unittest

import proxy_independent_seed_probe as probe


class IndependentSeedProbeTests(unittest.TestCase):
    def test_new_orders_preserve_all_instances_and_mirror_seats(self):
        source = probe.load_source()
        manifest = probe.build_manifest(source)
        self.assertEqual(len(manifest['routes']), 4)
        self.assertEqual(len({r['path_id'] for r in manifest['routes']}), 4)
        for route in manifest['routes']:
            for player in route['players']:
                original = next(p for p in source['input']['players'] if p['player_id'] == player['player_id'])
                self.assertEqual({c['initial_instance_id'] for c in original['deck_order_top_to_bottom']},
                                 {c['initial_instance_id'] for c in player['deck_order_top_to_bottom']})
        self.assertEqual(manifest['routes'][0]['players'], manifest['routes'][1]['players'])

    def test_opening_probe_records_reproducible_seeded_choice_and_real_stop(self):
        manifest = probe.build_manifest(probe.load_source())
        result = probe.run_route(manifest['routes'][0])
        self.assertEqual(result['status'], 'stopped_rules_adjudication')
        self.assertEqual(result['stop_reason_code'], 'unproved_post_egg_response_window')
        self.assertEqual(result['balance_sample_count'], 0)
        self.assertEqual(len(result['decisions'][0]['legal_candidates']), 7)
        self.assertEqual(result['decisions'][0]['resolution_mode'], 'seeded_fallback')
        self.assertEqual(result['events'][0]['state_before_sha256'], result['snapshots'][0]['state_sha256'])
        self.assertEqual(result['events'][-1]['state_after_sha256'], result['final_state_sha256'])
        self.assertEqual(result['final_state_sha256'], result['snapshots'][-1]['state_sha256'])
        self.assertEqual(probe.validate_route(result, manifest['routes'][0]), [])

    def test_tampered_trace_or_deck_is_rejected(self):
        manifest = probe.build_manifest(probe.load_source())
        route = manifest['routes'][0]
        outcome = probe.run_route(route)
        broken = copy.deepcopy(outcome)
        broken['events'][0]['state_before_sha256'] = '0' * 64
        self.assertTrue(probe.validate_route(broken, route))
        broken_route = copy.deepcopy(route)
        broken_route['players'][0]['deck_order_top_to_bottom'][0] = broken_route['players'][0]['deck_order_top_to_bottom'][1]
        with self.assertRaises(ValueError):
            probe.run_route(broken_route)

    def test_opening_handler_accepts_independent_future_manifest(self):
        source = probe.load_source()
        route = copy.deepcopy(probe.build_manifest(source)['routes'][0])
        route['order_id'] = 'future-pilot'
        route['path_id'] = 'future-pilot-a-first'
        for player in route['players']:
            player['seed'] += 100
            original = next(p for p in source['input']['players'] if p['player_id'] == player['player_id'])
            player['deck_order_top_to_bottom'] = probe.shuffle_115.shuffle_deck(
                original['deck_order_top_to_bottom'], player['seed'])
        self.assertEqual(probe.run_route(route)['path_id'], 'future-pilot-a-first')


if __name__ == '__main__':
    unittest.main()
