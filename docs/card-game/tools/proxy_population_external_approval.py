"""Fresh owner-comment authentication; not readiness or pre-outcome provenance.

Public GitHub reads only. Callers cannot supply a precomputed comment as live
proof. Local exclusive consumption is not a remote anti-rollback guarantee.
The operational gate stays closed until P07--18 are composed and verified.
"""
import copy,hashlib,json,os,re,subprocess
from datetime import datetime,timezone
from time import monotonic,sleep
from contextvars import ContextVar
from urllib.error import HTTPError,URLError
import proxy_population_approval_transport as transport
from pathlib import PurePosixPath
from proxy_population_contract import _pairs,_nonfinite
from proxy_mandatory_policy_contract import ROOT,canonical

REPOSITORY='Naoto214/naotocchi'
AUTHORITY=323909980
# 2026-10-20 owner decision: PR #259 is merged, so new approvals live on #408.
# Only the PR location moved; author, exact text, draft/open/unmerged and head
# checks are unchanged. A #259 request has a different digest and is rejected.
PR=transport.PULL_REQUEST
BRANCH='claude/fixed400-restart-20261020'
HISTORICAL_PULL_REQUESTS={259:'design/card-pool-master-20260914'}
API='https://api.github.com/repos/'+REPOSITORY
CONTRACTS=('107-normal-decision-match-protocol.md','463-precommitted-mandatory-policy-detail.md',
 '464-approved-mandatory-policy-contract.md','465-mandatory-boundary-and-population-input.md')


def digest(value):return hashlib.sha256(canonical(value)).hexdigest()


def _sha(value,size):
 if type(value) is not str or re.fullmatch('[0-9a-f]{'+str(size)+'}',value) is None:raise ValueError('invalid immutable digest')
 return value


def _destination(path):
 if type(path) is not str or '\\' in path or '\x00' in path or any(x in ('','.','..') for x in path.split('/')) or not path.startswith('docs/card-game/data/') or PurePosixPath(path).is_absolute():raise ValueError('invalid CARD GAME destination')
 return path


def _edition(certificate):
 return dict(commit=_sha(certificate['commit'],40),tree=_sha(certificate['tree'],40),sha256=digest(certificate))


def _base(stage,certificate,destination,publication):
 return dict(schema='population_external_approval_request.v1',repository=REPOSITORY,pull_request=PR,
  authority_user_id=AUTHORITY,stage=stage,edition=_edition(certificate),
  publication=dict(commit=_sha(publication['commit'],40),tree=_sha(publication['tree'],40)),
  destination=_destination(destination),planned_groups=200,planned_matches=400,
  contract_sha256={p:_sha(certificate['files'][p]['sha256'],64) for p in CONTRACTS})


def generation_request(certificate,destination,registry):
 if registry.get('registry_verified') is not True:raise ValueError('historical registry unverified')
 request=_base('generation',certificate,destination,certificate)
 request['target']=dict(historical_registry_sha256=digest(registry),entropy_api='os.urandom',
  initial_order_and_policy_roots_separated=True,mirror_initial_order_shared=True,mirror_policy_randomness_separated=True)
 return request


def launch_request(bundle,receipt,certificate,package,limit,destination):
 if type(limit) is not int or not 1<=limit<=512:raise ValueError('invalid bounded step limit')
 if len(bundle['groups'])!=200 or len(bundle['execution_order'])!=400 or len(set(bundle['execution_order']))!=400:raise ValueError('fixed schedule differs')
 if package.get('committed_generation_consistent') is not True or not package.get('artifact_bindings'):raise ValueError('generation package unverified')
 request=_base('launch',certificate,destination,receipt)
 request['target']=dict(manifest_sha256=digest(bundle),receipt_sha256=digest(receipt),
  package_artifact_bindings_sha256=digest(package['artifact_bindings']),execution_order=list(bundle['execution_order']),
  reconstruction_step_limit=limit,automatic_retry_allowed=False,automatic_resume_allowed=False)
 return request


def rebinding_request(bundle,receipt,certificate,context,limit,destination):
 from proxy_population_execution_binding import require_context
 require_context(context)
 if type(limit) is not int or limit!=512:raise ValueError('rebinding requires 512 step bound')
 binding=context['binding']
 if binding['new_edition']!=_edition(certificate) or binding['derived_manifest_sha256']!=digest(bundle):raise ValueError('binding request edition/manifest differs')
 request=_base('launch',certificate,destination,context['binding_receipt'])
 request['schema']='population_external_approval_request.v2'
 request['target']=dict(manifest_sha256=digest(bundle),receipt_sha256=digest(receipt),
  execution_binding_sha256=digest(binding),binding_receipt_sha256=digest(context['binding_receipt']),
  original_package_receipt_sha256=digest(binding['original_receipt']),old_edition=copy.deepcopy(binding['old_edition']),
  execution_order=list(bundle['execution_order']),reconstruction_step_limit=limit,
  automatic_retry_allowed=False,automatic_resume_allowed=False)
 _validate_request(request)
 return request


RESUME_ATTEMPT_RE=re.compile(r'fixed400-[0-9a-f]{12}')
RESUME_BRANCH_PREFIX='fixed400-results/'
RESUME_PARALLELISM=(1,4)


def _resume_target(resume):
 """Checkpoint/resume binding (2026-10-23 C案). Manual, owner-approved; never automatic."""
 expected={'attempt_id','resume_generation','original_claim','previous_claim','results_ref','checkpoint_sha256','completed_rows','pending_schedule_indices_sha256','parallelism','owner_approved_manual_resume'}
 if type(resume) is not dict or set(resume)!=expected:raise ValueError('resume binding shape differs')
 if type(resume['attempt_id']) is not str or RESUME_ATTEMPT_RE.fullmatch(resume['attempt_id']) is None:raise ValueError('resume attempt identity differs')
 generation=resume['resume_generation']
 if type(generation) is not int or generation<0:raise ValueError('resume generation differs')
 if resume['owner_approved_manual_resume'] is not True:raise ValueError('resume requires manual owner approval')
 parallelism=resume['parallelism']
 if type(parallelism) is not int or not RESUME_PARALLELISM[0]<=parallelism<=RESUME_PARALLELISM[1]:raise ValueError('resume parallelism differs')
 _sha(resume['checkpoint_sha256'],64);_sha(resume['pending_schedule_indices_sha256'],64)
 rows=resume['completed_rows']
 if type(rows) is not int or not 0<=rows<=400:raise ValueError('resume completed row count differs')
 claim=resume['original_claim'];ref=resume['results_ref'];previous=resume['previous_claim']
 if generation==0:
  if claim is not None or previous is not None or ref is not None or rows!=0:raise ValueError('first generation carries no prior claim, results or rows')
 else:
  for value in (claim,previous):
   if type(value) is not dict or set(value)!={'comment_id','commit','tree'}:raise ValueError('resume claim shape differs')
   _comment_id(value['comment_id']);_sha(value['commit'],40);_sha(value['tree'],40)
  if generation==1 and previous!=claim:raise ValueError('first resume follows the original claim')
  if type(ref) is not dict or set(ref)!={'branch','commit','tree'} or type(ref['branch']) is not str or ref['branch']!=RESUME_BRANCH_PREFIX+resume['attempt_id']:raise ValueError('resume results reference differs')
  _sha(ref['commit'],40);_sha(ref['tree'],40)
 return copy.deepcopy(resume)


def pre_claim_head(request):
 """The PR head that must be live before this request's claim is consumed, and the claim's parent.

Generation 0 (and every v1/v2 request) claims on the approved publication. A resumed
generation claims on the previous generation's claim, so the PR branch only ever
moves forward by claim-only commits; it is never rewritten.
"""
 if request.get('schema')=='population_external_approval_request.v3':
  resume=request['target']['resume']
  if resume['resume_generation']>0:return dict(commit=resume['previous_claim']['commit'],tree=resume['previous_claim']['tree'])
 return dict(commit=request['publication']['commit'],tree=request['publication']['tree'])


def resume_request(bundle,receipt,certificate,context,limit,destination,resume):
 """v3: the v2 rebinding launch request plus an owner-approved checkpoint/resume binding."""
 request=rebinding_request(bundle,receipt,certificate,context,limit,destination)
 request['schema']='population_external_approval_request.v3'
 request['target']['resume']=_resume_target(resume)
 _validate_request(request)
 return request


def _validate_request(request):
 expected={'schema','repository','pull_request','authority_user_id','stage','edition','publication','destination','planned_groups','planned_matches','contract_sha256','target'}
 if type(request) is not dict or set(request)!=expected or request['schema'] not in ('population_external_approval_request.v1','population_external_approval_request.v2','population_external_approval_request.v3') or request['repository']!=REPOSITORY or type(request['pull_request']) is not int or request['pull_request']!=PR or type(request['authority_user_id']) is not int or request['authority_user_id']!=AUTHORITY:raise ValueError('approval request identity differs')
 if type(request['planned_groups']) is not int or request['planned_groups']!=200 or type(request['planned_matches']) is not int or request['planned_matches']!=400:raise ValueError('approval schedule differs')
 _destination(request['destination'])
 if set(request['edition'])!={'commit','tree','sha256'} or set(request['publication'])!={'commit','tree'}:raise ValueError('approval edition shape differs')
 for section in ('edition','publication'):
  for key in ('commit','tree'):_sha(request[section][key],40)
 _sha(request['edition']['sha256'],64)
 if set(request['contract_sha256'])!=set(CONTRACTS):raise ValueError('approval contracts differ')
 for value in request['contract_sha256'].values():_sha(value,64)
 target=request['target']
 if request['schema'] in ('population_external_approval_request.v2','population_external_approval_request.v3') and request['stage']!='launch':raise ValueError('rebinding is launch only')
 if request['stage']=='generation':
  if set(target)!={'historical_registry_sha256','entropy_api','initial_order_and_policy_roots_separated','mirror_initial_order_shared','mirror_policy_randomness_separated'}:raise ValueError('generation target shape differs')
  _sha(target['historical_registry_sha256'],64)
  if request['publication']!={k:request['edition'][k] for k in ('commit','tree')} or target['entropy_api']!='os.urandom' or any(target[k] is not True for k in ('initial_order_and_policy_roots_separated','mirror_initial_order_shared','mirror_policy_randomness_separated')):raise ValueError('generation contract differs')
 elif request['stage']=='launch':
  keys={'manifest_sha256','receipt_sha256','execution_order','reconstruction_step_limit','automatic_retry_allowed','automatic_resume_allowed'}
  hashes=['manifest_sha256','receipt_sha256']
  if request['schema'] in ('population_external_approval_request.v2','population_external_approval_request.v3'):
   hashes+=['execution_binding_sha256','binding_receipt_sha256','original_package_receipt_sha256'];keys.add('old_edition')
   if request['schema']=='population_external_approval_request.v3':keys.add('resume');_resume_target(target.get('resume'))
   old=target.get('old_edition',{})
   if set(old)!={'commit','tree','sha256'}:raise ValueError('old edition identity missing')
   _sha(old['commit'],40);_sha(old['tree'],40);_sha(old['sha256'],64)
   if target.get('reconstruction_step_limit')!=512:raise ValueError('rebinding step bound differs')
  else:hashes+=['package_artifact_bindings_sha256']
  if set(target)!=keys|set(hashes):raise ValueError('launch target shape differs')
  for key in hashes:_sha(target[key],64)
  order=target['execution_order'];limit=target['reconstruction_step_limit']
  if type(order) is not list or len(order)!=400 or any(type(v) is not str or not v for v in order) or len(set(order))!=400 or type(limit) is not int or not 1<=limit<=512 or target['automatic_retry_allowed'] is not False or target['automatic_resume_allowed'] is not False:raise ValueError('launch supervisor settings differ')
 else:raise ValueError('unknown approval stage')


def approval_text(request):
 _validate_request(request)
 return 'NAOTOCCHI POPULATION APPROVAL v1\nstage: '+request['stage']+'\nrequest-sha256: '+digest(request)+'\n'


def revocation_text(request,comment_id):
 _validate_request(request);_comment_id(comment_id)
 return 'NAOTOCCHI POPULATION REVOKE v1\ncomment-id: '+str(comment_id)+'\nrequest-sha256: '+digest(request)+'\n'


def _comment_id(value):
 if type(value) is not int or value<=0:raise ValueError('invalid approval comment ID')


# Historical immutable-commit reader also uses the same redirect refusal.
_NoRedirect=transport._NoRedirect
_read_deadline=ContextVar('approval_read_deadline',default=None)


def _get(path):
 deadline=_read_deadline.get()
 return transport.read(path,30 if deadline is None else min(30,max(0,deadline-monotonic())))


def _retryable(error):
 return (isinstance(error,HTTPError) and error.code in (502,503,504) or
         isinstance(error,TimeoutError) or isinstance(error,URLError) and isinstance(error.reason,TimeoutError))


def failure_text(proof):
 """Retain diagnostics in enclosing errors, worker stderr and operator stop logs."""
 return canonical(dict(errors=proof['errors'],read_audit=proof.get('read_audit'))).decode()


class _Deadline(ValueError):pass


def _owner(user):return type(user.get('id')) is int and user['id']==AUTHORITY and user.get('type')=='User'


def _comment_projection(comment):
 return {k:comment[k] for k in ('id','user','issue_url','html_url','body','created_at','updated_at')}


def _check_comment(comment,request,comment_id):
 if type(comment['id']) is not int or comment['id']!=comment_id or not _owner(comment['user']):raise ValueError('approval author or comment identity differs')
 if comment['issue_url']!=API+'/issues/'+str(PR) or comment['html_url']!='https://github.com/'+REPOSITORY+'/pull/'+str(PR)+'#issuecomment-'+str(comment_id):raise ValueError('approval belongs to another PR')
 if comment['body']!=approval_text(request):raise ValueError('approval text or request digest differs')
 for key in ('created_at','updated_at'):
  value=comment[key]
  if type(value) is not str or re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ',value) is None:raise ValueError('invalid GitHub comment timestamp')
  datetime.strptime(value,'%Y-%m-%dT%H:%M:%SZ')
 if comment['created_at']!=comment['updated_at']:raise ValueError('edited approval forbidden')


def verify_live(request,comment_id):
 return _verify_live_at_head(request,comment_id,None)


def _observation(request,comment_id,expected_head,read):
 repo=read('')
 if repo['full_name']!=REPOSITORY or not _owner(repo['owner']):raise ValueError('repository authority differs')
 pr=read('/pulls/'+str(PR))
 if type(pr['number']) is not int or pr['number']!=PR or pr['state']!='open' or pr['draft'] is not True or pr['merged'] is not False or pr['head']['repo']['full_name']!=REPOSITORY or pr['head']['ref']!=BRANCH or pr['head']['sha']!=expected_head:raise ValueError('live PR edition/state differs')
 comment=read('/issues/comments/'+str(comment_id));_check_comment(comment,request,comment_id)
 ids=set();found=[];pages=[]
 for page in range(1,101):
  rows=read('/issues/'+str(PR)+'/comments?per_page=100&page='+str(page))
  if type(rows) is not list or len(rows)>100:raise ValueError('invalid comment page')
  pages.append(dict(page=page,sha256=digest(rows),count=len(rows)))
  for row in rows:
   _comment_id(row['id'])
   if row['id'] in ids:raise ValueError('duplicate comment during pagination')
   ids.add(row['id'])
   if row['id']==comment_id:
    _check_comment(row,request,comment_id)
    if canonical(_comment_projection(row))!=canonical(_comment_projection(comment)):raise ValueError('approval listing changed')
    found.append(row)
   if _owner(row['user']) and revocation_text(request,comment_id) in row['body']:raise ValueError('approval revoked')
  if len(rows)<100:break
 else:raise ValueError('comment pagination limit reached')
 if len(found)!=1 or canonical(_comment_projection(found[0]))!=canonical(_comment_projection(comment)):raise ValueError('approval listing changed or absent')
 last=read('/issues/comments/'+str(comment_id));_check_comment(last,request,comment_id)
 if canonical(_comment_projection(last))!=canonical(_comment_projection(comment)):raise ValueError('approval changed during read')
 return dict(observed_publication_commit=expected_head,comment=_comment_projection(last),comment_pages=pages,repository_sha256=digest(repo),pr_sha256=digest(pr),observed_at=datetime.now(timezone.utc).isoformat())


def _verify_live_at_head(request,comment_id,publication_commit):
 """One live verification, never a retry of consumption, supervisor or worker."""
 request=copy.deepcopy(request);errors=[];evidence=None
 start=monotonic();deadline=start+120
 audit=dict(schema='population_approval_read_audit.v1',request_sha256=digest(request),
  max_observations=3,budget_seconds=120,observations=[],outcome=None)
 token=_read_deadline.set(deadline)
 try:
  _validate_request(request);_comment_id(comment_id)
  expected_head=pre_claim_head(request)['commit'] if publication_commit is None else _sha(publication_commit,40)
  for attempt in range(1,4):
   row=dict(attempt=attempt,started_at=datetime.now(timezone.utc).isoformat(),reads=[],outcome=None)
   audit['observations'].append(row)
   def read(path):
    transport.allowed(path)
    if monotonic()>=deadline:raise _Deadline('approval observation deadline')
    entry=dict(endpoint=API+path,method='GET',attempt=attempt,started_at=datetime.now(timezone.utc).isoformat(),http_status=None,reason=None)
    row['reads'].append(entry)
    try:
     value=_get(path);entry['http_status']=200
     if monotonic()>=deadline:raise _Deadline('approval observation deadline')
     entry['reason']='received';return value
    except (ValueError,KeyError,TypeError,AttributeError,OSError) as error:
     entry['http_status']=error.code if isinstance(error,HTTPError) else getattr(error,'http_status',entry['http_status'])
     entry['reason']=type(error).__name__+': '+str(error)
     raise
    finally:entry['finished_at']=datetime.now(timezone.utc).isoformat()
   try:
    candidate=_observation(request,comment_id,expected_head,read)
    if monotonic()>=deadline:raise _Deadline('approval observation deadline')
    evidence=candidate;row['outcome']=audit['outcome']='verified';break
   except (ValueError,KeyError,TypeError,AttributeError,OSError) as error:
    # Failed observation contributes diagnostics only, never authoritative data.
    row['reason']=type(error).__name__+': '+str(error)
    retry=_retryable(error);delay=(2,5)[min(attempt-1,1)]
    if isinstance(error,_Deadline) or monotonic()>=deadline or retry and monotonic()+delay>=deadline:
     row['outcome']=audit['outcome']='deadline'
    elif not retry:row['outcome']=audit['outcome']='fail_closed'
    elif attempt==3:row['outcome']=audit['outcome']='attempt_limit'
    else:row['outcome']='retry'
    if row['outcome']!='retry':errors.append(row['reason']);break
    row['delay_seconds']=delay;sleep(delay)
   finally:row['finished_at']=datetime.now(timezone.utc).isoformat()
 except (ValueError,KeyError,TypeError,AttributeError,OSError) as error:
  errors.append(str(error));audit['outcome']='fail_closed'
 finally:
  _read_deadline.reset(token);audit['elapsed_milliseconds']=int((monotonic()-start)*1000)
 return dict(schema='live_population_owner_approval.v1',external_approval_verified=not errors,errors=errors,
  request_sha256=digest(request),comment_id=comment_id,evidence=evidence,read_audit=audit,
  scope='live_GitHub_owner_comment_for_exact_request',historical_edit_absence_proven=False,
  remote_consumption_verified=False,input_lock_verified=False,provenance_verified=False,
  pre_outcome_ordering_verified=False,ready_for_execution=False,balance_admitted=None)


def consume_live(request,comment_id):
 request=copy.deepcopy(request)
 proof=verify_live(request,comment_id)
 if not proof['external_approval_verified']:raise ValueError('live external approval unverified: '+failure_text(proof))
 try:
  directory=ROOT/'data'/'proxy-population-approval-consumption'
  if directory.is_symlink():raise ValueError('consumption directory symlink forbidden')
  directory.mkdir(exist_ok=True)
  record=dict(schema='population_local_approval_consumption.v1',request=request,approval=proof,
   local_consumption_recorded=True,remote_consumption_verified=False,ready_for_execution=False)
  flags=os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW
  fd=os.open(directory/(str(comment_id)+'.json'),flags,0o600)
  with os.fdopen(fd,'wb') as stream:stream.write(canonical(record));stream.flush();os.fsync(stream.fileno())
  for path in (directory,directory.parent):
   fd=os.open(path,os.O_RDONLY|os.O_DIRECTORY)
   try:os.fsync(fd)
   finally:os.close(fd)
  return record
 except (ValueError,OSError) as error:
  raise type(error)(str(error)+'; approval verification: '+failure_text(proof)) from error


def require_operation_ready(stage,*,repository=None,certificate=None,commit=None):
 # Preparedness only. Each entry must still pass its separate live approval,
 # immutable claim/package and edition checks before any operation effects.
 if stage not in ('generation','launch'):raise ValueError('unknown operational stage')
 if repository is None or stage=='generation' and (commit is None or certificate is not None) or stage=='launch' and (certificate is None or commit is not None):raise ValueError('current population preflight incomplete; actual edition required')
 from proxy_population_current_preflight import audit
 from proxy_population_execution_edition import capture
 try:
  if stage=='generation':certificate=capture(repository,commit)
  result=audit(certificate,repository)
 except (ValueError,KeyError,TypeError,OSError,subprocess.SubprocessError) as error:raise ValueError('current population preflight incomplete: '+str(error)) from error
 if result['preflight_ready'] is not True:raise ValueError('current population preflight incomplete: '+str(result['errors']))
 return result
