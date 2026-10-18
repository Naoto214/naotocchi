#!/usr/bin/env python3
"""Extend verified 162 history through four R2 turn-end boundaries."""

import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_history_162 as prior
import proxy_new_seed_partner_followup_180 as states
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
SOURCE = states.OUTPUT
SOURCE_RAW_SHA256 = '17a4356d448858b990858766f14d94fba6c6b4aad99201f29c0fcbf8e88f89a4'
BASE_RAW_SHA256 = '8642f094b08a2370ffc7653de1201c4909f41e8f2e66faa5f4a2a1f9db8324b2'
OUTPUT = ROOT / 'data/proxy-new-seed-r2-turn-end-history-181-20260925.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_r2_turn_end_history_181.v1'
HISTORY = (
    ('proxy-new-seed-turn-end-restart-164-20260925.json', '20c8b40b5f347cff3a6be7dc3625b1afacef2c422b1f63c551ecd9178d1ec73b'),
    ('proxy-new-seed-egg-restart-165-20260925.json', 'e8e1f3347161b8fd448b08c41960178d1e3cdd38b5c216c52610072e125ee90d'),
    ('proxy-new-seed-start-restart-168-20260925.json', 'bf20012d1ef3d971c681e4e55fe5e9282d7cde9860c0262163900d712175cb77'),
    ('proxy-new-seed-next-response-restart-170-20260925.json', '144be1554384d787a95a1c65d6dc246632c2c0415bd93cf582e1a0cef5c47b56'),
    ('proxy-new-seed-chain-pass-172-20260925.json', 'b1e1bdb35d293a5cf4444e7ccfab397ae0cc8e7e72a19e4603f5b6196837b67b'),
    ('proxy-new-seed-next-restart-174-20260925.json', '4c32524e82a9cf54bac36baf962fc6b988f0a677f78ff130f12b60c9fec1e581'),
    ('proxy-new-seed-current-restart-176-20260925.json', 'fa24f30a0cfe5f688337ccf41be4fdd084494fa39a9da5cd0dedb8b09ad42480'),
    ('proxy-new-seed-followup-restart-178-20260925.json', 'eb0f97d28c895918507471fcd8fdeb6d48cb74496693c909eeb90bf61ed9b57d'),
    ('proxy-new-seed-partner-followup-180-20260925.json', SOURCE_RAW_SHA256),
)
PASSIVE = {'turn_end_completed', 'turn_start_and_egg_draw', 'egg_exchange_bottom',
           'response_pass', 'normal_pass_end_request', 'place_partner'}


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


@lru_cache(maxsize=1)
def load_baseline():
    raw = prior.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != BASE_RAW_SHA256 or raw != prior.canonical_bytes(prior.build_report()):
        raise ValueError('162 protected raw or replay differs')
    result = json.loads(raw)
    if result['schema'] != prior.SCHEMA or any(prior.validate_result(x) for x in result['results']):
        raise ValueError('162 history proof differs')
    return result


@lru_cache(maxsize=1)
def load_history():
    reports = []
    for filename, sha in HISTORY:
        raw = (ROOT / 'data' / filename).read_bytes()
        if hashlib.sha256(raw).hexdigest() != sha:
            raise ValueError('181 protected historical raw differs: ' + filename)
        reports.append(json.loads(raw))
    if SOURCE.read_bytes() != states.canonical_bytes(states.build_report()):
        raise ValueError('180 protected source replay differs')
    if any(states.validate_result(x) for x in reports[-1]['results']):
        raise ValueError('180 final source state/hash differs')
    return reports


def audit_route(baseline, reports):
    path = baseline['path_id']; classified = list(baseline['classified_events'])
    growth = list(baseline['growth_trace'])
    seq = baseline['source_last_valid_event_seq']
    game_sha = baseline['source_game_state_sha256']
    cont_sha = baseline['source_continuation_state_sha256']
    for report in reports:
        row = next(x for x in report['results'] if x['path_id'] == path)
        if (row['source_last_valid_event_seq'], row['source_game_state_sha256'],
                row['source_continuation_state_sha256']) != (seq, game_sha, cont_sha):
            raise ValueError('181 historical artifact boundary differs')
        events = row['new_events']; snaps = row['new_snapshots']
        if len(events) != len(snaps): raise ValueError('181 event/snapshot count differs')
        for event, snap in zip(events, snaps):
            next_seq = seq + 1
            if event['seq'] != next_seq or snap['event_seq'] != next_seq or \
                    event['game_state_before_sha256'] != game_sha or \
                    event['continuation_state_before_sha256'] != cont_sha or \
                    event['game_state_after_sha256'] != snap['game_state_sha256'] or \
                    event['continuation_state_after_sha256'] != snap['continuation_state_sha256'] or \
                    start.opening._stop_state_sha256(snap['game_state']) != snap['game_state_sha256'] or \
                    start.canonical_sha256(snap['continuation_state']) != snap['continuation_state_sha256']:
                raise ValueError('181 historical event/state/hash chain differs')
            game = snap['game_state']; continuation = snap['continuation_state']
            if any(game['players'][a]['reservations'] for a in 'AB') or continuation['pending_triggers']:
                raise ValueError('181 historical reservation or pending trigger needs proof')
            before = growth[-1]['growth']; after = {a: game['players'][a]['growth'] for a in 'AB'}
            kind = event['action_type']
            if kind in PASSIVE:
                if before != after: raise ValueError('181 passive action changed growth')
                if kind == 'place_partner':
                    card_id = game['cards'][event['source_instance_id']]['card_id']
                    if card_id not in ('P-cat_ceo', 'P-cliff_goat'):
                        raise ValueError('181 unproved new partner placement')
                    if card_id == 'P-cat_ceo':
                        section = (ROOT / '66-relationship-start-and-romance-profile.md').read_text()
                        if game['players'][event['actor']]['board']['main'] is not None or \
                                'たまご中は元の関係を保ち、こいびとの能力を無効に' not in section:
                            raise ValueError('181 P-cat_ceo egg suppression differs')
                        reference = '66-relationship-start-and-romance-profile.md'
                    else: reference = '74-partner-18-card-text-draft.md#P-cliff_goat'
                else: reference = '01-core-rules.md' if kind.startswith(('turn_', 'egg_')) else \
                                  '119-response-window-contract.md'
            elif kind == 'activate_response':
                if before != after or not continuation['activation_zone']:
                    raise ValueError('181 response activation differs')
                reference = '119-response-window-contract.md'
            elif kind == 'resolve_item':
                added = event['result']['growth_added']; actor = event['actor']
                if added not in (0, 5) or after[actor] != before[actor] + added or \
                        any(after[a] != before[a] for a in 'AB' if a != actor):
                    raise ValueError('181 item resolution growth differs')
                reference = '77-current-items-card-text-draft.md#I-c_coin2'
            else: raise ValueError('181 unclassified historical event: ' + kind)
            classified.append({'seq': next_seq, 'action_type': kind, 'source_reference': reference,
                               'growth_delta': {a: after[a] - before[a] for a in 'AB'}})
            growth.append({'event_seq': next_seq, 'growth': after})
            seq = next_seq; game_sha = snap['game_state_sha256']; cont_sha = snap['continuation_state_sha256']
        if (row['last_valid_event_seq'], row['final_game_state_sha256'],
                row['final_continuation_state_sha256']) != (seq, game_sha, cont_sha):
            raise ValueError('181 historical artifact final state differs')
    final = next(x for x in reports[-1]['results'] if x['path_id'] == path)
    state = final['final_continuation_state']
    if state['game_state']['phase'] not in ('turn_end', 'turn_end_response') or \
            state['return_target'] != 'turn_end' or \
            state['activation_zone'] or state['pending_triggers'] or \
            any(value >= 100 for point in growth for value in point['growth'].values()):
        raise ValueError('181 current turn-end/victory boundary differs')
    return {'path_id': path, 'source_last_valid_event_seq': seq,
            'source_game_state_sha256': game_sha,
            'source_continuation_state_sha256': cont_sha,
            'current_phase': state['game_state']['phase'],
            'classified_events': classified, 'growth_trace': growth,
            'growth_reach_100': [], 'active_expiring_effects': [], 'unresolved_codes': [],
            'new_events': 0, 'completed': False, 'balance_sample_count': 0}


def validate_result(result):
    try:
        baseline = next(x for x in load_baseline()['results'] if x['path_id'] == result['path_id'])
        return [] if result == audit_route(baseline, load_history()) else ['181 independent history differs']
    except (ValueError, KeyError, TypeError, StopIteration) as error:
        return [str(error)]


def build_report():
    history = load_history(); rows = [audit_route(x, history) for x in load_baseline()['results']]
    if len(rows) != 4 or any(validate_result(row) for row in rows):
        raise ValueError('181 R2 turn end history differs')
    return {'schema': SCHEMA, 'source_raw_sha256': SOURCE_RAW_SHA256,
            'baseline_raw_sha256': BASE_RAW_SHA256, 'planned': 4, 'completed': 0,
            'new_events': 0, 'independent_balance_sample_count': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    args = parser.parse_args(); raw = canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('181 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('181: 4 full event/hash/growth histories, 2 turn ends and 2 pending responses')


if __name__ == '__main__': main()
