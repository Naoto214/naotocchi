"""Interrupt mock children only; retain all planned rows and propagate signals."""
import json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from test_proxy_mandatory_population_input import bundle
import proxy_population_batch_supervisor as api

class SupervisorInterruptTests(unittest.TestCase):
 def test_control_interrupt_keeps_full_schedule_and_never_retries(self):
  for signal in (KeyboardInterrupt,SystemExit):
   with self.subTest(signal=signal.__name__),tempfile.TemporaryDirectory() as directory:
    root=Path(directory)/'docs'/'card-game';(root/'data').mkdir(parents=True);out=root/'data'/'interrupted'
    with patch.object(api,'ROOT',root),patch.object(api.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True)),patch.object(api.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)),patch.object(api.generation_package,'audit_committed_generation',return_value=dict(committed_generation_consistent=True)),patch.object(api.remote,'verify',return_value=dict(fresh_remote_head_verified=True)),patch.object(api.subprocess,'run',side_effect=signal('unit interruption')) as child:
     with self.assertRaises(signal):api.run_after_external_approval(bundle(),{'commit':'1'*40,'tree':'2'*40},{},Path(directory),3,out,'unit-reference-not-approval')
    self.assertEqual(child.call_count,1)
    report=json.loads((out/'supervisor.json').read_text());control=json.loads((out/'result-0001.json').read_text())
    self.assertEqual(report['status'],'stopped');self.assertEqual(len(report['planned_rows']),400);self.assertEqual(len(report['planned_groups']),200)
    self.assertEqual(report['planned_rows'][0]['execution_status'],'record_unverified');self.assertIn(signal.__name__,report['planned_rows'][0]['stop_reason'])
    self.assertEqual(report['not_executed_rows'],399);self.assertEqual(report['completed_rows'],0)
    self.assertEqual(control['result'],report['planned_rows'][0]);self.assertFalse((out/'request-0002.json').exists())
    self.assertIsNone(report['whole_set']['conclusion']);self.assertFalse(report['automatic_retry_allowed']);self.assertFalse(report['ready_for_execution'])

 def test_interrupt_after_completed_row_keeps_prior_files_and_status(self):
  import gzip
  from types import SimpleNamespace
  from proxy_mandatory_policy_contract import canonical
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory)/'docs'/'card-game';(root/'data').mkdir(parents=True);out=root/'data'/'interrupted';calls=[]
   def child(command,**kwargs):
    request=json.loads(kwargs['input']);calls.append(request['match_id']);target=Path(request['destination']);target.mkdir()
    if len(calls)==2:
     (target/'partial.txt').write_text('retained interrupted child')
     raise KeyboardInterrupt('second row interruption')
    raw=canonical(dict(schema='bound_population_connected_runtime.v1',binding=dict(match_id=request['match_id']),supplied_bundle_sha256=api.digest(canonical(request['bundle'])),completed=True));compressed=gzip.compress(raw,mtime=0)
    (target/'record.json.gz').write_bytes(compressed)
    receipt=dict(schema='conditional_population_attempt_receipt.v1',match_id=request['match_id'],source_reconstructed=True,execution_status='completed',record_sha256=api.digest(raw),compressed_sha256=api.digest(compressed))
    body=canonical(receipt);(target/'receipt.json').write_bytes(body)
    return SimpleNamespace(returncode=0,stdout=canonical(dict(receipt_sha256=api.digest(body))),stderr=b'')
   with patch.object(api,'ROOT',root),patch.object(api.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True)),patch.object(api.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)),patch.object(api.generation_package,'audit_committed_generation',return_value=dict(committed_generation_consistent=True)),patch.object(api.remote,'verify',return_value=dict(fresh_remote_head_verified=True)),patch.object(api.subprocess,'run',side_effect=child):
    with self.assertRaises(KeyboardInterrupt):api.run_after_external_approval(bundle(),{'commit':'1'*40,'tree':'2'*40},{},Path(directory),3,out,'unit-reference-not-approval')
   report=json.loads((out/'supervisor.json').read_text())
   self.assertEqual(calls,['test-1A','test-1B']);self.assertEqual(report['completed_rows'],1);self.assertEqual(report['not_executed_rows'],398)
   self.assertEqual(report['planned_rows'][0]['execution_status'],'completed');self.assertEqual(report['planned_rows'][1]['execution_status'],'record_unverified')
   self.assertTrue((out/'attempt-0001'/'record.json.gz').exists());self.assertTrue((out/'attempt-0002'/'partial.txt').exists());self.assertFalse((out/'request-0003.json').exists())
   self.assertIsNone(report['whole_set']['conclusion'])

 def test_request_and_result_write_interrupts_still_save_fixed_schedule(self):
  for filename in ('request-0001.json','result-0001.json'):
   with self.subTest(filename=filename),tempfile.TemporaryDirectory() as directory:
    root=Path(directory)/'docs'/'card-game';(root/'data').mkdir(parents=True);out=root/'data'/'interrupted';real=api.write_exclusive
    def write(path,value):
     if path.name==filename:raise KeyboardInterrupt('interrupted file write')
     return real(path,value)
    with patch.object(api,'ROOT',root),patch.object(api.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True)),patch.object(api.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)),patch.object(api.generation_package,'audit_committed_generation',return_value=dict(committed_generation_consistent=True)),patch.object(api.remote,'verify',return_value=dict(fresh_remote_head_verified=True)),patch.object(api,'write_exclusive',side_effect=write),patch.object(api.subprocess,'run',side_effect=OSError('synthetic child failure')) as child:
     with self.assertRaises(KeyboardInterrupt):api.run_after_external_approval(bundle(),{'commit':'1'*40,'tree':'2'*40},{},Path(directory),3,out,'unit-reference-not-approval')
    report=json.loads((out/'supervisor.json').read_text())
    self.assertEqual(len(report['planned_rows']),400);self.assertEqual(report['not_executed_rows'],399)
    self.assertEqual(report['planned_rows'][0]['execution_status'],'record_unverified');self.assertIn('KeyboardInterrupt',report['planned_rows'][0]['stop_reason'])
    self.assertEqual(child.call_count,0 if filename.startswith('request') else 1);self.assertFalse((out/'request-0002.json').exists())

if __name__=='__main__':unittest.main()
