#!/usr/bin/env python3
"""Checkpoint 126: immutable 125 evidence, corrected closure and current proof."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

import proxy_normal_action_extension as extension_125
import proxy_turn_end_provenance_restart as restart_124
import proxy_response_window_seeded_restart as response_120

DATA=Path(__file__).resolve().parents[1]/'data'
SOURCE_SHA={
 'order-01-a-first':'3f3bc8781dc4d040be10362c0d0d9c878064180144a449e3cd92a67594b5ccf5',
 'order-01-b-first':'d618d39ca3276f87e906e2899ed71601e74a210fc81afa34cc66cffc9b284ab8',
 'order-02-a-first':'40e58ae17a63a14a2549ab217fa8acaa42ab8dcf3d24b53f85ef7e1f0e160ace',
 'order-02-b-first':'c52fa31c5d19116d8fa757e0a807f189534398bae6033b4916c5e50f7f884d0e',
}


def load_sources(data_dir: Path = DATA) -> dict:
    if extension_125.check_outputs(data_dir):
        raise ValueError('125 canonical outputs differ')
    prior=extension_125.load_sources(data_dir)
    built=extension_125.run_all(prior)
    raw_stops={};stops={}
    for path in extension_125.SOURCE_SHA:
        raw=(data_dir/extension_125.STOP_FOLDER/f'stop-125-{path}.json').read_bytes()
        if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA[path]:
            raise ValueError('125 protected stop raw differs')
        saved=json.loads(raw)
        if saved!=built[path] or saved['path_id']!=path:
            raise ValueError('125 source stop differs from independent replay')
        raw_stops[path]=raw;stops[path]=saved
    return {'stops':stops,'raw_stops':raw_stops,'source_124':prior}


def correct_window(path: str, inputs: dict) -> dict:
    if path not in inputs['stops']:
        raise ValueError('unknown 125 source route')
    source=inputs['stops'][path];raw=inputs['raw_stops'][path]
    if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA[path] or \
            raw!=restart_124.canonical_bytes(source) or \
            source!=extension_125.run_route(inputs['source_124']['stops'][path],inputs['source_124']):
        raise ValueError('125 source raw or replay differs')
    state=source['final_state'];ctx=state['response_context'];last=source['events'][-1]
    if state['game_state']['phase']!='turn_end' or state['return_target']!='normal_action_opportunity' or \
            ctx['chain_status']!='empty' or ctx['chain_links']!=[] or \
            ctx['consecutive_passes']!=2 or last['action_type']!='response_pass' or \
            last['selected_candidate']!='response-pass' or \
            not any(e['action_type']=='normal_pass_end_request' for e in source['events']):
        raise ValueError('125 source is not the proved empty window closure')
    corrected=copy.deepcopy(source)
    current=corrected['final_state']
    current['return_target']='turn_end'
    digest=response_120.continuation_state_sha256(response_120._continuation_payload(current))
    current['continuation_state_sha256']=digest
    corrected['continuation_state_sha256']=digest
    corrected['events'][-1]['continuation_state_after_sha256']=digest
    corrected['snapshots'][-1]['continuation_state_sha256']=digest
    corrected['correction_evidence']={
        'source_stop_sha256':hashlib.sha256(raw).hexdigest(),
        'source_final_continuation_sha256':source['continuation_state_sha256'],
        'canonical_reference':'122-normal-action-seeded-restart.md#turn_end',
        'changed_field':'continuation_state.return_target',
        'last_event_seq_unchanged':True}
    return corrected


def verified_history(path: str, inputs: dict) -> dict:
    """Join protected 117–122, 124 and corrected 125 event chains."""
    source_124=restart_124.load_sources()
    history=restart_124.validated_history(path,source_124)
    route_124=restart_124.run_route(source_124['stops'][path][0],source_124)
    corrected=correct_window(path,inputs)
    if route_124!=inputs['source_124']['stops'][path]:
        raise ValueError('124 source route differs from independent replay')
    if history['snapshots'][-1]['game_state_sha256']!=route_124['events'][0]['game_state_before_sha256'] or \
            history['snapshots'][-1]['continuation_state_sha256']!=route_124['events'][0]['continuation_state_before_sha256']:
        raise ValueError('122/124 boundary differs')
    if route_124['snapshots'][-1]['game_state_sha256']!=corrected['events'][0]['game_state_before_sha256'] or \
            route_124['snapshots'][-1]['continuation_state_sha256']!=corrected['events'][0]['continuation_state_before_sha256']:
        raise ValueError('124/125 boundary differs')
    history['events'].extend(copy.deepcopy(route_124['events']))
    history['events'].extend(copy.deepcopy(corrected['events']))
    history['snapshots'].extend(copy.deepcopy(route_124['snapshots'][1:]))
    history['snapshots'].extend(copy.deepcopy(corrected['snapshots'][1:]))
    terminal=corrected['final_state']['game_state']
    history['stop']={'game_state':terminal,'last_valid_event_seq':corrected['last_valid_event_seq']}
    history['corrected_source']=corrected
    if [event['seq'] for event in history['events']]!=list(range(1,corrected['last_valid_event_seq']+1)) or \
            [snap['seq'] for snap in history['snapshots']]!=list(range(corrected['last_valid_event_seq']+1)):
        raise ValueError('117-125 sequence differs')
    for event,before,after in zip(history['events'][3:],history['snapshots'][3:],history['snapshots'][4:]):
        if event['game_state_before_sha256']!=before['game_state_sha256'] or \
                event['game_state_after_sha256']!=after['game_state_sha256'] or \
                event['continuation_state_before_sha256']!=before['continuation_state_sha256'] or \
                event['continuation_state_after_sha256']!=after['continuation_state_sha256']:
            raise ValueError('117-125 dual hash chain differs')
    if history['snapshots'][-1]['game_state_sha256']!=response_120.game_state_sha256(terminal) or \
            history['snapshots'][-1]['continuation_state_sha256']!=corrected['continuation_state_sha256']:
        raise ValueError('125 corrected terminal hash differs')
    return history


def derive_current_provenance(history: dict) -> dict:
    if any(event['seq']!=index for index,event in enumerate(history['events'],1)):
        raise ValueError('historical sequence differs')
    for event,before,after in zip(history['events'][3:],history['snapshots'][3:],history['snapshots'][4:]):
        if event['game_state_before_sha256']!=before['game_state_sha256'] or \
                event['game_state_after_sha256']!=after['game_state_sha256'] or \
                event['continuation_state_before_sha256']!=before['continuation_state_sha256'] or \
                event['continuation_state_after_sha256']!=after['continuation_state_sha256']:
            raise ValueError('historical dual hash differs')
    registry=copy.deepcopy(restart_124.TEXT_REGISTRY)
    registry['turn_end_completed']={
        'growth_delta':0,'duration':'none',
        'reference':'123-turn-end-completeness-contract.md#six-stage-empty-turn-end'}
    evidence=restart_124.derive_provenance(history,registry)
    if sum(x['action_type']=='turn_end_completed' for x in evidence['classified_events'])!=1:
        evidence['unresolved_codes'].append('unresolved_turn_end_history')
    return evidence


def _current_stop(corrected: dict) -> dict:
    current=corrected['final_state']
    return {'path_id':corrected['path_id'],'game_state':current['game_state'],
            'continuation_state':response_120._continuation_payload(current),
            'last_valid_event_seq':corrected['last_valid_event_seq'],
            'game_state_sha256':corrected['game_state_sha256'],
            'continuation_state_sha256':corrected['continuation_state_sha256']}


def audit_current_turn_end(corrected: dict, proof: dict) -> dict:
    audit=restart_124.audit_current_turn_end(_current_stop(corrected),proof)
    audit['source_stop_sha256']=corrected['correction_evidence']['source_stop_sha256']
    return audit


def validate_current_turn_end(audit: dict, path: str, inputs: dict) -> list[str]:
    try:
        canonical=correct_window(path,inputs)
        proof=derive_current_provenance(verified_history(path,inputs))
        expected=audit_current_turn_end(canonical,proof)
    except (ValueError,KeyError,TypeError,IndexError) as error:
        return [f'current history integrity: {error}']
    if not isinstance(audit,dict) or list(audit)!=list(expected):
        return ['current audit schema or order differs']
    return [key+' differs from independent current history' for key in expected
            if audit[key]!=expected[key]]


def run_route(path: str, inputs: dict) -> dict:
    corrected=correct_window(path,inputs)
    proof=derive_current_provenance(verified_history(path,inputs))
    audit=audit_current_turn_end(corrected,proof)
    if validate_current_turn_end(audit,path,inputs):
        raise ValueError('126 independent current turn-end proof differs')
    current=copy.deepcopy(corrected['final_state'])
    source=inputs['stops'][path]
    events=[];decisions=[];audits=[audit]
    snapshots=[{'seq':current['last_event_seq'],
                'game_state_sha256':corrected['game_state_sha256'],
                'continuation_state_sha256':corrected['continuation_state_sha256']}]
    if not audit['turn_end_set_complete']:
        reason={'code':'incomplete_turn_end_sources',
                'contract_stop_codes':audit['contract_stop_codes']}
    elif current['game_state']['round']!=1 or any(
            x['growth']>=100 for x in current['game_state']['players'].values()):
        reason={'code':'unresolved_victory_predicate'}
    else:
        actor=current['game_state']['turn_player']
        first=restart_124._find_route(restart_124.load_sources()['plan_117'],path)['first_player']
        if actor==first:
            raise ValueError('126 expected a second-player end boundary')
        next_actor='B' if actor=='A' else 'A'
        after=copy.deepcopy(current)
        after['game_state']['turn_player']=next_actor
        after['game_state']['round']+=1
        after['game_state']['phase']='turn_start'
        after['return_target']=None
        restart_124._append_transition(current,after,events,snapshots,'turn_end_completed',actor)
        current=after
        owner=current['game_state']['players'][next_actor]
        visible_board=[current['game_state']['cards'][instance]['card_id']
            for player in current['game_state']['players'].values()
            for instance in ([x for x in (player['board']['main'],player['board']['partner'],
                player['board']['world']) if x]+player['board']['companions']+
                player['board']['prepared'])]
        supported={card for card in restart_124.contract_123.BOARD_REGISTRY}
        if current['pending_triggers'] or current['activation_zone'] or \
                any(p['reservations'] for p in current['game_state']['players'].values()) or \
                any(card not in supported for card in visible_board):
            reason={'code':'missing_round_start_source_proof',
                    'unclassified_board_ids':sorted(set(visible_board)-supported)}
        elif len(owner['deck'])<2 and owner['board']['main'] is None or \
                len(owner['deck'])<1:
            reason={'code':'missing_turn_start_draw_evidence'}
        else:
            after=copy.deepcopy(current)
            player=after['game_state']['players'][next_actor]
            player['time']=after['game_state']['round']
            player['challenge_used']=False
            player['person_placed']=False
            player['relationship_progressed']=False
            draw_count=2 if player['board']['main'] is None else 1
            drawn=player['deck'][:draw_count]
            del player['deck'][:draw_count]
            player['hand'].extend(drawn)
            after['game_state']['phase']='egg_exchange_choice' if draw_count==2 else 'normal_action'
            restart_124._append_transition(current,after,events,snapshots,
                'turn_start_and_egg_draw' if draw_count==2 else 'turn_start_and_draw',next_actor)
            current=after
            if draw_count!=2:
                reason={'code':'missing_current_normal_action_completeness'}
            else:
                hand=[{'card_copy_id':current['game_state']['cards'][instance]['card_copy_id'],
                       'card_id':current['game_state']['cards'][instance]['card_id'],
                       'initial_instance_id':instance} for instance in player['hand']]
                original=restart_124.load_sources()['stops'][path][0]
                decision=restart_124.restart_117.build_mandatory_choice_decision(
                    {'order_id':original['order_id']},next_actor,2,current['game_state']['round'],hand)
                decisions.append(decision)
                after=copy.deepcopy(current)
                player=after['game_state']['players'][next_actor]
                instance=decision['selected_action']['initial_instance_id']
                player['hand'].remove(instance)
                player['deck'].append(instance)
                after['game_state']['phase']='normal_action'
                restart_124._append_transition(current,after,events,snapshots,
                    'egg_exchange_bottom',next_actor,decision['selected_candidate'])
                current=after
                current_route={'path_id':path,'final_state':current,
                    'last_valid_event_seq':current['last_event_seq'],
                    'game_state_sha256':response_120.game_state_sha256(current['game_state']),
                    'continuation_state_sha256':current['continuation_state_sha256']}
                table=inputs['source_124']['candidate_table']
                next_audit=extension_125.audit_current(current_route,table)
                audits.append(next_audit)
                errors=extension_125.validate_current(next_audit,current_route,table)
                if errors:
                    raise ValueError('126 next current-state candidate audit differs: '+', '.join(errors))
                reason={'code':'incomplete_legal_candidates',
                        'contract_stop_codes':next_audit['contract_stop_codes']} if not next_audit['candidate_set_complete'] else \
                       {'code':'missing_next_normal_action_choice_proof'}
    return {'path_id':path,'source_stop_sha256':SOURCE_SHA[path],
            'source_125_terminal_continuation_sha256':source['continuation_state_sha256'],
            'corrected_125_terminal_continuation_sha256':corrected['continuation_state_sha256'],
            'status':'stopped_rules_adjudication','reason':reason,
            'last_valid_event_seq':current['last_event_seq'],
            'game_state_sha256':response_120.game_state_sha256(current['game_state']),
            'continuation_state_sha256':response_120.continuation_state_sha256(
                response_120._continuation_payload(current)),
            'final_state':current,'corrected_125_event':corrected['events'][-1],
            'audits':audits,'decisions':decisions,'events':events,'snapshots':snapshots,
            'winner':None,'seeded_fallback_used':source['seeded_fallback_used'] or any(
                x.get('resolution_mode')=='seeded_fallback' for x in decisions),
            'counts_as_independent_balance_sample':False}


def run_all(inputs: dict) -> dict:
    return {path:run_route(path,inputs) for path in inputs['stops']}


PLAN_FILE='proxy-current-turn-end-correction-plan-126-20260923.json'
EVALUATION_FILE='proxy-current-turn-end-correction-evaluation-126-20260923.json'
STOP_FOLDER='proxy-current-turn-end-stops-126'


def canonical_bytes(value: dict) -> bytes:
    return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')


def validate_outcomes(outcomes: dict, inputs: dict) -> list[str]:
    expected=run_all(inputs)
    if set(outcomes)!=set(expected):
        return ['route set differs']
    return [path+' rebuilt route differs' for path in expected
            if canonical_bytes(outcomes[path])!=canonical_bytes(expected[path])]


def build_plan(inputs: dict, outcomes: dict | None = None) -> dict:
    outcomes=outcomes if outcomes is not None else run_all(inputs)
    return {'schema':'naotocchi.card_game.proxy_current_turn_end_correction_plan.v1',
            'checkpoint':126,'protected_125_stop_raw_sha256':SOURCE_SHA,
            'status':'corrected_replay_preserves_125_raw',
            'source_contracts':[107,114,116,119,121,122,123,124,125],
            'routes':[{'path_id':path,'source_stop_sha256':SOURCE_SHA[path],
                       'source_125_continuation_sha256':row['source_125_terminal_continuation_sha256'],
                       'corrected_125_continuation_sha256':row['corrected_125_terminal_continuation_sha256'],
                       'last_valid_event_seq':row['last_valid_event_seq'],
                       'game_state_sha256':row['game_state_sha256'],
                       'continuation_state_sha256':row['continuation_state_sha256'],
                       'status':row['status'],'reason':row['reason'],
                       'decision_count':len(row['decisions']),'event_count':len(row['events']),
                       'snapshot_count':len(row['snapshots']),
                       'seeded_fallback_used':row['seeded_fallback_used'],
                       'counts_as_independent_balance_sample':row['counts_as_independent_balance_sample'],
                       'stop_file':f'{STOP_FOLDER}/stop-126-{path}.json'}
                      for path,row in outcomes.items()]}


def build_evaluation(plan: dict) -> dict:
    routes=plan['routes']
    return {'schema':'naotocchi.card_game.proxy_current_turn_end_correction_evaluation.v1',
            'checkpoint':126,'planned':len(routes),
            'completed':sum(x['status']=='completed' for x in routes),
            'rules_stop':sum(x['status']=='stopped_rules_adjudication' for x in routes),
            'decision':sum(x['decision_count'] for x in routes),
            'event':sum(x['event_count'] for x in routes),
            'snapshot':sum(x['snapshot_count'] for x in routes),
            'winner':0,'independent_balance_sample':sum(
                x['counts_as_independent_balance_sample'] for x in routes),
            'stop_codes':{code:sum(x['reason']['code']==code for x in routes)
                          for code in sorted({x['reason']['code'] for x in routes})}}


def expected_outputs(inputs: dict | None = None) -> dict[str,bytes]:
    inputs=inputs or load_sources()
    outcomes=run_all(inputs)
    plan=build_plan(inputs,outcomes)
    output={PLAN_FILE:canonical_bytes(plan),
            EVALUATION_FILE:canonical_bytes(build_evaluation(plan))}
    output.update({f'{STOP_FOLDER}/stop-126-{path}.json':canonical_bytes(row)
                   for path,row in outcomes.items() if row['status']!='completed'})
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
