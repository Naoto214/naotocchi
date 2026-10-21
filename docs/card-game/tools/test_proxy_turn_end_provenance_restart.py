"""Checkpoint 124: independent saved history and turn-end restart."""
import copy
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import proxy_turn_end_provenance_restart as restart


class ProvenanceRestartTests(unittest.TestCase):
    def test_materialized_outputs_require_exact_canonical_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            output=Path(folder)
            self.assertTrue(restart.check_outputs(output))
            restart.write_outputs(output)
            self.assertEqual(restart.check_outputs(output),[])
            target=output/restart.PLAN_FILE
            target.write_bytes(target.read_bytes()+b' ')
            self.assertIn(restart.PLAN_FILE,' '.join(restart.check_outputs(output)))

    def test_rebuilt_route_validator_catches_mutated_event_and_balance(self):
        inputs=restart.load_sources()
        outcomes=restart.run_all(inputs)
        self.assertEqual(restart.validate_outcomes(outcomes,inputs),[])
        forged=copy.deepcopy(outcomes)
        forged['order-01-a-first']['events'][0]['seq']=999
        self.assertTrue(restart.validate_outcomes(forged,inputs))
        forged=copy.deepcopy(outcomes)
        forged['order-01-a-first']['counts_as_independent_balance_sample']=True
        self.assertTrue(restart.validate_outcomes(forged,inputs))

    def test_protected_history_continuity_from_zero_through_122(self):
        inputs = restart.load_sources()
        self.assertEqual(len(inputs['stops']), 4)
        for path, last in [('order-01-a-first', 9), ('order-01-b-first', 7),
                           ('order-02-a-first', 7), ('order-02-b-first', 7)]:
            history = restart.validated_history(path, inputs)
            self.assertEqual([event['seq'] for event in history['events']], list(range(1,last+1)))
            self.assertEqual([row['seq'] for row in history['snapshots']], list(range(last+1)))
            self.assertEqual(history['snapshots'][-1]['game_state_sha256'],
                             inputs['stops'][path][0]['game_state_sha256'])

    def test_modified_raw_or_event_chain_is_integrity_error(self):
        inputs = restart.load_sources()
        path = 'order-01-a-first'
        altered = copy.deepcopy(inputs)
        stop, raw = altered['stops'][path]
        altered['stops'][path] = (stop, raw+b' ')
        with self.assertRaises(ValueError):
            restart.validated_history(path, altered)
        altered = copy.deepcopy(inputs)
        altered['plan_122']['routes'][0]['events'][0]['game_state_after_sha256'] = '0'*64
        with self.assertRaises(ValueError):
            restart.validated_history(path, altered)

    def test_all_saved_events_prove_absent_expiry_and_100_reach(self):
        inputs = restart.load_sources()
        for path in inputs['stops']:
            evidence = restart.derive_provenance(restart.validated_history(path, inputs),
                                                  restart.TEXT_REGISTRY)
            self.assertEqual(evidence['active_expiring_effects'], [])
            self.assertEqual(evidence['growth_reach_100'], [])
            self.assertEqual(evidence['unresolved_codes'], [])
            self.assertEqual(evidence['growth_trace'][-1]['growth'],
                             {actor: player['growth'] for actor, player in
                              inputs['stops'][path][0]['game_state']['players'].items()})

    def test_unknown_action_or_card_never_proves_empty(self):
        history = restart.validated_history('order-01-a-first', restart.load_sources())
        altered = copy.deepcopy(history)
        altered['events'][6]['action_type'] = 'unknown-effect'
        self.assertIn('unresolved_effect_provenance',
                      restart.derive_provenance(altered, restart.TEXT_REGISTRY)['unresolved_codes'])
        altered = copy.deepcopy(history)
        altered['stop']['game_state']['cards']['A-040#1']['card_id'] = 'E-unknown'
        self.assertIn('unresolved_effect_provenance',
                      restart.derive_provenance(altered, restart.TEXT_REGISTRY)['unresolved_codes'])

    def test_unsupported_intermediate_growth_is_not_excluded_by_final_value(self):
        history = restart.validated_history('order-01-a-first', restart.load_sources())
        registry = copy.deepcopy(restart.TEXT_REGISTRY)
        registry['resolve_event']['E-first-date']['growth_delta'] = None
        self.assertIn('unresolved_growth_intermediate',
                      restart.derive_provenance(history,registry)['unresolved_codes'])

    def test_current_123_contract_is_derived_from_verified_history(self):
        inputs = restart.load_sources()
        for path,(stop,raw) in inputs['stops'].items():
            proof = restart.derive_provenance(restart.validated_history(path,inputs),restart.TEXT_REGISTRY)
            audit = restart.audit_current_turn_end(stop,proof)
            self.assertEqual([x['stage'] for x in audit['stage_inventory']],list(range(1,7)))
            self.assertEqual(audit['contract_stop_codes'], [])
            self.assertTrue(audit['turn_end_set_complete'])
            self.assertTrue(all(audit['completeness_checks'].values()))
            self.assertEqual(restart.validate_current_turn_end(audit,stop,raw,proof),[])

    def test_current_validator_rejects_saved_boolean_or_forged_history(self):
        inputs = restart.load_sources()
        stop,raw = inputs['stops']['order-01-a-first']
        proof = restart.derive_provenance(restart.validated_history(stop['path_id'],inputs),restart.TEXT_REGISTRY)
        audit = restart.audit_current_turn_end(stop,proof)
        altered=copy.deepcopy(audit)
        altered['turn_end_set_complete']=False
        self.assertTrue(restart.validate_current_turn_end(altered,stop,raw,proof))
        forged=copy.deepcopy(proof)
        forged['growth_trace'][-1]['growth']['A']=100
        self.assertTrue(restart.validate_current_turn_end(audit,stop,raw,forged))

    def test_unresolved_effect_keeps_current_turn_end_incomplete(self):
        inputs=restart.load_sources()
        stop,_=inputs['stops']['order-01-a-first']
        proof=restart.derive_provenance(restart.validated_history(stop['path_id'],inputs),restart.TEXT_REGISTRY)
        proof['unresolved_codes']=['unresolved_effect_provenance']
        audit=restart.audit_current_turn_end(stop,proof)
        self.assertFalse(audit['turn_end_set_complete'])

    def test_four_routes_resume_independently_only_after_complete_proof(self):
        inputs=restart.load_sources()
        outcomes=restart.run_all(inputs)
        self.assertEqual(set(outcomes),set(inputs['stops']))
        for path,result in outcomes.items():
            original=inputs['stops'][path][0]
            self.assertGreater(result['last_valid_event_seq'],original['last_valid_event_seq'])
            self.assertEqual(result['source_stop_sha256'],restart.contract_123.EXPECTED_RAW[path])
            self.assertEqual(result['winner'],None)
            self.assertFalse(result['counts_as_independent_balance_sample'])
            self.assertIn(result['status'],('stopped_rules_adjudication','completed'))
            self.assertTrue(result['audits'][0]['turn_end_set_complete'])
        self.assertEqual(len({id(row['final_state']) for row in outcomes.values()}),4)

    def test_one_unresolved_provenance_does_not_advance_that_route(self):
        inputs=restart.load_sources()
        original=restart.derive_provenance
        def single_unknown(history,registry):
            evidence=original(history,registry)
            if history['path_id']=='order-01-a-first':
                evidence['unresolved_codes']=['unresolved_effect_provenance']
            return evidence
        with mock.patch.object(restart,'derive_provenance',single_unknown):
            outcomes=restart.run_all(inputs)
        self.assertEqual(outcomes['order-01-a-first']['last_valid_event_seq'],9)
        self.assertTrue(all(outcomes[path]['last_valid_event_seq']>inputs['stops'][path][0]['last_valid_event_seq']
                            for path in outcomes if path!='order-01-a-first'))
