#!/usr/bin/env python3
"""Replay four decisions proved by checkpoint 244."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_followup_choice_244 as choices
import proxy_new_seed_followup_audit_243 as audits
import proxy_new_seed_followup_replay_242 as states
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_normal_action_extension as extension
import proxy_normal_action_candidate_completeness as candidates
import proxy_new_seed_normal_restart_147 as placement_scope
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = choices.OUTPUT
SOURCE_RAW_SHA256 = '420a1bba0637f1dad27d16d2e2c7ca8c4be9ef5e615f3be29479f7436063a62e'
OUTPUT = ROOT / 'data/proxy-new-seed-followup-replay-245-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_followup_replay_245.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, inventory, saved = SOURCE.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(inventory).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            inventory != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('245 protected choice/audit/state differs')
    proofs = json.loads(raw)['results']
    audits_rows = json.loads(inventory)['results']
    rows = json.loads(saved)['results']
    if (len(proofs) != len(audits_rows) != len(rows) != 4 or
            any(choices.validate_result(proof) for proof in proofs)):
        raise ValueError('245 source inventory differs')
    return proofs, audits_rows, rows


def run_route(row, proof, audit):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (proof['path_id'], proof['source_last_valid_event_seq'],
         proof['source_game_state_sha256'], proof['source_continuation_state_sha256']) or
            audit['candidate_ids'] != proof['candidate_ids']):
        raise ValueError('245 source choice boundary differs')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update(source_event_seq=row['last_valid_event_seq'],
                 last_event_seq=row['last_valid_event_seq'],
                 source_game_state_sha256=row['final_game_state_sha256'],
                 continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(state) != row['final_continuation_state_sha256']:
        raise ValueError('245 source continuation hash differs')
    choice = proof['selected_candidate']
    if choice == 'response-pass':
        if (audit['next_opportunity'] != 'post_placement_response' or
                state['response_context']['consecutive_passes'] != 1):
            raise ValueError('245 placement response boundary differs')
        actor = state['response_context']['priority_actor']
        after, event, _ = start._pass(state, actor)
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'resolution_mode': 'response_unique', 'actor': actor}
        reason = 'unproved_current_normal_action_candidates'
        if after['game_state']['phase'] != 'normal_action':
            raise ValueError('245 placement response did not close')
    elif choice == 'pass':
        if (audit['next_opportunity'] != 'normal_action' or
                any(x['comparison']['winner'] != 'left' for x in proof['paid_comparisons'])):
            raise ValueError('245 normal pass priority differs')
        detail = next(x for x in audit['legal_candidate_details'] if x['action_type'] == 'pass')
        decision = {'decision_kind': 'normal_action', 'resolution_mode': 'priority_unique',
                    'reason_code': 'time_balance', 'strategic_unresolved': False,
                    'legal_candidates': copy.deepcopy(audit['candidate_ids']),
                    'legal_candidate_details': copy.deepcopy(audit['legal_candidate_details']),
                    'candidate_set_complete': True, 'selected_candidate': 'pass',
                    'selected_action': copy.deepcopy(detail),
                    'runner_up_candidates': [x for x in audit['candidate_ids'] if x != 'pass'],
                    'seed_context': None, 'seed_proof': None,
                    'priority_basis': copy.deepcopy(proof['paid_comparisons'])}
        after, generated = normal.transition(state, decision, {
            'candidate_table': candidates.load_inputs()['candidate_table']})
        if len(generated) != 1 or after['game_state']['phase'] != 'turn_end_response':
            raise ValueError('245 normal pass transition differs')
        event = {k: copy.deepcopy(v) for k, v in generated[0].items() if k != '_snapshot_after'}
        reason = 'unproved_turn_end_response_candidates'
    else:
        if (audit['next_opportunity'] != 'normal_action' or
                choice != 'candidate-place-companion-B-013#1' or
                proof['selected_decision']['selected_candidate'] != choice):
            raise ValueError('245 selected free companion differs')
        decision = copy.deepcopy(proof['selected_decision'])
        with placement_scope.partner_placement_scope():
            after, generated = extension._apply_placement(state, decision)
        if (len(generated) != 1 or generated[0]['action_type'] != 'place_companion' or
                after['game_state']['phase'] != 'post_placement_response'):
            raise ValueError('245 companion placement outcome differs')
        event = {k: copy.deepcopy(v) for k, v in generated[0].items() if k != '_snapshot_after'}
        reason = 'unproved_post_placement_response_candidates'
    normal._verify_step(state, after, [event])
    decision.update(pre_game_state_sha256=row['final_game_state_sha256'],
                    pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                    event_seq=row['last_valid_event_seq'])
    return {'path_id': row['path_id'],
            'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after),
            'stop_reason_code': reason, 'new_decisions': [decision],
            'new_events': [event], 'new_snapshots': [snapshots.snapshot(after)],
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        proofs, inventory, rows = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        audit = next(x for x in inventory if x['path_id'] == result['path_id'])
        if result != run_route(row, proof, audit):
            return ['245 independent replay differs']
        event, snap = result['new_events'][0], result['new_snapshots'][0]
        if (event['seq'] != row['last_valid_event_seq'] + 1 or
                event['game_state_before_sha256'] != row['final_game_state_sha256'] or
                event['continuation_state_before_sha256'] != row['final_continuation_state_sha256'] or
                event['game_state_after_sha256'] != snap['game_state_sha256'] or
                event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or
                start.canonical_sha256(snap['continuation_state']) != result['final_continuation_state_sha256']):
            return ['245 event/snapshot/hash chain differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    proofs, inventory, rows = load_sources()
    results = [run_route(row, next(x for x in proofs if x['path_id'] == row['path_id']),
                         next(x for x in inventory if x['path_id'] == row['path_id']))
               for row in rows]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('245 four replays differ')
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
            raise SystemExit('245 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('245: four selected actions replayed')


if __name__ == '__main__':
    main()
