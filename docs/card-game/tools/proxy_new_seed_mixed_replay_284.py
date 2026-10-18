#!/usr/bin/env python3
"""Replay the three selected passes and the mandatory coin resolution."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_283 as choices
import proxy_new_seed_mixed_audit_282 as audits
import proxy_new_seed_mixed_replay_281 as states
import proxy_new_seed_current_restart_176 as coin_resolution
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '7bdda0475355e7220c8e46a676aafd012f11e59ec5ffe98a649e195130d31d34'
STATE_RAW_SHA256 = 'b5f30323da88fef0aca600a0c3a3068677a8350ccb03b0eb20e27ef4b19f078e'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-284-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_284.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, audited, saved = choices.OUTPUT.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audited).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audited != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('284 protected choice/audit/state differ')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            selected['candidate_ids'] != proof['candidate_ids']):
        raise ValueError('284 selected state boundary differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('284 source state/hash differs')
    if proof['next_opportunity'] == 'resolve_item':
        if (row['path_id'] != 'probe-02-a-first' or
                selected['selected_processing'] != 'resolve_item' or
                selected['chain_link_id'] != proof['chain_link_id']):
            raise ValueError('284 coin processing choice differs')
        after, event = coin_resolution.resolve_item(before, proof)
        if event['action_type'] != 'resolve_item' or after['activation_zone']:
            raise ValueError('284 coin resolution differs')
        decisions = []
        reason = 'unproved_current_normal_action_candidates'
    else:
        if (selected['selected_candidate'] != 'response-pass' or
                proof['next_opportunity'] not in ('response_window', 'post_placement_response') or
                (proof['candidate_ids'] != ['response-pass'] and
                 selected['resolution_mode'] != 'response_seeded_fallback')):
            raise ValueError('284 selected response differs')
        actor = before['response_context']['priority_actor']
        after, event, _ = start._pass(before, actor)
        normal._verify_step(before, after, [event])
        if row['path_id'] == 'probe-02-b-first':
            if after['response_context']['consecutive_passes'] != 2 or after['game_state']['phase'] != 'normal_action':
                raise ValueError('284 placement response closure differs')
            reason = 'unproved_current_normal_action_candidates'
        else:
            if (after['response_context']['consecutive_passes'] != 1 or
                    after['response_context']['priority_actor'] == actor):
                raise ValueError('284 next priority differs')
            reason = 'unproved_next_priority_response_candidates'
        decision = (copy.deepcopy(selected['comparison']) if selected['resolution_mode'] == 'response_seeded_fallback'
                    else {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                          'resolution_mode': 'response_unique', 'actor': actor})
        decision.update(pre_game_state_sha256=row['final_game_state_sha256'],
                        pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                        event_seq=row['last_valid_event_seq'])
        decisions = [decision]
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after), 'stop_reason_code': reason,
            'new_decisions': decisions, 'new_events': [event],
            'new_snapshots': [snapshots.snapshot(after)], 'completed': False,
            'balance_sample_count': 0}


def validate_result(result):
    try:
        rows, choices_rows, proofs = load_sources()
        source = next(x for x in rows if x['path_id'] == result['path_id'])
        choice = next(x for x in choices_rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(source, choice, proof) or result['last_valid_event_seq'] != source['last_valid_event_seq'] + 1:
            return ['284 independent replay differs']
        event, shot = result['new_events'][0], result['new_snapshots'][0]
        if (event['seq'] != shot['event_seq'] or
                event['game_state_before_sha256'] != source['final_game_state_sha256'] or
                event['continuation_state_before_sha256'] != source['final_continuation_state_sha256'] or
                event['game_state_after_sha256'] != shot['game_state_sha256'] or
                event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256'] or
                shot['game_state_sha256'] != result['final_game_state_sha256'] or
                shot['continuation_state_sha256'] != result['final_continuation_state_sha256']):
            return ['284 event/snapshot/hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, choices_rows, proofs = load_sources()
    results = [run_route(row, next(x for x in choices_rows if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('284 replay inventory differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 3,
            'new_events': 4, 'new_snapshots': 4,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('284 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('284: three passes and coin resolution replayed')


if __name__ == '__main__':
    main()
