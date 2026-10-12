"""Pure supplied-input edition comparison. No entropy or execution authority."""
import copy
from proxy_mandatory_policy_contract import canonical,ROOT
from proxy_population_contract import load_json
from proxy_population_manifest_builder import assemble_supplied

# Executable generation algorithms, separately from launch authorization code.
GENERATORS=('proxy_population_manifest_builder','proxy_population_material_protocol',
 'proxy_population_generation_journal','proxy_normal_decision_first_choice_audit',
 'proxy_mandatory_policy_random','proxy_mandatory_policy_contract','proxy_mandatory_population_input',
 'proxy_population_contract','proxy_mandatory_choice_boundary','proxy_mandatory_policy_local',
 'proxy_independent_seed_probe','proxy_normal_decision_fallback_contract','proxy_normal_decision_hardening',
 'proxy_normal_decision_seeded_restart','proxy_population_input_history','proxy_record_validator')

def source_delta(old,new):
 a=old['files'];b=new['files']
 return {n:dict(before=a.get(n),after=b.get(n)) for n in sorted(set(a)|set(b)) if a.get(n)!=b.get(n)}

def require_equivalent(original,derived):
 if type(original) is not dict or type(derived) is not dict or set(original)!=set(derived):raise ValueError('manifest fields differ')
 if 'source_versions' not in original:raise ValueError('source versions missing')
 if canonical({k:v for k,v in original.items() if k!='source_versions'})!=canonical({k:v for k,v in derived.items() if k!='source_versions'}):raise ValueError('non-source manifest values differ')

def derive(original,material,registry,old,new,allowed_delta):
 if canonical(old['python'])!=canonical(new['python']) or original['python_version']!=old['python']['version']:raise ValueError('Python identity differs')
 for module in GENERATORS:
  name='tools/'+module+'.py'
  if old['files'].get(name)!=new['files'].get(name):raise ValueError('generator source differs: '+name)
 delta=source_delta(old,new)
 if not delta or canonical(delta)!=canonical(allowed_delta):raise ValueError('explicit source delta differs')
 old_sources={n:r['sha256'] for n,r in old['files'].items()}
 if original['source_versions']!=old_sources:raise ValueError('original edition source map differs')
 fixture=load_json(ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
 decks={p['player_id']:p['deck_order_top_to_bottom'] for p in fixture['input']['players']}
 result=assemble_supplied(material,registry,decks,{n:r['sha256'] for n,r in new['files'].items()},new['python']['version'])
 require_equivalent(original,result)
 return copy.deepcopy(result)

# Historical validation executes trusted immutable repository code in its own
# checkout. Only the explicitly read-only audit entry points are invoked.
import hashlib,json,os,subprocess,sys,tempfile
from pathlib import Path,PurePosixPath
from urllib.request import Request,build_opener
import proxy_population_external_approval as approval
import proxy_population_input_lock as lock
import proxy_population_remote_publication as remote
from proxy_population_contract import _pairs,_nonfinite

def git(repository,*args):
 return subprocess.check_output(['git','--no-replace-objects','-C',str(repository),*args],env=remote._environment(),stderr=subprocess.PIPE,timeout=60)

def document(raw):return json.loads(raw,object_pairs_hook=_pairs,parse_constant=_nonfinite)

def read_remote_commit(commit):
 approval._sha(commit,40)
 url=approval.API+'/git/commits/'+commit
 with build_opener(approval._NoRedirect()).open(Request(url,headers={'Accept':'application/vnd.github+json','User-Agent':'naotocchi-rebinding','Cache-Control':'no-cache'}),timeout=30) as response:
  if response.status!=200 or response.geturl()!=url:raise ValueError('historical publication response differs')
  raw=response.read(4*1024*1024+1)
  if len(raw)>4*1024*1024:raise ValueError('historical publication oversized')
 return document(raw)

def require_remote_commit(commit,tree):
 approval._sha(commit,40);approval._sha(tree,40)
 value=read_remote_commit(commit)
 if value.get('sha')!=commit or value.get('tree',{}).get('sha')!=tree:raise ValueError('historical remote commit/tree differs')

def read_receipt(repository,receipt):
 body=git(repository,'cat-file','blob',receipt['blob']);value=document(body)
 if not lock.verify_git_binding(value,receipt,repository)['immutable_content_verified']:raise ValueError('immutable receipt differs')
 rows=git(repository,'ls-tree','-z',receipt['commit'],'--',receipt['path']).split(b'\0')
 if len(rows)!=2 or not rows[0].startswith(b'100644 blob '):raise ValueError('receipt must bind regular blob')
 return value

def sibling(repository,receipt,name):
 path=str(PurePosixPath(receipt['path']).parent/name)
 rows=git(repository,'ls-tree','-z',receipt['commit'],'--',path).split(b'\0')
 if len(rows)!=2 or not rows[0].startswith(b'100644 blob '):raise ValueError('historical package sibling missing')
 blob=rows[0].split(b'\t')[0].split()[2].decode()
 return document(git(repository,'cat-file','blob',blob))

HISTORICAL_SCRIPT='''import sys,json
sys.path.insert(0,sys.argv[1])
import proxy_population_execution_edition as edition
import proxy_population_generation_package as package
import proxy_population_current_preflight as preparation
from proxy_mandatory_policy_contract import canonical
from proxy_population_contract import _pairs,_nonfinite
args=json.loads(sys.stdin.buffer.read(),object_pairs_hook=_pairs,parse_constant=_nonfinite)
repo=args['repository'];cert=args['certificate']
if not edition.verify(cert,repo)['local_edition_verified']:raise ValueError('old checkout edition differs')
result=package.audit_committed_generation(args['bundle'],args['receipt'],cert,repo)
if not result['committed_generation_consistent']:raise ValueError(str(result['errors']))
prepared=preparation.require_generated_package(result,cert,repo)
if not edition.verify(cert,repo)['local_edition_verified']:raise ValueError('old checkout changed')
sys.stdout.buffer.write(canonical(dict(package=result,preparation=prepared)))
'''

def audit_historical(repository,receipt):
 repository=Path(repository).resolve();bundle=read_receipt(repository,receipt)
 certificate=sibling(repository,receipt,'edition.json')
 approval._sha(certificate['commit'],40)
 require_remote_commit(receipt['commit'],receipt['tree'])
 # The immutable package tree binds all seven blobs. Existing old auditors
 # verify the direct claim-only ancestry and original saved API observations.
 with tempfile.TemporaryDirectory(prefix='population-old-edition-') as directory:
  checkout=Path(directory)/'source'
  subprocess.run(['git','clone','--shared','--no-checkout','--local',str(repository),str(checkout)],env=remote._environment(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True,timeout=60)
  git(checkout,'sparse-checkout','set','docs/card-game')
  git(checkout,'checkout','--detach',certificate['commit'])
  args=dict(repository=str(checkout),bundle=bundle,receipt=receipt,certificate=certificate)
  result=subprocess.run([sys.executable,'-I','-B','-c',HISTORICAL_SCRIPT,str(checkout/'docs/card-game/tools')],input=canonical(args),stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=dict(remote._environment(),PYTHONUNBUFFERED='1',PYTHONDONTWRITEBYTECODE='1'),timeout=180)
  if result.returncode:raise ValueError('old edition audit failed: '+result.stderr.decode()[-2000:])
  proof=document(result.stdout)
  if canonical(proof)!=result.stdout or proof['package']['committed_generation_consistent'] is not True or proof['preparation']['preflight_ready'] is not True:raise ValueError('old audit response differs')
  return proof

def build(repository,original_receipt,certificate,allowed_delta):
 import proxy_population_execution_edition as edition
 import proxy_population_current_preflight as preparation
 repository=Path(repository).resolve()
 if repository!=ROOT.parents[1].resolve():raise ValueError('binding source repository differs')
 if not edition.verify(certificate,repository)['local_edition_verified']:raise ValueError('binding current edition differs')
 original=read_receipt(repository,original_receipt);old=sibling(repository,original_receipt,'edition.json')
 # Original saved data and numbered rule texts cannot be retrospectively repaired.
 import re
 for name,row in old['files'].items():
  if name.startswith('data/') or re.fullmatch(r'[0-9]+-[^/]+\.md',name):
   if certificate['files'].get(name)!=row:raise ValueError('binding protected original changed: '+name)
 git(repository,'merge-base','--is-ancestor',original_receipt['commit'],certificate['commit'])
 historical=audit_historical(repository,original_receipt)
 current=preparation.audit(certificate,repository)
 if current['preflight_ready'] is not True:raise ValueError('binding new preflight incomplete: '+str(current['errors']))
 material=sibling(repository,original_receipt,'material.json');registry=sibling(repository,original_receipt,'historical-registry.json')
 derived=derive(original,material,registry,old,certificate,allowed_delta)
 result=dict(schema='population_execution_binding.v1',original_receipt=copy.deepcopy(original_receipt),
  old_edition=approval._edition(old),new_edition=approval._edition(certificate),
  original_manifest_sha256=approval.digest(original),derived_manifest_sha256=approval.digest(derived),
  source_delta=copy.deepcopy(allowed_delta),historical_audit=historical,current_preparation=current,
  equivalent_except=['source_versions'],new_independent_samples=0,operation_authorized=False,
  automatic_retry_allowed=False,automatic_resume_allowed=False)
 return result,derived

def require_context(context):
 if type(context) is not dict or set(context)!={'binding','binding_receipt'}:raise ValueError('execution binding context missing or malformed')

def audit(context,bundle,receipt,certificate,repository):
 try:
  require_context(context);saved=read_receipt(repository,context['binding_receipt'])
  if canonical(saved)!=canonical(context['binding']):raise ValueError('binding supplied proof differs')
  published=context['binding_receipt']
  if any(receipt[k]!=published[k] for k in ('commit','tree')):raise ValueError('binding manifest publication differs')
  if PurePosixPath(receipt['path']).parent!=PurePosixPath(published['path']).parent or PurePosixPath(receipt['path']).name!='manifest.json' or PurePosixPath(published['path']).name!='binding.json':raise ValueError('binding artifact locations differ')
  parent=str(PurePosixPath(published['path']).parent)
  if not parent.startswith('docs/card-game/data/proxy-population-effective-application/verification/'):raise ValueError('binding artifact namespace differs')
  headers=git(repository,'cat-file','commit',published['commit']).split(b'\n\n',1)[0].splitlines()
  if [r[7:].decode() for r in headers if r.startswith(b'parent ')]!=[certificate['commit']]:raise ValueError('binding publication must directly follow edition')
  expected=b''.join(b'A\0'+(parent+'/'+name).encode()+b'\0' for name in ('binding.json','manifest.json'))
  if git(repository,'diff-tree','--no-commit-id','--name-status','--no-renames','-r','-z',certificate['commit'],published['commit'])!=expected:raise ValueError('binding publication must append exactly two artifacts')
  if canonical(read_receipt(repository,receipt))!=canonical(bundle):raise ValueError('binding manifest differs')
  actual,derived=build(repository,saved['original_receipt'],certificate,saved['source_delta'])
  if canonical(saved)!=canonical(actual) or canonical(bundle)!=canonical(derived):raise ValueError('binding reconstruction differs')
  return actual
 except (KeyError,TypeError,AttributeError,OSError,subprocess.SubprocessError) as error:raise ValueError('execution binding audit failed: '+str(error)) from error
