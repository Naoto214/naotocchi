#!/usr/bin/env python3
"""Choose the four responses using the saved complete opportunity audit."""
import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_265 as audits
import proxy_new_seed_mixed_replay_264 as states
import proxy_new_seed_start_choice_188 as precedent
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audits.OUTPUT
SOURCE_RAW_SHA256 = '46cceb8093032510711392ac85aa3f3273d514430d31549200f3b9ddb5a56bc0'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-266-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_266.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, prior = SOURCE.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(prior).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            prior != states.canonical_bytes(states.build_report())):
        raise ValueError('266 audit/state raw or canonical differs')
    proofs, rows = json.loads(raw)['results'], json.loads(prior)['results']
    if len(rows) != 4 or len(proofs) != 4 or any(audits.validate_result(row) for row in proofs):
        raise ValueError('266 protected source differs')
    return rows, proofs


def choose(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (
            proof['path_id'], proof['source_last_valid_event_seq'],
            proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or not proof['candidate_set_complete']:
        raise ValueError('266 choice boundary differs')
    base = {'path_id': row['path_id'], 'candidate_ids': proof['candidate_ids'],
            'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if proof['candidate_ids'] == ['response-pass']:
        return {**base, 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique',
                'comparison': {'reason': 'only_complete_legal_candidate'}}
    if (row['path_id'] != 'probe-02-b-first' or proof['next_opportunity'] != 'response_window' or
            proof['candidate_ids'] != ['response-pass', 'response-use-item-A-033#1']):
        raise ValueError('266 multiple candidate response boundary differs')
    state = dict(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != row['final_continuation_state_sha256']:
        raise ValueError('266 seeded response state differs')
    extended = {**proof, 'hand_candidate_ids': proof['candidate_ids'],
                'board_candidate_details': []}
    opportunity = precedent.opportunity(state, extended)
    if (opportunity['legal_candidate_ids'] != proof['candidate_ids'] or
            not any(detail['candidate_id'] == 'response-use-item-A-033#1' and
                    detail['card_id'] == 'I-c_coin2' and detail['base_time_cost'] == 1
                    for detail in opportunity['legal_candidate_details'])):
        raise ValueError('266 quick-use source/cost differs')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    decision = response.resolve_response_choice(
        {'order_id': order, 'actor_turn_index': state['game_state']['round'],
         'round': state['game_state']['round']}, opportunity)
    if (decision['resolution_mode'] != 'response_seeded_fallback' or
            decision['selected_candidate'] != 'response-use-item-A-033#1' or
            decision['reason_code'] != 'strategic_unresolved_response_seeded_fallback' or
            decision['comparison_evidence'] is not None):
        raise ValueError('266 response fallback decision differs')
    return {**base, 'selected_candidate': decision['selected_candidate'],
            'resolution_mode': decision['resolution_mode'], 'comparison': decision}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['266 independent choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('266 four response choices differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('266 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('266: three unique passes; seeded lucky coin selected')


if __name__ == '__main__':
    main()
