#!/usr/bin/env python3
"""Apply 307's four selected transitions with event and snapshot hashes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_307 as choices
import proxy_new_seed_mixed_audit_306 as audits
import proxy_new_seed_mixed_replay_305 as states
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_extension as extension
import proxy_normal_action_candidate_completeness as candidates
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_hit_blow_response_142 as chain
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'e9a65889029415e55cc79c6340ec02f8e81063704908ee22da6be26a7d5d0482'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-308-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_308.v1'


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
        raise ValueError('308 protected choice/audit/state differ')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            selected['candidate_ids'] != proof['candidate_ids'] or not proof['candidate_set_complete']):
        raise ValueError('308 selected state boundary differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('308 source state/hash differs')
    path = row['path_id']
    if proof['next_opportunity'] == 'response_window':
        if path != 'probe-01-a-first' or (
                selected['selected_candidate'] != 'response-pass' or
                selected['resolution_mode'] != 'response_unique' or proof['candidate_ids'] != ['response-pass']):
            raise ValueError('308 response selection differs')
        actor = before['response_context']['priority_actor']
        if path == 'probe-01-a-first':
            transitioned = chain._turn_start_transition(before, {'kind': 'response_pass', 'actor': actor})
            if (transitioned['chain_status'] != 'resolving' or
                    transitioned['resolution_order'] != before['response_context']['chain_links'][::-1]):
                raise ValueError('308 chain closing order differs')
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
            if after['response_context']['chain_status'] != 'resolving' or len(after['activation_zone']) != 1:
                raise ValueError('308 chain resolution boundary differs')
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'resolution_mode': 'response_unique', 'actor': actor}
        reason = 'unproved_current_chicken_chain_resolution'
    elif path == 'probe-02-a-first':
        if selected['selected_candidate'] != 'response-pass' or proof['candidate_ids'] != ['response-pass']:
            raise ValueError('308 post-placement selection differs')
        actor = before['response_context']['priority_actor']
        after, event, _ = start._pass(before, actor)
        normal._verify_step(before, after, [event])
        if (after['game_state']['phase'] != 'post_placement_response' or
                after['response_context']['consecutive_passes'] != 1 or
                after['response_context']['priority_actor'] == actor):
            raise ValueError('308 post-placement next priority differs')
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'resolution_mode': 'response_unique', 'actor': actor}
        reason = 'unproved_next_priority_response_candidates'
    elif path == 'probe-02-b-first':
        if (selected['selected_candidate'] != 'response-pass' or proof['next_opportunity'] != 'turn_end_response' or
                selected['resolution_mode'] != 'response_unique' or proof['candidate_ids'] != ['response-pass'] or
                before['return_target'] != 'turn_end' or before['response_context']['consecutive_passes'] != 1):
            raise ValueError('308 turn-end response selection differs')
        actor = before['response_context']['priority_actor']
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'selected_action': {'action_type': 'response_pass'},
                    'resolution_mode': 'response_unique', 'actor': actor}
        after, event = response.apply_response_pass(before, decision)
        if after['response_context']['consecutive_passes'] != 2:
            raise ValueError('308 turn-end response closure differs')
        after['game_state']['phase'] = 'turn_end'
        after['return_target'] = 'turn_end'
        after['continuation_state_sha256'] = start._hash(after)
        event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
        event['continuation_state_after_sha256'] = after['continuation_state_sha256']
        event['result']['return_target'] = 'turn_end'
        event.pop('_snapshot_after', None)
        normal._verify_step(before, after, [event])
        reason = 'unproved_current_turn_end_provenance'
    elif path == 'probe-01-b-first':
        if (selected['selected_candidate'] != 'pass' or selected['resolution_mode'] != 'priority_unique' or
                proof['next_opportunity'] != 'normal_action' or not all(proof['completeness_checks'].values()) or
                len(selected['paid_comparisons']) != len(proof['candidate_ids']) - 1 or
                not all(x['comparison']['winner'] == 'left' for x in selected['paid_comparisons'])):
            raise ValueError('308 normal pass selection differs')
        detail = next(x for x in proof['legal_candidate_details'] if x['candidate_id'] == 'pass')
        decision = {'decision_kind': 'normal_action', 'resolution_mode': 'priority_unique',
                    'reason_code': 'time_balance', 'strategic_unresolved': False,
                    'legal_candidates': copy.deepcopy(proof['candidate_ids']),
                    'legal_candidate_details': copy.deepcopy(proof['legal_candidate_details']),
                    'candidate_set_complete': True, 'selected_candidate': 'pass',
                    'selected_action': copy.deepcopy(detail),
                    'runner_up_candidates': [x for x in proof['candidate_ids'] if x != 'pass'],
                    'seed_context': None, 'seed_proof': None,
                    'priority_comparisons': copy.deepcopy(selected['paid_comparisons'])}
        decision.update(pre_game_state_sha256=row['final_game_state_sha256'],
                        pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                        event_seq=row['last_valid_event_seq'])
        after, generated = normal.transition(before, decision,
            {'candidate_table': candidates.load_inputs()['candidate_table']})
        normal._verify_step(before, after, generated)
        if len(generated) != 1 or after['game_state']['phase'] != 'turn_end_response':
            raise ValueError('308 normal pass transition differs')
        event = {k: copy.deepcopy(v) for k, v in generated[0].items() if k != '_snapshot_after'}
        reason = 'unproved_turn_end_response_candidates'
    else:
        raise ValueError('308 opportunity differs')
    decision.update(pre_game_state_sha256=row['final_game_state_sha256'],
                    pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                    event_seq=row['last_valid_event_seq'])
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
            return ['308 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['308 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['308 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or sum(len(x['new_events']) for x in results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('308 four transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 4, 'new_events': 4,
            'new_snapshots': 4, 'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('308 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('308: four selected events with snapshot/hash chain')


if __name__ == '__main__':
    main()
