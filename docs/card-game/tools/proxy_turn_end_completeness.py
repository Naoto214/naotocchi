#!/usr/bin/env python3
"""Checkpoint 123: read-only proof of a turn-end source inventory."""
from __future__ import annotations

import hashlib
import json
import argparse
from pathlib import Path

import proxy_response_window_seeded_restart as response_120

DATA = Path(__file__).resolve().parents[1] / 'data'
CONTRACT_FILE = 'proxy-turn-end-completeness-contract-123-20260923.json'
AUDIT_FILE = 'proxy-turn-end-completeness-audit-123-20260923.json'
EXPECTED_RAW = {
    'order-01-a-first': '99ec72b8219d30a7db43daddaecd2bb4672cf9b75fc966fa89823d9013cc1150',
    'order-01-b-first': 'c1c4054673fa5ceca6925d40126545f0bd55bd03bbcad18aac7c68e2d03df8d5',
    'order-02-a-first': '95709ff4b6061beca59738e3d42d9b09ba9f4b26e68dbf78bf987ad81f25649f',
    'order-02-b-first': 'c89273717a1214a36d74de214409badecdcca91a7693df84625389b320218799',
}
STAGES = (
    'closed_end_request', 'due_reservations', 'end_triggers_and_responses',
    'expiring_effects', 'expiration_triggers', 'victory_and_next_turn',
)
CHECKS = (
    'source_artifact_integrity_valid', 'closed_response_window_valid',
    'six_stage_inventory_present', 'reservation_order_resolved',
    'trigger_information_boundary_valid', 'expiration_boundary_resolved',
    'expiration_trigger_inventory_complete', 'victory_history_sufficient',
    'source_dispositions_explained', 'transition_handlers_proven',
    'enumeration_ids_unique', 'source_projection_exact',
)
STOPS = (
    'turn_end_window_not_closed', 'missing_turn_end_source_classification',
    'unresolved_reservation_due_time', 'unresolved_end_trigger',
    'unresolved_expiration', 'missing_growth_reach_history',
    'unresolved_victory_predicate', 'forbidden_information_required',
    'missing_transition_handler',
)
BOARD_REGISTRY = {
    'P-cat_ceo': ('past_trigger', '74-partner-18-card-text-draft.md#P-cat_ceo'),
    'C-chameleon': ('continuous', '72-companion-26-card-text-draft.md#C-chameleon'),
}


def verify_source(stop: dict, raw: bytes, expected_sha: str) -> None:
    if hashlib.sha256(raw).hexdigest() != expected_sha:
        raise ValueError('122 stop raw bytes differ')
    if json.loads(raw) != stop:
        raise ValueError('122 stop differs from protected raw bytes')
    if stop['schema'] != 'naotocchi.card_game.proxy_normal_action_stop.v1' or stop['checkpoint'] != 122:
        raise ValueError('122 schema differs')
    game = stop['game_state']
    continuation = stop['continuation_state']
    if game != continuation['game_state'] or \
            response_120.game_state_sha256(game) != stop['game_state_sha256'] or \
            response_120.continuation_state_sha256(continuation) != stop['continuation_state_sha256']:
        raise ValueError('122 state hashes differ')
    expected_seq = 9 if stop['path_id'] == 'order-01-a-first' else 7
    if stop['last_valid_event_seq'] != expected_seq or stop['status'] != 'stopped_rules_adjudication':
        raise ValueError('122 event sequence or status differs')
    instances = game['cards']
    for player in game['players'].values():
        board = player['board']
        ids = player['hand'] + player['deck'] + player['discard'] + board['companions'] + board['prepared']
        ids += [value for value in (board['main'], board['partner'], board['world']) if value is not None]
        if any(i not in instances or instances[i]['initial_instance_id'] != i for i in ids):
            raise ValueError('122 instance mapping differs')


def load_inputs(data_dir: Path = DATA) -> dict:
    result = {}
    for path, expected_sha in EXPECTED_RAW.items():
        raw = (data_dir/'proxy-normal-action-stops-122'/f'stop-122-{path}.json').read_bytes()
        stop = json.loads(raw)
        if stop['path_id'] != path:
            raise ValueError('122 path id differs')
        verify_source(stop, raw, expected_sha)
        result[path] = (stop, raw)
    return result


def _unit(stage: int, zone: str, instance: str, card: str | None,
          timing: str, disposition: str, evidence: dict, reference: str) -> dict:
    identity = [stage, zone, instance, timing, evidence.get('event_seq'),
                evidence.get('turn_period'), sorted(evidence.get('target_instance_ids', []))]
    name = hashlib.sha256(json.dumps(identity, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    return {'enumeration_unit_id': name, 'source_zone': zone,
            'source_instance_id': instance, 'card_id': card, 'timing': timing,
            'disposition': disposition, 'evidence': evidence,
            'source_references': [reference]}


def enumerate_turn_end(stop: dict) -> dict:
    """Classify current sources; unknown provenance is never treated as empty."""
    state = stop['game_state']
    cont = stop['continuation_state']
    actor = state['turn_player']
    ctx = cont['response_context']
    closed = (state['phase'] == 'turn_end' and cont['return_target'] == 'turn_end'
              and ctx['chain_status'] == 'empty' and ctx['chain_links'] == []
              and ctx['consecutive_passes'] == 2 and ctx['turn_player'] == actor
              and ctx['window_kind'] == 'after_normal_action')
    stops = set()
    if not closed:
        stops.add('turn_end_window_not_closed')
    inventory = [dict(stage=i, stage_name=name, units=[], empty_reason=None,
                      state_fields=[], source_references=['06-action-chain-checkpoint.md#ターン終了',
                                                         '64-turn-boundaries-and-victory-timing.md#終了順と期限'])
                 for i, name in enumerate(STAGES, 1)]
    inventory[0]['state_fields'] = ['game_state.phase', 'continuation_state.response_context',
                                    'continuation_state.return_target']
    inventory[0]['empty_reason'] = 'closed_empty_response_window' if closed else None
    inventory[1]['state_fields'] = ['game_state.players.*.reservations']
    for owner, player in state['players'].items():
        for reservation in player['reservations']:
            if not isinstance(reservation, dict):
                raise ValueError('reservation schema differs')
            instance = reservation.get('source_instance_id')
            if not isinstance(instance, str):
                raise ValueError('reservation source instance ID missing')
            timing = reservation.get('timing')
            if timing not in ('turn_end', 'next_turn_start', 'next_own_turn_end'):
                stops.add('unresolved_reservation_due_time')
            inventory[1]['units'].append(_unit(2, f'{owner}.reservations', instance, None,
                str(timing), 'unknown', {'owner':owner, 'reservation':reservation},
                '06-action-chain-checkpoint.md#適用済み予約の自動実行'))
            stops.add('missing_transition_handler')
    if not inventory[1]['units']:
        inventory[1]['empty_reason'] = 'both_reservation_lists_empty'
    inventory[2]['state_fields'] = ['game_state.players.*.board', 'game_state.cards',
                                    'continuation_state.pending_triggers',
                                    'continuation_state.activation_zone']
    if cont['pending_triggers'] or cont['activation_zone']:
        stops.add('unresolved_end_trigger')
    for owner, player in state['players'].items():
        board = player['board']
        for zone in ('main', 'partner', 'world'):
            instance = board[zone]
            if instance:
                _board_source(inventory[2]['units'], stops, state, owner, zone, instance)
        for zone in ('companions', 'prepared'):
            for instance in board[zone]:
                _board_source(inventory[2]['units'], stops, state, owner, zone, instance)
    if not cont['pending_triggers'] and not cont['activation_zone'] and \
            all(u['disposition'] == 'excluded' for u in inventory[2]['units']):
        inventory[2]['empty_reason'] = 'no_due_public_board_trigger'
    inventory[3]['state_fields'] = ['game_state.players.*.reservations',
                                    'public_effect_provenance']
    inventory[4]['state_fields'] = ['expired_effect_trigger_provenance']
    inventory[5]['state_fields'] = ['game_state.round', 'game_state.players.*.growth',
                                    'growth_reach_and_interruption_history']
    # The 122 continuation schema records neither active-effect lifetimes nor
    # the 100-reach/interruption history. Absence of a field is not absence
    # of the effects. Do not infer these from the four path identifiers.
    for i in (3, 4, 5):
        inventory[i]['empty_reason'] = 'source_provenance_unavailable'
    stops.update(('unresolved_expiration', 'missing_growth_reach_history'))
    if inventory[2]['empty_reason'] is None:
        stops.add('unresolved_end_trigger')
    checks = {name: False for name in CHECKS}
    checks['source_artifact_integrity_valid'] = True  # verified by load_inputs
    checks['closed_response_window_valid'] = closed
    checks['six_stage_inventory_present'] = True
    checks['reservation_order_resolved'] = not inventory[1]['units']
    checks['trigger_information_boundary_valid'] = False
    checks['source_dispositions_explained'] = not any(u['disposition']=='unknown'
                                                   for s in inventory for u in s['units'])
    ids = [u['enumeration_unit_id'] for s in inventory for u in s['units']]
    checks['enumeration_ids_unique'] = len(ids) == len(set(ids))
    checks['source_projection_exact'] = False
    return {'path_id': stop['path_id'], 'source_stop_sha256': EXPECTED_RAW.get(stop['path_id']),
            'last_valid_event_seq': stop['last_valid_event_seq'],
            'game_state_sha256': stop['game_state_sha256'],
            'continuation_state_sha256': stop['continuation_state_sha256'],
            'stage_inventory': inventory,
            'contract_stop_codes': [s for s in STOPS if s in stops],
            'completeness_checks': checks,
            'turn_end_set_complete': all(checks.values()) and not stops}


def _board_source(units: list, stops: set, state: dict, owner: str,
                  zone: str, instance: str) -> None:
    card = state['cards'][instance]['card_id']
    classification = BOARD_REGISTRY.get(card)
    if classification is None:
        stops.add('missing_turn_end_source_classification')
    timing, ref = classification or ('unknown', '06-action-chain-checkpoint.md#ターン終了')
    units.append(_unit(3, f'{owner}.board.{zone}', instance, card, timing,
                       'excluded' if classification else 'unknown',
                       {'owner':owner, 'card_id':card,
                        'predicate':'not_an_end_trigger' if classification else 'unresolved'}, ref))


def validate_turn_end(audit: dict, stop: dict, raw: bytes) -> list[str]:
    """Re-enumerate from current state instead of trusting saved completeness."""
    expected_sha = EXPECTED_RAW[stop['path_id']]
    verify_source(stop, raw, expected_sha)
    expected = enumerate_turn_end(stop)
    if not isinstance(audit, dict) or list(audit) != list(expected):
        return ['audit schema or key order differs']
    return [f'{key} differs from independent source enumeration'
            for key, value in expected.items() if audit[key] != value]


def build_contract() -> dict:
    return {
        'schema': 'naotocchi.card_game.proxy_turn_end_completeness_contract.v1',
        'checkpoint': 123, 'status': 'protocol_only_no_match_progress',
        'source_contracts': ['01-core-rules.md', '06-action-chain-checkpoint.md',
                             '64-turn-boundaries-and-victory-timing.md',
                             '72-companion-26-card-text-draft.md',
                             '74-partner-18-card-text-draft.md',
                             '119-response-window-contract.md',
                             '122-normal-action-seeded-restart.md'],
        'protected_122_raw_sha256': EXPECTED_RAW,
        'information_policy': 'public_and_owner_known_only',
        'stages': [{'stage': i, 'name': name} for i, name in enumerate(STAGES, 1)],
        'board_ability_registry': [
            {'card_id':card, 'classification':classification, 'source_reference':ref}
            for card, (classification, ref) in BOARD_REGISTRY.items()],
        'completeness_requirements': list(CHECKS),
        'contract_stop_codes': list(STOPS),
        'scope': {'planned':0, 'completed':0, 'stopped':0, 'decision':0,
                  'event':0, 'snapshot':0, 'winner':0, 'independent_balance_sample':0},
    }


def build_audits(inputs: dict) -> dict:
    return {'schema': 'naotocchi.card_game.proxy_turn_end_completeness_audit.v1',
            'checkpoint':123, 'status':'protocol_only_no_match_progress',
            'audits':[enumerate_turn_end(stop) for stop, _ in inputs.values()],
            'scope':build_contract()['scope']}


def canonical_bytes(value: dict) -> bytes:
    return json.dumps(value, ensure_ascii=False, indent=2).encode('utf-8') + b'\n'


def _expected_outputs() -> dict:
    inputs = load_inputs()
    audits = build_audits(inputs)
    for audit, (stop, raw) in zip(audits['audits'], inputs.values()):
        errors = validate_turn_end(audit, stop, raw)
        if errors:
            raise ValueError('independent turn-end audit differs: ' + ', '.join(errors))
    return {CONTRACT_FILE: canonical_bytes(build_contract()),
            AUDIT_FILE: canonical_bytes(audits)}


def write_outputs(data_dir: Path = DATA) -> None:
    for filename, raw in _expected_outputs().items():
        (data_dir/filename).write_bytes(raw)


def check_outputs(data_dir: Path = DATA) -> list[str]:
    errors = []
    for filename, raw in _expected_outputs().items():
        path = data_dir/filename
        if not path.is_file() or path.read_bytes() != raw:
            errors.append('canonical bytes differ: ' + filename)
    return errors


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.write:
        write_outputs()
    else:
        problems = check_outputs()
        print(json.dumps({'checkpoint':123, 'canonical_bytes_valid':not problems,
                          'errors':problems}, ensure_ascii=False))
        raise SystemExit(bool(problems))
