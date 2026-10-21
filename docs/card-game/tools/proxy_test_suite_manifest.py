"""Frozen historical proxy-test membership, separate from current inventory.

Counts are static test-function declarations, matching check-design-data's
original metric. They are not claims about tests executed or passed.
"""
import ast
from pathlib import Path

CHECKPOINT_119 = {
    'test_proxy_record_validator.py': 12,
    'test_proxy_normal_decision_fallback_contract.py': 36,
    'test_proxy_gap_disposition.py': 8,
    'test_proxy_fixture_builder.py': 12,
    'test_proxy_gap_fixture_builder.py': 9,
    'test_proxy_board_combination_pilots.py': 7,
    'test_proxy_decision_fixture.py': 8,
    'test_proxy_normal_decision_pilot.py': 8,
    'test_proxy_normal_decision_seeded_restart.py': 24,
    'test_proxy_reservation_pilot.py': 8,
    'test_proxy_remaining_single_pilots.py': 7,
    'test_proxy_pilot_trace.py': 6,
    'test_proxy_normal_decision_admission.py': 7,
    'test_proxy_response_window_contract.py': 31,
    'test_proxy_normal_decision_first_choice_audit.py': 10,
    'test_proxy_normal_decision_hardening.py': 13,
    'test_proxy_reentry_pilot.py': 8,
    'test_proxy_same_name_two_pilots.py': 7,
}
CHECKPOINT_120 = {**CHECKPOINT_119, 'test_proxy_response_window_seeded_restart.py': 42}
CHECKPOINT_117 = {name: count for name, count in CHECKPOINT_119.items()
                  if name != 'test_proxy_response_window_contract.py'}
HISTORICAL_SUITES = {117: CHECKPOINT_117, 119: CHECKPOINT_119, 120: CHECKPOINT_120}


def _count(path):
    return sum(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
               and node.name.startswith('test_')
               for node in ast.walk(ast.parse(path.read_text())))


def count_historical_suite(tools_directory, checkpoint):
    root = Path(tools_directory)
    expected = HISTORICAL_SUITES[checkpoint]
    total = 0
    errors = []
    for name, count in sorted(expected.items()):
        try:
            actual = _count(root / name)
        except (OSError, SyntaxError, UnicodeError) as error:
            errors.append(f'{checkpoint} historical proxy test file {name}: {error}')
            continue
        total += actual
        if actual != count:
            errors.append(f'{checkpoint} historical proxy test count {name}: {actual} != {count}')
    return {'test_count': total, 'files': sorted(expected), 'errors': errors}


def count_current_suite(tools_directory):
    paths = sorted(Path(tools_directory).glob('test_proxy_*.py'))
    return {'test_count': sum(_count(path) for path in paths),
            'files': [path.name for path in paths]}
