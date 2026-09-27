#!/usr/bin/env python3
"""Compare the current paid normal actions with pass under 107/114."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_audit_285 as audits
import proxy_new_seed_mixed_replay_284 as states
import proxy_new_seed_normal_choice_229 as paid
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'e23de785d879009c6ffb576cbed045cbe2009958630b1a299b93899cfe99609a'
STATE_RAW_SHA256 = '8c02f8a62feef09ccc761595181197aea4f40d3bbe5c88c4476a85310fb610a3'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-286-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_286.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('286 protected audit/state differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or any(audits.validate_result(p) for p in proofs):
        raise ValueError('286 candidate inventory differs')
    return rows, proofs


def choose(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (proof['path_id'], proof['source_last_valid_event_seq'],
             proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or
            not proof['candidate_set_complete']):
        raise ValueError('286 source boundary differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'candidate_ids': proof['candidate_ids'], 'new_events': 0,
            'completed': False, 'balance_sample_count': 0}
    if proof['next_opportunity'] in ('response_window', 'post_placement_response'):
        if proof['candidate_ids'] != ['response-pass']:
            raise ValueError('286 response not unique')
        return {**base, 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique', 'paid_comparisons': []}
    if proof['next_opportunity'] != 'normal_action' or not all(proof['completeness_checks'].values()):
        raise ValueError('286 normal candidate inventory differs')
    details = proof['legal_candidate_details']
    if ([x['candidate_id'] for x in details] != proof['candidate_ids'] or
            details[-1]['candidate_id'] != 'pass' or
            any(x['action_type'] not in ('attach_item', 'play_main', 'pass') for x in details)):
        raise ValueError('286 normal candidate families differ')
    game = row['final_continuation_state']['game_state']
    actor = game['turn_player']
    owner = game['players'][actor]
    if actor != 'A' or owner['board']['main'] is not None:
        raise ValueError('286 actor/board differs')
    reduced = copy.deepcopy(proof)
    reduced['candidate_ids'] = [x for x in proof['candidate_ids'] if not x.startswith('candidate-attach_item-A-031#1')]
    reduced['legal_candidate_details'] = [x for x in details if x['card_id'] != 'I-bond1']
    result = paid.audit_route(row, reduced)
    if result['selected_candidate'] != 'pass' or result['resolution_mode'] != 'priority_unique':
        raise ValueError('286 paid normal comparison differs')
    comparisons = {x['candidate_id']: x for x in result['paid_comparisons']}
    bond = next((x for x in details if x['card_id'] == 'I-bond1'), None)
    if bond:
        section = audits.hand.source_section('77-current-items-card-text-draft.md', 'I-bond1')
        template = next(x for x in start.load_candidate_rows()['I-bond1']['actions']
                        if x['action_type'] == 'attach_item')
        if (row['path_id'] != 'probe-02-b-first' or
                'そのなかまが相手の効果でなかま枠から手札か捨て札に移るなら' not in section or
                template['base_time_cost'] != 2 or
                bond['target_instance_ids'] != ['A-012#1'] or
                'A-012#1' not in owner['board']['companions']):
            raise ValueError('286 bond item conditional protection differs')
        common = {'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
                  'certain_growth_difference': 0, 'consumed_card_count': 0, 'value_comparison_to': {}}
        score = {**common, 'candidate_id': bond['candidate_id'],
                 'time_after_certain_resolution': owner['time'] - 2, 'payment_time': 2,
                 'card_copy_id': game['cards'][bond['source_instance_id']]['card_copy_id']}
        compared = priority.compare_candidates(result['pass_score'], score)
        if compared['winner'] != 'left' or compared['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('286 bond item comparison differs')
        comparisons[bond['candidate_id']] = {'candidate_id': bond['candidate_id'],
            'source_reference': '77-current-items-card-text-draft.md#I-bond1',
            'score': score, 'comparison': compared}
    ordered = [comparisons[x['candidate_id']] for x in details if x['action_type'] != 'pass']
    if len(ordered) != len(details) - 1:
        raise ValueError('286 paid candidate inventory differs')
    return {**base, 'selected_candidate': 'pass', 'resolution_mode': 'priority_unique',
            'pass_score': result['pass_score'], 'paid_comparisons': ordered,
            'source_contracts': [107, 114]}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['286 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('286 four choices differ')
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
            raise SystemExit('286 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('286: two unique responses and two paid-to-pass comparisons')


if __name__ == '__main__':
    main()
