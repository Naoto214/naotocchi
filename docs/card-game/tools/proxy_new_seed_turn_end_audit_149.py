#!/usr/bin/env python3
"""Audit turn-end board source timing against the protected current states."""

import argparse
import copy
import hashlib
import json
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_response_restart_148 as prior
import proxy_turn_end_completeness as turn_end
import proxy_board_trigger_audit_144 as trigger

ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '09f5dbbfad0329e35a9ee0b3bd64695c4b5f5ad2520cd8c9cda913faa6635d16'
OUTPUT = ROOT / 'data/proxy-new-seed-turn-end-audit-149-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_turn_end_audit.v1'


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('148 protected raw or replay differs')
    report = json.loads(raw)
    if report['schema'] != prior.SCHEMA or any(prior.validate_result(row) for row in report['results']):
        raise ValueError('148 state and hash chain differs')
    return report


@contextmanager
def board_timing_scope():
    registry = turn_end.BOARD_REGISTRY
    old = {card: registry.get(card) for card in trigger.TRIGGERS}
    try:
        body = (ROOT / '72-companion-26-card-text-draft.md').read_text()
        for card, (timing, *fragments) in trigger.TRIGGERS.items():
            section = body.split(f'### {card} — ', 1)[1].split('\n### ', 1)[0]
            if any(fragment not in section for fragment in fragments) or timing not in ('turn_start', 'opponent_quick_use'):
                raise ValueError('149 board trigger source text differs')
            classification = (f'{timing}_not_turn_end', f'72-companion-26-card-text-draft.md#{card}')
            if old[card] is not None and old[card] != classification:
                raise ValueError('149 board timing classification conflicts')
            registry[card] = classification
        yield
    finally:
        for card, value in old.items():
            if value is None: registry.pop(card, None)
            else: registry[card] = value


def audit_route(row):
    state = row['final_continuation_state']; game = state['game_state']
    if game['phase'] != 'turn_end' or state['return_target'] != 'turn_end':
        raise ValueError('149 source not closed turn end')
    stop = {'path_id': row['path_id'], 'last_valid_event_seq': row['last_valid_event_seq'],
            'game_state_sha256': row['final_game_state_sha256'],
            'continuation_state_sha256': row['final_continuation_state_sha256'],
            'game_state': game, 'continuation_state': state}
    with board_timing_scope():
        result = turn_end.enumerate_turn_end(stop)
    units = result['stage_inventory'][2]['units']
    if any(unit['disposition'] != 'excluded' for unit in units) or \
            not result['completeness_checks']['closed_response_window_valid'] or \
            'missing_turn_end_source_classification' in result['contract_stop_codes']:
        raise ValueError('149 current board sources not fully classified')
    return {'path_id': row['path_id'], 'source_last_valid_event_seq': row['last_valid_event_seq'],
            'source_game_state_sha256': row['final_game_state_sha256'],
            'source_continuation_state_sha256': row['final_continuation_state_sha256'],
            'excluded_board_cards': [unit['card_id'] for unit in units],
            'contract_stop_codes': result['contract_stop_codes'],
            'stage_inventory': copy.deepcopy(result['stage_inventory']),
            'completeness_checks': result['completeness_checks'],
            'turn_end_set_complete': result['turn_end_set_complete'],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}


def validate_result(row):
    try:
        original = next(x for x in load_source()['results'] if x['path_id'] == row['path_id'])
        return [] if row == audit_route(original) else ['149 independent current inventory differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [audit_route(row) for row in load_source()['results']
            if row['final_continuation_state']['game_state']['phase'] == 'turn_end']
    if len(rows) != 3 or any(validate_result(row) for row in rows):
        raise ValueError('149 independent turn-end inventory differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 3,
            'completed': 0, 'new_events': 0, 'independent_balance_sample_count': 0,
            'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('149 saved canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('149: 3 turn-end inventories, 0 events')


if __name__ == '__main__': main()
