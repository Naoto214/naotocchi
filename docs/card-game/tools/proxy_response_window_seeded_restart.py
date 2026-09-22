#!/usr/bin/env python3
"""Resume checkpoint-117 states under the checkpoint-119 response contract."""

from __future__ import annotations

import argparse
import collections
import copy
import hashlib
import json
from pathlib import Path

import proxy_normal_decision_fallback_contract as fallback_116
import proxy_normal_decision_seeded_restart as restart_117
import proxy_response_window_contract as response_119
from proxy_normal_decision_hardening import (
    validate_pre_decision_state,
    validate_public_information,
)
from proxy_record_validator import canonical_sha256, validate_record


SCHEMA = "naotocchi.card_game.proxy_response_window_seeded_restart.v1"
PLAN_SCHEMA = "naotocchi.card_game.proxy_response_window_seeded_restart_plan.v1"
EVALUATION_SCHEMA = (
    "naotocchi.card_game.proxy_response_window_seeded_restart_evaluation.v1"
)
CONTRACT_VERSION = "naotocchi.card_game.proxy_response_window_seeded_restart.v1"
PATH_ORDER = (
    "order-01-a-first",
    "order-01-b-first",
    "order-02-a-first",
    "order-02-b-first",
)
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DEFAULT_PLAN = DATA / "proxy-response-window-seeded-restart-plan-120-20260922.json"

APPROVED_DESIGN_SHA256 = (
    "e400cd5d6f47dd3e194a5f35797bec56565d5706fe4e45118381e7ee4ef4ab44"
)
PROTECTED_STOPS = {
    "order-01-a-first": (
        "stop-117-order-01-a-first.json",
        "c1f75fed4ea40c685740d78b67885ab21092f3d125a79b044474e2cbb26c3b92",
        "79c8ba24c4749d34436e5dbc36a89aac6f59bd682d02763715f68bd33068ff80",
    ),
    "order-01-b-first": (
        "stop-117-order-01-b-first.json",
        "58b3fbce9d570b472dd6c91ee5ad1a043a2fd94864d6019deedfd3a78f3d2bcd",
        "468cb23491db85e53c2ede37c57c325b6620c82ca4cb7bbdeb6b7e7fd95de399",
    ),
    "order-02-a-first": (
        "stop-117-order-02-a-first.json",
        "a4e1b35c03da7c8927e94b59740a16bbf8b78f69d165c516cf9c3a4652f8fc5c",
        "87df61c75bb6a304b684ab00444b321cb1e1b25ee95f6a3b8353af0beae804de",
    ),
    "order-02-b-first": (
        "stop-117-order-02-b-first.json",
        "e66ae50ec54c3b568dcef30f75c9d2751346aa92a35e9748ac96dc0053b6e232",
        "d3969f6708ae9834295a88d07b2cd7f88da7889541f48175bae4715af61de240",
    ),
}
PROTECTED_STATE_SHA256 = {
    path_id: values[2] for path_id, values in PROTECTED_STOPS.items()
}
PROTECTED_RAW_SHA256 = {
    "data/proxy-normal-decision-fallback-contract-116-20260918.json":
        "8a7f41847339816d786d6c6055e290454cf8d5d84d6ccc22d6a32eb287cbfb6f",
    "data/proxy-normal-decision-seeded-restart-plan-117-20260919.json":
        "2502320582b2cf6b05731bd7d23e37e62a7437f1b4b48361fd8e591ba53583d2",
    "data/proxy-normal-decision-seeded-restart-evaluation-117-20260919.json":
        "de90629db36032ad2c6a6be0c804c60227383e5c2bdb218939dbbca2334268ff",
    "119-response-window-contract.md":
        "c79e89709c687211ae5ca4a2ba3328e285ffafcf9b7790f913ae5ceb953cba45",
    "data/proxy-response-window-contract-119-20260922.json":
        "10c9d5fd0389750749c1c2154d2d497425d2446414756002d262feebfa6c7fa7",
    "data/proxy-response-window-candidate-audit-119-20260922.json":
        "d5c854e09f3544d2e8bb159912ee6268c5a211969942f65c4422c0c8f2434d98",
    "tools/proxy_response_window_contract.py":
        "43c84e9f8768998d0ecdb489cfea53d80396102bf99bfcec197f9e2a657be1ed",
    "tools/test_proxy_response_window_contract.py":
        "c89d07c9e1c3a7f211d383ad5bbcbda1728016e305b50c4bfa9db7a2cbec60c7",
    "plans/2026-09-22-response-window-contract-design.md":
        "5109b4266b399caec837c6e38c48310845f06066adef5e79f6ee40dd0a782c1a",
    "plans/2026-09-22-response-window-contract.md":
        "9bc121d334ad335a3b0bc1fd588aa027440e254e7e57343a894671a6062f4e9f",
    "data/proxy-gap-fixtures-112/fixture-112-g-jump-quest.json":
        "809b8f6eaf2aaeff643dd9e40e3a8895b792e1a2c89ff777828583a8a9ed73e2",
    "data/proxy-gap-fixtures-112/fixture-112-m-dragon-08.json":
        "4100308b9208c085ee3f68eb4be3a28efb554812f1ca14c8df1b7ac63a44f7f3",
    "data/proxy-gap-fixtures-112/fixture-112-m-god-08.json":
        "b480cd13b621888d10c1e3b20f750cdb5aa3169c129922755883759c715c5c28",
    "data/proxy-gap-fixtures-112/fixture-112-m-mushroom-06.json":
        "0828df1cade39d100800c64e9aa5e3020613a8b6b3e43c60fbf71d5248e4a463",
    "data/proxy-gap-fixtures-112/fixture-112-m-penguin-07.json":
        "e5202c43c8b1043d6481fe69781fb0ba8ca524c9417aabcab37880a9e525a1ca",
    "data/proxy-gap-fixtures-112/fixture-112-m-sakura-05.json":
        "e47981398303d6f969ab44fc42dd8c19e59b9de4e0107c3e0bffc52c65004e34",
}
RESPONSE_FAMILIES = (
    "pass",
    "hand_quick_use",
    "triggered_ability",
    "prepared_activation",
)
FORBIDDEN_RESPONSE_IDS = {"candidate-pass", "pass"}
CERTAIN_GROWTH_BY_CARD = {"E-first-date": 5}


class ImplementationError(Exception):
    """Checkpoint-wide implementation or protected-input failure."""


class RulesAdjudicationStop(Exception):
    def __init__(self, reason_code: str, evidence: dict[str, object]):
        super().__init__(reason_code)
        self.reason_code = reason_code
        self.evidence = copy.deepcopy(evidence)


class RouteIntegrityStop(Exception):
    def __init__(
        self,
        reason_code: str,
        last_valid: dict[str, object],
        detected: dict[str, object],
    ):
        super().__init__(reason_code)
        self.reason_code = reason_code
        self.last_valid = copy.deepcopy(last_valid)
        self.detected = copy.deepcopy(detected)


RULES_STOP_REASONS = {
    "incomplete_legal_candidates",
    "opponent_private_or_future_information_required",
    "missing_stable_candidate_identifier",
    "legality_not_confirmed",
    "canonical_rule_not_defined",
    "effect_resolution_not_defined",
}
INTEGRITY_STOP_REASONS = {
    "event_hash_discontinuity",
    "instance_zone_duplicate_or_missing",
    "decision_event_reference_mismatch",
    "dangling_chain_reservation_or_target",
    "sequence_discontinuity",
}
COMPLETION_REASONS = {
    "r10_final_comparison",
    "early_victory_after_growth_100_maintenance",
}


def _load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def _canonical_json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def load_checkpoint_120_inputs(data_dir: Path = DATA) -> dict[str, object]:
    """Load every checkpoint-120 input without mutating canonical sources."""
    data_dir = Path(data_dir)
    stop_dir = data_dir / "proxy-normal-decision-stops-117"
    response_inputs = response_119.load_inputs(data_dir)
    return {
        "normal_decision_inputs_117": restart_117.load_inputs(data_dir),
        "restart_plan_117": _load_json(
            data_dir / "proxy-normal-decision-seeded-restart-plan-117-20260919.json"
        ),
        "restart_evaluation_117": _load_json(
            data_dir
            / "proxy-normal-decision-seeded-restart-evaluation-117-20260919.json"
        ),
        "stops_117": [
            _load_json(stop_dir / PROTECTED_STOPS[path_id][0])
            for path_id in PATH_ORDER
        ],
        "response_window_inputs_119": response_inputs,
        "saved_checkpoint_119": {
            "contract": _load_json(
                data_dir / "proxy-response-window-contract-119-20260922.json"
            ),
            "candidate_audit": _load_json(
                data_dir
                / "proxy-response-window-candidate-audit-119-20260922.json"
            ),
        },
    }


def game_state_sha256(state: dict[str, object]) -> str:
    """Use checkpoint 117's canonical source-state hash convention."""
    return restart_117._stop_state_sha256(state)


def continuation_state_sha256(state: dict[str, object]) -> str:
    """Hash the adapter-owned continuation object independently."""
    return canonical_sha256(state)


def _continuation_payload(continuation: dict[str, object]) -> dict[str, object]:
    return {
        key: copy.deepcopy(continuation[key])
        for key in (
            "game_state",
            "response_context",
            "activation_zone",
            "pending_triggers",
            "return_target",
        )
    }


def _build_snapshot(
    continuation: dict[str, object], event_seq: int
) -> dict[str, object]:
    return {
        "event_seq": event_seq,
        "game_state": copy.deepcopy(continuation["game_state"]),
        "continuation_state": _continuation_payload(continuation),
        "game_state_sha256": game_state_sha256(continuation["game_state"]),
        "continuation_state_sha256": continuation[
            "continuation_state_sha256"
        ],
    }


def build_resume_state(stop: dict[str, object]) -> dict[str, object]:
    """Attach a response context without rewriting or rehashing source state."""
    game_state = copy.deepcopy(stop["pre_decision_state"])
    response_context = response_119.derive_response_context(stop)
    continuation = {
        "game_state": game_state,
        "response_context": response_context,
        "activation_zone": [],
        "pending_triggers": [],
        "return_target": "normal_action_opportunity",
    }
    return {
        "source_event_seq": stop["last_valid_event_seq"],
        "last_event_seq": stop["last_valid_event_seq"],
        "source_game_state_sha256": stop["last_valid_state_sha256"],
        **continuation,
        "continuation_state_sha256": continuation_state_sha256(continuation),
    }


def enumerate_response_opportunity(
    continuation: dict[str, object],
    actor: str,
    candidate_table: dict[str, object],
) -> dict[str, object]:
    """Enumerate one actor's response candidates from current visible state."""
    context = continuation.get("response_context")
    state = continuation.get("game_state")
    if not isinstance(context, dict) or not isinstance(state, dict):
        raise ValueError("continuation response context and game state are required")
    if context.get("phase") != "response_window":
        raise ValueError("response opportunity requires response_window phase")
    if actor != context.get("priority_actor"):
        raise ValueError("response actor does not hold priority")
    players = state.get("players")
    if not isinstance(players, dict) or not isinstance(players.get(actor), dict):
        raise ValueError("response actor state is missing")

    player = players[actor]
    card_rows = response_119._card_index(candidate_table)
    legal_details = [response_119.build_response_pass_detail()]
    excluded: list[dict[str, object]] = []
    for instance_id in player.get("hand", []):
        card = state.get("cards", {}).get(instance_id)
        if not isinstance(card, dict):
            raise ValueError(f"missing hand card {instance_id}")
        card_id = card.get("card_id")
        card_row = card_rows.get(card_id)
        if card_row is None:
            raise ValueError(f"candidate table has no row for {card_id}")
        if card_id == "E-first-date":
            try:
                legal_details.append(
                    response_119._first_date_detail(
                        state, actor, instance_id, candidate_table
                    )
                )
                continue
            except ValueError:
                pass
        excluded.append(
            {
                "source_zone": "hand",
                "source_instance_id": instance_id,
                "card_id": card_id,
                "reason_code": response_119._hand_exclusion_reason(card_id, card_row),
            }
        )

    board = player.get("board")
    if not isinstance(board, dict):
        raise ValueError("response actor board is missing")
    for instance_id in board.get("companions", []):
        excluded.append(
            {
                "source_zone": "board",
                "source_instance_id": instance_id,
                "card_id": state["cards"][instance_id]["card_id"],
                "reason_code": "passive_not_activation",
            }
        )
    if board.get("partner") is not None:
        instance_id = board["partner"]
        excluded.append(
            {
                "source_zone": "board",
                "source_instance_id": instance_id,
                "card_id": state["cards"][instance_id]["card_id"],
                "reason_code": "trigger_already_missed_and_egg_ability_disabled",
            }
        )
    prepared = board.get("prepared", [])
    if prepared:
        raise ValueError("prepared response activation enumeration is not established")
    excluded.append(
        {
            "source_zone": "prepared",
            "source_instance_id": None,
            "card_id": None,
            "reason_code": "no_prepared_activation_present",
        }
    )

    legal_details.sort(key=lambda value: value["candidate_id"])
    source_references = sorted(
        {
            reference
            for detail in legal_details
            for reference in detail.get("source_references", [])
        }
    )
    return {
        "actor": actor,
        "response_context": copy.deepcopy(context),
        "legal_candidate_ids": [row["candidate_id"] for row in legal_details],
        "legal_candidate_details": copy.deepcopy(legal_details),
        "excluded_candidates": excluded,
        "inspected_information": response_119._information_snapshot(state, actor),
        "forbidden_information_used": [],
        "candidate_set_complete": True,
        "source_references": source_references,
    }


def _validate_response_opportunity(opportunity: dict[str, object]) -> None:
    if not isinstance(opportunity, dict):
        raise ValueError("response opportunity must be an object")
    ids = opportunity.get("legal_candidate_ids")
    details = opportunity.get("legal_candidate_details")
    if (
        not isinstance(ids, list)
        or not ids
        or ids != sorted(ids)
        or len(ids) != len(set(ids))
    ):
        raise ValueError("response candidate IDs must be non-empty sorted unique strings")
    if any(candidate_id in FORBIDDEN_RESPONSE_IDS for candidate_id in ids):
        raise ValueError("forbidden response pass alias")
    if not isinstance(details, list) or [row.get("candidate_id") for row in details] != ids:
        raise ValueError("response candidate details differ from IDs")
    if opportunity.get("candidate_set_complete") is not True:
        raise ValueError("response candidate set is incomplete")
    if opportunity.get("forbidden_information_used") != []:
        raise ValueError("forbidden information was used")


def _certain_growth(detail: dict[str, object]) -> int:
    card_id = detail.get("card_id")
    return CERTAIN_GROWTH_BY_CARD.get(card_id, 0)


def resolve_response_choice(
    route: dict[str, object], opportunity: dict[str, object]
) -> dict[str, object]:
    """Resolve a complete response set by unique, priority, then 119 seed."""
    _validate_response_opportunity(opportunity)
    ids = opportunity["legal_candidate_ids"]
    details = opportunity["legal_candidate_details"]
    detail_by_id = {row["candidate_id"]: row for row in details}
    comparison_evidence = None
    seed_context = None
    seed_proof = None

    if len(ids) == 1:
        resolution_mode = "response_unique"
        selected = ids[0]
        reason_code = "only_legal_response"
    else:
        growth = {candidate_id: _certain_growth(detail_by_id[candidate_id])
                  for candidate_id in ids}
        best = max(growth.values())
        leaders = [candidate_id for candidate_id in ids if growth[candidate_id] == best]
        if len(leaders) == 1:
            resolution_mode = "priority_unique"
            selected = leaders[0]
            reason_code = "certain_growth_difference"
            comparison_evidence = {
                "criterion": "maximize_certain_growth_difference",
                "selected_value": best,
                "runner_up_value": max(
                    value for candidate_id, value in growth.items()
                    if candidate_id != selected
                ),
                "later_criteria_inspected": [],
            }
        else:
            resolution_mode = "response_seeded_fallback"
            context = opportunity["response_context"]
            seed_context = {
                "contract_version": response_119.CONTRACT_VERSION,
                "order_id": route["order_id"],
                "actor": opportunity["actor"],
                "actor_turn_index": route["actor_turn_index"],
                "round": route["round"],
                "origin_event_seq": context["origin_event_seq"],
                "response_opportunity_index": context["response_opportunity_index"],
                "phase": context["phase"],
                "decision_kind": context["decision_kind"],
                "choice_kind": context["choice_kind"],
            }
            seed_proof = response_119.build_response_seed_proof(seed_context, ids)
            selected = seed_proof["selected_candidate"]
            reason_code = "strategic_unresolved_response_seeded_fallback"

    return {
        "decision_kind": "response_action",
        "choice_kind": "reaction_or_pass",
        "actor": opportunity["actor"],
        "phase": "response_window",
        "response_opportunity_index": opportunity["response_context"][
            "response_opportunity_index"
        ],
        "legal_candidate_ids": copy.deepcopy(ids),
        "legal_candidate_details": copy.deepcopy(details),
        "candidate_set_evidence": copy.deepcopy(opportunity),
        "resolution_mode": resolution_mode,
        "reason_code": reason_code,
        "selected_candidate": selected,
        "selected_action": copy.deepcopy(detail_by_id[selected]),
        "runner_up_candidates": sorted(
            candidate_id for candidate_id in ids if candidate_id != selected
        ),
        "comparison_evidence": comparison_evidence,
        "seed_context": seed_context,
        "seed_proof": seed_proof,
    }


def _response_transition_context(
    continuation: dict[str, object]
) -> dict[str, object]:
    context = continuation["response_context"]
    return {
        "window_status": "open",
        "window_kind": context["window_kind"],
        "turn_player": context["turn_player"],
        "priority_actor": context["priority_actor"],
        "chain_status": context["chain_status"],
        "chain_links": copy.deepcopy(context["chain_links"]),
        "consecutive_passes": context["consecutive_passes"],
        "response_opportunity_index": context["response_opportunity_index"],
        "pending_triggers": copy.deepcopy(continuation["pending_triggers"]),
        "return_to": None,
        "resolution_order": [],
    }


def _apply_transition_result(
    continuation: dict[str, object], transitioned: dict[str, object]
) -> None:
    context = continuation["response_context"]
    for key in (
        "priority_actor",
        "chain_status",
        "chain_links",
        "consecutive_passes",
        "response_opportunity_index",
    ):
        context[key] = copy.deepcopy(transitioned[key])
    continuation["pending_triggers"] = copy.deepcopy(transitioned["pending_triggers"])
    continuation["return_target"] = transitioned.get("return_to")


def apply_response_pass(
    continuation: dict[str, object], decision: dict[str, object]
) -> tuple[dict[str, object], dict[str, object]]:
    """Apply canonical response-pass without changing game state."""
    if decision.get("selected_candidate") != response_119.RESPONSE_PASS_ID:
        raise ValueError("response pass decision must select response-pass")
    if decision.get("selected_action", {}).get("action_type") != "response_pass":
        raise ValueError("response pass action detail differs")
    before = copy.deepcopy(continuation)
    transition_before = _response_transition_context(before)
    action = {"kind": "response_pass", "actor": decision["actor"]}
    transitioned = response_119.transition_response_window(transition_before, action)
    transition_errors = response_119.validate_response_transition(
        transition_before, action, transitioned
    )
    if transition_errors:
        raise ValueError("; ".join(transition_errors))

    after = copy.deepcopy(before)
    _apply_transition_result(after, transitioned)
    if after["return_target"] == "normal_action_opportunity":
        after["game_state"]["phase"] = "normal_action"
    after["last_event_seq"] = before.get("last_event_seq", before["source_event_seq"]) + 1
    after["continuation_state_sha256"] = continuation_state_sha256(
        _continuation_payload(after)
    )
    game_hash_before = game_state_sha256(before["game_state"])
    game_hash_after = game_state_sha256(after["game_state"])
    event = {
        "seq": after["last_event_seq"],
        "action_type": "response_pass",
        "actor": decision["actor"],
        "selected_candidate": response_119.RESPONSE_PASS_ID,
        "game_state_before_sha256": game_hash_before,
        "game_state_after_sha256": game_hash_after,
        "continuation_state_before_sha256": before["continuation_state_sha256"],
        "continuation_state_after_sha256": after["continuation_state_sha256"],
        "result": {
            "priority_actor": after["response_context"]["priority_actor"],
            "consecutive_passes": after["response_context"]["consecutive_passes"],
            "chain_status": after["response_context"]["chain_status"],
            "return_target": after["return_target"],
        },
    }
    event["_snapshot_after"] = _build_snapshot(after, after["last_event_seq"])
    return after, event


def activate_response_candidate(
    continuation: dict[str, object], decision: dict[str, object]
) -> tuple[dict[str, object], dict[str, object]]:
    """Pay for and place one validated response candidate on the chain."""
    before = copy.deepcopy(continuation)
    context = before.get("response_context")
    action = decision.get("selected_action")
    if not isinstance(context, dict) or not isinstance(action, dict):
        raise ValueError("response activation requires context and selected action")
    actor = decision.get("actor")
    if actor != context.get("priority_actor"):
        raise ValueError("response activation actor does not hold priority")
    if action.get("action_type") != "use_event":
        raise ValueError("selected response is not an event activation")
    source_id = action.get("source_instance_id")
    targets = action.get("target_instance_ids")
    if not isinstance(source_id, str) or not isinstance(targets, list) or len(targets) != 1:
        raise ValueError("response activation source or target differs")
    state = before["game_state"]
    player = state["players"].get(actor)
    card = state["cards"].get(source_id)
    if not isinstance(player, dict) or source_id not in player.get("hand", []):
        raise ValueError("response activation source is not in actor hand")
    if card != {
        "card_copy_id": action.get("card_copy_id"),
        "initial_instance_id": source_id,
        "card_id": action.get("card_id"),
    }:
        raise ValueError("response activation source identity differs")
    target_id = targets[0]
    if player.get("board", {}).get("partner") != target_id:
        raise ValueError("response activation target is not current partner")
    cost = action.get("base_time_cost")
    if type(cost) is not int or cost < 0 or player.get("time", -1) < cost:
        raise ValueError("response activation payment is invalid")

    after = copy.deepcopy(before)
    after_player = after["game_state"]["players"][actor]
    after_player["time"] -= cost
    after_player["hand"].remove(source_id)
    event_seq = before.get("last_event_seq", before["source_event_seq"]) + 1
    link_id = f"response-link-{event_seq}-{source_id}"
    link = {
        "link_id": link_id,
        "action_type": action["action_type"],
        "actor": actor,
        "card_id": action["card_id"],
        "card_copy_id": action["card_copy_id"],
        "source_instance_id": source_id,
        "target_instance_ids": copy.deepcopy(targets),
        "payment": {"time": cost},
        "source_references": copy.deepcopy(action.get("source_references", [])),
    }
    after["activation_zone"].append(link)
    transition_before = _response_transition_context(before)
    transition_action = {"kind": "activate", "actor": actor, "link_id": link_id}
    transitioned = response_119.transition_response_window(
        transition_before, transition_action
    )
    transition_errors = response_119.validate_response_transition(
        transition_before, transition_action, transitioned
    )
    if transition_errors:
        raise ValueError("; ".join(transition_errors))
    _apply_transition_result(after, transitioned)
    after["last_event_seq"] = event_seq
    after["continuation_state_sha256"] = continuation_state_sha256(
        _continuation_payload(after)
    )
    event = {
        "seq": event_seq,
        "action_type": "activate_response",
        "actor": actor,
        "source_instance_id": source_id,
        "payment": {"time": cost},
        "target_instance_ids": copy.deepcopy(targets),
        "chain_link_id": link_id,
        "game_state_before_sha256": game_state_sha256(before["game_state"]),
        "game_state_after_sha256": game_state_sha256(after["game_state"]),
        "continuation_state_before_sha256": before["continuation_state_sha256"],
        "continuation_state_after_sha256": after["continuation_state_sha256"],
        "result": {
            "remaining_time": after_player["time"],
            "priority_actor": after["response_context"]["priority_actor"],
            "chain_status": after["response_context"]["chain_status"],
        },
    }
    event["_snapshot_after"] = _build_snapshot(after, event_seq)
    return after, event


def _draw_top_card(game_state: dict[str, object], actor: str) -> list[str]:
    player = game_state["players"][actor]
    if not player["deck"]:
        return []
    instance_id = player["deck"].pop(0)
    player["hand"].append(instance_id)
    return [instance_id]


def resolve_first_date(
    continuation: dict[str, object],
    link: dict[str, object],
    inputs: dict[str, object],
) -> dict[str, object]:
    """Resolve E-first-date using only its canonical text and target rules."""
    del inputs
    if (link.get("action_type"), link.get("card_id")) != (
        "use_event",
        "E-first-date",
    ):
        raise ValueError("first-date handler received a different action")
    actor = link.get("actor")
    source_id = link.get("source_instance_id")
    targets = link.get("target_instance_ids")
    if actor not in ("A", "B") or not isinstance(targets, list) or len(targets) != 1:
        raise ValueError("first-date link actor or target differs")
    matching = [
        row for row in continuation["activation_zone"]
        if row.get("link_id") == link.get("link_id")
    ]
    if len(matching) != 1 or matching[0].get("source_instance_id") != source_id:
        raise ValueError("first-date activation-zone identity differs")

    state = continuation["game_state"]
    player = state["players"][actor]
    target_id = targets[0]
    current_target = player["board"].get("partner")
    stage = player["board"].get("partner_stage")
    target_card = state["cards"].get(target_id)
    legal = (
        current_target == target_id
        and stage == 0
        and isinstance(target_card, dict)
        and target_card.get("initial_instance_id") == target_id
    )
    drawn: list[str] = []
    if legal:
        drawn = _draw_top_card(state, actor)
        player["growth"] += 5

    continuation["activation_zone"].remove(matching[0])
    player["discard"].append(source_id)
    return {
        "target_recheck": {
            "target_instance_id": target_id,
            "current_partner_instance_id": current_target,
            "relationship_stage": stage,
            "legal": legal,
        },
        "effect_applied": legal,
        "drawn_instance_ids": drawn,
        "growth_added": 5 if legal else 0,
        "source_destination": "discard",
    }


ACTION_HANDLERS = {
    ("use_event", "E-first-date"): resolve_first_date,
}


def resolve_chain(
    continuation: dict[str, object], inputs: dict[str, object]
) -> tuple[dict[str, object], list[dict[str, object]]]:
    """Resolve a closed chain in reverse link order through the handler registry."""
    before_all = copy.deepcopy(continuation)
    context = before_all.get("response_context")
    if not isinstance(context, dict) or context.get("chain_status") != "resolving":
        raise ValueError("chain must be closed and resolving")
    resolution_order = list(reversed(context.get("chain_links", [])))
    after = copy.deepcopy(before_all)
    events: list[dict[str, object]] = []
    for link_id in resolution_order:
        matches = [
            row for row in after["activation_zone"]
            if row.get("link_id") == link_id
        ]
        if len(matches) != 1:
            raise ValueError(f"chain link has no unique activation: {link_id}")
        link = copy.deepcopy(matches[0])
        handler = ACTION_HANDLERS.get((link.get("action_type"), link.get("card_id")))
        if handler is None:
            raise ValueError(
                f"unimplemented action handler: "
                f"{(link.get('action_type'), link.get('card_id'))!r}"
            )
        game_before = game_state_sha256(after["game_state"])
        continuation_before = after["continuation_state_sha256"]
        result = handler(after, link, inputs)
        after["response_context"]["chain_links"].remove(link_id)
        event_seq = after.get("last_event_seq", after["source_event_seq"]) + 1
        after["last_event_seq"] = event_seq
        if not after["response_context"]["chain_links"]:
            after["response_context"]["chain_status"] = "empty"
            after["response_context"]["consecutive_passes"] = 0
            if after["pending_triggers"]:
                after["return_target"] = None
            else:
                after["return_target"] = "normal_action_opportunity"
                after["game_state"]["phase"] = "normal_action"
        after["continuation_state_sha256"] = continuation_state_sha256(
            _continuation_payload(after)
        )
        event = {
                "seq": event_seq,
                "action_type": "resolve_event",
                "actor": link["actor"],
                "source_instance_id": link["source_instance_id"],
                "payment": copy.deepcopy(link["payment"]),
                "target_instance_ids": copy.deepcopy(link["target_instance_ids"]),
                "chain_link_id": link_id,
                "game_state_before_sha256": game_before,
                "game_state_after_sha256": game_state_sha256(after["game_state"]),
                "continuation_state_before_sha256": continuation_before,
                "continuation_state_after_sha256": after[
                    "continuation_state_sha256"
                ],
                "result": result,
            }
        event["_snapshot_after"] = _build_snapshot(after, event_seq)
        events.append(event)
    return after, events


def verify_protected_sources(
    inputs: dict[str, object], data_dir: Path = DATA
) -> list[str]:
    """Return global input errors before any checkpoint-120 route resumes."""
    data_dir = Path(data_dir)
    card_game_root = data_dir.parent
    errors: list[str] = []

    design_path = card_game_root / "plans/2026-09-22-response-window-seeded-restart-design.md"
    if not design_path.is_file():
        errors.append("approved checkpoint 120 design is missing")
    elif hashlib.sha256(design_path.read_bytes()).hexdigest() != APPROVED_DESIGN_SHA256:
        errors.append("approved checkpoint 120 design hash differs")

    stop_dir = data_dir / "proxy-normal-decision-stops-117"
    for path_id, (filename, expected_raw, expected_state) in PROTECTED_STOPS.items():
        path = stop_dir / filename
        if not path.is_file():
            errors.append(f"protected source missing: {filename}")
            continue
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected_raw:
            errors.append(f"protected source hash differs: {filename}")
        try:
            stop = _load_json(path)
            if stop.get("path_id") != path_id:
                errors.append(f"protected stop path differs: {filename}")
            if stop.get("last_valid_event_seq") != 3:
                errors.append(f"protected stop event seq differs: {filename}")
            if stop.get("phase") != "post_placement_response":
                errors.append(f"protected stop phase differs: {filename}")
            if game_state_sha256(stop["pre_decision_state"]) != expected_state:
                errors.append(f"protected stop state hash differs: {filename}")
            if stop.get("last_valid_state_sha256") != expected_state:
                errors.append(f"protected stop stored state hash differs: {filename}")
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
            errors.append(f"protected stop is invalid: {filename}: {error}")

    for relative_path, expected in PROTECTED_RAW_SHA256.items():
        path = card_game_root / relative_path
        if not path.is_file():
            errors.append(f"protected source missing: {relative_path}")
        elif hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            errors.append(f"protected source hash differs: {relative_path}")

    try:
        regenerated_117 = restart_117.build_seeded_restart_suite(
            inputs["restart_plan_117"], inputs["normal_decision_inputs_117"]
        )
        saved_stops = inputs["stops_117"]
        if not isinstance(saved_stops, list) or len(saved_stops) != len(PATH_ORDER):
            errors.append("protected stop inputs differ")
        else:
            for stop in saved_stops:
                path_id = stop["path_id"]
                if regenerated_117["outcomes"][path_id]["stop"] != stop:
                    errors.append(f"checkpoint 117 regeneration differs: {path_id}")
    except (KeyError, TypeError, ValueError, IndexError) as error:
        errors.append(f"checkpoint 117 regeneration failed: {error}")

    try:
        regenerated_119 = response_119.build_checkpoint_119(
            inputs["response_window_inputs_119"]
        )
        saved_119 = inputs["saved_checkpoint_119"]
        if regenerated_119 != saved_119:
            errors.append("checkpoint 119 regeneration differs")
        else:
            paths = {
                "contract": data_dir / "proxy-response-window-contract-119-20260922.json",
                "candidate_audit": (
                    data_dir
                    / "proxy-response-window-candidate-audit-119-20260922.json"
                ),
            }
            for key, path in paths.items():
                if path.read_bytes() != _canonical_json_bytes(regenerated_119[key]):
                    errors.append(f"checkpoint 119 canonical bytes differ: {path.name}")
    except (KeyError, TypeError, ValueError, IndexError, OSError) as error:
        errors.append(f"checkpoint 119 regeneration failed: {error}")

    return errors


def _normal_action_opportunity(
    continuation: dict[str, object], inputs: dict[str, object]
) -> dict[str, object]:
    state = continuation["game_state"]
    actor = state["turn_player"]
    owner_state = restart_117._owner_state(state, actor)
    public_information = restart_117._public_information(state, actor)
    validation_errors = (
        validate_pre_decision_state(owner_state)
        + validate_public_information(public_information)
    )
    if validation_errors:
        raise ImplementationError("; ".join(validation_errors))
    table = inputs["response_window_inputs_119"]["candidate_table"]
    return {
        "decision_kind": "normal_action",
        "choice_kind": "normal_action",
        "actor": actor,
        "phase": "normal_action",
        "legal_candidate_ids": ["pass"],
        "legal_candidate_details": [
            {
                "candidate_id": "pass",
                "action_type": "pass",
                "card_id": None,
                "base_time_cost": 0,
            }
        ],
        "candidate_set_complete": False,
        "candidate_set_evidence": {
            "source_ref": "proxy-normal-decision-candidate-table-114-20260918.json",
            "state_ref": (
                f"R{state['round']}:{actor}:normal_action_after_response"
            ),
            "enumeration_rule": (
                "checkpoint 114 explicitly marks automatic complete legality false"
            ),
        },
        "missing_candidate_scope": (
            "all normal actions from the current hand, board, reservations, "
            "challenge, and relationship state require a complete legality audit"
        ),
        "inspected_information": public_information,
        "forbidden_information_used": [],
        "source_references": [
            "107-normal-decision-protocol.md",
            "114-normal-decision-protocol-hardening.md",
            table["schema"],
        ],
    }


def enumerate_decision_opportunity(
    continuation: dict[str, object], inputs: dict[str, object]
) -> dict[str, object]:
    """Dispatch enumeration by the current canonical decision kind."""
    state = continuation.get("game_state")
    context = continuation.get("response_context")
    if not isinstance(state, dict) or not isinstance(context, dict):
        raise ImplementationError("continuation state is invalid")
    if state.get("phase") == "normal_action":
        return _normal_action_opportunity(continuation, inputs)
    if context.get("phase") == "response_window" and context.get(
        "chain_status"
    ) in {"empty", "building"}:
        opportunity = enumerate_response_opportunity(
            continuation,
            context["priority_actor"],
            inputs["response_window_inputs_119"]["candidate_table"],
        )
        opportunity.update(
            {
                "decision_kind": "response_action",
                "choice_kind": "reaction_or_pass",
                "phase": "response_window",
            }
        )
        return opportunity
    raise ImplementationError(
        f"no enumerator for phase={state.get('phase')!r} "
        f"chain_status={context.get('chain_status')!r}"
    )


def _resolve_116_seeded_decision(
    opportunity: dict[str, object], route_context: dict[str, object]
) -> dict[str, object]:
    ids = opportunity.get("legal_candidate_ids")
    details = opportunity.get("legal_candidate_details")
    if (
        not isinstance(ids, list)
        or len(ids) < 2
        or ids != sorted(ids)
        or len(ids) != len(set(ids))
    ):
        raise ValueError("116 seeded choice requires two or more sorted candidates")
    if not isinstance(details, list) or [row.get("candidate_id") for row in details] != ids:
        raise ValueError("116 candidate details differ from IDs")
    kind = opportunity["decision_kind"]
    context = {
        "contract_version": fallback_116.CONTRACT_VERSION,
        "order_id": route_context["order_id"],
        "actor": opportunity["actor"],
        "actor_turn_index": route_context["actor_turn_index"],
        "round": route_context["round"],
        "phase": opportunity["phase"],
        "decision_kind": kind,
        "choice_kind": opportunity["choice_kind"],
    }
    proof = fallback_116.build_seed_proof(context, ids)
    selected = proof["selected_candidate"]
    detail_by_id = {row["candidate_id"]: row for row in details}
    runner_ups = [candidate_id for candidate_id in ids if candidate_id != selected]
    return {
        "decision_kind": kind,
        "resolution_mode": "seeded_fallback",
        "strategic_unresolved": True,
        "reason_code": "strategic_unresolved_seeded_fallback",
        "legal_candidates": copy.deepcopy(ids),
        "legal_candidate_details": copy.deepcopy(details),
        "candidate_set_complete": True,
        "candidate_set_evidence": copy.deepcopy(
            opportunity["candidate_set_evidence"]
        ),
        "seeded_fallback_candidates": copy.deepcopy(ids),
        "seed_context": context,
        "seed_proof": proof,
        "selected_candidate": selected,
        "selected_action": copy.deepcopy(detail_by_id[selected]),
        "runner_up_candidates": runner_ups,
        "runner_up_action": copy.deepcopy(detail_by_id[runner_ups[0]]),
    }


def resolve_normal_decision(
    opportunity: dict[str, object], route_context: dict[str, object]
) -> dict[str, object]:
    return _resolve_116_seeded_decision(opportunity, route_context)


def resolve_mandatory_decision(
    opportunity: dict[str, object], route_context: dict[str, object]
) -> dict[str, object]:
    return _resolve_116_seeded_decision(opportunity, route_context)


def resolve_response_decision(
    opportunity: dict[str, object], route_context: dict[str, object]
) -> dict[str, object]:
    return resolve_response_choice(route_context, opportunity)


DECISION_RESOLVERS = {
    "normal_action": resolve_normal_decision,
    "mandatory_choice": resolve_mandatory_decision,
    "response_action": resolve_response_decision,
}


def resolve_decision(
    opportunity: dict[str, object], route_context: dict[str, object]
) -> dict[str, object]:
    if opportunity.get("forbidden_information_used") != []:
        raise ValueError("forbidden information was used")
    if opportunity.get("candidate_set_complete") is not True:
        raise ValueError("candidate set is incomplete")
    kind = opportunity.get("decision_kind")
    if kind is None and isinstance(opportunity.get("response_context"), dict):
        kind = opportunity["response_context"].get("decision_kind")
    resolver = DECISION_RESOLVERS.get(kind)
    if resolver is None:
        raise ImplementationError(f"unimplemented decision resolver: {kind!r}")
    return resolver(opportunity, route_context)


def apply_decision(
    continuation: dict[str, object],
    decision: dict[str, object],
    inputs: dict[str, object],
) -> tuple[dict[str, object], list[dict[str, object]]]:
    kind = decision.get("decision_kind")
    action = decision.get("selected_action")
    if not isinstance(action, dict):
        raise ImplementationError("selected action is missing")
    if kind == "response_action":
        if action.get("action_type") == "response_pass":
            after, event = apply_response_pass(continuation, decision)
            events = [event]
            if after["response_context"]["chain_status"] == "resolving":
                after, resolution_events = resolve_chain(after, inputs)
                events.extend(resolution_events)
            return after, events
        if (action.get("action_type"), action.get("card_id")) in ACTION_HANDLERS:
            after, event = activate_response_candidate(continuation, decision)
            return after, [event]
    handler_key = (action.get("action_type"), action.get("card_id"))
    raise ImplementationError(f"unimplemented action handler: {handler_key!r}")


def _plan_step(
    path_id: str,
    index: int,
    before: dict[str, object],
    opportunity: dict[str, object],
    decision: dict[str, object],
    after: dict[str, object],
    events: list[dict[str, object]],
) -> dict[str, object]:
    action = decision["selected_action"]
    decision_id = f"decision-120-{path_id}-{index:03d}"
    recorded_decision = copy.deepcopy(decision)
    recorded_decision.update({
        "decision_id": decision_id,
        "decision_seq": index,
        "event_seq": events[0]["seq"],
        "round": before["game_state"]["round"],
        "pre_game_state_sha256": game_state_sha256(before["game_state"]),
        "pre_continuation_state_sha256": before["continuation_state_sha256"],
        "candidate_set_complete": opportunity["candidate_set_complete"],
        "candidate_set_evidence": copy.deepcopy(
            recorded_decision.get("candidate_set_evidence")
            or opportunity.get("candidate_set_evidence")
            or opportunity.get("response_context")
            or {}
        ),
        "runner_up_actions": [
            copy.deepcopy(candidate)
            for candidate in opportunity["legal_candidate_details"]
            if candidate.get("candidate_id") in decision["runner_up_candidates"]
        ],
        "payment": {"time": action.get("base_time_cost", 0)},
        "targets": copy.deepcopy(action.get("target_instance_ids", [])),
        "chain": copy.deepcopy(before["response_context"]["chain_links"]),
        "public_information": copy.deepcopy(
            opportunity["inspected_information"]
        ),
        "forbidden_information_used": copy.deepcopy(
            opportunity["forbidden_information_used"]
        ),
        "source_references": copy.deepcopy(
            opportunity.get("source_references", [])
        ),
    })
    serialized_events = []
    snapshots_after_events = []
    for event_index, event in enumerate(events):
        serialized = copy.deepcopy(event)
        snapshot = serialized.pop("_snapshot_after")
        serialized["event_id"] = (
            f"event-120-{path_id}-{serialized['seq']:03d}"
        )
        serialized["decision_id"] = decision_id if event_index == 0 else None
        serialized.setdefault("source_instance_id", None)
        serialized.setdefault("payment", {"time": 0})
        serialized.setdefault("target_instance_ids", [])
        serialized["chain"] = {
            "link_id": serialized.get("chain_link_id"),
        } if serialized.get("chain_link_id") is not None else None
        serialized["reservation_transitions"] = []
        instance_transitions = []
        if serialized["action_type"] == "activate_response":
            instance_transitions.append({
                "instance_id": serialized["source_instance_id"],
                "from": "hand",
                "to": "activation_zone",
            })
        elif serialized["action_type"] == "resolve_event":
            for instance_id in serialized["result"].get(
                "drawn_instance_ids", []
            ):
                instance_transitions.append({
                    "instance_id": instance_id,
                    "from": "deck",
                    "to": "hand",
                })
            instance_transitions.append({
                "instance_id": serialized["source_instance_id"],
                "from": "activation_zone",
                "to": serialized["result"]["source_destination"],
            })
        serialized["instance_transitions"] = instance_transitions
        serialized_events.append(serialized)
        snapshots_after_events.append(snapshot)
    return {
        "step_id": f"120-{path_id}-decision-{index:03d}",
        "pre_game_state_sha256": game_state_sha256(before["game_state"]),
        "pre_continuation_state_sha256": before["continuation_state_sha256"],
        "phase": opportunity["phase"],
        "actor": opportunity["actor"],
        "round": before["game_state"]["round"],
        "decision_kind": opportunity["decision_kind"],
        "choice_kind": opportunity["choice_kind"],
        "response_opportunity_index": (
            opportunity["response_context"]["response_opportunity_index"]
            if opportunity["decision_kind"] == "response_action"
            else None
        ),
        "legal_candidate_ids": copy.deepcopy(
            opportunity["legal_candidate_ids"]
        ),
        "legal_candidate_details": copy.deepcopy(
            opportunity["legal_candidate_details"]
        ),
        "candidate_set_complete": opportunity["candidate_set_complete"],
        "resolution_mode": decision["resolution_mode"],
        "seed_context": copy.deepcopy(decision.get("seed_context")),
        "seed_proof": copy.deepcopy(decision.get("seed_proof")),
        "selected_candidate": decision["selected_candidate"],
        "runner_up_candidates": copy.deepcopy(
            decision["runner_up_candidates"]
        ),
        "reason_code": decision["reason_code"],
        "payment": {"time": action.get("base_time_cost", 0)},
        "targets": copy.deepcopy(action.get("target_instance_ids", [])),
        "chain": copy.deepcopy(before["response_context"]["chain_links"]),
        "public_information": copy.deepcopy(
            opportunity["inspected_information"]
        ),
        "source_references": copy.deepcopy(
            opportunity.get("source_references", [])
        ),
        "expected_transition": {
            "last_event_seq": after["last_event_seq"],
            "game_state_sha256": game_state_sha256(after["game_state"]),
            "continuation_state_sha256": after["continuation_state_sha256"],
            "phase": after["game_state"]["phase"],
            "return_target": after["return_target"],
        },
        "decision": recorded_decision,
        "events": serialized_events,
        "snapshot_before": _build_snapshot(
            before, before.get("last_event_seq", before["source_event_seq"])
        ),
        "snapshots_after_events": snapshots_after_events,
    }


def _rules_terminal(
    continuation: dict[str, object], opportunity: dict[str, object]
) -> dict[str, object]:
    state = continuation["game_state"]
    return {
        "status": "stopped_rules_adjudication",
        "reason_code": "incomplete_legal_candidates",
        "last_valid_event_seq": continuation["last_event_seq"],
        "game_state": copy.deepcopy(state),
        "game_state_sha256": game_state_sha256(state),
        "continuation_state": _continuation_payload(continuation),
        "continuation_state_sha256": continuation["continuation_state_sha256"],
        "actor": opportunity["actor"],
        "round": state["round"],
        "phase": opportunity["phase"],
        "decision_kind": opportunity["decision_kind"],
        "choice_kind": opportunity["choice_kind"],
        "known_candidate_ids": copy.deepcopy(
            opportunity["legal_candidate_ids"]
        ),
        "known_candidate_details": copy.deepcopy(
            opportunity["legal_candidate_details"]
        ),
        "missing_candidate_scope": opportunity["missing_candidate_scope"],
        "inspected_information": copy.deepcopy(
            opportunity["inspected_information"]
        ),
        "forbidden_information_used": [],
        "source_references": copy.deepcopy(opportunity["source_references"]),
        "resume_condition": (
            "complete canonical normal-action enumeration and stable candidate IDs"
        ),
        "winner": None,
        "counts_as_completed_match": False,
        "counts_as_independent_balance_sample": False,
    }


def _build_route_plan(
    stop: dict[str, object], inputs: dict[str, object]
) -> dict[str, object]:
    continuation = build_resume_state(stop)
    steps: list[dict[str, object]] = []
    terminal = None
    route_context = {
        "path_id": stop["path_id"],
        "order_id": stop["order_id"],
        "actor_turn_index": 1,
        "round": stop["round"],
    }
    for index in range(1, 9):
        opportunity = enumerate_decision_opportunity(continuation, inputs)
        if opportunity.get("candidate_set_complete") is not True:
            terminal = _rules_terminal(continuation, opportunity)
            break
        decision = resolve_decision(opportunity, route_context)
        before = copy.deepcopy(continuation)
        continuation, events = apply_decision(continuation, decision, inputs)
        steps.append(
            _plan_step(
                stop["path_id"], index, before, opportunity,
                decision, continuation, events,
            )
        )
    if terminal is None:
        raise ImplementationError(
            f"plan exhausted while building route: {stop['path_id']}"
        )
    filename, raw_sha256, state_sha256 = PROTECTED_STOPS[stop["path_id"]]
    return {
        "path_id": stop["path_id"],
        "order_id": stop["order_id"],
        "first_player": stop["first_player"],
        "source_stop_file": f"proxy-normal-decision-stops-117/{filename}",
        "source_stop_sha256": raw_sha256,
        "source_state_sha256": state_sha256,
        "resume_event_seq": 3,
        "steps": steps,
        "terminal": terminal,
    }


def build_adjudicated_plan_120(inputs: dict[str, object]) -> dict[str, object]:
    errors = verify_protected_sources(inputs)
    if errors:
        raise ImplementationError("; ".join(errors))
    stops = {row["path_id"]: row for row in inputs["stops_117"]}
    protected_sha256 = {
        "approved_design": APPROVED_DESIGN_SHA256,
        "stops_117": {
            path_id: values[1] for path_id, values in PROTECTED_STOPS.items()
        },
        "read_only_sources": copy.deepcopy(PROTECTED_RAW_SHA256),
    }
    return {
        "schema": PLAN_SCHEMA,
        "checkpoint": 120,
        "contract_version": CONTRACT_VERSION,
        "source_files": {
            "checkpoint_117_plan": (
                "proxy-normal-decision-seeded-restart-plan-117-20260919.json"
            ),
            "checkpoint_119_contract": (
                "proxy-response-window-contract-119-20260922.json"
            ),
            "checkpoint_119_candidate_audit": (
                "proxy-response-window-candidate-audit-119-20260922.json"
            ),
        },
        "protected_sha256": protected_sha256,
        "route_order": list(PATH_ORDER),
        "routes": [_build_route_plan(stops[path_id], inputs) for path_id in PATH_ORDER],
        "scope": {
            "planned_route_count": 4,
            "independent_balance_sample_count": 0,
            "general_game_engine_added": False,
            "changes_card_text_numbers_or_registration": False,
        },
    }


def validate_restart_plan_120(
    plan: object, inputs: dict[str, object]
) -> list[str]:
    if not isinstance(plan, dict):
        return ["checkpoint 120 plan must be an object"]
    expected_keys = [
        "schema", "checkpoint", "contract_version", "source_files",
        "protected_sha256", "route_order", "routes", "scope",
    ]
    errors: list[str] = []
    if list(plan) != expected_keys:
        errors.append("checkpoint 120 plan keys or key order differ")
    if plan.get("schema") != PLAN_SCHEMA or plan.get("checkpoint") != 120:
        errors.append("checkpoint 120 plan identity differs")
    if plan.get("route_order") != list(PATH_ORDER):
        errors.append("checkpoint 120 route order differs")
    routes = plan.get("routes")
    if not isinstance(routes, list) or [
        row.get("path_id") for row in routes if isinstance(row, dict)
    ] != list(PATH_ORDER):
        errors.append("checkpoint 120 routes differ")
    try:
        expected = build_adjudicated_plan_120(inputs)
        if plan != expected:
            errors.append("checkpoint 120 plan differs from canonical builder")
    except (ImplementationError, KeyError, TypeError, ValueError) as error:
        errors.append(f"checkpoint 120 plan rebuild failed: {error}")
    return errors


def _last_valid_from_snapshot(snapshot: dict[str, object]) -> dict[str, object]:
    return {
        "last_valid_event_seq": snapshot["event_seq"],
        "game_state": copy.deepcopy(snapshot["game_state"]),
        "game_state_sha256": snapshot["game_state_sha256"],
        "continuation_state": copy.deepcopy(snapshot["continuation_state"]),
        "continuation_state_sha256": snapshot["continuation_state_sha256"],
    }


def _snapshot_instance_errors(snapshot: dict[str, object]) -> list[str]:
    state = snapshot.get("game_state")
    continuation = snapshot.get("continuation_state")
    if not isinstance(state, dict) or not isinstance(continuation, dict):
        return ["snapshot state envelope is malformed"]
    cards = state.get("cards")
    players = state.get("players")
    if not isinstance(cards, dict) or not isinstance(players, dict):
        return ["snapshot cards or players are malformed"]
    locations: list[str] = []
    for player in players.values():
        if not isinstance(player, dict):
            return ["snapshot player is malformed"]
        for zone in ("hand", "deck", "discard"):
            values = player.get(zone)
            if not isinstance(values, list):
                return [f"snapshot player zone is malformed: {zone}"]
            locations.extend(values)
        board = player.get("board")
        if not isinstance(board, dict):
            return ["snapshot board is malformed"]
        for slot in ("main", "partner", "world"):
            if board.get(slot) is not None:
                locations.append(board[slot])
        for slot in ("companions", "prepared"):
            values = board.get(slot)
            if not isinstance(values, list):
                return [f"snapshot board zone is malformed: {slot}"]
            locations.extend(values)
    activation = continuation.get("activation_zone")
    if not isinstance(activation, list):
        return ["snapshot activation zone is malformed"]
    locations.extend(
        row.get("source_instance_id")
        for row in activation if isinstance(row, dict)
    )
    counts = collections.Counter(locations)
    if None in counts:
        return ["zone contains a missing instance ID"]
    missing = sorted(set(cards) - set(counts))
    extra = sorted(set(counts) - set(cards))
    duplicate = sorted(key for key, count in counts.items() if count != 1)
    if missing or extra or duplicate:
        return [
            f"instance zones differ: missing={missing}, extra={extra}, "
            f"non_unique={duplicate}"
        ]
    return []


def _snapshot_dangling_errors(snapshot: dict[str, object]) -> list[str]:
    state = snapshot["game_state"]
    continuation = snapshot["continuation_state"]
    cards = set(state["cards"])
    activation = continuation.get("activation_zone", [])
    links = {
        row.get("link_id"): row for row in activation if isinstance(row, dict)
    }
    errors = []
    chain_links = continuation.get("response_context", {}).get("chain_links", [])
    if any(link_id not in links for link_id in chain_links):
        errors.append("chain contains a link absent from activation zone")
    for row in activation:
        if not isinstance(row, dict):
            errors.append("activation entry is malformed")
            continue
        references = [row.get("source_instance_id")]
        references.extend(row.get("target_instance_ids", []))
        if any(reference not in cards for reference in references):
            errors.append("activation source or target instance is dangling")
    for player in state["players"].values():
        for reservation in player.get("reservations", []):
            if not isinstance(reservation, dict):
                errors.append("reservation entry is malformed")
                continue
            references = []
            for key, value in reservation.items():
                if key.endswith("instance_id"):
                    references.append(value)
                elif key.endswith("instance_ids") and isinstance(value, list):
                    references.extend(value)
            if any(reference not in cards for reference in references):
                errors.append("reservation instance reference is dangling")
    return errors


def validate_route_evidence(
    route: dict[str, object], evidence: dict[str, object]
) -> None:
    """Raise a route-local integrity stop at the last verified snapshot."""
    decisions = evidence.get("decisions")
    events = evidence.get("events")
    snapshots = evidence.get("snapshots")
    if not all(isinstance(value, list) for value in (decisions, events, snapshots)):
        raise RouteIntegrityStop(
            "sequence_discontinuity",
            _last_valid_from_snapshot(route["steps"][0]["snapshot_before"]),
            {"error": "route evidence lists are missing"},
        )
    source_snapshot = route["steps"][0]["snapshot_before"]
    last_valid = _last_valid_from_snapshot(source_snapshot)
    if len(snapshots) != len(events) + 1 or not snapshots:
        raise RouteIntegrityStop(
            "sequence_discontinuity", last_valid,
            {"error": "snapshot count must equal event count plus one"},
        )
    expected_source = route["resume_event_seq"]
    first = snapshots[0]
    if first.get("event_seq") != expected_source:
        raise RouteIntegrityStop(
            "sequence_discontinuity", last_valid,
            {"error": "resume snapshot sequence differs"},
        )
    for index, (event, snapshot) in enumerate(zip(events, snapshots[1:]), 1):
        expected_seq = expected_source + index
        if event.get("seq") != expected_seq or snapshot.get("event_seq") != expected_seq:
            raise RouteIntegrityStop(
                "sequence_discontinuity", last_valid,
                {"event": copy.deepcopy(event), "snapshot": copy.deepcopy(snapshot)},
            )
        hash_ok = (
            game_state_sha256(last_valid["game_state"]) ==
            last_valid["game_state_sha256"] and
            continuation_state_sha256(last_valid["continuation_state"]) ==
            last_valid["continuation_state_sha256"] and
            event.get("game_state_before_sha256") ==
            last_valid["game_state_sha256"] and
            event.get("continuation_state_before_sha256") ==
            last_valid["continuation_state_sha256"] and
            event.get("game_state_after_sha256") ==
            snapshot.get("game_state_sha256") and
            event.get("continuation_state_after_sha256") ==
            snapshot.get("continuation_state_sha256") and
            game_state_sha256(snapshot.get("game_state")) ==
            snapshot.get("game_state_sha256") and
            continuation_state_sha256(snapshot.get("continuation_state")) ==
            snapshot.get("continuation_state_sha256")
        )
        if not hash_ok:
            raise RouteIntegrityStop(
                "event_hash_discontinuity", last_valid,
                {"event": copy.deepcopy(event), "snapshot": copy.deepcopy(snapshot)},
            )
        instance_errors = _snapshot_instance_errors(snapshot)
        if instance_errors:
            raise RouteIntegrityStop(
                "instance_zone_duplicate_or_missing", last_valid,
                {"errors": instance_errors, "snapshot": copy.deepcopy(snapshot)},
            )
        dangling_errors = _snapshot_dangling_errors(snapshot)
        if dangling_errors:
            raise RouteIntegrityStop(
                "dangling_chain_reservation_or_target", last_valid,
                {"errors": dangling_errors, "snapshot": copy.deepcopy(snapshot)},
            )
        last_valid = _last_valid_from_snapshot(snapshot)

    decision_ids = {row.get("decision_id") for row in decisions}
    reference_errors = []
    if [row.get("decision_seq") for row in decisions] != list(
        range(1, len(decisions) + 1)
    ):
        reference_errors.append("decision sequence differs")
    for decision in decisions:
        matching = [event for event in events
                    if event.get("decision_id") == decision.get("decision_id")]
        if (not isinstance(decision.get("decision_id"), str) or
                len(matching) != 1 or
                decision.get("event_seq") != matching[0].get("seq")):
            reference_errors.append(
                f"decision reference differs: {decision.get('decision_id')}"
            )
    if any(event.get("decision_id") not in decision_ids | {None}
           for event in events):
        reference_errors.append("event references an unknown decision")
    if reference_errors:
        raise RouteIntegrityStop(
            "decision_event_reference_mismatch",
            _last_valid_from_snapshot(source_snapshot),
            {"errors": reference_errors, "evidence": copy.deepcopy(evidence)},
        )


def replay_route_120(
    route: dict[str, object], inputs: dict[str, object]
) -> tuple[dict[str, object], dict[str, object]]:
    if route.get("terminal") is None:
        raise ImplementationError(f"plan exhausted: {route.get('path_id')}")
    expected = next(
        row for row in build_adjudicated_plan_120(inputs)["routes"]
        if row["path_id"] == route.get("path_id")
    )
    if route != expected:
        raise ImplementationError(
            f"route plan binding differs: {route.get('path_id')}"
        )
    decisions = [copy.deepcopy(step["decision"]) for step in route["steps"]]
    events = [
        copy.deepcopy(event)
        for step in route["steps"]
        for event in step["events"]
    ]
    snapshots = [copy.deepcopy(route["steps"][0]["snapshot_before"])]
    snapshots.extend(
        copy.deepcopy(snapshot)
        for step in route["steps"]
        for snapshot in step["snapshots_after_events"]
    )
    evidence = {
        "decisions": decisions,
        "events": events,
        "snapshots": snapshots,
    }
    validate_route_evidence(route, evidence)
    return {
        "status": route["terminal"]["status"],
        "terminal": copy.deepcopy(route["terminal"]),
    }, evidence


def make_rules_stop(
    route_context: dict[str, object],
    last_valid: dict[str, object],
    reason_code: str,
    evidence: dict[str, object],
) -> dict[str, object]:
    if reason_code not in RULES_STOP_REASONS:
        raise ImplementationError(f"unsupported rules stop reason: {reason_code!r}")
    return {
        "schema": SCHEMA,
        "checkpoint": 120,
        "status": "stopped_rules_adjudication",
        "path_id": route_context["path_id"],
        "order_id": route_context["order_id"],
        "first_player": route_context["first_player"],
        "reason_code": reason_code,
        "last_valid_event_seq": last_valid["last_valid_event_seq"],
        "game_state": copy.deepcopy(last_valid["game_state"]),
        "game_state_sha256": last_valid["game_state_sha256"],
        "continuation_state": copy.deepcopy(last_valid["continuation_state"]),
        "continuation_state_sha256": last_valid[
            "continuation_state_sha256"
        ],
        "actor": last_valid["actor"],
        "round": last_valid["round"],
        "phase": last_valid["phase"],
        "decision_kind": last_valid["decision_kind"],
        "choice_kind": last_valid["choice_kind"],
        "known_candidate_ids": copy.deepcopy(
            evidence.get("known_candidate_ids", last_valid["known_candidate_ids"])
        ),
        "known_candidate_details": copy.deepcopy(
            evidence.get(
                "known_candidate_details", last_valid["known_candidate_details"]
            )
        ),
        "missing_candidate_scope": evidence.get(
            "missing_candidate_scope", last_valid["missing_candidate_scope"]
        ),
        "inspected_information": copy.deepcopy(
            evidence.get(
                "inspected_information", last_valid["inspected_information"]
            )
        ),
        "forbidden_information_used": copy.deepcopy(
            evidence.get("forbidden_information_used", [])
        ),
        "source_references": copy.deepcopy(
            evidence.get("source_references", last_valid["source_references"])
        ),
        "resume_condition": evidence.get(
            "resume_condition", last_valid["resume_condition"]
        ),
        "winner": None,
        "counts_as_completed_match": False,
        "counts_as_independent_balance_sample": False,
    }


def make_integrity_stop(
    route_context: dict[str, object],
    last_valid: dict[str, object],
    reason_code: str,
    detected: dict[str, object],
) -> dict[str, object]:
    if reason_code not in INTEGRITY_STOP_REASONS:
        raise ImplementationError(
            f"unsupported integrity stop reason: {reason_code!r}"
        )
    return {
        "schema": SCHEMA,
        "checkpoint": 120,
        "status": "stopped_record_integrity",
        "path_id": route_context["path_id"],
        "order_id": route_context["order_id"],
        "first_player": route_context["first_player"],
        "reason_code": reason_code,
        "last_valid_event_seq": last_valid["last_valid_event_seq"],
        "game_state": copy.deepcopy(last_valid["game_state"]),
        "game_state_sha256": last_valid["game_state_sha256"],
        "continuation_state": copy.deepcopy(last_valid["continuation_state"]),
        "continuation_state_sha256": last_valid[
            "continuation_state_sha256"
        ],
        "detected": copy.deepcopy(detected),
        "resume_condition": "repair and revalidate the detected record integrity break",
        "winner": None,
        "counts_as_completed_match": False,
        "counts_as_independent_balance_sample": False,
    }


def build_completed_record(
    route_context: dict[str, object], evidence: dict[str, object]
) -> dict[str, object]:
    terminal = route_context.get("terminal")
    reason = terminal.get("completion_reason") if isinstance(terminal, dict) else None
    if reason not in COMPLETION_REASONS:
        raise ImplementationError(
            f"unsupported completed terminal reason: {reason!r}"
        )
    source_record = route_context.get("source_record")
    catalog = route_context.get("catalog")
    if not isinstance(source_record, dict) or not isinstance(catalog, dict):
        raise ImplementationError("completed record source envelope or catalog is missing")
    record = copy.deepcopy(source_record)
    record["match_id"] = f"match-120-{route_context['path_id']}"
    record["record"]["status"] = "completed"
    record["record"]["events"] = copy.deepcopy(evidence.get("record_events", []))
    record["record"]["reservations"] = copy.deepcopy(
        evidence.get("reservations", [])
    )
    record["record"]["result"] = {
        "winner": terminal.get("winner"),
        "reason": reason,
        "rounds_completed": terminal.get("rounds_completed", 10),
        "final_growth": copy.deepcopy(terminal.get("final_growth", {"A": 20, "B": 20})),
        "notes": ["checkpoint 120 validated completion"],
    }
    errors = validate_record(record, catalog)
    if errors:
        raise RouteIntegrityStop(
            "decision_event_reference_mismatch",
            route_context.get("last_valid", {}),
            {"record_validation_errors": errors},
        )
    return record


def build_decision_trace(
    route_context: dict[str, object], evidence: dict[str, object]
) -> dict[str, object]:
    return {
        "schema": "naotocchi.card_game.proxy_decision_trace.v1",
        "trace_id": f"decision-trace-120-{route_context['path_id']}",
        "record_match_id": f"match-120-{route_context['path_id']}",
        "protocol": {
            "normal_and_mandatory": fallback_116.CONTRACT_VERSION,
            "response": response_119.CONTRACT_VERSION,
        },
        "state_model": "game_state_and_continuation_state_dual_hash",
        "decisions": copy.deepcopy(evidence.get("decisions", [])),
        "snapshots": copy.deepcopy(evidence.get("snapshots", [])),
    }


def continue_routes_independently(
    plan: dict[str, object], inputs: dict[str, object]
) -> dict[str, object]:
    protected_errors = verify_protected_sources(inputs)
    if protected_errors:
        raise ImplementationError("; ".join(protected_errors))
    plan_errors = validate_restart_plan_120(plan, inputs)
    if plan_errors:
        raise ImplementationError("; ".join(plan_errors))

    outcomes: dict[str, dict[str, object]] = {}
    replay_evidence: dict[str, dict[str, object]] = {}
    for route in plan["routes"]:
        path_id = route["path_id"]
        try:
            result, evidence = replay_route_120(route, inputs)
            terminal = result["terminal"]
            if result["status"] == "stopped_rules_adjudication":
                stop = make_rules_stop(
                    route, terminal, terminal["reason_code"], terminal
                )
                outcome = {
                    "status": stop["status"],
                    "stop": stop,
                    "winner": None,
                    "counts_as_completed_match": False,
                    "counts_as_independent_balance_sample": False,
                }
            elif result["status"] == "stopped_record_integrity":
                stop = make_integrity_stop(
                    route,
                    terminal["last_valid"],
                    terminal["reason_code"],
                    terminal["detected"],
                )
                outcome = {
                    "status": stop["status"],
                    "stop": stop,
                    "winner": None,
                    "counts_as_completed_match": False,
                    "counts_as_independent_balance_sample": False,
                }
            elif result["status"] == "completed":
                route_context = copy.deepcopy(route)
                route_context.update(
                    {
                        "source_record": inputs["normal_decision_inputs_117"]["source"],
                        "catalog": {
                            row["card_id"]: row["card_type"]
                            for row in inputs["response_window_inputs_119"][
                                "candidate_table"
                            ]["cards"]
                        },
                    }
                )
                record = build_completed_record(route_context, evidence)
                outcome = {
                    "status": "completed",
                    "record": record,
                    "trace": build_decision_trace(route_context, evidence),
                    "winner": record["record"]["result"]["winner"],
                    "counts_as_completed_match": True,
                    "counts_as_independent_balance_sample": False,
                }
            else:
                raise ImplementationError(
                    f"unsupported terminal status: {result['status']!r}"
                )
        except RulesAdjudicationStop as stop_signal:
            last_valid = stop_signal.evidence["last_valid"]
            stop = make_rules_stop(
                route, last_valid, stop_signal.reason_code, stop_signal.evidence
            )
            outcome = {
                "status": stop["status"], "stop": stop, "winner": None,
                "counts_as_completed_match": False,
                "counts_as_independent_balance_sample": False,
            }
            evidence = copy.deepcopy(stop_signal.evidence.get("replay_evidence", {}))
        except RouteIntegrityStop as stop_signal:
            stop = make_integrity_stop(
                route,
                stop_signal.last_valid,
                stop_signal.reason_code,
                stop_signal.detected,
            )
            outcome = {
                "status": stop["status"], "stop": stop, "winner": None,
                "counts_as_completed_match": False,
                "counts_as_independent_balance_sample": False,
            }
            evidence = {}
        outcomes[path_id] = outcome
        replay_evidence[path_id] = evidence

    return {
        "schema": SCHEMA,
        "checkpoint": 120,
        "planned_route_count": len(outcomes),
        "outcomes": outcomes,
        "replay_evidence": replay_evidence,
    }


def build_evaluation_120(suite: dict[str, object]) -> dict[str, object]:
    outcomes = suite["outcomes"]
    evidence = suite["replay_evidence"]
    routes = []
    for path_id in PATH_ORDER:
        outcome = outcomes[path_id]
        route_evidence = evidence[path_id]
        routes.append(
            {
                "path_id": path_id,
                "status": outcome["status"],
                "winner": outcome.get("winner"),
                "decision_count": len(route_evidence.get("decisions", [])),
                "event_count": len(route_evidence.get("events", [])),
                "snapshot_count": len(route_evidence.get("snapshots", [])),
                "counts_as_independent_balance_sample": False,
            }
        )
    return {
        "schema": EVALUATION_SCHEMA,
        "checkpoint": 120,
        "planned_route_count": 4,
        "completed_route_count": sum(
            row["status"] == "completed" for row in routes
        ),
        "stopped_rules_adjudication_count": sum(
            row["status"] == "stopped_rules_adjudication" for row in routes
        ),
        "stopped_record_integrity_count": sum(
            row["status"] == "stopped_record_integrity" for row in routes
        ),
        "decision_count": sum(row["decision_count"] for row in routes),
        "event_count": sum(row["event_count"] for row in routes),
        "snapshot_count": sum(row["snapshot_count"] for row in routes),
        "winner_count": sum(row["winner"] is not None for row in routes),
        "independent_balance_sample_count": 0,
        "routes": routes,
        "prohibited_uses": [
            "win_rate", "first_second_difference", "activation_rate",
            "card_strength", "card_adoption", "catalog_population_change",
        ],
    }


EVALUATION_FILE = (
    "proxy-response-window-seeded-restart-evaluation-120-20260922.json"
)
PLAN_FILE = "proxy-response-window-seeded-restart-plan-120-20260922.json"
ARTIFACT_DIRECTORIES_120 = {
    "completed_records": "proxy-matches-120",
    "decision_traces": "proxy-decision-traces-120",
    "stop_artifacts": "proxy-response-window-stops-120",
}


def expected_artifacts_120(
    suite: dict[str, object], data_dir: Path
) -> dict[Path, object]:
    data_dir = Path(data_dir)
    artifacts: dict[Path, object] = {
        data_dir / EVALUATION_FILE: build_evaluation_120(suite)
    }
    for path_id in PATH_ORDER:
        outcome = suite["outcomes"][path_id]
        status = outcome["status"]
        if status == "completed":
            artifacts[
                data_dir
                / ARTIFACT_DIRECTORIES_120["completed_records"]
                / f"match-120-{path_id}.json"
            ] = copy.deepcopy(outcome["record"])
            artifacts[
                data_dir
                / ARTIFACT_DIRECTORIES_120["decision_traces"]
                / f"decision-trace-120-{path_id}.json"
            ] = copy.deepcopy(outcome["trace"])
        elif status in {
            "stopped_rules_adjudication",
            "stopped_record_integrity",
        }:
            artifacts[
                data_dir
                / ARTIFACT_DIRECTORIES_120["stop_artifacts"]
                / f"stop-120-{path_id}.json"
            ] = copy.deepcopy(outcome["stop"])
        else:
            raise ImplementationError(
                f"unsupported terminal status: {status!r}"
            )
    return artifacts


def _materialized_manifest_errors(
    expected: dict[Path, object], data_dir: Path, *, allow_missing: bool
) -> list[str]:
    data_dir = Path(data_dir)
    errors: list[str] = []
    expected_paths = set(expected)
    expected_terminal_dirs = {
        path.parent for path in expected_paths if path.parent != data_dir
    }
    all_terminal_dirs = {
        data_dir / relative for relative in ARTIFACT_DIRECTORIES_120.values()
    }
    for directory in sorted(all_terminal_dirs):
        if directory.exists() and directory not in expected_terminal_dirs:
            errors.append(
                f"unexpected artifact directory: {directory.relative_to(data_dir).as_posix()}"
            )
        if directory.is_dir():
            for path in sorted(directory.rglob("*")):
                if path.is_file() and path not in expected_paths:
                    errors.append(
                        f"unexpected artifact: {path.relative_to(data_dir).as_posix()}"
                    )
    for path in expected_paths:
        if not path.is_file() and not allow_missing:
            errors.append(
                f"missing materialized artifact: {path.relative_to(data_dir).as_posix()}"
            )
    return errors


def validate_materialized_checkpoint_120(
    suite: dict[str, object], data_dir: Path
) -> list[str]:
    data_dir = Path(data_dir)
    expected = expected_artifacts_120(suite, data_dir)
    errors = _materialized_manifest_errors(
        expected, data_dir, allow_missing=False
    )
    for path, value in expected.items():
        if path.is_file() and path.read_bytes() != _canonical_json_bytes(value):
            errors.append(
                f"materialized artifact bytes differ: {path.relative_to(data_dir).as_posix()}"
            )
    return errors


def validate_materialized_plan_120(
    inputs: dict[str, object], data_dir: Path
) -> list[str]:
    path = Path(data_dir) / PLAN_FILE
    if not path.is_file():
        return ["materialized checkpoint 120 plan is missing"]
    expected = _canonical_json_bytes(build_adjudicated_plan_120(inputs))
    if path.read_bytes() != expected:
        return ["materialized checkpoint 120 plan bytes differ"]
    return []


def write_checkpoint_120(
    suite: dict[str, object], data_dir: Path
) -> None:
    data_dir = Path(data_dir)
    expected = expected_artifacts_120(suite, data_dir)
    preflight = _materialized_manifest_errors(
        expected, data_dir, allow_missing=True
    )
    if preflight:
        raise ImplementationError("; ".join(preflight))
    for path, value in expected.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(_canonical_json_bytes(value))
    errors = validate_materialized_checkpoint_120(suite, data_dir)
    if errors:
        raise ImplementationError("; ".join(errors))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=DATA)
    parser.add_argument("--plan", type=Path)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--write-plan", type=Path)
    args = parser.parse_args(argv)
    if args.write and args.write_plan is not None:
        parser.error("--write and --write-plan are mutually exclusive")
    try:
        inputs = load_checkpoint_120_inputs(args.data_dir)
        if args.write_plan is not None:
            plan = build_adjudicated_plan_120(inputs)
            errors = validate_restart_plan_120(plan, inputs)
            if errors:
                raise ImplementationError("; ".join(errors))
            args.write_plan.write_bytes(_canonical_json_bytes(plan))
            print(json.dumps({"valid": True, "written": True, "errors": []},
                             ensure_ascii=False))
            return 0

        plan_path = args.plan or (
            args.data_dir
            / "proxy-response-window-seeded-restart-plan-120-20260922.json"
        )
        plan = _load_json(plan_path)
        plan_errors = validate_restart_plan_120(plan, inputs)
        if args.plan is None:
            plan_errors.extend(validate_materialized_plan_120(inputs, args.data_dir))
        if plan_errors:
            raise ImplementationError("; ".join(plan_errors))
        suite = continue_routes_independently(plan, inputs)
        evaluation = build_evaluation_120(suite)
        if args.write:
            write_checkpoint_120(suite, args.data_dir)
            materialized_errors: list[str] = []
        else:
            materialized_errors = validate_materialized_checkpoint_120(
                suite, args.data_dir
            )
        result = {
            "valid": not materialized_errors,
            "planned_route_count": evaluation["planned_route_count"],
            "completed_route_count": evaluation["completed_route_count"],
            "stopped_rules_adjudication_count": evaluation[
                "stopped_rules_adjudication_count"
            ],
            "stopped_record_integrity_count": evaluation[
                "stopped_record_integrity_count"
            ],
            "independent_balance_sample_count": evaluation[
                "independent_balance_sample_count"
            ],
            "route_statuses": {
                path_id: suite["outcomes"][path_id]["status"]
                for path_id in PATH_ORDER
            },
            "written": args.write,
            "errors": materialized_errors,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return bool(materialized_errors)
    except (ImplementationError, KeyError, TypeError, ValueError, OSError) as error:
        print(json.dumps({
            "valid": False,
            "planned_route_count": 0,
            "completed_route_count": 0,
            "stopped_rules_adjudication_count": 0,
            "stopped_record_integrity_count": 0,
            "independent_balance_sample_count": 0,
            "route_statuses": {},
            "written": False,
            "errors": [str(error)],
        }, ensure_ascii=False, indent=2))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
