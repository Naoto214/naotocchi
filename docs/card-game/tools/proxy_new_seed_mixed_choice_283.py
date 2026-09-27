#!/usr/bin/env python3
"""Select the three responses and mandatory coin resolution audited at 282."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_282 as audits
import proxy_new_seed_mixed_replay_281 as states
import proxy_new_seed_start_choice_188 as board_choice
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'fa3c7d1374432d8404e2d2a19cbd025b2de22cee81da2014130a9976ef90f18f'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-283-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_283.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('283 protected audit/state differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(p) for p in proofs):
        raise ValueError('283 candidate inventory differs')
    return rows, proofs


def choose(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (proof['path_id'], proof['source_last_valid_event_seq'],
             proof['source_game_state_sha256'], proof['source_continuation_state_sha256'])):
        raise ValueError('283 source boundary differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'candidate_ids': proof['candidate_ids'], 'new_events': 0,
            'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] == 'resolve_item':
        if (row['path_id'] != 'probe-02-a-first' or proof['candidate_ids'] or
                proof['source_instance_id'] != 'A-033#1' or
                proof['resolution_order'] != [proof['chain_link_id']]):
            raise ValueError('283 mandatory coin processing differs')
        return {**base, 'selected_processing': 'resolve_item',
                'resolution_mode': 'mandatory_chain_resolution',
                'chain_link_id': proof['chain_link_id']}
    if not proof['candidate_set_complete'] or proof['next_opportunity'] not in (
            'response_window', 'post_placement_response'):
        raise ValueError('283 response candidate set incomplete')
    if proof['candidate_ids'] == ['response-pass']:
        return {**base, 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique',
                'comparison': {'reason': 'only_complete_legal_candidate'}}
    if (row['path_id'] != 'probe-01-b-first' or proof['candidate_ids'] !=
            ['response-activate-ability-A-015#1', 'response-pass'] or
            len(proof['board_candidate_details']) != 1):
        raise ValueError('283 multi-candidate board response differs')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                 source_game_state_sha256=row['final_game_state_sha256'],
                 continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(state) != row['final_continuation_state_sha256']:
        raise ValueError('283 response state hash differs')
    adapted = copy.deepcopy(proof)
    adapted['hand_conditional_exclusions'] = proof['hand_exclusions']
    adapted['hand_candidate_ids'] = ['response-pass']
    opportunity = board_choice.opportunity(state, adapted)
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    decision = response.resolve_response_choice({'order_id': order,
        'actor_turn_index': state['game_state']['round'], 'round': state['game_state']['round']}, opportunity)
    if (decision['selected_candidate'] != 'response-pass' or
            decision['resolution_mode'] != 'response_seeded_fallback' or
            decision['legal_candidate_ids'] != proof['candidate_ids']):
        raise ValueError('283 seeded board response differs')
    return {**base, 'selected_candidate': 'response-pass',
            'resolution_mode': 'response_seeded_fallback', 'comparison': decision}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['283 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('283 four choices differ')
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
            raise SystemExit('283 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('283: three response passes and mandatory coin resolution selected')


if __name__ == '__main__':
    main()
