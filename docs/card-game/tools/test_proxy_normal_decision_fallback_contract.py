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
        "candidate_set_complete": True,
        "candidate_set_evidence": {
            "source_ref": "115:path:order-01-a-first",
            "state_ref": "R1:egg_exchange_choice:A",
            "enumeration_rule": "all_card_copy_ids_in_hand_after_egg_draw",
        },
        "seed_context": seed_context(),
        "seed_proof": proof,
        "selected_candidate": proof["selected_candidate"],
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

    def test_single_safe_free_placement_dominates_pass(self):
        result = resolve_safe_free_development([safe_placement()], placement_context())
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
        result = resolve_safe_free_development(placements, placement_context())
        self.assertEqual(result["resolution_mode"], "seeded_fallback")
        self.assertTrue(result["strategic_unresolved"])
        self.assertEqual(result["reason_code"], "strategic_unresolved_seeded_fallback")
        self.assertEqual(result["pass_dominated_by"], "safe_free_development")
        self.assertEqual(result["seed_proof"], build_seed_proof(
            placement_context(), result["legal_candidates"]
        ))

    def test_placed_person_is_zone_transfer_not_consumption(self):
        result = resolve_safe_free_development([safe_placement()], placement_context())
        self.assertFalse(result["placement_card_zone_transfer_counts_as_consumption"])
        self.assertEqual(result["additional_card_consumption"], 0)

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
