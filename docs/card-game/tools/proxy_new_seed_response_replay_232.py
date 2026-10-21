#!/usr/bin/env python3
"""Apply four pass-only response windows from checkpoint 231."""
import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_response_audit_231 as audits
import proxy_new_seed_normal_replay_230 as states
import proxy_new_seed_followup_replay_214 as precedent
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE=audits.OUTPUT
SOURCE_RAW_SHA256='92f3f5f76de59c8accfb5fcac4b0f7cdcfe99c3301be6f3e1f41388168178837'
OUTPUT=ROOT/'data/proxy-new-seed-response-replay-232-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_response_replay_232.v1'

def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();saved=states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest()!=audits.SOURCE_RAW_SHA256 or \
            raw!=audits.canonical_bytes(audits.build_report()) or \
            saved!=states.canonical_bytes(states.build_report()):
        raise ValueError('232 protected audit/state differs')
    proofs=json.loads(raw)['results'];rows=json.loads(saved)['results']
    if len(proofs)!=len(rows)!=4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('232 source inventory differs')
    return proofs,rows

def run_route(row,proof):
    if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:
        raise ValueError('232 response not unique')
    result=precedent.run_route(row,proof)
    if result['new_events'][0]['action_type']!='response_pass' or \
            result['last_valid_event_seq']!=row['last_valid_event_seq']+1:
        raise ValueError('232 response transition differs')
    return result

def validate_result(result):
    try:
        proofs,rows=load_sources()
        row=next(x for x in rows if x['path_id']==result['path_id'])
        proof=next(x for x in proofs if x['path_id']==result['path_id'])
        if result!=run_route(row,proof):return ['232 independent response replay differs']
        event=result['new_events'][0];snap=result['new_snapshots'][0]
        if event['seq']!=row['last_valid_event_seq']+1 or \
                event['game_state_before_sha256']!=row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256']!=snap['game_state_sha256'] or \
                event['continuation_state_after_sha256']!=snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state'])!=result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state'])!=result['final_continuation_state_sha256']:
            return ['232 event/snapshot/hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]

def build_report():
    proofs,rows=load_sources()
    result=[run_route(row,next(x for x in proofs if x['path_id']==row['path_id']))
            for row in rows]
    if len(result)!=4 or any(validate_result(r) for r in result):
        raise ValueError('232 four response passes differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_decisions':4,'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':result}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('232 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('232: four unique response passes applied')
if __name__=='__main__':main()
