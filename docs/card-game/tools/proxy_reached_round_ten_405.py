"""R10 end adapter for proven, empty end-effect inventories (01/06/64)."""
import copy
import proxy_reached_mixed_contracts_401 as contracts

REFS=['01-core-rules.md','06-action-chain-checkpoint.md','64-turn-boundaries-and-victory-timing.md']

def compare_growth(growth):
    if set(growth)!={'A','B'} or any(type(x) is not int for x in growth.values()):
        raise ValueError('R10 public growth values invalid')
    return 'A' if growth['A']>growth['B'] else 'B' if growth['B']>growth['A'] else 'draw'

def audit_current_turn_end(stop,provenance):
    audit=contracts.provenance.audit_current_turn_end(stop,provenance)
    game=stop['game_state']
    if game['round']!=10:return audit
    core=(contracts.ROOT/REFS[0]).read_text();chain=(contracts.ROOT/REFS[1]).read_text()
    if 'R10: 早期勝利なし。双方最後のターン後、高いそだちが勝利。同値（100対100含む）は引き分け。延長なし。' not in core or 'R10は先攻終了でも早期勝利を行わない' not in chain:
        raise ValueError('R10 canonical source rule differs')
    # Retain the independently enumerated closed window, board, reservation,
    # expiration and history checks. Only the R1-R9-only predicate/handler
    # checks gain the proven R10 branches; never project the round to R9.
    checks=audit['completeness_checks']
    proven=all(v for k,v in checks.items() if k not in ('victory_history_sufficient','transition_handlers_proven')) and not audit['contract_stop_codes']
    checks['victory_history_sufficient']=proven
    checks['transition_handlers_proven']=proven
    first=next(x for x in contracts.start.load_source()['results'] if x['path_id']==stop['path_id'])['first_player']
    audit['stage_inventory'][5].update(empty_reason=None,disposition='continue_last_opponent_turn' if game['turn_player']==first else 'compare_public_growth',first_player=first,source_references=REFS)
    audit['turn_end_set_complete']=all(checks.values()) and not audit['contract_stop_codes']
    return audit

def proof_for_row(row,history_proof):
    base=contracts.boundary(row);state=row['final_continuation_state']
    if any(history_proof.get(key)!=value for key,value in base.items()) or not history_proof.get('turn_end_set_complete') or history_proof.get('contract_stop_codes') or set(history_proof.get('completeness_checks',{}))!=set(contracts.provenance.contract_123.CHECKS) or not all(history_proof['completeness_checks'].values()):
        raise ValueError('R10 history proof is not bound to the complete source state')
    if any(history_proof.get(key,[]) for key in ('growth_reach_100','active_expiring_effects','unresolved_codes')) or any(p['growth']>=100 for p in state['game_state']['players'].values()):
        raise ValueError('R10 scoped history has unresolved effects or growth reach')
    if state['game_state']['phase']!='turn_end' or state['return_target']!='turn_end' or state['pending_triggers'] or state['activation_zone']:
        raise ValueError('R10 end boundary unresolved')
    if not history_proof['growth_trace'] or history_proof['growth_trace'][-1]['event_seq']!=row['last_valid_event_seq']:
        raise ValueError('R10 history boundary differs')
    provenance={'source_event_seq':row['last_valid_event_seq'],'classified_events':history_proof['classified_events'],'growth_trace':history_proof['growth_trace'],'growth_reach_100':copy.deepcopy(history_proof.get('growth_reach_100',[])),'active_expiring_effects':copy.deepcopy(history_proof.get('active_expiring_effects',[])),'unresolved_codes':copy.deepcopy(history_proof.get('unresolved_codes',[]))}
    stop={'path_id':row['path_id'],'last_valid_event_seq':row['last_valid_event_seq'],'game_state_sha256':row['final_game_state_sha256'],'continuation_state_sha256':row['final_continuation_state_sha256'],'game_state':state['game_state'],'continuation_state':state}
    with contracts.end_board_scope():audit=audit_current_turn_end(stop,provenance)
    if not audit['turn_end_set_complete']:raise ValueError('R10 six-stage proof incomplete')
    return {**base,'next_opportunity':'turn_end','turn_end_set_complete':True,'stage_inventory':audit['stage_inventory'],'completeness_checks':audit['completeness_checks'],'contract_stop_codes':audit['contract_stop_codes'],'classified_events':history_proof['classified_events'],'growth_trace':history_proof['growth_trace']}

def replay_end(row,proof):
    before=contracts.current(row);game=before['game_state']
    if game['round']<10:return contracts.replay_end(row,proof)
    if game['round']!=10 or proof!=proof_for_row(row,proof):raise ValueError('R10 exact end proof differs')
    first=next(x for x in contracts.start.load_source()['results'] if x['path_id']==row['path_id'])['first_player']
    actor=game['turn_player'];after=copy.deepcopy(before);events=[];internal=[];shots=[]
    if actor!=first:
        growth={a:game['players'][a]['growth'] for a in 'AB'}
        result={'winner':compare_growth(growth),'final_growth':growth,'rounds_completed':10,'completion_reason':'r10_final_comparison','source_references':REFS}
        after['game_state']['phase']='completed';after['return_target']=None
        contracts.provenance._append_transition(before,after,events,internal,'r10_final_comparison',actor)
        contracts.end.normal._verify_step(before,after,events)
        events[-1]['result']=copy.deepcopy(result)
        output=contracts.result_from_state(row,after,events[-1])
        output.update(completed=True,result=result,stop_reason_code='r10_final_comparison')
        return output
    next_actor='B' if actor=='A' else 'A'
    after['game_state'].update(turn_player=next_actor,phase='turn_start');after['return_target']=None
    contracts.provenance._append_transition(before,after,events,internal,'turn_end_completed',actor)
    contracts.end.normal._verify_step(before,after,events);shots.append(contracts.end.prior.snapshot(after));current=after
    owner=current['game_state']['players'][next_actor]
    if len(owner['deck'])<2 or owner['reservations'] or current['pending_triggers'] or current['activation_zone']:
        raise ValueError('R10 final opponent turn draw unproved')
    inventory=contracts.classify_next_board(current['game_state'],next_actor)
    after=copy.deepcopy(current);owner=after['game_state']['players'][next_actor]
    owner.update(time=10,challenge_used=False,person_placed=False,relationship_progressed=False)
    drawn=[owner['deck'].pop(0),owner['deck'].pop(0)];owner['hand'].extend(drawn)
    after['game_state']['phase']='egg_exchange_choice'
    contracts.provenance._append_transition(current,after,events,internal,'turn_start_and_egg_draw',next_actor)
    contracts.end.normal._verify_step(current,after,[events[-1]]);shots.append(contracts.end.prior.snapshot(after))
    output=contracts.result_from_state(row,after,events[-1])
    output.update(new_events=events,new_snapshots=shots,drawn_instance_ids=drawn,next_actor_board_inventory=inventory)
    contracts.validate_chain(row,output)
    return output
