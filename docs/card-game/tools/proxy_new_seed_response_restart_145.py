#!/usr/bin/env python3
"""Resume only the response windows whose full current candidates are proved."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_board_trigger_audit_144 as audit
import proxy_hit_blow_response_142 as states
import proxy_start_response_138 as start
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal


ROOT = Path(__file__).resolve().parents[1]
SOURCE = audit.OUTPUT
SOURCE_RAW_SHA256 = '1df03987c5645ae3f3d1e13318c2a10e1abeda6e753cb76c8b7d855cd996dd7b'
OUTPUT = ROOT / 'data/proxy-new-seed-response-restart-145-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_response_restart.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != audit.canonical_bytes(audit.build_report()):
        raise ValueError('144 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != audit.SCHEMA or any(audit.validate_result(x) for x in result['results']):
        raise ValueError('144 candidate completeness differs')
    return result


@lru_cache(maxsize=1)
def source_states():
    raw = states.OUTPUT.read_bytes()
    if raw != states.canonical_bytes(states.build_report()):
        raise ValueError('142 protected independent replay differs')
    result = json.loads(raw)
    if any(states.validate_result(row) for row in result['results']):
        raise ValueError('142 protected state/hash chain differs')
    return result


def current(row):
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('142 final continuation SHA differs')
    return state


def opportunity(state, proven_board=None):
    ctx = state['response_context']; actor = ctx['priority_actor']
    if ctx['window_kind'] != 'after_normal_action' or ctx['phase'] != 'response_window' or \
            state['pending_triggers'] or state['activation_zone'] or ctx['chain_links']:
        raise ValueError('response window boundary differs')
    board = state['game_state']['players'][actor]['board']
    if board['prepared'] or board['partner'] is not None or \
            (board['companions'] and (proven_board is None or
             [[instance, state['game_state']['cards'][instance]['card_id']]
              for instance in board['companions']] != proven_board)):
        raise ValueError('next priority actor board response requires separate proof')
    projected = copy.deepcopy(state)
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    projected['game_state']['players'][actor]['board']['companions'] = []
    result = start.enumerate_opportunity(projected, actor, start.load_candidate_rows())
    result['response_context'] = copy.deepcopy(ctx)
    if result['legal_candidate_ids'] != ['response-pass'] or not result['candidate_set_complete']:
        raise ValueError('next response choice is not uniquely proved')
    return result


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def run_route(row, proof):
    if row['path_id'] != proof['path_id'] or row['final_game_state_sha256'] != proof['source_game_state_sha256'] or \
            row['final_continuation_state_sha256'] != proof['source_continuation_state_sha256'] or \
            proof['candidate_set_complete'] is not True:
        raise ValueError('144/142 source state boundary differs')
    state = current(row); decisions = []; events = []; snapshots = []
    if state['game_state']['phase'] in ('post_placement_response', 'turn_end_response'):
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        original_end = state['return_target'] == 'turn_end'
        count = 1 if original_end else 2
        for index in range(count):
            certified_board = [[x['source_instance_id'], x['card_id']]
                               for x in proof['board_exclusions']] if index == 0 else None
            chance = opportunity(state, certified_board)
            if index == 0 and chance['legal_candidate_ids'] != proof['candidate_ids']:
                raise ValueError('144 initial response set changed')
            decision = response.resolve_response_choice({'order_id': order, 'actor_turn_index': 1,
                                                         'round': state['game_state']['round']}, chance)
            if decision['selected_candidate'] != 'response-pass' or decision['resolution_mode'] != 'response_unique':
                raise ValueError('response choice not unique')
            decision['pre_game_state_sha256'] = start.opening._stop_state_sha256(state['game_state'])
            decision['pre_continuation_state_sha256'] = state['continuation_state_sha256']
            decision['event_seq'] = state['last_event_seq']
            after, event = response.apply_response_pass(state, decision)
            if original_end:
                if state['response_context']['consecutive_passes'] != 1 or \
                        after['response_context']['consecutive_passes'] != 2:
                    raise ValueError('end request closing priority differs')
                # Existing 122 turn-end bridge: 119 closes the empty chain;
                # the stored normal-pass request returns to turn_end.
                after['game_state']['phase'] = 'turn_end'; after['return_target'] = 'turn_end'
                after['continuation_state_sha256'] = start._hash(after)
                event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
                event['continuation_state_after_sha256'] = after['continuation_state_sha256']
                event['result']['return_target'] = 'turn_end'
            event.pop('_snapshot_after', None)
            normal._verify_step(state, after, [event])
            decisions.append(decision); events.append(event); snapshots.append(snapshot(after)); state = after
        reason = ('unproved_current_turn_end_provenance' if original_end else
                  'unproved_post_response_normal_action_candidates')
    else:
        if row['stop_reason_code'] != 'unproved_post_resolution_normal_action_candidates':
            raise ValueError('unclassified 142 stop')
        reason = row['stop_reason_code']
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
        source = source_states()['results']; proofs = load_source()['results']
        index = next(i for i, row in enumerate(source) if row['path_id'] == result['path_id'])
        original = source[index]
        if result != run_route(original, proofs[index]) or \
                result['last_valid_event_seq'] != original['last_valid_event_seq'] + len(result['new_events']):
            return ['145 independent route replay differs']
        game = original['final_game_state_sha256']; cont = original['final_continuation_state_sha256']
        for offset, (event, snap) in enumerate(zip(result['new_events'], result['new_snapshots']), 1):
            if event['seq'] != original['last_valid_event_seq'] + offset or \
                    event['game_state_before_sha256'] != game or \
                    event['continuation_state_before_sha256'] != cont or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                return ['145 event/snapshot hash link differs']
            game, cont = event['game_state_after_sha256'], event['continuation_state_after_sha256']
        if game != result['final_game_state_sha256'] or cont != result['final_continuation_state_sha256']:
            return ['145 final state hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [run_route(row, proof) for row, proof in zip(source_states()['results'], load_source()['results'])]
    if any(validate_result(row) for row in results):
        raise ValueError('145 replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 4,
            'completed': 0, 'new_decisions': sum(len(row['new_decisions']) for row in results),
            'new_events': sum(len(row['new_events']) for row in results),
            'new_snapshots': sum(len(row['new_snapshots']) for row in results),
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('145 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('145: 4 planned, 5 response passes, 0 completed')


if __name__ == '__main__': main()
