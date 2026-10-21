#!/usr/bin/env python3
"""Audit both reached normal opportunities under the existing board scope."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_pass_197 as prior
import proxy_new_seed_normal_trigger_audit_146 as normal
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=prior.OUTPUT
SOURCE_RAW_SHA256='3e134e8b3674e6490a95b66ca3af7978ed84e09329ab6e297f9d53fd888b70f4'
OUTPUT=ROOT/'data/proxy-new-seed-normal-audit-198-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_normal_audit_198.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('198 protected 197 raw/replay differs')
    data=json.loads(raw)
    if data['schema']!=prior.SCHEMA or len(data['results'])!=4 or \
            any(prior.validate_result(x) for x in data['results']):
        raise ValueError('198 source state/event hash differs')
    return data


def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state']
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:
        raise ValueError('198 saved state/hash differs')
    if game['phase']=='normal_action':
        result=normal.audit_route(row)
        if not result['candidate_set_complete'] or \
                not all(result['completeness_checks'].values()) or \
                len(result['board_response_exclusions'])!=1 or \
                any(x['reason_codes']!=['timing_not_normal_action'] or x['candidate_id'] is not None
                    for x in result['board_response_exclusions']):
            raise ValueError('198 normal action candidate completeness differs')
        return {**base,'next_opportunity':'normal_action',
                'candidate_ids':copy.deepcopy(result['candidate_ids']),
                'legal_candidate_details':copy.deepcopy(result['legal_candidate_details']),
                'candidate_set_complete':True,
                'completeness_checks':copy.deepcopy(result['completeness_checks']),
                'board_response_exclusions':copy.deepcopy(result['board_response_exclusions'])}
    if game['phase']=='turn_end' and row['stop_reason_code']=='unproved_current_turn_end_provenance':
        return {**base,'next_opportunity':'turn_end_provenance',
                'candidate_ids':[],'candidate_set_complete':False,
                'completeness_checks':{},'board_response_exclusions':[],
                'legal_candidate_details':[]}
    raise ValueError('198 current opportunity unclassified')


def validate_result(result):
    try:
        source=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(source) else ['198 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or sum(x['next_opportunity']=='normal_action' for x in rows)!=2 or \
            any(validate_result(x) for x in rows):
        raise ValueError('198 current normal action proof differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('198 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('198: two complete normal candidate sets, two held turn ends')


if __name__=='__main__':main()
