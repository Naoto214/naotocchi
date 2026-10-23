"""Saved current-edition preparation under the approved operator trust model.

This checks immutable, source-bound verification records, not the honesty of an
arbitrary operator or universal noninterference. Every operation still requires
its separate live GitHub approval/claim and generation/package/edition gates.
No production entropy, approval consumption, input fixation or game execution.
"""
import gzip,hashlib,json,lzma,re,subprocess
from pathlib import Path
import proxy_population_execution_edition as edition
from proxy_population_contract import _pairs,_nonfinite
from proxy_mandatory_policy_contract import ROOT,canonical

VERIFY='data/proxy-population-effective-application/verification/'
REPORT=VERIFY+'fixed400-checkpoint-preflight.json'
PROGRESS={'plans/card-game-resume.md','plans/2026-10-08-preflight-remaining-work.md','data/proxy-population-effective-application/status.md'}
COMPONENTS={
 'P01':['tools/proxy_population_challenge_lifetime.py','tools/proxy_population_challenge_operands.py'],
 'P02':['tools/proxy_population_challenge_lifetime.py','tools/proxy_population_nonresolution_semantics.py'],
 'P03':['tools/proxy_population_payment_consumption.py','tools/proxy_population_main_movement_effect.py'],
 'P04':['tools/proxy_population_effect_creation.py','tools/proxy_population_typed_resolution.py'],
 'P05':['tools/proxy_population_payment_consumption.py','tools/proxy_population_effect_expiry.py'],
 'P06':['plans/2026-10-08-preflight-source-closure.md','tools/proxy_population_source_root.py','tools/proxy_population_source_conservation.py'],
 'P07':['tools/proxy_population_resolution_semantics.py','tools/proxy_population_nonresolution_semantics.py'],
 'P08':['tools/proxy_population_source_inventory.py','tools/proxy_population_candidate_expansions.py','tools/proxy_population_response_composition.py'],
 'P09':['tools/proxy_population_source_responsibilities.py','tools/proxy_population_trace_obligations.py','tools/proxy_population_opportunity_order.py'],
 'P10':['tools/proxy_population_permitted_inputs.py',VERIFY+'public-read-boundary-review.md'],
 'P11':['tools/proxy_population_comparison_evidence.py','plans/2026-10-12-approved-normal-comparison-evidence.md'],
 'P12':['tools/proxy_population_policy_journal.py','tools/proxy_population_admission.py'],
 'P13':['tools/proxy_population_external_approval.py','plans/2026-10-10-external-approval-trust-decision.md'],
 'P14':['tools/proxy_population_generation_entry.py','tools/proxy_population_generation_operation.py'],
 'P15':['tools/proxy_population_generation_package.py','tools/proxy_population_launch_authorization.py','tools/proxy_population_execution_binding.py','plans/2026-10-12-execution-rebinding.md','plans/execution-rebinding-preservation.json'],
 'P16':['tools/proxy_population_current_preflight.py','tools/proxy_population_connected_entry.py'],
 'P17':['tools/proxy_population_attempt_runner.py','tools/proxy_population_batch_supervisor.py'],
 'P18':['tools/proxy_population_execution_edition.py','tools/check-design-data.py'],
 'P19':['plans/2026-10-12-current-operation-gate-design.md'],
 'P22':['tools/proxy_population_main_routes.py','tools/proxy_population_payment_consumption.py']}
EVIDENCE_KEYS={'tests_summary','tests_log','tests_fingerprints','connected_summary','connected_record','connected_fingerprints','design','review'}
ROOT_FLAGS={
 'initial_obligation_audit':'initial_deal_and_first_opportunities_verified','initial_runtime_root_audit':'initial_runtime_root_verified',
 'mandatory_policy_entry_audit':'local_entries_verified','mandatory_origin_audit':'origin_sequence_verified','mandatory_opportunity_audit':'designated_opportunities_covered',
 'resolution_semantics_audit':'supplied_resolution_semantics_joined','nonresolution_semantics_audit':'supplied_nonresolution_semantics_joined',
 'decision_projection_audit':'decision_projection_verified','source_conservation_audit':'supplied_source_conservation_verified',
 'end_dispatch_obligation_audit':'supplied_end_dispatch_obligations_joined','trace_obligations_audit':'fresh_trace_responsibilities_joined',
 'source_responsibility_audit':'current107_responsibilities_joined','permitted_input_audit':'current_permitted_inputs_joined'}


def digest(body):return hashlib.sha256(body).hexdigest()
def document(body):return json.loads(body,object_pairs_hook=_pairs,parse_constant=_nonfinite)


def require_responsibilities(rows):
 if type(rows) is not dict or set(rows)!=set(COMPONENTS):raise ValueError('preflight responsibility partition differs')
 for key,row in rows.items():
  if type(row) is not dict or set(row)!={'status','evidence_refs'} or row['status']!='verified' or row['evidence_refs']!=COMPONENTS[key]:raise ValueError('preflight responsibility unverified: '+key)


def require_tests(summary,log,fingerprints,python_sources):
 modules=sorted(Path(n).stem for n in python_sources if n.startswith('tools/test_proxy_population_') or n.startswith('tools/test_proxy_mandatory_'))
 count=summary.get('tests')
 if type(summary.get('exit_code')) is not int or summary['exit_code']!=0 or type(count) is not int or count<1 or summary.get('modules')!=modules or summary.get('python_file_count')!=len(python_sources) or summary.get('fingerprints_equal') is not True:raise ValueError('preflight test completion differs')
 endings=re.findall(rb'^Ran (\d+) tests? in [0-9.]+s\n\nOK\n?\Z',log,re.M)
 if endings!=[str(count).encode()] or b'\nFAILED ' in log:raise ValueError('preflight test log incomplete')
 if type(fingerprints) is not dict or set(fingerprints)!={'before','after'} or any(fingerprints[k]!=python_sources for k in fingerprints):raise ValueError('preflight test Python edition differs')


def _git(repository,*args):
 return subprocess.check_output(['git','--no-replace-objects','-C',str(repository),*args],stderr=subprocess.PIPE,timeout=30)


def _tested_sources(repository,commit):
 if type(commit) is not str or re.fullmatch('[0-9a-f]{40}',commit) is None:raise ValueError('preflight immutable tested commit required')
 result={}
 for row in _git(repository,'ls-tree','-r','-z',commit,'--','docs/card-game/').split(b'\0'):
  if not row:continue
  meta,name=row.split(b'\t');mode,kind,blob=meta.decode().split()
  if kind!='blob' or mode not in ('100644','100755'):raise ValueError('preflight source kind differs')
  result[name.decode().removeprefix('docs/card-game/')]=blob
 if not result:raise ValueError('preflight empty tested edition')
 return result


def require_source_delta(base,files):
 for name,blob in base.items():
  if name not in files or (name not in PROGRESS and files[name]['blob']!=blob):raise ValueError('preflight tested source changed: '+name)
 for name in set(files)-set(base):
  if not name.startswith(VERIFY) or name.endswith('.py'):raise ValueError('preflight untested source addition: '+name)


def require_recorded_generation(operation,current):
 if current.get('schema')!='current_population_preparation_check.v1' or current.get('preflight_ready') is not True or current.get('errors')!=[] or canonical(operation.get('current_preparation'))!=canonical(current):raise ValueError('generation current preparation differs')


def require_generated_package(package,certificate,repository):
 # The caller has freshly verified the complete immutable seven-blob package.
 if package.get('committed_generation_consistent') is not True:raise ValueError('generation package unverified')
 current=audit(certificate,repository)
 if current['preflight_ready'] is not True:raise ValueError('launch current preparation unverified')
 row=package['artifact_bindings']['operation.json'];body=_git(repository,'cat-file','blob',row['blob'])
 if digest(body)!=row['sha256']:raise ValueError('generation operation blob differs')
 operation=document(body)
 if canonical(operation)!=body:raise ValueError('generation operation is not canonical')
 require_recorded_generation(operation,current)
 return current


def require_connection_headers(run,fp,record,python_sources,tested):
 if type(run.get('exit_code')) is not int or run['exit_code']!=0 or run.get('base_commit')!=tested or run.get('fingerprints_equal') is not True or fp!={'before':python_sources,'after':python_sources}:raise ValueError('preflight complete connection edition differs')
 if record.get('schema')!='bound_population_connected_runtime.v1' or record.get('completed') is not True or record['runtime'].get('stop') is not None or record.get('reconstruction_step_limit')!=512:raise ValueError('preflight complete connection unfinished')
 if record.get('supplied_bundle_sha256')!='b877e13d9f5a1b81ecd8d91ab524f4e29f5f16cf602db0bcbce600d5ffcf616a':raise ValueError('preflight diagnostic input differs')
 if record.get('binding',{}).get('match_id')!='test-1A' or type(record.get('independent_balance_samples')) is not int or record['independent_balance_samples']!=0 or record.get('policy_promoted') is not False:raise ValueError('preflight diagnostic input scope differs')
 tools_hash=digest(canonical({Path(n).name:h for n,h in python_sources.items() if n.startswith('tools/') and n.count('/')==1}))
 if record.get('connected_tools_sha256')!=tools_hash:raise ValueError('preflight connected tools differ')
 for key,flag in ROOT_FLAGS.items():
  p=record.get(key,{})
  if p.get(flag) is not True or p.get('errors')!=[]:raise ValueError('preflight complete connection responsibility missing: '+key)


def require_review(review,python_sources,tested,read):
 if review.get('schema')!='independent_current_preflight_review.v1' or review.get('tested_commit')!=tested or review.get('python_sha256')!=python_sources or review.get('independent') is not True or review.get('unresolved_findings')!=[] or type(review.get('reviewer')) is not str or not review['reviewer'].strip():raise ValueError('preflight independent review binding differs')
 # The report records the actual independent review under operator trust;
 # no cryptographic reviewer identity or OS observation is invented here.
 transcript=review.get('report_path')
 if not isinstance(transcript,str) or not transcript.startswith(VERIFY) or digest(read(transcript))!=review.get('report_sha256'):raise ValueError('preflight review report differs')


def audit(certificate,repository):
 errors=[];report=None;evidence={};tested=None
 try:
  repository=Path(repository).resolve()
  if repository!=ROOT.parents[1].resolve():raise ValueError('preflight repository differs from executing source')
  checked=edition.verify(certificate,repository)
  if checked['local_edition_verified'] is not True:raise ValueError('preflight current edition differs: '+str(checked['errors']))
  files=certificate['files']
  def read(name):
   if type(name) is not str or name not in files:raise ValueError('preflight evidence not in saved edition')
   body=(ROOT/name).read_bytes()
   if digest(body)!=files[name]['sha256']:raise ValueError('preflight saved artifact differs')
   return body
  raw=read(REPORT);report=document(raw)
  if canonical(report)!=raw or set(report)!={'schema','tested_commit','tested_tree','responsibilities','evidence','trust_model','deferred','preflight_ready','operation_authorized','whole_set_conclusion'} or report['schema']!='current_population_preflight_evidence.v1':raise ValueError('preflight report shape differs')
  if report['preflight_ready'] is not True or report['operation_authorized'] is not False or report['whole_set_conclusion'] is not None or report['trust_model']!='github_account_api_and_operator_executing_saved_edition' or report['deferred']!=['generation_confirmation','complete_manifest_publication','separate_launch_confirmation','P20_actual_results','P21_actual_timing']:raise ValueError('preflight report scope differs')
  require_responsibilities(report['responsibilities'])
  tested=report['tested_commit'];base=_tested_sources(repository,tested)
  if _git(repository,'rev-parse',tested+'^{tree}').decode().strip()!=report['tested_tree']:raise ValueError('preflight tested tree differs')
  _git(repository,'merge-base','--is-ancestor',tested,certificate['commit'])
  require_source_delta(base,files)
  for refs in COMPONENTS.values():
   for name in refs:
    if name not in base:raise ValueError('preflight required source absent: '+name)
    read(name)
  protected=_tested_sources(repository,'c75e7f1b4eebc5a7b3fe8d8a0aec4427c87ceee2')
  protected={n:b for n,b in protected.items() if re.fullmatch(r'[0-9]+-[^/]+\.md',n)}
  if len(protected)!=476 or any(n not in files or files[n]['blob']!=b for n,b in protected.items()):raise ValueError('preflight protected476 sources changed')
  python_sources={name:row['sha256'] for name,row in files.items() if name.endswith('.py')}
  if set(python_sources)!={n for n in base if n.endswith('.py')}:raise ValueError('preflight Python source set changed')
  evidence=report['evidence']
  if type(evidence) is not dict or set(evidence)!=EVIDENCE_KEYS or len(set(evidence.values()))!=len(EVIDENCE_KEYS) or any(not n.startswith(VERIFY) for n in evidence.values()):raise ValueError('preflight evidence component coverage differs')
  data={k:read(n) for k,n in evidence.items()}
  suite=document(data['tests_summary'])
  if suite.get('base_commit')!=tested:raise ValueError('preflight tests belong to another edition')
  require_tests(suite,data['tests_log'],document(gzip.decompress(data['tests_fingerprints'])),python_sources)
  run=document(data['connected_summary']);fp=document(gzip.decompress(data['connected_fingerprints']));record=document(lzma.decompress(data['connected_record']))
  require_connection_headers(run,fp,record,python_sources,tested)
  import proxy_population_source_responsibilities as source
  import proxy_population_permitted_inputs as permitted
  if source.audit(record)!=record['source_responsibility_audit'] or permitted.audit(record)!=record['permitted_input_audit']:raise ValueError('preflight current source/read joins differ')
  design=document(data['design'])
  if design.get('base_commit')!=tested or type(design.get('exit_code')) is not int or design['exit_code']!=0 or design.get('result',{}).get('errors')!=[]:raise ValueError('preflight design verification differs')
  review=document(data['review'])
  require_review(review,python_sources,tested,read)
  if edition.verify(certificate,repository)['local_edition_verified'] is not True:raise ValueError('preflight edition changed during verification')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError,subprocess.SubprocessError,lzma.LZMAError) as error:errors.append(str(error))
 return dict(schema='current_population_preparation_check.v1',preflight_ready=not errors,errors=errors,tested_commit=tested,
  execution_edition_sha256=digest(canonical(certificate)),evidence_paths=evidence,scope='saved_current_preparation_under_approved_operator_trust',
  generation_authorized=False,launch_authorized=False,production_inputs_generated=False,whole_set_conclusion=None,
  universal_noninterference_proven=False,os_entropy_independently_observed=False,policy_promoted=False,balance_admitted=None)
