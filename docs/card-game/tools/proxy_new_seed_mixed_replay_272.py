#!/usr/bin/env python3
"""Apply four checkpoint 271 choices, stopping before coin effect resolution."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_271 as choices
import proxy_new_seed_mixed_audit_270 as audits
import proxy_new_seed_mixed_replay_269 as states
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_followup_replay_245 as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_hit_blow_response_142 as chain
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = choices.OUTPUT
SOURCE_RAW_SHA256 = '93f32086720f95b6b4b9f540d4bbad89dca2baa361ee833ea6b0215ba78438d5'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-272-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_272.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, audited, previous = SOURCE.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audited).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(previous).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audited != audits.canonical_bytes(audits.build_report()) or
            previous != states.canonical_bytes(states.build_report())):
        raise ValueError('272 protected choices/audit/state differ')
    return (json.loads(previous)['results'], json.loads(raw)['results'],
            json.loads(audited)['results'])


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (selected['path_id'], selected['source_last_valid_event_seq'],
         selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            selected['candidate_ids'] != proof['candidate_ids']):
        raise ValueError('272 choice boundary differs')
    if proof['next_opportunity'] == 'mandatory_egg_exchange':
        result = egg.run_route(row)
        if (result['new_decisions'][0] != selected['selected_decision'] or
                result['new_events'][0]['action_type'] != 'egg_exchange_bottom'):
            raise ValueError('272 mandatory exchange differs')
        return result
    if proof['next_opportunity'] == 'normal_action':
        if (selected['selected_candidate'] != 'pass' or
                any(x['comparison']['winner'] != 'left' for x in selected['comparison_evidence']['paid_actions'])):
            raise ValueError('272 normal pass comparison differs')
        translated = {**selected, 'paid_comparisons': selected['comparison_evidence']['paid_actions']}
        result = normal.run_route(row, translated, proof)
        if result['new_events'][0]['action_type'] != 'normal_pass_end_request':
            raise ValueError('272 normal pass transition differs')
        return result
    if (proof['next_opportunity'] != 'response_window' or
            selected['selected_candidate'] != 'response-pass' or
            selected['resolution_mode'] != 'response_unique'):
        raise ValueError('272 chain response decision differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'],
                  last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('272 chain source hash differs')
    actor = before['response_context']['priority_actor']
    transitioned = chain._turn_start_transition(before, {'kind': 'response_pass', 'actor': actor})
    if (transitioned['chain_status'] != 'resolving' or
            transitioned['resolution_order'] != before['response_context']['chain_links'][::-1]):
        raise ValueError('272 chain closing order differs')
    after = copy.deepcopy(before)
    response._apply_transition_result(after, transitioned)
    after['last_event_seq'] = before['last_event_seq'] + 1
    after['continuation_state_sha256'] = start._hash(after)
    event = {'seq': after['last_event_seq'], 'action_type': 'response_pass',
             'actor': actor, 'selected_candidate': 'response-pass',
             'game_state_before_sha256': row['final_game_state_sha256'],
             'game_state_after_sha256': start.opening._stop_state_sha256(after['game_state']),
             'continuation_state_before_sha256': row['final_continuation_state_sha256'],
             'continuation_state_after_sha256': after['continuation_state_sha256']}
    decision = {'actor': actor, 'selected_candidate': 'response-pass',
                'resolution_mode': 'response_unique',
                'pre_game_state_sha256': row['final_game_state_sha256'],
                'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                'event_seq': row['last_valid_event_seq']}
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after),
            'stop_reason_code': 'unproved_current_coin_chain_resolution',
            'new_decisions': [decision], 'new_events': [event],
            'new_snapshots': [snapshots.snapshot(after)], 'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        rows, decisions, proofs = load_sources()
        source = next(x for x in rows if x['path_id'] == result['path_id'])
        selected = next(x for x in decisions if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(source, selected, proof) or result['last_valid_event_seq'] != source['last_valid_event_seq'] + 1:
            return ['272 replay differs']
        event, shot = result['new_events'][0], result['new_snapshots'][0]
        if (event['seq'] != shot['event_seq'] or
                event['game_state_before_sha256'] != source['final_game_state_sha256'] or
                event['continuation_state_before_sha256'] != source['final_continuation_state_sha256'] or
                event['game_state_after_sha256'] != shot['game_state_sha256'] or
                event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                start.opening._stop_state_sha256(shot['game_state']) != result['final_game_state_sha256'] or
                start.canonical_sha256(shot['continuation_state']) != result['final_continuation_state_sha256']):
            return ['272 event/snapshot/hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if (len(results) != 4 or sum(len(x['new_events']) for x in results) != 4 or
            any(validate_result(row) for row in results)):
        raise ValueError('272 four transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 4,
            'new_events': 4, 'new_snapshots': 4,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('272 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('272: two eggs, normal pass, chain closing pass')


if __name__ == '__main__':
    main()
