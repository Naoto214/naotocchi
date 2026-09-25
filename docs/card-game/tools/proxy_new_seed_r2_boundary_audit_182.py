#!/usr/bin/env python3
"""Audit R2 turn-end stages and pending response candidates from saved states."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_audit_163 as turn
import proxy_new_seed_end_response_restart_161 as response_audit
import proxy_turn_end_provenance_restart as provenance
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/proxy-new-seed-r2-turn-end-history-181-20260925.json'
SOURCE_RAW_SHA256 = '9a35e730cac42493cef2030aa215e8d09f2093b411f916ebf5edef9d4cc8ef31'
STATES = ROOT / 'data/proxy-new-seed-partner-followup-180-20260925.json'
STATES_RAW_SHA256 = '17a4356d448858b990858766f14d94fba6c6b4aad99201f29c0fcbf8e88f89a4'
OUTPUT = ROOT / 'data/proxy-new-seed-r2-boundary-audit-182-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_r2_boundary_audit_182.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw = SOURCE.read_bytes(); saved = STATES.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or \
            hashlib.sha256(saved).hexdigest() != STATES_RAW_SHA256:
        raise ValueError('181 or 180 protected source raw differs')
    history = json.loads(raw); states = json.loads(saved)
    if history['schema'] != 'naotocchi.card_game.proxy_new_seed_r2_turn_end_history_181.v1' or \
            history['source_raw_sha256'] != STATES_RAW_SHA256 or len(history['results']) != 4 or \
            len(states['results']) != 4:
        raise ValueError('181 history or 180 source inventory differs')
    return history, states


def audit_route(row, proof):
    path = row['path_id']; state = copy.deepcopy(row['final_continuation_state'])
    game = state['game_state']; phase = game['phase']
    if (proof['path_id'], proof['source_last_valid_event_seq'],
            proof['source_game_state_sha256'], proof['source_continuation_state_sha256'],
            proof['current_phase']) != (path, row['last_valid_event_seq'],
            row['final_game_state_sha256'], row['final_continuation_state_sha256'], phase) or \
            state['return_target'] != 'turn_end' or game['round'] not in (1, 2) or \
            state['pending_triggers'] or state['activation_zone']:
        raise ValueError('182 saved current boundary differs')
    base = {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if phase == 'turn_end':
        stop = {'path_id': path, 'last_valid_event_seq': row['last_valid_event_seq'],
                'game_state_sha256': row['final_game_state_sha256'],
                'continuation_state_sha256': row['final_continuation_state_sha256'],
                'game_state': game, 'continuation_state': state}
        with turn.current_board_scope():
            result = provenance.audit_current_turn_end(stop, {
                **proof, 'source_event_seq': proof['source_last_valid_event_seq']})
        if not result['turn_end_set_complete'] or result['contract_stop_codes'] or \
                not all(result['completeness_checks'].values()):
            raise ValueError('182 R2 turn end six-stage proof incomplete')
        # The prior helper uses a legacy R1 evidence label even for round 2.
        return {**base, 'next_opportunity': 'turn_end', 'source_round': game['round'],
                'stage_inventory': result['stage_inventory'],
                'completeness_checks': result['completeness_checks'],
                'contract_stop_codes': result['contract_stop_codes'],
                'turn_end_set_complete': True}
    if phase != 'turn_end_response' or state['response_context']['consecutive_passes'] != 1 or \
            len(row['new_events']) != 1:
        raise ValueError('182 unclassified pending response boundary')
    origin = row['new_events'][0]
    if origin['action_type'] != 'normal_pass_end_request' or \
            origin['seq'] != state['response_context']['origin_event_seq']:
        raise ValueError('182 response origin differs')
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('182 source continuation hash differs')
    result = response_audit.opportunity(state, origin)
    if result['legal_candidate_ids'] != ['response-pass'] or \
            not result['candidate_set_complete']:
        raise ValueError('182 pending response candidate incomplete')
    return {**base, 'next_opportunity': 'response_window', 'source_round': game['round'],
            'candidate_ids': result['legal_candidate_ids'],
            'candidate_set_complete': True, 'origin_event_seq': origin['seq'],
            'board_exclusions': result['board_exclusions'],
            'hand_exclusions': result['excluded_candidates']}


def validate_result(result):
    try:
        history, states = load_sources()
        row = next(x for x in states['results'] if x['path_id'] == result['path_id'])
        proof = next(x for x in history['results'] if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, proof) else ['182 independent boundary differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    history, states = load_sources()
    rows = [audit_route(row, next(x for x in history['results'] if x['path_id'] == row['path_id']))
            for row in states['results']]
    if sum(x['next_opportunity'] == 'turn_end' for x in rows) != 2 or \
            any(validate_result(x) for x in rows):
        raise ValueError('182 four boundary audits differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'states_raw_sha256': STATES_RAW_SHA256, 'planned': 4, 'completed': 0,
            'new_events': 0, 'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('182 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('182: 2 complete turn-end audits, 2 unique pending end responses')


if __name__ == '__main__': main()
