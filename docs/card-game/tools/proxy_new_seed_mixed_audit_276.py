#!/usr/bin/env python3
"""Audit checkpoint 275's turn end, normal action and response windows."""
import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_mixed_replay_275 as states
import proxy_new_seed_turn_end_proof_251 as baseline
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
SOURCE_RAW_SHA256 = '7b729fa2792d028bd23923fd83f95a6e5f1a05ce1de8eabd442319f02cc70865'
BASELINE_RAW_SHA256 = 'accf5c177709eb13d5523da206bc1dcde785867c7e8fb6ca84ea37d34ea3acf2'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-276-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_276.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, prior = SOURCE.read_bytes(), baseline.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(prior).hexdigest() != BASELINE_RAW_SHA256 or
            raw != states.canonical_bytes(states.build_report()) or
            prior != baseline.canonical_bytes(baseline.build_report())):
        raise ValueError('276 protected state/history differs')
    rows, old = json.loads(raw)['results'], json.loads(prior)['results']
    if len(rows) != len(old) or len(rows) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('276 source inventory differs')
    return rows, old


def prove_end(row, old):
    if old['path_id'] != row['path_id'] or not old['turn_end_set_complete']:
        raise ValueError('276 inherited end proof differs')
    seq = old['source_last_valid_event_seq']
    game_hash, cont_hash = old['source_game_state_sha256'], old['source_continuation_state_sha256']
    events, growth = copy.deepcopy(old['classified_events']), copy.deepcopy(old['growth_trace'])
    counts = {}
    for number in range(252, 276):
        files = list((ROOT / 'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files) != 1:
            raise ValueError(f'276 history inventory differs at {number}')
        saved = next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id'] == row['path_id'])
        new_events, shots = saved.get('new_events', []), saved.get('new_snapshots', [])
        new_events = [] if new_events == 0 else new_events
        shots = [] if shots == 0 else shots
        if not isinstance(new_events, list) or len(new_events) != len(shots):
            raise ValueError(f'276 history event count differs at {number}')
        counts[str(number)] = len(new_events)
        for event, shot in zip(new_events, shots):
            action = event['action_type']
            if (action not in history.history_audit.SOURCE_REFS or event['seq'] != seq + 1 or
                    shot['event_seq'] != event['seq'] or
                    event['game_state_before_sha256'] != game_hash or
                    event['continuation_state_before_sha256'] != cont_hash or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                raise ValueError(f'276 historical hashes differ at {number}')
            current = {actor: shot['game_state']['players'][actor]['growth'] for actor in 'AB'}
            delta = {actor: current[actor] - growth[-1]['growth'][actor] for actor in 'AB'}
            if any(delta.values()) or shot['continuation_state']['pending_triggers']:
                raise ValueError(f'276 historical growth or pending trigger differs at {number}')
            seq = event['seq']
            game_hash, cont_hash = shot['game_state_sha256'], shot['continuation_state_sha256']
            events.append({'seq': seq, 'action_type': action,
                           'source_reference': history.history_audit.SOURCE_REFS[action],
                           'growth_delta': delta})
            growth.append({'event_seq': seq, 'growth': current})
    if (seq, game_hash, cont_hash) != (row['last_valid_event_seq'],
            row['final_game_state_sha256'], row['final_continuation_state_sha256']):
        raise ValueError('276 current end history differs')
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
        raise ValueError('276 companion activated timing differs')
    registry = board.board.turn_end.BOARD_REGISTRY
    classification = ('activated_ability_not_turn_end',
                      '72-companion-26-card-text-draft.md#C-cat_friend')
    previous = registry.get('C-cat_friend')
    if previous is not None and previous != classification:
        raise ValueError('276 companion source classification conflicts')
    try:
        registry['C-cat_friend'] = classification
        with board.current_board_scope():
            result = precedent.audit_current_turn_end(stop, proof)
    finally:
        if previous is None:
            registry.pop('C-cat_friend', None)
        else:
            registry['C-cat_friend'] = previous
    if (not result['turn_end_set_complete'] or result['contract_stop_codes'] or
            not all(result['completeness_checks'].values())):
        raise ValueError('276 six-stage end incomplete')
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
    board_cards = owner['board']
    if (game['phase'] != 'response_window' or ctx['window_kind'] != 'turn_start' or
            state['pending_triggers'] or board_cards['main'] is not None or
            board_cards['world'] is not None or board_cards['prepared']):
        raise ValueError('276 response state differs')
    if row['path_id'] == 'probe-02-a-first':
        zone = state['activation_zone']
        if (ctx['chain_status'] != 'building' or ctx['consecutive_passes'] != 0 or
                len(zone) != 1 or zone[0]['source_instance_id'] != 'A-033#1' or
                zone[0]['source_instance_id'] in owner['hand']):
            raise ValueError('276 coin activation differs')
    elif (state['activation_zone'] or ctx['chain_status'] != 'empty' or
          ctx['consecutive_passes'] != 1):
        raise ValueError('276 next priority differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    excluded = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('276 hand registration missing')
        reason = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if reason is None and card_id == 'G-animal-shogi':
            if (not '自分の捨て札のなかま1枚を対象' in
                    hand.source_section('83-play-batch-3-card-text-draft.md', card_id) or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('276 shogi discard target differs')
            reason = {'card_id': card_id, 'reason_code': 'requires_own_discarded_companion'}
        if reason is None:
            action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
            if action is not None and owner['time'] >= action['base_time_cost']:
                reason = conditional.conditional_exclusion(card_id, game, actor)
        if reason is None and board_cards['main'] is None:
            action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
            if action is not None and action['target_rule'] == 'one own main':
                filename, section_id = action['source_text_reference'].split('#', 1)
                if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                    raise ValueError('276 own main text differs')
                reason = {'card_id': card_id, 'reason_code': 'requires_own_main_target'}
        if reason:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            excluded.append({'source_instance_id': instance, **reason})
    board_excluded = []
    for instance in board_cards['companions']:
        card_id = game['cards'][instance]['card_id']
        trigger = timing.TRIGGERS.get(card_id)
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if (trigger is None or any(x not in section for x in trigger[1:]) or
                timing.matches(card_id, ctx['window_kind'], actor, ctx['turn_player'],
                               row['new_events'][0]['action_type'], row['new_events'][0]['actor'])):
            raise ValueError('276 companion response timing differs')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        board_excluded.append({'source_instance_id': instance, 'card_id': card_id,
                               'reason_code': 'trigger_condition_not_met'})
    partner = board_cards['partner']
    if partner:
        card_id = game['cards'][partner]['card_id']
        section = hand.source_section('74-partner-18-card-text-draft.md', card_id)
        if card_id == 'P-cat_ceo' and '交際を始めた時、発動する' in section:
            reason = 'relationship_start_event_not_met'
        elif card_id == 'P-anglerfish' and '自分のメインが自分からちょうせんする時' in section:
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('276 partner trigger differs')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        board_excluded.append({'source_instance_id': partner, 'card_id': card_id,
                               'reason_code': reason})
    chance = start.enumerate_opportunity(projected, actor, entries)
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('276 response candidate set differs')
    return {'next_opportunity': 'response_window', 'candidate_ids': ['response-pass'],
            'candidate_set_complete': True, 'hand_exclusions': excluded,
            'hand_other_exclusions': chance['excluded_candidates'],
            'board_exclusions': board_excluded}


def audit_route(row, old):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('276 source state/hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] == 'probe-01-b-first':
        return {**base, **prove_end(row, old)}
    if row['path_id'] == 'probe-02-b-first':
        proof = normal.audit_route(row)
        if (proof['next_opportunity'] != 'normal_action' or not proof['candidate_set_complete'] or
                not all(proof['completeness_checks'].values())):
            raise ValueError('276 normal opportunity differs')
        return {**base, 'next_opportunity': 'normal_action',
                'candidate_ids': proof['candidate_ids'], 'candidate_set_complete': True,
                'legal_candidate_details': proof['legal_candidate_details'],
                'completeness_checks': proof['completeness_checks'],
                'board_exclusions': proof['board_exclusions']}
    return {**base, **audit_response(row)}


def validate_result(result):
    try:
        rows, old = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        earlier = next(x for x in old if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, earlier) else ['276 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, old = load_sources()
    results = [audit_route(row, next(x for x in old if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(row) for row in results):
        raise ValueError('276 opportunities differ')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'baseline_raw_sha256': BASELINE_RAW_SHA256, 'planned': 4,
            'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('276 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('276: proved end, normal action and two unique passes')


if __name__ == '__main__':
    main()
