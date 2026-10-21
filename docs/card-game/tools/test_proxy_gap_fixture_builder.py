#!/usr/bin/env python3
import copy
import json
from pathlib import Path
import tempfile
import unittest

from proxy_gap_fixture_builder import (
    build_gap_fixtures,
    fixture_filename,
    load_json,
    validate_gap_fixtures,
    validate_materialized_fixtures,
    write_gap_fixtures,
)
from proxy_record_validator import load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
PLAN = DATA / "proxy-gap-fixture-plan-112-20260918.json"
DISPOSITION = DATA / "proxy-gap-disposition-111-20260918.json"
POOL_LAYERS = DATA / "proxy-pool-layers-20260917.json"


class ProxyGapFixtureBuilderTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = load_json(PLAN)
        cls.disposition = load_json(DISPOSITION)
        cls.pool_layers = load_json(POOL_LAYERS)
        cls.catalog = load_current_catalog()
        cls.fixtures = build_gap_fixtures(cls.plan, DATA)

    def test_builds_exactly_the_six_checkpoint_111_fixtures(self):
        self.assertEqual(len(self.fixtures), 6)
        self.assertEqual(
            [row["match_id"] for row in self.fixtures],
            [row["planned_fixture_id"] for row in self.disposition["gaps"]],
        )
        self.assertEqual(
            [row["fixture_group"] for row in self.plan["fixtures"]].count(
                "targeted-short"
            ),
            2,
        )
        self.assertEqual(
            [row["fixture_group"] for row in self.plan["fixtures"]].count(
                "evolution-path"
            ),
            4,
        )

    def test_every_record_is_valid_unplayed_and_current_452_only(self):
        current = set(self.catalog)
        for fixture in self.fixtures:
            self.assertEqual(validate_record(fixture, self.catalog), [], fixture["match_id"])
            self.assertEqual(fixture["record"]["status"], "fixture")
            self.assertEqual(fixture["record"]["events"], [])
            self.assertIsNone(fixture["record"]["result"]["winner"])
            ids = {
                card["card_id"]
                for player in fixture["input"]["players"]
                for card in player["deck_order_top_to_bottom"]
            }
            self.assertLessEqual(ids, current)
            self.assertEqual(fixture["test_plan"]["strata"][0], "current-452")

    def test_preserves_source_physical_and_initial_instance_identity(self):
        by_id = {row["match_id"]: row for row in self.fixtures}
        for spec in self.plan["fixtures"]:
            source = load_json(DATA / spec["source_fixture"])
            fixture = by_id[spec["fixture_id"]]
            for player_id in ("A", "B"):
                source_player = next(
                    row for row in source["input"]["players"]
                    if row["player_id"] == player_id
                )
                fixture_player = next(
                    row for row in fixture["input"]["players"]
                    if row["player_id"] == player_id
                )
                self.assertEqual(
                    [
                        (row["card_copy_id"], row["initial_instance_id"])
                        for row in fixture_player["deck_order_top_to_bottom"]
                    ],
                    [
                        (row["card_copy_id"], row["initial_instance_id"])
                        for row in source_player["deck_order_top_to_bottom"]
                    ],
                )

    def test_declared_inventory_is_materialized_with_exact_multiplicity(self):
        by_id = {row["match_id"]: row for row in self.fixtures}
        for spec in self.plan["fixtures"]:
            fixture = by_id[spec["fixture_id"]]
            players = {
                row["player_id"]: row["deck_order_top_to_bottom"]
                for row in fixture["input"]["players"]
            }
            for requirement in spec["required_inventory"]:
                actual = sum(
                    card["card_id"] == requirement["card_id"]
                    for card in players[requirement["player_id"]]
                )
                self.assertEqual(actual, requirement["count"], requirement)

    def test_evolution_entries_are_forward_same_species_time_skips(self):
        for spec in self.plan["fixtures"]:
            if spec["fixture_group"] != "evolution-path":
                continue
            entry = spec["entry_path"]
            self.assertEqual(entry["method"], "time-skip")
            self.assertNotEqual(entry["from_card_id"], entry["target_card_id"])
            source_species, source_stage = entry["from_card_id"].rsplit("-", 1)
            target_species, target_stage = entry["target_card_id"].rsplit("-", 1)
            self.assertEqual(source_species, target_species)
            self.assertLess(int(source_stage), int(target_stage))
            self.assertEqual(entry["time_cost"], int(target_stage) - int(source_stage))
            self.assertFalse(entry["direct_high_stage_placement"])

    def test_jump_quest_has_two_distinct_one_step_time_skips(self):
        spec = next(
            row for row in self.plan["fixtures"]
            if row["focus_card_id"] == "G-jump-quest"
        )
        self.assertEqual(
            spec["proof_setup"]["same_turn_time_skips"],
            [
                {"from_card_id": "M-beetle-01", "to_card_id": "M-beetle-02", "time_cost": 1},
                {"from_card_id": "M-beetle-02", "to_card_id": "M-beetle-03", "time_cost": 1},
            ],
        )

    def test_mushroom_has_two_distinct_copies_of_one_non_main_name(self):
        fixture = next(
            row for row in self.fixtures
            if row["match_id"] == "fixture-112-m-mushroom-06"
        )
        spec = next(
            row for row in self.plan["fixtures"]
            if row["fixture_id"] == fixture["match_id"]
        )
        duplicate_id = spec["proof_setup"]["same_name_non_main_card_id"]
        copies = [
            card
            for player in fixture["input"]["players"]
            for card in player["deck_order_top_to_bottom"]
            if card["card_id"] == duplicate_id
        ]
        self.assertEqual(len(copies), 2)
        self.assertEqual(len({row["card_copy_id"] for row in copies}), 2)
        self.assertNotEqual(duplicate_id.split("-", 1)[0], "M")

    def test_validator_rejects_completed_or_semantically_corrupt_fixture(self):
        broken = copy.deepcopy(self.fixtures)
        broken[0]["record"]["status"] = "completed"
        broken[1]["input"]["players"][0]["deck_order_top_to_bottom"][0][
            "card_id"
        ] = "G-air-hockey"
        errors = validate_gap_fixtures(
            broken, self.plan, self.disposition, self.pool_layers, self.catalog, DATA
        )
        self.assertTrue(any("must remain an unplayed fixture" in row for row in errors))
        self.assertTrue(any("declared deck assignments" in row for row in errors))
        weakened_plan = copy.deepcopy(self.plan)
        weakened_plan["fixtures"][2]["proof_setup"]["focus_time_cost"] = 0
        errors = validate_gap_fixtures(
            self.fixtures, weakened_plan, self.disposition,
            self.pool_layers, self.catalog, DATA
        )
        self.assertTrue(any("authored proof setup differs" in row for row in errors))

    def test_writer_and_materialized_validator_require_exact_json(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            write_gap_fixtures(self.fixtures, output)
            self.assertEqual(
                {path.name for path in output.glob("*.json")},
                {fixture_filename(row) for row in self.fixtures},
            )
            self.assertEqual(
                validate_materialized_fixtures(self.fixtures, output), []
            )
            path = output / fixture_filename(self.fixtures[0])
            changed = json.loads(path.read_text())
            changed["test_plan"]["purpose"] = "changed"
            path.write_text(json.dumps(changed, ensure_ascii=False, indent=2) + "\n")
            self.assertEqual(
                validate_materialized_fixtures(self.fixtures, output),
                [f"materialized fixture differs from builder output: {path.name}"],
            )


if __name__ == "__main__":
    unittest.main()
