#!/usr/bin/env python3
"""Apply checkpoint 301 selections with chained event and snapshot hashes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_choice_301 as choices
import proxy_new_seed_mixed_audit_300 as audits
import proxy_new_seed_mixed_replay_299 as states
import proxy_new_seed_ability_activation_190 as board_activation
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'a35db4399741f60a7e17c32bdcc7d7c4dfc5f01a99e134290feb64d4eeb53250'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-302-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_302.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw, audited, saved = choices.OUTPUT.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audited).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != audits.SOURCE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audited != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('302 protected choice/audit/state differ')
    return (json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results'])

def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (selected['path_id'], selected['source_last_valid_event_seq'],
         selected['source_game_state_sha256'], selected['source_continuation_state_sha256'])):
        raise ValueError('302 selected state boundary differs')
    if selected['selected_candidate'] == 'response-pass':
        if (proof['next_opportunity'] != 'response_window' or
                proof['candidate_ids'] != ['response-pass'] or
                selected['resolution_mode'] != 'response_unique'):
            raise ValueError('302 unique response differs')
        before = copy.deepcopy(row['final_continuation_state'])
        before.update(source_event_seq=row['last_valid_event_seq'],
                      last_event_seq=row['last_valid_event_seq'],
                      source_game_state_sha256=row['final_game_state_sha256'],
                      continuation_state_sha256=row['final_continuation_state_sha256'])
        if start._hash(before) != row['final_continuation_state_sha256']:
            raise ValueError('302 source state/hash differs')
        actor = before['response_context']['priority_actor']
        after, event, _ = start._pass(before, actor)
        normal._verify_step(before, after, [event])
        if row['path_id'] == 'probe-01-b-first':
            if (after['response_context']['consecutive_passes'] != 1 or
                    after['response_context']['priority_actor'] == actor or
                    after['game_state']['phase'] != 'response_window'):
                raise ValueError('302 next priority differs')
        elif (after['response_context']['consecutive_passes'] != 2 or
              after['game_state']['phase'] != 'normal_action'):
            raise ValueError('302 response closure differs')
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'resolution_mode': 'response_unique', 'actor': actor,
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
                'stop_reason_code': ('unproved_next_priority_response_candidates' if
                                     row['path_id'] == 'probe-01-b-first' else
                                     'unproved_current_normal_action_candidates'),
                'new_decisions': [decision], 'new_events': [event],
                'new_snapshots': [snapshots.snapshot(after)], 'completed': False,
                'balance_sample_count': 0}
    if (row['path_id'] != 'probe-01-a-first' or
            selected['resolution_mode'] != 'response_seeded_fallback' or
            selected['selected_candidate'] != 'response-activate-ability-A-015#1' or
            proof['candidate_ids'] != ['response-activate-ability-A-015#1', 'response-pass'] or
            len(proof['board_candidate_details']) != 1):
        raise ValueError('302 selected board activation differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'],
                  last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('302 board source state/hash differs')
    decision = copy.deepcopy(selected['comparison'])
    if decision['selected_candidate'] != selected['selected_candidate']:
        raise ValueError('302 saved seed choice differs')
    after, event = board_activation.activate_board_ability(before, decision,
        {'candidate_ids': [selected['selected_candidate']], 'source_instance_id': 'A-015#1'})
    if (after['game_state']['phase'] != 'response_window' or
            after['response_context']['chain_status'] != 'building' or
            len(after['activation_zone']) != 1 or
            after['activation_zone'][0]['source_zone'] != 'board'):
        raise ValueError('302 board chain activation differs')
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after),
            'stop_reason_code': 'unproved_current_chain_response_candidates',
            'new_decisions': [], 'new_events': [event],
            'new_snapshots': [snapshots.snapshot(after)], 'completed': False,
            'balance_sample_count': 0}

def validate_result(result):
    try:
        rows, selected, proofs = load_sources()
        source = next(x for x in rows if x['path_id'] == result['path_id'])
        choice = next(x for x in selected if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(source, choice, proof) or result['last_valid_event_seq'] != source['last_valid_event_seq'] + len(result['new_events']):
            return ['302 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['302 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['302 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]

def build_report():
    rows, selected, proofs = load_sources()
    result = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                        next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(result) != 4 or sum(len(x['new_events']) for x in result) != 4 or any(validate_result(x) for x in result):
        raise ValueError('302 four transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 3,
            'new_events': 4, 'new_snapshots': 4,
            'independent_balance_sample_count': 0, 'results': result}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('302 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('302: one board activation and three response passes')

if __name__ == '__main__': main()
