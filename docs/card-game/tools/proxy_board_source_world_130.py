#!/usr/bin/env python3
"""Checkpoint 130: board-source exclusion and continuous-world comparison."""
from __future__ import annotations

import copy
import hashlib
import json
from contextlib import contextmanager
from pathlib import Path

import proxy_conditional_growth_129 as prior_129

extension_128=prior_129.extension_128
extension_127=prior_129.extension_127
candidate_121=extension_128.candidate_121
restart_122=prior_129.restart_122
restart_117=prior_129.restart_117
response_120=prior_129.response_120
current_126=prior_129.current_126
extension_125=prior_129.extension_125
fallback_116=prior_129.fallback_116
DATA=prior_129.DATA
SOURCE_SHA={
 'order-01-a-first':'06821078600dedddd59a18cb5bfc837d7dd813927c0ca0baa571fc2342bbc32d',
 'order-01-b-first':'11f03476e73528190892694bf2c270a399faeb4dbe41ea36f3ebec6e69c00fa8',
 'order-02-a-first':'8b7d6b86558085b41f46cba846d202030e0d730bfa63275ee47ec64e96b514ff',
 'order-02-b-first':'eea065d25b0c802a3d0f0906952f491c75761e44671a4589610638f19c1acdc1',
}
BOARD_SOURCE_REASON='source_not_on_required_board'
WORLD_EFFECT={'immediate_growth_delta':0,'immediate_time_delta':0,
              'reference':'89-world-13-card-text-draft.md#W-deepsea',
              'deferred_condition':'自分の手札が2枚以下の間'}


def load_sources(data_dir: Path = DATA) -> dict:
    prior=prior_129.load_sources(data_dir)
    stops={}
    for path,sha in SOURCE_SHA.items():
        raw=(data_dir/'proxy-conditional-growth-stops-129'/f'stop-129-{path}.json').read_bytes()
        if hashlib.sha256(raw).hexdigest()!=sha:
            raise ValueError('129 protected raw SHA differs')
        stop=json.loads(raw)
        if stop['path_id']!=path or response_120.game_state_sha256(stop['final_state']['game_state'])!=stop['game_state_sha256'] or \
                response_120.continuation_state_sha256(response_120._continuation_payload(stop['final_state']))!=stop['continuation_state_sha256']:
            raise ValueError('129 protected state SHA differs')
        stops[path]=stop
    return {'stops':stops,'candidate_table':prior['candidate_table'],'source_129':prior}


def _board_only_from_hand(view: dict, original: dict) -> dict:
    template=original['template'];action=original['action_type'];source=original['source_instance_id']
    if original['source_family']!='hand_card_action' or action!='activate_companion_ability' or \
            original['source_zone']!='hand' or source not in view['players'][view['actor']]['hand'] or \
            'on companion board' not in template['prerequisites'] or \
            template['timing']!='normal_action_opportunity':
        raise ValueError('unresolved_canonical_predicate: required board source')
    reference=template['source_text_reference'];filename,sep,card_id=reference.partition('#')
    text=(DATA.parent/filename).read_text()
    if not sep or card_id!=original['card_id'] or f'### {card_id} ' not in text or \
            'なかま枠から' not in text:
        raise ValueError('required board source text differs')
    unit={k:copy.deepcopy(v) for k,v in original.items() if k!='template'}
    unit.update({'reason_codes':[BOARD_SOURCE_REASON],'disposition':'excluded','candidate_id':None,
                 'evidence':{'source_zone':'hand','required_source_zone':'companion_board',
                             'source_instance_id':source,'template.prerequisites':template['prerequisites']},
                 'source_references':[reference,'114-normal-decision-protocol-hardening.md','01-core-rules.md']})
    return unit


def adjudicate_units(view: dict, baseline: list[dict]) -> list[dict]:
    board_only=lambda row:row['source_family']=='hand_card_action' and row['action_type']=='activate_companion_ability'
    delegated=extension_128.adjudicate_units(view,[x for x in baseline if not board_only(x)])
    by_id={x['enumeration_unit_id']:x for x in delegated}
    result=[_board_only_from_hand(view,x) if board_only(x) else by_id[x['enumeration_unit_id']]
            for x in baseline]
    if len({x['enumeration_unit_id'] for x in result})!=len(result) or \
            len({x['candidate_id'] for x in result if x['candidate_id']})!=sum(bool(x['candidate_id']) for x in result):
        raise ValueError('candidate_id_collision')
    return result

expand_units=extension_128.expand_units
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



@contextmanager
def current_comparison_scope():
    """Apply only current-state evidence while preserving older checkpoint modules."""
    original_audit=extension_128.audit_current
    registry=extension_128.PAID_ACTION_CERTAIN_EFFECTS
    original_effect=registry.get('W-deepsea')
    if original_effect is not None and original_effect!=WORLD_EFFECT:
        raise ValueError('continuous world evidence conflict')
    source=(DATA.parent/WORLD_EFFECT['reference'].split('#')[0]).read_text()
    if '### W-deepsea ' not in source or WORLD_EFFECT['deferred_condition'] not in source or \
            '自分のメインのちから・ちえ+1' not in source:
        raise ValueError('continuous world text differs')
    try:
        extension_128.audit_current=audit_current
        registry['W-deepsea']=WORLD_EFFECT
        yield
    finally:
        extension_128.audit_current=original_audit
        if original_effect is None:registry.pop('W-deepsea',None)
        else:registry['W-deepsea']=original_effect


def compare_current(route: dict, audit: dict, table: dict) -> dict:
    if audit!=audit_current(route,table) or not audit['candidate_set_complete']:
        raise ValueError('unproved complete candidate set')
    with current_comparison_scope():
        if any(x['action_type'] in ('place_companion','place_partner') for x in audit['legal_candidate_details']):
            return extension_128.compare_mixed(route,audit,table)
        return prior_129.compare_conditional(route,audit,table)


def audit_turn_end_from_history(path: str, source: dict, prior: dict, current: dict,
                                events: list[dict], snapshots: list[dict]) -> dict:
    if source['snapshots'][-1]!=snapshots[0]:
        raise ValueError('129/130 event boundary differs')
    joined_events=copy.deepcopy(source['events'])+copy.deepcopy(events)
    joined_snapshots=copy.deepcopy(source['snapshots'])+copy.deepcopy(snapshots[1:])
    return prior_129.audit_turn_end_from_history(path,prior['stops'][path],prior['source_128'],
                                                  current,joined_events,joined_snapshots)

def run_route(path: str, inputs: dict) -> dict:
    source=inputs['stops'][path]
    if source['path_id']!=path or \
            response_120.game_state_sha256(source['final_state']['game_state'])!=source['game_state_sha256'] or \
            response_120.continuation_state_sha256(response_120._continuation_payload(source['final_state']))!=source['continuation_state_sha256']:
        raise ValueError('129 source state hash differs')
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
                    raise ValueError('129 independent current candidate audit differs')
                if not audit['candidate_set_complete']:
                    raise restart_122.RulesStop('incomplete_legal_candidates',{
                        'contract_stop_codes':audit['contract_stop_codes']})
                if any(d['action_type'] in ('place_companion','place_partner') for d in audit['legal_candidate_details']):
                    decision=compare_current(route,audit,inputs['candidate_table'])
                    after,generated=extension_125._apply_placement(current,decision)
                else:
                    decision=compare_current(route,audit,inputs['candidate_table'])
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
                if 'source_129' not in inputs:
                    raise restart_122.RulesStop('missing_current_turn_end_provenance',{
                        'phase':game['phase'],'last_valid_event_seq':current['last_event_seq']})
                proof=audit_turn_end_from_history(path,source,inputs['source_129'],current,events,snapshots)
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
                if any(x not in extension_128.BOARD_CLASSIFICATION for x in board_ids):
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

PLAN_FILE='proxy-board-source-world-plan-130-20260923.json'
EVALUATION_FILE='proxy-board-source-world-evaluation-130-20260923.json'
STOP_FOLDER='proxy-board-source-world-stops-130'
canonical_bytes=extension_128.canonical_bytes


def build_plan(outcomes: dict) -> dict:
    return {'schema':'naotocchi.card_game.proxy_board_source_world_plan.v1',
            'checkpoint':130,'protected_129_stop_raw_sha256':SOURCE_SHA,
            'source_contracts':[107,114,116,117,121,123,126,127,128,129],
            'board_source_reason':BOARD_SOURCE_REASON,'continuous_world_effect':WORLD_EFFECT,
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
                       'stop_file':f'{STOP_FOLDER}/stop-130-{path}.json'}
                      for path,row in outcomes.items()]}


def build_evaluation(plan: dict) -> dict:
    routes=plan['routes']
    return {'schema':'naotocchi.card_game.proxy_board_source_world_evaluation.v1',
            'checkpoint':130,'planned':len(routes),
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
    output.update({f'{STOP_FOLDER}/stop-130-{path}.json':canonical_bytes(row)
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
