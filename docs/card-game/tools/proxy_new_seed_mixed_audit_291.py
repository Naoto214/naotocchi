#!/usr/bin/env python3
"""Audit checkpoint 290's two turn ends and two end response windows."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_290 as states
import proxy_new_seed_turn_end_proof_251 as baseline
import proxy_new_seed_mixed_audit_261 as later_baseline
import proxy_new_seed_mixed_audit_268 as history
import proxy_new_seed_chain_normal_audit_210 as normal
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_new_seed_turn_end_audit_163 as board
import proxy_turn_end_provenance_restart as precedent
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = 'ae5b8beae02eedc9c11f82d5dcc9d3aea0057c1180bb36c9aaa1bd20acd5924f'
BASELINE_RAW_SHA256 = 'accf5c177709eb13d5523da206bc1dcde785867c7e8fb6ca84ea37d34ea3acf2'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-291-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_291.v1'
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
        raise ValueError('291 protected state/history differs')
    rows, old, recent = json.loads(raw)['results'], json.loads(prior)['results'], json.loads(newer)['results']
    if len(rows) != len(old) or len(rows) != len(recent) or len(rows) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('291 source inventory differs')
    return rows, old, recent


def prove_end(row, old):
    if old['path_id'] != row['path_id'] or not old['turn_end_set_complete']:
        raise ValueError('291 inherited end proof differs')
    seq = old['source_last_valid_event_seq']
    game_hash, cont_hash = old['source_game_state_sha256'], old['source_continuation_state_sha256']
    events, growth = copy.deepcopy(old['classified_events']), copy.deepcopy(old['growth_trace'])
    counts = {}
    for number in range(252 if row['path_id'] == 'probe-02-a-first' else 262, 291):
        files = list((ROOT / 'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files) != 1:
            raise ValueError(f'291 history inventory differs at {number}')
        saved = next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id'] == row['path_id'])
        new_events, shots = saved.get('new_events', []), saved.get('new_snapshots', [])
        new_events = [] if new_events == 0 else new_events
        shots = [] if shots == 0 else shots
        if not isinstance(new_events, list) or len(new_events) != len(shots):
            raise ValueError(f'291 history event count differs at {number}')
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
                raise ValueError(f"291 historical hashes differ at {number} {row['path_id']} seq={seq} event={event['seq']}")
            current = {actor: shot['game_state']['players'][actor]['growth'] for actor in 'AB'}
            delta = {actor: current[actor] - growth[-1]['growth'][actor] for actor in 'AB'}
            coin_growth = (row['path_id'] == 'probe-02-b-first' and number == 275 and
                           action == 'resolve_item' and event['source_instance_id'] == 'A-033#1' and
                           event['result']['growth_added'] == 5 and
                           event['result']['revealed_card_type'] == 'main' and
                           delta == {'A': 5, 'B': 0})
            if (any(delta.values()) and not coin_growth) or shot['continuation_state']['pending_triggers']:
                raise ValueError(f'291 historical growth or pending trigger differs at {number}')
            seq = event['seq']
            game_hash, cont_hash = shot['game_state_sha256'], shot['continuation_state_sha256']
            events.append({'seq': seq, 'action_type': action,
                           'source_reference': SOURCE_REFS[action],
                           'growth_delta': delta})
            growth.append({'event_seq': seq, 'growth': current})
    if (seq, game_hash, cont_hash) != (row['last_valid_event_seq'],
            row['final_game_state_sha256'], row['final_continuation_state_sha256']):
        raise ValueError('291 current end history differs')
    state = row['final_continuation_state']
    stop = {'path_id': row['path_id'], 'last_valid_event_seq': seq,
            'game_state_sha256': game_hash, 'continuation_state_sha256': cont_hash,
            'game_state': state['game_state'], 'continuation_state': state}
    proof = {'classified_events': events, 'growth_trace': growth,
             'growth_reach_100': old['growth_reach_100'],
             'active_expiring_effects': old['active_expiring_effects'],
             'unresolved_codes': old['unresolved_codes'], 'source_event_seq': seq}
    section = hand.source_section('72-companion-26-card-text-draft.md', 'C-cat_friend')
    if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or
            '自分のターン終了時' in section):
        raise ValueError('291 companion activated timing differs')
    registry = board.board.turn_end.BOARD_REGISTRY
    additions = {'P-cliff_goat': ('event_trigger_not_turn_end',
                 '74-partner-18-card-text-draft.md#P-cliff_goat'),
                 'C-cat_friend': ('activated_ability_not_turn_end',
                 '72-companion-26-card-text-draft.md#C-cat_friend'),
                 'C-box': ('none', '72-companion-26-card-text-draft.md#C-box')}
    partner_text = hand.source_section('74-partner-18-card-text-draft.md', 'P-cliff_goat')
    if '名前の異なるセカイへ変更した時' not in partner_text or '初配置・同名上書き' not in partner_text:
        raise ValueError('291 partner event timing differs')
    if '能力なし。' not in hand.source_section('72-companion-26-card-text-draft.md', 'C-box'):
        raise ValueError('291 box no-ability classification differs')
    previous = {name: registry.get(name) for name in additions}
    if any(previous[name] is not None and previous[name] != classification
           for name, classification in additions.items()):
        raise ValueError('291 board source classification conflicts')
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
        raise ValueError('291 six-stage end incomplete: ' + repr((result['contract_stop_codes'], result['stage_inventory'])))
    return {'next_opportunity': 'turn_end', 'turn_end_set_complete': True,
            'stage_inventory': result['stage_inventory'],
            'completeness_checks': result['completeness_checks'],
            'contract_stop_codes': result['contract_stop_codes'],
            'classified_events': events, 'growth_trace': growth,
            'event_counts_by_checkpoint': counts}


def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    board = owner['board']
    path = row['path_id']
    if (game['phase'] != 'turn_end_response' or
            ctx['window_kind'] != 'after_normal_action' or
            ctx['consecutive_passes'] != 1 or ctx['chain_status'] != 'empty' or
            state['activation_zone'] or state['pending_triggers'] or board['main'] is not None or
            board['world'] is not None or board['prepared'] or row['new_events'][0]['action_type'] != 'normal_pass_end_request'):
        raise ValueError('285 next-priority response boundary differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('285 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('285 own main target text differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id': instance, **exclusion})
    excluded = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if card_id == 'C-cat_friend':
            if ('自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('285 cat friend target differs')
            reason = 'requires_other_discarded_companion'
        else:
            trigger = timing.TRIGGERS.get(card_id)
            if (trigger is None or any(fragment not in section for fragment in trigger[1:]) or
                    timing.matches(card_id, ctx['window_kind'], actor, ctx['turn_player'],
                                   row['new_events'][0]['action_type'], row['new_events'][0]['actor'])):
                raise ValueError('285 companion trigger classification differs')
            reason = 'trigger_condition_not_met'
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        excluded.append({'source_instance_id': instance, 'card_id': card_id, 'reason_code': reason})
    partner = board['partner']
    if partner:
        card_id = game['cards'][partner]['card_id']
        section = hand.source_section('74-partner-18-card-text-draft.md', card_id)
        if card_id != 'P-cat_ceo' or '交際を始めた時、発動する' not in section:
            raise ValueError('285 partner timing differs')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        excluded.append({'source_instance_id': partner, 'card_id': card_id,
                         'reason_code': 'relationship_start_event_not_met'})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, entries)
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('285 next-priority response candidates differ')
    return {'next_opportunity': 'turn_end_response', 'candidate_ids': ['response-pass'],
            'candidate_set_complete': True, 'hand_exclusions': removed,
            'hand_other_exclusions': chance['excluded_candidates'], 'board_exclusions': excluded}


def audit_route(row, old, recent):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('291 source state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] in ('probe-02-a-first', 'probe-02-b-first'):
        if game['phase'] != 'turn_end':
            raise ValueError('291 turn end boundary differs')
        return {**base, **prove_end(row, old if row['path_id'] == 'probe-02-a-first' else recent)}
    return {**base, **audit_response(row)}


def validate_result(result):
    try:
        rows, older, newer = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        old = next(x for x in older if x['path_id'] == result['path_id'])
        recent = next(x for x in newer if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, old, recent) else ['291 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, older, newer = load_sources()
    results = [audit_route(row, next(x for x in older if x['path_id'] == row['path_id']),
                           next(x for x in newer if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('291 current boundary inventory differs')
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
            raise SystemExit('291 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('291: proved end, normal action and two unique passes')


if __name__ == '__main__':
    main()
