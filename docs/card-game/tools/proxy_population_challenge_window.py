"""Reuse the current sequential driver, native challenge and approved474 scope."""
from contextlib import contextmanager
from threading import Lock
import proxy_population_incarnation_window as incarnation
import proxy_population_trigger_window as window
import proxy_population_trigger_existing as existing
import proxy_population_normal_frontier as normal
import proxy_population_effect_application_runtime as application
import proxy_population_chain_resolution as chain
import proxy_population_growth_runtime as growth
import proxy_population_runtime as runtime
import proxy_population_end_victory as victory
import proxy_population_unproved_priority as unresolved
import proxy_population_activation_legality as legality
from proxy_mandatory_policy_contract import canonical

_LOCK=Lock()

@contextmanager
def contract_scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('challenge connection concurrency/reentry forbidden')
 supported=existing.SUPPORTED;observed=window.OBSERVED_EVENTS;prior_operation=runtime.operation;prior_step=runtime._step
 def step(*args,**kwargs):
  with unresolved.scope():return prior_step(*args,**kwargs)
 def operation(initial,callback):
  def connected(forced):
   # Install after native scopes so verified actual deltas replace their
   # historical constant-growth provenance, never the opposite order.
   with growth.scope(),victory.scope(),legality.scope():return callback(forced)
  return prior_operation(initial,connected)
 try:
  runtime.operation=operation;runtime._step=step
  existing.SUPPORTED=supported|{'M-antlion-07','P-anglerfish'};window.OBSERVED_EVENTS=observed|{'challenge_declared'}
  with normal.scope(),application.scope(),chain.scope():yield
 finally:runtime.operation=prior_operation;runtime._step=prior_step;existing.SUPPORTED=supported;window.OBSERVED_EVENTS=observed;_LOCK.release()


def segment(envelope,initial,events,shots,envelopes,limit,proof,session=None,connection=None):
 with contract_scope():
  result=incarnation.segment(envelope,initial,events,shots,envelopes,limit,proof,session,connection)
  result['connection_revision']='conditional_challenge_and_effect_application_474';return result


def validate(record,envelope,initial,events,shots,envelopes,limit,proof):
 try:return [] if canonical(record)==canonical(segment(envelope,initial,events,shots,envelopes,limit,proof)) else ['challenge connection reconstruction differs']
 except (ValueError,KeyError,TypeError):return ['challenge connection reconstruction failed']
