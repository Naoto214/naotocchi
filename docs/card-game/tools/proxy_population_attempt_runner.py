"""Future single-process attempt entry, never an automatic population dispatcher.

The exact live launch claim is rechecked here for the assigned supervisor row.
Pre-outcome locking and execution readiness remain separate closed gates.
Reference text is not authority. Tests use historical conditional prefixes.
"""
import copy,gzip,hashlib,os
from pathlib import Path
import proxy_population_connected_entry as connected
import proxy_population_admission as admission
import proxy_population_input_lock as lock
import proxy_population_execution_edition as edition
import proxy_population_external_approval as external_approval
import proxy_population_generation_package as generation_package
import proxy_population_remote_publication as remote
import proxy_population_launch_authorization as authorization
import proxy_population_execution_binding as rebinding
from proxy_population_generation_entry import write_exclusive
from proxy_population_opening import load_match
from proxy_mandatory_policy_contract import ROOT,canonical


def run_after_external_approval(bundle,receipt,certificate,repository,match_id,limit,destination,approval_reference,*,comment_id=None,claim_commit=None,claim_tree=None,launch_destination=None,schedule_index=None,execution_binding=None,resume=None):
 if type(approval_reference) is not str or not approval_reference.strip():raise ValueError('external approval reference required; not an authentication token')
 preparation=external_approval.require_operation_ready('launch',repository=repository,certificate=certificate)
 if type(limit) is not int or not 1<=limit<=512:raise ValueError('invalid bounded step limit')
 repository=Path(repository).resolve();destination=Path(destination)
 if repository!=ROOT.parents[1].resolve() or not destination.is_relative_to((ROOT/'data').resolve()) or destination==(ROOT/'data').resolve():raise ValueError('attempt requires current repository and a new CARD GAME data directory')
 bundle=copy.deepcopy(bundle);receipt=copy.deepcopy(receipt);certificate=copy.deepcopy(certificate)
 if execution_binding is not None:rebinding.require_context(execution_binding)
 execution_binding=copy.deepcopy(execution_binding);resume=copy.deepcopy(resume)
 if resume is not None and execution_binding is None:raise ValueError('checkpoint resume requires an execution binding')
 binding=lock.verify_git_binding(bundle,receipt,repository)
 if not binding['immutable_content_verified']:raise ValueError('local immutable manifest binding failed')
 version=edition.audit_bundle_edition(bundle,certificate,repository)
 if not version['bundle_edition_bound']:raise ValueError('local source/Python edition binding failed')
 package=generation_package.audit_committed_generation(bundle,receipt,certificate,repository) if execution_binding is None else None
 if execution_binding is None and not package['committed_generation_consistent']:raise ValueError('committed generation package unverified')
 authenticated=authorization.audit_launch(repository,bundle,receipt,certificate,package,limit,destination,comment_id,claim_commit,claim_tree,launch_destination=launch_destination,schedule_index=schedule_index,match_id=match_id,execution_binding=execution_binding,resume=resume)
 if not authenticated['launch_authorization_bound']:raise ValueError('launch approval unverified: '+str(authenticated['errors']))
 publication=authenticated['consumption']['remote_publication']
 load_match(bundle,match_id)
 destination.mkdir()
 directory=os.open(destination.parent,os.O_RDONLY|os.O_DIRECTORY)
 try:os.fsync(directory)
 finally:os.close(directory)
 start=dict(schema='conditional_population_attempt_start.v1',current_preparation=preparation,match_id=match_id,reconstruction_step_limit=limit,
  supplied_bundle_sha256=hashlib.sha256(canonical(bundle)).hexdigest(),immutable_local_receipt=receipt,
  execution_edition_sha256=hashlib.sha256(canonical(certificate)).hexdigest(),approval_reference=approval_reference,generation_package_evidence=package,
  remote_publication_observation=publication,launch_authorization=authenticated,external_approval_verified=True,input_lock_verified=False,ready_for_execution=False)
 if execution_binding is not None:start['execution_binding']=execution_binding
 if resume is not None:start['resume']=resume
 write_exclusive(destination/'start.json',start)
 try:
  if edition.verify(certificate,repository)['local_edition_verified'] is not True:raise ValueError('source edition changed before attempt')
  record=connected.reconstruct(bundle,match_id,limit)
  raw=canonical(record);compressed=gzip.compress(raw,mtime=0)
  with (destination/'record.json.gz').open('xb') as stream:
   stream.write(compressed);stream.flush();os.fsync(stream.fileno())
  directory=os.open(destination,os.O_RDONLY|os.O_DIRECTORY)
  try:os.fsync(directory)
  finally:os.close(directory)
  checked=edition.verify(certificate,repository)
  if not checked['local_edition_verified']:raise ValueError('source edition changed during attempt')
  evaluated=admission.audit_match([record],bundle,match_id)
  if evaluated['source_reconstructed_attempt_count']!=1:raise ValueError('attempt failed independent source reconstruction')
  checked=edition.verify(certificate,repository)
  if not checked['local_edition_verified']:raise ValueError('source edition changed during replay')
  report=dict(schema='conditional_population_attempt_receipt.v1',match_id=match_id,
   record_sha256=hashlib.sha256(raw).hexdigest(),compressed_sha256=hashlib.sha256(compressed).hexdigest(),
   execution_status=evaluated['execution_status'],admission=evaluated,source_reconstructed=True,
   external_approval_verified=False,input_lock_verified=False,ready_for_execution=False,
   policy_promoted=False,independent_balance_sample_count=0)
  write_exclusive(destination/'receipt.json',report);return report
 except BaseException as error:
  try:write_exclusive(destination/'interruption.json',dict(schema='population_attempt_interruption.v1',match_id=match_id,error_type=type(error).__name__,automatic_retry_allowed=False,ready_for_execution=False))
  except OSError:pass
  raise
