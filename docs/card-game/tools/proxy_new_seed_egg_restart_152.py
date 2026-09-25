#!/usr/bin/env python3
"""Apply the existing R1 seeded egg choice to new independently seeded turns."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_restart_151 as prior
import proxy_normal_decision_seeded_restart as opening
import proxy_normal_decision_fallback_contract as fallback
import proxy_turn_end_provenance_restart as precedent
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '6055e248720f77734a5c4c35301deac91bfcccf5902a9b118bef6fb631d77bf5'
OUTPUT = ROOT / 'data/proxy-new-seed-egg-restart-152-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_egg_restart.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('151 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in result['results']):
        raise ValueError('151 source chain differs')
    return result


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def run_route(row):
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256'] or \
            state['game_state']['phase'] != 'egg_exchange_choice' or \
            state['game_state']['round'] != 1:
        raise ValueError('151 current egg state differs')
    game = state['game_state']; actor = game['turn_player']; player = game['players'][actor]
    if len(player['hand']) != 7 or player['reservations'] or state['activation_zone'] or state['pending_triggers']:
        raise ValueError('152 mandatory egg choice boundary differs')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    hand = [{'card_copy_id': game['cards'][instance]['card_copy_id'],
             'card_id': game['cards'][instance]['card_id'], 'initial_instance_id': instance}
            for instance in player['hand']]
    decision = opening.build_mandatory_choice_decision({'order_id': order}, actor, 1, 1, hand)
    errors = fallback.validate_seeded_resolution(decision)
    if errors or len(decision['legal_candidates']) != len(player['hand']) or \
            decision['seeded_fallback_candidates'] != decision['legal_candidates']:
        raise ValueError('116/117 egg seeded choice proof differs: ' + str(errors))
    decision['pre_game_state_sha256'] = row['final_game_state_sha256']
    decision['pre_continuation_state_sha256'] = row['final_continuation_state_sha256']
    decision['event_seq'] = row['last_valid_event_seq']
    chosen = decision['selected_action']['initial_instance_id']
    after = copy.deepcopy(state)
    target = after['game_state']['players'][actor]
    target['hand'].remove(chosen); target['deck'].append(chosen)
    after['game_state']['phase'] = 'response_window'
    ctx = after['response_context']
    ctx.update({'source_phase': 'response_window', 'phase': 'response_window',
                'window_kind': 'turn_start', 'origin_event_seq': state['last_event_seq'] + 1,
                'turn_player': actor, 'priority_actor': actor, 'chain_status': 'empty',
                'chain_links': [], 'consecutive_passes': 0,
                'response_opportunity_index': 1, 'decision_kind': 'response_action',
                'choice_kind': 'reaction_or_pass'})
    after['return_target'] = 'normal_action_opportunity'
    events = []; internal = []
    precedent._append_transition(state, after, events, internal, 'egg_exchange_bottom',
                                 actor, decision['selected_candidate'])
    normal._verify_step(state, after, events)
    event = events[0]
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after),
            'stop_reason_code': 'unproved_next_turn_start_response_candidates',
            'new_decisions': [decision], 'new_events': [event], 'new_snapshots': [snapshot(after)],
            'completed': False, 'balance_sample_count': 0}


def validate_result(row):
    try:
        original = next(x for x in load_source()['results'] if x['path_id'] == row['path_id'])
        if row != run_route(original) or row['last_valid_event_seq'] != original['last_valid_event_seq'] + 1:
            return ['152 independent replay differs']
        event = row['new_events'][0]; snap = row['new_snapshots'][0]
        if event['seq'] != row['last_valid_event_seq'] or \
                event['game_state_before_sha256'] != original['final_game_state_sha256'] or \
                event['continuation_state_before_sha256'] != original['final_continuation_state_sha256'] or \
                event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state']) != row['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state']) != row['final_continuation_state_sha256']:
            return ['152 event/snapshot hash chain differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error: return [str(error)]


def build_report():
    rows = [run_route(x) for x in load_source()['results']]
    if len(rows) != 3 or any(validate_result(row) for row in rows):
        raise ValueError('152 egg replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 3, 'completed': 0, 'new_decisions': 3,
            'new_events': 3, 'new_snapshots': 3,
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('152 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('152: 3 seeded egg exchanges, 3 events, 0 independent balance samples')


if __name__ == '__main__': main()
