#!/usr/bin/env python3
"""Audit the current normal and building-chain opportunities from 170."""

import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_next_response_restart_170 as prior
import proxy_new_seed_normal_trigger_audit_146 as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '144be1554384d787a95a1c65d6dc246632c2c0415bd93cf582e1a0cef5c47b56'
OUTPUT = ROOT / 'data/proxy-new-seed-opportunity-audit-171-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_opportunity_audit_171.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('170 protected raw or replay differs')
    report = json.loads(raw)
    if report['schema'] != prior.SCHEMA or any(prior.validate_result(row) for row in report['results']):
        raise ValueError('170 source event/hash chain differs')
    return report


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['stop_reason_code'] == 'unproved_current_normal_action_candidates':
        if game['phase'] != 'normal_action' or state['activation_zone'] or state['pending_triggers']:
            raise ValueError('171 normal action boundary differs')
        audit = normal.audit_route(row)
        if not audit['candidate_set_complete'] or audit['missing_contract'] is not None or \
                not all(audit['completeness_checks'].values()):
            raise ValueError('171 normal candidate completeness differs')
        return {**base, 'next_opportunity': 'normal_action',
                'candidate_ids': audit['candidate_ids'], 'candidate_set_complete': True,
                'board_response_exclusions': audit['board_response_exclusions'],
                'legal_candidate_details': audit['legal_candidate_details'],
                'completeness_checks': audit['completeness_checks']}
    if row['stop_reason_code'] != 'unproved_current_chain_response_or_resolution':
        raise ValueError('171 unclassified current opportunity')
    ctx = state['response_context']
    if game['phase'] != 'response_window' or ctx['chain_status'] != 'building' or \
            ctx['window_kind'] != 'turn_start' or ctx['consecutive_passes'] != 0 or \
            len(ctx['chain_links']) != 1 or len(state['activation_zone']) != 1 or \
            ctx['chain_links'][0] != state['activation_zone'][0]['link_id'] or state['pending_triggers']:
        raise ValueError('171 building chain boundary differs')
    actor = ctx['priority_actor']
    board = game['players'][actor]['board']
    if board['companions'] or board['partner'] is not None or board['main'] is not None or \
            board['prepared'] or board['world'] is not None:
        raise ValueError('171 unproved current board response ability')
    opportunity = start.enumerate_opportunity(state, actor, start.load_candidate_rows())
    if not opportunity['candidate_set_complete']:
        raise ValueError('171 response candidate completeness differs')
    return {**base, 'next_opportunity': 'response_window',
            'candidate_ids': opportunity['legal_candidate_ids'], 'candidate_set_complete': True,
            'hand_exclusions': opportunity['excluded_candidates'],
            'legal_candidate_details': opportunity['legal_candidate_details']}


def validate_result(result):
    try:
        source = next(row for row in load_source()['results'] if row['path_id'] == result['path_id'])
        return [] if result == audit_route(source) else ['171 independent opportunity audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()['results']]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('171 current opportunities differ')
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
            raise SystemExit('171 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('171: 3 normal action and 1 building-chain response candidate audit')


if __name__ == '__main__':
    main()
