"""Fresh reached response inventories using existing public timing/ID contracts.

Candidate enumeration is independent of policy and has no transition side effects.
Unknown source timing, targets and prepared activations fail before payment.
"""
import copy
import proxy_reached_mixed_contracts_401 as reached
import proxy_start_response_138 as start


def enumerate_opportunity(state,events,capability_classifier=None,hand_classifier=None):
    game=state['game_state'];ctx=state['response_context'];actor=ctx['priority_actor'];owner=game['players'][actor];board=owner['board']
    if game['phase'] not in ('response_window','post_placement_response','turn_end_response') or ctx['window_kind'] not in ('turn_start','after_normal_action') or state['pending_triggers'] or game.get('challenge') is not None:
        raise ValueError('reached response phase requires separate proof')
    if not events or (events[-1]['seq'],events[-1]['game_state_after_sha256'],events[-1]['continuation_state_after_sha256'])!=(state['last_event_seq'],start.opening._stop_state_sha256(game),start._hash(state)):
        raise ValueError('reached response executed history differs')
    if board['prepared'] or (board['world'] is not None and capability_classifier is None):
        raise ValueError('prepared/world response source requires separate proof')
    active=[x['source_instance_id'] for x in state['activation_zone']]
    if ctx['chain_status'] not in ('empty','building') or ctx['chain_links']!=[x['link_id'] for x in state['activation_zone']] or (ctx['chain_status']=='empty' and active):
        raise ValueError('reached response active links differ')
    projected=copy.deepcopy(state);entries=start.load_candidate_rows();excluded=[];additions=[]
    for instance in owner['hand']:
        card=game['cards'][instance]['card_id'];entry=entries.get(card)
        if entry is None:raise ValueError('reached response hand source absent')
        action=next((x for x in entry['actions'] if x['action_type'] in ('use_play','use_item','use_event')),None)
        reason=None
        if hand_classifier is not None:
            extra,classified=hand_classifier(state,events,actor,instance,entry)
            if classified is not None:
                additions.extend(extra);reason=classified
        if reason is None:reason=reached.hand.extra_hand_exclusion(card,entry,game,actor)
        affordable=action is not None and owner['time']>=action['base_time_cost']
        if reason is None and affordable and card=='E-first-date':
            section=reached.hand.source_section('91-event-21-card-text-draft.md',card)
            if '自分のこいびと1枚を対象として発動できる' not in section or '交際段階が0の場合' not in section or action['base_time_cost']!=1 or action['target_rule']!='own stage-0 partner':
                raise ValueError('first date public target source differs')
            partner=board['partner']
            if partner is not None and board['partner_stage']==0:
                detail=start._hand_detail(game,actor,instance,entry,action)
                detail.update(candidate_id=start.response_id('use_event',instance,target_instance_id=partner),target_instance_ids=[partner])
                additions.append(detail);reason=dict(card_id=card,reason_code='enumerated_with_proven_partner_target',source_reference=action['source_text_reference'])
            else:reason=dict(card_id=card,reason_code='requires_stage_zero_partner',source_reference=action['source_text_reference'])
        if reason is None and affordable and card=='E-boss':
            section=reached.hand.source_section('91-event-21-card-text-draft.md',card)
            if 'このターン、自分のメインが勝負に負けていた場合に発動できる' not in section or any('challenge' in e['action_type'] for e in events):
                raise ValueError('battle loss response requires history proof')
            reason=dict(card_id=card,reason_code='requires_own_main_battle_loss_this_turn',source_reference=action['source_text_reference'])
        if reason is None and affordable and card=='G-animal-shogi':
            section=reached.hand.source_section('83-play-batch-3-card-text-draft.md',card)
            if '自分の捨て札のなかま1枚を対象' not in section or any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard']):
                raise ValueError('discarded companion response target requires proof')
            reason=dict(card_id=card,reason_code='requires_own_discarded_companion',source_reference=action['source_text_reference'])
        if reason is None and affordable:reason=reached.conditional.conditional_exclusion(card,game,actor)
        if reason is None and action is not None and action['target_rule']=='one own main' and board['main'] is None:
            filename,section_id=action['source_text_reference'].split('#',1)
            if section_id!=card or '自分のメイン1枚を対象' not in reached.hand.source_section(filename,section_id):raise ValueError('own main response target source differs')
            reason=dict(card_id=card,reason_code='requires_own_main_target',source_reference=action['source_text_reference'])
        if reason:
            projected['game_state']['players'][actor]['hand'].remove(instance);excluded.append(dict(source_zone='hand',source_instance_id=instance,**reason))
    if board['main'] is not None:
        instance=board['main'];card=game['cards'][instance]['card_id']
        if capability_classifier is not None and card!='M-antlion-01':
            classified=capability_classifier(state,events,instance,'main')
            additions.extend(classified.pop('legal_candidate_details',[]))
            excluded.append(dict(source_zone='board',**classified))
        else:
            section=(start.ROOT/'55-insect-three-lines-card-text-draft.md').read_text().split('## M-antlion-01 ',1)[1].split('\n## ',1)[0]
            if card!='M-antlion-01' or '支払い手順の途中に別の能力発動を割り込ませる処理ではない' not in section:
                raise ValueError('main response timing requires separate proof')
            excluded.append(dict(source_zone='board',source_instance_id=instance,card_id=card,reason_code='cost_adjustment_not_response',source_reference='55-insect-three-lines-card-text-draft.md#M-antlion-01'))
        projected['game_state']['players'][actor]['board']['main']=None
    if board['world'] is not None:
        classified=capability_classifier(state,events,board['world'],'world')
        additions.extend(classified.pop('legal_candidate_details',[]))
        excluded.append(dict(source_zone='board',**classified))
        projected['game_state']['players'][actor]['board']['world']=None
    for instance in board['companions']:
        card=game['cards'][instance]['card_id']
        reason=None
        if card in reached.timing.TRIGGERS:
            section=reached.hand.source_section('72-companion-26-card-text-draft.md',card)
            if any(fragment not in section for fragment in reached.timing.TRIGGERS[card][1:]):raise ValueError('board trigger source differs')
            latest=events[-1];kind='turn_start' if latest['action_type']=='egg_exchange_bottom' and ctx['origin_event_seq']==latest['seq'] else latest['action_type']
            matches=reached.timing.matches(card,ctx['window_kind'],actor,ctx['turn_player'],kind,latest['actor'])
            if instance in active:code='already_active_chain_link'
            elif not matches:code='trigger_condition_not_met'
            elif card=='C-chicken' and owner['deck']:
                additions.append(dict(candidate_id='response-activate-ability-'+instance,candidate_family='triggered_ability',action_type='activate_board_ability',source_instance_id=instance,card_id=card,card_copy_id=game['cards'][instance]['card_copy_id'],target_instance_ids=[],candidate_variant=None,base_time_cost=0,source_references=['72-companion-26-card-text-draft.md#C-chicken']));code=None
            else:raise ValueError('matched board trigger requires effect proof')
            if code:reason=dict(source_instance_id=instance,card_id=card,reason_code=code,source_reference='72-companion-26-card-text-draft.md#'+card)
        else:reason=reached.board_reason(game,actor,instance,ctx,active)
        if reason:excluded.append(dict(source_zone='board',**reason))
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
    if board['partner']:
        instance=board['partner'];card=game['cards'][instance]['card_id']
        if capability_classifier is not None:
            classified=capability_classifier(state,events,instance,'partner')
            additions.extend(classified.pop('legal_candidate_details',[]));reason=classified
        elif card=='P-desert_scorpion':
            section=reached.hand.source_section('74-partner-18-card-text-draft.md',card)
            if '自分のターン終了時' not in section or '「あそび」と「あいてむ」' not in section:raise ValueError('partner end timing source differs')
            reason=dict(source_instance_id=instance,card_id=card,reason_code='turn_end_not_current_response',source_reference='74-partner-18-card-text-draft.md#'+card)
        else:reason=reached.board_reason(game,actor,instance,ctx,active)
        excluded.append(dict(source_zone='board',**reason));projected['game_state']['players'][actor]['board'].update(partner=None,partner_stage=None)
    projected['game_state']['phase']='response_window';projected['response_context'].update(phase='response_window',window_kind='turn_start')
    chance=start.enumerate_opportunity(projected,actor,entries)
    details=sorted(chance['legal_candidate_details']+additions,key=lambda x:x['candidate_id']);ids=[x['candidate_id'] for x in details]
    if not chance['candidate_set_complete'] or len(ids)!=len(set(ids)):raise ValueError('reached response candidate set differs')
    return dict(actor=actor,response_context=copy.deepcopy(ctx),legal_candidate_ids=ids,legal_candidate_details=details,candidate_set_complete=True,
        forbidden_information_used=[],inspected_information=start.response._information_snapshot(game,actor),
        excluded_candidates=excluded+chance['excluded_candidates'],source_references=sorted({ref for x in details for ref in x['source_references']}))
