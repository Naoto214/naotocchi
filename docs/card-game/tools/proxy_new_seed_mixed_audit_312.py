#!/usr/bin/env python3
"""Audit two normal actions, proved turn end and mandatory egg exchange."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_311 as states
import proxy_new_seed_mixed_audit_294 as baseline
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_new_seed_turn_end_audit_163 as board
import proxy_turn_end_provenance_restart as precedent
import proxy_normal_decision_seeded_restart as opening
import proxy_normal_decision_fallback_contract as fallback
import proxy_new_seed_start_audit_206 as hand
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '368b1a8a9a0bf9d5030c8ae57b2450b12060fd9da79b5ca5360b1a177994f6df'
BASELINE_RAW_SHA256 = '1fd378057081f46579bbfbce81fb0adc83d919766fe62977e58787dfbd0ed3ef'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-312-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_312.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, inherited = states.OUTPUT.read_bytes(), baseline.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(inherited).hexdigest() != BASELINE_RAW_SHA256 or
            raw != states.canonical_bytes(states.build_report()) or
            inherited != baseline.canonical_bytes(baseline.build_report())):
        raise ValueError('312 protected state/history differs')
    rows, old = json.loads(raw)['results'], json.loads(inherited)['results']
    if len(rows) != 4 or len(old) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('312 source inventory differs')
    return rows, old


def prove_end(row, old):
    if old['path_id'] != row['path_id'] or not old['turn_end_set_complete']:
        raise ValueError('312 inherited end proof differs')
    seq = old['source_last_valid_event_seq']
    game_hash, cont_hash = old['source_game_state_sha256'], old['source_continuation_state_sha256']
    events, growth = copy.deepcopy(old['classified_events']), copy.deepcopy(old['growth_trace'])
    counts = {}
    for number in range(294, 312):
        files = list((ROOT / 'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files) != 1:
            raise ValueError(f'312 history inventory differs at {number}')
        saved = next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id'] == row['path_id'])
        new_events, shots = saved.get('new_events', []), saved.get('new_snapshots', [])
        new_events = [] if new_events == 0 else new_events
        shots = [] if shots == 0 else shots
        if not isinstance(new_events, list) or len(new_events) != len(shots):
            raise ValueError(f'312 history count differs at {number}')
        counts[str(number)] = len(new_events)
        for event, shot in zip(new_events, shots):
            action = event['action_type']
            if (action not in baseline.SOURCE_REFS or event['seq'] != seq + 1 or
                    shot['event_seq'] != event['seq'] or
                    event['game_state_before_sha256'] != game_hash or
                    event['continuation_state_before_sha256'] != cont_hash or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                raise ValueError(f'312 history hash differs at {number}')
            current = {actor: shot['game_state']['players'][actor]['growth'] for actor in 'AB'}
            delta = {actor: current[actor] - growth[-1]['growth'][actor] for actor in 'AB'}
            if any(delta.values()) or shot['continuation_state']['pending_triggers']:
                raise ValueError(f'312 unresolved growth/trigger at {number}')
            seq = event['seq']
            game_hash, cont_hash = shot['game_state_sha256'], shot['continuation_state_sha256']
            events.append({'seq': seq, 'action_type': action,
                           'source_reference': baseline.SOURCE_REFS[action], 'growth_delta': delta})
            growth.append({'event_seq': seq, 'growth': current})
    if (seq, game_hash, cont_hash) != (row['last_valid_event_seq'],
            row['final_game_state_sha256'], row['final_continuation_state_sha256']):
        raise ValueError('312 end history differs')
    inherited = next(x for x in json.loads(baseline.original_baseline.OUTPUT.read_bytes())['results']
                     if x['path_id'] == row['path_id'])
    if (not inherited['turn_end_set_complete'] or inherited['growth_reach_100'] or
            inherited['active_expiring_effects'] or inherited['unresolved_codes']):
        raise ValueError('312 inherited end constraints differ')
    state = row['final_continuation_state']
    stop = {'path_id': row['path_id'], 'last_valid_event_seq': seq,
            'game_state_sha256': game_hash, 'continuation_state_sha256': cont_hash,
            'game_state': state['game_state'], 'continuation_state': state}
    proof = {'classified_events': events, 'growth_trace': growth,
             'growth_reach_100': inherited['growth_reach_100'],
             'active_expiring_effects': inherited['active_expiring_effects'],
             'unresolved_codes': inherited['unresolved_codes'], 'source_event_seq': seq}
    section = hand.source_section('72-companion-26-card-text-draft.md', 'C-cat_friend')
    if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or
            '自分のターン終了時' in section):
        raise ValueError('312 cat friend timing differs')
    registry = board.board.turn_end.BOARD_REGISTRY
    addition = ('activated_ability_not_turn_end', '72-companion-26-card-text-draft.md#C-cat_friend')
    previous = registry.get('C-cat_friend')
    if previous is not None and previous != addition:
        raise ValueError('312 board classification conflict')
    try:
        registry['C-cat_friend'] = addition
        with board.current_board_scope():
            result = precedent.audit_current_turn_end(stop, proof)
    finally:
        if previous is None:
            registry.pop('C-cat_friend', None)
        else:
            registry['C-cat_friend'] = previous
    if not result['turn_end_set_complete'] or result['contract_stop_codes'] or not all(result['completeness_checks'].values()):
        raise ValueError('312 six-stage end incomplete: ' + repr(result['contract_stop_codes']))
    return {'next_opportunity': 'turn_end', 'turn_end_set_complete': True,
            'stage_inventory': result['stage_inventory'],
            'completeness_checks': result['completeness_checks'],
            'contract_stop_codes': result['contract_stop_codes'],
            'classified_events': events, 'growth_trace': growth,
            'event_counts_by_checkpoint': counts}


def audit_egg(row):
    state = row['final_continuation_state']
    game = state['game_state']
    actor = game['turn_player']
    owner = game['players'][actor]
    if (row['path_id'] != 'probe-02-b-first' or actor != 'A' or
            game['phase'] != 'egg_exchange_choice' or not 1 <= game['round'] <= 10 or
            len(owner['hand']) < 2 or owner['reservations'] or
            state['activation_zone'] or state['pending_triggers']):
        raise ValueError('312 mandatory egg boundary differs')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    held = [{'card_copy_id': game['cards'][x]['card_copy_id'], 'card_id': game['cards'][x]['card_id'],
             'initial_instance_id': x} for x in owner['hand']]
    decision = opening.build_mandatory_choice_decision({'order_id': order}, actor,
                                                         game['round'], game['round'], held)
    if (fallback.validate_seeded_resolution(decision) or
            len(decision['legal_candidates']) != len(held) or
            decision['seeded_fallback_candidates'] != decision['legal_candidates'] or
            {x['initial_instance_id'] for x in decision['legal_candidate_details']} != set(owner['hand'])):
        raise ValueError('312 egg candidates incomplete')
    return {'next_opportunity': 'mandatory_egg_exchange',
            'candidate_ids': decision['legal_candidates'], 'candidate_set_complete': True,
            'legal_candidate_details': decision['legal_candidate_details'],
            'resolution_mode': decision['resolution_mode']}


def audit_route(row, old):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('312 source hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] == 'probe-01-b-first':
        if game['phase'] != 'turn_end':
            raise ValueError('312 end boundary differs')
        return {**base, **prove_end(row, old)}
    if row['path_id'] == 'probe-02-b-first':
        return {**base, **audit_egg(row)}
    if row['path_id'] not in ('probe-01-a-first', 'probe-02-a-first') or game['phase'] != 'normal_action' or state['activation_zone'] or state['pending_triggers']:
        raise ValueError('312 normal boundary differs')
    current = copy.deepcopy(row)
    current['stop_reason_code'] = 'unproved_current_normal_action_candidates'
    proof = normal.audit_route(current)
    if proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):
        raise ValueError('312 normal candidate completeness differs')
    return {**base, **{key: proof[key] for key in ('next_opportunity', 'candidate_ids',
            'candidate_set_complete', 'legal_candidate_details', 'completeness_checks', 'board_exclusions')}}


def validate_result(result):
    try:
        rows, old = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        inherited = next(x for x in old if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, inherited) else ['312 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, old = load_sources()
    results = [audit_route(row, next(x for x in old if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('312 opportunity inventory differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'baseline_raw_sha256': BASELINE_RAW_SHA256, 'planned': 4, 'completed': 0,
            'new_events': 0, 'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('312 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('312: two normals, proved end and mandatory egg audited')


if __name__ == '__main__':
    main()
