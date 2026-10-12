"""Fresh initial-entry joins; saved proof dictionaries are not credentials."""
import copy,unittest
from unittest.mock import patch
from test_proxy_mandatory_population_input import bundle
import proxy_population_connected_entry as entry
import proxy_population_timing_occurrence as timing
import proxy_population_automatic_binding as automatic

class TraceObligationsTests(unittest.TestCase):
 def test_initial_entry_requires_verified_timing_and_automatic_responsibilities(self):
  for module,name,flag in ((timing,'audit','supplied_timing_occurrences_verified'),(timing,'audit_hand','supplied_hand_timing_occurrences_verified'),(automatic,'audit_step','automatic_output_binding_verified')):
   native=getattr(module,name);seen=[]
   def unproved(*args,**kwargs):
    proof=native(*args,**kwargs);self.assertEqual(proof['errors'],[]);self.assertIs(proof[flag],True)
    proof[flag]=False;seen.append(True);return proof
   with self.subTest(flag=flag),patch.object(module,name,unproved):
    with self.assertRaisesRegex(ValueError,'trace obligations'):entry.reconstruct(bundle(),'test-1A',10)
   self.assertTrue(seen);self.assertFalse(entry._LOCK.locked())

 def test_initial_entry_requires_fresh_native_and_start_collection_binding(self):
  import proxy_population_trigger_existing as existing
  import proxy_population_trigger_coverage as coverage
  native=existing.ExistingAdapter.proof
  def unproved(adapter,*args,**kwargs):
   result=native(adapter,*args,**kwargs);result['current_collection_audit']['current_source_collection_bound']=False;return result
  with self.subTest(case='native_unproved'),patch.object(existing.ExistingAdapter,'proof',unproved),self.assertRaisesRegex(ValueError,'trace obligations'):entry.reconstruct(bundle(),'test-1A',10)
  audit=coverage.audit
  def missing(result,*args,**kwargs):
   proof=audit(result,*args,**kwargs);self.assertTrue(result['start_occurrence_proofs']);result['start_occurrence_proofs']=[];return proof
  with self.subTest(case='start_missing'),patch.object(coverage,'audit',missing),self.assertRaisesRegex(ValueError,'trace obligations'):entry.reconstruct(bundle(),'test-1A',10)

 def test_actual_trace_obligations_bind_every_boundary_and_preserve_gaps(self):
  from proxy_population_trace_obligations import require_actual_trace,ROOT_PROOFS
  record=entry.reconstruct(bundle(),'test-1A',10)
  joined=record['trace_obligations_audit'];self.assertTrue(joined['fresh_trace_responsibilities_joined'])
  self.assertEqual(joined['step_count'],10);self.assertEqual(sum(joined['step_counts'].values()),10)
  self.assertFalse(joined['all_rule_opportunities_proven']);self.assertFalse(joined['information_use_proven']);self.assertFalse(joined['comparison_operand_provenance_verified']);self.assertFalse(joined['preflight_ready']);self.assertIsNone(joined['policy_eligible'])
  collections=joined['source_collection_binding']
  self.assertIs(collections['fresh_source_collections_bound'],True)
  self.assertEqual(collections['native_scan_count'],joined['transition_count']+1)
  self.assertGreater(collections['start_scan_count'],0)
  self.assertFalse(collections['saved_proofs_authenticated']);self.assertFalse(collections['all_rule_opportunities_proven'])
  for mode in ('initial_missing','native_missing','native_duplicate','native_reorder','native_sequence','native_hash','native_audit_hash','native_scope','native_bool','native_count','start_missing','start_duplicate','start_capture_hash','start_final_hash','start_catalog','start_sequence','start_capture_sequence','start_owner','start_count','start_recorded_difference'):
   changed=copy.deepcopy(record);runtime=changed['runtime'];coverage=runtime['supported_trigger_coverage']
   natives=coverage['native_source_collections'];starts=coverage['start_source_collections']
   native=natives[0];start=starts[0]
   if mode=='initial_missing':del coverage['initial_source_collection']
   elif mode=='native_missing':natives.pop()
   elif mode=='native_duplicate':natives.append(copy.deepcopy(native))
   elif mode=='native_reorder':natives.reverse()
   elif mode=='native_sequence':native['origin_event_seq']+=1
   elif mode=='native_hash':native['current_envelope_sha256']='0'*64
   elif mode=='native_audit_hash':native['current_collection_audit']['current_envelope_sha256']='0'*64
   elif mode=='native_scope':native['current_collection_audit']['scope']='all'
   elif mode=='native_bool':native['current_collection_audit']['current_source_collection_bound']=1
   elif mode=='native_count':native['current_collection_audit']['public_source_count']+=1
   elif mode=='start_missing':starts.pop()
   elif mode=='start_duplicate':starts.append(copy.deepcopy(start))
   elif mode=='start_capture_hash':start['capture']['envelope_sha256']='0'*64
   elif mode=='start_final_hash':start['current_envelope_sha256']='0'*64
   elif mode=='start_catalog':start['source_catalog_sha256']='0'*64
   elif mode=='start_sequence':start['origin_event_seq']+=1
   elif mode=='start_capture_sequence':start['capture']['event_seq']+=1
   elif mode=='start_owner':start['capture']['turn_player']='wrong'
   elif mode=='start_count':start['classifications'].append({})
   elif mode=='start_recorded_difference':runtime['start_occurrence_proofs']=[]
   # Mutate both fresh and recorded copies to exercise actual boundary checks.
   if mode.startswith('start_') and mode!='start_recorded_difference':runtime['start_occurrence_proofs']=copy.deepcopy(starts)
   with self.subTest(collection=mode),self.assertRaisesRegex(ValueError,'trace obligations'):require_actual_trace(changed)
  for key in ROOT_PROOFS:
   changed=copy.deepcopy(record);del changed[key]
   with self.subTest(missing=key),self.assertRaisesRegex(ValueError,'trace obligations'):require_actual_trace(changed)
  for field in ('initial_game_state_sha256','final_envelope_sha256'):
   changed=copy.deepcopy(record);changed['initial_obligation_audit'][field]='0'*64
   with self.subTest(initial_binding=field),self.assertRaisesRegex(ValueError,'trace obligations'):require_actual_trace(changed)
  for field in ('opening_envelope_sha256','runtime_envelope_sha256'):
   changed=copy.deepcopy(record);changed['initial_runtime_root_audit'][field]='0'*64
   with self.subTest(runtime_root=field),self.assertRaisesRegex(ValueError,'trace obligations'):require_actual_trace(changed)
  for field,value in (('allowed_history_projection_verified',1),('entry_envelope_sha256','0'*64),('projected_history_sha256','0'*64),('raw_history_sha256','0'*64),('actor','unknown'),('event_count',-1)):
   changed=copy.deepcopy(record);normal=next(s for s in changed['runtime']['steps'] if s.get('normal_allowed_history'));normal['normal_allowed_history'][field]=value
   with self.subTest(normal_history=field),self.assertRaisesRegex(ValueError,'trace obligations'):require_actual_trace(changed)
  for mode in ('omit_timing','duplicate_timing','reorder_timing','timing_hash','hand_hash','catalog','scope','bool_flag','count','pending','coverage','ordinary_binding','source_inventory','expansion','automatic_handoff'):
   changed=copy.deepcopy(record);runtime=changed['runtime'];coverage=runtime['supported_trigger_coverage'];rows=coverage['timing_occurrence_audits'];row=rows[0]
   if mode=='omit_timing':rows.pop()
   elif mode=='duplicate_timing':rows.append(copy.deepcopy(row))
   elif mode=='reorder_timing':rows.reverse()
   elif mode=='timing_hash':row['event_sha256']='0'*64
   elif mode=='hand_hash':row['hand_timing_audit']['before_envelope_sha256']='0'*64
   elif mode=='catalog':row['source_catalog_sha256']='0'*64
   elif mode=='scope':row['scope']=[]
   elif mode=='bool_flag':row['supplied_timing_occurrences_verified']=1
   elif mode=='count':coverage['processing_order']['ordinary_response_count']+=1
   elif mode=='pending':coverage['pending_count']+=1
   elif mode=='coverage':coverage['covered']=False
   elif mode=='automatic_handoff':next(s for s in runtime['steps'] if 'automatic_output_binding' in s)['automatic_output_binding']['ordinary_opportunity_handoffs_verified']=False
   else:
    ordinary=next(s for s in runtime['steps'] if 'ordinary_entry_binding' in s)
    key='ordinary_entry_binding' if mode=='ordinary_binding' else 'decision_source_inventory' if mode=='source_inventory' else ('normal_candidate_expansions' if 'normal_candidate_expansions' in ordinary else 'response_candidate_expansions')
    del ordinary[key]
   with self.subTest(mode=mode),self.assertRaisesRegex(ValueError,'trace obligations'):require_actual_trace(changed)

if __name__=='__main__':unittest.main()
