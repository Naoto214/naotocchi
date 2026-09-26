#!/usr/bin/env python3
"""Select the four audited opportunities at checkpoint 276."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_audit_276 as audits
import proxy_new_seed_mixed_replay_275 as states
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_normal_restart_157 as free
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-277-20260927.json'
SOURCE_RAW_SHA256 = '901565c817e5c050830184d11d54a70f1d4d224ec32e1a9e89af53f30bc619cd'
STATE_RAW_SHA256 = '7b729fa2792d028bd23923fd83f95a6e5f1a05ce1de8eabd442319f02cc70865'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_277.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('277 protected source bytes differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != len(rows) != 4 or any(audits.validate_result(p) for p in proofs):
        raise ValueError('277 source candidate proof differs')
    return proofs, rows

def choose(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
        row['final_continuation_state_sha256']) != (proof['path_id'],
        proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
        proof['source_continuation_state_sha256']):
        raise ValueError('277 source boundary differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if proof.get('turn_end_set_complete'):
        if row['path_id'] != 'probe-01-b-first' or not all(proof['completeness_checks'].values()):
            raise ValueError('277 end proof differs')
        return {**base, 'selected_candidate': 'turn_end', 'resolution_mode': 'mandatory_proved_end',
                'six_stage_checks': proof['completeness_checks']}
    if proof['next_opportunity'] == 'response_window':
        if proof['candidate_ids'] != ['response-pass']:
            raise ValueError('277 response is not unique')
        return {**base, 'candidate_ids': proof['candidate_ids'],
                'selected_candidate': 'response-pass', 'resolution_mode': 'response_unique'}
    if (row['path_id'] != 'probe-02-b-first' or proof['next_opportunity'] != 'normal_action' or
            not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values())):
        raise ValueError('277 normal inventory differs')
    game = row['final_continuation_state']['game_state']
    owner = game['players'][game['turn_player']]
    details = proof['legal_candidate_details']
    if (game['turn_player'] != 'A' or owner['person_placed'] or owner['board']['main'] is not None or
            [x['action_type'] for x in details] != ['attach_item', 'place_companion', 'play_main', 'pass'] or
            [x['candidate_id'] for x in details] != proof['candidate_ids']):
        raise ValueError('277 normal candidate families differ')
    placement = details[1]
    if placement['card_id'] != 'C-box' or owner['board']['companions'] or \
            free.extension.PLACEMENT_TEXT['C-box'][1] != 'no_ability':
        raise ValueError('277 safe C-box placement differs')
    reduced = copy.deepcopy(proof)
    reduced['candidate_ids'] = [x for x in proof['candidate_ids'] if x not in (details[0]['candidate_id'], details[2]['candidate_id'])]
    reduced['legal_candidate_details'] = [x for x in details if x['action_type'] not in ('attach_item', 'play_main')]
    decision = free.decide(row, reduced)
    if (decision['selected_candidate'] != placement['candidate_id'] or
            decision['resolution_mode'] != 'safe_free_development' or
            fallback.validate_safe_free_placement(decision['selected_placement'])):
        raise ValueError('277 free development proof differs')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    context = {'contract_version': fallback.CONTRACT_VERSION, 'order_id': order,
               'actor': 'A', 'actor_turn_index': game['round'], 'round': game['round'],
               'phase': 'normal_action', 'decision_kind': 'normal_action',
               'choice_kind': 'zero_cost_person_placement'}
    full = fallback.resolve_safe_free_development([decision['selected_placement']], context, proof['candidate_ids'])
    if full.get('selected_candidate') != placement['candidate_id'] or full.get('resolution_mode') != 'safe_free_development':
        raise ValueError('277 full candidate selection differs')
    common = {'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
              'certain_growth_difference': 0, 'consumed_card_count': 0,
              'value_comparison_to': {}}
    left = {**common, 'candidate_id': placement['candidate_id'], 'payment_time': 0,
            'time_after_certain_resolution': owner['time'],
            'card_copy_id': game['cards'][placement['source_instance_id']]['card_copy_id']}
    comparisons = []
    for action in (details[0], details[2]):
        cost, ref = paid.cost_and_effect(row, action)
        right = {**common, 'candidate_id': action['candidate_id'], 'payment_time': cost,
                 'time_after_certain_resolution': owner['time'] - cost,
                 'card_copy_id': game['cards'][action['source_instance_id']]['card_copy_id']}
        result = priority.compare_candidates(left, right)
        if result['winner'] != 'left' or result['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('277 paid action priority differs')
        comparisons.append({'candidate_id': action['candidate_id'], 'source_reference': ref,
                            'score': right, 'comparison': result})
    return {**base, 'candidate_ids': proof['candidate_ids'],
            'selected_candidate': placement['candidate_id'],
            'resolution_mode': 'safe_free_development', 'selected_decision': full,
            'selected_action': placement, 'free_score': left,
            'paid_comparisons': comparisons, 'source_contracts': [107, 114, 116]}

def build_report():
    proofs, rows = load_sources()
    result = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'state_raw_sha256': STATE_RAW_SHA256, 'planned': 4, 'completed': 0,
            'new_events': 0, 'independent_balance_sample_count': 0, 'results': result}

def main_cli():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('277 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('277: two unique response passes, proved end, free companion placement')

if __name__ == '__main__': main_cli()
