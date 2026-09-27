#!/usr/bin/env python3
"""Apply 304's four selected transitions with event and snapshot hashes."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_choice_304 as choices
import proxy_new_seed_mixed_audit_303 as audits
import proxy_new_seed_mixed_replay_302 as states
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_extension as extension
import proxy_normal_action_candidate_completeness as candidates
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_hit_blow_response_142 as chain
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'd1b11815de3e9ed7871c20f381fa059a56eeb9e07ca5a9c400e2df0b59bcc464'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-305-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_305.v1'


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
        raise ValueError('305 protected choice/audit/state differ')
    return json.loads(saved)['results'], json.loads(raw)['results'], json.loads(audited)['results']


def run_route(row, selected, proof):
    if ((row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
          row['final_continuation_state_sha256']) !=
            (selected['path_id'], selected['source_last_valid_event_seq'],
             selected['source_game_state_sha256'], selected['source_continuation_state_sha256']) or
            selected['candidate_ids'] != proof['candidate_ids'] or not proof['candidate_set_complete']):
        raise ValueError('305 selected state boundary differs')
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('305 source state/hash differs')
    path = row['path_id']
    if proof['next_opportunity'] == 'response_window':
        if (path not in ('probe-01-a-first', 'probe-01-b-first') or
                selected['selected_candidate'] != 'response-pass' or
                selected['resolution_mode'] != 'response_unique' or proof['candidate_ids'] != ['response-pass']):
            raise ValueError('305 response selection differs')
        actor = before['response_context']['priority_actor']
        if path == 'probe-01-a-first':
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
            if (after['game_state']['phase'] != 'response_window' or
                    after['response_context']['chain_status'] != 'building' or
                    after['response_context']['consecutive_passes'] != 1 or
                    after['response_context']['priority_actor'] == actor or
                    len(after['activation_zone']) != 1):
                raise ValueError('305 chain next priority differs')
        else:
            after, event, _ = start._pass(before, actor)
            normal._verify_step(before, after, [event])
            if (after['game_state']['phase'] != 'normal_action' or
                    after['response_context']['consecutive_passes'] != 2):
                raise ValueError('305 response closure differs')
        decision = {'decision_kind': 'response', 'selected_candidate': 'response-pass',
                    'resolution_mode': 'response_unique', 'actor': actor}
        reason = ('unproved_current_chain_response_candidates' if path == 'probe-01-a-first'
                  else 'unproved_current_normal_action_candidates')
    elif path == 'probe-02-a-first':
        if (selected['selected_candidate'] != 'candidate-place-companion-B-013#1' or
                selected['resolution_mode'] != 'safe_free_development' or
                not all(proof['completeness_checks'].values())):
            raise ValueError('305 free placement selection differs')
        decision = copy.deepcopy(selected['selected_decision'])
        decision.update(selected_action=copy.deepcopy(selected['selected_action']),
                        legal_candidate_details=copy.deepcopy(proof['legal_candidate_details']))
        section = audits.hand.source_section('72-companion-26-card-text-draft.md', 'C-cat_friend')
        if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or
                '自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                any(before['game_state']['cards'][x]['card_id'].startswith('C-')
                    for x in before['game_state']['players']['B']['discard'])):
            raise ValueError('305 companion activation timing/target differs')
        registered = extension.PLACEMENT_TEXT.get('C-cat_friend')
        current = ('72-companion-26-card-text-draft.md#C-cat_friend',
                   'own_turn_activated_ability_not_placement')
        if registered is not None and registered != current:
            raise ValueError('305 placement classification conflicts')
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
            raise ValueError('305 companion placement differs')
        event = {k: copy.deepcopy(v) for k, v in generated[0].items() if k != '_snapshot_after'}
        reason = 'unproved_post_placement_response_candidates'
    elif path == 'probe-02-b-first':
        if (selected['selected_candidate'] != 'pass' or selected['resolution_mode'] != 'priority_unique' or
                proof['next_opportunity'] != 'normal_action' or not all(proof['completeness_checks'].values()) or
                len(selected['paid_comparisons']) != len(proof['candidate_ids']) - 1 or
                not all(x['comparison']['winner'] == 'left' for x in selected['paid_comparisons'])):
            raise ValueError('305 normal pass selection differs')
        detail = next(x for x in proof['legal_candidate_details'] if x['candidate_id'] == 'pass')
        decision = {'decision_kind': 'normal_action', 'resolution_mode': 'priority_unique',
                    'reason_code': 'time_balance', 'strategic_unresolved': False,
                    'legal_candidates': copy.deepcopy(proof['candidate_ids']),
                    'legal_candidate_details': copy.deepcopy(proof['legal_candidate_details']),
                    'candidate_set_complete': True, 'selected_candidate': 'pass',
                    'selected_action': copy.deepcopy(detail),
                    'runner_up_candidates': [x for x in proof['candidate_ids'] if x != 'pass'],
                    'seed_context': None, 'seed_proof': None,
                    'priority_comparisons': copy.deepcopy(selected['paid_comparisons'])}
        decision.update(pre_game_state_sha256=row['final_game_state_sha256'],
                        pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                        event_seq=row['last_valid_event_seq'])
        after, generated = normal.transition(before, decision,
            {'candidate_table': candidates.load_inputs()['candidate_table']})
        normal._verify_step(before, after, generated)
        if len(generated) != 1 or after['game_state']['phase'] != 'turn_end_response':
            raise ValueError('305 normal pass transition differs')
        event = {k: copy.deepcopy(v) for k, v in generated[0].items() if k != '_snapshot_after'}
        reason = 'unproved_turn_end_response_candidates'
    else:
        raise ValueError('305 opportunity differs')
    decision.update(pre_game_state_sha256=row['final_game_state_sha256'],
                    pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                    event_seq=row['last_valid_event_seq'])
    return {'path_id': path, 'source_last_valid_event_seq': row['last_valid_event_seq'],
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
            return ['305 independent replay differs']
        game, continuation = source['final_game_state_sha256'], source['final_continuation_state_sha256']
        for event, shot in zip(result['new_events'], result['new_snapshots']):
            if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                    event['continuation_state_before_sha256'] != continuation or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                return ['305 event/snapshot/hash differs']
            game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
        return [] if (game, continuation) == (result['final_game_state_sha256'], result['final_continuation_state_sha256']) else ['305 final hash differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, selected, proofs = load_sources()
    results = [run_route(row, next(x for x in selected if x['path_id'] == row['path_id']),
                         next(x for x in proofs if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or sum(len(x['new_events']) for x in results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('305 four transitions differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 4, 'new_events': 4,
            'new_snapshots': 4, 'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('305 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('305: four selected events with snapshot/hash chain')


if __name__ == '__main__':
    main()
