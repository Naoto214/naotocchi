"""Preparation evidence cannot replace either live operation approval."""
import copy,json,unittest
from pathlib import Path
from unittest.mock import patch
import proxy_population_external_approval as approval
import proxy_population_generation_entry as generation
import proxy_population_attempt_runner as attempt
import proxy_population_batch_supervisor as supervisor
try:import proxy_population_current_preflight as api
except ImportError:api=None

class CurrentPreflightTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'current edition preparation gate absent')
 def test_every_operation_passes_actual_edition_to_common_gate_before_effects(self):
  seen=[]
  def gate(stage,**kwargs):
   seen.append((stage,kwargs));raise ValueError('conditional gate stop')
  cert={'commit':'1'*40};repo='/conditional/repository';out='/conditional/output'
  with patch.object(approval,'require_operation_ready',gate):
   for action in (lambda:generation.generate_after_external_approval(repo,cert['commit'],out,'test'),lambda:attempt.run_after_external_approval({}, {},cert,repo,'test',3,out,'test'),lambda:supervisor.run_after_external_approval({}, {},cert,repo,3,out,'test')):
    with self.assertRaisesRegex(ValueError,'conditional gate stop'):action()
  self.assertEqual(seen,[('generation',dict(repository=repo,commit=cert['commit'])),('launch',dict(repository=repo,certificate=cert)),('launch',dict(repository=repo,certificate=cert))])
 def test_missing_current_report_and_caller_bool_cannot_open_gate(self):
  for stage in ('generation','launch'):
   with self.assertRaises(ValueError):approval.require_operation_ready(stage)
   with self.assertRaises((ValueError,TypeError)):approval.require_operation_ready(stage,ready=True)
  with self.assertRaises(ValueError):approval.require_operation_ready('unknown')
 def test_evidence_partition_and_failed_component_never_pass(self):
  required=api.COMPONENTS
  good={k:dict(status='verified',evidence_refs=required[k]) for k in required}
  self.assertEqual(api.require_responsibilities(good),None)
  for mode in ('missing','extra','false','no_evidence'):
   bad=copy.deepcopy(good)
   if mode=='missing':bad.pop(next(iter(required)))
   elif mode=='extra':bad['P99']=dict(status='verified',evidence_refs=['x'])
   elif mode=='false':bad[next(iter(required))]['status']='unproved'
   else:bad[next(iter(required))]['evidence_refs']=[]
   with self.subTest(mode=mode),self.assertRaises(ValueError):api.require_responsibilities(bad)
 def test_test_log_requires_real_completion_and_exact_frozen_python(self):
  source={'tools/test_proxy_population_example.py':'a'*64,'tools/test_proxy_mandatory_example.py':'b'*64,'tools/example.py':'c'*64}
  summary=dict(exit_code=0,tests=2,modules=['test_proxy_mandatory_example','test_proxy_population_example'],python_file_count=3,fingerprints_equal=True)
  fp=dict(before=source,after=source)
  api.require_tests(summary,b'Ran 2 tests in 1.0s\n\nOK\n',fp,source)
  for mode in ('exit','bool','dots','count','module','fingerprint','false','skipped'):
   s=copy.deepcopy(summary);f=copy.deepcopy(fp);log=b'Ran 2 tests in 1.0s\n\nOK\n'
   if mode=='exit':s['exit_code']=1
   elif mode=='bool':s['exit_code']=False
   elif mode=='dots':log=b'..'
   elif mode=='count':log=b'Ran 1 test in 1.0s\n\nOK\n'
   elif mode=='module':s['modules'].pop()
   elif mode=='fingerprint':f['after']['tools/example.py']='0'*64
   elif mode=='false':s['fingerprints_equal']=False
   else:log=b'Ran 2 tests in 1.0s\n\nOK (skipped=1)\n'
   with self.subTest(mode=mode),self.assertRaises(ValueError):api.require_tests(s,log,f,source)
 def test_saved_source_delta_allows_only_evidence_and_progress(self):
  self.assertTrue(hasattr(api,'require_source_delta'),'source delta gate absent')
  base={'tools/example.py':'a','01-core-rules.md':'b','plans/card-game-resume.md':'c'}
  files={n:dict(blob=h) for n,h in base.items()};files[api.REPORT]=dict(blob='d')
  api.require_source_delta(base,files)
  for mode in ('rule','code','new_code','new_rule','deleted','progress_deleted','progress'):
   bad=copy.deepcopy(files)
   if mode=='rule':bad['01-core-rules.md']['blob']='x'
   elif mode=='code':bad['tools/example.py']['blob']='x'
   elif mode=='new_code':bad[api.VERIFY+'hidden.py']=dict(blob='x')
   elif mode=='new_rule':bad['new-rule.md']=dict(blob='x')
   elif mode=='deleted':bad.pop('tools/example.py')
   elif mode=='progress_deleted':bad.pop('plans/card-game-resume.md')
   else:bad['plans/card-game-resume.md']['blob']='x'
   if mode=='progress':api.require_source_delta(base,bad)
   else:
    with self.subTest(mode=mode),self.assertRaises(ValueError):api.require_source_delta(base,bad)
 def test_component_references_exist_in_current_source(self):
  for key,refs in api.COMPONENTS.items():
   for name in refs:
    with self.subTest(component=key,path=name):self.assertTrue((api.ROOT/name).is_file())
 def test_recorded_generation_preparation_must_match_current_edition(self):
  self.assertTrue(hasattr(api,'require_recorded_generation'),'generation preparation join absent')
  current=dict(schema='current_population_preparation_check.v1',preflight_ready=True,errors=[],execution_edition_sha256='a'*64)
  operation=dict(current_preparation=current)
  self.assertIsNone(api.require_recorded_generation(operation,current))
  for mode in ('absent','false','edition','error'):
   bad=copy.deepcopy(operation)
   if mode=='absent':bad={}
   elif mode=='false':bad['current_preparation']['preflight_ready']=False
   elif mode=='edition':bad['current_preparation']['execution_edition_sha256']='b'*64
   else:bad['current_preparation']['errors']=['unverified']
   with self.subTest(mode=mode),self.assertRaises(ValueError):api.require_recorded_generation(bad,current)
 def test_common_gate_propagates_false_readiness_even_without_errors(self):
  self.assertTrue(hasattr(api,'audit'))
  with patch.object(api,'audit',return_value=dict(preflight_ready=False,errors=[])):
   with self.assertRaisesRegex(ValueError,'preflight incomplete'):approval.require_operation_ready('launch',repository='conditional',certificate={})
 def test_generated_package_reads_exact_immutable_preparation_and_requires_package_gate(self):
  import subprocess,hashlib
  from test_proxy_population_operation_edition import saved_source
  current=dict(schema='current_population_preparation_check.v1',preflight_ready=True,errors=[],execution_edition_sha256='a'*64)
  with saved_source() as (repo,root,source,certificate),patch.object(api,'audit',return_value=current):
   def package(operation):
    raw=api.canonical(operation);blob=subprocess.check_output(['git','-C',str(repo),'hash-object','-w','--stdin'],input=raw).decode().strip()
    return dict(committed_generation_consistent=True,artifact_bindings={'operation.json':dict(blob=blob,sha256=hashlib.sha256(raw).hexdigest())})
   valid=package(dict(current_preparation=current));self.assertEqual(api.require_generated_package(valid,certificate,repo),current)
   for mode in ('package','missing','changed','hash'):
    bad=copy.deepcopy(valid)
    if mode=='package':bad['committed_generation_consistent']=False
    elif mode=='missing':bad=package({})
    elif mode=='changed':bad=package(dict(current_preparation=dict(current,execution_edition_sha256='b'*64)))
    else:bad['artifact_bindings']['operation.json']['sha256']='0'*64
    with self.subTest(mode=mode),self.assertRaises(ValueError):api.require_generated_package(bad,certificate,repo)
 def test_incomplete_or_old_connection_cannot_certify_current_preparation(self):
  self.assertTrue(hasattr(api,'require_connection_headers'),'complete connection header gate absent')
  sources={'tools/example.py':'a'*64};tested='1'*40
  run=dict(exit_code=0,base_commit=tested,fingerprints_equal=True);fp=dict(before=sources,after=sources)
  record=dict(schema='bound_population_connected_runtime.v1',completed=True,runtime=dict(stop=None),reconstruction_step_limit=512,binding=dict(match_id='test-1A'),independent_balance_samples=0,policy_promoted=False,supplied_bundle_sha256='b877e13d9f5a1b81ecd8d91ab524f4e29f5f16cf602db0bcbce600d5ffcf616a',connected_tools_sha256=api.digest(api.canonical({'example.py':'a'*64})))
  record.update({k:{flag:True,'errors':[]} for k,flag in api.ROOT_FLAGS.items()})
  api.require_connection_headers(run,fp,record,sources,tested)
  for mode in ('unfinished','stop','old','audit','bool_count','input','source','exit','fingerprint'):
   r=copy.deepcopy(record);summary=copy.deepcopy(run);fingerprints=copy.deepcopy(fp)
   if mode=='unfinished':r['completed']=False
   elif mode=='stop':r['runtime']['stop']={}
   elif mode=='old':summary['base_commit']='2'*40
   elif mode=='audit':r.pop('permitted_input_audit')
   elif mode=='bool_count':r['independent_balance_samples']=False
   elif mode=='input':r['supplied_bundle_sha256']='0'*64
   elif mode=='source':r['connected_tools_sha256']='0'*64
   elif mode=='exit':summary['exit_code']=1
   else:fingerprints['after']['tools/example.py']='0'*64
   with self.subTest(mode=mode),self.assertRaises(ValueError):api.require_connection_headers(summary,fingerprints,r,sources,tested)
 def test_review_requires_fixed_edition_and_resolution_of_findings(self):
  self.assertTrue(hasattr(api,'require_review'),'review binding gate absent')
  sources={'tools/example.py':'a'*64};tested='1'*40;body=b'conditional independent review record'
  row=dict(schema='independent_current_preflight_review.v1',tested_commit=tested,python_sha256=sources,independent=True,unresolved_findings=[],reviewer='independent-unit-reviewer',report_path=api.VERIFY+'unit-review.md',report_sha256=api.digest(body))
  api.require_review(row,sources,tested,lambda path:body)
  for mode in ('old','source','findings','independence','report'):
   bad=copy.deepcopy(row)
   if mode=='old':bad['tested_commit']='2'*40
   elif mode=='source':bad['python_sha256']={}
   elif mode=='findings':bad['unresolved_findings']=['Important finding']
   elif mode=='independence':bad['independent']=False
   else:bad['report_sha256']='0'*64
   with self.subTest(mode=mode),self.assertRaises(ValueError):api.require_review(bad,sources,tested,lambda path:body)

if __name__=='__main__':unittest.main()
