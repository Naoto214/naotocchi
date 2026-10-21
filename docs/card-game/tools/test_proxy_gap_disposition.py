#!/usr/bin/env python3
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from proxy_gap_disposition import (
    build_gap_disposition,
    load_json,
    validate_gap_disposition,
    write_gap_disposition,
)


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
SOURCE_PLAN = DATA / "proxy-board-combination-plan-110-20260918.json"
SOURCE_EVALUATION = DATA / "proxy-board-combination-evaluation-110-20260918.json"
MATERIALIZED = DATA / "proxy-gap-disposition-111-20260918.json"


class GapDispositionTests(unittest.TestCase):
    def setUp(self):
        self.source_plan = load_json(SOURCE_PLAN)
        self.source_evaluation = load_json(SOURCE_EVALUATION)
        self.disposition = build_gap_disposition(
            self.source_plan, self.source_evaluation)

    def test_preserves_all_six_source_gaps_exactly_once(self):
        self.assertEqual(
            [row["card_id"] for row in self.disposition["gaps"]],
            [
                "G-jump-quest",
                "M-mushroom-06",
                "M-sakura-05",
                "M-dragon-08",
                "M-penguin-07",
                "M-god-08",
            ],
        )
        self.assertEqual(len({row["card_id"] for row in self.disposition["gaps"]}), 6)

    def test_classifies_two_short_and_four_evolution_fixtures(self):
        groups = [row["fixture_group"] for row in self.disposition["gaps"]]
        self.assertEqual(groups.count("targeted-short"), 2)
        self.assertEqual(groups.count("evolution-path"), 4)
        self.assertTrue(all(row["disposition"] == "requires-targeted-fixture"
                            for row in self.disposition["gaps"]))
        self.assertTrue(all(row["planned_checkpoint"] == 112
                            for row in self.disposition["gaps"]))

    def test_creates_no_fixture_or_completed_match_in_checkpoint_111(self):
        scope = self.disposition["scope"]
        self.assertEqual(scope["source_gap_count"], 6)
        self.assertEqual(scope["fixture_created_count"], 0)
        self.assertEqual(scope["completed_match_count"], 0)
        self.assertEqual(scope["independent_balance_sample_count"], 0)
        self.assertFalse(scope["changes_card_pool"])
        self.assertEqual(self.disposition["planned_fixture_constraints"], {
            "catalog_layer": "current-452",
            "deck_size_per_player": 40,
            "required_card_type_count": 7,
            "preserve_card_copy_id": True,
            "preserve_initial_instance_id": True,
            "record_status": "fixture",
            "events": [],
            "winner": None,
        })

    def test_fixes_first_normal_repetition_batch_at_four_matches(self):
        repetition = self.disposition["normal_decision_repetition"]
        self.assertEqual(repetition["first_batch_match_count"], 4)
        self.assertEqual(repetition["independent_initial_orders"], 2)
        self.assertTrue(repetition["mirror_first_player_for_each_order"])
        self.assertEqual(repetition["start_after_checkpoint"], 112)
        self.assertEqual(repetition["protocol"], {
            "schema": "naotocchi.card_game.proxy_decision_protocol.v1",
            "source_file": "proxy-decision-protocol-107-20260918.json",
        })
        self.assertFalse(repetition["may_count_as_strength_conclusion"])

    def test_each_gap_records_proof_obligations_and_forbidden_shortcuts(self):
        for row in self.disposition["gaps"]:
            self.assertTrue(row["required_evidence"])
            self.assertIn("card_pool_definition_change", row["forbidden_shortcuts"])
            self.assertIn("count_unexecuted_as_activation_zero", row["forbidden_shortcuts"])
        evolution = [row for row in self.disposition["gaps"]
                     if row["fixture_group"] == "evolution-path"]
        self.assertTrue(all("direct_high_stage_placement" in row["forbidden_shortcuts"]
                            for row in evolution))

    def test_validator_rejects_missing_gap_shortcut_and_scope_drift(self):
        broken = copy.deepcopy(self.disposition)
        broken["schema"] = "wrong"
        broken["source"]["saved_head"] = "wrong"
        broken["source"]["plan"] = "wrong.json"
        broken["gaps"].pop()
        broken["gaps"][0]["required_evidence"] = ["arbitrary"]
        broken["gaps"][0]["planned_fixture_id"] = "wrong"
        broken["gaps"][0]["fixture_group"] = "evolution-path"
        broken["gaps"][2]["fixture_group"] = "targeted-short"
        broken["gaps"][2]["forbidden_shortcuts"].remove("direct_high_stage_placement")
        broken["scope"]["fixture_created_count"] = 1
        broken["normal_decision_repetition"]["first_batch_match_count"] = 6
        broken["normal_decision_repetition"]["protocol"] = {
            "schema": "wrong", "source_file": "wrong.json"}
        broken["normal_decision_repetition"]["stop_after_batch_for_review"] = False
        errors = validate_gap_disposition(
            broken, self.source_plan, self.source_evaluation)
        self.assertTrue(any("schema and source checkpoint" in row for row in errors))
        self.assertTrue(any("six source gaps" in row for row in errors))
        self.assertTrue(any("authored disposition differs" in row for row in errors))
        self.assertTrue(any("direct high-stage placement" in row for row in errors))
        self.assertTrue(any("must not create fixtures" in row for row in errors))
        self.assertTrue(any("four-match first batch" in row for row in errors))

    def test_materialized_json_matches_builder(self):
        self.assertEqual(validate_gap_disposition(
            self.disposition, self.source_plan, self.source_evaluation), [])
        self.assertEqual(json.loads(MATERIALIZED.read_text()), self.disposition)
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "disposition.json"
            write_gap_disposition(self.disposition, output)
            self.assertEqual(json.loads(output.read_text()), self.disposition)

    def test_cli_rejects_materialized_output_that_differs_from_builder(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "disposition.json"
            broken = copy.deepcopy(self.disposition)
            broken["gaps"][0]["required_evidence"] = ["arbitrary"]
            write_gap_disposition(broken, output)
            result = subprocess.run(
                [sys.executable, str(TOOLS / "proxy_gap_disposition.py"),
                 "--output", str(output)],
                capture_output=True, text=True, check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("materialized 111 disposition differs from builder", result.stdout)


if __name__ == "__main__":
    unittest.main()
