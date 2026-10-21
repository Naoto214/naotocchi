#!/usr/bin/env python3
"""Resolve first response choices at four saved new-seed start windows."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_board_ability_id_167 as prior
import proxy_new_seed_start_audit_166 as audit
import proxy_new_seed_egg_restart_165 as states
import proxy_start_response_138 as start
import proxy_response_window_seeded_restart as response
import proxy_response_window_contract as contract
import proxy_normal_action_seeded_restart as normal

ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='5b0b64754493db94f601ac323a5c8cfe20179b857ff1801c4205b9346ad2ae38'
OUTPUT=ROOT/'data/proxy-new-seed-start-restart-168-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_start_restart_168.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('167 protected raw or replay differs')
    data=json.loads(raw)
    if data['schema']!=prior.SCHEMA or any(prior.validate_result(x) for x in data['results']):
        raise ValueError('167 full opportunity differs')
    return data


@lru_cache(maxsize=1)
def current_states():
    raw=states.OUTPUT.read_bytes()
    if raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('165 protected replay differs')
    data=json.loads(raw)
    if any(states.validate_result(x) for x in data['results']):
        raise ValueError('165 state/hash chain differs')
    return data['results']


@lru_cache(maxsize=1)
def classified_sources():
    raw=audit.OUTPUT.read_bytes()
    if raw!=audit.canonical_bytes(audit.build_report()):
        raise ValueError('166 protected opportunity replay differs')
    return json.loads(raw)['results']


def current(row):
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('165 continuation SHA differs')
    return state


def opportunity(state,proof,classification):
    actor=state['response_context']['priority_actor'];game=state['game_state']
    if not proof['candidate_set_complete'] or actor!=game['turn_player']:
        raise ValueError('168 incomplete first start opportunity')
    projected=copy.deepcopy(state)
    for exclusion in classification['hand_conditional_exclusions']:
        instance=exclusion['source_instance_id']
        if instance not in projected['game_state']['players'][actor]['hand']:
            raise ValueError('168 conditional hand source differs')
        projected['game_state']['players'][actor]['hand'].remove(instance)
    projected['game_state']['players'][actor]['board']['companions']=[]
    chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
    board=[]
    for detail in proof['board_candidate_details']:
        instance=detail['source_instance_id']
        if instance not in game['players'][actor]['board']['companions'] or \
                game['cards'][instance]['card_id']!=detail['card_id']:
            raise ValueError('168 board ability source differs')
        board.append({**detail,'card_copy_id':game['cards'][instance]['card_copy_id'],
                      'target_instance_ids':[],'candidate_variant':None,
                      'base_time_cost':0})
    chance['legal_candidate_details']=sorted(chance['legal_candidate_details']+board,
                                             key=lambda x:x['candidate_id'])
    chance['legal_candidate_ids']=[x['candidate_id'] for x in chance['legal_candidate_details']]
    chance['board_exclusions']=copy.deepcopy(classification['board_exclusions'])
    chance['hand_conditional_exclusions']=copy.deepcopy(classification['hand_conditional_exclusions'])
    chance['inspected_information']=contract._information_snapshot(game,actor)
    chance['source_references']=sorted({ref for x in chance['legal_candidate_details']
                                         for ref in x.get('source_references',[])})
    if chance['legal_candidate_ids']!=proof['candidate_ids']:
        raise ValueError('167 complete candidate IDs differ')
    return chance


def snapshot(state):
    return {'event_seq':state['last_event_seq'],'game_state':copy.deepcopy(state['game_state']),
            'game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'continuation_state':start._payload(state),
            'continuation_state_sha256':state['continuation_state_sha256']}


def run_route(row,proof,classification):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or row['path_id']!=classification['path_id']:
        raise ValueError('165/166/167 protected state differs')
    state=current(row);chance=opportunity(state,proof,classification)
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':1,
        'round':state['game_state']['round']},chance)
    decision['pre_game_state_sha256']=row['final_game_state_sha256']
    decision['pre_continuation_state_sha256']=row['final_continuation_state_sha256']
    decision['event_seq']=row['last_valid_event_seq']
    events=[];snaps=[]
    if decision['selected_candidate']=='response-pass':
        after,event,_=start._pass(state,decision['actor'])
        normal._verify_step(state,after,[event]);events=[event];snaps=[snapshot(after)];state=after
        reason='unproved_next_priority_response_candidates'
    else:
        reason='unproved_selected_board_ability_activation' if \
            decision['selected_action']['candidate_family']=='triggered_ability' else \
            'unproved_selected_quick_use_activation'
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':state['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256':state['continuation_state_sha256'],
            'final_continuation_state':start._payload(state),
            'stop_reason_code':reason,'new_decisions':[decision],
            'new_events':events,'new_snapshots':snaps,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        row=next(x for x in current_states() if x['path_id']==result['path_id'])
        proof=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        classification=next(x for x in classified_sources() if x['path_id']==result['path_id'])
        if result!=run_route(row,proof,classification) or result['last_valid_event_seq']!= \
                row['last_valid_event_seq']+len(result['new_events']):
            return ['168 independent choice differs']
        game=row['final_game_state_sha256'];cont=row['final_continuation_state_sha256']
        for event,snap in zip(result['new_events'],result['new_snapshots']):
            if event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                return ['168 event/snapshot hash chain differs']
            game=event['game_state_after_sha256'];cont=event['continuation_state_after_sha256']
        if game!=result['final_game_state_sha256'] or cont!=result['final_continuation_state_sha256']:
            return ['168 final hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as e:return [str(e)]


def build_report():
    rows=[run_route(row,proof,classification) for row,proof,classification in zip(
        current_states(),load_source()['results'],classified_sources())]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('168 response choice replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':sum(len(x['new_decisions']) for x in rows),
            'new_events':sum(len(x['new_events']) for x in rows),
            'new_snapshots':sum(len(x['new_snapshots']) for x in rows),
            'independent_balance_sample_count':0,'results':rows}


def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('168 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('168: four first start response choices, selected activations held')


if __name__=='__main__':main()
