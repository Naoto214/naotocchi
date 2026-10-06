import copy,unittest
from test_proxy_mandatory_population_input import bundle
import proxy_population_runtime as runtime
try:import proxy_population_connected_entry as api
except ImportError:api=None

class EntryTests(unittest.TestCase):
 def test_manifest_row_reaches_connected_backend_and_exact_reconstruction(self):
  self.assertIsNotNone(api,'manifest-connected current backend absent')
  b=bundle();original=runtime.segment;r=api.reconstruct(b,'test-1A',10)
  self.assertIs(runtime.segment,original);self.assertEqual(r['runtime']['connection_revision'],'conditional_challenge_and_effect_application_474')
  self.assertTrue(r['origin_journal']);self.assertEqual(r['binding']['match_id'],'test-1A');self.assertEqual(api.audit(r,b,'test-1A',10),[])
  bad=copy.deepcopy(r);bad['runtime']['events'][0]['seq']+=1;self.assertTrue(api.audit(bad,b,'test-1A',10));self.assertFalse(r['ready_for_execution']);self.assertFalse(r['input_lock_verified'])

if __name__=='__main__':unittest.main()
