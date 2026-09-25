#!/usr/bin/env python3
"""Reconstruct four response opportunities from saved 230 states."""
import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_normal_replay_230 as states
import proxy_new_seed_followup_audit_213 as precedent
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='b769b93b4391200b2da3fa7f77a2ce0e4763130d9ae27492e17eb8e3584d8979'
OUTPUT=ROOT/'data/proxy-new-seed-response-audit-231-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_response_audit_231.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('231 protected 230 raw/canonical differs')
    data=json.loads(raw)
    if len(data['results'])!=4 or any(states.validate_result(r) for r in data['results']):
        raise ValueError('231 saved state integrity differs')
    return data

def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(game)!=row['final_game_state_sha256'] or \
            game['phase'] not in ('response_window','turn_end_response') or \
            len(row['new_events'])!=1:
        raise ValueError('231 saved response boundary differs')
    proof=precedent.audit_route(row)
    if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:
        raise ValueError('231 response candidates incomplete')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'phase':game['phase'],'consecutive_passes':ctx['consecutive_passes'],
            'candidate_ids':proof['candidate_ids'],'candidate_set_complete':True,
            'board_exclusions':proof['board_exclusions'],
            'hand_conditional_exclusions':proof['hand_conditional_exclusions'],
            'hand_other_exclusions':proof['hand_other_exclusions'],
            'new_events':0,'completed':False,'balance_sample_count':0}

def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row) else ['231 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]

def build_report():
    rows=[audit_route(r) for r in load_source()['results']]
    if len(rows)!=4 or any(validate_result(r) for r in rows):
        raise ValueError('231 response inventory differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('231 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('231: four response opportunities pass-only')
if __name__=='__main__':main()
