"""Bind supervisor/worker inputs to the same live, immutable launch claim.

This is authorization binding, not readiness, chronology or semantic admission.
The fixed supervisor owns sequencing; this check prevents row/path substitution.
"""
import copy,json
from pathlib import Path
import proxy_population_execution_edition as edition
import proxy_population_execution_binding as rebinding
import proxy_population_current_preflight as preparation
import proxy_population_external_approval as approval
import proxy_population_approval_publication as publication
from proxy_population_contract import _pairs,_nonfinite
from proxy_mandatory_policy_contract import ROOT,canonical


def _prepare_launch(repository,bundle,receipt,certificate,package,limit,destination,launch_destination,schedule_index,match_id,execution_binding,resume=None):
 repository=Path(repository).resolve();destination=Path(destination)
 if repository!=ROOT.parents[1].resolve():raise ValueError('launch repository differs from current source')
 batch=destination if launch_destination is None else Path(launch_destination)
 for path in (destination,batch):
  if not path.is_absolute() or path!=path.resolve():raise ValueError('launch destination alias or noncanonical path')
  approval._destination(path.relative_to(repository).as_posix())
 if destination.exists() or destination.is_symlink() or not destination.parent.is_dir():raise ValueError('launch destination must be absent with an existing parent')
 if launch_destination is None:
  if schedule_index is not None or match_id is not None:raise ValueError('worker requires supervisor destination')
 else:
  if type(schedule_index) is not int or not 1<=schedule_index<=400:raise ValueError('invalid fixed schedule index')
  if bundle['execution_order'][schedule_index-1]!=match_id or destination!=batch/('attempt-'+str(schedule_index).zfill(4)):raise ValueError('worker row or destination differs')
 if not edition.audit_bundle_edition(bundle,certificate,repository)['bundle_edition_bound']:raise ValueError('launch bundle edition differs')
 if not edition.verify(certificate,repository)['local_edition_verified']:raise ValueError('launch source edition differs')
 if execution_binding is None:
  prepared=preparation.require_generated_package(package,certificate,repository)
  request=approval.launch_request(bundle,receipt,certificate,package,limit,batch.relative_to(repository).as_posix())
 else:
  binding=rebinding.audit(execution_binding,bundle,receipt,certificate,repository)
  prepared=binding['current_preparation']
  destination_posix=batch.relative_to(repository).as_posix()
  if resume is None:request=approval.rebinding_request(bundle,receipt,certificate,execution_binding,limit,destination_posix)
  else:request=approval.resume_request(bundle,receipt,certificate,execution_binding,limit,destination_posix,resume)
 if resume is not None and execution_binding is None:raise ValueError('checkpoint resume requires an execution binding')
 return request,prepared


def audit_launch(repository,bundle,receipt,certificate,package,limit,destination,comment_id,commit,tree,
                 *,launch_destination=None,schedule_index=None,match_id=None,execution_binding=None,resume=None):
 bundle,receipt,certificate,package,execution_binding,resume=copy.deepcopy((bundle,receipt,certificate,package,execution_binding,resume))
 errors=[];request=None;claim=None
 try:
  request,prepared=_prepare_launch(repository,bundle,receipt,certificate,package,limit,destination,launch_destination,schedule_index,match_id,execution_binding,resume)
  repository=Path(repository).resolve();batch=Path(destination) if launch_destination is None else Path(launch_destination)
  claim=publication.audit_committed_consumption(repository,request,comment_id,commit,tree)
  if not claim['remote_consumption_bound']:raise ValueError('launch approval publication differs: '+str(claim['errors']))
  if launch_destination is not None:
   start=batch/'start.json'
   if start.is_symlink():raise ValueError('supervisor start alias')
   raw=start.read_bytes();saved=json.loads(raw,object_pairs_hook=_pairs,parse_constant=_nonfinite)
   evidence=saved['launch_authorization']
   if canonical(saved.get('execution_binding'))!=canonical(execution_binding):raise ValueError('supervisor execution binding differs')
   if canonical(saved.get('resume'))!=canonical(resume):raise ValueError('supervisor resume binding differs')
   if canonical(saved.get('current_preparation'))!=canonical(prepared):raise ValueError('supervisor preparation edition differs')
   if canonical(saved)!=raw or saved['schema']!='fixed_population_supervisor_start.v1' or evidence['launch_authorization_bound'] is not True or evidence['request']!=request or evidence['consumption']['binding']!=claim['binding']:raise ValueError('saved supervisor approval differs')
  if not edition.verify(certificate,repository)['local_edition_verified']:raise ValueError('launch source changed during live approval checks')
 except (ValueError,TypeError,KeyError,IndexError,OSError) as error:
  errors.append(str(error))
  if claim is not None and claim.get('live_approval') is not None:errors.append('launch approval observation: '+approval.failure_text(claim['live_approval']))
 return dict(schema='population_launch_authorization_binding.v1',launch_authorization_bound=not errors,
  errors=errors,request=request,consumption=claim,scope='current_edition_fixed_schedule_destination_and_live_claim',
  pre_outcome_ordering_verified=False,input_lock_verified=False,ready_for_execution=False,balance_admitted=None)


def _preclaim_package(repository,bundle,receipt,certificate,execution_binding):
 from proxy_mandatory_population_input import audit_input_bundle
 from proxy_population_input_lock import verify_git_binding
 from proxy_population_generation_package import audit_committed_generation
 if not audit_input_bundle(bundle)['structure_verified']:raise ValueError('manifest structure unverified')
 if not verify_git_binding(bundle,receipt,repository)['immutable_content_verified']:raise ValueError('immutable manifest binding unverified')
 if execution_binding is not None:return None # Shared preparation audits full rebinding.
 package=audit_committed_generation(bundle,receipt,certificate,repository)
 if not package['committed_generation_consistent']:raise ValueError('generation package unverified')
 return package


def prevalidate_launch(repository,bundle,receipt,certificate,limit,destination,comment_id,*,execution_binding=None,resume=None):
 """Read-only pre-consumption checks; never a token for later dispatch."""
 bundle,receipt,certificate,execution_binding,resume=copy.deepcopy((bundle,receipt,certificate,execution_binding,resume))
 request=None;live=None;remote=None;errors=[]
 try:
  approval.require_operation_ready('launch',repository=repository,certificate=certificate)
  package=_preclaim_package(repository,bundle,receipt,certificate,execution_binding)
  request,_=_prepare_launch(repository,bundle,receipt,certificate,package,limit,destination,None,None,None,execution_binding,resume)
  live=approval.verify_live(request,comment_id)
  if not live['external_approval_verified']:raise ValueError('pre-consumption approval differs: '+approval.failure_text(live))
  remote=publication.remote.verify(repository,request['publication']['commit'],request['publication']['tree'])
  if not remote['fresh_remote_head_verified']:raise ValueError('pre-consumption remote publication differs')
  if not edition.verify(certificate,repository)['local_edition_verified']:raise ValueError('source changed during pre-consumption checks')
 except (ValueError,TypeError,KeyError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='population_launch_preconsumption.v1',preconsumption_verified=not errors,
  errors=errors,request=request,live_approval=live,remote_publication=remote,ready_for_execution=False)


def consume_launch_after_prevalidation(repository,bundle,receipt,certificate,limit,destination,comment_id,*,execution_binding=None,resume=None):
 """Future operator entry: all read-only checks before exactly one consumption.

No publication, supervisor or worker launch here. An error is terminal to this
call. A consumed ID remains consumed even if subsequent publication/start fails.
"""
 checked=prevalidate_launch(repository,bundle,receipt,certificate,limit,destination,comment_id,execution_binding=execution_binding,resume=resume)
 if not checked['preconsumption_verified']:raise ValueError('launch pre-consumption failed: '+canonical(checked).decode())
 try:consumption=approval.consume_live(checked['request'],comment_id)
 except (ValueError,OSError) as error:
  raise type(error)(str(error)+'; prevalidation: '+canonical(checked).decode()) from error
 return dict(prevalidation=checked,consumption=consumption)
