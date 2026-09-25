#!/usr/bin/env python3
"""Activate a proved hand quick-use item in an already building response chain."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_start_response_153 as prior
import proxy_new_seed_egg_restart_152 as egg
import proxy_start_response_138 as start
import proxy_hit_blow_response_142 as hit
import proxy_response_window_seeded_restart as response

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = 'c6b84fe96db4075a8eaef71aab59fc007c2a7389ea5021451052bbcf1076dfd8'
OUTPUT = ROOT / 'data/proxy-new-seed-item-chain-154-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_item_chain.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('153 protected raw or replay differs')
    data = json.loads(raw)
    if data['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in data['results']):
        raise ValueError('153 source hash chain differs')
    return data


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def activate_quick_item(before, decision):
    action = decision['selected_action']; ctx = before['response_context']; actor = ctx['priority_actor']
    if action['action_type'] != 'use_item' or action['card_id'] != 'I-c_coin2' or \
            action['base_time_cost'] != 1 or action['target_instance_ids'] != [] or \
            ctx['window_kind'] != 'turn_start' or ctx['chain_status'] != 'building' or \
            not ctx['chain_links'] or ctx['consecutive_passes'] != 1 or before['pending_triggers']:
        raise ValueError('154 selected quick-item activation boundary differs')
    section = (ROOT / '77-current-items-card-text-draft.md').read_text().split(
        '### I-c_coin2 — ', 1)[1].split('\n### ', 1)[0]
    if '時: 1 / 使用方法: すぐつかう' not in section or \
            '山札上1枚を公開し、山札の一番下に置く' not in section or \
            '公開したカードがメインだった場合、自分のそだち+5' not in section:
        raise ValueError('154 item source text differs')
    player = before['game_state']['players'][actor]; source = action['source_instance_id']
    if source not in player['hand'] or player['time'] < 1 or not player['deck'] or \
            before['game_state']['cards'][source]['card_id'] != action['card_id'] or \
            decision['selected_candidate'] != start.response_id('use_item', source):
        raise ValueError('154 quick-item source identity/cost differs')
    after = copy.deepcopy(before); owner = after['game_state']['players'][actor]
    owner['time'] -= 1; owner['hand'].remove(source)
    seq = before['last_event_seq'] + 1; link_id = f'response-link-{seq}-{source}'
    link = {'link_id': link_id, 'action_type': 'use_item', 'actor': actor,
            'card_id': action['card_id'], 'card_copy_id': action['card_copy_id'],
            'source_instance_id': source, 'target_instance_ids': [], 'candidate_variant': None,
            'payment': {'time': 1}, 'source_references': copy.deepcopy(action['source_references'])}
    after['activation_zone'].append(link)
    transitioned = hit._turn_start_transition(before, {'kind': 'activate', 'actor': actor, 'link_id': link_id})
    response._apply_transition_result(after, transitioned)
    after['last_event_seq'] = seq; after['continuation_state_sha256'] = start._hash(after)
    event = {'seq': seq, 'action_type': 'activate_response', 'actor': actor,
             'selected_candidate': action['candidate_id'], 'source_instance_id': source,
             'candidate_variant': None, 'payment': {'time': 1}, 'target_instance_ids': [],
             'chain_link_id': link_id,
             'game_state_before_sha256': start.opening._stop_state_sha256(before['game_state']),
             'game_state_after_sha256': start.opening._stop_state_sha256(after['game_state']),
             'continuation_state_before_sha256': before['continuation_state_sha256'],
             'continuation_state_after_sha256': after['continuation_state_sha256']}
    return after, event


def run_route(row):
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('153 continuation source hash differs')
    events = []; snaps = []; reason = row['stop_reason_code']
    if reason == 'unproved_selected_item_chain_activation':
        original = next(x for x in egg.load_source()['results'] if x['path_id'] == row['path_id'])
        # Recheck the saved selected response against the current response window.
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        saved_egg = next(x for x in json.loads(egg.OUTPUT.read_bytes())['results'] if x['path_id'] == row['path_id'])
        if original['path_id'] != row['path_id'] or egg.OUTPUT.read_bytes() != egg.canonical_bytes(egg.build_report()):
            raise ValueError('152 egg source replay differs')
        independent = prior.decision_for(state, order, saved_egg['new_events'][-1])
        selected = row['new_decisions'][-1]
        if selected != independent or selected['selected_candidate'] != selected['selected_action']['candidate_id']:
            raise ValueError('153 saved quick-item decision differs')
        after, event = activate_quick_item(state, selected)
        events = [event]; snaps = [snapshot(after)]; state = after
        reason = 'unproved_current_chain_response_or_resolution'
    elif reason != 'unproved_current_normal_action_candidates':
        raise ValueError('154 unclassified held state')
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': state['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256': state['continuation_state_sha256'],
            'final_continuation_state': start._payload(state), 'stop_reason_code': reason,
            'new_decisions': [], 'new_events': events, 'new_snapshots': snaps,
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        source = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        if result != run_route(source) or result['last_valid_event_seq'] != \
                source['last_valid_event_seq'] + len(result['new_events']):
            return ['154 independent replay differs']
        game = source['final_game_state_sha256']; cont = source['final_continuation_state_sha256']
        for event, snap in zip(result['new_events'], result['new_snapshots']):
            if event['game_state_before_sha256'] != game or \
                    event['continuation_state_before_sha256'] != cont or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                return ['154 event/snapshot hash chain differs']
            game = event['game_state_after_sha256']; cont = event['continuation_state_after_sha256']
        if game != result['final_game_state_sha256'] or cont != result['final_continuation_state_sha256']:
            return ['154 final hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error: return [str(error)]


def build_report():
    rows = [run_route(x) for x in load_source()['results']]
    if len(rows) != 3 or any(validate_result(x) for x in rows):
        raise ValueError('154 item activation replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 3, 'completed': 0, 'new_decisions': 0, 'new_events': 1,
            'new_snapshots': 1, 'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('154 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('154: 1 selected quick-item chain activation, 0 resolutions')


if __name__ == '__main__': main()
