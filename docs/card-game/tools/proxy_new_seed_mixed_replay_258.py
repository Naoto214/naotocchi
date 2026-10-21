#!/usr/bin/env python3
"""Apply the four selected response passes to their saved states."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_257 as choices
import proxy_new_seed_mixed_audit_256 as audits
import proxy_new_seed_mixed_replay_255 as states
import proxy_new_seed_start_choice_207 as start_pass
import proxy_new_seed_start_choice_188 as opportunity_source
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_new_seed_end_response_replay_202 as end_pass
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = choices.OUTPUT
SOURCE_RAW_SHA256 = 'f44ae540f70603ca37fd3ea13a42e20ac16d22c0b456c6d7805ca1adc137cbd9'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-258-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_258.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, audit_raw, state_raw = SOURCE.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audit_raw).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(state_raw).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audit_raw != audits.canonical_bytes(audits.build_report()) or
            state_raw != states.canonical_bytes(states.build_report())):
        raise ValueError('258 protected choice/audit/state differs')
    selected = json.loads(raw)['results']
    inventory = json.loads(audit_raw)['results']
    source = json.loads(state_raw)['results']
    if len(selected) != len(inventory) or len(inventory) != len(source) or len(source) != 4 or \
            any(choices.validate_result(x) for x in selected):
        raise ValueError('258 source inventory differs')
    return selected, inventory, source


def run_route(row, selection, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (
            selection['path_id'], selection['source_last_valid_event_seq'],
            selection['source_game_state_sha256'], selection['source_continuation_state_sha256']) or \
            selection['selected_candidate'] != 'response-pass' or \
            selection['candidate_ids'] != proof['candidate_ids']:
        raise ValueError('258 selected pass boundary differs')
    if proof['next_opportunity'] == 'turn_end_response':
        if selection['resolution_mode'] != 'response_unique':
            raise ValueError('258 unique end response differs')
        result = end_pass.run_route(row, proof)
    elif proof['next_opportunity'] == 'turn_start_response':
        if selection['resolution_mode'] == 'response_seeded_fallback':
            state = copy.deepcopy(row['final_continuation_state'])
            state.update({'source_event_seq': row['last_valid_event_seq'],
                          'last_event_seq': row['last_valid_event_seq'],
                          'source_game_state_sha256': row['final_game_state_sha256'],
                          'continuation_state_sha256': row['final_continuation_state_sha256']})
            chance = opportunity_source.opportunity(state, proof)
            order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
            decision = response.resolve_response_choice({'order_id': order,
                'actor_turn_index': state['game_state']['round'], 'round': state['game_state']['round']}, chance)
            if decision != selection['comparison']:
                raise ValueError('258 seeded pass decision differs')
            decision.update({'pre_game_state_sha256': row['final_game_state_sha256'],
                             'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                             'event_seq': row['last_valid_event_seq']})
            after, event, _ = start._pass(state, decision['actor'])
            normal._verify_step(state, after, [event])
            result = {'path_id': row['path_id'],
                'source_last_valid_event_seq': row['last_valid_event_seq'],
                'source_game_state_sha256': row['final_game_state_sha256'],
                'source_continuation_state_sha256': row['final_continuation_state_sha256'],
                'last_valid_event_seq': after['last_event_seq'],
                'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
                'final_continuation_state_sha256': after['continuation_state_sha256'],
                'final_continuation_state': start._payload(after),
                'stop_reason_code': 'unproved_next_priority_response_candidates',
                'new_decisions': [decision], 'new_events': [event],
                'new_snapshots': [snapshots.snapshot(after)],
                'completed': False, 'balance_sample_count': 0}
        else:
            result = start_pass.run_route(row, proof)
    else:
        raise ValueError('258 unclassified response window')
    if (result['new_decisions'][0]['selected_candidate'] != selection['selected_candidate'] or
            result['new_decisions'][0]['resolution_mode'] != selection['resolution_mode'] or
            len(result['new_events']) != 1 or len(result['new_snapshots']) != 1):
        raise ValueError('258 replay choice differs')
    return result


def validate_result(result):
    try:
        selected, inventory, source = load_sources()
        row = next(x for x in source if x['path_id'] == result['path_id'])
        choice = next(x for x in selected if x['path_id'] == result['path_id'])
        proof = next(x for x in inventory if x['path_id'] == result['path_id'])
        if result != run_route(row, choice, proof) or \
                result['last_valid_event_seq'] != row['last_valid_event_seq'] + 1:
            return ['258 independent replay differs']
        event, snap = result['new_events'][0], result['new_snapshots'][0]
        if (event['game_state_before_sha256'] != row['final_game_state_sha256'] or
                event['continuation_state_before_sha256'] != row['final_continuation_state_sha256'] or
                event['game_state_after_sha256'] != snap['game_state_sha256'] or
                event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or
                start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or
                start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256'] or
                (snap['game_state_sha256'], snap['continuation_state_sha256']) != (
                    result['final_game_state_sha256'], result['final_continuation_state_sha256'])):
            return ['258 event/snapshot/hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration, IndexError) as error:
        return [str(error)]


def build_report():
    selected, inventory, source = load_sources()
    rows = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                      next(x for x in inventory if x['path_id'] == row['path_id']))
            for row in source]
    if len(rows) != 4 or any(validate_result(x) for x in rows):
        raise ValueError('258 four response passes differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 4,
            'completed': 0, 'new_decisions': 4, 'new_events': 4, 'new_snapshots': 4,
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('258 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('258: four response passes applied')


if __name__ == '__main__':
    main()
