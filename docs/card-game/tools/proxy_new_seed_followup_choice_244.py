#!/usr/bin/env python3
"""Select reached opportunities with the existing 107/114/116 contracts."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_audit_243 as audits
import proxy_new_seed_followup_replay_242 as states
import proxy_new_seed_choice_audit_211 as deepsea
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_normal_restart_157 as free
import proxy_normal_decision_hardening as priority

ROOT = Path(__file__).resolve().parents[1]
SOURCE = audits.OUTPUT
SOURCE_RAW_SHA256 = '36e8d2b69d31b0e8fbd08e6c4df67f1cc14d76566c7c0b193bf4adb655ef9334'
OUTPUT = ROOT / 'data/proxy-new-seed-followup-choice-244-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_followup_choice_244.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = SOURCE.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('244 protected audit/state differs')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(x) for x in proofs):
        raise ValueError('244 complete candidate inventory differs')
    return proofs, rows


def audit_route(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (proof['path_id'], proof['source_last_valid_event_seq'],
         proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or
            proof['candidate_set_complete'] is not True):
        raise ValueError('244 source boundary differs')
    base = {'path_id': row['path_id'],
            'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'candidate_ids': proof['candidate_ids'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] == 'post_placement_response':
        if proof['candidate_ids'] != ['response-pass']:
            raise ValueError('244 response not unique')
        return {**base, 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique', 'paid_comparisons': []}
    if proof['next_opportunity'] != 'normal_action' or not all(proof['completeness_checks'].values()):
        raise ValueError('244 normal inventory incomplete')
    details = proof['legal_candidate_details']
    if [x['candidate_id'] for x in details] != proof['candidate_ids']:
        raise ValueError('244 candidate detail projection differs')
    if any(x['action_type'] == 'place_companion' for x in details):
        decision = free.decide(row, proof)
        if (decision['selected_candidate'] != 'candidate-place-companion-B-013#1' or
                decision['resolution_mode'] != 'safe_free_development'):
            raise ValueError('244 safe free placement selection differs')
        return {**base, 'selected_candidate': decision['selected_candidate'],
                'resolution_mode': decision['resolution_mode'],
                'selected_decision': decision, 'source_contracts': [107, 114, 116]}
    game = row['final_continuation_state']['game_state']
    owner = game['players'][game['turn_player']]
    common = {'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
              'certain_growth_difference': 0, 'consumed_card_count': 0,
              'value_comparison_to': {}}
    passed = {**common, 'candidate_id': 'pass',
              'time_after_certain_resolution': owner['time'],
              'payment_time': 0, 'card_copy_id': ''}
    comparisons = []
    for detail in details:
        if detail['action_type'] == 'pass':
            continue
        if detail['card_id'] == 'W-deepsea':
            cost, ref = deepsea.paid_score(owner, game, detail)
        elif detail['card_id'] == 'I-bowtie':
            cost, ref = paid.cost_and_effect(row, detail)
        elif detail['card_id'] == 'M-antlion-01':
            cost, ref = deepsea.paid_score(owner, game, detail)
        else:
            raise ValueError('244 unclassified paid candidate')
        score = {**common, 'candidate_id': detail['candidate_id'],
                 'time_after_certain_resolution': owner['time'] - cost,
                 'payment_time': cost,
                 'card_copy_id': game['cards'][detail['source_instance_id']]['card_copy_id']}
        comparison = priority.compare_candidates(passed, score)
        if comparison['winner'] != 'left' or comparison['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('244 paid candidate priority differs')
        comparisons.append({'candidate_id': detail['candidate_id'],
                            'source_reference': ref, 'score': score,
                            'comparison': comparison})
    if len(comparisons) != len(details) - 1:
        raise ValueError('244 paid comparison inventory differs')
    return {**base, 'selected_candidate': 'pass',
            'resolution_mode': 'priority_unique',
            'pass_score': passed, 'paid_comparisons': comparisons,
            'source_contracts': [107, 114]}


def validate_result(result):
    try:
        proofs, rows = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, proof) else ['244 independent selection differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    proofs, rows = load_sources()
    results = [audit_route(row, next(x for x in proofs if x['path_id'] == row['path_id']))
               for row in rows]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('244 four selections differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('244 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('244: free companion, two normal passes, one response pass')


if __name__ == '__main__':
    main()
