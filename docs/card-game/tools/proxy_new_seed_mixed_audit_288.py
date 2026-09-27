#!/usr/bin/env python3
"""Audit two normal actions and two turn-end responses at 287."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_287 as states
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_new_seed_chain_normal_audit_191 as partner_normal
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '55738f1e8db05e3fedb978b42233fd9fdbeac4a7973d51f70993d7190c4089f0'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-288-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_288.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('288 protected 284 replay differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('288 saved state/event inventory differs')
    return rows


def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    board = owner['board']
    path = row['path_id']
    if (game['phase'] != 'turn_end_response' or
            ctx['window_kind'] != 'after_normal_action' or
            ctx['consecutive_passes'] != 1 or ctx['chain_status'] != 'empty' or
            state['activation_zone'] or state['pending_triggers'] or board['main'] is not None or
            board['world'] is not None or board['prepared'] or row['new_events'][0]['action_type'] != 'normal_pass_end_request'):
        raise ValueError('288 next-priority response boundary differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('288 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('288 own main target text differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id': instance, **exclusion})
    excluded = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if (card_id != 'C-cat_friend' or path != 'probe-02-b-first' or
                '自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
            raise ValueError('288 unclassified board companion')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        excluded.append({'source_instance_id': instance, 'card_id': card_id,
                         'reason_code': 'requires_other_discarded_companion'})
    partner = board['partner']
    if partner:
        card_id = game['cards'][partner]['card_id']
        section = hand.source_section('74-partner-18-card-text-draft.md', card_id)
        if card_id != 'P-cliff_goat' or '初配置・同名上書き' not in section or board['world'] is not None:
            raise ValueError('288 partner timing differs')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        excluded.append({'source_instance_id': partner, 'card_id': card_id,
                         'reason_code': 'different_world_replacement_not_met'})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, entries)
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('288 next-priority response candidates differ')
    return {'next_opportunity': 'turn_end_response', 'candidate_ids': ['response-pass'],
            'candidate_set_complete': True, 'hand_exclusions': removed,
            'hand_other_exclusions': chance['excluded_candidates'], 'board_exclusions': excluded}


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('288 source state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if game['phase'] != 'normal_action':
        return {**base, **audit_response(row)}
    if row['path_id'] not in ('probe-01-a-first', 'probe-01-b-first') or state['activation_zone'] or state['pending_triggers']:
        raise ValueError('288 normal boundary differs')
    current = copy.deepcopy(row)
    current['stop_reason_code'] = 'unproved_current_normal_action_candidates'
    proof = normal.audit_route(current)
    if proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete'] or not all(
            proof['completeness_checks'].values()):
        raise ValueError('288 normal candidate completeness differs')
    return {**base, **{key: proof[key] for key in ('next_opportunity', 'candidate_ids',
            'candidate_set_complete', 'legal_candidate_details', 'completeness_checks', 'board_exclusions')}}


def validate_result(result):
    try:
        row = next(x for x in load_source() if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['288 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('288 opportunity inventory differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('288 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('288: two next-priority responses and two normal actions audited')


if __name__ == '__main__':
    main()
