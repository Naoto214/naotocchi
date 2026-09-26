#!/usr/bin/env python3
"""Replay four audited unique response passes from checkpoint 239."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_audit_240 as audits
import proxy_new_seed_mixed_replay_239 as states
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audits.OUTPUT
SOURCE_RAW_SHA256 = 'a96764e3cbd0e1132e380c6828cf0c696e82e411cbe0c26f7eafb55d3b7eba16'
OUTPUT = ROOT / 'data/proxy-new-seed-followup-replay-241-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_followup_replay_241.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = SOURCE.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('241 protected audit/state raw or canonical differs')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if (len(proofs) != 4 or len(rows) != 4 or
            any(audits.validate_result(proof) for proof in proofs)):
        raise ValueError('241 four candidate proofs differ')
    return proofs, rows


def run_route(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (proof['path_id'], proof['source_last_valid_event_seq'],
         proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or
            proof['candidate_ids'] != ['response-pass'] or
            proof['candidate_set_complete'] is not True):
        raise ValueError('241 source boundary or unique pass differs')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update(source_event_seq=row['last_valid_event_seq'],
                 last_event_seq=row['last_valid_event_seq'],
                 source_game_state_sha256=row['final_game_state_sha256'],
                 continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(state) != row['final_continuation_state_sha256']:
        raise ValueError('241 source continuation hash differs')
    phase = state['game_state']['phase']
    ctx = state['response_context']
    if (phase not in ('response_window', 'post_placement_response') or
            ctx['chain_links'] or state['pending_triggers'] or
            ctx['consecutive_passes'] != (1 if phase == 'response_window' else 0)):
        raise ValueError('241 unproved response boundary')
    actor = ctx['priority_actor']
    after, event, _ = start._pass(state, actor)
    normal._verify_step(state, after, [event])
    expected_phase = 'normal_action' if phase == 'response_window' else 'post_placement_response'
    if phase == 'post_placement_response':
        # The canonical start-response pass moves priority. Placement response
        # retains its distinct phase until the second priority holder passes.
        after['game_state']['phase'] = 'response_window'
        after['continuation_state_sha256'] = start._hash(after)
        event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
        event['continuation_state_after_sha256'] = after['continuation_state_sha256']
        normal._verify_step(state, after, [event])
        expected_phase = 'response_window'
    if after['game_state']['phase'] != expected_phase:
        raise ValueError('241 response transition differs')
    decision = {'actor': actor, 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique',
                'pre_game_state_sha256': row['final_game_state_sha256'],
                'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                'event_seq': row['last_valid_event_seq']}
    return {'path_id': row['path_id'],
            'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after),
            'stop_reason_code': ('unproved_current_normal_action_candidates' if
                                 expected_phase == 'normal_action' else
                                 'unproved_next_priority_response_candidates'),
            'new_decisions': [decision], 'new_events': [event],
            'new_snapshots': [snapshots.snapshot(after)],
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        proofs, rows = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(row, proof):
            return ['241 independent replay differs']
        event, snap = result['new_events'][0], result['new_snapshots'][0]
        if (event['seq'] != row['last_valid_event_seq'] + 1 or
                event['game_state_before_sha256'] != row['final_game_state_sha256'] or
                event['continuation_state_before_sha256'] != row['final_continuation_state_sha256'] or
                event['game_state_after_sha256'] != snap['game_state_sha256'] or
                event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or
                start.canonical_sha256(snap['continuation_state']) != result['final_continuation_state_sha256']):
            return ['241 event/snapshot/hash chain differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    proofs, rows = load_sources()
    results = [run_route(row, next(x for x in proofs if x['path_id'] == row['path_id']))
               for row in rows]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('241 four replays differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 4,
            'new_events': 4, 'new_snapshots': 4,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('241 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('241: four unique response passes applied')


if __name__ == '__main__':
    main()
