"""Keep the outer actual response context across nested internal projections.

The challenge wrapper may hide challenge fields for a legacy transport layer;
the preparation wrapper must not replace the already retained actual context
with that projection. This changes no predicates and proves no information use.
"""
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_batch as batch
import proxy_continuation_preparation as preparation
_LOCK=Lock()


@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('response context scope concurrency/reentry forbidden')
 original=preparation.response_inventory
 def inventory(envelope,initial,events,delegate):
  outer_current=batch.RESPONSE_FULL_CURRENT;outer_runtime=batch.RESPONSE_FULL_RUNTIME
  def preserved(projected,supplied,history):
   current=batch.RESPONSE_FULL_CURRENT;runtime=batch.RESPONSE_FULL_RUNTIME
   try:
    if outer_current is not None:batch.RESPONSE_FULL_CURRENT=outer_current
    if outer_runtime is not None:batch.RESPONSE_FULL_RUNTIME=outer_runtime
    return delegate(projected,supplied,history)
   finally:batch.RESPONSE_FULL_CURRENT=current;batch.RESPONSE_FULL_RUNTIME=runtime
  return original(envelope,initial,events,preserved)
 try:preparation.response_inventory=inventory;yield
 finally:preparation.response_inventory=original;_LOCK.release()
