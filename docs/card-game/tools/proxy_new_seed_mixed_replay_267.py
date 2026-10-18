#!/usr/bin/env python3
"""Apply the four selected responses to checkpoint 264 saved states."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_266 as choices
import proxy_new_seed_mixed_replay_264 as states
import proxy_new_seed_mixed_audit_265 as audits
import proxy_new_seed_end_response_replay_202 as end
import proxy_new_seed_next_response_restart_170 as coin
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = choices.OUTPUT
SOURCE_RAW_SHA256 = '6efbd8e4eba0f0b52b51a85f4450c7de4eed145604b1fa18b1266e92224e8e13'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-267-20260926.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_267.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, prior, proof_raw = SOURCE.read_bytes(), states.OUTPUT.read_bytes(), audits.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(prior).hexdigest() != audits.SOURCE_RAW_SHA256 or
            hashlib.sha256(proof_raw).hexdigest() != choices.SOURCE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            prior != states.canonical_bytes(states.build_report()) or
            proof_raw != audits.canonical_bytes(audits.build_report())):
        raise ValueError('267 selected/state/audit raw or canonical differs')
    decisions, rows, proofs = (json.loads(value)['results'] for value in (raw, prior, proof_raw))
    if len(rows) != len(decisions) != len(proofs) != 4 or any(choices.validate_result(x) for x in decisions):
        raise ValueError('267 protected source inventory differs')
    return decisions, rows, proofs


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (selected['path_id'], selected['source_last_valid_event_seq'],
         selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            proof['candidate_ids'] != selected['candidate_ids']):
        raise ValueError('267 saved choice boundary differs')
    phase = proof['next_opportunity']
    if phase == 'turn_end_response':
        if selected['selected_candidate'] != 'response-pass':
            raise ValueError('267 turn end selected non-pass')
        result = end.run_route(row, proof)
        if result['new_events'][0]['action_type'] != 'response_pass':
            raise ValueError('267 turn end response replay differs')
        return result
    before = copy.deepcopy(row['final_continuation_state'])
    before.update({'source_event_seq': row['last_valid_event_seq'],
                   'last_event_seq': row['last_valid_event_seq'],
                   'source_game_state_sha256': row['final_game_state_sha256'],
                   'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('267 source state hash differs')
    actor = before['response_context']['priority_actor']
    if phase == 'post_placement_response':
        if selected['selected_candidate'] != 'response-pass' or before['response_context']['consecutive_passes'] != 0:
            raise ValueError('267 post-placement first pass boundary differs')
        after, event, _ = start._pass(before, actor)
        if after['response_context']['consecutive_passes'] != 1 or after['response_context']['priority_actor'] == actor:
            raise ValueError('267 next placement response priority differs')
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'resolution_mode': 'response_unique', 'actor': actor}
        reason = 'unproved_next_priority_response_candidates'
    elif phase == 'response_window':
        if selected['selected_candidate'] != 'response-use-item-A-033#1' or actor != 'A':
            raise ValueError('267 seeded item boundary differs')
        decision = copy.deepcopy(selected['comparison'])
        after, event = coin.activate_quick_item(before, decision)
        reason = 'unproved_current_chain_response_or_resolution'
    else:
        raise ValueError('267 phase unclassified')
    if phase == 'post_placement_response':
        normal._verify_step(before, after, [event])
    elif (len(after['activation_zone']) != 1 or
          after['activation_zone'][0]['source_instance_id'] != 'A-033#1'):
        raise ValueError('267 activated item not in chain zone')
    decision.update({'pre_game_state_sha256': row['final_game_state_sha256'],
                     'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                     'event_seq': row['last_valid_event_seq']})
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after), 'stop_reason_code': reason,
            'new_decisions': [decision], 'new_events': [event],
            'new_snapshots': [snapshots.snapshot(after)],
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        choices_rows, rows, proofs = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        selected = next(x for x in choices_rows if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(row, selected, proof) or result['last_valid_event_seq'] != row['last_valid_event_seq'] + 1:
            return ['267 independent replay differs']
        event, shot = result['new_events'][0], result['new_snapshots'][0]
        if (event['seq'] != shot['event_seq'] or
                event['game_state_before_sha256'] != row['final_game_state_sha256'] or
                event['continuation_state_before_sha256'] != row['final_continuation_state_sha256'] or
                event['game_state_after_sha256'] != shot['game_state_sha256'] or
                event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                start.opening._stop_state_sha256(shot['game_state']) != result['final_game_state_sha256'] or
                start.canonical_sha256(shot['continuation_state']) != result['final_continuation_state_sha256']):
            return ['267 event/snapshot/hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    selected, rows, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('267 four replay outcomes differ')
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
            raise SystemExit('267 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('267: two end responses, placement pass and quick item activation applied')


if __name__ == '__main__':
    main()
