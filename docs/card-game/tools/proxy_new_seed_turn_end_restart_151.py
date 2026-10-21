#!/usr/bin/env python3
"""Complete independently proved R1 turn ends and draw the next turn's egg cards."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_history_150 as history
import proxy_new_seed_turn_end_audit_149 as board
import proxy_new_seed_response_restart_148 as prior
import proxy_turn_end_provenance_restart as precedent
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = history.OUTPUT
SOURCE_RAW_SHA256 = 'a7c8c9e5eb7cdb4fa045e70afb06993fb1efe11de369b1a196c9f89242924174'
OUTPUT = ROOT / 'data/proxy-new-seed-turn-end-restart-151-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_turn_end_restart.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != history.canonical_bytes(history.build_report()):
        raise ValueError('150 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != history.SCHEMA or any(history.validate_result(x) for x in result['results']):
        raise ValueError('150 historical proof differs')
    return result


def current(row):
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('148 source continuation hash differs')
    return state


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def run_route(proof):
    saved = json.loads(prior.OUTPUT.read_bytes())
    if prior.OUTPUT.read_bytes() != prior.canonical_bytes(prior.build_report()):
        raise ValueError('148 protected replay differs')
    row = next(x for x in saved['results'] if x['path_id'] == proof['path_id'])
    if (row['last_valid_event_seq'], row['final_game_state_sha256'],
        row['final_continuation_state_sha256']) != (
        proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
        proof['source_continuation_state_sha256']):
        raise ValueError('150/148 source boundary differs')
    state = current(row); game = state['game_state']; actor = game['turn_player']
    stop = {'path_id': proof['path_id'], 'last_valid_event_seq': row['last_valid_event_seq'],
            'game_state_sha256': row['final_game_state_sha256'],
            'continuation_state_sha256': row['final_continuation_state_sha256'],
            'game_state': game, 'continuation_state': start._payload(state)}
    original_audit = json.loads(board.OUTPUT.read_bytes())
    if board.OUTPUT.read_bytes() != board.canonical_bytes(board.build_report()):
        raise ValueError('149 protected replay differs')
    origin = history.audit_route(next(x for x in original_audit['results'] if x['path_id'] == proof['path_id']))
    if origin != proof: raise ValueError('150 current history differs')
    provenance = {**proof, 'source_event_seq': proof['source_last_valid_event_seq']}
    with board.board_timing_scope():
        audit = precedent.audit_current_turn_end(stop, provenance)
    if not audit['turn_end_set_complete'] or audit['contract_stop_codes'] or any(
            not flag for flag in audit['completeness_checks'].values()):
        raise ValueError('151 current six-stage turn-end inventory incomplete')
    if game['round'] != 1 or any(p['growth'] >= 100 for p in game['players'].values()):
        raise ValueError('151 R1 victory predicate not proved')
    first = next(x for x in start.load_source()['results'] if x['path_id'] == proof['path_id'])['first_player']
    next_actor = 'B' if actor == 'A' else 'A'
    events = []; snapshots = []; internal = []
    after = copy.deepcopy(state)
    after['game_state']['turn_player'] = next_actor
    if actor != first: after['game_state']['round'] += 1
    after['game_state']['phase'] = 'turn_start'; after['return_target'] = None
    precedent._append_transition(state, after, events, internal, 'turn_end_completed', actor)
    normal._verify_step(state, after, [events[-1]])
    snapshots.append(snapshot(after)); state = after
    owner = state['game_state']['players'][next_actor]
    if state['game_state']['round'] != 1 or len(owner['deck']) < 2 or \
            owner['reservations'] or state['pending_triggers'] or state['activation_zone'] or \
            any(owner['board'][key] for key in ('main','partner','world','companions','prepared')):
        raise ValueError('151 next turn start source incomplete')
    after = copy.deepcopy(state)
    player = after['game_state']['players'][next_actor]
    player['time'] = after['game_state']['round']
    player['challenge_used'] = False
    player['person_placed'] = False
    player['relationship_progressed'] = False
    drawn = [player['deck'].pop(0), player['deck'].pop(0)]
    player['hand'].extend(drawn)
    after['game_state']['phase'] = 'egg_exchange_choice'
    precedent._append_transition(state, after, events, internal, 'turn_start_and_egg_draw', next_actor)
    normal._verify_step(state, after, [events[-1]])
    snapshots.append(snapshot(after)); state = after
    return {'path_id': proof['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'last_valid_event_seq': state['last_event_seq'],
            'final_game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'final_continuation_state_sha256': state['continuation_state_sha256'],
            'final_continuation_state': start._payload(state),
            'turn_end_audit': audit, 'drawn_instance_ids': drawn,
            'stop_reason_code': 'unproved_current_egg_exchange_choice',
            'new_decisions': [], 'new_events': events, 'new_snapshots': snapshots,
            'completed': False, 'balance_sample_count': 0}


def validate_result(row):
    try:
        original = next(x for x in load_source()['results'] if x['path_id'] == row['path_id'])
        if row != run_route(original) or row['last_valid_event_seq'] != original['source_last_valid_event_seq'] + 2:
            return ['151 independent replay differs']
        game = original['source_game_state_sha256']; cont = original['source_continuation_state_sha256']
        for index, (event, snap) in enumerate(zip(row['new_events'], row['new_snapshots']), 1):
            if event['seq'] != original['source_last_valid_event_seq'] + index or \
                    event['game_state_before_sha256'] != game or \
                    event['continuation_state_before_sha256'] != cont or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                return ['151 event/snapshot hash chain differs']
            game = event['game_state_after_sha256']; cont = event['continuation_state_after_sha256']
        if game != row['final_game_state_sha256'] or cont != row['final_continuation_state_sha256']:
            return ['151 final hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error: return [str(error)]


def build_report():
    rows = [run_route(x) for x in load_source()['results']]
    if len(rows) != 3 or any(validate_result(row) for row in rows):
        raise ValueError('151 independent turn-end replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 3,
            'completed': 0, 'new_decisions': 0, 'new_events': 6, 'new_snapshots': 6,
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('151 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('151: 3 turn-end transitions and next-turn draws, 6 events')


if __name__ == '__main__': main()
