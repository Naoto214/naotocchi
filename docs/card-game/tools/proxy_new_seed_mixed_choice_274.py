#!/usr/bin/env python3
"""Select three responses and carry forward the mandatory coin resolution."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_273 as audits
import proxy_new_seed_mixed_replay_272 as states
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audits.OUTPUT
SOURCE_RAW_SHA256 = '2500cf03b288638e79c31ec73c9b2bd06639be84924d43183ac057451487004e'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-274-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_274.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, previous = SOURCE.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(previous).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            previous != states.canonical_bytes(states.build_report())):
        raise ValueError('274 protected audit/state differs')
    proofs, rows = json.loads(raw)['results'], json.loads(previous)['results']
    if len(proofs) != len(rows) or len(rows) != 4 or any(audits.validate_result(p) for p in proofs):
        raise ValueError('274 source inventory differs')
    return rows, proofs


def choose(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (proof['path_id'], proof['source_last_valid_event_seq'],
         proof['source_game_state_sha256'], proof['source_continuation_state_sha256'])):
        raise ValueError('274 choice boundary differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'candidate_ids': proof['candidate_ids'], 'new_events': 0,
            'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] == 'resolve_item':
        if row['path_id'] != 'probe-02-b-first' or proof['candidate_ids'] or proof['source_instance_id'] != 'A-033#1':
            raise ValueError('274 deterministic coin boundary differs')
        return {**base, 'selected_processing': 'resolve_item',
                'resolution_mode': 'mandatory_chain_resolution',
                'chain_link_id': proof['chain_link_id']}
    if not proof['candidate_set_complete'] or proof['next_opportunity'] not in ('response_window', 'turn_end_response'):
        raise ValueError('274 response set incomplete')
    if proof['candidate_ids'] == ['response-pass']:
        return {**base, 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique',
                'comparison': {'reason': 'only_complete_legal_candidate'}}
    if (row['path_id'] != 'probe-02-a-first' or proof['candidate_ids'] !=
            ['response-pass', 'response-use-item-A-033#1']):
        raise ValueError('274 multi-candidate response differs')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update(source_event_seq=row['last_valid_event_seq'],
                 last_event_seq=row['last_valid_event_seq'],
                 source_game_state_sha256=row['final_game_state_sha256'],
                 continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(state) != row['final_continuation_state_sha256']:
        raise ValueError('274 response state hash differs')
    projected = copy.deepcopy(state)
    actor = state['response_context']['priority_actor']
    board = projected['game_state']['players'][actor]['board']
    for excluded in proof['hand_exclusions']:
        projected['game_state']['players'][actor]['hand'].remove(excluded['source_instance_id'])
    for excluded in proof['board_exclusions']:
        instance = excluded['source_instance_id']
        if instance in board['companions']:
            board['companions'].remove(instance)
        elif board['partner'] == instance:
            board['partner'] = board['partner_stage'] = None
        else:
            raise ValueError('274 excluded board identity differs')
    chance = start.enumerate_opportunity(projected, actor, start.load_candidate_rows())
    if (chance['legal_candidate_ids'] != proof['candidate_ids'] or
            chance['excluded_candidates'] != proof['hand_other_exclusions']):
        raise ValueError('274 reconstructed response differs')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    decision = response.resolve_response_choice({'order_id': order,
        'actor_turn_index': state['game_state']['round'], 'round': state['game_state']['round']}, chance)
    if (decision['selected_candidate'] != 'response-use-item-A-033#1' or
            decision['resolution_mode'] != 'response_seeded_fallback' or
            decision['comparison_evidence'] is not None):
        raise ValueError('274 seeded response selection differs')
    return {**base, 'selected_candidate': decision['selected_candidate'],
            'resolution_mode': decision['resolution_mode'], 'comparison': decision}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['274 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('274 four choices differ')
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
            raise SystemExit('274 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('274: two unique passes, seeded quick item and coin resolution')


if __name__ == '__main__':
    main()
