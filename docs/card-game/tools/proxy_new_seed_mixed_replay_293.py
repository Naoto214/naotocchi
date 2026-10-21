#!/usr/bin/env python3
"""Apply checkpoint 292 selections with chained event and snapshot hashes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import proxy_new_seed_mixed_choice_292 as choices
import proxy_new_seed_mixed_audit_291 as audits
import proxy_new_seed_mixed_replay_290 as states
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_hit_blow_response_142 as chain
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '749d4864428c1f0183ff2dbbe81c4898cd6b6fefcbfeaf7cf1dfb07e416e2db7'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-293-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_293.v1'

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
        raise ValueError('293 protected choice/audit/state differ')
    return (json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results'])

def classify_next_board(game, actor):
    owner = game['players'][actor]
    companions = owner['board']['companions']
    cats = [x for x in companions if game['cards'][x]['card_id'] == 'C-cat_friend']
    if not cats:
        return ORIGINAL_CLASSIFY(game, actor)
    if len(cats) != 1 or len(companions) != 1:
        raise ValueError('293 next board companion inventory differs')
    section = (ROOT / '72-companion-26-card-text-draft.md').read_text().split(
        '### C-cat_friend — ', 1)[1].split('\n### ', 1)[0]
    if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or
            '自分のターン開始時' in section):
        raise ValueError('293 cat friend activation timing differs')
    projected = copy.deepcopy(game)
    projected['players'][actor]['board']['companions'].remove(cats[0])
    classified = ORIGINAL_CLASSIFY(projected, actor)
    classified.append({'source_instance_id': cats[0], 'card_id': 'C-cat_friend',
                       'trigger_kind': 'activated_ability_not_turn_start',
                       'source_reference': '72-companion-26-card-text-draft.md#C-cat_friend'})
    return classified

ORIGINAL_CLASSIFY = end.classify_next_board

def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
         row['final_continuation_state_sha256']) !=
        (selected['path_id'], selected['source_last_valid_event_seq'],
         selected['source_game_state_sha256'], selected['source_continuation_state_sha256'])):
        raise ValueError('293 selected state boundary differs')
    if selected['selected_candidate'] == 'turn_end':
        if not proof['turn_end_set_complete'] or selected['resolution_mode'] != 'mandatory_proved_end':
            raise ValueError('293 end proof differs')
        original = end.classify_next_board
        try:
            end.classify_next_board = classify_next_board
            result = end.run_route(row, proof)
        finally:
            end.classify_next_board = original
        if len(result['new_events']) != 2:
            raise ValueError('293 end and next draw differs')
        return result
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'],
                  last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('293 source state/hash differs')
    if selected['selected_candidate'] != 'response-pass' or proof['candidate_ids'] != ['response-pass'] or not proof['candidate_set_complete']:
        raise ValueError('293 unique end response differs')
    actor = before['response_context']['priority_actor']
    decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                'selected_action': {'action_type': 'response_pass'},
                'resolution_mode': 'response_unique', 'actor': actor}
    after, event = response.apply_response_pass(before, decision)
    if after['response_context']['consecutive_passes'] != 2 or before['return_target'] != 'turn_end':
        raise ValueError('293 end response closure differs')
    after['game_state']['phase'] = 'turn_end'
    after['return_target'] = 'turn_end'
    after['continuation_state_sha256'] = start._hash(after)
    event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
    event['continuation_state_after_sha256'] = after['continuation_state_sha256']
    event['result']['return_target'] = 'turn_end'
    event.pop('_snapshot_after', None)
    normal._verify_step(before, after, [event])
    reason = 'unproved_current_turn_end_provenance'
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
            return ['293 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['293 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['293 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]

def build_report():
    rows, selected, proofs = load_sources()
    result = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                        next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(result) != 4 or sum(len(x['new_events']) for x in result) != 6 or any(validate_result(x) for x in result):
        raise ValueError('293 four transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 2,
            'new_events': 6, 'new_snapshots': 6,
            'independent_balance_sample_count': 0, 'results': result}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('293 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('293: two end responses and two proved end/draw pairs')

if __name__ == '__main__': main()
