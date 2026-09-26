#!/usr/bin/env python3
"""Resolve one seeded response choice and three unique response passes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_256 as audits
import proxy_new_seed_mixed_replay_255 as states
import proxy_new_seed_start_choice_188 as precedent
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audits.OUTPUT
SOURCE_RAW_SHA256 = '1d863d4972a9c8e43bec4dd22e3b2230660110e02b152677c1b0da36f27dc353'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-257-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_257.v1'


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
        raise ValueError('257 protected audit/state differs')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('257 source integrity differs')
    return proofs, rows


def choose(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (
            proof['path_id'], proof['source_last_valid_event_seq'],
            proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or \
            not proof['candidate_set_complete']:
        raise ValueError('257 source boundary differs')
    base = {'path_id': row['path_id'], 'candidate_ids': proof['candidate_ids'],
            'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if proof['candidate_ids'] == ['response-pass']:
        return {**base, 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique',
                'comparison': {'reason': 'only_complete_legal_candidate'}}
    if proof['next_opportunity'] != 'turn_start_response':
        raise ValueError('257 multiple response outside turn start')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != row['final_continuation_state_sha256']:
        raise ValueError('257 response state differs')
    opportunity = precedent.opportunity(state, proof)
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    decision = response.resolve_response_choice({'order_id': order,
        'actor_turn_index': state['game_state']['round'], 'round': state['game_state']['round']},
        opportunity)
    if (decision['resolution_mode'] != 'response_seeded_fallback' or
            decision['selected_candidate'] != 'response-pass' or
            decision['selected_candidate'] not in proof['candidate_ids']):
        raise ValueError('257 seeded response choice differs')
    return {**base, 'selected_candidate': decision['selected_candidate'],
            'resolution_mode': decision['resolution_mode'], 'comparison': decision}


def validate_result(result):
    try:
        proofs, rows = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['257 independent choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    proofs, rows = load_sources()
    result = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id']))
              for row in rows]
    if len(result) != 4 or any(validate_result(x) for x in result):
        raise ValueError('257 response choices differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': result}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('257 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('257: seeded pass and three unique passes selected')


if __name__ == '__main__':
    main()
