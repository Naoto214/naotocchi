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

 def test_actual_trace_obligations_bind_every_boundary_and_preserve_gaps(self):
  from proxy_population_trace_obligations import require_actual_trace,ROOT_PROOFS
  record=entry.reconstruct(bundle(),'test-1A',10)
  joined=record['trace_obligations_audit'];self.assertTrue(joined['fresh_trace_responsibilities_joined'])
  self.assertEqual(joined['step_count'],10);self.assertEqual(sum(joined['step_counts'].values()),10)
  self.assertFalse(joined['all_rule_opportunities_proven']);self.assertFalse(joined['information_use_proven']);self.assertFalse(joined['comparison_operand_provenance_verified']);self.assertFalse(joined['preflight_ready']);self.assertIsNone(joined['policy_eligible'])
  for key in ROOT_PROOFS:
   changed=copy.deepcopy(record);del changed[key]
   with self.subTest(missing=key),self.assertRaisesRegex(ValueError,'trace obligations'):require_actual_trace(changed)
  for field in ('initial_game_state_sha256','final_envelope_sha256'):
   changed=copy.deepcopy(record);changed['initial_obligation_audit'][field]='0'*64
   with self.subTest(initial_binding=field),self.assertRaisesRegex(ValueError,'trace obligations'):require_actual_trace(changed)
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
