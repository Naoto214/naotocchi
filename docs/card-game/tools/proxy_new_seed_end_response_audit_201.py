#!/usr/bin/env python3
"""Prove both reached end response windows have only pass."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_normal_pass_200 as prior
import proxy_new_seed_followup_response_194 as response
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='76cc5ea6c49748e9c8478c7a9182fb3591fff13ffdc1dcaa50628bb46a250279'
OUTPUT=ROOT/'data/proxy-new-seed-end-response-audit-201-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_end_response_audit_201.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('201 protected 200 state/event raw differs')
    source=json.loads(raw)
    if source['schema']!=prior.SCHEMA or len(source['results'])!=4 or \
            any(prior.validate_result(x) for x in source['results']):
        raise ValueError('201 source state proof differs')
    return source


def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state']
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:
        raise ValueError('201 current state/hash differs')
    if game['phase']=='turn_end_response':
        proof=response.audit_route(row)
        if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:
            raise ValueError('201 end response candidates differ')
        return {**base,'next_opportunity':'turn_end_response',
                'candidate_ids':copy.deepcopy(proof['candidate_ids']),
                'candidate_set_complete':True,
                'hand_conditional_exclusions':copy.deepcopy(proof['hand_conditional_exclusions']),
                'hand_other_exclusions':copy.deepcopy(proof['hand_other_exclusions']),
                'board_exclusions':copy.deepcopy(proof['board_exclusions'])}
    if game['phase']=='turn_end' and row['stop_reason_code']=='unproved_current_turn_end_provenance':
        return {**base,'next_opportunity':'turn_end_provenance',
                'candidate_ids':[],'candidate_set_complete':False,
                'hand_conditional_exclusions':[],
                'hand_other_exclusions':[],'board_exclusions':[]}
    raise ValueError('201 end opportunity unclassified')


def validate_result(result):
    try:
        source=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(source) else ['201 independent response audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or sum(x['next_opportunity']=='turn_end_response' for x in rows)!=2 or \
            any(validate_result(x) for x in rows):
        raise ValueError('201 end response proof differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('201 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('201: two end response opportunities pass-only, two turn ends held')


if __name__=='__main__':main()
