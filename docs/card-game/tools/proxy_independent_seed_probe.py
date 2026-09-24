#!/usr/bin/env python3
"""Small new-shuffle probe; halt before an unproved post-exchange response."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

import proxy_normal_decision_first_choice_audit as shuffle_115
import proxy_normal_decision_seeded_restart as opening_117
from proxy_normal_decision_fallback_contract import validate_seeded_resolution
from proxy_record_validator import canonical_sha256


DATA = Path(__file__).resolve().parents[1] / 'data'
SOURCE = opening_117._INPUT_FILES['source']
OLD_SEEDS = {(player['player_id'], player['seed'])
             for order in opening_117.load_inputs()['first_choice_plan']['orders']
             for player in order['players']}
SEED_ORDERS = (
    ('probe-01', {'A': 2026092401, 'B': 2026092402}),
    ('probe-02', {'A': 2026092403, 'B': 2026092404}),
)
OUTPUT = 'proxy-independent-seed-probe-20260924.json'


def load_source(data_dir=DATA):
    return json.loads((Path(data_dir) / SOURCE).read_text(encoding='utf-8'))


def _identities(cards):
    return {(x['card_copy_id'], x['card_id'], x['initial_instance_id']) for x in cards}


def build_manifest(source):
    originals = {p['player_id']: p['deck_order_top_to_bottom'] for p in source['input']['players']}
    if set(originals) != {'A', 'B'} or any(len(cards) != 40 or len(_identities(cards)) != 40
                                               for cards in originals.values()):
        raise ValueError('107 source decks differ')
    routes = []
    for order_id, seeds in SEED_ORDERS:
        players = [{'player_id': who, 'seed': seeds[who],
                    'deck_order_top_to_bottom': shuffle_115.shuffle_deck(originals[who], seeds[who])}
                   for who in ('A', 'B')]
        if any((p['player_id'], p['seed']) in OLD_SEEDS or
               _identities(p['deck_order_top_to_bottom']) != _identities(originals[p['player_id']])
               for p in players):
            raise ValueError('probe seed or card identity differs')
        for first in ('A', 'B'):
            routes.append({'path_id': f'{order_id}-{first.lower()}-first',
                           'order_id': order_id, 'first_player': first,
                           'players': copy.deepcopy(players)})
    return {'schema': 'naotocchi.card_game.independent_seed_probe_manifest.v1',
            'source_fixture': SOURCE, 'source_sha256': canonical_sha256(source),
            'shuffle_algorithm': 'random.Random(seed).shuffle',
            'seed_orders': [{'order_id': order, 'shuffle_seed_by_player': seeds}
                            for order, seeds in SEED_ORDERS], 'routes': routes}


def _check_route(route):
    if not isinstance(route, dict) or set(route) != {'path_id', 'order_id', 'first_player', 'players'}:
        raise ValueError('route manifest keys differ')
    order_id, first = route['order_id'], route['first_player']
    if not isinstance(order_id, str) or not order_id or first not in ('A', 'B') or \
            route['path_id'] != f'{order_id}-{first.lower()}-first':
        raise ValueError('route identifier or first player differs')
    players = route['players']
    if not isinstance(players, list) or [p.get('player_id') for p in players
                                          if isinstance(p, dict)] != ['A', 'B']:
        raise ValueError('route must contain A and B in source order')
    original = {p['player_id']: p['deck_order_top_to_bottom']
                for p in load_source()['input']['players']}
    seeds = []
    for player in players:
        who, seed = player['player_id'], player.get('seed')
        if set(player) != {'player_id', 'seed', 'deck_order_top_to_bottom'} or \
                type(seed) is not int or seed < 0 or (who, seed) in OLD_SEEDS:
            raise ValueError('new seed manifest fields differ')
        cards = player['deck_order_top_to_bottom']
        if not opening_117._json_equal(cards, shuffle_115.shuffle_deck(original[who], seed)) or \
                len(cards) != 40 or _identities(cards) != _identities(original[who]):
            raise ValueError('deck differs from independently regenerated shuffle and source cards')
        seeds.append(seed)
    if len(set(seeds)) != 2:
        raise ValueError('seed must be distinct across players')


def run_route(route):
    _check_route(route)
    state = opening_117.build_initial_state(route)
    integrity = opening_117._stop_state_integrity_errors(state)
    if integrity:
        raise ValueError('; '.join(integrity))
    snapshots = [{'seq': 0, 'state_sha256': opening_117._stop_state_sha256(state),
                  'state': opening_117._canonical_stop_state(state)}]
    evidence = {'events': [], 'snapshots': snapshots, 'decisions': []}
    actor = route['first_player']
    state.update(round=1, turn_player=actor, phase='egg_exchange_choice')
    player = state['players'][actor]
    player['time'] = 1
    player['hand'].extend(player['deck'][:2])
    del player['deck'][:2]
    opening_117._append_replay_event(evidence, state, 'turn_start_and_egg_draw', actor)
    owner_view = opening_117._owner_state(state, actor)
    public_view = opening_117._public_information(state, actor)
    decision = opening_117.build_mandatory_choice_decision(
        route, actor, 1, 1, [state['cards'][instance] for instance in player['hand']])
    errors = (validate_seeded_resolution(decision) +
              opening_117.validate_decision_bridge(decision, opening_117.load_inputs()['candidate_table']) +
              opening_117.validate_pre_decision_state(owner_view) +
              opening_117.validate_public_information(public_view))
    if errors:
        raise ValueError('; '.join(errors))
    selected = decision['selected_action']['initial_instance_id']
    if selected not in player['hand']:
        raise ValueError('seeded choice not in actor hand')
    player['hand'].remove(selected)
    player['deck'].append(selected)
    # No existing proof establishes the next response candidate set for arbitrary new orders.
    state['phase'] = 'response_window'
    integrity = opening_117._stop_state_integrity_errors(state)
    if integrity:
        raise ValueError('; '.join(integrity))
    opening_117._append_replay_event(evidence, state, 'egg_exchange_bottom', actor,
                                     f'{route["path_id"]}-r1-egg', selected,
                                     {'time': 0, 'hand_to_discard': [], 'prepared_to_discard': [],
                                      'deck_to_bottom': [selected]})
    decision.update(pre_decision_state=owner_view, public_information=public_view,
                    event_seq=2, pre_state_sha256=evidence['events'][0]['state_after_sha256'])
    evidence['decisions'].append(decision)
    return {'schema': 'naotocchi.card_game.independent_seed_probe_result.v1',
            'path_id': route['path_id'], 'order_id': route['order_id'],
            'first_player': actor, 'status': 'stopped_rules_adjudication',
            'stop_reason_code': 'unproved_post_egg_response_window',
            'stop_phase': state['phase'], 'last_valid_event_seq': 2,
            'final_state_sha256': opening_117._stop_state_sha256(state),
            'final_state': copy.deepcopy(state), 'decisions': evidence['decisions'],
            'events': evidence['events'], 'snapshots': evidence['snapshots'],
            'winner': None, 'balance_sample_count': 0, 'seeded_fallback_used': True}


def validate_route(result, route):
    try:
        expected = run_route(route)
    except (KeyError, ValueError, TypeError) as error:
        return [str(error)]
    return [] if opening_117._json_equal(result, expected) else ['probe route differs from canonical replay']


def expected_bytes():
    manifest = build_manifest(load_source())
    results = [run_route(route) for route in manifest['routes']]
    report = {'schema': 'naotocchi.card_game.independent_seed_probe.v1',
              'manifest': manifest, 'planned': len(results), 'completed': 0,
              'rules_stop': len(results), 'independent_balance_sample_count': 0,
              'results': results}
    return (json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    target = DATA / OUTPUT
    raw = expected_bytes()
    if args.check:
        if not target.exists() or target.read_bytes() != raw:
            raise SystemExit('independent-seed probe JSON differs')
    else:
        target.write_bytes(raw)
    print(f'{OUTPUT}: 4 planned, 0 completed, 4 rules stops, 0 balance samples')


if __name__ == '__main__':
    main()
