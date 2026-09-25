#!/usr/bin/env python3
"""Audit normal actions and the active chain at the 227 saved boundary."""
import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_current_replay_227 as states
import proxy_new_seed_chain_normal_audit_210 as precedent
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='17a5daa3bbc063d594921fbc8ce7331dadb9be4dec3da75afab322fbf1e490bf'
OUTPUT=ROOT/'data/proxy-new-seed-normal-audit-228-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_normal_audit_228.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('228 protected 227 state raw/canonical differs')
    data=json.loads(raw)
    if len(data['results'])!=4 or any(states.validate_result(x) for x in data['results']):
        raise ValueError('228 saved state integrity differs')
    return data

def audit_route(row):
    state=row['final_continuation_state'];game=state['game_state']
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:
        raise ValueError('228 source state hash differs')
    proof=precedent.audit_route(row)
    if not proof['candidate_set_complete'] or \
            (proof['next_opportunity']=='normal_action' and
             not all(proof['completeness_checks'].values())):
        raise ValueError('228 opportunity incomplete')
    if (proof['path_id'],proof['source_last_valid_event_seq'],
            proof['source_game_state_sha256'],proof['source_continuation_state_sha256']) != \
            (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
             row['final_continuation_state_sha256']):
        raise ValueError('228 enumerated boundary differs')
    return proof

def validate_result(result):
    try:
        row=next(x for x in load_source()['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row) else ['228 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration,IndexError) as error:return [str(error)]

def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or sum(x['next_opportunity']=='normal_action' for x in rows)!=3 or \
            any(validate_result(x) for x in rows):
        raise ValueError('228 four opportunities differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('228 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('228: three normal actions and one chain response complete')
if __name__=='__main__':main()
