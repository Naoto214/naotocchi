"""Bind a claim-only child commit to a fresh owner approval and exact remote.

Read-only; no commit, publication, approval consumption, entropy or execution.
Current immutable publication is not absence of rollback or pre-outcome proof.
"""
import copy,json,subprocess
import proxy_population_external_approval as approval
import proxy_population_remote_publication as remote
from proxy_population_contract import _pairs,_nonfinite
from proxy_mandatory_policy_contract import canonical


def _check_saved_approval(saved,request,comment_id,head):
 """Check recorded identity/scope only, without claiming a live observation."""
 if saved['schema']!='live_population_owner_approval.v1' or saved['external_approval_verified'] is not True or saved['errors']!=[] or saved['request_sha256']!=approval.digest(request) or type(saved['comment_id']) is not int or saved['comment_id']!=comment_id:raise ValueError('saved approval identity differs')
 if saved['scope']!='live_GitHub_owner_comment_for_exact_request' or saved['balance_admitted'] is not None or any(saved[k] is not False for k in ('ready_for_execution','input_lock_verified','remote_consumption_verified','provenance_verified','historical_edit_absence_proven','pre_outcome_ordering_verified')):raise ValueError('saved approval scope inflated')
 approval._check_comment(saved['evidence']['comment'],request,comment_id)
 if saved['evidence']['observed_publication_commit']!=head:raise ValueError('saved approval publication differs')


CLAIM_DIRECTORY='docs/card-game/data/proxy-population-approval-consumption/'


def _parents(git,commit):
 headers=git('cat-file','commit',commit).split(b'\n\n',1)[0].splitlines()
 return [line[7:].decode() for line in headers if line.startswith(b'parent ')]


def _require_claim_chain(git,request,head):
 """A resumed generation's parent: claim-only commits from the approved publication.

Every commit between the publication and the previous claim has one parent and adds
exactly one new canonical claim file, and the first of them is the original claim.
"""
 resume=request['target']['resume'];publication=request['publication']['commit'];chain=[];cursor=head
 while cursor!=publication:
  parents=_parents(git,cursor)
  if len(parents)!=1 or len(chain)>=64:raise ValueError('resume claim chain does not reach the approved publication')
  changes=git('diff-tree','--no-commit-id','--name-status','--no-renames','-r','-z',parents[0],cursor).split(b'\0')
  if len(changes)!=3 or changes[0]!=b'A' or not changes[1].decode().startswith(CLAIM_DIRECTORY) or changes[2]!=b'':raise ValueError('resume claim chain contains a non-claim commit')
  chain.append(cursor);cursor=parents[0]
 if not chain or chain[-1]!=resume['original_claim']['commit']:raise ValueError('resume claim chain does not start at the original claim')
 return list(reversed(chain))


def _read_committed_claim(repository,request,comment_id,commit,tree):
 """Local immutable claim proof only; callers must separately authenticate live use."""
 approval.approval_text(request);approval._comment_id(comment_id)
 approval._sha(commit,40);approval._sha(tree,40)
 head=approval.pre_claim_head(request);parent=head['commit'];path=CLAIM_DIRECTORY+str(comment_id)+'.json'
 def git(*args):return subprocess.check_output(['git','--no-replace-objects','-C',str(repository),*args],env=remote._environment(),stderr=subprocess.PIPE,timeout=30)
 if git('cat-file','-t',commit).strip()!=b'commit' or git('rev-parse',commit+'^{tree}').decode().strip()!=tree:raise ValueError('consumption commit/tree differs')
 if _parents(git,commit)!=[parent]:raise ValueError('consumption must be a single direct child of approved publication')
 if git('rev-parse',parent+'^{tree}').decode().strip()!=head['tree']:raise ValueError('approved parent tree differs')
 if parent!=request['publication']['commit']:_require_claim_chain(git,request,parent)
 changes=git('diff-tree','--no-commit-id','--name-status','--no-renames','-r','-z',parent,commit)
 if changes!=b'A\0'+path.encode()+b'\0':raise ValueError('consumption commit must add only the exact claim')
 rows=git('ls-tree','-z',commit,'--',path).split(b'\0')
 if len(rows)!=2 or rows[-1]!=b'':raise ValueError('consumption blob absent or ambiguous')
 meta,name=rows[0].split(b'\t');mode,kind,blob=meta.decode().split()
 if mode!='100644' or kind!='blob' or name.decode()!=path:raise ValueError('consumption must be a regular blob')
 if int(git('cat-file','-s',blob))>16*1024*1024:raise ValueError('consumption blob too large')
 body=git('cat-file','blob',blob);record=json.loads(body,object_pairs_hook=_pairs,parse_constant=_nonfinite)
 if canonical(record)!=body or set(record)!={'schema','request','approval','local_consumption_recorded','remote_consumption_verified','ready_for_execution'}:raise ValueError('consumption record is not canonical or has another shape')
 if record['schema']!='population_local_approval_consumption.v1' or canonical(record['request'])!=canonical(request) or record['local_consumption_recorded'] is not True or record['remote_consumption_verified'] is not False or record['ready_for_execution'] is not False:raise ValueError('consumption request/status differs')
 saved=record['approval']
 _check_saved_approval(saved,request,comment_id,parent)
 return dict(commit=commit,tree=tree,parent=parent,path=path,blob=blob,record_sha256=approval.digest(record)),saved


def audit_committed_consumption(repository,request,comment_id,commit,tree):
 request=copy.deepcopy(request);errors=[];binding=None;live=None;publication=None
 try:
  binding,saved=_read_committed_claim(repository,request,comment_id,commit,tree)
  live=approval._verify_live_at_head(request,comment_id,commit)
  if not live['external_approval_verified']:raise ValueError('current owner approval differs: '+approval.failure_text(live))
  if canonical(saved['evidence']['comment'])!=canonical(live['evidence']['comment']):raise ValueError('saved/current approval comment differs')
  publication=remote.verify(repository,commit,tree)
  if not publication['fresh_remote_head_verified']:raise ValueError('fresh consumption publication differs')
 except (ValueError,TypeError,KeyError,AttributeError,OSError,subprocess.SubprocessError) as error:
  errors.append(str(error))
  if live is not None:errors.append('approval observation: '+approval.failure_text(live))
 return dict(schema='committed_population_approval_consumption.v1',remote_consumption_bound=not errors,
  external_approval_verified=not errors,errors=errors,binding=binding,live_approval=live,remote_publication=publication,
  scope='exact_claim_only_child_commit_and_live_owner_comment',remote_rollback_absence_proven=False,
  historical_edit_absence_proven=False,pre_outcome_ordering_verified=False,provenance_verified=False,
  input_lock_verified=False,ready_for_execution=False,balance_admitted=None)
