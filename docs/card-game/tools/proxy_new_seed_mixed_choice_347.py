#!/usr/bin/env python3
"""Select the unique legal response at each 346 opportunity."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_346 as audits
import proxy_new_seed_mixed_replay_345 as states
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-347-20260928.json'
SOURCE_RAW_SHA256='24b570a2f344d6aeae85549ba3b13767039f32fdc523944821512822b4590888'
STATE_RAW_SHA256='43af5f0efa55cc3b0bd8b74fed9f0bfd062cfcce7b1e061b88645ce2452c7b70'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_choice_347.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw,saved=audits.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
        hashlib.sha256(saved).hexdigest()!=STATE_RAW_SHA256 or
        raw!=audits.canonical_bytes(audits.build_report()) or
        saved!=states.canonical_bytes(states.build_report())):
        raise ValueError('347 protected audit/state differs')
    proofs,rows=json.loads(raw)['results'],json.loads(saved)['results']
    if len(proofs)!=4 or len(rows)!=4 or any(audits.audit_route(r)!=p for r,p in zip(rows,proofs)):
        raise ValueError('347 candidate inventory differs')
    return rows,proofs
def choose(row,proof):
    if ((row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (proof['path_id'],proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
         proof['source_continuation_state_sha256']) or
        not proof['candidate_set_complete'] or proof['candidate_ids']!=['response-pass'] or
        proof['next_opportunity'] not in ('response_window','post_placement_response')):
        raise ValueError('347 unique response boundary differs')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'candidate_ids':proof['candidate_ids'],'selected_candidate':'response-pass',
            'resolution_mode':'response_unique','new_events':0,'completed':False,
            'balance_sample_count':0}
def build_report():
    rows,proofs=load_sources();results=[choose(r,p) for r,p in zip(rows,proofs)]
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'state_raw_sha256':STATE_RAW_SHA256,'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':results}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('347 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('347: four unique response passes selected')
if __name__=='__main__':main()
