#!/usr/bin/env python3
"""Apply checkpoint 369's four passes to the protected 366 states."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))
import proxy_new_seed_mixed_choice_369 as choices
import proxy_new_seed_mixed_audit_correction_368 as audits
import proxy_new_seed_mixed_replay_366 as states
import proxy_new_seed_mixed_replay_348 as first_chain_pass
import proxy_new_seed_mixed_replay_290 as normal_pass
import proxy_new_seed_mixed_replay_357 as end_pass
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-370-20260929.json'
SOURCE_RAW_SHA256 = 'b886dbe495790f56e40df87e59240d86894e7b784eeb2cbeda13ee6854f7e273'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_370.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw, audited, saved = choices.OUTPUT.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audited).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != choices.STATE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audited != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('370 protected choice/audit/state differs')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']

def run_route(row, selected, proof):
    path = row['path_id']
    if ((path, row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (selected['path_id'], selected['source_last_valid_event_seq'],
         selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            selected['candidate_ids'] != proof['candidate_ids'] or not proof['candidate_set_complete']):
        raise ValueError('370 source/candidate boundary differs')
    if path == 'probe-01-a-first':
        if proof['next_opportunity'] != 'turn_end_response' or selected['selected_candidate'] != 'response-pass':
            raise ValueError('370 end response choice differs')
        projected = ({**row, 'path_id': 'probe-01-b-first'},
                     {**selected, 'path_id': 'probe-01-b-first'},
                     {**proof, 'path_id': 'probe-01-b-first'})
        result = end_pass.run_route(*projected)
    elif path == 'probe-01-b-first':
        if proof['next_opportunity'] != 'response_window' or selected['selected_candidate'] != 'response-pass':
            raise ValueError('370 chain response choice differs')
        projected = ({**row, 'path_id': 'probe-01-a-first'},
                     {**selected, 'path_id': 'probe-01-a-first'},
                     {**proof, 'path_id': 'probe-01-a-first'})
        result = first_chain_pass.run_route(*projected)
    elif path in ('probe-02-a-first', 'probe-02-b-first'):
        if proof['next_opportunity'] != 'normal_action' or selected['selected_candidate'] != 'pass':
            raise ValueError('370 normal pass choice differs')
        result = normal_pass.run_route(row, selected, proof)
    else:
        raise ValueError('370 unexpected path')
    return {**result, 'path_id': path}

def validate_result(result):
    try:
        rows, selected, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        choice = next(x for x in selected if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(row, choice, proof) or result['last_valid_event_seq'] != row['last_valid_event_seq'] + 1:
            return ['370 replay differs']
        event, shot = result['new_events'][0], result['new_snapshots'][0]
        if (event['seq'] != shot['event_seq'] or
                event['game_state_before_sha256'] != row['final_game_state_sha256'] or
                event['continuation_state_before_sha256'] != row['final_continuation_state_sha256'] or
                event['game_state_after_sha256'] != shot['game_state_sha256'] or
                event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256'] or
                (shot['game_state_sha256'], shot['continuation_state_sha256']) !=
                (result['final_game_state_sha256'], result['final_continuation_state_sha256'])):
            return ['370 event/snapshot/hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]

def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('370 four transitions differ: ' + repr([validate_result(x) for x in results]))
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 4,
            'completed': 0, 'new_decisions': 4, 'new_events': 4, 'new_snapshots': 4,
            'independent_balance_sample_count': 0, 'results': results}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('370 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('370: four selected passes replayed')

if __name__ == '__main__':
    main()
