"""Fail closed on physical reentry pending the shared105 incarnation adapter.

This is not an allocator or proof of first entry from unauthenticated history.
The runtime authenticates history separately. Never reset usage or move old
reservations onto a successor merely to permit execution.
"""
from contextlib import contextmanager
import proxy_continuation_actions as actions
import proxy_continuation_batch as batch

ENTRY_ACTIONS={'place_companion','place_partner','play_main','place_world','attach_item','set_item'}
ENTRY_EVENTS=ENTRY_ACTIONS|{'person_placement','main_movement','play_main_birth','relationship_start'}

def require_initial_entry(action,history):
 if action.get('action_type') not in ENTRY_ACTIONS:return
 source=action['source_instance_id']
 if any(e.get('action_type') in ENTRY_EVENTS and e.get('source_instance_id')==source for e in history):
  raise ValueError('incarnation adapter required before old-instance reentry')

@contextmanager
def scope():
 prior_apply=actions.apply;prior_transition=batch.transition
 def apply(envelope,record,inputs):
  require_initial_entry(record.get('selected_action',{}),inputs.get('public_events',[]))
  return prior_apply(envelope,record,inputs)
 def transition(envelope,action,history=None):
  require_initial_entry(action,history or [])
  return prior_transition(envelope,action,history)
 try:
  actions.apply=apply;batch.transition=transition
  yield
 finally:actions.apply=prior_apply;batch.transition=prior_transition
