#!/usr/bin/env python3
import copy
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from proxy_normal_decision_seeded_restart import _stop_state_sha256
from proxy_response_window_contract import (
    CONTRACT_SCHEMA,
    CONTRACT_VERSION,
    FORBIDDEN_RESPONSE_PASS_ALIASES,
    PATH_ORDER,
    RESPONSE_PASS_ID,
    ZERO_SCOPE,
    build_candidate_audit,
    build_checkpoint_119,
    build_response_pass_detail,
    build_response_seed_proof,
    build_response_window_contract,
    derive_response_context,
    enumerate_response_candidates,
    load_inputs,
    transition_response_window,
    validate_candidate_audit,
    validate_materialized_checkpoint_119,
    validate_response_context,
    validate_response_seed_proof,
    validate_response_transition,
    validate_response_window_contract,
    write_checkpoint_119,
)


PROTECTED_FILE_SHA256 = {
    "stop-117-order-01-a-first.json": "c1f75fed4ea40c685740d78b67885ab21092f3d125a79b044474e2cbb26c3b92",
    "stop-117-order-01-b-first.json": "58b3fbce9d570b472dd6c91ee5ad1a043a2fd94864d6019deedfd3a78f3d2bcd",
    "stop-117-order-02-a-first.json": "a4e1b35c03da7c8927e94b59740a16bbf8b78f69d165c516cf9c3a4652f8fc5c",
    "stop-117-order-02-b-first.json": "e66ae50ec54c3b568dcef30f75c9d2751346aa92a35e9748ac96dc0053b6e232",
    "proxy-normal-decision-fallback-contract-116-20260918.json": "8a7f41847339816d786d6c6055e290454cf8d5d84d6ccc22d6a32eb287cbfb6f",
    "proxy-normal-decision-seeded-restart-plan-117-20260919.json": "2502320582b2cf6b05731bd7d23e37e62a7437f1b4b48361fd8e591ba53583d2",
    "proxy-normal-decision-seeded-restart-evaluation-117-20260919.json": "de90629db36032ad2c6a6be0c804c60227383e5c2bdb218939dbbca2334268ff",
}
PROTECTED_STATE_SHA256 = {
    "order-01-a-first": "79c8ba24c4749d34436e5dbc36a89aac6f59bd682d02763715f68bd33068ff80",
    "order-01-b-first": "468cb23491db85e53c2ede37c57c325b6620c82ca4cb7bbdeb6b7e7fd95de399",
    "order-02-a-first": "87df61c75bb6a304b684ab00444b321cb1e1b25ee95f6a3b8353af0beae804de",
    "order-02-b-first": "d3969f6708ae9834295a88d07b2cd7f88da7889541f48175bae4715af61de240",
}


class ResponseWindowContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = load_inputs()

    def test_four_stops_derive_exact_first_response_contexts(self):
        rows = [derive_response_context(row) for row in self.inputs["stops_117"]]
        self.assertEqual([row["priority_actor"] for row in rows], ["A", "B", "A", "B"])
        for row in rows:
            self.assertEqual(row, {
                "source_phase": "post_placement_response",
                "phase": "response_window",
                "window_kind": "after_normal_action",
                "origin_event_seq": 3,
                "turn_player": row["priority_actor"],
                "priority_actor": row["priority_actor"],
                "chain_status": "empty",
                "chain_links": [],
                "consecutive_passes": 0,
                "response_opportunity_index": 1,
                "decision_kind": "response_action",
                "choice_kind": "reaction_or_pass",
            })

    def test_contract_fixes_identity_phase_pass_families_and_scope(self):
        contract = build_response_window_contract()
        self.assertEqual(contract["schema"], CONTRACT_SCHEMA)
        self.assertEqual(contract["checkpoint"], 119)
        self.assertEqual(contract["status"], "protocol_only_no_match_progress")
        self.assertEqual(contract["contract_version"], CONTRACT_VERSION)
        self.assertEqual(contract["phase_adapter"], {
            "source_phase": "post_placement_response",
            "canonical_phase": "response_window",
            "allowed_window_kinds": ["after_normal_action"],
            "mutates_source_state": False,
            "rehashes_source_state": False,
        })
        self.assertEqual(contract["candidate_contract"]["response_pass_candidate_id"],
                         RESPONSE_PASS_ID)
        self.assertEqual(contract["candidate_contract"]["forbidden_pass_aliases"],
                         list(FORBIDDEN_RESPONSE_PASS_ALIASES))
        self.assertEqual(contract["candidate_contract"]["candidate_families"], [
            "hand_quick_use", "triggered_ability", "prepared_activation",
        ])
        self.assertEqual(contract["scope"], ZERO_SCOPE)
        self.assertEqual(validate_response_window_contract(contract), [])

    def test_phase_adapter_does_not_mutate_or_rehash_saved_state(self):
        for stop in self.inputs["stops_117"]:
            original = copy.deepcopy(stop)
            original_hash = stop["last_valid_state_sha256"]
            context = derive_response_context(stop)
            self.assertEqual(stop, original)
            self.assertEqual(_stop_state_sha256(stop["pre_decision_state"]), original_hash)
            self.assertNotIn("response_context", stop)
            self.assertEqual(context["phase"], "response_window")
            self.assertEqual(stop["pre_decision_state"]["phase"],
                             "post_placement_response")

    def test_phase_adapter_rejects_wrong_source_phase_event_seq_turn_or_hash(self):
        base = self.inputs["stops_117"][0]
        mutations = []
        wrong_top_phase = copy.deepcopy(base)
        wrong_top_phase["phase"] = "normal_action"
        mutations.append(wrong_top_phase)
        wrong_state_phase = copy.deepcopy(base)
        wrong_state_phase["pre_decision_state"]["phase"] = "normal_action"
        mutations.append(wrong_state_phase)
        wrong_seq = copy.deepcopy(base)
        wrong_seq["last_valid_event_seq"] = 4
        mutations.append(wrong_seq)
        wrong_turn = copy.deepcopy(base)
        wrong_turn["pre_decision_state"]["turn_player"] = "B"
        mutations.append(wrong_turn)
        wrong_hash = copy.deepcopy(base)
        wrong_hash["last_valid_state_sha256"] = "0" * 64
        mutations.append(wrong_hash)
        for mutated in mutations:
            with self.subTest(mutated=mutated):
                with self.assertRaises(ValueError):
                    derive_response_context(mutated)

    def test_contract_rejects_response_pass_aliases_and_scope_progress(self):
        base = build_response_window_contract()
        for alias in FORBIDDEN_RESPONSE_PASS_ALIASES:
            mutated = copy.deepcopy(base)
            mutated["candidate_contract"]["response_pass_candidate_id"] = alias
            self.assertTrue(validate_response_window_contract(mutated), alias)
        for key in ("event_count", "decision_trace_count", "winner_count"):
            mutated = copy.deepcopy(base)
            mutated["scope"][key] = 1
            self.assertTrue(validate_response_window_contract(mutated), key)

    def test_contract_keeps_116_version_and_decision_kinds_read_only(self):
        fallback_path = (Path(__file__).resolve().parent.parent / "data" /
                         "proxy-normal-decision-fallback-contract-116-20260918.json")
        before_object = copy.deepcopy(self.inputs["fallback_contract_116"])
        before_bytes = fallback_path.read_bytes()
        contract = build_response_window_contract()
        after = load_inputs()
        self.assertEqual(self.inputs["fallback_contract_116"], before_object)
        self.assertEqual(after["fallback_contract_116"], before_object)
        self.assertEqual(fallback_path.read_bytes(), before_bytes)
        self.assertNotEqual(contract["contract_version"],
                            before_object["schema"])
        self.assertEqual(before_object["decision_contract"]["decision_kinds"],
                         ["normal_action", "mandatory_choice"])
        self.assertNotIn("response_action",
                         before_object["decision_contract"]["decision_kinds"])

    def test_four_first_opportunities_have_exact_candidate_sets(self):
        audit = build_candidate_audit(self.inputs)
        self.assertEqual(
            {row["path_id"]: row["legal_candidate_ids"]
             for row in audit["audits"]},
            {
                "order-01-a-first": [
                    "response-pass",
                    "response-use-event-A-040#1-target-A-017#1",
                ],
                "order-01-b-first": ["response-pass"],
                "order-02-a-first": ["response-pass"],
                "order-02-b-first": ["response-pass"],
            },
        )
        self.assertEqual(validate_candidate_audit(audit, self.inputs), [])

    def test_response_pass_detail_is_required_and_aliases_are_rejected(self):
        detail = build_response_pass_detail()
        self.assertEqual(detail, {
            "candidate_id": "response-pass",
            "candidate_family": "pass",
            "action_type": "response_pass",
            "card_id": None,
            "card_copy_id": None,
            "source_instance_id": None,
            "target_instance_ids": [],
            "base_time_cost": 0,
            "source_references": [
                "01-core-rules.md#通常行動と反応【確定】",
                "06-action-chain-checkpoint.md#反応機会・パス【確定】",
            ],
        })
        for alias in FORBIDDEN_RESPONSE_PASS_ALIASES:
            mutated = build_candidate_audit(self.inputs)
            row = mutated["audits"][0]
            row["legal_candidate_ids"][0] = alias
            row["legal_candidate_details"][0]["candidate_id"] = alias
            self.assertTrue(validate_candidate_audit(mutated, self.inputs), alias)

    def test_first_date_detail_binds_copy_instance_target_time_stage_and_sources(self):
        row = enumerate_response_candidates(
            self.inputs["stops_117"][0], self.inputs["candidate_table"])
        detail = row["legal_candidate_details"][1]
        self.assertEqual(detail, {
            "candidate_id": "response-use-event-A-040#1-target-A-017#1",
            "candidate_family": "hand_quick_use",
            "action_type": "use_event",
            "card_id": "E-first-date",
            "card_copy_id": "A-040",
            "source_instance_id": "A-040#1",
            "target_instance_ids": ["A-017#1"],
            "target_card_ids": ["P-cat_ceo"],
            "target_zone": "partner",
            "base_time_cost": 1,
            "remaining_time_before_payment": 1,
            "relationship_stage": 0,
            "source_references": [
                "91-event-21-card-text-draft.md#E-first-date",
                "93-cross-type-boundary-audit.md#B12",
            ],
        })

    def test_candidate_completeness_requires_all_scanned_zones_families_and_reasons(self):
        required_owner = ("hand", "board", "prepared", "discard", "time", "reservations")
        required_public = ("board", "prepared_public", "discard", "time", "reservations")
        for section, keys in (("owner", required_owner),
                              ("opponent_public", required_public)):
            for key in keys:
                mutated = build_candidate_audit(self.inputs)
                del mutated["audits"][0]["inspected_information"][section][key]
                self.assertTrue(validate_candidate_audit(mutated, self.inputs),
                                f"{section}.{key}")
        mutated = build_candidate_audit(self.inputs)
        mutated["audits"][0]["checked_candidate_families"].pop()
        self.assertTrue(validate_candidate_audit(mutated, self.inputs))
        mutated = build_candidate_audit(self.inputs)
        mutated["audits"][0]["excluded_candidates"].pop()
        self.assertTrue(validate_candidate_audit(mutated, self.inputs))

    def test_normal_actions_never_enter_response_candidates(self):
        forbidden_actions = (
            "birth", "time_skip", "transform", "place_companion",
            "place_partner", "place_world", "relationship_progress",
            "attach_item", "prepare_action", "challenge",
        )
        for action_type in forbidden_actions:
            mutated = build_candidate_audit(self.inputs)
            row = mutated["audits"][0]
            fake_id = f"response-fake-{action_type}"
            fake = copy.deepcopy(build_response_pass_detail())
            fake["candidate_id"] = fake_id
            fake["action_type"] = action_type
            row["legal_candidate_ids"].append(fake_id)
            row["legal_candidate_ids"].sort()
            row["legal_candidate_details"].append(fake)
            row["legal_candidate_details"].sort(key=lambda value: value["candidate_id"])
            self.assertTrue(validate_candidate_audit(mutated, self.inputs), action_type)

    def test_candidate_audit_rejects_opponent_private_and_future_information(self):
        for forbidden_key in (
                "opponent_hand", "opponent_deck_order", "future_draw",
                "future_response_choice"):
            mutated = build_candidate_audit(self.inputs)
            mutated["audits"][0]["inspected_information"][forbidden_key] = []
            self.assertTrue(validate_candidate_audit(mutated, self.inputs), forbidden_key)

    def test_candidate_ids_details_order_uniqueness_and_completeness_are_strict(self):
        base = build_candidate_audit(self.inputs)
        mutations = []
        unsorted = copy.deepcopy(base)
        unsorted["audits"][0]["legal_candidate_ids"].reverse()
        mutations.append(unsorted)
        duplicate = copy.deepcopy(base)
        duplicate["audits"][0]["legal_candidate_ids"].append("response-pass")
        mutations.append(duplicate)
        missing_detail = copy.deepcopy(base)
        missing_detail["audits"][0]["legal_candidate_details"].pop()
        mutations.append(missing_detail)
        extra_detail = copy.deepcopy(base)
        extra_detail["audits"][1]["legal_candidate_details"].append(
            copy.deepcopy(build_response_pass_detail()))
        mutations.append(extra_detail)
        mismatched = copy.deepcopy(base)
        mismatched["audits"][0]["legal_candidate_details"][0]["candidate_id"] = "wrong"
        mutations.append(mismatched)
        incomplete = copy.deepcopy(base)
        incomplete["audits"][0]["candidate_set_complete"] = False
        mutations.append(incomplete)
        for mutated in mutations:
            with self.subTest():
                self.assertTrue(validate_candidate_audit(mutated, self.inputs))

    @staticmethod
    def transition_context(**changes):
        context = {
            "window_status": "open",
            "window_kind": "after_normal_action",
            "turn_player": "A",
            "priority_actor": "A",
            "chain_status": "empty",
            "chain_links": [],
            "consecutive_passes": 0,
            "response_opportunity_index": 1,
            "pending_triggers": [],
            "return_to": None,
            "resolution_order": [],
        }
        context.update(changes)
        return context

    def test_empty_chain_first_pass_moves_priority_and_sets_one_pass(self):
        before = self.transition_context()
        action = {"kind": "response_pass", "actor": "A"}
        after = transition_response_window(before, action)
        self.assertEqual(after["priority_actor"], "B")
        self.assertEqual(after["consecutive_passes"], 1)
        self.assertEqual(after["window_status"], "open")
        self.assertEqual(validate_response_transition(before, action, after), [])

    def test_empty_chain_second_pass_closes_window_without_event(self):
        before = self.transition_context(priority_actor="B", consecutive_passes=1,
                                         response_opportunity_index=2)
        action = {"kind": "response_pass", "actor": "B"}
        after = transition_response_window(before, action)
        self.assertEqual(after["window_status"], "closed")
        self.assertEqual(after["return_to"], "normal_action_opportunity")
        self.assertNotIn("event", after)
        self.assertNotIn("snapshot", after)

    def test_activation_keeps_priority_with_activator_until_their_pass(self):
        before = self.transition_context()
        action = {"kind": "activate", "actor": "A", "link_id": "link-1"}
        after_activation = transition_response_window(before, action)
        self.assertEqual(after_activation["priority_actor"], "A")
        self.assertEqual(after_activation["chain_status"], "building")
        self.assertEqual(after_activation["consecutive_passes"], 0)
        after_pass = transition_response_window(
            after_activation, {"kind": "response_pass", "actor": "A"})
        self.assertEqual(after_pass["priority_actor"], "B")
        self.assertEqual(after_pass["consecutive_passes"], 1)

    def test_opponent_activation_after_pass_returns_priority_and_resets_passes(self):
        after_pass = transition_response_window(
            self.transition_context(), {"kind": "response_pass", "actor": "A"})
        after_activation = transition_response_window(
            after_pass, {"kind": "activate", "actor": "B", "link_id": "link-1"})
        self.assertEqual(after_activation["priority_actor"], "A")
        self.assertEqual(after_activation["consecutive_passes"], 0)
        self.assertEqual(after_activation["chain_links"], ["link-1"])

    def test_two_passes_close_building_chain_and_resolve_reverse_order(self):
        before = self.transition_context(
            priority_actor="B", chain_status="building",
            chain_links=["link-1", "link-2"], consecutive_passes=1,
            response_opportunity_index=4)
        after = transition_response_window(
            before, {"kind": "response_pass", "actor": "B"})
        self.assertEqual(after["window_status"], "closed")
        self.assertEqual(after["chain_status"], "resolving")
        self.assertEqual(after["resolution_order"], ["link-2", "link-1"])
        self.assertIsNone(after["return_to"])

    def test_resolution_trigger_opens_new_chain_before_normal_action(self):
        before = self.transition_context(
            priority_actor="B", chain_status="building", chain_links=["link-1"],
            consecutive_passes=1, pending_triggers=["trigger-1"],
            response_opportunity_index=3)
        after = transition_response_window(
            before, {"kind": "response_pass", "actor": "B"})
        self.assertEqual(after["next_window_kind"],
                         "after_chain_resolution_trigger")
        self.assertIsNone(after["return_to"])
        self.assertFalse(after["normal_action_return_allowed"])

    def test_response_seed_proof_uses_exact_eleven_element_material(self):
        context = {
            "contract_version": "naotocchi.card_game.proxy_response_window.v1",
            "order_id": "synthetic-order",
            "actor": "A",
            "actor_turn_index": 1,
            "round": 1,
            "origin_event_seq": 3,
            "response_opportunity_index": 1,
            "phase": "response_window",
            "decision_kind": "response_action",
            "choice_kind": "reaction_or_pass",
        }
        candidate_ids = ["response-use-synthetic", "response-pass"]
        proof = build_response_seed_proof(context, candidate_ids)
        ordered = sorted(candidate_ids)
        material = list(context.values()) + [ordered]
        serialized = json.dumps(material, ensure_ascii=False, separators=(",", ":"))
        digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        self.assertEqual(proof["seed_material"], material)
        self.assertEqual(proof["canonical_serialization"], serialized)
        self.assertEqual(proof["sha256"], digest)
        self.assertEqual(proof["selected_index"], int(digest, 16) % 2)
        self.assertEqual(proof["selected_candidate"],
                         ordered[int(digest, 16) % 2])
        self.assertEqual(validate_response_seed_proof(
            proof, context, candidate_ids), [])

    def test_response_seed_rejects_116_context_shape_private_fields_and_real_stop_application(self):
        valid = {
            "contract_version": "naotocchi.card_game.proxy_response_window.v1",
            "order_id": "synthetic-order",
            "actor": "A",
            "actor_turn_index": 1,
            "round": 1,
            "origin_event_seq": 3,
            "response_opportunity_index": 1,
            "phase": "response_window",
            "decision_kind": "response_action",
            "choice_kind": "reaction_or_pass",
        }
        invalid_contexts = [
            dict(list(valid.items())[:8]),
            {**valid, "path_id": "order-01-a-first"},
            {**valid, "future_draw": "known"},
            self.inputs["stops_117"][0],
        ]
        for context in invalid_contexts:
            with self.subTest(context=context):
                with self.assertRaises(ValueError):
                    build_response_seed_proof(
                        context, ["response-pass", "response-use-synthetic"])

    def test_saved_contract_and_audit_equal_builder_output(self):
        data_dir = Path(__file__).resolve().parent.parent / "data"
        bundle = build_checkpoint_119(self.inputs)
        saved = {
            "contract": json.loads((data_dir /
                "proxy-response-window-contract-119-20260922.json").read_text()),
            "candidate_audit": json.loads((data_dir /
                "proxy-response-window-candidate-audit-119-20260922.json").read_text()),
        }
        self.assertEqual(saved, bundle)
        self.assertEqual(validate_materialized_checkpoint_119(bundle, data_dir), [])

    def test_materialized_json_requires_exact_builder_bytes(self):
        bundle = build_checkpoint_119(self.inputs)
        with tempfile.TemporaryDirectory() as directory:
            data_dir = Path(directory)
            write_checkpoint_119(bundle, data_dir)
            self.assertEqual(validate_materialized_checkpoint_119(bundle, data_dir), [])
            contract_path = data_dir / "proxy-response-window-contract-119-20260922.json"
            expected = (json.dumps(bundle["contract"], ensure_ascii=False, indent=2)
                        + "\n").encode("utf-8")
            self.assertEqual(contract_path.read_bytes(), expected)
            mutations = (
                expected.replace(b"\n", b"\r\n"),
                expected.rstrip(b"\n"),
                (json.dumps(dict(reversed(list(bundle["contract"].items()))),
                            ensure_ascii=False, indent=2) + "\n").encode("utf-8"),
            )
            for value in mutations:
                contract_path.write_bytes(value)
                self.assertTrue(validate_materialized_checkpoint_119(
                    bundle, data_dir))

    def test_protected_source_bytes_and_state_hashes_are_exact(self):
        data_dir = Path(__file__).resolve().parent.parent / "data"
        stop_dir = data_dir / "proxy-normal-decision-stops-117"
        for filename, expected in PROTECTED_FILE_SHA256.items():
            path = (stop_dir / filename) if filename.startswith("stop-117-") else (data_dir / filename)
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), expected)
        for stop in self.inputs["stops_117"]:
            self.assertEqual(stop["last_valid_state_sha256"],
                             PROTECTED_STATE_SHA256[stop["path_id"]])
            self.assertEqual(_stop_state_sha256(stop["pre_decision_state"]),
                             PROTECTED_STATE_SHA256[stop["path_id"]])

    def test_checkpoint_119_has_no_match_progress_artifacts(self):
        data_dir = Path(__file__).resolve().parent.parent / "data"
        bundle = build_checkpoint_119(self.inputs)
        self.assertEqual(bundle["contract"]["scope"], ZERO_SCOPE)
        self.assertEqual(bundle["candidate_audit"]["scope"], ZERO_SCOPE)
        self.assertEqual(bundle["candidate_audit"]["selected_candidate_count"], 0)
        forbidden = []
        for path in data_dir.glob("*119*"):
            if any(token in path.name for token in ("record", "trace", "stop")):
                forbidden.append(path.name)
        self.assertEqual(forbidden, [])

    def test_checkpoint_112_fixtures_remain_six_unplayed_records(self):
        fixture_dir = (Path(__file__).resolve().parent.parent / "data" /
                       "proxy-gap-fixtures-112")
        fixtures = [json.loads(path.read_text(encoding="utf-8"))
                    for path in sorted(fixture_dir.glob("*.json"))]
        self.assertEqual(len(fixtures), 6)
        for fixture in fixtures:
            self.assertEqual(fixture["record"]["status"], "fixture")
            self.assertEqual(fixture["record"]["events"], [])
            self.assertIsNone(fixture["record"]["result"]["winner"])

    def test_builder_returns_isolated_mutable_collections(self):
        first = build_checkpoint_119(self.inputs)
        second = build_checkpoint_119(self.inputs)
        first["contract"]["candidate_contract"]["candidate_families"].append("bad")
        first["candidate_audit"]["audits"][0]["legal_candidate_ids"].append("bad")
        self.assertNotEqual(first, second)
        self.assertEqual(second, build_checkpoint_119(self.inputs))

    def test_numbered_doc_records_protocol_only_counts_and_exact_candidates(self):
        docs = Path(__file__).resolve().parent.parent
        text = (docs / "119-response-window-contract.md").read_text(encoding="utf-8")
        self.assertIn("`protocol_only_no_match_progress`", text)
        self.assertIn("planned 0・completed 0・stopped 0", text)
        self.assertIn("decision trace 0・event 0・snapshot 0・winner 0", text)
        self.assertIn("117のstopped 4", text)
        self.assertIn("response-use-event-A-040#1-target-A-017#1", text)
        self.assertIn("専用31件", text)
        self.assertIn("全proxy 221件", text)

    def test_readme_points_to_119_without_claiming_match_resume(self):
        docs = Path(__file__).resolve().parent.parent
        text = (docs / "README.md").read_text(encoding="utf-8")
        current = text.split("## 現在フェーズと再開地点", 1)[1].split("## ", 1)[0]
        self.assertIn("[119 response-window契約](119-response-window-contract.md)", current)
        self.assertIn("protocol-only", current)
        self.assertIn("117の4経路を再開していない", current)
        self.assertIn("| [119](119-response-window-contract.md) |", text)

    def test_tokiokuri_old_term_allowlist_remains_118_only(self):
        docs = Path(__file__).resolve().parent.parent
        former = "とき" + "とばし"
        occurrences = []
        for path in docs.rglob("*"):
            if not path.is_file():
                continue
            try:
                value = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            if former in value:
                occurrences.append((path.relative_to(docs).as_posix(), value.count(former)))
        self.assertEqual(occurrences, [("118-tokiokuri-terminology-migration.md", 2)])

    def test_check_design_data_reports_checkpoint_119_and_proxy_total(self):
        checker = Path(__file__).resolve().parent / "check-design-data.py"
        run = subprocess.run(
            [sys.executable, str(checker), "--checkpoint-119"],
            capture_output=True, text=True, check=False)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        result = json.loads(run.stdout)
        self.assertEqual(result["checkpoint"], 119)
        self.assertEqual(result["checkpoint_119_test_count"], 31)
        self.assertEqual(result["proxy_test_count"], 221)
        self.assertEqual(result["errors"], [])


if __name__ == "__main__":
    unittest.main()
