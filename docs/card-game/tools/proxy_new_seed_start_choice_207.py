#!/usr/bin/env python3
"""Select one board ability and apply three unique start response passes."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_start_audit_206 as audits
import proxy_new_seed_egg_replay_205 as states
import proxy_new_seed_start_choice_188 as precedent
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='1e26b1cb724151ec259336710c7fc2ca225c3d6b859b4392738daad3dc5d7707'
OUTPUT=ROOT/'data/proxy-new-seed-start-choice-207-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_start_choice_207.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()):
        raise ValueError('207 protected candidate/state raw differs')
    proof=json.loads(raw);source=json.loads(saved)
    if proof['schema']!=audits.SCHEMA or source['schema']!=states.SCHEMA or \
            len(proof['results'])!=4 or len(source['results'])!=4 or \
            any(audits.validate_result(x) for x in proof['results']):
        raise ValueError('207 source candidates differ')
    return proof,source


def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('207 saved state/audit boundary differs')
    state=copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state)!=state['continuation_state_sha256']:
        raise ValueError('207 source continuation differs')
    chance=precedent.opportunity(state,proof)
    order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
    decision=response.resolve_response_choice({'order_id':order,
        'actor_turn_index':state['game_state']['round'],'round':state['game_state']['round']},chance)
    decision.update({'pre_game_state_sha256':row['final_game_state_sha256'],
                     'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                     'event_seq':row['last_valid_event_seq']})
    events=[];shots=[]
    if decision['selected_candidate']=='response-pass':
        if proof['candidate_ids']!=['response-pass'] or decision['resolution_mode']!='response_unique':
            raise ValueError('207 pass not uniquely proved')
        after,event,_=start._pass(state,decision['actor'])
        normal._verify_step(state,after,[event]);events=[event];shots=[snapshots.snapshot(after)]
        reason='unproved_next_priority_response_candidates'
    elif decision['selected_action']['candidate_family']=='triggered_ability':
        if len(proof['board_candidate_details'])!=1 or \
                decision['selected_candidate']!=proof['board_candidate_details'][0]['candidate_id'] or \
                decision['resolution_mode']!='response_seeded_fallback':
            raise ValueError('207 board ability seeded choice differs')
        after=state;reason='unproved_selected_board_ability_activation'
    else:raise ValueError('207 selected response action unclassified')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),'stop_reason_code':reason,
            'new_decisions':[decision],'new_events':events,'new_snapshots':shots,
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        proofs,saved=load_sources()
        row=next(x for x in saved['results'] if x['path_id']==result['path_id'])
        proof=next(x for x in proofs['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row,proof) or \
                result['last_valid_event_seq']!=row['last_valid_event_seq']+len(result['new_events']):
            return ['207 independent start choice replay differs']
        for event,snap in zip(result['new_events'],result['new_snapshots']):
            if event['seq']!=result['last_valid_event_seq'] or \
                    event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                    event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
                return ['207 event/snapshot/hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    proofs,saved=load_sources()
    rows=[run_route(row,next(x for x in proofs['results'] if x['path_id']==row['path_id']))
          for row in saved['results']]
    if len(rows)!=4 or sum(len(x['new_events']) for x in rows)!=3 or \
            any(validate_result(x) for x in rows):
        raise ValueError('207 four start choices differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':4,'new_events':3,
            'new_snapshots':3,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('207 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('207: one seeded ability selected, three unique passes applied')


if __name__=='__main__':main()
