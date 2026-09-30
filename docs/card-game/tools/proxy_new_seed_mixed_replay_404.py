#!/usr/bin/env python3
"""Replay the reached A turns in one batch using existing 401 adapters."""
import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_403 as source
import proxy_new_seed_mixed_replay_401 as baseline_source
import proxy_reached_mixed_contracts_401 as contracts
import proxy_new_seed_mixed_audit_340 as eggs
import proxy_new_seed_egg_replay_205 as egg_replay
import proxy_new_seed_normal_audit_156 as partner
import proxy_new_seed_normal_trigger_audit_146 as table_source
import proxy_safe_placement_mixed_131 as conditional_paid
import proxy_new_seed_chain_resolution_155 as reverse_coin

ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='0c385e99ebc38392b1845e0eda9b34aff640eaf404e14da5b548e6265f76b436'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-404-20260930.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-404-20260930.json'
canonical_bytes=contracts.canonical_bytes

start=contracts.start;boundary=contracts.boundary;hand=contracts.hand;conditional=contracts.conditional;board_reason=contracts.board_reason

def audit_response(row):
    base=boundary(row);state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context'];actor=ctx['priority_actor']
    if game['phase'] not in ('response_window','post_placement_response','turn_end_response') or ctx['window_kind'] not in ('turn_start','after_normal_action') or state['pending_triggers'] or game.get('challenge') is not None:
        raise ValueError('reached response boundary needs separate proof')
    active=[]
    if state['activation_zone']:
        if ctx['window_kind']!='turn_start' or ctx['chain_status']!='building' or len(state['activation_zone']) not in (1,2):raise ValueError('404 reached response chain differs')
        links=state['activation_zone'];link=links[0]
        if link['source_zone']!='board' or link['card_id']!='C-chicken' or ctx['chain_links']!=[x['link_id'] for x in links]:raise ValueError('404 reached active board link differs')
        if len(links)==2 and (links[1]['action_type'],links[1]['card_id'],links[1]['payment'])!=('use_item','I-c_coin2',{'time':1}):raise ValueError('404 reached coin link differs')
        active=[link['source_instance_id']]
    elif ctx['chain_status']!='empty':raise ValueError('reached empty response chain differs')
    owner=game['players'][actor];board=owner['board'];projected=copy.deepcopy(state);entries=start.load_candidate_rows();removed=[];excluded=[];abilities=[]
    if board['main'] is not None or board['prepared'] or board['world'] is not None:raise ValueError('reached response board needs separate proof')
    for instance in owner['hand']:
        card=game['cards'][instance]['card_id'];entry=entries.get(card)
        if entry is None:raise ValueError('reached hand card unregistered')
        reason=hand.extra_hand_exclusion(card,entry,game,actor)
        if reason is None and card=='E-boss':
            section=hand.source_section('91-event-21-card-text-draft.md',card)
            if 'このターン、自分のメインが勝負に負けていた場合に発動できる' not in section or board['main'] is not None:raise ValueError('reached boss condition needs separate proof')
            reason={'card_id':card,'reason_code':'requires_own_main_battle_loss_this_turn','source_reference':'91-event-21-card-text-draft.md#E-boss'}
        if reason is None and card=='G-animal-shogi':
            section=hand.source_section('83-play-batch-3-card-text-draft.md',card)
            if '自分の捨て札のなかま1枚を対象' not in section or any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard']):raise ValueError('reached shogi target needs separate proof')
            reason={'card_id':card,'reason_code':'requires_own_discarded_companion'}
        action=next((x for x in entry['actions'] if x['action_type'] in ('use_play','use_item','use_event')),None)
        if reason is None and action is not None and owner['time']>=action['base_time_cost']:reason=conditional.conditional_exclusion(card,game,actor)
        if reason is None and action is not None and action['target_rule']=='one own main':
            filename,section_id=action['source_text_reference'].split('#',1)
            if section_id!=card or '自分のメイン1枚を対象' not in hand.source_section(filename,section_id):raise ValueError('reached own main target differs')
            reason={'card_id':card,'reason_code':'requires_own_main_target'}
        if reason:
            projected['game_state']['players'][actor]['hand'].remove(instance);removed.append({'source_instance_id':instance,**reason})
    for instance in board['companions']:
        reason=board_reason(game,actor,instance,ctx,active)
        if reason is None:
            if ctx['origin_event_seq']!=row['last_valid_event_seq'] or not row['new_events'] or row['new_events'][-1]['action_type']!='egg_exchange_bottom':raise ValueError('reached start ability trigger provenance differs')
            abilities.append({'candidate_id':'response-activate-ability-'+instance,'candidate_family':'triggered_ability','action_type':'activate_board_ability','source_instance_id':instance,'card_id':game['cards'][instance]['card_id'],'source_references':['72-companion-26-card-text-draft.md#C-chicken']})
        else:excluded.append(reason)
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
    if board['partner']:
        excluded.append(board_reason(game,actor,board['partner'],ctx,active));projected['game_state']['players'][actor]['board'].update(partner=None,partner_stage=None)
    projected['game_state']['phase']='response_window';projected['response_context'].update(phase='response_window',window_kind='turn_start')
    chance=start.enumerate_opportunity(projected,actor,entries)
    ids=sorted(chance['legal_candidate_ids']+[x['candidate_id'] for x in abilities])
    if any(x not in ('response-pass','response-use-item-A-033#1') for x in chance['legal_candidate_ids']) or not chance['candidate_set_complete'] or len(ids)!=len(set(ids)):raise ValueError('reached response hand requires separate proof')
    return {**base,'actor':actor,'next_opportunity':game['phase'],'source_window_kind':ctx['window_kind'],'candidate_ids':ids,'candidate_set_complete':True,'hand_candidate_ids':chance['legal_candidate_ids'],'hand_exclusions':removed,'hand_other_exclusions':chance['excluded_candidates'],'board_exclusions':excluded,'board_candidate_details':abilities}

def choose_response(row,proof):
    if proof['candidate_ids']==['response-pass']:return contracts.choose_response(row,proof)
    adapted={**proof,'hand_conditional_exclusions':proof['hand_exclusions']}
    state=contracts.current(row)
    chance=contracts.board_choice.opportunity(state,adapted)
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    decision=contracts.response.resolve_response_choice({'order_id':order,'actor_turn_index':state['game_state']['round'],'round':state['game_state']['round']},chance)
    if decision['legal_candidate_ids']!=proof['candidate_ids']:raise ValueError('404 complete seeded candidate IDs differ')
    decision.update(pre_game_state_sha256=row['final_game_state_sha256'],pre_continuation_state_sha256=row['final_continuation_state_sha256'],event_seq=row['last_valid_event_seq'])
    return {**boundary(row),'candidate_ids':proof['candidate_ids'],'selected_candidate':decision['selected_candidate'],'resolution_mode':decision['resolution_mode'],'comparison':decision}

def choose_normal(row,proof):
    original=contracts.paid.cost_and_effect;uncertainty=[]
    def cost_and_effect(source,action):
        if action['action_type']=='use_item' and action['card_id']=='I-c_coin2':
            game=source['final_continuation_state']['game_state'];owner=game['players'][game['turn_player']]
            cost,effect=conditional_paid._paid_cost(action,game,owner,table_source.normal.candidate.load_inputs()['candidate_table'])
            uncertainty.append({'candidate_id':action['candidate_id'],**effect,'certain_growth_difference':0,'source_contracts':[131,141]})
            return cost,effect['reference']
        return original(source,action)
    try:
        contracts.paid.cost_and_effect=cost_and_effect
        result=contracts.choose_normal(row,proof)
    finally:contracts.paid.cost_and_effect=original
    result['conditional_uncertainty']=uncertainty
    return result

def activate_quick_item(before, decision):
    action = decision['selected_action']; ctx = before['response_context']; actor = ctx['priority_actor']
    if action['action_type'] != 'use_item' or action['card_id'] != 'I-c_coin2' or \
            action['base_time_cost'] != 1 or action['target_instance_ids'] != [] or \
            ctx['window_kind'] != 'turn_start' or ctx['chain_status'] != 'building' or \
            not ctx['chain_links'] or ctx['consecutive_passes'] not in (0,1) or before['pending_triggers']:
        raise ValueError('154 selected quick-item activation boundary differs')
    section = (ROOT / '77-current-items-card-text-draft.md').read_text().split(
        '### I-c_coin2 — ', 1)[1].split('\n### ', 1)[0]
    if '時: 1 / 使用方法: すぐつかう' not in section or \
            '山札上1枚を公開し、山札の一番下に置く' not in section or \
            '公開したカードがメインだった場合、自分のそだち+5' not in section:
        raise ValueError('154 item source text differs')
    player = before['game_state']['players'][actor]; source = action['source_instance_id']
    if source not in player['hand'] or player['time'] < 1 or not player['deck'] or \
            before['game_state']['cards'][source]['card_id'] != action['card_id'] or \
            decision['selected_candidate'] != start.response_id('use_item', source):
        raise ValueError('154 quick-item source identity/cost differs')
    after = copy.deepcopy(before); owner = after['game_state']['players'][actor]
    owner['time'] -= 1; owner['hand'].remove(source)
    seq = before['last_event_seq'] + 1; link_id = f'response-link-{seq}-{source}'
    link = {'link_id': link_id, 'action_type': 'use_item', 'actor': actor,
            'card_id': action['card_id'], 'card_copy_id': action['card_copy_id'],
            'source_instance_id': source, 'target_instance_ids': [], 'candidate_variant': None,
            'payment': {'time': 1}, 'source_references': copy.deepcopy(action['source_references'])}
    after['activation_zone'].append(link)
    transitioned = contracts.chain._turn_start_transition(before, {'kind': 'activate', 'actor': actor, 'link_id': link_id})
    contracts.response._apply_transition_result(after, transitioned)
    after['last_event_seq'] = seq; after['continuation_state_sha256'] = start._hash(after)
    event = {'seq': seq, 'action_type': 'activate_response', 'actor': actor,
             'selected_candidate': action['candidate_id'], 'source_instance_id': source,
             'candidate_variant': None, 'payment': {'time': 1}, 'target_instance_ids': [],
             'chain_link_id': link_id,
             'game_state_before_sha256': start.opening._stop_state_sha256(before['game_state']),
             'game_state_after_sha256': start.opening._stop_state_sha256(after['game_state']),
             'continuation_state_before_sha256': before['continuation_state_sha256'],
             'continuation_state_after_sha256': after['continuation_state_sha256']}
    return after, event


def replay_response(row,proof,selected):
    if selected['selected_candidate']=='response-use-item-A-033#1':
        before=contracts.current(row)
        if len(before['activation_zone'])!=1 or before['activation_zone'][0]['card_id']!='C-chicken':raise ValueError('404 reached coin activation scope differs')
        after,event=activate_quick_item(before,selected['comparison'])
        return contracts.result_from_state(row,after,event,[selected['comparison']])
    return contracts.replay_response(row,proof,selected)

def replay_resolution(row):
    before=contracts.current(row);links=before['activation_zone']
    if len(links)==2:
        if links[0]['card_id']!='C-chicken' or links[1]['card_id']!='I-c_coin2':raise ValueError('404 reverse chain source differs')
        after,event=reverse_coin.resolve_item(before)
        return contracts.result_from_state(row,after,event)
    return contracts.replay_resolution(row)

def load_rows():
    raw=source.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=source.canonical_bytes(source.build_reports()[1]):raise ValueError('404 source raw/canonical differs')
    rows=json.loads(raw)['results']
    if len(rows)!=4:raise ValueError('404 route count')
    return rows

def run_route(initial):
    row=copy.deepcopy(initial);all_events=[];all_shots=[];all_decisions=[];steps=[]
    baseline,history,baseline_hash=baseline_source.saved_history(row['path_id'])
    for checkpoint in (401,402):
        saved=next(x for x in json.loads((ROOT/f'data/proxy-new-seed-mixed-replay-{checkpoint}-20260930.json').read_bytes())['results'] if x['path_id']==row['path_id'])
        history+=list(zip(saved['new_events'],saved['new_snapshots']))
    history+=list(zip(initial['new_events'],initial['new_snapshots']))
    for _ in range(14):
        state=row['final_continuation_state'];phase=state['game_state']['phase'];ctx=state['response_context']
        if phase=='egg_exchange_choice' and all_events:break
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
            result=contracts.normal_pass.run_route(row,selected,proof)
        elif phase=='turn_end':
            proof=contracts.extend_end_proof(row,baseline,history+list(zip(all_events,all_shots)))
            selected=None;result=contracts.replay_end(row,proof)
        elif phase=='response_window' and ctx['chain_status']=='resolving':
            proof={**contracts.boundary(row),'next_opportunity':'resolve_item' if state['activation_zone'][-1]['card_id']=='I-c_coin2' else 'resolve_board_ability','source_window_kind':ctx['window_kind'],'activation_zone':copy.deepcopy(state['activation_zone'])}
            selected=None;result=replay_resolution(row)
        else:
            proof=audit_response(row);selected=choose_response(row,proof)
            result=replay_response(row,proof,selected)
        contracts.validate_chain(row,result)
        steps.append({'audit':proof,'selection':selected,'event_seqs':[x['seq'] for x in result['new_events']]})
        all_events.extend(result['new_events']);all_shots.extend(result['new_snapshots']);all_decisions.extend(result['new_decisions']);row=result
    else:raise ValueError('404 scoped batch exceeded expected steps')
    if (row['final_continuation_state']['game_state']['turn_player'],row['final_continuation_state']['game_state']['phase'])!=('B','egg_exchange_choice'):raise ValueError('404 final boundary differs')
    next_audit={**contracts.boundary(row),**eggs.audit_egg(row)}
    result={**row,**contracts.boundary(initial),'stop_reason_code':'checkpoint_boundary_next_egg_exchange','new_events':all_events,'new_snapshots':all_shots,'new_decisions':all_decisions}
    contracts.validate_chain(initial,result)
    return ({'path_id':initial['path_id'],'baseline_checkpoint':baseline_source.BASELINES[initial['path_id']],'baseline_raw_sha256':baseline_hash,'steps':steps,'next_opportunity_audit':next_audit},result)

def build_reports():
    rows=load_rows();pairs=[run_route(row) for row in rows];audits=[x[0] for x in pairs];results=[x[1] for x in pairs]
    events=sum(len(x['new_events']) for x in results);decisions=sum(len(x['new_decisions']) for x in results)
    if events<28 or any(x['completed'] or x['balance_sample_count'] for x in results):raise ValueError('404 batch count/balance differs')
    common={'source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'independent_balance_sample_count':0}
    return ({**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_404.v1','results':audits},
            {**common,'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_404.v1','new_decisions':decisions,'new_events':events,'new_snapshots':events,'results':results})

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();a,r=build_reports()
    for path,value in ((AUDIT,a),(OUTPUT,r)):
        raw=canonical_bytes(value)
        if args.check:
            if path.read_bytes()!=raw:raise SystemExit('404 canonical mismatch '+str(path))
        else:path.write_bytes(raw)
    print(f"404: four A turns, {r['new_events']} events/snapshots verified")
if __name__=='__main__':main()
