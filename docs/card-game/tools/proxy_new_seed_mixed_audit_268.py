#!/usr/bin/env python3
"""Audit checkpoint 267's two end boundaries and two response windows."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

import proxy_new_seed_mixed_replay_267 as states
import proxy_new_seed_turn_end_proof_233 as baseline
import proxy_new_seed_mixed_audit_261 as history_audit
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_new_seed_turn_end_audit_163 as board
import proxy_turn_end_provenance_restart as precedent
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = 'd94163ad0883c98d2f3b0d0f4198a46e2e834a1f8e63f1b2fc5c5cab1b52fe23'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-268-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_268.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def load_sources():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('268 protected source differs')
    prior = baseline.OUTPUT.read_bytes()
    if hashlib.sha256(prior).hexdigest() != history_audit.BASELINE_RAW_SHA256 or prior != baseline.canonical_bytes(baseline.build_report()):
        raise ValueError('268 protected baseline differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(row) for row in rows):
        raise ValueError('268 protected state inventory differs')
    return rows, json.loads(prior)['results']


def prove_end(row, old):
    state = row['final_continuation_state']
    seq = old['source_last_valid_event_seq']
    game_hash, continuation_hash = old['source_game_state_sha256'], old['source_continuation_state_sha256']
    events, growth = copy.deepcopy(old['classified_events']), copy.deepcopy(old['growth_trace'])
    counts = {}
    for number in range(234, 268):
        if number == 241:
            continue  # 242 corrected that preserved erroneous checkpoint.
        files = list((ROOT / 'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files) != 1:
            raise ValueError(f'268 history file count differs at {number}')
        saved = next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id'] == row['path_id'])
        new_events, snapshots = saved.get('new_events', []), saved.get('new_snapshots', [])
        new_events = [] if new_events == 0 else new_events
        snapshots = [] if snapshots == 0 else snapshots
        if not isinstance(new_events, list) or len(new_events) != len(snapshots):
            raise ValueError(f'268 history event count differs at {number}')
        counts[str(number)] = len(new_events)
        for event, shot in zip(new_events, snapshots):
            action = event['action_type']
            if (action not in history_audit.SOURCE_REFS or event['seq'] != seq + 1 or
                    shot['event_seq'] != event['seq'] or
                    event['game_state_before_sha256'] != game_hash or
                    event['continuation_state_before_sha256'] != continuation_hash or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                raise ValueError(f'268 history chain differs at {number}')
            current_growth = {actor: shot['game_state']['players'][actor]['growth'] for actor in 'AB'}
            delta = {actor: current_growth[actor] - growth[-1]['growth'][actor] for actor in 'AB'}
            if any(delta.values()) or shot['continuation_state']['pending_triggers'] or (
                    action == 'resolve_board_ability' and shot['continuation_state']['activation_zone']):
                raise ValueError(f'268 pending effects or growth differ at {number}')
            seq = event['seq']
            game_hash, continuation_hash = shot['game_state_sha256'], shot['continuation_state_sha256']
            events.append({'seq': seq, 'action_type': action,
                           'source_reference': history_audit.SOURCE_REFS[action], 'growth_delta': delta})
            growth.append({'event_seq': seq, 'growth': current_growth})
    if (seq, game_hash, continuation_hash) != (row['last_valid_event_seq'],
            row['final_game_state_sha256'], row['final_continuation_state_sha256']):
        raise ValueError('268 final turn end history differs')
    if old['growth_reach_100'] or old['active_expiring_effects'] or old['unresolved_codes']:
        raise ValueError('268 inherited unresolved provenance')
    proof = {'classified_events': events, 'growth_trace': growth,
             'growth_reach_100': old['growth_reach_100'],
             'active_expiring_effects': old['active_expiring_effects'],
             'unresolved_codes': old['unresolved_codes'], 'source_event_seq': seq}
    stop = {'path_id': row['path_id'], 'last_valid_event_seq': seq,
            'game_state_sha256': game_hash, 'continuation_state_sha256': continuation_hash,
            'game_state': state['game_state'], 'continuation_state': state}
    with board.current_board_scope():
        result = precedent.audit_current_turn_end(stop, proof)
    if not result['turn_end_set_complete'] or result['contract_stop_codes'] or not all(result['completeness_checks'].values()):
        raise ValueError('268 six-stage turn end incomplete: ' + repr(result['contract_stop_codes']))
    return {'turn_end_set_complete': True, 'stage_inventory': result['stage_inventory'],
            'completeness_checks': result['completeness_checks'],
            'contract_stop_codes': result['contract_stop_codes'],
            'classified_events': events, 'growth_trace': growth, 'event_counts_by_checkpoint': counts}


def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    board_cards = owner['board']
    if actor != 'A' or ctx['consecutive_passes'] != (1 if row['path_id'] == 'probe-01-b-first' else 0):
        raise ValueError('268 response priority differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    excluded = []
    shogi = box = None
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries[card_id]
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if card_id == 'G-animal-shogi':
            text = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if ('自分の捨て札のなかま1枚を対象' not in text or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('268 animal shogi target unproved')
            exclusion = {'reason_code': 'requires_own_discarded_companion', 'card_id': card_id}
            shogi = exclusion['reason_code']
        if card_id == 'C-box':
            text = hand.source_section('72-companion-26-card-text-draft.md', card_id)
            if '能力なし。' not in text or instance in board_cards['companions']:
                raise ValueError('268 box zone differs')
            exclusion = {'reason_code': 'board_only_ability_source_in_hand', 'card_id': card_id}
            box = exclusion['reason_code']
        if exclusion is None:
            action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
            if action is not None and owner['time'] >= action['base_time_cost']:
                exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and board_cards['main'] is None:
            action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
            if action is not None and action['target_rule'] == 'one own main':
                filename, section = action['source_text_reference'].split('#', 1)
                if section != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section):
                    raise ValueError('268 own main target text differs')
                exclusion = {'reason_code': 'requires_own_main_target', 'card_id': card_id}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            excluded.append({'source_instance_id': instance, **exclusion})
    board_excluded = []
    for instance in board_cards['companions']:
        card_id = game['cards'][instance]['card_id']
        if card_id != 'C-chicken':
            raise ValueError('268 unclassified companion ability')
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        trigger = timing.TRIGGERS[card_id]
        if (any(fragment not in section for fragment in trigger[1:]) or
                timing.matches(card_id, ctx['window_kind'], actor, ctx['turn_player'],
                               row['new_events'][0]['action_type'], row['new_events'][0]['actor'])):
            raise ValueError('268 chicken trigger differs')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        board_excluded.append({'source_instance_id': instance, 'card_id': card_id,
                               'reason_code': 'trigger_condition_not_met'})
    partner = board_cards['partner']
    if partner:
        card_id = game['cards'][partner]['card_id']
        text = hand.source_section('74-partner-18-card-text-draft.md', card_id)
        if card_id == 'P-cliff_goat':
            if '初配置・同名上書き' not in text:
                raise ValueError('268 cliff goat trigger differs')
        elif card_id == 'P-anglerfish':
            if '自分のメインが自分からちょうせんする時' not in text or board_cards['main'] is not None:
                raise ValueError('268 anglerfish trigger differs')
        elif card_id == 'P-cat_ceo':
            if '交際を始めた時、発動する' not in text or row['new_events'][0]['action_type'] != 'response_pass':
                raise ValueError('268 cat CEO event trigger differs')
        else:
            raise ValueError('268 partner classification missing')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        board_excluded.append({'source_instance_id': partner, 'card_id': card_id,
                               'reason_code': 'trigger_condition_not_met'})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, entries)
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('268 response hand candidates differ')
    zone = state['activation_zone']
    if row['path_id'] == 'probe-02-b-first':
        if (ctx['chain_status'] != 'building' or len(zone) != 1 or
                zone[0]['source_instance_id'] != 'A-033#1' or
                zone[0]['card_id'] != 'I-c_coin2' or
                zone[0]['source_instance_id'] in owner['hand'] or
                zone[0]['payment'] != {'time': 1} or shogi is None or box is None):
            raise ValueError('268 activated coin zone differs')
    elif zone:
        raise ValueError('268 unexpected placement activation zone')
    return {'candidate_ids': chance['legal_candidate_ids'], 'candidate_set_complete': True,
            'priority_actor': actor, 'chain_status': ctx['chain_status'],
            'coin_source_zone': 'activation_zone' if zone else None,
            'shogi_exclusion': shogi, 'box_exclusion': box,
            'hand_exclusions': excluded, 'hand_other_exclusions': chance['excluded_candidates'],
            'board_exclusions': board_excluded}


def audit_route(row, previous):
    state = row['final_continuation_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(state['game_state']) != row['final_game_state_sha256']):
        raise ValueError('268 state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if state['game_state']['phase'] == 'turn_end':
        if row['path_id'] not in ('probe-01-a-first', 'probe-02-a-first') or state['return_target'] != 'turn_end':
            raise ValueError('268 turn end path differs')
        return {**base, 'next_opportunity': 'turn_end', **prove_end(row, previous)}
    if row['path_id'] not in ('probe-01-b-first', 'probe-02-b-first'):
        raise ValueError('268 response path differs')
    return {**base, 'next_opportunity': state['game_state']['phase'], **audit_response(row)}


def build_report():
    rows, previous = load_sources()
    results = [audit_route(row, next(p for p in previous if p['path_id'] == row['path_id'])) for row in rows]
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
            raise SystemExit('268 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('268: audited two turn ends and two response windows')


if __name__ == '__main__':
    main()
