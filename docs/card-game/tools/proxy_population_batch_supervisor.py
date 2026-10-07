"""Future fixed400 supervisor. No CLI, resume, approval authentication or seeds.

MUST NOT be invoked before external confirmation and readiness/remote-lock
review. One fresh isolated process per row reuses the saved attempt runner.
Operational completion is never balance admission or a whole-set conclusion.
"""
import base64,copy,gzip,hashlib,json,os,subprocess,sys
from pathlib import Path
import proxy_population_input_lock as lock
import proxy_population_execution_edition as edition
import proxy_population_generation_package as generation_package
import proxy_population_remote_publication as remote
from proxy_mandatory_population_input import audit_input_bundle
from proxy_population_generation_entry import write_exclusive
from proxy_mandatory_policy_contract import ROOT,canonical
from proxy_population_contract import _pairs,_nonfinite

CHILD="""import sys,json,hashlib
sys.path.insert(0,sys.argv[1])
from proxy_population_attempt_runner import run_after_external_approval
from proxy_mandatory_policy_contract import canonical
from proxy_population_contract import _pairs,_nonfinite
request=json.loads(sys.stdin.buffer.read(),object_pairs_hook=_pairs,parse_constant=_nonfinite)
report=run_after_external_approval(**request)
sys.stdout.buffer.write(canonical(dict(receipt_sha256=hashlib.sha256(canonical(report)).hexdigest())))
"""

def digest(raw):return hashlib.sha256(raw).hexdigest()

def run_after_external_approval(bundle,receipt,certificate,repository,limit,destination,approval_reference):
 if type(approval_reference) is not str or not approval_reference.strip():raise ValueError('external approval reference required; not an authentication token')
 if type(limit) is not int or not 1<=limit<=512:raise ValueError('invalid bounded step limit')
 repository=Path(repository).resolve();destination=Path(destination).resolve()
 if repository!=ROOT.parents[1].resolve() or not destination.is_relative_to((ROOT/'data').resolve()) or destination==(ROOT/'data').resolve():raise ValueError('supervisor requires current repository and new CARD GAME data directory')
 bundle=copy.deepcopy(bundle);receipt=copy.deepcopy(receipt);certificate=copy.deepcopy(certificate)
 if not audit_input_bundle(bundle)['structure_verified']:raise ValueError('manifest structure unverified')
 if not lock.verify_git_binding(bundle,receipt,repository)['immutable_content_verified']:raise ValueError('immutable local manifest binding unverified')
 if not edition.audit_bundle_edition(bundle,certificate,repository)['bundle_edition_bound']:raise ValueError('local execution edition unverified')
 rows=[dict(match_id=mid,execution_status='not_executed',attempt_directory=None) for mid in bundle['execution_order']]
 groups=[dict(group_id=g['group_id'],match_ids=[r['match_id'] for r in bundle['matches'] if r['group_id']==g['group_id']]) for g in bundle['groups']]
 package=generation_package.audit_committed_generation(bundle,receipt,certificate,repository)
 if not package['committed_generation_consistent']:raise ValueError('committed generation package unverified')
 publication=remote.verify(repository,receipt['commit'],receipt['tree'])
 if not publication['fresh_remote_head_verified']:raise ValueError('fresh remote manifest publication unverified')
 destination.mkdir();directory=os.open(destination.parent,os.O_RDONLY|os.O_DIRECTORY)
 try:os.fsync(directory)
 finally:os.close(directory)
 start=dict(schema='fixed_population_supervisor_start.v1',supplied_bundle_sha256=digest(canonical(bundle)),immutable_local_receipt=receipt,
  execution_edition_sha256=digest(canonical(certificate)),reconstruction_step_limit=limit,approval_reference=approval_reference,
  planned_rows=copy.deepcopy(rows),planned_groups=groups,generation_package_evidence=package,remote_publication_observation=publication,external_approval_verified=False,input_lock_verified=False,ready_for_execution=False)
 write_exclusive(destination/'start.json',start)
 for index,row in enumerate(rows,1):
  target=destination/('attempt-'+str(index).zfill(4));row.update(execution_status='started',attempt_directory=target.name)
  request=dict(bundle=bundle,receipt=receipt,certificate=certificate,repository=str(repository),match_id=row['match_id'],limit=limit,destination=str(target),approval_reference=approval_reference)
  control=dict(match_id=row['match_id'],request_sha256=digest(canonical(request)))
  write_exclusive(destination/('request-'+str(index).zfill(4)+'.json'),dict(control,execution_status='started'))
  try:
   process=subprocess.run([sys.executable,'-I','-c',CHILD,str(Path(__file__).resolve().parent)],input=canonical(request),stdout=subprocess.PIPE,stderr=subprocess.PIPE,cwd=repository,check=False)
   control.update(returncode=process.returncode,stdout_base64=base64.b64encode(process.stdout).decode(),stderr_base64=base64.b64encode(process.stderr).decode())
   if process.returncode!=0:raise ValueError('worker process failed')
   body=(target/'receipt.json').read_bytes();record=json.loads(body,object_pairs_hook=_pairs,parse_constant=_nonfinite)
   response=json.loads(process.stdout,object_pairs_hook=_pairs,parse_constant=_nonfinite)
   if canonical(record)!=body or canonical(response)!=process.stdout or response!={'receipt_sha256':digest(body)}:raise ValueError('worker output/receipt binding differs')
   if record['schema']!='conditional_population_attempt_receipt.v1' or record['match_id']!=row['match_id'] or record['source_reconstructed'] is not True or record['execution_status'] not in ('completed','incomplete'):raise ValueError('worker receipt identity/status differs')
   compressed=(target/'record.json.gz').read_bytes();raw=gzip.decompress(compressed);run=json.loads(raw,object_pairs_hook=_pairs,parse_constant=_nonfinite)
   if canonical(run)!=raw or digest(compressed)!=record['compressed_sha256'] or digest(raw)!=record['record_sha256'] or run['schema']!='bound_population_connected_runtime.v1' or run['binding']['match_id']!=row['match_id'] or run['supplied_bundle_sha256']!=start['supplied_bundle_sha256'] or type(run['completed']) is not bool or run['completed']!=(record['execution_status']=='completed'):raise ValueError('worker retained record binding differs')
   row.update(execution_status=record['execution_status'],receipt_sha256=digest(body))
  except Exception as error:
   row.update(execution_status='record_unverified',stop_reason=type(error).__name__+': '+str(error))
  control['result']=copy.deepcopy(row);write_exclusive(destination/('result-'+str(index).zfill(4)+'.json'),control)
  if row['execution_status']!='completed':break
 completed=sum(r['execution_status']=='completed' for r in rows)
 report=dict(schema='fixed_population_supervisor_result.v1',status='completed_fixed_schedule' if completed==400 else 'stopped',
  planned_counts=dict(groups=200,matches=400),planned_rows=rows,planned_groups=groups,
  completed_rows=completed,not_executed_rows=sum(r['execution_status']=='not_executed' for r in rows),
  automatic_retry_allowed=False,whole_set=dict(allowed=False,counts=None,rates=None,conclusion=None),
  external_approval_verified=False,input_lock_verified=False,ready_for_execution=False,policy_promoted=False,independent_balance_sample_count=0)
 write_exclusive(destination/'supervisor.json',report);return report
