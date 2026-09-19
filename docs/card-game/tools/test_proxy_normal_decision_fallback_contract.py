import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from proxy_normal_decision_fallback_contract import (
    CONTRACT_VERSION,
    SEED_CONTEXT_KEYS,
    build_fallback_contract,
    build_seed_proof,
    load_json,
    resolve_safe_free_development,
    validate_fallback_contract,
    validate_materialized,
    validate_safe_free_placement,
    validate_seeded_resolution,
    write_json,
)


def seed_context():
    return {
        "contract_version": "naotocchi.card_game.proxy_normal_decision_fallback.v1",
        "order_id": "order-01",
        "actor": "A",
        "actor_turn_index": 1,
        "round": 1,
        "phase": "egg_exchange_choice",
        "decision_kind": "mandatory_choice",
        "choice_kind": "egg_exchange_bottom",
    }


def seeded_decision():
    candidates = ["A-M-antlion-02-01", "A-P-cat_ceo-01", "A-G-air-hockey-01"]
    proof = build_seed_proof(seed_context(), candidates)
    return {
        "decision_kind": "mandatory_choice",
        "resolution_mode": "seeded_fallback",
        "strategic_unresolved": True,
        "reason_code": "strategic_unresolved_seeded_fallback",
        "legal_candidates": sorted(candidates),
        "seeded_fallback_candidates": sorted(candidates),
        "candidate_set_complete": True,
        "candidate_set_evidence": {
            "source_ref": "115:path:order-01-a-first",
            "state_ref": "R1:egg_exchange_choice:A",
            "enumeration_rule": "all_card_copy_ids_in_hand_after_egg_draw",
        },
        "seed_context": seed_context(),
        "seed_proof": proof,
        "selected_candidate": proof["selected_candidate"],
        "runner_up_candidates": sorted(candidate for candidate in candidates
                                       if candidate != proof["selected_candidate"]),
    }


def safe_placement(candidate_id="place:A-P-cat_ceo-01"):
    return {
        "candidate_id": candidate_id,
        "card_copy_id": candidate_id.split(":", 1)[1],
        "person_type": "partner",
        "slot_empty": True,
        "actual_time_cost": 0,
        "replacement_required": False,
        "additional_card_consumption": 0,
        "certain_downside": False,
        "legality": "confirmed",
        "unresolved_required_choice": False,
    }


def placement_context():
    context = seed_context()
    context.update({
        "phase": "normal_action",
        "decision_kind": "normal_action",
        "choice_kind": "zero_cost_person_placement",
    })
    return context


def placement_legal_ids(placements):
    return ["pass"] + [placement["candidate_id"] for placement in placements]


def malformed_seed_contexts():
    for field, values in {
        "contract_version": (None, [], 116, "wrong"),
        "order_id": (None, [], 1, ""),
        "actor": (None, [], 1, "C", ""),
        "actor_turn_index": (None, [], "1", True, False, 0, -1, 1.0),
        "round": (None, [], "1", True, False, 0, -1, 1.0),
        "phase": (None, [], 1, ""),
        "decision_kind": (None, [], 1, "other", ""),
        "choice_kind": (None, [], 1, ""),
    }.items():
        for value in values:
            yield field, {**seed_context(), field: value}


class SeededFallbackContractTests(unittest.TestCase):
    def test_seed_proof_uses_sorted_candidates_and_exact_sha256_modulo(self):
        candidates = ["A-M-antlion-02-01", "A-P-cat_ceo-01", "A-G-air-hockey-01"]
        proof = build_seed_proof(seed_context(), candidates)
        reversed_proof = build_seed_proof(seed_context(), list(reversed(candidates)))
        self.assertEqual(proof, reversed_proof)
        expected_material = [seed_context()[key] for key in (
            "contract_version", "order_id", "actor", "actor_turn_index", "round",
            "phase", "decision_kind", "choice_kind",
        )] + [sorted(candidates)]
        serialized = json.dumps(expected_material, ensure_ascii=False, separators=(",", ":"))
        digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        self.assertEqual(proof["canonical_serialization"], serialized)
        self.assertEqual(proof["sha256"], digest)
        self.assertEqual(proof["selected_index"], int(digest, 16) % 3)
        self.assertEqual(proof["selected_candidate"], sorted(candidates)[int(digest, 16) % 3])

    def test_mirror_labels_are_not_seed_context(self):
        context = seed_context()
        proof = build_seed_proof(context, ["a", "b"])
        for key, value in {"path_id": "path-1", "fixture_id": "fixture-1", "match_id": "match-1", "first_player": "A"}.items():
            invalid = dict(context)
            invalid[key] = value
            with self.subTest(key=key):
                with self.assertRaises(ValueError):
                    build_seed_proof(invalid, ["a", "b"])
        self.assertEqual(proof, build_seed_proof(seed_context(), ["b", "a"]))

    def test_unrelated_choice_does_not_shift_later_choice(self):
        before = build_seed_proof(seed_context(), ["a", "b"])
        unrelated = seed_context()
        unrelated["choice_kind"] = "unrelated"
        build_seed_proof(unrelated, ["x", "y"])
        after = build_seed_proof(seed_context(), ["a", "b"])
        self.assertEqual(before, after)

    def test_seed_builder_requires_exact_typed_context(self):
        for field, context in malformed_seed_contexts():
            with self.subTest(field=field, value=context[field]):
                with self.assertRaises(ValueError):
                    build_seed_proof(context, ["a", "b"])
        for malformed in (None, [], list(SEED_CONTEXT_KEYS), "context"):
            with self.subTest(context=malformed):
                with self.assertRaises(ValueError):
                    build_seed_proof(malformed, ["a", "b"])
        for field in SEED_CONTEXT_KEYS:
            context = seed_context()
            del context[field]
            with self.subTest(missing=field):
                with self.assertRaises(ValueError):
                    build_seed_proof(context, ["a", "b"])

    def test_seeded_validator_rejects_typed_context_forgery(self):
        for field, context in malformed_seed_contexts():
            decision = seeded_decision()
            # Forge an internally consistent proof without the production builder.
            material = [context[key] for key in SEED_CONTEXT_KEYS] + [decision["seeded_fallback_candidates"]]
            serialized = json.dumps(material, ensure_ascii=False, separators=(",", ":"))
            digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
            index = int(digest, 16) % 3
            selected = decision["seeded_fallback_candidates"][index]
            decision["seed_context"] = context
            decision["seed_proof"].update(seed_material=material, canonical_serialization=serialized,
                                         sha256=digest, selected_index=index, selected_candidate=selected)
            decision["selected_candidate"] = selected
            decision["runner_up_candidates"] = [candidate for candidate in decision["seeded_fallback_candidates"]
                                                if candidate != selected]
            with self.subTest(field=field, value=context[field]):
                self.assertTrue(validate_seeded_resolution(decision))

    def test_seeded_validator_binds_outer_decision_kind_to_seed_context(self):
        decision = seeded_decision()
        decision["decision_kind"] = "normal_action"
        self.assertTrue(validate_seeded_resolution(decision))

    def test_safe_resolver_requires_placement_context_in_both_branches(self):
        for count in (1, 2):
            placements = [safe_placement(), safe_placement("place:A-P-dog-02")][:count]
            for field, invalid in (("decision_kind", "mandatory_choice"),
                                   ("phase", "egg_exchange_choice"),
                                   ("choice_kind", "egg_exchange_bottom"), ("actor_turn_index", True)):
                context = {**placement_context(), field: invalid}
                with self.subTest(count=count, field=field):
                    result = resolve_safe_free_development(placements, context, placement_legal_ids(placements))
                    self.assertIn("error", result)

    def test_seeded_validator_requires_placement_context_for_safety_evidence(self):
        placements = [safe_placement(), safe_placement("place:A-P-dog-02")]
        for field, invalid in (("decision_kind", "mandatory_choice"),
                               ("phase", "egg_exchange_choice"),
                               ("choice_kind", "egg_exchange_bottom")):
            result = resolve_safe_free_development(placements, placement_context(), placement_legal_ids(placements))
            context = {**placement_context(), field: invalid}
            proof = build_seed_proof(context, result["seeded_fallback_candidates"])
            result.update(seed_context=context, seed_proof=proof, decision_kind=context["decision_kind"],
                          selected_candidate=proof["selected_candidate"],
                          selected_placement=next(p for p in placements if p["candidate_id"] == proof["selected_candidate"]),
                          runner_up_candidates=[p["candidate_id"] for p in placements
                                                if p["candidate_id"] != proof["selected_candidate"]])
            with self.subTest(field=field):
                self.assertTrue(validate_seeded_resolution(result))

    def test_json_enum_values_return_errors_instead_of_type_errors(self):
        for malformed in ([], ["normal_action"], {}, 0, True, None):
            for field in ("decision_kind", "resolution_mode", "reason_code"):
                decision = seeded_decision()
                decision[field] = malformed
                with self.subTest(field=field, value=malformed):
                    try:
                        errors = validate_seeded_resolution(decision)
                    except TypeError as exc:
                        self.fail(f"JSON enum validation raised TypeError: {exc}")
                    self.assertTrue(errors)
            for field in ("person_type", "legality"):
                placement = {**safe_placement(), field: malformed}
                with self.subTest(field=field, value=malformed):
                    try:
                        errors = validate_safe_free_placement(placement)
                    except TypeError as exc:
                        self.fail(f"JSON enum validation raised TypeError: {exc}")
                    self.assertTrue(errors)

    def test_seeded_resolution_rejects_missing_or_tampered_proof(self):
        self.assertEqual(validate_seeded_resolution(seeded_decision()), [])
        for mutation in ("remove_sha256", "digest", "index", "candidate"):
            decision = seeded_decision()
            if mutation == "remove_sha256":
                del decision["seed_proof"]["sha256"]
            elif mutation == "digest":
                decision["seed_proof"]["sha256"] = "0" * 64
            elif mutation == "index":
                decision["seed_proof"]["selected_index"] += 1
            else:
                decision["seed_proof"]["selected_candidate"] = "other"
            with self.subTest(mutation=mutation):
                self.assertTrue(validate_seeded_resolution(decision))

    def test_seeded_resolution_rejects_unsorted_duplicate_or_incomplete_candidates(self):
        mutations = {
            "unsorted": lambda d: d.update(legal_candidates=list(reversed(d["legal_candidates"]))),
            "duplicate": lambda d: d.update(legal_candidates=d["legal_candidates"] + [d["legal_candidates"][0]]),
            "incomplete": lambda d: d.update(candidate_set_complete=False),
            "evidence": lambda d: d.update(candidate_set_evidence={}),
            "strategic": lambda d: d.update(strategic_unresolved=False),
            "reason": lambda d: d.update(reason_code="other"),
        }
        for name, mutate in mutations.items():
            decision = seeded_decision()
            mutate(decision)
            with self.subTest(mutation=name):
                self.assertTrue(validate_seeded_resolution(decision))

    def test_seeded_resolution_allows_established_107_114_fields(self):
        decision = seeded_decision()
        decision.update({
            "decision_seq": 4,
            "event_seq": 9,
            "selected_action": "A-P-cat_ceo-01",
            "runner_up_action": "A-G-air-hockey-01",
        })
        self.assertEqual(validate_seeded_resolution(decision), [])

    def test_seeded_resolution_reports_malformed_proof_types(self):
        for malformed in ("not-a-proof", ["not-a-proof"]):
            decision = seeded_decision()
            decision["seed_proof"] = malformed
            with self.subTest(malformed_type=type(malformed).__name__):
                errors = validate_seeded_resolution(decision)
                self.assertTrue(errors)
                self.assertTrue(any("seed_proof" in error for error in errors))

    def test_seeded_resolution_requires_valid_runner_up_candidates(self):
        for invalid in (None, "candidate", [1], [["candidate"]], [],
                        ["unknown"], ["duplicate", "duplicate"]):
            decision = seeded_decision()
            decision["runner_up_candidates"] = invalid
            with self.subTest(runner_ups=invalid):
                self.assertTrue(validate_seeded_resolution(decision))
        decision = seeded_decision()
        decision["runner_up_candidates"].append(decision["selected_candidate"])
        self.assertTrue(validate_seeded_resolution(decision))
        del decision["runner_up_candidates"]
        self.assertTrue(validate_seeded_resolution(decision))

    def test_safe_resolver_emits_runner_ups_in_both_branches(self):
        single = resolve_safe_free_development(
            [safe_placement()], placement_context(), ["pass", "place:A-P-cat_ceo-01"]
        )
        self.assertEqual(single.get("runner_up_candidates"), ["pass"])
        placements = [safe_placement(), safe_placement("place:A-P-dog-02")]
        multiple = resolve_safe_free_development(placements, placement_context(), placement_legal_ids(placements))
        self.assertEqual(multiple.get("runner_up_candidates"), [
            placement["candidate_id"] for placement in placements
            if placement["candidate_id"] != multiple["selected_candidate"]
        ])

    def test_two_placement_resolver_output_passes_seeded_validator(self):
        placements = [safe_placement(), safe_placement("place:A-P-dog-02")]
        result = resolve_safe_free_development(placements, placement_context(), placement_legal_ids(placements))
        self.assertEqual(validate_seeded_resolution(result), [])

    def test_seeded_resolution_validates_safe_placement_evidence(self):
        safe_fields = {
            "selected_placement": safe_placement(),
            "pass_dominated": True,
            "pass_dominated_by": "safe_free_development",
            "placement_card_zone_transfer_counts_as_consumption": False,
            "additional_card_consumption": 0,
        }
        for field, invalid in (
            ("selected_placement", None),
            ("selected_placement", safe_placement("place:wrong")),
            ("selected_placement", {**safe_placement(), "slot_empty": False}),
            ("pass_dominated", False), ("pass_dominated_by", "other"),
            ("placement_card_zone_transfer_counts_as_consumption", True),
            ("additional_card_consumption", 1), ("additional_card_consumption", False),
        ):
            placements = [safe_placement(), safe_placement("place:A-P-dog-02")]
            result = resolve_safe_free_development(placements, placement_context(), placement_legal_ids(placements))
            self.assertEqual(validate_seeded_resolution(result), [])
            result[field] = invalid
            with self.subTest(field=field, invalid=invalid):
                self.assertTrue(validate_seeded_resolution(result))
        for field in safe_fields:
            placements = [safe_placement(), safe_placement("place:A-P-dog-02")]
            result = resolve_safe_free_development(placements, placement_context(), placement_legal_ids(placements))
            del result[field]
            with self.subTest(missing=field):
                self.assertTrue(validate_seeded_resolution(result))
        result = resolve_safe_free_development(placements, placement_context(), placement_legal_ids(placements))
        for field in safe_fields:
            del result[field]
        self.assertTrue(validate_seeded_resolution(result))

    def test_single_safe_free_placement_dominates_pass(self):
        result = resolve_safe_free_development(
            [safe_placement()], placement_context(), ["pass", "place:A-P-cat_ceo-01"]
        )
        self.assertEqual(result["resolution_mode"], "safe_free_development")
        self.assertFalse(result["strategic_unresolved"])
        self.assertEqual(result["selected_candidate"], "place:A-P-cat_ceo-01")
        self.assertTrue(result["pass_dominated"])

    def test_safe_free_placement_rejects_each_excluded_condition(self):
        mutations = {
            "slot": {"slot_empty": False},
            "time": {"actual_time_cost": 1},
            "replacement": {"replacement_required": True},
            "consumption": {"additional_card_consumption": 1},
            "downside": {"certain_downside": True},
            "legality": {"legality": "unknown"},
            "choice": {"unresolved_required_choice": True},
            "person": {"person_type": "main"},
        }
        for name, mutation in mutations.items():
            placement = safe_placement()
            placement.update(mutation)
            with self.subTest(condition=name):
                self.assertTrue(validate_safe_free_placement(placement))

    def test_safe_free_placement_rejects_boolean_numeric_zero(self):
        for field in ("actual_time_cost", "additional_card_consumption"):
            placement = safe_placement()
            placement[field] = False
            with self.subTest(field=field):
                self.assertTrue(validate_safe_free_placement(placement))

    def test_multiple_safe_placements_use_seeded_fallback(self):
        placements = [safe_placement(), safe_placement("place:A-P-dog-02")]
        result = resolve_safe_free_development(placements, placement_context(), placement_legal_ids(placements))
        self.assertEqual(result["resolution_mode"], "seeded_fallback")
        self.assertTrue(result["strategic_unresolved"])
        self.assertEqual(result["reason_code"], "strategic_unresolved_seeded_fallback")
        self.assertEqual(result["pass_dominated_by"], "safe_free_development")
        self.assertEqual(result["seed_proof"], build_seed_proof(
            placement_context(), result["seeded_fallback_candidates"]
        ))

    def test_placed_person_is_zone_transfer_not_consumption(self):
        result = resolve_safe_free_development(
            [safe_placement()], placement_context(), ["pass", "place:A-P-cat_ceo-01"]
        )
        self.assertFalse(result["placement_card_zone_transfer_counts_as_consumption"])
        self.assertEqual(result["additional_card_consumption"], 0)

    def test_safe_resolver_preserves_complete_legal_set_without_lottery_pass(self):
        placements = [safe_placement(), safe_placement("place:A-P-dog-02")]
        legal = ["use:A-G-air-hockey-01", "place:A-P-dog-02", "pass", "place:A-P-cat_ceo-01"]
        result = resolve_safe_free_development(placements, placement_context(), legal)
        self.assertEqual(result["legal_candidates"], sorted(legal))
        self.assertIs(result["candidate_set_complete"], True)
        self.assertEqual(result["seeded_fallback_candidates"], ["place:A-P-cat_ceo-01", "place:A-P-dog-02"])
        self.assertEqual(result["seed_proof"]["canonical_candidate_ids"], ["place:A-P-cat_ceo-01", "place:A-P-dog-02"])
        self.assertNotIn("pass", result["runner_up_candidates"])
        self.assertEqual(validate_seeded_resolution(result), [])
        without_other_action = resolve_safe_free_development(
            placements, placement_context(), placement_legal_ids(placements)
        )
        self.assertEqual(result["seed_proof"], without_other_action["seed_proof"])
        single_legal = ["use:A-G-air-hockey-01", "pass", "place:A-P-cat_ceo-01"]
        single = resolve_safe_free_development([safe_placement()], placement_context(), single_legal)
        self.assertEqual(single["legal_candidates"], sorted(single_legal))
        self.assertEqual(single["runner_up_candidates"], ["pass"])
        self.assertNotIn("seeded_fallback_candidates", single)

    def test_safe_resolver_requires_explicit_valid_complete_legal_ids(self):
        with self.assertRaises(TypeError):
            resolve_safe_free_development([safe_placement()], placement_context())
        for invalid in (None, [], "pass", ["pass"], ["place:A-P-cat_ceo-01"],
                        ["pass", "pass", "place:A-P-cat_ceo-01"], ["pass", []]):
            with self.subTest(legal=invalid):
                result = resolve_safe_free_development([safe_placement()], placement_context(), invalid)
                self.assertIn("error", result)
        self.assertIn("error", resolve_safe_free_development(
            [{**safe_placement(), "candidate_id": "pass"}], placement_context(), ["pass"]
        ))

    def test_seeded_resolution_requires_valid_lottery_subset(self):
        for invalid in (None, [], "candidate", [1], [["candidate"]], ["unknown"]):
            decision = seeded_decision()
            decision["seeded_fallback_candidates"] = invalid
            with self.subTest(subset=invalid):
                self.assertTrue(validate_seeded_resolution(decision))
        for mutation in ("missing", "unsorted", "duplicate", "outside_legal", "missing_selected", "runner_up_pass"):
            decision = seeded_decision()
            if mutation == "missing":
                del decision["seeded_fallback_candidates"]
            elif mutation == "unsorted":
                decision["seeded_fallback_candidates"].reverse()
            elif mutation == "duplicate":
                decision["seeded_fallback_candidates"].append(decision["selected_candidate"])
            elif mutation == "outside_legal":
                decision["legal_candidates"].remove(decision["runner_up_candidates"][0])
            elif mutation == "missing_selected":
                decision["seeded_fallback_candidates"].remove(decision["selected_candidate"])
            else:
                decision["runner_up_candidates"].append("pass")
            with self.subTest(mutation=mutation):
                self.assertTrue(validate_seeded_resolution(decision))

    def test_seeded_resolution_rejects_dominated_pass_even_with_matching_proof(self):
        placements = [safe_placement(), safe_placement("place:A-P-dog-02")]
        result = resolve_safe_free_development(placements, placement_context(), placement_legal_ids(placements))
        self.assertEqual(validate_seeded_resolution(result), [])
        proof = build_seed_proof(placement_context(), result["legal_candidates"])
        result.update(seed_proof=proof, seeded_fallback_candidates=result["legal_candidates"],
                      selected_candidate=proof["selected_candidate"],
                      runner_up_candidates=[candidate for candidate in result["legal_candidates"]
                                            if candidate != proof["selected_candidate"]])
        result["selected_placement"] = next(
            placement for placement in placements if placement["candidate_id"] == proof["selected_candidate"]
        )
        errors = validate_seeded_resolution(result)
        self.assertTrue(any("pass" in error and "lottery" in error for error in errors), errors)

    def test_contract_fixes_decision_kinds_modes_and_seed_algorithm(self):
        contract = build_fallback_contract()
        decision = contract["decision_contract"]
        self.assertEqual(contract["schema"], CONTRACT_VERSION)
        self.assertEqual(contract["checkpoint"], 116)
        self.assertEqual(decision["decision_kinds"], ["normal_action", "mandatory_choice"])
        self.assertEqual(decision["resolution_modes"], [
            "priority_unique", "safe_free_development", "seeded_fallback",
        ])
        self.assertEqual(decision["required_record_fields"], [
            "decision_kind", "resolution_mode", "strategic_unresolved",
            "legal_candidates", "selected_candidate", "runner_up_candidates",
            "reason_code",
        ])
        seeded = contract["seeded_fallback"]
        self.assertEqual(seeded["seed_material_fields"], list(SEED_CONTEXT_KEYS) + ["canonical_candidate_ids"])
        self.assertEqual(seeded["algorithm"], "sha256_modulo")
        self.assertEqual(seeded.get("candidate_source"), "seeded_fallback_candidates")
        self.assertEqual(seeded.get("required_record_fields"), [
            "seeded_fallback_candidates", "candidate_set_complete", "candidate_set_evidence",
            "seed_context", "seed_proof",
        ])
        self.assertEqual(seeded.get("runner_up_rule"), "lottery_subset_minus_selected")
        self.assertEqual(seeded.get("seed_context_types"), {
            "contract_version": "exact_contract_version_string",
            "order_id": "non_empty_string", "actor": "A_or_B_string",
            "actor_turn_index": "integer_at_least_1_excluding_bool",
            "round": "integer_at_least_1_excluding_bool", "phase": "non_empty_string",
            "decision_kind": "normal_action_or_mandatory_choice_string",
            "choice_kind": "non_empty_string",
        })
        self.assertIs(seeded.get("decision_kind_matches_record"), True)
        safe = contract["safe_free_development"]
        self.assertIs(safe.get("requires_explicit_complete_legal_candidates"), True)
        self.assertEqual(safe.get("required_context"), {
            "decision_kind": "normal_action", "phase": "normal_action",
            "choice_kind": "zero_cost_person_placement",
        })
        self.assertEqual(safe.get("lottery_candidates"), "incomparable_safe_placement_ids_excluding_pass")
        self.assertEqual(safe.get("single_placement_runner_up_candidates"), ["pass"])
        self.assertEqual(safe.get("required_evidence_fields"), [
            "additional_card_consumption", "pass_dominated", "pass_dominated_by",
            "placement_card_zone_transfer_counts_as_consumption", "selected_placement",
        ])
        self.assertEqual(decision["seeded_fallback_reason_code"], "strategic_unresolved_seeded_fallback")

    def test_contract_fixes_continue_and_stop_conditions(self):
        contract = build_fallback_contract()
        self.assertEqual(contract["continuation_conditions"], [
            "complete_legal_candidates", "stable_canonical_candidate_ids",
            "permitted_information_only", "resolution_can_continue",
            "record_integrity_preserved",
        ])
        self.assertEqual(contract["stop_conditions"], [
            "incomplete_legal_candidates", "opponent_private_or_future_information_required",
            "missing_stable_candidate_identifier", "legality_not_confirmed",
            "record_integrity_or_hash_broken",
        ])

    def test_contract_preserves_zero_artifact_and_population_boundaries(self):
        contract = build_fallback_contract()
        self.assertEqual(contract["scope"], {
            "fixture_count": 0, "completed_match_count": 0, "decision_trace_count": 0,
            "event_count": 0, "snapshot_count": 0, "winner_count": 0,
            "independent_balance_sample_count": 0,
        })
        self.assertEqual(contract["checkpoint_112"], {
            "targeted_fixture_count": 6, "completed_in_116": 0, "status": "unchanged_unplayed",
        })
        self.assertEqual(contract["population"], {
            "current_catalog": 452, "registered_candidates": 477,
            "changed_card_text_numeric_or_registration_ids": 0,
        })

    def test_seeded_matches_are_excluded_from_balance_evidence(self):
        contract = build_fallback_contract()
        evaluation = contract["evaluation"]
        self.assertEqual(evaluation["required_match_aggregates"], [
            "strategic_unresolved_count", "seeded_fallback_count",
        ])
        self.assertEqual(evaluation["exclude_from_independent_balance_when_any_positive"], [
            "strategic_unresolved_count", "seeded_fallback_count",
        ])
        self.assertEqual(evaluation["excluded_evidence"], [
            "independent_balance", "win_rate", "first_second_difference",
            "activation_rate", "card_strength",
        ])
        invalid = build_fallback_contract()
        invalid["evaluation"]["exclude_from_independent_balance_when_any_positive"] = []
        self.assertTrue(validate_fallback_contract(invalid))

    def test_saved_contract_equals_builder_output(self):
        canonical = Path(__file__).resolve().parents[1] / "data" / "proxy-normal-decision-fallback-contract-116-20260918.json"
        contract = build_fallback_contract()
        self.assertEqual(load_json(canonical), contract)
        self.assertEqual(validate_materialized(load_json(canonical), canonical), [])
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "contract.json"
            write_json(contract, output)
            self.assertEqual(load_json(output), contract)

    def test_contract_builder_returns_isolated_mutable_collections(self):
        contract = build_fallback_contract()
        modified_lists = [
            contract["decision_contract"]["decision_kinds"],
            contract["decision_contract"]["resolution_modes"],
            contract["decision_contract"]["required_record_fields"],
            contract["continuation_conditions"],
            contract["stop_conditions"],
        ]
        original_values = [list(values) for values in modified_lists]
        try:
            for values in modified_lists:
                values.append("caller_mutation")
            self.assertTrue(validate_fallback_contract(contract))
            fresh = build_fallback_contract()
            self.assertEqual(fresh["decision_contract"]["decision_kinds"], original_values[0])
            self.assertEqual(fresh["decision_contract"]["resolution_modes"], original_values[1])
            self.assertEqual(fresh["decision_contract"]["required_record_fields"], original_values[2])
            self.assertEqual(fresh["continuation_conditions"], original_values[3])
            self.assertEqual(fresh["stop_conditions"], original_values[4])
        finally:
            for values, original in zip(modified_lists, original_values):
                values[:] = original

    def test_materialized_contract_requires_exact_canonical_serialization(self):
        contract = build_fallback_contract()
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "contract.json"
            output.write_text(
                json.dumps(contract, ensure_ascii=True, separators=(",", ":")),
                encoding="utf-8",
            )
            self.assertTrue(validate_materialized(load_json(output), output))

    def test_contract_validator_rejects_malformed_decision_contract_type(self):
        for malformed in (None, [], "not-a-contract", 116):
            contract = build_fallback_contract()
            contract["decision_contract"] = malformed
            with self.subTest(malformed=repr(malformed)):
                errors = validate_fallback_contract(contract)
                self.assertTrue(errors)
                self.assertTrue(any("decision contract" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
