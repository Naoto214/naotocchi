#!/usr/bin/env python3
"""Regression tests for checkpoint-109 same-name-two pilots."""

import copy
from pathlib import Path
import tempfile
import unittest

from proxy_record_validator import load_current_catalog, validate_record
from proxy_same_name_two_pilots import (
    build_same_name_two_suite,
    load_json,
    validate_materialized_suite,
    validate_same_name_two_suite,
    write_same_name_two_suite,
)


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
PLAN = DATA / "proxy-same-name-two-plan-109-20260918.json"


class SameNameTwoPilotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = load_json(PLAN)
        cls.protocol = load_json(DATA / cls.plan["protocol"])
        cls.fixtures = [load_json(DATA / row["source_fixture"])
                        for row in cls.plan["matches"]]
        cls.suite = build_same_name_two_suite(cls.fixtures, cls.plan, cls.protocol)
        cls.catalog = load_current_catalog()

    def built_for(self, cluster):
        return next(row for row in self.suite["matches"]
                    if cluster in row["record"]["test_plan"]["strata"])

    def test_builds_six_completed_a_first_matches_and_preserves_card_identity(self):
        self.assertEqual(len(self.suite["matches"]), 6)
        self.assertEqual(self.suite["evaluation"]["completed_match_count"], 6)
        self.assertEqual(self.suite["evaluation"]["independent_balance_sample_count"], 0)
        for source, built in zip(self.fixtures, self.suite["matches"]):
            record = built["record"]
            self.assertEqual(record["input"]["first_player"], "A")
            self.assertEqual(record["record"]["status"], "completed")
            for player_id in ("A", "B"):
                source_player = next(row for row in source["input"]["players"]
                                     if row["player_id"] == player_id)
                built_player = next(row for row in record["input"]["players"]
                                    if row["player_id"] == player_id)
                self.assertEqual(
                    {row["initial_instance_id"]: (row["card_copy_id"], row["card_id"])
                     for row in source_player["deck_order_top_to_bottom"]},
                    {row["initial_instance_id"]: (row["card_copy_id"], row["card_id"])
                     for row in built_player["deck_order_top_to_bottom"]},
                )

    def test_each_cluster_resolves_two_distinct_focus_copies(self):
        expected = {
            "P97-01": ("play_first_date", {"A-001#1", "A-002#1"}),
            "P97-02": ("activate_otter_reservation", {"A-001#1", "A-002#1"}),
            "P97-03": ("play_hit_blow", {"A-001#1", "A-002#1"}),
            "P97-04": ("play_city_run", {"A-001#1", "A-002#1"}),
            "P97-05": ("play_animal_shogi", {"A-001#1", "A-002#1"}),
            "P97-06": ("play_breakout", {"A-001#1", "A-002#1"}),
        }
        for cluster, (action_type, instances) in expected.items():
            events = self.built_for(cluster)["record"]["record"]["events"]
            actual = {row["source_instance_id"] for row in events
                      if row["action_type"] == action_type}
            self.assertEqual(actual, instances)

    def test_stacked_reservations_and_reentry_metrics_are_recorded(self):
        otter = self.built_for("P97-02")
        breakout = self.built_for("P97-06")
        shogi = self.built_for("P97-05")
        self.assertEqual(otter["evaluation"]["reservations"],
                         {"created": 2, "consumed": 2, "expired": 0,
                          "max_concurrent": 2})
        self.assertEqual(breakout["evaluation"]["reservations"],
                         {"created": 2, "consumed": 1, "expired": 1,
                          "max_concurrent": 2})
        self.assertEqual(shogi["evaluation"]["reentries"], 2)
        transitions = [transition
                       for event in shogi["record"]["record"]["events"]
                       for transition in event["instance_transitions"]]
        self.assertEqual(len(transitions), 2)

    def test_decisions_follow_protocol_and_do_not_expose_hidden_information(self):
        required = set(self.protocol["choice_record_required_fields"])
        for built in self.suite["matches"]:
            for decision in built["trace"]["decisions"]:
                fields = set(decision) - {
                    "decision_id", "decision_seq", "event_seq", "actor", "round"
                }
                self.assertEqual(fields, required)
                self.assertIn("pass", [row["kind"] for row in decision["legal_candidates"]])
                self.assertIn(
                    decision["selected_action"]["candidate_id"],
                    [row["candidate_id"] for row in decision["legal_candidates"]],
                )
                self.assertNotIn("opponent_hand", decision["public_information"])
                self.assertNotIn("opponent_deck", decision["public_information"])

    def test_records_validate_and_traces_are_contiguous(self):
        for built in self.suite["matches"]:
            record, trace = built["record"], built["trace"]
            self.assertEqual(validate_record(record, self.catalog), [])
            events = record["record"]["events"]
            snapshots = trace["snapshots"]
            self.assertEqual(len(snapshots), len(events) + 1)
            self.assertEqual([row["event_seq"] for row in snapshots],
                             list(range(len(events) + 1)))
            linked = {choice for event in events for choice in event["choice_ids"]
                      if choice.startswith("decision-")}
            self.assertEqual(linked,
                             {row["decision_id"] for row in trace["decisions"]})

    def test_validator_rejects_duplicate_focus_source_and_hidden_information(self):
        broken = copy.deepcopy(self.suite)
        first_date_events = [row for row in broken["matches"][0]["record"]["record"]["events"]
                             if row["action_type"] == "play_first_date"]
        first_date_events[1]["source_instance_id"] = first_date_events[0]["source_instance_id"]
        broken["matches"][1]["trace"]["decisions"][0]["public_information"][
            "opponent_hand"] = ["B-001#1"]
        errors = validate_same_name_two_suite(broken, self.plan, self.protocol,
                                              self.catalog)
        self.assertTrue(any("two distinct focus copies" in error for error in errors))
        self.assertTrue(any("opponent hidden information" in error for error in errors))

    def test_materialized_outputs_equal_builder_output(self):
        self.assertEqual(validate_same_name_two_suite(
            self.suite, self.plan, self.protocol, self.catalog), [])
        records = DATA / self.plan["record_output_directory"]
        traces = DATA / self.plan["trace_output_directory"]
        evaluation = DATA / self.plan["evaluation_output"]
        self.assertEqual(validate_materialized_suite(
            self.suite, records, traces, evaluation), [])
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            write_same_name_two_suite(self.suite, root / "records",
                                      root / "traces", root / "evaluation.json")
            self.assertEqual(validate_materialized_suite(
                self.suite, root / "records", root / "traces",
                root / "evaluation.json"), [])


if __name__ == "__main__":
    unittest.main()
