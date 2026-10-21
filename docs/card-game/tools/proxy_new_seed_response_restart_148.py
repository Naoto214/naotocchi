#!/usr/bin/env python3
"""Resume only the response windows whose full current candidates are proved."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_normal_restart_147 as prior

import proxy_start_response_138 as start
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal


ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = 'a61cde34884118abf5abf399cbc54e724970c981c87508802aec3b9662b3b0f8'
OUTPUT = ROOT / 'data/proxy-new-seed-response-restart-148-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_response_restart_148.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('147 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != prior.SCHEMA or any(prior.validate_result(row) for row in result['results']):
        raise ValueError('147 source chain differs')
    return result


def current(row):
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('147 final continuation SHA differs')
    return state


def opportunity(state, origin):
    ctx = state['response_context']; actor = ctx['priority_actor']
    if ctx['window_kind'] != 'after_normal_action' or ctx['phase'] != 'response_window' or \
            state['pending_triggers'] or state['activation_zone'] or ctx['chain_links']:
        raise ValueError('148 response boundary differs')
    board = state['game_state']['players'][actor]['board']
    if board['prepared'] or board['companions'] or board['main'] is not None or board['world'] is not None:
        raise ValueError('148 unproved board ability')
    projected = copy.deepcopy(state)
    if board['partner'] is not None:
        instance = board['partner']; card_id = state['game_state']['cards'][instance]['card_id']
        section = (ROOT / '74-partner-18-card-text-draft.md').read_text().split(
            f'### {card_id} — ', 1)[1].split('\n### ', 1)[0]
        if card_id != 'P-anglerfish' or '自分のメインが自分からちょうせんする時' not in section or \
                '自分のセカイが「しんかい」である場合' not in section or \
                origin['action_type'] != 'place_partner' or origin['source_instance_id'] != instance or \
                origin['actor'] != actor or origin['seq'] != ctx['origin_event_seq']:
            raise ValueError('148 partner trigger not excluded by event and source')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    result = start.enumerate_opportunity(projected, actor, start.load_candidate_rows())
    result['response_context'] = copy.deepcopy(ctx)
    if result['legal_candidate_ids'] != ['response-pass'] or not result['candidate_set_complete']:
        raise ValueError('148 response choice not uniquely proved')
    return result


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def run_route(row):
    state = current(row); decisions = []; events = []; snapshots = []
    if state['game_state']['phase'] in ('post_placement_response', 'turn_end_response'):
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        original_end = state['return_target'] == 'turn_end'
        count = 1 if original_end else 2
        for index in range(count):
            origin = row['new_events'][-1] if index == 0 else events[-1]
            chance = opportunity(state, origin)
            decision = response.resolve_response_choice({'order_id': order, 'actor_turn_index': 1,
                                                         'round': state['game_state']['round']}, chance)
            if decision['selected_candidate'] != 'response-pass' or decision['resolution_mode'] != 'response_unique':
                raise ValueError('148 response choice differs')
            decision['pre_game_state_sha256'] = start.opening._stop_state_sha256(state['game_state'])
            decision['pre_continuation_state_sha256'] = state['continuation_state_sha256']
            decision['event_seq'] = state['last_event_seq']
            after, event = response.apply_response_pass(state, decision)
            if original_end:
                if state['response_context']['consecutive_passes'] != 1 or \
                        after['response_context']['consecutive_passes'] != 2:
                    raise ValueError('148 turn end closing priority differs')
                after['game_state']['phase'] = 'turn_end'; after['return_target'] = 'turn_end'
                after['continuation_state_sha256'] = start._hash(after)
                event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
                event['continuation_state_after_sha256'] = after['continuation_state_sha256']
                event['result']['return_target'] = 'turn_end'
            event.pop('_snapshot_after', None)
            normal._verify_step(state, after, [event])
            decisions.append(decision); events.append(event); snapshots.append(snapshot(after)); state = after
        reason = 'unproved_current_turn_end_provenance' if original_end else 'unproved_post_response_normal_action_candidates'
    else:
        if state['game_state']['phase'] != 'turn_end' or row['stop_reason_code'] != 'unproved_current_turn_end_provenance':
            raise ValueError('148 held turn end state differs')
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
        source = load_source()['results']
        index = next(i for i, row in enumerate(source) if row['path_id'] == result['path_id'])
        original = source[index]
        if result != run_route(original) or \
                result['last_valid_event_seq'] != original['last_valid_event_seq'] + len(result['new_events']):
            return ['148 independent route replay differs']
        game = original['final_game_state_sha256']; cont = original['final_continuation_state_sha256']
        for offset, (event, snap) in enumerate(zip(result['new_events'], result['new_snapshots']), 1):
            if event['seq'] != original['last_valid_event_seq'] + offset or \
                    event['game_state_before_sha256'] != game or \
                    event['continuation_state_before_sha256'] != cont or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                return ['148 event/snapshot hash link differs']
            game, cont = event['game_state_after_sha256'], event['continuation_state_after_sha256']
        if game != result['final_game_state_sha256'] or cont != result['final_continuation_state_sha256']:
            return ['148 final state hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [run_route(row) for row in load_source()['results']]
    if any(validate_result(row) for row in results):
        raise ValueError('148 replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 4,
            'completed': 0, 'new_decisions': sum(len(row['new_decisions']) for row in results),
            'new_events': sum(len(row['new_events']) for row in results),
            'new_snapshots': sum(len(row['new_snapshots']) for row in results),
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('148 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('148: 4 planned, 4 response passes, 0 completed')


if __name__ == '__main__': main()
