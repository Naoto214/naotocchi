#!/usr/bin/env python3
"""Select three unique response passes and a proved normal pass."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_audit_324 as audits
import proxy_new_seed_mixed_replay_323 as states
import proxy_new_seed_normal_choice_229 as paid
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'e7bd59182547da169af797facfe117780b66cb6f2bd0cf1bbaf1112197311de3'
STATE_RAW_SHA256 = '4858ef627f32dfe7096bbdcfc3c8a0032c4734ed8f85f18f76cf017b0f848f04'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-325-20260928.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_325.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('325 protected audit/state differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('325 source inventory differs')
    return rows, proofs


def paid_cost_and_effect(row, action):
    if action['action_type'] != 'place_world' or action['card_id'] != 'W-countryside':
        return paid.cost_and_effect(row, action)
    game = row['final_continuation_state']['game_state']
    owner = game['players'][game['turn_player']]
    section = (ROOT / '89-world-13-card-text-draft.md').read_text().split(
        '### W-countryside — ', 1)[1].split('\n### ', 1)[0]
    template = next(x for x in start.load_candidate_rows()['W-countryside']['actions']
                    if x['action_type'] == 'place_world')
    if (action['source_instance_id'] not in owner['hand'] or owner['board']['world'] is not None or
            template['base_time_cost'] != 2 or
            '自分のターン終了時' not in section or 'アクションカードが1枚だけの場合' not in section):
        raise ValueError('325 world cost/effect differs')
    return 2, '89-world-13-card-text-draft.md#W-countryside'


def choose(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (proof['path_id'], proof['source_last_valid_event_seq'],
             proof['source_game_state_sha256'], proof['source_continuation_state_sha256'])):
        raise ValueError('325 source boundary differs')
    path = row['path_id']
    base = {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if path != 'probe-01-b-first':
        if (path not in ('probe-01-a-first', 'probe-02-a-first', 'probe-02-b-first') or
                proof['next_opportunity'] not in ('response_window', 'turn_end_response') or
                proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']):
            raise ValueError('325 response inventory differs')
        return {**base, 'candidate_ids': proof['candidate_ids'],
                'selected_candidate': 'response-pass', 'resolution_mode': 'response_unique'}
    if (proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete'] or
            not all(proof['completeness_checks'].values())):
        raise ValueError('325 normal inventory differs')
    game = row['final_continuation_state']['game_state']
    owner = game['players'][game['turn_player']]
    details = proof['legal_candidate_details']
    if ([x['candidate_id'] for x in details] != proof['candidate_ids'] or
            [x['action_type'] for x in details] != ['place_world', 'set_item', 'pass']):
        raise ValueError('325 normal candidate families differ')
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
            raise ValueError('325 paid priority differs')
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
        return [] if result == choose(row, proof) else ['325 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('325 four choices differ')
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
            raise SystemExit('325 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('325: three response passes and normal pass selected')


if __name__ == '__main__':
    main()
