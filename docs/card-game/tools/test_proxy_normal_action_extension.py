"""Checkpoint 125: current-state candidate extension tests."""
import copy
import tempfile
import unittest
from pathlib import Path

import proxy_normal_action_extension as extension


class ExtensionTests(unittest.TestCase):
    def test_canonical_outputs_missing_or_single_byte_drift(self):
        with tempfile.TemporaryDirectory() as folder:
            target=Path(folder)
            self.assertTrue(extension.check_outputs(target))
            extension.write_outputs(target)
            self.assertEqual(extension.check_outputs(target),[])
            name=extension.PLAN_FILE
            (target/name).write_bytes((target/name).read_bytes()+b' ')
            self.assertIn(name,' '.join(extension.check_outputs(target)))

    def test_rebuilt_outcomes_reject_event_hash_and_false_balance(self):
        outcomes=extension.run_all(self.inputs)
        self.assertEqual(extension.validate_outcomes(outcomes,self.inputs),[])
        forged=copy.deepcopy(outcomes)
        forged['order-01-a-first']['events'][0]['game_state_after_sha256']='0'*64
        self.assertTrue(extension.validate_outcomes(forged,self.inputs))
        forged=copy.deepcopy(outcomes)
        forged['order-01-a-first']['counts_as_independent_balance_sample']=True
        self.assertTrue(extension.validate_outcomes(forged,self.inputs))
    @classmethod
    def setUpClass(cls):
        cls.inputs=extension.load_sources()

    def test_empty_board_and_hand_inventory_has_six_families(self):
        for route in self.inputs['stops'].values():
            view=extension.project(route)
            rows=extension.inventory_sources(view)
            self.assertEqual([x['family'] for x in rows],list(extension.candidate_121.FAMILIES))
            board=rows[2]
            self.assertEqual((board['count'],board['empty_reason_code']),(0,'no_board_source'))
            self.assertEqual(board['sources'],[])
        route=next(iter(self.inputs['stops'].values()))
        altered=copy.deepcopy(route)
        actor=altered['final_state']['game_state']['turn_player']
        altered['final_state']['game_state']['players'][actor]['hand']=[]
        view=extension.project(altered)
        self.assertEqual(extension.inventory_sources(view)[1]['empty_reason_code'],'no_hand_source')

    def test_unknown_state_fields_do_not_enter_information_view(self):
        altered=copy.deepcopy(next(iter(self.inputs['stops'].values())))
        altered['final_state']['game_state']['unexpected_secret']='secret'
        with self.assertRaises(ValueError):
            extension.project(altered)

    def test_all_current_states_independently_recalculate_twelve_checks(self):
        for path,route in self.inputs['stops'].items():
            audit=extension.audit_current(route,self.inputs['candidate_table'])
            self.assertEqual(audit['contract_stop_codes'],[],path)
            self.assertTrue(all(audit['completeness_checks'].values()),path)
            self.assertTrue(audit['candidate_set_complete'],path)
            self.assertIn('pass',audit['legal_candidate_ids'])
            self.assertTrue(any(x.startswith('candidate-place-')
                                for x in audit['legal_candidate_ids']))
            self.assertEqual(extension.validate_current(audit,route,self.inputs['candidate_table']),[])

    def test_saved_boolean_candidate_id_or_source_reason_is_not_trusted(self):
        route=self.inputs['stops']['order-01-a-first']
        audit=extension.audit_current(route,self.inputs['candidate_table'])
        for key,value in [('candidate_set_complete',False),
                          ('legal_candidate_ids',['pass']),
                          ('source_inventory',[])]:
            tampered=copy.deepcopy(audit)
            tampered[key]=value
            self.assertTrue(extension.validate_current(tampered,route,self.inputs['candidate_table']))

    def test_person_limit_and_partner_occupancy_exclude_with_existing_reasons(self):
        route=copy.deepcopy(self.inputs['stops']['order-01-a-first'])
        actor=route['final_state']['game_state']['turn_player']
        route['final_state']['game_state']['players'][actor]['person_placed']=True
        audit=extension.audit_current(route,self.inputs['candidate_table'])
        self.assertFalse(any(x.startswith('candidate-place-') for x in audit['legal_candidate_ids']))
        self.assertTrue(any('person_placement_limit_used' in x['reason_codes']
                            for x in audit['enumeration_units']))

    def test_four_routes_continue_only_from_complete_current_audits(self):
        results=extension.run_all(self.inputs)
        self.assertEqual(set(results),set(self.inputs['stops']))
        for path,result in results.items():
            source=self.inputs['stops'][path]
            self.assertEqual(result['source_stop_sha256'],extension.SOURCE_SHA[path])
            self.assertGreaterEqual(result['last_valid_event_seq'],source['last_valid_event_seq'])
            self.assertTrue(result['audits'][0]['candidate_set_complete'])
            self.assertFalse(result['counts_as_independent_balance_sample'])
            self.assertIn(result['status'],('stopped_rules_adjudication','completed'))

    def test_incomplete_one_route_stays_put_while_others_continue(self):
        from unittest import mock
        original=extension._expected
        def incomplete(view,table):
            if view['actor']=='B' and view['players']['B']['growth']==20 and \
                    'B-011#1' in view['players']['B']['hand']:
                raise ValueError('missing_candidate_id_grammar: injected unknown')
            return original(view,table)
        with mock.patch.object(extension,'_expected',incomplete):
            results=extension.run_all(self.inputs)
        self.assertEqual(results['order-01-a-first']['last_valid_event_seq'],
                         self.inputs['stops']['order-01-a-first']['last_valid_event_seq'])
