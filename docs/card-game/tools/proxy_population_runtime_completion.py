"""Opt-in extension of468's exact loop and nine scopes; no experiment driver."""
from threading import get_ident,Lock
import proxy_population_runtime as base
import proxy_population_departure as departure
import proxy_population_discard_recovery as recovery
import proxy_population_instance_boundary as instances

_EXTENSION_LOCK=Lock()

def segment(envelope,initial,events,shots,runtime,limit,session=None):
 if not _EXTENSION_LOCK.acquire(blocking=False):raise ValueError('extension scope reentry/concurrency forbidden')
 original=base.operation
 def in_existing_scope(forced):
  owner=get_ident()
  def reuse(supplied,callback):
   if get_ident()!=owner or supplied is not initial:raise ValueError('existing scope identity/concurrency differs')
   return callback(forced)
  # Outer468 operation owns its existing nonreentrant lock. Reuse the exact
  # segment implementation inside that scope; no second driver/forced loop.
  with departure.scope(),recovery.scope(),instances.scope():
   try:
    base.operation=reuse
    result=base.segment(envelope,initial,events,shots,runtime,limit,session)
    result['connection_revision']='population_runtime_completion_470'
    return result
   finally:base.operation=original
 try:return original(initial,in_existing_scope)
 finally:_EXTENSION_LOCK.release()
