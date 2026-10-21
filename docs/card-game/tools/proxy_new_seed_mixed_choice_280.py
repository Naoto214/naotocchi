#!/usr/bin/env python3
"""Select the four candidates established by checkpoint 279."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_279 as audits
import proxy_new_seed_mixed_replay_278 as states
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_normal_restart_157 as free
import proxy_new_seed_normal_choice_229 as paid
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '3b8a2e2d8fcdd54b166b2fad32bdeac23d08d142a30381b571f2c3862fc84113'
STATE_RAW_SHA256 = '6c13a285c69041483a30421efbe9ac74f1a434da1268a218d131cd06b4d6efc2'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-280-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_280.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('280 protected audit/state differs')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(p) for p in proofs):
        raise ValueError('280 candidate inventory differs')
    return rows, proofs


def choose(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (
            proof['path_id'], proof['source_last_valid_event_seq'],
            proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or not proof['candidate_set_complete']:
        raise ValueError('280 source boundary differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'candidate_ids': proof['candidate_ids'], 'new_events': 0,
            'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] == 'mandatory_egg_exchange':
        decision = egg.run_route(row)['new_decisions'][0]
        if (decision['resolution_mode'] != 'seeded_fallback' or
                decision['legal_candidates'] != proof['candidate_ids'] or
                decision['legal_candidate_details'] != proof['legal_candidate_details'] or
                decision['selected_candidate'] not in proof['candidate_ids']):
            raise ValueError('280 mandatory seeded decision differs')
        return {**base, 'selected_candidate': decision['selected_candidate'],
                'resolution_mode': 'seeded_fallback', 'selected_decision': decision}
    if proof['next_opportunity'] in ('response_window', 'post_placement_response'):
        if proof['candidate_ids'] != ['response-pass']:
            raise ValueError('280 response not unique')
        return {**base, 'selected_candidate': 'response-pass', 'resolution_mode': 'response_unique'}
    if row['path_id'] != 'probe-01-a-first' or proof['next_opportunity'] != 'normal_action' or not all(
            proof['completeness_checks'].values()):
        raise ValueError('280 normal choice boundary differs')
    game = row['final_continuation_state']['game_state']
    owner = game['players'][game['turn_player']]
    details = proof['legal_candidate_details']
    if (game['turn_player'] != 'B' or owner['person_placed'] or
            [x['action_type'] for x in details] != ['place_companion', 'place_world', 'play_main', 'pass'] or
            [x['candidate_id'] for x in details] != proof['candidate_ids'] or
            details[0]['card_id'] != 'C-cat_friend' or details[1]['card_id'] != 'W-deepsea' or
            details[2]['card_id'] != 'M-antlion-01'):
        raise ValueError('280 normal candidate families differ')
    reduced = copy.deepcopy(proof)
    reduced['candidate_ids'] = [details[0]['candidate_id'], 'pass']
    reduced['legal_candidate_details'] = [details[0], details[3]]
    selected = free.decide(row, reduced)
    if (selected['selected_candidate'] != details[0]['candidate_id'] or
            selected['resolution_mode'] != 'safe_free_development' or
            fallback.validate_safe_free_placement(selected['selected_placement'])):
        raise ValueError('280 safe free companion proof differs')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    context = {'contract_version': fallback.CONTRACT_VERSION, 'order_id': order,
               'actor': 'B', 'actor_turn_index': game['round'], 'round': game['round'],
               'phase': 'normal_action', 'decision_kind': 'normal_action',
               'choice_kind': 'zero_cost_person_placement'}
    full = fallback.resolve_safe_free_development([selected['selected_placement']], context, proof['candidate_ids'])
    if full.get('selected_candidate') != details[0]['candidate_id']:
        raise ValueError('280 full candidate choice differs')
    common = {'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
              'certain_growth_difference': 0, 'consumed_card_count': 0, 'value_comparison_to': {}}
    left = {**common, 'candidate_id': details[0]['candidate_id'], 'payment_time': 0,
            'time_after_certain_resolution': owner['time'],
            'card_copy_id': game['cards'][details[0]['source_instance_id']]['card_copy_id']}
    comparisons = []
    for action in details[1:3]:
        if action['action_type'] == 'place_world':
            section = (ROOT / '89-world-13-card-text-draft.md').read_text().split(
                '### W-deepsea — ', 1)[1].split('\n### ', 1)[0]
            template = next(a for a in start.load_candidate_rows()['W-deepsea']['actions']
                            if a['action_type'] == 'place_world')
            if (owner['board']['world'] is not None or len(owner['hand']) <= 2 or
                    '自分の手札が2枚以下の間' not in section or template['base_time_cost'] != 2):
                raise ValueError('280 world certain effect differs')
            cost, ref = 2, '89-world-13-card-text-draft.md#W-deepsea'
        else:
            cost, ref = paid.cost_and_effect(row, action)
        right = {**common, 'candidate_id': action['candidate_id'], 'payment_time': cost,
                 'time_after_certain_resolution': owner['time'] - cost,
                 'card_copy_id': game['cards'][action['source_instance_id']]['card_copy_id']}
        compared = priority.compare_candidates(left, right)
        if compared['winner'] != 'left' or compared['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('280 paid candidate priority differs')
        comparisons.append({'candidate_id': action['candidate_id'], 'source_reference': ref,
                            'score': right, 'comparison': compared})
    return {**base, 'selected_candidate': details[0]['candidate_id'],
            'resolution_mode': 'safe_free_development', 'selected_decision': full,
            'selected_action': details[0], 'free_score': left,
            'paid_comparisons': comparisons, 'source_contracts': [107, 114, 116]}


def build_report():
    rows, proofs = load_sources()
    result = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'state_raw_sha256': STATE_RAW_SHA256, 'planned': 4, 'completed': 0,
            'new_events': 0, 'independent_balance_sample_count': 0, 'results': result}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('280 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('280: free companion, seeded egg and two unique passes')


if __name__ == '__main__':
    main()
