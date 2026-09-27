#!/usr/bin/env python3
"""Select 303 response and normal candidates under 107/114/116."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_303 as audits
import proxy_new_seed_mixed_replay_302 as states
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_normal_restart_157 as free
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-304-20260927.json'
SOURCE_RAW_SHA256 = '35b036d9edec8037cb01a1e285c78315b149ab99a4a60ee06d859b5a6800fd27'
STATE_RAW_SHA256 = 'b7d68f34b40d5dcd8f5d61ae9ae5672dcaba0dcf60eb8ffcb04d1626c11b86d5'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_304.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('304 protected audit/state differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('304 candidate inventory differs')
    return rows, proofs


def choose(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (proof['path_id'], proof['source_last_valid_event_seq'],
             proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or
            not proof['candidate_set_complete']):
        raise ValueError('304 source boundary differs')
    path = row['path_id']
    base = {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'candidate_ids': proof['candidate_ids'], 'new_events': 0,
            'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] == 'response_window':
        if path not in ('probe-01-a-first', 'probe-01-b-first') or proof['candidate_ids'] != ['response-pass']:
            raise ValueError('304 response not unique')
        return {**base, 'selected_candidate': 'response-pass', 'resolution_mode': 'response_unique'}
    if (proof['next_opportunity'] != 'normal_action' or
            path not in ('probe-02-a-first', 'probe-02-b-first') or
            not all(proof['completeness_checks'].values())):
        raise ValueError('304 normal candidates incomplete')
    game = row['final_continuation_state']['game_state']
    owner = game['players'][game['turn_player']]
    details = proof['legal_candidate_details']
    if (game['turn_player'] != 'B' or owner['board']['main'] is not None or
            owner['person_placed'] or [x['candidate_id'] for x in details] != proof['candidate_ids']):
        raise ValueError('304 normal boundary differs')
    common = {'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
              'certain_growth_difference': 0, 'consumed_card_count': 0, 'value_comparison_to': {}}
    if path == 'probe-02-a-first':
        if ([x['action_type'] for x in details] != ['place_companion', 'place_world', 'play_main', 'pass'] or
                details[0]['card_id'] != 'C-cat_friend' or owner['board']['companions'] or
                details[1]['card_id'] != 'W-deepsea' or details[2]['card_id'] != 'M-antlion-01'):
            raise ValueError('304 free placement boundary differs')
        reduced = copy.deepcopy(proof)
        reduced['candidate_ids'] = [details[0]['candidate_id'], 'pass']
        reduced['legal_candidate_details'] = [details[0], details[-1]]
        decision = free.decide(row, reduced)
        if (decision['selected_candidate'] != details[0]['candidate_id'] or
                decision['resolution_mode'] != 'safe_free_development' or
                fallback.validate_safe_free_placement(decision['selected_placement'])):
            raise ValueError('304 safe placement differs')
        order = next(x for x in start.load_source()['results'] if x['path_id'] == path)['order_id']
        context = {'contract_version': fallback.CONTRACT_VERSION, 'order_id': order,
                   'actor': 'B', 'actor_turn_index': game['round'], 'round': game['round'],
                   'phase': 'normal_action', 'decision_kind': 'normal_action',
                   'choice_kind': 'zero_cost_person_placement'}
        full = fallback.resolve_safe_free_development([decision['selected_placement']], context, proof['candidate_ids'])
        if full.get('selected_candidate') != details[0]['candidate_id'] or full.get('resolution_mode') != 'safe_free_development':
            raise ValueError('304 full selection differs')
        left = {**common, 'candidate_id': details[0]['candidate_id'], 'payment_time': 0,
                'time_after_certain_resolution': owner['time'],
                'card_copy_id': game['cards'][details[0]['source_instance_id']]['card_copy_id']}
        selected = details[0]['candidate_id']
        comparisons = []
        paid_actions = details[1:3]
    else:
        if [x['action_type'] for x in details] != ['play_main', 'pass']:
            raise ValueError('304 paid-only inventory differs')
        left = {**common, 'candidate_id': 'pass', 'payment_time': 0,
                'time_after_certain_resolution': owner['time'], 'card_copy_id': ''}
        selected = 'pass'
        full = None
        comparisons = []
        paid_actions = details[:1]
    for action in paid_actions:
        if action['action_type'] == 'place_world':
            section = (ROOT / '89-world-13-card-text-draft.md').read_text().split('### W-deepsea — ', 1)[1].split('\n### ', 1)[0]
            template = next(a for a in start.load_candidate_rows()['W-deepsea']['actions'] if a['action_type'] == 'place_world')
            if (action['card_id'] != 'W-deepsea' or owner['board']['world'] is not None or
                    len(owner['hand']) <= 2 or '自分の手札が2枚以下の間' not in section or template['base_time_cost'] != 2):
                raise ValueError('304 world cost/effect differs')
            cost, ref = 2, '89-world-13-card-text-draft.md#W-deepsea'
        else:
            cost, ref = paid.cost_and_effect(row, action)
        right = {**common, 'candidate_id': action['candidate_id'],
                 'time_after_certain_resolution': owner['time'] - cost, 'payment_time': cost,
                 'card_copy_id': game['cards'][action['source_instance_id']]['card_copy_id']}
        compared = priority.compare_candidates(left, right)
        if compared['winner'] != 'left' or compared['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('304 paid candidate priority differs')
        comparisons.append({'candidate_id': action['candidate_id'], 'source_reference': ref,
                            'score': right, 'comparison': compared})
    if len(comparisons) != len(paid_actions):
        raise ValueError('304 paid comparison count differs')
    result = {**base, 'selected_candidate': selected,
              'resolution_mode': 'safe_free_development' if full else 'priority_unique',
              'selected_action': details[0] if full else None,
              'preferred_score': left, 'paid_comparisons': comparisons,
              'source_contracts': [107, 114, 116] if full else [107, 114]}
    if full:
        result['selected_decision'] = full
    return result


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['304 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('304 choice inventory differs')
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
            raise SystemExit('304 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('304: two unique response passes, free companion and paid-to-pass choices')


if __name__ == '__main__':
    main()
