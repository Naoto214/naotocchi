#!/usr/bin/env python3
"""Replay checkpoint 274 responses and resolve the closed coin link."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_274 as choices
import proxy_new_seed_mixed_audit_273 as audits
import proxy_new_seed_mixed_replay_272 as states
import proxy_new_seed_next_response_restart_170 as coin_activation
import proxy_new_seed_current_restart_176 as coin_resolution
import proxy_response_window_seeded_restart as response
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = choices.OUTPUT
SOURCE_RAW_SHA256 = '74670b31dedf5408f831964753649c8420ffd297e81cdac24a19478d878b967a'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-275-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_275.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, audited, previous = SOURCE.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audited).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(previous).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audited != audits.canonical_bytes(audits.build_report()) or
            previous != states.canonical_bytes(states.build_report())):
        raise ValueError('275 protected choices/audit/state differ')
    return (json.loads(previous)['results'], json.loads(raw)['results'],
            json.loads(audited)['results'])


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (selected['path_id'], selected['source_last_valid_event_seq'],
         selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            selected['candidate_ids'] != proof['candidate_ids']):
        raise ValueError('275 choice boundary differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'],
                  last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('275 source state/hash differs')
    actor = before['response_context']['priority_actor']
    if proof['next_opportunity'] == 'resolve_item':
        if selected['selected_processing'] != 'resolve_item' or selected['chain_link_id'] != proof['chain_link_id']:
            raise ValueError('275 coin processing choice differs')
        after, event = coin_resolution.resolve_item(before, proof)
        if event['action_type'] != 'resolve_item' or event['result']['revealed_card_type'] != 'main':
            raise ValueError('275 coin revealed type differs')
        decisions = []
        reason = 'unproved_current_normal_action_candidates'
    elif selected['selected_candidate'] == 'response-pass':
        if proof['candidate_ids'] != ['response-pass'] or selected['resolution_mode'] != 'response_unique':
            raise ValueError('275 unique pass differs')
        decisions = [{'decision_kind': 'response', 'selected_candidate': 'response-pass',
                      'resolution_mode': 'response_unique', 'actor': actor,
                      'pre_game_state_sha256': row['final_game_state_sha256'],
                      'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                      'event_seq': row['last_valid_event_seq']}]
        if proof['next_opportunity'] == 'turn_end_response':
            after, event = response.apply_response_pass(before, {
                'actor': actor, 'selected_candidate': 'response-pass',
                'selected_action': {'action_type': 'response_pass'}})
            if after['response_context']['consecutive_passes'] != 2:
                raise ValueError('275 end response not closed')
            after['game_state']['phase'] = 'turn_end'
            after['return_target'] = 'turn_end'
            after['continuation_state_sha256'] = start._hash(after)
            event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
            event['continuation_state_after_sha256'] = after['continuation_state_sha256']
            event['result']['return_target'] = 'turn_end'
            event.pop('_snapshot_after', None)
            reason = 'unproved_current_turn_end_provenance'
        else:
            after, event, _ = start._pass(before, actor)
            if after['response_context']['consecutive_passes'] != 1:
                raise ValueError('275 start response first pass differs')
            reason = 'unproved_next_priority_response_candidates'
    else:
        if (row['path_id'] != 'probe-02-a-first' or
                selected['selected_candidate'] != 'response-use-item-A-033#1' or
                selected['resolution_mode'] != 'response_seeded_fallback'):
            raise ValueError('275 selected quick item differs')
        decision = copy.deepcopy(selected['comparison'])
        after, event = coin_activation.activate_quick_item(before, decision)
        if (len(after['activation_zone']) != 1 or
                after['activation_zone'][0]['source_instance_id'] != 'A-033#1'):
            raise ValueError('275 activated coin zone differs')
        decision.update(pre_game_state_sha256=row['final_game_state_sha256'],
                        pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                        event_seq=row['last_valid_event_seq'])
        decisions = [decision]
        reason = 'unproved_current_chain_response_or_resolution'
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after), 'stop_reason_code': reason,
            'new_decisions': decisions, 'new_events': [event],
            'new_snapshots': [snapshots.snapshot(after)],
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        rows, decisions, proofs = load_sources()
        source = next(x for x in rows if x['path_id'] == result['path_id'])
        selected = next(x for x in decisions if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(source, selected, proof) or result['last_valid_event_seq'] != source['last_valid_event_seq'] + 1:
            return ['275 replay differs']
        event, shot = result['new_events'][0], result['new_snapshots'][0]
        if (event['seq'] != shot['event_seq'] or
                event['game_state_before_sha256'] != source['final_game_state_sha256'] or
                event['continuation_state_before_sha256'] != source['final_continuation_state_sha256'] or
                event['game_state_after_sha256'] != shot['game_state_sha256'] or
                event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                start.opening._stop_state_sha256(shot['game_state']) != result['final_game_state_sha256'] or
                start.canonical_sha256(shot['continuation_state']) != result['final_continuation_state_sha256']):
            return ['275 event/snapshot/hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or sum(len(row['new_events']) for row in results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('275 four transitions differ')
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
            raise SystemExit('275 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('275: two passes, one activation, one coin resolution')


if __name__ == '__main__':
    main()
