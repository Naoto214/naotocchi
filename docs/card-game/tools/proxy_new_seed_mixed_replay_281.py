#!/usr/bin/env python3
"""Replay checkpoint 280's four choices with event and snapshot hashes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_280 as choices
import proxy_new_seed_mixed_audit_279 as audits
import proxy_new_seed_mixed_replay_278 as states
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_hit_blow_response_142 as chain
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '571e4fe6b5f6cbb261dcc2a2bbb634bc50844df644d7bdce402ed41018d8899c'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-281-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_281.v1'


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
        raise ValueError('281 protected choice/audit/state differ')
    return (json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results'])


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            proof['candidate_ids'] != selected['candidate_ids']):
        raise ValueError('281 selected state boundary differs')
    if proof['next_opportunity'] == 'mandatory_egg_exchange':
        result = egg.run_route(row)
        if (result['new_decisions'][0] != selected['selected_decision'] or
                result['new_events'][0]['action_type'] != 'egg_exchange_bottom'):
            raise ValueError('281 seeded egg replay differs')
        return result
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('281 source state/hash differs')
    if selected['selected_candidate'] == 'response-pass':
        if proof['candidate_ids'] != ['response-pass'] or selected['resolution_mode'] != 'response_unique':
            raise ValueError('281 response uniqueness differs')
        actor = before['response_context']['priority_actor']
        if row['path_id'] == 'probe-02-b-first':
            after, event, _ = start._pass(before, actor)
            normal._verify_step(before, after, [event])
            if (after['response_context']['consecutive_passes'] != 1 or
                    after['response_context']['priority_actor'] == actor):
                raise ValueError('281 post-placement next priority differs')
            reason = 'unproved_next_priority_response_candidates'
        elif row['path_id'] == 'probe-02-a-first':
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
            if (after['response_context']['consecutive_passes'] != 2 or
                    after['response_context']['chain_status'] != 'resolving' or
                    after['activation_zone'][0]['card_id'] != 'I-c_coin2'):
                raise ValueError('281 coin chain resolution boundary differs')
            reason = 'unproved_current_chain_resolution'
        else:
            raise ValueError('281 response path differs')
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'resolution_mode': 'response_unique', 'actor': actor}
    else:
        if (row['path_id'] != 'probe-01-a-first' or
                selected['selected_candidate'] != 'candidate-place-companion-B-013#1' or
                selected['resolution_mode'] != 'safe_free_development'):
            raise ValueError('281 placement choice differs')
        decision = copy.deepcopy(selected['selected_decision'])
        decision.update(selected_action=copy.deepcopy(selected['selected_action']),
                        legal_candidate_details=copy.deepcopy(proof['legal_candidate_details']))
        section = audits.hand.source_section('72-companion-26-card-text-draft.md', 'C-cat_friend')
        if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or
                '自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                any(before['game_state']['cards'][x]['card_id'].startswith('C-')
                    for x in before['game_state']['players']['B']['discard'])):
            raise ValueError('281 companion activation timing/target differs')
        registered = extension.PLACEMENT_TEXT.get('C-cat_friend')
        current = ('72-companion-26-card-text-draft.md#C-cat_friend',
                   'own_turn_activated_ability_not_placement')
        if registered is not None and registered != current:
            raise ValueError('281 placement classification conflicts')
        try:
            extension.PLACEMENT_TEXT['C-cat_friend'] = current
            after, generated = extension._apply_placement(before, decision)
        finally:
            if registered is None:
                extension.PLACEMENT_TEXT.pop('C-cat_friend', None)
            else:
                extension.PLACEMENT_TEXT['C-cat_friend'] = registered
        normal._verify_step(before, after, generated)
        if (len(generated) != 1 or generated[0]['action_type'] != 'place_companion' or
                after['game_state']['phase'] != 'post_placement_response' or
                'B-013#1' not in after['game_state']['players']['B']['board']['companions']):
            raise ValueError('281 companion placement differs')
        event = {key: copy.deepcopy(value) for key, value in generated[0].items() if key != '_snapshot_after'}
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
        if (result != run_route(source, choice, proof) or
                result['last_valid_event_seq'] != source['last_valid_event_seq'] + len(result['new_events'])):
            return ['281 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['281 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['281 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    result = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                        next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(result) != 4 or sum(len(x['new_events']) for x in result) != 4 or any(validate_result(x) for x in result):
        raise ValueError('281 four transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 4,
            'new_events': 4, 'new_snapshots': 4,
            'independent_balance_sample_count': 0, 'results': result}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('281 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('281: four selected events with snapshot/hash chain')


if __name__ == '__main__':
    main()
