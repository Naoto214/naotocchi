#!/usr/bin/env python3
"""Build and validate the checkpoint-101 unplayed proxy fixtures."""

import argparse
import copy
import json
from pathlib import Path

from proxy_record_validator import load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_MANIFEST = DATA / "proxy-fixture-plan-101-20260917.json"
DEFAULT_POOL_LAYERS = DATA / "proxy-pool-layers-20260917.json"


def load_json(path):
    return json.loads(Path(path).read_text())


def fixture_filename(fixture):
    return f"{fixture['match_id']}.json"


def _deck_card_ids(fixture):
    return {
        card["card_id"]
        for player in fixture["input"]["players"]
        for card in player["deck_order_top_to_bottom"]
    }


def _move_focus_to_top(deck, focus_sequence):
    for index, card_id in enumerate(focus_sequence):
        if deck[index]["card_id"] == card_id:
            continue
        source = next(
            (
                candidate
                for candidate in range(index + 1, len(deck))
                if deck[candidate]["card_id"] == card_id
            ),
            None,
        )
        if source is None:
            deck[index]["card_id"] = card_id
        else:
            deck[index]["card_id"], deck[source]["card_id"] = (
                deck[source]["card_id"],
                deck[index]["card_id"],
            )


def build_fixture_suite(manifest, base_fixture):
    fixtures = []
    replacements = manifest.get("baseline_replacements", {})
    for cluster in manifest["clusters"]:
        for variant in cluster["variants"]:
            fixture = copy.deepcopy(base_fixture)
            profile = variant["profile"]
            fixture["match_id"] = f"fixture-101-{cluster['id'].lower()}-{profile}"
            fixture["design"].update(manifest["design"])
            fixture["test_plan"]["purpose"] = (
                variant["purpose"]
                + " 未実施fixtureであり、対戦結果・発動率・強度には数えない。"
            )
            for player in fixture["input"]["players"]:
                deck = player["deck_order_top_to_bottom"]
                for card in deck:
                    card["card_id"] = replacements.get(card["card_id"], card["card_id"])
            player_a = next(
                row for row in fixture["input"]["players"]
                if row["player_id"] == "A"
            )
            _move_focus_to_top(player_a["deck_order_top_to_bottom"], variant["focus_sequence"])
            for player in fixture["input"]["players"]:
                player["initial_hand"] = [
                    card["initial_instance_id"]
                    for card in player["deck_order_top_to_bottom"][:5]
                ]
            fixture["test_plan"]["strata"] = ["current-452", cluster["id"], profile]
            if "I-c_egg_normal" in _deck_card_ids(fixture):
                fixture["test_plan"]["strata"].append(
                    "unregistered-item-separate-stratum"
                )
            fixture["record"] = copy.deepcopy(base_fixture["record"])
            fixtures.append(fixture)
    return fixtures


def validate_fixture_suite(fixtures, manifest, pool_layers, catalog):
    errors = []
    expected = {
        f"fixture-101-{cluster['id'].lower()}-{variant['profile']}": variant
        for cluster in manifest.get("clusters", [])
        for variant in cluster.get("variants", [])
    }
    if len(fixtures) != 18:
        errors.append("fixture suite must contain exactly 18 records")
    actual_ids = [fixture.get("match_id") for fixture in fixtures]
    if len(actual_ids) != len(set(actual_ids)):
        errors.append("fixture match IDs must be unique")
    if set(actual_ids) != set(expected):
        errors.append("fixture match IDs must equal the manifest variants")

    layers = pool_layers.get("layers", {})
    unregistered = {
        row["id"] for row in layers.get("current_unregistered_source", [])
    }
    excluded = {
        row["id"]
        for key in ("retired_legacy_test", "retired_archive", "hold")
        for row in layers.get(key, [])
    }
    for fixture in fixtures:
        match_id = fixture.get("match_id", "<missing-match-id>")
        variant = expected.get(match_id)
        if variant is not None:
            player_a = next(
                (
                    row for row in fixture.get("input", {}).get("players", [])
                    if row.get("player_id") == "A"
                ),
                None,
            )
            deck = player_a.get("deck_order_top_to_bottom", []) if player_a else []
            focus = variant["focus_sequence"]
            if [row.get("card_id") for row in deck[:len(focus)]] != focus:
                errors.append(
                    f"{match_id} A deck must start with the declared focus sequence"
                )
        ids = _deck_card_ids(fixture)
        if ids & excluded:
            errors.append(f"{match_id} contains excluded retired or HOLD card IDs")
        has_unregistered = bool(ids & unregistered)
        tagged = "unregistered-item-separate-stratum" in fixture.get(
            "test_plan", {}
        ).get("strata", [])
        if has_unregistered != tagged:
            errors.append(f"{match_id} unregistered-source stratum tag mismatch")
        for error in validate_record(fixture, catalog):
            errors.append(f"{match_id}: {error}")
    return errors


def write_fixture_suite(fixtures, output_directory):
    output = Path(output_directory)
    output.mkdir(parents=True, exist_ok=True)
    for fixture in fixtures:
        (output / fixture_filename(fixture)).write_text(
            json.dumps(fixture, ensure_ascii=False, indent=2) + "\n"
        )


def validate_materialized_suite(fixtures, output_directory):
    output = Path(output_directory)
    errors = []
    expected_names = {fixture_filename(fixture) for fixture in fixtures}
    actual_names = {path.name for path in output.glob("*.json")}
    if actual_names != expected_names:
        errors.append("generated fixture filenames must equal the builder output")
    by_name = {fixture_filename(fixture): fixture for fixture in fixtures}
    for name in sorted(actual_names & expected_names):
        if load_json(output / name) != by_name[name]:
            errors.append(f"generated fixture differs from builder output: {name}")
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", default=DEFAULT_MANIFEST)
    parser.add_argument("--base-fixture")
    parser.add_argument("--pool-layers", default=DEFAULT_POOL_LAYERS)
    parser.add_argument("--output-directory")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)

    manifest = load_json(args.manifest)
    manifest_path = Path(args.manifest)
    base_path = Path(args.base_fixture) if args.base_fixture else (
        manifest_path.parent / manifest["base_fixture"]
    )
    output = Path(args.output_directory) if args.output_directory else (
        manifest_path.parent / manifest["output_directory"]
    )
    fixtures = build_fixture_suite(manifest, load_json(base_path))
    errors = validate_fixture_suite(
        fixtures,
        manifest,
        load_json(args.pool_layers),
        load_current_catalog(),
    )
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    if args.write:
        write_fixture_suite(fixtures, output)
    if output.exists():
        errors = validate_materialized_suite(fixtures, output)
        if errors:
            print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
            return 1
    print(json.dumps({
        "valid": True,
        "fixture_count": len(fixtures),
        "output_directory": str(output),
        "written": args.write,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
