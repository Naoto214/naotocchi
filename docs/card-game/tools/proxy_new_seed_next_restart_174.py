#!/usr/bin/env python3
"""Apply two proven safe partner placements and close the item response chain."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_next_audit_173 as prior
import proxy_new_seed_chain_pass_172 as states
import proxy_new_seed_normal_restart_157 as normal
import proxy_response_window_seeded_restart as response
import proxy_hit_blow_response_142 as hit
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '7784217a7c1aa0a84272a831e086db51d3867a4a7556c27a851f6082e6e73451'
OUTPUT = ROOT / 'data/proxy-new-seed-next-restart-174-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_next_restart_174.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('173 protected raw or replay differs')
    report = json.loads(raw)
    if report['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in report['results']):
        raise ValueError('173 decision/opportunity proof differs')
    return report


def load_states():
    raw = states.OUTPUT.read_bytes()
    if raw != states.canonical_bytes(states.build_report()):
        raise ValueError('172 protected replay differs')
    data = json.loads(raw)
    if any(states.validate_result(x) for x in data['results']):
        raise ValueError('172 state/hash chain differs')
    return data['results']


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
        raise ValueError('172/173 current source boundary differs')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('172 continuation hash differs')
    decisions = []; events = []; snaps = []
    if proof['next_opportunity'] == 'selected_normal_action':
        original = next(x for x in json.loads(prior.proofs.OUTPUT.read_bytes())['results']
                        if x['path_id'] == row['path_id'])
        applied = normal.run_route(row, original)
        if applied['new_decisions'] != [proof['selected_decision']] or \
                applied['new_events'][0]['action_type'] != 'place_partner':
            raise ValueError('174 selected free partner placement differs')
        decisions = applied['new_decisions']; events = applied['new_events']; snaps = applied['new_snapshots']
        state = copy.deepcopy(applied['final_continuation_state'])
        state.update({'last_event_seq': applied['last_valid_event_seq'],
                      'continuation_state_sha256': applied['final_continuation_state_sha256']})
        reason = 'unproved_post_placement_response_candidates'
    elif proof['next_opportunity'] == 'response_window':
        ctx = state['response_context']; actor = ctx['priority_actor']
        if proof['candidate_ids'] != ['response-pass'] or ctx['chain_status'] != 'building' or \
                ctx['consecutive_passes'] != 1:
            raise ValueError('174 next chain pass proof differs')
        projected = copy.deepcopy(state)
        for excluded in proof['board_exclusions']:
            if projected['game_state']['players'][actor]['board']['partner'] != excluded['source_instance_id']:
                raise ValueError('174 excluded board source differs')
            projected['game_state']['players'][actor]['board']['partner'] = None
            projected['game_state']['players'][actor]['board']['partner_stage'] = None
        chance = start.enumerate_opportunity(projected, actor, start.load_candidate_rows())
        if chance['legal_candidate_ids'] != proof['candidate_ids'] or not chance['candidate_set_complete']:
            raise ValueError('174 second pass candidate proof differs')
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        decision = response.resolve_response_choice({'order_id': order, 'actor_turn_index': 1,
            'round': state['game_state']['round']}, chance)
        if decision['selected_candidate'] != 'response-pass' or decision['resolution_mode'] != 'response_unique':
            raise ValueError('174 second chain choice differs')
        decision['pre_game_state_sha256'] = row['final_game_state_sha256']
        decision['pre_continuation_state_sha256'] = row['final_continuation_state_sha256']
        decision['event_seq'] = row['last_valid_event_seq']
        transitioned = hit._turn_start_transition(state, {'kind': 'response_pass', 'actor': actor})
        if transitioned['chain_status'] != 'resolving' or transitioned['resolution_order'] != \
                state['response_context']['chain_links'][::-1]:
            raise ValueError('174 reverse chain resolution order differs')
        after = copy.deepcopy(state); response._apply_transition_result(after, transitioned)
        after['last_event_seq'] = state['last_event_seq'] + 1
        after['continuation_state_sha256'] = start._hash(after)
        event = {'seq': after['last_event_seq'], 'action_type': 'response_pass',
                 'actor': actor, 'selected_candidate': 'response-pass',
                 'game_state_before_sha256': row['final_game_state_sha256'],
                 'game_state_after_sha256': start.opening._stop_state_sha256(after['game_state']),
                 'continuation_state_before_sha256': row['final_continuation_state_sha256'],
                 'continuation_state_after_sha256': after['continuation_state_sha256']}
        decisions = [decision]; events = [event]; snaps = [snapshot(after)]; state = after
        reason = 'unproved_current_item_chain_resolution'
    elif proof['next_opportunity'] == 'world_priority_audit':
        if state['game_state']['phase'] != 'normal_action' or not proof['candidate_ids']:
            raise ValueError('174 held world priority boundary differs')
        reason = 'unproved_world_priority_comparison'
    else:
        raise ValueError('174 unclassified opportunity')
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
            return ['174 independent replay differs']
        game = row['final_game_state_sha256']; cont = row['final_continuation_state_sha256']
        for event, snap in zip(result['new_events'], result['new_snapshots']):
            if event['game_state_before_sha256'] != game or event['continuation_state_before_sha256'] != cont or \
                    event['seq'] != snap['event_seq'] or event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                return ['174 event/snapshot hash chain differs']
            game = event['game_state_after_sha256']; cont = event['continuation_state_after_sha256']
        if game != result['final_game_state_sha256'] or cont != result['final_continuation_state_sha256']:
            return ['174 final state/hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [run_route(row, proof) for row, proof in zip(load_states(), load_source()['results'])]
    if len(rows) != 4 or any(validate_result(row) for row in rows):
        raise ValueError('174 replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 3, 'new_events': 3,
            'new_snapshots': 3, 'independent_balance_sample_count': 0, 'results': rows}


def main():
    p = argparse.ArgumentParser(); p.add_argument('--check', action='store_true'); args = p.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('174 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('174: 2 partner placements and 1 chain closing pass; 1 world decision held')


if __name__ == '__main__': main()
