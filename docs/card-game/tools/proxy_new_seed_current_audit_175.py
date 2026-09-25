#!/usr/bin/env python3
"""Audit world priority, post-placement response, and item resolution boundary."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_next_restart_174 as prior
import proxy_new_seed_opportunity_audit_171 as normal_proofs
import proxy_normal_decision_hardening as hardening
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '4c32524e82a9cf54bac36baf962fc6b988f0a677f78ff130f12b60c9fec1e581'
OUTPUT = ROOT / 'data/proxy-new-seed-current-audit-175-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_current_audit_175.v1'
QUICK_CONDITIONS = {
    'E-final-time': ('91-event-21-card-text-draft.md', '自分のメインが⑧、または現在のラウンドがR10', 'round_or_main_stage_not_met'),
    'G-archery-3d': ('79-play-batch-1-card-text-draft.md', '自分にセカイがある場合', 'own_world_absent'),
    'E-fateful-transform': ('91-event-21-card-text-draft.md', '自分のメインがいる場合', 'own_main_absent'),
    'G-asteroids-classic': ('83-play-batch-3-card-text-draft.md', '自分の準備枠の時コスト3以上の装備カード1枚', 'own_equipment_target_absent'),
}


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('174 protected raw or replay differs')
    report = json.loads(raw)
    if report['schema'] != prior.SCHEMA or any(prior.validate_result(row) for row in report['results']):
        raise ValueError('174 source state/hash differs')
    return report


def _source_section(filename, card_id):
    return (ROOT / filename).read_text().split(f'### {card_id} — ', 1)[1].split('\n### ', 1)[0]


def audit_route(row):
    state = row['final_continuation_state']; game = state['game_state']
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['stop_reason_code'] == 'unproved_world_priority_comparison':
        proof = next(x for x in json.loads(normal_proofs.OUTPUT.read_bytes())['results']
                     if x['path_id'] == row['path_id'])
        actor = game['turn_player']; player = game['players'][actor]
        paid = next(x for x in proof['legal_candidate_details'] if x['action_type'] == 'place_world')
        card_id = paid['card_id']; section = _source_section('89-world-13-card-text-draft.md', card_id)
        table = start.load_candidate_rows()[card_id]
        action = next(x for x in table['actions'] if x['action_type'] == 'place_world')
        cost = action['base_time_cost']
        if not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()) or \
                proof['candidate_ids'] != [paid['candidate_id'], 'pass'] or \
                game['phase'] != 'normal_action' or game['round'] != 2 or \
                state['response_context']['window_kind'] != 'turn_start' or \
                state['response_context']['consecutive_passes'] != 2 or \
                player['board']['world'] is not None or player['board']['main'] is not None or \
                player['time'] != cost or card_id != 'W-city' or cost != 2 or \
                paid['source_instance_id'] not in player['hand'] or \
                '合計が2枚になった時' not in section or 'このカード自身を出した場合も数える' not in section:
            raise ValueError('175 world first-placement/time proof differs')
        score = {'candidate_id': 'pass', 'avoid_loss_or_abort': 0,
                 'maintain_or_prevent_100': 0, 'certain_growth_difference': 0,
                 'time_after_certain_resolution': player['time'], 'payment_time': 0,
                 'consumed_card_count': 0, 'card_copy_id': '', 'value_comparison_to': {}}
        paid_score = {**score, 'candidate_id': paid['candidate_id'],
                      'time_after_certain_resolution': player['time'] - cost,
                      'payment_time': cost, 'card_copy_id': game['cards'][paid['source_instance_id']]['card_copy_id']}
        comparison = hardening.compare_candidates(score, paid_score)
        if comparison['winner'] != 'left' or comparison['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('175 world/pass priority not determined')
        return {**base, 'next_opportunity': 'selected_normal_pass', 'candidate_ids': ['pass'],
                'source_candidate_ids': proof['candidate_ids'], 'priority_comparison': comparison,
                'world_cost': cost, 'certain_growth_delta': 0}
    if row['stop_reason_code'] == 'unproved_post_placement_response_candidates':
        ctx = state['response_context']; actor = ctx['priority_actor']; player = game['players'][actor]
        board = player['board']
        if game['phase'] != 'post_placement_response' or ctx['window_kind'] != 'after_normal_action' or \
                ctx['origin_event_seq'] != row['last_valid_event_seq'] or ctx['consecutive_passes'] != 0 or \
                player['board']['main'] is not None or board['prepared'] or board['world'] is not None or \
                state['activation_zone'] or state['pending_triggers']:
            raise ValueError('175 post-placement response boundary differs')
        projected = copy.deepcopy(state); projected['game_state']['phase'] = 'response_window'
        projected['response_context']['window_kind'] = 'turn_start'
        excluded = []
        for instance in player['hand']:
            card_id = game['cards'][instance]['card_id']
            if card_id not in QUICK_CONDITIONS: continue
            filename, fragment, reason = QUICK_CONDITIONS[card_id]
            if fragment not in _source_section(filename, card_id) or \
                    (card_id == 'E-final-time' and game['round'] == 10) or \
                    (card_id == 'G-archery-3d' and board['world'] is not None) or \
                    (card_id == 'G-asteroids-classic' and board['prepared']):
                raise ValueError('175 quick-use exclusion condition differs')
            projected['game_state']['players'][actor]['hand'].remove(instance)
            excluded.append({'source_instance_id': instance, 'card_id': card_id, 'reason_code': reason})
        for instance in board['companions']:
            card_id = game['cards'][instance]['card_id']
            section = _source_section('72-companion-26-card-text-draft.md', card_id)
            if card_id not in ('C-bat', 'C-chicken') or \
                    (card_id == 'C-bat' and '相手のターンに、自分が「すぐつかう」' not in section) or \
                    (card_id == 'C-chicken' and '自分のターン開始時に発動できる' not in section):
                raise ValueError('175 board companion response timing differs')
            projected['game_state']['players'][actor]['board']['companions'].remove(instance)
            excluded.append({'source_instance_id': instance, 'card_id': card_id,
                             'reason_code': 'trigger_condition_not_met'})
        if board['partner'] is not None:
            instance = board['partner']; card_id = game['cards'][instance]['card_id']
            if card_id == 'P-cat_ceo':
                section = _source_section('74-partner-18-card-text-draft.md', card_id)
                if '交際を始めた時、発動する' not in section or \
                        'たまご中は元の関係を保ち、こいびとの能力を無効に' not in \
                        (ROOT / '66-relationship-start-and-romance-profile.md').read_text():
                    raise ValueError('175 egg suppression proof differs')
                reason = 'partner_ability_disabled_during_egg'
            else:
                section = _source_section('74-partner-18-card-text-draft.md', card_id)
                if card_id != 'P-cliff_goat' or '名前の異なるセカイへ変更した時' not in section:
                    raise ValueError('175 partner response timing differs')
                reason = 'trigger_condition_not_met'
            excluded.append({'source_instance_id': instance, 'card_id': card_id,
                             'reason_code': reason})
            projected['game_state']['players'][actor]['board']['partner'] = None
            projected['game_state']['players'][actor]['board']['partner_stage'] = None
        chance = start.enumerate_opportunity(projected, actor, start.load_candidate_rows())
        if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
            raise ValueError('175 post-placement response not uniquely proved')
        return {**base, 'next_opportunity': 'response_window', 'candidate_ids': ['response-pass'],
                'candidate_set_complete': True, 'excluded_current_sources': excluded,
                'other_hand_exclusions': chance['excluded_candidates']}
    if row['stop_reason_code'] != 'unproved_current_item_chain_resolution':
        raise ValueError('175 unclassified current opportunity')
    ctx = state['response_context']; links = state['activation_zone']
    if game['phase'] != 'response_window' or ctx['chain_status'] != 'resolving' or \
            len(ctx['chain_links']) != 1 or len(links) != 1 or \
            ctx['chain_links'][0] != links[0]['link_id'] or links[0]['action_type'] != 'use_item' or \
            links[0]['card_id'] != 'I-c_coin2' or not game['players'][links[0]['actor']]['deck'] or \
            state['pending_triggers']:
        raise ValueError('175 item resolution boundary differs')
    section = _source_section('77-current-items-card-text-draft.md', links[0]['card_id'])
    if '山札上1枚を公開し、山札の一番下に置く' not in section or \
            '公開したカードがメインだった場合、自分のそだち+5' not in section or \
            'メイン以外だった場合、1枚引く' not in section:
        raise ValueError('175 item source text differs')
    return {**base, 'next_opportunity': 'resolve_item', 'candidate_ids': [],
            'chain_link_id': links[0]['link_id'], 'source_instance_id': links[0]['source_instance_id'],
            'resolution_order': [links[0]['link_id']], 'deck_nonempty': True}


def validate_result(result):
    try:
        source = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        return [] if result == audit_route(source) else ['175 independent current audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [audit_route(x) for x in load_source()['results']]
    if len(rows) != 4 or any(validate_result(x) for x in rows):
        raise ValueError('175 current opportunity proof differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    p = argparse.ArgumentParser(); p.add_argument('--check', action='store_true'); args = p.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('175 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('175: world pass, 2 post-placement passes, 1 item resolution boundary')


if __name__ == '__main__': main()
