#!/usr/bin/env python3
"""Apply four proved passes in placement, chain, and end windows."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_audit_213 as audits
import proxy_new_seed_choice_replay_212 as states
import proxy_new_seed_chain_pass_172 as chain_pass
import proxy_hit_blow_response_142 as chain
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='ca3d78c7379eb6135c7a2c5f6d6b7634a2298df75efc8d3dc95a59bf4a0c9086'
OUTPUT=ROOT/'data/proxy-new-seed-followup-replay-214-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_followup_replay_214.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('214 protected audit/state raw differs')
    proof=json.loads(raw);original=json.loads(saved)
    if proof['schema']!=audits.SCHEMA or original['schema']!=states.SCHEMA or \
            len(proof['results'])!=4 or len(original['results'])!=4 or \
            any(audits.validate_result(x) for x in proof['results']):
        raise ValueError('214 current response candidates differ')
    return proof,original


def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('214 source state/audit boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('214 current continuation differs')
    ctx=state['response_context'];actor=ctx['priority_actor'];phase=state['game_state']['phase']
    projected=copy.deepcopy(state)
    for excluded in proof['hand_conditional_exclusions']:
        projected['game_state']['players'][actor]['hand'].remove(excluded['source_instance_id'])
    player=projected['game_state']['players'][actor]['board']
    for excluded in proof['board_exclusions']:
        instance=excluded['source_instance_id']
        if instance in player['companions']:
            player['companions'].remove(instance)
        elif instance==player['partner']:
            player['partner']=None;player['partner_stage']=None
        else:raise ValueError('214 projected board exclusion identity differs')
    projected['game_state']['phase']='response_window'
    projected['response_context']['window_kind']='turn_start'
    chance=start.enumerate_opportunity(projected,actor,start.load_candidate_rows())
    if chance['legal_candidate_ids']!=proof['candidate_ids'] or \
            chance['excluded_candidates']!=proof['hand_other_exclusions'] or \
            proof['candidate_ids']!=['response-pass']:
        raise ValueError('214 current pass completeness differs')
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    chance['response_context']=copy.deepcopy(ctx)
    decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':state['game_state']['round'],
        'round':state['game_state']['round']},chance)
    if decision['selected_candidate']!='response-pass' or \
            decision['resolution_mode']!='response_unique':
        raise ValueError('214 unique pass selection differs')
    decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                     'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                     'event_seq':row['last_valid_event_seq']})
    if phase=='post_placement_response':
        after,event,_=start._pass(state,actor)
        reason='unproved_next_priority_response_candidates'
    elif phase=='response_window':
        after=copy.deepcopy(state)
        transitioned=chain._turn_start_transition(state,{'kind':'response_pass','actor':actor})
        if transitioned['chain_status']!='resolving' or \
                transitioned['resolution_order']!=ctx['chain_links'][::-1]:
            raise ValueError('214 chain reverse resolution differs')
        response._apply_transition_result(after,transitioned)
        after['last_event_seq']=state['last_event_seq']+1
        after['continuation_state_sha256']=start._hash(after)
        event={'seq':after['last_event_seq'],'action_type':'response_pass',
               'actor':actor,'selected_candidate':'response-pass',
               'game_state_before_sha256':row['final_game_state_sha256'],
               'game_state_after_sha256':start.opening._stop_state_sha256(after['game_state']),
               'continuation_state_before_sha256':row['final_continuation_state_sha256'],
               'continuation_state_after_sha256':after['continuation_state_sha256']}
        reason='unproved_current_board_ability_chain_resolution'
    elif phase=='turn_end_response':
        if ctx['consecutive_passes']!=1 or state['return_target']!='turn_end':
            raise ValueError('214 end response return differs')
        after,event=response.apply_response_pass(state,decision)
        if after['response_context']['consecutive_passes']!=2:
            raise ValueError('214 end response window not closed')
        after['game_state']['phase']='turn_end';after['return_target']='turn_end'
        after['continuation_state_sha256']=start._hash(after)
        event['game_state_after_sha256']=start.opening._stop_state_sha256(after['game_state'])
        event['continuation_state_after_sha256']=after['continuation_state_sha256']
        event['result']['return_target']='turn_end'
        event.pop('_snapshot_after',None)
        reason='unproved_current_turn_end_provenance'
    else:raise ValueError('214 current phase unclassified')
    normal._verify_step(state,after,[event])
    return {'path_id':row['path_id'],
            'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),
            'stop_reason_code':reason,'new_decisions':[decision],
            'new_events':[event],'new_snapshots':[chain_pass.snapshot(after)],
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        proofs,originals=load_sources()
        row=next(x for x in originals['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in proofs['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
            return ['214 independent replay differs']
        event=result['new_events'][0];snap=result['new_snapshots'][0]
        if event['seq']!=result['last_valid_event_seq'] or \
                event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['214 event/snapshot/hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proofs,originals=load_sources()
    rows=[run_route(row,next(x for x in proofs['results'] if x['path_id']==row['path_id']))
          for row in originals['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('214 mixed response replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':4,'new_events':4,
            'new_snapshots':4,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('214 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('214: 4 unique passes; one ability chain resolving, two turn ends')


if __name__=='__main__':main()
