#!/usr/bin/env python3
"""Apply proven end response passes from saved states; hold other turn ends."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_r2_boundary_audit_182 as audit
import proxy_new_seed_partner_followup_180 as states
import proxy_new_seed_end_response_restart_161 as response_audit
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audit.OUTPUT
SOURCE_RAW_SHA256 = '83487c997c7da72b37261f4e24d1ab305cd6bd542061882eadc54b07047bf7ce'
OUTPUT = ROOT / 'data/proxy-new-seed-end-response-replay-183-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_end_response_replay_183.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw = SOURCE.read_bytes(); saved = states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest() != audit.STATES_RAW_SHA256:
        raise ValueError('182 audit or 180 state raw differs')
    result = json.loads(raw); originals = json.loads(saved)
    if result['schema'] != audit.SCHEMA or result['planned'] != 4 or \
            len(originals['results']) != 4 or any(audit.validate_result(x) for x in result['results']):
        raise ValueError('182 audited source differs')
    return result, originals


def run_route(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (proof['path_id'],
            proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('183 source state/hash boundary differs')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('183 source continuation differs')
    decisions = []; events = []; snapshots = []
    if proof['next_opportunity'] == 'response_window':
        if state['game_state']['phase'] != 'turn_end_response' or \
                proof['candidate_ids'] != ['response-pass'] or \
                not proof['candidate_set_complete'] or \
                state['response_context']['consecutive_passes'] != 1:
            raise ValueError('183 response choice not proven')
        origin = row['new_events'][-1]
        opportunity = response_audit.opportunity(state, origin)
        if opportunity['legal_candidate_ids'] != proof['candidate_ids'] or \
                opportunity['board_exclusions'] != proof['board_exclusions'] or \
                opportunity['excluded_candidates'] != proof['hand_exclusions']:
            raise ValueError('183 response proof differs at selection')
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        decision = response.resolve_response_choice({'order_id': order, 'actor_turn_index': 1,
            'round': state['game_state']['round']}, opportunity)
        if decision['selected_candidate'] != 'response-pass' or \
                decision['resolution_mode'] != 'response_unique':
            raise ValueError('183 response priority differs')
        decision.update({'pre_game_state_sha256': row['final_game_state_sha256'],
                         'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                         'event_seq': row['last_valid_event_seq']})
        after, event = response.apply_response_pass(state, decision)
        if after['response_context']['consecutive_passes'] != 2:
            raise ValueError('183 response window not closed')
        after['game_state']['phase'] = 'turn_end'; after['return_target'] = 'turn_end'
        after['continuation_state_sha256'] = start._hash(after)
        event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
        event['continuation_state_after_sha256'] = after['continuation_state_sha256']
        event['result']['return_target'] = 'turn_end'; event.pop('_snapshot_after', None)
        normal._verify_step(state, after, [event])
        decisions = [decision]; events = [event]; snapshots = [states.snapshot(after)]; state = after
    elif proof['next_opportunity'] != 'turn_end' or not proof['turn_end_set_complete'] or \
            state['game_state']['phase'] != 'turn_end':
        raise ValueError('183 held turn end audit differs')
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': state['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256': state['continuation_state_sha256'],
            'final_continuation_state': start._payload(state),
            'stop_reason_code': 'unproved_current_turn_end_provenance',
            'new_decisions': decisions, 'new_events': events, 'new_snapshots': snapshots,
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        audit_rows, originals = load_sources()
        row = next(x for x in originals['results'] if x['path_id'] == result['path_id'])
        proof = next(x for x in audit_rows['results'] if x['path_id'] == result['path_id'])
        if result != run_route(row, proof): return ['183 independent replay differs']
        game = row['final_game_state_sha256']; continuation = row['final_continuation_state_sha256']
        for offset, (event, snap) in enumerate(zip(result['new_events'],result['new_snapshots']),1):
            if event['seq'] != row['last_valid_event_seq'] + offset or \
                    snap['event_seq'] != event['seq'] or \
                    event['game_state_before_sha256'] != game or \
                    event['continuation_state_before_sha256'] != continuation or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                return ['183 event/snapshot/hash chain differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    audit_rows, originals = load_sources()
    rows = [run_route(row, next(x for x in audit_rows['results'] if x['path_id'] == row['path_id']))
            for row in originals['results']]
    if sum(len(x['new_events']) for x in rows) != 2 or any(validate_result(x) for x in rows):
        raise ValueError('183 saved end response replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'states_raw_sha256': audit.STATES_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 2, 'new_events': 2,
            'new_snapshots': 2, 'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('183 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('183: 2 proven end response passes, 4 turn-end states')


if __name__ == '__main__': main()
