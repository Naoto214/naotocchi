#!/usr/bin/env python3
"""Select the proved turn end and three unique response passes at 371."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_371 as audits
import proxy_new_seed_mixed_replay_370 as states
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-372-20260929.json'
SOURCE_RAW_SHA256='cc7e815a2ee7359fa0c311e5ce940f0028ae818b4801f040cb5f5c9753b85b85'
STATE_RAW_SHA256='60d17436aa5f9ab6165a427fffd32ac33230dde6247ae59468f53bbb50446656'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_choice_372.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw,saved=audits.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
        hashlib.sha256(saved).hexdigest()!=STATE_RAW_SHA256 or
        raw!=audits.canonical_bytes(audits.build_report()) or
        saved!=states.canonical_bytes(states.build_report())):
        raise ValueError('372 protected audit/state differs')
    proofs,rows=json.loads(raw)['results'],json.loads(saved)['results']
    if len(proofs)!=4 or len(rows)!=4 or any(audits.audit_route(r)!=p for r,p in zip(rows,proofs)):
        raise ValueError('372 audited inventory differs')
    return rows,proofs
def choose(row,proof):
    if ((row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],
         row['final_continuation_state_sha256'])!=
        (proof['path_id'],proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
         proof['source_continuation_state_sha256'])):
        raise ValueError('372 source boundary differs')
    path=row['path_id']
    base={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],
          'source_game_state_sha256':row['final_game_state_sha256'],
          'source_continuation_state_sha256':row['final_continuation_state_sha256'],
          'new_events':0,'completed':False,'balance_sample_count':0}
    if path=='probe-01-a-first':
        if (proof['next_opportunity']!='turn_end' or not proof['turn_end_set_complete'] or
            proof['contract_stop_codes'] or not all(proof['completeness_checks'].values())):
            raise ValueError('372 mandatory end proof differs')
        return {**base,'selected_candidate':'turn_end','resolution_mode':'mandatory_proved_end',
                'six_stage_checks':proof['completeness_checks']}
    if (path not in ('probe-01-b-first','probe-02-a-first','probe-02-b-first') or
        proof['next_opportunity'] not in ('response_window','turn_end_response') or
        proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']):
        raise ValueError('372 response choice differs')
    return {**base,'candidate_ids':proof['candidate_ids'],'selected_candidate':'response-pass',
            'resolution_mode':'response_unique'}
def build_report():
    rows,proofs=load_sources();results=[choose(r,p) for r,p in zip(rows,proofs)]
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'state_raw_sha256':STATE_RAW_SHA256,'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':results}
def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args()
    raw=canonical_bytes(build_report())
    if a.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('372 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('372: proved end and three unique response passes selected')
if __name__=='__main__':main()
