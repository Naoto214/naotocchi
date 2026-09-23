#!/usr/bin/env python3
"""Checkpoint 131: classify safe placement and compare full mixed candidates."""
from __future__ import annotations

import copy
import hashlib
import json
from contextlib import contextmanager
from pathlib import Path

import proxy_board_source_world_130 as prior_130

prior_129=prior_130.prior_129
extension_128=prior_130.extension_128
extension_127=prior_130.extension_127
extension_125=prior_130.extension_125
restart_122=prior_130.restart_122
restart_117=prior_130.restart_117
response_120=prior_130.response_120
current_126=prior_130.current_126
fallback_116=prior_130.fallback_116
DATA=prior_130.DATA
SOURCE_SHA={
 'order-01-a-first':'b7ef3378138dd776e2b134e741b30ba5f59830c666504d801c44fa071c76b140',
 'order-01-b-first':'af2a175b6a15523413c74d3263e859ac36272a431687f84c441aa3871a9e4280',
 'order-02-a-first':'c371b5947b8337fd6f1f6d40b0a4478160527eefe8204b093b62c206e763ca58',
 'order-02-b-first':'c7e7459fe128e45fbecf041ba2b911414b525cfc29a2c4be7c284a1252c767ea',
}
PLACEMENT_EVIDENCE={'C-cat_friend':{
    'source_reference':'72-companion-26-card-text-draft.md#C-cat_friend',
    'optional_ability':'発動できる','board_zone':'なかま枠から',
    'effect_classification':'optional_board_ability_no_placement_effect'}}
CONDITIONAL_COIN={'I-c_coin2':{
    'reference':'77-current-items-card-text-draft.md#I-c_coin2',
    'condition':'公開したカードがメインだった場合','uncertainty_source':'hidden_top_deck'}}
audit_current=prior_130.audit_current


def load_sources(data_dir: Path = DATA) -> dict:
    prior=prior_130.load_sources(data_dir)
    stops={}
    for path,sha in SOURCE_SHA.items():
        raw=(data_dir/'proxy-board-source-world-stops-130'/f'stop-130-{path}.json').read_bytes()
        if hashlib.sha256(raw).hexdigest()!=sha:
            raise ValueError('130 protected raw SHA differs')
        stop=json.loads(raw)
        if stop['path_id']!=path or response_120.game_state_sha256(stop['final_state']['game_state'])!=stop['game_state_sha256'] or \
                response_120.continuation_state_sha256(response_120._continuation_payload(stop['final_state']))!=stop['continuation_state_sha256']:
            raise ValueError('130 protected state SHA differs')
        stops[path]=stop
    return {'stops':stops,'candidate_table':prior['candidate_table'],'source_130':prior}


@contextmanager
def placement_scope():
    registry=extension_125.PLACEMENT_TEXT
    original={card:registry.get(card) for card in PLACEMENT_EVIDENCE}
    try:
        for card,evidence in PLACEMENT_EVIDENCE.items():
            filename,sep,anchor=evidence['source_reference'].partition('#')
            source=(DATA.parent/filename).read_text()
            if not sep or anchor!=card or f'### {anchor} ' not in source or \
                    evidence['optional_ability'] not in source or evidence['board_zone'] not in source:
                raise ValueError('placement card text differs')
            entry=(evidence['source_reference'],evidence['effect_classification'])
            if original[card] is not None and original[card]!=entry:
                raise ValueError('placement evidence conflict')
            registry[card]=entry
        yield
    finally:
        for card,entry in original.items():
            if entry is None:registry.pop(card,None)
            else:registry[card]=entry


def _paid_cost(item: dict, game: dict, owner: dict, table: dict) -> tuple[int,dict | None]:
    cid=item['candidate_id'];action=item['action_type'];card_id=item['card_id'];effect=None
    if action=='play_main' and item['candidate_variant']=='birth':
        card=game['cards'][item['source_instance_id']]
        birth=restart_117._main_birth_detail(item['source_instance_id'],card,table,owner['board'],owner['time'])
        if birth is None or birth['candidate_id']!=cid or card_id not in restart_122.BIRTH_TEXT_EVIDENCE:
            raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'birth effect'})
        return birth['payment_time'],None
    if action in ('attach_item','place_world'):
        evidence=extension_128.PAID_ACTION_CERTAIN_EFFECTS.get(card_id)
        if card_id=='W-deepsea':evidence=prior_130.WORLD_EFFECT
        if evidence is None or evidence['immediate_growth_delta']!=0 or evidence['immediate_time_delta']!=0 or \
                evidence['deferred_condition'] not in (DATA.parent/evidence['reference'].split('#')[0]).read_text():
            raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'classified paid effect'})
    elif action=='use_play' and card_id in prior_129.CONDITIONAL:
        effect=prior_129.CONDITIONAL[card_id]
    elif action=='use_item' and card_id in CONDITIONAL_COIN:
        effect=CONDITIONAL_COIN[card_id]
    else:
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',
                                    {'criterion':'unclassified paid action','card_id':card_id,'action_type':action})
    if effect is not None:
        filename,sep,anchor=effect['reference'].partition('#')
        text=(DATA.parent/filename).read_text()
        if not sep or anchor!=card_id or f'### {anchor} ' not in text or effect['condition'] not in text or \
                effect['uncertainty_source']!='hidden_top_deck' or not owner['deck'] or item['target_instance_ids']:
            raise ValueError('conditional paid source evidence differs')
    template=next(c for c in table['cards'] if c['card_id']==card_id)['actions'][0]
    cost=template['base_time_cost']
    if not isinstance(cost,int) or isinstance(cost,bool) or cost<=0 or cost>owner['time']:
        raise ValueError('unproved paid time')
    return cost,effect


def compare_mixed(route: dict, audit: dict, table: dict) -> dict:
    if audit!=audit_current(route,table) or not audit['candidate_set_complete']:
        raise ValueError('unproved complete candidate set')
    game=route['final_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    if game['phase']!='normal_action' or owner['board']['main'] is not None or owner['person_placed'] or \
            any(p['growth']>=100 for p in game['players'].values()) or \
            route['final_state']['pending_triggers'] or route['final_state']['activation_zone']:
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'earlier 107 priority'})
    remaining={};placements=[];uncertainty={}
    with placement_scope():
        for item in audit['legal_candidate_details']:
            action=item['action_type'];cid=item['candidate_id'];cost=0
            if action in ('place_companion','place_partner'):
                card=game['cards'][item['source_instance_id']]
                placement=restart_117._placement_for_card(item['source_instance_id'],card,table,owner['board'])
                if placement is None or placement['candidate_id']!=cid or card['card_id'] not in extension_125.PLACEMENT_TEXT:
                    raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'116 safety'})
                placements.append(placement)
            elif action!='pass':
                cost,effect=_paid_cost(item,game,owner,table)
                if effect is not None:uncertainty[cid]={'source_card_id':item['card_id'],**effect,
                                                       'certain_growth_difference':0}
            remaining[cid]=owner['time']-cost
    if not placements or any(remaining[p['candidate_id']]!=owner['time'] for p in placements) or \
            any(remaining[x['candidate_id']]>=owner['time'] for x in audit['legal_candidate_details']
                if x['action_type'] not in ('pass','place_companion','place_partner')):
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
        'certain_growth_difference':{cid:0 for cid in remaining},
        'time_after_certain_resolution':remaining,'conditional_uncertainty':uncertainty,
        'paid_actions_dominated_at_time_priority':[x['candidate_id'] for x in audit['legal_candidate_details']
            if x['action_type'] not in ('pass','place_companion','place_partner')],
        'pass_dominated_after_116_safety':True}
    decision['selected_action']=copy.deepcopy(next(x for x in audit['legal_candidate_details']
                                                   if x['candidate_id']==decision['selected_candidate']))
    decision['legal_candidate_details']=copy.deepcopy(audit['legal_candidate_details'])
    return decision


def compare_current(route: dict, audit: dict, table: dict) -> dict:
    if any(x['action_type'] in ('place_companion','place_partner') for x in audit['legal_candidate_details']):
        return compare_mixed(route,audit,table)
    return prior_130.compare_current(route,audit,table)


def audit_turn_end_from_history(path: str, source: dict, prior: dict, current: dict,
                                events: list[dict], snapshots: list[dict]) -> dict:
    if source['snapshots'][-1]!=snapshots[0]:raise ValueError('130/131 event boundary differs')
    joined_events=copy.deepcopy(source['events'])+copy.deepcopy(events)
    joined_snapshots=copy.deepcopy(source['snapshots'])+copy.deepcopy(snapshots[1:])
    return prior_130.audit_turn_end_from_history(path,prior['stops'][path],prior['source_129'],
                                                  current,joined_events,joined_snapshots)
def run_route(path: str, inputs: dict) -> dict:
    source=inputs['stops'][path]
    if source['path_id']!=path or \
            response_120.game_state_sha256(source['final_state']['game_state'])!=source['game_state_sha256'] or \
            response_120.continuation_state_sha256(response_120._continuation_payload(source['final_state']))!=source['continuation_state_sha256']:
        raise ValueError('130 source state hash differs')
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
                    raise ValueError('130 independent current candidate audit differs')
                if not audit['candidate_set_complete']:
                    raise restart_122.RulesStop('incomplete_legal_candidates',{
                        'contract_stop_codes':audit['contract_stop_codes']})
                if any(d['action_type'] in ('place_companion','place_partner') for d in audit['legal_candidate_details']):
                    decision=compare_current(route,audit,inputs['candidate_table'])
                    with placement_scope():
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
                if 'source_130' not in inputs:
                    raise restart_122.RulesStop('missing_current_turn_end_provenance',{
                        'phase':game['phase'],'last_valid_event_seq':current['last_event_seq']})
                proof=audit_turn_end_from_history(path,source,inputs['source_130'],current,events,snapshots)
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

PLAN_FILE='proxy-safe-placement-mixed-plan-131-20260923.json'
EVALUATION_FILE='proxy-safe-placement-mixed-evaluation-131-20260923.json'
STOP_FOLDER='proxy-safe-placement-mixed-stops-131'
canonical_bytes=extension_128.canonical_bytes


def build_plan(outcomes: dict) -> dict:
    return {'schema':'naotocchi.card_game.proxy_safe_placement_mixed_plan.v1',
            'checkpoint':131,'protected_130_stop_raw_sha256':SOURCE_SHA,
            'source_contracts':[107,114,116,117,121,123,126,127,128,129,130],
            'placement_evidence':PLACEMENT_EVIDENCE,'conditional_coin':CONDITIONAL_COIN,
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
                       'stop_file':f'{STOP_FOLDER}/stop-131-{path}.json'}
                      for path,row in outcomes.items()]}


def build_evaluation(plan: dict) -> dict:
    routes=plan['routes']
    return {'schema':'naotocchi.card_game.proxy_safe_placement_mixed_evaluation.v1',
            'checkpoint':131,'planned':len(routes),
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
    output.update({f'{STOP_FOLDER}/stop-131-{path}.json':canonical_bytes(row)
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
