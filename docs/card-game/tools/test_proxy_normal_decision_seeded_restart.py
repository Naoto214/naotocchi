#!/usr/bin/env python3
"""Regression tests for checkpoint-117 seeded restart decision bridge."""

import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from proxy_normal_decision_fallback_contract import validate_seeded_resolution
from proxy_record_validator import canonical_sha256
import proxy_normal_decision_seeded_restart as restart
from proxy_normal_decision_hardening import validate_pre_decision_state, validate_public_information
from proxy_normal_decision_seeded_restart import (
    build_initial_state,
    build_mandatory_choice_decision,
    build_r1_safe_placement_decision,
    build_route_skeletons,
    load_inputs,
    make_stop_artifact,
    normalize_candidate_id,
    replay_routes_independently,
    validate_decision_bridge,
    validate_stop_artifact,
)


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"


class SeededRestartTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = load_inputs()

    def _real_suite(self):
        plan_path = DATA / "proxy-normal-decision-seeded-restart-plan-117-20260919.json"
        self.assertTrue(plan_path.exists(), "fixed restart plan is not implemented")
        plan = json.loads(plan_path.read_text())
        self.assertEqual(restart.validate_restart_plan(plan, self.inputs), [])
        suite = restart.build_seeded_restart_suite(plan, self.inputs)
        self.assertEqual(restart.validate_seeded_restart_suite(suite, plan, self.inputs), [])
        return plan, suite

    def test_evaluation_matches_route_artifacts_and_excludes_balance(self):
        _, suite = self._real_suite()
        self.assertTrue(hasattr(restart, "build_evaluation"), "evaluation is not implemented")
        evaluation = restart.build_evaluation(suite)
        self.assertEqual((evaluation["planned_route_count"], evaluation["completed_route_count"],
                          evaluation["stopped_route_count"], evaluation["independent_balance_sample_count"]),
                         (4, 0, 4, 0))
        expected_routes = []
        for path, candidate_count, seeded_count, person_type in [
                ("order-01-a-first", 11, 2, "partner"),
                ("order-01-b-first", 12, 2, "partner"),
                ("order-02-a-first", 9, 1, "companion"),
                ("order-02-b-first", 12, 2, "companion")]:
            stop = suite["outcomes"][path]["stop"]
            expected_routes.append({
                "path_id": path, "status": "stopped_rules_adjudication", "winner": None,
                "round": 1, "actor": stop["actor"], "phase": "post_placement_response",
                "stop_reason_code": stop["stop_reason_code"],
                "event_count": 3, "snapshot_count": 4, "decision_count": 2,
                "legal_candidate_count": candidate_count, "selected_action_count": 2,
                "use_count_by_card_type": {kind: int(kind == person_type) for kind in
                    ("main", "companion", "partner", "world", "play", "item", "event")},
                "unused_time": {actor: int(actor == stop["actor"]) for actor in ("A", "B")},
                "reservations": {"created": 0, "consumed": 0, "expired": 0, "maximum_simultaneous": 0},
                "reentries": 0, "instance_transition_count": 0,
                "growth_progression": [{"event_seq": seq, "A": 20, "B": 20} for seq in range(4)],
                "unresolved_count": 1, "seeded_fallback_count": seeded_count,
                "strategic_unresolved_count": seeded_count, "independent_balance_sample_count": 0,
                "balance_exclusion_reasons": ["seeded_or_strategically_unresolved", "stopped_before_match_completion"],
            })
        self.assertEqual(evaluation["routes"], expected_routes)
        self.assertEqual(evaluation["strategic_unresolved_count"], 7)
        self.assertEqual(evaluation["seeded_fallback_count"], 7)
        self.assertEqual(evaluation["unresolved_count"], 4)
        # Cached summaries must never override the saved replay evidence.
        corrupted_summary = copy.deepcopy(suite)
        corrupted_summary["completed_route_count"] = 4
        corrupted_summary["outcomes"]["order-01-a-first"]["metrics"]["legal_candidate_count"] = 999
        self.assertEqual(restart.build_evaluation(corrupted_summary), evaluation)
        # Evidence-only metric probes; these are not canonical game replays.
        for mutation in ("reservation_lifecycle", "instance_reentry"):
            with self.subTest(metric_evidence=mutation):
                changed = copy.deepcopy(suite)
                evidence = changed["replay_evidence"]["order-01-a-first"]
                expected = copy.deepcopy(evaluation)
                if mutation == "reservation_lifecycle":
                    evidence["events"][0]["reservations_created"] = ["reservation-a", "reservation-b"]
                    evidence["events"][1]["reservations_consumed"] = ["reservation-a"]
                    evidence["events"][2]["reservations_created"] = ["reservation-c"]
                    for seq in (1, 2, 3):
                        players = evidence["snapshots"][seq]["state"]["players"]
                        players["A"]["reservations"] = [{"reservation_id": "reservation-a",
                            "status": "active" if seq == 1 else "consumed"}]
                        players["B"]["reservations"] = [{"reservation_id": "reservation-b",
                            "status": "active" if seq == 1 else "expired"}]
                        if seq == 3:
                            players["A"]["reservations"].append({
                                "reservation_id": "reservation-c", "status": "active"})
                    expected["routes"][0]["reservations"] = {
                        "created": 3, "consumed": 1, "expired": 1, "maximum_simultaneous": 2}
                else:
                    evidence["events"][2]["instance_transitions"] = [{
                        "card_copy_id": "A-017", "from_instance_id": "A-017#1",
                        "to_instance_id": "A-017#2", "reason": "zone_change"}]
                    expected["routes"][0]["reentries"] = 1
                    expected["routes"][0]["instance_transition_count"] = 1
                self.assertEqual(restart.build_evaluation(changed), expected)

    def test_materialized_outputs_equal_builder_and_exact_manifest(self):
        _, suite = self._real_suite()
        self.assertTrue(hasattr(restart, "write_seeded_restart_suite"), "writer is not implemented")
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            restart.write_seeded_restart_suite(suite, root)
            expected = {"proxy-normal-decision-seeded-restart-evaluation-117-20260919.json":
                        restart.build_evaluation(suite)}
            expected.update({f"proxy-normal-decision-stops-117/stop-117-{path}.json": result["stop"]
                             for path, result in suite["outcomes"].items()})
            self.assertEqual({str(path.relative_to(root)) for path in root.rglob("*.json")}, set(expected))
            for relative, value in expected.items():
                self.assertEqual((root / relative).read_text(), json.dumps(value, ensure_ascii=False, indent=2) + "\n")
            self.assertFalse((root / "proxy-matches-117").exists())
            self.assertFalse((root / "proxy-decision-traces-117").exists())
            self.assertEqual(restart.validate_materialized_suite(suite, root), [])
        self.assertEqual(restart.validate_materialized_suite(suite, DATA), [])

    def test_materialized_validator_rejects_missing_extra_and_swapped_artifacts(self):
        _, suite = self._real_suite()
        self.assertTrue(hasattr(restart, "validate_materialized_suite"), "materialized validator is not implemented")
        for corruption in ("missing_stop", "extra_stop", "extra_non_json", "winner_stop", "empty_record_directory",
                           "missing_record", "swapped_completed", "malformed_json", "crlf"):
            with self.subTest(corruption=corruption), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                fixture = copy.deepcopy(suite)
                # Storage-only synthetic completed branch; never a canonical match.
                if corruption in {"missing_record", "swapped_completed"}:
                    fixture["outcomes"]["order-01-a-first"] = {
                        "status": "completed", "record": {"record": {"status": "completed", "result": {"winner": "A"}}},
                        "trace": {"decisions": []}, "metrics": {}}
                restart.write_seeded_restart_suite(fixture, root)
                stop_path = root / "proxy-normal-decision-stops-117/stop-117-order-01-b-first.json"
                if corruption == "missing_stop":
                    stop_path.unlink()
                elif corruption == "extra_stop":
                    (stop_path.parent / "stale.json").write_text("{}\n")
                    before = {str(path): path.read_bytes() for path in root.rglob("*.json")}
                    with self.assertRaisesRegex(ValueError, "extra|unexpected|stale"):
                        restart.write_seeded_restart_suite(fixture, root)
                    self.assertEqual({str(path): path.read_bytes() for path in root.rglob("*.json")}, before)
                elif corruption == "winner_stop":
                    value = json.loads(stop_path.read_text())
                    value["winner"] = "A"
                    stop_path.write_text(json.dumps(value))
                elif corruption == "extra_non_json":
                    (stop_path.parent / "stale.txt").write_text("not part of the exact manifest\n")
                elif corruption == "empty_record_directory":
                    (root / "proxy-matches-117").mkdir()
                elif corruption == "malformed_json":
                    stop_path.write_text("{")
                elif corruption == "crlf":
                    stop_path.write_bytes(stop_path.read_bytes().replace(b"\n", b"\r\n"))
                else:
                    record_path = next((root / "proxy-matches-117").glob("*.json"))
                    if corruption == "missing_record":
                        record_path.unlink()
                    else:
                        record_path.rename(stop_path.parent / record_path.name)
                self.assertTrue(restart.validate_materialized_suite(fixture, root))

    def test_population_and_checkpoint_112_boundaries_remain_unchanged(self):
        _, suite = self._real_suite()
        self.assertTrue(hasattr(restart, "build_evaluation"), "evaluation boundaries are not implemented")
        before = {path: path.read_bytes() for path in (DATA / "proxy-gap-fixtures-112").glob("*.json")}
        self.assertEqual(len(before), 6)
        with tempfile.TemporaryDirectory() as temporary:
            restart.write_seeded_restart_suite(suite, Path(temporary))
        self.assertEqual(before, {path: path.read_bytes() for path in before})
        for raw in before.values():
            fixture = json.loads(raw)["record"]
            self.assertEqual(fixture["status"], "fixture")
            self.assertEqual(fixture["events"], [])
            self.assertIsNone(fixture["result"]["winner"])
        self.assertEqual(restart.build_evaluation(suite)["population"], {
            "current_catalog": 452, "registered_candidates": 477,
            "changed_card_text_numeric_or_registration_ids": 0})
        checked = subprocess.run([sys.executable, str(TOOLS / "check-design-data.py"), "--catalog"],
                                 capture_output=True, text=True, check=False)
        self.assertEqual(checked.returncode, 0, checked.stdout + checked.stderr)
        self.assertEqual(json.loads(checked.stdout).get("proxy_test_count"), 190)

    def test_replay_links_each_decision_to_one_event_and_contiguous_snapshots(self):
        _, suite = self._real_suite()
        for path_id, evidence in suite["replay_evidence"].items():
            with self.subTest(path_id=path_id):
                events, snapshots = evidence["events"], evidence["snapshots"]
                self.assertEqual(len(snapshots), len(events) + 1)
                self.assertEqual([row["seq"] for row in snapshots], list(range(len(snapshots))))
                for index, event in enumerate(events, 1):
                    self.assertEqual(event["seq"], index)
                    self.assertEqual(event["state_before_sha256"], snapshots[index - 1]["state_sha256"])
                    self.assertEqual(event["state_after_sha256"], snapshots[index]["state_sha256"])
                for snapshot in snapshots:
                    self.assertEqual(snapshot["state_sha256"], canonical_sha256(snapshot["state"]))
                self.assertGreaterEqual(len(evidence["decisions"]), 2)
                for decision in evidence["decisions"]:
                    matches = [event for event in events if event.get("decision_id") == decision["step_id"]]
                    self.assertEqual(len(matches), 1)
                    self.assertEqual(decision["event_seq"], matches[0]["seq"])
                    self.assertEqual(decision["pre_state_sha256"], matches[0]["state_before_sha256"])

    def test_real_batch_contains_exact_four_independent_terminal_outcomes(self):
        plan, suite = self._real_suite()
        expected = ["order-01-a-first", "order-01-b-first", "order-02-a-first", "order-02-b-first"]
        self.assertEqual(list(suite["outcomes"]), expected)
        self.assertEqual(suite["planned_route_count"], 4)
        self.assertEqual(suite["completed_route_count"] + suite["stopped_route_count"], 4)
        for field in ("outcomes", "replay_evidence"):
            with self.subTest(reordered_mapping=field):
                reordered = copy.deepcopy(suite)
                reordered[field] = dict(reversed(list(reordered[field].items())))
                self.assertTrue(restart.validate_seeded_restart_suite(reordered, plan, self.inputs))
        for route in plan["routes"]:
            result = restart.replay_route(route, self.inputs)
            self.assertEqual(result, suite["outcomes"][route["path_id"]])
            self.assertIn(result["status"], {"completed", "stopped_rules_adjudication"})
        # A missing directive is a development failure, never a new stopped outcome.
        exhausted = copy.deepcopy(plan["routes"][0])
        exhausted.pop("terminal")
        with self.assertRaisesRegex(ValueError, "plan exhausted at"):
            restart.replay_route(exhausted, self.inputs)

    def test_completed_and_stop_artifacts_are_mutually_exclusive(self):
        plan, suite = self._real_suite()
        for result in suite["outcomes"].values():
            if result["status"] == "completed":
                self.assertEqual(set(result), {"status", "record", "trace", "metrics"})
                self.assertEqual(result["record"]["status"], "completed")
            else:
                self.assertEqual(set(result), {"status", "stop", "metrics"})
                self.assertIsNone(result["stop"]["winner"])
                self.assertEqual(validate_stop_artifact(result["stop"]), [])
        # A partial replay cannot be promoted just by replacing its status.
        forged = copy.deepcopy(plan["routes"][0])
        forged["terminal"] = {"status": "completed", "winner": "A", "round": 10}
        with self.assertRaisesRegex(ValueError, "canonical completion handler"):
            restart.replay_route(forged, self.inputs)
        mixed = copy.deepcopy(suite)
        mixed["outcomes"]["order-01-a-first"]["record"] = {"status": "completed"}
        self.assertTrue(restart.validate_seeded_restart_suite(mixed, plan, self.inputs))

    def test_decisions_use_only_owner_known_and_public_information(self):
        _, suite = self._real_suite()
        forbidden = {"opponent_hand", "deck_order", "deck_order_top_to_bottom", "future_draws", "future_result"}
        def inspect(value):
            if isinstance(value, dict):
                self.assertFalse(forbidden.intersection(value))
                for child in value.values():
                    inspect(child)
            elif isinstance(value, list):
                for child in value:
                    inspect(child)
        for evidence in suite["replay_evidence"].values():
            for decision in evidence["decisions"]:
                self.assertEqual(validate_pre_decision_state(decision["pre_decision_state"]), [])
                self.assertEqual(validate_public_information(decision["public_information"]), [])
                inspect(decision)
                actor = decision["actor"]
                self.assertTrue(all(card.startswith(actor + "-") for card in
                                    decision["public_information"]["own_hand"]))

    def test_invalid_selected_action_hash_or_instance_is_validator_error_not_stop(self):
        plan, suite = self._real_suite()
        stopped = suite["stopped_route_count"]
        wrong_plan = copy.deepcopy(plan)
        wrong_plan["routes"][0]["steps"][0]["selected_candidate"] = "A-999"
        self.assertTrue(restart.validate_seeded_restart_suite(suite, wrong_plan, self.inputs))
        self.assertEqual(suite["stopped_route_count"], stopped)
        for corruption in ("hash", "instance"):
            broken = copy.deepcopy(suite)
            evidence = broken["replay_evidence"]["order-01-a-first"]
            if corruption == "hash":
                evidence["events"][0]["state_after_sha256"] = "0" * 64
            else:
                evidence["decisions"][1]["selected_action"]["source_instance_id"] = "B-017#1"
            self.assertTrue(restart.validate_seeded_restart_suite(broken, plan, self.inputs))
            self.assertEqual(broken["stopped_route_count"], stopped)
        broken_plan = copy.deepcopy(plan)
        broken_plan["routes"][0]["steps"][1]["legal_candidate_details"][0]["source_instance_id"] = "B-017#1"
        self.assertTrue(restart.validate_restart_plan(broken_plan, self.inputs))

        # JSON booleans must not alias numeric transcript/proof fields.
        plan_mutations = [
            ("seed_context", ("routes", 0, "steps", 1, "resolution_evidence", "seed_context", "actor_turn_index"), True),
            ("round", ("routes", 0, "steps", 1, "round"), True),
            ("payment", ("routes", 0, "steps", 1, "payment", "time"), False),
            ("selected_index", ("routes", 0, "steps", 1, "resolution_evidence", "seed_proof", "selected_index"), False),
            ("scope_count", ("scope", "independent_balance_sample_count"), False),
        ]
        for name, path, value in plan_mutations:
            altered = copy.deepcopy(plan)
            target = altered
            for key in path[:-1]:
                target = target[key]
            self.assertIs(type(target[path[-1]]), int)
            self.assertEqual(target[path[-1]], int(value))
            target[path[-1]] = value
            if name == "seed_context":
                supplied = altered["routes"][0]["steps"][1]["resolution_evidence"]
                self.assertTrue(validate_seeded_resolution(supplied))
            for validator in ("plan", "suite", "builder"):
                with self.subTest(boolean_plan=name, validator=validator):
                    if validator == "plan":
                        self.assertTrue(restart.validate_restart_plan(altered, self.inputs))
                    elif validator == "suite":
                        self.assertTrue(restart.validate_seeded_restart_suite(suite, altered, self.inputs))
                    else:
                        with self.assertRaises(ValueError):
                            restart.build_seeded_restart_suite(altered, self.inputs)
            self.assertEqual(suite["stopped_route_count"], 4)
        for path, value in [
                (("independent_balance_sample_count",), False),
                (("completed_route_count",), False),
                (("replay_evidence", "order-01-a-first", "events", 0, "round"), True),
                (("outcomes", "order-01-a-first", "stop", "counts_as_completed_match"), 0)]:
            with self.subTest(suite_json_type=path):
                altered = copy.deepcopy(suite)
                target = altered
                for key in path[:-1]:
                    target = target[key]
                target[path[-1]] = value
                self.assertTrue(restart.validate_seeded_restart_suite(altered, plan, self.inputs))
                self.assertEqual(altered["stopped_route_count"], 4)

    def test_seeded_and_strategic_counts_force_independent_balance_zero(self):
        _, suite = self._real_suite()
        self.assertEqual(suite["independent_balance_sample_count"], 0)
        for path_id, result in suite["outcomes"].items():
            metrics = result["metrics"]
            decisions = suite["replay_evidence"][path_id]["decisions"]
            self.assertGreater(metrics["seeded_fallback_count"], 0)
            self.assertGreater(metrics["strategic_unresolved_count"], 0)
            self.assertEqual(metrics["seeded_fallback_count"], sum(
                row["resolution_mode"] == "seeded_fallback" for row in decisions))
            self.assertEqual(metrics["independent_balance_sample_count"], 0)
            self.assertIn("seeded_or_strategically_unresolved", metrics["balance_exclusion_reasons"])

    def test_route_skeletons_preserve_exact_manifests_and_mirrors(self):
        routes = build_route_skeletons(self.inputs)
        self.assertEqual([row["path_id"] for row in routes], [
            "order-01-a-first", "order-01-b-first",
            "order-02-a-first", "order-02-b-first",
        ])
        source_players = {
            player["player_id"]: player["deck_order_top_to_bottom"]
            for player in self.inputs["source"]["input"]["players"]
        }
        plan_manifests = {
            order["order_id"]: order["players"]
            for order in self.inputs["first_choice_plan"]["orders"]
        }
        for order_id in ("order-01", "order-02"):
            pair = [row for row in routes if row["order_id"] == order_id]
            self.assertEqual(pair[0]["players"], pair[1]["players"])
            for route in pair:
                self.assertEqual(route["players"], plan_manifests[order_id])
                self.assertEqual({len(p["deck_order_top_to_bottom"])
                                  for p in route["players"]}, {40})
                for player in route["players"]:
                    self.assertEqual(
                        {(card["card_copy_id"], card["card_id"], card["initial_instance_id"])
                         for card in player["deck_order_top_to_bottom"]},
                        {(card["card_copy_id"], card["card_id"], card["initial_instance_id"])
                         for card in source_players[player["player_id"]]},
                    )

    def test_r1_mandatory_choices_match_four_known_seed_results(self):
        routes = {route["path_id"]: route for route in build_route_skeletons(self.inputs)}
        audit_paths = self.inputs["first_choice_audit"]["paths"]
        expected = {
            "order-01-a-first": ("A-023", "G-air-hockey"),
            "order-01-b-first": ("B-022", "W-deepsea"),
            "order-02-a-first": ("A-007", "M-antlion-07"),
            "order-02-b-first": ("B-034", "I-poop1"),
        }
        for path in audit_paths:
            with self.subTest(path_id=path["path_id"]):
                decision = build_mandatory_choice_decision(
                    routes[path["path_id"]], path["first_player"], 1, 1,
                    path["hand_before_choice"],
                )
                selected_copy, selected_card = expected[path["path_id"]]
                self.assertEqual(decision["selected_candidate"], selected_copy)
                self.assertEqual(decision["selected_action"]["card_id"], selected_card)
                self.assertEqual(
                    decision["runner_up_action"],
                    next(detail for detail in decision["legal_candidate_details"]
                         if detail["candidate_id"] == decision["runner_up_candidates"][0]),
                )
                self.assertEqual(validate_seeded_resolution(decision), [])
                self.assertEqual(validate_decision_bridge(decision), [])

    def test_initial_state_uses_manifest_top_five_and_unique_instances(self):
        for route in build_route_skeletons(self.inputs):
            with self.subTest(path_id=route["path_id"]):
                state = build_initial_state(route)
                self.assertEqual(state["round"], 0)
                self.assertEqual(state["phase"], "before_match")
                self.assertIsNone(state["turn_player"])
                all_instances = []
                for source in route["players"]:
                    player_id = source["player_id"]
                    expected = [card["initial_instance_id"]
                                for card in source["deck_order_top_to_bottom"]]
                    player = state["players"][player_id]
                    self.assertEqual(player["hand"], expected[:5])
                    self.assertEqual(player["deck"], expected[5:])
                    self.assertEqual(len(player["deck"]), 35)
                    self.assertEqual(player["time"], 0)
                    self.assertEqual(player["growth"], 20)
                    self.assertEqual(player["reservations"], [])
                    all_instances.extend(player["hand"] + player["deck"])
                self.assertEqual(len(all_instances), 80)
                self.assertEqual(len(set(all_instances)), 80)
                self.assertEqual(set(all_instances), set(state["cards"]))

    def test_r1_safe_placements_match_four_known_results(self):
        routes = {route["path_id"]: route for route in build_route_skeletons(self.inputs)}
        expected = {
            "order-01-a-first": ("candidate-place-partner-A-017#1", "seeded_fallback"),
            "order-01-b-first": ("candidate-place-partner-B-017#1", "seeded_fallback"),
            "order-02-a-first": ("candidate-place-companion-A-014#1", "safe_free_development"),
            "order-02-b-first": ("candidate-place-companion-B-014#1", "seeded_fallback"),
        }
        for audit_path in self.inputs["first_choice_audit"]["paths"]:
            path_id = audit_path["path_id"]
            with self.subTest(path_id=path_id):
                route = routes[path_id]
                state = self._r1_state_after_mandatory_choice(route, audit_path)
                decision = build_r1_safe_placement_decision(route, state)
                selected, resolution = expected[path_id]
                self.assertEqual(decision["selected_candidate"], selected)
                self.assertEqual(decision["resolution_mode"], resolution)
                self.assertEqual(validate_decision_bridge(decision), [])
                if resolution == "seeded_fallback":
                    self.assertEqual(validate_seeded_resolution(decision), [])

    def test_safe_placement_keeps_complete_legal_set_and_excludes_pass_from_lottery(self):
        routes = {route["path_id"]: route for route in build_route_skeletons(self.inputs)}
        for audit_path in self.inputs["first_choice_audit"]["paths"]:
            path_id = audit_path["path_id"]
            with self.subTest(path_id=path_id):
                route = routes[path_id]
                state = self._r1_state_after_mandatory_choice(route, audit_path)
                decision = build_r1_safe_placement_decision(route, state)
                self.assertIn("pass", decision["legal_candidates"])
                if decision["resolution_mode"] == "seeded_fallback":
                    self.assertNotIn("pass", decision["seeded_fallback_candidates"])
                    self.assertEqual(
                        decision["seeded_fallback_candidates"],
                        sorted(detail["candidate_id"] for detail in decision["legal_candidate_details"]
                               if detail.get("person_type") in {"companion", "partner"}),
                    )
                enumeration_rule = decision["candidate_set_evidence"]["enumeration_rule"]
                self.assertIn("reaction-only actions", enumeration_rule)
                self.assertIn("no required R1 target", enumeration_rule)
                self.assertIn("insufficient time 0", enumeration_rule)

    def test_stop_artifact_is_winnerless_resumable_and_not_completed(self):
        route = build_route_skeletons(self.inputs)[0]
        state = build_initial_state(route)
        stop = {
            "actor": "A",
            "round": 1,
            "phase": "normal_action",
            "last_valid_event_seq": 2,
            "last_valid_state_sha256": self._state_hash(state),
            "known_candidate_ids": ["candidate-place-partner-A-017#1", "pass"],
            "missing_candidate_scope": "unresolved target-dependent actions",
            "stop_reason_code": "legality_not_confirmed",
            "source_references": ["114.candidate_table", "116.stop_conditions"],
            "resume_condition": "confirm every target-dependent legal action",
        }
        artifact = make_stop_artifact(route, state, stop)
        self.assertEqual(set(artifact), {
            "schema", "checkpoint", "status", "path_id", "order_id", "first_player",
            "actor", "round", "phase", "last_valid_event_seq", "last_valid_state_sha256",
            "pre_decision_state", "known_candidate_ids", "missing_candidate_scope",
            "stop_reason_code", "source_references", "resume_condition", "winner",
            "counts_as_completed_match", "counts_as_independent_balance_sample",
        })
        self.assertEqual(artifact["status"], "stopped_rules_adjudication")
        self.assertIsNone(artifact["winner"])
        self.assertEqual(artifact["last_valid_event_seq"], 2)
        self.assertEqual(artifact["last_valid_state_sha256"], self._state_hash(state))
        self.assertEqual(artifact["pre_decision_state"], state)
        self.assertEqual(artifact["known_candidate_ids"], ["candidate-place-partner-A-017#1", "pass"])
        self.assertEqual(artifact["missing_candidate_scope"], "unresolved target-dependent actions")
        self.assertEqual(artifact["stop_reason_code"], "legality_not_confirmed")
        self.assertEqual(artifact["source_references"], ["114.candidate_table", "116.stop_conditions"])
        self.assertEqual(artifact["resume_condition"], "confirm every target-dependent legal action")
        self.assertFalse(artifact["counts_as_completed_match"])
        self.assertFalse(artifact["counts_as_independent_balance_sample"])
        self.assertEqual(validate_stop_artifact(artifact), [])

    def test_one_route_stop_does_not_cancel_other_routes(self):
        route_specs = copy.deepcopy(build_route_skeletons(self.inputs))
        for route in route_specs:
            route["next_step"] = "r1-normal-action"
        stopped = route_specs[1]
        stopped["stop"] = {
            "actor": "B", "round": 1, "phase": "normal_action",
            "last_valid_event_seq": 0,
            "last_valid_state_sha256": self._state_hash(build_initial_state(stopped)),
            "known_candidate_ids": ["pass"],
            "missing_candidate_scope": "unknown legal actions",
            "stop_reason_code": "legality_not_confirmed",
            "source_references": ["114.candidate_table"],
            "resume_condition": "adjudicate legal actions",
        }
        results = replay_routes_independently(route_specs, self.inputs)
        self.assertEqual([result["path_id"] for result in results], [
            "order-01-a-first", "order-01-b-first",
            "order-02-a-first", "order-02-b-first",
        ])
        self.assertEqual(len(results), 4)
        self.assertEqual(results[1]["status"], "stopped_rules_adjudication")
        self.assertEqual(
            [result["next_step"] for index, result in enumerate(results) if index != 1],
            ["r1-normal-action", "r1-normal-action", "r1-normal-action"],
        )

    def test_stop_artifact_binds_hash_and_rejects_corrupt_state_integrity(self):
        route = build_route_skeletons(self.inputs)[0]
        state = build_initial_state(route)
        artifact = make_stop_artifact(route, state, self._stop_input(state))
        self.assertEqual(validate_stop_artifact(artifact), [])
        r1_state = self._r1_state_after_mandatory_choice(
            route, self.inputs["first_choice_audit"]["paths"][0])
        self.assertEqual(
            validate_stop_artifact(make_stop_artifact(route, r1_state, self._stop_input(r1_state))),
            [],
        )

        wrong_hash = copy.deepcopy(artifact)
        wrong_hash["last_valid_state_sha256"] = "0" * 64
        self.assertIn("stop artifact hash does not bind pre_decision_state",
                      validate_stop_artifact(wrong_hash))

        cases = {}
        missing = copy.deepcopy(artifact)
        missing["pre_decision_state"]["players"]["A"]["deck"].pop()
        cases["missing"] = missing
        unknown = copy.deepcopy(artifact)
        unknown["pre_decision_state"]["players"]["A"]["hand"].append("A-999#1")
        cases["unknown"] = unknown
        duplicate = copy.deepcopy(artifact)
        duplicate["pre_decision_state"]["players"]["A"]["deck"].append(
            duplicate["pre_decision_state"]["players"]["A"]["hand"][0])
        cases["duplicate"] = duplicate
        malformed = copy.deepcopy(artifact)
        malformed["pre_decision_state"]["cards"]["A-001#1"]["card_copy_id"] = "A-999"
        cases["malformed mapping"] = malformed
        card_id_substitution = copy.deepcopy(artifact)
        card_id_substitution["pre_decision_state"]["cards"]["A-001#1"]["card_id"] = "C-unknown"
        cases["unknown manifest card ID"] = card_id_substitution
        unknown_instance = copy.deepcopy(artifact)
        self._rename_instance_everywhere(
            unknown_instance["pre_decision_state"], "A-001#1", "A-999#1")
        cases["unknown manifest instance"] = unknown_instance
        for name, broken in cases.items():
            with self.subTest(name=name):
                broken["last_valid_state_sha256"] = self._state_hash(
                    broken["pre_decision_state"])
                errors = validate_stop_artifact(broken)
                self.assertTrue(errors)
                if name in {"unknown manifest card ID", "unknown manifest instance"}:
                    self.assertIn("stop artifact cards differ from 115 manifest", errors)

        plan, suite = self._real_suite()
        for player_id in ("A", "B"):
            for name, reservations in [
                    ("non-list", "corrupt"), ("malformed-entry", [{}]),
                    ("nonexistent-instance", [{"reservation_id": "reservation-a", "status": "active",
                                               "target_instance_id": "A-999#1"}])]:
                broken = copy.deepcopy(suite["outcomes"]["order-01-a-first"]["stop"])
                broken["pre_decision_state"]["players"][player_id]["reservations"] = reservations
                broken["last_valid_state_sha256"] = self._state_hash(broken["pre_decision_state"])
                with self.subTest(reservations=name, player=player_id, boundary="validator"):
                    self.assertTrue(validate_stop_artifact(broken))
                with self.subTest(reservations=name, player=player_id, boundary="constructor"):
                    with self.assertRaises(ValueError):
                        make_stop_artifact(plan["routes"][0], broken["pre_decision_state"], broken)

    def test_r1_candidates_require_114_actions_open_slots_and_affordable_stage_one_birth(self):
        route = build_route_skeletons(self.inputs)[1]
        audit_path = self.inputs["first_choice_audit"]["paths"][1]
        state = self._r1_state_after_mandatory_choice(route, audit_path)
        actor = route["first_player"]
        stage_one = next(instance_id for instance_id in state["players"][actor]["hand"]
                         if state["cards"][instance_id]["card_id"] == "M-antlion-01")
        partner = next(instance_id for instance_id in state["players"][actor]["hand"]
                       if state["cards"][instance_id]["card_id"] == "P-cat_ceo")
        self.assertNotIn(f"candidate-play-main-{stage_one}-birth",
                         build_r1_safe_placement_decision(route, state)["legal_candidates"])

        affordable = copy.deepcopy(state)
        affordable["players"][actor]["time"] = 1
        self.assertIn(f"candidate-play-main-{stage_one}-birth",
                      build_r1_safe_placement_decision(route, affordable)["legal_candidates"])

        occupied_main = copy.deepcopy(affordable)
        occupied_main["players"][actor]["board"]["main"] = stage_one
        occupied_main["players"][actor]["hand"].remove(stage_one)
        self.assertNotIn(f"candidate-play-main-{stage_one}-birth",
                         build_r1_safe_placement_decision(route, occupied_main)["legal_candidates"])

        occupied_partner = copy.deepcopy(state)
        occupied_partner["players"][actor]["board"]["partner"] = partner
        occupied_partner["players"][actor]["hand"].remove(partner)
        self.assertNotIn(f"candidate-place-partner-{partner}",
                         build_r1_safe_placement_decision(route, occupied_partner)["legal_candidates"])

        unlisted = copy.deepcopy(state)
        unlisted["players"][actor]["hand"].append("B-002#1")
        unlisted["players"][actor]["deck"].remove("B-002#1")
        unlisted["cards"]["B-002#1"]["card_id"] = "C-unlisted"
        self.assertNotIn("candidate-place-companion-B-002#1",
                         build_r1_safe_placement_decision(route, unlisted)["legal_candidates"])

        wrong_stage = copy.deepcopy(affordable)
        stage_two = next(instance_id for instance_id in wrong_stage["players"][actor]["hand"]
                         if wrong_stage["cards"][instance_id]["card_id"] == "M-beetle-02")
        self.assertNotIn(f"candidate-play-main-{stage_two}-birth",
                         build_r1_safe_placement_decision(route, wrong_stage)["legal_candidates"])

    def test_r1_mandatory_choice_state_moves_selected_instance_to_deck_bottom(self):
        routes = {route["path_id"]: route for route in build_route_skeletons(self.inputs)}
        for audit_path in self.inputs["first_choice_audit"]["paths"]:
            route = routes[audit_path["path_id"]]
            actor = route["first_player"]
            selected = build_mandatory_choice_decision(
                route, actor, 1, 1, audit_path["hand_before_choice"])["selected_candidate"]
            selected_instance = next(card["initial_instance_id"] for card in audit_path["hand_before_choice"]
                                     if card["card_copy_id"] == selected)
            state = self._r1_state_after_mandatory_choice(route, audit_path)
            with self.subTest(path_id=route["path_id"]):
                self.assertEqual(state["players"][actor]["deck"][-1], selected_instance)
                self.assertNotIn(selected_instance, state["players"][actor]["hand"])
                self._assert_player_zone_accounting(state, actor)
                self._assert_player_zone_accounting(state, "B" if actor == "A" else "A")

    def test_mirror_labels_do_not_change_seed_proof(self):
        route = build_route_skeletons(self.inputs)[0]
        hand = self.inputs["first_choice_audit"]["paths"][0]["hand_before_choice"]
        original = build_mandatory_choice_decision(route, "A", 1, 1, hand)
        relabeled = copy.deepcopy(route)
        relabeled.update({
            "path_id": "any-unrelated-path", "first_player": "B",
            "match_id": "unrelated-match",
        })
        mirrored = build_mandatory_choice_decision(relabeled, "A", 1, 1, hand)
        self.assertEqual(original["seed_proof"], mirrored["seed_proof"])

    def test_pass_bridge_binds_ids_details_and_114_source(self):
        decision = self._pass_decision()
        self.assertEqual(decision["legal_candidates"], ["pass"])
        self.assertEqual(decision["legal_candidate_details"][0]["candidate_id"], "pass")
        self.assertEqual(decision["legal_candidate_details"][0]["source_candidate_id"], "candidate-pass")
        self.assertEqual(decision["selected_action"], decision["legal_candidate_details"][0])
        self.assertEqual(validate_decision_bridge(decision), [])
        self.assertEqual(validate_decision_bridge(decision, self.inputs["candidate_table"]), [])
        forged_table = copy.deepcopy(self.inputs["candidate_table"])
        forged_table["standing_candidates"][0]["candidate_id"] = "candidate-not-pass"
        self.assertTrue(validate_decision_bridge(decision, forged_table))

    def test_normalize_candidate_id_only_maps_the_114_pass_alias(self):
        self.assertEqual(normalize_candidate_id("candidate-pass"), "pass")
        self.assertEqual(normalize_candidate_id("candidate-place-A-017"), "candidate-place-A-017")
        for malformed in (None, "", [], {}, 0):
            with self.subTest(malformed=malformed):
                with self.assertRaises(ValueError):
                    normalize_candidate_id(malformed)

    def test_bridge_rejects_alias_mix_duplicate_or_unbound_details(self):
        cases = {}
        alias_mix = self._pass_decision()
        alias_mix["legal_candidates"] = ["candidate-pass"]
        cases["alias mix"] = alias_mix
        duplicate = self._pass_decision()
        duplicate["legal_candidates"] = ["pass", "pass"]
        duplicate["legal_candidate_details"].append(copy.deepcopy(duplicate["legal_candidate_details"][0]))
        cases["duplicate ID"] = duplicate
        missing = self._pass_decision()
        missing["legal_candidate_details"] = []
        cases["detail missing"] = missing
        extra = self._pass_decision()
        extra["legal_candidate_details"].append({"candidate_id": "extra"})
        cases["extra detail"] = extra
        selected = self._pass_decision()
        selected["selected_candidate"] = "other"
        cases["selected mismatch"] = selected
        runner_up = self._pass_decision()
        runner_up["runner_up_candidates"] = ["pass"]
        runner_up["runner_up_action"] = copy.deepcopy(runner_up["selected_action"])
        cases["runner-up mismatch"] = runner_up
        for name, broken in cases.items():
            with self.subTest(name=name):
                self.assertTrue(validate_decision_bridge(broken))
        for malformed in (None, [], [[]], [{}], {"candidate_id": []}, {"candidate_id": {}}):
            with self.subTest(malformed=malformed):
                decision = self._pass_decision()
                decision["legal_candidates"] = malformed
                self.assertTrue(validate_decision_bridge(decision))

        plan, _ = self._real_suite()
        for step in plan["routes"][0]["steps"]:
            original = step["resolution_evidence"]
            self.assertEqual(validate_decision_bridge(original), [])
            for field in ("selected_action", "runner_up_action"):
                candidate_id = (original["selected_candidate"] if field == "selected_action"
                                else original["runner_up_candidates"][0])
                mutations = {"wrong-copy": {**original[field], "card_copy_id": "B-017"},
                             "candidate-only": {"candidate_id": candidate_id}}
                for required in original[field]:
                    # The legacy mandatory choice is identified by card_copy_id.
                    # A canonical action must retain its candidate ID and all detail fields.
                    missing = copy.deepcopy(original[field])
                    missing.pop(required)
                    mutations[f"missing-{required}"] = missing
                for mutation, action in mutations.items():
                    with self.subTest(choice=step["choice_kind"], action=field, mutation=mutation):
                        broken = copy.deepcopy(original)
                        broken[field] = action
                        self.assertTrue(validate_decision_bridge(broken))

    @staticmethod
    def _r1_state_after_mandatory_choice(route, audit_path):
        state = build_initial_state(route)
        actor = route["first_player"]
        selected = build_mandatory_choice_decision(
            route, actor, 1, 1, audit_path["hand_before_choice"])["selected_candidate"]
        pre_choice_instances = [card["initial_instance_id"]
                                for card in audit_path["hand_before_choice"]]
        selected_instance = next(card["initial_instance_id"]
                                 for card in audit_path["hand_before_choice"]
                                 if card["card_copy_id"] == selected)
        hand = [instance_id for instance_id in pre_choice_instances
                if instance_id != selected_instance]
        manifest_instances = [card["initial_instance_id"]
                              for player in route["players"] if player["player_id"] == actor
                              for card in player["deck_order_top_to_bottom"]]
        state["players"][actor]["hand"] = hand
        state["players"][actor]["deck"] = [instance_id for instance_id in manifest_instances
                                              if instance_id not in pre_choice_instances] + [selected_instance]
        state["turn_player"] = actor
        state["round"] = 1
        state["phase"] = "normal_action"
        return state

    @staticmethod
    def _state_hash(state):
        canonical_state = copy.deepcopy(state)
        canonical_state.pop("cards", None)
        return canonical_sha256(canonical_state)

    @classmethod
    def _stop_input(cls, state):
        return {
            "actor": "A", "round": 1, "phase": "normal_action",
            "last_valid_event_seq": 2, "last_valid_state_sha256": cls._state_hash(state),
            "known_candidate_ids": ["candidate-place-partner-A-017#1", "pass"],
            "missing_candidate_scope": "unresolved target-dependent actions",
            "stop_reason_code": "legality_not_confirmed",
            "source_references": ["114.candidate_table", "116.stop_conditions"],
            "resume_condition": "confirm every target-dependent legal action",
        }

    @staticmethod
    def _assert_player_zone_accounting(state, player_id):
        player = state["players"][player_id]
        board = player["board"]
        instances = player["hand"] + player["deck"] + player["discard"] + \
            board["companions"] + board["prepared"] + \
            [instance_id for instance_id in (board["main"], board["partner"], board["world"])
             if instance_id is not None]
        owned = {instance_id for instance_id in state["cards"]
                 if instance_id.startswith(f"{player_id}-")}
        if len(instances) != 40 or len(set(instances)) != 40 or set(instances) != owned:
            raise AssertionError("player zones must contain each owned initial instance exactly once")

    @staticmethod
    def _rename_instance_everywhere(state, old_instance_id, new_instance_id):
        card = state["cards"].pop(old_instance_id)
        card["initial_instance_id"] = new_instance_id
        card["card_copy_id"] = new_instance_id.split("#", 1)[0]
        state["cards"][new_instance_id] = card
        for player in state["players"].values():
            for field in ("hand", "deck", "discard"):
                player[field] = [new_instance_id if value == old_instance_id else value
                                 for value in player[field]]
            board = player["board"]
            for field in ("companions", "prepared"):
                board[field] = [new_instance_id if value == old_instance_id else value
                                for value in board[field]]
            for field in ("main", "partner", "world"):
                if board[field] == old_instance_id:
                    board[field] = new_instance_id

    @staticmethod
    def _synthetic_players():
        return [
            {"player_id": player_id, "deck_order_top_to_bottom": [
                {"card_copy_id": f"{player_id}-{index:03d}",
                 "card_id": "M-antlion-01",
                 "initial_instance_id": f"{player_id}-{index:03d}#1"}
                for index in range(1, 41)
            ]}
            for player_id in ("A", "B")
        ]

    @staticmethod
    def _pass_decision():
        detail = {
            "candidate_id": "pass",
            "source_candidate_id": "candidate-pass",
            "kind": "pass",
            "action_type": "pass",
        }
        return {
            "decision_kind": "mandatory_choice",
            "resolution_mode": "seeded_fallback",
            "strategic_unresolved": True,
            "reason_code": "strategic_unresolved_seeded_fallback",
            "legal_candidates": ["pass"],
            "legal_candidate_details": [detail],
            "candidate_set_complete": True,
            "candidate_set_evidence": {
                "source_ref": "114.candidate-pass",
                "state_ref": "R1:egg_exchange_choice:A",
                "enumeration_rule": "complete legal actions",
            },
            "seeded_fallback_candidates": ["pass"],
            "seed_context": {
                "contract_version": "naotocchi.card_game.proxy_normal_decision_fallback.v1",
                "order_id": "order-01",
                "actor": "A",
                "actor_turn_index": 1,
                "round": 1,
                "phase": "egg_exchange_choice",
                "decision_kind": "mandatory_choice",
                "choice_kind": "egg_exchange_bottom",
            },
            "seed_proof": {
                "algorithm": "sha256_modulo",
                "seed_material": [
                    "naotocchi.card_game.proxy_normal_decision_fallback.v1", "order-01", "A", 1,
                    1, "egg_exchange_choice", "mandatory_choice", "egg_exchange_bottom", ["pass"],
                ],
                "canonical_serialization": "[\"naotocchi.card_game.proxy_normal_decision_fallback.v1\",\"order-01\",\"A\",1,1,\"egg_exchange_choice\",\"mandatory_choice\",\"egg_exchange_bottom\",[\"pass\"]]",
                "sha256": "444be87babebdf823f8f97eb3b4d4752f880e3f4d2f043ff6162aba05ed69d28",
                "canonical_candidate_ids": ["pass"],
                "candidate_count": 1,
                "selected_index": 0,
                "selected_candidate": "pass",
            },
            "selected_candidate": "pass",
            "selected_action": detail,
            "runner_up_candidates": [],
            "runner_up_action": None,
        }


if __name__ == "__main__":
    unittest.main()
