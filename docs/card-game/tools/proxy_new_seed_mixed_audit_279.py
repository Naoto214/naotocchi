#!/usr/bin/env python3
"""Audit the four reached opportunities at the protected 278 boundary."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_278 as states
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_normal_decision_seeded_restart as opening
import proxy_normal_decision_fallback_contract as fallback
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = '6c13a285c69041483a30421efbe9ac74f1a434da1268a218d131cd06b4d6efc2'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-279-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_279.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('279 protected 278 state differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(row) for row in rows):
        raise ValueError('279 protected inventory differs')
    return rows


def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    board = owner['board']
    kind = row['path_id']
    if (actor != ('B' if kind == 'probe-02-a-first' else 'A') or
            game['phase'] != ('response_window' if kind == 'probe-02-a-first' else 'post_placement_response') or
            ctx['window_kind'] != ('turn_start' if kind == 'probe-02-a-first' else 'after_normal_action') or
            ctx['consecutive_passes'] != (1 if kind == 'probe-02-a-first' else 0) or
            state['pending_triggers'] or board['main'] is not None or board['world'] is not None or board['prepared']):
        raise ValueError('279 response boundary differs')
    zone = state['activation_zone']
    if kind == 'probe-02-a-first':
        if (ctx['chain_status'] != 'building' or len(zone) != 1 or zone[0]['card_id'] != 'I-c_coin2' or
                zone[0]['actor'] != 'A' or ctx['chain_links'] != [zone[0]['link_id']]):
            raise ValueError('279 active coin chain differs')
    elif zone or ctx['chain_status'] != 'empty' or row['new_events'][0]['action_type'] != 'place_companion':
        raise ValueError('279 placed companion boundary differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('279 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if exclusion is None and card_id == 'G-animal-shogi':
            section = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if '自分の捨て札のなかま1枚を対象' not in section or any(
                    game['cards'][x]['card_id'].startswith('C-') for x in owner['discard']):
                raise ValueError('279 animal shogi target differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_discarded_companion'}
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('279 own main text differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id': instance, **exclusion})
    board_exclusions = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        if card_id != 'C-box' or '能力なし。' not in hand.source_section('72-companion-26-card-text-draft.md', card_id):
            raise ValueError('279 unclassified companion response')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        board_exclusions.append({'source_instance_id': instance, 'card_id': card_id, 'reason_code': 'no_ability'})
    partner = board['partner']
    if partner:
        card_id = game['cards'][partner]['card_id']
        section = hand.source_section('74-partner-18-card-text-draft.md', card_id)
        if card_id != 'P-cliff_goat' or '初配置・同名上書き' not in section or board['world'] is not None:
            raise ValueError('279 unclassified partner response')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        board_exclusions.append({'source_instance_id': partner, 'card_id': card_id,
                                 'reason_code': 'different_world_replacement_not_met'})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, entries)
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('279 response candidates incomplete: ' + repr(chance['legal_candidate_ids']))
    return {'next_opportunity': game['phase'], 'candidate_ids': chance['legal_candidate_ids'],
            'candidate_set_complete': True, 'hand_exclusions': removed,
            'hand_other_exclusions': chance['excluded_candidates'], 'board_exclusions': board_exclusions,
            'active_link_id': zone[0]['link_id'] if zone else None}


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('279 state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] == 'probe-01-a-first':
        current = copy.deepcopy(row)
        current['stop_reason_code'] = 'unproved_current_normal_action_candidates'
        proof = normal.audit_route(current)
        if proof['next_opportunity'] != 'normal_action' or not all(proof['completeness_checks'].values()):
            raise ValueError('279 normal candidates incomplete')
        return {**base, **{k: proof[k] for k in ('next_opportunity', 'candidate_ids',
                'candidate_set_complete', 'legal_candidate_details', 'completeness_checks', 'board_exclusions')}}
    if row['path_id'] == 'probe-01-b-first':
        actor = game['turn_player']
        owner = game['players'][actor]
        if (game['phase'] != 'egg_exchange_choice' or not 1 <= game['round'] <= 10 or
                len(owner['hand']) < 2 or owner['reservations'] or state['activation_zone'] or state['pending_triggers']):
            raise ValueError('279 mandatory egg boundary differs')
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        held = [{'card_copy_id': game['cards'][x]['card_copy_id'], 'card_id': game['cards'][x]['card_id'],
                 'initial_instance_id': x} for x in owner['hand']]
        decision = opening.build_mandatory_choice_decision({'order_id': order}, actor,
                                                             game['round'], game['round'], held)
        if (fallback.validate_seeded_resolution(decision) or len(decision['legal_candidates']) != len(held) or
                decision['seeded_fallback_candidates'] != decision['legal_candidates'] or
                {x['initial_instance_id'] for x in decision['legal_candidate_details']} != set(owner['hand'])):
            raise ValueError('279 egg candidates incomplete')
        return {**base, 'next_opportunity': 'mandatory_egg_exchange',
                'candidate_ids': decision['legal_candidates'], 'candidate_set_complete': True,
                'legal_candidate_details': decision['legal_candidate_details'],
                'resolution_mode': decision['resolution_mode']}
    return {**base, **audit_response(row)}


def validate_result(result):
    try:
        source = next(x for x in load_source() if x['path_id'] == result['path_id'])
        return [] if result == audit_route(source) else ['279 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('279 opportunity inventory differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 4,
            'completed': 0, 'new_events': 0, 'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('279 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('279: four current opportunities audited')


if __name__ == '__main__':
    main()
