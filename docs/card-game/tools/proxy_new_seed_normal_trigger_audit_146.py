#!/usr/bin/env python3
"""Classify current board triggers outside normal action, then audit candidates."""

import argparse
import copy
import hashlib
import json
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_response_restart_145 as prior
import proxy_new_seed_normal_audit_140 as normal
import proxy_board_response_134 as board_response
import proxy_board_trigger_audit_144 as timing


ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '724f12b4bd38dc11bb2d4d672abf5cd753fca8daa110697e4f89499f087a9a8d'
OUTPUT = ROOT / 'data/proxy-new-seed-normal-trigger-audit-146-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_normal_trigger_audit.v1'
CHICKEN = {
    'kind': 'response_triggered',
    'source_text_reference': '72-companion-26-card-text-draft.md#C-chicken',
    'placement_action': 'place_companion', 'placement_growth_delta': 0,
    'placement_duration': 'none', 'response_candidate_family': 'triggered_ability',
    'response_timing': 'own_turn_start', 'independent_normal_action': False,
}


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('145 protected raw or replay differs')
    report = json.loads(raw)
    if report['schema'] != prior.SCHEMA or any(prior.validate_result(row) for row in report['results']):
        raise ValueError('145 source event/hash chain differs')
    return report


def classify_chicken(card_id, table):
    if card_id != 'C-chicken':
        raise ValueError('unclassified trigger source')
    section = (ROOT / '72-companion-26-card-text-draft.md').read_text().split(
        '### C-chicken — ', 1)[1].split('\n### ', 1)[0]
    if not all(fragment in section for fragment in (*timing.TRIGGERS[card_id][1:], '1ターンに1回')):
        raise ValueError('C-chicken triggered source text differs')
    row = next((x for x in table['cards'] if x['card_id'] == card_id), None)
    if row is None or row['card_type'] != 'companion' or \
            [(x['action_type'], x['timing']) for x in row['actions']] != \
            [('place_companion', 'normal_action_opportunity')]:
        raise ValueError('C-chicken has unexpected normal action template')
    if '条件を満たす能力' not in (ROOT / '06-action-chain-checkpoint.md').read_text() or \
            'triggered_ability' not in (ROOT / '119-response-window-contract.md').read_text():
        raise ValueError('response triggered family contract differs')
    return copy.deepcopy(CHICKEN)


@contextmanager
def trigger_scope(table):
    registry = board_response.RESPONSE_BOARD
    original = registry.get('C-chicken')
    classify = board_response.classify_response_triggered
    if original is not None and original != CHICKEN:
        raise ValueError('C-chicken response classification conflict')
    def classify_current(card_id, candidate_table):
        return classify_chicken(card_id, candidate_table) if card_id == 'C-chicken' else \
            classify(card_id, candidate_table)
    registry['C-chicken'] = copy.deepcopy(CHICKEN)
    board_response.classify_response_triggered = classify_current
    try:
        with board_response.response_board_scope({'candidate_table': table}):
            yield
    finally:
        board_response.classify_response_triggered = classify
        if original is None: registry.pop('C-chicken', None)
        else: registry['C-chicken'] = original


def audit_route(row):
    game = row['final_continuation_state']['game_state']
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_decisions': 0, 'new_events': 0, 'new_snapshots': 0}
    if game['phase'] == 'turn_end':
        return {**base, 'candidate_set_complete': False, 'candidate_ids': [],
                'board_response_exclusions': [], 'missing_contract': 'turn_end_provenance'}
    if game['phase'] != 'normal_action' or row['final_continuation_state']['pending_triggers'] or \
            row['final_continuation_state']['activation_zone']:
        raise ValueError('current normal action boundary differs')
    actor = game['turn_player']; table = normal.candidate.load_inputs()['candidate_table']
    view = normal.candidate.project_normal_action_information(
        {'game_state': game, 'actor': actor},
        {'normal_challenge_losses_by_actor': [], 'last_valid_event_seq': row['last_valid_event_seq'],
         'source_refs': [SOURCE.name]})
    view['_verified_ability_uses'] = {}
    with trigger_scope(table):
        inventory, units, ids, details = normal.board._expected(view, table)
        current = {'opportunity_context': {'round': game['round'], 'turn_player': actor,
                   'actor': actor, 'phase': 'normal_action', 'decision_kind': 'normal_action',
                   'choice_kind': 'normal_action'},
                   'owner_state': view['players'][actor],
                   'public_information': {key: val for key, val in view['players'].items() if key != actor},
                   'information_policy': 'public_and_owner_known_only',
                   'source_inventory': inventory, 'enumeration_units': units,
                   'legal_candidate_ids': ids, 'legal_candidate_details': details,
                   'forbidden_information_used': []}
        checks = normal.board._checks(current, view, table)
    if not all(checks.values()) or set(checks) != set(normal.candidate.CHECKS):
        raise ValueError('146 current twelve-check completeness differs')
    board = [{k: copy.deepcopy(v) for k, v in unit.items() if k != 'template'} for unit in units
             if unit['source_family'] == 'board_card_action' and unit['candidate_variant'] == 'response_triggered']
    for unit in board:
        if unit['reason_codes'] != ['timing_not_normal_action'] or unit['candidate_id'] is not None:
            raise ValueError('triggered board unit is not excluded from normal action')
    return {**base, 'candidate_set_complete': True, 'candidate_ids': ids,
            'board_response_exclusions': board, 'missing_contract': None,
            'completeness_checks': checks, 'legal_candidate_details': details}


def validate_result(row):
    try:
        source = next(x for x in load_source()['results'] if x['path_id'] == row['path_id'])
        return [] if row == audit_route(source) else ['146 independent current audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [audit_route(row) for row in load_source()['results']]
    if any(validate_result(row) for row in rows): raise ValueError('146 independent audit differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('146 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('146: 3 complete normal action audits, 1 turn end boundary')


if __name__ == '__main__': main()
