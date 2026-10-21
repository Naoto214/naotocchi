"""Explicit first-seat turn wiring; existing provenance and local rules reused.

next_turn is a conditional transition, not proof that the preceding end is legal.
Only the end adapter may call it after a complete six-stage history audit.
"""
import copy
import proxy_continuation_end as end
from proxy_mandatory_choice_boundary import prepare,apply_choice
from proxy_population_policy_bridge import occurrence_key


def next_turn(current,initial,session):
 old=end.old;g=current['game_state'];actor=g['turn_player'];first=initial['first_player']
 if first not in ('A','B') or actor not in ('A','B') or g['phase']!='turn_end' or current['return_target']!='turn_end' or current['activation_zone'] or current['pending_triggers'] or type(g['round']) is not int or not 1<=g['round']<=10:raise ValueError('turn boundary differs')
 if g['round']==10 and actor!=first:raise ValueError('R10 requires terminal comparison')
 next_actor='B' if actor=='A' else 'A';events=[];shots=[]
 after=copy.deepcopy(current);after['game_state'].update(turn_player=next_actor,phase='turn_start',round=g['round']+(actor!=first));after['return_target']=None
 old.reached.provenance._append_transition(current,after,events,[],'turn_end_completed',actor);old._verify_generated(current,after,events);shots.append(old._snapshot(after))
 p=after['game_state']['players'][next_actor]
 if p['reservations']:raise ValueError('pending start reservations need existing handler proof')
 inventory=old.reached.classify_next_board(after['game_state'],next_actor)
 key=occurrence_key(after)
 if session is None:raise ValueError('turn origin ledger required')
 session.turn_start(next_actor,key)
 decisions=[]
 if p['board']['main'] is not None:
  after,event,inventory=end.start_regular(after);events.append(event);shots.append(old._snapshot(after))
 else:
  start=after;intermediate=copy.deepcopy(start['game_state']);owner=intermediate['players'][next_actor]
  owner.update(time=intermediate['round'],challenge_used=False,person_placed=False,relationship_progressed=False)
  if owner['deck']:owner['hand'].append(owner['deck'].pop(0))
  intermediate['phase']='egg_exchange_choice'
  f=dict(schema='mandatory_rule_slice_input.v1',choice_contract_id='egg_exchange_bottom',actor=next_actor,entry='after_normal_draw',source_instance_id=None,target_instance_id=None,game_state=intermediate)
  b=prepare(f);before_choice=copy.deepcopy(start);before_choice['game_state']=b['choice_game_state']
  old.reached.provenance._append_transition(start,before_choice,events,[],'turn_start_and_egg_draw',next_actor);old._verify_generated(start,before_choice,[events[-1]]);shots.append(old._snapshot(before_choice))
  selected=None
  if b['candidate_ids']:
   record=session.choose(key,f,b['choice_game_state'],b['candidate_ids']);decisions.append(record);selected=record['selected_candidate']
  application=apply_choice(f,selected);session.verify_after(key,f,application['local_after_game_state'])
  after=copy.deepcopy(before_choice);after['game_state']=application['local_after_game_state'];after['game_state']['phase']='response_window';after['return_target']='normal_action_opportunity'
  after['response_context'].update(source_phase='response_window',phase='response_window',window_kind='turn_start',origin_event_seq=before_choice['last_event_seq']+1,turn_player=next_actor,priority_actor=next_actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
  old.reached.provenance._append_transition(before_choice,after,events,[],'egg_exchange_bottom',next_actor,selected);old._verify_generated(before_choice,after,[events[-1]]);shots.append(old._snapshot(after))
 return dict(final_continuation_state=old.start._payload(after),last_valid_event_seq=after['last_event_seq'],final_game_state_sha256=old.start.opening._stop_state_sha256(after['game_state']),final_continuation_state_sha256=old.start._hash(after),new_events=events,new_snapshots=shots,new_decisions=decisions,completed=False,next_actor_board_inventory=inventory,policy_eligible=None,balance_admitted=None)


def audit_end(stop,provenance,initial):
 """124 six stages plus405 R10 branch, with explicit first-player metadata."""
 terminal=end.old.terminal;contracts=terminal.contracts
 if stop['path_id']!=initial['path_id'] or initial['first_player'] not in ('A','B'):raise ValueError('end metadata binding differs')
 audit=contracts.provenance.audit_current_turn_end(stop,provenance);game=stop['game_state']
 if game['round']!=10:return audit
 core=(contracts.ROOT/terminal.REFS[0]).read_text();chain=(contracts.ROOT/terminal.REFS[1]).read_text()
 if 'R10: 早期勝利なし。双方最後のターン後、高いそだちが勝利。同値（100対100含む）は引き分け。延長なし。' not in core or 'R10は先攻終了でも早期勝利を行わない' not in chain:raise ValueError('R10 canonical source rule differs')
 checks=audit['completeness_checks'];proven=all(v for k,v in checks.items() if k not in ('victory_history_sufficient','transition_handlers_proven')) and not audit['contract_stop_codes']
 checks.update(victory_history_sufficient=proven,transition_handlers_proven=proven)
 first=initial['first_player'];audit['stage_inventory'][5].update(empty_reason=None,disposition='continue_last_opponent_turn' if game['turn_player']==first else 'compare_public_growth',first_player=first,source_references=terminal.REFS)
 audit['turn_end_set_complete']=all(checks.values()) and not audit['contract_stop_codes']
 return audit


from contextlib import contextmanager
@contextmanager
def metadata_scope(initial,session):
 """Use only inside the serialized runtime operation and full end provenance."""
 terminal=end.old.terminal;contracts=terminal.contracts
 original_audit=terminal.audit_current_turn_end;original_replay=terminal.replay_end
 def replay(row,proof):
  if row['path_id']!=initial['path_id']:raise ValueError('end replay identity differs')
  before=contracts.current(row);g=before['game_state']
  if any(proof.get(k)!=v for k,v in contracts.boundary(row).items()) or not proof.get('turn_end_set_complete') or proof.get('contract_stop_codes') or set(proof.get('completeness_checks',{}))!=set(contracts.provenance.contract_123.CHECKS) or not all(proof['completeness_checks'].values()):raise ValueError('end replay proof incomplete or unbound')
  if g['round']==10:
   if proof!=terminal.proof_for_row(row,proof):raise ValueError('R10 exact end proof differs')
   if g['turn_player']!=initial['first_player']:
    growth={a:g['players'][a]['growth'] for a in 'AB'}
    result=dict(winner=terminal.compare_growth(growth),final_growth=growth,rounds_completed=10,completion_reason='r10_final_comparison',source_references=terminal.REFS)
    after=copy.deepcopy(before);after['game_state']['phase']='completed';after['return_target']=None;events=[]
    contracts.provenance._append_transition(before,after,events,[],'r10_final_comparison',g['turn_player']);contracts.end.normal._verify_step(before,after,events);events[-1]['result']=copy.deepcopy(result)
    output=contracts.result_from_state(row,after,events[-1]);output.update(completed=True,result=result,stop_reason_code='r10_final_comparison');return output
  return next_turn(before,initial,session)
 try:
  terminal.audit_current_turn_end=lambda stop,proof:audit_end(stop,proof,initial)
  terminal.replay_end=replay
  # Existing end.forced would otherwise bypass the origin ledger for main starts.
  original_regular=end.replay_regular_start
  end.replay_regular_start=lambda row,proof,supplied:replay(row,proof)
  yield
 finally:
  terminal.audit_current_turn_end=original_audit;terminal.replay_end=original_replay
  end.replay_regular_start=original_regular
