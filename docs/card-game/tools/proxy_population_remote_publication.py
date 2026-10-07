"""Fresh exact branch publication; not approval, provenance or pre-outcome lock.

Only the pinned CARD GAME remote is queried. A changed head blocks the caller;
this module neither follows a replacement edition nor retries a failed query.
"""
import os,re,subprocess,tempfile
from datetime import datetime,timezone

REMOTE='https://github.com/Naoto214/naotocchi.git'
REF='refs/heads/design/card-pool-master-20260914'


def _environment():
 # Do not accept URL rewrites, alternate object directories, replacement refs
 # or inherited command-line Git configuration as remote identity evidence.
 env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')}
 env.update(GIT_CONFIG_NOSYSTEM='1',GIT_CONFIG_GLOBAL=os.devnull,GIT_TERMINAL_PROMPT='0')
 return env


def _query_remote():
 with tempfile.TemporaryDirectory(prefix='card-game-remote-read-') as directory:
  env=_environment()
  # TMPDIR may itself be inside a checkout. Stop discovery before its .git
  # can supply local URL rewrites or HTTPS configuration to this observation.
  env['GIT_CEILING_DIRECTORIES']=os.path.dirname(os.path.realpath(directory))
  return subprocess.check_output(['git','-c','protocol.allow=never','-c','protocol.https.allow=always',
   'ls-remote','--exit-code','--refs',REMOTE,REF],cwd=directory,env=env,stderr=subprocess.PIPE,timeout=30)


def verify(repository,commit,tree):
 errors=[];observed=None;checked_at=None
 try:
  if any(type(v) is not str or re.fullmatch('[0-9a-f]{40}',v) is None for v in (commit,tree)):raise ValueError('immutable commit/tree required')
  def git(*args):return subprocess.check_output(['git','--no-replace-objects','-C',str(repository),*args],env=_environment(),stderr=subprocess.PIPE,timeout=30).decode().strip()
  if git('cat-file','-t',commit)!='commit' or git('rev-parse',commit+'^{tree}')!=tree:raise ValueError('local commit/tree binding differs')
  raw=_query_remote()
  match=re.fullmatch(rb'([0-9a-f]{40})\t'+REF.encode()+rb'\n?',raw)
  if match is None:raise ValueError('remote ref absent, ambiguous or malformed')
  observed=match.group(1).decode();checked_at=datetime.now(timezone.utc).isoformat()
  if observed!=commit:raise ValueError('remote head differs from immutable requested commit')
 except (ValueError,TypeError,OSError,UnicodeError,subprocess.SubprocessError) as error:errors.append(str(error))
 return dict(schema='fresh_population_remote_publication.v1',fresh_remote_head_verified=not errors,errors=errors,
  remote=REMOTE,ref=REF,commit=commit,tree=tree,observed_commit=observed,observed_at=checked_at,
  observation_scope='single_live_exact_ref_observation',external_approval_verified=False,input_lock_verified=False,
  pre_outcome_ordering_verified=False,provenance_verified=False,ready_for_execution=False,balance_admitted=None)
