"""Read-only local Git content binding. Never substitutes for approval or lock."""
import hashlib,re,subprocess
from pathlib import PurePosixPath
from proxy_mandatory_policy_contract import canonical

def verify_git_binding(value,receipt,repository):
 errors=[]
 try:
  if type(receipt) is not dict or set(receipt)!={'commit','tree','path','blob','canonical_sha256'}:raise ValueError('receipt fields')
  for key in ('commit','tree','blob'):
   if type(receipt[key]) is not str or re.fullmatch('[0-9a-f]{40}',receipt[key]) is None:raise ValueError('immutable object ID required')
  name=receipt['path']
  if type(name) is not str or not name or PurePosixPath(name).is_absolute() or any(p in ('','..','.') for p in name.split('/')) or '\\' in name:raise ValueError('repository path')
  def git(*args):return subprocess.check_output(['git','--no-replace-objects','-C',str(repository),*args],stderr=subprocess.PIPE)
  if git('cat-file','-t',receipt['commit']).strip()!=b'commit':raise ValueError('commit type')
  if git('rev-parse',receipt['commit']+'^{tree}').decode().strip()!=receipt['tree']:raise ValueError('tree binding')
  if git('rev-parse',receipt['commit']+':'+name).decode().strip()!=receipt['blob']:raise ValueError('path/blob binding')
  body=git('cat-file','blob',receipt['blob'])
  if body!=canonical(value) or hashlib.sha256(body).hexdigest()!=receipt['canonical_sha256']:raise ValueError('canonical content binding')
 except (ValueError,TypeError,KeyError,OSError,subprocess.CalledProcessError) as error:errors.append(str(error))
 return dict(immutable_content_verified=not errors,errors=errors,input_lock_verified=False,
  gaps=['remote_publication_unverified','external_approval_unverified','pre_outcome_ordering_unverified','generation_provenance_unverified','execution_edition_unverified'],ready_for_execution=False,balance_admitted=None)
