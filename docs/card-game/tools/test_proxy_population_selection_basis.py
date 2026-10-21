"""Conditional computation proofs are not source or legality certification."""
import copy,unittest
try:import proxy_population_selection_basis as api
except ImportError:api=None

class SelectionBasisTests(unittest.TestCase):
 def test_normal_requires_actual_existing114_comparison_not_unique_label(self):
  self.assertIsNotNone(api)
  # Abstract comparison arithmetic only; these are not card value assignments.
  scores=[dict(candidate_id=i,avoid_loss_or_abort=0,maintain_or_prevent_100=0,certain_growth_difference=v,time_after_certain_resolution=0) for i,v in [('pass',0),('action',1)]]
  r=dict(policy_id='legacy_107_114_116',context=dict(decision_kind='normal_action'),selected_candidate='action',choice=dict(selected_candidate='action',resolution_mode='priority_unique'),problem=dict(legal_candidate_ids=['action','pass'],candidates=scores),inventory=dict(legal_candidate_ids=['action','pass']))
  self.assertTrue(api.audit(r)['selection_computation_verified'])
  for mutate in (lambda x:x.update(problem=None),lambda x:x['problem']['candidates'][1].update(certain_growth_difference=None),lambda x:x['problem']['candidates'][1].update(certain_growth_difference=0),lambda x:x['choice'].update(strategic_unresolved=True),lambda x:x.update(selected_candidate='pass')):
   bad=copy.deepcopy(r);mutate(bad);out=api.audit(bad)
   self.assertFalse(out['selection_computation_verified']);self.assertIsNone(out['balance_admitted'])
  self.assertFalse(api.audit(r)['legality_proven']);self.assertFalse(api.audit(r)['strategic_optimality_proven'])

 def test_safe_placement_needs_certificate_and_paid_exclusion(self):
  self.assertIsNotNone(api)
  from test_proxy_normal_decision_fallback_contract import safe_placement,placement_context
  from proxy_normal_decision_fallback_contract import resolve_safe_free_development
  cert=safe_placement();ids=sorted(['pass',cert['candidate_id']]);context=placement_context()
  choice=resolve_safe_free_development([cert],context,ids)
  scores=[dict(candidate_id=i,avoid_loss_or_abort=0,maintain_or_prevent_100=0,certain_growth_difference=0,time_after_certain_resolution=0) for i in ids]
  r=dict(policy_id='legacy_107_114_116',context=context,selected_candidate=choice['selected_candidate'],choice=choice,inventory=dict(legal_candidate_ids=ids),problem=dict(legal_candidate_ids=ids,candidates=scores,pairs=[dict(safe_placement=cert)]))
  self.assertTrue(api.audit(r)['selection_computation_verified'])
  for row_index in range(2):
   bad=copy.deepcopy(r);bad['problem']['candidates'][row_index]['avoid_loss_or_abort']=1
   self.assertFalse(api.audit(bad)['selection_computation_verified'])
  bad=copy.deepcopy(r);bad['problem']['pairs']=[]
  self.assertFalse(api.audit(bad)['selection_computation_verified'])
  bad=copy.deepcopy(r);bad['inventory']['legal_candidate_ids'].append('paid');bad['inventory']['legal_candidate_ids'].sort();bad['problem']['legal_candidate_ids']=bad['inventory']['legal_candidate_ids'];bad['problem']['candidates'].append(dict(scores[0],candidate_id='paid'))
  self.assertFalse(api.audit(bad)['selection_computation_verified'])

 def test_response_requires_existing119_computation_and_complete_record(self):
  self.assertIsNotNone(api)
  import proxy_response_window_seeded_restart as response
  chance=dict(actor='A',legal_candidate_ids=['response-pass'],legal_candidate_details=[dict(candidate_id='response-pass',action_type='response_pass')],candidate_set_complete=True,forbidden_information_used=[],response_context=dict(response_opportunity_index=1))
  r=response.resolve_response_choice(dict(order_id='unit-only',actor_turn_index=1,round=1),chance)
  self.assertTrue(api.audit(r)['selection_computation_verified'])
  bad=copy.deepcopy(r);bad['selected_action']['candidate_id']='different'
  self.assertFalse(api.audit(bad)['selection_computation_verified'])
  self.assertFalse(api.audit(dict(decision_kind='response_action',resolution_mode='response_unique'))['selection_computation_verified'])

if __name__=='__main__':unittest.main()
