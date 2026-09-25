#!/usr/bin/env python3
"""Audit the four next opportunities without advancing protected game states."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_hit_blow_response_142 as prior
import proxy_new_seed_normal_audit_140 as normal
import proxy_start_response_138 as start


ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '162f4de66bc0352b80e215f48a6651d00019c2897904c78d50023deda885b64b'
OUTPUT = ROOT / 'data/proxy-new-seed-next-opportunities-143-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_next_opportunities.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def verified_source(raw):
    if raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('142 independent canonical replay differs')
    report = json.loads(raw)
    if report['schema'] != prior.SCHEMA or len(report['results']) != 4 or report['completed'] != 0:
        raise ValueError('142 report shape differs')
    if any(prior.validate_result(row) for row in report['results']):
        raise ValueError('142 event and hash chain differs')
    return report


def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256:
        raise ValueError('142 protected raw SHA differs')
    return copy.deepcopy(verified_source(raw))


def audit_normal(row):
    state = row['final_continuation_state']['game_state']
    actor = state['turn_player']
    if state['phase'] != 'normal_action' or row['stop_reason_code'] != \
            'unproved_post_resolution_normal_action_candidates' or \
            row['final_continuation_state']['pending_triggers'] or \
            row['final_continuation_state']['activation_zone']:
        raise ValueError('normal action entry differs')
    table = normal.candidate.load_inputs()['candidate_table']
    view = normal.candidate.project_normal_action_information(
        {'game_state': state, 'actor': actor},
        {'normal_challenge_losses_by_actor': [], 'last_valid_event_seq': row['last_valid_event_seq'],
         'source_refs': [SOURCE.name]})
    view['_verified_ability_uses'] = {}
    inventory, units, ids, details = normal.board._expected(view, table)
    current = {'opportunity_context': {'round': state['round'], 'turn_player': actor,
               'actor': actor, 'phase': 'normal_action', 'decision_kind': 'normal_action',
               'choice_kind': 'normal_action'},
               'owner_state': view['players'][actor],
               'public_information': {key: value for key, value in view['players'].items() if key != actor},
               'information_policy': 'public_and_owner_known_only', 'source_inventory': inventory,
               'enumeration_units': units, 'legal_candidate_ids': ids,
               'legal_candidate_details': details, 'forbidden_information_used': []}
    checks = normal.board._checks(current, view, table)
    if not all(checks.values()) or set(checks) != set(normal.candidate.CHECKS):
        raise ValueError('current normal action completeness differs')
    return {'candidate_ids': ids, 'candidate_set_complete': True,
            'checks': checks, 'missing_contract': None, 'scope': 'normal_action_complete'}


def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    if row['stop_reason_code'] != 'unproved_next_response_candidates' or \
            ctx['window_kind'] != 'after_normal_action' or ctx['phase'] != 'response_window' or \
            ctx['chain_links'] or state['pending_triggers'] or state['activation_zone'] or \
            game['phase'] not in ('post_placement_response', 'turn_end_response'):
        raise ValueError('response opportunity entry differs')
    actor = ctx['priority_actor']
    board = game['players'][actor]['board']
    if board['prepared'] or board['partner'] is not None or board['main'] is not None or board['world'] is not None:
        raise ValueError('other board response families need separate audit')
    # 138 handles the hand family under a turn_start phase. Project only for
    # an audit; never use its synthetic state as a persisted game state.
    projected = copy.deepcopy(state)
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    board_sources = [(instance, game['cards'][instance]['card_id']) for instance in board['companions']]
    projected['game_state']['players'][actor]['board']['companions'] = []
    hand = start.enumerate_opportunity(projected, actor, start.load_candidate_rows())
    ids = hand['legal_candidate_ids']
    if board_sources:
        if game['phase'] != 'post_placement_response' or len(board_sources) != 1:
            raise ValueError('board trigger audit scope differs')
        return {'candidate_ids': ids, 'candidate_set_complete': False, 'checks': None,
                'missing_contract': 'board_triggered_response_enumeration',
                'scope': 'hand_only_board_unproved', 'board_sources': board_sources,
                'hand_excluded': hand['excluded_candidates']}
    if game['phase'] != 'turn_end_response' or ids != ['response-pass']:
        raise ValueError('end window hand candidates or phase differ')
    return {'candidate_ids': ids, 'candidate_set_complete': True, 'checks': None,
            'missing_contract': None, 'scope': 'empty_board_hand_response',
            'board_sources': [], 'hand_excluded': hand['excluded_candidates']}


def audit_route(row):
    result = (audit_normal(row) if row['stop_reason_code'] ==
              'unproved_post_resolution_normal_action_candidates' else audit_response(row))
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'next_opportunity': result['scope'], 'candidate_ids': result['candidate_ids'],
            'candidate_set_complete': result['candidate_set_complete'],
            'missing_contract': result['missing_contract'], 'checks': result['checks'],
            'board_sources': result.get('board_sources', []),
            'hand_excluded': result.get('hand_excluded', []),
            'new_decisions': 0, 'new_events': 0, 'new_snapshots': 0,
            'independent_balance_sample_count': 0}


def validate_result(row):
    try:
        source = next(x for x in load_source()['results'] if x['path_id'] == row['path_id'])
        return [] if row == audit_route(source) else ['143 independent audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()['results']]
    if any(validate_result(row) for row in results):
        raise ValueError('143 independent audit differs')
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
            raise SystemExit('143 saved canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('143: 4 next opportunities audited, 0 new events')


if __name__ == '__main__':
    main()
