#!/usr/bin/env python3
"""Build and validate checkpoint-107 unplayed decision-match fixtures."""

import argparse
import copy
import json
from pathlib import Path

from proxy_record_validator import load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_PROTOCOL = DATA / "proxy-decision-protocol-107-20260918.json"


DECISION_PRIORITY = [
    "avoid_defeat_or_aborted_challenge",
    "maintain_or_prevent_growth_100",
    "maximize_certain_growth_difference",
    "maximize_time_balance",
    "maximize_hand_board_reservation_value",
]
TIE_BREAKERS = [
    "lower_time_payment",
    "fewer_cards_consumed",
    "lower_card_copy_id",
]
CHOICE_FIELDS = [
    "pre_decision_state",
    "legal_candidates",
    "selected_action",
    "runner_up_action",
    "reason_code",
    "payment",
    "targets",
    "chain",
    "public_information",
]
STOP_CONDITIONS = [
    "r10_final_comparison_completed",
    "early_victory_after_growth_100_maintenance",
    "decision_cannot_be_resolved_from_canonical_text",
    "record_integrity_failure",
]
RECORDED_NONTERMINAL_CONDITIONS = [
    "challenge_aborted_by_participant_departure",
]
EVALUATION_METRICS = [
    "winner",
    "legal_candidate_count",
    "selected_action_count",
    "unused_time",
    "use_count_by_card_type",
    "reservations",
    "reentries",
    "growth_progression",
    "unresolved_decisions",
]


def load_json(path):
    return json.loads(Path(path).read_text())


def fixture_filename(fixture):
    return f"{fixture['match_id']}.json"


def validate_protocol(protocol):
    errors = []
    if protocol.get("schema") != "naotocchi.card_game.proxy_decision_protocol.v1":
        errors.append("107 decision protocol schema is invalid")
    if protocol.get("decision_priority") != DECISION_PRIORITY:
        errors.append("107 decision priority must match the approved order")
    if protocol.get("tie_breakers") != TIE_BREAKERS:
        errors.append("107 tie breakers must match the approved order")
    if protocol.get("choice_record_required_fields") != CHOICE_FIELDS:
        errors.append("107 choice record fields must match the approved set")
    if "pass" not in protocol.get("required_candidate_kinds", []):
        errors.append("107 legal candidates must include pass")
    if protocol.get("information_policy") != "public_and_owner_known_only":
        errors.append("107 information policy must use only observable information")
    if protocol.get("may_use_opponent_hidden_information") is not False:
        errors.append("107 protocol must forbid opponent hidden information")
    if protocol.get("stop_conditions") != STOP_CONDITIONS:
        errors.append("107 stop conditions must match the approved set")
    if protocol.get("recorded_nonterminal_conditions") != RECORDED_NONTERMINAL_CONDITIONS:
        errors.append("107 nonterminal conditions must preserve challenge continuation")
    if protocol.get("evaluation_metrics") != EVALUATION_METRICS:
        errors.append("107 evaluation metrics must match the approved set")
    if protocol.get("completed_match_count") != 0:
        errors.append("107 must not contain completed matches")
    if len(protocol.get("fixtures", [])) != 2:
        errors.append("107 protocol must declare exactly two fixtures")
    return errors


def build_decision_fixtures(protocol):
    fixtures = []
    for spec in protocol["fixtures"]:
        fixture = copy.deepcopy(load_json(DATA / spec["source_fixture"]))
        fixture["match_id"] = spec["match_id"]
        fixture["design"].update(protocol["design"])
        fixture["test_plan"] = {
            "purpose": (
                "通常の意思決定を含む小規模対戦を108で実施するため、"
                "合法候補と判断理由を記録する先後入力を固定する。"
                "107では未実施fixtureであり、対戦結果・勝率・先後差・"
                "発動率・カード強度には数えない。"
            ),
            "strata": ["current-452", "normal-decision", spec["seat_stratum"]],
            "automated_game": False,
        }
        fixture["input"]["declared_choices"] = []
        fixture["record"] = {
            "status": "fixture",
            "events": [],
            "reservations": [],
            "result": {
                "winner": None,
                "reason": None,
                "rounds_completed": 0,
                "final_growth": {"A": 20, "B": 20},
                "notes": [
                    "未実施fixture。108で通常意思決定を記録するまで対戦結果へ数えない。"
                ],
            },
        }
        fixtures.append(fixture)
    return fixtures


def _players_by_id(fixture):
    return {
        player.get("player_id"): player
        for player in fixture.get("input", {}).get("players", [])
    }


def validate_decision_fixture_suite(fixtures, protocol, catalog):
    errors = list(validate_protocol(protocol))
    expected = {spec["match_id"]: spec for spec in protocol.get("fixtures", [])}
    actual_ids = [fixture.get("match_id") for fixture in fixtures]
    if len(fixtures) != 2 or set(actual_ids) != set(expected):
        errors.append("107 fixture IDs must equal the two protocol fixtures")

    for fixture in fixtures:
        match_id = fixture.get("match_id", "<missing-match-id>")
        spec = expected.get(match_id)
        if spec is None:
            continue
        source = load_json(DATA / spec["source_fixture"])
        source_players = _players_by_id(source)
        fixture_players = _players_by_id(fixture)
        for player_id in ("A", "B"):
            for key in ("deck_order_top_to_bottom", "initial_hand"):
                if fixture_players.get(player_id, {}).get(key) != source_players.get(
                        player_id, {}).get(key):
                    errors.append(
                        f"{match_id} must preserve source {player_id} {key}"
                    )
        record = fixture.get("record", {})
        result = record.get("result", {})
        if (record.get("status") != "fixture" or record.get("events") != [] or
                result.get("winner") is not None):
            errors.append(f"{match_id} must remain an unplayed fixture")
        for error in validate_record(fixture, catalog):
            errors.append(f"{match_id}: {error}")

    if len(fixtures) == 2:
        first_players = [fixture.get("input", {}).get("first_player") for fixture in fixtures]
        first_pair = _players_by_id(fixtures[0])
        second_pair = _players_by_id(fixtures[1])
        same_inputs = all(
            first_pair.get(player_id, {}).get(key) == second_pair.get(player_id, {}).get(key)
            for player_id in ("A", "B")
            for key in ("deck_order_top_to_bottom", "initial_hand")
        )
        if first_players != ["A", "B"] or not same_inputs:
            errors.append(
                "107 seat pair must preserve identical A/B deck order and initial hands"
            )
    return errors


def write_decision_fixtures(fixtures, output_directory):
    output = Path(output_directory)
    output.mkdir(parents=True, exist_ok=True)
    for fixture in fixtures:
        (output / fixture_filename(fixture)).write_text(
            json.dumps(fixture, ensure_ascii=False, indent=2) + "\n"
        )


def validate_materialized_suite(fixtures, output_directory):
    output = Path(output_directory)
    expected_names = {fixture_filename(fixture) for fixture in fixtures}
    actual_names = {path.name for path in output.glob("*.json")}
    errors = []
    if actual_names != expected_names:
        errors.append("generated fixture filenames must equal the builder output")
    fixtures_by_name = {fixture_filename(fixture): fixture for fixture in fixtures}
    for name in sorted(actual_names & expected_names):
        if load_json(output / name) != fixtures_by_name[name]:
            errors.append(f"generated fixture differs from builder output: {name}")
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--protocol", default=DEFAULT_PROTOCOL)
    parser.add_argument("--output-directory")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)

    protocol_path = Path(args.protocol)
    protocol = load_json(protocol_path)
    fixtures = build_decision_fixtures(protocol)
    errors = validate_decision_fixture_suite(
        fixtures, protocol, load_current_catalog()
    )
    output = (
        Path(args.output_directory)
        if args.output_directory
        else protocol_path.parent / protocol["output_directory"]
    )
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    if args.write:
        write_decision_fixtures(fixtures, output)
    if output.exists():
        errors = validate_materialized_suite(fixtures, output)
        if errors:
            print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
            return 1
    print(json.dumps({
        "valid": True,
        "fixture_count": len(fixtures),
        "completed_match_count": 0,
        "output_directory": str(output),
        "written": args.write,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
