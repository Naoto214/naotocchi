#!/usr/bin/env python3
"""Apply the unique pass in the building chain; preserve three normal states."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_opportunity_audit_171 as prior
import proxy_new_seed_next_response_restart_170 as states
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start
import proxy_hit_blow_response_142 as hit

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = 'cd314c4a12a09bc9bf175883c6d0acd520c3c81eee52521831de596f66c576ce'
OUTPUT = ROOT / 'data/proxy-new-seed-chain-pass-172-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_chain_pass_172.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('171 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in result['results']):
        raise ValueError('171 opportunity proof differs')
    return result


def load_states():
    raw = states.OUTPUT.read_bytes()
    if raw != states.canonical_bytes(states.build_report()):
        raise ValueError('170 protected replay differs')
    result = json.loads(raw)
    if any(states.validate_result(x) for x in result['results']):
        raise ValueError('170 state/hash chain differs')
    return result['results']


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def run_route(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (proof['path_id'],
            proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('170/171 current source boundary differs')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('170 continuation hash differs')
    decisions = []; events = []; snapshots = []
    if proof['next_opportunity'] == 'response_window':
        if proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']:
            raise ValueError('172 chain response pass not unique')
        actor = state['response_context']['priority_actor']
        chance = start.enumerate_opportunity(state, actor, start.load_candidate_rows())
        if chance['legal_candidate_ids'] != proof['candidate_ids'] or not chance['candidate_set_complete']:
            raise ValueError('171 chain response proof differs')
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        decision = response.resolve_response_choice({'order_id': order, 'actor_turn_index': 1,
            'round': state['game_state']['round']}, chance)
        if decision['selected_candidate'] != 'response-pass' or decision['resolution_mode'] != 'response_unique':
            raise ValueError('172 response choice differs')
        decision['pre_game_state_sha256'] = row['final_game_state_sha256']
        decision['pre_continuation_state_sha256'] = row['final_continuation_state_sha256']
        decision['event_seq'] = row['last_valid_event_seq']
        after = copy.deepcopy(state)
        transitioned = hit._turn_start_transition(state, {'kind': 'response_pass', 'actor': actor})
        response._apply_transition_result(after, transitioned)
        after['last_event_seq'] = state['last_event_seq'] + 1
        after['continuation_state_sha256'] = start._hash(after)
        event = {'seq': after['last_event_seq'], 'action_type': 'response_pass',
                 'actor': actor, 'selected_candidate': 'response-pass',
                 'game_state_before_sha256': row['final_game_state_sha256'],
                 'game_state_after_sha256': start.opening._stop_state_sha256(after['game_state']),
                 'continuation_state_before_sha256': row['final_continuation_state_sha256'],
                 'continuation_state_after_sha256': after['continuation_state_sha256']}
        if after['response_context']['chain_status'] != 'building' or \
                after['response_context']['consecutive_passes'] != 1 or \
                after['game_state']['phase'] != 'response_window' or \
                len(after['activation_zone']) != 1:
            raise ValueError('172 chain response transition differs')
        state = after
        decisions = [decision]; events = [event]; snapshots = [snapshot(after)]
        reason = 'unproved_other_actor_chain_response_candidates'
    elif proof['next_opportunity'] == 'normal_action':
        if not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):
            raise ValueError('172 held normal action proof differs')
        reason = 'unproved_current_normal_action_decision'
    else:
        raise ValueError('172 unclassified opportunity')
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': state['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256': state['continuation_state_sha256'],
            'final_continuation_state': start._payload(state), 'stop_reason_code': reason,
            'new_decisions': decisions, 'new_events': events, 'new_snapshots': snapshots,
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        source = next(x for x in load_states() if x['path_id'] == result['path_id'])
        proof = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        if result != run_route(source, proof) or result['last_valid_event_seq'] != \
                source['last_valid_event_seq'] + len(result['new_events']):
            return ['172 independent replay differs']
        for event, snap in zip(result['new_events'], result['new_snapshots']):
            if event['seq'] != result['last_valid_event_seq'] or \
                    event['game_state_before_sha256'] != source['final_game_state_sha256'] or \
                    event['continuation_state_before_sha256'] != source['final_continuation_state_sha256'] or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != result['final_game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != result['final_continuation_state_sha256']:
                return ['172 event/snapshot hash chain differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    proofs = load_source()['results']
    rows = [run_route(row, proof) for row, proof in zip(load_states(), proofs)]
    if len(rows) != 4 or any(validate_result(row) for row in rows):
        raise ValueError('172 chain pass differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 1, 'new_events': 1,
            'new_snapshots': 1, 'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('172 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('172: 1 unique building-chain response pass, 3 normal actions held')


if __name__ == '__main__': main()
