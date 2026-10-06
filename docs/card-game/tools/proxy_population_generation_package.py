"""Same-commit generation evidence, never OS provenance or publication consent.

Reads immutable Git blobs only; supplied material is replayed by the existing
Cursor/builder, without sampling entropy or executing any match.
"""
import hashlib,json,subprocess
from pathlib import PurePosixPath
import proxy_population_input_lock as lock
import proxy_population_execution_edition as edition
import proxy_population_input_history as history
from proxy_population_generation_journal import audit_journal_bytes
from proxy_population_manifest_builder import assemble_supplied
from proxy_population_contract import _pairs,_nonfinite,load_json
from proxy_mandatory_policy_contract import ROOT,canonical


def audit_committed_generation(bundle,receipt,certificate,repository):
 errors=[];bindings={}
 try:
  checked=lock.verify_git_binding(bundle,receipt,repository)
  if not checked['immutable_content_verified']:raise ValueError('manifest immutable binding differs: '+str(checked['errors']))
  name=receipt['path'];parent=PurePosixPath(name).parent
  if not name.startswith('docs/card-game/data/') or PurePosixPath(name).name!='manifest.json':raise ValueError('generation manifest location differs')
  def git(*args):return subprocess.check_output(['git','--no-replace-objects','-C',str(repository),*args],stderr=subprocess.PIPE)
  def read(filename):
   path=str(parent/filename);rows=git('ls-tree','-z',receipt['commit'],'--',path).split(b'\0')
   if len(rows)!=2 or rows[-1]!=b'':raise ValueError('generation artifact absent or ambiguous: '+filename)
   meta,actual=rows[0].split(b'\t');mode,kind,blob=meta.decode().split()
   if actual.decode()!=path or mode!='100644' or kind!='blob':raise ValueError('generation artifact not a regular data blob')
   body=git('cat-file','blob',blob);bindings[filename]=dict(path=path,blob=blob,sha256=hashlib.sha256(body).hexdigest())
   return body
  def document(filename):
   body=read(filename);value=json.loads(body,object_pairs_hook=_pairs,parse_constant=_nonfinite)
   if canonical(value)!=body:raise ValueError('noncanonical generation artifact: '+filename)
   return value
  if canonical(document('manifest.json'))!=canonical(bundle):raise ValueError('saved manifest differs')
  saved_edition=document('edition.json')
  if canonical(saved_edition)!=canonical(certificate):raise ValueError('saved generation edition differs')
  checked=edition.audit_bundle_edition(bundle,certificate,repository)
  if not checked['bundle_edition_bound']:raise ValueError('execution edition differs: '+str(checked['errors']))
  registry=history.build_cutoff_registry()
  if registry.get('registry_verified') is not True or canonical(document('historical-registry.json'))!=canonical(registry):raise ValueError('saved historical registry differs')
  material=document('material.json');journal=audit_journal_bytes(read('sampling-journal.jsonl'),material)
  if not journal['journal_consistent'] or not journal['complete']:raise ValueError('generation journal differs: '+str(journal['errors']))
  fixture=load_json(ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
  decks={p['player_id']:p['deck_order_top_to_bottom'] for p in fixture['input']['players']}
  sources={name:row['sha256'] for name,row in certificate['files'].items()}
  rebuilt=assemble_supplied(material,registry,decks,sources,certificate['python']['version'])
  if canonical(rebuilt)!=canonical(bundle):raise ValueError('complete material-to-manifest projection differs')
 except (ValueError,TypeError,KeyError,OSError,subprocess.CalledProcessError) as error:errors.append(str(error))
 return dict(schema='committed_population_generation_package.v1',committed_generation_consistent=not errors,
  errors=errors,artifact_bindings=bindings,scope='same_local_git_commit_registry_transcript_journal_manifest_and_current_edition',
  provenance_verified=False,input_lock_verified=False,remote_publication_verified=False,
  external_approval_verified=False,pre_outcome_ordering_verified=False,ready_for_execution=False,balance_admitted=None)
