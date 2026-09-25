#!/usr/bin/env python3
"""Audit safe partner choices and next chain priority; retain world choice."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_chain_pass_172 as prior
import proxy_new_seed_opportunity_audit_171 as proofs
import proxy_new_seed_normal_restart_157 as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = 'b1e1bdb35d293a5cf4444e7ccfab397ae0cc8e7e72a19e4603f5b6196837b67b'
OUTPUT = ROOT / 'data/proxy-new-seed-next-audit-173-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_next_audit_173.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('172 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in result['results']):
        raise ValueError('172 source state/hash differs')
    return result


def audit_route(row, proof):
    if (row['path_id'], row['source_last_valid_event_seq'], row['source_game_state_sha256'],
            row['source_continuation_state_sha256']) != (proof['path_id'],
            proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('172/171 source boundary differs')
    state = row['final_continuation_state']; game = state['game_state']
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] == 'normal_action':
        details = proof['legal_candidate_details']
        families = {x['action_type'] for x in details}
        if families == {'place_partner', 'play_main', 'pass'}:
            decision = normal.decide(row, proof)
            if decision['resolution_mode'] != 'safe_free_development' or \
                    decision['selected_action']['action_type'] != 'place_partner' or \
                    not decision['paid_birth_comparison']:
                raise ValueError('173 safe partner decision differs')
            return {**base, 'next_opportunity': 'selected_normal_action',
                    'selected_decision': decision, 'candidate_ids': proof['candidate_ids'],
                    'board_exclusions': []}
        if families == {'place_world', 'pass'}:
            if not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):
                raise ValueError('173 held world candidate proof differs')
            return {**base, 'next_opportunity': 'world_priority_audit',
                    'selected_decision': None, 'candidate_ids': proof['candidate_ids'],
                    'board_exclusions': []}
        raise ValueError('173 unclassified normal decision families')
    if proof['next_opportunity'] != 'response_window':
        raise ValueError('173 unclassified current response')
    ctx = state['response_context']; actor = ctx['priority_actor']
    if ctx['chain_status'] != 'building' or ctx['consecutive_passes'] != 1 or \
            ctx['window_kind'] != 'turn_start' or game['phase'] != 'response_window' or \
            not state['activation_zone'] or state['pending_triggers']:
        raise ValueError('173 chain response boundary differs')
    board = game['players'][actor]['board']
    if board['companions'] or board['main'] is not None or board['world'] is not None or board['prepared']:
        raise ValueError('173 unproved board response source')
    excluded = []
    projected = copy.deepcopy(state)
    if board['partner'] is not None:
        instance = board['partner']; card_id = game['cards'][instance]['card_id']
        section = (ROOT / '74-partner-18-card-text-draft.md').read_text().split(
            f'### {card_id} — ', 1)[1].split('\n### ', 1)[0]
        if card_id != 'P-anglerfish' or '自分のメインが自分からちょうせんする時' not in section or \
                game['players'][actor]['challenge_used']:
            raise ValueError('173 partner response timing differs')
        excluded.append({'source_instance_id': instance, 'card_id': card_id,
                         'reason_code': 'trigger_condition_not_met'})
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
    chance = start.enumerate_opportunity(projected, actor, start.load_candidate_rows())
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('173 next chain response not uniquely proved')
    return {**base, 'next_opportunity': 'response_window', 'selected_decision': None,
            'candidate_ids': chance['legal_candidate_ids'], 'board_exclusions': excluded,
            'hand_exclusions': chance['excluded_candidates']}


def validate_result(result):
    try:
        row = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        proof = next(x for x in json.loads(proofs.OUTPUT.read_bytes())['results']
                     if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, proof) else ['173 independent audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [audit_route(row, proof) for row, proof in
            zip(load_source()['results'], json.loads(proofs.OUTPUT.read_bytes())['results'])]
    if len(rows) != 4 or any(validate_result(x) for x in rows):
        raise ValueError('173 next audit differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    p = argparse.ArgumentParser(); p.add_argument('--check', action='store_true'); args = p.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('173 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('173: 2 safe partner decisions, 1 unique next chain pass, 1 world choice held')


if __name__ == '__main__': main()
