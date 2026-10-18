#!/usr/bin/env python3
"""Start-of-turn response from immutable checkpoint-135 probe states."""

import argparse
import copy
import hashlib
import json
from pathlib import Path

import proxy_normal_decision_seeded_restart as opening
import proxy_normal_action_candidate_completeness as normal_121
import proxy_response_window_contract as response
import proxy_response_window_seeded_restart as seeded
from proxy_record_validator import canonical_sha256


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/proxy-independent-seed-probe-20260924.json'
SOURCE_RAW_SHA256 = '1a497209d56f605e474f136777c06a3260b731417ca7940bc361f72850457a6c'
OUTPUT = ROOT / 'data/proxy-start-response-138-20260924.json'
SCHEMA = 'naotocchi.card_game.proxy_start_response_restart.v1'
VARIANTS = ('main', 'companion', 'partner', 'world', 'play', 'item', 'event')


def _bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256:
        raise ValueError('checkpoint 135 source raw SHA differs')
    source = json.loads(raw)
    if source.get('schema') != 'naotocchi.card_game.independent_seed_probe.v1' or \
            source.get('planned') != 4 or len(source.get('results', [])) != 4:
        raise ValueError('checkpoint 135 source shape differs')
    return source


def load_candidate_rows():
    data = json.loads((ROOT / 'data/proxy-normal-decision-candidate-table-114-20260918.json').read_text())
    return response._card_index(data)


def response_id(action_type, source_instance_id, *, variant=None, registered_variants=None,
                target_instance_id=None):
    if action_type not in ('use_play', 'use_item', 'use_event') or \
            not isinstance(source_instance_id, str) or not source_instance_id:
        raise ValueError('unsupported response action or source')
    values = registered_variants if registered_variants is not None else []
    if not isinstance(values, list) or len(set(values)) != len(values) or \
            any(not isinstance(x, str) or not x or not x.replace('_', '').isalnum()
                for x in values):
        raise ValueError('response variant registry is invalid')
    if variant is not None and (variant not in values or target_instance_id is not None):
        raise ValueError('response variant is unregistered or conflicts with target')
    if len(values) > 1 and variant is None:
        raise ValueError('multiple declaration variants need explicit response ID')
    if target_instance_id is not None and (not isinstance(target_instance_id, str) or
                                           not target_instance_id):
        raise ValueError('response target is invalid')
    kind = action_type.removeprefix('use_')
    result = f'response-use-{kind}-{source_instance_id}'
    if target_instance_id is not None:
        result += f'-target-{target_instance_id}'
    if variant is not None:
        result += f'-variant-{variant}'
    return result


def verify_source_route(result):
    if result.get('last_valid_event_seq') != 2 or result.get('stop_reason_code') != \
            'unproved_post_egg_response_window' or not result.get('seeded_fallback_used'):
        raise ValueError('135 source stop differs')
    events, snapshots = result['events'], result['snapshots']
    if len(events) != 2 or len(snapshots) != 3:
        raise ValueError('135 event/snapshot counts differ')
    for index, event in enumerate(events):
        if event['seq'] != index + 1 or event['state_before_sha256'] != snapshots[index]['state_sha256'] or \
                event['state_after_sha256'] != snapshots[index + 1]['state_sha256'] or \
                snapshots[index + 1]['seq'] != index + 1:
            raise ValueError('135 event hash or sequence chain differs')
    for snapshot in snapshots:
        if opening._stop_state_sha256(snapshot['state']) != snapshot['state_sha256']:
            raise ValueError('135 snapshot state hash differs')
    state = result['final_state']
    if opening._canonical_stop_state(state) != snapshots[-1]['state'] or opening._stop_state_sha256(state) != result['final_state_sha256'] or \
            result['final_state_sha256'] != events[-1]['state_after_sha256']:
        raise ValueError('135 final state hash differs')
    if state['phase'] != 'response_window' or state['turn_player'] != result['first_player'] or \
            state['round'] != 1 or opening._stop_state_integrity_errors(state):
        raise ValueError('135 start response state is invalid')


def _payload(continuation):
    return {k: copy.deepcopy(continuation[k]) for k in
            ('game_state', 'response_context', 'activation_zone', 'pending_triggers', 'return_target')}


def _hash(continuation):
    return canonical_sha256(_payload(continuation))


def build_resume_state(result):
    verify_source_route(result)
    state = copy.deepcopy(result['final_state'])
    for player in state['players'].values():
        board = player['board']
        if player['reservations'] or player['discard'] or board['main'] is not None or \
                board['partner'] is not None or board['world'] is not None or \
                board['companions'] or board['prepared']:
            raise ValueError('start reservations, board triggers or prepared need proof')
    actor = result['first_player']
    context = {'source_phase': 'response_window', 'phase': 'response_window',
               'window_kind': 'turn_start', 'origin_event_seq': 2,
               'turn_player': actor, 'priority_actor': actor, 'chain_status': 'empty',
               'chain_links': [], 'consecutive_passes': 0,
               'response_opportunity_index': 1, 'decision_kind': 'response_action',
               'choice_kind': 'reaction_or_pass'}
    continuation = {'game_state': state, 'response_context': context,
                    'activation_zone': [], 'pending_triggers': [],
                    'return_target': 'normal_action_opportunity',
                    'source_event_seq': 2, 'last_event_seq': 2,
                    'source_game_state_sha256': result['final_state_sha256']}
    continuation['continuation_state_sha256'] = _hash(continuation)
    return continuation


def _hand_detail(state, actor, instance_id, row, action, variant=None):
    card = state['cards'][instance_id]
    variants = action.get('candidate_variants')
    return {'candidate_id': response_id(action['action_type'], instance_id,
                                        variant=variant, registered_variants=variants),
            'candidate_family': 'hand_quick_use', 'action_type': action['action_type'],
            'card_id': card['card_id'], 'card_copy_id': card['card_copy_id'],
            'source_instance_id': instance_id, 'target_instance_ids': [],
            'candidate_variant': variant, 'base_time_cost': action['base_time_cost'],
            'source_references': [action['source_text_reference']]}


def enumerate_opportunity(continuation, actor, rows):
    state, context = continuation['game_state'], continuation['response_context']
    if context['window_kind'] != 'turn_start' or context['phase'] != 'response_window' or \
            actor != context['priority_actor'] or state['phase'] != 'response_window':
        raise ValueError('not a start response opportunity')
    player = state['players'][actor]
    legal = [response.build_response_pass_detail()]
    excluded = []
    for instance_id in player['hand']:
        card = state['cards'][instance_id]
        card_id = card['card_id']
        row = rows.get(card_id)
        if row is None or not isinstance(row.get('actions'), list):
            raise ValueError(f'missing 114 hand candidate row: {card_id}')
        hand_actions = [x for x in row['actions'] if x.get('action_type') not in
                        ('activate_companion_ability', 'activate_board_ability')]
        if len(hand_actions) != 1:
            raise ValueError(f'unproved 114 hand action family: {card_id}')
        action = hand_actions[0]
        kind, cost = action.get('action_type'), action.get('base_time_cost')
        reason = None
        if isinstance(kind, str) and kind.startswith('use_') and \
                kind not in ('use_play', 'use_item', 'use_event'):
            raise ValueError(f'unregistered hand quick-use action: {kind}')
        if kind not in ('use_play', 'use_item', 'use_event'):
            reason = 'not_hand_quick_use'
        elif type(cost) is not int or cost < 0:
            raise ValueError('unproved hand response cost')
        elif player['time'] < cost:
            reason = 'insufficient_time'
        elif card_id == 'G-baseball-batting':
            if state.get('challenge') is not None:
                raise ValueError('challenge response needs separate proof')
            reason = 'no_active_own_challenge'
        elif card_id == 'G-basketball-3d' and player['board']['main'] is None:
            reason = 'no_own_main_target'
        elif card_id == 'G-hit-blow':
            if action.get('target_rule') != 'declare one of seven card types; no card target' or \
                    action.get('candidate_variants') != list(VARIANTS):
                raise ValueError('unproved declaration variants')
            if not player['deck']:
                reason = 'empty_own_deck'
            else:
                legal.extend(_hand_detail(state, actor, instance_id, row, action, variant)
                             for variant in VARIANTS)
        elif card_id == 'I-c_coin2':
            if action.get('target_rule') != 'no target; reveal deck top if present' or \
                    action.get('candidate_variants') != ['single_no_target']:
                raise ValueError('unproved targetless item template')
            legal.append(_hand_detail(state, actor, instance_id, row, action))
        else:
            raise ValueError(f'affordable quick use requires condition proof: {card_id}')
        if reason is not None:
            excluded.append({'source_zone': 'hand', 'source_instance_id': instance_id,
                             'card_id': card_id, 'reason_code': reason})
    if player['board']['prepared'] or player['board']['companions'] or \
            player['board']['partner'] is not None:
        raise ValueError('board or prepared response enumeration needs proof')
    excluded.append({'source_zone': 'prepared', 'source_instance_id': None,
                     'card_id': None, 'reason_code': 'no_prepared_activation_present'})
    legal.sort(key=lambda x: x['candidate_id'])
    ids = [x['candidate_id'] for x in legal]
    if len(ids) != len(set(ids)):
        raise ValueError('response candidate ID collision')
    return {'actor': actor, 'response_context': copy.deepcopy(context),
            'legal_candidate_ids': ids, 'legal_candidate_details': legal,
            'excluded_candidates': excluded,
            'inspected_information': response._information_snapshot(state, actor),
            'forbidden_information_used': [], 'candidate_set_complete': True,
            'source_references': sorted({ref for x in legal for ref in x['source_references']})}


def _pass(continuation, actor):
    before = copy.deepcopy(continuation)
    result = copy.deepcopy(before)
    context = result['response_context']
    if context['priority_actor'] != actor or context['chain_links'] or result['pending_triggers']:
        raise ValueError('cannot pass unproved start response chain')
    context['response_opportunity_index'] += 1
    if context['consecutive_passes'] == 0:
        context['consecutive_passes'] = 1
        context['priority_actor'] = 'B' if actor == 'A' else 'A'
    elif context['consecutive_passes'] == 1:
        context['consecutive_passes'] = 2
        result['game_state']['phase'] = 'normal_action'
    else:
        raise ValueError('start response already closed')
    result['last_event_seq'] += 1
    result['continuation_state_sha256'] = _hash(result)
    event = {'seq': result['last_event_seq'], 'action_type': 'response_pass', 'actor': actor,
             'selected_candidate': 'response-pass',
             'game_state_before_sha256': opening._stop_state_sha256(before['game_state']),
             'game_state_after_sha256': opening._stop_state_sha256(result['game_state']),
             'continuation_state_before_sha256': before['continuation_state_sha256'],
             'continuation_state_after_sha256': result['continuation_state_sha256']}
    snapshot = {'event_seq': event['seq'], 'game_state': copy.deepcopy(result['game_state']),
                'game_state_sha256': event['game_state_after_sha256'],
                'continuation_state': _payload(result),
                'continuation_state_sha256': result['continuation_state_sha256']}
    return result, event, snapshot


def run_route(source):
    state = build_resume_state(source)
    events, decisions = [], []
    snapshots = [{'event_seq': 2, 'game_state': copy.deepcopy(state['game_state']),
                  'game_state_sha256': source['final_state_sha256'],
                  'continuation_state': _payload(state),
                  'continuation_state_sha256': state['continuation_state_sha256']}]
    reason = None
    rows = load_candidate_rows()
    while state['game_state']['phase'] == 'response_window':
        actor = state['response_context']['priority_actor']
        opportunity = enumerate_opportunity(state, actor, rows)
        decision = seeded.resolve_response_choice(
            {'order_id': source['order_id'], 'actor_turn_index': 1, 'round': 1}, opportunity)
        decision['event_seq'] = state['last_event_seq']
        decision['pre_game_state_sha256'] = opening._stop_state_sha256(state['game_state'])
        decision['pre_continuation_state_sha256'] = state['continuation_state_sha256']
        decisions.append(decision)
        if decision['selected_candidate'] != response.RESPONSE_PASS_ID:
            reason = 'unproved_start_quick_use_activation_resolution'
            break
        state, event, snapshot = _pass(state, actor)
        events.append(event)
        snapshots.append(snapshot)
    normal_action_audit = None
    if reason is None:
        history = {'normal_challenge_losses_by_actor': [],
                   'last_valid_event_seq': state['last_event_seq'], 'source_refs': []}
        table = response.load_inputs()['candidate_table']
        normal_action_audit = normal_121.audit_current_normal_action(
            state['game_state'], state, history, table)
        if normal_121.validate_current_normal_action(
                normal_action_audit, state['game_state'], state, history, table):
            raise ValueError('121 current normal action audit is not reproducible')
        reason = ('unproved_new_seed_normal_action_decision'
                  if normal_action_audit['candidate_set_complete']
                  else 'incomplete_legal_candidates')
    return {'schema': SCHEMA, 'path_id': source['path_id'],
            'source_game_state_sha256': source['final_state_sha256'],
            'source_last_event_seq': source['last_valid_event_seq'],
            'status': 'stopped_rules_adjudication', 'stop_reason_code': reason,
            'stop_phase': state['game_state']['phase'],
            'last_valid_event_seq': state['last_event_seq'],
            'final_game_state': copy.deepcopy(state['game_state']),
            'final_game_state_sha256': opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256': state['continuation_state_sha256'],
            'final_continuation_state': _payload(state),
            'normal_action_candidate_audit': normal_action_audit,
            'decisions': decisions, 'events': events, 'snapshots': snapshots,
            'winner': None, 'seeded_fallback_used': True, 'balance_sample_count': 0}


def validate_result(result, source):
    try:
        expected = run_route(source)
        if _bytes(expected) != _bytes(result):
            return ['route differs from saved-state replay']
        if result['events'] and result['events'][0]['game_state_before_sha256'] != source['final_state_sha256']:
            return ['source game hash link differs']
        previous_game, previous_cont = source['final_state_sha256'], result['snapshots'][0]['continuation_state_sha256']
        for event, snapshot in zip(result['events'], result['snapshots'][1:]):
            if event['game_state_before_sha256'] != previous_game or \
                    event['continuation_state_before_sha256'] != previous_cont or \
                    event['game_state_after_sha256'] != snapshot['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snapshot['continuation_state_sha256'] or \
                    opening._stop_state_sha256(snapshot['game_state']) != snapshot['game_state_sha256'] or \
                    canonical_sha256(snapshot['continuation_state']) != snapshot['continuation_state_sha256']:
                return ['event/snapshot game or continuation chain differs']
            previous_game, previous_cont = event['game_state_after_sha256'], event['continuation_state_after_sha256']
        return []
    except (ValueError, KeyError, TypeError) as error:
        return [str(error)]


def build_report(source=None):
    if source is None:
        source = load_source()
    results = [run_route(x) for x in source['results']]
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': len(results), 'completed': 0, 'rules_stop': len(results),
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build_report()
    raw = _bytes(report)
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('138 saved canonical bytes differ')
    else:
        OUTPUT.write_bytes(raw)
    print('138:', report['planned'], 'planned,', report['completed'], 'completed,',
          report['rules_stop'], 'rules stops,', sum(len(x['events']) for x in report['results']), 'events')


if __name__ == '__main__':
    main()
