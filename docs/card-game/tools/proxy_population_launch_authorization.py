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


def audit_launch(repository,bundle,receipt,certificate,package,limit,destination,comment_id,commit,tree,
                 *,launch_destination=None,schedule_index=None,match_id=None,execution_binding=None):
 bundle,receipt,certificate,package=copy.deepcopy((bundle,receipt,certificate,package))
 errors=[];request=None;claim=None
 try:
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
   request=approval.rebinding_request(bundle,receipt,certificate,execution_binding,limit,batch.relative_to(repository).as_posix())
  claim=publication.audit_committed_consumption(repository,request,comment_id,commit,tree)
  if not claim['remote_consumption_bound']:raise ValueError('launch approval publication differs: '+str(claim['errors']))
  if launch_destination is not None:
   start=batch/'start.json'
   if start.is_symlink():raise ValueError('supervisor start alias')
   raw=start.read_bytes();saved=json.loads(raw,object_pairs_hook=_pairs,parse_constant=_nonfinite)
   evidence=saved['launch_authorization']
   if canonical(saved.get('execution_binding'))!=canonical(execution_binding):raise ValueError('supervisor execution binding differs')
   if canonical(saved.get('current_preparation'))!=canonical(prepared):raise ValueError('supervisor preparation edition differs')
   if canonical(saved)!=raw or saved['schema']!='fixed_population_supervisor_start.v1' or evidence['launch_authorization_bound'] is not True or evidence['request']!=request or evidence['consumption']['binding']!=claim['binding']:raise ValueError('saved supervisor approval differs')
  if not edition.verify(certificate,repository)['local_edition_verified']:raise ValueError('launch source changed during live approval checks')
 except (ValueError,TypeError,KeyError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='population_launch_authorization_binding.v1',launch_authorization_bound=not errors,
  errors=errors,request=request,consumption=claim,scope='current_edition_fixed_schedule_destination_and_live_claim',
  pre_outcome_ordering_verified=False,input_lock_verified=False,ready_for_execution=False,balance_admitted=None)
