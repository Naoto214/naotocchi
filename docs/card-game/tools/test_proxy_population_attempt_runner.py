"""Single-attempt boundary tests; historical unit inputs only."""
import tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from test_proxy_mandatory_population_input import bundle
try:import proxy_population_attempt_runner as api
except ImportError:api=None

class AttemptRunnerTests(unittest.TestCase):
 def test_missing_external_reference_cannot_invoke_the_executor(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as d,patch.object(api.connected,'reconstruct',side_effect=AssertionError('must not execute')):
   with self.assertRaises(ValueError):api.run_after_external_approval({}, {}, {},Path(d),'unknown',3,Path(d)/'none','')
 def test_bad_local_lock_or_edition_cannot_invoke_the_executor(self):
  self.assertIsNotNone(api)
  with patch.object(api.connected,'reconstruct',side_effect=AssertionError('must not execute')),patch.object(api.lock,'verify_git_binding',return_value=dict(immutable_content_verified=False,errors=['test invalid lock'])):
   with self.assertRaises(ValueError):api.run_after_external_approval(bundle(),{}, {},api.ROOT.parents[1],'test-1A',3,api.ROOT/'data'/'never-run-test','test-only-reference')
  self.assertFalse((api.ROOT/'data'/'never-run-test').exists())
 def test_old_fixed_prefix_uses_real_backend_and_keeps_incomplete_record(self):
  self.assertIsNotNone(api)
  import gzip,json
  with tempfile.TemporaryDirectory() as d:
   root=Path(d)/'docs'/'card-game';(root/'data').mkdir(parents=True);out=root/'data'/'conditional-test'
   with patch.object(api,'ROOT',root),patch.object(api.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True,errors=[])),patch.object(api.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True,errors=[])),patch.object(api.edition,'verify',return_value=dict(local_edition_verified=True,errors=[])):
    report=api.run_after_external_approval(bundle(),{}, {},Path(d),'test-1A',3,out,'conditional-test-not-production-approval')
    record=json.loads(gzip.decompress((out/'record.json.gz').read_bytes()))
    self.assertFalse(record['completed']);self.assertEqual(record['binding']['match_id'],'test-1A')
    self.assertEqual(report['execution_status'],'incomplete');self.assertFalse(report['ready_for_execution']);self.assertFalse(report['input_lock_verified'])
    self.assertEqual(report['admission']['disposition'],'excluded')
    with patch.object(api.connected,'reconstruct',side_effect=AssertionError('do not overwrite')):
     with self.assertRaises(FileExistsError):api.run_after_external_approval(bundle(),{}, {},Path(d),'test-1A',3,out,'test-only-reference')
if __name__=='__main__':unittest.main()
