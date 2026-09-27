#!/usr/bin/env python3
"""Audit two egg exchanges, one response and one normal action."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_replay_320 as states
import proxy_new_seed_mixed_audit_318 as response
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_normal_decision_seeded_restart as opening
import proxy_normal_decision_fallback_contract as fallback
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '4d205873d90d6fabc88f31df62caa315cdf6c1319054c6fdfbed59d2adffb53c'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-321-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_321.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('321 protected replay differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('321 saved inventory differs')
    return rows


def audit_egg(row):
    state = row['final_continuation_state']
    game = state['game_state']
    actor = game['turn_player']
    owner = game['players'][actor]
    if (game['phase'] != 'egg_exchange_choice' or not 1 <= game['round'] <= 10 or
            len(owner['hand']) < 2 or owner['reservations'] or
            state['activation_zone'] or state['pending_triggers']):
        raise ValueError('321 mandatory egg boundary differs')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    held = [{'card_copy_id': game['cards'][x]['card_copy_id'], 'card_id': game['cards'][x]['card_id'],
             'initial_instance_id': x} for x in owner['hand']]
    decision = opening.build_mandatory_choice_decision({'order_id': order}, actor,
                                                         game['round'], game['round'], held)
    if (fallback.validate_seeded_resolution(decision) or
            len(decision['legal_candidates']) != len(held) or
            decision['seeded_fallback_candidates'] != decision['legal_candidates'] or
            {x['initial_instance_id'] for x in decision['legal_candidate_details']} != set(owner['hand'])):
        raise ValueError('321 mandatory egg candidates incomplete')
    return {'next_opportunity': 'mandatory_egg_exchange',
            'candidate_ids': decision['legal_candidates'], 'candidate_set_complete': True,
            'legal_candidate_details': decision['legal_candidate_details'],
            'resolution_mode': decision['resolution_mode']}


def audit_route(row):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('321 source hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] in ('probe-01-a-first', 'probe-02-a-first'):
        return {**base, **audit_egg(row)}
    if row['path_id'] == 'probe-01-b-first':
        # Same B priority, turn-start, second response boundary as 318's 02-B.
        equivalent = copy.deepcopy(row)
        equivalent['path_id'] = 'probe-02-b-first'
        detail = response.audit_response(equivalent)
        return {**base, **detail}
    if row['path_id'] != 'probe-02-b-first' or game['phase'] != 'normal_action':
        raise ValueError('321 normal boundary differs')
    current = copy.deepcopy(row)
    current['stop_reason_code'] = 'unproved_current_normal_action_candidates'
    proof = normal.audit_route(current)
    if (proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete'] or
            not all(proof['completeness_checks'].values())):
        raise ValueError('321 normal candidate completeness differs')
    return {**base, **{key: proof[key] for key in ('next_opportunity', 'candidate_ids',
            'candidate_set_complete', 'legal_candidate_details', 'completeness_checks', 'board_exclusions')}}


def validate_result(result):
    try:
        row = next(x for x in load_source() if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row) else ['321 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('321 four opportunity inventory differs')
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
            raise SystemExit('321 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('321: two eggs, one response and one normal audited')


if __name__ == '__main__':
    main()
