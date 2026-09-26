#!/usr/bin/env python3
"""Audit three second priority responses and the reached turn end boundary."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_258 as states
import proxy_new_seed_next_response_audit_208 as responses
import proxy_new_seed_start_audit_206 as text_proof
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = 'bb41a1c0bad5a1ffa54dcf1b20fc92d00ddd57d587b1afd202e4b7c85623fca8'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-259-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_259.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            raw != states.canonical_bytes(states.build_report())):
        raise ValueError('259 protected source raw/canonical differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(row) for row in rows):
        raise ValueError('259 protected source states differ')
    return rows


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('259 source state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if game['phase'] == 'turn_end':
        if (row['path_id'] != 'probe-02-b-first' or
                row['stop_reason_code'] != 'unproved_current_turn_end_provenance' or
                state['return_target'] != 'turn_end' or state['pending_triggers'] or
                state['activation_zone'] or
                state['response_context']['consecutive_passes'] != 2):
            raise ValueError('259 turn-end entry differs')
        return {**base, 'next_opportunity': 'turn_end_provenance',
                'candidate_ids': [], 'candidate_set_complete': False,
                'provenance_pending': True}
    if game['phase'] != 'response_window':
        raise ValueError('259 next response phase differs')
    priority = state['response_context']['priority_actor']
    person = game['players'][priority]['board']['partner']
    projected = copy.deepcopy(row)
    excluded = []
    if person is not None and game['cards'][person]['card_id'] == 'P-cat_ceo':
        section = text_proof.source_section('74-partner-18-card-text-draft.md', 'P-cat_ceo')
        if ('交際を始めた時、発動する' not in section or
                person not in projected['final_continuation_state']['game_state']['players'][priority]['board'].values()):
            raise ValueError('259 event-only partner source differs')
        board = projected['final_continuation_state']['game_state']['players'][priority]['board']
        board['partner'] = board['partner_stage'] = None
        excluded.append({'source_instance_id': person, 'card_id': 'P-cat_ceo',
                         'reason_code': 'relationship_start_event_not_met',
                         'source_reference': '74-partner-18-card-text-draft.md#P-cat_ceo'})
    proof = responses.audit_route(projected)
    if proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']:
        raise ValueError('259 next priority candidate set differs')
    return {**base, 'next_opportunity': 'response_window',
            'candidate_ids': proof['candidate_ids'], 'candidate_set_complete': True,
            'hand_conditional_exclusions': proof['hand_conditional_exclusions'],
            'hand_other_exclusions': proof['hand_other_exclusions'],
            'board_exclusions': excluded + proof['board_exclusions']}


def validate_result(result):
    try:
        row = next(x for x in load_source() if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['259 independent audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [audit_route(row) for row in load_source()]
    if (len(rows) != 4 or sum(x['next_opportunity'] == 'response_window' for x in rows) != 3 or
            any(validate_result(row) for row in rows)):
        raise ValueError('259 mixed opportunities differ')
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
            raise SystemExit('259 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('259: three next priority passes, one turn end provenance pending')


if __name__ == '__main__':
    main()
