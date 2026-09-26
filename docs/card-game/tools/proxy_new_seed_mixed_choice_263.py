#!/usr/bin/env python3
"""Compare three normal actions and choose one mandatory egg exchange."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_262 as states
import proxy_new_seed_mixed_audit_261 as audits
import proxy_new_seed_normal_choice_229 as item_choice
import proxy_new_seed_choice_audit_211 as paid_choice
import proxy_new_seed_normal_restart_157 as free_choice
import proxy_new_seed_mixed_audit_235 as egg_audit
import proxy_new_seed_egg_replay_205 as egg_choice
import proxy_normal_decision_hardening as priority
import proxy_normal_decision_fallback_contract as fallback
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = '7543d5d108fde688c062aabbd144747b86033bb86baca3530f25de6e9526899a'
AUDIT_RAW_SHA256 = '866a871e178ce572ffaeffd0273891e62d064d0d68f27eb9327f3b1d2fee883e'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-263-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_263.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, prior = SOURCE.read_bytes(), audits.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(prior).hexdigest() != AUDIT_RAW_SHA256 or
            raw != states.canonical_bytes(states.build_report()) or
            prior != audits.canonical_bytes(audits.build_report())):
        raise ValueError('263 protected state/audit differs')
    rows, proofs = json.loads(raw)['results'], json.loads(prior)['results']
    if len(rows) != 4 or len(proofs) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('263 source inventory differs')
    return rows, proofs


def free_companion_choice(row, proof):
    state = row['final_continuation_state']
    game = state['game_state']
    actor = game['turn_player']
    owner = game['players'][actor]
    details = proof['legal_candidate_details']
    if (actor != 'B' or owner['person_placed'] or owner['board']['main'] is not None or
            {x['action_type'] for x in details} != {'place_companion', 'place_world', 'play_main', 'pass'} or
            len(details) != 4 or not all(proof['completeness_checks'].values())):
        raise ValueError('263 free placement candidate families differ')
    card = next(x for x in details if x['action_type'] == 'place_companion')
    section = (ROOT / '72-companion-26-card-text-draft.md').read_text().split(
        '### C-cat_friend — ', 1)[1].split('\n### ', 1)[0]
    if card['card_id'] != 'C-cat_friend' or 'このカードをなかま枠から山札の一番下に置き' not in section:
        raise ValueError('263 companion placement text differs')
    reduced = copy.deepcopy(proof)
    reduced['candidate_ids'] = [x for x in proof['candidate_ids'] if x !=
                                next(y['candidate_id'] for y in details if y['action_type'] == 'place_world')]
    reduced['legal_candidate_details'] = [x for x in details if x['action_type'] != 'place_world']
    free = free_choice.decide(row, reduced)
    if free['selected_candidate'] != card['candidate_id'] or \
            free['resolution_mode'] != 'safe_free_development':
        raise ValueError('263 free companion not selected against main')
    placement = free['selected_placement']
    if fallback.validate_safe_free_placement(placement):
        raise ValueError('263 unsafe free development')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    context = {'contract_version': fallback.CONTRACT_VERSION, 'order_id': order,
               'actor': actor, 'actor_turn_index': game['round'], 'round': game['round'],
               'phase': 'normal_action', 'decision_kind': 'normal_action',
               'choice_kind': 'zero_cost_person_placement'}
    decision = fallback.resolve_safe_free_development([placement], context, proof['candidate_ids'])
    if decision.get('selected_candidate') != card['candidate_id'] or \
            decision.get('resolution_mode') != 'safe_free_development':
        raise ValueError('263 full candidate free selection differs')
    common = {'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
              'certain_growth_difference': 0, 'consumed_card_count': 0, 'value_comparison_to': {}}
    free_score = {**common, 'candidate_id': card['candidate_id'],
                  'time_after_certain_resolution': owner['time'], 'payment_time': 0,
                  'card_copy_id': game['cards'][card['source_instance_id']]['card_copy_id']}
    comparisons = []
    for paid in details:
        if paid['action_type'] not in ('place_world', 'play_main'):
            continue
        cost, reference = paid_choice.paid_score(owner, game, paid)
        score = {**common, 'candidate_id': paid['candidate_id'],
                 'time_after_certain_resolution': owner['time'] - cost,
                 'payment_time': cost,
                 'card_copy_id': game['cards'][paid['source_instance_id']]['card_copy_id']}
        comparison = priority.compare_candidates(free_score, score)
        if comparison['winner'] != 'left' or comparison['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('263 paid action not dominated')
        comparisons.append({'candidate_id': paid['candidate_id'],
                            'source_reference': reference, 'score': score,
                            'comparison': comparison})
    if len(comparisons) != 2:
        raise ValueError('263 paid comparison inventory differs')
    decision.update({'selected_action': copy.deepcopy(card),
                     'legal_candidate_details': copy.deepcopy(details),
                     'pre_game_state_sha256': row['final_game_state_sha256'],
                     'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                     'event_seq': row['last_valid_event_seq']})
    return {'selected_candidate': card['candidate_id'],
            'resolution_mode': 'safe_free_development',
            'selected_decision': decision, 'free_score': free_score,
            'paid_comparisons': comparisons, 'source_contracts': [107, 114, 116]}


def choose(row, proof):
    boundary = ((row['path_id'], row['source_last_valid_event_seq'],
                 row['source_game_state_sha256'], row['source_continuation_state_sha256'])
                if proof['turn_end_set_complete'] else
                (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
                 row['final_continuation_state_sha256']))
    if boundary != (proof['path_id'], proof['source_last_valid_event_seq'],
                    proof['source_game_state_sha256'], proof['source_continuation_state_sha256']):
        raise ValueError('263 state/audit boundary differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if proof['turn_end_set_complete']:
        if row['path_id'] != 'probe-02-b-first' or row['stop_reason_code'] != 'unproved_current_egg_exchange_choice':
            raise ValueError('263 egg source not advanced from proved end')
        inventory = egg_audit.audit_route(row)
        decision = egg_choice.run_route(row)['new_decisions'][0]
        if inventory['candidate_ids'] != decision['legal_candidates'] or \
                inventory['legal_candidate_details'] != decision['legal_candidate_details']:
            raise ValueError('263 seeded mandatory choice differs')
        return {**base, 'candidate_ids': inventory['candidate_ids'],
                'selected_candidate': decision['selected_candidate'],
                'resolution_mode': decision['resolution_mode'],
                'selected_decision': decision}
    if proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete']:
        raise ValueError('263 normal source incomplete')
    if row['path_id'] == 'probe-01-b-first':
        selected = free_companion_choice(row, proof)
    else:
        selected = (item_choice.audit_route(row, proof) if row['path_id'] == 'probe-01-a-first'
                    else paid_choice.audit_route(row, proof))
        if selected['selected_candidate'] != 'pass':
            raise ValueError('263 paid normal action unexpectedly selected')
    return {**base, 'candidate_ids': proof['candidate_ids'],
            'selected_candidate': selected['selected_candidate'],
            'resolution_mode': selected['resolution_mode'],
            'comparison_evidence': selected}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['263 independent choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    result = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id']))
              for row in rows]
    if len(result) != 4 or any(validate_result(x) for x in result):
        raise ValueError('263 mixed choice differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'audit_raw_sha256': AUDIT_RAW_SHA256, 'planned': 4, 'completed': 0,
            'new_events': 0, 'independent_balance_sample_count': 0, 'results': result}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('263 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('263: two normal passes, one free companion, one mandatory egg')


if __name__ == '__main__':
    main()
