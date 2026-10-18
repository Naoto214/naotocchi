#!/usr/bin/env python3
"""Replay two proved turn ends/draws and two response passes."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_choice_319 as choices
import proxy_new_seed_mixed_audit_318 as audits
import proxy_new_seed_mixed_replay_317 as states
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_new_seed_start_audit_206 as hand
import proxy_board_trigger_audit_144 as timing
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '0c5418f55c18ef222eea1554ade8cef89ad46ef08bc959434b41458f82d9738c'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-320-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_320.v1'
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
        raise ValueError('320 protected choice/audit/state differ')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']


def classify_next_board(game, actor):
    board = game['players'][actor]['board']
    if board['main'] is not None or board['world'] is not None or board['prepared']:
        raise ValueError('320 next actor board boundary differs')
    projected = copy.deepcopy(game)
    classified = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if card_id == 'C-cat_friend':
            if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or
                    '自分のターン終了時' in section):
                raise ValueError('320 cat friend activation timing differs')
            kind = 'activated_ability_not_turn_start'
        elif card_id == 'C-bat':
            trigger = timing.TRIGGERS.get(card_id)
            if trigger is None or any(fragment not in section for fragment in trigger[1:]):
                raise ValueError('320 bat trigger source differs')
            kind = 'event_trigger_not_turn_start'
        else:
            raise ValueError('320 unclassified companion at start boundary')
        projected['players'][actor]['board']['companions'].remove(instance)
        classified.append({'source_instance_id': instance, 'card_id': card_id,
                           'trigger_kind': kind,
                           'source_reference': '72-companion-26-card-text-draft.md#' + card_id})
    partner = board['partner']
    if partner is not None and game['cards'][partner]['card_id'] == 'P-anglerfish':
        section = hand.source_section('74-partner-18-card-text-draft.md', 'P-anglerfish')
        if '自分のメインが自分からちょうせんする時' not in section or board['partner_stage'] is None:
            raise ValueError('320 anglerfish event timing differs')
        projected['players'][actor]['board']['partner'] = None
        projected['players'][actor]['board']['partner_stage'] = None
        classified.append({'source_instance_id': partner, 'card_id': 'P-anglerfish',
                           'trigger_kind': 'event_trigger_not_turn_start',
                           'source_reference': '74-partner-18-card-text-draft.md#P-anglerfish'})
    classified.extend(ORIGINAL_CLASSIFY(projected, actor))
    return classified


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256'])):
        raise ValueError('320 selected state boundary differs')
    path = row['path_id']
    if path in ('probe-01-a-first', 'probe-02-a-first'):
        if (selected['selected_candidate'] != 'turn_end' or
                selected['resolution_mode'] != 'mandatory_proved_end' or
                not proof['turn_end_set_complete'] or
                proof['completeness_checks'] != selected['six_stage_checks']):
            raise ValueError('320 proved end choice differs')
        original = end.classify_next_board
        try:
            end.classify_next_board = classify_next_board
            result = end.run_route(row, proof)
        finally:
            end.classify_next_board = original
        if (len(result['new_events']) != 2 or
                [x['action_type'] for x in result['new_events']] !=
                ['turn_end_completed', 'turn_start_and_egg_draw']):
            raise ValueError('320 end/draw differs')
        return result
    if (path not in ('probe-01-b-first', 'probe-02-b-first') or
            selected['selected_candidate'] != 'response-pass' or
            selected['resolution_mode'] != 'response_unique' or
            proof['candidate_ids'] != ['response-pass'] or
            proof['next_opportunity'] != 'response_window'):
        raise ValueError('320 response choice differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('320 source continuation differs')
    actor = before['response_context']['priority_actor']
    after, event, _ = start._pass(before, actor)
    normal._verify_step(before, after, [event])
    if path == 'probe-01-b-first':
        if (before['response_context']['consecutive_passes'] != 0 or
                after['response_context']['consecutive_passes'] != 1 or
                after['response_context']['priority_actor'] == actor):
            raise ValueError('320 first response priority differs')
        reason = 'unproved_next_priority_response_candidates'
    else:
        if (before['response_context']['consecutive_passes'] != 1 or
                after['response_context']['consecutive_passes'] != 2 or
                after['game_state']['phase'] != 'normal_action'):
            raise ValueError('320 second response closure differs')
        reason = 'unproved_current_normal_action_candidates'
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
            return ['320 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['320 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['320 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or sum(len(x['new_events']) for x in results) != 6 or any(validate_result(x) for x in results):
        raise ValueError('320 four paths/six transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': sum(len(x['new_decisions']) for x in results),
            'new_events': 6, 'new_snapshots': 6,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('320 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('320: two end/draws and two response passes')


if __name__ == '__main__':
    main()
