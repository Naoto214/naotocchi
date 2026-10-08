"""Manifest-bound conditional reconstruction through the current shared backend.

Reuse468 opening/session/input binding. No entropy, input lock or batch runner.
An exact re-execution is not proof of every rule opportunity or eligibility.
"""
import hashlib
from threading import Lock,get_ident
import proxy_population_runtime_entry as entry
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_existing as existing
import proxy_population_policy_journal as policy_journal
import proxy_population_decision_binding as decision_binding
import proxy_population_resolution_semantics as semantics
from proxy_mandatory_policy_contract import ROOT,canonical

_LOCK=Lock()

def fingerprint():
 return hashlib.sha256(canonical({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'tools').glob('*.py'))})).hexdigest()


def reconstruct(bundle,match_id,limit):
 if not _LOCK.acquire(blocking=False):raise ValueError('connected entry concurrency/reentry forbidden')
 original=runtime.segment;owner=get_ident()
 def dispatch(envelope,initial,events,shots,envelopes,limit,session=None):
  if get_ident()!=owner:raise ValueError('connected entry thread differs')
  def prepare(forced):
   upgraded=runtime.engine.payments.upgrade(envelope)
   with connected.contract_scope():proof=existing.ExistingAdapter(events).proof(upgraded)
   return dict(envelope=upgraded,proof=proof)
  prepared=runtime.operation(initial,prepare)
  # The current backend reuses468's exact loop. Restore it for that call,
  # rather than recursively replacing it with the input-binding dispatcher.
  runtime.segment=original
  try:
   result=connected.segment(prepared['envelope'],initial,events,shots,envelopes,limit,prepared['proof'],session)
   if session is None:raise ValueError('connected policy origin session absent')
   result['mandatory_policy_journal']=policy_journal.export(session)
   return result
  finally:runtime.segment=dispatch
 try:
  before=fingerprint()
  runtime.segment=dispatch;result=entry.reconstruct(bundle,match_id,limit)
  local=result['opening']['mandatory_record']['local_record']
  decisions=[dict(decision_kind='mandatory_choice',local_policy_evidence=local)]+result['runtime']['decisions']
  binding={k:result['binding'][k] for k in ('protocol_id','group_id','mirror_side')}
  proof=policy_journal.audit(result['runtime']['mandatory_policy_journal'],decisions,result['origin_journal'],binding,bundle['policy_roots'][binding['group_id']])
  if not proof['local_entries_verified']:raise ValueError('actual mandatory policy journal differs: '+str(proof['errors']))
  result['mandatory_policy_entry_audit']=proof
  origins=policy_journal.audit_origins(result)
  if not origins['origin_sequence_verified']:raise ValueError('actual mandatory origin sequence differs: '+str(origins['errors']))
  result['mandatory_origin_audit']=origins
  opportunities=policy_journal.audit_opportunities(result)
  if not opportunities['designated_opportunities_covered']:raise ValueError('actual mandatory opportunities differ: '+str(opportunities['errors']))
  result['mandatory_opportunity_audit']=opportunities
  semantic=semantics.audit(result)
  if not semantic['supplied_resolution_semantics_joined']:raise ValueError('actual resolution semantics differ: '+str(semantic['errors']))
  result['resolution_semantics_audit']=semantic
  projection=decision_binding.audit_projection(result['runtime'])
  if not projection['decision_projection_verified']:raise ValueError('actual decision projection differs: '+str(projection['errors']))
  result['decision_projection_audit']=projection
  if fingerprint()!=before:raise ValueError('connected tools source changed during reconstruction')
  result.update(schema='bound_population_connected_runtime.v1',connected_tools_sha256=before,reconstruction_step_limit=limit,ready_for_execution=False,ready_for_input_generation=False)
  return result
 finally:runtime.segment=original;_LOCK.release()


def audit(record,bundle,match_id,limit):
 try:return [] if canonical(record)==canonical(reconstruct(bundle,match_id,limit)) else ['whole connected reconstruction differs']
 except (ValueError,KeyError,TypeError):return ['whole connected reconstruction failed']
