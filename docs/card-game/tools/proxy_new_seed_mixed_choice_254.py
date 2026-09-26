#!/usr/bin/env python3
"""Compare the three mandatory egg decisions and one paid birth against pass."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_253 as audits
import proxy_new_seed_turn_end_replay_252 as states
import proxy_new_seed_mixed_choice_223 as normal_choice
import proxy_new_seed_egg_replay_205 as egg_choice
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audits.OUTPUT
SOURCE_RAW_SHA256 = 'e3349cb1091e2a9ccc9af10d266d17520c55c758b437ae82f4c3008c879c536b'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-254-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_254.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw = SOURCE.read_bytes()
    saved = states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('254 protected audit/state differs')
    proofs = json.loads(raw)['results']
    rows = json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('254 source integrity differs')
    return proofs, rows


def choose(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (
            proof['path_id'], proof['source_last_valid_event_seq'],
            proof['source_game_state_sha256'], proof['source_continuation_state_sha256']):
        raise ValueError('254 source boundary differs')
    base = {'path_id': row['path_id'], 'candidate_ids': proof['candidate_ids'],
            'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] == 'mandatory_egg_exchange':
        if not proof['candidate_set_complete'] or proof['resolution_mode'] != 'seeded_fallback':
            raise ValueError('254 mandatory choice not complete')
        decision = egg_choice.run_route(row)['new_decisions'][0]
        if (decision['legal_candidates'] != proof['candidate_ids'] or
                decision['legal_candidate_details'] != proof['legal_candidate_details'] or
                decision['resolution_mode'] != proof['resolution_mode'] or
                decision['selected_candidate'] not in proof['candidate_ids']):
            raise ValueError('254 saved mandatory seed differs')
        return {**base, 'selected_candidate': decision['selected_candidate'],
                'resolution_mode': decision['resolution_mode'],
                'selected_decision': decision, 'comparison': {'reason': 'mandatory_seeded_fallback'}}
    if proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete']:
        raise ValueError('254 normal candidate set differs')
    corrected = copy.deepcopy(row)
    corrected['stop_reason_code'] = 'unproved_current_normal_action_candidates'
    result = normal_choice.audit_route(corrected, proof)
    if (result['selected_candidate'] != 'pass' or
            result['comparison']['decided_at'] != 'time_after_certain_resolution'):
        raise ValueError('254 normal priority differs')
    return {**base, 'selected_candidate': result['selected_candidate'],
            'resolution_mode': result['resolution_mode'],
            'comparison': result['comparison'], 'priority_scores': result['priority_scores'],
            'source_references': result['source_references'],
            'reported_stop_reason_code': row['stop_reason_code'],
            'stop_label_correction': proof['stop_label_correction']}


def validate_result(result):
    try:
        proofs, rows = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['254 independent choice differs']
    except (ValueError, KeyError, TypeError, StopIteration, IndexError) as error:
        return [str(error)]


def build_report():
    proofs, rows = load_sources()
    result = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id']))
              for row in rows]
    if len(result) != 4 or any(validate_result(x) for x in result):
        raise ValueError('254 four choices differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 4,
            'completed': 0, 'new_events': 0, 'independent_balance_sample_count': 0,
            'results': result}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('254 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('254: three seeded egg selections and normal pass')


if __name__ == '__main__':
    main()
