"""Current107 composition cannot discard native-outside responsibilities."""
import copy,unittest
from unittest.mock import patch
from pathlib import Path
from test_proxy_mandatory_population_input import bundle
import proxy_population_connected_entry as entry
import proxy_population_trace_obligations as trace
try:import proxy_population_source_responsibilities as api
except ImportError:api=None

class SourceResponsibilitiesTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'current107 responsibility composition absent')
 def test_pinned_existing_table_exactly_covers_catalog_and_supplemental_roles(self):
  rows=api.responsibilities();self.assertEqual(len(rows),41)
  self.assertEqual(rows['G-air-hockey']['primary'],'quick');self.assertEqual(rows['G-air-hockey']['additional'],['hand_timing','typed_stat'])
  self.assertEqual(rows['P-cliff_goat']['primary'],'latched');self.assertEqual(rows['P-cliff_goat']['additional'],['typed_payment'])
  read=Path.read_bytes
  def changed(path):return read(path)+b'\n' if path==api.ROOT/api.TABLE else read(path)
  with patch.object(Path,'read_bytes',changed),self.assertRaisesRegex(ValueError,'responsibility source changed'):api.responsibilities()
 def test_real_negative_relationship_scan_uses_fresh_nested_reference(self):
  from test_proxy_population_relationship_predicates import relationship
  from test_proxy_population_runtime import initial
  import proxy_population_runtime as runtime
  import proxy_population_challenge_window as connected
  import proxy_population_trigger_existing as existing
  def run(forced):
   e,h,o=relationship();h[0]['action_type']='relationship_progress'
   scan=existing.ExistingAdapter(h).proof(e,3)
   row=next(r for r in scan['classifications'] if r['source_instance_id']==o['source_instance_id'])
   self.assertNotIn('source_reference',row['proof'])
   table=api.responsibilities()
   coverage=dict(source_scope=dict(native=sorted(c for c,r in table.items() if r['primary']=='native'),latched=sorted(c for c,r in table.items() if r['primary']=='latched'),hand_optional=['G-air-hockey'],start_catalog_sha256=api.starts.CATALOG_SHA),initial_source_collection=scan,native_source_collections=[],typed_effect_creation_audits=[],typed_effect_expiry_audits=[],payment_consumption_audits=[],challenge_lifetime_audits=[])
   record=dict(runtime=dict(source_envelope=e,steps=[],supported_trigger_coverage=coverage),trace_obligations_audit={})
   # Isolate the source scan join with a real conditional P-cat_ceo boundary;
   # this fixture does not claim an authenticated initial/full trace.
   with patch.object(trace,'require_actual_trace',return_value={}):
    self.assertEqual(api.audit(record)['errors'],[])
    row['proof']['current_predicate_audit']['source_reference']='foreign'
    self.assertTrue(api.audit(record)['errors'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)
 def test_actual_entry_requires_fresh_join_and_rejects_scope_or_boundary_loss(self):
  record=entry.reconstruct(bundle(),'test-1A',18);proof=record['source_responsibility_audit']
  self.assertIs(proof['current107_responsibilities_joined'],True);self.assertEqual(proof['errors'],[])
  self.assertEqual(proof['source_count'],41);self.assertEqual(proof['boundary_count'],record['trace_obligations_audit']['transition_count']+1)
  self.assertFalse(proof['saved_proofs_authenticated']);self.assertFalse(proof['all_future_executions_proven']);self.assertIsNone(proof['balance_admitted'])
  for mode in ('native_scope','latched_scope','hand_scope','catalog','trace','boundary','outside_card','outside_omit','typed_hash','typed_omit'):
   bad=copy.deepcopy(record);c=bad['runtime']['supported_trigger_coverage']
   if mode.endswith('_scope'):c['source_scope'][{'native_scope':'native','latched_scope':'latched','hand_scope':'hand_optional'}[mode]]=[]
   elif mode=='catalog':c['source_scope']['start_catalog_sha256']='0'*64
   elif mode=='trace':bad['trace_obligations_audit']['fresh_trace_responsibilities_joined']=False
   elif mode=='boundary':c['native_source_collections'][0]['current_envelope_sha256']='0'*64
   elif mode.startswith('outside'):
    item=next(p for p in c['native_source_collections'] if p['unproved_sources'])
    if mode=='outside_card':item['unproved_sources'][0]['card_id']='foreign'
    else:item['unproved_sources'].pop()
   elif mode=='typed_hash':c['typed_effect_creation_audits'][0]['before_envelope_sha256']='0'*64
   else:c['typed_effect_creation_audits'].pop()
   with self.subTest(mode=mode):self.assertTrue(api.audit(bad)['errors'])
  native=api.audit
  def unproved(record):
   out=native(record);out['current107_responsibilities_joined']=False;return out
  with patch.object(api,'audit',unproved),self.assertRaisesRegex(ValueError,'actual source responsibilities'):entry.reconstruct(bundle(),'test-1A',3)

if __name__=='__main__':unittest.main()
