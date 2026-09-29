#!/usr/bin/env python3
"""Audit and apply the four unique response passes from checkpoint 378."""
import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))
import proxy_new_seed_mixed_audit_379 as audit
import proxy_new_seed_mixed_replay_378 as source
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-379-20260929.json'
SOURCE_RAW_SHA256 = '5a37fac18d46c5134f9645aa6f55b95aba7ecb39cee8758cbd755a29819e7898'
STATE_RAW_SHA256 = '9d2a82b3a51d538f1a1a904301f6236d5b22715accceb0454ff35638528944ae'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_379.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

def load_sources():
    raw, saved = audit.OUTPUT.read_bytes(), source.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audit.canonical_bytes(audit.build_report())):
        raise ValueError('379 protected audit/state differs')
    rows, proofs = json.loads(saved)['results'], json.loads(raw)['results']
    if len(rows) != 4 or len(proofs) != 4 or any(audit.audit_route(r) != p for r, p in zip(rows, proofs)):
        raise ValueError('379 candidate inventory differs')
    return rows, proofs

def run_route(row, proof):
    path = row['path_id']
    if ((path,row['last_valid_event_seq'],row['final_game_state_sha256'],row['final_continuation_state_sha256']) !=
            (proof['path_id'],proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
             proof['source_continuation_state_sha256']) or
            proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']):
        raise ValueError('379 unique pass boundary differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('379 source state/hash differs')
    actor = before['response_context']['priority_actor']
    after, event, _ = start._pass(before, actor)
    normal._verify_step(before, after, [event])
    decision = {'decision_kind':'response','selected_candidate':'response-pass',
                'resolution_mode':'response_unique','actor':actor,
                'pre_game_state_sha256':row['final_game_state_sha256'],
                'pre_continuation_state_sha256':row['final_continuation_state_sha256'],
                'event_seq':row['last_valid_event_seq']}
    result = {'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],
              'source_game_state_sha256':row['final_game_state_sha256'],
              'source_continuation_state_sha256':row['final_continuation_state_sha256'],
              'last_valid_event_seq':after['last_event_seq'],
              'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
              'final_continuation_state_sha256':after['continuation_state_sha256'],
              'final_continuation_state':start._payload(after),
              'stop_reason_code':'unproved_next_priority_response_candidates',
              'new_decisions':[decision],'new_events':[event], 'new_snapshots':[snapshots.snapshot(after)],
              'completed':False,'balance_sample_count':0}
    shot = result['new_snapshots'][0]
    if (event['seq'] != row['last_valid_event_seq'] + 1 or event['seq'] != shot['event_seq'] or
            event['game_state_before_sha256'] != row['final_game_state_sha256'] or
            event['continuation_state_before_sha256'] != row['final_continuation_state_sha256'] or
            event['game_state_after_sha256'] != shot['game_state_sha256'] or
            event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
            start.opening._stop_state_sha256(shot['game_state']) != result['final_game_state_sha256'] or
            start.canonical_sha256(shot['continuation_state']) != result['final_continuation_state_sha256']):
        raise ValueError('379 event/snapshot/hash differs')
    return result

def build_report():
    rows, proofs = load_sources()
    results = [run_route(row, proof) for row, proof in zip(rows, proofs)]
    if len(results) != 4 or any(run_route(row, proof) != result for row, proof, result in zip(rows,proofs,results)):
        raise ValueError('379 replay differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'state_raw_sha256':STATE_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':4,'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':results}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('379 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('379: four unique response passes audited and replayed')

if __name__ == '__main__': main()
