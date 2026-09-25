#!/usr/bin/env python3
"""Resume proved start response choices with the existing 119/138/142 transitions."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_egg_restart_152 as prior
import proxy_start_response_138 as start
import proxy_hit_blow_response_142 as hit
import proxy_response_window_seeded_restart as response
import proxy_normal_action_seeded_restart as normal
import proxy_board_trigger_audit_144 as trigger

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '69efab337597641c17ed027d1e67287399b5a622ca0d7fe301a3179a75eb3328'
OUTPUT = ROOT / 'data/proxy-new-seed-start-response-153-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_start_response.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('152 protected raw or replay differs')
    data = json.loads(raw)
    if data['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in data['results']):
        raise ValueError('152 source hash chain differs')
    return data


def current(row):
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('152 final continuation hash differs')
    return state


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def decision_for(state, order, origin):
    ctx = state['response_context']; actor = ctx['priority_actor']
    if ctx['window_kind'] != 'turn_start' or ctx['phase'] != 'response_window' or \
            state['game_state']['phase'] != 'response_window':
        raise ValueError('153 start response boundary differs')
    projected = copy.deepcopy(state)
    board = state['game_state']['players'][actor]['board']
    for instance in board['companions']:
        card_id = state['game_state']['cards'][instance]['card_id']
        timing, *fragments = trigger.TRIGGERS[card_id]
        section = (ROOT / '72-companion-26-card-text-draft.md').read_text().split(
            f'### {card_id} — ', 1)[1].split('\n### ', 1)[0]
        if any(fragment not in section for fragment in fragments) or \
                origin['seq'] != ctx['origin_event_seq'] or \
                trigger.matches(card_id, ctx['window_kind'], actor, ctx['turn_player'],
                                origin['action_type'], origin['actor']):
            raise ValueError('153 board trigger not excluded by source event')
    projected['game_state']['players'][actor]['board']['companions'] = []
    opportunity = start.enumerate_opportunity(projected, actor, start.load_candidate_rows())
    opportunity['board_exclusions'] = [{'source_instance_id': x,
        'card_id': state['game_state']['cards'][x]['card_id'],
        'reason_code': 'trigger_condition_not_met'} for x in board['companions']]
    if not opportunity['candidate_set_complete']:
        raise ValueError('153 response candidates incomplete')
    decision = response.resolve_response_choice(
        {'order_id': order, 'actor_turn_index': 1, 'round': state['game_state']['round']}, opportunity)
    decision['pre_game_state_sha256'] = start.opening._stop_state_sha256(state['game_state'])
    decision['pre_continuation_state_sha256'] = state['continuation_state_sha256']
    decision['event_seq'] = state['last_event_seq']
    return decision


def run_route(row):
    state = current(row)
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    decisions = []; events = []; snapshots = []
    reason = 'unproved_current_normal_action_candidates'
    origin = row['new_events'][-1]
    choice = decision_for(state, order, origin)
    if choice['selected_candidate'] == 'response-pass':
        if choice['legal_candidate_ids'] != ['response-pass'] or choice['resolution_mode'] != 'response_unique':
            raise ValueError('153 unique start pass differs')
        for index in range(2):
            decision = choice if index == 0 else decision_for(state, order, origin)
            if decision['legal_candidate_ids'] != ['response-pass'] or decision['selected_candidate'] != 'response-pass':
                raise ValueError('153 next start pass not unique')
            after, event, _ = start._pass(state, decision['actor'])
            normal._verify_step(state, after, [event])
            decisions.append(decision); events.append(event); snapshots.append(snapshot(after)); state = after
    else:
        if choice['selected_action']['card_id'] != 'G-hit-blow' or \
                choice['resolution_mode'] != 'response_seeded_fallback':
            raise ValueError('153 selected quick use requires separate handler')
        after, event = hit.activate(state, choice)
        decisions.append(choice)
        events.append(event); snapshots.append(snapshot(after)); state = after
        while state['response_context']['chain_status'] == 'building':
            decision = decision_for(state, order, origin)
            if decision['selected_candidate'] != 'response-pass':
                if decision['selected_action']['card_id'] != 'I-c_coin2' or \
                        decision['resolution_mode'] not in ('priority_unique','response_seeded_fallback'):
                    raise ValueError('153 unclassified chain response choice')
                decisions.append(decision)
                reason = 'unproved_selected_item_chain_activation'
                break
            if decision['legal_candidate_ids'] != ['response-pass'] or \
                    decision['resolution_mode'] != 'response_unique':
                raise ValueError('153 chain response pass not uniquely proved')
            after, event = hit.pass_start_chain(state, decision)
            decisions.append(decision)
            events.append(event); snapshots.append(snapshot(after)); state = after
        if reason != 'unproved_selected_item_chain_activation':
            after, event = hit.resolve_link(state)
            events.append(event); snapshots.append(snapshot(after)); state = after
    if reason != 'unproved_selected_item_chain_activation' and state['game_state']['phase'] != 'normal_action':
        raise ValueError('153 response chain did not close')
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': state['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256': state['continuation_state_sha256'],
            'final_continuation_state': start._payload(state),
            'stop_reason_code': reason,
            'new_decisions': decisions, 'new_events': events, 'new_snapshots': snapshots,
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        source = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        if result != run_route(source) or result['last_valid_event_seq'] != \
                source['last_valid_event_seq'] + len(result['new_events']):
            return ['153 independent replay differs']
        game = source['final_game_state_sha256']; cont = source['final_continuation_state_sha256']
        for offset, (event, snap) in enumerate(zip(result['new_events'], result['new_snapshots']), 1):
            if event['seq'] != source['last_valid_event_seq'] + offset or \
                    event['game_state_before_sha256'] != game or \
                    event['continuation_state_before_sha256'] != cont or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                return ['153 event/snapshot hash link differs']
            game = event['game_state_after_sha256']; cont = event['continuation_state_after_sha256']
        if game != result['final_game_state_sha256'] or cont != result['final_continuation_state_sha256']:
            return ['153 final hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error: return [str(error)]


def build_report():
    rows = [run_route(x) for x in load_source()['results']]
    if len(rows) != 3 or any(validate_result(x) for x in rows):
        raise ValueError('153 response replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 3, 'completed': 0,
            'new_decisions': sum(len(x['new_decisions']) for x in rows),
            'new_events': sum(len(x['new_events']) for x in rows),
            'new_snapshots': sum(len(x['new_snapshots']) for x in rows),
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('153 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('153: 3 start response windows, 6 events, 02-B stopped at selected item activation')


if __name__ == '__main__': main()
