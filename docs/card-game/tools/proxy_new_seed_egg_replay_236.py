#!/usr/bin/env python3
"""Apply three seeded mandatory egg choices from the saved 235 audit."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_audit_235 as audits
import proxy_new_seed_mixed_replay_234 as states
import proxy_new_seed_egg_replay_205 as precedent
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='46b452d7ddb0d7940cedab9f2c0ef6715af95a7d2da7dd17d1ceeeb75cd9f685'
OUTPUT=ROOT/'data/proxy-new-seed-egg-replay-236-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_egg_replay_236.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('236 protected audit/state differs')
    proof=json.loads(raw)['results'];rows=json.loads(saved)['results']
    if len(proof)!=len(rows)!=4 or any(audits.validate_result(x) for x in proof):
        raise ValueError('236 protected candidate integrity differs')
    return proof,rows

def run_route(row,proof):
    if (row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['path_id'],
            proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']) or not proof['candidate_set_complete']:
        raise ValueError('236 candidate/state boundary differs')
    if proof['next_opportunity']=='mandatory_egg_exchange':
        result=precedent.run_route(row)
        decision=result['new_decisions'][0]
        if proof['candidate_ids']!=decision['legal_candidates'] or \
                proof['legal_candidate_details']!=decision['legal_candidate_details'] or \
                result['stop_reason_code']!='unproved_next_turn_start_response_candidates' or \
                len(result['new_events'])!=1:
            raise ValueError('236 seeded egg choice differs')
        return result
    if proof['next_opportunity']!='normal_action' or \
            row['stop_reason_code']!='unproved_current_normal_action_candidates':
        raise ValueError('236 held normal action differs')
    state=copy.deepcopy(row['final_continuation_state'])
    if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or \
            start.opening._stop_state_sha256(state['game_state'])!=row['final_game_state_sha256']:
        raise ValueError('236 held state hash differs')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
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
        proofs,rows=load_sources()
        row=next(x for x in rows if x['path_id']==result['path_id'])
        proof=next(x for x in proofs if x['path_id']==result['path_id'])
        if result!=run_route(row,proof):return ['236 independent replay differs']
        game=row['final_game_state_sha256'];cont=row['final_continuation_state_sha256']
        for idx,(event,snap) in enumerate(zip(result['new_events'],result['new_snapshots']),1):
            if event['seq']!=row['last_valid_event_seq']+idx or \
                    event['game_state_before_sha256']!=game or \
                    event['continuation_state_before_sha256']!=cont or \
                    event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state'])!=snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state'])!=snap['continuation_state_sha256']:
                return ['236 event/snapshot/hash differs']
            game=event['game_state_after_sha256'];cont=event['continuation_state_after_sha256']
        return [] if (game,cont)==(result['final_game_state_sha256'],
                                   result['final_continuation_state_sha256']) else ['236 final hash differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]

def build_report():
    proofs,rows=load_sources()
    result=[run_route(row,next(x for x in proofs if x['path_id']==row['path_id']))
            for row in rows]
    if len(result)!=4 or sum(len(x['new_events']) for x in result)!=3 or \
            any(validate_result(x) for x in result):
        raise ValueError('236 egg replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_decisions':3,'new_events':3,'new_snapshots':3,
            'independent_balance_sample_count':0,'results':result}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('236 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('236: three seeded egg exchanges applied; one normal held')
if __name__=='__main__':main()
