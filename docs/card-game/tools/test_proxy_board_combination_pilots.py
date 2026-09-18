#!/usr/bin/env python3
"""Regression tests for checkpoint-110 board-combination pilots."""

import copy
from pathlib import Path
import tempfile
import unittest

from proxy_record_validator import load_current_catalog, validate_record
from proxy_board_combination_pilots import (
    build_board_combination_suite,
    load_json,
    validate_board_combination_suite,
    validate_materialized_suite,
    write_board_combination_suite,
)


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
PLAN = DATA / "proxy-board-combination-plan-110-20260918.json"


class BoardCombinationPilotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = load_json(PLAN)
        cls.protocol = load_json(DATA / cls.plan["protocol"])
        cls.fixtures = [load_json(DATA / row["source_fixture"])
                        for row in cls.plan["matches"]]
        cls.suite = build_board_combination_suite(cls.fixtures, cls.plan,
                                                  cls.protocol)
        cls.catalog = load_current_catalog()

    def built_for(self, cluster):
        return next(row for row in self.suite["matches"]
                    if row["evaluation"]["cluster"] == cluster)

    def test_builds_six_completed_a_first_matches_and_preserves_card_identity(self):
        self.assertEqual(len(self.suite["matches"]), 6)
        self.assertEqual(self.suite["evaluation"]["completed_match_count"], 6)
        self.assertEqual(self.suite["evaluation"]["independent_balance_sample_count"], 0)
        for source, built in zip(self.fixtures, self.suite["matches"]):
            record = built["record"]
            self.assertEqual(record["input"]["first_player"], "A")
            self.assertEqual(record["record"]["status"], "completed")
            self.assertEqual(record["record"]["result"]["rounds_completed"], 10)
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

    def test_focus_effects_record_achieved_and_structural_unachieved_paths(self):
        for built in self.suite["matches"]:
            effects = built["evaluation"]["focus_effects"]
            self.assertTrue(any(row["achieved"] for row in effects))
        p97_05 = self.built_for("P97-05")["evaluation"]
        jump = next(row for row in p97_05["focus_effects"]
                    if row["card_id"] == "G-jump-quest")
        self.assertFalse(jump["achieved"])
        self.assertEqual(jump["reason_code"], "structural_input_gap")
        self.assertTrue(any(
            row["missing_requirement"] == "two_time_skips_in_same_turn"
            for row in p97_05["structural_input_gaps"]
        ))
        self.assertEqual(p97_05["unresolved_decisions"], 0)

    def test_combination_specific_reservations_and_paths_are_recorded(self):
        curling = self.built_for("P97-01")
        self.assertEqual(curling["evaluation"]["path_metrics"]["challenge_draws"], 1)
        self.assertEqual(curling["evaluation"]["path_metrics"]["challenge_wins"], 1)
        reservations = self.built_for("P97-06")["evaluation"]["reservations"]
        self.assertGreaterEqual(reservations["created"], 3)
        self.assertEqual(reservations["max_concurrent"], 3)
        self.assertGreaterEqual(reservations["consumed"], 1)
        for cluster in ("P97-01", "P97-02", "P97-03"):
            built = self.built_for(cluster)
            events = built["record"]["record"]["events"]
            challenge_events = [row for row in events
                                if row["action_type"] in {"challenge_draw", "challenge_win"}]
            self.assertTrue(challenge_events)
            for event in challenge_events:
                snapshot = built["trace"]["snapshots"][event["seq"] - 1]["state"]
                self.assertEqual(event["source_instance_id"],
                                 snapshot["players"]["A"]["field"]["main"])
                self.assertEqual(event["target_instance_ids"],
                                 [snapshot["players"]["B"]["field"]["main"]])
                self.assertIsNotNone(snapshot["players"]["B"]["field"]["main"])
                self.assertIn("比較", event["result"])
        p97_01_win = next(
            row for row in self.built_for("P97-01")["record"]["record"]["events"]
            if row["action_type"] == "challenge_win"
        )
        self.assertIn("カワウソ予約1本", p97_01_win["result"])
        self.assertIn("バスケ予約1本", p97_01_win["result"])
        for cluster in ("P97-01", "P97-02"):
            built = self.built_for(cluster)
            basketball = next(
                row for row in built["record"]["record"]["events"]
                if row["action_type"] == "play_basketball"
            )
            self.assertEqual(basketball["target_instance_ids"], ["A-010#1"])
            reservation_id = basketball["reservations_created"][0]
            reservation = next(
                row for row in built["record"]["record"]["reservations"]
                if row["reservation_id"] == reservation_id
            )
            self.assertEqual(reservation["target_instance_ids"],
                             basketball["target_instance_ids"])

    def test_p97_04_keeps_unregistered_egg_in_separate_stratum(self):
        built = self.built_for("P97-04")
        self.assertIn("unregistered-item-separate-stratum",
                      built["record"]["test_plan"]["strata"])
        self.assertNotIn("current-452", built["record"]["test_plan"]["strata"])
        egg = next(row for row in built["evaluation"]["focus_effects"]
                   if row["card_id"] == "I-c_egg_normal")
        self.assertTrue(egg["achieved"])
        self.assertFalse(built["evaluation"]["counts_toward_current_452"])
        events = built["record"]["record"]["events"]
        response = next(row for row in events
                        if row["action_type"] == "play_air_hockey")
        trigger = next(row for row in events
                       if row["action_type"] == "opponent_immediate_play_during_challenge")
        self.assertEqual(trigger["actor"], "B")
        self.assertLess(trigger["seq"], response["seq"])
        self.assertEqual(response["chain"]["responds_to_seq"], trigger["seq"])
        declaration = next(row for row in events
                           if row["action_type"] == "declare_challenge")
        self.assertLess(declaration["seq"], trigger["seq"])
        self.assertEqual(response["target_instance_ids"], ["B-001#1"])
        response_snapshot = built["trace"]["snapshots"][response["seq"]]["state"]
        self.assertEqual(response_snapshot["challenge"]["modifiers"]["B"]["strength"], -2)
        cities = [row for row in events if row["action_type"] == "trigger_city"]
        self.assertEqual(len(cities), 2)
        previous_by_seq = {row["seq"]: row for row in events}
        self.assertEqual(previous_by_seq[cities[0]["seq"] - 1]["action_type"],
                         "place_world")
        self.assertEqual(previous_by_seq[cities[1]["seq"] - 1]["action_type"],
                         "play_air_hockey")
        for city in cities:
            self.assertEqual(city["source_instance_id"], "A-004#1")
            self.assertIn("山札上に残した", city["result"])
            self.assertTrue(city["choice_ids"])
        response_decision = next(row for row in built["record"]["input"]["declared_choices"]
                                 if row["choice_id"] in response["choice_ids"])
        self.assertEqual(response_decision["kind"], "response_decision")
        trace_decision = next(row for row in built["trace"]["decisions"]
                              if row["decision_id"] == response_decision["choice_id"])
        self.assertEqual(trace_decision["chain"], {
            "chain_id": response["chain"]["chain_id"],
            "responds_to_seq": trigger["seq"],
        })

    def test_decisions_validate_without_opponent_hidden_information(self):
        required = set(self.protocol["choice_record_required_fields"])
        for built in self.suite["matches"]:
            self.assertEqual(validate_record(built["record"], self.catalog), [])
            events = built["record"]["record"]["events"]
            snapshots = built["trace"]["snapshots"]
            self.assertEqual(len(snapshots), len(events) + 1)
            self.assertEqual([row["event_seq"] for row in snapshots],
                             list(range(len(events) + 1)))
            for decision in built["trace"]["decisions"]:
                fields = set(decision) - {
                    "decision_id", "decision_seq", "event_seq", "actor", "round"
                }
                self.assertEqual(fields, required)
                self.assertIn("pass", [row["kind"]
                                       for row in decision["legal_candidates"]])
                self.assertNotIn("opponent_hand", decision["public_information"])
                self.assertNotIn("opponent_deck", decision["public_information"])
        p97_03 = self.built_for("P97-03")
        hit_blow = next(row for row in p97_03["record"]["record"]["events"]
                        if row["action_type"] == "play_hit_blow")
        declared = next(row for row in p97_03["record"]["input"]["declared_choices"]
                        if row["choice_id"] in hit_blow["choice_ids"] and
                        row["kind"] == "effect_choice")
        self.assertEqual(declared["value"], "main")
        self.assertIn("公開前にメインを宣言", declared["note"])
        for built in self.suite["matches"]:
            decisions = built["trace"]["decisions"]
            for event in built["record"]["record"]["events"]:
                if event["action_type"] not in {"place_companion", "replace_companion"}:
                    continue
                later = next((row for row in decisions
                              if row["round"] == event["round"] and
                              row["actor"] == event["actor"] and
                              row["event_seq"] > event["seq"]), None)
                if later:
                    self.assertFalse(any(
                        row["action_type"] in {"place_companion", "place_partner"}
                        for row in later["legal_candidates"]
                    ))

    def test_validator_rejects_removed_gap_and_hidden_information(self):
        broken = copy.deepcopy(self.suite)
        p97_05 = next(row for row in broken["matches"]
                      if row["evaluation"]["cluster"] == "P97-05")
        p97_05["evaluation"]["structural_input_gaps"] = []
        broken["matches"][0]["trace"]["decisions"][0]["public_information"][
            "opponent_hand"] = ["B-001#1"]
        challenge = next(row for row in broken["matches"][0]["record"]["record"]["events"]
                         if row["action_type"] == "challenge_draw")
        challenge["target_instance_ids"] = ["B-002#1"]
        basketball = next(row for row in broken["matches"][0]["record"]["record"]["events"]
                          if row["action_type"] == "play_basketball")
        basketball["target_instance_ids"] = []
        p97_04 = next(row for row in broken["matches"]
                      if row["evaluation"]["cluster"] == "P97-04")
        p97_04["record"]["test_plan"]["strata"].append("current-452")
        p97_04["record"]["record"]["events"] = [
            row for row in p97_04["record"]["record"]["events"]
            if row["action_type"] != "trigger_city"
        ]
        air_hockey = next(row for row in p97_04["record"]["record"]["events"]
                          if row["action_type"] == "play_air_hockey")
        p97_04["trace"]["snapshots"][air_hockey["seq"]]["state"]["challenge"][
            "modifiers"]["B"]["strength"] = 0
        response_decision = next(
            row for row in p97_04["trace"]["decisions"]
            if row["decision_id"] in air_hockey["choice_ids"]
        )
        response_decision["chain"] = {"chain_id": "wrong", "responds_to_seq": None}
        errors = validate_board_combination_suite(
            broken, self.plan, self.protocol, self.catalog)
        self.assertTrue(any("jump quest structural input gap" in row for row in errors))
        self.assertTrue(any("opponent hidden information" in row for row in errors))
        self.assertTrue(any("current opposing main" in row for row in errors))
        self.assertTrue(any("basketball must record" in row for row in errors))
        self.assertTrue(any("mutually exclusive" in row for row in errors))
        self.assertTrue(any("city trigger evidence" in row for row in errors))
        self.assertTrue(any("focus-effect evidence" in row for row in errors))
        self.assertTrue(any("response decision" in row for row in errors))

    def test_materialized_outputs_equal_builder_output(self):
        self.assertEqual(validate_board_combination_suite(
            self.suite, self.plan, self.protocol, self.catalog), [])
        records = DATA / self.plan["record_output_directory"]
        traces = DATA / self.plan["trace_output_directory"]
        evaluation = DATA / self.plan["evaluation_output"]
        self.assertEqual(validate_materialized_suite(
            self.suite, records, traces, evaluation), [])
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            write_board_combination_suite(self.suite, root / "records",
                                          root / "traces", root / "evaluation.json")
            self.assertEqual(validate_materialized_suite(
                self.suite, root / "records", root / "traces",
                root / "evaluation.json"), [])


if __name__ == "__main__":
    unittest.main()
