#!/usr/bin/env python3
"""Replay a free placement, a response pass, and two proved turn ends."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_choice_356 as choices
import proxy_new_seed_mixed_audit_355 as audits
import proxy_new_seed_mixed_replay_354 as states
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_mixed_replay_339 as end_a
import proxy_new_seed_mixed_replay_311 as end_b
import proxy_response_window_seeded_restart as response
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '032f868701c4338d8f27ee8ce0ffda2fd7fa18480952c8752ee3ebd849bf386e'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-357-20260929.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_357.v1'


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
        raise ValueError('357 protected choice/audit/state differ')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            row['path_id'] in ('probe-01-a-first','probe-01-b-first') and
            selected['candidate_ids'] != proof['candidate_ids']):
        raise ValueError('357 selected source boundary differs')
    path = row['path_id']
    if path in ('probe-02-a-first','probe-02-b-first'):
        if (selected['selected_candidate']!='turn_end' or selected['resolution_mode']!='mandatory_proved_end' or
                not proof['turn_end_set_complete'] or proof['completeness_checks']!=selected['six_stage_checks']):
            raise ValueError('357 end choice differs')
        previous=end.classify_next_board
        try:
            end.classify_next_board=(end_a if path=='probe-02-a-first' else end_b).classify_next_board
            result=end.run_route(row,proof)
        finally:
            end.classify_next_board=previous
        if [e['action_type'] for e in result['new_events']]!=['turn_end_completed','turn_start_and_egg_draw']:
            raise ValueError('357 end/draw sequence differs')
        return result
    if path == 'probe-01-a-first':
        if (selected['selected_candidate'] != 'candidate-place-companion-A-012#1' or
                selected['resolution_mode'] != 'safe_free_development' or
                proof['next_opportunity'] != 'normal_action' or
                not all(proof['completeness_checks'].values())):
            raise ValueError('357 free placement choice differs')
        before = copy.deepcopy(row['final_continuation_state'])
        before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                      source_game_state_sha256=row['final_game_state_sha256'],
                      continuation_state_sha256=row['final_continuation_state_sha256'])
        if start._hash(before) != row['final_continuation_state_sha256']:
            raise ValueError('357 placement source state/hash differs')
        decision = copy.deepcopy(selected['selected_decision'])
        decision.update(selected_action=copy.deepcopy(selected['selected_action']),
                        legal_candidate_details=copy.deepcopy(proof['legal_candidate_details']),
                        pre_game_state_sha256=row['final_game_state_sha256'],
                        pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                        event_seq=row['last_valid_event_seq'])
        section = (Path(__file__).resolve().parents[1] / '72-companion-26-card-text-draft.md').read_text().split(
            '### C-box — ', 1)[1].split('\n### ', 1)[0]
        if '能力なし。' not in section:
            raise ValueError('357 C-box text differs')
        registered = extension.PLACEMENT_TEXT.get('C-box')
        current = ('72-companion-26-card-text-draft.md#C-box', 'no_ability')
        if registered is not None and registered != current:
            raise ValueError('357 placement classification conflicts')
        try:
            extension.PLACEMENT_TEXT['C-box'] = current
            after, generated = extension._apply_placement(before, decision)
        finally:
            if registered is None:
                extension.PLACEMENT_TEXT.pop('C-box', None)
            else:
                extension.PLACEMENT_TEXT['C-box'] = registered
        normal._verify_step(before, after, generated)
        owner = before['game_state']['turn_player']
        if (len(generated) != 1 or generated[0]['action_type'] != 'place_companion' or
                after['game_state']['phase'] != 'post_placement_response' or
                'A-012#1' not in after['game_state']['players'][owner]['board']['companions']):
            raise ValueError('357 companion placement differs')
        event = {k: copy.deepcopy(v) for k, v in generated[0].items() if k != '_snapshot_after'}
        return {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
                'source_game_state_sha256': row['final_game_state_sha256'],
                'source_continuation_state_sha256': row['final_continuation_state_sha256'],
                'last_valid_event_seq': after['last_event_seq'],
                'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
                'final_continuation_state_sha256': after['continuation_state_sha256'],
                'final_continuation_state': start._payload(after),
                'stop_reason_code': 'unproved_post_placement_response_candidates',
                'new_decisions': [decision], 'new_events': [event],
                'new_snapshots': [snapshots.snapshot(after)], 'completed': False,
                'balance_sample_count': 0}
    if (path != 'probe-01-b-first' or selected['selected_candidate'] != 'response-pass' or
            proof['candidate_ids'] != ['response-pass'] or proof['next_opportunity'] != 'turn_end_response'):
        raise ValueError('357 response choice differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('357 source state/hash differs')
    actor = before['response_context']['priority_actor']
    decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                'selected_action': {'action_type': 'response_pass'},
                'resolution_mode': 'response_unique', 'actor': actor}
    after, event = response.apply_response_pass(before, decision)
    if after['response_context']['consecutive_passes'] != 2:
        raise ValueError('357 end response closure differs')
    after['game_state']['phase'] = 'turn_end'
    after['return_target'] = 'turn_end'
    after['continuation_state_sha256'] = start._hash(after)
    event['game_state_after_sha256'] = start.opening._stop_state_sha256(after['game_state'])
    event['continuation_state_after_sha256'] = after['continuation_state_sha256']
    event['result']['return_target'] = 'turn_end'
    event.pop('_snapshot_after', None)
    normal._verify_step(before, after, [event])
    if (before['response_context']['consecutive_passes'] != 1 or
            after['response_context']['consecutive_passes'] != 2 or
            after['game_state']['phase'] != 'turn_end'):
        raise ValueError('357 response closure differs')
    decision.update(pre_game_state_sha256=row['final_game_state_sha256'],
                    pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                    event_seq=row['last_valid_event_seq'])
    return {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after),
            'stop_reason_code': 'unproved_current_turn_end_set',
            'new_decisions': [decision], 'new_events': [event],
            'new_snapshots': [snapshots.snapshot(after)], 'completed': False,
            'balance_sample_count': 0}


def validate_result(result):
    try:
        rows, selected, proofs = load_sources()
        source = next(x for x in rows if x['path_id'] == result['path_id'])
        choice = next(x for x in selected if x['path_id'] == result['path_id'])
        proof = next(x for x in proofs if x['path_id'] == result['path_id'])
        if (result != run_route(source, choice, proof) or
                result['last_valid_event_seq'] != source['last_valid_event_seq'] + len(result['new_events'])):
            return ['357 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['357 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['357 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or sum(len(x['new_events']) for x in results) != 6 or any(validate_result(x) for x in results):
        raise ValueError('357 four transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': sum(len(x['new_decisions']) for x in results),
            'new_events': 6, 'new_snapshots': 6,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('357 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('357: placement, response, two end/draws replayed')


if __name__ == '__main__':
    main()
