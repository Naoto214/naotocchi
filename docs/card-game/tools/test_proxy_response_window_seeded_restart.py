#!/usr/bin/env python3
import copy
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
CARD_GAME = TOOLS.parent
DATA = CARD_GAME / "data"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from proxy_normal_decision_seeded_restart import build_seeded_restart_suite
from proxy_normal_decision_fallback_contract import validate_seeded_resolution
from proxy_response_window_contract import build_checkpoint_119
from proxy_response_window_seeded_restart import (
    PROTECTED_RAW_SHA256,
    PROTECTED_STATE_SHA256,
    PROTECTED_STOPS,
    ACTION_HANDLERS,
    DECISION_RESOLVERS,
    INTEGRITY_STOP_REASONS,
    ImplementationError,
    RULES_STOP_REASONS,
    RulesAdjudicationStop,
    RouteIntegrityStop,
    activate_response_candidate,
    apply_decision,
    apply_response_pass,
    build_adjudicated_plan_120,
    build_completed_record,
    build_evaluation_120,
    build_resume_state,
    continuation_state_sha256,
    continue_routes_independently,
    enumerate_response_opportunity,
    expected_artifacts_120,
    enumerate_decision_opportunity,
    game_state_sha256,
    load_checkpoint_120_inputs,
    make_integrity_stop,
    make_rules_stop,
    resolve_response_choice,
    resolve_chain,
    resolve_first_date,
    resolve_decision,
    replay_route_120,
    validate_materialized_checkpoint_120,
    validate_restart_plan_120,
    verify_protected_sources,
    write_checkpoint_120,
)


class ResponseWindowSeededRestartTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = load_checkpoint_120_inputs()

    def test_protected_raw_sources_and_four_state_hashes_are_exact(self):
        self.assertEqual(len(PROTECTED_STOPS), 4)
        self.assertEqual(len(PROTECTED_RAW_SHA256), 16)
        self.assertEqual(verify_protected_sources(self.inputs), [])
        for path_id, (filename, raw_sha256, state_sha256) in PROTECTED_STOPS.items():
            with self.subTest(path_id=path_id):
                path = DATA / "proxy-normal-decision-stops-117" / filename
                stop = next(row for row in self.inputs["stops_117"]
                            if row["path_id"] == path_id)
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), raw_sha256)
                self.assertEqual(game_state_sha256(stop["pre_decision_state"]), state_sha256)
                self.assertEqual(PROTECTED_STATE_SHA256[path_id], state_sha256)

    def test_checkpoint_117_regeneration_ends_at_saved_stop_state(self):
        suite = build_seeded_restart_suite(
            self.inputs["restart_plan_117"],
            self.inputs["normal_decision_inputs_117"],
        )
        for stop in self.inputs["stops_117"]:
            with self.subTest(path_id=stop["path_id"]):
                regenerated = suite["outcomes"][stop["path_id"]]["stop"]
                self.assertEqual(regenerated, stop)
                self.assertEqual(
                    game_state_sha256(regenerated["pre_decision_state"]),
                    stop["last_valid_state_sha256"],
                )

    def test_checkpoint_119_regeneration_equals_saved_contract_and_audit(self):
        rebuilt = build_checkpoint_119(self.inputs["response_window_inputs_119"])
        self.assertEqual(rebuilt, self.inputs["saved_checkpoint_119"])
        for key, path in {
            "contract": DATA / "proxy-response-window-contract-119-20260922.json",
            "candidate_audit": DATA / "proxy-response-window-candidate-audit-119-20260922.json",
        }.items():
            expected = (json.dumps(rebuilt[key], ensure_ascii=False, indent=2) + "\n").encode()
            self.assertEqual(path.read_bytes(), expected)

    def test_resume_state_preserves_source_state_phase_event_and_hash(self):
        for stop in self.inputs["stops_117"]:
            with self.subTest(path_id=stop["path_id"]):
                resume = build_resume_state(stop)
                path_id = stop["path_id"]
                self.assertEqual(resume["source_event_seq"], 3)
                self.assertEqual(resume["game_state"]["phase"], "post_placement_response")
                self.assertEqual(
                    resume["source_game_state_sha256"],
                    PROTECTED_STATE_SHA256[path_id],
                )
                self.assertEqual(
                    game_state_sha256(resume["game_state"]),
                    PROTECTED_STATE_SHA256[path_id],
                )
                self.assertEqual(resume["response_context"]["phase"], "response_window")
                self.assertNotEqual(
                    resume["continuation_state_sha256"],
                    resume["source_game_state_sha256"],
                )

    def test_dual_hash_adapter_keeps_source_hash_and_adds_continuation_hash(self):
        stop = self.inputs["stops_117"][0]
        resume = build_resume_state(stop)
        continuation = {
            "game_state": resume["game_state"],
            "response_context": resume["response_context"],
            "activation_zone": resume["activation_zone"],
            "pending_triggers": resume["pending_triggers"],
            "return_target": resume["return_target"],
        }
        self.assertEqual(game_state_sha256(resume["game_state"]),
                         stop["last_valid_state_sha256"])
        self.assertEqual(continuation_state_sha256(continuation),
                         resume["continuation_state_sha256"])
        mutated = copy.deepcopy(continuation)
        mutated["response_context"]["consecutive_passes"] = 1
        self.assertEqual(game_state_sha256(mutated["game_state"]),
                         stop["last_valid_state_sha256"])
        self.assertNotEqual(continuation_state_sha256(mutated),
                            resume["continuation_state_sha256"])

    def test_resume_adapter_does_not_mutate_117_stop_or_119_audit(self):
        stops_before = copy.deepcopy(self.inputs["stops_117"])
        audit_before = copy.deepcopy(
            self.inputs["saved_checkpoint_119"]["candidate_audit"]
        )
        for stop in self.inputs["stops_117"]:
            build_resume_state(stop)
        self.assertEqual(self.inputs["stops_117"], stops_before)
        self.assertEqual(
            self.inputs["saved_checkpoint_119"]["candidate_audit"],
            audit_before,
        )

    def test_protected_or_regenerated_source_mismatch_is_global_error(self):
        with tempfile.TemporaryDirectory() as temporary:
            copied_root = Path(temporary) / "card-game"
            shutil.copytree(CARD_GAME, copied_root)
            protected = copied_root / "data" / (
                "proxy-normal-decision-fallback-contract-116-20260918.json"
            )
            protected.write_bytes(protected.read_bytes() + b" ")
            copied_inputs = load_checkpoint_120_inputs(copied_root / "data")
            errors = verify_protected_sources(copied_inputs, copied_root / "data")
        self.assertIn(
            "protected source hash differs: "
            "data/proxy-normal-decision-fallback-contract-116-20260918.json",
            errors,
        )
        self.assertFalse(any("stopped_rules_adjudication" in error for error in errors))

    def test_checkpoint_112_six_fixtures_remain_unplayed_and_byte_exact(self):
        fixture_paths = sorted((DATA / "proxy-gap-fixtures-112").glob("*.json"))
        self.assertEqual(len(fixture_paths), 6)
        for path in fixture_paths:
            relative = path.relative_to(CARD_GAME).as_posix()
            with self.subTest(path=relative):
                raw = path.read_bytes()
                self.assertEqual(
                    hashlib.sha256(raw).hexdigest(),
                    PROTECTED_RAW_SHA256[relative],
                )
                record = json.loads(raw)["record"]
                self.assertEqual(record["status"], "fixture")
                self.assertEqual(record["events"], [])
                self.assertIsNone(record["result"]["winner"])
                self.assertEqual(record["result"]["rounds_completed"], 0)
                self.assertFalse(json.loads(raw)["test_plan"]["automated_game"])

    def test_first_four_opportunities_equal_checkpoint_119_audit(self):
        audits = {
            row["path_id"]: row
            for row in self.inputs["saved_checkpoint_119"]["candidate_audit"]["audits"]
        }
        for stop in self.inputs["stops_117"]:
            path_id = stop["path_id"]
            with self.subTest(path_id=path_id):
                opportunity = enumerate_response_opportunity(
                    build_resume_state(stop),
                    stop["actor"],
                    self.inputs["response_window_inputs_119"]["candidate_table"],
                )
                audit = audits[path_id]
                self.assertEqual(opportunity["response_context"],
                                 audit["response_context"])
                self.assertEqual(opportunity["inspected_information"],
                                 audit["inspected_information"])
                for key in (
                    "legal_candidate_ids",
                    "legal_candidate_details",
                    "excluded_candidates",
                    "forbidden_information_used",
                    "candidate_set_complete",
                ):
                    self.assertEqual(opportunity[key], audit[key], key)

    def test_first_four_resolution_modes_and_selected_candidates_are_exact(self):
        expected = {
            "order-01-a-first": (
                "priority_unique",
                "response-use-event-A-040#1-target-A-017#1",
            ),
            "order-01-b-first": ("response_unique", "response-pass"),
            "order-02-a-first": ("response_unique", "response-pass"),
            "order-02-b-first": ("response_unique", "response-pass"),
        }
        for stop in self.inputs["stops_117"]:
            opportunity = enumerate_response_opportunity(
                build_resume_state(stop),
                stop["actor"],
                self.inputs["response_window_inputs_119"]["candidate_table"],
            )
            decision = resolve_response_choice(
                {
                    "path_id": stop["path_id"],
                    "order_id": stop["order_id"],
                    "actor_turn_index": 1,
                },
                opportunity,
            )
            self.assertEqual(
                (decision["resolution_mode"], decision["selected_candidate"]),
                expected[stop["path_id"]],
            )
            self.assertIsNone(decision["seed_proof"])

    def test_first_date_wins_by_certain_growth_before_time_comparison(self):
        stop = self.inputs["stops_117"][0]
        opportunity = enumerate_response_opportunity(
            build_resume_state(stop),
            "A",
            self.inputs["response_window_inputs_119"]["candidate_table"],
        )
        decision = resolve_response_choice(
            {"path_id": stop["path_id"], "order_id": stop["order_id"],
             "actor_turn_index": 1},
            opportunity,
        )
        self.assertEqual(decision["reason_code"], "certain_growth_difference")
        self.assertEqual(decision["comparison_evidence"], {
            "criterion": "maximize_certain_growth_difference",
            "selected_value": 5,
            "runner_up_value": 0,
            "later_criteria_inspected": [],
        })
        self.assertEqual(decision["runner_up_candidates"], ["response-pass"])

    def test_response_enumerator_rejects_candidate_pass_and_pass_aliases(self):
        stop = self.inputs["stops_117"][1]
        opportunity = enumerate_response_opportunity(
            build_resume_state(stop),
            "B",
            self.inputs["response_window_inputs_119"]["candidate_table"],
        )
        self.assertNotIn("candidate-pass", opportunity["legal_candidate_ids"])
        self.assertNotIn("pass", opportunity["legal_candidate_ids"])
        for alias in ("candidate-pass", "pass"):
            corrupted = copy.deepcopy(opportunity)
            corrupted["legal_candidate_ids"] = [alias]
            corrupted["legal_candidate_details"][0]["candidate_id"] = alias
            with self.subTest(alias=alias):
                with self.assertRaisesRegex(ValueError, "forbidden response pass alias"):
                    resolve_response_choice(
                        {"path_id": stop["path_id"], "order_id": stop["order_id"],
                         "actor_turn_index": 1},
                        corrupted,
                    )

    def test_second_actor_opportunities_are_reenumerated_and_pass_only(self):
        for stop in self.inputs["stops_117"][1:]:
            with self.subTest(path_id=stop["path_id"]):
                resume = build_resume_state(stop)
                first = enumerate_response_opportunity(
                    resume, stop["actor"],
                    self.inputs["response_window_inputs_119"]["candidate_table"],
                )
                decision = resolve_response_choice(
                    {"path_id": stop["path_id"], "order_id": stop["order_id"],
                     "actor_turn_index": 1},
                    first,
                )
                after, _ = apply_response_pass(resume, decision)
                second_actor = "B" if stop["actor"] == "A" else "A"
                second = enumerate_response_opportunity(
                    after, second_actor,
                    self.inputs["response_window_inputs_119"]["candidate_table"],
                )
                self.assertEqual(second["actor"], second_actor)
                self.assertEqual(second["legal_candidate_ids"], ["response-pass"])
                self.assertEqual(second["response_context"]["response_opportunity_index"], 2)

    def test_response_enumerator_rejects_opponent_private_and_future_information(self):
        stop = self.inputs["stops_117"][0]
        opportunity = enumerate_response_opportunity(
            build_resume_state(stop),
            "A",
            self.inputs["response_window_inputs_119"]["candidate_table"],
        )
        inspected = opportunity["inspected_information"]
        self.assertNotIn("deck", inspected["owner"])
        self.assertNotIn("hand", inspected["opponent_public"])
        self.assertNotIn("deck", inspected["opponent_public"])
        self.assertEqual(opportunity["forbidden_information_used"], [])
        corrupted = copy.deepcopy(opportunity)
        corrupted["forbidden_information_used"] = ["future_draw"]
        with self.assertRaisesRegex(ValueError, "forbidden information"):
            resolve_response_choice(
                {"path_id": stop["path_id"], "order_id": stop["order_id"],
                 "actor_turn_index": 1},
                corrupted,
            )

    def test_response_pass_keeps_game_hash_and_changes_continuation_hash(self):
        stop = self.inputs["stops_117"][1]
        resume = build_resume_state(stop)
        opportunity = enumerate_response_opportunity(
            resume, "B",
            self.inputs["response_window_inputs_119"]["candidate_table"],
        )
        decision = resolve_response_choice(
            {"path_id": stop["path_id"], "order_id": stop["order_id"],
             "actor_turn_index": 1},
            opportunity,
        )
        after, event = apply_response_pass(resume, decision)
        self.assertEqual(event["seq"], 4)
        self.assertEqual(after["source_event_seq"], 3)
        self.assertEqual(event["game_state_before_sha256"],
                         event["game_state_after_sha256"])
        self.assertEqual(event["game_state_after_sha256"],
                         stop["last_valid_state_sha256"])
        self.assertNotEqual(event["continuation_state_before_sha256"],
                            event["continuation_state_after_sha256"])
        self.assertEqual(after["response_context"]["consecutive_passes"], 1)
        self.assertEqual(after["response_context"]["priority_actor"], "A")

    def _activate_first_date(self):
        stop = self.inputs["stops_117"][0]
        continuation = build_resume_state(stop)
        opportunity = enumerate_response_opportunity(
            continuation,
            "A",
            self.inputs["response_window_inputs_119"]["candidate_table"],
        )
        decision = resolve_response_choice(
            {"path_id": stop["path_id"], "order_id": stop["order_id"],
             "actor_turn_index": 1},
            opportunity,
        )
        after, event = activate_response_candidate(continuation, decision)
        return stop, after, event

    def _pass_current_actor(self, continuation):
        actor = continuation["response_context"]["priority_actor"]
        opportunity = enumerate_response_opportunity(
            continuation,
            actor,
            self.inputs["response_window_inputs_119"]["candidate_table"],
        )
        decision = resolve_response_choice(
            {"path_id": "order-01-a-first", "order_id": "order-01",
             "actor_turn_index": 1},
            opportunity,
        )
        return apply_response_pass(continuation, decision)

    def test_activation_pays_time_moves_source_to_activation_zone_and_adds_link(self):
        _, after, event = self._activate_first_date()
        player = after["game_state"]["players"]["A"]
        self.assertEqual(player["time"], 0)
        self.assertNotIn("A-040#1", player["hand"])
        self.assertEqual(len(after["activation_zone"]), 1)
        activation = after["activation_zone"][0]
        self.assertEqual(activation["source_instance_id"], "A-040#1")
        self.assertEqual(activation["target_instance_ids"], ["A-017#1"])
        self.assertEqual(after["response_context"]["chain_links"],
                         [activation["link_id"]])
        self.assertEqual(event["action_type"], "activate_response")
        self.assertEqual(event["payment"], {"time": 1})

    def test_activation_retains_priority_with_activator_until_activator_passes(self):
        _, activated, _ = self._activate_first_date()
        self.assertEqual(activated["response_context"]["priority_actor"], "A")
        self.assertEqual(activated["response_context"]["chain_status"], "building")
        self.assertEqual(activated["response_context"]["consecutive_passes"], 0)
        opportunity = enumerate_response_opportunity(
            activated,
            "A",
            self.inputs["response_window_inputs_119"]["candidate_table"],
        )
        self.assertEqual(opportunity["legal_candidate_ids"], ["response-pass"])
        after_pass, _ = self._pass_current_actor(activated)
        self.assertEqual(after_pass["response_context"]["priority_actor"], "B")
        self.assertEqual(after_pass["response_context"]["consecutive_passes"], 1)

    def test_two_passes_close_chain_and_resolve_last_link_first(self):
        _, activated, _ = self._activate_first_date()
        after_a, _ = self._pass_current_actor(activated)
        after_b, _ = self._pass_current_actor(after_a)
        self.assertEqual(after_b["response_context"]["chain_status"], "resolving")
        self.assertEqual(after_b["response_context"]["consecutive_passes"], 2)
        link_id = after_b["response_context"]["chain_links"][0]
        resolved, events = resolve_chain(after_b, self.inputs)
        self.assertEqual([event["chain_link_id"] for event in events], [link_id])
        self.assertEqual(resolved["response_context"]["chain_links"], [])
        self.assertEqual(resolved["response_context"]["chain_status"], "empty")
        self.assertEqual(resolved["return_target"], "normal_action_opportunity")

    def test_first_date_resolution_rechecks_target_instance_and_stage_zero(self):
        _, activated, _ = self._activate_first_date()
        link = activated["activation_zone"][0]
        probe = copy.deepcopy(activated)
        result = resolve_first_date(probe, link, self.inputs)
        self.assertEqual(result["target_recheck"], {
            "target_instance_id": "A-017#1",
            "current_partner_instance_id": "A-017#1",
            "relationship_stage": 0,
            "legal": True,
        })
        self.assertTrue(result["effect_applied"])

    def test_first_date_draws_one_adds_five_growth_and_discards_source(self):
        _, activated, _ = self._activate_first_date()
        expected_draw = activated["game_state"]["players"]["A"]["deck"][0]
        after_a, _ = self._pass_current_actor(activated)
        after_b, _ = self._pass_current_actor(after_a)
        resolved, events = resolve_chain(after_b, self.inputs)
        player = resolved["game_state"]["players"]["A"]
        self.assertEqual(events[0]["result"]["drawn_instance_ids"], [expected_draw])
        self.assertIn(expected_draw, player["hand"])
        self.assertEqual(player["growth"], 25)
        self.assertIn("A-040#1", player["discard"])
        self.assertEqual(resolved["activation_zone"], [])

    def test_first_date_invalid_target_skips_effect_but_finishes_card_destination(self):
        _, activated, _ = self._activate_first_date()
        after_a, _ = self._pass_current_actor(activated)
        after_b, _ = self._pass_current_actor(after_a)
        after_b["game_state"]["players"]["A"]["board"]["partner"] = None
        after_b["game_state"]["players"]["A"]["board"]["partner_stage"] = None
        payload = {
            key: after_b[key]
            for key in ("game_state", "response_context", "activation_zone",
                        "pending_triggers", "return_target")
        }
        after_b["continuation_state_sha256"] = continuation_state_sha256(payload)
        deck_before = list(after_b["game_state"]["players"]["A"]["deck"])
        resolved, events = resolve_chain(after_b, self.inputs)
        player = resolved["game_state"]["players"]["A"]
        self.assertFalse(events[0]["result"]["effect_applied"])
        self.assertEqual(player["deck"], deck_before)
        self.assertEqual(player["growth"], 20)
        self.assertIn("A-040#1", player["discard"])
        self.assertEqual(resolved["activation_zone"], [])

    def test_order_01_a_first_response_transcript_has_contiguous_seq_and_hashes(self):
        _, activated, activation_event = self._activate_first_date()
        after_a, a_pass = self._pass_current_actor(activated)
        after_b, b_pass = self._pass_current_actor(after_a)
        resolved, resolution_events = resolve_chain(after_b, self.inputs)
        events = [activation_event, a_pass, b_pass, *resolution_events]
        self.assertEqual([event["seq"] for event in events], [4, 5, 6, 7])
        self.assertEqual([event["action_type"] for event in events], [
            "activate_response", "response_pass", "response_pass", "resolve_event",
        ])
        for previous, current in zip(events, events[1:]):
            self.assertEqual(previous["game_state_after_sha256"],
                             current["game_state_before_sha256"])
            self.assertEqual(previous["continuation_state_after_sha256"],
                             current["continuation_state_before_sha256"])
        self.assertEqual(resolved["last_event_seq"], 7)
        self.assertIn(("use_event", "E-first-date"), ACTION_HANDLERS)

    def _synthetic_seed_opportunity(self, decision_kind):
        return {
            "decision_kind": decision_kind,
            "choice_kind": "synthetic_choice",
            "actor": "A",
            "phase": "normal_action" if decision_kind == "normal_action"
                     else "mandatory_choice",
            "legal_candidate_ids": ["candidate-a", "candidate-b"],
            "legal_candidate_details": [
                {"candidate_id": "candidate-a", "action_type": "synthetic"},
                {"candidate_id": "candidate-b", "action_type": "synthetic"},
            ],
            "candidate_set_complete": True,
            "candidate_set_evidence": {
                "source_ref": "synthetic-unit-test",
                "state_ref": "R1:A:synthetic",
                "enumeration_rule": "two complete synthetic candidates",
            },
            "inspected_information": {"owner": {}, "opponent_public": {}},
            "forbidden_information_used": [],
        }

    def test_decision_dispatch_separates_normal_mandatory_and_response_contracts(self):
        self.assertEqual(set(DECISION_RESOLVERS), {
            "normal_action", "mandatory_choice", "response_action",
        })
        route = {"order_id": "order-01", "actor_turn_index": 1, "round": 1}
        for kind in ("normal_action", "mandatory_choice"):
            with self.subTest(kind=kind):
                decision = resolve_decision(
                    self._synthetic_seed_opportunity(kind), route
                )
                self.assertEqual(decision["decision_kind"], kind)
                self.assertEqual(decision["resolution_mode"], "seeded_fallback")
        stop = self.inputs["stops_117"][1]
        response = enumerate_decision_opportunity(
            build_resume_state(stop), self.inputs
        )
        decision = resolve_decision(response, {
            "path_id": stop["path_id"], "order_id": stop["order_id"],
            "actor_turn_index": 1, "round": 1,
        })
        self.assertEqual(decision["decision_kind"], "response_action")
        self.assertEqual(decision["resolution_mode"], "response_unique")

    def test_normal_and_mandatory_seeded_choices_use_116_without_modification(self):
        contract_path = DATA / "proxy-normal-decision-fallback-contract-116-20260918.json"
        before = contract_path.read_bytes()
        route = {"order_id": "order-02", "actor_turn_index": 3, "round": 2}
        for kind in ("normal_action", "mandatory_choice"):
            with self.subTest(kind=kind):
                decision = resolve_decision(
                    self._synthetic_seed_opportunity(kind), route
                )
                self.assertEqual(validate_seeded_resolution(decision), [])
                self.assertEqual(
                    decision["seed_context"]["contract_version"],
                    "naotocchi.card_game.proxy_normal_decision_fallback.v1",
                )
        self.assertEqual(contract_path.read_bytes(), before)

    def test_future_ambiguous_response_uses_119_seed_context_and_proof(self):
        stop = self.inputs["stops_117"][1]
        opportunity = enumerate_response_opportunity(
            build_resume_state(stop), "B",
            self.inputs["response_window_inputs_119"]["candidate_table"],
        )
        synthetic = {
            "candidate_id": "response-trigger-B-synthetic#1",
            "candidate_family": "triggered_ability",
            "action_type": "activate_ability",
            "card_id": "synthetic-existing-rule",
            "card_copy_id": "B-synthetic",
            "source_instance_id": "B-synthetic#1",
            "target_instance_ids": [],
            "base_time_cost": 0,
            "source_references": ["synthetic-unit-test"],
        }
        opportunity["legal_candidate_details"].append(synthetic)
        opportunity["legal_candidate_details"].sort(key=lambda row: row["candidate_id"])
        opportunity["legal_candidate_ids"] = [
            row["candidate_id"] for row in opportunity["legal_candidate_details"]
        ]
        decision = resolve_decision(opportunity, {
            "path_id": stop["path_id"], "order_id": stop["order_id"],
            "actor_turn_index": 1, "round": 1,
        })
        self.assertEqual(decision["resolution_mode"], "response_seeded_fallback")
        self.assertEqual(list(decision["seed_context"]), [
            "contract_version", "order_id", "actor", "actor_turn_index",
            "round", "origin_event_seq", "response_opportunity_index",
            "phase", "decision_kind", "choice_kind",
        ])
        self.assertEqual(decision["seed_proof"]["canonical_candidate_ids"],
                         opportunity["legal_candidate_ids"])

    def test_unknown_action_handler_is_global_implementation_error(self):
        continuation = build_resume_state(self.inputs["stops_117"][1])
        decision = {
            "decision_kind": "normal_action",
            "selected_action": {"action_type": "unknown_action", "card_id": None},
        }
        with self.assertRaisesRegex(ImplementationError,
                                    "unimplemented action handler"):
            apply_decision(continuation, decision, self.inputs)

    def test_plan_exhaustion_is_global_implementation_error(self):
        plan = build_adjudicated_plan_120(self.inputs)
        route = copy.deepcopy(plan["routes"][0])
        route["terminal"] = None
        with self.assertRaisesRegex(ImplementationError, "plan exhausted"):
            replay_route_120(route, self.inputs)

    def test_continuation_choice_cannot_read_future_or_opponent_private_information(self):
        opportunity = self._synthetic_seed_opportunity("normal_action")
        for forbidden in ("opponent_hand", "future_draw", "future_response_choice"):
            corrupted = copy.deepcopy(opportunity)
            corrupted["forbidden_information_used"] = [forbidden]
            with self.subTest(forbidden=forbidden):
                with self.assertRaisesRegex(ValueError, "forbidden information"):
                    resolve_decision(
                        corrupted,
                        {"order_id": "order-01", "actor_turn_index": 1,
                         "round": 1},
                    )

    def test_saved_120_plan_has_exact_schema_sources_steps_and_terminal_per_route(self):
        plan_path = DATA / "proxy-response-window-seeded-restart-plan-120-20260922.json"
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        self.assertEqual(list(plan), [
            "schema", "checkpoint", "contract_version", "source_files",
            "protected_sha256", "route_order", "routes", "scope",
        ])
        self.assertEqual(plan["route_order"], list(PROTECTED_STOPS))
        self.assertEqual([route["path_id"] for route in plan["routes"]],
                         list(PROTECTED_STOPS))
        self.assertEqual(validate_restart_plan_120(plan, self.inputs), [])
        for route in plan["routes"]:
            self.assertEqual(set(route), {
                "path_id", "order_id", "first_player", "source_stop_file",
                "source_stop_sha256", "source_state_sha256", "resume_event_seq",
                "steps", "terminal",
            })
            self.assertTrue(route["steps"])
            self.assertEqual(route["terminal"]["status"],
                             "stopped_rules_adjudication")
            self.assertEqual(route["terminal"]["reason_code"],
                             "incomplete_legal_candidates")

    def test_rules_stop_preserves_last_valid_state_and_has_null_winner(self):
        plan = build_adjudicated_plan_120(self.inputs)
        route = plan["routes"][0]
        last_valid = route["terminal"]
        self.assertEqual(RULES_STOP_REASONS, {
            "incomplete_legal_candidates",
            "opponent_private_or_future_information_required",
            "missing_stable_candidate_identifier",
            "legality_not_confirmed",
            "canonical_rule_not_defined",
            "effect_resolution_not_defined",
        })
        for reason in sorted(RULES_STOP_REASONS):
            with self.subTest(reason=reason):
                stop = make_rules_stop(route, last_valid, reason, {
                    "known_candidate_ids": last_valid["known_candidate_ids"],
                    "missing_candidate_scope": last_valid["missing_candidate_scope"],
                })
                self.assertEqual(stop["status"], "stopped_rules_adjudication")
                self.assertEqual(stop["reason_code"], reason)
                self.assertEqual(stop["game_state"], last_valid["game_state"])
                self.assertEqual(stop["continuation_state"],
                                 last_valid["continuation_state"])
                self.assertIsNone(stop["winner"])
                self.assertFalse(stop["counts_as_completed_match"])
                self.assertFalse(stop["counts_as_independent_balance_sample"])

    def test_integrity_stop_discards_broken_state_and_preserves_last_valid_state(self):
        route = build_adjudicated_plan_120(self.inputs)["routes"][0]
        last_valid = route["terminal"]
        detected = copy.deepcopy(last_valid)
        detected["game_state"]["players"]["A"]["growth"] = 999
        self.assertEqual(INTEGRITY_STOP_REASONS, {
            "event_hash_discontinuity",
            "instance_zone_duplicate_or_missing",
            "decision_event_reference_mismatch",
            "dangling_chain_reservation_or_target",
            "sequence_discontinuity",
        })
        for reason in sorted(INTEGRITY_STOP_REASONS):
            with self.subTest(reason=reason):
                stop = make_integrity_stop(route, last_valid, reason, detected)
                self.assertEqual(stop["status"], "stopped_record_integrity")
                self.assertEqual(stop["reason_code"], reason)
                self.assertEqual(stop["game_state"], last_valid["game_state"])
                self.assertNotEqual(stop["game_state"], detected["game_state"])
                self.assertEqual(stop["detected"], detected)
                self.assertIsNone(stop["winner"])

    def test_global_failures_are_never_converted_to_route_stops(self):
        plan = build_adjudicated_plan_120(self.inputs)
        exhausted = copy.deepcopy(plan)
        exhausted["routes"][0]["terminal"] = None
        with self.assertRaises(ImplementationError):
            continue_routes_independently(exhausted, self.inputs)
        corrupted_inputs = copy.deepcopy(self.inputs)
        corrupted_inputs["restart_plan_117"]["checkpoint"] = 999
        with self.assertRaises(ImplementationError):
            continue_routes_independently(plan, corrupted_inputs)
        unknown = copy.deepcopy(plan)
        unknown["routes"][0]["steps"][0]["decision"]["selected_action"] = {
            "action_type": "unknown_action", "card_id": None,
        }
        with self.assertRaises(ImplementationError):
            continue_routes_independently(unknown, self.inputs)

    def test_route_local_stop_does_not_cancel_remaining_routes(self):
        plan = build_adjudicated_plan_120(self.inputs)
        suite = continue_routes_independently(plan, self.inputs)
        self.assertEqual(list(suite["outcomes"]), list(PROTECTED_STOPS))
        self.assertEqual(
            [row["status"] for row in suite["outcomes"].values()],
            ["stopped_rules_adjudication"] * 4,
        )
        self.assertEqual(list(suite["replay_evidence"]), list(PROTECTED_STOPS))

    def test_completed_requires_r10_final_comparison_or_early_victory(self):
        source = self.inputs["normal_decision_inputs_117"]["source"]
        catalog = {
            row["card_id"]: row["card_type"]
            for row in self.inputs["response_window_inputs_119"][
                "candidate_table"
            ]["cards"]
        }
        base = {
            "path_id": "synthetic-completed",
            "source_record": source,
            "catalog": catalog,
            "terminal": {"winner": "A"},
        }
        for invalid in ("response_window_closed", "plan_exhausted", None):
            route_context = copy.deepcopy(base)
            route_context["terminal"]["completion_reason"] = invalid
            with self.subTest(invalid=invalid):
                with self.assertRaises(ImplementationError):
                    build_completed_record(route_context, {
                        "record_events": [], "decisions": [], "snapshots": [],
                    })
        for valid in (
            "r10_final_comparison",
            "early_victory_after_growth_100_maintenance",
        ):
            route_context = copy.deepcopy(base)
            route_context["terminal"]["completion_reason"] = valid
            record = build_completed_record(route_context, {
                "record_events": [], "decisions": [], "snapshots": [],
            })
            self.assertEqual(record["record"]["status"], "completed")
            self.assertEqual(record["record"]["result"]["reason"], valid)

    def test_all_outcomes_have_zero_independent_balance_samples(self):
        plan = build_adjudicated_plan_120(self.inputs)
        suite = continue_routes_independently(plan, self.inputs)
        evaluation = build_evaluation_120(suite)
        self.assertEqual(evaluation["planned_route_count"], 4)
        self.assertEqual(evaluation["completed_route_count"], 0)
        self.assertEqual(evaluation["stopped_rules_adjudication_count"], 4)
        self.assertEqual(evaluation["stopped_record_integrity_count"], 0)
        self.assertEqual(evaluation["independent_balance_sample_count"], 0)
        self.assertEqual(evaluation["decision_count"], 9)
        self.assertEqual(evaluation["event_count"], 10)
        self.assertEqual(evaluation["snapshot_count"], 14)
        for outcome in suite["outcomes"].values():
            self.assertFalse(outcome["counts_as_independent_balance_sample"])
        for path_id, evidence in suite["replay_evidence"].items():
            with self.subTest(path_id=path_id):
                decisions = evidence["decisions"]
                events = evidence["events"]
                snapshots = evidence["snapshots"]
                self.assertEqual(
                    [row["decision_seq"] for row in decisions],
                    list(range(1, len(decisions) + 1)),
                )
                self.assertEqual(
                    [row["decision_id"] for row in decisions],
                    [
                        f"decision-120-{path_id}-{index:03d}"
                        for index in range(1, len(decisions) + 1)
                    ],
                )
                self.assertEqual(
                    [row["event_id"] for row in events],
                    [f"event-120-{path_id}-{row['seq']:03d}" for row in events],
                )
                decision_ids = {row["decision_id"] for row in decisions}
                self.assertTrue(all(
                    row["decision_id"] is None or row["decision_id"] in decision_ids
                    for row in events
                ))
                for decision in decisions:
                    matching = [
                        row for row in events
                        if row["decision_id"] == decision["decision_id"]
                    ]
                    self.assertEqual(len(matching), 1)
                    self.assertEqual(decision["event_seq"], matching[0]["seq"])
                self.assertEqual(len(snapshots), len(events) + 1)
                self.assertEqual(snapshots[0]["event_seq"], 3)
                self.assertEqual(
                    [row["event_seq"] for row in snapshots[1:]],
                    [row["seq"] for row in events],
                )
                for event, snapshot in zip(events, snapshots[1:]):
                    self.assertEqual(event["game_state_after_sha256"],
                                     snapshot["game_state_sha256"])
                    self.assertEqual(event["continuation_state_after_sha256"],
                                     snapshot["continuation_state_sha256"])

    def test_saved_artifacts_equal_builder_output_and_canonical_bytes(self):
        plan = json.loads((DATA / (
            "proxy-response-window-seeded-restart-plan-120-20260922.json"
        )).read_text(encoding="utf-8"))
        suite = continue_routes_independently(plan, self.inputs)
        artifacts = expected_artifacts_120(suite, DATA)
        self.assertEqual(len(artifacts), 5)
        self.assertEqual(validate_materialized_checkpoint_120(suite, DATA), [])
        for path, value in artifacts.items():
            with self.subTest(path=path.name):
                expected = (
                    json.dumps(value, ensure_ascii=False, indent=2) + "\n"
                ).encode("utf-8")
                self.assertEqual(path.read_bytes(), expected)

    def test_writer_rejects_extra_or_wrong_directory_and_validator_rejects_missing(self):
        plan = build_adjudicated_plan_120(self.inputs)
        suite = continue_routes_independently(plan, self.inputs)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            stop_dir = root / "proxy-response-window-stops-120"
            stop_dir.mkdir()
            extra = stop_dir / "extra.json"
            extra.write_text("{}\n", encoding="utf-8")
            with self.assertRaisesRegex(ImplementationError, "unexpected artifact"):
                write_checkpoint_120(suite, root)
            self.assertEqual(extra.read_text(encoding="utf-8"), "{}\n")

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            write_checkpoint_120(suite, root)
            expected = expected_artifacts_120(suite, root)
            missing = next(path for path in expected if "stops-120" in path.as_posix())
            missing.unlink()
            self.assertIn(
                f"missing materialized artifact: {missing.relative_to(root).as_posix()}",
                validate_materialized_checkpoint_120(suite, root),
            )

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            wrong = root / "proxy-matches-120"
            wrong.mkdir()
            (wrong / "stop-120-order-01-a-first.json").write_text(
                "{}\n", encoding="utf-8"
            )
            with self.assertRaisesRegex(ImplementationError, "unexpected artifact"):
                write_checkpoint_120(suite, root)

    def test_checkpoint_120_cli_reports_exact_outcomes_counts_and_zero_sample(self):
        run = subprocess.run(
            [sys.executable, str(TOOLS / "proxy_response_window_seeded_restart.py")],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        result = json.loads(run.stdout)
        self.assertTrue(result["valid"])
        self.assertEqual(result["planned_route_count"], 4)
        self.assertEqual(result["completed_route_count"], 0)
        self.assertEqual(result["stopped_rules_adjudication_count"], 4)
        self.assertEqual(result["stopped_record_integrity_count"], 0)
        self.assertEqual(result["independent_balance_sample_count"], 0)
        self.assertEqual(result["route_statuses"], {
            path_id: "stopped_rules_adjudication"
            for path_id in PROTECTED_STOPS
        })
        self.assertFalse(result["written"])
        self.assertEqual(result["errors"], [])

    def test_builders_return_isolated_mutable_collections(self):
        plan_a = build_adjudicated_plan_120(self.inputs)
        plan_b = build_adjudicated_plan_120(self.inputs)
        plan_a["routes"][0]["steps"][0]["legal_candidate_ids"].append("corrupt")
        self.assertNotEqual(plan_a, plan_b)
        suite_a = continue_routes_independently(plan_b, self.inputs)
        suite_b = continue_routes_independently(plan_b, self.inputs)
        suite_a["outcomes"]["order-01-a-first"]["stop"]["reason_code"] = "corrupt"
        self.assertNotEqual(suite_a, suite_b)
        evaluation_a = build_evaluation_120(suite_b)
        evaluation_b = build_evaluation_120(suite_b)
        evaluation_a["routes"][0]["status"] = "corrupt"
        self.assertNotEqual(evaluation_a, evaluation_b)

    def test_numbered_doc_records_exact_outcomes_sources_and_protected_boundaries(self):
        numbered = CARD_GAME / "120-response-window-seeded-restart.md"
        self.assertTrue(numbered.is_file())
        text = numbered.read_text(encoding="utf-8")
        for value in (
            "planned 4・completed 0・rules-stop 4・integrity-stop 0",
            "decision 9・event 10・snapshot 14・winner 0",
            "`order-01-a-first`",
            "`incomplete_legal_candidates`",
            "`E-first-date`",
            "独立balance標本 0",
            "117・119・116・112を変更していない",
            "専用42件",
            "全proxy 263件",
        ):
            with self.subTest(value=value):
                self.assertIn(value, text)

    def test_readme_points_to_120_and_keeps_112_116_117_119_history(self):
        text = (CARD_GAME / "README.md").read_text(encoding="utf-8")
        current = text.split("## 現在フェーズと再開地点", 1)[1].split("\n## ", 1)[0]
        self.assertIn(
            "[120 response-window再開](120-response-window-seeded-restart.md)",
            current,
        )
        for number, target in (
            (112, "112-targeted-structural-gap-fixtures.md"),
            (116, "116-normal-decision-fallback-contract.md"),
            (117, "117-normal-decision-seeded-restart.md"),
            (119, "119-response-window-contract.md"),
            (120, "120-response-window-seeded-restart.md"),
        ):
            with self.subTest(number=number):
                self.assertIn(f"| [{number}]({target}) |", text)

    def test_check_design_data_reports_checkpoint_120_and_proxy_total_263(self):
        checker = TOOLS / "check-design-data.py"
        run = subprocess.run(
            [sys.executable, str(checker), "--checkpoint-120"],
            capture_output=True,
            text=True,
            check=False,
        )
        result = json.loads(run.stdout)
        self.assertEqual(result["checkpoint"], 120)
        self.assertEqual(result["checkpoint_120_test_count"], 42)
        self.assertEqual(result["proxy_test_count"], 263)
        self.assertEqual(result["errors"], [])


if __name__ == "__main__":
    unittest.main()
