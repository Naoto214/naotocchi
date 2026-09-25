#!/usr/bin/env python3
"""Reuse the generic 116 egg-choice runner from four saved next turns."""

import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_replay_185 as states
import proxy_new_seed_egg_restart_165 as prior
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='1ef2e09e75ce90901d7d5ff3167f4b6bb02b71886e8f865b52f3dbc76e6211b3'
OUTPUT=ROOT/'data/proxy-new-seed-egg-exchange-replay-186-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_egg_exchange_replay_186.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256:
        raise ValueError('185 protected raw differs')
    data=json.loads(raw)
    if data['schema']!=states.SCHEMA or len(data['results'])!=4 or \
            any(states.validate_result(x) for x in data['results']):
        raise ValueError('185 saved state/hash differs')
    return data


def run_route(row):
    result=prior.run_route(row)
    if result['new_decisions'][0]['resolution_mode']!='seeded_fallback' or \
            result['balance_sample_count']!=0 or result['completed'] or \
            len(result['new_events'])!=1 or \
            result['final_continuation_state']['game_state']['phase']!='response_window':
        raise ValueError('186 seeded fallback or next response boundary differs')
    return result


def validate_result(result):
    try:
        original=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        if result!=run_route(original) or \
                result['last_valid_event_seq']!=original['last_valid_event_seq']+1:
            return ['186 independent replay differs']
        event=result['new_events'][0];snap=result['new_snapshots'][0]
        if event['seq']!=result['last_valid_event_seq'] or \
                event['game_state_before_sha256']!=original['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=original['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['186 event/snapshot/hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[run_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('186 egg exchange replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_decisions':4,'new_events':4,
            'new_snapshots':4,'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('186 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('186: 4 seeded egg exchanges, 0 independent balance samples')


if __name__=='__main__':main()
