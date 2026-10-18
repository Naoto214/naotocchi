import copy,unittest
from test_proxy_mandatory_population_input import bundle
import proxy_population_runtime as runtime
try:import proxy_population_connected_entry as api
except ImportError:api=None

class EntryTests(unittest.TestCase):
 def test_source_read_failure_releases_entry_lock(self):
  from unittest.mock import patch
  try:
   with patch.object(api,'fingerprint',side_effect=OSError('source unreadable')):
    with self.assertRaises(OSError):api.reconstruct({},'unused',1)
   self.assertFalse(api._LOCK.locked())
  finally:
   if api._LOCK.locked():api._LOCK.release()
 def test_manifest_entry_rejects_unproved_end_dispatch_despite_empty_errors(self):
  from unittest.mock import patch
  import proxy_population_end_dispatch as dispatch
  native=dispatch.audit;seen=[]
  def missing(*args,**kwargs):
   result=native(*args,**kwargs)
   if result['applicable']:
    self.assertTrue(result['supplied_end_dispatch_verified'],result)
    result['supplied_end_dispatch_verified']=False
    result['unproved']=['prior_end_window_outside_supplied_trace'];seen.append(True)
   return result
  with patch.object(dispatch,'audit',missing):
   with self.assertRaisesRegex(ValueError,'end dispatch obligations'):
    api.reconstruct(bundle(),'test-1A',10)
  self.assertTrue(seen)
  self.assertFalse(api._LOCK.locked())
 def test_manifest_row_reaches_connected_backend_and_exact_reconstruction(self):
  self.assertIsNotNone(api,'manifest-connected current backend absent')
  b=bundle();original=runtime.segment;r=api.reconstruct(b,'test-1A',10)
  self.assertIs(runtime.segment,original);self.assertEqual(r['runtime']['connection_revision'],'conditional_challenge_and_effect_application_474')
  self.assertTrue(r['origin_journal']);self.assertEqual(r['binding']['match_id'],'test-1A');self.assertEqual(api.audit(r,b,'test-1A',10),[])
  bad=copy.deepcopy(r);bad['runtime']['events'][0]['seq']+=1;self.assertTrue(api.audit(bad,b,'test-1A',10));self.assertFalse(r['ready_for_execution']);self.assertFalse(r['input_lock_verified'])
  joined=r['end_dispatch_obligation_audit'];self.assertTrue(joined['supplied_end_dispatch_obligations_joined']);self.assertEqual(joined['end_dispatch_count'],1);self.assertFalse(joined['all_rule_opportunities_proven']);self.assertIsNone(joined['policy_eligible'])
  for mode in ('omit','duplicate','hash','before','applicability','bool','unproved'):
   changed=copy.deepcopy(r);proofs=changed['runtime']['supported_trigger_coverage']['end_dispatch_audits'];row=proofs[0]
   if mode=='omit':proofs.pop()
   elif mode=='duplicate':proofs.append(copy.deepcopy(row))
   elif mode=='hash':row['event_sha256']='0'*64
   elif mode=='before':row['before_envelope_sha256']='0'*64
   elif mode=='applicability':row['applicable']=True;row['supplied_end_dispatch_verified']=True
   elif mode=='bool':row['applicable']=0
   else:row['unproved']=['unproved']
   with self.subTest(mode=mode):
    with self.assertRaisesRegex(ValueError,'end dispatch obligations'):api.end_dispatch.require_actual_trace(changed)


if __name__=='__main__':unittest.main()
