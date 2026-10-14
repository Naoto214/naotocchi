"""Join the actual generation inputs to the immutable, live approval claim.

Read-only. The certificate and registry must come from the generating entry,
not caller flags. Authentication does not open the separate preflight gate,
prove OS entropy origin, or certify an absence of historical remote rollback.
"""
import copy
from pathlib import Path
import proxy_population_execution_edition as edition
import proxy_population_external_approval as approval
import proxy_population_approval_publication as publication
from proxy_mandatory_policy_contract import ROOT


def audit_generation(repository,certificate,registry,destination,comment_id,commit,tree):
 certificate=copy.deepcopy(certificate);registry=copy.deepcopy(registry)
 errors=[];request=None;claim=None
 try:
  repository=Path(repository).resolve();destination=Path(destination)
  if repository!=ROOT.parents[1].resolve():raise ValueError('generation repository differs from current source')
  # Do not normalize an alias into the approved destination. Parent aliases,
  # existing files/directories and traversal all fail before side effects.
  if not destination.is_absolute() or destination!=destination.resolve():raise ValueError('generation destination alias or noncanonical path')
  relative=destination.relative_to(repository).as_posix();approval._destination(relative)
  if destination.exists() or destination.is_symlink() or not destination.parent.is_dir():raise ValueError('generation destination must be absent with an existing parent')
  checked=edition.verify(certificate,repository)
  if not checked['local_edition_verified']:raise ValueError('generation source edition differs: '+str(checked['errors']))
  request=approval.generation_request(certificate,relative,registry)
  claim=publication.audit_committed_consumption(repository,request,comment_id,commit,tree)
  if not claim['remote_consumption_bound']:raise ValueError('generation approval publication differs: '+str(claim['errors']))
  checked=edition.verify(certificate,repository)
  if not checked['local_edition_verified']:raise ValueError('generation source changed during live approval checks: '+str(checked['errors']))
 except (ValueError,TypeError,KeyError,OSError) as error:
  errors.append(str(error))
  if claim is not None and claim.get('live_approval') is not None:errors.append('generation approval observation: '+approval.failure_text(claim['live_approval']))
 return dict(schema='population_generation_authorization_binding.v1',generation_authorization_bound=not errors,
  errors=errors,request=request,consumption=claim,scope='current_local_edition_registry_destination_and_live_claim',
  provenance_verified=False,pre_outcome_ordering_verified=False,input_lock_verified=False,
  ready_for_input_generation=False,ready_for_execution=False,balance_admitted=None)
