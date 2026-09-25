#!/usr/bin/env python3
"""Close a two-link response chain and resolve its items in reverse order."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_item_chain_154 as prior
import proxy_new_seed_start_response_153 as audit
import proxy_new_seed_egg_restart_152 as egg
import proxy_start_response_138 as start
import proxy_hit_blow_response_142 as hit

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '18af9dafa10b699a28991c856381b98c1288e8999a9ff7f359aad6688b1f0843'
OUTPUT = ROOT / 'data/proxy-new-seed-chain-resolution-155-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_chain_resolution.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('154 protected raw or replay differs')
    data = json.loads(raw)
    if data['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in data['results']):
        raise ValueError('154 source chain differs')
    return data


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def resolve_item(before):
    ctx = before['response_context']; links = before['activation_zone']
    if ctx['chain_status'] != 'resolving' or len(ctx['chain_links']) != 2 or len(links) != 2 or \
            ctx['chain_links'] != [x['link_id'] for x in links] or before['pending_triggers']:
        raise ValueError('155 two-link reverse resolution shape differs')
    item = links[-1]
    if item['action_type'] != 'use_item' or item['card_id'] != 'I-c_coin2' or \
            item['payment'] != {'time': 1} or item['target_instance_ids'] != [] or \
            item['candidate_variant'] is not None:
        raise ValueError('155 quick-item source link differs')
    section = (ROOT / '77-current-items-card-text-draft.md').read_text().split(
        '### I-c_coin2 — ', 1)[1].split('\n### ', 1)[0]
    if '山札上1枚を公開し、山札の一番下に置く' not in section or \
            '公開したカードがメインだった場合、自分のそだち+5' not in section or \
            'メイン以外だった場合、1枚引く' not in section:
        raise ValueError('155 quick-item text differs')
    actor = item['actor']; after = copy.deepcopy(before); owner = after['game_state']['players'][actor]
    if not owner['deck'] or item['source_instance_id'] in owner['hand']:
        raise ValueError('155 item resolution source deck or hand differs')
    revealed = owner['deck'].pop(0)
    card = after['game_state']['cards'][revealed]
    registry = start.load_candidate_rows().get(card['card_id'])
    if registry is None or registry['card_type'] not in start.VARIANTS:
        raise ValueError('155 revealed category unregistered')
    owner['deck'].append(revealed)
    main = registry['card_type'] == 'main'
    drawn = None
    if main: owner['growth'] += 5
    else:
        drawn = owner['deck'].pop(0)
        owner['hand'].append(drawn)
    if owner['growth'] >= 100: raise ValueError('155 growth threshold needs separate proof')
    owner['discard'].append(item['source_instance_id'])
    after['activation_zone'].pop()
    after['response_context']['chain_links'].pop()
    after['last_event_seq'] += 1
    after['continuation_state_sha256'] = start._hash(after)
    result = {'revealed_instance_id': revealed, 'revealed_card_type': registry['card_type'],
              'returned_to_deck_bottom': revealed, 'drawn_instance_id': drawn,
              'growth_added': 5 if main else 0, 'source_destination': 'discard'}
    event = {'seq': after['last_event_seq'], 'action_type': 'resolve_item', 'actor': actor,
             'source_instance_id': item['source_instance_id'], 'chain_link_id': item['link_id'],
             'payment': copy.deepcopy(item['payment']), 'result': result,
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
        raise ValueError('154 continuation source hash differs')
    decisions = []; events = []; snapshots = []; reason = row['stop_reason_code']
    if reason == 'unproved_current_chain_response_or_resolution':
        saved_egg = next(x for x in json.loads(egg.OUTPUT.read_bytes())['results'] if x['path_id'] == row['path_id'])
        if egg.OUTPUT.read_bytes() != egg.canonical_bytes(egg.build_report()):
            raise ValueError('152 protected egg origin differs')
        origin = saved_egg['new_events'][-1]
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        while state['response_context']['chain_status'] == 'building':
            decision = audit.decision_for(state, order, origin)
            if decision['legal_candidate_ids'] != ['response-pass'] or \
                    decision['selected_candidate'] != 'response-pass' or \
                    decision['resolution_mode'] != 'response_unique':
                raise ValueError('155 current chain priority has unproved response')
            after, event = hit.pass_start_chain(state, decision)
            decisions.append(decision); events.append(event); snapshots.append(snapshot(after)); state = after
        after, event = resolve_item(state)
        events.append(event); snapshots.append(snapshot(after)); state = after
        if len(state['activation_zone']) != 1 or state['activation_zone'][0]['card_id'] != 'G-hit-blow':
            raise ValueError('155 remaining outer link differs')
        after, event = hit.resolve_link(state)
        events.append(event); snapshots.append(snapshot(after)); state = after
        reason = 'unproved_post_resolution_normal_action_candidates'
    elif reason != 'unproved_current_normal_action_candidates':
        raise ValueError('155 unclassified held route')
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': state['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256': state['continuation_state_sha256'],
            'final_continuation_state': start._payload(state), 'stop_reason_code': reason,
            'new_decisions': decisions, 'new_events': events, 'new_snapshots': snapshots,
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        source = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        if result != run_route(source) or result['last_valid_event_seq'] != \
                source['last_valid_event_seq'] + len(result['new_events']):
            return ['155 independent replay differs']
        game = source['final_game_state_sha256']; cont = source['final_continuation_state_sha256']
        for offset, (event, snap) in enumerate(zip(result['new_events'], result['new_snapshots']), 1):
            if event['seq'] != source['last_valid_event_seq'] + offset or \
                    event['game_state_before_sha256'] != game or \
                    event['continuation_state_before_sha256'] != cont or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                return ['155 event/snapshot hash chain differs']
            game = event['game_state_after_sha256']; cont = event['continuation_state_after_sha256']
        if game != result['final_game_state_sha256'] or cont != result['final_continuation_state_sha256']:
            return ['155 final hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error: return [str(error)]


def build_report():
    rows = [run_route(x) for x in load_source()['results']]
    if len(rows) != 3 or any(validate_result(x) for x in rows):
        raise ValueError('155 independent chain resolution differs')
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
        if OUTPUT.read_bytes() != raw: raise SystemExit('155 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('155: 2 passes and 2 reverse resolutions, 0 completed')


if __name__ == '__main__': main()
