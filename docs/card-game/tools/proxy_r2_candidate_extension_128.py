#!/usr/bin/env python3
"""Checkpoint 128: three independent current-state candidate responsibilities."""
from __future__ import annotations

import copy
import hashlib
import json
from contextlib import contextmanager
from pathlib import Path

import proxy_r2_candidate_extension_127 as extension_127

candidate_121=extension_127.candidate_121
extension_125=extension_127.extension_125
fallback_116=extension_127.fallback_116
restart_117=extension_127.restart_117
restart_122=extension_127.restart_122
hardening_114=extension_127.hardening_114
response_120=extension_127.response_120
current_126=extension_127.current_126
DATA=extension_127.DATA
SOURCE_SHA={
 'order-01-a-first':'76aba7d092ab2382c9e5a30a62000d402ab10b559797e5089d5dc19d3998048d',
 'order-01-b-first':'2527a1aa7b44631adca909dad2b96f9e5207fa43871c5138330ee3b8fea54d49',
 'order-02-a-first':'4f54e7c49d99640d39fc551ef9a72e7a60ec1b4e19eb2a1ff44776e38b96bbc5',
 'order-02-b-first':'ce76c740862b877b1de887e88b0f3fcfce2b7b4d0bc2747edf12919ac3dc0b36',
}
BOARD_CLASSIFICATION={
 **candidate_121.BOARD_ABILITY_REGISTRY,
 'C-box':{'kind':'none','source_text_reference':'72-companion-26-card-text-draft.md#C-box',
          'placement_action':'place_companion','placement_growth_delta':0,
          'placement_duration':'none'},
}
NON_INDEPENDENT={'none','continuous','past_trigger','passive','triggered'}
PAID_ACTION_CERTAIN_EFFECTS={
 'I-bond1':{'immediate_growth_delta':0,'immediate_time_delta':0,
            'reference':'77-current-items-card-text-draft.md#I-bond1',
            'deferred_condition':'そのなかまが相手の効果でなかま枠から手札か捨て札に移るなら'},
 'I-bowtie':{'immediate_growth_delta':0,'immediate_time_delta':0,
             'reference':'77-current-items-card-text-draft.md#I-bowtie',
             'deferred_condition':'自分のターン開始時、手札が2枚以下の場合'},
 'W-city':{'immediate_growth_delta':0,'immediate_time_delta':0,
           'reference':'89-world-13-card-text-draft.md#W-city',
           'deferred_condition':'合計が2枚になった時'},
}


def load_sources(data_dir: Path = DATA) -> dict:
    if extension_127.check_outputs(data_dir):
        raise ValueError('127 canonical outputs differ')
    inputs=extension_127.load_sources(data_dir)
    stops={}
    for path,sha in SOURCE_SHA.items():
        raw=(data_dir/'proxy-r2-candidate-stops-127'/f'stop-127-{path}.json').read_bytes()
        if hashlib.sha256(raw).hexdigest()!=sha:
            raise ValueError('127 protected raw SHA differs')
        stop=json.loads(raw)
        if response_120.game_state_sha256(stop['final_state']['game_state'])!=stop['game_state_sha256'] or \
                response_120.continuation_state_sha256(response_120._continuation_payload(stop['final_state']))!=stop['continuation_state_sha256']:
            raise ValueError('127 protected state SHA differs')
        stops[path]=stop
    return {'stops':stops,'candidate_table':inputs['candidate_table'],'source_127':inputs}


def _classify_board(source: str, view: dict) -> dict:
    card_id=view['cards'][source]['card_id']
    ability=BOARD_CLASSIFICATION.get(card_id)
    if ability is None or ability['kind'] not in NON_INDEPENDENT:
        raise ValueError('unresolved_canonical_predicate: board ability classification')
    reference=ability['source_text_reference'];filename,sep,anchor=reference.partition('#')
    file=DATA.parent/filename
    if not sep or anchor!=card_id or not file.is_file() or f'### {anchor} ' not in file.read_text():
        raise ValueError('unresolved_canonical_predicate: board source reference')
    return ability


def expand_units(view: dict, table: dict) -> list[dict]:
    inventory=extension_127.extension_125.inventory_sources(view)
    copy_inventory=copy.deepcopy(inventory)
    board=next(x for x in copy_inventory if x['family']=='board_card_action')
    extras=[]
    for source in board['sources']:
        ability=_classify_board(source,view)
        if view['cards'][source]['card_id'] not in candidate_121.BOARD_ABILITY_REGISTRY:
            extras.append((source,ability))
    board['sources']=[source for source in board['sources'] if source not in {x for x,_ in extras}]
    units=candidate_121.expand_units(view,copy_inventory,table)
    if extras:
        by_source={u['source_instance_id']:u for u in units if u['source_family']=='board_card_action'}
        for source,ability in extras:
            cid=view['cards'][source]['card_id']
            by_source[source]=candidate_121._unit('board_card_action','board',source,
                'board_passive',ability['kind'],[],cid,
                {'timing':'passive','source_text_reference':ability['source_text_reference']})
        units=[u for u in units if u['source_family']!='board_card_action']
        index=next((i for i,u in enumerate(units) if u['source_family'] not in
                   ('standing_pass','hand_card_action')),len(units))
        units[index:index]=[by_source[source] for source in board['sources']+[x for x,_ in extras]]
        # 121's board inventory is already sorted by source ID.
        units[index:index+len(by_source)]=sorted(units[index:index+len(by_source)],key=lambda u:u['source_instance_id'])
    return units


def targetless_id(view: dict, original: dict) -> str:
    source=original['source_instance_id'];targets=original['target_instance_ids']
    if original['source_family']!='hand_card_action' or source not in view['players'][view['actor']]['hand'] or \
            targets!=[] or targets not in candidate_121._targets(
                original['candidate_variant'],view,original['source_family']) or \
            original['action_type']=='play_main':
        raise ValueError('missing_candidate_id_grammar: not a proven targetless hand action')
    return f"candidate-{original['action_type']}-{source}"


def adjudicate_units(view: dict, baseline: list[dict]) -> list[dict]:
    result=[]
    for original in baseline:
        try:
            result.extend(extension_127.adjudicate_units(view,[original]))
        except ValueError as error:
            if str(error)!='missing_candidate_id_grammar: not a proven single target':
                raise
            identifier=targetless_id(view,original)
            unit={k:copy.deepcopy(v) for k,v in original.items() if k!='template'}
            unit.update({'reason_codes':[],'disposition':'admitted','candidate_id':identifier,
                         'evidence':{},'source_references':[original['template']['source_text_reference']]})
            result.append(unit)
    groups={}
    for unit in result:
        if unit['disposition']=='admitted' and unit['source_family']=='hand_card_action' and \
                unit['target_instance_ids']==[] and unit['action_type']!='play_main':
            groups.setdefault((unit['action_type'],unit['source_instance_id']),[]).append(unit)
    for (action,source),variants in groups.items():
        if len(variants)>1:
            if len({unit['candidate_variant'] for unit in variants})!=len(variants):
                raise ValueError('candidate_id_collision: duplicate canonical variant')
            for unit in variants:
                original=next(row for row in baseline if row['enumeration_unit_id']==unit['enumeration_unit_id'])
                variant=unit['candidate_variant']
                if variant not in original['template']['candidate_variants']:
                    raise ValueError('missing_candidate_id_grammar: unregistered variant')
                unit['candidate_id']=f'candidate-{action}-{source}-{variant}'
    if len({u['candidate_id'] for u in result if u['candidate_id']})!=sum(bool(u['candidate_id']) for u in result):
        raise ValueError('candidate_id_collision')
    return result


def _expected(view: dict, table: dict) -> tuple[list,list,list,list]:
    inventory=extension_127.extension_125.inventory_sources(view)
    units=adjudicate_units(view,expand_units(view,table))
    admitted=sorted((u for u in units if u['disposition']=='admitted'),key=lambda u:u['candidate_id'])
    if sum(u['candidate_id']=='pass' for u in admitted)!=1:
        raise ValueError('standing pass differs')
    return inventory,units,[u['candidate_id'] for u in admitted],admitted


def _checks(row: dict, view: dict, table: dict) -> dict[str,bool]:
    flags={name:False for name in candidate_121.CHECKS}
    try:
        inventory,units,ids,details=_expected(view,table)
        actor=view['actor']
        flags['opportunity_context_valid']=row.get('opportunity_context')=={
            'round':view['round'],'turn_player':actor,'actor':actor,'phase':'normal_action',
            'decision_kind':'normal_action','choice_kind':'normal_action'}
        flags['source_artifact_integrity_valid']=True
        flags['information_boundary_valid']=row.get('information_policy')=='public_and_owner_known_only' and \
            row.get('owner_state')==view['players'][actor] and \
            row.get('public_information')=={k:v for k,v in view['players'].items() if k!=actor} and \
            row.get('forbidden_information_used')==[]
        flags['required_source_families_present']=[x.get('family') for x in row.get('source_inventory',[])]==list(candidate_121.FAMILIES)
        flags['source_inventory_complete']=row.get('source_inventory')==inventory
        flags['candidate_templates_complete']=True
        actual=row.get('enumeration_units')
        if isinstance(actual,list):
            flags['information_boundary_valid']=flags['information_boundary_valid'] and len(actual)==len(units) and all(
                x.get('evidence')==y['evidence'] and x.get('source_references')==y['source_references']
                for x,y in zip(actual,units))
            flags['candidate_variants_complete']=[(x.get('source_family'),x.get('source_id'),x.get('action_type'),x.get('candidate_variant')) for x in actual]==[(x['source_family'],x['source_id'],x['action_type'],x['candidate_variant']) for x in units]
            flags['target_expansions_complete']=[(x.get('enumeration_unit_id'),x.get('target_instance_ids')) for x in actual]==[(x['enumeration_unit_id'],x['target_instance_ids']) for x in units]
            flags['canonical_predicates_resolved']=True
            flags['dispositions_and_reasons_valid']=actual==units
            flags['stable_candidate_ids_valid']=len(actual)==len(units) and all(x.get('candidate_id')==y['candidate_id'] for x,y in zip(actual,units))
        flags['legal_candidate_projection_exact']=row.get('legal_candidate_ids')==ids and row.get('legal_candidate_details')==details
    except (ValueError,KeyError,TypeError,IndexError):
        pass
    return flags


def audit_current(route: dict, table: dict) -> dict:
    view=extension_127.extension_125.project(route)
    inventory=[];units=[];ids=[];details=[];codes=[]
    try:
        inventory,units,ids,details=_expected(view,table)
    except ValueError as error:
        code=str(error).split(':',1)[0]
        if code not in candidate_121.STOPS:
            raise
        codes=[code]
    actor=view['actor']
    row={'opportunity_context':{'round':view['round'],'turn_player':actor,'actor':actor,
             'phase':view['phase'],'decision_kind':'normal_action','choice_kind':'normal_action'},
            'owner_state':view['players'][actor],
            'public_information':{k:v for k,v in view['players'].items() if k!=actor},
            'information_policy':'public_and_owner_known_only','source_inventory':inventory,
            'enumeration_units':units,'legal_candidate_ids':ids,'legal_candidate_details':details,
            'forbidden_information_used':[],'completeness_checks':{},'candidate_set_complete':False,
            'contract_stop_codes':codes}
    row['completeness_checks']=_checks(row,view,table)
    row['candidate_set_complete']=all(row['completeness_checks'].values()) and not codes
    return row


def compare_mixed(route: dict, audit: dict, table: dict) -> dict:
    if audit!=audit_current(route,table) or not audit['candidate_set_complete']:
        raise ValueError('unproved complete candidate set')
    game=route['final_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    if game['phase']!='normal_action' or owner['board']['main'] is not None or owner['person_placed'] or \
            any(p['growth']>=100 for p in game['players'].values()):
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'earlier 107 priority'})
    remaining={};placements=[]
    for item in audit['legal_candidate_details']:
        action=item['action_type'];cid=item['candidate_id']
        if action=='pass':
            cost=0
        elif action in ('place_companion','place_partner'):
            card=game['cards'][item['source_instance_id']]
            placement=restart_117._placement_for_card(item['source_instance_id'],card,table,owner['board'])
            if placement is None or placement['candidate_id']!=cid or card['card_id'] not in extension_127.extension_125.PLACEMENT_TEXT:
                raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'116 safety'})
            placements.append(placement);cost=0
        elif action=='play_main' and item['candidate_variant']=='birth':
            card=game['cards'][item['source_instance_id']]
            birth=restart_117._main_birth_detail(item['source_instance_id'],card,table,owner['board'],owner['time'])
            if birth is None or birth['candidate_id']!=cid or item['card_id'] not in restart_122.BIRTH_TEXT_EVIDENCE:
                raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'birth effect'})
            cost=birth['payment_time']
        elif action=='attach_item':
            template=next(x for x in table['cards'] if x['card_id']==item['card_id'])['actions'][0]
            evidence=PAID_ACTION_CERTAIN_EFFECTS.get(item['card_id'])
            if evidence is None:
                raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'unclassified certain effect'})
            source,_,anchor=evidence['reference'].partition('#')
            if anchor!=item['card_id'] or evidence['deferred_condition'] not in (DATA.parent/source).read_text() or \
                    evidence['immediate_growth_delta']!=0 or evidence['immediate_time_delta']!=0:
                raise ValueError('paid action source evidence differs')
            if not isinstance(template['base_time_cost'],int) or template['base_time_cost']<=0 or \
                    not item['target_instance_ids']:
                raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'unclassified certain effect'})
            cost=template['base_time_cost']
        else:
            raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'unclassified action'})
        remaining[cid]=owner['time']-cost
    if not placements or any(remaining[p['candidate_id']]!=owner['time'] for p in placements) or \
            any(remaining[d['candidate_id']]>=owner['time'] for d in audit['legal_candidate_details']
                if d['action_type'] not in ('pass','place_companion','place_partner')):
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'107/114 time comparison'})
    original=current_126.restart_124.load_sources()['stops'][route['path_id']][0]
    context={'contract_version':fallback_116.CONTRACT_VERSION,'order_id':original['order_id'],
             'actor':actor,'actor_turn_index':game['round'],'round':game['round'],
             'phase':'normal_action','decision_kind':'normal_action','choice_kind':'zero_cost_person_placement'}
    decision=fallback_116.resolve_safe_free_development(placements,context,audit['legal_candidate_ids'])
    if 'error' in decision or (decision['resolution_mode']=='seeded_fallback' and
                               fallback_116.validate_seeded_resolution(decision)):
        raise ValueError('116 safety/seed proof differs')
    decision['priority_basis']={'source_contracts':[107,114,116],
        'legal_candidates':copy.deepcopy(audit['legal_candidate_ids']),
        'time_after_certain_resolution':remaining,
        'paid_actions_dominated_at_time_priority':[d['candidate_id'] for d in audit['legal_candidate_details']
           if d['action_type'] not in ('pass','place_companion','place_partner')],
        'pass_dominated_after_116_safety':True}
    decision['selected_action']=copy.deepcopy(next(d for d in audit['legal_candidate_details']
                                                   if d['candidate_id']==decision['selected_candidate']))
    decision['legal_candidate_details']=copy.deepcopy(audit['legal_candidate_details'])
    return decision


def compare_paid_to_pass(route: dict, audit: dict, table: dict) -> dict:
    """Use 107/114's certain time order for classified paid actions."""
    if audit!=audit_current(route,table) or not audit['candidate_set_complete']:
        raise ValueError('unproved complete candidate set')
    game=route['final_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    if game['phase']!='normal_action' or any(p['growth']>=100 for p in game['players'].values()) or \
            route['final_state']['pending_triggers'] or route['final_state']['activation_zone']:
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'earlier 107 priority'})
    scores={}
    for item in audit['legal_candidate_details']:
        action=item['action_type'];cid=item['candidate_id'];cost=0
        if action=='play_main' and item['candidate_variant']=='birth':
            card=game['cards'][item['source_instance_id']]
            birth=restart_117._main_birth_detail(item['source_instance_id'],card,table,owner['board'],owner['time'])
            if birth is None or birth['candidate_id']!=cid or item['card_id'] not in restart_122.BIRTH_TEXT_EVIDENCE:
                raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'birth effect'})
            cost=birth['payment_time']
        elif action in ('attach_item','place_world'):
            effect=PAID_ACTION_CERTAIN_EFFECTS.get(item['card_id'])
            template=next(c for c in table['cards'] if c['card_id']==item['card_id'])['actions'][0]
            if effect is None or effect['immediate_growth_delta']!=0 or effect['immediate_time_delta']!=0 or \
                    effect['deferred_condition'] not in (DATA.parent/effect['reference'].split('#')[0]).read_text() or \
                    not isinstance(template['base_time_cost'],int) or template['base_time_cost']<=0:
                raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'classified paid effect'})
            cost=template['base_time_cost']
        elif action!='pass':
            raise restart_122.RulesStop('missing_next_normal_action_choice_proof',
                {'criterion':'unclassified conditional growth or card resolution',
                 'action_type':action,'source_card_id':item['card_id'],
                 'candidate_ids':copy.deepcopy(audit['legal_candidate_ids']),
                 'source_reference':next(c for c in table['cards'] if c['card_id']==item['card_id'])
                                    ['actions'][0]['source_text_reference']})
        scores[cid]={'candidate_id':cid,'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
            'certain_growth_difference':0,'time_after_certain_resolution':owner['time']-cost,
            'payment_time':cost,'consumed_card_count':0,'card_copy_id':item.get('source_instance_id') or '',
            'value_comparison_to':{}}
    comparisons={cid:hardening_114.compare_candidates(scores['pass'],score)
                 for cid,score in scores.items() if cid!='pass'}
    if not comparisons or any(x['winner']!='left' or x['decided_at']!='time_after_certain_resolution'
                              for x in comparisons.values()):
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'107/114 time order'})
    return {'decision_kind':'normal_action','resolution_mode':'priority_unique',
            'strategic_unresolved':False,'reason_code':'time_balance',
            'legal_candidates':copy.deepcopy(audit['legal_candidate_ids']),
            'legal_candidate_details':copy.deepcopy(audit['legal_candidate_details']),
            'candidate_set_complete':True,
            'candidate_set_evidence':{'source_ref':'128.current_state_rederivation',
                'state_ref':route['game_state_sha256'],'enumeration_rule':'all current-state units rederived'},
            'selected_candidate':'pass','selected_action':copy.deepcopy(next(x for x in audit['legal_candidate_details']
                                                                             if x['candidate_id']=='pass')),
            'runner_up_candidates':[x for x in audit['legal_candidate_ids'] if x!='pass'],
            'seed_context':None,
            'priority_basis':{'source_contracts':[107,114], 'scores':scores,'pairwise':comparisons},
            'seed_proof':None}


def audit_turn_end_from_history(path: str, source: dict, prior: dict, current: dict,
                                events: list[dict], snapshots: list[dict]) -> dict:
    original=prior['stops'][path]
    joined_events=copy.deepcopy(source['events'])+copy.deepcopy(events)
    joined_snapshots=copy.deepcopy(source['snapshots'])+copy.deepcopy(snapshots[1:])
    if source['snapshots'][-1]!=snapshots[0]:
        raise ValueError('127/128 event boundary differs')
    with board_turn_end_registry():
        audit=extension_127.audit_turn_end_from_history(path,original,prior['source_126'],current,
                                                         joined_events,joined_snapshots)
        if audit['turn_end_set_complete']:
            return audit
        history=current_126.verified_history(path,prior['source_126'])
        history['events'].extend(copy.deepcopy(original['events']+joined_events))
        history['snapshots'].extend(copy.deepcopy(original['snapshots'][1:]+joined_snapshots[1:]))
        history['stop']={'game_state':current['game_state'],'last_valid_event_seq':current['last_event_seq']}
        registry=copy.deepcopy(current_126.restart_124.TEXT_REGISTRY)
        registry['turn_end_completed']={'growth_delta':0,'duration':'none',
                                        'reference':'123-turn-end-completeness-contract.md#six-stage-empty-turn-end'}
        for card_id,ability in BOARD_CLASSIFICATION.items():
            action=ability.get('placement_action')
            if action:
                entry={'growth_delta':ability['placement_growth_delta'],
                       'duration':ability['placement_duration'],
                       'reference':ability['source_text_reference']}
                existing=registry.setdefault(action,{}).get(card_id)
                if existing is not None and existing!=entry:
                    raise ValueError('124/128 placement classification differs')
                registry[action][card_id]=entry
        proof=current_126.restart_124.derive_provenance(history,registry)
        stop={'path_id':path,'game_state':current['game_state'],
              'continuation_state':response_120._continuation_payload(current),
              'last_valid_event_seq':current['last_event_seq'],
              'game_state_sha256':response_120.game_state_sha256(current['game_state']),
              'continuation_state_sha256':current['continuation_state_sha256']}
        return current_126.restart_124.audit_current_turn_end(stop,proof)


@contextmanager
def board_turn_end_registry():
    """Scope an extension to the 123 read-only registry without editing its artifacts."""
    registry=current_126.restart_124.contract_123.BOARD_REGISTRY
    original=registry.copy()
    try:
        for card_id,ability in BOARD_CLASSIFICATION.items():
            entry=(ability['kind'],ability['source_text_reference'])
            if card_id in registry and registry[card_id]!=entry:
                raise ValueError('123/128 board classification differs')
            registry[card_id]=entry
        yield
    finally:
        registry.clear();registry.update(original)


def run_route(path: str, inputs: dict) -> dict:
    source=inputs['stops'][path]
    if source['path_id']!=path or \
            response_120.game_state_sha256(source['final_state']['game_state'])!=source['game_state_sha256'] or \
            response_120.continuation_state_sha256(response_120._continuation_payload(source['final_state']))!=source['continuation_state_sha256']:
        raise ValueError('127 source state hash differs')
    current=copy.deepcopy(source['final_state'])
    snapshots=[{'seq':source['last_valid_event_seq'],'game_state_sha256':source['game_state_sha256'],
                'continuation_state_sha256':source['continuation_state_sha256']}]
    audits=[];decisions=[];events=[];reason=None
    for _ in range(64):
        try:
            game=current['game_state'];route=extension_127._current_route(path,current)
            decision=None;audit=None
            if game['phase']=='normal_action':
                audit=audit_current(route,inputs['candidate_table'])
                audits.append(audit)
                if audit!=audit_current(route,inputs['candidate_table']):
                    raise ValueError('127 independent current candidate audit differs')
                if not audit['candidate_set_complete']:
                    raise restart_122.RulesStop('incomplete_legal_candidates',{
                        'contract_stop_codes':audit['contract_stop_codes']})
                if any(d['action_type'] in ('place_companion','place_partner') for d in audit['legal_candidate_details']):
                    decision=compare_mixed(route,audit,inputs['candidate_table'])
                    after,generated=extension_125._apply_placement(current,decision)
                else:
                    decision=compare_paid_to_pass(route,audit,inputs['candidate_table'])
                    after,generated=restart_122.transition(current,decision,inputs)
                kind='normal_action'
            elif current['response_context']['phase']=='response_window' and \
                    current['response_context']['consecutive_passes']<2:
                actor=current['response_context']['priority_actor']
                opportunity=response_120.enumerate_response_opportunity(current,actor,inputs['candidate_table'])
                if opportunity['candidate_set_complete'] is not True:
                    raise restart_122.RulesStop('incomplete_legal_candidates',{'phase':'response_window'})
                decision=response_120.resolve_response_choice({
                    'order_id':current_126.restart_124.load_sources()['stops'][path][0]['order_id'],
                    'actor_turn_index':game['round'],
                    'round':game['round']},opportunity)
                after,generated=restart_122.apply_supported_response(current,decision,inputs)
                if current['return_target']=='turn_end' and decision['selected_candidate']=='response-pass' and \
                        current['response_context']['consecutive_passes']==1 and \
                        after['response_context']['consecutive_passes']==2 and \
                        not current['response_context']['chain_links']:
                    after['game_state']['phase']='turn_end'
                    after['return_target']='turn_end'
                    after['continuation_state_sha256']=response_120.continuation_state_sha256(
                        response_120._continuation_payload(after))
                    generated[-1]['game_state_after_sha256']=response_120.game_state_sha256(after['game_state'])
                    generated[-1]['continuation_state_after_sha256']=after['continuation_state_sha256']
                    generated[-1]['_snapshot_after']=response_120._build_snapshot(after,after['last_event_seq'])
                audit=None;kind='response_action'
            elif game['phase']=='turn_end':
                if 'source_127' not in inputs:
                    raise restart_122.RulesStop('missing_current_turn_end_provenance',{
                        'phase':game['phase'],'last_valid_event_seq':current['last_event_seq']})
                proof=audit_turn_end_from_history(path,source,inputs['source_127'],current,events,snapshots)
                audits.append(proof)
                if not proof['turn_end_set_complete']:
                    raise restart_122.RulesStop('incomplete_turn_end_sources',{
                        'contract_stop_codes':proof['contract_stop_codes']})
                actor=game['turn_player'];other='B' if actor=='A' else 'A'
                # The saved 117 route fixes first-player identity independently of
                # current turn order; do not derive it from a path suffix.
                original=current_126.restart_124.load_sources()['plan_117']
                first=current_126.restart_124._find_route(original,path)['first_player']
                after=copy.deepcopy(current)
                after['game_state']['turn_player']=other
                if actor!=first:
                    after['game_state']['round']+=1
                after['game_state']['phase']='turn_start'
                after['return_target']=None
                generated=[];new_snapshots=[]
                current_126.restart_124._append_transition(current,after,generated,new_snapshots,
                                                            'turn_end_completed',actor)
                kind='turn_end'
            elif game['phase']=='turn_start':
                actor=game['turn_player'];owner=game['players'][actor]
                if current['pending_triggers'] or current['activation_zone'] or \
                        any(p['reservations'] for p in game['players'].values()):
                    raise restart_122.RulesStop('missing_turn_start_source_proof',{'criterion':'pending effects'})
                board_ids=[game['cards'][x]['card_id'] for p in game['players'].values()
                           for x in (p['board']['companions']+p['board']['prepared']+
                                     [z for z in (p['board']['main'],p['board']['partner'],p['board']['world']) if z])]
                if any(x not in BOARD_CLASSIFICATION for x in board_ids):
                    raise restart_122.RulesStop('missing_turn_start_source_proof',{'criterion':'board trigger classification'})
                n=2 if owner['board']['main'] is None else 1
                if len(owner['deck'])<n:
                    raise restart_122.RulesStop('missing_turn_start_draw_evidence',{'draw_count':n})
                after=copy.deepcopy(current);player=after['game_state']['players'][actor]
                player['time']=game['round'];player['challenge_used']=False
                player['person_placed']=False;player['relationship_progressed']=False
                player['hand'].extend(player['deck'][:n]);del player['deck'][:n]
                after['game_state']['phase']='egg_exchange_choice' if n==2 else 'normal_action'
                generated=[];new_snapshots=[]
                current_126.restart_124._append_transition(current,after,generated,new_snapshots,
                    'turn_start_and_egg_draw' if n==2 else 'turn_start_and_draw',actor)
                kind='turn_start'
            elif game['phase']=='egg_exchange_choice':
                actor=game['turn_player'];owner=game['players'][actor]
                hand=[{'card_copy_id':game['cards'][x]['card_copy_id'],
                       'card_id':game['cards'][x]['card_id'],'initial_instance_id':x}
                      for x in owner['hand']]
                original=current_126.restart_124.load_sources()['stops'][path][0]
                decision=restart_117.build_mandatory_choice_decision(
                    {'order_id':original['order_id']},actor,game['round'],game['round'],hand)
                after=copy.deepcopy(current);player=after['game_state']['players'][actor]
                instance=decision['selected_action']['initial_instance_id']
                player['hand'].remove(instance);player['deck'].append(instance)
                after['game_state']['phase']='normal_action'
                generated=[];new_snapshots=[]
                current_126.restart_124._append_transition(current,after,generated,new_snapshots,
                                                            'egg_exchange_bottom',actor,decision['selected_candidate'])
                kind='mandatory_choice'
            else:
                raise restart_122.RulesStop('missing_current_turn_end_provenance',{
                    'phase':game['phase'],'last_valid_event_seq':current['last_event_seq']})
            extension_125._verify_extended_step(current,after,generated)
            for event in generated:
                events.append({k:copy.deepcopy(v) for k,v in event.items() if k!='_snapshot_after'})
                snapshots.append({'seq':event['seq'],'game_state_sha256':event['game_state_after_sha256'],
                                  'continuation_state_sha256':event['continuation_state_after_sha256']})
            if decision is not None:
                decisions.append({'kind':kind,'selected_candidate':decision['selected_candidate'],
                              'legal_candidates':copy.deepcopy(decision.get('legal_candidates',
                                  opportunity['legal_candidate_ids'] if kind=='response_action' else [])),
                              'resolution_mode':decision['resolution_mode'],
                              'seed_proof':copy.deepcopy(decision.get('seed_proof')),
                              'priority_basis':copy.deepcopy(decision.get('priority_basis',decision.get('comparison_evidence'))),
                                  'audit':copy.deepcopy(audit),'event_seqs':[e['seq'] for e in generated]})
            current=after
        except restart_122.RulesStop as error:
            reason={'code':error.code,'evidence':error.evidence}
            if error.code=='incomplete_legal_candidates':
                reason['contract_stop_codes']=error.evidence.get('contract_stop_codes',[])
            break
    else:
        reason={'code':'unsupported_continuation_bound','limit':64}
    return {'path_id':path,'source_stop_sha256':SOURCE_SHA[path],
            'source_game_state_sha256':source['game_state_sha256'],
            'source_continuation_state_sha256':source['continuation_state_sha256'],
            'status':'stopped_rules_adjudication','reason':reason,
            'last_valid_event_seq':current['last_event_seq'],
            'game_state_sha256':response_120.game_state_sha256(current['game_state']),
            'continuation_state_sha256':response_120.continuation_state_sha256(response_120._continuation_payload(current)),
            'final_state':current,'audits':audits,'decisions':decisions,'events':events,
            'snapshots':snapshots,'winner':None,
            'seeded_fallback_used':source['seeded_fallback_used'] or any(d['resolution_mode']=='seeded_fallback' for d in decisions),
            'counts_as_independent_balance_sample':False}


def run_all(inputs: dict) -> dict:
    return {path:run_route(path,inputs) for path in SOURCE_SHA}


PLAN_FILE='proxy-r2-candidate-extension-plan-128-20260923.json'
EVALUATION_FILE='proxy-r2-candidate-extension-evaluation-128-20260923.json'
STOP_FOLDER='proxy-r2-candidate-stops-128'
canonical_bytes=extension_127.canonical_bytes


def build_plan(outcomes: dict) -> dict:
    return {'schema':'naotocchi.card_game.proxy_r2_candidate_extension_plan.v2',
            'checkpoint':128,'protected_127_stop_raw_sha256':SOURCE_SHA,
            'source_contracts':[107,114,116,117,121,123,126,127],
            'targetless_id_grammar':'candidate-{action_type}-{source_instance_id}',
            'multiple_admitted_variant_id_grammar':'candidate-{action_type}-{source_instance_id}-{candidate_variant}',
            'single_target_id_grammar':'candidate-{action_type}-{source_instance_id}-target-{target_instance_id}',
            'board_classification':BOARD_CLASSIFICATION,
            'routes':[{'path_id':path,'source_stop_sha256':SOURCE_SHA[path],
                       'source_game_state_sha256':row['source_game_state_sha256'],
                       'source_continuation_state_sha256':row['source_continuation_state_sha256'],
                       'last_valid_event_seq':row['last_valid_event_seq'],
                       'game_state_sha256':row['game_state_sha256'],
                       'continuation_state_sha256':row['continuation_state_sha256'],
                       'status':row['status'],'reason':row['reason'],
                       'decision_count':len(row['decisions']),'event_count':len(row['events']),
                       'snapshot_count':len(row['snapshots']),
                       'seeded_fallback_used':row['seeded_fallback_used'],
                       'counts_as_independent_balance_sample':row['counts_as_independent_balance_sample'],
                       'stop_file':f'{STOP_FOLDER}/stop-128-{path}.json'}
                      for path,row in outcomes.items()]}


def build_evaluation(plan: dict) -> dict:
    routes=plan['routes']
    return {'schema':'naotocchi.card_game.proxy_r2_candidate_extension_evaluation.v2',
            'checkpoint':128,'planned':len(routes),
            'completed':sum(x['status']=='completed' for x in routes),
            'rules_stop':sum(x['status']=='stopped_rules_adjudication' for x in routes),
            'decision':sum(x['decision_count'] for x in routes),
            'event':sum(x['event_count'] for x in routes),
            'snapshot':sum(x['snapshot_count'] for x in routes),
            'winner':0,'independent_balance_sample':sum(x['counts_as_independent_balance_sample'] for x in routes),
            'stop_codes':{code:sum(x['reason']['code']==code for x in routes)
                          for code in sorted({x['reason']['code'] for x in routes})}}


def expected_outputs(inputs: dict | None = None) -> dict[str,bytes]:
    inputs=inputs if inputs is not None else load_sources()
    outcomes=run_all(inputs);plan=build_plan(outcomes)
    output={PLAN_FILE:canonical_bytes(plan),EVALUATION_FILE:canonical_bytes(build_evaluation(plan))}
    output.update({f'{STOP_FOLDER}/stop-128-{path}.json':canonical_bytes(row)
                   for path,row in outcomes.items() if row['status']!='completed'})
    return output


def write_outputs(data_dir: Path = DATA, inputs: dict | None = None) -> None:
    for name,raw in expected_outputs(inputs).items():
        path=data_dir/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)


def check_outputs(data_dir: Path = DATA, inputs: dict | None = None) -> list[str]:
    return [f'canonical bytes differ: {name}' for name,raw in expected_outputs(inputs).items()
            if not (data_dir/name).is_file() or (data_dir/name).read_bytes()!=raw]


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write',action='store_true');mode.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.write:write_outputs()
    else:
        errors=check_outputs()
        if errors:parser.exit(1,'\n'.join(errors)+'\n')
