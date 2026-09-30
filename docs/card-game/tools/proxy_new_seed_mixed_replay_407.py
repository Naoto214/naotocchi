#!/usr/bin/env python3
"""Compose reached R10 A-turn contracts, retaining the historical defaults."""
import argparse
import copy
import hashlib
import json
import proxy_new_seed_mixed_replay_406 as source
import proxy_hit_blow_response_142 as hit

contracts=source.contracts
ROOT=source.ROOT
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-407-20260930.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-407-20260930.json'
SOURCE_SHA='80b76e18a433a16b8acb99a49a75dfc054d2dcb5581c06282ae17db78c0834e9'
canonical_bytes=source.canonical_bytes

def load_rows():
    raw=source.OUTPUT.read_bytes();data=json.loads(raw)
    if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=canonical_bytes(data):raise ValueError('407 source raw/canonical differs')
    return data['results']

def saved_history(path):
    initial=next(x for x in load_rows() if x['path_id']==path)
    baseline,history,digest=source.saved_history(path)
    history+=list(zip(initial['new_events'],initial['new_snapshots']))
    source.verify_history(initial,baseline,history)
    return baseline,history,digest

def projection(row,actor):
    projected=copy.deepcopy(row);state=projected['final_continuation_state'];game=state['game_state']
    owner=game['players'][actor]
    owner['hand']=[i for i in owner['hand'] if game['cards'][i]['card_id']!='E-final-time']
    projected['final_game_state_sha256']=contracts.start.opening._stop_state_sha256(game)
    projected['final_continuation_state_sha256']=contracts.start.canonical_sha256(state)
    return projected

def validate_links(state):
    ctx=state['response_context'];links=state['activation_zone'];game=state['game_state']
    if ctx['chain_status']!='building' or ctx['chain_links']!=[x['link_id'] for x in links]:raise ValueError('407 active chain shape differs')
    for link in links:
        card=link['card_id'];owner=game['players'][link['actor']];instance=link['source_instance_id']
        if game['cards'][instance]['card_id']!=card:raise ValueError('407 active source identity differs')
        expected={'C-chicken':('activate_board_ability',0),'I-c_coin2':('use_item',1),'G-hit-blow':('use_play',1),'E-final-time':('use_event',2)}
        if card not in expected or (link['action_type'],link['payment']['time'])!=expected[card]:raise ValueError('407 active source type/cost differs')
        if card=='C-chicken' and (link.get('source_zone')!='board' or instance not in owner['board']['companions']):raise ValueError('407 board source differs')
        if card!='C-chicken' and instance in owner['hand']+owner['deck']+owner['discard']:raise ValueError('407 active hand source zone differs')
    return [x['source_instance_id'] for x in links]

def activate(row,selected):
    before=contracts.current(row);decision=selected['comparison'];action=decision['selected_action'];card=action['card_id']
    if card=='C-chicken':after,event=contracts.activation.activate_board_ability(before,decision,{'candidate_ids':[selected['selected_candidate']],'source_instance_id':action['source_instance_id']})
    elif card=='I-c_coin2':
        if before['activation_zone']:after,event=source.source.source.activate_quick_item(before,decision)
        else:after,event=source.source.coin_activation.activate_quick_item(before,decision,allow_prior_pass=True)
    elif card=='G-hit-blow':after,event=hit.activate(before,decision,candidate_validator=validate_hit_candidate,allow_building=True)
    elif card=='E-final-time':
        handler=hit._turn_start_transition if before['response_context']['window_kind']=='turn_start' else None
        after,event=contracts.response.activate_response_candidate(before,decision,source.validate_final_time_target,transition_handler=handler)
        event.pop('_snapshot_after',None)
    else:raise ValueError('407 selected response lacks proven activation: '+card)
    return contracts.result_from_state(row,after,event,[decision])

def validate_hit_candidate(before,action):
    actor=before['response_context']['priority_actor'];game=before['game_state'];instance=action['source_instance_id']
    entry=contracts.start.load_candidate_rows()['G-hit-blow'];template=next(x for x in entry['actions'] if x['action_type']=='use_play')
    expected=contracts.start._hand_detail(game,actor,instance,entry,template,action['candidate_variant'])
    return action==expected

def verify_history(row,baseline,history):
    original,saved,_=saved_history(row['path_id'])
    if baseline!=original or history[:len(saved)]!=saved:raise ValueError('407 source history provenance differs')
    start={'last_valid_event_seq':baseline['source_last_valid_event_seq'],'final_game_state_sha256':baseline['source_game_state_sha256'],'final_continuation_state_sha256':baseline['source_continuation_state_sha256']}
    contracts.validate_chain(start,{**row,'new_events':[e for e,_ in history],'new_snapshots':[s for _,s in history]})
    for index in range(len(saved),len(history)):
        event,shot=history[index];prior=history[index-1][1];state=prior['continuation_state']
        if event['action_type']=='activate_response' or len(shot['continuation_state']['activation_zone'])>len(state['activation_zone']):
            if event['action_type']!='activate_response' or event.get('actor')!=state['response_context']['priority_actor']:raise ValueError('407 activation actor/type provenance differs')
            link=shot['continuation_state']['activation_zone'][-1];instance=link['source_instance_id']
            card=state['game_state']['cards'][instance]
            action={'candidate_id':event.get('selected_candidate'), 'candidate_family':'triggered_ability' if link['card_id']=='C-chicken' else 'hand_quick_use',
                    'action_type':link['action_type'],'card_id':card['card_id'],'card_copy_id':card['card_copy_id'],'source_instance_id':instance,
                    'target_instance_ids':link['target_instance_ids'],'candidate_variant':link.get('candidate_variant'),'base_time_cost':link['payment']['time'],'source_references':link['source_references']}
            before={'path_id':row['path_id'],'last_valid_event_seq':prior['event_seq'],'final_game_state_sha256':prior['game_state_sha256'],'final_continuation_state_sha256':prior['continuation_state_sha256'],'final_continuation_state':state}
            generated=activate(before,{'selected_candidate':action['candidate_id'],'comparison':{'actor':link['actor'],'selected_candidate':action['candidate_id'],'selected_action':action}})
            if generated['new_events'][0]!=event or generated['final_continuation_state']!=shot['continuation_state']:raise ValueError('407 activation event/snapshot reproduction differs')
        if event['action_type']=='response_pass' and event.get('actor')!=state['response_context']['priority_actor']:raise ValueError('407 pass actor provenance differs')

def audit_response(row,baseline,history):
    state=row['final_continuation_state'];actor=state['response_context']['priority_actor']
    inventory=source.final_time_inventory(row,baseline,history,actor,history_validator=verify_history)
    origin=next((e for e,_ in history if e['seq']==state['response_context']['origin_event_seq']),None)
    projected=projection(row,actor)
    base=source.source.source.audit_response(projected,origin,allowed_hand_cards={'I-c_coin2','G-hit-blow'},active_link_validator=validate_links)
    chance=source.response_opportunity(row,base,inventory,projected_row=projected)
    return {**base,**contracts.boundary(row),'candidate_ids':chance['legal_candidate_ids'],'legal_candidate_details':chance['legal_candidate_details'],'final_time_inventory':inventory,'candidate_set_complete':True,'opportunity':chance}

def choose_response(row,proof,baseline,history):
    if proof!=audit_response(row,baseline,history):raise ValueError('407 regenerated response inventory differs')
    game=row['final_continuation_state']['game_state'];order=next(x for x in contracts.start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    decision=contracts.response.resolve_response_choice({'order_id':order,'actor_turn_index':game['round'],'round':game['round']},proof['opportunity'])
    decision.update(pre_game_state_sha256=row['final_game_state_sha256'],pre_continuation_state_sha256=row['final_continuation_state_sha256'],event_seq=row['last_valid_event_seq'])
    return {**contracts.boundary(row),'candidate_ids':proof['candidate_ids'],'selected_candidate':decision['selected_candidate'],'resolution_mode':decision['resolution_mode'],'comparison':decision}

def audit_normal(row,baseline,history):
    actor=row['final_continuation_state']['game_state']['turn_player']
    inventory=source.final_time_inventory(row,baseline,history,actor,normal=True,history_validator=verify_history)
    with source.source.partner.partner_response_scope(source.source.table_source.normal.candidate.load_inputs()['candidate_table']):
        base=contracts.audit_normal(projection(row,actor))
    details=sorted(base['legal_candidate_details']+inventory['details'],key=lambda x:x['candidate_id'])
    game=row['final_continuation_state']['game_state'];owner=game['players'][actor]
    visible=set(owner['hand']+owner['discard']+owner['board']['companions']+[i for i in (owner['board']['main'],owner['board']['partner'],owner['board']['world']) if i])
    view={'actor':actor,'players':{actor:owner},'cards':{i:game['cards'][i] for i in visible}}
    attachments=[]
    for instance in sorted(owner['hand']):
        card=game['cards'][instance]['card_id'];entry=contracts.start.load_candidate_rows()[card]
        for template in entry['actions']:
            if template['action_type']!='attach_item' or owner['time']<template['base_time_cost']:continue
            for variant in template['candidate_variants']:
                for targets in source.candidates._targets(variant,view,'hand_card_action'):
                    if not targets:continue
                    unit={'source_family':'hand_card_action','action_type':'attach_item','source_instance_id':instance,'candidate_variant':variant,'target_instance_ids':targets}
                    cid=source.targeted._single_target_id(view,unit)
                    detail={'candidate_id':cid,'action_type':'attach_item','card_id':card,'source_instance_id':instance,'target_instance_ids':targets,'candidate_variant':variant}
                    attachments.append(detail)
                    if not any(d['candidate_id']==cid for d in details):details.append(detail)
    details.sort(key=lambda x:x['candidate_id'])
    return {**base,**contracts.boundary(row),'candidate_ids':[x['candidate_id'] for x in details],'legal_candidate_details':details,'final_time_inventory':inventory,'actual_board_attachment_inventory':attachments}

def choose_normal(row,proof):
    original=contracts.paid.cost_and_effect
    def cost_and_effect(r,action):
        if action['card_id'] in ('E-final-time','G-hit-blow'):
            template=next(x for x in contracts.start.load_candidate_rows()[action['card_id']]['actions'] if x['action_type']==action['action_type'])
            return template['base_time_cost'],template['source_text_reference']
        if action['card_id']=='W-countryside':return contracts.countryside.paid_cost_and_effect(r,action)
        if action['action_type'] in ('attach_item','place_world'):
            game=r['final_continuation_state']['game_state'];owner=game['players'][game['turn_player']]
            cost,effect=source.source.source.conditional_paid._paid_cost(action,game,owner,source.source.table_source.normal.candidate.load_inputs()['candidate_table'])
            template=next(x for x in contracts.start.load_candidate_rows()[action['card_id']]['actions'] if x['action_type']==action['action_type'])
            return cost,template['source_text_reference']
        return original(r,action)
    try:
        contracts.paid.cost_and_effect=cost_and_effect
        placements=[x for x in proof['legal_candidate_details'] if x['action_type']=='place_companion']
        if placements:
            if len(placements)!=1 or placements[0]['card_id']!='C-cat_friend':raise ValueError('407 new placement inventory differs')
            reduced=copy.deepcopy(proof);reduced['legal_candidate_details']=[placements[0],next(x for x in proof['legal_candidate_details'] if x['candidate_id']=='pass')];reduced['candidate_ids']=sorted(x['candidate_id'] for x in reduced['legal_candidate_details'])
            with source.source.source.conditional_paid.placement_scope():
                safety=source.source.free.decide(row,reduced)
            if safety['resolution_mode']!='safe_free_development' or source.source.fallback.validate_safe_free_placement(safety['selected_placement']):raise ValueError('407 free placement safety differs')
            # Reuse405's complete paid comparison with the proven placement;
            # its label/card guard is scoped by the registered131 text below.
            game=row['final_continuation_state']['game_state'];owner=game['players'][game['turn_player']];comparisons=[]
            common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
            left={**common,'candidate_id':placements[0]['candidate_id'],'payment_time':0,'time_after_certain_resolution':owner['time'],'card_copy_id':game['cards'][placements[0]['source_instance_id']]['card_copy_id']}
            for action in proof['legal_candidate_details']:
                if action['action_type'] in ('pass','place_companion'):continue
                cost,ref=cost_and_effect(row,action);right={**common,'candidate_id':action['candidate_id'],'payment_time':cost,'time_after_certain_resolution':owner['time']-cost,'card_copy_id':game['cards'][action['source_instance_id']]['card_copy_id']}
                comparison=source.source.priority.compare_candidates(left,right)
                if comparison['winner']!='left' or comparison['decided_at']!='time_after_certain_resolution':raise ValueError('407 complete placement priority differs')
                comparisons.append({'candidate_id':action['candidate_id'],'source_reference':ref,'score':right,'comparison':comparison})
            order=next(x for x in contracts.start.load_source()['results'] if x['path_id']==row['path_id'])['order_id'];actor=game['turn_player'];fallback=source.source.fallback
            selected=fallback.resolve_safe_free_development([safety['selected_placement']],{'contract_version':fallback.CONTRACT_VERSION,'order_id':order,'actor':actor,'actor_turn_index':game['round'],'round':game['round'],'phase':'normal_action','decision_kind':'normal_action','choice_kind':'zero_cost_person_placement'},proof['candidate_ids'])
            selected.update(**contracts.boundary(row),candidate_ids=proof['candidate_ids'],selected_action=copy.deepcopy(placements[0]),legal_candidate_details=proof['legal_candidate_details'],paid_comparisons=comparisons)
            return selected
        return source.source.choose_normal(row,proof)
    finally:contracts.paid.cost_and_effect=original

def run_route(initial):
    row=copy.deepcopy(initial);events=[];shots=[];decisions=[];steps=[]
    baseline,history,digest=saved_history(row['path_id'])
    for _ in range(32):
        state=row['final_continuation_state'];phase=state['game_state']['phase'];ctx=state['response_context'];current_history=history+list(zip(events,shots))
        if row.get('completed') or (phase=='egg_exchange_choice' and events):break
        if phase=='egg_exchange_choice':
            proof={**contracts.boundary(row),**source.source.eggs.audit_egg(row)}
            result=source.source.egg_replay.run_route(row);selected=result['new_decisions'][0]
        elif phase=='normal_action':
            proof=audit_normal(row,baseline,current_history);selected=choose_normal(row,proof)
            if selected['selected_candidate']=='pass':result=contracts.normal_pass.run_route(row,selected,proof)
            else:
                with source.source.source.conditional_paid.placement_scope():result=source.source.replay_placement(row,selected)
        elif phase=='turn_end':
            proof=contracts.extend_end_proof(row,baseline,current_history,source.source.terminal.audit_current_turn_end)
            selected=None;result=source.source.terminal.replay_end(row,proof)
        elif ctx['chain_status']=='resolving':
            proof={**contracts.boundary(row),'next_opportunity':'resolve_chain','resolution_order':list(reversed(ctx['chain_links']))};selected=None
            link=state['activation_zone'][-1];before=contracts.current(row)
            if link['card_id']=='E-final-time':result=source.resolve_final_time(row,return_phase='normal_action' if ctx['window_kind']=='turn_start' else 'turn_end')
            elif link['card_id']=='G-hit-blow':
                after,event=hit.resolve_link(before,allow_outer_links=True);result=contracts.result_from_state(row,after,event)
            elif link['card_id']=='I-c_coin2' and len(state['activation_zone'])==1:
                after,event=source.source.coin_resolution.resolve_item(before,{'chain_link_id':link['link_id'],'source_instance_id':link['source_instance_id']});result=contracts.result_from_state(row,after,event)
            else:result=source.source.source.replay_resolution(row)
        else:
            proof=audit_response(row,baseline,current_history);selected=choose_response(row,proof,baseline,current_history)
            result=source.pass_response(row,proof,selected) if selected['selected_candidate']=='response-pass' else activate(row,selected)
            result['new_decisions']=[selected['comparison']]
        contracts.validate_chain(row,result)
        steps.append({'audit':proof,'selection':selected,'event_seqs':[e['seq'] for e in result['new_events']]})
        events+=result['new_events'];shots+=result['new_snapshots'];decisions+=result['new_decisions'];row=result
    else:raise ValueError('407 batch step bound')
    final={**row,**contracts.boundary(initial),'new_events':events,'new_snapshots':shots,'new_decisions':decisions,'stop_reason_code':'r10_final_comparison' if row.get('completed') else 'checkpoint_boundary_next_egg_exchange'}
    contracts.validate_chain(initial,final)
    next_audit={'completed':True,'result':row['result']} if row.get('completed') else {**contracts.boundary(row),**source.source.eggs.audit_egg(row)}
    return ({'path_id':row['path_id'],'baseline_raw_sha256':digest,'steps':steps,'next_opportunity_audit':next_audit},final)

def build_reports():
    pairs=[run_route(row) for row in load_rows()];results=[p[1] for p in pairs];count=sum(len(x['new_events']) for x in results)
    common={'source_raw_sha256':SOURCE_SHA,'planned':4,'completed':sum(x['completed'] for x in results),'independent_balance_sample_count':0}
    return ({**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_407.v1','results':[p[0] for p in pairs]},
            {**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_407.v1','new_events':count,'new_snapshots':count,'new_decisions':sum(len(x['new_decisions']) for x in results),'results':results})

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();audit,report=build_reports()
    for path,value in ((AUDIT,audit),(OUTPUT,report)):
        raw=canonical_bytes(value)
        if args.check:
            if path.read_bytes()!=raw:raise SystemExit('407 canonical mismatch '+str(path))
        else:path.write_bytes(raw)
    print(f"407: four routes, {report['new_events']} event/snapshot pairs, completed {report['completed']}")
if __name__=='__main__':main()
