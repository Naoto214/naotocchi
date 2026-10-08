"""Response source predicates must compose without discarding real gaps."""
import copy,unittest
import proxy_population_connected_entry as connected
from test_proxy_mandatory_population_input import bundle
try:import proxy_population_response_composition as api
except ImportError:api=None

NAMES=('response_hand_predicates','response_reaction_predicates','response_board_predicates','response_prepared_predicates')
def inputs(step):
 return step['source_envelope'],step['decision']['candidate_set_evidence'],{name:step[name] for name in NAMES}

class ResponseCompositionTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  if api is not None:cls.record=connected.reconstruct(bundle(),'test-1A',4)
 def setUp(self):self.assertIsNotNone(api,'response source predicate composition absent')
 def test_real_reaction_complements_hand_but_actual_board_gap_remains(self):
  steps=[s for s in self.record['runtime']['steps'] if 'response_hand_predicates' in s]
  first=api.audit(*inputs(steps[0]));self.assertEqual(first['errors'],[]);self.assertTrue(first['supplied_response_source_predicates_covered']);self.assertTrue(steps[0]['response_hand_predicates']['unproved_sources']);self.assertFalse(first['complete_legal_set_proven']);self.assertFalse(first['caller_proofs_authenticated'])
  last=api.audit(*inputs(steps[-1]));self.assertEqual(last['errors'],[]);self.assertFalse(last['supplied_response_source_predicates_covered']);self.assertTrue(last['unproved_source_ids'])
  for step in steps:self.assertEqual(step['response_source_predicate_coverage'],api.audit(*inputs(step)))
 def test_missing_family_failed_duplicate_foreign_and_reaction_omission(self):
  step=next(s for s in self.record['runtime']['steps'] if 'response_hand_predicates' in s);e,inv,proofs=inputs(step)
  for mode in ('family','failed','false','duplicate','foreign','missing_reaction','schema','actor'):
   bad=copy.deepcopy(proofs);op=copy.deepcopy(inv)
   if mode=='family':bad.pop('response_reaction_predicates')
   elif mode=='failed':bad['response_hand_predicates']['errors']=['failed']
   elif mode=='false':bad['response_hand_predicates']['response_hand_predicates_verified']=False
   elif mode=='duplicate':bad['response_hand_predicates']['verified_source_ids']+=bad['response_reaction_predicates']['verified_source_ids']
   elif mode=='foreign':bad['response_hand_predicates']['verified_source_ids'].append('foreign')
   elif mode=='missing_reaction':bad['response_reaction_predicates']['verified_source_ids']=[]
   elif mode=='schema':bad['response_board_predicates']['schema']='unknown'
   else:op['actor']='B' if op['actor']=='A' else 'A'
   with self.subTest(mode=mode):self.assertFalse(api.audit(e,op,bad)['supplied_response_source_predicates_covered'])
 def test_empty_board_does_not_allow_a_missing_audit_family(self):
  step=next(s for s in self.record['runtime']['steps'] if 'response_hand_predicates' in s);e,inv,proofs=inputs(step);bad=copy.deepcopy(proofs);bad.pop('response_board_predicates')
  self.assertTrue(api.audit(e,inv,bad)['errors'])

 def test_real_prepared_sources_and_foreign_equipment_are_not_conflated(self):
  from test_proxy_population_equipment_predicates import equipment
  from test_proxy_population_runtime import initial
  import proxy_population_runtime as runtime
  import proxy_population_challenge_window as window
  import proxy_population_paid_draw as paid
  import proxy_continuation_quick as quick
  import proxy_population_response_predicates as response
  import proxy_population_board_predicates as board
  import proxy_population_prepared_predicates as prepared
  def run(forced):
   with paid.scope():
    for owner in ('A','B'):
     e,h,gear,hidden=equipment(owner=owner);inv=quick.actions.response_inventory(e,initial(),h)
     proofs=dict(response_hand_predicates=response.audit(e,h,inv),response_reaction_predicates=response.audit_reactions(e,inv),response_board_predicates=board.audit_response(e,h,inv),response_prepared_predicates=prepared.audit(e,h,inv))
     result=api.audit(e,inv,proofs);self.assertEqual(result['errors'],[]);self.assertIn(hidden,result['source_audit_families']);self.assertEqual(gear in result['source_audit_families'],owner=='A')
     self.assertEqual(result['supplied_response_source_predicates_covered'],owner=='B')
     bad=copy.deepcopy(proofs);bad['response_prepared_predicates']['verified_preparations']*=2;self.assertTrue(api.audit(e,inv,bad)['errors'])
   return {}
  with window.contract_scope():runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
