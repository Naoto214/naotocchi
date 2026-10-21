#!/usr/bin/env python3
"""Rebuild the full public growth and effect history at current turn end."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_audit_149 as prior
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '995b631cd6ac853747f141e1458d52ce3d236c2d730a0cf5c83f75c178e564b8'
OUTPUT = ROOT / 'data/proxy-new-seed-turn-end-history-150-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_turn_end_history.v1'
# Each protected artifact is independently checked by its checkpoint builder
# via the 149 -> 148 -> 147 -> 145 -> 141 -> 138 -> 135 source chain.
SOURCES = (
    ('proxy-independent-seed-probe-20260924.json', '1a497209d56f605e474f136777c06a3260b731417ca7940bc361f72850457a6c'),
    ('proxy-start-response-138-20260924.json', '4066a8307eeaeb7b11a473cbbdeba576cfcd2a0335b697ea1b24a7c02d52622c'),
    ('proxy-new-seed-normal-restart-141-20260924.json', '5870424513be6d04660ab6bd0cf7f3fdac23fbb327216dc3d89056c933f7fcbb'),
    ('proxy-new-seed-response-restart-145-20260925.json', '724f12b4bd38dc11bb2d4d672abf5cd753fca8daa110697e4f89499f087a9a8d'),
    ('proxy-new-seed-normal-restart-147-20260925.json', 'a61cde34884118abf5abf399cbc54e724970c981c87508802aec3b9662b3b0f8'),
    ('proxy-new-seed-response-restart-148-20260925.json', '09f5dbbfad0329e35a9ee0b3bd64695c4b5f5ad2520cd8c9cda913faa6635d16'),
)
NO_EFFECT_EVENTS = {'turn_start_and_egg_draw', 'egg_exchange_bottom', 'response_pass',
                    'place_companion', 'normal_pass_end_request'}


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('149 protected raw or replay differs')
    report = json.loads(raw)
    if report['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in report['results']):
        raise ValueError('149 current inventory differs')
    return report


@lru_cache(maxsize=1)
def histories():
    result = []
    for name, sha in SOURCES:
        raw = (ROOT / 'data' / name).read_bytes()
        if hashlib.sha256(raw).hexdigest() != sha:
            raise ValueError('protected historical raw SHA differs: ' + name)
        result.append(json.loads(raw))
    return result


def _row(report, path):
    rows = [x for x in report['results'] if x['path_id'] == path]
    if len(rows) != 1: raise ValueError('missing or duplicate historical route')
    return rows[0]


def audit_route(source):
    path = source['path_id']; rows = [_row(r, path) for r in histories()]
    original = rows[0]
    start.verify_source_route(original)
    snapshots = original['snapshots']; events = list(original['events'])
    if [x['seq'] for x in snapshots] != [0, 1, 2] or [x['seq'] for x in events] != [1, 2]:
        raise ValueError('135 historical opening sequence differs')
    previous = snapshots[0]['state_sha256']; trace = []
    first = snapshots[0]['state']
    for i, snap in enumerate(snapshots):
        if start.opening._stop_state_sha256(snap['state']) != snap['state_sha256']:
            raise ValueError('135 state hash differs')
        if any(snap['state']['players'][a]['reservations'] for a in 'AB'):
            raise ValueError('135 opening reservation needs proof')
        if i and (events[i-1]['state_before_sha256'] != previous or
                  events[i-1]['state_after_sha256'] != snap['state_sha256']):
            raise ValueError('135 opening hash chain differs')
        previous = snap['state_sha256']
        trace.append({'event_seq': i, 'growth': {a: snap['state']['players'][a]['growth'] for a in 'AB'}})
    cont_hash = None
    classified = []
    for step, historical in enumerate(rows[1:], 1):
        changes = historical['events'] if step == 1 else historical['new_events']
        states = historical['snapshots'] if step == 1 else historical['new_snapshots']
        if step == 1:
            if states[0]['event_seq'] != 2 or states[0]['game_state_sha256'] != previous:
                raise ValueError('138 opening handover differs')
            cont_hash = states[0]['continuation_state_sha256']
            states = states[1:]
        if len(changes) != len(states): raise ValueError('event/snapshot count differs')
        for event, snap in zip(changes, states):
            seq = len(events) + 1
            if event['seq'] != seq or snap['event_seq'] != seq or \
                    event['game_state_before_sha256'] != previous or \
                    event['continuation_state_before_sha256'] != cont_hash or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                raise ValueError('historical dual SHA/seq chain differs')
            events.append(event); previous = snap['game_state_sha256']
            cont_hash = snap['continuation_state_sha256']
            game = snap['game_state']; cont = snap['continuation_state']
            if any(game['players'][a]['reservations'] for a in 'AB') or \
                    cont['pending_triggers'] or cont['activation_zone']:
                raise ValueError('historical active effect or reservation needs proof')
            trace.append({'event_seq': seq, 'growth': {a: game['players'][a]['growth'] for a in 'AB'}})
    if previous != source['source_game_state_sha256'] or \
            cont_hash != source['source_continuation_state_sha256'] or \
            len(events) != source['source_last_valid_event_seq'] or \
            trace[-1]['growth'] != {'A': 20, 'B': 20} or \
            any(x['growth'] != trace[0]['growth'] for x in trace):
        raise ValueError('historical growth/final state differs')
    text = (ROOT / '72-companion-26-card-text-draft.md').read_text()
    board = rows[2]['new_events'] if len(rows) > 2 else []
    board_instance = next((x['source_instance_id'] for x in board if x['action_type'] == 'place_companion'), None)
    cards = rows[-1]['final_continuation_state']['game_state']['cards']
    for event in events:
        kind = event['action_type']; reference = '01-core-rules.md' if kind.startswith(('turn_start','egg_')) else '119-response-window-contract.md'
        if kind not in NO_EFFECT_EVENTS:
            raise ValueError('historical event effect requires source classification: ' + kind)
        if kind == 'place_companion':
            instance = event['source_instance_id']; card_id = cards[instance]['card_id']
            if instance != board_instance or card_id not in ('C-chicken','C-bat'):
                raise ValueError('historical placement source differs')
            section = text.split(f'### {card_id} — ', 1)[1].split('\n### ', 1)[0]
            if card_id == 'C-chicken' and '自分のターン開始時に発動できる' not in section or \
                    card_id == 'C-bat' and '相手のターンに、自分が「すぐつかう」でカードをプレイした時' not in section:
                raise ValueError('historical board effect timing differs')
            reference = f'72-companion-26-card-text-draft.md#{card_id}'
        classified.append({'seq': event['seq'], 'action_type': kind, 'source_reference': reference,
                           'effect_duration': 'none_or_future_trigger_only'})
    return {'path_id': path, 'source_last_valid_event_seq': len(events),
            'source_game_state_sha256': previous, 'source_continuation_state_sha256': cont_hash,
            'classified_events': classified, 'growth_trace': trace,
            'growth_reach_100': [], 'active_expiring_effects': [], 'unresolved_codes': [],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        original = next(x for x in load_source()['results'] if x['path_id'] == result['path_id'])
        return [] if result == audit_route(original) else ['150 historical replay differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    results = [audit_route(row) for row in load_source()['results']]
    if len(results) != 3 or any(validate_result(row) for row in results):
        raise ValueError('150 historical provenance differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'planned': 3, 'completed': 0, 'new_events': 0,
            'independent_balance_sample_count': 0, 'results': results}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('150 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('150: 3 historical provenance proofs, 0 events')


if __name__ == '__main__': main()
