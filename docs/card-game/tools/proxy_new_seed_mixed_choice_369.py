#!/usr/bin/env python3
"""Choose two unique response passes and two paid-action comparisons."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_correction_368 as audits
import proxy_new_seed_mixed_replay_366 as states
import proxy_new_seed_normal_choice_229 as paid
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-369-20260929.json'
SOURCE_RAW_SHA256='f9feed9822774dfeaeb1719645bab9f6e46d065a052ffc0d413f3f0792c05b9f'
STATE_RAW_SHA256='4e34c2df05979c9625720f22eb031003cc3d0db30e6d43cd1e4ee51f394ce2fc'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_choice_369.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw,saved=audits.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
        hashlib.sha256(saved).hexdigest()!=STATE_RAW_SHA256):
        raise ValueError('369 protected audit/state differ')
    rebuilt=audits.build_report()
    if raw!=audits.canonical_bytes(rebuilt): raise ValueError('369 canonical correction differs')
    proofs,rows=json.loads(raw)['results'],json.loads(saved)['results']
    if len(proofs)!=4 or len(rows)!=4 or rebuilt['results']!=proofs:
        raise ValueError('369 candidate inventory differs')
    return rows,proofs
def choose(row,proof):
    if ((row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
         row['final_continuation_state_sha256'])!=
        (proof['path_id'],proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
         proof['source_continuation_state_sha256']) or not proof['candidate_set_complete']):
        raise ValueError('369 source boundary differs')
    base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'candidate_ids':proof['candidate_ids'],'new_events':0,'completed':False,'balance_sample_count':0}
    if row['path_id'] in ('probe-01-a-first','probe-01-b-first'):
        if proof['next_opportunity'] not in ('response_window','turn_end_response') or proof['candidate_ids']!=['response-pass']:
            raise ValueError('369 response unique candidate differs')
        return {**base,'selected_candidate':'response-pass','resolution_mode':'response_unique','paid_comparisons':[]}
    if row['path_id'] not in ('probe-02-a-first','probe-02-b-first') or proof['next_opportunity']!='normal_action':
        raise ValueError('369 normal opportunity differs')
    decision=paid.audit_route(row,proof)
    if (decision['selected_candidate']!='pass' or decision['resolution_mode']!='priority_unique' or
        len(decision['paid_comparisons'])!=(1 if row['path_id']=='probe-02-a-first' else 0)):
        raise ValueError('369 paid choice differs')
    return decision
def build_report():
    rows,proofs=load_sources();results=[choose(r,p) for r,p in zip(rows,proofs)]
    if sum(x['selected_candidate']=='pass' for x in results)!=2:raise ValueError('369 choice inventory differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'state_raw_sha256':STATE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':results}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('369 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('369: two response passes and two normal passes selected')
if __name__=='__main__':main()
