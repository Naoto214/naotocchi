#!/usr/bin/env python3
"""Apply mandatory seeded egg choices on two reached routes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_replay_220 as states
import proxy_new_seed_egg_replay_205 as precedent
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='f115857ea938f9d74fc33acfddb44835adf20b02004ba5cf893ecb6022b13e54'
OUTPUT=ROOT/'data/proxy-new-seed-egg-replay-221-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_egg_replay_221.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('221 protected 220 raw/replay differs')
    data=json.loads(raw)
    if data['schema']!=states.SCHEMA or len(data['results'])!=4 or \
            any(states.validate_result(x) for x in data['results']):
        raise ValueError('221 saved state/hash differs')
    return data


def run_route(row):
    if row['stop_reason_code']=='unproved_current_egg_exchange_choice':
        result=precedent.run_route(row)
        if result['stop_reason_code']!='unproved_next_turn_start_response_candidates' or \
                len(result['new_decisions'])!=len(result['new_events'])!=1:
            raise ValueError('221 egg exchange outcome differs')
        return result
    if row['stop_reason_code'] not in ('unproved_post_placement_response_candidates',
                                       'unproved_current_normal_action_candidates'):
        raise ValueError('221 held route unclassified')
    state=copy.deepcopy(row['final_continuation_state'])
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(state['game_state'])!=row['final_game_state_sha256']:
        raise ValueError('221 held state/hash differs')
    return {'path_id':row['path_id'],
            'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':row['last_valid_event_seq'],
            'final_game_state_sha256':row['final_game_state_sha256'],
            'final_continuation_state_sha256':row['final_continuation_state_sha256'],
            'final_continuation_state':state,'stop_reason_code':row['stop_reason_code'],
            'new_decisions':[],'new_events':[],'new_snapshots':[],
            'completed':False,'balance_sample_count':0}


def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        if result!=run_route(row) or \
                result['last_valid_event_seq']!=row['last_valid_event_seq']+len(result['new_events']):
            return ['221 independent replay differs']
        for event,snap in zip(result['new_events'],result['new_snapshots']):
            if event['seq']!=result['last_valid_event_seq'] or \
                    event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                    event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
                return ['221 event/snapshot/hash differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[run_route(row) for row in load_source()['results']]
    if len(rows)!=4 or sum(len(x['new_events']) for x in rows)!=2 or \
            any(validate_result(x) for x in rows):
        raise ValueError('221 two egg exchanges differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':2,'new_events':2,
            'new_snapshots':2,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('221 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('221: two seeded egg choices, two held routes')


if __name__=='__main__':main()
