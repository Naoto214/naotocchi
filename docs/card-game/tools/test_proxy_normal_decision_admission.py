#!/usr/bin/env python3
"""Regression tests for checkpoint-113 normal-decision admission audit."""

import copy
import json
from pathlib import Path
import tempfile
import unittest

from proxy_normal_decision_admission import (
    build_admission_audit,
    validate_admission_audit,
    validate_materialized_audit,
    write_admission_audit,
)


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
PLAN = DATA / "proxy-normal-decision-admission-plan-113-20260918.json"
OUTPUT = DATA / "proxy-normal-decision-admission-113-20260918.json"


class NormalDecisionAdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = json.loads(PLAN.read_text())
        cls.protocol = json.loads((DATA / cls.plan["protocol"]).read_text())
        cls.source = json.loads((DATA / cls.plan["source_fixture"]).read_text())
        cls.audit = build_admission_audit(cls.plan, cls.protocol, cls.source)

    def test_stops_without_fixtures_or_completed_matches(self):
        self.assertEqual(self.audit["status"], "blocked_by_protocol_admission")
        self.assertTrue(self.audit["stop_required"])
        self.assertEqual(self.audit["fixture_count"], 0)
        self.assertEqual(self.audit["completed_match_count"], 0)
        self.assertEqual(self.audit["independent_balance_sample_count"], 0)

    def test_records_three_specific_blockers(self):
        blockers = {row["blocker_id"]: row for row in self.audit["blockers"]}
        self.assertEqual(set(blockers), {
            "candidate-coverage-incomplete",
            "pre-decision-schema-mismatch",
            "priority-comparison-unresolved",
        })
        self.assertEqual(blockers["candidate-coverage-incomplete"]["omitted_card_types"],
                         ["world", "play", "item", "event"])
        self.assertEqual(blockers["pre-decision-schema-mismatch"]["required_key"], "board")
        self.assertEqual(blockers["pre-decision-schema-mismatch"]["emitted_key"], "field")

    def test_protocol_requires_board_and_strict_priority_order(self):
        self.assertIn("board", self.protocol["pre_decision_state_fields"])
        self.assertNotIn("field", self.protocol["pre_decision_state_fields"])
        priorities = self.protocol["decision_priority"]
        self.assertLess(priorities.index("maximize_time_balance"),
                        priorities.index("maximize_hand_board_reservation_value"))

    def test_source_remains_two_forty_card_seven_type_decks(self):
        players = self.source["input"]["players"]
        self.assertEqual({row["player_id"] for row in players}, {"A", "B"})
        self.assertTrue(all(len(row["deck_order_top_to_bottom"]) == 40 for row in players))
        self.assertTrue(all(len({card["card_id"][0] for card in row["deck_order_top_to_bottom"]}) == 7
                            for row in players))

    def test_two_candidate_orders_are_distinct_but_not_materialized(self):
        orders = self.audit["deferred_batch"]["orders"]
        self.assertEqual(len(orders), 2)
        self.assertNotEqual(orders[0]["shuffle_seed_by_player"],
                            orders[1]["shuffle_seed_by_player"])
        self.assertEqual(self.audit["deferred_batch"]["planned_match_count"], 4)
        self.assertFalse(self.audit["deferred_batch"]["orders_materialized"])

    def test_validator_rejects_false_completion_and_missing_blocker(self):
        broken = copy.deepcopy(self.audit)
        broken["completed_match_count"] = 4
        broken["blockers"].pop()
        errors = validate_admission_audit(broken, self.plan, self.protocol, self.source)
        self.assertTrue(any("completed_match_count" in row for row in errors))
        self.assertTrue(any("three blockers" in row for row in errors))

    def test_saved_audit_equals_builder_output(self):
        self.assertEqual(validate_admission_audit(
            self.audit, self.plan, self.protocol, self.source), [])
        self.assertEqual(validate_materialized_audit(self.audit, OUTPUT), [])
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "audit.json"
            write_admission_audit(self.audit, output)
            self.assertEqual(validate_materialized_audit(self.audit, output), [])


if __name__ == "__main__":
    unittest.main()
