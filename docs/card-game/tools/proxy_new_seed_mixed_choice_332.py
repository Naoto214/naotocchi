#!/usr/bin/env python3
"""Choose two normal passes, proved end and seeded egg exchange."""
import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import sys
sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_audit_correction_331 as audits
import proxy_new_seed_mixed_replay_329 as states
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_egg_replay_205 as egg
import proxy_normal_decision_hardening as priority
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'ad51963f6810d6835c0d2f93e199120d7fd0429b3ffbe74ac0996321f97b0bc1'
STATE_RAW_SHA256 = '0c112898b62def59cfba06cb93e40cafb48d94c8b755876561f2f64303b40cd5'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-332-20260928.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_choice_332.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, saved = audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('332 protected audit/state differ')
    proofs, rows = json.loads(raw)['results'], json.loads(saved)['results']
    if len(proofs) != 4 or len(rows) != 4 or json.loads(raw) != audits.build_report():
        raise ValueError('332 source inventory differs')
    return rows, proofs


def choose(row, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (proof['path_id'], proof['source_last_valid_event_seq'],
             proof['source_game_state_sha256'], proof['source_continuation_state_sha256'])):
        raise ValueError('332 source boundary differs')
    path = row['path_id']
    base = {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if path == 'probe-01-b-first':
        if (proof['next_opportunity'] != 'turn_end' or not proof['turn_end_set_complete'] or
                proof['contract_stop_codes'] or not all(proof['completeness_checks'].values())):
            raise ValueError('332 end proof differs')
        return {**base, 'selected_candidate': 'turn_end', 'resolution_mode': 'mandatory_proved_end',
                'six_stage_checks': proof['completeness_checks']}
    if path == 'probe-02-b-first':
        if (proof['next_opportunity'] != 'mandatory_egg_exchange' or
                not proof['candidate_set_complete'] or proof['resolution_mode'] != 'seeded_fallback'):
            raise ValueError('332 egg inventory differs')
        decision = egg.run_route(row)['new_decisions'][0]
        if (decision['legal_candidates'] != proof['candidate_ids'] or
                decision['legal_candidate_details'] != proof['legal_candidate_details'] or
                decision['resolution_mode'] != proof['resolution_mode'] or
                decision['selected_candidate'] not in proof['candidate_ids']):
            raise ValueError('332 seeded egg differs')
        return {**base, 'candidate_ids': proof['candidate_ids'],
                'selected_candidate': decision['selected_candidate'],
                'resolution_mode': 'seeded_fallback', 'selected_decision': decision}
    if (path not in ('probe-01-a-first', 'probe-02-a-first') or
            proof['next_opportunity'] != 'normal_action' or
            not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values())):
        raise ValueError('332 normal inventory differs')
    game = row['final_continuation_state']['game_state']
    actor = game['turn_player']
    owner = game['players'][actor]
    details = proof['legal_candidate_details']
    expected = (['place_world', 'place_world', 'play_main', 'pass'] if path == 'probe-01-a-first'
                else ['play_main', 'pass'])
    if (actor != ('B' if path == 'probe-01-a-first' else 'A') or
            owner['board']['main'] is not None or
            [x['action_type'] for x in details] != expected or
            [x['candidate_id'] for x in details] != proof['candidate_ids']):
        raise ValueError('332 normal candidate families differ')
    common = {'avoid_loss_or_abort': 0, 'maintain_or_prevent_100': 0,
              'certain_growth_difference': 0, 'consumed_card_count': 0, 'value_comparison_to': {}}
    passed = {**common, 'candidate_id': 'pass', 'payment_time': 0,
              'time_after_certain_resolution': owner['time'], 'card_copy_id': ''}
    comparisons = []
    for action in details[:-1]:
        if action['action_type'] == 'place_world' and action['card_id'] == 'W-deepsea':
            card = action['card_id']
            section = start.load_candidate_rows()[card]
            template = next(x for x in section['actions'] if x['action_type'] == 'place_world')
            text = (ROOT / '89-world-13-card-text-draft.md').read_text().split('### ' + card + ' — ', 1)[1].split('\n### ', 1)[0]
            if (owner['board']['world'] is not None or template['base_time_cost'] != 2 or
                    ('自分の手札が2枚以下の間' not in text or len(owner['hand']) <= 2)):
                raise ValueError('332 world immediate effect differs')
            cost, ref = 2, '89-world-13-card-text-draft.md#' + card
        else:
            cost, ref = paid.cost_and_effect(row, action)
        score = {**common, 'candidate_id': action['candidate_id'],
                 'time_after_certain_resolution': owner['time'] - cost,
                 'payment_time': cost,
                 'card_copy_id': game['cards'][action['source_instance_id']]['card_copy_id']}
        compared = priority.compare_candidates(passed, score)
        if compared['winner'] != 'left' or compared['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('332 paid candidate priority differs')
        comparisons.append({'candidate_id': action['candidate_id'],
                            'source_reference': ref, 'score': score, 'comparison': compared})
    return {**base, 'candidate_ids': proof['candidate_ids'],
            'selected_candidate': 'pass', 'resolution_mode': 'priority_unique',
            'pass_score': passed, 'paid_comparisons': comparisons,
            'source_contracts': [107, 114]}


def validate_result(result):
    try:
        rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        return [] if result == choose(row, proof) else ['332 choice differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, proofs = load_sources()
    results = [choose(row, next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('332 choices differ')
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
            raise SystemExit('332 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('332: two normal passes, proved end and seeded egg selected')


if __name__ == '__main__':
    main()
