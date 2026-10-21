import copy
import importlib
import json
import unittest


class Replay406Tests(unittest.TestCase):
    def setUp(self):
        self.m = importlib.import_module('proxy_new_seed_mixed_replay_406')
        self.rows = self.m.load_rows()

    def test_targeted_candidates_and_existing_seeded_pass(self):
        for path, count in [('probe-01-b-first', 3), ('probe-02-b-first', 2)]:
            row = next(x for x in self.rows if x['path_id'] == path)
            baseline, history, _ = self.m.saved_history(path)
            proof = self.m.audit_response(row, baseline, history)
            self.assertTrue(proof['candidate_set_complete'])
            self.assertEqual(count, len(proof['candidate_ids']))
            selected = self.m.choose_response(row, proof, baseline, history)
            self.assertEqual('response-pass', selected['selected_candidate'])
            self.assertEqual('response_seeded_fallback', selected['resolution_mode'])
            broken = copy.deepcopy(proof)
            broken['candidate_ids'].pop()
            with self.assertRaises(ValueError):
                self.m.choose_response(row, broken, baseline, history)

    def test_history_hash_tampering_is_rejected(self):
        row = next(x for x in self.rows if x['path_id'] == 'probe-01-b-first')
        baseline, history, _ = self.m.saved_history(row['path_id'])
        broken = copy.deepcopy(history)
        broken[-1][0]['actor'] = 'A'
        # Event headers are not snapshot hashes: reject a provenance actor
        # mismatch by rechecking the transition, not just the hash strings.
        with self.assertRaises(ValueError):
            self.m.audit_response(row, baseline, broken)

    def test_saved_four_boundaries_and_canonical_output(self):
        audit, replay = self.m.build_reports()
        self.assertEqual(0, replay['rules_stopped'])
        self.assertEqual(0, replay['completed'])
        for initial, final in zip(self.rows, replay['results']):
            self.m.contracts.validate_chain(initial, final)
            game = final['final_continuation_state']['game_state']
            self.assertEqual((10, 'A', 'egg_exchange_choice'),
                             (game['round'], game['turn_player'], game['phase']))
            if initial['path_id'].endswith('a-first'):
                self.assertEqual(initial['final_continuation_state'], final['final_continuation_state'])
                self.assertEqual([], final['new_events'])
        for path, value in ((self.m.AUDIT, audit), (self.m.OUTPUT, replay)):
            self.assertEqual(path.read_bytes(), self.m.canonical_bytes(value))

    def before_resolution(self):
        final = next(x for x in json.loads(self.m.OUTPUT.read_bytes())['results'] if x['path_id'] == 'probe-01-b-first')
        index = next(i for i, e in enumerate(final['new_events']) if e['action_type'] == 'resolve_event')
        shot = final['new_snapshots'][index-1]
        return {'path_id': final['path_id'], 'last_valid_event_seq': shot['event_seq'],
                'final_game_state_sha256': shot['game_state_sha256'],
                'final_continuation_state_sha256': shot['continuation_state_sha256'],
                'final_continuation_state': copy.deepcopy(shot['continuation_state'])}

    def rehash(self, row):
        state = row['final_continuation_state']
        row['final_game_state_sha256'] = self.m.contracts.start.opening._stop_state_sha256(state['game_state'])
        row['final_continuation_state_sha256'] = self.m.contracts.start.canonical_sha256(state)

    def test_final_time_resolves_move_draw_bottom_and_returns_to_end(self):
        row = self.before_resolution()
        result = self.m.resolve_final_time(row)
        event = result['new_events'][0]
        outcome = event['result']
        self.assertEqual('A-033#1', outcome['returned_discard_to_deck_bottom'])
        self.assertEqual(['A-037#1', 'A-031#1'], outcome['drawn_instance_ids'])
        self.assertEqual('A-037#1', outcome['hand_bottom_instance_id'])
        state = result['final_continuation_state']
        self.assertEqual('turn_end', state['game_state']['phase'])
        self.assertEqual(2, state['response_context']['consecutive_passes'])
        self.assertEqual([], self.m.source.fallback.validate_seeded_resolution(result['new_decisions'][0]))
        self.assertIn('A-039#1', state['game_state']['players']['A']['discard'])

    def test_invalid_resolution_target_skips_draw_and_bottom(self):
        row = self.before_resolution()
        owner = row['final_continuation_state']['game_state']['players']['A']
        owner['discard'].remove('A-033#1'); owner['deck'].append('A-033#1')
        self.rehash(row)
        hand = copy.deepcopy(owner['hand'])
        result = self.m.resolve_final_time(row)
        outcome = result['new_events'][0]['result']
        self.assertFalse(outcome['target_valid_at_resolution'])
        self.assertEqual([], outcome['drawn_instance_ids'])
        self.assertIsNone(outcome['hand_bottom_instance_id'])
        self.assertEqual([], result['new_decisions'])
        self.assertEqual(hand, result['final_continuation_state']['game_state']['players']['A']['hand'])

    def test_short_deck_draws_possible_part_including_moved_target(self):
        row = self.before_resolution()
        owner = row['final_continuation_state']['game_state']['players']['A']
        owner['discard'] += owner['deck']; owner['deck'] = []
        self.rehash(row)
        result = self.m.resolve_final_time(row)
        self.assertEqual(['A-033#1'], result['new_events'][0]['result']['drawn_instance_ids'])
        self.assertEqual(1, len(result['new_decisions']))

    def test_private_deck_order_does_not_change_response_choice(self):
        row = next(x for x in self.rows if x['path_id'] == 'probe-01-b-first')
        baseline, history, _ = self.m.saved_history(row['path_id'])
        proof = self.m.audit_response(row, baseline, history)
        modified = copy.deepcopy(row)
        for owner in modified['final_continuation_state']['game_state']['players'].values():
            owner['deck'].reverse()
        self.rehash(modified)
        chance = self.m.response_opportunity(modified, proof, proof['final_time_inventory'])
        self.assertEqual(proof['opportunity'], chance)

    def test_activation_rejects_non_discard_and_main_targets(self):
        row = next(x for x in self.rows if x['path_id'] == 'probe-01-b-first')
        baseline, history, _ = self.m.saved_history(row['path_id'])
        proof = self.m.audit_response(row, baseline, history)
        detail = next(x for x in proof['legal_candidate_details'] if x['card_id'] == 'E-final-time')
        before = self.m.contracts.current(row)
        bad = copy.deepcopy(detail); bad['target_instance_ids'] = ['A-039#1']
        with self.assertRaises(ValueError):
            self.m.validate_final_time_target(before, bad)
        bad['target_instance_ids'] = ['A-001#1']
        # This route's A-001 is a main still outside discard.
        with self.assertRaises(ValueError):
            self.m.validate_final_time_target(before, bad)

    def test_same_name_history_and_candidate_details_are_bound(self):
        audit = json.loads(self.m.AUDIT.read_bytes())
        route = next(x for x in audit['results'] if x['path_id'] == 'probe-01-b-first')
        opportunities = [s['audit'] for s in route['steps'] if s['audit'].get('actor') == 'A' and s['audit'].get('final_time_inventory', {}).get('same_name_use_event_seqs')]
        self.assertEqual([167], opportunities[0]['final_time_inventory']['same_name_use_event_seqs'])
        row = next(x for x in self.rows if x['path_id'] == 'probe-01-b-first')
        baseline, history, _ = self.m.saved_history(row['path_id'])
        proof = self.m.audit_response(row, baseline, history)
        for field in ('source_instance_id', 'target_instance_ids'):
            broken = copy.deepcopy(proof)
            detail = next(x for x in broken['legal_candidate_details'] if x['card_id'] == 'E-final-time')
            detail[field] = 'B-039#1' if field == 'source_instance_id' else ['A-039#1']
            with self.assertRaises(ValueError):
                self.m.choose_response(row, broken, baseline, history)

    def test_new_activation_history_headers_cannot_hide_same_name_use(self):
        final = next(x for x in json.loads(self.m.OUTPUT.read_bytes())['results'] if x['path_id'] == 'probe-01-b-first')
        index = next(i for i, e in enumerate(final['new_events']) if e['seq'] == 168)
        shot = final['new_snapshots'][index]
        row = {'path_id': final['path_id'], 'last_valid_event_seq': shot['event_seq'],
               'final_game_state_sha256': shot['game_state_sha256'],
               'final_continuation_state_sha256': shot['continuation_state_sha256'],
               'final_continuation_state': copy.deepcopy(shot['continuation_state'])}
        baseline, saved, _ = self.m.saved_history(row['path_id'])
        history = saved + list(zip(final['new_events'][:index+1], final['new_snapshots'][:index+1]))
        self.assertEqual([167], self.m.audit_response(row, baseline, history)['final_time_inventory']['same_name_use_event_seqs'])
        for field, value in [('actor', 'B'), ('source_instance_id', 'B-039#1'),
                             ('target_instance_ids', ['A-040#1']), ('payment', {'time': 1}),
                             ('chain_link_id', 'wrong-link'), ('action_type', 'response_pass')]:
            broken = copy.deepcopy(history)
            event = next(e for e, _ in broken if e['seq'] == 167)
            event[field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.m.audit_response(row, baseline, broken)


if __name__ == '__main__':
    unittest.main()
