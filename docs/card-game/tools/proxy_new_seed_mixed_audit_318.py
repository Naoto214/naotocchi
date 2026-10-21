#!/usr/bin/env python3
"""Audit two proved turn ends and two turn-start response inventories."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))

import proxy_new_seed_mixed_replay_317 as states
import proxy_new_seed_mixed_audit_294 as baseline_294
import proxy_new_seed_mixed_audit_291 as baseline_291
import proxy_new_seed_turn_end_proof_251 as original_baseline
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_new_seed_turn_end_audit_163 as board
import proxy_turn_end_provenance_restart as precedent
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = 'cff8e4cfabdb065c0b43c5fa5e9fbb61eda3dc8c63cda8b9abd74da4bf6e47e0'
BASELINE_294_SHA256 = '1fd378057081f46579bbfbce81fb0adc83d919766fe62977e58787dfbd0ed3ef'
BASELINE_291_SHA256 = '7dbf147d7e94391546f7ff1d9fcb791f2331e70d766050393e342c004b52c9da'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-318-20260927.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_318.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw, older, earlier = states.OUTPUT.read_bytes(), baseline_294.OUTPUT.read_bytes(), baseline_291.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(older).hexdigest() != BASELINE_294_SHA256 or
            hashlib.sha256(earlier).hexdigest() != BASELINE_291_SHA256 or
            raw != states.canonical_bytes(states.build_report()) or
            older != baseline_294.canonical_bytes(baseline_294.build_report()) or
            earlier != baseline_291.canonical_bytes(baseline_291.build_report())):
        raise ValueError('318 protected state/history differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(row) for row in rows):
        raise ValueError('318 source inventory differs')
    return rows, json.loads(older)['results'], json.loads(earlier)['results']


def prove_end(row, inherited, first):
    if inherited['path_id'] != row['path_id'] or not inherited['turn_end_set_complete']:
        raise ValueError('318 inherited end proof differs')
    seq = inherited['source_last_valid_event_seq']
    game_hash, cont_hash = inherited['source_game_state_sha256'], inherited['source_continuation_state_sha256']
    events, growth = copy.deepcopy(inherited['classified_events']), copy.deepcopy(inherited['growth_trace'])
    counts = {}
    for number in range(first, 318):
        files = list((ROOT / 'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files) != 1:
            raise ValueError(f'318 history inventory differs at {number}')
        saved = next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id'] == row['path_id'])
        new_events, shots = saved.get('new_events', []), saved.get('new_snapshots', [])
        new_events = [] if new_events == 0 else new_events
        shots = [] if shots == 0 else shots
        if not isinstance(new_events, list) or len(new_events) != len(shots):
            raise ValueError(f'318 history count differs at {number}')
        counts[str(number)] = len(new_events)
        for event, shot in zip(new_events, shots):
            action = event['action_type']
            if (action not in baseline_294.SOURCE_REFS or event['seq'] != seq + 1 or
                    shot['event_seq'] != event['seq'] or
                    event['game_state_before_sha256'] != game_hash or
                    event['continuation_state_before_sha256'] != cont_hash or
                    event['game_state_after_sha256'] != shot['game_state_sha256'] or
                    event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                    start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                    start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
                raise ValueError(f'318 event/hash history differs at {number}')
            current = {actor: shot['game_state']['players'][actor]['growth'] for actor in 'AB'}
            delta = {actor: current[actor] - growth[-1]['growth'][actor] for actor in 'AB'}
            if any(delta.values()) or shot['continuation_state']['pending_triggers']:
                raise ValueError(f'318 unresolved growth/trigger at {number}')
            seq = event['seq']
            game_hash, cont_hash = shot['game_state_sha256'], shot['continuation_state_sha256']
            events.append({'seq': seq, 'action_type': action,
                           'source_reference': baseline_294.SOURCE_REFS[action], 'growth_delta': delta})
            growth.append({'event_seq': seq, 'growth': current})
    if (seq, game_hash, cont_hash) != (row['last_valid_event_seq'],
            row['final_game_state_sha256'], row['final_continuation_state_sha256']):
        raise ValueError('318 current end history differs')
    state = row['final_continuation_state']
    stop = {'path_id': row['path_id'], 'last_valid_event_seq': seq,
            'game_state_sha256': game_hash, 'continuation_state_sha256': cont_hash,
            'game_state': state['game_state'], 'continuation_state': state}
    original = next(x for x in json.loads(original_baseline.OUTPUT.read_bytes())['results']
                    if x['path_id'] == row['path_id'])
    if (not original['turn_end_set_complete'] or original['growth_reach_100'] or
            original['active_expiring_effects'] or original['unresolved_codes']):
        raise ValueError('318 inherited terminal/expiration constraints differ')
    proof = {'classified_events': events, 'growth_trace': growth,
             'growth_reach_100': original['growth_reach_100'],
             'active_expiring_effects': original['active_expiring_effects'],
             'unresolved_codes': original['unresolved_codes'], 'source_event_seq': seq}
    section = hand.source_section('72-companion-26-card-text-draft.md', 'C-cat_friend')
    if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or
            '自分のターン終了時' in section):
        raise ValueError('318 cat friend timing differs')
    registry = board.board.turn_end.BOARD_REGISTRY
    additions = {'C-cat_friend': ('activated_ability_not_turn_end',
                 '72-companion-26-card-text-draft.md#C-cat_friend')}
    previous = {name: registry.get(name) for name in additions}
    if any(previous[name] is not None and previous[name] != value for name, value in additions.items()):
        raise ValueError('318 board classification conflict')
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
        raise ValueError('318 six-stage end incomplete: ' + repr(result['contract_stop_codes']))
    return {'next_opportunity': 'turn_end', 'turn_end_set_complete': True,
            'stage_inventory': result['stage_inventory'],
            'completeness_checks': result['completeness_checks'],
            'contract_stop_codes': result['contract_stop_codes'],
            'classified_events': events, 'growth_trace': growth,
            'event_counts_by_checkpoint': counts}
def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    path = row['path_id']
    expected = {
        'probe-01-b-first': ('response_window', 'turn_start', 'A', 0),
        'probe-02-b-first': ('response_window', 'turn_start', 'B', 1),
    }
    actor = ctx['priority_actor']
    owner = game['players'][actor]
    b = owner['board']
    if (path not in expected or
            (game['phase'], ctx['window_kind'], actor, ctx['consecutive_passes']) != expected[path] or
            ctx['chain_status'] != 'empty' or state['activation_zone'] or state['pending_triggers'] or
            b['main'] is not None or b['world'] is not None or b['prepared'] or
            row['new_events'][0]['action_type'] not in ('egg_exchange_bottom', 'response_pass')):
        raise ValueError('315 response boundary differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('315 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if exclusion is None and card_id == 'G-animal-shogi':
            section = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if ('自分の捨て札のなかま1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('315 animal shogi target differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_discarded_companion'}
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play', 'use_item', 'use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('315 own main target text differs')
            exclusion = {'card_id': card_id, 'reason_code': 'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id': instance, **exclusion})
    excluded = []
    for instance in b['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if card_id == 'C-cat_friend':
            if ('自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('315 cat friend target differs')
            reason = 'requires_other_discarded_companion'
        elif card_id == 'C-box':
            if '能力なし。' not in section:
                raise ValueError('315 box text differs')
            reason = 'no_ability'
        elif card_id in ('C-bat', 'C-chicken'):
            trigger = timing.TRIGGERS.get(card_id)
            if (trigger is None or any(fragment not in section for fragment in trigger[1:]) or
                    timing.matches(card_id, ctx['window_kind'], actor, ctx['turn_player'],
                                   row['new_events'][0]['action_type'], row['new_events'][0]['actor'])):
                raise ValueError('315 bat trigger timing differs')
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('315 unclassified companion')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        excluded.append({'source_instance_id': instance, 'card_id': card_id, 'reason_code': reason})
    partner = b['partner']
    if partner:
        card_id = game['cards'][partner]['card_id']
        section = hand.source_section('74-partner-18-card-text-draft.md', card_id)
        if card_id == 'P-cat_ceo' and '交際を始めた時、発動する' in section:
            reason = 'relationship_start_event_not_met'
        elif card_id == 'P-cliff_goat' and '初配置・同名上書き' in section and b['world'] is None:
            reason = 'different_world_replacement_not_met'
        elif card_id == 'P-anglerfish' and '自分のメインが自分からちょうせんする時' in section:
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('315 unclassified partner')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        excluded.append({'source_instance_id': partner, 'card_id': card_id, 'reason_code': reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected, actor, entries)
    if chance['legal_candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('315 response candidate inventory differs: ' + repr(chance['legal_candidate_ids']))
    return {'next_opportunity': game['phase'], 'candidate_ids': ['response-pass'],
            'candidate_set_complete': True, 'hand_exclusions': removed,
            'hand_other_exclusions': chance['excluded_candidates'], 'board_exclusions': excluded}


def audit_route(row, older, earlier):
    state = row['final_continuation_state']
    game = state['game_state']
    if (start.canonical_sha256(state) != row['final_continuation_state_sha256'] or
            start.opening._stop_state_sha256(game) != row['final_game_state_sha256']):
        raise ValueError('318 source hash differs')
    base = {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}
    if row['path_id'] == 'probe-01-a-first':
        if game['phase'] != 'turn_end':
            raise ValueError('318 first end phase differs')
        return {**base, **prove_end(row, older, 295)}
    if row['path_id'] == 'probe-02-a-first':
        if game['phase'] != 'turn_end':
            raise ValueError('318 second end phase differs')
        return {**base, **prove_end(row, earlier, 292)}
    return {**base, **audit_response(row)}


def validate_result(result):
    try:
        rows, old, early = load_sources()
        row = next(x for x in rows if x['path_id'] == result['path_id'])
        older = next(x for x in old if x['path_id'] == result['path_id'])
        earlier = next(x for x in early if x['path_id'] == result['path_id'])
        return [] if result == audit_route(row, older, earlier) else ['318 audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows, old, early = load_sources()
    results = [audit_route(row, next(x for x in old if x['path_id'] == row['path_id']),
                           next(x for x in early if x['path_id'] == row['path_id'])) for row in rows]
    if len(results) != 4 or any(validate_result(x) for x in results):
        raise ValueError('318 four opportunity inventory differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'baseline_294_sha256': BASELINE_294_SHA256,
            'baseline_291_sha256': BASELINE_291_SHA256,
            'planned': 4, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('318 canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('318: two turn ends and two start responses audited')


if __name__ == '__main__':
    main()
