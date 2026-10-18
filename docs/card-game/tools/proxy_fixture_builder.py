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


def build_single_seat_mirrors(source_fixtures, mirror_manifest):
    """Copy the six 101 single fixtures and change only seat-facing metadata."""
    sources = {fixture["match_id"]: fixture for fixture in source_fixtures}
    mirrors = []
    for pair in mirror_manifest["pairs"]:
        source = sources[pair["source_match_id"]]
        mirror = copy.deepcopy(source)
        mirror["match_id"] = pair["mirror_match_id"]
        mirror["design"].update(mirror_manifest["design"])
        mirror["test_plan"]["purpose"] = (
            f"{pair['source_match_id']}と同じA/Bの山札順・初手・個体IDを保ち、"
            "A後手／B先手だけを反転した鏡像入力。未実施fixtureであり、"
            "対戦結果・発動率・強度には数えない。"
        )
        mirror["test_plan"]["strata"] = (
            list(source["test_plan"]["strata"]) + ["a-second-seat-mirror"]
        )
        mirror["input"]["first_player"] = mirror_manifest[
            "mirrored_first_player"
        ]
        for player in mirror["input"]["players"]:
            player["seat"] = "second" if player["player_id"] == "A" else "first"
        mirrors.append(mirror)
    return mirrors


def validate_seat_mirror_suite(mirrors, source_fixtures, mirror_manifest, catalog):
    errors = []
    sources = {fixture.get("match_id"): fixture for fixture in source_fixtures}
    expected = {
        pair["mirror_match_id"]: pair for pair in mirror_manifest.get("pairs", [])
    }
    if len(mirrors) != 6:
        errors.append("seat mirror suite must contain exactly 6 records")
    actual_ids = [mirror.get("match_id") for mirror in mirrors]
    if len(actual_ids) != len(set(actual_ids)):
        errors.append("seat mirror match IDs must be unique")
    if set(actual_ids) != set(expected):
        errors.append("seat mirror match IDs must equal the manifest pairs")

    for mirror in mirrors:
        match_id = mirror.get("match_id", "<missing-match-id>")
        pair = expected.get(match_id)
        source = sources.get(pair.get("source_match_id")) if pair else None
        if source is None:
            errors.append(f"{match_id} must reference an existing 101 source")
            continue
        mirror_players = {
            row.get("player_id"): row
            for row in mirror.get("input", {}).get("players", [])
        }
        source_players = {
            row.get("player_id"): row
            for row in source.get("input", {}).get("players", [])
        }
        for player_id in ("A", "B"):
            mirror_player = mirror_players.get(player_id, {})
            source_player = source_players.get(player_id, {})
            if mirror_player.get("deck_order_top_to_bottom") != source_player.get(
                    "deck_order_top_to_bottom"):
                errors.append(
                    f"{match_id} {player_id} deck order must equal its 101 single source"
                )
            if mirror_player.get("initial_hand") != source_player.get("initial_hand"):
                errors.append(
                    f"{match_id} {player_id} initial hand must equal its 101 single source"
                )
        if (mirror.get("input", {}).get("first_player") != "B" or
                mirror_players.get("A", {}).get("seat") != "second" or
                mirror_players.get("B", {}).get("seat") != "first"):
            errors.append(f"{match_id} seats must be A second and B first")
        if "a-second-seat-mirror" not in mirror.get("test_plan", {}).get(
                "strata", []):
            errors.append(f"{match_id} must carry the A-second mirror stratum")
        for error in validate_record(mirror, catalog):
            errors.append(f"{match_id}: {error}")
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", default=DEFAULT_MANIFEST)
    parser.add_argument("--base-fixture")
    parser.add_argument("--pool-layers", default=DEFAULT_POOL_LAYERS)
    parser.add_argument("--output-directory")
    parser.add_argument("--mirror-manifest")
    parser.add_argument("--mirror-output-directory")
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
    if args.mirror_manifest:
        mirror_manifest_path = Path(args.mirror_manifest)
        mirror_manifest = load_json(mirror_manifest_path)
        mirrors = build_single_seat_mirrors(fixtures, mirror_manifest)
        errors = validate_seat_mirror_suite(
            mirrors, fixtures, mirror_manifest, load_current_catalog()
        )
        mirror_output = (
            Path(args.mirror_output_directory)
            if args.mirror_output_directory
            else mirror_manifest_path.parent / mirror_manifest["output_directory"]
        )
        if errors:
            print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
            return 1
        if args.write:
            write_fixture_suite(mirrors, mirror_output)
        if mirror_output.exists():
            errors = validate_materialized_suite(mirrors, mirror_output)
            if errors:
                print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
                return 1
        print(json.dumps({
            "valid": True,
            "fixture_count": len(mirrors),
            "output_directory": str(mirror_output),
            "written": args.write,
        }, ensure_ascii=False, indent=2))
        return 0
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
