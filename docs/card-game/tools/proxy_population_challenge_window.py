"""Reuse the current sequential driver, native challenge and approved474 scope."""
from contextlib import contextmanager
from threading import Lock
import proxy_population_incarnation_window as incarnation
import proxy_population_trigger_window as window
import proxy_population_trigger_existing as existing
import proxy_population_normal_frontier as normal
import proxy_population_effect_application_runtime as application
from proxy_mandatory_policy_contract import canonical

_LOCK=Lock()

@contextmanager
def contract_scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('challenge connection concurrency/reentry forbidden')
 supported=existing.SUPPORTED;observed=window.OBSERVED_EVENTS
 try:
  existing.SUPPORTED=supported|{'M-antlion-07','P-anglerfish'};window.OBSERVED_EVENTS=observed|{'challenge_declared'}
  with normal.scope(),application.scope():yield
 finally:existing.SUPPORTED=supported;window.OBSERVED_EVENTS=observed;_LOCK.release()


def segment(envelope,initial,events,shots,envelopes,limit,proof,session=None,connection=None):
 with contract_scope():
  result=incarnation.segment(envelope,initial,events,shots,envelopes,limit,proof,session,connection)
  result['connection_revision']='conditional_challenge_and_effect_application_474';return result


def validate(record,envelope,initial,events,shots,envelopes,limit,proof):
 try:return [] if canonical(record)==canonical(segment(envelope,initial,events,shots,envelopes,limit,proof)) else ['challenge connection reconstruction differs']
 except (ValueError,KeyError,TypeError):return ['challenge connection reconstruction failed']
