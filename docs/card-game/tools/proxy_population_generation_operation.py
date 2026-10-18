"""Immutable generation records and claim ancestry; not OS origin/chronology.

The package must be a direct child of its exact generation claim and add only
its seven artifacts. Current launch approval remains separately authenticated.
"""
import hashlib,subprocess
from pathlib import PurePosixPath
import proxy_population_external_approval as approval
import proxy_population_approval_publication as publication
from proxy_mandatory_policy_contract import canonical

ARTIFACTS=('completion.json','edition.json','historical-registry.json','manifest.json','material.json','operation.json','sampling-journal.jsonl')


def audit(repository,receipt,certificate,registry,operation,completion,material,journal_bytes,journal):
 errors=[];binding=None
 try:
  parent=PurePosixPath(receipt['path']).parent
  request=approval.generation_request(certificate,str(parent),registry)
  if operation['schema']!='population_generation_operation.v1' or operation['api']!='os.urandom' or any(type(operation[k]) is not str or not operation[k].strip() for k in ('os_name','platform','approval_reference')):raise ValueError('generation operation metadata differs')
  if operation['external_approval_verified'] is not True or any(operation[k] is not False for k in ('provenance_verified','input_lock_verified','execution_authorized','ready_for_execution')):raise ValueError('generation operation scope differs')
  auth=operation['generation_authorization'];claim=auth['consumption']
  if auth['schema']!='population_generation_authorization_binding.v1' or auth['generation_authorization_bound'] is not True or auth['errors'] or canonical(auth['request'])!=canonical(request):raise ValueError('generation operation request differs')
  if any(auth[k] is not False for k in ('provenance_verified','pre_outcome_ordering_verified','input_lock_verified','ready_for_input_generation','ready_for_execution')):raise ValueError('generation authorization scope differs')
  if claim['schema']!='committed_population_approval_consumption.v1' or any(claim[k] is not False for k in ('remote_rollback_absence_proven','historical_edit_absence_proven','pre_outcome_ordering_verified','provenance_verified','input_lock_verified','ready_for_execution')):raise ValueError('generation claim scope inflated')
  if auth['balance_admitted'] is not None or claim['balance_admitted'] is not None:raise ValueError('generation admission scope inflated')
  saved_binding=claim['binding'];comment_id=claim['live_approval']['comment_id']
  binding,saved=publication._read_committed_claim(repository,request,comment_id,saved_binding['commit'],saved_binding['tree'])
  if canonical(binding)!=canonical(saved_binding) or claim['remote_consumption_bound'] is not True or claim['external_approval_verified'] is not True or claim['errors']:raise ValueError('generation claim binding differs')
  live=claim['live_approval'];publication._check_saved_approval(live,request,comment_id,binding['commit'])
  if live['external_approval_verified'] is not True or live['errors'] or live['request_sha256']!=approval.digest(request) or live['evidence']['observed_publication_commit']!=binding['commit'] or canonical(live['evidence']['comment'])!=canonical(saved['evidence']['comment']):raise ValueError('saved generation live observation differs')
  remote=claim['remote_publication']
  if remote['schema']!='fresh_population_remote_publication.v1' or remote['remote']!=publication.remote.REMOTE or remote['ref']!=publication.remote.REF or remote['commit']!=binding['commit'] or remote['errors']!=[] or remote['observation_scope']!='single_live_exact_ref_observation':raise ValueError('saved generation remote identity differs')
  if remote['balance_admitted'] is not None or any(remote[k] is not False for k in ('external_approval_verified','input_lock_verified','pre_outcome_ordering_verified','provenance_verified','ready_for_execution')):raise ValueError('saved generation remote scope inflated')
  if canonical(operation['remote_publication_observation'])!=canonical(remote) or remote['fresh_remote_head_verified'] is not True or remote['observed_commit']!=binding['commit'] or remote['tree']!=binding['tree']:raise ValueError('generation remote observation differs')
  def git(*args):return subprocess.check_output(['git','--no-replace-objects','-C',str(repository),*args],env=publication.remote._environment(),stderr=subprocess.PIPE,timeout=30)
  headers=git('cat-file','commit',receipt['commit']).split(b'\n\n',1)[0].splitlines()
  if [r[7:].decode() for r in headers if r.startswith(b'parent ')]!=[binding['commit']]:raise ValueError('generation package must directly follow the generation claim')
  expected=b''.join(b'A\0'+str(parent/name).encode()+b'\0' for name in ARTIFACTS)
  if git('diff-tree','--no-commit-id','--name-status','--no-renames','-r','-z',binding['commit'],receipt['commit'])!=expected:raise ValueError('generation package must add exactly seven artifacts')
  collection=dict(complete=True,journal_sha256=hashlib.sha256(journal_bytes).hexdigest(),material_sha256=hashlib.sha256(canonical(material)).hexdigest(),provenance_verified=False,input_lock_verified=False,resume_allowed=False,ready_for_execution=False)
  expected_completion=dict(schema='population_generation_local_completion.v1',collection=collection,journal=journal,actual_os_read_calls=len(material['calls']),returned_byte_count=sum(r['byte_count'] for r in material['calls']),planned_groups=200,planned_matches=400,completed_local_generation=True,external_approval_verified=True,provenance_verified=False,input_lock_verified=False,remote_publication_verified=False,ready_for_execution=False,independent_balance_sample_count=0,new_matches=0,policy_promoted=False)
  if canonical(completion)!=canonical(expected_completion):raise ValueError('generation completion/material/journal differs')
 except (ValueError,KeyError,TypeError,AttributeError,OSError,subprocess.SubprocessError) as error:errors.append(str(error))
 return dict(schema='committed_population_generation_operation.v1',operation_records_bound=not errors,errors=errors,claim_binding=binding,
  scope='immutable_saved_operation_completion_and_direct_claim_ancestry',provenance_verified=False,
  historical_edit_absence_proven=False,remote_rollback_absence_proven=False,pre_outcome_ordering_verified=False,
  external_approval_verified=False,input_lock_verified=False,ready_for_execution=False)
