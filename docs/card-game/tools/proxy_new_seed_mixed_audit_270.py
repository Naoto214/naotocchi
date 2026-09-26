#!/usr/bin/env python3
"""Audit two mandatory exchanges, one normal action and a chain response."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

import proxy_new_seed_mixed_replay_269 as states
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_normal_decision_seeded_restart as opening
import proxy_normal_decision_fallback_contract as fallback
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = '112aa61584fd27bb3df3a1ff9e91ca5103b70d240c039616bdf1bee969859766'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-270-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_270.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('270 protected source differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(row) for row in rows):
        raise ValueError('270 state/event/hash inventory differs')
    return rows


def audit_chain(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    board = owner['board']
    links = state['activation_zone']
    if (actor != 'B' or game['phase'] != 'response_window' or
            ctx['window_kind'] != 'turn_start' or ctx['chain_status'] != 'building' or
            ctx['consecutive_passes'] != 1 or len(links) != 1 or
            links[0]['card_id'] != 'I-c_coin2' or links[0]['actor'] != 'A' or
            ctx['chain_links'] != [links[0]['link_id']] or state['pending_triggers'] or
            board['main'] is not None or board['world'] is not None or board['prepared']):
        raise ValueError('270 chain responder boundary differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('270 hand candidate registration missing')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and card_id == 'G-beach-volley':
            text = hand.source_section('85-play-batch-4-card-text-draft.md', card_id)
            if ('自分のメイン1枚を対象' not in text or '能力の効果が適用されている場合' not in text or
                    action['target_rule'] != 'one own main' or board['main'] is not None):
                raise ValueError('270 beach volley target or effect text differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_main_target',
                         'source_reference': '85-play-batch-4-card-text-draft.md#' + card_id}
        if exclusion:
            removed.append({'source_instance_id': instance, **exclusion})
            projected['game_state']['players'][actor]['hand'].remove(instance)
    if len(board['companions']) != 1:
        raise ValueError('270 companion inventory differs')
    companion = board['companions'][0]
    if game['cards'][companion]['card_id'] != 'C-cat_friend':
        raise ValueError('270 companion card differs')
    text = hand.source_section('72-companion-26-card-text-draft.md', 'C-cat_friend')
    if ('自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in text or
            any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
        raise ValueError('270 companion ability target differs')
    projected['game_state']['players'][actor]['board']['companions'] = []
    partner = board['partner']
    if (partner is None or game['cards'][partner]['card_id'] != 'P-cliff_goat' or
            '初配置・同名上書き' not in hand.source_section('74-partner-18-card-text-draft.md', 'P-cliff_goat')):
        raise ValueError('270 partner event trigger differs')
    projected['game_state']['players'][actor]['board']['partner'] = None
    projected['game_state']['players'][actor]['board']['partner_stage'] = None
    chance = start.enumerate_opportunity(projected, actor, entries)
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('270 chain response candidates incomplete')
    return {'next_opportunity': 'response_window', 'candidate_ids': chance['legal_candidate_ids'],
            'candidate_set_complete': True, 'hand_exclusions': removed,
            'hand_other_exclusions': chance['excluded_candidates'],
            'board_exclusions': [
                {'source_instance_id': companion, 'card_id': 'C-cat_friend',
                 'reason_code': 'requires_other_discarded_companion'},
                {'source_instance_id': partner, 'card_id': 'P-cliff_goat',
                 'reason_code': 'different_world_replacement_not_met'}],
            'active_link_id': links[0]['link_id']}


def audit_route(row):
    state = row['final_continuation_state']
    game, actor = state['game_state'], state['game_state']['turn_player']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('270 source state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] in ('probe-01-a-first', 'probe-02-a-first'):
        owner = game['players'][actor]
        if (row['stop_reason_code'] != 'unproved_current_egg_exchange_choice' or
                game['phase'] != 'egg_exchange_choice' or not 1 <= game['round'] <= 10 or
                len(owner['hand']) < 2 or owner['reservations'] or
                state['activation_zone'] or state['pending_triggers']):
            raise ValueError('270 mandatory egg boundary differs')
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        hand_cards = [{'card_copy_id': game['cards'][instance]['card_copy_id'],
                       'card_id': game['cards'][instance]['card_id'], 'initial_instance_id': instance}
                      for instance in owner['hand']]
        decision = opening.build_mandatory_choice_decision({'order_id': order}, actor,
            game['round'], game['round'], hand_cards)
        if (fallback.validate_seeded_resolution(decision) or
                len(decision['legal_candidates']) != len(owner['hand']) or
                decision['seeded_fallback_candidates'] != decision['legal_candidates'] or
                {x['initial_instance_id'] for x in decision['legal_candidate_details']} != set(owner['hand'])):
            raise ValueError('270 mandatory egg candidates differ')
        return {**base, 'next_opportunity': 'mandatory_egg_exchange',
                'candidate_ids': decision['legal_candidates'], 'candidate_set_complete': True,
                'legal_candidate_details': decision['legal_candidate_details'],
                'resolution_mode': decision['resolution_mode']}
    if row['path_id'] == 'probe-01-b-first':
        proof = normal.audit_route(row)
        if (proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete'] or
                not all(proof['completeness_checks'].values())):
            raise ValueError('270 normal candidate inventory differs')
        return {**base, 'next_opportunity': 'normal_action',
                'candidate_ids': proof['candidate_ids'], 'candidate_set_complete': True,
                'legal_candidate_details': proof['legal_candidate_details'],
                'completeness_checks': proof['completeness_checks'],
                'board_exclusions': proof['board_exclusions']}
    if row['path_id'] == 'probe-02-b-first':
        return {**base, **audit_chain(row)}
    raise ValueError('270 unknown path')


def validate_result(result):
    try:
        row = next(x for x in load_source() if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['270 independent audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()]
    if (len(results) != 4 or sum(x['next_opportunity'] == 'mandatory_egg_exchange' for x in results) != 2 or
            any(validate_result(row) for row in results)):
        raise ValueError('270 four opportunities differ')
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
            raise SystemExit('270 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('270: two egg exchanges, one normal action, one unique chain pass')


if __name__ == '__main__':
    main()
