#!/usr/bin/env python3
"""Apply checkpoint 277 selections with chained event and snapshot hashes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_choice_277 as choices
import proxy_new_seed_mixed_audit_276 as audits
import proxy_new_seed_mixed_replay_275 as states
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_hit_blow_response_142 as chain
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '6b236eae49b07166be6e3a40297a7c725759184eabe23fec620cbab3ea6e81b0'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-278-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_278.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

@lru_cache(maxsize=1)
def load_sources():
    raw, audited, saved = choices.OUTPUT.read_bytes(), audits.OUTPUT.read_bytes(), states.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(audited).hexdigest() != choices.SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != choices.STATE_RAW_SHA256 or
            raw != choices.canonical_bytes(choices.build_report()) or
            audited != audits.canonical_bytes(audits.build_report()) or
            saved != states.canonical_bytes(states.build_report())):
        raise ValueError('278 protected choice/audit/state differ')
    return (json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results'])

def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (selected['path_id'], selected['source_last_valid_event_seq'],
         selected['source_game_state_sha256'], selected['source_continuation_state_sha256'])):
        raise ValueError('278 selected state boundary differs')
    if selected['selected_candidate'] == 'turn_end':
        if not proof['turn_end_set_complete'] or selected['resolution_mode'] != 'mandatory_proved_end':
            raise ValueError('278 end proof differs')
        result = end.run_route(row, proof)
        if len(result['new_events']) != 2:
            raise ValueError('278 end and next draw differs')
        return result
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'],
                  last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('278 source state/hash differs')
    if selected['selected_candidate'] == 'response-pass':
        if proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']:
            raise ValueError('278 unique response differs')
        actor = before['response_context']['priority_actor']
        if row['path_id'] == 'probe-01-a-first':
            after, event, _ = start._pass(before, actor)
            if after['game_state']['phase'] != 'normal_action':
                raise ValueError('278 start response not closed')
            reason = 'unproved_current_normal_action_candidates'
        else:
            transitioned = chain._turn_start_transition(before, {'kind': 'response_pass', 'actor': actor})
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
            if (after['response_context']['priority_actor'] != 'B' or
                    after['response_context']['consecutive_passes'] != 1 or
                    after['response_context']['chain_status'] != 'building'):
                raise ValueError('278 coin chain next priority differs')
            reason = 'unproved_other_actor_chain_response_candidates'
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'resolution_mode': 'response_unique', 'actor': actor}
    else:
        if (row['path_id'] != 'probe-02-b-first' or
                selected['selected_candidate'] != 'candidate-place-companion-A-012#1' or
                selected['resolution_mode'] != 'safe_free_development'):
            raise ValueError('278 free placement selection differs')
        decision = copy.deepcopy(selected['selected_decision'])
        decision.update(selected_action=copy.deepcopy(selected['selected_action']),
                        legal_candidate_details=copy.deepcopy(proof['legal_candidate_details']))
        after, generated = extension._apply_placement(before, decision)
        if (len(generated) != 1 or after['game_state']['phase'] != 'post_placement_response' or
                after['game_state']['players']['A']['board']['companions'] != ['A-012#1']):
            raise ValueError('278 C-box placement differs')
        event = {key: copy.deepcopy(value) for key, value in generated[0].items() if key != '_snapshot_after'}
        normal._verify_step(before, after, [event])
        reason = 'unproved_post_placement_response_candidates'
    decision.update(pre_game_state_sha256=row['final_game_state_sha256'],
                    pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                    event_seq=row['last_valid_event_seq'])
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after), 'stop_reason_code': reason,
            'new_decisions': [decision], 'new_events': [event],
            'new_snapshots': [snapshots.snapshot(after)], 'completed': False,
            'balance_sample_count': 0}

def validate_result(result):
    try:
        rows, selected, proofs = load_sources()
        source = next(x for x in rows if x['path_id'] == result['path_id'])
        choice = next(x for x in selected if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if result != run_route(source, choice, proof) or result['last_valid_event_seq'] != source['last_valid_event_seq'] + len(result['new_events']):
            return ['278 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['278 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['278 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]

def build_report():
    rows, selected, proofs = load_sources()
    result = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                        next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(result) != 4 or sum(len(x['new_events']) for x in result) != 5 or any(validate_result(x) for x in result):
        raise ValueError('278 four transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 3,
            'new_events': 5, 'new_snapshots': 5,
            'independent_balance_sample_count': 0, 'results': result}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('278 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('278: two passes, one proved end and draw, one C-box placement')

if __name__ == '__main__': main()
