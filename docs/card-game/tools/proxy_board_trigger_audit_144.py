#!/usr/bin/env python3
"""Prove board triggered ability exclusions at the current response event."""

import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_next_opportunities_143 as prior
import proxy_hit_blow_response_142 as states


ROOT = Path(__file__).resolve().parents[1]
SOURCE = prior.OUTPUT
SOURCE_RAW_SHA256 = '19a2a21d45d9304a8c1cdd1a98859254d5cdda4973dded2b67b6e3d72c4cd8b4'
OUTPUT = ROOT / 'data/proxy-board-trigger-audit-144-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_board_trigger_audit.v1'
TRIGGERS = {
    'C-chicken': ('turn_start', '自分のターン開始時に発動できる', '後から登場して同じ開始へ遡らない'),
    'C-bat': ('opponent_quick_use', '相手のターンに、自分が「すぐつかう」でカードをプレイした時',
              'しかけ済み札の発動は新しいすぐつかうではない'),
}


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def matches(card_id, window_kind, owner, turn_player, origin_action, origin_actor):
    if card_id not in TRIGGERS:
        raise ValueError('board trigger has no registered source evidence')
    timing = TRIGGERS[card_id][0]
    if timing == 'turn_start':
        return (window_kind == 'turn_start' and owner == turn_player and
                origin_actor == owner and origin_action == 'turn_start')
    if timing == 'opponent_quick_use':
        return (owner != turn_player and origin_actor == owner and
                origin_action in ('use_play', 'use_item', 'use_event'))
    raise ValueError('unclassified board trigger timing')


@lru_cache(maxsize=1)
def load_source():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('143 protected raw or replay differs')
    source = json.loads(raw)
    # 143's in-memory board_sources are tuples; canonical JSON serializes
    # them as arrays. Compare canonical bytes to regenerated 143 source.
    if source['schema'] != prior.SCHEMA or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('143 source boundaries differ')
    return source


def audit_route(row):
    if row['candidate_set_complete']:
        return {'path_id': row['path_id'], 'source_game_state_sha256': row['source_game_state_sha256'],
                'source_continuation_state_sha256': row['source_continuation_state_sha256'],
                'candidate_ids': row['candidate_ids'], 'candidate_set_complete': True,
                'board_exclusions': [], 'new_events': 0}
    if row['missing_contract'] != 'board_triggered_response_enumeration' or \
            row['next_opportunity'] != 'hand_only_board_unproved' or \
            row['candidate_ids'] != ['response-pass'] or len(row['board_sources']) != 1:
        raise ValueError('unproved board response family')
    original = next(x for x in states.load_source()['results'] if x['path_id'] == row['path_id'])
    if original['final_game_state_sha256'] != row['source_game_state_sha256'] or \
            original['final_continuation_state_sha256'] != row['source_continuation_state_sha256']:
        raise ValueError('143 board source hash boundary differs')
    continuation = original['final_continuation_state']; game = continuation['game_state']
    ctx = continuation['response_context']; owner = ctx['priority_actor']
    instance, card_id = row['board_sources'][0]
    if instance not in game['players'][owner]['board']['companions'] or \
            game['cards'][instance]['card_id'] != card_id or \
            ctx['origin_event_seq'] != original['last_valid_event_seq']:
        raise ValueError('board source or origin event differs')
    placed = next(x for x in states.load_source()['results'] if x['path_id'] == row['path_id'])
    origin = placed['new_events'][-1]
    if origin['seq'] != ctx['origin_event_seq'] or origin['actor'] != owner or \
            origin['source_instance_id'] != instance or origin['action_type'] != 'place_companion':
        raise ValueError('current placement event differs')
    timing, *fragments = TRIGGERS[card_id]
    text = (ROOT / '72-companion-26-card-text-draft.md').read_text()
    section = text.split(f'### {card_id} — ', 1)[1].split('\n### ', 1)[0]
    if any(fragment not in section for fragment in fragments) or \
            matches(card_id, ctx['window_kind'], owner, ctx['turn_player'],
                    origin['action_type'], origin['actor']):
        raise ValueError('board ability trigger not excluded by current event')
    return {'path_id': row['path_id'], 'source_game_state_sha256': row['source_game_state_sha256'],
            'source_continuation_state_sha256': row['source_continuation_state_sha256'],
            'candidate_ids': row['candidate_ids'], 'candidate_set_complete': True,
            'board_exclusions': [{'source_instance_id': instance, 'card_id': card_id,
                'reason_code': 'trigger_condition_not_met', 'timing_class': timing,
                'source_reference': f'72-companion-26-card-text-draft.md#{card_id}'}],
            'new_events': 0}


def validate_result(row):
    try:
        origin = next(x for x in load_source()['results'] if x['path_id'] == row['path_id'])
        return [] if row == audit_route(origin) else ['144 independent board audit differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    rows = [audit_route(x) for x in load_source()['results']]
    if any(validate_result(x) for x in rows):
        raise ValueError('144 replay differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256, 'planned': 4,
            'completed': 0, 'new_events': 0, 'independent_balance_sample_count': 0,
            'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise SystemExit('144 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('144: 4 complete next opportunity audits, 0 events')


if __name__ == '__main__': main()
