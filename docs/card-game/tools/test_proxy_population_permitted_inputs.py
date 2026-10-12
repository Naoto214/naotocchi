"""Fresh read-responsibility bindings, not universal noninterference."""
import copy,unittest
from unittest.mock import patch
from test_proxy_mandatory_population_input import bundle
import proxy_population_connected_entry as entry
try:import proxy_population_permitted_inputs as api
except ImportError:api=None

class PermittedInputsTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'permitted input composition absent')
 def test_actual_entry_requires_bound_read_responsibilities(self):
  record=entry.reconstruct(bundle(),'test-1A',18);p=record['permitted_input_audit']
  self.assertTrue(p['current_permitted_inputs_joined']);self.assertEqual(p['errors'],[])
  self.assertEqual(p['step_count'],18);self.assertGreater(p['resolution_count'],0)
  self.assertFalse(p['universal_noninterference_proven']);self.assertIsNone(p['balance_admitted'])
  for mode in ('source','history','comparison','resolution_absent','resolution_hash','resolution_false','resolution_extra'):
   bad=copy.deepcopy(record);steps=bad['runtime']['steps']
   normal=next(s for s in steps if 'normal_allowed_history' in s)
   resolving=next(s for s in steps if 'resolution_choice_input_binding' in s)
   if mode=='source':bad['source_responsibility_audit']['current107_responsibilities_joined']=False
   elif mode=='history':normal.pop('normal_allowed_history')
   elif mode=='comparison':normal.pop('normal_comparison_evidence')
   elif mode=='resolution_absent':resolving.pop('resolution_choice_input_binding')
   elif mode=='resolution_hash':resolving['resolution_choice_input_binding']['entry_envelope_sha256']='0'*64
   elif mode=='resolution_false':resolving['resolution_choice_input_binding']['choice_inputs_bound']=False
   else:next(s for s in steps if 'resolution_choice_input_binding' not in s)['resolution_choice_input_binding']=copy.deepcopy(resolving['resolution_choice_input_binding'])
   with self.subTest(mode=mode):self.assertTrue(api.audit(bad)['errors'])
  native=api.audit
  def unproved(r):
   p=native(r);p['current_permitted_inputs_joined']=False;return p
  with patch.object(api,'audit',unproved),self.assertRaisesRegex(ValueError,'actual permitted inputs'):entry.reconstruct(bundle(),'test-1A',3)
 def test_sequential_address_uses_actual_group_and_ordinal_not_state_hash(self):
  from test_proxy_population_start_obligations import fixture,opened
  from test_proxy_population_runtime import initial
  import proxy_population_start_obligations as starts
  import proxy_population_opportunity_ledger as ledger
  import proxy_population_trigger_sequential as sequential
  import proxy_population_runtime as runtime
  def run(forced):
   e,actor,source=fixture();o=opened(e,actor)
   journal=ledger.observe(ledger.create(actor),starts.collect(starts.capture(e),o)['occurrences'],'empty')
   record=sequential.step(o,initial(),journal,sequential.StartAdapter())
   api.require_sequential(record,initial())
   for mode in ('state','actor','exclusion','inventory'):
    bad=copy.deepcopy(record)
    if mode=='state':bad['decision']['seed_context']['choice_kind']='trigger_group_next_action_A:'+bad['before_envelope_sha256']
    elif mode=='actor':bad['decision']['seed_context']['actor']='B' if actor=='A' else 'A'
    elif mode=='exclusion':bad['excluded_by_116']=False
    else:bad['inventory']['legal_candidate_ids'].pop()
    with self.subTest(mode=mode),self.assertRaises(ValueError):api.require_sequential(bad,initial())
   return {}
  runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
