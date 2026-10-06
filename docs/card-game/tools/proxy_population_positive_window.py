"""Current positive-condition bundle around the unchanged472 group driver.

Only conditional reconstructions. Actual transitions supply timing captures;
full input origin and remaining lifecycle/victory gates are not promoted.
"""
import copy
from contextlib import contextmanager
from threading import Lock,get_ident
import proxy_population_runtime as base
import proxy_population_trigger_window as window
import proxy_population_trigger_observation as observation
import proxy_population_trigger_replay as replay
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_latching as latching
import proxy_population_trigger_effects as effects
import proxy_population_paid_draw as paid
import proxy_continuation_batch as batch
import proxy_continuation_actions as actions
import proxy_continuation_triggers as triggers
import proxy_continuation_end as end
import proxy_continuation_state as state
from proxy_mandatory_policy_contract import canonical

_LOCK=Lock()


def segment(envelope,initial,events,shots,runtime,limit,proof,session=None):
 if not _LOCK.acquire(blocking=False):raise ValueError('positive connection concurrency/reentry forbidden')
 original_operation=base.operation;original_step=base._step;original_observe=observation.observe;original_adapter=observation.Adapter;original_replay=replay.scope;original_recovery=window.recovery.scope
 pairs={};captures={};owner=get_ident()
 def raw(event):return {k:v for k,v in event.items() if k not in end.BIND_KEYS}
 def remember(before,after,event):
  event=raw(event);key=state.canonical_sha256(event);capture=latching.capture(before,after,event)
  pair=(copy.deepcopy(before),copy.deepcopy(after),copy.deepcopy(event))
  if key in pairs and canonical(list(pairs[key]))!=canonical(list(pair)):raise ValueError('actual timing event collision')
  pairs[key]=pair;captures[key]=capture;return capture
 def known(row):return any(canonical(row)==canonical(r) for proof in captures.values() for r in proof['occurrences'])
 class Adapter(original_adapter):
  def enumerate(self,e,row):
   card=e['legacy_continuation']['game_state']['cards'][row['source_instance_id']]['card_id']
   if card not in latching.CARDS:return super().enumerate(e,row)
   if not known(row):raise ValueError('positive occurrence has no actual transition capture')
   return latching.current_actions(e,row)
  def activate(self,e,action,row):
   if action['card_id'] not in latching.CARDS:return super().activate(e,action,row)
   self.enumerate(e,row);return effects.activate(e,action,row)
 def observe(journal,e,event,history,status):
  observed,source_proof=original_observe(journal,e,event,history,status);key=state.canonical_sha256(raw(event))
  if key not in captures or canonical(pairs[key][1])!=canonical(e):raise ValueError('actual positive observation pair absent')
  capture=captures[key];new=[r for r in capture['occurrences'] if ledger.identity(r) not in observed['occurrences']]
  if new:observed=ledger.observe(observed,new,status)
  source_proof['new_occurrences'].extend(copy.deepcopy(new));source_proof['positive_timing_capture']=copy.deepcopy(capture)
  source_proof['unproved_sources']=[r for r in source_proof['unproved_sources'] if r['card_id'] not in latching.CARDS]
  return observed,source_proof
 def step(e,i,history,legacy,full,forced,supplied_session=None):
  if get_ident()!=owner:raise ValueError('positive scope thread differs')
  saved_pairs=copy.deepcopy(pairs);saved_captures=copy.deepcopy(captures)
  try:
   result=original_step(e,i,history,legacy,full,forced,supplied_session);previous=result['source_envelope']
   for event,after in zip(result['events'],result['envelopes']):remember(previous,after,event);previous=after
   return result
  except Exception:
   pairs.clear();pairs.update(saved_pairs);captures.clear();captures.update(saved_captures);raise
 @contextmanager
 def replay_scope():
  with original_replay():
   original=end.RUNTIME_TRANSITION_VERIFIER
   def verify(before,after,event,history=None):
    card=before['legacy_continuation']['game_state']['cards'].get(event.get('source_instance_id'),{}).get('card_id')
    if card not in latching.CARDS:return original(before,after,event,history) if original else False
    try:
     if event['action_type']=='activate_response':
      rows=[r for p in captures.values() for r in p['occurrences'] if r['source_instance_id']==event['source_instance_id'] and r['origin_event_seq']==event['trigger_origin_event_seq']]
      if len(rows)!=1:return False
      row=rows[0];action=next(a for a in latching.current_actions(before,row)[0] if a['candidate_id']==event['selected_candidate']);expected,generated=effects.activate(before,action,row)
     elif event['action_type']=='resolve_board_ability':
      result=actions.normalize_resolution_result(before,effects.resolve(before,initial));expected=result['new_envelopes'][0];generated=result['new_events']
     elif event['action_type'] in ('relationship_progress','relationship_marriage'):
      inv=base.engine.base.candidates.audit(before,history or []);action=next(a for a in inv['legal_candidate_details'] if a['candidate_id']==event['selected_candidate']);expected,generated=batch.transition(before,action,history or [])
     else:return original(before,after,event,history) if original else False
     return canonical(expected)==canonical(after) and canonical(raw(generated[0]))==canonical(event)
    except (ValueError,KeyError,TypeError,StopIteration,IndexError):return False
   try:end.RUNTIME_TRANSITION_VERIFIER=verify;yield
   finally:end.RUNTIME_TRANSITION_VERIFIER=original
 @contextmanager
 def recovery_scope():
  # Combined selection must wrap recovery for selection and application.
  with original_recovery(),paid.scope():yield
 def operation(supplied,callback):
  def connected(forced):
   old_guard=batch.guard_applied_effect;old_results=batch.guard_resolution_result;old_boards=triggers.board_candidates
   def guard(current,event,history,link=None):
    key=state.canonical_sha256(raw(event));actor=event['actor'];main=current['game_state']['players'][actor]['board']['main']
    if key in captures and main is not None and current['game_state']['cards'][main]['card_id']=='M-antlion-06':return
    return old_guard(current,event,history,link)
   def results(before,result,history):
    previous=before
    for index,event in enumerate(result['new_events']):
     after=result['new_envelopes'][index] if result.get('new_envelopes') else state.advance(previous,result['new_snapshots'][index]['continuation_state'],event['seq'])
     remember(previous,after,event);previous=after
    return old_results(before,result,history)
   def boards(current,history,source,slot=None,runtime=None):
    card=current['game_state']['cards'][source]['card_id']
    if card in latching.CARDS:
     cap=batch.classification(card)
     return [],dict(source_instance_id=source,card_id=card,reason_code='positive_trigger_owned_by_sequential_ledger',source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])
    return effective_boards(current,history,source,slot,runtime)
   def forced_connected(e,i,history,legacy,full):
    c=e['legacy_continuation']
    if c['response_context']['chain_status']=='resolving' and c['activation_zone'] and c['activation_zone'][-1]['card_id'] in latching.CARDS:
     result=effects.resolve(e,i);results(e,result,history);return actions.normalize_resolution_result(e,result)
    return forced(e,i,history,legacy,full)
   with effects.scope():
    effective_boards=triggers.board_candidates
    try:
     batch.guard_applied_effect=guard;batch.guard_resolution_result=results;triggers.board_candidates=boards
     return callback(forced_connected)
    finally:batch.guard_applied_effect=old_guard;batch.guard_resolution_result=old_results;triggers.board_candidates=old_boards
  return original_operation(supplied,connected)
 try:
  base.operation=operation;base._step=step;observation.observe=observe;observation.Adapter=Adapter;replay.scope=replay_scope;window.recovery.scope=recovery_scope
  result=window.segment(envelope,initial,events,shots,runtime,limit,proof,session)
  result.update(positive_timing_proofs=list(captures.values()),connection_revision='conditional_positive_sequential_bundle',origin_authenticated=False,opportunity_completeness_proven=False,ready_for_execution=False)
  return result
 finally:
  base.operation=original_operation;base._step=original_step;observation.observe=original_observe;observation.Adapter=original_adapter;replay.scope=original_replay;window.recovery.scope=original_recovery;_LOCK.release()


def validate(record,envelope,initial,events,shots,runtime,limit,proof):
 try:return [] if canonical(record)==canonical(segment(envelope,initial,events,shots,runtime,limit,proof)) else ['positive full reconstruction differs']
 except (ValueError,KeyError,TypeError):return ['positive reconstruction failed']
