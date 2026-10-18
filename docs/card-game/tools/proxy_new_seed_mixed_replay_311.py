#!/usr/bin/env python3
"""Replay chicken resolution, two responses and proved end/draw."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_310 as choices
import proxy_new_seed_mixed_audit_309 as audits
import proxy_new_seed_mixed_replay_308 as states
import proxy_new_seed_ability_resolution_215 as ability
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '6a35809008d94a79648dde5309bc9097d4bb8a872f1c36d4a87f65008f9cc056'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-311-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_311.v1'
ORIGINAL_CLASSIFY = end.classify_next_board


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
        raise ValueError('311 protected choice/audit/state differ')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']


def classify_next_board(game, actor):
    board = game['players'][actor]['board']
    if actor != 'A' or len(board['companions']) != 1 or board['partner'] is None:
        raise ValueError('311 next actor board inventory differs')
    companion = board['companions'][0]
    partner = board['partner']
    if (game['cards'][companion]['card_id'] != 'C-box' or
            game['cards'][partner]['card_id'] != 'P-cliff_goat' or
            '能力なし。' not in audits.hand.source_section('72-companion-26-card-text-draft.md', 'C-box') or
            '名前の異なるセカイへ変更した時' not in audits.hand.source_section('74-partner-18-card-text-draft.md', 'P-cliff_goat')):
        raise ValueError('311 next actor board classification differs')
    projected = copy.deepcopy(game)
    projected['players'][actor]['board']['companions'].remove(companion)
    projected['players'][actor]['board']['partner'] = None
    projected['players'][actor]['board']['partner_stage'] = None
    classified = ORIGINAL_CLASSIFY(projected, actor)
    classified.extend([
        {'source_instance_id': companion, 'card_id': 'C-box', 'trigger_kind': 'none',
         'source_reference': '72-companion-26-card-text-draft.md#C-box'},
        {'source_instance_id': partner, 'card_id': 'P-cliff_goat',
         'trigger_kind': 'event_trigger_not_turn_start',
         'source_reference': '74-partner-18-card-text-draft.md#P-cliff_goat'},
    ])
    return classified


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256'])):
        raise ValueError('311 selected source boundary differs')
    path = row['path_id']
    if path == 'probe-02-b-first':
        if (selected['selected_candidate'] != 'turn_end' or
                selected['resolution_mode'] != 'mandatory_proved_end' or
                not proof['turn_end_set_complete'] or
                proof['completeness_checks'] != selected['six_stage_checks']):
            raise ValueError('311 mandatory end differs')
        original = end.classify_next_board
        try:
            end.classify_next_board = classify_next_board
            result = end.run_route(row, proof)
        finally:
            end.classify_next_board = original
        if (len(result['new_events']) != 2 or
                [x['action_type'] for x in result['new_events']] !=
                ['turn_end_completed', 'turn_start_and_egg_draw']):
            raise ValueError('311 end/draw transition differs')
        return result
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('311 source continuation differs')
    if path == 'probe-01-a-first':
        if (selected['selected_candidate'] != 'resolve_board_ability' or
                selected['resolution_mode'] != 'mandatory_proved_resolution' or
                selected['chain_link_id'] != proof['chain_link_id']):
            raise ValueError('311 chicken resolution choice differs')
        after, event = ability.resolve_board_ability(before)
        if (event['result']['revealed_instance_id'] != proof['revealed_instance_id'] or
                event['result']['drawn_instance_id'] != proof['drawn_instance_id'] or
                after['game_state']['players']['A']['deck'][0] != 'A-007#1' or
                after['game_state']['phase'] != 'normal_action' or after['activation_zone']):
            raise ValueError('311 chicken resolution effect differs')
        decision = {'decision_kind': 'chain_resolution', 'selected_candidate': 'resolve_board_ability',
                    'resolution_mode': 'mandatory_proved_resolution',
                    'source_instance_id': proof['source_instance_id'], 'chain_link_id': proof['chain_link_id']}
        reason = 'unproved_current_normal_action_candidates'
    elif path == 'probe-01-b-first':
        if (selected['selected_candidate'] != 'response-pass' or proof['candidate_ids'] != ['response-pass'] or
                before['game_state']['phase'] != 'turn_end_response' or
                before['return_target'] != 'turn_end'):
            raise ValueError('311 end response choice differs')
        actor = before['response_context']['priority_actor']
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'selected_action': {'action_type': 'response_pass'},
                    'resolution_mode': 'response_unique', 'actor': actor}
        after, event = response.apply_response_pass(before, decision)
        if after['response_context']['consecutive_passes'] != 2:
            raise ValueError('311 end response closure differs')
        after['game_state']['phase'] = 'turn_end'
        after['return_target'] = 'turn_end'
        after['continuation_state_sha256'] = start._hash(after)
        event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
        event['continuation_state_after_sha256'] = after['continuation_state_sha256']
        event['result']['return_target'] = 'turn_end'
        event.pop('_snapshot_after', None)
        normal._verify_step(before, after, [event])
        reason = 'unproved_current_turn_end_provenance'
    elif path == 'probe-02-a-first':
        if (selected['selected_candidate'] != 'response-pass' or proof['candidate_ids'] != ['response-pass'] or
                before['game_state']['phase'] != 'post_placement_response' or
                before['response_context']['consecutive_passes'] != 1):
            raise ValueError('311 placement response choice differs')
        actor = before['response_context']['priority_actor']
        after, event, _ = start._pass(before, actor)
        normal._verify_step(before, after, [event])
        if (after['response_context']['consecutive_passes'] != 2 or
                after['game_state']['phase'] != 'normal_action'):
            raise ValueError('311 placement response closure differs')
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'resolution_mode': 'response_unique', 'actor': actor}
        reason = 'unproved_current_normal_action_candidates'
    else:
        raise ValueError('311 unknown path')
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
            return ['311 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['311 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['311 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or sum(len(x['new_events']) for x in results) != 5 or any(validate_result(x) for x in results):
        raise ValueError('311 four paths/five transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': sum(len(x['new_decisions']) for x in results),
            'new_events': 5, 'new_snapshots': 5,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('311 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('311: chicken resolution, two passes, turn end and draw')


if __name__ == '__main__':
    main()
