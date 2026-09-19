"""Selector and protocol-only contract validator for normal-decision fallback."""

import argparse
import hashlib
import json
import numbers
from pathlib import Path


CONTRACT_VERSION = "naotocchi.card_game.proxy_normal_decision_fallback.v1"
SEED_CONTEXT_KEYS = (
    "contract_version", "order_id", "actor", "actor_turn_index", "round",
    "phase", "decision_kind", "choice_kind",
)
_REQUIRED = {
    "decision_kind", "resolution_mode", "strategic_unresolved", "reason_code",
    "legal_candidates", "seeded_fallback_candidates", "candidate_set_complete", "candidate_set_evidence",
    "seed_context", "seed_proof", "selected_candidate", "runner_up_candidates",
}
_SAFE_RESOLUTION_FIELDS = {
    "selected_placement", "pass_dominated", "pass_dominated_by",
    "placement_card_zone_transfer_counts_as_consumption", "additional_card_consumption",
}
_ALLOWED_TOP_LEVEL = _REQUIRED | _SAFE_RESOLUTION_FIELDS | {
    # Fields established by the 107/114 decision protocols remain extensible here.
    "decision_id", "decision_state", "public_information", "private_information",
    "pre_decision_state",
    "payment", "targets", "chain", "action", "choice",
    "decision_seq", "event_seq", "selected_action", "runner_up_action",
    "priority_basis", "state_ref", "source_ref", "actor_turn_index", "round",
    "phase", "choice_kind", "order_id", "actor", "contract_version",
    "legal_candidate_details",
}

_SAFE_PLACEMENT_KEYS = {
    "candidate_id", "card_copy_id", "person_type", "slot_empty",
    "actual_time_cost", "replacement_required", "additional_card_consumption",
    "certain_downside", "legality", "unresolved_required_choice",
}
SAFE_PERSON_TYPES = {"companion", "partner"}

CANONICAL_CONTRACT_PATH = (
    Path(__file__).resolve().parents[1]
    / "data" / "proxy-normal-decision-fallback-contract-116-20260918.json"
)
DECISION_KINDS = ["normal_action", "mandatory_choice"]
RESOLUTION_MODES = ["priority_unique", "safe_free_development", "seeded_fallback"]
REQUIRED_RECORD_FIELDS = [
    "decision_kind", "resolution_mode", "strategic_unresolved",
    "legal_candidates", "selected_candidate", "runner_up_candidates", "reason_code",
]
CONTINUATION_CONDITIONS = [
    "complete_legal_candidates", "stable_canonical_candidate_ids",
    "permitted_information_only", "resolution_can_continue",
    "record_integrity_preserved",
]
STOP_CONDITIONS = [
    "incomplete_legal_candidates", "opponent_private_or_future_information_required",
    "missing_stable_candidate_identifier", "legality_not_confirmed",
    "record_integrity_or_hash_broken",
]


def build_fallback_contract():
    """Build the complete, protocol-only checkpoint 116 contract."""
    return {
        "schema": CONTRACT_VERSION,
        "checkpoint": 116,
        "status": "protocol_only_no_match_artifacts",
        "decision_contract": {
            "decision_kinds": list(DECISION_KINDS),
            "resolution_modes": list(RESOLUTION_MODES),
            "required_record_fields": list(REQUIRED_RECORD_FIELDS),
            "seeded_fallback_reason_code": "strategic_unresolved_seeded_fallback",
        },
        "seeded_fallback": {
            "required_record_fields": [
                "seeded_fallback_candidates", "candidate_set_complete", "candidate_set_evidence",
                "seed_context", "seed_proof",
            ],
            "candidate_source": "seeded_fallback_candidates",
            "candidate_subset_rules": [
                "non_empty", "unique", "sorted", "contained_in_complete_legal_candidates",
                "includes_selected_candidate",
            ],
            "runner_up_rule": "lottery_subset_minus_selected",
            "seed_context_types": {
                "contract_version": "exact_contract_version_string",
                "order_id": "non_empty_string", "actor": "A_or_B_string",
                "actor_turn_index": "integer_at_least_1_excluding_bool",
                "round": "integer_at_least_1_excluding_bool", "phase": "non_empty_string",
                "decision_kind": "normal_action_or_mandatory_choice_string",
                "choice_kind": "non_empty_string",
            },
            "decision_kind_matches_record": True,
            "seed_material_fields": list(SEED_CONTEXT_KEYS) + ["canonical_candidate_ids"],
            "canonical_serialization": "utf8_json_no_whitespace",
            "candidate_id_order": "unicode_code_point_ascending",
            "algorithm": "sha256_modulo",
            "digest_integer": "big_endian_unsigned",
            "selection_rule": "digest_integer_modulo_candidate_count",
            "independent_per_decision": True,
            "excluded_seed_material_fields": [
                "fixture_id", "match_id", "first_player_id", "path_name",
            ],
        },
        "safe_free_development": {
            "person_types": ["companion", "partner"],
            "required_conditions": [
                "slot_empty", "actual_time_cost_zero", "no_replacement_or_zone_exit",
                "no_additional_card_consumption", "no_certain_public_downside",
                "legality_confirmed", "no_unresolved_required_choice",
            ],
            "dominates": "pass",
            "multiple_unresolved_candidates": "seeded_fallback",
            "placed_person_zone_transfer_counts_as_consumption": False,
            "requires_explicit_complete_legal_candidates": True,
            "complete_legal_candidates_include": ["pass", "all_supplied_legal_actions"],
            "lottery_candidates": "incomparable_safe_placement_ids_excluding_pass",
            "single_placement_runner_up_candidates": ["pass"],
            "required_context": {
                "decision_kind": "normal_action", "phase": "normal_action",
                "choice_kind": "zero_cost_person_placement",
            },
            "required_evidence_fields": sorted(_SAFE_RESOLUTION_FIELDS),
        },
        "continuation_conditions": list(CONTINUATION_CONDITIONS),
        "stop_conditions": list(STOP_CONDITIONS),
        "evaluation": {
            "required_match_aggregates": [
                "strategic_unresolved_count", "seeded_fallback_count",
            ],
            "exclude_from_independent_balance_when_any_positive": [
                "strategic_unresolved_count", "seeded_fallback_count",
            ],
            "excluded_evidence": [
                "independent_balance", "win_rate", "first_second_difference",
                "activation_rate", "card_strength",
            ],
        },
        "scope": {
            "fixture_count": 0,
            "completed_match_count": 0,
            "decision_trace_count": 0,
            "event_count": 0,
            "snapshot_count": 0,
            "winner_count": 0,
            "independent_balance_sample_count": 0,
        },
        "checkpoint_112": {
            "targeted_fixture_count": 6,
            "completed_in_116": 0,
            "status": "unchanged_unplayed",
        },
        "checkpoint_115": {
            "audited_path_count": 4,
            "resumed_in_116": 0,
            "status": "unchanged_stopped",
        },
        "population": {
            "current_catalog": 452,
            "registered_candidates": 477,
            "changed_card_text_numeric_or_registration_ids": 0,
        },
        "next_checkpoint": 117,
    }


def validate_fallback_contract(contract):
    """Return contract errors; contract is valid only when it is canonical."""
    if not isinstance(contract, dict):
        return ["contract must be an object"]

    expected = build_fallback_contract()
    errors = []
    for key in ("schema", "checkpoint", "status"):
        if contract.get(key) != expected[key]:
            errors.append(f"{key} differs")
    decision_contract = contract.get("decision_contract")
    if not isinstance(decision_contract, dict):
        errors.append("decision contract must be an object")
        decision_contract = {}
    expected_decision_contract = expected["decision_contract"]
    if decision_contract.get("decision_kinds") != expected_decision_contract["decision_kinds"]:
        errors.append("decision kinds differ")
    if decision_contract.get("resolution_modes") != expected_decision_contract["resolution_modes"]:
        errors.append("resolution modes differ")
    if decision_contract.get("required_record_fields") != expected_decision_contract["required_record_fields"]:
        errors.append("required record fields differ")
    if contract.get("seeded_fallback") != expected["seeded_fallback"]:
        errors.append("seed rules differ")
    if contract.get("safe_free_development") != expected["safe_free_development"]:
        errors.append("safe free development rules differ")
    if contract.get("continuation_conditions") != expected["continuation_conditions"]:
        errors.append("continuation conditions differ")
    if contract.get("stop_conditions") != expected["stop_conditions"]:
        errors.append("stop conditions differ")
    if contract.get("evaluation") != expected["evaluation"]:
        errors.append("evaluation exclusion differs")
    if contract.get("scope") != expected["scope"]:
        errors.append("protocol-only scope differs")
    for key in ("checkpoint_112", "checkpoint_115", "population", "next_checkpoint"):
        if contract.get(key) != expected[key]:
            errors.append(f"{key} boundary differs")
    if contract != expected:
        errors.append("contract differs from canonical builder output")
    return errors


def load_json(path):
    """Load a UTF-8 JSON object from path."""
    with Path(path).open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(value, output_path):
    """Materialize canonical JSON with stable human-readable formatting."""
    with Path(output_path).open("w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def validate_materialized(value, output_path):
    """Validate an in-memory materialization and its JSON serialization."""
    errors = validate_fallback_contract(value)
    try:
        raw_text = Path(output_path).read_text(encoding="utf-8")
    except OSError as exc:
        return errors + ["materialized JSON cannot be read: " + str(exc)]
    canonical_text = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    if raw_text != canonical_text:
        errors.append("materialized JSON is not canonical serialization")
    return errors


def _is_numeric_zero(value):
    return isinstance(value, numbers.Number) and not isinstance(value, bool) and value == 0


def canonical_candidate_ids(candidate_ids):
    if not isinstance(candidate_ids, list) or not candidate_ids:
        raise ValueError("candidate IDs must be a non-empty list")
    if any(not isinstance(value, str) or not value for value in candidate_ids):
        raise ValueError("candidate IDs must be non-empty strings")
    if len(set(candidate_ids)) != len(candidate_ids):
        raise ValueError("candidate IDs must be unique")
    return sorted(candidate_ids)


def _validate_seed_context(context):
    if not isinstance(context, dict):
        return ["seed_context must be an object"]
    errors = []
    if set(context) != set(SEED_CONTEXT_KEYS):
        errors.append("seed context keys differ")
    if not isinstance(context.get("contract_version"), str) or context.get("contract_version") != CONTRACT_VERSION:
        errors.append("fallback contract version differs")
    for field in ("order_id", "phase", "choice_kind"):
        if not isinstance(context.get(field), str) or not context[field]:
            errors.append(f"seed context {field} must be a non-empty string")
    actor = context.get("actor")
    if not isinstance(actor, str) or actor not in {"A", "B"}:
        errors.append("seed context actor must be A or B")
    for field in ("actor_turn_index", "round"):
        value = context.get(field)
        if not isinstance(value, int) or isinstance(value, bool) or value < 1:
            errors.append(f"seed context {field} must be an integer >= 1, excluding bool")
    kind = context.get("decision_kind")
    if not isinstance(kind, str) or kind not in DECISION_KINDS:
        errors.append("unknown seed context decision_kind")
    return errors


def _validate_safe_placement_context(context):
    errors = _validate_seed_context(context)
    if isinstance(context, dict):
        for field, expected in (("decision_kind", "normal_action"),
                                ("phase", "normal_action"),
                                ("choice_kind", "zero_cost_person_placement")):
            if context.get(field) != expected:
                errors.append(f"safe free development context {field} must be {expected}")
    return errors


def build_seed_proof(context, candidate_ids):
    context_errors = _validate_seed_context(context)
    if context_errors:
        raise ValueError("; ".join(context_errors))
    ordered = canonical_candidate_ids(candidate_ids)
    material = [context[key] for key in SEED_CONTEXT_KEYS] + [ordered]
    serialized = json.dumps(material, ensure_ascii=False, separators=(",", ":"))
    digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    selected_index = int(digest, 16) % len(ordered)
    return {
        "algorithm": "sha256_modulo",
        "seed_material": material,
        "canonical_serialization": serialized,
        "sha256": digest,
        "canonical_candidate_ids": ordered,
        "candidate_count": len(ordered),
        "selected_index": selected_index,
        "selected_candidate": ordered[selected_index],
    }


def validate_safe_free_placement(placement):
    """Return all errors for a candidate safe, zero-cost person placement."""
    if not isinstance(placement, dict):
        return ["placement must be an object"]
    errors = []
    unknown = set(placement) - _SAFE_PLACEMENT_KEYS
    if unknown:
        errors.append("unknown placement keys: " + ", ".join(sorted(unknown)))
    missing = _SAFE_PLACEMENT_KEYS - set(placement)
    errors.extend("missing placement field: " + key for key in sorted(missing))
    candidate_id = placement.get("candidate_id")
    card_copy_id = placement.get("card_copy_id")
    if not isinstance(candidate_id, str) or not candidate_id:
        errors.append("candidate_id must be a non-empty string")
    if not isinstance(card_copy_id, str) or not card_copy_id:
        errors.append("card_copy_id must be a non-empty string")
    if not isinstance(placement.get("person_type"), str) or placement["person_type"] not in SAFE_PERSON_TYPES:
        errors.append("safe free placement must be companion or partner")
    if placement.get("slot_empty") is not True:
        errors.append("safe free placement requires an empty slot")
    if not _is_numeric_zero(placement.get("actual_time_cost")):
        errors.append("safe free placement requires actual time cost zero")
    if placement.get("replacement_required") is not False:
        errors.append("safe free placement cannot replace a person")
    if not _is_numeric_zero(placement.get("additional_card_consumption")):
        errors.append("safe free placement cannot consume another card")
    if placement.get("certain_downside") is not False:
        errors.append("safe free placement cannot have a certain downside")
    if placement.get("legality") != "confirmed":
        errors.append("safe free placement legality must be confirmed")
    if placement.get("unresolved_required_choice") is not False:
        errors.append("safe free placement cannot leave a required choice unresolved")
    return errors


def resolve_safe_free_development(placements, context, legal_candidate_ids):
    """Resolve incomparable safe placements within the caller's complete legal set."""
    if not isinstance(placements, list) or not placements:
        return {"error": "safe free development requires at least one placement"}
    errors = _validate_safe_placement_context(context)
    candidate_ids = []
    card_copy_ids = []
    for index, placement in enumerate(placements):
        placement_errors = validate_safe_free_placement(placement)
        errors.extend(f"placement {index}: {error}" for error in placement_errors)
        if isinstance(placement, dict):
            candidate_ids.append(placement.get("candidate_id"))
            card_copy_ids.append(placement.get("card_copy_id"))
    valid_candidate_ids = [value for value in candidate_ids if isinstance(value, str)]
    valid_card_copy_ids = [value for value in card_copy_ids if isinstance(value, str)]
    if len(valid_candidate_ids) != len(set(valid_candidate_ids)):
        errors.append("candidate_id values must be unique")
    if len(valid_card_copy_ids) != len(set(valid_card_copy_ids)):
        errors.append("card_copy_id values must be unique")
    try:
        legal_candidates = canonical_candidate_ids(legal_candidate_ids)
    except ValueError as exc:
        errors.append("invalid complete legal candidates: " + str(exc))
        legal_candidates = []
    if "pass" not in legal_candidates:
        errors.append("complete legal candidates must include pass")
    if any(candidate not in legal_candidates for candidate in candidate_ids):
        errors.append("complete legal candidates must include every supplied placement")
    if "pass" in candidate_ids:
        errors.append("pass cannot be a safe placement candidate")
    if errors:
        return {"error": "invalid safe free placement", "errors": errors}

    ordered = sorted(candidate_ids)
    selected = ordered[0]
    base = {
        "decision_kind": "normal_action",
        "legal_candidates": legal_candidates,
        "candidate_set_complete": True,
        "candidate_set_evidence": {
            "source_ref": "complete_legal_candidate_ids_input",
            "state_ref": "safe_free_placement_context",
            "enumeration_rule": "all legal actions supplied by caller, including pass",
        },
        "selected_candidate": selected,
        "selected_placement": next(p for p in placements if p["candidate_id"] == selected),
        "pass_dominated": True,
        "pass_dominated_by": "safe_free_development",
        "placement_card_zone_transfer_counts_as_consumption": False,
        "additional_card_consumption": 0,
    }
    if len(ordered) == 1:
        base.update({
            "resolution_mode": "safe_free_development",
            "strategic_unresolved": False,
            "reason_code": "safe_free_development_dominates_pass",
            "runner_up_candidates": ["pass"],
            "seed_context": None,
            "seed_proof": None,
        })
        return base

    try:
        proof = build_seed_proof(context, ordered)
    except (TypeError, KeyError, ValueError) as exc:
        return {"error": "invalid seed context", "errors": [str(exc)]}
    base.update({
        "resolution_mode": "seeded_fallback",
        "strategic_unresolved": True,
        "reason_code": "strategic_unresolved_seeded_fallback",
        "seed_context": context,
        "seed_proof": proof,
        "seeded_fallback_candidates": ordered,
        "selected_candidate": proof["selected_candidate"],
        "runner_up_candidates": [candidate for candidate in ordered
                                 if candidate != proof["selected_candidate"]],
        "selected_placement": next(p for p in placements if p["candidate_id"] == proof["selected_candidate"]),
    })
    return base


def validate_seeded_resolution(decision):
    """Return all validation errors; an empty list means the record is valid."""
    errors = []
    if not isinstance(decision, dict):
        return ["decision must be an object"]
    unknown = set(decision) - _ALLOWED_TOP_LEVEL
    if unknown:
        errors.append("unknown top-level keys: " + ", ".join(sorted(unknown)))
    missing = _REQUIRED - set(decision)
    errors.extend("missing required field: " + key for key in sorted(missing))
    if not isinstance(decision.get("decision_kind"), str) or decision["decision_kind"] not in DECISION_KINDS:
        errors.append("unknown decision_kind")
    if decision.get("resolution_mode") != "seeded_fallback":
        errors.append("resolution_mode must be seeded_fallback")
    if decision.get("strategic_unresolved") is not True:
        errors.append("strategic_unresolved must be true")
    if decision.get("reason_code") != "strategic_unresolved_seeded_fallback":
        errors.append("reason_code differs")
    if decision.get("candidate_set_complete") is not True:
        errors.append("candidate_set_complete must be true")
    evidence = decision.get("candidate_set_evidence")
    if not isinstance(evidence, dict) or set(evidence) != {"source_ref", "state_ref", "enumeration_rule"}:
        errors.append("candidate_set_evidence keys differ")
    candidates = decision.get("legal_candidates")
    try:
        ordered = canonical_candidate_ids(candidates)
    except (TypeError, ValueError) as exc:
        errors.append(str(exc))
        ordered = None
    if ordered is not None and candidates != ordered:
        errors.append("legal_candidates must be sorted")
    if "legal_candidate_details" in decision:
        details = decision.get("legal_candidate_details")
        detail_ids = []
        if not isinstance(details, list):
            errors.append("legal_candidate_details must be a list")
        else:
            for index, detail in enumerate(details):
                if not isinstance(detail, dict):
                    errors.append(f"legal_candidate_details[{index}] must be an object")
                    continue
                candidate_id = detail.get("candidate_id")
                if not isinstance(candidate_id, str) or not candidate_id:
                    errors.append(
                        f"legal_candidate_details[{index}] candidate_id must be a non-empty string")
                    continue
                detail_ids.append(candidate_id)
            if len(detail_ids) != len(set(detail_ids)):
                errors.append("legal_candidate_details candidate_id values must be unique")
            if ordered is not None and set(detail_ids) != set(ordered):
                errors.append("legal_candidate_details IDs must exactly bind legal_candidates")
    lottery_candidates = decision.get("seeded_fallback_candidates")
    try:
        lottery = canonical_candidate_ids(lottery_candidates)
    except ValueError as exc:
        errors.append("invalid seeded_fallback_candidates: " + str(exc))
        lottery = None
    if lottery is not None:
        if lottery_candidates != lottery:
            errors.append("seeded_fallback_candidates must be sorted")
        if ordered is not None and not set(lottery).issubset(ordered):
            errors.append("seeded_fallback_candidates must be contained in legal_candidates")
        if decision.get("selected_candidate") not in lottery:
            errors.append("selected_candidate must be in seeded_fallback_candidates")
    runner_ups = decision.get("runner_up_candidates")
    if not isinstance(runner_ups, list) or any(
        not isinstance(candidate, str) or not candidate for candidate in runner_ups
    ):
        errors.append("runner_up_candidates must be a list of non-empty strings")
    elif len(set(runner_ups)) != len(runner_ups):
        errors.append("runner_up_candidates must be unique")
    elif lottery is not None and set(runner_ups) != {
        candidate for candidate in lottery if candidate != decision.get("selected_candidate")
    }:
        errors.append("runner_up_candidates must equal non-selected lottery candidates")
    context = decision.get("seed_context")
    safe_resolution = bool(_SAFE_RESOLUTION_FIELDS & set(decision)) or (
        isinstance(context, dict) and context.get("choice_kind") == "zero_cost_person_placement"
    )
    context_errors = (_validate_safe_placement_context(context) if safe_resolution
                      else _validate_seed_context(context))
    errors.extend(context_errors)
    if isinstance(context, dict) and decision.get("decision_kind") != context.get("decision_kind"):
        errors.append("decision_kind differs from seed_context decision_kind")
    if safe_resolution:
        if ordered is not None and "pass" not in ordered:
            errors.append("safe free development legal_candidates must include pass")
        if lottery is not None and "pass" in lottery:
            errors.append("dominated pass cannot enter the safe placement lottery")
        errors.extend("missing safety evidence field: " + key
                      for key in sorted(_SAFE_RESOLUTION_FIELDS - set(decision)))
        placement = decision.get("selected_placement")
        errors.extend("selected_placement: " + error
                      for error in validate_safe_free_placement(placement))
        if isinstance(placement, dict) and placement.get("candidate_id") != decision.get("selected_candidate"):
            errors.append("selected_placement candidate_id differs from selected_candidate")
        if decision.get("pass_dominated") is not True:
            errors.append("pass_dominated must be true")
        if decision.get("pass_dominated_by") != "safe_free_development":
            errors.append("pass_dominated_by must be safe_free_development")
        if decision.get("placement_card_zone_transfer_counts_as_consumption") is not False:
            errors.append("placement card zone transfer must not count as consumption")
        if not _is_numeric_zero(decision.get("additional_card_consumption")):
            errors.append("safe free development requires zero additional_card_consumption")
    proof = decision.get("seed_proof")
    if not isinstance(proof, dict):
        errors.append("seed_proof must be an object")
    if not context_errors and lottery is not None:
        expected = build_seed_proof(context, lottery)
        if proof != expected:
            errors.append("seed_proof does not match recomputation")
    proof_selected_candidate = proof.get("selected_candidate") if isinstance(proof, dict) else None
    if decision.get("selected_candidate") != proof_selected_candidate:
        errors.append("selected_candidate differs from seed_proof")
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write the canonical contract")
    parser.add_argument("--output", type=Path, default=CANONICAL_CONTRACT_PATH)
    args = parser.parse_args(argv)

    expected = build_fallback_contract()
    if args.write:
        write_json(expected, args.output)
        value = load_json(args.output)
    else:
        try:
            value = load_json(args.output)
        except (OSError, json.JSONDecodeError) as exc:
            print(json.dumps({"valid": False, "errors": [str(exc)]}, ensure_ascii=False))
            return 1
    errors = validate_materialized(value, args.output)
    print(json.dumps({"valid": not errors, "errors": errors}, ensure_ascii=False))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
