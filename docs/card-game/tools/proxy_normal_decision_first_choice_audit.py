#!/usr/bin/env python3
"""Build and validate checkpoint-115 normal-decision first-choice data."""

import argparse
import copy
import hashlib
import json
from pathlib import Path
import random

from proxy_normal_decision_hardening import compare_candidates


SOURCE_FIXTURE = "proxy-fixtures-107/fixture-107-normal-decision-a-first.json"
ADMISSION_PLAN = "proxy-normal-decision-admission-plan-113-20260918.json"
HARDENING_CONTRACT = "proxy-normal-decision-hardening-114-20260918.json"
TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_ADMISSION_PLAN = DATA / ADMISSION_PLAN
DEFAULT_SOURCE = DATA / SOURCE_FIXTURE
DEFAULT_HARDENING = DATA / HARDENING_CONTRACT
DEFAULT_PLAN_OUTPUT = DATA / "proxy-normal-decision-first-choice-plan-115-20260918.json"
DEFAULT_AUDIT_OUTPUT = DATA / "proxy-normal-decision-first-choice-audit-115-20260918.json"


def shuffle_deck(cards, seed):
    shuffled = copy.deepcopy(cards)
    random.Random(seed).shuffle(shuffled)
    return shuffled


def build_first_choice_plan(admission_plan, source):
    players = {
        player["player_id"]: player["deck_order_top_to_bottom"]
        for player in source["input"]["players"]
    }
    orders = []
    for order in admission_plan["orders"]:
        order_players = []
        for player_id in ("A", "B"):
            seed = order["shuffle_seed_by_player"][player_id]
            order_players.append({
                "player_id": player_id,
                "seed": seed,
                "deck_order_top_to_bottom": shuffle_deck(players[player_id], seed),
            })
        orders.append({"order_id": order["order_id"], "players": order_players})
    return {
        "schema": "naotocchi.card_game.proxy_normal_decision_first_choice_plan.v1",
        "checkpoint": 115,
        "status": "orders_materialized_no_match_artifacts",
        "source_fixture": SOURCE_FIXTURE,
        "source_admission_plan": ADMISSION_PLAN,
        "shuffle": {
            "algorithm": "random.Random(seed).shuffle",
            "random_engine": "MT19937",
            "python_runtime_at_materialization": "CPython 3.12.14",
            "applications_per_order_player": 1,
        },
        "orders": orders,
        "planned_path_count": 4,
        "scope": {
            "fixture_count": 0,
            "completed_match_count": 0,
            "trace_count": 0,
            "winner_count": 0,
            "independent_balance_sample_count": 0,
        },
    }


def _card_identity(card):
    return card["card_copy_id"], card["card_id"], card["initial_instance_id"]


def validate_first_choice_plan(plan, admission_plan, source):
    errors = []
    expected = build_first_choice_plan(admission_plan, source)
    if plan.get("schema") != expected["schema"] or plan.get("checkpoint") != 115:
        errors.append("115 first-choice plan schema or checkpoint differs")
    if plan.get("shuffle") != expected["shuffle"]:
        errors.append("115 shuffle algorithm or runtime differs")

    source_by_player = {
        player["player_id"]: player["deck_order_top_to_bottom"]
        for player in source["input"]["players"]
    }
    order_sequences = {}
    for order in plan.get("orders", []):
        order_id = order.get("order_id")
        order_sequences[order_id] = {}
        for player in order.get("players", []):
            player_id = player.get("player_id")
            cards = player.get("deck_order_top_to_bottom", [])
            order_sequences[order_id][player_id] = [
                card.get("card_copy_id") for card in cards
            ]
            if len(cards) != 40:
                errors.append(f"{order_id} {player_id} deck must contain 40 cards")
            if player_id in source_by_player:
                source_identities = [_card_identity(card) for card in source_by_player[player_id]]
                shuffled_identities = [_card_identity(card) for card in cards]
                if len(set(shuffled_identities)) != 40:
                    errors.append(f"{order_id} {player_id} has duplicate card identities")
                if set(shuffled_identities) != set(source_identities):
                    errors.append(f"{order_id} {player_id} changes source card identities")

    if set(order_sequences) != {"order-01", "order-02"}:
        errors.append("115 plan must contain exact order-01 and order-02")
    else:
        for player_id in ("A", "B"):
            if order_sequences["order-01"].get(player_id) == \
                    order_sequences["order-02"].get(player_id):
                errors.append(f"{player_id} order-01 and order-02 must differ")
    if plan != expected:
        errors.append("115 first-choice plan differs from canonical builder")
    return errors


def order_sha256(cards):
    serialized = json.dumps(
        cards, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(serialized).hexdigest()


def zero_cost_people(cards):
    return [card for card in cards if card["card_id"].startswith(("C-", "P-"))]


def _candidate(candidate_id, card_copy_id):
    return {
        "candidate_id": candidate_id,
        "avoid_loss_or_abort": 0,
        "maintain_or_prevent_100": 0,
        "certain_growth_difference": 0,
        "time_after_certain_resolution": 1,
        "payment_time": 0,
        "consumed_card_count": 1 if candidate_id == "place_zero_cost_person" else 0,
        "card_copy_id": card_copy_id,
        "value_comparison_to": {},
    }


def _downstream_evidence(paths):
    evidence = []
    for path in paths:
        people = zero_cost_people(path["hand_before_choice"])
        place = _candidate(
            "place_zero_cost_person",
            people[0]["card_copy_id"] if people else "none",
        )
        passed = _candidate("pass", "pass")
        place["value_comparison_to"]["pass"] = {
            "hand": "worse",
            "board": "better",
            "reservations": "equal",
        }
        minimum_remaining = max(0, len(people) - 1)
        evidence.append({
            "path_id": path["path_id"],
            "zero_cost_person_card_ids": [card["card_id"] for card in people],
            "zero_cost_person_copy_ids": [card["card_copy_id"] for card in people],
            "minimum_remaining_after_one_bottom": minimum_remaining,
            "classification": (
                "unavoidable_zero_cost_person_vs_pass"
                if minimum_remaining >= 1
                else "avoidable_only_by_unresolved_egg_choice"
            ),
            "value_relation": {
                "hand": "worse",
                "board": "better",
                "reservations": "equal",
            },
            "comparison_result": compare_candidates(place, passed),
            "counts_as_played_action": False,
            "counts_as_match_result": False,
        })
    return evidence


def build_first_choice_audit(plan, hardening):
    order_summaries = []
    paths = []
    for order in plan["orders"]:
        players = []
        player_by_id = {}
        for player in order["players"]:
            cards = player["deck_order_top_to_bottom"]
            player_by_id[player["player_id"]] = player
            players.append({
                "player_id": player["player_id"],
                "seed": player["seed"],
                "order_sha256": order_sha256(cards),
                "top_seven": copy.deepcopy(cards[:7]),
            })
        order_summaries.append({"order_id": order["order_id"], "players": players})
        for first_player in ("A", "B"):
            hand = copy.deepcopy(
                player_by_id[first_player]["deck_order_top_to_bottom"][:7]
            )
            paths.append({
                "path_id": f"{order['order_id']}-{first_player.lower()}-first",
                "order_id": order["order_id"],
                "first_player": first_player,
                "uses_same_order_manifest_for_seat_mirror": True,
                "hand_before_choice": hand,
                "bottom_candidate_copy_ids": [card["card_copy_id"] for card in hand],
                "stop": {
                    "round": 1,
                    "phase": "egg_exchange_choice",
                    "actor": first_player,
                    "reason": "egg_exchange_choice_unresolved",
                },
            })
    return {
        "schema": "naotocchi.card_game.proxy_normal_decision_first_choice_audit.v1",
        "checkpoint": 115,
        "status": "stopped_at_first_choice_no_match_artifacts",
        "stop_required": True,
        "stop_rule": "107.stop_conditions.rules_adjudication_unresolved",
        "plan": "proxy-normal-decision-first-choice-plan-115-20260918.json",
        "hardening_contract": HARDENING_CONTRACT,
        "hardening_checkpoint": hardening["checkpoint"],
        "orders": order_summaries,
        "paths": paths,
        "downstream_evidence": _downstream_evidence(paths),
        "scope": copy.deepcopy(plan["scope"]),
        "checkpoint_112": {
            "targeted_fixture_count": 6,
            "completed_in_115": 0,
            "status": "unchanged_unplayed",
        },
        "population": {
            "current_catalog": 452,
            "registered_candidates": 477,
            "changed_card_text_numeric_or_registration_ids": 0,
        },
        "interpretation": {
            "counts_as_match": False,
            "counts_as_activation_zero": False,
            "counts_as_strength_evidence": False,
            "changes_card_pool": False,
        },
    }


def validate_first_choice_audit(audit, plan, hardening):
    errors = []
    expected = build_first_choice_audit(plan, hardening)
    if audit.get("schema") != expected["schema"] or audit.get("checkpoint") != 115:
        errors.append("115 first-choice audit schema or checkpoint differs")
    if audit.get("status") != "stopped_at_first_choice_no_match_artifacts" or \
            audit.get("stop_required") is not True:
        errors.append("115 audit must stop without match artifacts")
    scope = audit.get("scope", {})
    for key in (
            "fixture_count", "completed_match_count", "trace_count", "winner_count",
            "independent_balance_sample_count"):
        if scope.get(key) != 0:
            errors.append(f"115 {key} must remain zero")
    paths = audit.get("paths", [])
    if len(paths) != 4:
        errors.append("115 audit must contain exact four stopped paths")
    for path in paths:
        stop = path.get("stop", {})
        if stop != {
                "round": 1,
                "phase": "egg_exchange_choice",
                "actor": path.get("first_player"),
                "reason": "egg_exchange_choice_unresolved"}:
            errors.append(f"{path.get('path_id')} stop differs")
        hand = path.get("hand_before_choice", [])
        if len(hand) != 7 or path.get("bottom_candidate_copy_ids") != [
                card.get("card_copy_id") for card in hand]:
            errors.append(f"{path.get('path_id')} bottom candidates differ from seven-card hand")
    if audit.get("hardening_checkpoint") != 114 or hardening.get("checkpoint") != 114:
        errors.append("115 audit must reference checkpoint-114 hardening")
    evidence = audit.get("downstream_evidence", [])
    if len(evidence) != 4:
        errors.append("115 audit must contain downstream evidence for four paths")
    unavoidable = [
        row for row in evidence
        if row.get("classification") == "unavoidable_zero_cost_person_vs_pass"
    ]
    if len(unavoidable) != 3:
        errors.append("115 audit must retain exact three unavoidable downstream blockers")
    for row in evidence:
        if row.get("comparison_result", {}).get("reason") != \
                "unresolved_canonical_text":
            errors.append(f"{row.get('path_id')} downstream comparison must remain unresolved")
        if row.get("counts_as_played_action") is not False or \
                row.get("counts_as_match_result") is not False:
            errors.append(f"{row.get('path_id')} downstream evidence cannot count as play")
    if audit != expected:
        errors.append("115 first-choice audit differs from canonical builder")
    return errors


def load_json(path):
    return json.loads(Path(path).read_text())


def write_json(value, output_path):
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def validate_materialized(value, output_path, label):
    output_path = Path(output_path)
    if not output_path.exists():
        return [f"materialized 115 {label} is missing"]
    if load_json(output_path) != value:
        return [f"materialized 115 {label} differs from builder"]
    return []


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--admission-plan", default=DEFAULT_ADMISSION_PLAN)
    parser.add_argument("--source", default=DEFAULT_SOURCE)
    parser.add_argument("--hardening", default=DEFAULT_HARDENING)
    parser.add_argument("--plan-output", default=DEFAULT_PLAN_OUTPUT)
    parser.add_argument("--audit-output", default=DEFAULT_AUDIT_OUTPUT)
    parser.add_argument("--write-plan", action="store_true")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)

    admission_plan = load_json(args.admission_plan)
    source = load_json(args.source)
    hardening = load_json(args.hardening)
    plan = build_first_choice_plan(admission_plan, source)
    audit = build_first_choice_audit(plan, hardening)
    errors = validate_first_choice_plan(plan, admission_plan, source)
    errors.extend(validate_first_choice_audit(audit, plan, hardening))
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1

    if args.write_plan or args.write:
        write_json(plan, args.plan_output)
    if args.write:
        write_json(audit, args.audit_output)

    for value, output, label in (
            (plan, args.plan_output, "plan"),
            (audit, args.audit_output, "audit")):
        if Path(output).exists():
            errors.extend(validate_materialized(value, output, label))
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1

    print(json.dumps({
        "valid": True,
        "status": audit["status"],
        "order_count": len(plan["orders"]),
        "path_count": len(audit["paths"]),
        "completed_match_count": audit["scope"]["completed_match_count"],
        "written": args.write,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
