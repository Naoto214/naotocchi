"""Mock child processes only; never a population run."""
import json,tempfile,unittest,gzip
from pathlib import Path
from unittest.mock import patch
from test_proxy_mandatory_population_input import bundle
from proxy_mandatory_policy_contract import canonical
try:import proxy_population_batch_supervisor as api
except ImportError:api=None

class SupervisorTests(unittest.TestCase):
 def test_next_row_is_never_launched_after_incomplete_or_failed_child(self):
  self.assertIsNotNone(api)
  for mode in ('incomplete','failure'):
   with self.subTest(mode=mode),tempfile.TemporaryDirectory() as d:
    root=Path(d)/'docs'/'card-game';(root/'data').mkdir(parents=True);out=root/'data'/'mock-batch';calls=[]
    def child(command,**kwargs):
     request=json.loads(kwargs['input']);calls.append(request['match_id'])
     self.assertTrue((out/'start.json').exists());self.assertEqual(command[1],'-I')
     if mode=='failure':raise OSError('synthetic child launch failure')
     target=Path(request['destination']);target.mkdir()
     status='completed' if len(calls)==1 else 'incomplete'
     raw=canonical(dict(schema='bound_population_connected_runtime.v1',binding=dict(match_id=request['match_id']),supplied_bundle_sha256=api.digest(canonical(request['bundle'])),completed=status=='completed'));compressed=gzip.compress(raw,mtime=0);(target/'record.json.gz').write_bytes(compressed)
     receipt=dict(schema='conditional_population_attempt_receipt.v1',match_id=request['match_id'],execution_status=status,source_reconstructed=True,record_sha256=api.digest(raw),compressed_sha256=api.digest(compressed),admission=dict(disposition='excluded'),external_approval_verified=False,input_lock_verified=False,ready_for_execution=False,policy_promoted=False,independent_balance_sample_count=0)
     (target/'receipt.json').write_bytes(canonical(receipt))
     from types import SimpleNamespace
     return SimpleNamespace(returncode=0,stdout=canonical(dict(receipt_sha256=api.digest(canonical(receipt)))),stderr=b'')
    with patch.object(api,'ROOT',root),patch.object(api.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True)),patch.object(api.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)),patch.object(api.generation_package,'audit_committed_generation',return_value=dict(committed_generation_consistent=True)),patch.object(api.subprocess,'run',side_effect=child):
     result=api.run_after_external_approval(bundle(),{}, {},Path(d),3,out,'test-reference-not-production-approval')
    self.assertEqual(calls,['test-1A','test-1B'] if mode=='incomplete' else ['test-1A'])
    self.assertEqual(len(result['planned_rows']),400);self.assertEqual(len(result['planned_groups']),200)
    self.assertEqual(result['planned_rows'][-1]['execution_status'],'not_executed');self.assertFalse(result['whole_set']['allowed'])
    self.assertIsNone(result['whole_set']['counts']);self.assertFalse(result['automatic_retry_allowed'])
    self.assertEqual(result['status'],'stopped');self.assertFalse(result['ready_for_execution'])
 def test_invalid_input_cannot_launch_or_create_destination(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as d,patch.object(api.subprocess,'run',side_effect=AssertionError('no child')):
   with self.assertRaises(ValueError):api.run_after_external_approval({}, {}, {},Path(d),3,Path(d)/'none','')
   self.assertFalse((Path(d)/'none').exists())
 def test_isolated_transport_runs_only_the_existing_historical_prefix(self):
  self.assertIsNotNone(api)
  # Production authentication is deliberately mocked, in both processes.
  # The actual connected backend/replay uses only the old115/zero-root3step
  # fixture. This is not a new input lock or a completed population match.
  real=api.subprocess.run
  prefix="""import sys
sys.path.insert(0,sys.argv[1])
import proxy_population_attempt_runner as a
a.lock.verify_git_binding=lambda *args,**kw:dict(immutable_content_verified=True)
a.edition.audit_bundle_edition=lambda *args,**kw:dict(bundle_edition_bound=True)
a.edition.verify=lambda *args,**kw:dict(local_edition_verified=True)
a.generation_package.audit_committed_generation=lambda *args,**kw:dict(committed_generation_consistent=True)
"""
  def isolated(command,**kwargs):
   command=list(command);command[3]=prefix+command[3];return real(command,**kwargs)
  with tempfile.TemporaryDirectory(prefix='conditional-worker-test-',dir=api.ROOT/'data') as d:
   out=Path(d)/'batch'
   with patch.object(api.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True)),patch.object(api.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)),patch.object(api.generation_package,'audit_committed_generation',return_value=dict(committed_generation_consistent=True)),patch.object(api.subprocess,'run',side_effect=isolated) as launches:
    result=api.run_after_external_approval(bundle(),{}, {},api.ROOT.parents[1],3,out,'historical-unit-only-not-production-approval')
   self.assertEqual(launches.call_count,1)
   self.assertEqual(result['planned_rows'][0]['execution_status'],'incomplete',result['planned_rows'][0])
   self.assertEqual(result['not_executed_rows'],399);self.assertEqual(result['completed_rows'],0)
   self.assertTrue((out/'attempt-0001'/'record.json.gz').is_file());self.assertFalse(result['whole_set']['allowed'])

if __name__=='__main__':unittest.main()
