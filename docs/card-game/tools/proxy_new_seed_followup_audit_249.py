#!/usr/bin/env python3
"""Audit two turn-end boundaries and two current response opportunities."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_replay_248 as states
import proxy_new_seed_followup_audit_213 as end_response
import proxy_new_seed_followup_pass_197 as placement_response
import proxy_new_seed_start_audit_206 as text_proof
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = '4e877b7b71f64791bb5fb1c26169705df4272a4b86415de6d733632658cfc20c'
OUTPUT = ROOT / 'data/proxy-new-seed-followup-audit-249-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_followup_audit_249.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            raw != states.canonical_bytes(states.build_report())):
        raise ValueError('249 saved state raw/canonical differs')
    results = json.loads(raw)['results']
    if len(results) != 4 or any(states.validate_result(row) for row in results):
        raise ValueError('249 saved four states differ')
    return results


def next_priority_response(row):
    state = copy.deepcopy(row['final_continuation_state'])
    game = state['game_state']
    ctx = state['response_context']
    actor = ctx['priority_actor']
    board = game['players'][actor]['board']
    origin = row['new_events'][0]
    if (game['phase'] != 'post_placement_response' or
            ctx['window_kind'] != 'after_normal_action' or
            ctx['consecutive_passes'] != 1 or
            origin['action_type'] != 'response_pass' or
            ctx['chain_links'] or state['pending_triggers'] or
            board['main'] is not None or board['world'] is not None or board['prepared'] or
            board['companions']):
        raise ValueError('249 second placement priority differs')
    partner = board['partner']
    partner_id = game['cards'][partner]['card_id'] if partner else None
    section = text_proof.source_section('74-partner-18-card-text-draft.md', partner_id)
    if (partner_id != 'P-cliff_goat' or
            '名前の異なるセカイへ変更した時' not in section or
            '初配置・同名上書き' not in section or
            ctx['origin_event_seq'] != row['last_valid_event_seq'] - 1):
        raise ValueError('249 partner world-change trigger exclusion unproved')
    board['partner'] = board['partner_stage'] = None
    owner = game['players'][actor]
    omitted = []
    for held in list(owner['hand']):
        card_id = game['cards'][held]['card_id']
        if card_id != 'G-animal-shogi':
            continue
        text = text_proof.source_section('83-play-batch-3-card-text-draft.md', card_id)
        if ('自分の捨て札のなかま1枚を対象' not in text or
                any(game['cards'][discard]['card_id'].startswith('C-')
                    for discard in owner['discard'])):
            raise ValueError('249 animal shogi target exclusion unproved')
        owner['hand'].remove(held)
        omitted.append({'source_instance_id': held, 'card_id': card_id,
                        'reason_code': 'requires_own_discarded_companion',
                        'source_reference': '83-play-batch-3-card-text-draft.md#G-animal-shogi'})
    chance, conditional, other_board = placement_response.opportunity(state)
    if (chance['legal_candidate_ids'] != ['response-pass'] or
            not chance['candidate_set_complete'] or other_board):
        raise ValueError('249 second priority response incomplete')
    return {'candidate_ids': ['response-pass'], 'candidate_set_complete': True,
            'hand_conditional_exclusions': omitted + conditional,
            'hand_other_exclusions': chance['excluded_candidates'],
            'board_exclusions': [{'source_instance_id': partner,
                                  'card_id': partner_id,
                                  'reason_code': 'different_world_replacement_not_met'}]}


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('249 state/hash boundary differs')
    base = {'path_id': row['path_id'],
            'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if game['phase'] == 'turn_end':
        if (row['stop_reason_code'] != 'unproved_current_turn_end_provenance' or
                state['return_target'] != 'turn_end' or
                state['pending_triggers'] or state['activation_zone'] or
                state['response_context']['consecutive_passes'] != 2):
            raise ValueError('249 turn-end entry unproved')
        return {**base, 'next_opportunity': 'turn_end_provenance',
                'candidate_ids': [], 'candidate_set_complete': False,
                'provenance_pending': True}
    if game['phase'] == 'turn_end_response':
        proof = end_response.audit_route(row)
        if proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']:
            raise ValueError('249 end response incomplete')
        return {**base, 'next_opportunity': 'turn_end_response',
                **{key: proof[key] for key in ('candidate_ids', 'candidate_set_complete',
                    'hand_conditional_exclusions', 'hand_other_exclusions', 'board_exclusions')}}
    if game['phase'] == 'post_placement_response':
        return {**base, 'next_opportunity': 'post_placement_response',
                **next_priority_response(row)}
    raise ValueError('249 current phase unclassified')


def validate_result(result):
    try:
        row = next(x for x in load_source() if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['249 independent audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()]
    if (len(results) != 4 or
            sum(x['next_opportunity'] == 'turn_end_provenance' for x in results) != 2 or
            any(validate_result(row) for row in results)):
        raise ValueError('249 four opportunities differ')
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
            raise SystemExit('249 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('249: two turn ends pending proof and two unique response passes')


if __name__ == '__main__':
    main()
