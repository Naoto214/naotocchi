#!/usr/bin/env python3
"""Select seeded eggs, unique response and paid-comparison normal pass."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_audit_321 as audits
import proxy_new_seed_mixed_replay_320 as states
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_normal_choice_229 as paid
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'a74ce6fe621ceda5a5bbb0d5211cd1eb4d3f9d43a6424598247eabb799a36c7b'
STATE_RAW_SHA256 = '4d205873d90d6fabc88f31df62caa315cdf6c1319054c6fdfbed59d2adffb53c'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-322-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_322.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('322 protected audit/state differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('322 source inventory differs')
    return rows, proofs


def paid_cost_and_effect(row, action):
    game = row['final_continuation_state']['game_state']
    actor = game['turn_player']
    owner = game['players'][actor]
    card = action['card_id']
    if action['source_instance_id'] not in owner['hand']:
        raise ValueError('322 item source differs')
    if action['action_type'] == 'attach_item' and card == 'I-bond1':
        target = action['target_instance_ids']
        section = (ROOT / '77-current-items-card-text-draft.md').read_text().split(
            '### I-bond1 — ', 1)[1].split('\n### ', 1)[0]
        if (len(target) != 1 or target[0] not in owner['board']['companions'] or
                'なかまにみにつける' not in section or
                '相手の効果でなかま枠から手札か捨て札に移るなら' not in section):
            raise ValueError('322 bond target/effect differs')
        template = next(x for x in start.load_candidate_rows()[card]['actions']
                        if x['action_type'] == 'attach_item')
        if template['base_time_cost'] != 2:
            raise ValueError('322 bond payment differs')
        return 2, '77-current-items-card-text-draft.md#I-bond1'
    return paid.cost_and_effect(row, action)


def choose(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (proof['path_id'], proof['source_last_valid_event_seq'],
             proof['source_game_state_sha256'], proof['source_continuation_state_sha256'])):
        raise ValueError('322 source boundary differs')
    path = row['path_id']
    base = {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if path in ('probe-01-a-first', 'probe-02-a-first'):
        if (proof['next_opportunity'] != 'mandatory_egg_exchange' or
                not proof['candidate_set_complete'] or proof['resolution_mode'] != 'seeded_fallback'):
            raise ValueError('322 mandatory egg inventory differs')
        decision = egg.run_route(row)['new_decisions'][0]
        if (decision['legal_candidates'] != proof['candidate_ids'] or
                decision['legal_candidate_details'] != proof['legal_candidate_details'] or
                decision['selected_candidate'] not in proof['candidate_ids']):
            raise ValueError('322 seeded egg choice differs')
        return {**base, 'candidate_ids': proof['candidate_ids'],
                'selected_candidate': decision['selected_candidate'],
                'resolution_mode': 'seeded_fallback', 'selected_decision': decision}
    if path == 'probe-01-b-first':
        if proof['next_opportunity'] != 'response_window' or proof['candidate_ids'] != ['response-pass']:
            raise ValueError('322 response differs')
        return {**base, 'candidate_ids': proof['candidate_ids'],
                'selected_candidate': 'response-pass', 'resolution_mode': 'response_unique'}
    if path != 'probe-02-b-first' or proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):
        raise ValueError('322 normal candidate inventory differs')
    game = row['final_continuation_state']['game_state']
    owner = game['players'][game['turn_player']]
    details = proof['legal_candidate_details']
    if ([x['candidate_id'] for x in details] != proof['candidate_ids'] or
            [x['action_type'] for x in details] != ['attach_item'] * 3 + ['play_main', 'pass']):
        raise ValueError('322 normal action families differ')
    common = {'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
              'certain_growth_difference': 0, 'consumed_card_count': 0, 'value_comparison_to': {}}
    passed = {**common, 'candidate_id': 'pass', 'payment_time': 0,
              'time_after_certain_resolution': owner['time'], 'card_copy_id': ''}
    comparisons = []
    for action in details[:-1]:
        cost, ref = paid_cost_and_effect(row, action)
        score = {**common, 'candidate_id': action['candidate_id'],
                 'time_after_certain_resolution': owner['time'] - cost,
                 'payment_time': cost,
                 'card_copy_id': game['cards'][action['source_instance_id']]['card_copy_id']}
        compared = priority.compare_candidates(passed, score)
        if compared['winner'] != 'left' or compared['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('322 paid action priority differs')
        comparisons.append({'candidate_id': action['candidate_id'],
                            'source_reference': ref, 'score': score, 'comparison': compared})
    return {**base, 'candidate_ids': proof['candidate_ids'], 'selected_candidate': 'pass',
            'resolution_mode': 'priority_unique', 'pass_score': passed,
            'paid_comparisons': comparisons, 'source_contracts': [107, 114]}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['322 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('322 four choices differ')
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
            raise SystemExit('322 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('322: two seeded eggs, response pass and normal pass selected')


if __name__ == '__main__':
    main()
