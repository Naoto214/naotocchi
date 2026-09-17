#!/usr/bin/env python3
import json
from pathlib import Path
import tempfile
import unittest

from proxy_fixture_builder import (
    build_fixture_suite,
    fixture_filename,
    load_json,
    validate_fixture_suite,
    validate_materialized_suite,
    write_fixture_suite,
)
from proxy_record_validator import load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
MANIFEST = DATA / "proxy-fixture-plan-101-20260917.json"
BASE_FIXTURE = DATA / "proxy-match-record-example-20260917.json"
POOL_LAYERS = DATA / "proxy-pool-layers-20260917.json"


EXPECTED_TOPS = {
    ("P97-01", "single"): ["E-first-date"],
    ("P97-01", "same-name-two"): ["E-first-date", "E-first-date"],
    ("P97-01", "board-combination"): [
        "G-curling-ice", "G-curling-ice", "C-otter",
        "W-countryside", "I-star",
    ],
    ("P97-02", "single"): ["G-mini-golf-physics"],
    ("P97-02", "same-name-two"): ["C-otter", "C-otter"],
    ("P97-02", "board-combination"): [
        "W-jungle", "C-otter", "G-mini-golf-physics",
        "I-star", "I-naoto_lantern",
    ],
    ("P97-03", "single"): ["G-hit-blow"],
    ("P97-03", "same-name-two"): ["G-hit-blow", "G-hit-blow"],
    ("P97-03", "board-combination"): [
        "G-mini-golf-physics", "W-countryside", "C-otter",
        "I-star", "G-hit-blow",
    ],
    ("P97-04", "single"): ["G-road-city"],
    ("P97-04", "same-name-two"): ["G-road-city", "G-road-city"],
    ("P97-04", "board-combination"): [
        "G-road-city", "G-air-hockey", "G-animal-shogi",
        "W-city", "I-c_egg_normal",
    ],
    ("P97-05", "single"): ["G-animal-shogi"],
    ("P97-05", "same-name-two"): ["G-animal-shogi", "G-animal-shogi"],
    ("P97-05", "board-combination"): [
        "G-jump-quest", "M-mushroom-06", "M-sakura-05",
        "M-dragon-08", "G-animal-shogi",
    ],
    ("P97-06", "single"): ["G-breakout-classic"],
    ("P97-06", "same-name-two"): [
        "G-breakout-classic", "G-breakout-classic",
    ],
    ("P97-06", "board-combination"): [
        "M-penguin-07", "M-god-08", "G-stack-harvest",
        "G-stack-snowman", "G-takoyaki-grill",
    ],
}


class ProxyFixtureBuilderTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = load_json(MANIFEST)
        cls.base_fixture = load_json(BASE_FIXTURE)
        cls.pool_layers = load_json(POOL_LAYERS)
        cls.catalog = load_current_catalog()
        cls.fixtures = build_fixture_suite(cls.manifest, cls.base_fixture)

    def test_builds_six_clusters_with_three_profiles_each(self):
        self.assertEqual(len(self.fixtures), 18)
        actual = {
            (row["test_plan"]["strata"][1], row["test_plan"]["strata"][2])
            for row in self.fixtures
        }
        self.assertEqual(actual, set(EXPECTED_TOPS))

    def test_places_each_declared_focus_sequence_at_the_top_of_a_deck(self):
        for fixture in self.fixtures:
            key = (
                fixture["test_plan"]["strata"][1],
                fixture["test_plan"]["strata"][2],
            )
            deck = fixture["input"]["players"][0]["deck_order_top_to_bottom"]
            actual = [row["card_id"] for row in deck[:len(EXPECTED_TOPS[key])]]
            self.assertEqual(actual, EXPECTED_TOPS[key], key)

    def test_every_fixture_is_a_valid_unplayed_complete_record(self):
        for fixture in self.fixtures:
            self.assertEqual(validate_record(fixture, self.catalog), [], fixture["match_id"])
            self.assertEqual(fixture["record"]["status"], "fixture")
            self.assertEqual(fixture["record"]["events"], [])
            self.assertIsNone(fixture["record"]["result"]["winner"])

    def test_only_the_egg_fixture_uses_the_unregistered_stratum(self):
        tagged = []
        for fixture in self.fixtures:
            strata = fixture["test_plan"]["strata"]
            if "unregistered-item-separate-stratum" in strata:
                tagged.append(fixture["match_id"])
        self.assertEqual(tagged, ["fixture-101-p97-04-board-combination"])

    def test_suite_validator_rejects_missing_or_misordered_fixture(self):
        broken = json.loads(json.dumps(self.fixtures, ensure_ascii=False))
        broken.pop()
        broken[0]["input"]["players"][0]["deck_order_top_to_bottom"][0][
            "card_id"
        ] = "G-air-hockey"
        errors = validate_fixture_suite(
            broken, self.manifest, self.pool_layers, self.catalog
        )
        self.assertIn("fixture suite must contain exactly 18 records", errors)
        self.assertIn(
            "fixture-101-p97-01-single A deck must start with the declared focus sequence",
            errors,
        )

    def test_writer_uses_stable_filenames_and_reproduces_exact_json(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            write_fixture_suite(self.fixtures, output)
            names = sorted(path.name for path in output.glob("*.json"))
            self.assertEqual(
                names,
                sorted(fixture_filename(row) for row in self.fixtures),
            )
            for fixture in self.fixtures:
                saved = json.loads((output / fixture_filename(fixture)).read_text())
                self.assertEqual(saved, fixture)

    def test_materialized_validator_detects_a_changed_generated_record(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            write_fixture_suite(self.fixtures, output)
            changed = output / fixture_filename(self.fixtures[0])
            record = json.loads(changed.read_text())
            record["input"]["first_player"] = "B"
            changed.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")

            self.assertEqual(
                validate_materialized_suite(self.fixtures, output),
                [f"generated fixture differs from builder output: {changed.name}"],
            )


if __name__ == "__main__":
    unittest.main()
