#!/usr/bin/env python3
"""Apply four unique response passes, including two turn-end closures."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_382 as audit
import proxy_new_seed_mixed_replay_381 as source
import proxy_new_seed_mixed_replay_379 as ordinary_pass
import proxy_new_seed_mixed_replay_290 as end_pass
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-382-20260929.json'
SOURCE_RAW_SHA256='169378bec3dba0cecb2c5656ffe57915829994a25ef0e8607ebd58c64be79ad3'
STATE_RAW_SHA256='49ba48872c54f43955e01196ada16d27d20e1b8a5c08dd55e3a0a280304af1fe'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_382.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()

def load_sources():
    raw,saved=audit.OUTPUT.read_bytes(),source.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest()!=STATE_RAW_SHA256 or
            raw!=audit.canonical_bytes(audit.build_report())):
        raise ValueError('382 protected audit/state differs')
    rows,proofs=json.loads(saved)['results'],json.loads(raw)['results']
    if len(rows)!=4 or len(proofs)!=4 or any(audit.audit_route(r)!=p for r,p in zip(rows,proofs)):
        raise ValueError('382 audited inventory differs')
    return rows,proofs

def run_route(row,proof):
    if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:
        raise ValueError('382 unique pass proof differs')
    if row['path_id'] in ('probe-01-a-first','probe-02-a-first'):
        if proof['next_opportunity']!='post_placement_response' or row['final_continuation_state']['return_target']!='normal_action_opportunity':
            raise ValueError('382 placement response differs')
        return ordinary_pass.run_route(row,proof)
    if row['path_id'] not in ('probe-01-b-first','probe-02-b-first') or proof['next_opportunity']!='turn_end_response':
        raise ValueError('382 end response differs')
    selected={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
              'source_game_state_sha256':row['final_game_state_sha256'],
              'source_continuation_state_sha256':row['final_continuation_state_sha256'],
              'candidate_ids':proof['candidate_ids'],'selected_candidate':'response-pass',
              'resolution_mode':'response_unique'}
    return end_pass.run_route(row,selected,proof)

def verify_result(row,proof,result):
    if result!=run_route(row,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
        raise ValueError('382 independent replay differs')
    event,shot=result['new_events'][0],result['new_snapshots'][0]
    if (event['seq']!=shot['event_seq'] or event['game_state_before_sha256']!=row['final_game_state_sha256'] or
            event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or
            event['game_state_after_sha256']!=shot['game_state_sha256'] or
            event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or
            start.opening._stop_state_sha256(shot['game_state'])!=result['final_game_state_sha256'] or
            start.canonical_sha256(shot['continuation_state'])!=result['final_continuation_state_sha256']):
        raise ValueError('382 event/snapshot/hash differs')

def build_report():
    rows,proofs=load_sources();results=[run_route(r,p) for r,p in zip(rows,proofs)]
    if len(results)!=4:raise ValueError('382 route inventory differs')
    for r,p,result in zip(rows,proofs,results):verify_result(r,p,result)
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'state_raw_sha256':STATE_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':4,'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':results}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('382 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('382: four unique response passes replayed')

if __name__=='__main__':main()
