#!/usr/bin/env python3
"""Audit two response windows and two normal actions after 302."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_302 as states
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'b7d68f34b40d5dcd8f5d61ae9ae5672dcaba0dcf60eb8ffcb04d1626c11b86d5'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-303-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_303.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('303 source replay differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('303 source state inventory differs')
    return rows


def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    board = owner['board']
    path = row['path_id']
    active = path == 'probe-01-a-first'
    companion = 'A-015#1'
    if (game['phase'] != 'response_window' or ctx['window_kind'] != 'turn_start' or
            actor != 'A' or ctx['turn_player'] != ('A' if active else 'B') or
            ctx['chain_status'] != ('building' if active else 'empty') or
            ctx['consecutive_passes'] != (0 if active else 1) or
            len(state['activation_zone']) != int(active) or state['pending_triggers'] or
            board['companions'] != [companion] or game['cards'][companion]['card_id'] != 'C-chicken' or
            board['main'] is not None or board['world'] is not None or board['prepared'] or
            row['new_events'][0]['action_type'] != ('activate_response' if active else 'response_pass')):
        raise ValueError('303 response boundary differs')
    if active and (state['activation_zone'][0]['source_instance_id'] != companion or
                   state['activation_zone'][0]['card_id'] != 'C-chicken' or
                   state['activation_zone'][0]['source_zone'] != 'board' or
                   state['activation_zone'][0]['link_id'] not in ctx['chain_links']):
        raise ValueError('303 active board link differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('303 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('303 own main target text differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id': instance, **exclusion})
    section = hand.source_section('72-companion-26-card-text-draft.md', 'C-chicken')
    trigger = timing.TRIGGERS.get('C-chicken')
    if not trigger or any(fragment not in section for fragment in trigger[1:]):
        raise ValueError('303 chicken trigger text differs')
    if active:
        if not timing.matches('C-chicken', 'turn_start', actor, 'A', 'turn_start', actor):
            raise ValueError('303 active chicken origin differs')
        reason = 'ability_already_active_this_turn'
    else:
        if timing.matches('C-chicken', 'turn_start', actor, 'B', 'response_pass', 'B'):
            raise ValueError('303 opposing turn chicken timing differs')
        reason = 'trigger_condition_not_met'
    projected['game_state']['players'][actor]['board']['companions'].remove(companion)
    excluded = [{'source_instance_id': companion, 'card_id': 'C-chicken', 'reason_code': reason}]
    partner = board['partner']
    partner_card = game['cards'][partner]['card_id'] if partner else None
    if partner_card != 'P-cat_ceo' or '交際を始めた時、発動する' not in hand.source_section('74-partner-18-card-text-draft.md', partner_card):
        raise ValueError('303 partner timing differs')
    projected['game_state']['players'][actor]['board']['partner'] = None
    projected['game_state']['players'][actor]['board']['partner_stage'] = None
    excluded.append({'source_instance_id': partner, 'card_id': partner_card,
                     'reason_code': 'relationship_start_event_not_met'})
    chance = start.enumerate_opportunity(projected, actor, entries)
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('303 response candidate inventory differs: ' + repr(chance['legal_candidate_ids']))
    return {'next_opportunity': 'response_window', 'candidate_ids': ['response-pass'],
            'candidate_set_complete': True, 'hand_exclusions': removed,
            'hand_other_exclusions': chance['excluded_candidates'], 'board_exclusions': excluded}


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('303 source state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if game['phase'] != 'normal_action':
        if row['path_id'] not in ('probe-01-a-first', 'probe-01-b-first'):
            raise ValueError('303 unexpected response path')
        return {**base, **audit_response(row)}
    if row['path_id'] not in ('probe-02-a-first', 'probe-02-b-first') or state['activation_zone'] or state['pending_triggers']:
        raise ValueError('303 normal boundary differs')
    current = copy.deepcopy(row)
    current['stop_reason_code'] = 'unproved_current_normal_action_candidates'
    proof = normal.audit_route(current)
    if proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):
        raise ValueError('303 normal candidate completeness differs')
    return {**base, **{key: proof[key] for key in ('next_opportunity', 'candidate_ids',
            'candidate_set_complete', 'legal_candidate_details', 'completeness_checks', 'board_exclusions')}}


def validate_result(result):
    try:
        row = next(x for x in load_source() if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['303 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('303 opportunity inventory differs')
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
            raise SystemExit('303 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('303: two response windows and two normal actions audited')


if __name__ == '__main__':
    main()
