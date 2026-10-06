"""Six-stage end evidence with actual public100 maintenance history.

Conditional supplied-history auditor. The runtime must first authenticate all
native transitions; this helper alone never authenticates an initial input.
No old reach record is removed or rewritten to satisfy the old no100 guard.
"""
import copy
import proxy_population_victory_history as victory
import proxy_continuation_end as end
from proxy_mandatory_policy_contract import canonical


def reconstruct_history(events,shots,first):
 if not shots or len(shots)!=len(events)+1 or [s['event_seq'] for s in shots]!=list(range(len(shots))) or [e['seq'] for e in events]!=list(range(1,len(shots))):raise ValueError('victory complete history coverage differs')
 record=victory.create(shots[0]['game_state'],0,first)
 for event,before,after in zip(events,shots,shots[1:]):
  event=copy.deepcopy(event)
  for side in ('before','after'):
   if 'game_state_'+side+'_sha256' not in event:event['game_state_'+side+'_sha256']=event['state_'+side+'_sha256']
  record=victory.observe(record,before['game_state'],after['game_state'],event)
 return dict(record=record,assessment=victory.assess_end(record,shots[-1]['game_state']))


def audit_end(stop,provenance,initial,events,shots):
 if stop['path_id']!=initial['path_id'] or stop['last_valid_event_seq']!=shots[-1]['event_seq'] or victory.game_hash(stop['game_state'])!=victory.game_hash(shots[-1]['game_state']):raise ValueError('victory source boundary differs')
 if canonical(stop['continuation_state'])!=canonical(shots[-1]['continuation_state']) or end.old.start._hash(stop['continuation_state'])!=stop['continuation_state_sha256'] or stop['continuation_state_sha256']!=shots[-1]['continuation_state_sha256'] or stop['game_state_sha256']!=victory.game_hash(stop['game_state']):raise ValueError('victory full continuation binding differs')
 history=reconstruct_history(events,shots,initial['first_player']);contract=end.old.reached.provenance.contract_123
 audit=contract.enumerate_turn_end(stop);g=stop['game_state'];cont=stop['continuation_state'];units=audit['stage_inventory'][2]['units']
 count=sum(sum(bool(p['board'][s]) for s in ('main','partner','world'))+sum(len(p['board'][s]) for s in ('companions','prepared')) for p in g['players'].values())
 public_complete=len(units)==count and all(u['disposition']=='excluded' for u in units) and not cont['pending_triggers'] and not cont['activation_zone'] and all(not p['reservations'] for p in g['players'].values())
 trace=[dict(event_seq=s['event_seq'],growth={a:s['game_state']['players'][a]['growth'] for a in 'AB'}) for s in shots]
 classified=provenance['classified_events'];evidence=(provenance['source_event_seq']==stop['last_valid_event_seq'] and not provenance['unresolved_codes'] and not provenance['active_expiring_effects'] and canonical(provenance['growth_trace'])==canonical(trace) and [e['seq'] for e in classified]==[e['seq'] for e in events] and all(e.get('classification')!='unknown' and e.get('source_reference') for e in classified))
 checks=audit['completeness_checks'];checks.update(trigger_information_boundary_valid=public_complete and evidence,expiration_boundary_resolved=evidence,expiration_trigger_inventory_complete=evidence,victory_history_sufficient=evidence,transition_handlers_proven=evidence and public_complete,source_projection_exact=public_complete and evidence)
 if evidence:
  for index,reason in ((3,'verified_no_active_expiring_effects'),(4,'verified_no_expiration_trigger_obligation')):
   audit['stage_inventory'][index].update(empty_reason=reason,state_fields=['verified_history.classified_events','verified_history.active_expiring_effects'])
  winners=history['assessment']['early_winner_candidates'];disposition='early_victory' if winners else 'compare_public_growth' if g['round']==10 and g['turn_player']!=initial['first_player'] else 'continue_next_turn'
  audit['stage_inventory'][5].update(empty_reason=None,disposition=disposition,early_winner_candidates=copy.deepcopy(winners),state_fields=['verified_history.actual_public100_maintenance'],source_references=list(victory.SOURCES))
 codes=set(audit['contract_stop_codes'])
 if evidence:codes.difference_update(('unresolved_expiration','missing_growth_reach_history'))
 audit.update(contract_stop_codes=[s for s in contract.STOPS if s in codes],turn_end_set_complete=all(checks.values()) and not codes,victory_history=history,origin_authenticated=False)
 return audit


def finish_early(stop,provenance,initial,events,shots):
 audit=audit_end(stop,provenance,initial,events,shots)
 if not audit['turn_end_set_complete'] or audit['contract_stop_codes']:raise ValueError('early victory requires all six end stages')
 winners=audit['victory_history']['assessment']['early_winner_candidates']
 if not winners:return None
 if len(winners)!=1:raise ValueError('early victory candidate cardinality differs')
 old=end.old;before=copy.deepcopy(stop['continuation_state']);before['last_event_seq']=stop['last_valid_event_seq'];before['continuation_state_sha256']=stop['continuation_state_sha256'];after=copy.deepcopy(before)
 after['game_state']['phase']='completed';after['return_target']=None;generated=[]
 result=dict(winner=winners[0],final_growth={a:before['game_state']['players'][a]['growth'] for a in 'AB'},completion_reason='maintained100_after_future_opponent_turn',source_references=list(victory.SOURCES),victory_history=copy.deepcopy(audit['victory_history']))
 old.reached.provenance._append_transition(before,after,generated,[],'maintained100_final_comparison',before['game_state']['turn_player']);old._verify_generated(before,after,generated);generated[0]['result']=copy.deepcopy(result)
 return dict(final_continuation_state=old.start._payload(after),last_valid_event_seq=after['last_event_seq'],new_events=generated,new_snapshots=[old._snapshot(after)],new_decisions=[],completed=True,result=result)


from contextlib import contextmanager
from threading import Lock
import proxy_population_turn_boundary as boundary
_LOCK=Lock()

@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('victory end scope concurrency/reentry forbidden')
 native=end.forced
 def forced(envelope,initial,events,shots,runtime):
  if not any(p['growth']==100 for shot in shots for p in shot['game_state']['players'].values()):return native(envelope,initial,events,shots,runtime)
  prior_audit=boundary.audit_end;prior_next=boundary.next_turn;prior_proof=end.old.terminal.proof_for_row;captured={}
  def audit(stop,provenance,supplied):
   if canonical(supplied)!=canonical(initial):raise ValueError('victory execution identity differs')
   r=audit_end(stop,provenance,initial,events,shots);captured.update(stop=copy.deepcopy(stop),provenance=copy.deepcopy(provenance),audit=copy.deepcopy(r));return r
  def expected(row,proof):
   if not captured:raise ValueError('victory lacks fresh six-stage audit')
   stop=captured['stop'];r=captured['audit'];p=captured['provenance']
   if row['final_game_state_sha256']!=stop['game_state_sha256'] or row['final_continuation_state_sha256']!=stop['continuation_state_sha256'] or row['last_valid_event_seq']!=stop['last_valid_event_seq'] or row['path_id']!=initial['path_id']:raise ValueError('victory end row differs')
   rebuilt=dict(end.old.reached.boundary(row),next_opportunity='turn_end',turn_end_set_complete=r['turn_end_set_complete'],stage_inventory=r['stage_inventory'],completeness_checks=r['completeness_checks'],contract_stop_codes=r['contract_stop_codes'],classified_events=p['classified_events'],growth_trace=p['growth_trace'])
   if not r['turn_end_set_complete'] or canonical(proof)!=canonical(rebuilt):raise ValueError('victory complete end proof differs')
   return rebuilt
  def next_turn(current,supplied,session):
   if not captured or end.old.start._hash(current)!=captured['stop']['continuation_state_sha256'] or canonical(supplied)!=canonical(initial):raise ValueError('victory next boundary differs')
   result=finish_early(captured['stop'],captured['provenance'],initial,events,shots)
   return result if result is not None else prior_next(current,supplied,session)
  try:
   boundary.audit_end=audit;boundary.next_turn=next_turn;end.old.terminal.proof_for_row=expected
   # Keep native end_scope: it validates full state/event/runtime history and
   # typed lifetimes before invoking these bound audit/replay extensions.
   return native(envelope,initial,events,shots,runtime)
  finally:boundary.audit_end=prior_audit;boundary.next_turn=prior_next;end.old.terminal.proof_for_row=prior_proof
 try:end.forced=forced;yield
 finally:end.forced=native;_LOCK.release()
