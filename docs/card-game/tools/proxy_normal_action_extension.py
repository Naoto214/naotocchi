#!/usr/bin/env python3
"""Checkpoint 125: protected 121 candidate pipeline extension for empty zones."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

import proxy_normal_action_candidate_completeness as candidate_121
import proxy_normal_decision_seeded_restart as restart_117
import proxy_normal_decision_fallback_contract as fallback_116
import proxy_normal_action_seeded_restart as restart_122
import proxy_turn_end_provenance_restart as restart_124
import proxy_response_window_seeded_restart as response_120

DATA=Path(__file__).resolve().parents[1]/'data'
SOURCE_SHA={
 'order-01-a-first':'2e87016d2b4275bf08f5285757865f7e2dd0186149a1e42d965d82cbf3d63f1b',
 'order-01-b-first':'34a234688bb83949929d6720d166fc15c8560af8c85093122efdf63dcfea9800',
 'order-02-a-first':'e5b32c2ee45675335612a4e9cb11b54a7bf2277838d907fd5cd331acec494436',
 'order-02-b-first':'bc4474674d1268e6c5c496d4a0f10fdd0f89f74615001b612df69f55ba5036a1',
}


def load_sources(data_dir: Path = DATA) -> dict:
    if restart_124.check_outputs(data_dir):
        raise ValueError('124 canonical outputs differ')
    stops={}
    for path,sha in SOURCE_SHA.items():
        raw=(data_dir/restart_124.STOP_FOLDER/f'stop-124-{path}.json').read_bytes()
        if hashlib.sha256(raw).hexdigest()!=sha:
            raise ValueError('124 stop raw differs')
        route=json.loads(raw)
        if route['path_id']!=path or route['status']!='stopped_rules_adjudication' or \
                response_120.game_state_sha256(route['final_state']['game_state'])!=route['game_state_sha256'] or \
                response_120.continuation_state_sha256(response_120._continuation_payload(route['final_state']))!=route['continuation_state_sha256']:
            raise ValueError('124 stop state or hash differs')
        stops[path]=route
    return {'stops':stops,'candidate_table':candidate_121.load_inputs(data_dir)['candidate_table']}


def _history(route: dict) -> dict:
    return {'normal_challenge_losses_by_actor':[],
            'last_valid_event_seq':route['last_valid_event_seq'],
            'source_refs':[restart_124.PLAN_117,restart_124.PLAN_120,restart_124.PLAN_122,
                           restart_124.PLAN_FILE]}


def project(route: dict) -> dict:
    state=route['final_state']['game_state']
    public=_history(route)
    stop={'game_state':state,'actor':state['turn_player'],'decision_kind':'normal_action',
          'choice_kind':'normal_action','public_history':public}
    return candidate_121.project_normal_action_information(stop,public)


def inventory_sources(view: dict) -> list[dict]:
    actor=view['actor'];owner=view['players'][actor];board=owner['board']
    sources=[['pass'],list(owner['hand']),
             [x for x in [board['main'],*board['companions'],board['partner'],board['world'],*board['prepared']] if x],
             list(owner['reservations']),[f'challenge:{actor}'],[f'relationship:{actor}']]
    references=('114-normal-decision-protocol-hardening.md',)*2+('01-core-rules.md',)*4
    fields=('phase',f'players.{actor}.hand',f'players.{actor}.board',
            f'players.{actor}.reservations','players.*.board',f'players.{actor}.board.partner')
    reasons={'hand_card_action':'no_hand_source','board_card_action':'no_board_source',
             'reservation_action':'no_reservation_source'}
    return [{'family':family,'sources':rows,'count':len(rows),
             'empty_reason_code':reasons.get(family) if not rows else None,
             'source_reference':reference,'inspected_state_field':field}
            for family,rows,reference,field in zip(candidate_121.FAMILIES,sources,references,fields)]


def _extended_id(unit: dict) -> str | None:
    if unit['source_family']=='standing_pass':
        return 'pass'
    if unit['action_type']=='play_main' and unit['candidate_variant']=='birth':
        return f"candidate-play-main-{unit['source_instance_id']}-birth"
    if unit['action_type'] in ('place_partner','place_companion') and \
            unit['candidate_variant'] in ('start_relationship_stage_zero','empty_slot'):
        kind=unit['action_type'].removeprefix('place_')
        return f"candidate-place-{kind}-{unit['source_instance_id']}"
    return None


def adjudicate_units(view: dict, baseline: list[dict]) -> list[dict]:
    """Use the protected 121 predicates; add only 117's admitted placement ID."""
    results=[]
    for original in baseline:
        try:
            result=candidate_121.adjudicate_units(view,[original],candidate_121.build_contract())[0]
        except ValueError as error:
            if str(error)!='missing_candidate_id_grammar: legal action' or \
                    original['source_family']!='hand_card_action' or \
                    original['action_type'] not in ('place_partner','place_companion') or \
                    _extended_id(original) is None:
                raise
            owner=view['players'][view['actor']]
            board=owner['board']
            action=original['action_type']
            if original['template']['timing']!='normal_action_opportunity' or \
                    original['template']['base_time_cost']!=0 or owner['person_placed'] or \
                    (action=='place_partner' and board['partner']) or \
                    (action=='place_companion' and len(board['companions'])>=3):
                raise ValueError('unresolved_canonical_predicate: placement preconditions') from error
            result={key:copy.deepcopy(value) for key,value in original.items() if key!='template'}
            result.update({'reason_codes':[],'disposition':'admitted',
                           'candidate_id':_extended_id(original),'evidence':{},
                           'source_references':[original['template']['source_text_reference']]})
        results.append(result)
    if len({x['enumeration_unit_id'] for x in results})!=len(results) or \
            len({x['candidate_id'] for x in results if x['candidate_id'] is not None})!=sum(
                x['candidate_id'] is not None for x in results):
        raise ValueError('candidate_id_collision')
    return results


def _derive_legal(units: list[dict]) -> tuple[list[str],list[dict]]:
    admitted=[unit for unit in units if unit['disposition']=='admitted']
    ids=[unit['candidate_id'] for unit in admitted]
    if ids.count('pass')!=1 or len(set(ids))!=len(ids) or any(
            unit['candidate_id']!=_extended_id(unit) or
            unit['candidate_id'] in ('candidate-pass','response-pass') for unit in admitted):
        raise ValueError('candidate ID invalid')
    return sorted(ids),sorted(admitted,key=lambda unit:unit['candidate_id'])


def _expected(view: dict, templates: dict) -> tuple[list,list,list,list]:
    inventory=inventory_sources(view)
    baseline=candidate_121.expand_units(view,inventory,templates)
    units=adjudicate_units(view,baseline)
    ids,details=_derive_legal(units)
    return inventory,units,ids,details


def _checks(row: dict, view: dict, templates: dict) -> dict[str,bool]:
    flags={name:False for name in candidate_121.CHECKS}
    try:
        inventory,units,ids,details=_expected(view,templates)
        actor=view['actor']
        public={key:value for key,value in view['players'].items() if key!=actor}
        flags['opportunity_context_valid']=row.get('opportunity_context')=={
            'round':view['round'],'turn_player':actor,'actor':actor,'phase':'normal_action',
            'decision_kind':'normal_action','choice_kind':'normal_action'}
        flags['source_artifact_integrity_valid']=True
        flags['information_boundary_valid']=(row.get('information_policy')=='public_and_owner_known_only' and
            row.get('owner_state')==view['players'][actor] and row.get('public_information')==public and
            row.get('forbidden_information_used')==[])
        flags['required_source_families_present']=[x.get('family') for x in row.get('source_inventory',[])]==list(candidate_121.FAMILIES)
        flags['source_inventory_complete']=row.get('source_inventory')==inventory
        flags['candidate_templates_complete']=True
        actual=row.get('enumeration_units')
        if isinstance(actual,list):
            flags['information_boundary_valid']=flags['information_boundary_valid'] and all(
                x.get('evidence')==y['evidence'] and x.get('source_references')==y['source_references']
                for x,y in zip(actual,units)) and len(actual)==len(units)
            flags['candidate_variants_complete']=[(x.get('source_family'),x.get('source_id'),x.get('action_type'),x.get('candidate_variant')) for x in actual]==[(x['source_family'],x['source_id'],x['action_type'],x['candidate_variant']) for x in units]
            flags['target_expansions_complete']=[(x.get('enumeration_unit_id'),x.get('target_instance_ids')) for x in actual]==[(x['enumeration_unit_id'],x['target_instance_ids']) for x in units]
            flags['canonical_predicates_resolved']=True
            flags['dispositions_and_reasons_valid']=actual==units
            flags['stable_candidate_ids_valid']=len(actual)==len(units) and all(x.get('candidate_id')==y['candidate_id'] for x,y in zip(actual,units))
        flags['legal_candidate_projection_exact']=row.get('legal_candidate_ids')==ids and row.get('legal_candidate_details')==details
    except (ValueError,KeyError,TypeError,IndexError):
        pass
    return flags


def audit_current(route: dict, templates: dict) -> dict:
    view=project(route)
    inventory=[];units=[];ids=[];details=[];codes=[]
    try:
        inventory,units,ids,details=_expected(view,templates)
    except ValueError as error:
        code=str(error).split(':',1)[0]
        if code not in candidate_121.STOPS:
            raise
        codes=[code]
    actor=view['actor']
    row={'opportunity_context':{'round':view['round'],'turn_player':actor,'actor':actor,
           'phase':view['phase'],'decision_kind':'normal_action','choice_kind':'normal_action'},
         'owner_state':view['players'][actor],
         'public_information':{key:value for key,value in view['players'].items() if key!=actor},
         'information_policy':'public_and_owner_known_only','source_inventory':inventory,
         'enumeration_units':units,'legal_candidate_ids':ids,'legal_candidate_details':details,
         'forbidden_information_used':[],'completeness_checks':{},
         'candidate_set_complete':False,'contract_stop_codes':codes}
    row['completeness_checks']=_checks(row,view,templates)
    row['candidate_set_complete']=all(row['completeness_checks'].values()) and not codes
    return row


def validate_current(audit: dict, route: dict, templates: dict) -> list[str]:
    try:
        state=route['final_state']
        if response_120.game_state_sha256(state['game_state'])!=route['game_state_sha256'] or \
                response_120.continuation_state_sha256(response_120._continuation_payload(state))!=route['continuation_state_sha256']:
            return ['current state hash differs']
        expected=audit_current(route,templates)
        view=project(route)
        checks=_checks(audit,view,templates)
    except (ValueError,KeyError,TypeError,IndexError) as error:
        return [f'current source integrity: {error}']
    if not isinstance(audit,dict) or list(audit)!=list(expected):
        return ['audit schema or order differs']
    errors=[key+' differs' for key in expected if audit[key]!=expected[key]]
    if audit['completeness_checks']!=checks or audit['candidate_set_complete']!=(all(checks.values()) and not audit['contract_stop_codes']):
        errors.append('independent twelve-check completeness differs')
    return errors


PLACEMENT_TEXT={
 'C-bat':('72-companion-26-card-text-draft.md#C-bat','opponent_turn_immediate_play_only'),
 'C-box':('72-companion-26-card-text-draft.md#C-box','no_ability'),
 'C-chameleon':('72-companion-26-card-text-draft.md#C-chameleon','world_conditional_continuous'),
 'P-cat_ceo':('74-partner-18-card-text-draft.md#P-cat_ceo','relationship_start_while_egg_suppressed'),
 'P-desert_scorpion':('74-partner-18-card-text-draft.md#P-desert_scorpion','turn_end_condition_only'),
}


def _select_placement(route: dict, audit: dict, table: dict) -> dict:
    state=route['final_state']['game_state'];actor=state['turn_player']
    owner=state['players'][actor]
    permitted={'pass','play_main','place_companion','place_partner'}
    if any(x['action_type'] not in permitted for x in audit['legal_candidate_details']):
        raise restart_122.RulesStop('legality_not_confirmed',{'criterion':'107/114 comparison outside proved safe development'})
    placements=[]
    for detail in audit['legal_candidate_details']:
        if detail['action_type'] not in ('place_companion','place_partner'):
            continue
        instance=detail['source_instance_id']
        placement=restart_117._placement_for_card(instance,state['cards'][instance],table,owner['board'])
        if placement is None or placement['candidate_id']!=detail['candidate_id']:
            raise ValueError('117 placement identity differs from 125 candidate proof')
        placements.append(placement)
    if not placements or state['round']!=1 or owner['time']!=1 or owner['person_placed'] or \
            owner['board']['main'] is not None or any(p['growth']>=100 for p in state['players'].values()):
        raise restart_122.RulesStop('legality_not_confirmed',{'criterion':'116 safe placement preconditions'})
    original=restart_124.load_sources()['stops'][route['path_id']][0]
    context={'contract_version':fallback_116.CONTRACT_VERSION,'order_id':original['order_id'],
             'actor':actor,'actor_turn_index':1,'round':state['round'],'phase':'normal_action',
             'decision_kind':'normal_action','choice_kind':'zero_cost_person_placement'}
    decision=fallback_116.resolve_safe_free_development(placements,context,audit['legal_candidate_ids'])
    if 'error' in decision:
        raise ValueError('116 safe development: '+str(decision['error']))
    if decision['resolution_mode']=='seeded_fallback' and fallback_116.validate_seeded_resolution(decision):
        raise ValueError('116 seed proof differs')
    decision['selected_action']=next(copy.deepcopy(x) for x in audit['legal_candidate_details']
                                     if x['candidate_id']==decision['selected_candidate'])
    decision['legal_candidate_details']=copy.deepcopy(audit['legal_candidate_details'])
    return decision


def _apply_placement(current: dict, decision: dict) -> tuple[dict,list[dict]]:
    action=decision['selected_action'];source=action['source_instance_id'];actor=current['game_state']['turn_player']
    state=current['game_state'];owner=state['players'][actor]
    card=state['cards'].get(source)
    if card is None or source not in owner['hand'] or card['card_id']!=action['card_id'] or \
            owner['person_placed'] or owner['time']<0:
        raise restart_122.RulesStop('legality_not_confirmed',{'criterion':'117 placement source and limit'})
    text=PLACEMENT_TEXT.get(card['card_id'])
    if text is None:
        raise restart_122.RulesStop('effect_resolution_not_defined',{'card_id':card['card_id']})
    after=copy.deepcopy(current)
    player=after['game_state']['players'][actor]
    player['hand'].remove(source)
    if action['action_type']=='place_partner' and player['board']['partner'] is None:
        player['board']['partner']=source
        player['board']['partner_stage']=0
    elif action['action_type']=='place_companion' and len(player['board']['companions'])<3:
        player['board']['companions'].append(source)
    else:
        raise restart_122.RulesStop('legality_not_confirmed',{'criterion':'117 board slot'})
    player['person_placed']=True
    after['game_state']['phase']='post_placement_response'
    after['last_event_seq']=current['last_event_seq']+1
    after['return_target']='normal_action_opportunity'
    after['response_context']={
        'source_phase':'post_placement_response','phase':'response_window',
        'window_kind':'after_normal_action','origin_event_seq':after['last_event_seq'],
        'turn_player':actor,'priority_actor':actor,'chain_status':'empty','chain_links':[],
        'consecutive_passes':0,'response_opportunity_index':1,
        'decision_kind':'response_action','choice_kind':'reaction_or_pass'}
    after['continuation_state_sha256']=response_120.continuation_state_sha256(
        response_120._continuation_payload(after))
    event={'seq':after['last_event_seq'],'action_type':action['action_type'],'actor':actor,
           'selected_candidate':decision['selected_candidate'],'source_instance_id':source,
           'payment_time':0,'source_reference':text[0],'effect_classification':text[1],
           'game_state_before_sha256':response_120.game_state_sha256(state),
           'game_state_after_sha256':response_120.game_state_sha256(after['game_state']),
           'continuation_state_before_sha256':current['continuation_state_sha256'],
           'continuation_state_after_sha256':after['continuation_state_sha256']}
    return after,[event]


def _verify_extended_step(before: dict, after: dict, generated: list[dict]) -> None:
    if not after['activation_zone']:
        restart_122._verify_step(before,after,generated)
        return
    if after['last_event_seq']!=before['last_event_seq']+len(generated) or \
            after['continuation_state_sha256']!=response_120.continuation_state_sha256(
                response_120._continuation_payload(after)):
        raise ValueError('125 activation sequence or continuation hash differs')
    game_hash=response_120.game_state_sha256(before['game_state'])
    continuation_hash=before['continuation_state_sha256']
    for seq,event in enumerate(generated,before['last_event_seq']+1):
        if event['seq']!=seq or event['game_state_before_sha256']!=game_hash or \
                event['continuation_state_before_sha256']!=continuation_hash:
            raise ValueError('125 activation event chain differs')
        game_hash=event['game_state_after_sha256']
        continuation_hash=event['continuation_state_after_sha256']
        snapshot=event.get('_snapshot_after')
        if snapshot and (response_120._snapshot_instance_errors(snapshot) or
                         response_120._snapshot_dangling_errors(snapshot)):
            raise ValueError('125 activation snapshot zone or link differs')
    if game_hash!=response_120.game_state_sha256(after['game_state']) or \
            continuation_hash!=after['continuation_state_sha256']:
        raise ValueError('125 activation terminal hash differs')


def run_route(route: dict, inputs: dict) -> dict:
    path=route['path_id']
    if route!=inputs['stops'][path]:
        raise ValueError('124 source stop differs')
    current=copy.deepcopy(route['final_state'])
    current['source_event_seq']=route['last_valid_event_seq']
    snapshots=[{'seq':route['last_valid_event_seq'],
                'game_state_sha256':route['game_state_sha256'],
                'continuation_state_sha256':route['continuation_state_sha256']}]
    audits=[];decisions=[];events=[];reason=None
    for _ in range(32):
        try:
            state=current['game_state']
            if state['phase']=='normal_action':
                current_route={'path_id':path,'last_valid_event_seq':current['last_event_seq'],
                               'final_state':current,'game_state_sha256':response_120.game_state_sha256(state),
                               'continuation_state_sha256':current['continuation_state_sha256']}
                audit=audit_current(current_route,inputs['candidate_table'])
                audits.append(audit)
                errors=validate_current(audit,current_route,inputs['candidate_table'])
                if errors:
                    raise ValueError('125 independent validator: '+', '.join(errors))
                if not audit['candidate_set_complete']:
                    raise restart_122.RulesStop('incomplete_legal_candidates',{
                        'contract_stop_codes':audit['contract_stop_codes']})
                if any(x['action_type'] in ('place_companion','place_partner')
                       for x in audit['legal_candidate_details']):
                    decision=_select_placement(current_route,audit,inputs['candidate_table'])
                    after,generated=_apply_placement(current,decision)
                else:
                    opportunity={'audit':audit,'candidate_set_complete':True,
                        'legal_candidate_ids':audit['legal_candidate_ids'],
                        'legal_candidate_details':audit['legal_candidate_details'],
                        'candidate_set_evidence':{'source_ref':'125.current_state_twelve_checks',
                            'state_ref':current_route['game_state_sha256'],
                            'enumeration_rule':'all current-state units rederived'},
                        'pending_triggers':current['pending_triggers'],
                        'activation_zone':current['activation_zone'],
                        'applied_reservations_known_empty':all(
                            not p['reservations'] for p in state['players'].values()),
                        'round':state['round']}
                    original=restart_124.load_sources()['stops'][path][0]
                    decision=restart_122.select_decision(opportunity,{
                        'order_id':original['order_id'],'actor_turn_index':1,
                        'round':state['round']})
                    after,generated=restart_122.transition(current,decision,inputs)
                kind='normal_action'
            elif current['response_context']['phase']=='response_window' and \
                    current['response_context']['consecutive_passes']<2:
                actor=current['response_context']['priority_actor']
                opportunity=response_120.enumerate_response_opportunity(current,actor,inputs['candidate_table'])
                if opportunity['candidate_set_complete'] is not True:
                    raise restart_122.RulesStop('incomplete_legal_candidates',{'phase':'response_window'})
                original=restart_124.load_sources()['stops'][path][0]
                decision=response_120.resolve_response_choice({'order_id':original['order_id'],
                    'actor_turn_index':1,'round':state['round']},opportunity)
                after,generated=restart_122.apply_supported_response(current,decision,inputs)
                if current['return_target']=='turn_end' and \
                        decision['selected_candidate']=='response-pass' and \
                        current['response_context']['consecutive_passes']==1 and \
                        after['response_context']['consecutive_passes']==2 and \
                        not current['response_context']['chain_links']:
                    after['game_state']['phase']='turn_end'
                    after['continuation_state_sha256']=response_120.continuation_state_sha256(
                        response_120._continuation_payload(after))
                    generated[-1]['game_state_after_sha256']=response_120.game_state_sha256(after['game_state'])
                    generated[-1]['continuation_state_after_sha256']=after['continuation_state_sha256']
                    generated[-1]['_snapshot_after']=response_120._build_snapshot(after,after['last_event_seq'])
                audit=None;kind='response_action'
            else:
                raise restart_122.RulesStop('missing_current_turn_end_provenance',{
                    'phase':state['phase'],'current_event_seq':current['last_event_seq'],
                    'required_contract':'123 six-stage proof from current complete history'})
            _verify_extended_step(current,after,generated)
            for event in generated:
                recorded={key:copy.deepcopy(value) for key,value in event.items() if key!='_snapshot_after'}
                events.append(recorded)
                snapshots.append({'seq':event['seq'],'game_state_sha256':event['game_state_after_sha256'],
                                  'continuation_state_sha256':event['continuation_state_after_sha256']})
            decisions.append({'selected_candidate':decision['selected_candidate'],
                              'legal_candidates':copy.deepcopy(decision.get('legal_candidates',
                                  opportunity['legal_candidate_ids'] if kind=='response_action' else [])),
                              'resolution_mode':decision['resolution_mode'],
                              'seed_proof':copy.deepcopy(decision.get('seed_proof')),
                              'audit':copy.deepcopy(audit),'event_seqs':[x['seq'] for x in generated],
                              'kind':kind})
            current=after
        except restart_122.RulesStop as error:
            reason={'code':error.code,'evidence':error.evidence}
            break
    else:
        reason={'code':'unsupported_continuation_bound','limit':32}
    return {'path_id':path,'source_stop_sha256':SOURCE_SHA[path],
            'status':'stopped_rules_adjudication','reason':reason,
            'last_valid_event_seq':current['last_event_seq'],
            'game_state_sha256':response_120.game_state_sha256(current['game_state']),
            'continuation_state_sha256':response_120.continuation_state_sha256(
                response_120._continuation_payload(current)),
            'final_state':current,'audits':audits,'decisions':decisions,
            'events':events,'snapshots':snapshots,'winner':None,
            'seeded_fallback_used':route['seeded_fallback_used'] or any(
                x['resolution_mode']=='seeded_fallback' for x in decisions),
            'counts_as_independent_balance_sample':False}


def run_all(inputs: dict) -> dict:
    return {path:run_route(route,inputs) for path,route in inputs['stops'].items()}


PLAN_FILE='proxy-normal-action-extension-plan-125-20260923.json'
EVALUATION_FILE='proxy-normal-action-extension-evaluation-125-20260923.json'
STOP_FOLDER='proxy-normal-action-stops-125'


def canonical_bytes(value: dict) -> bytes:
    return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')


def validate_outcomes(outcomes: dict, inputs: dict) -> list[str]:
    expected=run_all(inputs)
    if set(outcomes)!=set(expected):
        return ['route set differs']
    return [path+' rebuilt route differs' for path in expected if
            canonical_bytes(outcomes[path])!=canonical_bytes(expected[path])]


def build_plan(inputs: dict, outcomes: dict | None = None) -> dict:
    outcomes=outcomes if outcomes is not None else run_all(inputs)
    return {'schema':'naotocchi.card_game.proxy_normal_action_extension_plan.v1',
            'checkpoint':125,'source_stop_raw_sha256':SOURCE_SHA,
            'information_policy':'public_and_owner_known_only',
            'additional_empty_reason_codes':{
                'hand_card_action':'no_hand_source','board_card_action':'no_board_source'},
            'additional_candidate_id_grammars':[
                'candidate-place-companion-{source_instance_id}',
                'candidate-place-partner-{source_instance_id}'],
            'source_contracts':[107,114,116,119,121,123,124],
            'routes':[{'path_id':path,'source_stop_sha256':SOURCE_SHA[path],
                       'last_valid_event_seq':route['last_valid_event_seq'],
                       'game_state_sha256':route['game_state_sha256'],
                       'continuation_state_sha256':route['continuation_state_sha256'],
                       'status':route['status'],'reason':route['reason'],
                       'decision_count':len(route['decisions']),'event_count':len(route['events']),
                       'snapshot_count':len(route['snapshots']),
                       'seeded_fallback_used':route['seeded_fallback_used'],
                       'counts_as_independent_balance_sample':route['counts_as_independent_balance_sample'],
                       'stop_file':f'{STOP_FOLDER}/stop-125-{path}.json'}
                      for path,route in outcomes.items()]}


def build_evaluation(plan: dict) -> dict:
    routes=plan['routes']
    return {'schema':'naotocchi.card_game.proxy_normal_action_extension_evaluation.v1',
            'checkpoint':125,'planned':len(routes),
            'completed':sum(x['status']=='completed' for x in routes),
            'rules_stop':sum(x['status']=='stopped_rules_adjudication' for x in routes),
            'decision':sum(x['decision_count'] for x in routes),
            'event':sum(x['event_count'] for x in routes),
            'snapshot':sum(x['snapshot_count'] for x in routes),
            'winner':0,'independent_balance_sample':sum(
                x['counts_as_independent_balance_sample'] for x in routes),
            'common_stop_code':'missing_current_turn_end_provenance' if all(
                x['reason']['code']=='missing_current_turn_end_provenance' for x in routes) else None}


def expected_outputs(inputs: dict | None = None) -> dict[str,bytes]:
    inputs=inputs or load_sources()
    outcomes=run_all(inputs)
    plan=build_plan(inputs,outcomes)
    result={PLAN_FILE:canonical_bytes(plan),
            EVALUATION_FILE:canonical_bytes(build_evaluation(plan))}
    result.update({f'{STOP_FOLDER}/stop-125-{path}.json':canonical_bytes(route)
                   for path,route in outcomes.items() if route['status']!='completed'})
    return result


def write_outputs(data_dir: Path = DATA) -> None:
    for name,raw in expected_outputs().items():
        target=data_dir/name
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(raw)


def check_outputs(data_dir: Path = DATA) -> list[str]:
    return [f'canonical bytes differ: {name}' for name,raw in expected_outputs().items()
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
