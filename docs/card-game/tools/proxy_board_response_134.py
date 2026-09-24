#!/usr/bin/env python3
"""Checkpoint 134: response-triggered board classification and replay."""
from __future__ import annotations

import copy
import hashlib
import json
from contextlib import contextmanager
from pathlib import Path

import proxy_cross_restart_133 as prior

board_132 = prior.prior
candidate_121 = board_132.candidate_121
response_120 = board_132.response_120
extension_125 = board_132.extension_125
DATA = prior.DATA
SOURCE_FOLDER = prior.STOP_FOLDER
SOURCE_SHA = {
    'order-01-a-first': '636d71feb2230178e38a6c4ae9ddddfd2c7e1a544d29bc879454210e18258ef2',
    'order-01-b-first': 'bf2ba112444a2429ed2fc7dd1b5f38bafff56c821c45aec2b0ff975ba2139326',
}
RESPONSE_BOARD = {
    'C-bat': {
        'kind': 'response_triggered',
        'source_text_reference': '72-companion-26-card-text-draft.md#C-bat',
        'placement_action': 'place_companion',
        'placement_growth_delta': 0,
        'placement_duration': 'none',
        'response_candidate_family': 'triggered_ability',
        'response_timing': 'opponent_turn_after_own_quick_use',
        'independent_normal_action': False,
    },
}
PLAN_FILE = 'proxy-board-response-plan-134-20260923.json'
EVALUATION_FILE = 'proxy-board-response-evaluation-134-20260923.json'
STOP_FOLDER = 'proxy-board-response-results-134'


def load_sources(data_dir: Path = DATA) -> dict:
    earlier = prior.load_sources(data_dir)
    if prior.check_outputs(data_dir, earlier):
        raise ValueError('133 canonical outputs differ')
    stops = {}
    for path, sha in SOURCE_SHA.items():
        raw = (data_dir / SOURCE_FOLDER / f'stop-133-{path}.json').read_bytes()
        if hashlib.sha256(raw).hexdigest() != sha:
            raise ValueError('133 protected raw SHA differs')
        stop = json.loads(raw)
        if stop['path_id'] != path or stop['last_valid_event_seq'] != stop['events'][-1]['seq'] or \
                response_120.game_state_sha256(stop['final_state']['game_state']) != stop['game_state_sha256'] or \
                response_120.continuation_state_sha256(
                    response_120._continuation_payload(stop['final_state'])) != stop['continuation_state_sha256']:
            raise ValueError('133 protected state/hash/event differs')
        stops[path] = stop
    return {
        'stops': stops,
        'candidate_table': earlier['candidate_table'],
        'source_131': earlier['source_131'],
        'source_133': earlier,
    }


def classify_response_triggered(card_id: str, table: dict) -> dict:
    """Prove a board ability belongs to response timing, not normal action."""
    ability = RESPONSE_BOARD.get(card_id)
    if ability is None:
        raise ValueError('unclassified response-triggered board ability')
    filename, separator, anchor = ability['source_text_reference'].partition('#')
    source = (DATA.parent / filename).read_text()
    if not separator or anchor != card_id or f'### {anchor} ' not in source:
        raise ValueError('response-triggered source reference differs')
    section = source.split(f'### {anchor} ', 1)[1].split('\n### ', 1)[0]
    if not all(text in section for text in (
            '1ターンに1回', '相手のターンに', '自分が「すぐつかう」でカードをプレイした時',
            '対象として発動できる')):
        raise ValueError('response-triggered source text differs')
    row = next((x for x in table['cards'] if x['card_id'] == card_id), None)
    if row is None or row['card_type'] != 'companion' or \
            [x['action_type'] for x in row['actions']] != ['place_companion'] or \
            any(x['timing'] != 'normal_action_opportunity' for x in row['actions']):
        raise ValueError('response-triggered normal-action template differs')
    chain = (DATA.parent / '06-action-chain-checkpoint.md').read_text()
    response = (DATA.parent / '119-response-window-contract.md').read_text()
    if '条件を満たす能力' not in chain or 'triggered_ability' not in response:
        raise ValueError('response-triggered phase contract differs')
    return copy.deepcopy(ability)


def _is_response_unit(row: dict) -> bool:
    return row['source_family'] == 'board_card_action' and \
        row['card_id'] in RESPONSE_BOARD and row['candidate_variant'] == 'response_triggered'


def _response_unit(view: dict, original: dict) -> dict:
    template = original['template']
    if template != {
            'timing': 'response_window',
            'source_text_reference': RESPONSE_BOARD[original['card_id']]['source_text_reference']} or \
            original['source_instance_id'] not in view['players'][view['actor']]['board']['companions']:
        raise ValueError('unresolved_canonical_predicate: response board source')
    unit = {key: copy.deepcopy(value) for key, value in original.items() if key != 'template'}
    unit.update({
        'reason_codes': ['timing_not_normal_action'],
        'disposition': 'excluded',
        'candidate_id': None,
        'evidence': {'phase': view['phase'], 'template.timing': template['timing']},
        'source_references': [template['source_text_reference'], '06-action-chain-checkpoint.md'],
    })
    return unit


@contextmanager
def response_board_scope(inputs: dict):
    registry = board_132.extension_128.BOARD_CLASSIFICATION
    kinds = board_132.extension_128.NON_INDEPENDENT
    old_registry = {card: registry.get(card) for card in RESPONSE_BOARD}
    had_kind = 'response_triggered' in kinds
    old_expand = board_132.expand_units
    old_adjudicate = board_132.adjudicate_units
    for card_id in RESPONSE_BOARD:
        classify_response_triggered(card_id, inputs['candidate_table'])

    def expand(view: dict, table: dict) -> list[dict]:
        rows = old_expand(view, table)
        result = []
        for row in rows:
            if row['source_family'] == 'board_card_action' and row['card_id'] in RESPONSE_BOARD:
                result.append(candidate_121._unit(
                    'board_card_action', 'board', row['source_instance_id'],
                    'board_response_trigger', 'response_triggered', [], row['card_id'],
                    {'timing': 'response_window',
                     'source_text_reference': RESPONSE_BOARD[row['card_id']]['source_text_reference']}))
            else:
                result.append(row)
        return result

    def adjudicate(view: dict, baseline: list[dict]) -> list[dict]:
        delegated = old_adjudicate(view, [row for row in baseline if not _is_response_unit(row)])
        by_id = {row['enumeration_unit_id']: row for row in delegated}
        result = [_response_unit(view, row) if _is_response_unit(row)
                  else by_id[row['enumeration_unit_id']] for row in baseline]
        if len({x['enumeration_unit_id'] for x in result}) != len(result) or \
                len({x['candidate_id'] for x in result if x['candidate_id']}) != \
                sum(bool(x['candidate_id']) for x in result):
            raise ValueError('candidate_id_collision')
        return result

    try:
        for card, ability in RESPONSE_BOARD.items():
            if old_registry[card] is not None and old_registry[card] != ability:
                raise ValueError('response board classification conflict')
            registry[card] = copy.deepcopy(ability)
        kinds.add('response_triggered')
        board_132.expand_units = expand
        board_132.adjudicate_units = adjudicate
        yield
    finally:
        board_132.expand_units = old_expand
        board_132.adjudicate_units = old_adjudicate
        if not had_kind:
            kinds.remove('response_triggered')
        for card, ability in old_registry.items():
            if ability is None:
                registry.pop(card, None)
            else:
                registry[card] = ability


@contextmanager
def replay_scope(inputs: dict):
    earlier = inputs['source_133']
    with prior.replay_contracts(earlier), response_board_scope(inputs):
        audit_133 = board_132.audit_turn_end_from_history
        old_sha = board_132.SOURCE_SHA

        def audit_134(path: str, source_133: dict, ignored: dict, current: dict,
                      events: list[dict], snapshots: list[dict]) -> dict:
            source_132 = earlier['stops'][path]
            if source_132['snapshots'][-1] != source_133['snapshots'][0]:
                raise ValueError('132/133 event boundary differs')
            return audit_133(
                path, source_132, earlier['source_131'], current,
                copy.deepcopy(source_133['events']) + copy.deepcopy(events),
                copy.deepcopy(source_133['snapshots']) + copy.deepcopy(snapshots[1:]))

        try:
            board_132.audit_turn_end_from_history = audit_134
            board_132.SOURCE_SHA = SOURCE_SHA
            yield
        finally:
            board_132.audit_turn_end_from_history = audit_133
            board_132.SOURCE_SHA = old_sha


def _finish_final_round(path: str, outcome: dict, inputs: dict) -> dict:
    game = outcome['final_state']['game_state']
    first = prior._first(path)
    if game['round'] != 10 or game['phase'] != 'turn_end' or game['turn_player'] == first or \
            outcome['reason']['code'] != 'incomplete_turn_end_sources':
        return outcome
    result = prior.final_round_result(game, first)
    proof = outcome['audits'][-1]
    joined = inputs['stops'][path]['events'] + outcome['events']
    if proof['contract_stop_codes'] or \
            not all(value for name, value in proof['completeness_checks'].items()
                    if name != 'transition_handlers_proven') or \
            not prior._no_due_scorpion(outcome['final_state'], joined):
        return outcome
    current = outcome['final_state']
    after = copy.deepcopy(current)
    after['game_state']['phase'] = 'completed'
    after['return_target'] = None
    generated = []
    snapshots = []
    board_132.current_126.restart_124._append_transition(
        current, after, generated, snapshots, 'final_round_completed', game['turn_player'])
    extension_125._verify_extended_step(current, after, generated)
    outcome['events'].extend({key: copy.deepcopy(value) for key, value in event.items()
                              if key != '_snapshot_after'} for event in generated)
    outcome['snapshots'].extend({
        'seq': event['seq'],
        'game_state_sha256': event['game_state_after_sha256'],
        'continuation_state_sha256': event['continuation_state_after_sha256'],
    } for event in generated)
    outcome.update(
        status='completed', reason=None, final_state=after,
        last_valid_event_seq=after['last_event_seq'],
        game_state_sha256=response_120.game_state_sha256(after['game_state']),
        continuation_state_sha256=after['continuation_state_sha256'],
        winner=result['winner'], result=result['result'],
        counts_as_independent_balance_sample=False)
    return outcome


def run_route(path: str, inputs: dict) -> dict:
    with replay_scope(inputs):
        outcome = board_132.run_route(path, inputs)
        return _finish_final_round(path, outcome, inputs)


def run_all(inputs: dict) -> dict:
    return {path: run_route(path, inputs) for path in SOURCE_SHA}


def build_plan(outcomes: dict) -> dict:
    return {
        'schema': 'naotocchi.card_game.proxy_board_response_plan.v1',
        'checkpoint': 134,
        'protected_133_stop_raw_sha256': SOURCE_SHA,
        'source_contracts': [6, 72, 107, 114, 119, 121, 128, 132, 133],
        'response_board_registry': RESPONSE_BOARD,
        'routes': [{
            'path_id': path,
            'source_stop_sha256': SOURCE_SHA[path],
            'source_game_state_sha256': row['source_game_state_sha256'],
            'source_continuation_state_sha256': row['source_continuation_state_sha256'],
            'last_valid_event_seq': row['last_valid_event_seq'],
            'game_state_sha256': row['game_state_sha256'],
            'continuation_state_sha256': row['continuation_state_sha256'],
            'status': row['status'],
            'reason': row['reason'],
            'winner': row.get('winner'),
            'result': row.get('result'),
            'decision_count': len(row['decisions']),
            'event_count': len(row['events']),
            'snapshot_count': len(row['snapshots']),
            'seeded_fallback_used': row['seeded_fallback_used'],
            'counts_as_independent_balance_sample': row['counts_as_independent_balance_sample'],
            'result_file': f'{STOP_FOLDER}/stop-134-{path}.json',
        } for path, row in outcomes.items()],
    }


def build_evaluation(plan: dict) -> dict:
    routes = plan['routes']
    stop_codes = sorted({x['reason']['code'] for x in routes if x['reason']})
    return {
        'schema': 'naotocchi.card_game.proxy_board_response_evaluation.v1',
        'checkpoint': 134,
        'planned': len(routes),
        'completed': sum(x['status'] == 'completed' for x in routes),
        'rules_stop': sum(x['status'] == 'stopped_rules_adjudication' for x in routes),
        'decision': sum(x['decision_count'] for x in routes),
        'event': sum(x['event_count'] for x in routes),
        'snapshot': sum(x['snapshot_count'] for x in routes),
        'winner': sum(x['winner'] is not None for x in routes),
        'independent_balance_sample': sum(x['counts_as_independent_balance_sample'] for x in routes),
        'stop_codes': {code: sum(x['reason'] and x['reason']['code'] == code for x in routes)
                       for code in stop_codes},
    }


def expected_outputs(inputs: dict | None = None) -> dict[str, bytes]:
    inputs = inputs if inputs is not None else load_sources()
    outcomes = run_all(inputs)
    plan = build_plan(outcomes)
    canonical = board_132.canonical_bytes
    return {
        PLAN_FILE: canonical(plan),
        EVALUATION_FILE: canonical(build_evaluation(plan)),
        **{f'{STOP_FOLDER}/stop-134-{path}.json': canonical(row)
           for path, row in outcomes.items()},
    }


def write_outputs(data_dir: Path = DATA, inputs: dict | None = None) -> None:
    for name, raw in expected_outputs(inputs).items():
        target = data_dir / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)


def check_outputs(data_dir: Path = DATA, inputs: dict | None = None) -> list[str]:
    return [f'canonical bytes differ: {name}' for name, raw in expected_outputs(inputs).items()
            if not (data_dir / name).is_file() or (data_dir / name).read_bytes() != raw]


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.write:
        write_outputs()
    else:
        errors = check_outputs()
        if errors:
            parser.exit(1, '\n'.join(errors) + '\n')
