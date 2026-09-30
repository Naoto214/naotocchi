#!/usr/bin/env python3
"""Replay the reached B turns in one batch using existing 401 adapters."""
import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_404 as source
import proxy_new_seed_mixed_replay_401 as baseline_source
import proxy_reached_round_ten_405 as terminal
import proxy_new_seed_next_response_restart_170 as coin_activation
import proxy_new_seed_current_restart_176 as coin_resolution
import proxy_reached_mixed_contracts_401 as contracts
import proxy_new_seed_mixed_audit_340 as eggs
import proxy_new_seed_egg_replay_205 as egg_replay
import proxy_new_seed_normal_audit_156 as partner
import proxy_new_seed_normal_trigger_audit_146 as table_source
import proxy_new_seed_normal_restart_157 as free
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal

ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='567fc388da16f10b7cc036e78dfb78cf7842d9b700e066aa68e9279d0000bdc2'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-405-20260930.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-405-20260930.json'
canonical_bytes=contracts.canonical_bytes

def load_rows():
    raw=source.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=source.canonical_bytes(source.build_reports()[1]):raise ValueError('405 source raw/canonical differs')
    rows=json.loads(raw)['results']
    if len(rows)!=4:raise ValueError('405 route count')
    return rows

def choose_normal(row,proof):
    details=proof['legal_candidate_details'];placements=[x for x in details if x['action_type']=='place_companion']
    if not placements:return source.choose_normal(row,proof)
    if len(placements)!=1 or placements[0]['card_id']!='C-chameleon' or row['path_id']!='probe-02-a-first':raise ValueError('405 placement needs separate proof')
    placement=placements[0];reduced=copy.deepcopy(proof)
    reduced['candidate_ids']=[placement['candidate_id'],'pass'];reduced['legal_candidate_details']=[placement,next(x for x in details if x['candidate_id']=='pass')]
    safety=free.decide(row,reduced)
    if safety['resolution_mode']!='safe_free_development' or fallback.validate_safe_free_placement(safety['selected_placement']):raise ValueError('405 six safe-placement conditions differ')
    game=row['final_continuation_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    order=next(x for x in contracts.start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    context={'contract_version':fallback.CONTRACT_VERSION,'order_id':order,'actor':actor,'actor_turn_index':game['round'],'round':game['round'],'phase':'normal_action','decision_kind':'normal_action','choice_kind':'zero_cost_person_placement'}
    selected=fallback.resolve_safe_free_development([safety['selected_placement']],context,proof['candidate_ids'])
    if selected.get('error') or selected['selected_candidate']!=placement['candidate_id']:raise ValueError('405 full legal placement fallback differs')
    common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
    left={**common,'candidate_id':placement['candidate_id'],'payment_time':0,'time_after_certain_resolution':owner['time'],'card_copy_id':game['cards'][placement['source_instance_id']]['card_copy_id']}
    comparisons=[]
    for action in details:
        if action['candidate_id'] in (placement['candidate_id'],'pass'):continue
        cost,ref=contracts.countryside.paid_cost_and_effect(row,action) if action['card_id']=='W-countryside' else contracts.paid.cost_and_effect(row,action)
        right={**common,'candidate_id':action['candidate_id'],'payment_time':cost,'time_after_certain_resolution':owner['time']-cost,'card_copy_id':game['cards'][action['source_instance_id']]['card_copy_id']}
        result=priority.compare_candidates(left,right)
        if result['winner']!='left' or result['decided_at']!='time_after_certain_resolution':raise ValueError('405 full paid comparison differs')
        comparisons.append({'candidate_id':action['candidate_id'],'source_reference':ref,'score':right,'comparison':result})
    selected.update(**contracts.boundary(row),candidate_ids=proof['candidate_ids'],selected_action=copy.deepcopy(placement),legal_candidate_details=copy.deepcopy(details),paid_comparisons=comparisons,source_contracts=[107,114,116],decision_pipeline={'107':'evaluated','114':'paid_candidates_dominated_by_time','116':'safe_free_development'},pre_game_state_sha256=row['final_game_state_sha256'],pre_continuation_state_sha256=row['final_continuation_state_sha256'],event_seq=row['last_valid_event_seq'])
    return selected

def replay_placement(row,selected):
    before=contracts.current(row);after,events=extension._apply_placement(before,selected)
    normal._verify_step(before,after,events)
    if len(events)!=1 or events[0]['action_type']!='place_companion':raise ValueError('405 placement event differs')
    event={k:copy.deepcopy(v) for k,v in events[0].items() if k!='_snapshot_after'}
    return contracts.result_from_state(row,after,event,[selected])

def choose_response(row,proof):
    state=contracts.current(row);ctx=state['response_context']
    if proof['candidate_ids']==['response-pass'] :
        return source.choose_response(row,proof)
    if not proof['candidate_set_complete']:
        raise ValueError('405 next-priority candidate proof differs')
    projected=copy.deepcopy(state);actor=ctx['priority_actor']
    owner=projected['game_state']['players'][actor]
    for exclusion in proof['hand_exclusions']:owner['hand'].remove(exclusion['source_instance_id'])
    owner['board']['companions']=[];owner['board'].update(partner=None,partner_stage=None)
    projected['game_state']['phase']='response_window';projected['response_context'].update(phase='response_window',window_kind='turn_start')
    chance=contracts.start.enumerate_opportunity(projected,actor,contracts.start.load_candidate_rows())
    if chance['legal_candidate_ids']!=proof['hand_candidate_ids'] or chance['excluded_candidates']!=proof['hand_other_exclusions']:
        raise ValueError('405 next-priority hand candidate inventory differs')
    for detail in proof['board_candidate_details']:
        instance=detail['source_instance_id']
        chance['legal_candidate_details'].append({**detail,'card_copy_id':state['game_state']['cards'][instance]['card_copy_id'],'target_instance_ids':[],'candidate_variant':None,'base_time_cost':0})
    chance['legal_candidate_details'].sort(key=lambda x:x['candidate_id'])
    chance['legal_candidate_ids']=[x['candidate_id'] for x in chance['legal_candidate_details']]
    if chance['legal_candidate_ids']!=proof['candidate_ids']:raise ValueError('405 complete response IDs differ')
    chance['response_context']=copy.deepcopy(ctx)
    chance['inspected_information']=contracts.board_choice.contract._information_snapshot(state['game_state'],actor)
    chance['board_exclusions']=copy.deepcopy(proof['board_exclusions'])
    chance['hand_conditional_exclusions']=copy.deepcopy(proof['hand_exclusions'])
    order=next(x for x in contracts.start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    decision=contracts.response.resolve_response_choice({'order_id':order,'actor_turn_index':state['game_state']['round'],'round':state['game_state']['round']},chance)
    decision.update(pre_game_state_sha256=row['final_game_state_sha256'],pre_continuation_state_sha256=row['final_continuation_state_sha256'],event_seq=row['last_valid_event_seq'])
    return {**contracts.boundary(row),'candidate_ids':proof['candidate_ids'],'selected_candidate':decision['selected_candidate'],'resolution_mode':decision['resolution_mode'],'comparison':decision}

def run_route(initial):
    row=copy.deepcopy(initial);all_events=[];all_shots=[];all_decisions=[];steps=[]
    baseline,history,baseline_hash=baseline_source.saved_history(row['path_id'])
    for checkpoint in (401,402,403,404):
        previous=next(x for x in json.loads((ROOT/f'data/proxy-new-seed-mixed-replay-{checkpoint}-20260930.json').read_bytes())['results'] if x['path_id']==row['path_id'])
        history+=list(zip(previous['new_events'],previous['new_snapshots']))
    for _ in range(14):
        state=row['final_continuation_state'];phase=state['game_state']['phase'];ctx=state['response_context']
        if (phase=='egg_exchange_choice' and all_events) or row.get('completed'):break
        if phase=='egg_exchange_choice':
            proof={**contracts.boundary(row),**eggs.audit_egg(row)}
            result=egg_replay.run_route(row);selected=copy.deepcopy(result['new_decisions'][0])
        elif phase=='normal_action':
            game=state['game_state'];actor=game['turn_player'];instance=game['players'][actor]['board']['partner']
            if instance is not None and game['cards'][instance]['card_id']=='P-anglerfish':
                with partner.partner_response_scope(table_source.normal.candidate.load_inputs()['candidate_table']):
                    proof=contracts.audit_normal(row)
            else:proof=contracts.audit_normal(row)
            selected=choose_normal(row,proof)
            if selected['selected_candidate']=='pass':result=contracts.normal_pass.run_route(row,selected,proof)
            else:result=replay_placement(row,selected)
        elif phase=='turn_end':
            proof=contracts.extend_end_proof(row,baseline,history+list(zip(all_events,all_shots)),terminal.audit_current_turn_end)
            selected=None;result=terminal.replay_end(row,proof)
        elif phase=='response_window' and ctx['chain_status']=='resolving':
            proof={**contracts.boundary(row),'next_opportunity':'resolve_board_ability','source_window_kind':ctx['window_kind'],'activation_zone':copy.deepcopy(state['activation_zone'])}
            selected=None
            if len(state['activation_zone'])==1 and state['activation_zone'][0]['card_id']=='I-c_coin2':
                link=state['activation_zone'][0]
                after,event=coin_resolution.resolve_item(contracts.current(row),{'chain_link_id':link['link_id'],'source_instance_id':link['source_instance_id']})
                result=contracts.result_from_state(row,after,event)
            else:result=source.replay_resolution(row)
        else:
            origin=next((e for e,_ in history+list(zip(all_events,all_shots)) if e['seq']==ctx['origin_event_seq']),None)
            try:proof=source.audit_response(row,origin)
            except ValueError as error:
                if str(error)!='166 E-final-time main stage needs separate proof' or state['game_state']['round']!=10:raise
                actor=ctx['priority_actor'];owner=state['game_state']['players'][actor]
                sources=[i for i in owner['hand'] if state['game_state']['cards'][i]['card_id']=='E-final-time']
                targets=[i for i in owner['discard'] if contracts.start.load_candidate_rows()[state['game_state']['cards'][i]['card_id']]['card_type']!='main']
                if not sources or owner['time']<2 or not targets:raise
                proof={**contracts.boundary(row),'next_opportunity':phase,'actor':actor,'candidate_set_complete':False,'known_candidate_ids':['response-pass'],'unresolved_card_id':'E-final-time','source_instance_ids':sources,'public_eligible_discard_targets':targets,'source_reference':'91-event-21-card-text-draft.md#E-final-time','missing_contracts':['R10 target-specific response candidate enumeration and stable IDs','same-name use history verification','target recheck and draw-two/choose-hand-bottom resolution'],'stop_reason_code':'incomplete_legal_candidates'}
                steps.append({'audit':proof,'selection':None,'event_seqs':[]})
                row.update(stop_reason_code='incomplete_legal_candidates',rules_stop=proof)
                break
            selected=choose_response(row,proof)
            before=contracts.current(row)
            if selected['selected_candidate']=='response-use-item-A-033#1' and not before['activation_zone']:
                after,event=coin_activation.activate_quick_item(before,selected['comparison'],allow_prior_pass=True)
                result=contracts.result_from_state(row,after,event,[selected['comparison']])
            else:result=source.replay_response(row,proof,selected)
            if selected['resolution_mode']=='response_seeded_fallback':result['new_decisions']=[selected['comparison']]
        contracts.validate_chain(row,result)
        steps.append({'audit':proof,'selection':selected,'event_seqs':[x['seq'] for x in result['new_events']]})
        all_events.extend(result['new_events']);all_shots.extend(result['new_snapshots']);all_decisions.extend(result['new_decisions']);row=result
    else:raise ValueError('405 scoped batch exceeded expected steps')
    game=row['final_continuation_state']['game_state']
    if game['round']!=10 or not (row.get('rules_stop') or (game['turn_player'],game['phase'])==('A','egg_exchange_choice')):raise ValueError('405 final boundary differs')
    next_audit=row['rules_stop'] if row.get('rules_stop') else {**contracts.boundary(row),**eggs.audit_egg(row)}
    result={**row,**contracts.boundary(initial),'stop_reason_code':'incomplete_legal_candidates' if row.get('rules_stop') else 'checkpoint_boundary_next_egg_exchange','new_events':all_events,'new_snapshots':all_shots,'new_decisions':all_decisions}
    contracts.validate_chain(initial,result)
    return ({'path_id':initial['path_id'],'baseline_checkpoint':baseline_source.BASELINES[initial['path_id']],'baseline_raw_sha256':baseline_hash,'steps':steps,'next_opportunity_audit':next_audit},result)

def build_reports():
    rows=load_rows();pairs=[run_route(row) for row in rows];audits=[x[0] for x in pairs];results=[x[1] for x in pairs]
    events=sum(len(x['new_events']) for x in results);decisions=sum(len(x['new_decisions']) for x in results)
    if events<14 or sum(bool(x.get('rules_stop')) for x in results)!=2 or any(x['completed'] or x['balance_sample_count'] for x in results):raise ValueError('405 batch count/balance differs')
    common={'source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'rules_stopped':2,'independent_balance_sample_count':0}
    return ({**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_405.v1','results':audits},
            {**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_405.v1','new_decisions':decisions,'new_events':events,'new_snapshots':events,'results':results})

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();a,r=build_reports()
    for path,value in ((AUDIT,a),(OUTPUT,r)):
        raw=canonical_bytes(value)
        if args.check:
            if path.read_bytes()!=raw:raise SystemExit('405 canonical mismatch '+str(path))
        else:path.write_bytes(raw)
    print(f"405: four B turns, {r['new_events']} events/snapshots verified")
if __name__=='__main__':main()
