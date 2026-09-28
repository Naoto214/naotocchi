#!/usr/bin/env python3
"""Choose the four audited opportunities after 358."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_358 as audits
import proxy_new_seed_mixed_replay_357 as states
import proxy_new_seed_egg_replay_205 as egg

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-359-20260929.json'
SOURCE_RAW_SHA256='a4e21b661a6428323c7a7fb8917870ce423a5d194d2a3bd42c5ca872a74faa75'
STATE_RAW_SHA256='366224785a8f0e65f227797ea1ad020447ddb2577bd663c846da30f60d8cf404'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_choice_359.v1'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw,saved=audits.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest()!=STATE_RAW_SHA256 or
            raw!=audits.canonical_bytes(audits.build_report()) or
            saved!=states.canonical_bytes(states.build_report())):
        raise ValueError('359 protected audit/state differs')
    proofs,rows=json.loads(raw)['results'],json.loads(saved)['results']
    if len(proofs)!=4 or len(rows)!=4 or any(audits.audit_route(r)!=p for r,p in zip(rows,proofs)):
        raise ValueError('359 audited candidate inventory differs')
    return rows,proofs
def choose(row,proof):
    if ((row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
         row['final_continuation_state_sha256'])!=
        (proof['path_id'],proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
         proof['source_continuation_state_sha256'])):
        raise ValueError('359 source boundary differs')
    path=row['path_id']
    base={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if path=='probe-01-a-first':
        if (proof['next_opportunity']!='post_placement_response' or
                proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']):
            raise ValueError('359 unique placement response differs')
        return {**base,'candidate_ids':proof['candidate_ids'],
                'selected_candidate':'response-pass','resolution_mode':'response_unique'}
    if path=='probe-01-b-first':
        if (proof['next_opportunity']!='turn_end' or not proof['turn_end_set_complete'] or
                proof['contract_stop_codes'] or not all(proof['completeness_checks'].values())):
            raise ValueError('359 mandatory turn end differs')
        return {**base,'selected_candidate':'turn_end','resolution_mode':'mandatory_proved_end',
                'six_stage_checks':proof['completeness_checks']}
    if path not in ('probe-02-a-first','probe-02-b-first') or proof['next_opportunity']!='mandatory_egg_exchange' or not proof['candidate_set_complete'] or proof['resolution_mode']!='seeded_fallback':
        raise ValueError('359 mandatory egg inventory differs')
    decision=egg.run_route(row)['new_decisions'][0]
    if (decision['legal_candidates']!=proof['candidate_ids'] or
            decision['legal_candidate_details']!=proof['legal_candidate_details'] or
            decision['resolution_mode']!='seeded_fallback' or
            decision['selected_candidate'] not in proof['candidate_ids']):
        raise ValueError('359 seeded egg resolution differs')
    return {**base,'candidate_ids':proof['candidate_ids'],
            'selected_candidate':decision['selected_candidate'],
            'resolution_mode':'seeded_fallback','selected_decision':decision}
def build_report():
    rows,proofs=load_sources()
    results=[choose(r,p) for r,p in zip(rows,proofs)]
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'state_raw_sha256':STATE_RAW_SHA256,'planned':4,'completed':0,
            'new_events':0,'independent_balance_sample_count':0,'results':results}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('359 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('359: response pass, proved end and two seeded eggs chosen')
if __name__=='__main__':main()
