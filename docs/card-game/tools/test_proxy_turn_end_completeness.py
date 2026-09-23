"""Checkpoint 123: the saved 122 stops remain read-only."""
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import proxy_turn_end_completeness as turn_end


class TurnEndSourceTests(unittest.TestCase):
    def test_four_protected_sources_have_consistent_hashes(self):
        sources = turn_end.load_inputs()
        self.assertEqual(len(sources), 4)
        for path, (stop, raw) in sources.items():
            self.assertEqual(stop['path_id'], path)
            self.assertIsNone(turn_end.verify_source(stop, raw, turn_end.EXPECTED_RAW[path]))

    def test_modified_raw_state_and_instance_mapping_fail(self):
        path, (stop, raw) = next(iter(turn_end.load_inputs().items()))
        for altered, contents in ((stop, raw + b' '),):
            with self.assertRaises(ValueError):
                turn_end.verify_source(altered, contents, turn_end.EXPECTED_RAW[path])
        altered = copy.deepcopy(stop)
        altered['game_state']['players']['A']['growth'] += 1
        with self.assertRaises(ValueError):
            turn_end.verify_source(altered, raw, turn_end.EXPECTED_RAW[path])
        altered = copy.deepcopy(stop)
        altered['game_state']['players']['A']['board']['partner'] = 'unknown#1'
        altered['continuation_state']['game_state'] = copy.deepcopy(altered['game_state'])
        with self.assertRaises(ValueError):
            turn_end.verify_source(altered, raw, turn_end.EXPECTED_RAW[path])

    def test_all_stages_are_inventory_based_across_four_routes(self):
        for path, (stop, _) in turn_end.load_inputs().items():
            audit = turn_end.enumerate_turn_end(stop)
            self.assertEqual([stage['stage'] for stage in audit['stage_inventory']], list(range(1, 7)))
            self.assertEqual(audit['path_id'], path)
            self.assertEqual(audit['stage_inventory'][1]['empty_reason'], 'both_reservation_lists_empty')
            self.assertEqual(audit['stage_inventory'][2]['empty_reason'], 'no_due_public_board_trigger')
            self.assertFalse(audit['turn_end_set_complete'])
            self.assertIn('unresolved_expiration', audit['contract_stop_codes'])
            self.assertIn('missing_growth_reach_history', audit['contract_stop_codes'])

    def test_unknown_board_card_and_due_reservation_do_not_become_empty(self):
        stop = copy.deepcopy(next(iter(turn_end.load_inputs().values()))[0])
        board_id = stop['game_state']['players']['A']['board']['partner']
        stop['game_state']['cards'][board_id]['card_id'] = 'P-unknown'
        audit = turn_end.enumerate_turn_end(stop)
        self.assertIn('missing_turn_end_source_classification', audit['contract_stop_codes'])
        stop = copy.deepcopy(next(iter(turn_end.load_inputs().values()))[0])
        stop['game_state']['players']['A']['reservations'].append({'timing':'turn_end','source_instance_id':'A-017#1'})
        audit = turn_end.enumerate_turn_end(stop)
        self.assertIsNone(audit['stage_inventory'][1]['empty_reason'])

    def test_path_name_is_not_used_for_board_classification(self):
        stop = copy.deepcopy(next(iter(turn_end.load_inputs().values()))[0])
        before = turn_end.enumerate_turn_end(stop)['stage_inventory']
        stop['path_id'] = 'future-route'
        after = turn_end.enumerate_turn_end(stop)['stage_inventory']
        self.assertEqual(before, after)

    def test_validator_rederives_boolean_inventory_codes_and_rejects_keys(self):
        stop, raw = next(iter(turn_end.load_inputs().values()))
        original = turn_end.enumerate_turn_end(stop)
        self.assertEqual(turn_end.validate_turn_end(original, stop, raw), [])
        for mutation in ('turn_end_set_complete', 'stage_inventory', 'contract_stop_codes',
                         'completeness_checks', 'unknown_key'):
            altered = copy.deepcopy(original)
            if mutation == 'turn_end_set_complete':
                altered[mutation] = True
            elif mutation == 'stage_inventory':
                altered[mutation] = altered[mutation][::-1]
            elif mutation == 'contract_stop_codes':
                altered[mutation] = []
            elif mutation == 'completeness_checks':
                altered[mutation]['expiration_boundary_resolved'] = True
            else:
                altered[mutation] = []
            with self.subTest(mutation=mutation):
                self.assertTrue(turn_end.validate_turn_end(altered, stop, raw))

    def test_validator_rejects_mutated_stop_and_unknown_state_key(self):
        stop, raw = next(iter(turn_end.load_inputs().values()))
        audit = turn_end.enumerate_turn_end(stop)
        altered = copy.deepcopy(stop)
        altered['game_state']['players']['A']['growth'] = 99
        with self.assertRaises(ValueError):
            turn_end.validate_turn_end(audit, altered, raw)
        altered = copy.deepcopy(stop)
        altered['game_state']['future_secret'] = 'unknown'
        with self.assertRaises(ValueError):
            turn_end.validate_turn_end(audit, altered, raw)

    def test_unproved_information_and_projection_cannot_be_true(self):
        stop = next(iter(turn_end.load_inputs().values()))[0]
        audit = turn_end.enumerate_turn_end(stop)
        self.assertFalse(audit['completeness_checks']['source_projection_exact'])
        self.assertFalse(audit['completeness_checks']['trigger_information_boundary_valid'])

    def test_reservation_without_source_id_never_receives_index_based_id(self):
        stop = copy.deepcopy(next(iter(turn_end.load_inputs().values()))[0])
        stop['game_state']['players']['A']['reservations'] = [{'timing':'turn_end'}]
        with self.assertRaises(ValueError):
            turn_end.enumerate_turn_end(stop)

    def test_contract_registers_all_stages_checks_stops_and_zero_progress(self):
        contract = turn_end.build_contract()
        self.assertEqual(len(contract['stages']), 6)
        self.assertEqual(len(contract['completeness_requirements']), 12)
        self.assertEqual(len(contract['contract_stop_codes']), 9)
        self.assertEqual(set(contract['scope'].values()), {0})

    def test_canonical_check_requires_exact_saved_bytes(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            turn_end.write_outputs(root)
            self.assertEqual(turn_end.check_outputs(root), [])
            target = root/turn_end.CONTRACT_FILE
            target.write_bytes(target.read_bytes().replace(b'\n', b'\r\n'))
            self.assertTrue(turn_end.check_outputs(root))

    def test_checkpoint_gate_and_report_are_present(self):
        tool = Path(__file__).with_name('check-design-data.py')
        run = subprocess.run([sys.executable, str(tool), '--checkpoint-123'],
                             capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        self.assertEqual(json.loads(run.stdout)['errors'], [])

    def test_historical_proxy_gates_exclude_new_123_tests(self):
        tool = Path(__file__).with_name('check-design-data.py')
        for checkpoint, count in ((119, 221), (120, 263)):
            with self.subTest(checkpoint=checkpoint):
                run = subprocess.run([sys.executable, str(tool), f'--checkpoint-{checkpoint}'],
                                     capture_output=True, text=True)
                self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
                self.assertEqual(json.loads(run.stdout)['proxy_test_count'], count)
