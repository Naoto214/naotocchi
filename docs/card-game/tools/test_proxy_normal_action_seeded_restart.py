"""Checkpoint 122 restart, choice and evidence tests."""
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import proxy_normal_action_candidate_completeness as candidate_121
import proxy_normal_action_seeded_restart as restart_122


class Restart122Tests(unittest.TestCase):
    def test_four_sources_bind_exact_raw_dual_hash_seq(self):
        inputs = restart_122.load_sources()
        self.assertEqual(list(inputs['stops']), list(candidate_121.PATH_ORDER))
        self.assertEqual([row['last_valid_event_seq'] for row, _ in inputs['stops'].values()], [7, 5, 5, 5])
        for path, (stop, raw) in inputs['stops'].items():
            candidate_121.verify_source_artifact(stop, raw, candidate_121.EXPECTED[path])

    def test_resume_keeps_120_terminal_as_first_snapshot_without_new_event(self):
        for stop, _ in restart_122.load_sources()['stops'].values():
            resumed = restart_122.resume_from_120(stop)
            self.assertEqual(resumed['last_event_seq'], stop['last_valid_event_seq'])
            self.assertEqual(resumed['game_state'], stop['game_state'])
            self.assertEqual(resumed['continuation_state_sha256'], stop['continuation_state_sha256'])
            self.assertEqual(len(resumed['events']), 0)
            self.assertEqual(len(resumed['snapshots']), 1)
            self.assertEqual(resumed['snapshots'][0]['game_state_sha256'], stop['game_state_sha256'])

    def test_corrupted_source_state_cannot_be_resumed(self):
        stop, raw = next(iter(restart_122.load_sources()['stops'].values()))
        damaged = copy.deepcopy(stop)
        damaged['game_state']['players']['A']['growth'] += 1
        with self.assertRaises(ValueError):
            restart_122.resume_from_120(damaged)

    def test_current_state_audits_all_four_without_trusting_saved_boolean(self):
        inputs = restart_122.load_sources()
        expected = [['pass'], ['candidate-play-main-B-001#1-birth', 'pass'],
                    ['pass'], ['candidate-play-main-B-001#1-birth',
                               'candidate-play-main-B-009#1-birth', 'pass']]
        for (stop, _), ids in zip(inputs['stops'].values(), expected):
            state = restart_122.resume_from_120(stop)
            history = candidate_121._public_history_from_saved_plans(stop)
            audit = candidate_121.audit_current_normal_action(
                state['game_state'], state, history, inputs['candidate_table'])
            self.assertEqual(audit['legal_candidate_ids'], ids)
            self.assertTrue(audit['candidate_set_complete'])
            self.assertEqual(len(audit['completeness_checks']), 12)
            self.assertFalse(candidate_121.validate_current_normal_action(
                audit, state['game_state'], state, history, inputs['candidate_table']))
            tampered = copy.deepcopy(audit)
            tampered['source_inventory'][1]['sources'].pop()
            self.assertTrue(candidate_121.validate_current_normal_action(
                tampered, state['game_state'], state, history, inputs['candidate_table']))
            tampered = copy.deepcopy(audit)
            tampered['candidate_set_complete'] = False
            self.assertTrue(candidate_121.validate_current_normal_action(
                tampered, state['game_state'], state, history, inputs['candidate_table']))

    def test_changed_state_recomputes_legality_and_rejects_future_history(self):
        inputs = restart_122.load_sources()
        stop, _ = inputs['stops']['order-01-b-first']
        state = restart_122.resume_from_120(stop)
        history = candidate_121._public_history_from_saved_plans(stop)
        state['game_state']['players']['B']['time'] = 0
        state['continuation_state_sha256'] = restart_122.response_120.continuation_state_sha256(
            {key: state[key] for key in ('game_state', 'response_context', 'activation_zone',
                                          'pending_triggers', 'return_target')})
        audit = candidate_121.audit_current_normal_action(
            state['game_state'], state, history, inputs['candidate_table'])
        self.assertEqual(audit['legal_candidate_ids'], ['pass'])
        with self.assertRaises(ValueError):
            candidate_121.audit_current_normal_action(
                state['game_state'], state,
                {**history, 'future_draw': ['A-001#1']}, inputs['candidate_table'])

    def test_only_complete_current_audit_can_enter_choice(self):
        inputs = restart_122.load_sources()
        for path, (stop, _) in inputs['stops'].items():
            state = restart_122.resume_from_120(stop)
            history = candidate_121._public_history_from_saved_plans(stop)
            audit = restart_122.enumerate_opportunity(state, history, inputs)
            decision = restart_122.select_decision(audit, {
                'order_id': stop['order_id'], 'actor_turn_index': 1, 'round': 1})
            self.assertIn(decision['selected_candidate'], audit['legal_candidate_ids'])
            if audit['legal_candidate_ids'] == ['pass']:
                self.assertEqual(decision['resolution_mode'], 'priority_unique')
                self.assertIsNone(decision['seed_proof'])
                self.assertEqual(decision['reason_code'],'pass_no_better_legal_action')
            else:
                self.assertEqual(decision['resolution_mode'], 'priority_unique')
                self.assertEqual(decision['selected_candidate'], 'pass')
                self.assertEqual(decision['reason_code'],'time_balance')
                self.assertEqual(decision['comparison_evidence']['decided_at'],
                                 'time_after_certain_resolution')
            changed = copy.deepcopy(audit)
            changed['candidate_set_complete'] = False
            with self.assertRaises(ValueError):
                restart_122.select_decision(changed, {
                    'order_id': stop['order_id'], 'actor_turn_index': 1, 'round': 1})

    def test_birth_transition_follows_action_variant_and_preserves_120(self):
        inputs = restart_122.load_sources()
        stop, _ = inputs['stops']['order-01-b-first']
        before = restart_122.resume_from_120(stop)
        audit = restart_122.enumerate_opportunity(
            before, candidate_121._public_history_from_saved_plans(stop), inputs)
        detail = next(d for d in audit['legal_candidate_details'] if d['candidate_id'].endswith('-birth'))
        decision = {'selected_action':detail,'selected_candidate':detail['candidate_id'],
                    'candidate_set_complete':True}
        after, events = restart_122.transition(before, decision, inputs)
        self.assertEqual(before['game_state'], stop['game_state'])
        self.assertEqual(events[0]['seq'], stop['last_valid_event_seq'] + 1)
        self.assertEqual(after['game_state']['players']['B']['board']['main'], 'B-001#1')
        self.assertEqual(after['game_state']['players']['B']['time'], 0)
        self.assertNotIn('B-001#1', after['game_state']['players']['B']['hand'])
        self.assertEqual(after['response_context']['phase'], 'response_window')
        self.assertEqual(after['response_context']['priority_actor'], 'B')

    def test_pass_opens_canonical_end_request_response_window(self):
        inputs = restart_122.load_sources()
        stop, _ = inputs['stops']['order-01-a-first']
        before = restart_122.resume_from_120(stop)
        audit = restart_122.enumerate_opportunity(
            before, candidate_121._public_history_from_saved_plans(stop), inputs)
        decision = restart_122.select_decision(
            audit, {'order_id': stop['order_id'], 'actor_turn_index': 1, 'round': 1})
        after, events = restart_122.transition(before, decision, inputs)
        self.assertEqual(before['game_state'], stop['game_state'])
        self.assertEqual(after['response_context']['priority_actor'], 'B')
        self.assertEqual(after['response_context']['consecutive_passes'], 1)
        self.assertEqual(after['return_target'], 'turn_end')
        self.assertEqual(events[0]['selected_candidate'], 'pass')

    def test_birth_with_unsupported_trigger_stops_before_payment(self):
        inputs = restart_122.load_sources()
        stop, _ = inputs['stops']['order-02-b-first']
        before = restart_122.resume_from_120(stop)
        audit = restart_122.enumerate_opportunity(
            before, candidate_121._public_history_from_saved_plans(stop), inputs)
        detail = next(d for d in audit['legal_candidate_details'] if d['card_id']=='M-beetle-01')
        decision = {'selected_action':detail,'selected_candidate':detail['candidate_id'],
                    'candidate_set_complete':True}
        with self.assertRaisesRegex(restart_122.RulesStop, 'effect_resolution_not_defined'):
            restart_122.transition(before, decision, inputs)
        self.assertEqual(before['game_state'], stop['game_state'])

    def test_routes_reenumerate_after_each_verified_transition(self):
        inputs = restart_122.load_sources()
        for path, (stop, _) in inputs['stops'].items():
            result = restart_122.run_route(stop, inputs)
            self.assertEqual(result['status'], 'stopped_rules_adjudication')
            self.assertEqual(result['snapshots'][0]['seq'], stop['last_valid_event_seq'])
            self.assertEqual([event['seq'] for event in result['events']],
                             list(range(stop['last_valid_event_seq'] + 1,
                                        result['last_valid_event_seq'] + 1)))
            self.assertEqual(len(result['snapshots']), len(result['events']) + 1)
            self.assertEqual(result['snapshots'][0]['game_state_sha256'], stop['game_state_sha256'])
            for prior, event, following in zip(result['snapshots'], result['events'], result['snapshots'][1:]):
                self.assertEqual(event['game_state_before_sha256'], prior['game_state_sha256'])
                self.assertEqual(event['game_state_after_sha256'], following['game_state_sha256'])
                self.assertEqual(event['continuation_state_before_sha256'], prior['continuation_state_sha256'])
                self.assertEqual(event['continuation_state_after_sha256'], following['continuation_state_sha256'])
                self.assertEqual(event['event_id'], f"event-122-{path}-{event['seq']:03d}")
            for decision in result['decisions']:
                self.assertTrue(decision['decision_id'].startswith(f'decision-122-{path}-'))
                self.assertEqual(result['events'][decision['event_seqs'][0] -
                                                  stop['last_valid_event_seq'] - 1]['decision_id'],
                                 decision['decision_id'])
                if decision['kind'] == 'normal_action':
                    self.assertTrue(decision['audit']['candidate_set_complete'])
                    self.assertEqual(decision['audit']['legal_candidate_ids'], decision['legal_candidates'])
                    if decision['resolution_mode'] == 'seeded_fallback':
                        self.assertEqual(decision['seed_proof']['selected_candidate'],
                                         decision['selected_candidate'])
                        self.assertEqual(decision['seed_context']['order_id'], stop['order_id'])
            self.assertEqual([e['action_type'] for e in result['events']],
                             ['normal_pass_end_request', 'response_pass'])
            self.assertEqual(result['game_state']['phase'], 'turn_end')
            self.assertEqual(result['terminal']['reason_code'], 'effect_resolution_not_defined')

    def test_outputs_are_independent_and_reject_noncanonical_bytes(self):
        inputs = restart_122.load_sources()
        outputs = restart_122.build_outputs(inputs)
        self.assertEqual(outputs['evaluation']['summary']['planned'], 4)
        self.assertEqual(outputs['evaluation']['summary']['completed'], 0)
        self.assertEqual(outputs['evaluation']['summary']['rules_stop'], 4)
        self.assertEqual(outputs['evaluation']['summary']['independent_balance_sample'], 0)
        self.assertEqual(set(outputs['stops']), set(candidate_121.PATH_ORDER))
        self.assertFalse(restart_122.validate_outputs(outputs, inputs))
        altered = copy.deepcopy(outputs)
        altered['plan']['routes'][0]['terminal']['reason_code'] = 'fabricated'
        self.assertTrue(restart_122.validate_outputs(altered, inputs))
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            restart_122.write_outputs(outputs, folder)
            self.assertFalse(restart_122.check_outputs(folder, inputs))
            artifact = folder / restart_122.PLAN_FILE
            artifact.write_bytes(json.dumps(outputs['plan']).encode() + b'\n')
            self.assertTrue(restart_122.check_outputs(folder, inputs))

    def test_source_corruption_is_not_serialized_as_route_stop(self):
        inputs = restart_122.load_sources()
        tampered = copy.deepcopy(inputs)
        stop, raw = tampered['stops']['order-01-b-first']
        tampered['stops']['order-01-b-first'] = (stop, raw + b' ')
        with self.assertRaises(ValueError):
            restart_122.build_outputs(tampered)

    def test_multiple_candidates_compare_before_fallback(self):
        inputs = restart_122.load_sources()
        stop, _ = inputs['stops']['order-02-b-first']
        result = restart_122.run_route(stop, inputs)
        decision = result['decisions'][0]
        self.assertEqual(decision['selected_candidate'], 'pass')
        self.assertEqual(decision['resolution_mode'], 'priority_unique')
        self.assertIsNone(decision['seed_proof'])

    def test_public_history_tracks_each_proved_event_and_stops_on_unknown_kind(self):
        inputs = restart_122.load_sources()
        stop, _ = inputs['stops']['order-01-b-first']
        seed = candidate_121._public_history_from_saved_plans(stop)
        event = {'event_id':'event-122-order-01-b-first-006', 'seq':6,
                 'action_type':'play_main_birth'}
        current = restart_122.derive_public_history(seed,[event],6)
        self.assertIn(event['event_id'], current['source_refs'])
        self.assertEqual(current['normal_challenge_losses_by_actor'], [])
        with self.assertRaisesRegex(restart_122.RulesStop,'legality_not_confirmed'):
            restart_122.derive_public_history(seed,[{**event,'action_type':'challenge_result'}],6)

    def test_uncertain_higher_priority_blocks_time_comparison(self):
        inputs = restart_122.load_sources()
        stop, _ = inputs['stops']['order-01-b-first']
        state = restart_122.resume_from_120(stop)
        audit = restart_122.enumerate_opportunity(
            state, candidate_121._public_history_from_saved_plans(stop), inputs)
        changed = copy.deepcopy(audit)
        changed['audit']['public_information']['A']['growth'] = 100
        with self.assertRaisesRegex(restart_122.RulesStop,'legality_not_confirmed'):
            restart_122.select_decision(changed, {
                'order_id':stop['order_id'],'actor_turn_index':1,'round':1})

    def test_unsupported_response_action_stops_only_its_route(self):
        inputs = restart_122.load_sources()
        stop, _ = inputs['stops']['order-01-a-first']
        state = restart_122.resume_from_120(stop)
        bad = {'decision_kind':'response_action', 'selected_action':{
            'action_type':'response_unknown','card_id':None}}
        with self.assertRaisesRegex(restart_122.RulesStop,'effect_resolution_not_defined'):
            restart_122.apply_supported_response(state,bad,inputs)

    def test_checkpoint_report_and_readme_match_saved_counts(self):
        docs = Path(__file__).resolve().parents[1]
        report = (docs / '122-normal-action-seeded-restart.md').read_text()
        readme = (docs / 'README.md').read_text()
        summary = json.loads((docs / 'data' / restart_122.EVALUATION_FILE).read_text())['summary']
        for key in ('planned','completed','rules_stop','integrity_stop',
                    'decision','event','snapshot','winner','independent_balance_sample'):
            self.assertIn(f'{key}: {summary[key]}', report)
        self.assertIn('| [122](122-normal-action-seeded-restart.md) |', readme)
        self.assertIn('122-normal-action-seeded-restart.md', readme.split('## 現在フェーズと再開地点')[1].split('## ')[0])

    def test_design_checker_exposes_separate_checkpoint_122_gate(self):
        checker = Path(__file__).resolve().parent / 'check-design-data.py'
        run = subprocess.run([sys.executable, str(checker), '--checkpoint-122'],
                             capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        value = json.loads(run.stdout)
        self.assertEqual(value['checkpoint'], 122)
        self.assertEqual(value['dedicated_test_count'], 18)
        self.assertEqual(value['errors'], [])


if __name__ == '__main__':
    unittest.main()
