"""Local immutable source edition, never remote publication or execution consent.

All saved CARD GAME files remain bound; added output artifacts do not rewrite
that edition. Python source additions are rejected, including untracked files.
No imports or execution of the supplied repository's code, entropy or games.
"""
import hashlib,platform,re,subprocess,sys
from pathlib import Path
from proxy_mandatory_policy_contract import canonical

PREFIX='docs/card-game/'

def capture(repository,commit):
 if type(commit) is not str or re.fullmatch('[0-9a-f]{40}',commit) is None:raise ValueError('immutable commit required')
 repo=Path(repository);root=repo/PREFIX
 def git(*args):return subprocess.check_output(['git','--no-replace-objects','-C',str(repo),*args],stderr=subprocess.PIPE)
 if git('cat-file','-t',commit).strip()!=b'commit':raise ValueError('commit type')
 files={}
 for row in git('ls-tree','-r','-z',commit,'--',PREFIX).split(b'\0'):
  if not row:continue
  meta,path=row.split(b'\t');mode,kind,blob=meta.decode().split();name=path.decode().removeprefix(PREFIX)
  target=root/name
  if kind!='blob' or mode not in ('100644','100755') or target.is_symlink() or not target.is_file():raise ValueError('source file missing or unsupported: '+name)
  body=target.read_bytes()
  if hashlib.sha1(b'blob '+str(len(body)).encode()+b'\0'+body).hexdigest()!=blob:raise ValueError('saved source differs: '+name)
  files[name]=dict(blob=blob,sha256=hashlib.sha256(body).hexdigest())
 if not files:raise ValueError('empty source edition')
 python_files={p.relative_to(root).as_posix() for p in root.rglob('*.py')}
 if python_files!={name for name in files if name.endswith('.py')}:raise ValueError('Python source set differs')
 return dict(schema='local_population_execution_edition.v1',commit=commit,
  tree=git('rev-parse',commit+'^{tree}').decode().strip(),files=files,
  python=dict(implementation=platform.python_implementation(),version=sys.version,cache_tag=sys.implementation.cache_tag),
  scope='saved_card_game_files_and_exact_python_source_set',remote_publication_verified=False,
  external_approval_verified=False,ready_for_execution=False,balance_admitted=None)

def verify(certificate,repository):
 errors=[]
 try:
  expected=capture(repository,certificate['commit'])
  if canonical(certificate)!=canonical(expected):raise ValueError('edition certificate differs')
 except (ValueError,KeyError,TypeError,OSError,subprocess.CalledProcessError) as error:errors.append(str(error))
 return dict(local_edition_verified=not errors,errors=errors,remote_publication_verified=False,
  external_approval_verified=False,input_lock_verified=False,ready_for_execution=False,balance_admitted=None)

def audit_bundle_edition(bundle,certificate,repository):
 """Exact source/Python binding only; full465/material/lock gates are separate."""
 checked=verify(certificate,repository);errors=list(checked['errors'])
 try:
  if not errors:
   expected={name:row['sha256'] for name,row in certificate['files'].items()}
   if canonical(bundle['source_versions'])!=canonical(expected):raise ValueError('bundle source edition differs')
   if bundle['python_version']!=certificate['python']['version']:raise ValueError('bundle Python edition differs')
 except (ValueError,KeyError,TypeError) as error:errors.append(str(error))
 return dict(bundle_edition_bound=not errors,errors=errors,remote_publication_verified=False,
  external_approval_verified=False,input_lock_verified=False,ready_for_execution=False,balance_admitted=None)
