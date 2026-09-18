#!/usr/bin/env python3
"""Regression tests for checkpoint-115 normal-decision first-choice audit."""

import copy
import json
from pathlib import Path
import tempfile
import unittest

from proxy_normal_decision_first_choice_audit import (
    build_first_choice_audit,
    build_first_choice_plan,
    validate_materialized,
    validate_first_choice_audit,
    validate_first_choice_plan,
    write_json,
    zero_cost_people,
)


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
ADMISSION_PLAN = DATA / "proxy-normal-decision-admission-plan-113-20260918.json"
SOURCE = DATA / "proxy-fixtures-107/fixture-107-normal-decision-a-first.json"
HARDENING = DATA / "proxy-normal-decision-hardening-114-20260918.json"
PLAN = DATA / "proxy-normal-decision-first-choice-plan-115-20260918.json"
AUDIT = DATA / "proxy-normal-decision-first-choice-audit-115-20260918.json"

EXPECTED_TOP_SEVEN = {
    ("order-01", "A"): [
        "G-air-hockey", "P-cat_ceo", "M-beetle-01", "M-antlion-02",
        "E-first-date", "M-beetle-02", "P-desert_scorpion",
    ],
    ("order-01", "B"): [
        "C-bat", "M-beetle-02", "E-boss", "C-box", "M-antlion-01",
        "W-deepsea", "P-cat_ceo",
    ],
    ("order-02", "A"): [
        "I-bowtie", "M-antlion-07", "E-fateful-transform", "I-sleepboost1",
        "M-antlion-02", "C-chameleon", "G-basketball-3d",
    ],
    ("order-02", "B"): [
        "M-beetle-01", "I-poop1", "M-antlion-01", "C-chameleon",
        "I-bowtie", "P-cat_ceo", "G-basketball-3d",
    ],
}


class NormalDecisionFirstChoiceAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.admission_plan = json.loads(ADMISSION_PLAN.read_text())
        cls.source = json.loads(SOURCE.read_text())
        cls.hardening = json.loads(HARDENING.read_text())
        cls.plan = build_first_choice_plan(cls.admission_plan, cls.source)
        cls.audit = build_first_choice_audit(cls.plan, cls.hardening)

    def test_fixed_seed_shuffle_matches_literal_top_seven(self):
        actual = {}
        for order in self.plan["orders"]:
            for player in order["players"]:
                actual[(order["order_id"], player["player_id"])] = [
                    card["card_id"] for card in player["deck_order_top_to_bottom"][:7]
                ]
        self.assertEqual(actual, EXPECTED_TOP_SEVEN)

    def test_shuffle_preserves_exact_copy_and_instance_sets(self):
        source_by_player = {
            player["player_id"]: player["deck_order_top_to_bottom"]
            for player in self.source["input"]["players"]
        }
        for order in self.plan["orders"]:
            for player in order["players"]:
                source_cards = source_by_player[player["player_id"]]
                shuffled = player["deck_order_top_to_bottom"]
                self.assertEqual(len(shuffled), 40)
                self.assertEqual(
                    {(card["card_copy_id"], card["card_id"], card["initial_instance_id"])
                     for card in shuffled},
                    {(card["card_copy_id"], card["card_id"], card["initial_instance_id"])
                     for card in source_cards},
                )
        self.assertEqual(validate_first_choice_plan(
            self.plan, self.admission_plan, self.source), [])

    def test_orders_are_distinct(self):
        orders = {
            order["order_id"]: {
                player["player_id"]: [
                    card["card_copy_id"] for card in player["deck_order_top_to_bottom"]
                ]
                for player in order["players"]
            }
            for order in self.plan["orders"]
        }
        self.assertNotEqual(orders["order-01"]["A"], orders["order-02"]["A"])
        self.assertNotEqual(orders["order-01"]["B"], orders["order-02"]["B"])

    def test_four_paths_stop_at_r1_egg_exchange(self):
        paths = self.audit["paths"]
        self.assertEqual(len(paths), 4)
        self.assertEqual(
            {(path["order_id"], path["first_player"]) for path in paths},
            {("order-01", "A"), ("order-01", "B"),
             ("order-02", "A"), ("order-02", "B")},
        )
        for path in paths:
            self.assertEqual(path["stop"], {
                "round": 1,
                "phase": "egg_exchange_choice",
                "actor": path["first_player"],
                "reason": "egg_exchange_choice_unresolved",
            })

    def test_bottom_candidates_equal_all_seven_cards(self):
        for path in self.audit["paths"]:
            hand = path["hand_before_choice"]
            self.assertEqual(len(hand), 7)
            self.assertEqual(
                path["bottom_candidate_copy_ids"],
                [card["card_copy_id"] for card in hand],
            )
            self.assertEqual(len(set(path["bottom_candidate_copy_ids"])), 7)

    def test_scope_counts_remain_zero(self):
        self.assertEqual(self.audit["scope"], {
            "fixture_count": 0,
            "completed_match_count": 0,
            "trace_count": 0,
            "winner_count": 0,
            "independent_balance_sample_count": 0,
        })
        self.assertFalse(self.audit["interpretation"]["counts_as_match"])
        self.assertFalse(self.audit["interpretation"]["counts_as_activation_zero"])
        self.assertFalse(self.audit["interpretation"]["counts_as_strength_evidence"])

    def test_validator_rejects_false_completion_and_changed_stop_reason(self):
        broken = copy.deepcopy(self.audit)
        broken["scope"]["completed_match_count"] = 1
        broken["paths"][0]["stop"]["reason"] = "completed"
        errors = validate_first_choice_audit(broken, self.plan, self.hardening)
        self.assertTrue(any("completed_match_count" in error for error in errors))
        self.assertTrue(any("stop" in error for error in errors))

    def test_three_paths_retain_zero_cost_person_after_one_bottom(self):
        evidence = {
            row["path_id"]: row for row in self.audit["downstream_evidence"]
        }
        expected = {
            "order-01-a-first": ["P-cat_ceo", "P-desert_scorpion"],
            "order-01-b-first": ["C-bat", "C-box", "P-cat_ceo"],
            "order-02-b-first": ["C-chameleon", "P-cat_ceo"],
        }
        for path_id, card_ids in expected.items():
            self.assertEqual(evidence[path_id]["zero_cost_person_card_ids"], card_ids)
            self.assertGreaterEqual(
                evidence[path_id]["minimum_remaining_after_one_bottom"], 1)
            self.assertEqual(
                evidence[path_id]["comparison_result"]["reason"],
                "unresolved_canonical_text",
            )
            self.assertFalse(evidence[path_id]["counts_as_played_action"])

    def test_order_two_a_has_only_one_zero_cost_person(self):
        path = next(
            row for row in self.audit["paths"]
            if row["path_id"] == "order-02-a-first"
        )
        self.assertEqual(
            [card["card_id"] for card in zero_cost_people(path["hand_before_choice"])],
            ["C-chameleon"],
        )
        evidence = next(
            row for row in self.audit["downstream_evidence"]
            if row["path_id"] == "order-02-a-first"
        )
        self.assertEqual(evidence["minimum_remaining_after_one_bottom"], 0)
        self.assertEqual(
            evidence["classification"],
            "avoidable_only_by_unresolved_egg_choice",
        )

    def test_saved_plan_and_audit_equal_builder_output(self):
        self.assertEqual(validate_materialized(self.plan, PLAN, "plan"), [])
        self.assertEqual(validate_materialized(self.audit, AUDIT, "audit"), [])
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "output.json"
            write_json(self.audit, output)
            self.assertEqual(validate_materialized(self.audit, output, "audit"), [])


if __name__ == "__main__":
    unittest.main()
