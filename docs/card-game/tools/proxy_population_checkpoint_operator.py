"""Operator entry points for the checkpoint/resume contract (2026-10-23 C案).

These only compose existing gates: binding audit, request v3, live owner approval,
one-time consumption and the checkpoint supervisor. Nothing here is authority:
every call still needs the exact live owner comment on PR #408, and a resume
needs a new comment for its own generation.
"""
import json,subprocess
from pathlib import Path
import proxy_population_execution_edition as edition
import proxy_population_execution_binding as rebinding
import proxy_population_external_approval as approval
import proxy_population_launch_authorization as authorization
import proxy_population_checkpoint_supervisor as supervisor
import proxy_population_results_store as results
from proxy_population_contract import _pairs,_nonfinite
from proxy_mandatory_policy_contract import canonical


def _git(repository,*args):return subprocess.check_output(['git','--no-replace-objects','-C',str(repository),*args],stderr=subprocess.PIPE).decode().strip()


def load_context(repository,publication_commit,binding_dir):
 """Receipts and documents for a published binding/manifest pair (publication P)."""
 repository=Path(repository).resolve();tree=_git(repository,'rev-parse',publication_commit+'^{tree}')
 def receipt(name):
  path=binding_dir.rstrip('/')+'/'+name;body=subprocess.check_output(['git','--no-replace-objects','-C',str(repository),'cat-file','blob',publication_commit+':'+path],stderr=subprocess.PIPE)
  value=json.loads(body,object_pairs_hook=_pairs,parse_constant=_nonfinite)
  if canonical(value)!=body:raise ValueError('published artifact is not canonical: '+name)
  import hashlib
  return dict(blob=_git(repository,'rev-parse',publication_commit+':'+path),canonical_sha256=hashlib.sha256(body).hexdigest(),commit=publication_commit,path=path,tree=tree),value
 manifest_receipt,bundle=receipt('manifest.json');binding_receipt,binding=receipt('binding.json')
 certificate=edition.capture(repository,binding['new_edition']['commit'])
 context=dict(binding=binding,binding_receipt=binding_receipt)
 rebinding.audit(context,bundle,manifest_receipt,certificate,repository)
 return dict(bundle=bundle,manifest_receipt=manifest_receipt,certificate=certificate,execution_binding=context,publication=dict(commit=publication_commit,tree=tree))


def first_generation_request(repository,context,destination,parallelism):
 """The v3 generation-0 request and its approval text, for an owner comment (never posted here)."""
 publication=context['publication']['commit']
 # The attempt is named after the approved publication; the claim will be its direct child.
 resume=supervisor.first_generation_resume(publication,parallelism)
 request=approval.resume_request(context['bundle'],context['manifest_receipt'],context['certificate'],context['execution_binding'],512,destination,resume)
 return dict(resume=resume,request=request,request_sha256=approval.digest(request),approval_text=approval.approval_text(request))


def next_generation_request(repository,context,destination,attempt_claim,generation,parallelism,workspace):
 store=results.Store(repository,supervisor.attempt_id_for_claim(repository,attempt_claim['commit']),workspace)
 resume,plan=supervisor.prepare_resume(repository,context['bundle'],context['certificate'],attempt_claim,generation,store,parallelism)
 request=approval.resume_request(context['bundle'],context['manifest_receipt'],context['certificate'],context['execution_binding'],512,destination,resume)
 return dict(resume=resume,plan={k:v for k,v in plan.items() if k!='entries'},request=request,request_sha256=approval.digest(request),approval_text=approval.approval_text(request))


def prevalidate(repository,context,destination,comment_id,resume):
 return authorization.prevalidate_launch(repository,context['bundle'],context['manifest_receipt'],context['certificate'],512,destination,comment_id,execution_binding=context['execution_binding'],resume=resume)


def consume(repository,context,destination,comment_id,resume):
 return authorization.consume_launch_after_prevalidation(repository,context['bundle'],context['manifest_receipt'],context['certificate'],512,destination,comment_id,execution_binding=context['execution_binding'],resume=resume)


def run(repository,context,destination,comment_id,claim_commit,claim_tree,resume,workspace):
 reference='https://github.com/'+approval.REPOSITORY+'/pull/'+str(approval.PR)+'#issuecomment-'+str(comment_id)
 return supervisor.run_after_external_approval(context['bundle'],context['manifest_receipt'],context['certificate'],repository,512,destination,reference,
  comment_id=comment_id,claim_commit=claim_commit,claim_tree=claim_tree,execution_binding=context['execution_binding'],resume=resume,store_workspace=workspace)
