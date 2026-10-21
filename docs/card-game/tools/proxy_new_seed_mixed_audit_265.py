#!/usr/bin/env python3
"""Audit the four saved response opportunities after checkpoint 264."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_264 as states
import proxy_new_seed_start_audit_166 as conditional
import proxy_new_seed_start_audit_206 as hand
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = 'e2914cb18a5e273d7c804a6e22335c0e13c4581c391936cf55ad69133fb5bc1a'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-265-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_265.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('265 source raw/canonical differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(row) for row in rows):
        raise ValueError('265 protected state inventory differs')
    return rows


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    ctx = state['response_context']
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    board = owner['board']
    origin = row['new_events'][0]
    phase = game['phase']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256'] or
            state['pending_triggers'] or state['activation_zone'] or board['prepared'] or
            board['main'] is not None or board['world'] is not None):
        raise ValueError('265 response state/hash boundary differs')
    if phase == 'turn_end_response':
        if origin['action_type'] != 'normal_pass_end_request' or ctx['consecutive_passes'] != 1 or state['return_target'] != 'turn_end':
            raise ValueError('265 turn end response differs')
    elif phase == 'post_placement_response':
        if origin['action_type'] != 'place_companion' or ctx['consecutive_passes'] != 0 or ctx['window_kind'] != 'after_normal_action':
            raise ValueError('265 companion response differs')
    elif phase == 'response_window':
        if origin['action_type'] != 'egg_exchange_bottom' or ctx['window_kind'] != 'turn_start' or ctx['turn_player'] != actor:
            raise ValueError('265 start response differs')
    else:
        raise ValueError('265 unclassified response phase')

    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('265 missing card registration')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if exclusion is None and card_id == 'G-animal-shogi':
            section = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if ('自分の捨て札のなかま1枚を対象' not in section or
                    any(game['cards'][card]['card_id'].startswith('C-') for card in owner['discard'])):
                raise ValueError('265 shogi target requires proof')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_discarded_companion',
                         'source_reference': '83-play-batch-3-card-text-draft.md#' + card_id}
        if exclusion is None:
            action = next((action for action in entry['actions'] if action['action_type'] in ('use_play', 'use_item', 'use_event')), None)
            if action is not None and owner['time'] >= action['base_time_cost']:
                exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and board['main'] is None:
            action = next((action for action in entry['actions'] if action['action_type'] in ('use_play', 'use_item', 'use_event')), None)
            if action is not None and action['target_rule'] == 'one own main':
                filename, section_id = action['source_text_reference'].split('#', 1)
                if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                    raise ValueError('265 own main target text differs')
                exclusion = {'card_id': card_id, 'reason_code': 'requires_own_main_target',
                             'source_reference': action['source_text_reference']}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id': instance, **exclusion})

    board_exclusions = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        if card_id == 'C-cat_friend':
            section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
            if ('自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                    any(game['cards'][card]['card_id'].startswith('C-') and card != instance
                        for card in owner['discard'])):
                raise ValueError('265 cat friend target differs')
            reason = 'requires_other_discarded_companion'
        else:
            trigger = timing.TRIGGERS.get(card_id)
            if trigger is None or any(fragment not in hand.source_section('72-companion-26-card-text-draft.md', card_id)
                                      for fragment in trigger[1:]) or timing.matches(
                                          card_id, ctx['window_kind'], actor, ctx['turn_player'],
                                          origin['action_type'], origin['actor']):
                raise ValueError('265 companion trigger not excluded')
            reason = 'trigger_condition_not_met'
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        board_exclusions.append({'source_instance_id': instance, 'card_id': card_id, 'reason_code': reason})
    partner = board['partner']
    if partner is not None:
        card_id = game['cards'][partner]['card_id']
        section = hand.source_section('74-partner-18-card-text-draft.md', card_id)
        if card_id == 'P-cat_ceo' and '交際を始めた時、発動する' in section:
            reason = 'partner_ability_disabled_during_egg'
            if board['main'] is not None:
                raise ValueError('265 cat CEO egg boundary differs')
        elif card_id in ('P-cliff_goat', 'P-anglerfish'):
            if card_id == 'P-cliff_goat' and '初配置・同名上書き' in section:
                reason = 'different_world_replacement_not_met'
            elif card_id == 'P-anglerfish' and '自分のメインが自分からちょうせんする時' in section and board['main'] is None:
                reason = 'trigger_condition_not_met'
            else:
                raise ValueError('265 partner text differs')
        else:
            raise ValueError('265 partner timing unclassified')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        board_exclusions.append({'source_instance_id': partner, 'card_id': card_id, 'reason_code': reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, entries)
    expected = (['response-pass', 'response-use-item-A-033#1'] if row['path_id'] == 'probe-02-b-first'
                else ['response-pass'])
    if row['path_id'] == 'probe-02-b-first':
        coin = hand.source_section('77-current-items-card-text-draft.md', 'I-c_coin2')
        if ('時: 1 / 使用方法: すぐつかう' not in coin or
                '山札上1枚を公開し、山札の一番下に置く' not in coin or not owner['deck']):
            raise ValueError('265 lucky coin source/target differs')
    if chance['legal_candidate_ids'] != expected or not chance['candidate_set_complete']:
        raise ValueError('265 complete response candidate set differs: ' + repr(chance['legal_candidate_ids']))
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'next_opportunity': phase, 'candidate_ids': expected,
            'candidate_set_complete': True, 'hand_conditional_exclusions': removed,
            'hand_other_exclusions': chance['excluded_candidates'], 'board_exclusions': board_exclusions,
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        row = next(row for row in load_source() if row['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['265 independent audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [audit_route(row) for row in load_source()]
    if len(rows) != 4 or any(validate_result(row) for row in rows):
        raise ValueError('265 response audit differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('265 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('265: four complete response opportunities')


if __name__ == '__main__':
    main()
