#!/usr/bin/env python3
"""Replay two seeded eggs, a response pass and a normal pass."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_choice_322 as choices
import proxy_new_seed_mixed_audit_321 as audits
import proxy_new_seed_mixed_replay_320 as states
import proxy_new_seed_mixed_replay_290 as normal_pass
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '1ecfa49f222efa91b1f71cb7371f34cd1e40cf67af2a81d801b5e9e81f43d169'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-323-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_323.v1'


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
        raise ValueError('323 protected choice/audit/state differ')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            selected['candidate_ids'] != proof['candidate_ids']):
        raise ValueError('323 selected source boundary differs')
    path = row['path_id']
    if path in ('probe-01-a-first', 'probe-02-a-first'):
        if selected['resolution_mode'] != 'seeded_fallback' or proof['next_opportunity'] != 'mandatory_egg_exchange':
            raise ValueError('323 egg choice differs')
        result = egg.run_route(row)
        if (result['new_decisions'] != [selected['selected_decision']] or
                result['new_events'][0]['action_type'] != 'egg_exchange_bottom'):
            raise ValueError('323 seeded egg replay differs')
        return result
    if path == 'probe-02-b-first':
        if (selected['selected_candidate'] != 'pass' or
                selected['resolution_mode'] != 'priority_unique' or
                len(selected['paid_comparisons']) != len(proof['candidate_ids']) - 1 or
                not all(x['comparison']['winner'] == 'left' for x in selected['paid_comparisons'])):
            raise ValueError('323 normal pass choice differs')
        result = normal_pass.run_route(row, selected, proof)
        if (len(result['new_events']) != 1 or
                result['new_events'][0]['action_type'] != 'normal_pass_end_request' or
                result['final_continuation_state']['game_state']['phase'] != 'turn_end_response'):
            raise ValueError('323 normal pass transition differs')
        return result
    if (path != 'probe-01-b-first' or selected['selected_candidate'] != 'response-pass' or
            proof['candidate_ids'] != ['response-pass'] or proof['next_opportunity'] != 'response_window'):
        raise ValueError('323 response choice differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('323 source state/hash differs')
    actor = before['response_context']['priority_actor']
    after, event, _ = start._pass(before, actor)
    normal._verify_step(before, after, [event])
    if (before['response_context']['consecutive_passes'] != 1 or
            after['response_context']['consecutive_passes'] != 2 or
            after['game_state']['phase'] != 'normal_action'):
        raise ValueError('323 response closure differs')
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
            'final_continuation_state': start._payload(after),
            'stop_reason_code': 'unproved_current_normal_action_candidates',
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
            return ['323 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['323 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['323 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or sum(len(x['new_events']) for x in results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('323 four transitions differ')
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
            raise SystemExit('323 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('323: two eggs, response and normal pass replayed')


if __name__ == '__main__':
    main()
