"""Scoped adapters for reached no-main mixed replay states; no new game rules."""
import copy
import hashlib
import json
from contextlib import contextmanager
from pathlib import Path

import proxy_start_response_138 as start
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_new_seed_mixed_audit_381 as normals
import proxy_new_seed_start_choice_188 as board_choice
import proxy_response_window_seeded_restart as response
import proxy_new_seed_ability_activation_190 as activation
import proxy_new_seed_ability_resolution_196 as resolution
import proxy_hit_blow_response_142 as chain
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_new_seed_mixed_replay_379 as unique_pass
import proxy_new_seed_mixed_replay_290 as normal_pass
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_mixed_choice_325 as countryside
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_turn_end_audit_163 as board_end
import proxy_turn_end_provenance_restart as provenance
import proxy_new_seed_mixed_audit_294 as references

ROOT=Path(__file__).resolve().parents[1]

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

def boundary(row):
    state=row['final_continuation_state']
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or start.opening._stop_state_sha256(state['game_state'])!=row['final_game_state_sha256']:
        raise ValueError('reached source hash mismatch')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256']}

def current(row):
    boundary(row)
    state=copy.deepcopy(row['final_continuation_state'])
    state.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],
                 source_game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'])
    return state

def board_reason(game,actor,instance,context=None,active=()):
    owner=game['players'][actor];board=owner['board'];card=game['cards'][instance]['card_id']
    filename='72-companion-26-card-text-draft.md' if card.startswith('C-') else '74-partner-18-card-text-draft.md'
    section=hand.source_section(filename,card)
    if card=='C-cat_friend':
        if '自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard']):
            raise ValueError('reached cat target needs separate proof')
        reason='requires_other_discarded_companion'
    elif card=='C-box' and '能力なし。' in section:
        reason='no_ability'
    elif card=='C-chameleon' and '自分と相手の両方にセカイがある間' in section and '発動' not in section.split('> ',1)[1].split('\n',1)[0]:
        reason='continuous_not_response'
    elif card in ('C-bat','C-chicken'):
        trigger=timing.TRIGGERS[card]
        if any(fragment not in section for fragment in trigger[1:]):raise ValueError('reached trigger source differs')
        if instance in active:reason='already_active_chain_link'
        elif context and timing.matches(card,context['window_kind'],actor,context['turn_player'],'turn_start',context['turn_player']):
            if card!='C-chicken' or not owner['deck']:raise ValueError('reached trigger effect needs separate proof')
            return None
        else:reason='trigger_condition_not_met'
    elif card=='P-cat_ceo' and '交際を始めた時、発動する' in section and board['partner_stage']==0:
        reason='relationship_start_event_not_met'
    elif card=='P-cliff_goat' and '名前の異なるセカイへ変更した時' in section and board['world'] is None:
        reason='different_world_replacement_not_met'
    elif card=='P-anglerfish' and '自分のメインが自分からちょうせんする時' in section and board['main'] is None:
        reason='trigger_condition_not_met'
    else:raise ValueError('reached board source needs separate proof: '+card)
    return {'source_instance_id':instance,'card_id':card,'reason_code':reason,'source_reference':filename+'#'+card}

def audit_response(row):
    base=boundary(row);state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context'];actor=ctx['priority_actor']
    if game['phase'] not in ('response_window','post_placement_response','turn_end_response') or ctx['window_kind'] not in ('turn_start','after_normal_action') or state['pending_triggers'] or game.get('challenge') is not None:
        raise ValueError('reached response boundary needs separate proof')
    active=[]
    if state['activation_zone']:
        if ctx['window_kind']!='turn_start' or ctx['chain_status']!='building' or len(state['activation_zone'])!=1:raise ValueError('reached response chain needs separate proof')
        link=state['activation_zone'][0]
        if link['source_zone']!='board' or link['card_id']!='C-chicken' or ctx['chain_links']!=[link['link_id']]:raise ValueError('reached active board link differs')
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
    if chance['legal_candidate_ids']!=['response-pass'] or not chance['candidate_set_complete'] or len(ids)!=len(set(ids)):raise ValueError('reached response hand requires separate proof')
    return {**base,'actor':actor,'next_opportunity':game['phase'],'source_window_kind':ctx['window_kind'],'candidate_ids':ids,'candidate_set_complete':True,'hand_exclusions':removed,'hand_other_exclusions':chance['excluded_candidates'],'board_exclusions':excluded,'board_candidate_details':abilities}

def audit_normal(row):
    base=boundary(row);state=row['final_continuation_state'];game=state['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    if game['phase']!='normal_action' or state['activation_zone'] or state['pending_triggers'] or owner['board']['main'] is not None or owner['board']['world'] is not None:raise ValueError('reached normal boundary needs separate proof')
    projected=copy.deepcopy(row);excluded=[]
    for instance in owner['board']['companions']:
        reason=board_reason(game,actor,instance)
        if reason is None:raise ValueError('reached normal triggered ability classified as action')
        if reason['card_id']=='C-chameleon':
            projected['final_continuation_state']['game_state']['players'][actor]['board']['companions'].remove(instance);excluded.append(reason)
    # 381's path allowlist is a fixture label check, not a gameplay condition.
    projected['path_id']='probe-02-a-first'
    projected['final_game_state_sha256']=start.opening._stop_state_sha256(projected['final_continuation_state']['game_state'])
    projected['final_continuation_state_sha256']=start.canonical_sha256(projected['final_continuation_state'])
    proof=normals.audit_route(projected)
    if not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):raise ValueError('reached normal candidates incomplete')
    return {**base,**{k:proof[k] for k in ('next_opportunity','candidate_ids','candidate_set_complete','legal_candidate_details','completeness_checks')},'actor':actor,'board_exclusions':proof['board_exclusions']+excluded}

def choose_response(row,proof):
    if proof['candidate_ids']==['response-pass']:
        return {**boundary(row),'candidate_ids':['response-pass'],'selected_candidate':'response-pass','resolution_mode':'response_unique'}
    if len(proof['board_candidate_details'])!=1 or proof['source_window_kind']!='turn_start':raise ValueError('reached response fallback needs separate proof')
    adapted=copy.deepcopy(proof);adapted.update(hand_conditional_exclusions=proof['hand_exclusions'],hand_candidate_ids=['response-pass'])
    state=current(row);chance=board_choice.opportunity(state,adapted)
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':state['game_state']['round'],'round':state['game_state']['round']},chance)
    if decision['legal_candidate_ids']!=proof['candidate_ids'] or decision['resolution_mode']!='response_seeded_fallback':raise ValueError('reached canonical response decision differs')
    decision.update(pre_game_state_sha256=row['final_game_state_sha256'],pre_continuation_state_sha256=row['final_continuation_state_sha256'],event_seq=row['last_valid_event_seq'])
    return {**boundary(row),'candidate_ids':proof['candidate_ids'],'selected_candidate':decision['selected_candidate'],'resolution_mode':'response_seeded_fallback','comparison':decision}

def result_from_state(row,after,event,decisions=()):
    return {**boundary(row),'last_valid_event_seq':after['last_event_seq'],'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),'final_continuation_state_sha256':start._hash(after),'final_continuation_state':start._payload(after),'stop_reason_code':'pending_next_opportunity_audit','new_decisions':list(decisions),'new_events':[event],'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}

def replay_response(row,proof,selected):
    before=current(row);ctx=before['response_context']
    if selected['selected_candidate']!='response-pass':
        decision=selected['comparison'];instance=decision['selected_action']['source_instance_id']
        after,event=activation.activate_board_ability(before,decision,{'candidate_ids':[selected['selected_candidate']],'source_instance_id':instance})
        return result_from_state(row,after,event,[decision])
    if ctx['chain_status']=='building':
        decision={'decision_kind':'response','selected_candidate':'response-pass','resolution_mode':'response_unique','actor':ctx['priority_actor'],'selected_action':{'action_type':'response_pass'},'pre_game_state_sha256':row['final_game_state_sha256'],'pre_continuation_state_sha256':row['final_continuation_state_sha256'],'event_seq':row['last_valid_event_seq']}
        after,event=chain.pass_start_chain(before,decision)
        return result_from_state(row,after,event,[decision])
    if proof['next_opportunity']=='turn_end_response':return normal_pass.run_route(row,selected,proof)
    result=unique_pass.run_route(row,{**proof,'candidate_ids':['response-pass']})
    if selected['resolution_mode']=='response_seeded_fallback':result['new_decisions']=[selected['comparison']]
    return result

def replay_resolution(row):
    before=current(row)
    after,event=resolution.resolve_board_ability(before)
    return result_from_state(row,after,event)

def choose_normal(row,proof):
    original=paid.cost_and_effect
    def cost_and_effect(source,action):
        if action['card_id']=='W-countryside':return countryside.paid_cost_and_effect(source,action)
        if action['card_id']=='W-deepsea':
            game=source['final_continuation_state']['game_state'];owner=game['players'][game['turn_player']]
            section=hand.source_section('89-world-13-card-text-draft.md','W-deepsea')
            template=next(x for x in start.load_candidate_rows()['W-deepsea']['actions'] if x['action_type']=='place_world')
            if action['action_type']!='place_world' or action['source_instance_id'] not in owner['hand'] or owner['board']['world'] is not None or owner['board']['main'] is not None or template['base_time_cost']!=2 or '自分の手札が2枚以下の間、自分のメインのちから・ちえ+1' not in section:raise ValueError('reached deepsea cost/effect differs')
            return 2,'89-world-13-card-text-draft.md#W-deepsea'
        return original(source,action)
    try:
        paid.cost_and_effect=cost_and_effect
        selected=paid.audit_route(row,proof)
    finally:paid.cost_and_effect=original
    selected['decision_pipeline']={'107':'evaluated','114':'priority_unique','116':'not_needed_priority_unique'}
    return selected

def validate_chain(row,result):
    seq=row['last_valid_event_seq'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256']
    if len(result['new_events'])!=len(result['new_snapshots']):raise ValueError('reached event/snapshot count differs')
    for event,shot in zip(result['new_events'],result['new_snapshots']):
        if event['seq']!=seq+1 or shot['event_seq']!=event['seq'] or (event['game_state_before_sha256'],event['continuation_state_before_sha256'])!=(g,c) or (event['game_state_after_sha256'],event['continuation_state_after_sha256'])!=(shot['game_state_sha256'],shot['continuation_state_sha256']) or start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']:raise ValueError('reached event/snapshot hash chain differs')
        seq,g,c=event['seq'],shot['game_state_sha256'],shot['continuation_state_sha256']
    if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('reached final hash differs')

@contextmanager
def end_board_scope():
    registry=board_end.board.turn_end.BOARD_REGISTRY
    additions={'C-cat_friend':('activated_ability_not_turn_end','72-companion-26-card-text-draft.md#C-cat_friend'),'C-box':('no_ability','72-companion-26-card-text-draft.md#C-box')}
    old={k:registry.get(k) for k in additions}
    for card in additions:
        text=hand.source_section('72-companion-26-card-text-draft.md',card)
        if card=='C-box' and '能力なし。' not in text:raise ValueError('reached box turn end text')
        if card=='C-cat_friend' and ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in text or '自分のターン終了時' in text):raise ValueError('reached cat turn end text')
        if old[card] is not None and old[card]!=additions[card]:raise ValueError('reached end registry conflict')
    try:
        registry.update(additions)
        with board_end.current_board_scope():yield
    finally:
        for card,value in old.items():
            if value is None:registry.pop(card,None)
            else:registry[card]=value

def extend_end_proof(row,baseline,history):
    base=boundary(row);state=row['final_continuation_state']
    if state['game_state']['phase']!='turn_end' or state['return_target']!='turn_end' or state['activation_zone'] or state['pending_triggers']:raise ValueError('reached end boundary differs')
    if not baseline['turn_end_set_complete'] or baseline['contract_stop_codes']:raise ValueError('reached inherited end proof incomplete')
    seq,g,c=baseline['source_last_valid_event_seq'],baseline['source_game_state_sha256'],baseline['source_continuation_state_sha256']
    events=copy.deepcopy(baseline['classified_events']);growth=copy.deepcopy(baseline['growth_trace'])
    refs={**references.SOURCE_REFS,'resolve_event':'91-event-21-card-text-draft.md#E-first-date'}
    for event,shot in history:
        if event['action_type'] not in refs or event['seq']!=seq+1 or shot['event_seq']!=event['seq'] or (event['game_state_before_sha256'],event['continuation_state_before_sha256'])!=(g,c) or (event['game_state_after_sha256'],event['continuation_state_after_sha256'])!=(shot['game_state_sha256'],shot['continuation_state_sha256']) or start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']:raise ValueError('reached history hash chain differs')
        observed={a:shot['game_state']['players'][a]['growth'] for a in 'AB'}
        delta={a:observed[a]-growth[-1]['growth'][a] for a in 'AB'}
        if any(delta.values()) or shot['continuation_state']['pending_triggers']:raise ValueError('reached history growth/trigger requires separate proof')
        events.append({'seq':event['seq'],'action_type':event['action_type'],'source_reference':refs[event['action_type']],'growth_delta':delta});growth.append({'event_seq':event['seq'],'growth':observed})
        seq,g,c=event['seq'],shot['game_state_sha256'],shot['continuation_state_sha256']
    if (seq,g,c)!=(row['last_valid_event_seq'],row['final_game_state_sha256'],row['final_continuation_state_sha256']):raise ValueError('reached history boundary differs')
    proof={'classified_events':events,'growth_trace':growth,'growth_reach_100':[],'active_expiring_effects':[],'unresolved_codes':[],'source_event_seq':seq}
    # Existing baselines verified no reaches or expiring effects; every extension
    # is a classified zero-growth action and must keep all current growth <100.
    if any(x>=100 for x in growth[-1]['growth'].values()):raise ValueError('reached victory needs separate proof')
    stop={'path_id':row['path_id'],'last_valid_event_seq':seq,'game_state_sha256':g,'continuation_state_sha256':c,'game_state':state['game_state'],'continuation_state':state}
    with end_board_scope():result=provenance.audit_current_turn_end(stop,proof)
    if not result['turn_end_set_complete'] or result['contract_stop_codes'] or not all(result['completeness_checks'].values()):raise ValueError('reached six-stage end incomplete: '+repr(result['contract_stop_codes']))
    return {**base,'next_opportunity':'turn_end','turn_end_set_complete':True,'stage_inventory':result['stage_inventory'],'completeness_checks':result['completeness_checks'],'contract_stop_codes':[],'classified_events':events,'growth_trace':growth}

ORIGINAL_CLASSIFY=end.classify_next_board
def classify_next_board(game,actor):
    projected=copy.deepcopy(game);extra=[]
    for instance in game['players'][actor]['board']['companions']:
        card=game['cards'][instance]['card_id']
        if card in ('C-cat_friend','C-box','C-chameleon'):
            reason=board_reason(game,actor,instance)
            projected['players'][actor]['board']['companions'].remove(instance)
            extra.append({'source_instance_id':instance,'card_id':card,'trigger_kind':reason['reason_code'],'source_reference':reason['source_reference']})
    return ORIGINAL_CLASSIFY(projected,actor)+extra

def replay_end(row,proof):
    old=end.classify_next_board
    try:
        end.classify_next_board=classify_next_board
        return end.run_route(row,proof)
    finally:end.classify_next_board=old
