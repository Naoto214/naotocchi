"""Catch unsupported seed records, frontier forgery and scope confusion."""
import copy
import unittest
import proxy_normal_decision_fallback_contract as fallback
import proxy_resource_value_selection as selection
from test_proxy_resource_value_comparison import problem_for, REL

def selection_problem():
    p=problem_for([10,7],{**REL,'board':'worse'})
    p['candidate_set_evidence'].update(source_ref='unit-known-facts',state_ref='visible:'+p['view_sha256'],enumeration_rule='unit-complete-two-candidates')
    p['seed_context']=dict(contract_version=fallback.CONTRACT_VERSION,order_id='order-unit',actor='A',actor_turn_index=1,round=1,phase='normal_action',decision_kind='normal_action',choice_kind='normal_action')
    return p

class ResourceSelectionTests(unittest.TestCase):
    def test_seeded_frontier_delegates_to_116(self):
        p=selection_problem();w=selection.select_problem(p);d=w['decision_record']
        self.assertEqual(d['seeded_fallback_candidates'],['a','b'])
        self.assertTrue(d['strategic_unresolved'])
        self.assertEqual(fallback.validate_seeded_resolution(d),[])
        self.assertEqual(selection.validate_selection(w,p),[])

    def test_wrapper_recomputes_frontier_before_accepting_selection(self):
        p=selection_problem();w=selection.select_problem(p)
        mutations=[lambda x:x['frontier_report'].update(frontier_ids=['a']),
            lambda x:x.update(selected_candidate='not-legal'),
            lambda x:x['decision_record']['seed_proof'].update(sha256='0'*64),
            lambda x:x['decision_record'].update(runner_up_candidates=[]),
            lambda x:x.update(problem_sha256='0'*64),
            lambda x:x.update(policy_id='legacy_107_114_116')]
        for mutation in mutations:
            q=copy.deepcopy(w);mutation(q)
            self.assertTrue(selection.validate_selection(q,p))

    def test_unique_selection_has_no_seed_record(self):
        p=selection_problem();p['pairs'][0]['relations']['board']='better'
        w=selection.select_problem(p)
        self.assertEqual(w['selected_candidate'],'a')
        self.assertIsNone(w['decision_record'])
        self.assertEqual(w['selection_basis'],'resource_pareto_unique')

    def test_general_frontier_not_safe_context(self):
        w=selection.select_problem(selection_problem());d=w['decision_record']
        self.assertEqual(d['seed_context']['choice_kind'],'normal_action_resource_frontier')
        self.assertNotIn('pass_dominated',d)
        self.assertNotIn('policy_id',d)

    def test_choice_kind_difference_is_recorded(self):
        p=selection_problem();old=fallback.build_seed_proof(p['seed_context'],['a','b'])
        w=selection.select_problem(p)
        self.assertNotEqual(old['seed_material'],w['decision_record']['seed_proof']['seed_material'])
        self.assertEqual(p['seed_context']['choice_kind'],'normal_action')

    def test_structural_error_cannot_produce_seeded_choice(self):
        p=selection_problem();p['pairs'].clear()
        with self.assertRaises(ValueError):selection.select_problem(p)

    def test_wrapper_input_and_output_isolation(self):
        p=selection_problem();before=copy.deepcopy(p);w=selection.select_problem(p)
        w['decision_record']['legal_candidates'].clear()
        self.assertEqual(p,before)
        self.assertEqual(selection.select_problem(p)['decision_record']['legal_candidates'],['a','b'])

    def test_context_and_evidence_must_be_valid_even_for_unique_choice(self):
        p=selection_problem();p['pairs'][0]['relations']['board']='better'
        p['seed_context']['actor']='C'
        with self.assertRaises(ValueError):selection.select_problem(p)
        p=selection_problem();p['candidate_set_evidence']['source_ref']=''
        with self.assertRaises(ValueError):selection.select_problem(p)
