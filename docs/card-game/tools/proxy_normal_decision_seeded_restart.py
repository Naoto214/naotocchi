#!/usr/bin/env python3
"""Replay checkpoint-117 fixed decision routes with 114/116 validation.

This materializes the adjudicated R1 transcript only, not a legality engine.
Response-contract stops preserve partial evidence without creating match records.
"""

import argparse
import copy
import json
import re
from pathlib import Path

from proxy_normal_decision_fallback_contract import (
    CONTRACT_VERSION as FALLBACK_VERSION,
    build_seed_proof,
    resolve_safe_free_development,
    validate_seeded_resolution,
)
from proxy_normal_decision_hardening import validate_pre_decision_state, validate_public_information
from proxy_record_validator import canonical_sha256


SCHEMA = "naotocchi.card_game.proxy_normal_decision_seeded_restart.v1"
PATH_ORDER = (
    "order-01-a-first", "order-01-b-first",
    "order-02-a-first", "order-02-b-first",
)
STOP_KEYS = {
    "schema", "checkpoint", "status", "path_id", "order_id", "first_player",
    "actor", "round", "phase", "last_valid_event_seq", "last_valid_state_sha256",
    "pre_decision_state", "known_candidate_ids", "missing_candidate_scope",
    "stop_reason_code", "source_references", "resume_condition", "winner",
    "counts_as_completed_match", "counts_as_independent_balance_sample",
}
_STOP_REASON_CODES = {
    "incomplete_legal_candidates",
    "opponent_private_or_future_information_required",
    "missing_stable_candidate_identifier",
    "legality_not_confirmed",
}
TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"

_INPUT_FILES = {
    "source": "proxy-fixtures-107/fixture-107-normal-decision-a-first.json",
    "protocol": "proxy-decision-protocol-107-20260918.json",
    "candidate_table": "proxy-normal-decision-candidate-table-114-20260918.json",
    "hardening": "proxy-normal-decision-hardening-114-20260918.json",
    "first_choice_plan": "proxy-normal-decision-first-choice-plan-115-20260918.json",
    "first_choice_audit": "proxy-normal-decision-first-choice-audit-115-20260918.json",
    "fallback_contract": "proxy-normal-decision-fallback-contract-116-20260918.json",
}


def load_inputs(data_dir: Path = DATA) -> dict[str, dict]:
    """Load the fixed source artifacts consumed by checkpoint 117."""
    root = Path(data_dir)
    return {
        name: json.loads((root / relative_path).read_text(encoding="utf-8"))
        for name, relative_path in _INPUT_FILES.items()
    }


def normalize_candidate_id(candidate_id: str) -> str:
    """Map the checkpoint-114 pass alias to the checkpoint-116 canonical ID."""
    if not isinstance(candidate_id, str) or not candidate_id:
        raise ValueError("candidate_id must be a non-empty string")
    return "pass" if candidate_id == "candidate-pass" else candidate_id


def _identity_set(cards):
    try:
        return {
            (card["card_copy_id"], card["card_id"], card["initial_instance_id"])
            for card in cards
        }
    except (KeyError, TypeError):
        raise ValueError("deck cards must contain card copy, card, and instance IDs") from None


def build_route_skeletons(inputs: dict) -> list[dict]:
    """Create the four 115-manifest routes, changing only the first player."""
    if not isinstance(inputs, dict):
        raise ValueError("inputs must be an object")
    try:
        source_players = {
            player["player_id"]: player["deck_order_top_to_bottom"]
            for player in inputs["source"]["input"]["players"]
        }
        plan_orders = {
            order["order_id"]: order["players"]
            for order in inputs["first_choice_plan"]["orders"]
        }
    except (KeyError, TypeError):
        raise ValueError("inputs do not contain 107 source and 115 plan manifests") from None
    if set(source_players) != {"A", "B"} or set(plan_orders) != {"order-01", "order-02"}:
        raise ValueError("source players and plan orders differ from the fixed restart inputs")

    routes = []
    for path_id in PATH_ORDER:
        order_id, first_player, _ = path_id.rsplit("-", 2)
        players = copy.deepcopy(plan_orders[order_id])
        if {player.get("player_id") for player in players} != {"A", "B"}:
            raise ValueError(f"{order_id} does not contain A and B manifests")
        for player in players:
            cards = player.get("deck_order_top_to_bottom")
            if not isinstance(cards, list) or len(cards) != 40:
                raise ValueError(f"{order_id} {player.get('player_id')} deck must contain 40 cards")
            if _identity_set(cards) != _identity_set(source_players[player["player_id"]]):
                raise ValueError(f"{order_id} {player['player_id']} changes source card identities")
        routes.append({
            "path_id": path_id,
            "order_id": order_id,
            "first_player": first_player.upper(),
            "players": players,
        })
    return routes


def _fixed_manifest_cards(path_id, order_id, first_player):
    """Return the immutable 115 card identity map for one canonical 117 route."""
    matches = [route for route in build_route_skeletons(load_inputs())
               if route["path_id"] == path_id and route["order_id"] == order_id and
               route["first_player"] == first_player]
    if len(matches) != 1:
        return None
    return {
        card["initial_instance_id"]: {
            "card_copy_id": card["card_copy_id"],
            "card_id": card["card_id"],
            "owner": player["player_id"],
        }
        for player in matches[0]["players"]
        for card in player["deck_order_top_to_bottom"]
    }


def build_initial_state(route: dict) -> dict:
    """Build the checkpoint-117 opening state from one fixed route manifest."""
    if not isinstance(route, dict) or not isinstance(route.get("players"), list):
        raise ValueError("route must contain a players list")
    players = {}
    cards = {}
    for source in route["players"]:
        if not isinstance(source, dict):
            raise ValueError("route players must be objects")
        player_id = source.get("player_id")
        deck = source.get("deck_order_top_to_bottom")
        if not isinstance(player_id, str) or not player_id:
            raise ValueError("route player_id must be a non-empty string")
        if not isinstance(deck, list) or len(deck) != 40:
            raise ValueError("route decks must contain 40 cards")
        instances = []
        for row in deck:
            if not isinstance(row, dict) or not isinstance(row.get("initial_instance_id"), str):
                raise ValueError("route cards must contain initial_instance_id")
            instance_id = row["initial_instance_id"]
            if instance_id in cards:
                raise ValueError("initial instance IDs must be unique")
            cards[instance_id] = copy.deepcopy(row)
            instances.append(instance_id)
        players[player_id] = {
            "time": 0, "growth": 20, "hand": instances[:5], "deck": instances[5:],
            "discard": [],
            "board": {"main": None, "companions": [], "partner": None,
                      "partner_stage": None, "world": None, "prepared": []},
            "reservations": [], "challenge_used": False, "person_placed": False,
            "relationship_progressed": False,
        }
    if set(players) != {"A", "B"}:
        raise ValueError("route must contain A and B players")
    return {"round": 0, "turn_player": None, "phase": "before_match",
            "players": players, "cards": cards}


def _pass_action_detail() -> dict:
    return {"candidate_id": "pass", "source_candidate_id": "candidate-pass",
            "kind": "pass", "action_type": "pass"}


def _candidate_table_card(candidate_table: dict, card_id: str) -> dict | None:
    if not isinstance(candidate_table, dict) or not isinstance(card_id, str):
        return None
    rows = candidate_table.get("cards")
    if not isinstance(rows, list):
        return None
    return next((row for row in rows if isinstance(row, dict) and row.get("card_id") == card_id), None)


def _has_114_normal_action(candidate_card: dict, action_type: str,
                           require_zero_cost: bool = False) -> bool:
    actions = candidate_card.get("actions") if isinstance(candidate_card, dict) else None
    return isinstance(actions, list) and any(
        isinstance(action, dict) and action.get("action_type") == action_type and
        action.get("timing") == "normal_action_opportunity" and
        (not require_zero_cost or action.get("base_time_cost") == 0)
        for action in actions
    )


def _placement_for_card(instance_id: str, card: dict, candidate_table: dict,
                        board: dict) -> dict | None:
    card_id = card.get("card_id")
    candidate_card = _candidate_table_card(candidate_table, card_id)
    if candidate_card is None:
        return None
    person_type = candidate_card.get("card_type")
    if person_type == "companion":
        slot_empty = isinstance(board.get("companions"), list) and len(board["companions"]) < 3
    elif person_type == "partner":
        slot_empty = board.get("partner") is None
    else:
        return None
    if not slot_empty or not _has_114_normal_action(
            candidate_card, f"place_{person_type}", require_zero_cost=True):
        return None
    return {
        "candidate_id": f"candidate-place-{person_type}-{instance_id}",
        "card_copy_id": card.get("card_copy_id"), "person_type": person_type,
        "slot_empty": True, "actual_time_cost": 0, "replacement_required": False,
        "additional_card_consumption": 0, "certain_downside": False,
        "legality": "confirmed", "unresolved_required_choice": False,
    }


def _main_birth_detail(instance_id: str, card: dict, candidate_table: dict,
                       board: dict, time: int) -> dict | None:
    card_id = card.get("card_id")
    candidate_card = _candidate_table_card(candidate_table, card_id)
    if candidate_card is None or candidate_card.get("card_type") != "main" or \
            not _has_114_normal_action(candidate_card, "play_main") or board.get("main") is not None:
        return None
    try:
        stage = int(card_id.rsplit("-", 1)[1])
    except (AttributeError, IndexError, ValueError):
        return None
    if stage != 1 or not isinstance(time, int) or isinstance(time, bool) or time < stage:
        return None
    return {
        "candidate_id": f"candidate-play-main-{instance_id}-birth", "kind": "main_birth",
        "action_type": "play_main", "card_copy_id": card.get("card_copy_id"),
        "card_id": card_id, "source_instance_id": instance_id, "payment_time": stage,
        "mode": "birth",
    }


def build_r1_safe_placement_decision(route: dict, state: dict) -> dict:
    """Resolve R1's zero-cost person placement from the complete known legal set."""
    if not isinstance(route, dict) or not isinstance(state, dict):
        raise ValueError("route and state must be objects")
    actor = state.get("turn_player") or route.get("first_player")
    players, cards = state.get("players"), state.get("cards")
    if actor not in {"A", "B"} or not isinstance(players, dict) or not isinstance(cards, dict):
        raise ValueError("state does not identify an R1 actor and cards")
    player = players.get(actor)
    if not isinstance(player, dict) or not isinstance(player.get("hand"), list):
        raise ValueError("state does not contain the actor hand")
    board = player.get("board")
    if not isinstance(board, dict) or player.get("person_placed") is not False or \
            not isinstance(board.get("companions"), list):
        raise ValueError("R1 safe placement requires an unused person-placement state")

    candidate_table = load_inputs()["candidate_table"]
    if not _is_114_pass_candidate(candidate_table, "candidate-pass"):
        raise ValueError("checkpoint 114 pass candidate is unavailable")

    placements, details = [], [_pass_action_detail()]
    for instance_id in player["hand"]:
        card = cards.get(instance_id)
        if not isinstance(card, dict):
            raise ValueError("hand instance is not present in state cards")
        placement = _placement_for_card(instance_id, card, candidate_table, board)
        if placement is not None:
            placements.append(placement)
            detail = copy.deepcopy(placement)
            detail.update({"kind": "placement", "action_type": f"place_{placement['person_type']}",
                           "card_id": card["card_id"], "source_instance_id": instance_id})
            details.append(detail)
        birth = _main_birth_detail(instance_id, card, candidate_table, board, player.get("time"))
        if birth is not None:
            details.append(birth)
    details.sort(key=lambda detail: detail["candidate_id"])
    legal_candidates = [detail["candidate_id"] for detail in details]
    context = {
        "contract_version": FALLBACK_VERSION, "order_id": route.get("order_id"),
        "actor": actor, "actor_turn_index": 1, "round": 1, "phase": "normal_action",
        "decision_kind": "normal_action", "choice_kind": "zero_cost_person_placement",
    }
    resolved = resolve_safe_free_development(placements, context, legal_candidates)
    if "error" in resolved:
        raise ValueError("; ".join(resolved.get("errors", [resolved["error"]])))
    detail_by_id = {detail["candidate_id"]: detail for detail in details}
    selected, runner_ups = resolved["selected_candidate"], resolved["runner_up_candidates"]
    resolved["legal_candidate_details"] = details
    resolved["selected_action"] = detail_by_id[selected]
    resolved["runner_up_action"] = detail_by_id[sorted(runner_ups)[0]] if runner_ups else None
    resolved["candidate_set_evidence"] = {
        "source_ref": "114.candidate_table", "state_ref": f"R1:normal_action:{actor}",
        "enumeration_rule": (
            "all empty-slot companion/partner placements and stage-1 main births in hand, plus pass; "
            "excluded reaction-only actions (not a normal-action opportunity), actions with no required "
            f"R1 target, and paid actions with insufficient time {player.get('time')}"
        ),
    }
    return resolved


def _canonical_stop_state(state: dict) -> dict:
    """Match the established snapshot convention: immutable card lookup is unhashed."""
    canonical = copy.deepcopy(state)
    canonical.pop("cards", None)
    return canonical


def _json_equal(actual, expected):
    """Compare fixed JSON evidence without Python's bool/int coercion."""
    if type(actual) is not type(expected):
        return False
    if isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(
            _json_equal(actual[key], value) for key, value in expected.items())
    if isinstance(expected, list):
        return len(actual) == len(expected) and all(
            _json_equal(left, right) for left, right in zip(actual, expected))
    return actual == expected


def _stop_state_integrity_errors(state: dict, manifest_cards: dict | None = None) -> list[str]:
    """Validate that every immutable instance appears in exactly one player zone."""
    if not isinstance(state, dict):
        return ["stop artifact pre_decision_state must be an object"]
    errors = []
    if set(state) != {"round", "turn_player", "phase", "players", "cards"}:
        errors.append("stop artifact pre_decision_state keys differ")
    players, cards = state.get("players"), state.get("cards")
    if not isinstance(players, dict) or set(players) != {"A", "B"}:
        return errors + ["stop artifact pre_decision_state players must be A and B"]
    if not isinstance(cards, dict):
        return errors + ["stop artifact pre_decision_state cards must be an object"]
    if len(cards) != 80:
        errors.append("stop artifact pre_decision_state must map 80 initial instances")
    for instance_id, card in cards.items():
        match = re.fullmatch(r"([AB]-[0-9]{3})#([1-9][0-9]*)", instance_id) \
            if isinstance(instance_id, str) else None
        if match is None or not isinstance(card, dict) or \
                card.get("initial_instance_id") != instance_id or \
                card.get("card_copy_id") != (match.group(1) if match else None) or \
                not isinstance(card.get("card_id"), str) or not card["card_id"]:
            errors.append(f"stop artifact malformed card mapping: {instance_id!r}")
    if manifest_cards is not None:
        actual_identities = {
            instance_id: {
                "card_copy_id": card.get("card_copy_id"),
                "card_id": card.get("card_id"),
                "owner": instance_id.split("-", 1)[0] if isinstance(instance_id, str) else None,
            }
            for instance_id, card in cards.items() if isinstance(card, dict)
        }
        if actual_identities != manifest_cards:
            errors.append("stop artifact cards differ from 115 manifest")
    for player_id in ("A", "B"):
        player = players.get(player_id)
        if not isinstance(player, dict):
            errors.append(f"stop artifact player {player_id} must be an object")
            continue
        # This fixed opening transcript has no reservation-producing handler.
        # Nonempty or malformed reservations are corruption, not a rules stop.
        if not isinstance(player.get("reservations"), list) or player["reservations"]:
            errors.append(f"stop artifact player {player_id} reservations must be an empty list in fixed R1 replay")
        board = player.get("board")
        if not isinstance(board, dict) or set(board) != {
                "main", "companions", "partner", "partner_stage", "world", "prepared"}:
            errors.append(f"stop artifact player {player_id} board differs")
            continue
        zone_lists = [player.get("hand"), player.get("deck"), player.get("discard"),
                      board.get("companions"), board.get("prepared")]
        if any(not isinstance(zone, list) for zone in zone_lists):
            errors.append(f"stop artifact player {player_id} zones must be lists")
            continue
        instances = [instance_id for zone in zone_lists for instance_id in zone]
        instances.extend(instance_id for instance_id in
                         (board.get("main"), board.get("partner"), board.get("world"))
                         if instance_id is not None)
        if any(not isinstance(instance_id, str) for instance_id in instances):
            errors.append(f"stop artifact player {player_id} zones must contain instance IDs")
            continue
        if len(instances) != len(set(instances)):
            errors.append(f"stop artifact player {player_id} duplicates a zone instance")
        expected = {instance_id for instance_id in cards
                    if isinstance(instance_id, str) and instance_id.startswith(f"{player_id}-")}
        unknown = set(instances) - set(cards)
        missing = expected - set(instances)
        foreign = set(instances) - expected - unknown
        if unknown:
            errors.append(f"stop artifact player {player_id} has unknown zone instances")
        if foreign:
            errors.append(f"stop artifact player {player_id} has foreign zone instances")
        if missing:
            errors.append(f"stop artifact player {player_id} is missing zone instances")
        if len(expected) != 40:
            errors.append(f"stop artifact player {player_id} must own 40 initial instances")
    return errors


def _stop_state_sha256(state: dict) -> str:
    return canonical_sha256(_canonical_stop_state(state))


def make_stop_artifact(route: dict, state: dict, stop: dict) -> dict:
    """Build the resumable, winnerless artifact for a rules-adjudication stop."""
    if not isinstance(route, dict) or not isinstance(state, dict) or not isinstance(stop, dict):
        raise ValueError("route, state, and stop must be objects")
    reason = stop.get("stop_reason_code")
    if reason not in _STOP_REASON_CODES:
        raise ValueError("stop_reason_code is not a permitted rules-adjudication stop")
    manifest_cards = _fixed_manifest_cards(
        route.get("path_id"), route.get("order_id"), route.get("first_player"))
    if manifest_cards is None:
        raise ValueError("route does not identify a fixed checkpoint-115 manifest")
    integrity_errors = _stop_state_integrity_errors(state, manifest_cards)
    if integrity_errors:
        raise ValueError("; ".join(integrity_errors))
    supplied_hash = stop.get("last_valid_state_sha256")
    if supplied_hash != _stop_state_sha256(state):
        raise ValueError("last_valid_state_sha256 does not bind the supplied pre-decision state")
    artifact = {
        "schema": SCHEMA, "checkpoint": 117, "status": "stopped_rules_adjudication",
        "path_id": route.get("path_id"), "order_id": route.get("order_id"),
        "first_player": route.get("first_player"), "actor": stop.get("actor"),
        "round": stop.get("round"), "phase": stop.get("phase"),
        "last_valid_event_seq": stop.get("last_valid_event_seq"),
        "last_valid_state_sha256": supplied_hash,
        "pre_decision_state": copy.deepcopy(state),
        "known_candidate_ids": copy.deepcopy(stop.get("known_candidate_ids")),
        "missing_candidate_scope": stop.get("missing_candidate_scope"),
        "stop_reason_code": reason, "source_references": copy.deepcopy(stop.get("source_references")),
        "resume_condition": stop.get("resume_condition"), "winner": None,
        "counts_as_completed_match": False, "counts_as_independent_balance_sample": False,
    }
    errors = validate_stop_artifact(artifact)
    if errors:
        raise ValueError("; ".join(errors))
    return artifact


def validate_stop_artifact(artifact: dict) -> list[str]:
    """Return stop-artifact errors without treating integrity failures as stops."""
    if not isinstance(artifact, dict):
        return ["stop artifact must be an object"]
    errors = []
    if set(artifact) != STOP_KEYS:
        errors.append("stop artifact keys differ")
    if artifact.get("schema") != SCHEMA or artifact.get("checkpoint") != 117 or \
            artifact.get("status") != "stopped_rules_adjudication":
        errors.append("stop artifact identity differs")
    for field in ("path_id", "order_id", "first_player", "actor", "phase",
                  "missing_candidate_scope", "resume_condition"):
        if not isinstance(artifact.get(field), str) or not artifact[field]:
            errors.append(f"stop artifact {field} must be a non-empty string")
    if artifact.get("first_player") not in {"A", "B"} or artifact.get("actor") not in {"A", "B"}:
        errors.append("stop artifact players must be A or B")
    if not isinstance(artifact.get("round"), int) or isinstance(artifact.get("round"), bool) or artifact["round"] < 1:
        errors.append("stop artifact round must be an integer >= 1")
    if not isinstance(artifact.get("last_valid_event_seq"), int) or \
            isinstance(artifact.get("last_valid_event_seq"), bool) or artifact["last_valid_event_seq"] < 0:
        errors.append("stop artifact last_valid_event_seq must be an integer >= 0")
    state_hash = artifact.get("last_valid_state_sha256")
    if not isinstance(state_hash, str) or re.fullmatch(r"[0-9a-f]{64}", state_hash) is None:
        errors.append("stop artifact last_valid_state_sha256 must be a lowercase SHA-256")
    manifest_cards = _fixed_manifest_cards(
        artifact.get("path_id"), artifact.get("order_id"), artifact.get("first_player"))
    if manifest_cards is None:
        errors.append("stop artifact does not identify a fixed checkpoint-115 manifest")
    state = artifact.get("pre_decision_state")
    errors.extend(_stop_state_integrity_errors(state, manifest_cards))
    if isinstance(state, dict) and state_hash != _stop_state_sha256(state):
        errors.append("stop artifact hash does not bind pre_decision_state")
    candidates = artifact.get("known_candidate_ids")
    if not isinstance(candidates, list) or any(not isinstance(value, str) or not value for value in candidates):
        errors.append("stop artifact known_candidate_ids must be non-empty strings")
    elif candidates != sorted(set(candidates)):
        errors.append("stop artifact known_candidate_ids must be unique and sorted")
    if artifact.get("stop_reason_code") not in _STOP_REASON_CODES:
        errors.append("stop artifact stop_reason_code is not permitted")
    references = artifact.get("source_references")
    if not isinstance(references, list) or not references or any(not isinstance(value, str) or not value for value in references):
        errors.append("stop artifact source_references must be non-empty strings")
    if artifact.get("winner") is not None:
        errors.append("stop artifact winner must be null")
    if artifact.get("counts_as_completed_match") is not False:
        errors.append("stop artifact cannot count as completed")
    if artifact.get("counts_as_independent_balance_sample") is not False:
        errors.append("stop artifact cannot count as an independent balance sample")
    return errors


def replay_routes_independently(route_specs: list[dict], inputs: dict) -> list[dict]:
    """Advance every planned route to its own next boundary without batch cancellation."""
    if not isinstance(route_specs, list) or not isinstance(inputs, dict):
        raise ValueError("route_specs must be a list and inputs must be an object")
    results = []
    for route in route_specs:
        state = build_initial_state(route)
        stop = route.get("stop") if isinstance(route, dict) else None
        if stop is not None:
            results.append(make_stop_artifact(route, state, stop))
        else:
            results.append({"path_id": route.get("path_id"), "order_id": route.get("order_id"),
                            "status": "ready_for_next_step",
                            "next_step": route.get("next_step", "r1-normal-action"), "state": state})
    return results


def _candidate_id_from_action(action):
    if not isinstance(action, dict):
        return None
    candidate_id = action.get("candidate_id")
    if isinstance(candidate_id, str) and candidate_id:
        return candidate_id
    card_copy_id = action.get("card_copy_id")
    return card_copy_id if isinstance(card_copy_id, str) and card_copy_id else None


def _action_binds_detail(action, detail, candidate_id):
    if not isinstance(action, dict) or not isinstance(detail, dict):
        return False
    if _candidate_id_from_action(action) != candidate_id:
        return False
    projected = dict(action)
    if detail.get("kind") == "card_copy":
        # Legacy mandatory selections carry the complete manifest card triple;
        # canonical details instead carry candidate_id + kind + card/instance.
        if set(projected) == {"card_copy_id", "card_id", "initial_instance_id"}:
            projected["candidate_id"] = projected.pop("card_copy_id")
            projected["kind"] = "card_copy"
        elif "card_copy_id" in projected:
            if projected.pop("card_copy_id") != candidate_id:
                return False
        if set(detail) != {"candidate_id", "kind", "card_id", "initial_instance_id"}:
            return False
    elif not {"candidate_id", "kind", "action_type"}.issubset(detail):
        return False
    return _json_equal(projected, detail)


def _is_114_pass_candidate(candidate_table, source_candidate_id):
    if not isinstance(candidate_table, dict):
        return False
    candidates = candidate_table.get("standing_candidates")
    if not isinstance(candidates, list):
        return False
    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue
        if candidate.get("candidate_id") != source_candidate_id:
            continue
        try:
            canonical_id = normalize_candidate_id(candidate["candidate_id"])
        except (KeyError, ValueError):
            continue
        if canonical_id == "pass" and candidate.get("kind") == "pass" and \
                candidate.get("action_type") == "pass":
            return True
    return False


def validate_decision_bridge(decision: dict, candidate_table: dict | None = None) -> list[str]:
    """Validate canonical IDs and their 107/114-compatible action details."""
    if not isinstance(decision, dict):
        return ["decision must be an object"]
    errors = []
    legal_candidates = decision.get("legal_candidates")
    legal_ids = []
    if not isinstance(legal_candidates, list) or not legal_candidates:
        errors.append("legal_candidates must be a non-empty list")
        legal_candidates = []
    elif any(not isinstance(candidate, str) or not candidate for candidate in legal_candidates):
        errors.append("legal_candidates must contain non-empty strings")
    else:
        legal_ids = legal_candidates
        if "candidate-pass" in legal_candidates:
            errors.append("legal_candidates must use canonical pass, not candidate-pass")
        if len(set(legal_candidates)) != len(legal_candidates):
            errors.append("legal_candidates must be unique")
        if legal_candidates != sorted(legal_candidates):
            errors.append("legal_candidates must be sorted")

    details = decision.get("legal_candidate_details")
    detail_by_id = {}
    if not isinstance(details, list):
        errors.append("legal_candidate_details must be a list")
    else:
        for index, detail in enumerate(details):
            if not isinstance(detail, dict):
                errors.append(f"legal_candidate_details[{index}] must be an object")
                continue
            candidate_id = detail.get("candidate_id")
            if not isinstance(candidate_id, str) or not candidate_id:
                errors.append(f"legal_candidate_details[{index}] candidate_id must be a non-empty string")
                continue
            if candidate_id == "candidate-pass":
                errors.append("legal_candidate_details must use canonical pass, not candidate-pass")
            if candidate_id in detail_by_id:
                errors.append("legal_candidate_details candidate_id values must be unique")
            else:
                detail_by_id[candidate_id] = detail
        if set(detail_by_id) != set(legal_ids):
            errors.append("legal_candidate_details IDs must exactly bind legal_candidates")
        pass_detail = detail_by_id.get("pass")
        if pass_detail is not None:
            for field, expected in (
                    ("source_candidate_id", "candidate-pass"), ("kind", "pass"),
                    ("action_type", "pass")):
                if pass_detail.get(field) != expected:
                    errors.append(f"pass detail {field} differs")
            source_candidate_id = pass_detail.get("source_candidate_id")
            try:
                source_canonical_id = normalize_candidate_id(source_candidate_id)
            except ValueError:
                source_canonical_id = None
                errors.append("pass detail source_candidate_id must be a non-empty string")
            if source_canonical_id != "pass":
                errors.append("pass detail source_candidate_id must normalize to pass")
            source_table = candidate_table
            if source_table is None:
                source_table = load_inputs()["candidate_table"]
            if not _is_114_pass_candidate(source_table, source_candidate_id):
                errors.append("pass detail source_candidate_id is not the 114 pass candidate")

    selected = decision.get("selected_candidate")
    if not isinstance(selected, str) or selected not in legal_ids:
        errors.append("selected_candidate must be a legal canonical candidate")
    elif not _action_binds_detail(decision.get("selected_action"), detail_by_id.get(selected), selected):
        errors.append("selected_action must bind selected_candidate detail")

    runner_ups = decision.get("runner_up_candidates")
    if not isinstance(runner_ups, list) or any(
            not isinstance(candidate, str) or not candidate for candidate in runner_ups):
        errors.append("runner_up_candidates must be a list of non-empty strings")
    elif len(set(runner_ups)) != len(runner_ups):
        errors.append("runner_up_candidates must be unique")
    elif any(candidate not in legal_ids or candidate == selected for candidate in runner_ups):
        errors.append("runner_up_candidates must be non-selected legal candidates")
    else:
        runner_up_action = decision.get("runner_up_action")
        if not runner_ups:
            if runner_up_action is not None:
                errors.append("runner_up_action must be null without runner-ups")
        else:
            representative = sorted(runner_ups)[0]
            if not _action_binds_detail(runner_up_action, detail_by_id.get(representative), representative):
                errors.append("runner_up_action must bind the sorted first runner-up detail")
    return errors


def build_mandatory_choice_decision(
        route: dict, actor: str, actor_turn_index: int, round_number: int,
        hand: list[dict]) -> dict:
    """Record the R1 egg-exchange choice with the checkpoint-116 seed rule."""
    ids = sorted(card["card_copy_id"] for card in hand)
    context = {
        "contract_version": FALLBACK_VERSION,
        "order_id": route["order_id"],
        "actor": actor,
        "actor_turn_index": actor_turn_index,
        "round": round_number,
        "phase": "egg_exchange_choice",
        "decision_kind": "mandatory_choice",
        "choice_kind": "egg_exchange_bottom",
    }
    proof = build_seed_proof(context, ids)
    details = [
        {
            "candidate_id": card["card_copy_id"],
            "kind": "card_copy",
            "card_id": card["card_id"],
            "initial_instance_id": card["initial_instance_id"],
        }
        for card in sorted(hand, key=lambda row: row["card_copy_id"])
    ]
    selected = proof["selected_candidate"]
    runner_ups = [value for value in ids if value != selected]
    selected_action = next(card for card in hand if card["card_copy_id"] == selected)
    runner_up_action = (
        next(detail for detail in details if detail["candidate_id"] == runner_ups[0])
        if runner_ups else None
    )
    return {
        "decision_kind": "mandatory_choice",
        "resolution_mode": "seeded_fallback",
        "strategic_unresolved": True,
        "reason_code": "strategic_unresolved_seeded_fallback",
        "legal_candidates": ids,
        "legal_candidate_details": details,
        "candidate_set_complete": True,
        "candidate_set_evidence": {
            "source_ref": "115.bottom_candidate_copy_ids",
            "state_ref": f"R{round_number}:egg_exchange_choice:{actor}",
            "enumeration_rule": "all card copies in hand after egg draw",
        },
        "seeded_fallback_candidates": ids,
        "seed_context": context,
        "seed_proof": proof,
        "selected_candidate": selected,
        "selected_action": selected_action,
        "runner_up_candidates": runner_ups,
        "runner_up_action": runner_up_action,
    }


PLAN_SCHEMA = "naotocchi.card_game.proxy_normal_decision_seeded_restart_plan.v1"
DEFAULT_PLAN = DATA / "proxy-normal-decision-seeded-restart-plan-117-20260919.json"
STEP_KEYS = {
    "step_id", "decision_kind", "round", "actor", "phase", "choice_kind",
    "pre_state_sha256", "legal_candidates", "legal_candidate_details",
    "resolution_mode", "selected_candidate", "runner_up_candidates", "reason_code",
    "payment", "targets", "chain", "public_information", "resolution_evidence",
}
PLAN_SCOPE = {
    "planned_route_count": 4, "independent_balance_sample_count": 0,
    "automated_game_engine": False, "complete_legality_engine": False,
    "changes_card_text_numbers_or_registration": False,
}
SOURCE_FILES = {("source_fixture" if key == "source" else key): value
                for key, value in _INPUT_FILES.items()}


def _owner_state(state, actor):
    player = state["players"][actor]
    return copy.deepcopy({key: player[key] for key in
                          ("hand", "board", "time", "growth", "reservations")})


def _public_information(state, actor):
    other = "B" if actor == "A" else "A"
    players = state["players"]
    return copy.deepcopy({
        "information_policy": "public_and_owner_known_only",
        "own_hand": players[actor]["hand"], "own_board": players[actor]["board"],
        "opponent_board": players[other]["board"],
        **{key: {who: players[who][key] for who in ("A", "B")}
           for key in ("growth", "time", "discard", "reservations")},
    })


def _zero_payment():
    return {"time": 0, "hand_to_discard": [], "prepared_to_discard": [], "deck_to_bottom": []}


def _append_replay_event(evidence, state, action_type, actor, decision_id=None,
                         source=None, payment=None):
    seq = len(evidence["events"]) + 1
    canonical = _canonical_stop_state(state)
    digest = canonical_sha256(canonical)
    event = {
        "seq": seq, "round": state["round"], "actor": actor,
        "action_type": action_type, "decision_id": decision_id,
        "source_instance_id": source, "payment": payment or _zero_payment(),
        "targets": [], "chain": None,
        "reservations_created": [], "reservations_consumed": [],
        "instance_transitions": [],
        "state_before_sha256": evidence["snapshots"][-1]["state_sha256"],
        "state_after_sha256": digest,
    }
    evidence["events"].append(event)
    evidence["snapshots"].append({"seq": seq, "state_sha256": digest, "state": canonical})


def _resolution_for_step(route, state, step, inputs):
    actor = state["turn_player"]
    if step["choice_kind"] == "egg_exchange_bottom" and state["phase"] == "egg_exchange_choice":
        return build_mandatory_choice_decision(
            route, actor, 1, 1, [state["cards"][value] for value in state["players"][actor]["hand"]])
    if step["choice_kind"] == "zero_cost_person_placement" and state["phase"] == "normal_action":
        return build_r1_safe_placement_decision(route, state)
    raise ValueError("plan step has no canonical fixed handler")


def _apply_fixed_step(route, state, step, inputs, evidence):
    if not isinstance(step, dict) or set(step) != STEP_KEYS:
        raise ValueError("plan step keys differ")
    actor = state["turn_player"]
    if not _json_equal([step["actor"], step["round"], step["phase"]],
                       [actor, state["round"], state["phase"]]):
        raise ValueError("plan step actor/round/phase differs from replay state")
    if step["pre_state_sha256"] != _stop_state_sha256(state):
        raise ValueError("plan step pre-state hash differs")
    resolved = _resolution_for_step(route, state, step, inputs)
    supplied = step["resolution_evidence"]
    errors = validate_decision_bridge(supplied, inputs["candidate_table"])
    if resolved["resolution_mode"] == "seeded_fallback":
        errors.extend(validate_seeded_resolution(supplied))
    if errors:
        raise ValueError("; ".join(errors))
    if not _json_equal(supplied, resolved):
        raise ValueError("plan resolution evidence differs from canonical resolver")
    for key in ("decision_kind", "legal_candidates", "legal_candidate_details", "resolution_mode",
                "selected_candidate", "runner_up_candidates", "reason_code"):
        if not _json_equal(step[key], resolved[key]):
            raise ValueError(f"plan {key} differs from canonical resolution")
    errors = validate_decision_bridge(resolved, inputs["candidate_table"])
    if resolved["resolution_mode"] == "seeded_fallback":
        errors.extend(validate_seeded_resolution(resolved))
    owner = _owner_state(state, actor)
    errors.extend(validate_pre_decision_state(owner))
    errors.extend(validate_public_information(step["public_information"]))
    if not _json_equal(step["public_information"], _public_information(state, actor)):
        errors.append("plan public information differs from permitted replay projection")
    if step["targets"] != [] or step["chain"] is not None:
        errors.append("fixed R1 placement/egg exchange has no target or action chain")
    if errors:
        raise ValueError("; ".join(errors))
    player = state["players"][actor]
    selected = resolved["selected_action"]
    payment = _zero_payment()
    if step["choice_kind"] == "egg_exchange_bottom":
        source = selected["initial_instance_id"]
        payment["deck_to_bottom"] = [source]
        if not _json_equal(step["payment"], payment) or source not in player["hand"]:
            raise ValueError("egg exchange payment/instance differs")
        player["hand"].remove(source)
        player["deck"].append(source)
        # All four opening boards are empty, with no eligible start trigger or
        # affordable immediate-use card with a legal target after this choice.
        # No private opponent hand is inspected to establish that boundary.
        state["phase"] = "normal_action"
        action_type = "egg_exchange_bottom"
    else:
        source = selected["source_instance_id"]
        if not _json_equal(step["payment"], payment) or source not in player["hand"] or player["person_placed"]:
            raise ValueError("safe placement payment/instance/limit differs")
        if state["cards"][source]["card_copy_id"] != selected["card_copy_id"]:
            raise ValueError("safe placement source belongs to a different copy")
        player["hand"].remove(source)
        if selected["person_type"] == "partner":
            player["board"]["partner"] = source
            player["board"]["partner_stage"] = 0
        else:
            player["board"]["companions"].append(source)
        player["person_placed"] = True
        # 02 suppresses P-cat_ceo's trigger while egg; C-chameleon's continuous
        # bonus is inactive without both worlds. Placement is complete, but
        # 06 still requires a separate response opportunity before normal play.
        state["phase"] = "post_placement_response"
        action_type = selected["action_type"]
    integrity = _stop_state_integrity_errors(state)
    if integrity:
        raise ValueError("; ".join(integrity))
    _append_replay_event(evidence, state, action_type, actor, step["step_id"], source, payment)
    decision = copy.deepcopy(resolved)
    decision.update({key: copy.deepcopy(step[key]) for key in
                     ("step_id", "round", "actor", "phase", "choice_kind", "pre_state_sha256",
                      "payment", "targets", "chain", "public_information")})
    decision["pre_decision_state"] = owner
    decision["event_seq"] = len(evidence["events"])
    evidence["decisions"].append(decision)


def _route_metrics(state, evidence, stopped):
    decisions = evidence["decisions"]
    events = evidence["events"]
    reservation_snapshots = [
        [reservation for player in row["state"]["players"].values()
         for reservation in player["reservations"]]
        for row in evidence["snapshots"]
    ]
    expired_ids = {reservation["reservation_id"] for rows in reservation_snapshots
                   for reservation in rows if reservation["status"] == "expired"}
    # The established copy/instance event convention records each reentry as
    # one old-instance -> new-instance transition; initial placement has none.
    transitions = sum(len(event["instance_transitions"]) for event in events)
    seeded = sum(row["resolution_mode"] == "seeded_fallback" for row in decisions)
    strategic = sum(row.get("strategic_unresolved", False) for row in decisions)
    uses = {kind: 0 for kind in ("main", "companion", "partner", "world", "play", "item", "event")}
    for row in decisions:
        if row["choice_kind"] == "zero_cost_person_placement":
            uses[row["selected_action"]["person_type"]] += 1
    return {
        "legal_candidate_count": sum(len(row["legal_candidates"]) for row in decisions),
        "selected_action_count": len(decisions), "use_count_by_card_type": uses,
        "unused_time": {actor: player["time"] for actor, player in state["players"].items()},
        "reservations": {
            "created": sum(len(event["reservations_created"]) for event in events),
            "consumed": sum(len(event["reservations_consumed"]) for event in events),
            "expired": len(expired_ids),
            "maximum_simultaneous": max((sum(row["status"] == "active" for row in rows)
                                         for rows in reservation_snapshots), default=0),
        },
        "reentries": transitions, "instance_transition_count": transitions,
        "growth_progression": [{"event_seq": row["seq"], **{
            actor: player["growth"] for actor, player in row["state"]["players"].items()}}
            for row in evidence["snapshots"]],
        "seeded_fallback_count": seeded, "strategic_unresolved_count": strategic,
        "independent_balance_sample_count": 0,
        "balance_exclusion_reasons": (["seeded_or_strategically_unresolved"] if seeded or strategic else [])
            + (["stopped_before_match_completion"] if stopped else []),
    }


def _replay_route(route_spec, inputs):
    if not isinstance(route_spec, dict):
        raise ValueError("route spec must be an object")
    skeleton = next((row for row in build_route_skeletons(inputs)
                     if row["path_id"] == route_spec.get("path_id")), None)
    if skeleton is None or any(not _json_equal(route_spec.get(key), value) for key, value in skeleton.items()):
        raise ValueError("route differs from fixed 115 manifest")
    state = build_initial_state(skeleton)
    evidence = {"decisions": [], "events": [], "snapshots": [{
        "seq": 0, "state_sha256": _stop_state_sha256(state), "state": _canonical_stop_state(state)}]}
    actor = skeleton["first_player"]
    state.update({"round": 1, "turn_player": actor, "phase": "egg_exchange_choice"})
    player = state["players"][actor]
    player["time"] = 1
    player["hand"].extend(player["deck"][:2])
    del player["deck"][:2]
    _append_replay_event(evidence, state, "turn_start_and_egg_draw", actor)
    steps = route_spec.get("steps")
    if not isinstance(steps, list):
        raise ValueError("route steps must be a list")
    seen = set()
    for step in steps:
        if not isinstance(step, dict) or not isinstance(step.get("step_id"), str) or not step["step_id"]:
            raise ValueError("step_id must be a non-empty stable ID")
        if step["step_id"] in seen:
            raise ValueError("duplicate step_id")
        seen.add(step["step_id"])
        _apply_fixed_step(skeleton, state, step, inputs, evidence)
    terminal = route_spec.get("terminal")
    if terminal is None:
        raise ValueError(f"plan exhausted at {skeleton['path_id']}/{state['round']}/{actor}/{state['phase']}")
    if not isinstance(terminal, dict) or terminal.get("status") != "stopped_rules_adjudication":
        # No R10/early-victory handler has been established by this fixed plan.
        # A supplied completed label must never promote a partial replay.
        raise ValueError("terminal is not supported by a canonical completion handler")
    if state["phase"] != "post_placement_response" or len(steps) != 2:
        raise ValueError("response-contract stop is not at the proved R1 boundary")
    if terminal.get("actor") != actor or terminal.get("round") != state["round"] or \
            terminal.get("phase") != state["phase"] or \
            terminal.get("last_valid_event_seq") != len(evidence["events"]):
        raise ValueError("stop directive does not bind the replay boundary")
    if terminal.get("stop_reason_code") not in {"incomplete_legal_candidates", "missing_stable_candidate_identifier"}:
        raise ValueError("response-contract stop reason differs")
    if terminal.get("known_candidate_ids") != []:
        raise ValueError("normal-only pass ID cannot be reused as a canonical response ID")
    stop = make_stop_artifact(skeleton, state, terminal)
    # The directive carries the complete artifact, including the state, to make
    # source-plan corruption detectable independently of event reconstruction.
    if not _json_equal(terminal, stop):
        raise ValueError("stop directive differs from reconstructed stop artifact")
    return {"status": stop["status"], "stop": stop,
            "metrics": _route_metrics(state, evidence, True)}, evidence


def replay_route(route_spec: dict, inputs: dict) -> dict:
    """Replay only adjudicated fixed handlers; integrity errors never become stops."""
    return _replay_route(route_spec, inputs)[0]


def validate_restart_plan(plan: dict, inputs: dict) -> list[str]:
    """Validate the fixed schema, immutable source binding, and every replay step."""
    if not isinstance(plan, dict):
        return ["restart plan must be an object"]
    errors = []
    if set(plan) != {"schema", "checkpoint", "source_files", "route_order", "routes", "scope"}:
        errors.append("restart plan keys differ")
    if plan.get("schema") != PLAN_SCHEMA or plan.get("checkpoint") != 117:
        errors.append("restart plan identity differs")
    if not _json_equal(plan.get("source_files"), SOURCE_FILES) or not _json_equal(plan.get("scope"), PLAN_SCOPE):
        errors.append("restart plan source files or scope differs")
    if plan.get("route_order") != list(PATH_ORDER):
        errors.append("restart route order differs")
    # These are fixed inputs, not caller-provided alternative rules or manifests.
    if not _json_equal(inputs, load_inputs()):
        errors.append("restart inputs differ from canonical source artifacts")
    routes = plan.get("routes")
    if not isinstance(routes, list) or any(not isinstance(row, dict) for row in routes):
        return errors + ["restart routes must be a list of objects"]
    if [row.get("path_id") for row in routes] != list(PATH_ORDER):
        errors.append("restart plan must contain exact four ordered routes")
    for route in routes:
        if set(route) != {"path_id", "order_id", "first_player", "players", "steps", "terminal"}:
            errors.append(f"{route.get('path_id')}: route keys differ")
        try:
            _replay_route(route, inputs)
        except (KeyError, TypeError, ValueError, IndexError) as error:
            errors.append(f"{route.get('path_id')}: {error}")
    return errors


def build_seeded_restart_suite(plan: dict, inputs: dict) -> dict:
    """Independently replay all four routes, keeping partial evidence out of records."""
    errors = validate_restart_plan(plan, inputs)
    if errors:
        raise ValueError("; ".join(errors))
    outcomes, replay_evidence = {}, {}
    for route in plan["routes"]:
        result, evidence = _replay_route(route, inputs)
        outcomes[route["path_id"]] = result
        replay_evidence[route["path_id"]] = evidence
    return {
        "schema": SCHEMA, "checkpoint": 117, "planned_route_count": len(outcomes),
        "completed_route_count": sum(row["status"] == "completed" for row in outcomes.values()),
        "stopped_route_count": sum(row["status"] == "stopped_rules_adjudication" for row in outcomes.values()),
        "independent_balance_sample_count": 0,
        "outcomes": outcomes, "replay_evidence": replay_evidence,
    }


def validate_seeded_restart_suite(suite: dict, plan: dict, inputs: dict) -> list[str]:
    """Reject every mismatch, including partial evidence and metric corruption."""
    errors = validate_restart_plan(plan, inputs)
    if errors:
        return errors
    if not isinstance(suite, dict):
        return ["restart suite must be an object"]
    for field in ("outcomes", "replay_evidence"):
        mapping = suite.get(field)
        if not isinstance(mapping, dict) or list(mapping) != list(PATH_ORDER):
            errors.append(f"restart suite {field} must follow exact route order")
    if errors:
        return errors
    expected = build_seeded_restart_suite(plan, inputs)
    if not _json_equal(suite, expected):
        return ["restart suite differs from canonical replay (outcome, event/hash, instance, or metrics)"]
    return []


EVALUATION_FILE = "proxy-normal-decision-seeded-restart-evaluation-117-20260919.json"
ARTIFACT_DIRECTORIES = {
    "completed_records": "proxy-matches-117",
    "decision_traces": "proxy-decision-traces-117",
    "stop_artifacts": "proxy-normal-decision-stops-117",
}


def _route_artifacts(suite):
    artifacts = {kind: {} for kind in ARTIFACT_DIRECTORIES}
    for path, outcome in suite["outcomes"].items():
        if path not in PATH_ORDER:
            raise ValueError("unexpected route path")
        if outcome["status"] == "completed":
            artifacts["completed_records"][f"match-117-{path}.json"] = outcome["record"]
            artifacts["decision_traces"][f"decision-trace-117-{path}.json"] = outcome["trace"]
        elif outcome["status"] == "stopped_rules_adjudication":
            artifacts["stop_artifacts"][f"stop-117-{path}.json"] = outcome["stop"]
        else:
            raise ValueError("unexpected route status")
    return artifacts


def build_evaluation(suite: dict) -> dict:
    """Aggregate the replay evidence, never trusting cached suite summaries."""
    routes = []
    for path, outcome in suite["outcomes"].items():
        evidence = suite["replay_evidence"][path]
        state = evidence["snapshots"][-1]["state"]
        stopped = outcome["status"] == "stopped_rules_adjudication"
        routes.append({
            "path_id": path, "status": outcome["status"],
            "winner": None if stopped else outcome["record"]["record"]["result"]["winner"],
            "round": state["round"], "actor": state["turn_player"], "phase": state["phase"],
            "stop_reason_code": outcome["stop"]["stop_reason_code"] if stopped else None,
            "event_count": len(evidence["events"]), "snapshot_count": len(evidence["snapshots"]),
            "decision_count": len(evidence["decisions"]),
            **_route_metrics(state, evidence, stopped), "unresolved_count": int(stopped),
        })
    return {
        "schema": "naotocchi.card_game.proxy_normal_decision_seeded_restart_evaluation.v1",
        "checkpoint": 117, "planned_route_count": len(routes),
        "completed_route_count": sum(row["status"] == "completed" for row in routes),
        "stopped_route_count": sum(row["status"] == "stopped_rules_adjudication" for row in routes),
        "expected_files": {kind: sorted(files) for kind, files in _route_artifacts(suite).items()},
        "strategic_unresolved_count": sum(row["strategic_unresolved_count"] for row in routes),
        "seeded_fallback_count": sum(row["seeded_fallback_count"] for row in routes),
        "unresolved_count": sum(row["unresolved_count"] for row in routes),
        "independent_balance_sample_count": 0, "routes": routes,
        "population": {"current_catalog": 452, "registered_candidates": 477,
                       "changed_card_text_numeric_or_registration_ids": 0},
        "limits": [
            "seeded or strategically unresolved routes are not independent balance samples",
            "do not infer win rate, seat advantage, activation rate, card strength, or adoption",
        ],
    }


def _materialized_files(suite, output_root):
    root = Path(output_root)
    files = {root / EVALUATION_FILE: build_evaluation(suite)}
    for kind, artifacts in _route_artifacts(suite).items():
        files.update({root / ARTIFACT_DIRECTORIES[kind] / name: value
                      for name, value in artifacts.items()})
    return files


def _manifest_errors(suite, output_root, *, allow_missing):
    errors = []
    for kind, artifacts in _route_artifacts(suite).items():
        directory = Path(output_root) / ARTIFACT_DIRECTORIES[kind]
        expected = set(artifacts)
        if directory.exists() and not directory.is_dir():
            errors.append(f"artifact directory is not a directory: {directory}")
            continue
        actual = {str(path.relative_to(directory)) for path in directory.rglob("*") if path.is_file()}
        if actual - expected:
            errors.append(f"unexpected extra artifact in {directory}: {sorted(actual - expected)}")
        if not allow_missing and expected - actual:
            errors.append(f"missing JSON in {directory}: {sorted(expected - actual)}")
        if not expected and directory.exists():
            errors.append(f"unexpected empty-manifest directory: {directory}")
    return errors


def write_seeded_restart_suite(suite: dict, output_root: Path) -> None:
    """Save only expected artifacts; refuse stale files before any write."""
    errors = _manifest_errors(suite, output_root, allow_missing=True)
    if errors:
        raise ValueError("; ".join(errors))
    for path, value in _materialized_files(suite, output_root).items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes((json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))


def validate_materialized_suite(suite: dict, output_root: Path) -> list[str]:
    """Check exact per-directory manifests and canonical JSON bytes."""
    errors = _manifest_errors(suite, output_root, allow_missing=False)
    for path, value in _materialized_files(suite, output_root).items():
        try:
            canonical = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
            if path.read_bytes() != canonical:
                errors.append(f"canonical artifact differs: {path}")
        except OSError as error:
            errors.append(f"cannot read canonical artifact {path}: {error}")
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN)
    parser.add_argument("--data-dir", type=Path, default=DATA)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)
    try:
        plan = json.loads(args.plan.read_text(encoding="utf-8"))
        inputs = load_inputs(args.data_dir)
        suite = build_seeded_restart_suite(plan, inputs)
        errors = validate_seeded_restart_suite(suite, plan, inputs)
        if args.write and not errors:
            write_seeded_restart_suite(suite, args.data_dir)
        errors.extend(validate_materialized_suite(suite, args.data_dir))
        output = {"valid": not errors, "errors": errors,
                  **{key: suite[key] for key in ("planned_route_count", "completed_route_count",
                     "stopped_route_count", "independent_balance_sample_count")},
                  "outcomes": {path: {"status": row["status"],
                      "terminal_reason": row["stop"]["stop_reason_code"]}
                      for path, row in suite["outcomes"].items()}}
    except (OSError, ValueError, TypeError, KeyError) as error:
        output = {"valid": False, "errors": [str(error)]}
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if output["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
