#!/usr/bin/env python3
"""Audit three response opportunities and the closed lucky coin link."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_272 as states
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = '31b0a89fc18d7e50f0c089c4e2fe68d6fc96ce8e4efaed0eeea6372d0978cfa9'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-273-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_273.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('273 protected source differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(row) for row in rows):
        raise ValueError('273 saved source differs')
    return rows


def response_set(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    board = owner['board']
    if (game['phase'] not in ('response_window', 'turn_end_response') or
            ctx['chain_status'] != 'empty' or state['activation_zone'] or
            state['pending_triggers'] or board['main'] is not None or
            board['world'] is not None or board['prepared']):
        raise ValueError('273 response boundary differs')
    if game['phase'] == 'turn_end_response':
        if ctx['consecutive_passes'] != 1 or state['return_target'] != 'turn_end':
            raise ValueError('273 end response boundary differs')
    elif ctx['consecutive_passes'] != 0 or ctx['window_kind'] != 'turn_start':
        raise ValueError('273 start response boundary differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    excluded = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('273 missing hand card registry')
        if card_id == 'C-cat_friend':
            section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
            if ('自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                    instance in board['companions']):
                raise ValueError('273 hand companion source differs')
            reason = {'card_id': card_id, 'reason_code': 'board_only_ability_source_in_hand',
                      'source_reference': '72-companion-26-card-text-draft.md#' + card_id}
        else:
            reason = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if reason is None and card_id == 'G-animal-shogi':
            section = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if ('自分の捨て札のなかま1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('273 shogi discarded companion differs')
            reason = {'card_id': card_id, 'reason_code': 'requires_own_discarded_companion',
                      'source_reference': '83-play-batch-3-card-text-draft.md#' + card_id}
        if reason is None:
            action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
            if action is not None and owner['time'] >= action['base_time_cost']:
                reason = conditional.conditional_exclusion(card_id, game, actor)
        if reason is None and board['main'] is None:
            action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
            if action is not None and action['target_rule'] == 'one own main':
                filename, section_id = action['source_text_reference'].split('#', 1)
                if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                    raise ValueError('273 own main target text differs')
                reason = {'card_id': card_id, 'reason_code': 'requires_own_main_target',
                          'source_reference': action['source_text_reference']}
        if reason:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            excluded.append({'source_instance_id': instance, **reason})
    board_excluded = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        trigger = timing.TRIGGERS.get(card_id)
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if (trigger is None or any(fragment not in section for fragment in trigger[1:]) or
                timing.matches(card_id, ctx['window_kind'], actor, ctx['turn_player'],
                               row['new_events'][0]['action_type'], row['new_events'][0]['actor'])):
            raise ValueError('273 companion timing unproved')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        board_excluded.append({'source_instance_id': instance, 'card_id': card_id,
                               'reason_code': 'trigger_condition_not_met'})
    partner = board['partner']
    if partner:
        card_id = game['cards'][partner]['card_id']
        section = hand.source_section('74-partner-18-card-text-draft.md', card_id)
        if card_id == 'P-cat_ceo' and '交際を始めた時、発動する' in section:
            reason = 'relationship_start_event_not_met'
        elif card_id == 'P-anglerfish' and '自分のメインが自分からちょうせんする時' in section:
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('273 partner response timing differs')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        board_excluded.append({'source_instance_id': partner, 'card_id': card_id,
                               'reason_code': reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, entries)
    expected = (['response-pass', 'response-use-item-A-033#1'] if
                row['path_id'] == 'probe-02-a-first' else ['response-pass'])
    if chance['legal_candidate_ids'] != expected or not chance['candidate_set_complete']:
        raise ValueError('273 response candidate set differs: ' + repr(chance['legal_candidate_ids']))
    return {'next_opportunity': game['phase'], 'candidate_ids': expected,
            'candidate_set_complete': True, 'hand_exclusions': excluded,
            'hand_other_exclusions': chance['excluded_candidates'],
            'board_exclusions': board_excluded}


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('273 source state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] != 'probe-02-b-first':
        return {**base, **response_set(row)}
    ctx, links = state['response_context'], state['activation_zone']
    if (game['phase'] != 'response_window' or ctx['chain_status'] != 'resolving' or
            ctx['consecutive_passes'] != 2 or len(links) != 1 or
            ctx['chain_links'] != [links[0]['link_id']] or state['pending_triggers'] or
            links[0]['action_type'] != 'use_item' or links[0]['card_id'] != 'I-c_coin2' or
            links[0]['actor'] != 'A' or links[0]['source_instance_id'] != 'A-033#1' or
            links[0]['source_instance_id'] in game['players']['A']['hand'] or
            not game['players']['A']['deck']):
        raise ValueError('273 coin resolution boundary differs')
    section = hand.source_section('77-current-items-card-text-draft.md', 'I-c_coin2')
    if (not all(part in section for part in ('山札上1枚を公開し、山札の一番下に置く',
            '公開したカードがメインだった場合、自分のそだち+5', 'メイン以外だった場合、1枚引く')) or
            links[0]['payment'] != {'time': 1}):
        raise ValueError('273 coin effect source differs')
    return {**base, 'next_opportunity': 'resolve_item', 'candidate_ids': [],
            'chain_link_id': links[0]['link_id'], 'source_instance_id': 'A-033#1',
            'resolution_order': [links[0]['link_id']], 'deck_nonempty': True}


def validate_result(result):
    try:
        row = next(x for x in load_source() if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['273 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('273 opportunity inventory differs')
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
            raise SystemExit('273 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('273: three response sets and one coin resolution boundary')


if __name__ == '__main__':
    main()
