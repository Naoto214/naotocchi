#!/usr/bin/env python3
"""Build and validate the six checkpoint-112 unplayed gap fixtures."""

import argparse
import copy
import json
from pathlib import Path

from proxy_record_validator import load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_PLAN = DATA / "proxy-gap-fixture-plan-112-20260918.json"
DEFAULT_DISPOSITION = DATA / "proxy-gap-disposition-111-20260918.json"
DEFAULT_POOL_LAYERS = DATA / "proxy-pool-layers-20260917.json"


EXPECTED_GAPS = {
    "G-jump-quest": (
        "fixture-112-g-jump-quest", "P97-05", "targeted-short",
        "two_time_skips_in_same_turn",
    ),
    "M-mushroom-06": (
        "fixture-112-m-mushroom-06", "P97-05", "targeted-short",
        "same_name_non_main_pair_across_field_and_discard",
    ),
    "M-sakura-05": (
        "fixture-112-m-sakura-05", "P97-05", "evolution-path",
        "compatible_species_stage_path",
    ),
    "M-dragon-08": (
        "fixture-112-m-dragon-08", "P97-05", "evolution-path",
        "compatible_species_stage_path",
    ),
    "M-penguin-07": (
        "fixture-112-m-penguin-07", "P97-06", "evolution-path",
        "compatible_species_stage_path",
    ),
    "M-god-08": (
        "fixture-112-m-god-08", "P97-06", "evolution-path",
        "compatible_species_stage_path",
    ),
}

EXPECTED_SOURCES = {
    "G-jump-quest": "proxy-fixtures-101/fixture-101-p97-05-board-combination.json",
    "M-mushroom-06": "proxy-fixtures-101/fixture-101-p97-05-board-combination.json",
    "M-sakura-05": "proxy-fixtures-101/fixture-101-p97-05-board-combination.json",
    "M-dragon-08": "proxy-fixtures-101/fixture-101-p97-05-board-combination.json",
    "M-penguin-07": "proxy-fixtures-101/fixture-101-p97-06-board-combination.json",
    "M-god-08": "proxy-fixtures-101/fixture-101-p97-06-board-combination.json",
}

EXPECTED_INVENTORY = {
    "G-jump-quest": {("A", "G-jump-quest", 1), ("A", "M-beetle-01", 1),
                     ("A", "M-beetle-02", 1), ("A", "M-beetle-03", 1)},
    "M-mushroom-06": {("A", "M-mushroom-01", 1), ("A", "M-mushroom-06", 1),
                      ("A", "C-otter", 2)},
    "M-sakura-05": {("A", "M-sakura-01", 1), ("A", "M-sakura-05", 1),
                    ("A", "G-curling-ice", 1)},
    "M-dragon-08": {("A", "M-dragon-01", 1), ("A", "M-dragon-08", 1),
                    ("A", "G-basketball-3d", 1), ("A", "G-crane-game-3d", 1),
                    ("A", "C-bat", 1)},
    "M-penguin-07": {("A", "M-penguin-01", 1), ("A", "M-penguin-07", 1),
                     ("A", "W-city", 1), ("A", "C-bat", 1),
                     ("B", "M-dragon-01", 1), ("B", "M-dragon-06", 1),
                     ("B", "I-bond1", 1)},
    "M-god-08": {("A", "M-god-01", 1), ("A", "M-god-08", 1),
                 ("A", "C-bat", 1), ("B", "M-dragon-01", 1),
                 ("B", "M-dragon-06", 1), ("B", "I-bond1", 1)},
}

EXPECTED_PROOF_SETUPS = {
    "G-jump-quest": {
        "same_turn_time_skips": [
            {"from_card_id": "M-beetle-01", "to_card_id": "M-beetle-02", "time_cost": 1},
            {"from_card_id": "M-beetle-02", "to_card_id": "M-beetle-03", "time_cost": 1},
        ],
        "focus_time_cost": 1,
        "discard_target_stage_range": [1, 3],
    },
    "M-mushroom-06": {
        "same_name_non_main_card_id": "C-otter",
        "distinct_card_copy_count": 2,
        "required_zones_at_trigger_and_resolution": ["face_up_board", "discard"],
    },
    "M-sakura-05": {
        "trap_card_id": "G-curling-ice", "focus_time_cost": 1,
        "target_zone": "discard",
    },
    "M-dragon-08": {
        "action_card_ids_for_discard": ["G-basketball-3d", "G-crane-game-3d"],
        "person_card_id_for_discard": "C-bat", "ordered_deck_bottom_count": 2,
    },
    "M-penguin-07": {
        "world_change_card_id": "W-city", "protected_companion_card_id": "C-bat",
        "opponent_removal_provider_card_id": "M-dragon-06",
        "opponent_removal_entry_from_card_id": "M-dragon-01",
        "opponent_preparation_card_id": "I-bond1",
    },
    "M-god-08": {
        "protected_card_id": "C-bat", "hand_card_to_deck_bottom_count": 1,
        "focus_time_cost": 1, "opponent_removal_provider_card_id": "M-dragon-06",
        "opponent_removal_entry_from_card_id": "M-dragon-01",
        "opponent_preparation_card_id": "I-bond1", "replacement_destination": "hand",
    },
}


def load_json(path):
    return json.loads(Path(path).read_text())


def fixture_filename(fixture):
    return f"{fixture['match_id']}.json"


def _players(record):
    return {
        row["player_id"]: row
        for row in record["input"]["players"]
    }


def _identity_sequence(player):
    return [
        (row["card_copy_id"], row["initial_instance_id"])
        for row in player["deck_order_top_to_bottom"]
    ]


def _assignment_map(spec):
    return {
        (row["player_id"], row["position"]): row["card_id"]
        for row in spec["deck_assignments"]
    }


def build_gap_fixtures(plan, data_directory=DATA):
    data_directory = Path(data_directory)
    fixtures = []
    for spec in plan["fixtures"]:
        fixture = copy.deepcopy(load_json(data_directory / spec["source_fixture"]))
        fixture["match_id"] = spec["fixture_id"]
        fixture["test_plan"]["purpose"] = (
            f"111で記録した{spec['focus_card_id']}の構造的入力不足を、"
            "現行452内の適正な前提カードで解消する未実施fixture。"
            "対戦結果・発動率・強度には数えない。"
        )
        fixture["test_plan"]["strata"] = [
            "current-452", spec["source_cluster"], spec["fixture_group"],
            spec["focus_card_id"], "checkpoint-112-unplayed",
        ]
        players = _players(fixture)
        for assignment in spec["deck_assignments"]:
            deck = players[assignment["player_id"]]["deck_order_top_to_bottom"]
            deck[assignment["position"] - 1]["card_id"] = assignment["card_id"]
        for player in players.values():
            player["initial_hand"] = [
                row["initial_instance_id"]
                for row in player["deck_order_top_to_bottom"][:5]
            ]
        fixture["record"] = {
            "status": "fixture",
            "events": [],
            "reservations": [],
            "result": {
                "winner": None,
                "reason": None,
                "rounds_completed": 0,
                "final_growth": copy.deepcopy(fixture["input"]["initial_growth"]),
                "notes": [
                    "未実施fixture。対戦結果・発動率・強度評価には数えない。"
                ],
            },
        }
        fixtures.append(fixture)
    return fixtures


def _validate_plan_semantics(plan, disposition):
    errors = []
    if (plan.get("schema") != "naotocchi.card_game.proxy_gap_fixture_plan.v1" or
            plan.get("checkpoint") != 112 or
            plan.get("source_disposition") !=
            "proxy-gap-disposition-111-20260918.json"):
        errors.append("112 plan schema, checkpoint or source disposition differs")
    if plan.get("scope") != {
            "fixture_count": 6, "completed_match_count": 0,
            "independent_balance_sample_count": 0, "changes_card_pool": False}:
        errors.append("112 scope must contain six fixtures and no completed sample")
    if plan.get("constraints") != disposition.get("planned_fixture_constraints"):
        errors.append("112 fixture constraints must equal checkpoint 111")
    if plan.get("interpretation") != {
            "counts_as_completed_match": False,
            "counts_as_activation_zero": False,
            "counts_as_strength_evidence": False,
            "targeted_execution_checkpoint": None}:
        errors.append("112 interpretation boundary differs")
    if plan.get("population_boundaries") != disposition.get("population_boundaries"):
        errors.append("112 population boundaries must equal checkpoint 111")

    specs = plan.get("fixtures", [])
    if len(specs) != 6:
        errors.append("112 plan must declare exactly six fixtures")
    disposition_by_card = {
        row.get("card_id"): row for row in disposition.get("gaps", [])
    }
    if [row.get("focus_card_id") for row in specs] != list(EXPECTED_GAPS):
        errors.append("112 fixture order and focus IDs must equal the six authored gaps")
    for spec in specs:
        card_id = spec.get("focus_card_id")
        expected = EXPECTED_GAPS.get(card_id)
        if expected is None:
            continue
        fixture_id, cluster, group, requirement = expected
        if (spec.get("fixture_id"), spec.get("source_cluster"),
                spec.get("fixture_group"), spec.get("missing_requirement")) != expected:
            errors.append(f"{card_id} fixture identity or grouping differs")
        if spec.get("source_fixture") != EXPECTED_SOURCES[card_id]:
            errors.append(f"{card_id} authored source fixture differs")
        source_gap = disposition_by_card.get(card_id, {})
        if (source_gap.get("planned_fixture_id") != fixture_id or
                source_gap.get("source_cluster") != cluster or
                source_gap.get("fixture_group") != group or
                source_gap.get("missing_requirement") != requirement):
            errors.append(f"{card_id} differs from checkpoint 111 disposition")
        assignments = spec.get("deck_assignments", [])
        keys = [(row.get("player_id"), row.get("position")) for row in assignments]
        if (len(keys) != len(set(keys)) or
                any(player not in ("A", "B") or not isinstance(position, int) or
                    not 1 <= position <= 40 for player, position in keys)):
            errors.append(f"{card_id} has invalid or duplicate deck assignments")
        inventory = spec.get("required_inventory", [])
        if (not inventory or any(row.get("count", 0) < 1 for row in inventory)):
            errors.append(f"{card_id} required inventory is incomplete")
        actual_inventory = {
            (row.get("player_id"), row.get("card_id"), row.get("count"))
            for row in inventory
        }
        if actual_inventory != EXPECTED_INVENTORY[card_id]:
            errors.append(f"{card_id} authored required inventory differs")
        if spec.get("proof_setup") != EXPECTED_PROOF_SETUPS[card_id]:
            errors.append(f"{card_id} authored proof setup differs")

        entry = spec.get("entry_path")
        if group == "evolution-path" or card_id == "M-mushroom-06":
            if not isinstance(entry, dict):
                errors.append(f"{card_id} must declare a legal time-skip entry")
            else:
                try:
                    source_species, source_stage = entry["from_card_id"].rsplit("-", 1)
                    target_species, target_stage = entry["target_card_id"].rsplit("-", 1)
                    legal = (
                        entry.get("method") == "time-skip" and
                        source_species == target_species and
                        int(source_stage) < int(target_stage) and
                        entry.get("time_cost") == int(target_stage) - int(source_stage) and
                        entry.get("direct_high_stage_placement") is False and
                        entry.get("target_card_id") == card_id
                    )
                except (KeyError, TypeError, ValueError):
                    legal = False
                if not legal:
                    errors.append(f"{card_id} time-skip entry is not the authored legal path")
        if group == "evolution-path" and "direct_high_stage_placement" not in (
                source_gap.get("forbidden_shortcuts") or []):
            errors.append(f"{card_id} lost the direct-placement prohibition")

    return errors


def validate_gap_fixtures(fixtures, plan, disposition, pool_layers, catalog,
                          data_directory=DATA):
    data_directory = Path(data_directory)
    errors = _validate_plan_semantics(plan, disposition)
    expected_specs = {row["fixture_id"]: row for row in plan.get("fixtures", [])}
    actual_ids = [row.get("match_id") for row in fixtures]
    if len(fixtures) != 6:
        errors.append("112 suite must contain exactly six fixtures")
    if len(actual_ids) != len(set(actual_ids)) or set(actual_ids) != set(expected_specs):
        errors.append("112 materialized fixture IDs must equal the plan exactly")

    layers = pool_layers.get("layers", {})
    forbidden = {
        row["id"]
        for key in ("current_unregistered_source", "retired_legacy_test",
                    "retired_archive", "hold")
        for row in layers.get(key, [])
    }
    current_ids = set(catalog)
    for fixture in fixtures:
        match_id = fixture.get("match_id", "<missing-match-id>")
        spec = expected_specs.get(match_id)
        if spec is None:
            continue
        source = load_json(data_directory / spec["source_fixture"])
        fixture_players = _players(fixture)
        source_players = _players(source)
        assignments = _assignment_map(spec)
        for player_id in ("A", "B"):
            player = fixture_players.get(player_id, {})
            source_player = source_players.get(player_id, {})
            if _identity_sequence(player) != _identity_sequence(source_player):
                errors.append(f"{match_id} {player_id} physical or initial identity changed")
                continue
            deck = player.get("deck_order_top_to_bottom", [])
            source_deck = source_player.get("deck_order_top_to_bottom", [])
            expected_cards = [
                assignments.get((player_id, position), row["card_id"])
                for position, row in enumerate(source_deck, 1)
            ]
            if [row.get("card_id") for row in deck] != expected_cards:
                errors.append(f"{match_id} {player_id} differs from declared deck assignments")
            expected_hand = [row.get("initial_instance_id") for row in deck[:5]]
            if player.get("initial_hand") != expected_hand:
                errors.append(f"{match_id} {player_id} initial hand must equal the top five")

        all_cards = [
            card
            for player in fixture_players.values()
            for card in player.get("deck_order_top_to_bottom", [])
        ]
        ids = {row.get("card_id") for row in all_cards}
        if not ids <= current_ids or ids & forbidden:
            errors.append(f"{match_id} must use current-452 cards only")
        for requirement in spec.get("required_inventory", []):
            deck = fixture_players.get(requirement["player_id"], {}).get(
                "deck_order_top_to_bottom", []
            )
            count = sum(row.get("card_id") == requirement["card_id"] for row in deck)
            if count != requirement["count"]:
                errors.append(f"{match_id} required inventory count differs: {requirement['card_id']}")

        if (fixture.get("record", {}).get("status") != "fixture" or
                fixture.get("record", {}).get("events") != [] or
                fixture.get("record", {}).get("result", {}).get("winner") is not None):
            errors.append(f"{match_id} must remain an unplayed fixture")
        if fixture.get("test_plan", {}).get("strata") != [
                "current-452", spec["source_cluster"], spec["fixture_group"],
                spec["focus_card_id"], "checkpoint-112-unplayed"]:
            errors.append(f"{match_id} fixture strata differ")
        for error in validate_record(fixture, catalog):
            errors.append(f"{match_id}: {error}")
    return errors


def write_gap_fixtures(fixtures, output_directory):
    output = Path(output_directory)
    output.mkdir(parents=True, exist_ok=True)
    for fixture in fixtures:
        (output / fixture_filename(fixture)).write_text(
            json.dumps(fixture, ensure_ascii=False, indent=2) + "\n"
        )


def validate_materialized_fixtures(fixtures, output_directory):
    output = Path(output_directory)
    expected = {fixture_filename(row): row for row in fixtures}
    actual_names = {path.name for path in output.glob("*.json")}
    errors = []
    if actual_names != set(expected):
        errors.append("materialized fixture filenames must equal builder output")
    for name in sorted(actual_names & set(expected)):
        try:
            materialized = load_json(output / name)
        except (OSError, json.JSONDecodeError):
            errors.append(f"materialized fixture is not valid JSON: {name}")
            continue
        if materialized != expected[name]:
            errors.append(f"materialized fixture differs from builder output: {name}")
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", default=DEFAULT_PLAN)
    parser.add_argument("--disposition", default=DEFAULT_DISPOSITION)
    parser.add_argument("--pool-layers", default=DEFAULT_POOL_LAYERS)
    parser.add_argument("--output-directory")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)

    plan_path = Path(args.plan)
    data_directory = plan_path.parent
    plan = load_json(plan_path)
    fixtures = build_gap_fixtures(plan, data_directory)
    errors = validate_gap_fixtures(
        fixtures, plan, load_json(args.disposition), load_json(args.pool_layers),
        load_current_catalog(), data_directory,
    )
    output = (Path(args.output_directory) if args.output_directory else
              data_directory / plan["output_directory"])
    if not errors and args.write:
        write_gap_fixtures(fixtures, output)
    if not errors and output.exists():
        errors.extend(validate_materialized_fixtures(fixtures, output))
    print(json.dumps({
        "valid": not errors,
        "fixture_count": len(fixtures),
        "completed_match_count": 0,
        "errors": errors,
    }, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
