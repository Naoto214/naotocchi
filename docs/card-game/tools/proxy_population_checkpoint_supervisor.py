"""Fixed-400 supervisor with per-row checkpoints and owner-approved resume (2026-10-23 C案).

Each row still runs in one fresh worker process that rechecks the live launch
claim itself. New here: a completed row is checkpointed and pushed to the
attempt's results branch at once, up to `parallelism` rows run concurrently
(results are recorded in schedule order), and a later generation may reuse rows
only after recomputing every checkpoint binding from the saved bytes. Resume is
manual: it needs a new owner approval (request v3) and a new claim commit. No row
is retried automatically, no partial match is continued, and no unverified row
is counted.
"""
import base64,copy,gzip,hashlib,json,os,subprocess,sys,time
from pathlib import Path
import proxy_population_input_lock as lock
import proxy_population_execution_edition as edition
import proxy_population_external_approval as external_approval
import proxy_population_launch_authorization as authorization
import proxy_population_execution_binding as rebinding
import proxy_population_checkpoint_ledger as ledger
import proxy_population_results_store as results
from proxy_population_batch_supervisor import CHILD
from proxy_mandatory_population_input import audit_input_bundle
from proxy_population_generation_entry import write_exclusive
from proxy_mandatory_policy_contract import ROOT,canonical
from proxy_population_contract import _pairs,_nonfinite

# Earlier production directories, approvals and stop records: never rewritten by a resume.
PROTECTED=('docs/card-game/data/proxy-population-400-20261012','docs/card-game/data/proxy-population-400-run-20261012',
 'docs/card-game/data/proxy-population-400-rebound-run-20261013','docs/card-game/data/proxy-population-400-bounded-read-run-20261014',
 'docs/card-game/data/proxy-population-400-final-run-20261023','docs/card-game/data/proxy-population-400-final-run-20261023-stop',
 'docs/card-game/data/proxy-population-approval-consumption','docs/card-game/data/proxy-population-runtime-468')
POLL_SECONDS=2


def digest(raw):return hashlib.sha256(raw).hexdigest()


def verify_protected(repository,paths=PROTECTED):
 """Protected originals must be present and byte-identical to the checked-out commit."""
 repository=Path(repository).resolve()
 def git(*args):return subprocess.check_output(['git','--no-replace-objects','-C',str(repository),*args],stderr=subprocess.PIPE).decode()
 head=git('rev-parse','HEAD').strip();checked=[]
 for path in paths:
  if not (repository/path).exists():continue # not every checkout carries every historical directory
  tracked=[n for n in git('ls-tree','-r','-z','--name-only',head,'--',path).split('\0') if n]
  if not tracked:raise ValueError('protected path is untracked: '+path)
  if git('status','--porcelain','--','path'.replace('path',path)).strip():raise ValueError('protected path modified: '+path)
  checked.append(dict(path=path,files=len(tracked)))
 if not checked:raise ValueError('no protected originals found')
 return dict(head=head,checked=checked)


def attempt_id_for_claim(repository,claim_commit):
 """An attempt is named after the approved publication: the single parent of its first claim."""
 out=subprocess.check_output(['git','--no-replace-objects','-C',str(repository),'rev-list','--parents','-n','1',claim_commit],stderr=subprocess.PIPE).decode().split()
 if len(out)!=2:raise ValueError('attempt claim must have exactly one parent')
 return ledger.attempt_id(out[1])


def resume_plan(repository,bundle,certificate,resume,claim,store):
 """Verify the saved rows of the attempt and derive the pending schedule; fail closed."""
 external_approval._resume_target(resume)
 generation=resume['resume_generation']
 original=claim if generation==0 else resume['original_claim']
 descriptor=ledger.attempt_descriptor(resume['attempt_id'],bundle,certificate,original)
 if descriptor['attempt_id']!=attempt_id_for_claim(repository,original['commit']):raise ValueError('attempt identity differs from its original claim')
 if generation==0:
  plan=ledger.verify_ledger({},descriptor,bundle);base=None
 else:
  ref=resume['results_ref'];store.fetch_exact(ref['commit'],ref['tree'])
  rows=store.load_rows(ref['commit'])
  plan=ledger.verify_ledger(rows,descriptor,bundle);base=ref['commit']
 if plan['checkpoint_sha256']!=resume['checkpoint_sha256'] or plan['completed_rows']!=resume['completed_rows'] or plan['pending_schedule_indices_sha256']!=resume['pending_schedule_indices_sha256']:raise ValueError('approved checkpoint differs from the verified ledger')
 protected=verify_protected(repository)
 return dict(schema='fixed400_resume_plan.v1',descriptor=descriptor,generation=generation,results_base=base,protected=protected,
  completed_indices=plan['completed_indices'],pending_schedule_indices=plan['pending_schedule_indices'],next_schedule_index=plan['next_schedule_index'],
  checkpoint_sha256=plan['checkpoint_sha256'],last_entry_sha256=plan['last_entry_sha256'],reused_entries={str(i):e for i,e in plan['entries'].items()})


def prepare_resume(repository,bundle,certificate,attempt_claim,generation,store,parallelism,previous_claim=None):
 """Operator helper: read the results branch head and build the `resume` binding for the next approval."""
 head=store.remote_head()
 if head is None:raise ValueError('results branch absent; nothing to resume')
 tree=store.git('rev-parse',head+'^{tree}') if _has_commit(store,head) else None
 if tree is None:
  subprocess.run(['git','-C',str(store.repository),'fetch','--no-tags',store.remote,'refs/heads/'+store.branch],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=results._environment(),timeout=300)
  tree=store.git('rev-parse',head+'^{tree}')
 descriptor=ledger.attempt_descriptor(attempt_id_for_claim(repository,attempt_claim['commit']),bundle,certificate,attempt_claim)
 if store.attempt_id!=descriptor['attempt_id']:raise ValueError('results store belongs to another attempt')
 plan=ledger.verify_ledger(store.load_rows(head),descriptor,bundle)
 previous=copy.deepcopy(attempt_claim if previous_claim is None else previous_claim)
 resume=dict(attempt_id=descriptor['attempt_id'],resume_generation=generation,original_claim=copy.deepcopy(attempt_claim),previous_claim=previous,
  results_ref=dict(branch=store.branch,commit=head,tree=tree),checkpoint_sha256=plan['checkpoint_sha256'],completed_rows=plan['completed_rows'],
  pending_schedule_indices_sha256=plan['pending_schedule_indices_sha256'],parallelism=parallelism,owner_approved_manual_resume=True)
 external_approval._resume_target(resume)
 return resume,plan


def _has_commit(store,commit):
 return subprocess.run(['git','-C',str(store.repository),'cat-file','-e',commit+'^{commit}'],stdout=subprocess.PIPE,stderr=subprocess.PIPE).returncode==0


def first_generation_resume(publication_commit,parallelism):
 """Generation 0 binding; the attempt is named after the approved publication (the claim's parent)."""
 empty=ledger.digest([])
 return dict(attempt_id=ledger.attempt_id(publication_commit),resume_generation=0,original_claim=None,previous_claim=None,results_ref=None,checkpoint_sha256=empty,completed_rows=0,
  pending_schedule_indices_sha256=ledger.digest(list(range(1,401))),parallelism=parallelism,owner_approved_manual_resume=True)


class _Worker:
 """One isolated child per row; stdin carries the request, stdout the receipt digest."""
 def __init__(self,request,repository):
  self.process=subprocess.Popen([sys.executable,'-I','-c',CHILD,str(Path(__file__).resolve().parent)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,cwd=repository)
  self.process.stdin.write(canonical(request));self.process.stdin.close();self.stdout=None;self.stderr=None
 def poll(self):return self.process.poll()
 def finish(self):
  self.stdout,self.stderr=self.process.communicate();return self.process.returncode
 def terminate(self):
  try:self.process.kill()
  except OSError:pass


def _launch(request,repository):return _Worker(request,repository)


def _verify_row(target,row,start,request):
 body=(target/'receipt.json').read_bytes();record=json.loads(body,object_pairs_hook=_pairs,parse_constant=_nonfinite)
 if canonical(record)!=body or record['schema']!='conditional_population_attempt_receipt.v1' or record['match_id']!=row['match_id'] or record['source_reconstructed'] is not True or record['execution_status'] not in ('completed','incomplete'):raise ValueError('worker receipt identity/status differs')
 compressed=(target/'record.json.gz').read_bytes();raw=gzip.decompress(compressed);run=json.loads(raw,object_pairs_hook=_pairs,parse_constant=_nonfinite)
 if canonical(run)!=raw or digest(compressed)!=record['compressed_sha256'] or digest(raw)!=record['record_sha256'] or run['schema']!='bound_population_connected_runtime.v1' or run['binding']['match_id']!=row['match_id'] or run['supplied_bundle_sha256']!=start['supplied_bundle_sha256'] or type(run['completed']) is not bool or run['completed']!=(record['execution_status']=='completed'):raise ValueError('worker retained record binding differs')
 return body,compressed,record['execution_status']


def run_after_external_approval(bundle,receipt,certificate,repository,limit,destination,approval_reference,*,comment_id,claim_commit,claim_tree,execution_binding,resume,store_workspace):
 if type(approval_reference) is not str or not approval_reference.strip():raise ValueError('external approval reference required; not an authentication token')
 preparation=external_approval.require_operation_ready('launch',repository=repository,certificate=certificate)
 if type(limit) is not int or limit!=512:raise ValueError('checkpoint supervisor requires the 512 step bound')
 repository=Path(repository).resolve();destination=Path(destination)
 if repository!=ROOT.parents[1].resolve() or not destination.is_relative_to((ROOT/'data').resolve()) or destination==(ROOT/'data').resolve():raise ValueError('supervisor requires current repository and new CARD GAME data directory')
 bundle,receipt,certificate,execution_binding,resume=copy.deepcopy((bundle,receipt,certificate,execution_binding,resume))
 rebinding.require_context(execution_binding);external_approval._resume_target(resume)
 if not audit_input_bundle(bundle)['structure_verified']:raise ValueError('manifest structure unverified')
 if not lock.verify_git_binding(bundle,receipt,repository)['immutable_content_verified']:raise ValueError('immutable local manifest binding unverified')
 if not edition.audit_bundle_edition(bundle,certificate,repository)['bundle_edition_bound']:raise ValueError('local execution edition unverified')
 authenticated=authorization.audit_launch(repository,bundle,receipt,certificate,None,limit,destination,comment_id,claim_commit,claim_tree,execution_binding=execution_binding,resume=resume)
 if not authenticated['launch_authorization_bound']:raise ValueError('launch approval unverified: '+str(authenticated['errors']))
 publication=authenticated['consumption']['remote_publication']
 claim=dict(comment_id=comment_id,commit=claim_commit,tree=claim_tree)
 store=results.Store(repository,resume['attempt_id'],store_workspace)
 plan=resume_plan(repository,bundle,certificate,resume,claim,store)
 groups=[dict(group_id=g['group_id'],match_ids=[r['match_id'] for r in bundle['matches'] if r['group_id']==g['group_id']]) for g in bundle['groups']]
 rows=[]
 for index,mid in enumerate(bundle['execution_order'],1):
  entry=plan['reused_entries'].get(str(index))
  rows.append(dict(match_id=mid,execution_status='reused_verified_checkpoint' if entry else 'not_executed',attempt_directory=None,
   checkpoint_entry_sha256=entry['entry_sha256'] if entry else None,resume_generation=entry['resume_generation'] if entry else None))
 destination.mkdir();directory=os.open(destination.parent,os.O_RDONLY|os.O_DIRECTORY)
 try:os.fsync(directory)
 finally:os.close(directory)
 start=dict(schema='fixed_population_checkpoint_supervisor_start.v1',current_preparation=preparation,supplied_bundle_sha256=digest(canonical(bundle)),immutable_local_receipt=receipt,
  execution_edition_sha256=digest(canonical(certificate)),reconstruction_step_limit=limit,approval_reference=approval_reference,
  planned_rows=copy.deepcopy(rows),planned_groups=groups,generation_package_evidence=None,remote_publication_observation=publication,launch_authorization=authenticated,
  execution_binding=execution_binding,resume=resume,resume_plan={k:v for k,v in plan.items() if k!='reused_entries'},
  external_approval_verified=True,input_lock_verified=False,ready_for_execution=False)
 write_exclusive(destination/'start.json',start)
 base=plan['results_base']
 head=store.prepare(claim_commit if plan['generation']==0 else resume['original_claim']['commit'],expected_head=base)
 state=dict(previous=plan['last_entry_sha256'],persisted=0,last_ref=None,stop=False,interruption=None)
 pending=list(plan['pending_schedule_indices']);running={}
 def control_path(kind,index):return destination/(kind+'-'+str(index).zfill(4)+'.json')
 def record_result(index,control):
  control['result']=copy.deepcopy(rows[index-1])
  try:write_exclusive(control_path('result',index),control)
  except BaseException as error:
   if not isinstance(error,Exception):state['interruption']=error
   rows[index-1].update(execution_status='record_unverified',stop_reason=type(error).__name__+': '+str(error))
 def finish(index):
  """Verify the lowest running row; checkpoint it only in strict schedule order."""
  row=rows[index-1];target=destination/('attempt-'+str(index).zfill(4));control=running.pop(index);worker=control.pop('worker')
  try:
   code=worker.finish();control.update(returncode=code,stdout_base64=base64.b64encode(worker.stdout or b'').decode(),stderr_base64=base64.b64encode(worker.stderr or b'').decode())
   if code!=0:raise ValueError('worker process failed')
   if edition.verify(certificate,repository)['local_edition_verified'] is not True:raise ValueError('source edition changed before worker result acceptance')
   body,compressed,status=_verify_row(target,row,start,control)
   response=json.loads(worker.stdout,object_pairs_hook=_pairs,parse_constant=_nonfinite)
   if response!={'receipt_sha256':digest(body)}:raise ValueError('worker output/receipt binding differs')
   row.update(execution_status=status,receipt_sha256=digest(body))
   if status!='completed':state['stop']=True;record_result(index,control);return
  except BaseException as error:
   if not isinstance(error,Exception):state['interruption']=error
   row.update(execution_status='record_unverified',stop_reason=type(error).__name__+': '+str(error));state['stop']=True;record_result(index,control);return
  if state['stop']:
   # An earlier row stopped the schedule: this later row is complete but is not
   # checkpointed out of order; a resume reruns it.
   row.update(execution_status='completed_not_saved',persisted=False);record_result(index,control);return
  try:
   entry=ledger.build_entry(plan['descriptor'],index,row['match_id'],bundle,plan['generation'],body,compressed,state['previous'])
   ref=store.append_row(index,target,entry)
   state.update(previous=entry['entry_sha256'],persisted=state['persisted']+1,last_ref=ref)
   row.update(persisted=True,checkpoint_entry_sha256=entry['entry_sha256'],results_commit=ref['commit'],resume_generation=plan['generation'])
  except BaseException as error:
   if not isinstance(error,Exception):state['interruption']=error
   # The row completed and its files stay in place; it is not counted as saved.
   row.update(execution_status='persist_failed',persisted=False,stop_reason=type(error).__name__+': '+str(error));state['stop']=True
  record_result(index,control)
 def dispatch(index):
  row=rows[index-1];target=destination/('attempt-'+str(index).zfill(4));row.update(execution_status='started',attempt_directory=target.name)
  request=dict(bundle=bundle,receipt=receipt,certificate=certificate,repository=str(repository),match_id=row['match_id'],limit=limit,destination=str(target),approval_reference=approval_reference,comment_id=comment_id,claim_commit=claim_commit,claim_tree=claim_tree,launch_destination=str(destination),schedule_index=index,execution_binding=execution_binding,resume=resume)
  control=dict(match_id=row['match_id'],request_sha256=digest(canonical(request)))
  try:
   write_exclusive(control_path('request',index),dict(control,execution_status='started'))
   if edition.verify(certificate,repository)['local_edition_verified'] is not True:raise ValueError('source edition changed before worker launch')
   control['worker']=_launch(request,repository);running[index]=control
  except BaseException as error:
   if not isinstance(error,Exception):state['interruption']=error
   row.update(execution_status='record_unverified',stop_reason=type(error).__name__+': '+str(error));state['stop']=True;record_result(index,control)
 try:
  while True:
   if running:
    lowest=min(running)
    if running[lowest]['worker'].poll() is not None:finish(lowest);continue
   if not state['stop'] and pending and len(running)<resume['parallelism']:dispatch(pending.pop(0));continue
   if not running and (state['stop'] or not pending):break
   time.sleep(POLL_SECONDS)
 except BaseException as error:
  state['interruption']=error
  for index,control in list(running.items()):
   control.pop('worker').terminate();rows[index-1].update(execution_status='record_unverified',stop_reason=type(error).__name__+': '+str(error));running.pop(index)
   record_result(index,control)
 interruption=state['interruption'];persisted=state['persisted'];last_ref=state['last_ref']
 completed=sum(r['execution_status']=='completed' and r.get('persisted') for r in rows);reused=sum(r['execution_status']=='reused_verified_checkpoint' for r in rows)
 report=dict(schema='fixed_population_checkpoint_supervisor_result.v1',attempt_id=resume['attempt_id'],resume_generation=plan['generation'],
  status='completed_fixed_schedule' if completed+reused==400 else 'stopped',planned_counts=dict(groups=200,matches=400),planned_rows=rows,planned_groups=groups,
  completed_rows=completed,reused_rows=reused,persisted_rows=persisted,not_executed_rows=sum(r['execution_status']=='not_executed' for r in rows),
  unsaved_completed_rows=sum(r['execution_status']=='persist_failed' for r in rows),results_branch=store.branch,results_head=(last_ref or {}).get('commit',head),
  automatic_retry_allowed=False,automatic_resume_allowed=False,whole_set=dict(allowed=False,counts=None,rates=None,conclusion=None),
  external_approval_verified=False,input_lock_verified=False,ready_for_execution=False,policy_promoted=False,independent_balance_sample_count=0)
 write_exclusive(destination/'supervisor.json',report)
 if interruption is not None:raise interruption
 return report
