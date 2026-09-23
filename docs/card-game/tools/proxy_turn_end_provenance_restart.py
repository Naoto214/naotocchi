#!/usr/bin/env python3
"""Checkpoint 124: prove saved event history before resuming turn end."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

import proxy_normal_decision_seeded_restart as restart_117
import proxy_normal_action_candidate_completeness as candidate_121
import proxy_normal_action_seeded_restart as restart_122
import proxy_response_window_seeded_restart as restart_120
import proxy_turn_end_completeness as contract_123

DATA = Path(__file__).resolve().parents[1]/'data'
PLAN_117 = 'proxy-normal-decision-seeded-restart-plan-117-20260919.json'
PLAN_120 = 'proxy-response-window-seeded-restart-plan-120-20260922.json'
PLAN_122 = 'proxy-normal-action-seeded-restart-plan-122-20260923.json'
PLAN_122_SHA = 'ed64261c7e7cdcd12bdc9f141de71f98c6126e0e6e11e350262bcc10f271346f'
PLAN_FILE = 'proxy-turn-end-provenance-restart-plan-124-20260923.json'
EVALUATION_FILE = 'proxy-turn-end-provenance-restart-evaluation-124-20260923.json'
STOP_FOLDER = 'proxy-turn-end-stops-124'
TEXT_REGISTRY = {
    'turn_start_and_egg_draw': {'growth_delta':0,'duration':'none','reference':'01-core-rules.md#デッキ'},
    'egg_exchange_bottom': {'growth_delta':0,'duration':'none','reference':'02-main-system.md'},
    'place_partner': {'P-cat_ceo':{'growth_delta':0,'duration':'none',
                                 'reference':'74-partner-18-card-text-draft.md#P-cat_ceo'}},
    'place_companion': {'C-chameleon':{'growth_delta':0,'duration':'continuous_not_expiring',
                                     'reference':'72-companion-26-card-text-draft.md#C-chameleon'}},
    'activate_response': {'E-first-date':{'growth_delta':0,'duration':'activation_until_resolution',
                                        'reference':'91-event-21-card-text-draft.md#E-first-date'}},
    'response_pass': {'growth_delta':0,'duration':'none','reference':'119-response-window-contract.md'},
    'resolve_event': {'E-first-date':{'growth_delta':5,'duration':'none',
                                    'reference':'91-event-21-card-text-draft.md#E-first-date'}},
    'normal_pass_end_request': {'growth_delta':0,'duration':'none',
                                'reference':'06-action-chain-checkpoint.md#ターン終了'},
}


def _protected_json(name: str, sha: str, data_dir: Path) -> tuple[dict, bytes]:
    raw = (data_dir/name).read_bytes()
    if hashlib.sha256(raw).hexdigest() != sha:
        raise ValueError('protected plan raw bytes differ: '+name)
    return json.loads(raw), raw


def load_sources(data_dir: Path = DATA) -> dict:
    plan117, raw117 = _protected_json(PLAN_117, candidate_121.PLAN_RAW_SHA256['117'], data_dir)
    plan120, raw120 = _protected_json(PLAN_120, candidate_121.PLAN_RAW_SHA256['120'], data_dir)
    plan122, raw122 = _protected_json(PLAN_122, PLAN_122_SHA, data_dir)
    stops = contract_123.load_inputs(data_dir)
    return {'plan_117':plan117,'raw_117':raw117,
            'plan_120':plan120,'raw_120':raw120,
            'plan_122':plan122,'raw_122':raw122,'stops':stops}


def _find_route(plan: dict, path: str) -> dict:
    routes = [route for route in plan['routes'] if route['path_id'] == path]
    if len(routes) != 1:
        raise ValueError('route missing or duplicated in protected plan')
    return routes[0]


def validated_history(path: str, inputs: dict) -> dict:
    """Rebuild 117/120 evidence and attach immutable 122 event/hash chain."""
    if path not in contract_123.EXPECTED_RAW:
        raise ValueError('unknown source route')
    for checkpoint, name, sha in ((117,PLAN_117,candidate_121.PLAN_RAW_SHA256['117']),
                                  (120,PLAN_120,candidate_121.PLAN_RAW_SHA256['120']),
                                  (122,PLAN_122,PLAN_122_SHA)):
        raw = inputs[f'raw_{checkpoint}']
        if hashlib.sha256(raw).hexdigest()!=sha or json.loads(raw)!=inputs[f'plan_{checkpoint}']:
            raise ValueError('protected plan differs: '+name)
    stop, raw=inputs['stops'][path]
    contract_123.verify_source(stop,raw,contract_123.EXPECTED_RAW[path])
    source_117 = restart_117.load_inputs()
    suite_117 = restart_117.build_seeded_restart_suite(inputs['plan_117'],source_117)
    history_117 = suite_117['replay_evidence'][path]
    route_120 = _find_route(inputs['plan_120'],path)
    inputs_120 = restart_120.load_checkpoint_120_inputs()
    if restart_120.validate_materialized_plan_120(inputs_120, DATA):
        raise ValueError('120 saved plan differs from canonical builder')
    _, history_120 = restart_120.replay_route_120(route_120, inputs_120)
    route_122 = _find_route(inputs['plan_122'],path)
    if route_122['game_state_sha256'] != stop['game_state_sha256'] or \
            route_122['continuation_state_sha256'] != stop['continuation_state_sha256'] or \
            route_122['last_valid_event_seq'] != stop['last_valid_event_seq']:
        raise ValueError('122 stop differs from plan')
    events = list(history_117['events'])+list(history_120['events'])+list(route_122['events'])
    snapshots = [{'seq':row['seq'],'game_state_sha256':row['state_sha256'],
                  'state':row['state']} for row in history_117['snapshots']]
    start_120 = history_120['snapshots'][0]
    if start_120['event_seq'] != 3 or start_120['game_state_sha256'] != snapshots[-1]['game_state_sha256']:
        raise ValueError('117/120 source boundary differs')
    snapshots[-1]['continuation_state_sha256'] = start_120['continuation_state_sha256']
    snapshots.extend({'seq':row['event_seq'],'game_state_sha256':row['game_state_sha256'],
                      'continuation_state_sha256':row['continuation_state_sha256'],
                      'state':row['game_state'], 'continuation':row['continuation_state']}
                     for row in history_120['snapshots'][1:])
    snapshots.extend({'seq':row['seq'],'game_state_sha256':row['game_state_sha256'],
                      'continuation_state_sha256':row['continuation_state_sha256']}
                     for row in route_122['snapshots'][1:])
    if [e['seq'] for e in events]!=list(range(1,stop['last_valid_event_seq']+1)) or \
            [s['seq'] for s in snapshots]!=list(range(stop['last_valid_event_seq']+1)):
        raise ValueError('117-122 event or snapshot sequence discontinuity')
    for left,right in zip(snapshots,snapshots[1:]):
        if right['seq'] <= 3:
            event = events[right['seq']-1]
            if event['state_before_sha256']!=left['game_state_sha256'] or \
                    event['state_after_sha256']!=right['game_state_sha256']:
                raise ValueError('117 game state hash chain differs')
        else:
            event=events[right['seq']-1]
            if event['game_state_before_sha256']!=left['game_state_sha256'] or \
                    event['game_state_after_sha256']!=right['game_state_sha256'] or \
                    event['continuation_state_before_sha256']!=left['continuation_state_sha256'] or \
                    event['continuation_state_after_sha256']!=right['continuation_state_sha256']:
                raise ValueError('120/122 dual hash chain differs')
    if snapshots[-1]['game_state_sha256']!=stop['game_state_sha256']:
        raise ValueError('122 terminal game hash differs')
    return {'path_id':path,'events':events,'snapshots':snapshots,'stop':stop}


def derive_provenance(history: dict, text_registry: dict) -> dict:
    """Classify every historical event; an unclassified effect remains unknown."""
    first = history['snapshots'][0]['state']
    card_mapping = history['stop']['game_state']['cards']
    growth = {owner:p['growth'] for owner,p in first['players'].items()}
    if any(x >= 100 for x in growth.values()):
        reach = [{'event_seq':0,'actor':owner} for owner,x in growth.items() if x>=100]
    else:
        reach = []
    trace = [{'event_seq':0,'growth':copy.deepcopy(growth)}]
    active_expiring = []
    unresolved = set()
    classified = []
    for event,snapshot in zip(history['events'],history['snapshots'][1:]):
        kind = event['action_type']
        rule = text_registry.get(kind)
        card_id = None
        instance = event.get('source_instance_id')
        if instance is not None:
            if instance not in card_mapping:
                unresolved.add('unresolved_effect_provenance')
            else:
                card_id = card_mapping[instance]['card_id']
        if isinstance(rule,dict) and 'growth_delta' not in rule:
            rule = rule.get(card_id)
        if rule is None:
            unresolved.add('unresolved_effect_provenance')
            classified.append({'seq':event['seq'],'action_type':kind,'card_id':card_id,
                               'classification':'unknown'})
            continue
        classified.append({'seq':event['seq'],'action_type':kind,'card_id':card_id,
                           'classification':rule['duration'], 'source_reference':rule['reference']})
        if rule['duration'] not in ('none','continuous_not_expiring','activation_until_resolution'):
            unresolved.add('unresolved_effect_provenance')
        if kind in ('place_partner','place_companion') and rule['duration']=='none':
            board_registry = contract_123.BOARD_REGISTRY.get(card_id)
            if board_registry is None:
                unresolved.add('unresolved_effect_provenance')
        delta = rule['growth_delta']
        if delta is None:
            unresolved.add('unresolved_growth_intermediate')
            continue
        actor = event.get('actor')
        if delta:
            if actor not in growth:
                unresolved.add('unresolved_growth_intermediate')
                continue
            growth[actor] += delta
            if growth[actor] >=100:
                reach.append({'event_seq':event['seq'],'actor':actor})
        if 'state' in snapshot:
            observed = {owner:p['growth'] for owner,p in snapshot['state']['players'].items()}
            if growth!=observed or any(p['reservations'] for p in snapshot['state']['players'].values()):
                unresolved.add('unresolved_effect_provenance')
            if snapshot['state']['players'][actor]['growth'] >=100 and delta==0 and not reach:
                unresolved.add('unresolved_growth_intermediate')
        if event.get('reservations_created') or event.get('reservations_consumed'):
            unresolved.add('unresolved_effect_provenance')
        trace.append({'event_seq':event['seq'],'growth':copy.deepcopy(growth)})
    terminal = history['stop']['game_state']
    if growth != {owner:p['growth'] for owner,p in terminal['players'].items()} or \
            any(p['reservations'] for p in terminal['players'].values()):
        unresolved.add('unresolved_effect_provenance')
    return {'classified_events':classified, 'growth_trace':trace,
            'growth_reach_100':reach, 'active_expiring_effects':active_expiring,
            'unresolved_codes':sorted(unresolved), 'source_event_seq':history['stop']['last_valid_event_seq']}


def audit_current_turn_end(stop: dict, provenance: dict) -> dict:
    """Re-evaluate all six 123 stages using verified historical provenance."""
    audit=contract_123.enumerate_turn_end(stop)
    evidence_ok=(provenance['source_event_seq']==stop['last_valid_event_seq'] and
                 not provenance['unresolved_codes'] and
                 not provenance['active_expiring_effects'] and
                 not provenance['growth_reach_100'] and
                 provenance['growth_trace'][-1]['growth']==
                 {owner:p['growth'] for owner,p in stop['game_state']['players'].items()})
    state=stop['game_state']
    pending=stop['continuation_state']['pending_triggers']
    activation=stop['continuation_state']['activation_zone']
    board_units=audit['stage_inventory'][2]['units']
    board_count=sum(bool(p['board'][z]) for p in state['players'].values()
                    for z in ('main','partner','world'))
    board_count+=sum(len(p['board'][z]) for p in state['players'].values()
                     for z in ('companions','prepared'))
    public_complete=(len(board_units)==board_count and
                     all(u['disposition']=='excluded' for u in board_units) and
                     pending==[] and activation==[] and
                     all(not p['reservations'] for p in state['players'].values()))
    checks=audit['completeness_checks']
    checks['trigger_information_boundary_valid']=public_complete and evidence_ok
    checks['expiration_boundary_resolved']=evidence_ok
    checks['expiration_trigger_inventory_complete']=evidence_ok
    checks['victory_history_sufficient']=evidence_ok and state['round']<10
    checks['transition_handlers_proven']=evidence_ok and public_complete and state['round']<10
    checks['source_projection_exact']=public_complete and evidence_ok
    if evidence_ok:
        for index,reason,fields in (
            (3,'verified_no_expiring_effects',['verified_history.classified_events','verified_history.active_expiring_effects']),
            (4,'verified_no_expiration_triggers',['verified_history.active_expiring_effects']),
            (5,'verified_r1_no_100_reach',['verified_history.growth_trace','verified_history.growth_reach_100'])):
            stage=audit['stage_inventory'][index]
            stage['empty_reason']=reason
            stage['state_fields']=fields
    codes=set(audit['contract_stop_codes'])
    if evidence_ok:
        codes.difference_update(('unresolved_expiration','missing_growth_reach_history'))
    else:
        codes.add('unresolved_expiration')
    audit['contract_stop_codes']=[code for code in contract_123.STOPS if code in codes]
    audit['turn_end_set_complete']=all(checks.values()) and not codes
    audit['provenance_evidence']={'source_event_seq':provenance['source_event_seq'],
                                  'classified_event_count':len(provenance['classified_events']),
                                  'growth_trace':copy.deepcopy(provenance['growth_trace']),
                                  'unresolved_codes':list(provenance['unresolved_codes']),
                                  'source_references':['01-core-rules.md','06-action-chain-checkpoint.md',
                                                       '64-turn-boundaries-and-victory-timing.md']}
    return audit


def validate_current_turn_end(audit: dict, stop: dict, raw: bytes,
                              provenance: dict) -> list[str]:
    """Do not trust either the saved audit or the supplied history proof."""
    contract_123.verify_source(stop, raw, contract_123.EXPECTED_RAW[stop['path_id']])
    inputs=load_sources()
    canonical_stop,canonical_raw=inputs['stops'][stop['path_id']]
    if raw!=canonical_raw or stop!=canonical_stop:
        raise ValueError('122 protected stop differs')
    expected_proof=derive_provenance(validated_history(stop['path_id'],inputs),TEXT_REGISTRY)
    if provenance!=expected_proof:
        return ['historical provenance differs from independent reconstruction']
    expected=audit_current_turn_end(stop,expected_proof)
    if not isinstance(audit,dict) or list(audit)!=list(expected):
        return ['current turn-end audit schema or key order differs']
    return [key+' differs' for key in expected if audit[key]!=expected[key]]


def _append_transition(current: dict, after: dict, events: list,
                       snapshots: list, action_type: str, actor: str,
                       selected_candidate: str | None = None) -> None:
    before_game=restart_120.game_state_sha256(current['game_state'])
    before_cont=restart_120.continuation_state_sha256(restart_120._continuation_payload(current))
    after['last_event_seq']=current['last_event_seq']+1
    after_game=restart_120.game_state_sha256(after['game_state'])
    after_cont=restart_120.continuation_state_sha256(restart_120._continuation_payload(after))
    after['continuation_state_sha256']=after_cont
    event={'seq':after['last_event_seq'],'action_type':action_type,'actor':actor,
           'selected_candidate':selected_candidate,
           'game_state_before_sha256':before_game,'game_state_after_sha256':after_game,
           'continuation_state_before_sha256':before_cont,
           'continuation_state_after_sha256':after_cont}
    events.append(event)
    snapshots.append({'seq':after['last_event_seq'],'game_state_sha256':after_game,
                      'continuation_state_sha256':after_cont})


def run_route(stop: dict, sources: dict) -> dict:
    """Continue one route only while current-state proof and handlers exist."""
    path=stop['path_id']
    canonical,raw=sources['stops'][path]
    if stop!=canonical:
        raise ValueError('source stop differs')
    current=copy.deepcopy(stop['continuation_state'])
    current['last_event_seq']=stop['last_valid_event_seq']
    current['continuation_state_sha256']=stop['continuation_state_sha256']
    initial_seq=current['last_event_seq']
    events=[]; decisions=[]; audits=[]
    snapshots=[{'seq':initial_seq,'game_state_sha256':stop['game_state_sha256'],
                'continuation_state_sha256':stop['continuation_state_sha256']}]
    status='stopped_rules_adjudication'
    reason=None
    proof=derive_provenance(validated_history(path,sources),TEXT_REGISTRY)
    audit=audit_current_turn_end(stop,proof)
    audits.append(audit)
    errors=validate_current_turn_end(audit,stop,raw,proof)
    if errors:
        raise ValueError('123 current-state validator: '+', '.join(errors))
    if not audit['turn_end_set_complete']:
        reason={'code':'incomplete_turn_end_sources','contract_stop_codes':audit['contract_stop_codes'],
                'unresolved_codes':proof['unresolved_codes']}
    else:
        # An empty turn-end inventory has no automatic effect or response;
        # R1 cannot satisfy the 100-maintenance or R10 final comparison.
        if current['game_state']['round']!=1 or any(
                p['growth']>=100 for p in current['game_state']['players'].values()):
            reason={'code':'unresolved_victory_predicate'}
        else:
            actor=current['game_state']['turn_player']
            first=_find_route(sources['plan_117'],path)['first_player']
            next_actor='B' if actor=='A' else 'A'
            after=copy.deepcopy(current)
            after['game_state']['turn_player']=next_actor
            if actor!=first:
                after['game_state']['round']+=1
            after['game_state']['phase']='turn_start'
            after['return_target']=None
            _append_transition(current,after,events,snapshots,'turn_end_completed',actor)
            current=after
            # The saved 40-card manifest and current deck prove the draw.
            # Start-trigger effects outside the classified visible board stop.
            owner=current['game_state']['players'][next_actor]
            if current['game_state']['round']!=1 or owner['reservations'] or \
                    current['pending_triggers'] or current['activation_zone'] or \
                    owner['board']['main'] is not None:
                reason={'code':'missing_turn_start_source_proof'}
            elif len(owner['deck'])<2:
                reason={'code':'missing_turn_start_draw_evidence'}
            else:
                after=copy.deepcopy(current)
                player=after['game_state']['players'][next_actor]
                player['time']=after['game_state']['round']
                player['challenge_used']=False
                player['person_placed']=False
                player['relationship_progressed']=False
                drawn=[player['deck'].pop(0),player['deck'].pop(0)]
                player['hand'].extend(drawn)
                after['game_state']['phase']='egg_exchange_choice'
                _append_transition(current,after,events,snapshots,
                                   'turn_start_and_egg_draw',next_actor)
                current=after
                hand=[{'card_copy_id':current['game_state']['cards'][instance]['card_copy_id'],
                       'card_id':current['game_state']['cards'][instance]['card_id'],
                       'initial_instance_id':instance} for instance in player['hand']]
                selected=restart_117.build_mandatory_choice_decision(
                    {'order_id':stop['order_id']},next_actor,1,1,hand)
                decisions.append(selected)
                after=copy.deepcopy(current)
                player=after['game_state']['players'][next_actor]
                instance=selected['selected_action']['initial_instance_id']
                player['hand'].remove(instance)
                player['deck'].append(instance)
                after['game_state']['phase']='normal_action'
                _append_transition(current,after,events,snapshots,'egg_exchange_bottom',
                                   next_actor,selected['selected_candidate'])
                current=after
                # The 121 source inventory is rederived from this newly
                # materialized state, including its freshly drawn owner hand.
                history={'normal_challenge_losses_by_actor':[],
                         'last_valid_event_seq':current['last_event_seq'],
                         'source_refs':[PLAN_117,PLAN_120,PLAN_122]}
                try:
                    table=restart_122.load_sources()['candidate_table']
                    opportunity=restart_122.enumerate_opportunity(current,history,{'candidate_table':table})
                    audits.append(opportunity['audit'])
                    if not opportunity['candidate_set_complete']:
                        reason={'code':'incomplete_legal_candidates',
                                'contract_stop_codes':opportunity['audit']['contract_stop_codes']}
                    else:
                        decision=restart_122.select_decision(opportunity,{
                            'order_id':stop['order_id'],'actor_turn_index':1,'round':1})
                        decisions.append(decision)
                        reason={'code':'missing_next_action_transition_handler',
                                'selected_candidate':decision['selected_candidate']}
                except restart_122.RulesStop as error:
                    reason={'code':error.code,'evidence':error.evidence}
    current_hash=restart_120.game_state_sha256(current['game_state'])
    cont_hash=restart_120.continuation_state_sha256(restart_120._continuation_payload(current))
    return {'path_id':path,'source_stop_sha256':contract_123.EXPECTED_RAW[path],
            'status':status,'reason':reason,'last_valid_event_seq':current['last_event_seq'],
            'game_state_sha256':current_hash,'continuation_state_sha256':cont_hash,
            'final_state':current,'audits':audits,'decisions':decisions,
            'events':events,'snapshots':snapshots,'winner':None,
            'seeded_fallback_used':any(d.get('resolution_mode')=='seeded_fallback' for d in decisions),
            'counts_as_independent_balance_sample':False}


def run_all(inputs: dict) -> dict:
    return {path:run_route(stop,inputs) for path,(stop,_) in inputs['stops'].items()}


def validate_outcomes(outcomes: dict, inputs: dict) -> list[str]:
    """Rebuild every route from immutable sources; never trust stored outcomes."""
    expected=run_all(inputs)
    if set(outcomes)!=set(expected):
        return ['route set differs']
    return [path+' rebuilt route differs' for path in expected if
            canonical_bytes(outcomes[path])!=canonical_bytes(expected[path])]


def _summary(route: dict) -> dict:
    return {key:copy.deepcopy(route[key]) for key in (
        'path_id','source_stop_sha256','status','reason','last_valid_event_seq',
        'game_state_sha256','continuation_state_sha256','winner',
        'seeded_fallback_used','counts_as_independent_balance_sample')}


def build_plan(inputs: dict) -> dict:
    outcomes=run_all(inputs)
    errors=validate_outcomes(outcomes,inputs)
    if errors:
        raise ValueError('; '.join(errors))
    return {'schema':'naotocchi.card_game.proxy_turn_end_provenance_restart_plan.v1',
            'checkpoint':124,'source_plans':{
                '117':candidate_121.PLAN_RAW_SHA256['117'],
                '120':candidate_121.PLAN_RAW_SHA256['120'],'122':PLAN_122_SHA},
            'information_policy':'public_and_owner_known_only',
            'routes':[_summary(route)|{
                'new_stop_file':f'{STOP_FOLDER}/stop-124-{path}.json',
                'decision_count':len(route['decisions']),
                'event_count':len(route['events']),
                'snapshot_count':len(route['snapshots']),
                'turn_end_set_complete':route['audits'][0]['turn_end_set_complete']}
                for path,route in outcomes.items()]}


def build_evaluation(plan: dict) -> dict:
    routes=plan['routes']
    return {'schema':'naotocchi.card_game.proxy_turn_end_provenance_restart_evaluation.v1',
            'checkpoint':124,'planned':len(routes),
            'completed':sum(x['status']=='completed' for x in routes),
            'rules_stop':sum(x['status']=='stopped_rules_adjudication' for x in routes),
            'decision':sum(x['decision_count'] for x in routes),
            'event':sum(x['event_count'] for x in routes),
            'snapshot':sum(x['snapshot_count'] for x in routes),
            'winner':sum(x['winner'] is not None for x in routes),
            'independent_balance_sample':sum(x['counts_as_independent_balance_sample'] for x in routes),
            'common_stop_code': 'missing_exclusion_reason' if all(
                x['reason']['code']=='incomplete_legal_candidates' and
                x['reason']['contract_stop_codes']==['missing_exclusion_reason']
                for x in routes) else None}


def canonical_bytes(value: dict) -> bytes:
    return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')


def expected_outputs(inputs: dict | None = None) -> dict[str,bytes]:
    inputs=inputs or load_sources()
    outcomes=run_all(inputs)
    plan=build_plan(inputs)
    output={PLAN_FILE:canonical_bytes(plan),
            EVALUATION_FILE:canonical_bytes(build_evaluation(plan))}
    output.update({f'{STOP_FOLDER}/stop-124-{path}.json':canonical_bytes(route)
                   for path,route in outcomes.items() if route['status']!='completed'})
    return output


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
