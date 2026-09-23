#!/usr/bin/env python3
"""Checkpoint 127: current-state candidate evidence without changing 121–126."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

import proxy_normal_action_candidate_completeness as candidate_121
import proxy_normal_action_extension as extension_125
import proxy_current_turn_end_correction as current_126
import proxy_normal_decision_fallback_contract as fallback_116
import proxy_normal_decision_seeded_restart as restart_117
import proxy_normal_decision_hardening as hardening_114

restart_122=extension_125.restart_122
response_120=extension_125.response_120

DATA=Path(__file__).resolve().parents[1]/'data'
BOARD_COUNT_REASON='board_card_count_condition_not_met'
SOURCE_SHA={
 'order-01-a-first':'57c64b892444446ad093d9c47758412df32fe076806950f014e0435d5c61d87c',
 'order-01-b-first':'7bfcb2485ab3edde5e89b3539b7ad6fff390545c271c426f5098ef62532103a9',
 'order-02-a-first':'7d0ea443ecb596f8271777782cecf34c43d73df9d1a6aa8ee53faeb8147645f2',
 'order-02-b-first':'dba2f554c2aba4a938f9af5316435055d621de189be1322af54baa4b75aaac1f',
}


def load_sources(data_dir: Path = DATA) -> dict:
    if current_126.check_outputs(data_dir):
        raise ValueError('126 canonical outputs differ')
    source=current_126.load_sources(data_dir)
    stops={}
    for path,digest in SOURCE_SHA.items():
        raw=(data_dir/current_126.STOP_FOLDER/f'stop-126-{path}.json').read_bytes()
        if hashlib.sha256(raw).hexdigest()!=digest:
            raise ValueError('126 protected stop raw differs')
        stop=json.loads(raw)
        if stop!=current_126.run_route(path,source) or stop['path_id']!=path:
            raise ValueError('126 independent replay differs')
        stops[path]=stop
    table=source['source_124']['candidate_table']
    return {'stops':stops,'candidate_table':table,'source_126':source}


def _board_instances(view: dict) -> list[str]:
    board=view['players'][view['actor']]['board']
    return [x for x in (board['main'],*board['companions'],board['partner'],board['world'],*board['prepared']) if x]


def _board_count_unit(view: dict, original: dict) -> dict:
    """Adjudicate the two 114 board-count variants from their published ranges."""
    template=original['template']
    if original['source_family']!='hand_card_action' or original['action_type']!='use_play' or \
            original['candidate_variant'] not in ('seven_or_eight_cards','nine_or_more_cards') or \
            template['target_rule']!='no target':
        raise ValueError('unresolved_canonical_predicate: board count template')
    actor=view['actor'];owner=view['players'][actor]
    instances=_board_instances(view)
    if len(instances)!=len(set(instances)) or any(x not in view['cards'] for x in instances):
        raise ValueError('missing_state_evidence: board instances')
    count=len(instances)
    variant=original['candidate_variant']
    lower,upper=(7,8) if variant=='seven_or_eight_cards' else (9,None)
    reasons=[]
    if template['timing']!='normal_action_opportunity':
        reasons.append('timing_not_normal_action')
    if owner['time']<template['base_time_cost']:
        reasons.append('insufficient_time')
    if count<lower or upper is not None and count>upper:
        reasons.append(BOARD_COUNT_REASON)
    if not reasons:
        raise ValueError('missing_candidate_id_grammar: eligible board-count action')
    unit={k:copy.deepcopy(v) for k,v in original.items() if k!='template'}
    unit.update({'disposition':'excluded','candidate_id':None,'reason_codes':reasons,
                 'evidence':{'owner.board_instance_ids':sorted(instances),
                             'owner.board_card_count':count,'required_min':lower,
                             'required_max':upper,'owner.time':owner['time'],
                             'template.base_time_cost':template['base_time_cost']},
                 'source_references':[template['source_text_reference'],
                                      '01-core-rules.md','114-normal-decision-protocol-hardening.md']})
    return unit


def _single_target_id(view: dict, original: dict) -> str:
    targets=original['target_instance_ids']
    if original['source_family']!='hand_card_action' or len(targets)!=1 or \
            original['source_instance_id'] not in view['players'][view['actor']]['hand'] or \
            targets[0] not in view['cards'] or \
            targets not in candidate_121._targets(original['candidate_variant'],view,original['source_family']):
        raise ValueError('missing_candidate_id_grammar: not a proven single target')
    return f"candidate-{original['action_type']}-{original['source_instance_id']}-target-{targets[0]}"


def adjudicate_units(view: dict, baseline: list[dict]) -> list[dict]:
    results=[]
    for original in baseline:
        if original['candidate_variant'] in ('seven_or_eight_cards','nine_or_more_cards'):
            results.append(_board_count_unit(view,original))
            continue
        try:
            results.extend(extension_125.adjudicate_units(view,[original]))
        except ValueError as error:
            if str(error)!='missing_candidate_id_grammar: legal action':
                raise
            candidate_id=_single_target_id(view,original)
            # 121 has already proved that there are no exclusion reasons; only its
            # missing ID grammar raised. Preserve the evidence-free admitted unit.
            unit={k:copy.deepcopy(v) for k,v in original.items() if k!='template'}
            unit.update({'reason_codes':[],'disposition':'admitted',
                         'candidate_id':candidate_id,'evidence':{},
                         'source_references':[original['template']['source_text_reference']]})
            results.append(unit)
    if len({u['enumeration_unit_id'] for u in results})!=len(results) or \
            len({u['candidate_id'] for u in results if u['candidate_id']})!=sum(
                bool(u['candidate_id']) for u in results):
        raise ValueError('candidate_id_collision')
    return results


def _expected(view: dict, table: dict) -> tuple[list,list,list,list]:
    inventory=extension_125.inventory_sources(view)
    baseline=candidate_121.expand_units(view,inventory,table)
    units=adjudicate_units(view,baseline)
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
    view=extension_125.project(route)
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
         'forbidden_information_used':[],'completeness_checks':{},
         'candidate_set_complete':False,'contract_stop_codes':codes}
    row['completeness_checks']=_checks(row,view,table)
    row['candidate_set_complete']=all(row['completeness_checks'].values()) and not codes
    return row


def validate_current(audit: dict, route: dict, table: dict) -> list[str]:
    try:
        expected=audit_current(route,table)
        checks=_checks(audit,extension_125.project(route),table)
    except (ValueError,KeyError,TypeError,IndexError) as error:
        return [f'current source integrity: {error}']
    if not isinstance(audit,dict) or list(audit)!=list(expected):
        return ['audit schema or order differs']
    errors=[key+' differs' for key in expected if audit[key]!=expected[key]]
    if audit['completeness_checks']!=checks:
        errors.append('independent twelve-check completeness differs')
    return errors


def compare_normal_action(route: dict, audit: dict, table: dict) -> dict:
    """Prove the 107/114 priority order before using 116's safe subset."""
    if validate_current(audit,route,table) or not audit['candidate_set_complete']:
        raise ValueError('unproved complete current candidate set')
    game=route['final_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    details=audit['legal_candidate_details']
    if game['phase']!='normal_action' or owner['board']['main'] is not None or \
            owner['person_placed'] or any(p['growth']>=100 for p in game['players'].values()) or \
            any(x['action_type'] not in ('pass','place_companion','place_partner','play_main') for x in details):
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',
                                    {'criterion':'107/114 comparison outside proved safe class'})
    placements=[];remaining={};basis={}
    for detail in details:
        candidate=detail['candidate_id'];action=detail['action_type']
        if action=='pass':
            cost=0
        elif action in ('place_companion','place_partner'):
            card=game['cards'][detail['source_instance_id']]
            placement=restart_117._placement_for_card(detail['source_instance_id'],card,table,owner['board'])
            if placement is None or placement['candidate_id']!=candidate:
                raise ValueError('116 safe placement identity/preconditions differ')
            # A card's optional future ability is not a certain growth or time gain.
            if card['card_id'] not in extension_125.PLACEMENT_TEXT:
                raise ValueError('unclassified placement text')
            placements.append(placement)
            cost=0
        else:
            card=game['cards'][detail['source_instance_id']]
            birth=restart_117._main_birth_detail(detail['source_instance_id'],card,table,owner['board'],owner['time'])
            if birth is None or birth['candidate_id']!=candidate:
                raise ValueError('114 main birth cost/identity differs')
            cost=birth['payment_time']
        remaining[candidate]=owner['time']-cost
        basis[candidate]={'immediate_growth_delta':0,'reaches_or_interrupts_100':False,
                          'payment_time':cost,'time_after_certain_resolution':remaining[candidate]}
    if not placements or any(remaining[x['candidate_id']]!=owner['time'] for x in placements) or \
            any(remaining[x['candidate_id']]>=owner['time'] for x in details if x['action_type']=='play_main'):
        raise ValueError('114 priority comparison does not isolate safe placements')
    original=current_126.restart_124.load_sources()['stops'][route['path_id']][0]
    order_id=original['order_id']
    context={'contract_version':fallback_116.CONTRACT_VERSION,'order_id':order_id,
             'actor':actor,'actor_turn_index':game['round'],'round':game['round'],
             'phase':'normal_action','decision_kind':'normal_action',
             'choice_kind':'zero_cost_person_placement'}
    decision=fallback_116.resolve_safe_free_development(placements,context,audit['legal_candidate_ids'])
    if 'error' in decision or fallback_116.validate_seeded_resolution(decision):
        raise ValueError('116 decision proof differs')
    decision['priority_basis']={'source_contracts':[107,114,116],
                                'legal_candidates':copy.deepcopy(audit['legal_candidate_ids']),
                                'candidate_values':basis,
                                'time_after_certain_resolution':remaining,
                                'dominated_paid_birth_count':sum(x['action_type']=='play_main' for x in details),
                                'pass_dominated_only_after_safety_proof':True,
                                'lottery_subset_only_incomparable_safe_placements':True}
    decision['selected_action']=copy.deepcopy(next(x for x in details if x['candidate_id']==decision['selected_candidate']))
    decision['legal_candidate_details']=copy.deepcopy(details)
    return decision


def _choose_pass_over_birth(route: dict, audit: dict, table: dict) -> dict:
    if validate_current(audit,route,table) or not audit['candidate_set_complete']:
        raise ValueError('incomplete candidate proof')
    state=route['final_state'];game=state['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    details=audit['legal_candidate_details']
    if any(p['growth']>=100 for p in game['players'].values()) or \
            any(p['reservations'] for p in game['players'].values()) or \
            state['pending_triggers'] or state['activation_zone'] or \
            owner['board']['main'] is not None or not details:
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'107 earlier priority'})
    if any(d['action_type']!='pass' and
           (d['action_type'],d['candidate_variant'])!=('play_main','birth') for d in details):
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'unclassified action'})
    scores={}
    for detail in details:
        candidate=detail['candidate_id']
        if detail['action_type']=='pass':
            payment=0
        else:
            card=game['cards'][detail['source_instance_id']]
            birth=restart_117._main_birth_detail(detail['source_instance_id'],card,table,owner['board'],owner['time'])
            if birth is None or birth['candidate_id']!=candidate or detail['card_id'] not in restart_122.BIRTH_TEXT_EVIDENCE:
                raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'birth effect'})
            payment=birth['payment_time']
        scores[candidate]={'candidate_id':candidate,'avoid_loss_or_abort':0,
            'maintain_or_prevent_100':0,'certain_growth_difference':0,
            'time_after_certain_resolution':owner['time']-payment,
            'payment_time':payment,'consumed_card_count':0,
            'card_copy_id':detail.get('source_instance_id') or '',
            'value_comparison_to':{}}
    if 'pass' not in scores:
        raise ValueError('missing pass')
    comparisons={id:hardening_114.compare_candidates(scores['pass'],score)
                 for id,score in scores.items() if id!='pass'}
    if any(c['winner']!='left' or c['decided_at']!='time_after_certain_resolution'
           for c in comparisons.values()):
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'107/114 comparison'})
    return {'decision_kind':'normal_action','resolution_mode':'priority_unique',
            'strategic_unresolved':False,'reason_code':'time_balance',
            'legal_candidates':copy.deepcopy(audit['legal_candidate_ids']),
            'legal_candidate_details':copy.deepcopy(details),'candidate_set_complete':True,
            'candidate_set_evidence':{'source_ref':'127.current_state_twelve_checks',
                'state_ref':route['game_state_sha256'],'enumeration_rule':'all current-state units rederived'},
            'selected_candidate':'pass','selected_action':copy.deepcopy(next(d for d in details if d['candidate_id']=='pass')),
            'runner_up_candidates':[id for id in audit['legal_candidate_ids'] if id!='pass'],
            'comparison_evidence':{'scores':scores,'pairwise':comparisons},
            'seed_context':None,'seed_proof':None}


def _current_route(path: str, current: dict) -> dict:
    return {'path_id':path,'final_state':current,'last_valid_event_seq':current['last_event_seq'],
            'game_state_sha256':response_120.game_state_sha256(current['game_state']),
            'continuation_state_sha256':current['continuation_state_sha256']}


def audit_turn_end_from_history(path: str, source: dict, prior: dict, current: dict,
                                events: list[dict], snapshots: list[dict]) -> dict:
    """Rejoin 117–126 with this route's new events; never accept a saved boolean."""
    if path!=source['path_id'] or not snapshots or \
            snapshots[0]['game_state_sha256']!=source['game_state_sha256'] or \
            snapshots[0]['continuation_state_sha256']!=source['continuation_state_sha256'] or \
            source['last_valid_event_seq']!=snapshots[0]['seq']:
        raise ValueError('127 source boundary differs')
    history=current_126.verified_history(path,prior)
    history['events'].extend(copy.deepcopy(source['events']))
    history['snapshots'].extend(copy.deepcopy(source['snapshots'][1:]))
    history['events'].extend(copy.deepcopy(events))
    history['snapshots'].extend(copy.deepcopy(snapshots[1:]))
    history['stop']={'game_state':current['game_state'],
                     'last_valid_event_seq':current['last_event_seq']}
    if len(history['events'])!=current['last_event_seq'] or \
            len(history['snapshots'])!=current['last_event_seq']+1 or \
            history['snapshots'][-1]['game_state_sha256']!=response_120.game_state_sha256(current['game_state']) or \
            history['snapshots'][-1]['continuation_state_sha256']!=current['continuation_state_sha256']:
        raise ValueError('127 full history boundary differs')
    for event,before,after in zip(history['events'][3:],history['snapshots'][3:],history['snapshots'][4:]):
        if event['game_state_before_sha256']!=before['game_state_sha256'] or \
                event['game_state_after_sha256']!=after['game_state_sha256'] or \
                event['continuation_state_before_sha256']!=before['continuation_state_sha256'] or \
                event['continuation_state_after_sha256']!=after['continuation_state_sha256']:
            raise ValueError('127 complete dual hash chain differs')
    registry=copy.deepcopy(current_126.restart_124.TEXT_REGISTRY)
    registry['turn_end_completed']={'growth_delta':0,'duration':'none',
                                   'reference':'123-turn-end-completeness-contract.md#six-stage-empty-turn-end'}
    provenance=current_126.restart_124.derive_provenance(history,registry)
    stop={'path_id':path,'game_state':current['game_state'],
          'continuation_state':response_120._continuation_payload(current),
          'last_valid_event_seq':current['last_event_seq'],
          'game_state_sha256':response_120.game_state_sha256(current['game_state']),
          'continuation_state_sha256':current['continuation_state_sha256']}
    audit=current_126.restart_124.audit_current_turn_end(stop,provenance)
    if audit['provenance_evidence']['source_event_seq']!=current['last_event_seq'] or \
            audit['turn_end_set_complete']!=all(audit['completeness_checks'].values()) or \
            audit['contract_stop_codes']:
        return audit
    return audit


def run_route(path: str, inputs: dict) -> dict:
    source=inputs['stops'][path]
    if source['path_id']!=path or \
            response_120.game_state_sha256(source['final_state']['game_state'])!=source['game_state_sha256'] or \
            response_120.continuation_state_sha256(response_120._continuation_payload(source['final_state']))!=source['continuation_state_sha256']:
        raise ValueError('126 source state hash differs')
    current=copy.deepcopy(source['final_state'])
    snapshots=[{'seq':source['last_valid_event_seq'],'game_state_sha256':source['game_state_sha256'],
                'continuation_state_sha256':source['continuation_state_sha256']}]
    audits=[];decisions=[];events=[];reason=None
    for _ in range(12):
        try:
            game=current['game_state'];route=_current_route(path,current)
            decision=None;audit=None
            if game['phase']=='normal_action':
                audit=audit_current(route,inputs['candidate_table'])
                audits.append(audit)
                if validate_current(audit,route,inputs['candidate_table']):
                    raise ValueError('127 independent current candidate audit differs')
                if not audit['candidate_set_complete']:
                    raise restart_122.RulesStop('incomplete_legal_candidates',{
                        'contract_stop_codes':audit['contract_stop_codes']})
                if any(d['action_type'] in ('place_companion','place_partner') for d in audit['legal_candidate_details']):
                    decision=compare_normal_action(route,audit,inputs['candidate_table'])
                    after,generated=extension_125._apply_placement(current,decision)
                else:
                    decision=_choose_pass_over_birth(route,audit,inputs['candidate_table'])
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
                if 'source_126' not in inputs:
                    raise restart_122.RulesStop('missing_current_turn_end_provenance',{
                        'phase':game['phase'],'last_valid_event_seq':current['last_event_seq']})
                proof=audit_turn_end_from_history(path,source,inputs['source_126'],current,events,snapshots)
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
                if any(x not in current_126.restart_124.contract_123.BOARD_REGISTRY for x in board_ids):
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
        reason={'code':'unsupported_continuation_bound','limit':12}
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


PLAN_FILE='proxy-r2-candidate-extension-plan-127-20260923.json'
EVALUATION_FILE='proxy-r2-candidate-extension-evaluation-127-20260923.json'
STOP_FOLDER='proxy-r2-candidate-stops-127'


def canonical_bytes(value: dict) -> bytes:
    return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')


def validate_outcomes(outcomes: dict, inputs: dict) -> list[str]:
    rebuilt=run_all(inputs)
    if set(outcomes)!=set(rebuilt):
        return ['127 route set differs']
    return [path+' rebuilt route differs' for path in rebuilt
            if canonical_bytes(outcomes[path])!=canonical_bytes(rebuilt[path])]


def build_plan(inputs: dict, outcomes: dict | None = None) -> dict:
    outcomes=outcomes if outcomes is not None else run_all(inputs)
    return {'schema':'naotocchi.card_game.proxy_r2_candidate_extension_plan.v1',
            'checkpoint':127,'protected_126_stop_raw_sha256':SOURCE_SHA,
            'source_contracts':[107,114,116,117,119,121,122,123,125,126],
            'single_target_id_grammar':'candidate-{action_type}-{source_instance_id}-target-{target_instance_id}',
            'board_count_exclusion_reason':BOARD_COUNT_REASON,
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
                       'stop_file':f'{STOP_FOLDER}/stop-127-{path}.json'}
                      for path,row in outcomes.items()]}


def build_evaluation(plan: dict) -> dict:
    routes=plan['routes']
    return {'schema':'naotocchi.card_game.proxy_r2_candidate_extension_evaluation.v1',
            'checkpoint':127,'planned':len(routes),
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
    outcomes=run_all(inputs)
    plan=build_plan(inputs,outcomes)
    result={PLAN_FILE:canonical_bytes(plan),EVALUATION_FILE:canonical_bytes(build_evaluation(plan))}
    result.update({f'{STOP_FOLDER}/stop-127-{path}.json':canonical_bytes(row)
                   for path,row in outcomes.items() if row['status']!='completed'})
    return result


def write_outputs(data_dir: Path = DATA, inputs: dict | None = None) -> None:
    for name,raw in expected_outputs(inputs).items():
        target=data_dir/name
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(raw)


def check_outputs(data_dir: Path = DATA, inputs: dict | None = None) -> list[str]:
    return [f'canonical bytes differ: {name}' for name,raw in expected_outputs(inputs).items()
            if not (data_dir/name).is_file() or (data_dir/name).read_bytes()!=raw]


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write',action='store_true')
    mode.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.write:
        write_outputs()
    else:
        errors=check_outputs()
        if errors:
            parser.exit(1,'\n'.join(errors)+'\n')
