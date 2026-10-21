"""Static policy feasibility and the non-executing manifest entry boundary."""
import copy
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

try:
    import proxy_population_readiness as subject
except ImportError:
    subject = None
ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / 'data/proxy-admission-contract-459/contract.json'


class ReadinessTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(subject, 'population readiness validator absent')
        self.contract = json.loads(CONTRACT_PATH.read_text())

    def test_opening_exclusion_is_proven_without_any_order_or_run(self):
        result = subject.audit_opening_feasibility(self.contract, ROOT)
        self.assertEqual(result['status'], 'proven_unavoidable_116_for_current_executor')
        self.assertEqual(result['first_choice_physical_candidates'], 7)
        self.assertEqual(result['required_existing_resolution'], 'seeded_fallback')
        self.assertFalse(result['eligible_completion_reachable_under_current_executor'])
        self.assertEqual(result['observed_matches'], 0)
        self.assertIsNone(result['balance_admitted'])

    def test_source_mutation_revokes_proof_instead_of_preserving_conclusion(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            paths = set(self.contract['sources_sha256']) | set(subject.PROOF_SOURCES) | {'data/proxy-admission-contract-459/contract.json'}
            for relative in paths:
                target = root / relative; target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / relative, target)
            self.assertEqual(subject.audit_opening_feasibility(self.contract, root)['status'],
                             'proven_unavoidable_116_for_current_executor')
            target = root / 'tools/proxy_normal_decision_seeded_restart.py'
            target.write_text(target.read_text() + '\n# changed edition\n')
            result = subject.audit_opening_feasibility(self.contract, root)
            self.assertEqual(result['status'], 'unproved')
            self.assertIsNone(result['eligible_completion_reachable_under_current_executor'])
            self.assertTrue(result['gaps'])

    def test_executor_bridge_change_revokes_static_proof(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            paths = set(self.contract['sources_sha256']) | set(subject.PROOF_SOURCES) | {
                'data/proxy-admission-contract-459/contract.json',
                'tools/proxy_resource_value_trajectory.py',
                'tools/proxy_continuation_batch_runner.py'}
            for relative in paths:
                target = root / relative; target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / relative, target)
            for relative in ('tools/proxy_resource_value_trajectory.py',
                             'tools/proxy_continuation_batch_runner.py'):
                target = root / relative
                original = target.read_bytes()
                target.write_bytes(original + b'\n# different executor binding\n')
                with self.subTest(relative=relative):
                    result = subject.audit_opening_feasibility(self.contract, root)
                    self.assertEqual(result['status'], 'unproved')
                    self.assertIsNone(result['eligible_completion_reachable_under_current_executor'])
                target.write_bytes(original)

    def test_policy_change_is_not_covered_by_old_proof(self):
        self.contract['selected_package']['mandatory_policy'] = 'new_rule'
        result = subject.audit_opening_feasibility(self.contract, ROOT)
        self.assertEqual(result['status'], 'unproved')
        self.assertIsNone(result['eligible_completion_reachable_under_current_executor'])

    def test_unexecuted_population_is_not_retroactively_excluded(self):
        before = copy.deepcopy(self.contract)
        result = subject.preflight(self.contract, None, None, ROOT)
        self.assertFalse(result['ready_for_input_generation'])
        self.assertFalse(result['ready_for_execution'])
        self.assertFalse(result['whole_set']['allowed'])
        for name in ('counts', 'rates', 'conclusion'): self.assertIsNone(result['whole_set'][name])
        self.assertEqual(result['planned_counts'], {'groups': 200, 'matches': 400})
        self.assertEqual(result['actual_counts'], {'groups': 0, 'matches': 0, 'seeds': 0})
        self.assertEqual(result['disposition_counts']['matches'], {'eligible': 0, 'excluded': 0, 'unproved': 400})
        self.assertEqual(result['disposition_counts']['groups'], {'eligible': 0, 'excluded': 0, 'unproved': 200})
        self.assertIsNone(result['disposition_counts']['judgments'])
        self.assertEqual(result['diagnostic_subset']['eligible_denominator'], 0)
        self.assertIsNone(result['diagnostic_subset']['rates'])
        self.assertEqual(result['planned_match_ids'], None)
        self.assertEqual(self.contract, before)

    def test_false_receipt_never_opens_entry(self):
        result = subject.preflight(self.contract, {}, {'approved': True, 'execution_authorized': True}, ROOT)
        self.assertFalse(result['ready_for_execution'])
        self.assertIn('unavoidable_opening_116_exclusion', result['blockers'])
        self.assertIn('generalized_execution_adapter_unavailable', result['blockers'])

    def test_cli_rejects_execute_and_preflight_is_read_only(self):
        command = [sys.executable, str(ROOT / 'tools/proxy_population_entry.py')]
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 1, result.stderr)
        report = json.loads(result.stdout)
        self.assertFalse(report['ready_for_execution'])
        self.assertEqual(report['new_matches'], 0)
        result = subprocess.run(command + ['--execute'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertNotIn('Traceback', result.stderr)

    def test_cli_malformed_json_returns_structure_error(self):
        with tempfile.TemporaryDirectory() as name:
            path = Path(name) / 'bad.json'; path.write_text('{"schema":1,"schema":2}')
            result = subprocess.run([sys.executable, str(ROOT / 'tools/proxy_population_entry.py'),
                                     '--manifest', str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stdout)['stage'], 'invalid_input')


if __name__ == '__main__':
    unittest.main()
