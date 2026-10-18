#!/usr/bin/env python3
"""Complete four proved R1 turn ends and draw the next actor's egg cards."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_history_162 as history
import proxy_new_seed_turn_end_audit_163 as board
import proxy_new_seed_end_response_restart_161 as prior
import proxy_board_trigger_audit_144 as triggers
import proxy_turn_end_provenance_restart as precedent
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = board.OUTPUT
SOURCE_RAW_SHA256 = '04bf98ab1287285e07a4a180a21ab4af72fc115a7930598376bcc7a3fd00524c'
OUTPUT = ROOT / 'data/proxy-new-seed-turn-end-restart-164-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_turn_end_restart_164.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != board.canonical_bytes(board.build_report()):
        raise ValueError('163 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != board.SCHEMA or any(board.validate_result(x) for x in result['results']):
        raise ValueError('163 current turn-end proof differs')
    return result


def current(row):
    state = copy.deepcopy(row['final_continuation_state'])
    state.update({'source_event_seq': row['last_valid_event_seq'],
                  'last_event_seq': row['last_valid_event_seq'],
                  'source_game_state_sha256': row['final_game_state_sha256'],
                  'continuation_state_sha256': row['final_continuation_state_sha256']})
    if start._hash(state) != state['continuation_state_sha256']:
        raise ValueError('161 source continuation hash differs')
    return state


def snapshot(state):
    return {'event_seq': state['last_event_seq'], 'game_state': copy.deepcopy(state['game_state']),
            'game_state_sha256': start.opening._stop_state_sha256(state['game_state']),
            'continuation_state': start._payload(state),
            'continuation_state_sha256': state['continuation_state_sha256']}


def run_route(proof):
    saved = json.loads(prior.OUTPUT.read_bytes())
    if prior.OUTPUT.read_bytes() != prior.canonical_bytes(prior.build_report()):
        raise ValueError('161 protected replay differs')
    row = next(x for x in saved['results'] if x['path_id'] == proof['path_id'])
    if (row['last_valid_event_seq'], row['final_game_state_sha256'],
        row['final_continuation_state_sha256']) != (
        proof['source_last_valid_event_seq'], proof['source_game_state_sha256'],
        proof['source_continuation_state_sha256']):
        raise ValueError('163/161 source boundary differs')
    state = current(row); game = state['game_state']; actor = game['turn_player']
    stop = {'path_id': proof['path_id'], 'last_valid_event_seq': row['last_valid_event_seq'],
            'game_state_sha256': row['final_game_state_sha256'],
            'continuation_state_sha256': row['final_continuation_state_sha256'],
            'game_state': game, 'continuation_state': start._payload(state)}
    original_audit = json.loads(board.OUTPUT.read_bytes())
    if board.OUTPUT.read_bytes() != board.canonical_bytes(board.build_report()):
        raise ValueError('163 protected replay differs')
    origin = next(x for x in original_audit['results'] if x['path_id'] == proof['path_id'])
    if origin != proof or not proof['turn_end_set_complete'] or proof['contract_stop_codes'] or \
            not all(proof['completeness_checks'].values()):
        raise ValueError('163 current six-stage turn-end inventory incomplete')
    audit=proof
    if game['round'] != 1 or any(p['growth'] >= 100 for p in game['players'].values()):
        raise ValueError('164 R1 victory predicate not proved')
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
    if state['game_state']['round'] not in (1,2) or len(owner['deck']) < 2 or \
            owner['reservations'] or state['pending_triggers'] or state['activation_zone'] or \
            any(owner['board'][key] for key in ('main','partner','world','prepared')):
        raise ValueError('164 next turn start source incomplete')
    # 01 draws and performs the egg exchange before resolving start triggers.
    # Preserve companions on board until that later response window.
    for instance in owner['board']['companions']:
        card_id=state['game_state']['cards'][instance]['card_id']
        if card_id not in triggers.TRIGGERS:
            raise ValueError('164 companion start trigger not classified')
        _,*fragments=triggers.TRIGGERS[card_id]
        section=(ROOT/'72-companion-26-card-text-draft.md').read_text().split(
            f'### {card_id} — ',1)[1].split('\n### ',1)[0]
        if any(fragment not in section for fragment in fragments):
            raise ValueError('164 companion start trigger source differs')
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
            return ['164 independent replay differs']
        game = original['source_game_state_sha256']; cont = original['source_continuation_state_sha256']
        for index, (event, snap) in enumerate(zip(row['new_events'], row['new_snapshots']), 1):
            if event['seq'] != original['source_last_valid_event_seq'] + index or \
                    event['game_state_before_sha256'] != game or \
                    event['continuation_state_before_sha256'] != cont or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                return ['164 event/snapshot hash chain differs']
            game = event['game_state_after_sha256']; cont = event['continuation_state_after_sha256']
        if game != row['final_game_state_sha256'] or cont != row['final_continuation_state_sha256']:
            return ['164 final hash differs']
        return []
    except (ValueError, KeyError, TypeError, StopIteration) as error: return [str(error)]


def build_report():
    rows = [run_route(x) for x in load_source()['results']]
    if len(rows) != 4 or any(validate_result(row) for row in rows):
        raise ValueError('164 independent turn-end replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 4,
        'completed': 0, 'new_decisions': 0, 'new_events': 8, 'new_snapshots': 8,
            'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('164 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('164: 4 turn-end transitions and next-turn draws, 8 events')


if __name__ == '__main__': main()
