#!/usr/bin/env python3
"""Audit reached chicken resolution, two responses and proved turn end."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_308 as states
import proxy_new_seed_mixed_audit_291 as baseline
import proxy_new_seed_ability_resolution_215 as ability
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_new_seed_turn_end_audit_163 as board
import proxy_turn_end_provenance_restart as precedent
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'faf7896c672ea3b70131740f1596063a2c3c376f5e43c3c5c2ce4dafc91eb193'
BASELINE_RAW_SHA256 = '7dbf147d7e94391546f7ff1d9fcb791f2331e70d766050393e342c004b52c9da'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-309-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_309.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, inherited = states.OUTPUT.read_bytes(), baseline.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(inherited).hexdigest() != BASELINE_RAW_SHA256 or
            raw != states.canonical_bytes(states.build_report()) or
            inherited != baseline.canonical_bytes(baseline.build_report())):
        raise ValueError('309 protected state/provenance differs')
    rows, old = json.loads(raw)['results'], json.loads(inherited)['results']
    if len(rows) != 4 or len(old) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('309 source inventory differs')
    return rows, old


def audit_ability(row):
    state = row['final_continuation_state']
    ctx, zone = state['response_context'], state['activation_zone']
    if (state['game_state']['phase'] != 'response_window' or ctx['chain_status'] != 'resolving' or
            ctx['consecutive_passes'] != 2 or len(zone) != 1 or
            ctx['chain_links'] != [zone[0]['link_id']] or
            zone[0]['source_instance_id'] != 'A-015#1' or
            zone[0]['card_id'] != 'C-chicken' or state['pending_triggers']):
        raise ValueError('309 chicken resolution boundary differs')
    before = copy.deepcopy(state)
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    after, event = ability.resolve_board_ability(before)
    if (event['action_type'] != 'resolve_board_ability' or
            event['result']['revealed_card_type'] != 'main' or
            event['result']['revealed_instance_id'] != 'A-007#1' or
            event['result']['drawn_instance_id'] is not None or
            after['game_state']['players']['A']['deck'][0] != 'A-007#1' or
            after['game_state']['phase'] != 'normal_action'):
        raise ValueError('309 chicken effect preview differs')
    return {'next_opportunity': 'resolve_board_ability', 'candidate_ids': [],
            'candidate_set_complete': True, 'chain_link_id': zone[0]['link_id'],
            'source_instance_id': zone[0]['source_instance_id'],
            'revealed_card_type': 'main', 'revealed_instance_id': 'A-007#1',
            'drawn_instance_id': None, 'source_reference': '72-companion-26-card-text-draft.md#C-chicken'}


def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    path = row['path_id']
    expected = {'probe-01-b-first': ('turn_end_response', 'after_normal_action', 1),
                'probe-02-a-first': ('post_placement_response', 'after_normal_action', 1)}
    actor = ctx['priority_actor']
    if (path not in expected or
            (game['phase'], ctx['window_kind'], ctx['consecutive_passes']) != expected[path] or
            actor != 'A' or ctx['chain_status'] != 'empty' or state['activation_zone'] or
            state['pending_triggers']):
        raise ValueError('309 response boundary differs')
    owner = game['players'][actor]
    b = owner['board']
    if b['main'] is not None or b['world'] is not None or b['prepared']:
        raise ValueError('309 response board differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('309 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if exclusion is None and card_id == 'G-animal-shogi':
            section = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if ('自分の捨て札のなかま1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('309 animal shogi target differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_discarded_companion'}
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('309 own main target differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id': instance, **exclusion})
    excluded = []
    for instance in b['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        trigger = timing.TRIGGERS.get(card_id)
        if (card_id != 'C-chicken' or trigger is None or
                any(fragment not in section for fragment in trigger[1:]) or
                timing.matches(card_id, ctx['window_kind'], actor, ctx['turn_player'],
                               row['new_events'][0]['action_type'], row['new_events'][0]['actor'])):
            raise ValueError('309 chicken response timing differs')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        excluded.append({'source_instance_id': instance, 'card_id': card_id,
                         'reason_code': 'trigger_condition_not_met'})
    partner = b['partner']
    card_id = game['cards'][partner]['card_id'] if partner else None
    section = hand.source_section('74-partner-18-card-text-draft.md', card_id) if partner else ''
    if path == 'probe-01-b-first':
        if card_id != 'P-cat_ceo' or '交際を始めた時、発動する' not in section:
            raise ValueError('309 cat ceo timing differs')
        reason = 'relationship_start_event_not_met'
    else:
        if card_id != 'P-anglerfish' or '自分のメインが自分からちょうせんする時' not in section:
            raise ValueError('309 anglerfish timing differs')
        reason = 'trigger_condition_not_met'
    projected['game_state']['players'][actor]['board']['partner'] = None
    projected['game_state']['players'][actor]['board']['partner_stage'] = None
    excluded.append({'source_instance_id': partner, 'card_id': card_id, 'reason_code': reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, entries)
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('309 response candidate inventory differs: ' + repr(chance['legal_candidate_ids']))
    return {'next_opportunity': game['phase'], 'candidate_ids': ['response-pass'],
            'candidate_set_complete': True, 'hand_exclusions': removed,
            'hand_other_exclusions': chance['excluded_candidates'], 'board_exclusions': excluded}


def prove_end(row, old):
    if (old['path_id'] != row['path_id'] or not old['turn_end_set_complete'] or
            old['source_last_valid_event_seq'] < 1):
        raise ValueError('309 inherited turn-end proof differs')
    seq = old['source_last_valid_event_seq']
    game_hash, cont_hash = old['source_game_state_sha256'], old['source_continuation_state_sha256']
    events, growth = copy.deepcopy(old['classified_events']), copy.deepcopy(old['growth_trace'])
    counts = {}
    for number in range(291, 309):
        files = list((ROOT / 'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files) != 1:
            raise ValueError(f'309 history inventory differs at {number}')
        saved = next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id'] == row['path_id'])
        new_events, shots = saved.get('new_events', []), saved.get('new_snapshots', [])
        new_events = [] if new_events == 0 else new_events
        shots = [] if shots == 0 else shots
        if not isinstance(new_events, list) or len(new_events) != len(shots):
            raise ValueError(f'309 history event count differs at {number}')
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
                raise ValueError(f'309 history hash differs at {number}')
            current = {actor: shot['game_state']['players'][actor]['growth'] for actor in 'AB'}
            delta = {actor: current[actor] - growth[-1]['growth'][actor] for actor in 'AB'}
            if any(delta.values()) or shot['continuation_state']['pending_triggers']:
                raise ValueError(f'309 unresolved growth or trigger at {number}')
            seq = event['seq']
            game_hash, cont_hash = shot['game_state_sha256'], shot['continuation_state_sha256']
            events.append({'seq': seq, 'action_type': action,
                           'source_reference': baseline.SOURCE_REFS[action], 'growth_delta': delta})
            growth.append({'event_seq': seq, 'growth': current})
    if (seq, game_hash, cont_hash) != (row['last_valid_event_seq'],
            row['final_game_state_sha256'], row['final_continuation_state_sha256']):
        raise ValueError('309 current end history differs')
    state = row['final_continuation_state']
    stop = {'path_id': row['path_id'], 'last_valid_event_seq': seq,
            'game_state_sha256': game_hash, 'continuation_state_sha256': cont_hash,
            'game_state': state['game_state'], 'continuation_state': state}
    inherited = next(x for x in json.loads(baseline.later_baseline.OUTPUT.read_bytes())['results']
                     if x['path_id'] == row['path_id'])
    if (not inherited['turn_end_set_complete'] or inherited['growth_reach_100'] or
            inherited['active_expiring_effects'] or inherited['unresolved_codes']):
        raise ValueError('309 inherited end constraints differ')
    proof = {'classified_events': events, 'growth_trace': growth,
             'growth_reach_100': inherited['growth_reach_100'],
             'active_expiring_effects': inherited['active_expiring_effects'],
             'unresolved_codes': inherited['unresolved_codes'], 'source_event_seq': seq}
    registry = board.board.turn_end.BOARD_REGISTRY
    additions = {'P-cliff_goat': ('event_trigger_not_turn_end',
                 '74-partner-18-card-text-draft.md#P-cliff_goat'),
                 'C-cat_friend': ('activated_ability_not_turn_end',
                 '72-companion-26-card-text-draft.md#C-cat_friend'),
                 'C-box': ('none', '72-companion-26-card-text-draft.md#C-box')}
    if ('能力なし。' not in hand.source_section('72-companion-26-card-text-draft.md', 'C-box') or
            '初配置・同名上書き' not in hand.source_section('74-partner-18-card-text-draft.md', 'P-cliff_goat')):
        raise ValueError('309 current board text differs')
    previous = {name: registry.get(name) for name in additions}
    if any(previous[name] is not None and previous[name] != value for name, value in additions.items()):
        raise ValueError('309 board classification conflicts')
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
    if not result['turn_end_set_complete'] or result['contract_stop_codes'] or not all(result['completeness_checks'].values()):
        raise ValueError('309 six-stage end incomplete: ' + repr(result['contract_stop_codes']))
    return {'next_opportunity': 'turn_end', 'turn_end_set_complete': True,
            'stage_inventory': result['stage_inventory'],
            'completeness_checks': result['completeness_checks'],
            'contract_stop_codes': result['contract_stop_codes'],
            'classified_events': events, 'growth_trace': growth,
            'event_counts_by_checkpoint': counts}


def audit_route(row, old):
    state = row['final_continuation_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(state['game_state']) != row['final_game_state_sha256']):
        raise ValueError('309 source hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] == 'probe-01-a-first':
        return {**base, **audit_ability(row)}
    if row['path_id'] == 'probe-02-b-first':
        return {**base, **prove_end(row, old)}
    return {**base, **audit_response(row)}


def validate_result(result):
    try:
        rows, old = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        inherited = next(x for x in old if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, inherited) else ['309 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, old = load_sources()
    results = [audit_route(row, next(x for x in old if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('309 opportunity inventory differs')
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
            raise SystemExit('309 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('309: chicken resolution, two passes and proved turn end audited')


if __name__ == '__main__':
    main()
