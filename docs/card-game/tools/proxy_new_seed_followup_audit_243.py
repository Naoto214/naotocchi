#!/usr/bin/env python3
"""Audit corrected placement response and three normal opportunities."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_replay_242 as states
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_new_seed_chain_normal_audit_191 as partner_normal
import proxy_new_seed_followup_pass_197 as response
import proxy_new_seed_start_audit_206 as hand
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = '6a1ba5a92e8c7925e3aa00f8012a441219beef89bac14a54f9581f9166fea65b'
OUTPUT = ROOT / 'data/proxy-new-seed-followup-audit-243-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_followup_audit_243.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            raw != states.canonical_bytes(states.build_report())):
        raise ValueError('243 corrected state raw/canonical differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(row) for row in rows):
        raise ValueError('243 corrected four states differ')
    return rows


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('243 source state/hash differs')
    base = {'path_id': row['path_id'],
            'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if game['phase'] == 'normal_action':
        actor = game['turn_player']
        partner = game['players'][actor]['board']['partner']
        card_id = game['cards'][partner]['card_id'] if partner else None
        proof = (partner_normal.audit_route(row) if card_id == 'P-anglerfish'
                 else normal.audit_route(row))
        if (proof['next_opportunity'] != 'normal_action' or
                not proof['candidate_set_complete'] or
                not all(proof['completeness_checks'].values())):
            raise ValueError('243 normal candidate completeness differs')
        return {**base, 'next_opportunity': 'normal_action',
                'candidate_ids': copy.deepcopy(proof['candidate_ids']),
                'candidate_set_complete': True,
                'legal_candidate_details': copy.deepcopy(proof['legal_candidate_details']),
                'completeness_checks': copy.deepcopy(proof['completeness_checks']),
                'board_exclusions': copy.deepcopy(proof.get('board_exclusions',
                                                             proof.get('board_response_exclusions')))}
    ctx = state['response_context']
    actor = ctx['priority_actor']
    board = game['players'][actor]['board']
    if (row['path_id'] != 'probe-01-b-first' or
            game['phase'] != 'post_placement_response' or
            ctx['consecutive_passes'] != 1 or
            ctx['window_kind'] != 'after_normal_action' or
            board['main'] is not None or board['partner'] is None or
            game['cards'][board['partner']]['card_id'] != 'P-cat_ceo'):
        raise ValueError('243 post-placement response boundary differs')
    text = hand.source_section('74-partner-18-card-text-draft.md', 'P-cat_ceo')
    if ('交際を始めた時、発動する' not in text or
            'たまご中は元の関係を保ち、こいびとの能力を無効に' not in
            (ROOT / '66-relationship-start-and-romance-profile.md').read_text()):
        raise ValueError('243 egg partner suppression unproved')
    projected = copy.deepcopy(state)
    own = projected['game_state']['players'][actor]
    partner = own['board']['partner']
    own['board']['partner'] = own['board']['partner_stage'] = None
    omitted = []
    candidates = start.load_candidate_rows()
    for instance in list(own['hand']):
        card_id = game['cards'][instance]['card_id']
        exclusion = hand.extra_hand_exclusion(card_id, candidates[card_id], game, actor)
        if exclusion:
            own['hand'].remove(instance)
            omitted.append({'source_instance_id': instance, **exclusion})
    chance, other_hand, board_exclusions = response.opportunity(projected)
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('243 next priority response not unique')
    return {**base, 'next_opportunity': 'post_placement_response',
            'candidate_ids': ['response-pass'], 'candidate_set_complete': True,
            'hand_conditional_exclusions': omitted + other_hand,
            'hand_other_exclusions': chance['excluded_candidates'],
            'board_exclusions': [{'source_instance_id': partner,
                                  'card_id': 'P-cat_ceo',
                                  'reason_code': 'partner_ability_disabled_during_egg'}] +
                                board_exclusions}


def validate_result(result):
    try:
        row = next(row for row in load_source() if row['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['243 independent opportunity differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [audit_route(row) for row in load_source()]
    if (len(rows) != 4 or
            sum(row['next_opportunity'] == 'normal_action' for row in rows) != 3 or
            any(validate_result(row) for row in rows)):
        raise ValueError('243 mixed opportunities differ')
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
            raise SystemExit('243 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('243: three normal actions and one placement response complete')


if __name__ == '__main__':
    main()
