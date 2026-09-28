#!/usr/bin/env python3
"""Apply 344's four selected transitions with event and snapshot hashes."""
import argparse
import copy
import hashlib
import json
import sys
sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_344 as choices
import proxy_new_seed_mixed_audit_343 as audits
import proxy_new_seed_mixed_replay_342 as states
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_extension as extension
import proxy_normal_action_candidate_completeness as candidates
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_hit_blow_response_142 as chain
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '7af2a14593ee276a975d3f88163c25ef182bc2c2efd59628eeefefdc372c6d29'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-345-20260928.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_345.v1'


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
        raise ValueError('345 protected choice/audit/state differ')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            selected['candidate_ids'] != proof['candidate_ids'] or not proof['candidate_set_complete']):
        raise ValueError('345 selected state boundary differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('345 source state/hash differs')
    path = row['path_id']
    if path == 'probe-01-a-first':
        if (selected['selected_candidate'] != 'response-use-event-A-040#1-target-A-017#1' or
                selected['resolution_mode'] != 'priority_unique' or
                proof['next_opportunity'] != 'response_window'):
            raise ValueError('345 selected first date differs')
        decision = copy.deepcopy(selected['comparison'])
        decision.update(pre_game_state_sha256=row['final_game_state_sha256'],
                        pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                        event_seq=row['last_valid_event_seq'])
        action = decision['selected_action']
        actor, source = before['response_context']['priority_actor'], action['source_instance_id']
        owner = before['game_state']['players'][actor]
        if (actor != 'A' or source not in owner['hand'] or
                before['game_state']['cards'][source]['card_id'] != 'E-first-date' or
                action['target_instance_ids'] != [owner['board']['partner']] or
                owner['board']['partner_stage'] != 0 or
                action['base_time_cost'] != 1 or owner['time'] < 1 or
                before['activation_zone'] or before['response_context']['chain_links']):
            raise ValueError('345 first date source/target/payment differs')
        after = copy.deepcopy(before)
        after['game_state']['players'][actor]['time'] -= 1
        after['game_state']['players'][actor]['hand'].remove(source)
        seq = before['last_event_seq'] + 1
        link_id = f'response-link-{seq}-{source}'
        link = {'link_id': link_id, 'action_type': 'use_event', 'actor': actor,
                'card_id': 'E-first-date', 'card_copy_id': action['card_copy_id'],
                'source_instance_id': source, 'target_instance_ids': copy.deepcopy(action['target_instance_ids']),
                'payment': {'time': 1}, 'source_references': copy.deepcopy(action['source_references'])}
        after['activation_zone'].append(link)
        transitioned = chain._turn_start_transition(before, {'kind': 'activate', 'actor':actor, 'link_id':link_id})
        response._apply_transition_result(after, transitioned)
        after['last_event_seq'] = seq
        after['continuation_state_sha256'] = start._hash(after)
        if (after['response_context']['chain_status'] != 'building' or
                after['response_context']['priority_actor'] != 'A' or
                after['response_context']['window_kind'] != 'turn_start' or
                len(after['activation_zone']) != 1 or
                after['activation_zone'][0]['card_id'] != 'E-first-date'):
            raise ValueError('345 first date activation boundary differs')
        event = {'seq': seq, 'action_type': 'activate_response', 'actor': actor,
                 'selected_candidate': selected['selected_candidate'], 'source_instance_id': source,
                 'payment': {'time':1}, 'target_instance_ids': copy.deepcopy(action['target_instance_ids']),
                 'chain_link_id': link_id,
                 'game_state_before_sha256': row['final_game_state_sha256'],
                 'game_state_after_sha256': start.opening._stop_state_sha256(after['game_state']),
                 'continuation_state_before_sha256': row['final_continuation_state_sha256'],
                 'continuation_state_after_sha256': after['continuation_state_sha256']}
        reason = 'unproved_next_priority_chain_response_candidates'
    elif path == 'probe-01-b-first':
        if (selected['selected_candidate'] != 'candidate-place-companion-B-015#1' or
                selected['resolution_mode'] != 'safe_free_development' or
                proof['next_opportunity'] != 'normal_action' or
                not all(proof['completeness_checks'].values())):
            raise ValueError('345 selected chicken placement differs')
        decision = copy.deepcopy(selected['selected_decision'])
        decision.update(selected_action=copy.deepcopy(selected['selected_action']),
                        legal_candidate_details=copy.deepcopy(proof['legal_candidate_details']))
        section = audits.hand.source_section('72-companion-26-card-text-draft.md', 'C-chicken')
        if ('自分のターン開始時' not in section or
                len(before['game_state']['players']['B']['board']['companions']) != 2):
            raise ValueError('345 chicken placement text/slot differs')
        registered = extension.PLACEMENT_TEXT.get('C-chicken')
        current = ('72-companion-26-card-text-draft.md#C-chicken', 'turn_start_trigger_not_placement')
        if registered is not None and registered != current:
            raise ValueError('345 placement classification conflicts')
        try:
            extension.PLACEMENT_TEXT['C-chicken'] = current
            after, generated = extension._apply_placement(before, decision)
        finally:
            if registered is None:
                extension.PLACEMENT_TEXT.pop('C-chicken', None)
            else:
                extension.PLACEMENT_TEXT['C-chicken'] = registered
        normal._verify_step(before, after, generated)
        if (len(generated) != 1 or generated[0]['action_type'] != 'place_companion' or
                after['game_state']['phase'] != 'post_placement_response' or
                len(after['game_state']['players']['B']['board']['companions']) != 3 or
                'B-015#1' not in after['game_state']['players']['B']['board']['companions']):
            raise ValueError('345 chicken placement differs')
        event = {k: copy.deepcopy(v) for k, v in generated[0].items() if k != '_snapshot_after'}
        reason = 'unproved_post_placement_response_candidates'
    elif path in ('probe-02-a-first', 'probe-02-b-first'):
        if selected['selected_candidate'] != 'response-pass' or proof['candidate_ids'] != ['response-pass']:
            raise ValueError('345 unique response differs')
        actor = before['response_context']['priority_actor']
        after, event, _ = start._pass(before, actor)
        normal._verify_step(before, after, [event])
        if after['response_context']['consecutive_passes'] != 1 or after['response_context']['priority_actor'] == actor:
            raise ValueError('345 response next priority differs')
        decision = {'decision_kind':'response', 'selected_candidate':'response-pass',
                    'resolution_mode':'response_unique','actor':actor}
        reason = 'unproved_next_priority_response_candidates'
    else:
        raise ValueError('345 opportunity differs')
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
            return ['345 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['345 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['345 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or sum(len(x['new_events']) for x in results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('345 four transitions differ')
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
            raise SystemExit('345 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('345: first date activation, chicken placement and two passes replayed')


if __name__ == '__main__':
    main()
