#!/usr/bin/env python3
"""Audit checkpoint 293's two turn ends and two egg exchanges."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_293 as states
import proxy_new_seed_mixed_audit_268 as baseline
import proxy_new_seed_mixed_audit_276 as later_baseline
import proxy_new_seed_turn_end_proof_251 as original_baseline
import proxy_new_seed_mixed_audit_268 as history
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_new_seed_turn_end_audit_163 as board
import proxy_turn_end_provenance_restart as precedent
import proxy_start_response_138 as start
import proxy_normal_decision_seeded_restart as opening
import proxy_normal_decision_fallback_contract as fallback

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = '230a7bdb9a9fde02a242025ecea458327d16168b6f4a411b41d1d2452f67b094'
BASELINE_RAW_SHA256 = '8414192c8abc6bf18278f55bd29d23568b45a43b208c35cd65b43ec10f9462ee'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-294-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_294.v1'
SOURCE_REFS = {**history.history_audit.SOURCE_REFS,
               'resolve_item': '77-current-items-card-text-draft.md#I-c_coin2'}


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, prior, newer = SOURCE.read_bytes(), baseline.OUTPUT.read_bytes(), later_baseline.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(prior).hexdigest() != BASELINE_RAW_SHA256 or
            newer != later_baseline.canonical_bytes(later_baseline.build_report()) or
            raw != states.canonical_bytes(states.build_report()) or
            prior != baseline.canonical_bytes(baseline.build_report())):
        raise ValueError('294 protected state/history differs')
    rows, old, recent = json.loads(raw)['results'], json.loads(prior)['results'], json.loads(newer)['results']
    if len(rows) != len(old) or len(rows) != len(recent) or len(rows) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('294 source inventory differs')
    return rows, old, recent


def prove_end(row, old):
    if old['path_id'] != row['path_id'] or not old['turn_end_set_complete']:
        raise ValueError('294 inherited end proof differs')
    seq = old['source_last_valid_event_seq']
    game_hash, cont_hash = old['source_game_state_sha256'], old['source_continuation_state_sha256']
    events, growth = copy.deepcopy(old['classified_events']), copy.deepcopy(old['growth_trace'])
    counts = {}
    for number in range(269 if row['path_id'] == 'probe-01-a-first' else 277, 294):
        files = list((ROOT / 'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files) != 1:
            raise ValueError(f'294 history inventory differs at {number}')
        saved = next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id'] == row['path_id'])
        new_events, shots = saved.get('new_events', []), saved.get('new_snapshots', [])
        new_events = [] if new_events == 0 else new_events
        shots = [] if shots == 0 else shots
        if not isinstance(new_events, list) or len(new_events) != len(shots):
            raise ValueError(f'294 history event count differs at {number}')
        counts[str(number)] = len(new_events)
        for event, shot in zip(new_events, shots):
            action = event['action_type']
            if (action not in SOURCE_REFS or event['seq'] != seq + 1 or
                    shot['event_seq'] != event['seq'] or
                    event['game_state_before_sha256'] != game_hash or
                    event['continuation_state_before_sha256'] != cont_hash or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                raise ValueError(f"294 historical hashes differ at {number} {row['path_id']} seq={seq} event={event['seq']}")
            current = {actor: shot['game_state']['players'][actor]['growth'] for actor in 'AB'}
            delta = {actor: current[actor] - growth[-1]['growth'][actor] for actor in 'AB'}
            coin_growth = (row['path_id'] == 'probe-02-b-first' and number == 275 and
                           action == 'resolve_item' and event['source_instance_id'] == 'A-033#1' and
                           event['result']['growth_added'] == 5 and
                           event['result']['revealed_card_type'] == 'main' and
                           delta == {'A': 5, 'B': 0})
            if (any(delta.values()) and not coin_growth) or shot['continuation_state']['pending_triggers']:
                raise ValueError(f'294 historical growth or pending trigger differs at {number}')
            seq = event['seq']
            game_hash, cont_hash = shot['game_state_sha256'], shot['continuation_state_sha256']
            events.append({'seq': seq, 'action_type': action,
                           'source_reference': SOURCE_REFS[action],
                           'growth_delta': delta})
            growth.append({'event_seq': seq, 'growth': current})
    if (seq, game_hash, cont_hash) != (row['last_valid_event_seq'],
            row['final_game_state_sha256'], row['final_continuation_state_sha256']):
        raise ValueError('294 current end history differs')
    state = row['final_continuation_state']
    stop = {'path_id': row['path_id'], 'last_valid_event_seq': seq,
            'game_state_sha256': game_hash, 'continuation_state_sha256': cont_hash,
            'game_state': state['game_state'], 'continuation_state': state}
    inherited = next(x for x in json.loads(original_baseline.OUTPUT.read_bytes())['results']
                     if x['path_id'] == row['path_id'])
    if (not inherited['turn_end_set_complete'] or inherited['growth_reach_100'] or
            inherited['active_expiring_effects'] or inherited['unresolved_codes']):
        raise ValueError('294 inherited terminal or expiration proof differs')
    proof = {'classified_events': events, 'growth_trace': growth,
             'growth_reach_100': inherited['growth_reach_100'],
             'active_expiring_effects': inherited['active_expiring_effects'],
             'unresolved_codes': inherited['unresolved_codes'], 'source_event_seq': seq}
    section = hand.source_section('72-companion-26-card-text-draft.md', 'C-cat_friend')
    if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or
            '自分のターン終了時' in section):
        raise ValueError('294 companion activated timing differs')
    registry = board.board.turn_end.BOARD_REGISTRY
    additions = {'C-cat_friend': ('activated_ability_not_turn_end',
                 '72-companion-26-card-text-draft.md#C-cat_friend')}
    previous = {name: registry.get(name) for name in additions}
    if any(previous[name] is not None and previous[name] != classification
           for name, classification in additions.items()):
        raise ValueError('294 board source classification conflicts')
    try:
        registry.update(additions)
        with board.current_board_scope():
            result = precedent.audit_current_turn_end(stop, proof)
    finally:
        for name, value in previous.items():
            if value is None:
                registry.pop(name, None)
            else:
                registry[name] = value
    if (not result['turn_end_set_complete'] or result['contract_stop_codes'] or
            not all(result['completeness_checks'].values())):
        raise ValueError('294 six-stage end incomplete: ' + repr((result['contract_stop_codes'], result['stage_inventory'])))
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
    if (row['path_id'] not in ('probe-02-a-first', 'probe-02-b-first') or
            actor != 'B' or game['phase'] != 'egg_exchange_choice' or
            not 1 <= game['round'] <= 10 or len(owner['hand']) < 2 or
            owner['reservations'] or state['activation_zone'] or state['pending_triggers']):
        raise ValueError('294 mandatory egg boundary differs')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    held = [{'card_copy_id': game['cards'][x]['card_copy_id'], 'card_id': game['cards'][x]['card_id'],
             'initial_instance_id': x} for x in owner['hand']]
    decision = opening.build_mandatory_choice_decision({'order_id': order}, actor,
                                                         game['round'], game['round'], held)
    if (fallback.validate_seeded_resolution(decision) or len(decision['legal_candidates']) != len(held) or
            decision['seeded_fallback_candidates'] != decision['legal_candidates'] or
            {x['initial_instance_id'] for x in decision['legal_candidate_details']} != set(owner['hand'])):
        raise ValueError('294 egg candidates incomplete')
    return {'next_opportunity': 'mandatory_egg_exchange',
            'candidate_ids': decision['legal_candidates'], 'candidate_set_complete': True,
            'legal_candidate_details': decision['legal_candidate_details'],
            'resolution_mode': decision['resolution_mode']}


def audit_route(row, old, recent):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('294 source state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] in ('probe-01-a-first', 'probe-01-b-first'):
        if game['phase'] != 'turn_end':
            raise ValueError('294 turn end boundary differs')
        return {**base, **prove_end(row, old if row['path_id'] == 'probe-01-a-first' else recent)}
    return {**base, **audit_egg(row)}


def validate_result(result):
    try:
        rows, older, newer = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        old = next(x for x in older if x['path_id'] == result['path_id'])
        recent = next(x for x in newer if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, old, recent) else ['294 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, older, newer = load_sources()
    results = [audit_route(row, next(x for x in older if x['path_id'] == row['path_id']),
                           next(x for x in newer if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('294 current boundary inventory differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('294 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('294: two proved ends and two complete egg inventories')


if __name__ == '__main__':
    main()
