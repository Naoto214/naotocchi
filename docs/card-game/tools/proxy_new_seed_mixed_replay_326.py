#!/usr/bin/env python3
"""Replay three unique response passes and a normal pass."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_choice_325 as choices
import proxy_new_seed_mixed_audit_324 as audits
import proxy_new_seed_mixed_replay_323 as states
import proxy_new_seed_mixed_replay_290 as normal_pass
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'adf5f1b4427b4363c5bc04afd77287db052f3534e6d9631e5084599b70e7a2a4'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-326-20260928.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_326.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, audited, saved = choices.OUTPUT.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audited).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != choices.STATE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audited != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('326 protected choice/audit/state differ')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            selected['candidate_ids'] != proof['candidate_ids']):
        raise ValueError('326 selected state boundary differs')
    path = row['path_id']
    if path == 'probe-01-b-first':
        if (selected['selected_candidate'] != 'pass' or
                selected['resolution_mode'] != 'priority_unique' or
                len(selected['paid_comparisons']) != len(proof['candidate_ids']) - 1 or
                not all(x['comparison']['winner'] == 'left' for x in selected['paid_comparisons'])):
            raise ValueError('326 normal pass proof differs')
        result = normal_pass.run_route(row, selected, proof)
        if (len(result['new_events']) != 1 or
                result['new_events'][0]['action_type'] != 'normal_pass_end_request' or
                result['final_continuation_state']['game_state']['phase'] != 'turn_end_response'):
            raise ValueError('326 normal pass transition differs')
        return result
    if (path not in ('probe-01-a-first', 'probe-02-a-first', 'probe-02-b-first') or
            selected['selected_candidate'] != 'response-pass' or
            selected['resolution_mode'] != 'response_unique' or
            proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']):
        raise ValueError('326 response choice differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('326 source continuation differs')
    actor = before['response_context']['priority_actor']
    if path == 'probe-02-b-first':
        if (proof['next_opportunity'] != 'turn_end_response' or
                before['return_target'] != 'turn_end' or
                before['response_context']['consecutive_passes'] != 1):
            raise ValueError('326 end response boundary differs')
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'selected_action': {'action_type': 'response_pass'},
                    'resolution_mode': 'response_unique', 'actor': actor}
        after, event = response.apply_response_pass(before, decision)
        if after['response_context']['consecutive_passes'] != 2:
            raise ValueError('326 end response closure differs')
        after['game_state']['phase'] = 'turn_end'
        after['return_target'] = 'turn_end'
        after['continuation_state_sha256'] = start._hash(after)
        event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
        event['continuation_state_after_sha256'] = after['continuation_state_sha256']
        event['result']['return_target'] = 'turn_end'
        event.pop('_snapshot_after', None)
        normal._verify_step(before, after, [event])
        reason = 'unproved_current_turn_end_provenance'
    else:
        if (proof['next_opportunity'] != 'response_window' or
                before['response_context']['consecutive_passes'] != 0):
            raise ValueError('326 start response boundary differs')
        after, event, _ = start._pass(before, actor)
        normal._verify_step(before, after, [event])
        if (after['response_context']['consecutive_passes'] != 1 or
                after['response_context']['priority_actor'] == actor):
            raise ValueError('326 next priority differs')
        reason = 'unproved_next_priority_response_candidates'
    decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique', 'actor': actor,
                'pre_game_state_sha256': row['final_game_state_sha256'],
                'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                'event_seq': row['last_valid_event_seq']}
    return {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after), 'stop_reason_code': reason,
            'new_decisions': [decision], 'new_events': [event],
            'new_snapshots': [snapshots.snapshot(after)], 'completed': False,
            'balance_sample_count': 0}


def validate_result(result):
    try:
        rows, selected, proofs = load_sources()
        source = next(x for x in rows if x['path_id'] == result['path_id'])
        choice = next(x for x in selected if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if (result != run_route(source, choice, proof) or
                result['last_valid_event_seq'] != source['last_valid_event_seq'] + len(result['new_events'])):
            return ['326 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['326 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['326 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or sum(len(x['new_events']) for x in results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('326 four transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': sum(len(x['new_decisions']) for x in results),
            'new_events': 4, 'new_snapshots': 4,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('326 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('326: three responses and a normal pass replayed')


if __name__ == '__main__':
    main()
