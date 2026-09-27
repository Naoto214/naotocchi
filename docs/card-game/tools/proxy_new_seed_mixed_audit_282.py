#!/usr/bin/env python3
"""Audit the response and coin-resolution boundaries reached at 281."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_281 as states
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_board_ability_id_167 as identifiers
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'b5f30323da88fef0aca600a0c3a3068677a8350ccb03b0eb20e27ef4b19f078e'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-282-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_282.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('282 protected replay differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('282 saved event/state/hash inventory differs')
    return rows


def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    board = owner['board']
    path = row['path_id']
    expected_phase = 'response_window' if path == 'probe-01-b-first' else 'post_placement_response'
    expected_window = 'turn_start' if path == 'probe-01-b-first' else 'after_normal_action'
    if (game['phase'] != expected_phase or ctx['window_kind'] != expected_window or
            ctx['chain_status'] != 'empty' or ctx['consecutive_passes'] != (1 if path == 'probe-02-b-first' else 0) or
            state['activation_zone'] or state['pending_triggers'] or board['main'] is not None or
            board['world'] is not None or board['prepared']):
        raise ValueError('282 response boundary differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('282 missing hand candidate registration')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if exclusion is None:
            action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
            if action is not None and owner['time'] >= action['base_time_cost']:
                exclusion = conditional.conditional_exclusion(card_id, game, actor)
            if exclusion is None and action is not None and action['target_rule'] == 'one own main':
                filename, section_id = action['source_text_reference'].split('#', 1)
                if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                    raise ValueError('282 own main target text differs')
                exclusion = {'card_id': card_id, 'reason_code': 'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id': instance, **exclusion})
    excluded = []
    legal = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if card_id == 'C-cat_friend':
            if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or
                    '自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('282 cat friend target differs')
            reason = 'requires_other_discarded_companion'
        else:
            trigger = timing.TRIGGERS.get(card_id)
            if trigger is None or any(fragment not in section for fragment in trigger[1:]):
                raise ValueError('282 companion trigger source differs')
            origin_action = ('turn_start' if path == 'probe-01-b-first' and
                             row['new_events'][0]['action_type'] == 'egg_exchange_bottom' and
                             ctx['origin_event_seq'] == row['last_valid_event_seq'] else
                             row['new_events'][0]['action_type'])
            if timing.matches(card_id, ctx['window_kind'], actor, ctx['turn_player'],
                              origin_action, row['new_events'][0]['actor']):
                if path != 'probe-01-b-first' or card_id != 'C-chicken' or not owner['deck']:
                    raise ValueError('282 unexpected legal board ability')
                legal.append({'candidate_id': identifiers.board_ability_response_id(instance, 1),
                              'candidate_family': 'triggered_ability', 'action_type': 'activate_board_ability',
                              'source_instance_id': instance, 'card_id': card_id,
                              'source_references': ['72-companion-26-card-text-draft.md#' + card_id]})
                reason = None
            else:
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
        elif card_id == 'P-cliff_goat' and '初配置・同名上書き' in section:
            reason = 'different_world_replacement_not_met'
        else:
            raise ValueError('282 partner response timing differs')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        excluded.append({'source_instance_id': partner, 'card_id': card_id, 'reason_code': reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, entries)
    ids = sorted(chance['legal_candidate_ids'] + [x['candidate_id'] for x in legal])
    expected = (['response-activate-ability-A-015#1', 'response-pass'] if path == 'probe-01-b-first'
                else ['response-pass'])
    if ids != expected or len(ids) != len(set(ids)) or not chance['candidate_set_complete']:
        raise ValueError('282 response candidate set differs: ' + repr(ids))
    return {'next_opportunity': game['phase'], 'candidate_ids': ids,
            'candidate_set_complete': True, 'hand_exclusions': removed,
            'hand_other_exclusions': chance['excluded_candidates'],
            'board_candidate_details': legal, 'board_exclusions': excluded}


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('282 source state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] != 'probe-02-a-first':
        return {**base, **audit_response(row)}
    ctx, zone = state['response_context'], state['activation_zone']
    if (game['phase'] != 'response_window' or ctx['chain_status'] != 'resolving' or
            ctx['consecutive_passes'] != 2 or len(zone) != 1 or
            ctx['chain_links'] != [zone[0]['link_id']] or state['pending_triggers'] or
            zone[0]['action_type'] != 'use_item' or zone[0]['card_id'] != 'I-c_coin2' or
            zone[0]['actor'] != 'A' or zone[0]['source_instance_id'] != 'A-033#1' or
            zone[0]['source_instance_id'] in game['players']['A']['hand'] or
            not game['players']['A']['deck'] or zone[0]['payment'] != {'time': 1}):
        raise ValueError('282 coin resolution boundary differs')
    section = hand.source_section('77-current-items-card-text-draft.md', 'I-c_coin2')
    if any(fragment not in section for fragment in ('山札上1枚を公開し、山札の一番下に置く',
            '公開したカードがメインだった場合、自分のそだち+5', 'メイン以外だった場合、1枚引く')):
        raise ValueError('282 coin effect text differs')
    return {**base, 'next_opportunity': 'resolve_item', 'candidate_ids': [],
            'chain_link_id': zone[0]['link_id'], 'source_instance_id': 'A-033#1',
            'resolution_order': [zone[0]['link_id']], 'deck_nonempty': True}


def validate_result(result):
    try:
        row = next(x for x in load_source() if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['282 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('282 opportunity inventory differs')
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
            raise SystemExit('282 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('282: three response windows and one coin resolution audited')


if __name__ == '__main__':
    main()
