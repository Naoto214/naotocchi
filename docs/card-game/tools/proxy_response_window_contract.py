#!/usr/bin/env python3
"""Checkpoint 119 response-window contract and phase adapter."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

from proxy_normal_decision_seeded_restart import _stop_state_sha256


ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

CONTRACT_SCHEMA = "naotocchi.card_game.proxy_response_window_contract.v1"
AUDIT_SCHEMA = "naotocchi.card_game.proxy_response_window_candidate_audit.v1"
CONTRACT_VERSION = "naotocchi.card_game.proxy_response_window.v1"
PATH_ORDER = (
    "order-01-a-first",
    "order-01-b-first",
    "order-02-a-first",
    "order-02-b-first",
)
RESPONSE_CONTEXT_KEYS = (
    "source_phase",
    "phase",
    "window_kind",
    "origin_event_seq",
    "turn_player",
    "priority_actor",
    "chain_status",
    "chain_links",
    "consecutive_passes",
    "response_opportunity_index",
    "decision_kind",
    "choice_kind",
)
RESPONSE_SEED_CONTEXT_KEYS = (
    "contract_version",
    "order_id",
    "actor",
    "actor_turn_index",
    "round",
    "origin_event_seq",
    "response_opportunity_index",
    "phase",
    "decision_kind",
    "choice_kind",
)
RESPONSE_PASS_ID = "response-pass"
FORBIDDEN_RESPONSE_PASS_ALIASES = ("candidate-pass", "pass")
FORBIDDEN_RESPONSE_ACTION_TYPES = (
    "birth",
    "time_skip",
    "transform",
    "place_companion",
    "place_partner",
    "place_world",
    "relationship_progress",
    "attach_item",
    "prepare_action",
    "challenge",
)
CANDIDATE_AUDIT_KEYS = (
    "path_id",
    "source_stop_file",
    "source_stop_sha256",
    "source_state_sha256",
    "response_context",
    "inspected_information",
    "checked_candidate_families",
    "legal_candidate_ids",
    "legal_candidate_details",
    "excluded_candidates",
    "forbidden_information_used",
    "candidate_set_complete",
)
TRANSITION_KEYS = (
    "window_status",
    "window_kind",
    "turn_player",
    "priority_actor",
    "chain_status",
    "chain_links",
    "consecutive_passes",
    "response_opportunity_index",
    "pending_triggers",
    "return_to",
    "resolution_order",
)
SEED_PROOF_KEYS = (
    "algorithm",
    "seed_material",
    "canonical_serialization",
    "sha256",
    "canonical_candidate_ids",
    "candidate_count",
    "selected_index",
    "selected_candidate",
)
OUTPUT_FILES = {
    "contract": "proxy-response-window-contract-119-20260922.json",
    "candidate_audit": "proxy-response-window-candidate-audit-119-20260922.json",
}
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

ZERO_SCOPE = {
    "planned_match_count": 0,
    "completed_match_count": 0,
    "stopped_match_count": 0,
    "decision_trace_count": 0,
    "event_count": 0,
    "snapshot_count": 0,
    "winner_count": 0,
    "independent_balance_sample_count": 0,
    "new_stop_artifact_count": 0,
}


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_inputs(data_dir: Path = DATA) -> dict[str, object]:
    """Load checkpoint 119's read-only source artifacts."""
    stop_dir = data_dir / "proxy-normal-decision-stops-117"
    return {
        "candidate_table": _load_json(
            data_dir / "proxy-normal-decision-candidate-table-114-20260918.json"
        ),
        "fallback_contract_116": _load_json(
            data_dir / "proxy-normal-decision-fallback-contract-116-20260918.json"
        ),
        "restart_plan_117": _load_json(
            data_dir / "proxy-normal-decision-seeded-restart-plan-117-20260919.json"
        ),
        "restart_evaluation_117": _load_json(
            data_dir / "proxy-normal-decision-seeded-restart-evaluation-117-20260919.json"
        ),
        "stops_117": [
            _load_json(stop_dir / f"stop-117-{path_id}.json")
            for path_id in PATH_ORDER
        ],
    }


def _contract_template() -> dict[str, object]:
    return {
        "schema": CONTRACT_SCHEMA,
        "checkpoint": 119,
        "status": "protocol_only_no_match_progress",
        "contract_version": CONTRACT_VERSION,
        "phase_adapter": {
            "source_phase": "post_placement_response",
            "canonical_phase": "response_window",
            "allowed_window_kinds": ["after_normal_action"],
            "mutates_source_state": False,
            "rehashes_source_state": False,
        },
        "candidate_contract": {
            "response_pass_candidate_id": RESPONSE_PASS_ID,
            "forbidden_pass_aliases": list(FORBIDDEN_RESPONSE_PASS_ALIASES),
            "candidate_families": [
                "hand_quick_use",
                "triggered_ability",
                "prepared_activation",
            ],
            "enumeration_unit": "one_priority_actor_response_opportunity",
        },
        "transition_contract": {
            "rules_source": "06-action-chain-checkpoint.md",
            "empty_chain_first_pass": "priority_to_opponent_with_one_consecutive_pass",
            "empty_chain_second_pass": "close_response_window",
            "activation": "append_chain_reset_passes_activator_retains_priority",
            "activation_after_opponent_pass": "priority_to_previous_passer_reset_passes",
            "building_chain_second_pass": "close_and_resolve_reverse_activation_order",
            "resolution_trigger": "enqueue_new_chain_after_current_chain",
            "normal_action_return": "only_after_no_chain_trigger_or_response_remains",
        },
        "seeded_fallback": {
            "selection_order": [
                "response_unique",
                "priority_unique",
                "response_seeded_fallback",
            ],
            "context_keys": list(RESPONSE_SEED_CONTEXT_KEYS),
            "seed_material": "ten_context_values_then_sorted_candidate_ids",
            "serialization": "canonical_json_array",
            "digest": "sha256",
            "integer_conversion": "big_endian_unsigned",
            "index": "digest_integer_modulo_candidate_count",
            "applied_to_stops_117": False,
        },
        "scope": copy.deepcopy(ZERO_SCOPE),
        "checkpoint_boundaries": {
            "checkpoint_112_fixtures_executed": False,
            "fallback_contract_116_modified": False,
            "stops_117_resumed": False,
            "stops_117_modified": False,
        },
        "population": {
            "current_catalog_count": 452,
            "registered_history_candidate_count": 477,
            "checkpoint_119_added_count": 0,
        },
    }


def build_response_window_contract() -> dict[str, object]:
    """Return a detached checkpoint 119 contract object."""
    return copy.deepcopy(_contract_template())


def _compare_exact(actual: object, expected: object, path: str) -> list[str]:
    if type(actual) is not type(expected):
        return [f"{path}: expected {type(expected).__name__}, got {type(actual).__name__}"]
    if isinstance(expected, dict):
        errors = []
        if list(actual) != list(expected):
            errors.append(f"{path}: keys or key order differ")
        for key in expected.keys() & actual.keys():
            errors.extend(_compare_exact(actual[key], expected[key], f"{path}.{key}"))
        return errors
    if isinstance(expected, list):
        if len(actual) != len(expected):
            return [f"{path}: expected {len(expected)} items, got {len(actual)}"]
        errors = []
        for index, (actual_item, expected_item) in enumerate(zip(actual, expected)):
            errors.extend(_compare_exact(actual_item, expected_item, f"{path}[{index}]"))
        return errors
    return [] if actual == expected else [f"{path}: expected {expected!r}, got {actual!r}"]


def validate_response_window_contract(contract: object) -> list[str]:
    """Validate the contract strictly, including key order and scalar types."""
    return _compare_exact(contract, _contract_template(), "contract")


def derive_response_context(stop_artifact: dict[str, object]) -> dict[str, object]:
    """Derive, without mutation, the first response context for a 117 stop."""
    state = stop_artifact.get("pre_decision_state")
    if not isinstance(state, dict):
        raise ValueError("pre_decision_state must be an object")
    actor = stop_artifact.get("actor")
    checks = (
        (stop_artifact.get("phase") == "post_placement_response", "source phase"),
        (state.get("phase") == "post_placement_response", "state phase"),
        (type(stop_artifact.get("last_valid_event_seq")) is int and
         stop_artifact.get("last_valid_event_seq") == 3, "origin event seq"),
        (actor in ("A", "B"), "actor"),
        (state.get("turn_player") == actor, "turn player"),
        (_stop_state_sha256(state) == stop_artifact.get("last_valid_state_sha256"),
         "state hash"),
    )
    for valid, label in checks:
        if not valid:
            raise ValueError(f"invalid checkpoint 117 stop {label}")
    context = {
        "source_phase": "post_placement_response",
        "phase": "response_window",
        "window_kind": "after_normal_action",
        "origin_event_seq": 3,
        "turn_player": actor,
        "priority_actor": actor,
        "chain_status": "empty",
        "chain_links": [],
        "consecutive_passes": 0,
        "response_opportunity_index": 1,
        "decision_kind": "response_action",
        "choice_kind": "reaction_or_pass",
    }
    errors = validate_response_context(context, stop_artifact)
    if errors:
        raise ValueError("; ".join(errors))
    return context


def validate_response_context(context: object, stop_artifact: object) -> list[str]:
    """Strictly validate a derived first-response context against its 117 stop."""
    if not isinstance(stop_artifact, dict):
        return ["stop_artifact must be an object"]
    state = stop_artifact.get("pre_decision_state")
    if not isinstance(state, dict):
        return ["pre_decision_state must be an object"]
    actor = stop_artifact.get("actor")
    expected = {
        "source_phase": "post_placement_response",
        "phase": "response_window",
        "window_kind": "after_normal_action",
        "origin_event_seq": stop_artifact.get("last_valid_event_seq"),
        "turn_player": state.get("turn_player"),
        "priority_actor": actor,
        "chain_status": "empty",
        "chain_links": [],
        "consecutive_passes": 0,
        "response_opportunity_index": 1,
        "decision_kind": "response_action",
        "choice_kind": "reaction_or_pass",
    }
    errors = _compare_exact(context, expected, "context")
    if list(expected) != list(RESPONSE_CONTEXT_KEYS):
        errors.append("internal response context key order differs")
    return errors


def build_response_pass_detail() -> dict[str, object]:
    return {
        "candidate_id": RESPONSE_PASS_ID,
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
    }


def _card_index(candidate_table: dict[str, object]) -> dict[str, dict[str, object]]:
    cards = candidate_table.get("cards")
    if not isinstance(cards, list):
        raise ValueError("candidate table cards must be an array")
    result = {}
    for row in cards:
        if not isinstance(row, dict) or not isinstance(row.get("card_id"), str):
            raise ValueError("candidate table card row is invalid")
        result[row["card_id"]] = row
    return result


def _instance_detail(state: dict[str, object], instance_id: str) -> dict[str, object]:
    cards = state.get("cards")
    if not isinstance(cards, dict) or not isinstance(cards.get(instance_id), dict):
        raise ValueError(f"missing card instance {instance_id}")
    card = cards[instance_id]
    if card.get("initial_instance_id") != instance_id:
        raise ValueError(f"instance identity mismatch for {instance_id}")
    return {
        "instance_id": instance_id,
        "card_copy_id": card.get("card_copy_id"),
        "card_id": card.get("card_id"),
    }


def _board_snapshot(state: dict[str, object], board: dict[str, object]) -> dict[str, object]:
    def one(value: object) -> object:
        return None if value is None else _instance_detail(state, value)

    return {
        "main": one(board.get("main")),
        "companions": [_instance_detail(state, value)
                       for value in board.get("companions", [])],
        "partner": one(board.get("partner")),
        "partner_stage": board.get("partner_stage"),
        "world": one(board.get("world")),
    }


def _information_snapshot(
        state: dict[str, object], actor: str) -> dict[str, object]:
    players = state.get("players")
    if not isinstance(players, dict) or actor not in players:
        raise ValueError("actor player state is missing")
    opponent = "B" if actor == "A" else "A"
    owner_state = players[actor]
    opponent_state = players.get(opponent)
    if not isinstance(owner_state, dict) or not isinstance(opponent_state, dict):
        raise ValueError("player state must be an object")
    owner_board = owner_state.get("board")
    opponent_board = opponent_state.get("board")
    if not isinstance(owner_board, dict) or not isinstance(opponent_board, dict):
        raise ValueError("board state must be an object")
    return {
        "owner": {
            "hand": [_instance_detail(state, value)
                     for value in owner_state.get("hand", [])],
            "board": _board_snapshot(state, owner_board),
            "prepared": [_instance_detail(state, value)
                         for value in owner_board.get("prepared", [])],
            "discard": [_instance_detail(state, value)
                        for value in owner_state.get("discard", [])],
            "time": owner_state.get("time"),
            "reservations": copy.deepcopy(owner_state.get("reservations", [])),
        },
        "opponent_public": {
            "board": _board_snapshot(state, opponent_board),
            "prepared_public": [],
            "discard": [_instance_detail(state, value)
                        for value in opponent_state.get("discard", [])],
            "time": opponent_state.get("time"),
            "reservations": copy.deepcopy(opponent_state.get("reservations", [])),
        },
    }


def _first_date_detail(
        state: dict[str, object], actor: str,
        instance_id: str, candidate_table: dict[str, object]) -> dict[str, object]:
    cards = state["cards"]
    source = cards.get(instance_id)
    player = state["players"][actor]
    target_id = player["board"].get("partner")
    if source != {
            "card_copy_id": "A-040",
            "initial_instance_id": "A-040#1",
            "card_id": "E-first-date",
    } or instance_id != "A-040#1":
        raise ValueError("E-first-date source identity is not canonical")
    target = cards.get(target_id)
    if target_id != "A-017#1" or target != {
            "card_copy_id": "A-017",
            "initial_instance_id": "A-017#1",
            "card_id": "P-cat_ceo",
    }:
        raise ValueError("E-first-date target identity is not canonical")
    if player.get("time") != 1 or player["board"].get("partner_stage") != 0:
        raise ValueError("E-first-date payment or relationship stage is invalid")
    row = _card_index(candidate_table).get("E-first-date")
    actions = row.get("actions") if isinstance(row, dict) else None
    if not isinstance(actions, list) or len(actions) != 1:
        raise ValueError("E-first-date candidate table row is missing")
    action = actions[0]
    if (action.get("action_type"), action.get("base_time_cost"),
            action.get("target_rule")) != (
                "use_event", 1, "own stage-0 partner"):
        raise ValueError("E-first-date candidate table row differs")
    candidate_id = f"response-use-event-{instance_id}-target-{target_id}"
    return {
        "candidate_id": candidate_id,
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
    }


def _hand_exclusion_reason(card_id: str, card_row: dict[str, object]) -> str:
    if card_id == "E-boss":
        return "insufficient_time_and_condition_false"
    if card_id == "E-fateful-transform":
        return "insufficient_time_and_no_main"
    if card_id == "G-basketball-3d":
        return "no_own_main_target"
    actions = card_row.get("actions")
    action_type = actions[0].get("action_type") if isinstance(actions, list) and actions else None
    if action_type == "attach_item":
        return "attach_not_response"
    return "normal_action_not_response"


def enumerate_response_candidates(
        stop_artifact: dict[str, object],
        candidate_table: dict[str, object]) -> dict[str, object]:
    context = derive_response_context(stop_artifact)
    state = stop_artifact["pre_decision_state"]
    actor = stop_artifact["actor"]
    player = state["players"][actor]
    card_rows = _card_index(candidate_table)
    legal_details = [build_response_pass_detail()]
    excluded = []
    for instance_id in player["hand"]:
        card = state["cards"].get(instance_id)
        if not isinstance(card, dict):
            raise ValueError(f"missing hand card {instance_id}")
        card_id = card.get("card_id")
        card_row = card_rows.get(card_id)
        if card_row is None:
            raise ValueError(f"candidate table has no row for {card_id}")
        if card_id == "E-first-date" and stop_artifact.get("path_id") == "order-01-a-first":
            legal_details.append(
                _first_date_detail(state, actor, instance_id, candidate_table))
        else:
            excluded.append({
                "source_zone": "hand",
                "source_instance_id": instance_id,
                "card_id": card_id,
                "reason_code": _hand_exclusion_reason(card_id, card_row),
            })
    board = player["board"]
    for instance_id in board.get("companions", []):
        card_id = state["cards"][instance_id]["card_id"]
        excluded.append({
            "source_zone": "board",
            "source_instance_id": instance_id,
            "card_id": card_id,
            "reason_code": "passive_not_activation",
        })
    if board.get("partner") is not None:
        instance_id = board["partner"]
        excluded.append({
            "source_zone": "board",
            "source_instance_id": instance_id,
            "card_id": state["cards"][instance_id]["card_id"],
            "reason_code": "trigger_already_missed_and_egg_ability_disabled",
        })
    if not board.get("prepared"):
        excluded.append({
            "source_zone": "prepared",
            "source_instance_id": None,
            "card_id": None,
            "reason_code": "no_prepared_activation_present",
        })
    legal_details.sort(key=lambda value: value["candidate_id"])
    path_id = stop_artifact["path_id"]
    source_filename = f"stop-117-{path_id}.json"
    return {
        "path_id": path_id,
        "source_stop_file": f"proxy-normal-decision-stops-117/{source_filename}",
        "source_stop_sha256": PROTECTED_FILE_SHA256[source_filename],
        "source_state_sha256": stop_artifact["last_valid_state_sha256"],
        "response_context": context,
        "inspected_information": _information_snapshot(state, actor),
        "checked_candidate_families": [
            "hand_quick_use", "triggered_ability", "prepared_activation",
        ],
        "legal_candidate_ids": [row["candidate_id"] for row in legal_details],
        "legal_candidate_details": legal_details,
        "excluded_candidates": excluded,
        "forbidden_information_used": [],
        "candidate_set_complete": True,
    }


def build_candidate_audit(inputs: dict[str, object]) -> dict[str, object]:
    stops = inputs.get("stops_117")
    table = inputs.get("candidate_table")
    if not isinstance(stops, list) or not isinstance(table, dict):
        raise ValueError("candidate audit inputs are invalid")
    audits = [enumerate_response_candidates(stop, table) for stop in stops]
    return {
        "schema": AUDIT_SCHEMA,
        "checkpoint": 119,
        "status": "protocol_only_no_match_progress",
        "audited_response_opportunity_count": 4,
        "selected_candidate_count": 0,
        "scope": copy.deepcopy(ZERO_SCOPE),
        "audits": audits,
    }


def validate_candidate_audit(
        audit: object, inputs: dict[str, object]) -> list[str]:
    try:
        expected = build_candidate_audit(inputs)
    except (KeyError, TypeError, ValueError) as error:
        return [f"inputs: {error}"]
    errors = _compare_exact(audit, expected, "candidate_audit")
    if not isinstance(audit, dict):
        return errors
    rows = audit.get("audits")
    if not isinstance(rows, list):
        return errors
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        if list(row) != list(CANDIDATE_AUDIT_KEYS):
            errors.append(f"candidate_audit.audits[{index}]: keys differ")
        candidate_ids = row.get("legal_candidate_ids")
        details = row.get("legal_candidate_details")
        if isinstance(candidate_ids, list):
            if candidate_ids != sorted(candidate_ids) or len(candidate_ids) != len(set(candidate_ids)):
                errors.append(f"candidate_audit.audits[{index}]: candidate IDs are not sorted unique")
            if any(value in FORBIDDEN_RESPONSE_PASS_ALIASES for value in candidate_ids):
                errors.append(f"candidate_audit.audits[{index}]: forbidden pass alias")
        if isinstance(details, list):
            detail_ids = [value.get("candidate_id") for value in details
                          if isinstance(value, dict)]
            if detail_ids != candidate_ids:
                errors.append(f"candidate_audit.audits[{index}]: candidate detail IDs differ")
            if any(value.get("action_type") in FORBIDDEN_RESPONSE_ACTION_TYPES
                   for value in details if isinstance(value, dict)):
                errors.append(f"candidate_audit.audits[{index}]: normal action included")
        information = row.get("inspected_information")
        if isinstance(information, dict):
            forbidden = {
                "opponent_hand", "opponent_deck_order", "future_draw",
                "future_response_choice",
            }
            if forbidden & information.keys():
                errors.append(f"candidate_audit.audits[{index}]: forbidden information used")
    return errors


def _validate_transition_context(context: object) -> list[str]:
    if not isinstance(context, dict):
        return ["transition context must be an object"]
    errors = []
    if list(context) != list(TRANSITION_KEYS):
        errors.append("transition context keys or key order differ")
    if context.get("window_status") != "open":
        errors.append("transition window must be open")
    if context.get("window_kind") != "after_normal_action":
        errors.append("transition window kind is not supported")
    if context.get("turn_player") not in ("A", "B"):
        errors.append("turn player is invalid")
    if context.get("priority_actor") not in ("A", "B"):
        errors.append("priority actor is invalid")
    if context.get("chain_status") not in ("empty", "building"):
        errors.append("chain status is invalid")
    links = context.get("chain_links")
    if not isinstance(links, list) or any(not isinstance(value, str) for value in links):
        errors.append("chain links must be string IDs")
    elif len(links) != len(set(links)):
        errors.append("chain links must be unique")
    if context.get("chain_status") == "empty" and links != []:
        errors.append("empty chain has links")
    if context.get("chain_status") == "building" and not links:
        errors.append("building chain has no links")
    passes = context.get("consecutive_passes")
    if type(passes) is not int or passes not in (0, 1):
        errors.append("consecutive passes must be zero or one")
    opportunity = context.get("response_opportunity_index")
    if type(opportunity) is not int or opportunity < 1:
        errors.append("response opportunity index must be a positive integer")
    triggers = context.get("pending_triggers")
    if not isinstance(triggers, list) or any(not isinstance(value, str) for value in triggers):
        errors.append("pending triggers must be string IDs")
    if context.get("return_to") is not None or context.get("resolution_order") != []:
        errors.append("open transition context cannot already return or resolve")
    return errors


def _other_actor(actor: str) -> str:
    return "B" if actor == "A" else "A"


def transition_response_window(
        context: dict[str, object], action: dict[str, object]) -> dict[str, object]:
    """Apply one synthetic response transition without touching match state."""
    errors = _validate_transition_context(context)
    if errors:
        raise ValueError("; ".join(errors))
    if not isinstance(action, dict):
        raise ValueError("response action must be an object")
    kind = action.get("kind")
    expected_action_keys = (
        ("kind", "actor") if kind == "response_pass"
        else ("kind", "actor", "link_id") if kind == "activate"
        else ()
    )
    if not expected_action_keys or tuple(action) != expected_action_keys:
        raise ValueError("response action keys differ")
    actor = action.get("actor")
    if actor != context["priority_actor"]:
        raise ValueError("response action actor does not hold priority")
    result = copy.deepcopy(context)
    result["response_opportunity_index"] += 1
    if kind == "activate":
        link_id = action.get("link_id")
        if not isinstance(link_id, str) or not link_id or link_id in result["chain_links"]:
            raise ValueError("activation link ID must be new and non-empty")
        prior_passes = result["consecutive_passes"]
        result["chain_links"].append(link_id)
        result["chain_status"] = "building"
        result["consecutive_passes"] = 0
        result["priority_actor"] = actor if prior_passes == 0 else _other_actor(actor)
        return result
    if result["consecutive_passes"] == 0:
        result["consecutive_passes"] = 1
        result["priority_actor"] = _other_actor(actor)
        return result
    result["consecutive_passes"] = 2
    result["window_status"] = "closed"
    if result["chain_links"]:
        result["chain_status"] = "resolving"
        result["resolution_order"] = list(reversed(result["chain_links"]))
        result["return_to"] = None
        if result["pending_triggers"]:
            result["next_window_kind"] = "after_chain_resolution_trigger"
            result["normal_action_return_allowed"] = False
    else:
        result["chain_status"] = "empty"
        result["return_to"] = "normal_action_opportunity"
    return result


def validate_response_transition(
        before: object, action: object, after: object) -> list[str]:
    try:
        expected = transition_response_window(before, action)
    except (KeyError, TypeError, ValueError) as error:
        return [f"transition input: {error}"]
    return _compare_exact(after, expected, "transition after")


def _validate_response_seed_context(context: object) -> list[str]:
    if not isinstance(context, dict):
        return ["response seed context must be an object"]
    errors = []
    if list(context) != list(RESPONSE_SEED_CONTEXT_KEYS):
        errors.append("response seed context keys or key order differ")
        return errors
    exact_values = {
        "contract_version": CONTRACT_VERSION,
        "phase": "response_window",
        "decision_kind": "response_action",
        "choice_kind": "reaction_or_pass",
    }
    for key, value in exact_values.items():
        if context.get(key) != value:
            errors.append(f"response seed context {key} differs")
    if not isinstance(context.get("order_id"), str) or not context["order_id"]:
        errors.append("response seed order ID is invalid")
    if context.get("actor") not in ("A", "B"):
        errors.append("response seed actor is invalid")
    for key in ("actor_turn_index", "round", "origin_event_seq",
                "response_opportunity_index"):
        value = context.get(key)
        if type(value) is not int or value < 1:
            errors.append(f"response seed {key} must be a positive integer")
    return errors


def build_response_seed_proof(
        context: dict[str, object], candidate_ids: list[str]) -> dict[str, object]:
    """Build a deterministic proof for a synthetic ambiguous response choice."""
    errors = _validate_response_seed_context(context)
    if errors:
        raise ValueError("; ".join(errors))
    if (not isinstance(candidate_ids, list)
            or len(candidate_ids) < 2
            or any(not isinstance(value, str) or not value for value in candidate_ids)
            or len(candidate_ids) != len(set(candidate_ids))):
        raise ValueError("response seed candidate IDs must be two or more unique strings")
    ordered_ids = sorted(candidate_ids)
    material = [context[key] for key in RESPONSE_SEED_CONTEXT_KEYS] + [ordered_ids]
    serialized = json.dumps(material, ensure_ascii=False, separators=(",", ":"))
    digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    selected_index = int(digest, 16) % len(ordered_ids)
    return {
        "algorithm": "sha256_big_endian_unsigned_modulo_n",
        "seed_material": material,
        "canonical_serialization": serialized,
        "sha256": digest,
        "canonical_candidate_ids": ordered_ids,
        "candidate_count": len(ordered_ids),
        "selected_index": selected_index,
        "selected_candidate": ordered_ids[selected_index],
    }


def validate_response_seed_proof(
        proof: object, context: object, candidate_ids: object) -> list[str]:
    try:
        expected = build_response_seed_proof(context, candidate_ids)
    except (KeyError, TypeError, ValueError) as error:
        return [f"response seed input: {error}"]
    errors = _compare_exact(proof, expected, "response seed proof")
    if isinstance(proof, dict) and list(proof) != list(SEED_PROOF_KEYS):
        errors.append("response seed proof keys or key order differ")
    return errors


def build_checkpoint_119(
        inputs: dict[str, object]) -> dict[str, dict[str, object]]:
    return {
        "contract": build_response_window_contract(),
        "candidate_audit": build_candidate_audit(inputs),
    }


def _canonical_json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def write_checkpoint_119(bundle: dict[str, object], data_dir: Path) -> None:
    """Write exactly the two checkpoint 119 machine-readable artifacts."""
    if set(bundle) != set(OUTPUT_FILES):
        raise ValueError("checkpoint 119 bundle keys differ")
    for key, filename in OUTPUT_FILES.items():
        (data_dir / filename).write_bytes(_canonical_json_bytes(bundle[key]))


def validate_materialized_checkpoint_119(
        bundle: object, data_dir: Path) -> list[str]:
    if not isinstance(bundle, dict) or list(bundle) != ["contract", "candidate_audit"]:
        return ["checkpoint 119 bundle keys or key order differ"]
    errors = []
    errors.extend(validate_response_window_contract(bundle.get("contract")))
    audit = bundle.get("candidate_audit")
    if not isinstance(audit, dict):
        errors.append("candidate audit must be an object")
    else:
        if audit.get("schema") != AUDIT_SCHEMA:
            errors.append("candidate audit schema differs")
        if audit.get("checkpoint") != 119:
            errors.append("candidate audit checkpoint differs")
        if audit.get("scope") != ZERO_SCOPE:
            errors.append("candidate audit scope differs")
    for key, filename in OUTPUT_FILES.items():
        path = data_dir / filename
        if not path.is_file():
            errors.append(f"missing materialized artifact: {filename}")
            continue
        expected = _canonical_json_bytes(bundle[key])
        actual = path.read_bytes()
        if actual != expected:
            errors.append(f"materialized artifact bytes differ: {filename}")
    return errors


def validate_protected_sources(
        inputs: dict[str, object], data_dir: Path) -> list[str]:
    errors = []
    stop_dir = data_dir / "proxy-normal-decision-stops-117"
    for filename, expected in PROTECTED_FILE_SHA256.items():
        path = stop_dir / filename if filename.startswith("stop-117-") else data_dir / filename
        if not path.is_file():
            errors.append(f"protected source missing: {filename}")
        elif hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            errors.append(f"protected source hash differs: {filename}")
    stops = inputs.get("stops_117")
    if not isinstance(stops, list):
        return errors + ["protected stop inputs are invalid"]
    for stop in stops:
        if not isinstance(stop, dict) or stop.get("path_id") not in PROTECTED_STATE_SHA256:
            errors.append("protected stop path is invalid")
            continue
        path_id = stop["path_id"]
        expected = PROTECTED_STATE_SHA256[path_id]
        if stop.get("last_valid_state_sha256") != expected:
            errors.append(f"protected state hash field differs: {path_id}")
        state = stop.get("pre_decision_state")
        if not isinstance(state, dict) or _stop_state_sha256(state) != expected:
            errors.append(f"protected state bytes differ: {path_id}")
    return errors


def _cli(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--data-dir", type=Path, default=DATA)
    args = parser.parse_args(argv)
    errors = []
    written = False
    try:
        inputs = load_inputs(args.data_dir)
        bundle = build_checkpoint_119(inputs)
        errors.extend(validate_response_window_contract(bundle["contract"]))
        errors.extend(validate_candidate_audit(bundle["candidate_audit"], inputs))
        errors.extend(validate_protected_sources(inputs, args.data_dir))
        if args.write and not errors:
            write_checkpoint_119(bundle, args.data_dir)
            written = True
        if not errors:
            errors.extend(validate_materialized_checkpoint_119(bundle, args.data_dir))
    except (KeyError, OSError, TypeError, ValueError, json.JSONDecodeError) as error:
        bundle = {"contract": {"status": "invalid"}, "candidate_audit": {"audits": [], "scope": {}}}
        errors.append(str(error))
    audit = bundle["candidate_audit"]
    output = {
        "valid": not errors,
        "status": bundle["contract"].get("status"),
        "audited_response_opportunity_count": len(audit.get("audits", [])),
        "legal_candidate_counts": [len(row.get("legal_candidate_ids", []))
                                   for row in audit.get("audits", [])],
        "scope": copy.deepcopy(audit.get("scope", {})),
        "written": written,
        "errors": errors,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(_cli())
