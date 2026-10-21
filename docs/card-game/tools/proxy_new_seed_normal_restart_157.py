#!/usr/bin/env python3
"""Resume four proved normal opportunities using 107/114/116 priority."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_normal_audit_156 as audit
import proxy_new_seed_normal_restart_147 as precedent
import proxy_new_seed_start_response_153 as start_response
import proxy_start_response_138 as start
import proxy_normal_action_seeded_restart as normal
import proxy_normal_action_extension as extension
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as hardening

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audit.OUTPUT
SOURCE_RAW_SHA256 = '74ecf5123f14a97565de18e513abfd2e72b48386116a60ce82995312705507e0'
OUTPUT = ROOT / 'data/proxy-new-seed-normal-restart-157-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_normal_restart_157.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != audit.canonical_bytes(audit.build_report()):
        raise ValueError('156 protected raw or replay differs')
    data = json.loads(raw)
    if data['schema'] != audit.SCHEMA or any(audit.validate_result(x) for x in data['results']):
        raise ValueError('156 candidates differ')
    return data


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def decide(row, proof):
    game = row['final_continuation_state']['game_state']; actor = game['turn_player']
    owner = game['players'][actor]; ids = proof['candidate_ids']; details = proof['legal_candidate_details']
    table = audit.normal_audit.normal.candidate.load_inputs()['candidate_table']
    if not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()) or \
            game['phase'] != 'normal_action' or owner['board']['main'] is not None or \
            any(x['growth'] >= 100 for x in game['players'].values()):
        raise ValueError('157 normal priority entry differs')
    paid = [x for x in details if x['action_type'] == 'play_main']
    if len(paid) > 1 or any(x['action_type'] not in ('pass','play_main','place_companion','place_partner') for x in details):
        raise ValueError('157 unproved normal action families')
    paid_proof = None
    if paid:
        entry = paid[0]
        if entry['candidate_variant'] != 'birth' or \
                normal.BIRTH_TEXT_EVIDENCE.get(entry['card_id'], (None,))[0] != 'continuous_only':
            raise ValueError('157 paid main has unproved certain effect')
        source = entry['source_instance_id']; birth = precedent.precedent.opening._main_birth_detail(
            source, game['cards'][source], table, owner['board'], owner['time'])
        if birth is None or birth['candidate_id'] != entry['candidate_id'] or birth['payment_time'] <= 0:
            raise ValueError('157 paid main birth proof differs')
        paid_proof = {'candidate_id': entry['candidate_id'], 'payment_time': birth['payment_time'],
                      'effect_class': 'continuous_only', 'source_reference':
                      normal.BIRTH_TEXT_EVIDENCE[entry['card_id']][1]}
    placements = []
    with precedent.partner_placement_scope():
        for detail in details:
            if detail['action_type'] not in ('place_companion','place_partner'): continue
            source = detail['source_instance_id']; card = game['cards'][source]
            placement = precedent.precedent.opening._placement_for_card(
                source, card, table, owner['board'])
            if placement is None or placement['candidate_id'] != detail['candidate_id'] or \
                    card['card_id'] not in extension.PLACEMENT_TEXT:
                raise ValueError('157 safe zero-cost placement proof differs')
            placements.append(placement)
    if paid_proof and placements:
        sample = placements[0]
        left = {'candidate_id': sample['candidate_id'], 'avoid_loss_or_abort':0,
                'maintain_or_prevent_100':0, 'certain_growth_difference':0,
                'time_after_certain_resolution':owner['time'], 'payment_time':0,
                'consumed_card_count':0, 'card_copy_id':sample['card_copy_id'],
                'value_comparison_to':{}}
        right = {**left, 'candidate_id':paid_proof['candidate_id'],
                 'time_after_certain_resolution': owner['time'] - paid_proof['payment_time'],
                 'payment_time':paid_proof['payment_time'], 'card_copy_id':paid[0]['source_instance_id']}
        comparison = hardening.compare_candidates(left,right)
        if comparison['winner'] != 'left' or comparison['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('157 paid birth not dominated by safe free placement')
        paid_proof['comparison'] = comparison
    if ids == ['pass']:
        decision = {'decision_kind':'normal_action', 'resolution_mode':'priority_unique',
                    'reason_code':'only_legal_normal_action', 'strategic_unresolved':False,
                    'legal_candidates':ids, 'candidate_set_complete':True,
                    'selected_candidate':'pass', 'runner_up_candidates':[],
                    'seed_context':None, 'seed_proof':None}
    else:
        if not placements or owner['person_placed'] or any(fallback.validate_safe_free_placement(p) for p in placements):
            raise ValueError('157 safe free development boundary differs')
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        context = {'contract_version':fallback.CONTRACT_VERSION, 'order_id':order,
                   'actor':actor, 'actor_turn_index':1, 'round':game['round'],
                   'phase':'normal_action', 'decision_kind':'normal_action',
                   'choice_kind':'zero_cost_person_placement'}
        decision = fallback.resolve_safe_free_development(placements, context, ids)
        if 'error' in decision or (decision['resolution_mode'] == 'seeded_fallback' and
                fallback.validate_seeded_resolution(decision)) or (
                decision['resolution_mode'] == 'safe_free_development' and
                (len(placements) != 1 or decision['selected_placement'] != placements[0])):
            raise ValueError('157 safe free development proof differs')
        if paid_proof: decision['paid_birth_comparison'] = paid_proof
    decision['selected_action'] = copy.deepcopy(next(x for x in details
        if x['candidate_id'] == decision['selected_candidate']))
    decision['legal_candidate_details'] = copy.deepcopy(details)
    decision['pre_game_state_sha256'] = row['final_game_state_sha256']
    decision['pre_continuation_state_sha256'] = row['final_continuation_state_sha256']
    decision['event_seq'] = row['last_valid_event_seq']
    return decision


def run_route(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
        row['final_continuation_state_sha256']) != (proof['path_id'],
        proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
        proof['source_continuation_state_sha256']):
        raise ValueError('156 source boundary differs')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq':row['last_valid_event_seq'],
                  'last_event_seq':row['last_valid_event_seq'],
                  'source_game_state_sha256':row['final_game_state_sha256'],
                  'continuation_state_sha256':row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('157 source continuation SHA differs')
    decision = decide(row,proof)
    if decision['selected_candidate'] == 'pass':
        after, generated = normal.transition(state, decision, {'candidate_table':
                               audit.normal_audit.normal.candidate.load_inputs()['candidate_table']})
    else:
        with precedent.partner_placement_scope():
            after, generated = extension._apply_placement(state,decision)
    normal._verify_step(state,after,generated)
    events = [{k:copy.deepcopy(v) for k,v in e.items() if k != '_snapshot_after'} for e in generated]
    return {'path_id':row['path_id'], 'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),
            'stop_reason_code':'unproved_next_response_candidates',
            'new_decisions':[decision], 'new_events':events, 'new_snapshots':[snapshot(after)],
            'completed':False, 'balance_sample_count':0}


def validate_result(row):
    try:
        source = next(x for x in audit.load_sources() if x['path_id'] == row['path_id'])
        proof = next(x for x in load_source()['results'] if x['path_id'] == row['path_id'])
        if row != run_route(source,proof) or row['last_valid_event_seq'] != source['last_valid_event_seq'] + 1:
            return ['157 independent replay differs']
        event = row['new_events'][0]; snap = row['new_snapshots'][0]
        if event['seq'] != row['last_valid_event_seq'] or \
                event['game_state_before_sha256'] != source['final_game_state_sha256'] or \
                event['continuation_state_before_sha256'] != source['final_continuation_state_sha256'] or \
                event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state']) != row['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state']) != row['final_continuation_state_sha256']:
            return ['157 event/snapshot hash chain differs']
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    rows = [run_route(row,proof) for row,proof in zip(audit.load_sources(),load_source()['results'])]
    if len(rows) != 4 or any(validate_result(x) for x in rows):
        raise ValueError('157 independent normal replay differs')
    return {'schema':SCHEMA, 'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4, 'completed':0, 'new_decisions':4, 'new_events':4,
            'new_snapshots':4, 'independent_balance_sample_count':0, 'results':rows}


def main():
    parser = argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('157 saved canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('157: 4 normal decisions and events, 0 completed')


if __name__=='__main__':main()
