#!/usr/bin/env python3
"""Checkpoint 140: prove normal-action candidates from immutable 138 stops."""

import argparse
import copy
import hashlib
import json
from pathlib import Path

import proxy_board_active_132 as board
import proxy_normal_action_candidate_completeness as candidate
import proxy_start_response_138 as start


ROOT = Path(__file__).resolve().parents[1]
SOURCE = start.OUTPUT
SOURCE_RAW_SHA256 = '4066a8307eeaeb7b11a473cbbdeba576cfcd2a0335b697ea1b24a7c02d52622c'
OUTPUT = ROOT / 'data/proxy-new-seed-normal-audit-140-20260924.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_normal_audit.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256:
        raise ValueError('138 source raw SHA differs')
    report = json.loads(raw)
    if report['schema'] != start.SCHEMA or report['planned'] != 4 or len(report['results']) != 4:
        raise ValueError('138 source report shape differs')
    original = start.load_source()['results']
    if len({row['path_id'] for row in report['results']}) != 4 or [x['path_id'] for x in original] != [x['path_id'] for x in report['results']]:
        raise ValueError('138 path identity/order differs')
    for row, opening in zip(report['results'], original):
        verify_route(row, opening)
    return report


def verify_route(row, opening):
    if row['source_game_state_sha256'] != opening['final_state_sha256'] or \
            row['source_last_event_seq'] != opening['last_valid_event_seq'] or \
            row['last_valid_event_seq'] != opening['last_valid_event_seq'] + len(row['events']) or \
            row['snapshots'][-1]['event_seq'] != row['last_valid_event_seq'] or \
            row['snapshots'][-1]['game_state'] != row['final_game_state'] or \
            row['snapshots'][-1]['continuation_state'] != row['final_continuation_state'] or \
            row['snapshots'][-1]['game_state_sha256'] != row['final_game_state_sha256'] or \
            row['snapshots'][-1]['continuation_state_sha256'] != row['final_continuation_state_sha256'] or \
            row['balance_sample_count'] != 0 or not row['seeded_fallback_used']:
        raise ValueError('138 terminal/source boundary differs')
    errors = start.validate_result(row, opening)
    if errors:
        raise ValueError('138 replay and event/hash chain differs: ' + '; '.join(errors))


def audit_normal_action(row, table):
    state = row['final_game_state']
    actor = state['turn_player']
    if row['stop_phase'] != 'normal_action' or row['final_continuation_state']['game_state'] != state or \
            any(event['action_type'] != 'response_pass' for event in row['events']) or \
            any(player['board']['main'] for player in state['players'].values()):
        raise ValueError('current public challenge history cannot be proved from source')
    history = {'normal_challenge_losses_by_actor': [], 'last_valid_event_seq': row['last_valid_event_seq'],
               'source_refs': ['data/proxy-independent-seed-probe-20260924.json', SOURCE.name]}
    view = candidate.project_normal_action_information(
        {'game_state': state, 'actor': actor}, history)
    view['_verified_ability_uses'] = {}
    inventory, units, ids, details = board._expected(view, table)
    current = {'opportunity_context': {'round': state['round'], 'turn_player': actor,
               'actor': actor, 'phase': 'normal_action', 'decision_kind': 'normal_action',
               'choice_kind': 'normal_action'},
               'owner_state': view['players'][actor],
               'public_information': {key: val for key, val in view['players'].items() if key != actor},
               'information_policy': 'public_and_owner_known_only', 'source_inventory': inventory,
               'enumeration_units': units, 'legal_candidate_ids': ids, 'legal_candidate_details': details,
               'forbidden_information_used': [], 'completeness_checks': {},
               'candidate_set_complete': False, 'contract_stop_codes': []}
    current['completeness_checks'] = board._checks(current, view, table)
    current['candidate_set_complete'] = all(current['completeness_checks'].values())
    if not current['candidate_set_complete'] or set(current['completeness_checks']) != set(candidate.CHECKS):
        raise ValueError('140 current normal candidate completeness differs')
    return current


def build_report(source=None):
    if source is None:
        source = load_source()
    table = candidate.load_inputs()['candidate_table']
    original = start.load_source()['results']
    result = []
    for row, opening in zip(source['results'], original):
        verify_route(row, opening)
        current = audit_normal_action(row, table) if row['stop_phase'] == 'normal_action' else None
        if current is None and row['stop_reason_code'] != 'unproved_start_quick_use_activation_resolution':
            raise ValueError('unclassified 138 stop')
        result.append({'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
                       'source_game_state_sha256': row['final_game_state_sha256'],
                       'source_continuation_state_sha256': row['final_continuation_state_sha256'],
                       'normal_action_candidate_audit': current,
                       'stop_reason_code': ('unproved_new_seed_normal_action_decision' if current else row['stop_reason_code']),
                       'new_decisions': 0, 'new_events': 0, 'new_snapshots': 0,
                       'independent_balance_sample_count': 0})
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': len(result), 'normal_action_audited': sum(x['normal_action_candidate_audit'] is not None for x in result),
            'completed': 0, 'new_events': 0, 'independent_balance_sample_count': 0, 'results': result}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('140 saved canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('140: 3 normal action candidate audits, 0 new events')


if __name__ == '__main__':
    main()
