"""Apply02's final stat floor only inside the current population connection.

Keep historical native source/manifest intact, as with the474 growth adapter.
The native stats handler still computes all contributions; operands audit is
independent and never used as the executor.
"""
import hashlib
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_challenge as challenge
from proxy_mandatory_policy_contract import ROOT

SOURCE='02-main-system.md'
SOURCE_SHA='6a0d04606f066f9078e88422394d3d0c5f5c6d927806bb0be99366f503af5127'
_LOCK=Lock()

@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('challenge arithmetic scope concurrency/reentry forbidden')
 prior=challenge.stats
 def stats(envelope,actor):
  if hashlib.sha256((ROOT/SOURCE).read_bytes()).hexdigest()!=SOURCE_SHA:raise ValueError('challenge stat floor source changed')
  values=prior(envelope,actor)
  if set(values)!={'power','wisdom'} or any(type(v) is not int for v in values.values()):raise ValueError('native challenge numeric values differ')
  return {key:max(0,value) for key,value in values.items()}
 try:challenge.stats=stats;yield
 finally:challenge.stats=prior;_LOCK.release()
