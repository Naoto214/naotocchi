"""Current ordinary entries and exported decisions, conditional on input state."""
import copy,unittest
from test_proxy_mandatory_population_input import bundle
import proxy_population_connected_entry as connected
try:import proxy_population_decision_binding as api
except ImportError:api=None

def audit(step,order):
 import proxy_continuation_payments as payments
 with payments.scope():return api.audit_step(step,order)

class BindingTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.record=connected.reconstruct(bundle(),'test-1A',4)
 def test_each_ordinary_entry_binds_identity_selection_and_all_transition_hashes(self):
  self.assertIsNotNone(api)
  for step in self.record['runtime']['steps']:
   proof=audit(step,'test-1')
   self.assertTrue(proof['entry_and_transition_binding_verified'],proof['errors'])
   self.assertFalse(proof['complete_legal_set_proven']);self.assertFalse(proof['effect_semantics_proven'])
   for mutate in (
    lambda b:b['events'][0].update(selected_candidate='wrong'),
    lambda b:b['events'][0].update(envelope_before_sha256='0'*64),
    lambda b:b['events'][0].update(game_state_after_sha256='0'*64),
    lambda b:b['decision']['selected_action'].update(candidate_id='wrong'),
    lambda b:b['snapshots'][0].update(continuation_state={}),
    lambda b:b.update(final_envelope=copy.deepcopy(b['source_envelope']))):
    bad=copy.deepcopy(step);mutate(bad)
    self.assertFalse(audit(bad,'test-1')['entry_and_transition_binding_verified'])
   if 'context' in step['decision']:self.assertFalse(audit(step,'different-order')['entry_and_transition_binding_verified'])
 def test_context_relabel_and_inventory_projection_differ(self):
  self.assertIsNotNone(api)
  for step in self.record['runtime']['steps']:
   bad=copy.deepcopy(step);d=bad['decision']
   context=d['context'] if 'context' in d else d
   context['phase']='turn_end'
   self.assertFalse(audit(bad,'test-1')['entry_and_transition_binding_verified'])
   bad=copy.deepcopy(step);d=bad['decision']
   if 'context' in d:d['choice']['selected_candidate']='wrong'
   else:d['legal_candidate_ids']=[]
   self.assertFalse(audit(bad,'test-1')['entry_and_transition_binding_verified'])
 def test_native_priority_choice_and_all_seed_coordinates(self):
  normal=next(copy.deepcopy(s) for s in self.record['runtime']['steps'] if 'context' in s['decision'])
  # Conditional schema test, not a claim that this fixture has a unique winner.
  normal['decision']['choice']=dict(selected_candidate=normal['decision']['selected_candidate'],resolution_mode='priority_unique')
  self.assertTrue(audit(normal,'test-1')['entry_and_transition_binding_verified'])
  original=next(copy.deepcopy(s) for s in self.record['runtime']['steps'] if 'context' in s['decision'])
  self.assertIsNotNone(original['decision']['choice']['seed_context'])
  original['decision']['choice']['seed_context']['choice_kind']='invented-subchoice'
  self.assertFalse(audit(original,'test-1')['entry_and_transition_binding_verified'])
  import proxy_response_window_contract as response
  entry=next(copy.deepcopy(s) for s in self.record['runtime']['steps'] if s['decision'].get('decision_kind')=='response_action')
  d=entry['decision'];ctx=entry['source_envelope']['legacy_continuation']['response_context'];g=entry['source_envelope']['legacy_continuation']['game_state']
  seed=dict(contract_version=response.CONTRACT_VERSION,order_id='test-1',actor=d['actor'],actor_turn_index=g['round'],round=g['round'],origin_event_seq=ctx['origin_event_seq'],response_opportunity_index=ctx['response_opportunity_index'],phase=ctx['phase'],decision_kind=ctx['decision_kind'],choice_kind=ctx['choice_kind'])
  # Only identity binding is tested; supplied coordinates do not certify selection.
  d['seed_context']=seed
  self.assertTrue(audit(entry,'test-1')['entry_and_transition_binding_verified'])
  for field in seed:
   bad=copy.deepcopy(entry);value=bad['decision']['seed_context'][field]
   bad['decision']['seed_context'][field]=value+1 if type(value) is int else 'wrong'
   self.assertFalse(audit(bad,'test-1')['entry_and_transition_binding_verified'],field)
 def test_connected_entries_export_the_verified_binding(self):
  for step in self.record['runtime']['steps']:
   self.assertTrue(step['ordinary_entry_binding']['entry_and_transition_binding_verified'])
  self.assertTrue(self.record['decision_projection_audit']['decision_projection_verified'])
 def test_exported_decisions_are_exact_step_projection(self):
  self.assertIsNotNone(api)
  result=self.record['runtime']
  self.assertTrue(api.audit_projection(result)['decision_projection_verified'])
  for mutate in (lambda b:b['decisions'].pop(),lambda b:b['decisions'].reverse(),lambda b:b['decisions'].append(copy.deepcopy(b['decisions'][0]))):
   bad=copy.deepcopy(result);mutate(bad)
   self.assertFalse(api.audit_projection(bad)['decision_projection_verified'])
if __name__=='__main__':unittest.main()
