"""Use unchanged positive/472 loop with native incarnation and local policy.

Only a conditional reconstruction. Selected actual transitions receive their
own lifecycle hash chain; hypothetical cache entries are not counted as steps.
"""
import copy
from contextlib import contextmanager
from threading import Lock
import proxy_population_positive_window as positive
import proxy_population_trigger_window as window
import proxy_population_policy_bridge as bridge
import proxy_population_incarnation as life
import proxy_population_incarnation_runtime as runtime
import proxy_population_incarnation_policy as policy
import proxy_continuation_payments as payments

_LOCK=Lock()

def segment(envelope,initial,events,shots,envelopes,limit,proof,session=None,connection=None):
 if envelope['schema']!=payments.SCHEMA:raise ValueError('initial envelope must be upgraded in existing runtime scope')
 if not _LOCK.acquire(blocking=False):raise ValueError('lifecycle connection reentry/concurrency forbidden')
 try:return _segment(envelope,initial,events,shots,envelopes,limit,proof,session,connection)
 finally:_LOCK.release()

def _segment(envelope,initial,events,shots,envelopes,limit,proof,session,connection):
 old_recovery=window.recovery.scope;old_handler=bridge.handler_scope
 connection=connection if connection is not None else runtime.Connection(envelope)
 original_record=copy.deepcopy(connection.records[life.digest(envelope)])
 converted=None
 if session is not None:
  # A function closure survives the existing rollback deepcopy without cloning
  # the live reconstruction cache (a bound method would copy its owner).
  converted=policy.Session(session.binding,session.roots,lambda g:connection.registry(g))
  converted.__dict__.update({k:copy.deepcopy(v) for k,v in session.__dict__.items() if k!='registry'})
 @contextmanager
 def recovery_scope():
  with old_recovery(),connection.scope():yield
 def handler_scope(s):return policy.handler_scope(s) if isinstance(s,policy.Session) else old_handler(s)
 try:
  window.recovery.scope=recovery_scope;bridge.handler_scope=handler_scope
  result=positive.segment(envelope,initial,events,shots,envelopes,limit,proof,converted)
  before=copy.deepcopy(envelope);journal=original_record;actual=[]
  for step in result['steps']:
   for event,after in zip(step['events'],step['envelopes']):
    prior=life.digest(journal);journal=life.observe(journal,before,after,event.get('instance_transitions',[]))
    actual.append(dict(event_seq=event['seq'],event_sha256=life.digest(event),before_envelope_sha256=life.digest(before),after_envelope_sha256=life.digest(after),before_lifecycle_sha256=prior,after_lifecycle_sha256=life.digest(journal)));before=after
  result.update(connection_revision='conditional_incarnation_sequential_bundle',physical_lifecycle_root=original_record,physical_lifecycle_final=journal,physical_lifecycle_steps=actual,origin_authenticated=False,opportunity_completeness_proven=False,ready_for_execution=False)
  if session is not None:session.__dict__.update({k:copy.deepcopy(v) for k,v in converted.__dict__.items() if k!='registry'})
  return result
 finally:
  window.recovery.scope=old_recovery;bridge.handler_scope=old_handler
