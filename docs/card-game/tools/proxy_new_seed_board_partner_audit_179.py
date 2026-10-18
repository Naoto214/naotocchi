#!/usr/bin/env python3
"""Classify reached board partner response and audit three current choices."""

import argparse
import copy
import hashlib
import json
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_restart_178 as prior
import proxy_new_seed_normal_trigger_audit_146 as normal_audit
import proxy_board_response_134 as board_response
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = 'eb0f97d28c895918507471fcd8fdeb6d48cb74496693c909eeb90bf61ed9b57d'
OUTPUT = ROOT / 'data/proxy-new-seed-board-partner-audit-179-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_board_partner_audit_179.v1'
PARTNER_ABILITY = {'kind': 'response_triggered',
    'source_text_reference': '74-partner-18-card-text-draft.md#P-cliff_goat',
    'placement_action': 'place_partner', 'placement_growth_delta': 0,
    'placement_duration': 'none', 'response_candidate_family': 'triggered_ability',
    'response_timing': 'own_different_named_world_change', 'independent_normal_action': False}


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('178 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in result['results']):
        raise ValueError('178 source state/hash differs')
    return result


@contextmanager
def partner_response_scope(table):
    registry = board_response.RESPONSE_BOARD
    card_id = 'P-cliff_goat'; old = registry.get(card_id)
    old_classify = board_response.classify_response_triggered
    old_unit = board_response._response_unit
    section = (ROOT / '74-partner-18-card-text-draft.md').read_text().split(
        f'### {card_id} — ', 1)[1].split('\n### ', 1)[0]
    row = next(x for x in table['cards'] if x['card_id'] == card_id)
    if not all(x in section for x in ('1ターンに1回', '自分が名前の異なるセカイへ変更した時',
                                      '発動できる')) or row['card_type'] != 'partner' or \
            [(x['action_type'], x['timing']) for x in row['actions']] != \
            [('place_partner', 'normal_action_opportunity')] or \
            '条件を満たす能力' not in (ROOT / '06-action-chain-checkpoint.md').read_text() or \
            'triggered_ability' not in (ROOT / '119-response-window-contract.md').read_text():
        raise ValueError('179 board partner source contract differs')
    if old is not None and old != PARTNER_ABILITY:
        raise ValueError('179 partner registry conflict')

    def classify(current_id, candidate_table):
        if current_id == card_id:
            if candidate_table != table: raise ValueError('179 candidate table differs')
            return copy.deepcopy(PARTNER_ABILITY)
        return old_classify(current_id, candidate_table)

    def response_unit(view, original):
        if original['card_id'] != card_id: return old_unit(view, original)
        template = original['template']
        if template != {'timing': 'response_window',
                        'source_text_reference': PARTNER_ABILITY['source_text_reference']} or \
                original['source_instance_id'] != view['players'][view['actor']]['board']['partner']:
            raise ValueError('179 board partner response source differs')
        unit = {key: copy.deepcopy(value) for key, value in original.items() if key != 'template'}
        unit.update({'reason_codes': ['timing_not_normal_action'],
                     'disposition': 'excluded', 'candidate_id': None,
                     'evidence': {'phase': view['phase'], 'template.timing': template['timing']},
                     'source_references': [template['source_text_reference'],
                                           '06-action-chain-checkpoint.md']})
        return unit

    registry[card_id] = copy.deepcopy(PARTNER_ABILITY)
    board_response.classify_response_triggered = classify
    board_response._response_unit = response_unit
    try: yield
    finally:
        board_response._response_unit = old_unit
        board_response.classify_response_triggered = old_classify
        if old is None: registry.pop(card_id, None)
        else: registry[card_id] = old


def audit_route(row):
    state = row['final_continuation_state']; game = state['game_state']
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if game['phase'] == 'turn_end':
        if row['stop_reason_code'] != 'unproved_current_turn_end_provenance' or \
                state['return_target'] != 'turn_end' or state['activation_zone'] or state['pending_triggers']:
            raise ValueError('179 held turn end boundary differs')
        return {**base, 'next_opportunity': 'turn_end_provenance',
                'candidate_ids': [], 'candidate_set_complete': False, 'board_exclusions': []}
    if game['phase'] == 'normal_action':
        table = normal_audit.normal.candidate.load_inputs()['candidate_table']
        actor = game['turn_player']; partner = game['players'][actor]['board']['partner']
        if partner is not None and game['cards'][partner]['card_id'] == 'P-cliff_goat':
            with partner_response_scope(table): audit = normal_audit.audit_route(row)
        else: audit = normal_audit.audit_route(row)
        if not audit['candidate_set_complete'] or not all(audit['completeness_checks'].values()):
            raise ValueError('179 normal candidate completeness differs')
        return {**base, 'next_opportunity': 'normal_action',
                'candidate_ids': audit['candidate_ids'], 'candidate_set_complete': True,
                'legal_candidate_details': audit['legal_candidate_details'],
                'board_exclusions': audit['board_response_exclusions'],
                'completeness_checks': audit['completeness_checks']}
    if game['phase'] != 'turn_end_response' or row['stop_reason_code'] != \
            'unproved_turn_end_response_candidates':
        raise ValueError('179 unclassified current opportunity')
    ctx = state['response_context']; actor = ctx['priority_actor']
    board = game['players'][actor]['board']
    if ctx['consecutive_passes'] != 1 or ctx['window_kind'] != 'after_normal_action' or \
            state['return_target'] != 'turn_end' or board['main'] is not None or \
            board['world'] is not None or board['prepared'] or board['companions'] or \
            state['activation_zone'] or state['pending_triggers']:
        raise ValueError('179 turn end response boundary differs')
    projected = copy.deepcopy(state); excluded = []
    if board['partner'] is not None:
        instance = board['partner']; card_id = game['cards'][instance]['card_id']
        section = (ROOT / '74-partner-18-card-text-draft.md').read_text().split(
            f'### {card_id} — ', 1)[1].split('\n### ', 1)[0]
        if card_id != 'P-anglerfish' or '自分のメインが自分からちょうせんする時' not in section:
            raise ValueError('179 partner trigger condition differs')
        excluded.append({'source_instance_id': instance, 'card_id': card_id,
                         'reason_code': 'trigger_condition_not_met'})
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, start.load_candidate_rows())
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('179 end response pass not uniquely proved')
    return {**base, 'next_opportunity': 'response_window',
            'candidate_ids': ['response-pass'], 'candidate_set_complete': True,
            'board_exclusions': excluded, 'hand_exclusions': chance['excluded_candidates']}


def validate_result(result):
    try:
        source = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        return [] if result == audit_route(source) else ['179 independent current audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [audit_route(row) for row in load_source()['results']]
    if len(rows) != 4 or any(validate_result(row) for row in rows):
        raise ValueError('179 current board partner audit differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('179 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('179: 2 normal audits including board partner, 1 end response, 1 held turn end')


if __name__ == '__main__': main()
