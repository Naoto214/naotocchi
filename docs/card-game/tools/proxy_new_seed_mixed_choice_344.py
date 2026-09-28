#!/usr/bin/env python3
"""Select 343 response and normal candidates under 107/114/116."""
import argparse
import copy
import hashlib
import json
import sys
sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_343 as audits
import proxy_new_seed_mixed_replay_342 as states
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_normal_restart_157 as free
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start
import proxy_response_window_seeded_restart as response

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-344-20260928.json'
SOURCE_RAW_SHA256 = 'a551b8f40f0dc736965e0eae1b0f774becc678fed4c77ef548a570b99455bf20'
STATE_RAW_SHA256 = 'a6a36249be6ec8e3a97b16ba0af819c2ef4563f6fb10dd2acb4a28a2c0a22b17'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_344.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('344 protected audit/state differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('344 candidate inventory differs')
    return rows, proofs


def choose(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (proof['path_id'], proof['source_last_valid_event_seq'],
             proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or
            not proof['candidate_set_complete']):
        raise ValueError('344 source boundary differs')
    path = row['path_id']
    base = {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'candidate_ids': proof['candidate_ids'], 'new_events': 0,
            'completed': False, 'balance_sample_count': 0}
    if path in ('probe-02-a-first', 'probe-02-b-first'):
        if proof['candidate_ids'] != ['response-pass'] or proof['next_opportunity'] not in (
                'response_window', 'post_placement_response'):
            raise ValueError('344 unique response differs')
        return {**base, 'selected_candidate': 'response-pass', 'resolution_mode': 'response_unique'}
    game = row['final_continuation_state']['game_state']
    owner = game['players'][game['turn_player']]
    if path == 'probe-01-a-first':
        if (proof['candidate_ids'] != ['response-activate-ability-A-015#1', 'response-pass',
                'response-use-event-A-040#1-target-A-017#1'] or
                len(proof['board_candidate_details']) != 1 or len(proof['hand_candidate_details']) != 1 or
                proof['hand_candidate_details'][0]['target_instance_ids'] != ['A-017#1'] or
                owner['board']['partner_stage'] != 0):
            raise ValueError('344 complete response differs')
        detail = proof['board_candidate_details'][0]
        board = {**detail, 'card_copy_id': game['cards'][detail['source_instance_id']]['card_copy_id'],
                 'target_instance_ids': [], 'candidate_variant': None, 'base_time_cost': 0}
        all_details = sorted([start.response.build_response_pass_detail(), board,
                              proof['hand_candidate_details'][0]], key=lambda x: x['candidate_id'])
        if [x['candidate_id'] for x in all_details] != proof['candidate_ids']:
            raise ValueError('344 response details differ')
        state = row['final_continuation_state']
        opportunity = {'actor': game['turn_player'], 'response_context': state['response_context'],
                       'legal_candidate_ids': proof['candidate_ids'], 'legal_candidate_details': all_details,
                       'candidate_set_complete': True, 'forbidden_information_used': []}
        order = next(x for x in start.load_source()['results'] if x['path_id'] == path)['order_id']
        decision = response.resolve_response_choice({'order_id': order,
            'actor_turn_index': game['round'], 'round': game['round']}, opportunity)
        if (decision['selected_candidate'] != 'response-use-event-A-040#1-target-A-017#1' or
                decision['resolution_mode'] != 'priority_unique' or
                decision['comparison_evidence']['criterion'] != 'maximize_certain_growth_difference'):
            raise ValueError('344 certain growth response differs')
        return {**base, 'selected_candidate': decision['selected_candidate'],
                'resolution_mode': 'priority_unique', 'comparison': decision}
    if path != 'probe-01-b-first' or proof['next_opportunity'] != 'normal_action' or not all(proof['completeness_checks'].values()):
        raise ValueError('344 normal boundary differs')
    details = proof['legal_candidate_details']
    if ([x['action_type'] for x in details] != ['place_companion','place_world','place_world','play_main','pass'] or
            details[0]['card_id'] != 'C-chicken' or owner['person_placed'] or
            len(owner['board']['companions']) != 2 or
            [x['card_id'] for x in details[1:4]] != ['W-city','W-deepsea','M-antlion-01']):
        raise ValueError('344 normal candidate families differ')
    reduced = copy.deepcopy(proof)
    reduced['candidate_ids'] = [details[0]['candidate_id'], 'pass']
    reduced['legal_candidate_details'] = [details[0], details[-1]]
    decision = free.decide(row, reduced)
    if (decision['selected_candidate'] != details[0]['candidate_id'] or
            decision['resolution_mode'] != 'safe_free_development' or
            fallback.validate_safe_free_placement(decision['selected_placement'])):
        raise ValueError('344 free companion differs')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == path)['order_id']
    context = {'contract_version': fallback.CONTRACT_VERSION, 'order_id': order,
               'actor': game['turn_player'], 'actor_turn_index': game['round'], 'round': game['round'],
               'phase': 'normal_action', 'decision_kind': 'normal_action',
               'choice_kind': 'zero_cost_person_placement'}
    full = fallback.resolve_safe_free_development([decision['selected_placement']], context, proof['candidate_ids'])
    common = {'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
              'certain_growth_difference': 0, 'consumed_card_count': 0, 'value_comparison_to': {}}
    left = {**common, 'candidate_id': details[0]['candidate_id'], 'payment_time': 0,
            'time_after_certain_resolution': owner['time'],
            'card_copy_id': game['cards'][details[0]['source_instance_id']]['card_copy_id']}
    comparisons = []
    for action in details[1:4]:
        if action['card_id'] == 'W-deepsea':
            section = (ROOT / '89-world-13-card-text-draft.md').read_text().split('### W-deepsea — ', 1)[1].split('\n### ', 1)[0]
            template = next(x for x in start.load_candidate_rows()['W-deepsea']['actions'] if x['action_type']=='place_world')
            if ('自分の手札が2枚以下の間' not in section or template['base_time_cost'] != 2 or owner['board']['world'] is not None):
                raise ValueError('344 deepsea payment differs')
            cost, ref = 2, '89-world-13-card-text-draft.md#W-deepsea'
        else:
            cost, ref = paid.cost_and_effect(row, action)
        right = {**common, 'candidate_id': action['candidate_id'], 'payment_time': cost,
                 'time_after_certain_resolution': owner['time']-cost,
                 'card_copy_id': game['cards'][action['source_instance_id']]['card_copy_id']}
        compared = priority.compare_candidates(left, right)
        if compared['winner'] != 'left' or compared['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('344 paid candidate priority differs')
        comparisons.append({'candidate_id':action['candidate_id'],'source_reference':ref,
                            'score':right,'comparison':compared})
    return {**base, 'selected_candidate': details[0]['candidate_id'],
            'resolution_mode':'safe_free_development', 'selected_action':details[0],
            'selected_decision':full, 'preferred_score':left,
            'paid_comparisons':comparisons, 'source_contracts':[107,114,116]}

def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['344 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('344 choice inventory differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'state_raw_sha256': STATE_RAW_SHA256, 'planned': 4, 'completed': 0,
            'new_events': 0, 'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('344 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('344: two unique response passes, free companion and paid-to-pass choices')


if __name__ == '__main__':
    main()
