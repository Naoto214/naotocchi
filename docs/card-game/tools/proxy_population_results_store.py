"""Append-only results branch for one fixed-400 attempt (2026-10-23 C案).

Each completed row is one commit on refs/heads/fixed400-results/<attempt_id>,
pushed immediately so a lost container cannot lose a verified row. The approval
PR branch is never written here, so the approved launch head stays fixed.
Nothing is ever amended, force-pushed or deleted; a remote that moved on its own
stops the caller. Loading reads exact immutable commits only.
"""
import gzip,json,os,shutil,subprocess,time
from pathlib import Path,PurePosixPath
from proxy_population_contract import _pairs,_nonfinite
from proxy_mandatory_policy_contract import canonical

BRANCH_PREFIX='fixed400-results/'
AUTHOR='naotocchi fixed400 supervisor <fixed400@naotocchi.local>'
PUSH_ATTEMPTS=3


class PersistError(ValueError):
 """The row completed locally but is not on the results branch."""


def branch_name(attempt_id):return BRANCH_PREFIX+attempt_id
def row_prefix(attempt_id):return 'docs/card-game/data/proxy-population-400-attempt-'+attempt_id+'/rows/'
def _environment():
 env=dict(os.environ);env.update(GIT_TERMINAL_PROMPT='0',GIT_AUTHOR_NAME='naotocchi fixed400 supervisor',GIT_AUTHOR_EMAIL='fixed400@naotocchi.local',GIT_COMMITTER_NAME='naotocchi fixed400 supervisor',GIT_COMMITTER_EMAIL='fixed400@naotocchi.local');return env


class Store:
 def __init__(self,repository,attempt_id,workspace,remote='origin',generation=0):
  self.repository=Path(repository).resolve();self.attempt_id=attempt_id;self.branch=branch_name(attempt_id);self.remote=remote
  if type(generation) is not int or generation<0:raise ValueError('results generation differs')
  # One workspace per generation: a resume in the same container never reuses the old one.
  self.workspace=Path(workspace).resolve()/('results-'+attempt_id+'-g'+str(generation).zfill(3));self.prefix=row_prefix(attempt_id)
  if self.workspace.is_relative_to(self.repository):raise ValueError('results workspace must be outside the repository checkout')
 def git(self,*args,cwd=None,timeout=120):
  return subprocess.check_output(['git','--no-replace-objects','-C',str(cwd or self.repository),*args],stderr=subprocess.PIPE,env=_environment(),timeout=timeout).decode().strip()
 def remote_head(self):
  out=subprocess.run(['git','-C',str(self.repository),'ls-remote','--exit-code','--refs',self.remote,'refs/heads/'+self.branch],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=_environment(),timeout=60)
  if out.returncode==2:return None
  if out.returncode:raise PersistError('results branch query failed: '+out.stderr.decode(errors='replace')[-500:])
  return out.stdout.decode().split()[0]
 def fetch_exact(self,commit,tree):
  """Fetch the remote branch and require its head to be exactly the referenced commit/tree."""
  subprocess.run(['git','-C',str(self.repository),'fetch','--no-tags',self.remote,'refs/heads/'+self.branch],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=_environment(),timeout=300)
  head=self.remote_head()
  if head!=commit:raise ValueError('results branch head differs from the approved reference')
  if self.git('cat-file','-t',commit)!='commit' or self.git('rev-parse',commit+'^{tree}')!=tree:raise ValueError('results reference commit/tree differs')
  return head
 def prepare(self,base_commit,expected_head=None):
  """Attach a worktree: new branch at base_commit, or the existing remote branch at exactly expected_head."""
  if self.workspace.exists():raise ValueError('results workspace already exists')
  head=self.remote_head()
  if head is None:
   if expected_head is not None:raise ValueError('results branch absent for resume')
   # Detached: the branch exists only remotely, so no worktree ever holds it checked out.
   self.git('worktree','add','--detach',str(self.workspace),base_commit)
  else:
   if expected_head is None:raise ValueError('attempt results branch already exists; start a resume generation instead')
   if head!=expected_head:raise ValueError('results branch moved since the approved reference')
   subprocess.run(['git','-C',str(self.repository),'fetch','--no-tags',self.remote,'refs/heads/'+self.branch],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=_environment(),timeout=300)
   if subprocess.run(['git','-C',str(self.repository),'merge-base','--is-ancestor',base_commit,head],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=_environment()).returncode!=0:raise ValueError('results branch does not descend from the attempt claim')
   self.git('worktree','add','--detach',str(self.workspace),head)
  return self.git('rev-parse','HEAD',cwd=self.workspace)
 def has_row(self,index):
  return (self.workspace/self.prefix/str(index).zfill(4)).exists()
 def append_row(self,index,row_dir,entry):
  """Copy one completed row and its checkpoint, commit on the results branch and push."""
  target=self.workspace/self.prefix/str(index).zfill(4)
  if target.exists():raise PersistError('row already recorded on the results branch')
  if self.git('status','--porcelain',cwd=self.workspace):raise PersistError('results workspace is not clean')
  target.mkdir(parents=True)
  for name in ('receipt.json','record.json.gz','start.json'):
   source=Path(row_dir)/name
   if not source.is_file():raise PersistError('row evidence missing: '+name)
   shutil.copyfile(source,target/name)
  (target/'checkpoint.json').write_bytes(canonical(entry))
  self.git('add','--',str(target),cwd=self.workspace)
  self.git('commit','-q','--no-gpg-sign','-m','fixed400 '+self.attempt_id+' row '+str(index).zfill(4)+' '+entry['match_id'],cwd=self.workspace)
  commit=self.git('rev-parse','HEAD',cwd=self.workspace);tree=self.git('rev-parse','HEAD^{tree}',cwd=self.workspace)
  error=None
  for attempt in range(PUSH_ATTEMPTS):
   out=subprocess.run(['git','-C',str(self.workspace),'push',self.remote,'HEAD:refs/heads/'+self.branch],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=_environment(),timeout=300)
   if out.returncode==0:
    if self.remote_head()!=commit:raise PersistError('results branch head differs after push')
    return dict(commit=commit,tree=tree,branch=self.branch)
   error=out.stderr.decode(errors='replace')[-800:]
   if 'rejected' in error or 'non-fast-forward' in error or 'fetch first' in error:break
   time.sleep(2*(attempt+1))
  raise PersistError('results push failed: '+(error or 'unknown'))
 def load_rows(self,commit):
  """Read every saved row from an immutable commit: {index: (entry, receipt_body, compressed)}."""
  listing=self.git('ls-tree','-r','-z','--name-only',commit,'--',self.prefix.rstrip('/'))
  rows={}
  for name in [n for n in listing.split('\0') if n]:
   rel=PurePosixPath(name).relative_to(PurePosixPath(self.prefix.rstrip('/')))
   if len(rel.parts)!=2:raise ValueError('unexpected results layout: '+name)
   index=rel.parts[0]
   if not (index.isdigit() and len(index)==4):raise ValueError('unexpected row directory: '+name)
   rows.setdefault(int(index),{})[rel.parts[1]]=name
  result={}
  for index,files in rows.items():
   if set(files)!={'receipt.json','record.json.gz','start.json','checkpoint.json'}:raise ValueError('row '+str(index)+' evidence incomplete')
   blob=lambda n:subprocess.check_output(['git','--no-replace-objects','-C',str(self.repository),'cat-file','blob',commit+':'+files[n]],stderr=subprocess.PIPE,env=_environment())
   entry_body=blob('checkpoint.json');entry=json.loads(entry_body,object_pairs_hook=_pairs,parse_constant=_nonfinite)
   if canonical(entry)!=entry_body:raise ValueError('row '+str(index)+' checkpoint is not canonical')
   result[index]=(entry,blob('receipt.json'),blob('record.json.gz'),blob('start.json'))
  return result
