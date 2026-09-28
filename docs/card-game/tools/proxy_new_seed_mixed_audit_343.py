#!/usr/bin/env python3
"""Audit four turn-start response opportunities at 342."""
import argparse
import copy
import hashlib
import json
import sys
sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_342 as states
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_new_seed_chain_normal_audit_191 as partner_normal
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start
import proxy_board_trigger_audit_144 as timing
import proxy_board_ability_id_167 as identifiers
import proxy_normal_decision_seeded_restart as opening
import proxy_normal_decision_fallback_contract as fallback

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'a6a36249be6ec8e3a97b16ba0af819c2ef4563f6fb10dd2acb4a28a2c0a22b17'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-343-20260928.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_343.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('343 protected 284 replay differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('343 saved state/event inventory differs')
    return rows


def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    board = owner['board']
    path = row['path_id']
    expected = {'probe-01-a-first': ('response_window', 'turn_start', 'A', 0, 'egg_exchange_bottom'),
                'probe-02-a-first': ('response_window', 'turn_start', 'B', 0, 'egg_exchange_bottom'),
                'probe-02-b-first': ('post_placement_response', 'after_normal_action', 'B', 0, 'place_companion')}
    if (path not in expected or
            (game['phase'], ctx['window_kind'], actor, ctx['consecutive_passes'],
             row['new_events'][0]['action_type']) != expected[path] or
            ctx['chain_status'] != 'empty' or state['activation_zone'] or state['pending_triggers'] or
            board['main'] is not None or board['world'] is not None or board['prepared']):
        raise ValueError('343 response boundary differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed, hand_legal = [], []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('343 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if exclusion is None and card_id == 'G-animal-shogi':
            section = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if ('自分の捨て札のなかま1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('343 animal shogi target differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_discarded_companion'}
        if exclusion is None and card_id == 'E-first-date':
            section = hand.source_section('91-event-21-card-text-draft.md', card_id)
            partner = board['partner']
            if (path != 'probe-01-a-first' or not partner or board['partner_stage'] != 0 or
                    '自分のこいびと1枚を対象として発動できる' not in section or
                    '交際段階が0の場合' not in section):
                raise ValueError('343 first date target/text differs')
            action = next(x for x in entry['actions'] if x['action_type'] == 'use_event')
            if action['base_time_cost'] != 1 or owner['time'] < 1:
                raise ValueError('343 first date cost differs')
            detail = start._hand_detail(game, actor, instance, entry, action)
            detail['candidate_id'] = start.response_id('use_event', instance, target_instance_id=partner)
            detail['target_instance_ids'] = [partner]
            hand_legal.append(detail)
            exclusion = {'card_id': card_id, 'reason_code': 'enumerated_with_proven_partner_target'}
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('343 own main target text differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            if exclusion['reason_code'] != 'enumerated_with_proven_partner_target':
                removed.append({'source_instance_id': instance, **exclusion})
    excluded, legal = [], []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if card_id == 'C-chicken':
            trigger = timing.TRIGGERS.get(card_id)
            if (path != 'probe-01-a-first' or not owner['deck'] or trigger is None or
                    any(fragment not in section for fragment in trigger[1:]) or
                    not timing.matches(card_id, 'turn_start', actor, ctx['turn_player'], 'turn_start', actor)):
                raise ValueError('343 chicken start activation differs')
            legal.append({'candidate_id': identifiers.board_ability_response_id(instance, 1),
                          'candidate_family': 'triggered_ability', 'action_type': 'activate_board_ability',
                          'source_instance_id': instance, 'card_id': card_id,
                          'source_references': ['72-companion-26-card-text-draft.md#' + card_id]})
            reason = None
        elif card_id == 'C-cat_friend':
            if ('自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('343 cat friend target differs')
            reason = 'requires_other_discarded_companion'
        elif card_id == 'C-box':
            if '能力なし。' not in section:
                raise ValueError('343 box text differs')
            reason = 'no_ability'
        else:
            trigger = timing.TRIGGERS.get(card_id)
            if (card_id != 'C-bat' or trigger is None or
                    any(fragment not in section for fragment in trigger[1:]) or
                    timing.matches(card_id, ctx['window_kind'], actor, ctx['turn_player'],
                                   row['new_events'][0]['action_type'], row['new_events'][0]['actor'])):
                raise ValueError('343 bat response timing differs')
            reason = 'trigger_condition_not_met'
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        if reason:
            excluded.append({'source_instance_id': instance, 'card_id': card_id, 'reason_code': reason})
    partner = board['partner']
    if partner:
        card_id = game['cards'][partner]['card_id']
        section = hand.source_section('74-partner-18-card-text-draft.md', card_id)
        if card_id == 'P-cat_ceo' and '交際を始めた時、発動する' in section:
            reason = 'relationship_start_event_not_met'
        elif card_id == 'P-cliff_goat' and '初配置・同名上書き' in section and board['world'] is None:
            reason = 'different_world_replacement_not_met'
        elif card_id == 'P-anglerfish' and '自分のメインが自分からちょうせんする時' in section:
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('343 partner response timing differs')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        excluded.append({'source_instance_id': partner, 'card_id': card_id, 'reason_code': reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, entries)
    ids = sorted(chance['legal_candidate_ids'] + [x['candidate_id'] for x in legal + hand_legal])
    expected = (['response-activate-ability-A-015#1', 'response-pass',
                 'response-use-event-A-040#1-target-A-017#1'] if path == 'probe-01-a-first'
                else ['response-pass'])
    if ids != expected or len(ids) != len(set(ids)) or not chance['candidate_set_complete']:
        raise ValueError('343 response candidates incomplete: ' + repr(ids))
    return {'next_opportunity': game['phase'], 'candidate_ids': ids,
            'candidate_set_complete': True, 'hand_exclusions': removed,
            'hand_other_exclusions': chance['excluded_candidates'],
            'board_candidate_details': legal, 'hand_candidate_details': hand_legal,
            'board_exclusions': excluded}


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('343 source state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] == 'probe-01-b-first':
        if game['phase'] != 'normal_action' or state['activation_zone'] or state['pending_triggers']:
            raise ValueError('343 normal boundary differs')
        proof = normal.audit_route(row)
        if (proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete'] or
                not all(proof['completeness_checks'].values())):
            raise ValueError('343 normal inventory incomplete')
        return {**base, **{key: proof[key] for key in ('next_opportunity', 'candidate_ids',
                'candidate_set_complete', 'legal_candidate_details', 'completeness_checks', 'board_exclusions')}}
    return {**base, **audit_response(row)}


def validate_result(result):
    try:
        row = next(x for x in load_source() if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['343 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('343 opportunity inventory differs')
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
            raise SystemExit('343 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('343: four start responses audited')


if __name__ == '__main__':
    main()
