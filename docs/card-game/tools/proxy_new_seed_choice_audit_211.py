#!/usr/bin/env python3
"""Verify reached normal choices against saved state and 107/114 priority."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_chain_normal_audit_210 as audits
import proxy_new_seed_ability_activation_209 as states
import proxy_new_seed_normal_restart_157 as free_choice
import proxy_normal_decision_hardening as priority
import proxy_normal_action_candidate_completeness as candidates
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audits.OUTPUT
SOURCE_RAW_SHA256 = 'c8663ba708a4f98858e2ccc7bb9a5c171d4ba4db7c6c315674ac60d7b4c08102'
OUTPUT = ROOT/'data/proxy-new-seed-choice-audit-211-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_choice_audit_211.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw = SOURCE.read_bytes(); previous = states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or \
            raw != audits.canonical_bytes(audits.build_report()) or \
            hashlib.sha256(previous).hexdigest() != audits.SOURCE_RAW_SHA256 or \
            previous != states.canonical_bytes(states.build_report()):
        raise ValueError('211 source raw/replay differs')
    proof = json.loads(raw); source = json.loads(previous)
    if proof['schema'] != audits.SCHEMA or source['schema'] != states.SCHEMA or \
            len(proof['results']) != len(source['results']) != 4 or \
            any(audits.validate_result(x) for x in proof['results']):
        raise ValueError('211 source inventory differs')
    return proof, source


def paid_score(owner, game, action):
    card = action['card_id']; source = action['source_instance_id']
    if source not in owner['hand'] or owner['board']['main'] is not None:
        raise ValueError('211 paid source or main boundary differs')
    if action['action_type'] == 'play_main':
        section = (ROOT/'55-insect-three-lines-card-text-draft.md').read_text().split(
            f'## {card} ', 1)[1].split('\n## ', 1)[0]
        if card != 'M-antlion-01' or action['candidate_variant'] != 'birth' or \
                'しかける' not in section:
            raise ValueError('211 birth certain effect unproved')
        table = candidates.load_inputs()['candidate_table']
        birth = start.opening._main_birth_detail(source, game['cards'][source],
                                                table, owner['board'], owner['time'])
        if birth is None or birth['candidate_id'] != action['candidate_id']:
            raise ValueError('211 birth cost differs')
        cost = birth['payment_time']; reference = '55-insect-three-lines-card-text-draft.md#M-antlion-01'
    elif action['action_type'] == 'place_world':
        section = (ROOT/'89-world-13-card-text-draft.md').read_text().split(
            f'### {card} — ', 1)[1].split('\n### ', 1)[0]
        entry = start.load_candidate_rows()[card]
        template = next(x for x in entry['actions'] if x['action_type'] == 'place_world')
        if card != 'W-deepsea' or owner['board']['world'] is not None or \
                action['candidate_variant'] != 'empty_world_slot' or \
                '手札が2枚以下' not in section or '自分のメイン' not in section or \
                len(owner['hand']) <= 2:
            raise ValueError('211 world immediate effect unproved')
        cost = template['base_time_cost']; reference = '89-world-13-card-text-draft.md#W-deepsea'
    else:
        raise ValueError('211 unclassified paid action')
    if cost <= 0 or owner['time'] < cost:
        raise ValueError('211 paid time boundary differs')
    return cost, reference


def audit_route(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (
            proof['path_id'], proof['source_last_valid_event_seq'],
            proof['source_game_state_sha256'], proof['source_continuation_state_sha256']):
        raise ValueError('211 source state/hash boundary differs')
    state = row['final_continuation_state']; game = state['game_state']
    if start.opening._stop_state_sha256(game) != row['final_game_state_sha256'] or \
            start.canonical_sha256(start._payload(state)) != row['final_continuation_state_sha256']:
        raise ValueError('211 state hash differs')
    base = {'path_id':row['path_id'], 'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'candidate_ids':copy.deepcopy(proof['candidate_ids']),
            'new_events':0, 'completed':False, 'balance_sample_count':0}
    if not proof['candidate_set_complete']:
        raise ValueError('211 incomplete candidates')
    if proof['next_opportunity'] == 'response_window':
        if proof['candidate_ids'] != ['response-pass'] or game['phase'] != 'response_window' or \
                state['response_context']['chain_status'] != 'building':
            raise ValueError('211 chain response differs')
        return {**base, 'selected_candidate':'response-pass', 'resolution_mode':'response_unique',
                'comparison_evidence':None}
    if proof['next_opportunity'] != 'normal_action' or game['phase'] != 'normal_action' or \
            not all(proof['completeness_checks'].values()):
        raise ValueError('211 normal completeness differs')
    details = proof['legal_candidate_details']; families = {x['action_type'] for x in details}
    if families == {'place_partner', 'play_main', 'pass'}:
        decision = free_choice.decide(row, proof)
        if decision['resolution_mode'] != 'safe_free_development' or \
                decision['selected_action']['action_type'] != 'place_partner':
            raise ValueError('211 free development differs')
        return {**base, 'selected_candidate':decision['selected_candidate'],
                'resolution_mode':decision['resolution_mode'],
                'comparison_evidence':decision['paid_birth_comparison'],
                'selected_decision':decision}
    if families != {'place_world', 'play_main', 'pass'} or len(details) != 3:
        raise ValueError('211 unclassified normal families')
    owner = game['players'][game['turn_player']]
    common = {'avoid_loss_or_abort':0, 'maintain_or_prevent_100':0,
              'certain_growth_difference':0, 'consumed_card_count':0, 'value_comparison_to':{}}
    passing = {**common, 'candidate_id':'pass', 'time_after_certain_resolution':owner['time'],
               'payment_time':0, 'card_copy_id':''}
    comparisons = []
    for action in details:
        if action['action_type'] == 'pass': continue
        cost, reference = paid_score(owner, game, action)
        paid = {**common, 'candidate_id':action['candidate_id'],
                'time_after_certain_resolution':owner['time']-cost,
                'payment_time':cost,
                'card_copy_id':game['cards'][action['source_instance_id']]['card_copy_id']}
        comparison = priority.compare_candidates(passing, paid)
        if comparison['winner'] != 'left' or comparison['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('211 paid action not dominated')
        comparisons.append({'candidate_id':action['candidate_id'], 'source_reference':reference,
                            'score':paid, 'comparison':comparison})
    if len(comparisons) != 2 or len(owner['hand']) <= 2 or owner['board']['main'] is not None:
        raise ValueError('211 paid action inventory differs')
    partner = owner['board']['partner']
    if partner is not None and game['cards'][partner]['card_id'] == 'P-cliff_goat':
        section = (ROOT/'74-partner-18-card-text-draft.md').read_text().split(
            '### P-cliff_goat — ',1)[1].split('\n### ',1)[0]
        if '初配置・同名上書き' not in section or owner['board']['world'] is not None:
            raise ValueError('211 world initial placement trigger differs')
    return {**base, 'selected_candidate':'pass', 'resolution_mode':'priority_unique',
            'comparison_evidence':{'source_contracts':[107,114], 'pass':passing,
                                   'paid_actions':comparisons}}


def validate_result(result):
    try:
        proof, source = load_sources()
        row = next(x for x in source['results'] if x['path_id'] == result['path_id'])
        audit = next(x for x in proof['results'] if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, audit) else ['211 independent choice differs']
    except (ValueError, KeyError, TypeError, StopIteration, IndexError) as error:
        return [str(error)]


def build_report():
    proof, source = load_sources()
    rows = [audit_route(row, next(x for x in proof['results'] if x['path_id'] == row['path_id']))
            for row in source['results']]
    if len(rows) != 4 or any(validate_result(x) for x in rows):
        raise ValueError('211 four choices differ')
    return {'schema':SCHEMA, 'source_raw_sha256':SOURCE_RAW_SHA256, 'planned':4,
            'completed':0, 'new_events':0, 'independent_balance_sample_count':0, 'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('211 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('211: four choice audits, zero events')


if __name__=='__main__':main()
