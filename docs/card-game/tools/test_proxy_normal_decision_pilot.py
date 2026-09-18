#!/usr/bin/env python3
"""Regression tests for checkpoint-108 normal-decision matches."""

import copy
import json
from pathlib import Path
import tempfile
import unittest

from proxy_normal_decision_pilot import (
    build_normal_decision_pair,
    load_json,
    validate_materialized_suite,
    validate_normal_decision_suite,
    write_normal_decision_suite,
)
from proxy_record_validator import load_current_catalog


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
PLAN = DATA / "proxy-normal-decision-plan-108-20260918.json"
RECORDS = DATA / "proxy-matches-108"
TRACES = DATA / "proxy-decision-traces-108"
EVALUATION = DATA / "proxy-normal-decision-evaluation-108-20260918.json"


class NormalDecisionPilotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = load_json(PLAN)
        cls.protocol = load_json(DATA / cls.plan["protocol"])
        cls.fixtures = [load_json(DATA / row["source_fixture"]) for row in cls.plan["matches"]]
        cls.suite = build_normal_decision_pair(cls.fixtures, cls.plan, cls.protocol)
        cls.catalog = load_current_catalog()

    def test_builds_two_completed_seat_mirror_matches(self):
        records = [row["record"] for row in self.suite["matches"]]
        self.assertEqual([row["input"]["first_player"] for row in records], ["A", "B"])
        self.assertEqual([row["record"]["status"] for row in records], ["completed", "completed"])
        self.assertEqual([row["record"]["result"]["rounds_completed"] for row in records], [10, 10])
        self.assertEqual([row["record"]["result"]["winner"] for row in records], ["A", "A"])
        self.assertEqual(
            [row["record"]["result"]["final_growth"] for row in records],
            [{"A": 45, "B": 35}, {"A": 40, "B": 35}],
        )

    def test_preserves_source_decks_copy_ids_and_initial_instances(self):
        for fixture, built in zip(self.fixtures, self.suite["matches"]):
            record = built["record"]
            self.assertEqual(record["input"]["players"], fixture["input"]["players"])
            self.assertEqual(record["input"]["first_player"], fixture["input"]["first_player"])
            self.assertEqual(record["input"]["initial_growth"], 20)

    def test_records_every_normal_action_decision_with_pass_candidate(self):
        expected_counts = [46, 45]
        for built, expected in zip(self.suite["matches"], expected_counts):
            decisions = built["trace"]["decisions"]
            self.assertEqual(len(decisions), expected)
            self.assertEqual(
                [row["decision_seq"] for row in decisions],
                list(range(1, expected + 1)),
            )
            for decision in decisions:
                self.assertEqual(
                    set(self.protocol["choice_record_required_fields"]),
                    set(decision) - {"decision_id", "decision_seq", "event_seq", "actor", "round"},
                )
                self.assertIn("pass", [row["kind"] for row in decision["legal_candidates"]])
                self.assertIn(
                    decision["selected_action"]["candidate_id"],
                    [row["candidate_id"] for row in decision["legal_candidates"]],
                )

    def test_decisions_do_not_expose_opponent_hidden_information(self):
        for built in self.suite["matches"]:
            for decision in built["trace"]["decisions"]:
                actor = decision["actor"]
                opponent = "B" if actor == "A" else "A"
                public = decision["public_information"]
                self.assertNotIn("opponent_hand", public)
                self.assertNotIn("opponent_deck", public)
                self.assertNotIn(opponent, decision["pre_decision_state"]["hand"])
                self.assertEqual(public["information_policy"], "public_and_owner_known_only")

    def test_evaluation_matches_decisions_events_and_terminal_state(self):
        evaluation = self.suite["evaluation"]
        self.assertEqual(evaluation["completed_match_count"], 2)
        self.assertEqual(evaluation["unresolved_decisions"], 0)
        for built, summary in zip(self.suite["matches"], evaluation["matches"]):
            decisions = built["trace"]["decisions"]
            self.assertEqual(summary["legal_candidate_count"], sum(len(row["legal_candidates"]) for row in decisions))
            self.assertEqual(summary["selected_action_count"], sum(row["selected_action"]["kind"] != "pass" for row in decisions))
            self.assertEqual(summary["reservations"], {"created": 0, "consumed": 0, "expired": 0, "max_concurrent": 0})
            self.assertEqual(summary["reentries"], 0)
            self.assertEqual(summary["unresolved_decisions"], 0)
            self.assertEqual(summary["use_count_by_card_type"]["play"], 1)

    def test_trace_hashes_and_event_choice_links_are_contiguous(self):
        for built in self.suite["matches"]:
            events = built["record"]["record"]["events"]
            snapshots = built["trace"]["snapshots"]
            decision_ids = {row["decision_id"] for row in built["trace"]["decisions"]}
            self.assertEqual(len(snapshots), len(events) + 1)
            self.assertEqual([row["event_seq"] for row in snapshots], list(range(len(events) + 1)))
            linked = {choice for event in events for choice in event["choice_ids"] if choice.startswith("decision-")}
            self.assertEqual(linked, decision_ids)

    def test_validator_rejects_hidden_information_and_missing_pass(self):
        broken = copy.deepcopy(self.suite)
        decision = broken["matches"][0]["trace"]["decisions"][0]
        decision["public_information"]["opponent_hand"] = ["B-001#1"]
        decision["legal_candidates"] = [row for row in decision["legal_candidates"] if row["kind"] != "pass"]
        errors = validate_normal_decision_suite(broken, self.plan, self.protocol, self.catalog)
        self.assertTrue(any("opponent hidden information" in error for error in errors))
        self.assertTrue(any("must include pass" in error for error in errors))

    def test_materialized_outputs_equal_builder_output(self):
        self.assertEqual(validate_normal_decision_suite(self.suite, self.plan, self.protocol, self.catalog), [])
        self.assertEqual(validate_materialized_suite(self.suite, RECORDS, TRACES, EVALUATION), [])
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            records = root / "records"
            traces = root / "traces"
            evaluation = root / "evaluation.json"
            write_normal_decision_suite(self.suite, records, traces, evaluation)
            self.assertEqual(validate_materialized_suite(self.suite, records, traces, evaluation), [])


if __name__ == "__main__":
    unittest.main()
