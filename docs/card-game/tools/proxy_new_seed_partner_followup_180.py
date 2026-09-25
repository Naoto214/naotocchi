#!/usr/bin/env python3
"""Apply two time-priority normal passes and a unique end response pass."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_board_partner_audit_179 as prior
import proxy_new_seed_followup_restart_178 as states
import proxy_new_seed_normal_restart_147 as normal_choice
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '9da82c918d86c993eefc35516a63e6aadf10a7079b1eba75a1717e9f253f546d'
OUTPUT = ROOT / 'data/proxy-new-seed-partner-followup-180-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_partner_followup_180.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('179 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in result['results']):
        raise ValueError('179 current opportunity differs')
    return result


@lru_cache(maxsize=1)
def load_states():
    raw = states.OUTPUT.read_bytes()
    if raw != states.canonical_bytes(states.build_report()):
        raise ValueError('178 protected replay differs')
    result = json.loads(raw)
    if any(states.validate_result(x) for x in result['results']):
        raise ValueError('178 source state/hash differs')
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
        raise ValueError('178/179 current source differs')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('178 continuation hash differs')
    decisions = []; events = []; snaps = []
    if proof['next_opportunity'] == 'normal_action':
        if not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):
            raise ValueError('180 normal action proof incomplete')
        decision = normal_choice.choose(row, proof)
        if decision['selected_candidate'] != 'pass' or decision['resolution_mode'] != 'priority_unique' or \
                decision['reason_code'] != 'time_balance':
            raise ValueError('180 paid birth versus pass priority differs')
        after, generated = normal.transition(state, decision, {'candidate_table':
            prior.normal_audit.normal.candidate.load_inputs()['candidate_table']})
        normal._verify_step(state, after, generated)
        event = {k: copy.deepcopy(v) for k, v in generated[0].items() if k != '_snapshot_after'}
        decisions = [decision]; events = [event]; snaps = [snapshot(after)]; state = after
        reason = 'unproved_turn_end_response_candidates'
    elif proof['next_opportunity'] == 'response_window':
        ctx = state['response_context']; actor = ctx['priority_actor']
        if proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete'] or \
                ctx['consecutive_passes'] != 1 or state['return_target'] != 'turn_end':
            raise ValueError('180 end response pass proof differs')
        projected = copy.deepcopy(state)
        for excluded in proof['board_exclusions']:
            partner = projected['game_state']['players'][actor]['board']['partner']
            if partner != excluded['source_instance_id'] or \
                    projected['game_state']['cards'][partner]['card_id'] != excluded['card_id']:
                raise ValueError('180 excluded board identity differs')
            projected['game_state']['players'][actor]['board']['partner'] = None
            projected['game_state']['players'][actor]['board']['partner_stage'] = None
        projected['game_state']['phase'] = 'response_window'
        projected['response_context']['window_kind'] = 'turn_start'
        chance = start.enumerate_opportunity(projected, actor, start.load_candidate_rows())
        if chance['legal_candidate_ids'] != proof['candidate_ids'] or not chance['candidate_set_complete']:
            raise ValueError('180 end response candidate proof differs')
        chance['response_context'] = copy.deepcopy(ctx)
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        decision = response.resolve_response_choice({'order_id': order, 'actor_turn_index': 1,
            'round': state['game_state']['round']}, chance)
        if decision['selected_candidate'] != 'response-pass' or decision['resolution_mode'] != 'response_unique':
            raise ValueError('180 end response choice differs')
        decision['pre_game_state_sha256'] = row['final_game_state_sha256']
        decision['pre_continuation_state_sha256'] = row['final_continuation_state_sha256']
        decision['event_seq'] = row['last_valid_event_seq']
        after, event = response.apply_response_pass(state, decision)
        if after['response_context']['consecutive_passes'] != 2:
            raise ValueError('180 end response window not closed')
        after['game_state']['phase'] = 'turn_end'; after['return_target'] = 'turn_end'
        after['continuation_state_sha256'] = start._hash(after)
        event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
        event['continuation_state_after_sha256'] = after['continuation_state_sha256']
        event['result']['return_target'] = 'turn_end'
        event.pop('_snapshot_after', None)
        normal._verify_step(state, after, [event])
        decisions = [decision]; events = [event]; snaps = [snapshot(after)]; state = after
        reason = 'unproved_current_turn_end_provenance'
    elif proof['next_opportunity'] == 'turn_end_provenance':
        if state['game_state']['phase'] != 'turn_end' or state['return_target'] != 'turn_end':
            raise ValueError('180 held turn end boundary differs')
        reason = 'unproved_current_turn_end_provenance'
    else:
        raise ValueError('180 unclassified next opportunity')
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': state['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256': state['continuation_state_sha256'],
            'final_continuation_state': start._payload(state), 'stop_reason_code': reason,
            'new_decisions': decisions, 'new_events': events, 'new_snapshots': snaps,
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        row = next(x for x in load_states() if x['path_id'] == result['path_id'])
        proof = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        if result != run_route(row, proof) or result['last_valid_event_seq'] != \
                row['last_valid_event_seq'] + len(result['new_events']):
            return ['180 independent replay differs']
        game = row['final_game_state_sha256']; cont = row['final_continuation_state_sha256']
        for offset, (event, snap) in enumerate(zip(result['new_events'], result['new_snapshots']), 1):
            if event['seq'] != row['last_valid_event_seq'] + offset or \
                    event['game_state_before_sha256'] != game or \
                    event['continuation_state_before_sha256'] != cont or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                return ['180 event/snapshot hash chain differs']
            game = event['game_state_after_sha256']; cont = event['continuation_state_after_sha256']
        if game != result['final_game_state_sha256'] or cont != result['final_continuation_state_sha256']:
            return ['180 final hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [run_route(row, proof) for row, proof in zip(load_states(), load_source()['results'])]
    if len(rows) != 4 or any(validate_result(row) for row in rows):
        raise ValueError('180 partner followup restart differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 3, 'new_events': 3,
            'new_snapshots': 3, 'independent_balance_sample_count': 0, 'results': rows}


def main():
    p = argparse.ArgumentParser(); p.add_argument('--check', action='store_true'); args = p.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('180 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('180: 2 normal passes and 1 response pass; 4 turn ends')


if __name__ == '__main__': main()
