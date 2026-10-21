#!/usr/bin/env python3
"""Apply three proved passes and resolve one single-link quick item."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_current_audit_175 as prior
import proxy_new_seed_next_restart_174 as states
import proxy_new_seed_opportunity_audit_171 as normal_proofs
import proxy_normal_action_seeded_restart as normal
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = 'feedfa745ca708075f18c8e51c6615714d287ee7ac855a49f7cc7f836656b1a0'
OUTPUT = ROOT / 'data/proxy-new-seed-current-restart-176-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_current_restart_176.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('175 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in result['results']):
        raise ValueError('175 current opportunity differs')
    return result


def load_states():
    raw = states.OUTPUT.read_bytes()
    if raw != states.canonical_bytes(states.build_report()):
        raise ValueError('174 protected replay differs')
    result = json.loads(raw)
    if any(states.validate_result(x) for x in result['results']):
        raise ValueError('174 source state/hash differs')
    return result['results']


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def resolve_item(before, proof):
    ctx = before['response_context']; links = before['activation_zone']
    if ctx['chain_status'] != 'resolving' or len(ctx['chain_links']) != 1 or len(links) != 1 or \
            ctx['chain_links'] != [links[0]['link_id']] or \
            proof['chain_link_id'] != links[0]['link_id'] or \
            proof['source_instance_id'] != links[0]['source_instance_id'] or before['pending_triggers']:
        raise ValueError('176 single-link resolution boundary differs')
    link = links[0]
    if link['action_type'] != 'use_item' or link['card_id'] != 'I-c_coin2' or \
            link['payment'] != {'time': 1} or link['target_instance_ids'] != [] or \
            link['candidate_variant'] is not None:
        raise ValueError('176 quick-item source link differs')
    section = (ROOT / '77-current-items-card-text-draft.md').read_text().split(
        '### I-c_coin2 — ', 1)[1].split('\n### ', 1)[0]
    if '山札上1枚を公開し、山札の一番下に置く' not in section or \
            '公開したカードがメインだった場合、自分のそだち+5' not in section or \
            'メイン以外だった場合、1枚引く' not in section:
        raise ValueError('176 quick-item resolution source text differs')
    after = copy.deepcopy(before); actor = link['actor']; player = after['game_state']['players'][actor]
    if not player['deck'] or link['source_instance_id'] in player['hand']:
        raise ValueError('176 item source zone/deck differs')
    revealed = player['deck'].pop(0); card = after['game_state']['cards'][revealed]
    registry = start.load_candidate_rows().get(card['card_id'])
    if registry is None or registry['card_type'] not in start.VARIANTS:
        raise ValueError('176 revealed category unregistered')
    player['deck'].append(revealed); main = registry['card_type'] == 'main'; drawn = None
    if main: player['growth'] += 5
    else:
        drawn = player['deck'].pop(0); player['hand'].append(drawn)
    if player['growth'] >= 100:
        raise ValueError('176 growth threshold needs separate proof')
    player['discard'].append(link['source_instance_id']); after['activation_zone'].pop()
    after['response_context']['chain_links'].pop()
    after['response_context']['chain_status'] = 'empty'
    after['response_context']['consecutive_passes'] = 0
    after['return_target'] = 'normal_action_opportunity'
    after['game_state']['phase'] = 'normal_action'
    after['last_event_seq'] += 1; after['continuation_state_sha256'] = start._hash(after)
    result = {'revealed_instance_id': revealed, 'revealed_card_type': registry['card_type'],
              'returned_to_deck_bottom': revealed, 'drawn_instance_id': drawn,
              'growth_added': 5 if main else 0, 'source_destination': 'discard'}
    event = {'seq': after['last_event_seq'], 'action_type': 'resolve_item', 'actor': actor,
             'source_instance_id': link['source_instance_id'], 'chain_link_id': link['link_id'],
             'payment': copy.deepcopy(link['payment']), 'result': result,
             'game_state_before_sha256': start.opening._stop_state_sha256(before['game_state']),
             'game_state_after_sha256': start.opening._stop_state_sha256(after['game_state']),
             'continuation_state_before_sha256': before['continuation_state_sha256'],
             'continuation_state_after_sha256': after['continuation_state_sha256']}
    return after, event


def run_route(row, proof):
    if (row['path_id'], row['last_valid_event_seq'], row['final_game_state_sha256'],
            row['final_continuation_state_sha256']) != (proof['path_id'],
            proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
            proof['source_continuation_state_sha256']):
        raise ValueError('174/175 current boundary differs')
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('174 continuation hash differs')
    decisions = []
    if proof['next_opportunity'] == 'selected_normal_pass':
        original = next(x for x in json.loads(normal_proofs.OUTPUT.read_bytes())['results']
                        if x['path_id'] == row['path_id'])
        if proof['candidate_ids'] != ['pass'] or proof['source_candidate_ids'] != original['candidate_ids'] or \
                proof['priority_comparison']['winner'] != 'left':
            raise ValueError('176 normal priority proof differs')
        detail = next(x for x in original['legal_candidate_details'] if x['action_type'] == 'pass')
        decision = {'decision_kind': 'normal_action', 'resolution_mode': 'priority_unique',
                    'reason_code': 'time_balance', 'strategic_unresolved': False,
                    'legal_candidates': original['candidate_ids'], 'candidate_set_complete': True,
                    'selected_candidate': 'pass', 'runner_up_candidates':
                        [x for x in original['candidate_ids'] if x != 'pass'],
                    'seed_context': None, 'seed_proof': None,
                    'priority_comparison': copy.deepcopy(proof['priority_comparison']),
                    'selected_action': copy.deepcopy(detail),
                    'legal_candidate_details': copy.deepcopy(original['legal_candidate_details']),
                    'pre_game_state_sha256': row['final_game_state_sha256'],
                    'pre_continuation_state_sha256': row['final_continuation_state_sha256'],
                    'event_seq': row['last_valid_event_seq']}
        after, generated = normal.transition(state, decision, {'candidate_table':
            normal_proofs.normal.normal.candidate.load_inputs()['candidate_table']})
        normal._verify_step(state, after, generated)
        event = {k: copy.deepcopy(v) for k, v in generated[0].items() if k != '_snapshot_after'}
        decisions = [decision]; reason = 'unproved_turn_end_response_candidates'
    elif proof['next_opportunity'] == 'response_window':
        ctx = state['response_context']; actor = ctx['priority_actor']
        projected = copy.deepcopy(state)
        for excluded in proof['excluded_current_sources']:
            source = excluded['source_instance_id']; card_id = excluded['card_id']
            if projected['game_state']['cards'][source]['card_id'] != card_id:
                raise ValueError('176 response exclusion identity differs')
            player = projected['game_state']['players'][actor]
            if source in player['hand']: player['hand'].remove(source)
            elif source in player['board']['companions']: player['board']['companions'].remove(source)
            elif player['board']['partner'] == source:
                player['board']['partner'] = None; player['board']['partner_stage'] = None
            else: raise ValueError('176 excluded source zone differs')
        projected['response_context']['window_kind'] = 'turn_start'
        projected['game_state']['phase'] = 'response_window'
        chance = start.enumerate_opportunity(projected, actor, start.load_candidate_rows())
        if chance['legal_candidate_ids'] != proof['candidate_ids'] or \
                proof['candidate_ids'] != ['response-pass'] or not chance['candidate_set_complete']:
            raise ValueError('176 post-placement pass proof differs')
        chance['response_context'] = copy.deepcopy(ctx)
        order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
        decision = response.resolve_response_choice({'order_id': order, 'actor_turn_index': 1,
            'round': state['game_state']['round']}, chance)
        if decision['selected_candidate'] != 'response-pass' or decision['resolution_mode'] != 'response_unique':
            raise ValueError('176 response pass choice differs')
        decision['pre_game_state_sha256'] = row['final_game_state_sha256']
        decision['pre_continuation_state_sha256'] = row['final_continuation_state_sha256']
        decision['event_seq'] = row['last_valid_event_seq']
        after, event = response.apply_response_pass(state, decision)
        event.pop('_snapshot_after', None)
        normal._verify_step(state, after, [event])
        if after['response_context']['consecutive_passes'] != 1:
            raise ValueError('176 first post-placement pass differs')
        decisions = [decision]; reason = 'unproved_next_priority_response_candidates'
    elif proof['next_opportunity'] == 'resolve_item':
        after, event = resolve_item(state, proof)
        reason = 'unproved_post_resolution_normal_action_candidates'
    else:
        raise ValueError('176 unclassified current opportunity')
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': after['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256': after['continuation_state_sha256'],
            'final_continuation_state': start._payload(after), 'stop_reason_code': reason,
            'new_decisions': decisions, 'new_events': [event], 'new_snapshots': [snapshot(after)],
            'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        row = next(x for x in load_states() if x['path_id'] == result['path_id'])
        proof = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        if result != run_route(row, proof) or result['last_valid_event_seq'] != row['last_valid_event_seq'] + 1:
            return ['176 independent replay differs']
        event = result['new_events'][0]; snap = result['new_snapshots'][0]
        if event['seq'] != result['last_valid_event_seq'] or \
                event['game_state_before_sha256'] != row['final_game_state_sha256'] or \
                event['continuation_state_before_sha256'] != row['final_continuation_state_sha256'] or \
                event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                start.opening._stop_state_sha256(snap['game_state']) != result['final_game_state_sha256'] or \
                start.canonical_sha256(snap['continuation_state']) != result['final_continuation_state_sha256']:
            return ['176 event/snapshot hash chain differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [run_route(row, proof) for row, proof in zip(load_states(), load_source()['results'])]
    if len(rows) != 4 or any(validate_result(x) for x in rows):
        raise ValueError('176 current restart differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 4, 'completed': 0, 'new_decisions': 3, 'new_events': 4,
            'new_snapshots': 4, 'independent_balance_sample_count': 0, 'results': rows}


def main():
    p = argparse.ArgumentParser(); p.add_argument('--check', action='store_true'); args = p.parse_args()
    raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('176 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('176: 3 passes and 1 item resolution')


if __name__ == '__main__': main()
