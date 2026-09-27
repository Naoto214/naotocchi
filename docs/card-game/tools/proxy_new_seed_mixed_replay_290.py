#!/usr/bin/env python3
"""Replay the two normal passes and two turn-end response passes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_289 as choices
import proxy_new_seed_mixed_audit_288 as audits
import proxy_new_seed_mixed_replay_287 as states
import proxy_normal_action_candidate_completeness as candidates
import proxy_response_window_seeded_restart as response
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'b992ab66f9ed0de0859cbe88078f522a0770e3c7d4d0f1c7379d9bf647228cb6'
STATE_RAW_SHA256 = '55738f1e8db05e3fedb978b42233fd9fdbeac4a7973d51f70993d7190c4089f0'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-290-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_290.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, audited, saved = choices.OUTPUT.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audited).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audited != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('290 protected choice/audit/state differ')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            selected['candidate_ids'] != proof['candidate_ids']):
        raise ValueError('290 selected state boundary differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('290 source state/hash differs')
    if selected['candidate_ids'] != proof['candidate_ids'] or not proof['candidate_set_complete']:
        raise ValueError('290 candidate proof differs')
    if proof['next_opportunity'] == 'turn_end_response':
        if (selected['selected_candidate'] != 'response-pass' or
                selected['resolution_mode'] != 'response_unique' or
                proof['candidate_ids'] != ['response-pass'] or
                before['response_context']['consecutive_passes'] != 1 or
                before['return_target'] != 'turn_end'):
            raise ValueError('290 end response selection differs')
        actor = before['response_context']['priority_actor']
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'selected_action': {'action_type': 'response_pass'},
                    'resolution_mode': 'response_unique', 'actor': actor,
                    'pre_game_state_sha256': row['final_game_state_sha256'],
                    'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                    'event_seq': row['last_valid_event_seq']}
        after, event = response.apply_response_pass(before, decision)
        if after['response_context']['consecutive_passes'] != 2:
            raise ValueError('290 end response closure differs')
        after['game_state']['phase'] = 'turn_end'
        after['return_target'] = 'turn_end'
        after['continuation_state_sha256'] = start._hash(after)
        event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
        event['continuation_state_after_sha256'] = after['continuation_state_sha256']
        event['result']['return_target'] = 'turn_end'
        event.pop('_snapshot_after', None)
        normal._verify_step(before, after, [event])
        reason = 'unproved_current_turn_end_provenance'
    elif proof['next_opportunity'] == 'normal_action':
        if (selected['selected_candidate'] != 'pass' or selected['resolution_mode'] != 'priority_unique' or
                len(selected['paid_comparisons']) != len(proof['candidate_ids']) - 1 or
                not all(x['comparison']['winner'] == 'left' for x in selected['paid_comparisons']) or
                not all(proof['completeness_checks'].values())):
            raise ValueError('290 normal pass proof differs')
        detail = next(x for x in proof['legal_candidate_details'] if x['candidate_id'] == 'pass')
        decision = {'decision_kind': 'normal_action', 'resolution_mode': 'priority_unique',
                    'reason_code': 'time_balance', 'strategic_unresolved': False,
                    'legal_candidates': copy.deepcopy(proof['candidate_ids']),
                    'legal_candidate_details': copy.deepcopy(proof['legal_candidate_details']),
                    'candidate_set_complete': True, 'selected_candidate': 'pass',
                    'selected_action': copy.deepcopy(detail),
                    'runner_up_candidates': [x for x in proof['candidate_ids'] if x != 'pass'],
                    'seed_context': None, 'seed_proof': None,
                    'priority_comparisons': copy.deepcopy(selected['paid_comparisons']),
                    'pre_game_state_sha256': row['final_game_state_sha256'],
                    'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                    'event_seq': row['last_valid_event_seq']}
        after, generated = normal.transition(before, decision, {'candidate_table': candidates.load_inputs()['candidate_table']})
        normal._verify_step(before, after, generated)
        if len(generated) != 1 or after['game_state']['phase'] != 'turn_end_response':
            raise ValueError('290 normal pass transition differs')
        event = {k: copy.deepcopy(v) for k, v in generated[0].items() if k != '_snapshot_after'}
        reason = 'unproved_turn_end_response_candidates'
    else:
        raise ValueError('290 next opportunity differs')
    decisions = [decision]
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after), 'stop_reason_code': reason,
            'new_decisions': decisions, 'new_events': [event],
            'new_snapshots': [snapshots.snapshot(after)], 'completed': False,
            'balance_sample_count': 0}


def validate_result(result):
    try:
        rows, choices_rows, proofs = load_sources()
        source = next(x for x in rows if x['path_id'] == result['path_id'])
        choice = next(x for x in choices_rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(source, choice, proof) or result['last_valid_event_seq'] != source['last_valid_event_seq'] + 1:
            return ['290 independent replay differs']
        event, shot = result['new_events'][0], result['new_snapshots'][0]
        if (event['seq'] != shot['event_seq'] or
                event['game_state_before_sha256'] != source['final_game_state_sha256'] or
                event['continuation_state_before_sha256'] != source['final_continuation_state_sha256'] or
                event['game_state_after_sha256'] != shot['game_state_sha256'] or
                event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256'] or
                shot['game_state_sha256'] != result['final_game_state_sha256'] or
                shot['continuation_state_sha256'] != result['final_continuation_state_sha256']):
            return ['290 event/snapshot/hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, choices_rows, proofs = load_sources()
    results = [run_route(row, next(x for x in choices_rows if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('290 replay inventory differs')
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
            raise SystemExit('290 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('290: two normal and two end response passes replayed')


if __name__ == '__main__':
    main()
