#!/usr/bin/env python3
"""Select three unique responses and compare three paid actions with pass."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_306 as audits
import proxy_new_seed_mixed_replay_305 as states
import proxy_new_seed_normal_choice_229 as paid
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '7b7861c82b514ce0055b06429135f28116525b919ff2c7a0d48bc84ef93ebbae'
STATE_RAW_SHA256 = 'f6e693cd0b1e2ed29c4d36c271bb16a4f802e3729b580d018273c1b7ac7b7457'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-307-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_307.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('307 protected audit/state differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(p) for p in proofs):
        raise ValueError('307 candidate inventory differs')
    return rows, proofs


def choose(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (proof['path_id'], proof['source_last_valid_event_seq'],
             proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or
            not proof['candidate_set_complete']):
        raise ValueError('307 source boundary differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'candidate_ids': proof['candidate_ids'], 'new_events': 0,
            'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] in ('response_window', 'post_placement_response', 'turn_end_response'):
        if proof['candidate_ids'] != ['response-pass']:
            raise ValueError('307 response not unique')
        return {**base, 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique', 'paid_comparisons': []}
    if proof['next_opportunity'] != 'normal_action' or not all(proof['completeness_checks'].values()):
        raise ValueError('307 normal candidate inventory differs')
    game = row['final_continuation_state']['game_state']
    actor = game['turn_player']
    owner = game['players'][actor]
    if actor != 'B' or row['path_id'] != 'probe-01-b-first' or owner['board']['main'] is not None:
        raise ValueError('307 actor/board differs')
    details = proof['legal_candidate_details']
    if ([x['candidate_id'] for x in details] != proof['candidate_ids'] or
            details[-1]['candidate_id'] != 'pass' or
            any(x['action_type'] not in ('place_world', 'play_main', 'set_item', 'pass') for x in details)):
        raise ValueError('307 normal candidate families differ')
    common = {'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
              'certain_growth_difference': 0, 'consumed_card_count': 0, 'value_comparison_to': {}}
    passed = {**common, 'candidate_id': 'pass', 'payment_time': 0,
              'time_after_certain_resolution': owner['time'], 'card_copy_id': ''}
    comparisons = []
    for action in details[:-1]:
        if action['action_type'] == 'place_world' and action['card_id'] == 'W-deepsea':
            section = (ROOT / '89-world-13-card-text-draft.md').read_text().split(
                '### W-deepsea — ', 1)[1].split('\n### ', 1)[0]
            template = next(a for a in start.load_candidate_rows()['W-deepsea']['actions']
                            if a['action_type'] == 'place_world')
            if (row['path_id'] != 'probe-01-b-first' or
                    owner['board']['world'] is not None or len(owner['hand']) <= 2 or
                    '自分の手札が2枚以下の間' not in section or template['base_time_cost'] != 2):
                raise ValueError('307 world certain effect differs')
            cost, ref = 2, '89-world-13-card-text-draft.md#W-deepsea'
        else:
            cost, ref = paid.cost_and_effect(row, action)
        score = {**common, 'candidate_id': action['candidate_id'],
                 'time_after_certain_resolution': owner['time'] - cost, 'payment_time': cost,
                 'card_copy_id': game['cards'][action['source_instance_id']]['card_copy_id']}
        compared = priority.compare_candidates(passed, score)
        if compared['winner'] != 'left' or compared['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('307 paid candidate priority differs')
        comparisons.append({'candidate_id': action['candidate_id'], 'source_reference': ref,
                            'score': score, 'comparison': compared})
    if len(comparisons) != len(details) - 1:
        raise ValueError('307 paid candidate inventory differs')
    return {**base, 'selected_candidate': 'pass', 'resolution_mode': 'priority_unique',
            'pass_score': passed, 'paid_comparisons': comparisons, 'source_contracts': [107, 114]}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['307 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('307 four choices differ')
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
            raise SystemExit('307 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('307: three unique responses and three paid-to-pass comparisons')


if __name__ == '__main__':
    main()
