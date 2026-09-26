#!/usr/bin/env python3
"""Replay two proved turn ends and two unique responses from checkpoint 267."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

import proxy_new_seed_mixed_audit_268 as audit
import proxy_new_seed_mixed_replay_267 as states
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_response_window_seeded_restart as response
import proxy_hit_blow_response_142 as chain
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audit.OUTPUT
SOURCE_RAW_SHA256 = '8414192c8abc6bf18278f55bd29d23568b45a43b208c35cd65b43ec10f9462ee'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-269-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_269.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def load_sources():
    raw, previous = SOURCE.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(previous).hexdigest() != audit.SOURCE_RAW_SHA256 or
            raw != audit.canonical_bytes(audit.build_report()) or
            previous != states.canonical_bytes(states.build_report())):
        raise ValueError('269 protected proof/source differs')
    return json.loads(previous)['results'], json.loads(raw)['results']


def run_route(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (proof['path_id'],
            proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('269 proof/source boundary differs')
    if proof['next_opportunity'] == 'turn_end':
        if not proof['turn_end_set_complete'] or not all(proof['completeness_checks'].values()):
            raise ValueError('269 turn end proof incomplete')
        result = end.run_route(row, proof)
        if result['stop_reason_code'] != 'unproved_current_egg_exchange_choice' or len(result['new_events']) != 2:
            raise ValueError('269 turn transition differs')
        return result
    if proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']:
        raise ValueError('269 response set incomplete')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update({'source_event_seq': row['last_valid_event_seq'],
                   'last_event_seq': row['last_valid_event_seq'],
                   'source_game_state_sha256': row['final_game_state_sha256'],
                   'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('269 response state differs')
    actor = before['response_context']['priority_actor']
    if row['path_id'] == 'probe-01-b-first':
        after, event = response.apply_response_pass(before, {
            'actor': actor, 'selected_candidate': 'response-pass',
            'selected_action': {'action_type': 'response_pass'}})
        event.pop('_snapshot_after')
    else:
        transitioned = chain._turn_start_transition(before, {'kind': 'response_pass', 'actor': actor})
        after = copy.deepcopy(before)
        response._apply_transition_result(after, transitioned)
        after['last_event_seq'] = before['last_event_seq'] + 1
        after['continuation_state_sha256'] = start._hash(after)
        event = {'seq': after['last_event_seq'], 'action_type': 'response_pass',
                 'actor': actor, 'selected_candidate': 'response-pass',
                 'game_state_before_sha256': row['final_game_state_sha256'],
                 'game_state_after_sha256': start.opening._stop_state_sha256(after['game_state']),
                 'continuation_state_before_sha256': row['final_continuation_state_sha256'],
                 'continuation_state_after_sha256': after['continuation_state_sha256']}
    ctx = after['response_context']
    if after['last_event_seq'] != row['last_valid_event_seq'] + 1:
        raise ValueError('269 pass event sequence differs')
    if row['path_id'] == 'probe-01-b-first':
        if after['game_state']['phase'] != 'normal_action' or ctx['consecutive_passes'] != 2:
            raise ValueError('269 post-placement closure differs')
        reason = 'unproved_current_normal_action_candidates'
    elif row['path_id'] == 'probe-02-b-first':
        if (ctx['priority_actor'] != 'B' or ctx['consecutive_passes'] != 1 or
                ctx['chain_status'] != 'building' or len(after['activation_zone']) != 1 or
                after['activation_zone'][0]['source_instance_id'] != 'A-033#1'):
            raise ValueError('269 chain next priority differs')
        reason = 'unproved_other_actor_chain_response_candidates'
    else:
        raise ValueError('269 response path differs')
    decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique', 'actor': actor,
                'pre_game_state_sha256': row['final_game_state_sha256'],
                'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                'event_seq': row['last_valid_event_seq']}
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after), 'stop_reason_code': reason,
            'new_decisions': [decision], 'new_events': [event],
            'new_snapshots': [snapshots.snapshot(after)], 'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        source = next(row for row in rows if row['path_id'] == result['path_id'])
        proof = next(row for row in proofs if row['path_id'] == result['path_id'])
        if result != run_route(source, proof) or result['last_valid_event_seq'] != source['last_valid_event_seq'] + len(result['new_events']):
            return ['269 replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for index, (event, shot) in enumerate(zip(result['new_events'], result['new_snapshots']), 1):
            if (event['seq'] != source['last_valid_event_seq'] + index or
                    event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['269 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['269 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [run_route(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or sum(len(row['new_events']) for row in results) != 6 or any(validate_result(row) for row in results):
        raise ValueError('269 four replays differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 2,
            'new_events': 6, 'new_snapshots': 6,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('269 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('269: two turn transitions and two response passes')


if __name__ == '__main__':
    main()
