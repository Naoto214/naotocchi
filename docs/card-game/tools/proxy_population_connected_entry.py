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
  try:return connected.segment(prepared['envelope'],initial,events,shots,envelopes,limit,prepared['proof'],session)
  finally:runtime.segment=dispatch
 try:
  before=fingerprint()
  runtime.segment=dispatch;result=entry.reconstruct(bundle,match_id,limit)
  if fingerprint()!=before:raise ValueError('connected tools source changed during reconstruction')
  result.update(schema='bound_population_connected_runtime.v1',connected_tools_sha256=before,ready_for_execution=False,ready_for_input_generation=False)
  return result
 finally:runtime.segment=original;_LOCK.release()


def audit(record,bundle,match_id,limit):
 try:return [] if canonical(record)==canonical(reconstruct(bundle,match_id,limit)) else ['whole connected reconstruction differs']
 except (ValueError,KeyError,TypeError):return ['whole connected reconstruction failed']
