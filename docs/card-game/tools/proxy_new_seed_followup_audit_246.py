#!/usr/bin/env python3
"""Audit three response windows and the remaining normal opportunity."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_replay_245 as states
import proxy_new_seed_followup_audit_213 as response
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = 'ffd21937523ca113851141807b755a3288e6d8a930d8da5d7da5205ee3eaea52'
OUTPUT = ROOT / 'data/proxy-new-seed-followup-audit-246-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_followup_audit_246.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            raw != states.canonical_bytes(states.build_report())):
        raise ValueError('246 protected state raw/canonical differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(row) for row in rows):
        raise ValueError('246 saved states differ')
    return rows


def companion_response(row):
    state = row['final_continuation_state']
    game = state['game_state']
    ctx = state['response_context']
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    board = owner['board']
    origin = row['new_events'][0]
    if (game['phase'] != 'post_placement_response' or
            ctx['window_kind'] != 'after_normal_action' or
            ctx['consecutive_passes'] != 0 or
            origin['action_type'] != 'place_companion' or
            origin['source_instance_id'] not in board['companions'] or
            board['main'] is not None or board['world'] is not None or
            board['prepared'] or state['pending_triggers']):
        raise ValueError('246 companion placement boundary differs')
    instance = origin['source_instance_id']
    card_id = game['cards'][instance]['card_id']
    section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
    if (card_id != 'C-cat_friend' or
            '自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
            any(game['cards'][card]['card_id'].startswith('C-') and card != instance
                for card in owner['discard'])):
        raise ValueError('246 discarded companion target exclusion unproved')
    partner = board['partner']
    partner_id = game['cards'][partner]['card_id'] if partner else None
    partner_text = hand.source_section('74-partner-18-card-text-draft.md', partner_id)
    if (partner_id != 'P-cliff_goat' or
            '名前の異なるセカイへ変更した時' not in partner_text or
            '初配置・同名上書き' not in partner_text or
            origin['action_type'] != 'place_companion'):
        raise ValueError('246 partner world trigger exclusion unproved')
    projected = copy.deepcopy(state)
    projected_board = projected['game_state']['players'][actor]['board']
    projected_board['companions'].remove(instance)
    projected_board['partner'] = projected_board['partner_stage'] = None
    rows = start.load_candidate_rows()
    omitted = []
    for held in list(owner['hand']):
        held_id = game['cards'][held]['card_id']
        entry = rows.get(held_id)
        if entry is None:
            raise ValueError('246 unregistered hand card')
        reason = hand.extra_hand_exclusion(held_id, entry, game, actor)
        if reason is None:
            action = next((a for a in entry['actions'] if a['action_type'] in
                           ('use_play', 'use_item', 'use_event')), None)
            if action is not None and owner['time'] >= action['base_time_cost']:
                reason = conditional.conditional_exclusion(held_id, game, actor)
        if reason is None and owner['board']['main'] is None:
            action = next((a for a in entry['actions'] if a['action_type'] in
                           ('use_play', 'use_item', 'use_event')), None)
            if action is not None and action['target_rule'] == 'one own main':
                source = action['source_text_reference']
                filename, section_id = source.split('#', 1)
                text = hand.source_section(filename, section_id)
                if section_id != held_id or '自分のメイン1枚を対象' not in text:
                    raise ValueError('246 own main target text differs')
                reason = {'card_id': held_id, 'reason_code': 'requires_own_main_target',
                          'source_reference': source}
        if reason:
            projected['game_state']['players'][actor]['hand'].remove(held)
            omitted.append({'source_instance_id': held, **reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, rows)
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('246 companion response not uniquely pass')
    return {'candidate_ids': ['response-pass'], 'candidate_set_complete': True,
            'hand_conditional_exclusions': omitted,
            'hand_other_exclusions': chance['excluded_candidates'],
            'board_exclusions': [
                {'source_instance_id': instance, 'card_id': card_id,
                 'reason_code': 'requires_other_discarded_companion'},
                {'source_instance_id': partner, 'card_id': partner_id,
                 'reason_code': 'different_world_replacement_not_met'}]}


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('246 state/hash boundary differs')
    base = {'path_id': row['path_id'],
            'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if game['phase'] == 'normal_action':
        proof = normal.audit_route(row)
        if not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):
            raise ValueError('246 normal opportunity incomplete')
        return {**base, 'next_opportunity': 'normal_action',
                'candidate_ids': proof['candidate_ids'],
                'candidate_set_complete': True,
                'legal_candidate_details': proof['legal_candidate_details'],
                'completeness_checks': proof['completeness_checks'],
                'board_exclusions': proof['board_exclusions']}
    if game['phase'] == 'turn_end_response':
        proof = response.audit_route(row)
        if proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']:
            raise ValueError('246 end response incomplete')
        return {**base, 'next_opportunity': 'turn_end_response',
                **{key: proof[key] for key in ('candidate_ids', 'candidate_set_complete',
                    'hand_conditional_exclusions', 'hand_other_exclusions', 'board_exclusions')}}
    if game['phase'] == 'post_placement_response':
        return {**base, 'next_opportunity': 'post_placement_response',
                **companion_response(row)}
    raise ValueError('246 current phase unclassified')


def validate_result(result):
    try:
        row = next(row for row in load_source() if row['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['246 independent audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [audit_route(row) for row in load_source()]
    if len(rows) != 4 or any(validate_result(row) for row in rows):
        raise ValueError('246 four opportunities differ')
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
            raise SystemExit('246 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('246: three unique response passes and one complete normal action')


if __name__ == '__main__':
    main()
