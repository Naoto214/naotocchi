"""410: duplicate work removal must preserve independent regeneration and integrity."""
import copy
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import proxy_turn_end_provenance_restart as p124
import proxy_normal_action_extension as p125
import proxy_current_turn_end_correction as p126
import proxy_r2_candidate_extension_127 as p127
import proxy_r2_candidate_extension_128 as p128


class Regeneration410Tests(unittest.TestCase):
    def test_124_two_replays_and_saved_bytes(self):
        inputs = p124.load_sources()
        with patch.object(p124, 'run_all', wraps=p124.run_all) as replay:
            outputs = p124.expected_outputs(inputs)
        self.assertEqual(replay.call_count, 2)
        for name, raw in outputs.items():
            self.assertEqual(raw, (p124.DATA / name).read_bytes(), name)

    def assert_single_prior_load(self, module, prior):
        with patch.object(prior, 'load_sources', wraps=prior.load_sources) as load:
            result = module.load_sources()
        self.assertEqual(load.call_count, 1)
        self.assertEqual(set(result['stops']), set(module.SOURCE_SHA))

    def test_126_loads_prior_once(self):
        self.assert_single_prior_load(p126, p125)

    def test_127_loads_prior_once(self):
        self.assert_single_prior_load(p127, p126)

    def test_128_loads_prior_once(self):
        self.assert_single_prior_load(p128, p127)

    def test_supplied_outcomes_cannot_bypass_independent_replay(self):
        inputs = p124.load_sources()
        outcomes = p124.run_all(inputs)
        outcomes['order-01-a-first']['events'][0]['game_state_after_sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            p124.build_plan(inputs, outcomes)

    def test_supplied_inputs_unchanged_and_raw117_tampering_rejected(self):
        inputs = p124.load_sources()
        original = copy.deepcopy(inputs)
        p124.expected_outputs(inputs)
        self.assertEqual(inputs, original)
        inputs['raw_117'] += b' '
        with self.assertRaises(ValueError):
            p124.expected_outputs(inputs)

    def test_registry_scope_revalidated_after_change_and_restoration(self):
        inputs = p124.load_sources()
        outcomes = p124.run_all(inputs)
        registry = copy.deepcopy(p124.TEXT_REGISTRY)
        registry['resolve_event']['E-first-date']['growth_delta'] = None
        with patch.object(p124, 'TEXT_REGISTRY', registry):
            with self.assertRaises(ValueError):
                p124.build_plan(inputs, outcomes)
        plan = p124.build_plan(inputs, outcomes)
        self.assertEqual(p124.canonical_bytes(plan), (p124.DATA / p124.PLAN_FILE).read_bytes())

    def test_fresh_disk_and_returned_object_isolation(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'data'
            shutil.copytree(p124.DATA, target)
            first = p124.load_sources(target)
            first['plan_117']['routes'].clear()
            second = p124.load_sources(target)
            self.assertEqual(len(second['plan_117']['routes']), 4)
            file = target / p124.PLAN_117
            file.write_bytes(file.read_bytes() + b' ')
            with self.assertRaises(ValueError):
                p124.load_sources(target)

    def test_125_explicit_source_rejects_forged_past_event(self):
        inputs = p125.load_sources()
        inputs['stops']['order-01-a-first']['events'][0]['game_state_after_sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            p125.expected_outputs(inputs)


if __name__ == '__main__':
    unittest.main()
