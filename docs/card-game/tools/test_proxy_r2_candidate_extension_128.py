import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parent))
import proxy_r2_candidate_extension_128 as extension


class R2Extension128Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=Path(__file__).resolve().parents[1]/'data'
        cls.stops={p:json.loads((cls.data/'proxy-r2-candidate-stops-127'/f'stop-127-{p}.json').read_text())
                   for p in extension.SOURCE_SHA}
        cls.table=json.loads((cls.data/'proxy-normal-decision-candidate-table-114-20260918.json').read_text())

    def test_board_classification_is_source_bound_and_requires_registration(self):
        view=extension.extension_127.extension_125.project(self.stops['order-01-b-first'])
        units=extension.expand_units(view,self.table)
        box=[u for u in units if u['source_family']=='board_card_action']
        self.assertEqual(len(box),2)
        self.assertEqual([(u['card_id'],u['candidate_variant']) for u in box],
                         [('C-box','none'),('P-cat_ceo','past_trigger')])
        other=copy.deepcopy(view)
        other['cards']['B-012#1']['card_id']='C-unclassified'
        with self.assertRaisesRegex(ValueError,'unresolved_canonical_predicate'):
            extension.expand_units(other,self.table)

    def test_targetless_world_id_and_target_validation(self):
        view=extension.extension_127.extension_125.project(self.stops['order-02-a-first'])
        audit=extension.audit_current(self.stops['order-02-a-first'],self.table)
        self.assertTrue(audit['candidate_set_complete'])
        unit=next(x for x in audit['legal_candidate_details'] if x['action_type']=='place_world')
        self.assertEqual(unit['candidate_id'],'candidate-place_world-A-020#1')
        self.assertEqual(unit['target_instance_ids'],[])
        self.assertEqual(len(audit['completeness_checks']),12)
        self.assertTrue(all(audit['completeness_checks'].values()))
        damaged=copy.deepcopy(audit);damaged['legal_candidate_ids'].remove(unit['candidate_id'])
        self.assertFalse(extension._checks(damaged,view,self.table)['legal_candidate_projection_exact'])
        forged=copy.deepcopy(unit);forged['target_instance_ids']=['A-014#1']
        with self.assertRaisesRegex(ValueError,'missing_candidate_id_grammar'):
            extension.targetless_id(view,forged)

    def test_mixed_priority_retains_all_and_selects_safe_placement(self):
        route=self.stops['order-02-b-first']
        audit=extension.audit_current(route,self.table)
        self.assertTrue(audit['candidate_set_complete'])
        decision=extension.compare_mixed(route,audit,self.table)
        self.assertEqual(len(decision['legal_candidates']),4)
        self.assertEqual(decision['selected_candidate'],'candidate-place-partner-B-017#1')
        self.assertEqual(decision['resolution_mode'],'safe_free_development')
        self.assertEqual(decision['priority_basis']['time_after_certain_resolution'][
            'candidate-attach_item-B-032#1-target-B-014#1'],0)

    def test_board_turn_end_registry_is_scoped(self):
        original=extension.current_126.restart_124.contract_123.BOARD_REGISTRY.copy()
        with extension.board_turn_end_registry():
            self.assertEqual(extension.current_126.restart_124.contract_123.BOARD_REGISTRY['C-box'][0],'none')
        self.assertEqual(extension.current_126.restart_124.contract_123.BOARD_REGISTRY,original)

    def test_paid_comparison_does_not_credit_conditional_future_effect(self):
        route=self.stops['order-01-a-first']
        audit=extension.audit_current(route,self.table)
        decision=extension.compare_paid_to_pass(route,audit,self.table)
        self.assertEqual(decision['selected_candidate'],'pass')
        self.assertEqual(len(decision['legal_candidates']),4)

    def test_variant_ids_only_for_multiple_legal_targetless_variants(self):
        route=json.loads((self.data/'proxy-r2-candidate-stops-128'/'stop-128-order-01-a-first.json').read_text())
        view=extension.extension_125.project(route)
        units=extension.adjudicate_units(view,extension.expand_units(view,self.table))
        guesses=[u for u in units if u['source_instance_id']=='A-001#1' and u['disposition']=='admitted']
        self.assertEqual(len(guesses),7)
        self.assertEqual({u['candidate_id'] for u in guesses},
                         {f'candidate-use_play-A-001#1-{variant}' for variant in
                          ('main','companion','partner','world','play','item','event')})
        self.assertEqual(len({u['candidate_id'] for u in units if u['candidate_id']}),
                         sum(bool(u['candidate_id']) for u in units))

    def test_source_boundary_and_canonical_outputs(self):
        inputs=extension.load_sources(self.data)
        self.assertEqual(extension.check_outputs(self.data,inputs),[])


if __name__=='__main__':
    unittest.main()
