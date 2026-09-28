#!/usr/bin/env python3
"""Select seeded eggs, unique response and paid-comparison normal pass."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_audit_340 as audits
import proxy_new_seed_mixed_replay_339 as states
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_normal_restart_157 as free
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'd5db28e131ca18c084c618e94ca543c13aec13257ec01f6a73fa367a491a5497'
STATE_RAW_SHA256 = 'fc3179b13ee9ddd913f7a4551cb92c530514829e4979368bb4aa4d5c44d560a5'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-341-20260928.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_341.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('341 protected audit/state differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('341 source inventory differs')
    return rows, proofs


def paid_cost_and_effect(row, action):
    game = row['final_continuation_state']['game_state']
    actor = game['turn_player']
    owner = game['players'][actor]
    card = action['card_id']
    if action['source_instance_id'] not in owner['hand']:
        raise ValueError('341 item source differs')
    if action['action_type'] == 'attach_item' and card == 'I-bond1':
        target = action['target_instance_ids']
        section = (ROOT / '77-current-items-card-text-draft.md').read_text().split(
            '### I-bond1 — ', 1)[1].split('\n### ', 1)[0]
        if (len(target) != 1 or target[0] not in owner['board']['companions'] or
                'なかまにみにつける' not in section or
                '相手の効果でなかま枠から手札か捨て札に移るなら' not in section):
            raise ValueError('341 bond target/effect differs')
        template = next(x for x in start.load_candidate_rows()[card]['actions']
                        if x['action_type'] == 'attach_item')
        if template['base_time_cost'] != 2:
            raise ValueError('341 bond payment differs')
        return 2, '77-current-items-card-text-draft.md#I-bond1'
    return paid.cost_and_effect(row, action)


def choose(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (proof['path_id'], proof['source_last_valid_event_seq'],
             proof['source_game_state_sha256'], proof['source_continuation_state_sha256'])):
        raise ValueError('341 source boundary differs')
    path = row['path_id']
    base = {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if path in ('probe-01-a-first', 'probe-02-a-first'):
        if (proof['next_opportunity'] != 'mandatory_egg_exchange' or
                not proof['candidate_set_complete'] or proof['resolution_mode'] != 'seeded_fallback'):
            raise ValueError('341 mandatory egg inventory differs')
        decision = egg.run_route(row)['new_decisions'][0]
        if (decision['legal_candidates'] != proof['candidate_ids'] or
                decision['legal_candidate_details'] != proof['legal_candidate_details'] or
                decision['selected_candidate'] not in proof['candidate_ids']):
            raise ValueError('341 seeded egg choice differs')
        return {**base, 'candidate_ids': proof['candidate_ids'],
                'selected_candidate': decision['selected_candidate'],
                'resolution_mode': 'seeded_fallback', 'selected_decision': decision}
    if path == 'probe-01-b-first':
        if proof['next_opportunity'] != 'response_window' or proof['candidate_ids'] != ['response-pass']:
            raise ValueError('341 response differs')
        return {**base, 'candidate_ids': proof['candidate_ids'],
                'selected_candidate': 'response-pass', 'resolution_mode': 'response_unique'}
    if path != 'probe-02-b-first' or proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):
        raise ValueError('341 normal candidate inventory differs')
    game = row['final_continuation_state']['game_state']
    owner = game['players'][game['turn_player']]
    details = proof['legal_candidate_details']
    if ([x['candidate_id'] for x in details] != proof['candidate_ids'] or
            [x['action_type'] for x in details] != ['place_companion', 'play_main', 'pass'] or
            details[0]['card_id'] != 'C-box' or details[1]['card_id'] != 'M-antlion-01' or
            len(owner['board']['companions']) != 1 or owner['person_placed'] or
            game['cards'][owner['board']['companions'][0]]['card_id'] != 'C-cat_friend' or
            '能力なし。' not in (ROOT / '72-companion-26-card-text-draft.md').read_text().split(
                '### C-box — ', 1)[1].split('\n### ', 1)[0]):
        raise ValueError('341 normal action families differ')
    placement = details[0]
    reduced = copy.deepcopy(proof)
    reduced['candidate_ids'] = [placement['candidate_id'], 'pass']
    reduced['legal_candidate_details'] = [placement, details[-1]]
    decision = free.decide(row, reduced)
    if (decision['selected_candidate'] != placement['candidate_id'] or
            decision['resolution_mode'] != 'safe_free_development' or
            fallback.validate_safe_free_placement(decision['selected_placement'])):
        raise ValueError('341 free companion development differs')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == path)['order_id']
    context = {'contract_version': fallback.CONTRACT_VERSION, 'order_id': order,
               'actor': game['turn_player'], 'actor_turn_index': game['round'],
               'round': game['round'], 'phase': 'normal_action',
               'decision_kind': 'normal_action', 'choice_kind': 'zero_cost_person_placement'}
    full = fallback.resolve_safe_free_development([decision['selected_placement']], context, proof['candidate_ids'])
    if (full.get('selected_candidate') != placement['candidate_id'] or
            full.get('resolution_mode') != 'safe_free_development'):
        raise ValueError('341 complete candidate selection differs')
    common = {'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
              'certain_growth_difference': 0, 'consumed_card_count': 0, 'value_comparison_to': {}}
    left = {**common, 'candidate_id': placement['candidate_id'], 'payment_time': 0,
            'time_after_certain_resolution': owner['time'],
            'card_copy_id': game['cards'][placement['source_instance_id']]['card_copy_id']}
    action = details[1]
    cost, ref = paid.cost_and_effect(row, action)
    right = {**common, 'candidate_id': action['candidate_id'], 'payment_time': cost,
             'time_after_certain_resolution': owner['time'] - cost,
             'card_copy_id': game['cards'][action['source_instance_id']]['card_copy_id']}
    comparison = priority.compare_candidates(left, right)
    if comparison['winner'] != 'left' or comparison['decided_at'] != 'time_after_certain_resolution':
        raise ValueError('341 paid candidate priority differs')
    return {**base, 'candidate_ids': proof['candidate_ids'],
            'selected_candidate': placement['candidate_id'],
            'resolution_mode': 'safe_free_development', 'selected_decision': full,
            'selected_action': placement, 'free_score': left,
            'paid_comparisons': [{'candidate_id': action['candidate_id'],
                                  'source_reference': ref, 'score': right,
                                  'comparison': comparison}],
            'source_contracts': [107, 114, 116]}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['341 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('341 four choices differ')
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
            raise SystemExit('341 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('341: two seeded eggs, response pass and normal pass selected')


if __name__ == '__main__':
    main()
