#!/usr/bin/env python3
"""Build and validate checkpoint-114 normal-decision hardening data.

This module validates a manually adjudicated table for the 41 card IDs in the
107 source pair.  It is deliberately not a general legality or effect engine.
"""

import argparse
import copy
import json
from pathlib import Path


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_SOURCE = DATA / "proxy-fixtures-107/fixture-107-normal-decision-a-first.json"
DEFAULT_ADMISSION = DATA / "proxy-normal-decision-admission-113-20260918.json"
DEFAULT_TABLE = DATA / "proxy-normal-decision-candidate-table-114-20260918.json"
DEFAULT_OUTPUT = DATA / "proxy-normal-decision-hardening-114-20260918.json"

CARD_TYPES = {
    "M": "main", "C": "companion", "P": "partner", "W": "world",
    "G": "play", "I": "item", "E": "event",
}
CARD_KEYS = {"card_id", "card_type", "actions"}
ACTION_KEYS = {
    "action_type", "timing", "base_time_cost", "prerequisites", "target_rule",
    "candidate_variants", "legal_when", "not_legal_when", "source_text_reference",
}
PRE_DECISION_KEYS = {"hand", "board", "time", "growth", "reservations"}
BOARD_KEYS = {"main", "companions", "partner", "partner_stage", "world", "prepared"}
PUBLIC_INFORMATION_KEYS = {
    "information_policy", "own_hand", "own_board", "opponent_board", "growth",
    "time", "discard", "reservations",
}
PRIORITY_ORDER = [
    "avoid_loss_or_abort",
    "maintain_or_prevent_100",
    "certain_growth_difference",
    "time_after_certain_resolution",
    "hand_board_reservation_value",
]
TIE_BREAKERS = ["lower_time_payment", "fewer_cards_consumed", "lower_card_copy_id"]


def load_json(path):
    return json.loads(Path(path).read_text())


def source_card_ids(source):
    return {
        card["card_id"]
        for player in source["input"]["players"]
        for card in player["deck_order_top_to_bottom"]
    }


def validate_candidate_table(table, source):
    errors = []
    if table.get("schema") != "naotocchi.card_game.proxy_normal_decision_candidate_table.v1":
        errors.append("candidate table schema differs")
    cards = table.get("cards", [])
    ids = [row.get("card_id") for row in cards]
    expected_ids = source_card_ids(source)
    missing = sorted(expected_ids - set(ids))
    extra = sorted(set(ids) - expected_ids)
    duplicate = sorted({card_id for card_id in ids if ids.count(card_id) > 1})
    if missing:
        errors.append(f"candidate table missing card IDs: {missing}")
    if extra:
        errors.append(f"candidate table extra card IDs: {extra}")
    if duplicate:
        errors.append(f"candidate table duplicate card IDs: {duplicate}")
    for row in cards:
        card_id = row.get("card_id", "")
        if set(row) != CARD_KEYS:
            errors.append(f"{card_id} card keys differ: {sorted(set(row) ^ CARD_KEYS)}")
            continue
        expected_type = CARD_TYPES.get(card_id[:1])
        if row.get("card_type") != expected_type:
            errors.append(f"{card_id} card type differs")
        actions = row.get("actions")
        if not isinstance(actions, list) or not actions:
            errors.append(f"{card_id} actions must be a non-empty list")
            continue
        identities = []
        for action in actions:
            if set(action) != ACTION_KEYS:
                errors.append(
                    f"{card_id} action keys differ: {sorted(set(action) ^ ACTION_KEYS)}")
                continue
            if not all(action[key] not in (None, "", []) for key in (
                    "action_type", "timing", "prerequisites", "target_rule",
                    "candidate_variants", "legal_when", "not_legal_when",
                    "source_text_reference")):
                errors.append(f"{card_id} action has empty adjudication field")
            identity = (action.get("action_type"), json.dumps(
                action.get("candidate_variants"), ensure_ascii=False, sort_keys=True))
            identities.append(identity)
        if len(identities) != len(set(identities)):
            errors.append(f"{card_id} duplicate action entries")
    standing = table.get("standing_candidates")
    if standing != [{
            "candidate_id": "candidate-pass", "kind": "pass", "action_type": "pass",
            "timing": "normal_action_opportunity", "base_time_cost": 0}]:
        errors.append("candidate table must contain the exact standing pass candidate")
    if table.get("preserved_existing_candidate_families") != [
            "challenge_power_or_wisdom", "relationship_progress"]:
        errors.append("candidate table must preserve challenge and relationship candidates")
    if {row.get("card_type") for row in cards} != set(CARD_TYPES.values()):
        errors.append("candidate table must cover all seven card types")
    return errors


def _exact_keys(value, expected, label):
    if not isinstance(value, dict):
        return [f"{label} must be an object"]
    missing = sorted(expected - set(value))
    unknown = sorted(set(value) - expected)
    errors = []
    if missing:
        errors.append(f"{label} missing keys: {missing}")
    if unknown:
        errors.append(f"{label} unknown keys: {unknown}")
    return errors


def validate_pre_decision_state(state):
    errors = _exact_keys(state, PRE_DECISION_KEYS, "pre_decision_state")
    if isinstance(state, dict) and "board" in state:
        errors.extend(_exact_keys(state["board"], BOARD_KEYS, "pre_decision_state.board"))
    return errors


def validate_public_information(info):
    errors = _exact_keys(info, PUBLIC_INFORMATION_KEYS, "public_information")
    if isinstance(info, dict) and info.get("information_policy") != "public_and_owner_known_only":
        errors.append("public_information information_policy differs")
    return errors


def compare_candidates(left, right):
    for key in PRIORITY_ORDER[:4]:
        left_value = left[key]
        right_value = right[key]
        if left_value != right_value:
            return {
                "winner": "left" if left_value > right_value else "right",
                "decided_at": key,
                "reason": key,
            }

    relation = left.get("value_comparison_to", {}).get(right.get("candidate_id"))
    if relation is None or set(relation) != {"hand", "board", "reservations"}:
        return {"winner": "unresolved", "decided_at": "hand_board_reservation_value",
                "reason": "unresolved_canonical_text"}
    values = list(relation.values())
    if any(value not in {"better", "equal", "worse", "incomparable"} for value in values):
        return {"winner": "unresolved", "decided_at": "hand_board_reservation_value",
                "reason": "unresolved_canonical_text"}
    if "incomparable" in values or ("better" in values and "worse" in values):
        return {"winner": "unresolved", "decided_at": "hand_board_reservation_value",
                "reason": "unresolved_canonical_text"}
    if "better" in values:
        return {"winner": "left", "decided_at": "hand_board_reservation_value",
                "reason": "pareto_dominance"}
    if "worse" in values:
        return {"winner": "right", "decided_at": "hand_board_reservation_value",
                "reason": "pareto_dominance"}

    tie_values = [
        ("lower_time_payment", left["payment_time"], right["payment_time"]),
        ("fewer_cards_consumed", left["consumed_card_count"], right["consumed_card_count"]),
        ("lower_card_copy_id", left["card_copy_id"], right["card_copy_id"]),
    ]
    for label, left_value, right_value in tie_values:
        if left_value != right_value:
            return {"winner": "left" if left_value < right_value else "right",
                    "decided_at": label, "reason": label}
    return {"winner": "unresolved", "decided_at": "fully_equal",
            "reason": "unresolved_canonical_text"}


def build_hardening_contract(candidate_table, source, admission):
    return {
        "schema": "naotocchi.card_game.proxy_normal_decision_hardening.v1",
        "checkpoint": 114,
        "status": "protocol_hardened_no_matches",
        "source_fixture": "proxy-fixtures-107/fixture-107-normal-decision-a-first.json",
        "admission_audit": "proxy-normal-decision-admission-113-20260918.json",
        "resolved_blockers": [
            "candidate-coverage-incomplete",
            "pre-decision-schema-mismatch",
            "priority-comparison-unresolved",
        ],
        "candidate_table": {
            "file": "proxy-normal-decision-candidate-table-114-20260918.json",
            "unique_card_id_count": len(source_card_ids(source)),
            "card_type_count": len({row["card_type"] for row in candidate_table["cards"]}),
            "standing_candidates": copy.deepcopy(candidate_table["standing_candidates"]),
            "preserved_existing_candidate_families": copy.deepcopy(
                candidate_table["preserved_existing_candidate_families"]),
            "automatic_complete_legality": False,
        },
        "decision_schema": {
            "pre_decision_state_required_and_allowed_keys": sorted(PRE_DECISION_KEYS),
            "board_required_and_allowed_keys": sorted(BOARD_KEYS),
            "public_information_required_and_allowed_keys": sorted(PUBLIC_INFORMATION_KEYS),
            "information_policy": "public_and_owner_known_only",
            "forbidden_examples": ["field", "opponent_hand", "deck_order", "unknown_key"],
        },
        "comparison": {
            "priority_order": PRIORITY_ORDER,
            "time_balance_measure": "time_after_certain_resolution",
            "pass_may_beat_paid_action": True,
            "value_components": ["hand", "board", "reservations"],
            "value_relations": ["better", "equal", "worse", "incomparable"],
            "value_rule": "pareto_only_otherwise_unresolved_canonical_text",
            "tie_breakers": TIE_BREAKERS,
            "incomparable_is_tie": False,
            "uses_hidden_or_future_information": False,
        },
        "scope": {
            "fixture_count": 0,
            "completed_match_count": 0,
            "trace_count": 0,
            "winner_count": 0,
            "independent_balance_sample_count": 0,
            "game_engine_added": False,
        },
        "deferred_batch": {
            "planned_match_count": admission["deferred_batch"]["planned_match_count"],
            "materialized_in_114": False,
            "resume_checkpoint": 115,
        },
        "checkpoint_112": {
            "targeted_fixture_count": 6,
            "completed_in_114": 0,
            "status": "unchanged_unplayed",
        },
        "population": {
            "current_catalog": 452,
            "registered_candidates": 477,
            "changed_card_text_numeric_or_registration_ids": 0,
        },
    }


def validate_hardening_contract(contract, candidate_table, source, admission):
    errors = validate_candidate_table(candidate_table, source)
    expected = build_hardening_contract(candidate_table, source, admission)
    if contract != expected:
        errors.append("114 hardening contract differs from canonical builder")
    if contract.get("scope", {}).get("completed_match_count") != 0:
        errors.append("114 completed_match_count must remain zero")
    if contract.get("deferred_batch", {}).get("planned_match_count") != 4:
        errors.append("114 must preserve four deferred matches")
    return errors


def write_hardening_contract(contract, output_path):
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(contract, ensure_ascii=False, indent=2) + "\n")


def validate_materialized_contract(contract, output_path):
    output_path = Path(output_path)
    if not output_path.exists():
        return ["materialized 114 hardening contract is missing"]
    if load_json(output_path) != contract:
        return ["materialized 114 hardening contract differs from builder"]
    return []


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default=DEFAULT_SOURCE)
    parser.add_argument("--admission", default=DEFAULT_ADMISSION)
    parser.add_argument("--table", default=DEFAULT_TABLE)
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)
    source = load_json(args.source)
    admission = load_json(args.admission)
    table = load_json(args.table)
    contract = build_hardening_contract(table, source, admission)
    errors = validate_hardening_contract(contract, table, source, admission)
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    if args.write:
        write_hardening_contract(contract, args.output)
    output = Path(args.output)
    if output.exists():
        errors = validate_materialized_contract(contract, output)
        if errors:
            print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
            return 1
    print(json.dumps({
        "valid": True,
        "status": contract["status"],
        "card_ids": contract["candidate_table"]["unique_card_id_count"],
        "resolved_blockers": contract["resolved_blockers"],
        "completed_match_count": contract["scope"]["completed_match_count"],
        "deferred_match_count": contract["deferred_batch"]["planned_match_count"],
        "written": args.write,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
