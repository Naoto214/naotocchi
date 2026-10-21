#!/usr/bin/env python3
"""Apply two unique response passes and retain two turn-end states."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_audit_249 as audits
import proxy_new_seed_followup_replay_248 as states
import proxy_new_seed_followup_replay_214 as precedent
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audits.OUTPUT
SOURCE_RAW_SHA256 = '2ecc8b70c369b6228cf1a49cd8e2330a8a725bb788fc6de44b845366fcbc1c7e'
OUTPUT = ROOT / 'data/proxy-new-seed-followup-replay-250-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_followup_replay_250.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = SOURCE.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('250 protected audit/state raw/canonical differs')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('250 four source proofs differ')
    return proofs, rows


def run_route(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (proof['path_id'], proof['source_last_valid_event_seq'],
         proof['source_game_state_sha256'], proof['source_continuation_state_sha256'])):
        raise ValueError('250 source boundary differs')
    if proof['next_opportunity'] == 'turn_end_provenance':
        if (row['final_continuation_state']['game_state']['phase'] != 'turn_end' or
                proof['provenance_pending'] is not True):
            raise ValueError('250 held turn-end proof differs')
        return {'path_id': row['path_id'],
                'source_last_valid_event_seq': row['last_valid_event_seq'],
                'source_game_state_sha256': row['final_game_state_sha256'],
                'source_continuation_state_sha256': row['final_continuation_state_sha256'],
                'last_valid_event_seq': row['last_valid_event_seq'],
                'final_game_state_sha256': row['final_game_state_sha256'],
                'final_continuation_state_sha256': row['final_continuation_state_sha256'],
                'final_continuation_state': copy.deepcopy(row['final_continuation_state']),
                'stop_reason_code': 'unproved_current_turn_end_provenance',
                'new_decisions': [], 'new_events': [], 'new_snapshots': [],
                'completed': False, 'balance_sample_count': 0}
    if (proof['next_opportunity'] not in ('turn_end_response', 'post_placement_response') or
            proof['candidate_ids'] != ['response-pass'] or
            proof['candidate_set_complete'] is not True):
        raise ValueError('250 response not uniquely pass')
    result = precedent.run_route(row, proof)
    if (len(result['new_events']) != 1 or
            result['new_events'][0]['action_type'] != 'response_pass' or
            result['last_valid_event_seq'] != row['last_valid_event_seq'] + 1):
        raise ValueError('250 response replay differs')
    return result


def validate_result(result):
    try:
        proofs, rows = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(row, proof):
            return ['250 independent replay differs']
        game, continuation = row['final_game_state_sha256'], row['final_continuation_state_sha256']
        for event, snap in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != row['last_valid_event_seq'] + 1 or
                    event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(snap['game_state']) != result['final_game_state_sha256'] or
                    start.canonical_sha256(snap['continuation_state']) != result['final_continuation_state_sha256']):
                return ['250 event/snapshot/hash chain differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    proofs, rows = load_sources()
    results = [run_route(row, next(x for x in proofs if x['path_id'] == row['path_id']))
               for row in rows]
    if (len(results) != 4 or sum(len(x['new_events']) for x in results) != 2 or
            any(validate_result(row) for row in results)):
        raise ValueError('250 four replay results differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 2,
            'new_events': 2, 'new_snapshots': 2,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('250 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('250: two unique response passes applied, two turn ends held')


if __name__ == '__main__':
    main()
