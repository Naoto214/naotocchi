#!/usr/bin/env python3
"""Apply four unique passes from audited response and normal opportunities."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_audit_177 as prior
import proxy_new_seed_current_restart_176 as states
import proxy_new_seed_response_restart_158 as response_audit
import proxy_new_seed_normal_restart_147 as normal_choice
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '0e1998e9d3d20cd2c62717edba562d7a9610a207318b551adedb86ca838d3a33'
OUTPUT = ROOT / 'data/proxy-new-seed-followup-restart-178-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_followup_restart_178.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('177 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in result['results']):
        raise ValueError('177 opportunity proof differs')
    return result


@lru_cache(maxsize=1)
def load_states():
    raw = states.OUTPUT.read_bytes()
    if raw != states.canonical_bytes(states.build_report()):
        raise ValueError('176 protected replay differs')
    result = json.loads(raw)
    if any(states.validate_result(x) for x in result['results']):
        raise ValueError('176 source state/hash differs')
    return result['results']


@lru_cache(maxsize=4)
def origin_for_path(path_id):
    source = next(x for x in load_states() if x['path_id'] == path_id)
    return prior.origin_for(source)


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
        raise ValueError('176/177 source boundary differs')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('176 continuation hash differs')
    if proof['next_opportunity'] == 'normal_action':
        if proof['candidate_ids'] != ['pass'] or not proof['candidate_set_complete'] or \
                not all(proof['completeness_checks'].values()):
            raise ValueError('178 normal pass not uniquely proved')
        decision = normal_choice.choose(row, proof)
        if decision['selected_candidate'] != 'pass' or decision['resolution_mode'] != 'priority_unique':
            raise ValueError('178 normal pass choice differs')
        after, generated = normal.transition(state, decision, {'candidate_table':
            prior.normal_audit.normal.candidate.load_inputs()['candidate_table']})
        normal._verify_step(state, after, generated)
        event = {k: copy.deepcopy(v) for k, v in generated[0].items() if k != '_snapshot_after'}
        reason = 'unproved_turn_end_response_candidates'
    elif proof['next_opportunity'] == 'response_window':
        origin = origin_for_path(row['path_id'])
        chance = response_audit.opportunity(state, origin)
        if chance['legal_candidate_ids'] != proof['candidate_ids'] or \
                proof['candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete'] or \
                origin['seq'] != proof['origin_event_seq']:
            raise ValueError('178 response pass opportunity differs')
        actor = state['response_context']['priority_actor']
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        decision = response.resolve_response_choice({'order_id': order, 'actor_turn_index': 1,
            'round': state['game_state']['round']}, chance)
        if decision['selected_candidate'] != 'response-pass' or decision['resolution_mode'] != 'response_unique':
            raise ValueError('178 response choice differs')
        decision['pre_game_state_sha256'] = row['final_game_state_sha256']
        decision['pre_continuation_state_sha256'] = row['final_continuation_state_sha256']
        decision['event_seq'] = row['last_valid_event_seq']
        old_end = state['return_target'] == 'turn_end'
        after, event = response.apply_response_pass(state, decision)
        if old_end:
            if state['response_context']['consecutive_passes'] != 1 or \
                    after['response_context']['consecutive_passes'] != 2:
                raise ValueError('178 turn-end response priority differs')
            after['game_state']['phase'] = 'turn_end'; after['return_target'] = 'turn_end'
            after['continuation_state_sha256'] = start._hash(after)
            event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
            event['continuation_state_after_sha256'] = after['continuation_state_sha256']
            event['result']['return_target'] = 'turn_end'
            reason = 'unproved_current_turn_end_provenance'
        else:
            if state['response_context']['consecutive_passes'] != 1 or \
                    after['game_state']['phase'] != 'normal_action':
                raise ValueError('178 post-placement close differs')
            reason = 'unproved_post_response_normal_action_candidates'
        event.pop('_snapshot_after', None)
        normal._verify_step(state, after, [event])
    else:
        raise ValueError('178 unclassified opportunity')
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after), 'stop_reason_code': reason,
            'new_decisions': [decision], 'new_events': [event], 'new_snapshots': [snapshot(after)],
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        row = next(x for x in load_states() if x['path_id'] == result['path_id'])
        proof = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        if result != run_route(row, proof) or result['last_valid_event_seq'] != row['last_valid_event_seq'] + 1:
            return ['178 independent replay differs']
        event = result['new_events'][0]; snap = result['new_snapshots'][0]
        if event['seq'] != result['last_valid_event_seq'] or \
                event['game_state_before_sha256'] != row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256'] != row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state']) != result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state']) != result['final_continuation_state_sha256']:
            return ['178 event/snapshot hash chain differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [run_route(row, proof) for row, proof in zip(load_states(), load_source()['results'])]
    if len(rows) != 4 or any(validate_result(row) for row in rows):
        raise ValueError('178 followup restart differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 4, 'new_events': 4,
            'new_snapshots': 4, 'independent_balance_sample_count': 0, 'results': rows}


def main():
    p = argparse.ArgumentParser(); p.add_argument('--check', action='store_true'); args = p.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('178 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('178: 4 unique passes, 1 turn end, 1 turn-end response, 2 normal actions')


if __name__ == '__main__': main()
