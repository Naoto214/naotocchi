#!/usr/bin/env python3
"""Materialize checkpoint-105 P97-05 controlled re-entry pilots.

The two fixed transcripts fill A's companion slots, replace C-bat, recover
that physical card with Animal Shogi, and normally replay it as generation 2.
This is not a general card-effect engine.
"""

import argparse
import copy
import json
from pathlib import Path

from proxy_record_validator import canonical_sha256, load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_PLAN = DATA / "proxy-reentry-plan-105-20260918.json"


def load_json(path):
    return json.loads(Path(path).read_text())


def _zero_payment():
    return {
        "time": 0,
        "hand_to_discard": [],
        "prepared_to_discard": [],
        "deck_to_bottom": [],
    }


def _derive_input(fixture, plan):
    record = copy.deepcopy(fixture)
    rule = plan["input_derivation"]
    player = next(row for row in record["input"]["players"]
                  if row["player_id"] == rule["player"])
    deck = player["deck_order_top_to_bottom"]
    for first_id, second_id in rule["swaps"]:
        positions = {row["initial_instance_id"]: index
                     for index, row in enumerate(deck)}
        first = positions[first_id]
        second = positions[second_id]
        deck[first], deck[second] = deck[second], deck[first]
    player["initial_hand"] = [row["initial_instance_id"] for row in deck[:5]]
    return record


def _initial_state(record):
    players = {}
    instances = {}
    for player in record["input"]["players"]:
        deck = player["deck_order_top_to_bottom"]
        player_id = player["player_id"]
        players[player_id] = {
            "time": 0,
            "growth": record["input"]["initial_growth"],
            "hand": [row["initial_instance_id"] for row in deck[:5]],
            "deck": [row["initial_instance_id"] for row in deck[5:]],
            "discard": [],
            "field": {
                "main": None,
                "companions": [],
                "partner": None,
                "world": None,
                "prepared": [],
            },
        }
        for card in deck:
            instances[card["initial_instance_id"]] = {
                "card_copy_id": card["card_copy_id"],
                "status": "active",
            }
    return {
        "round": 0,
        "turn_player": None,
        "phase": "before_match",
        "players": players,
        "instances": instances,
        "reservations": {},
    }


def _snapshot(event_seq, action_type, state):
    state_copy = copy.deepcopy(state)
    return {
        "event_seq": event_seq,
        "action_type": action_type,
        "sha256": canonical_sha256(state_copy),
        "state": state_copy,
    }


def _event(seq, round_number, turn_player, actor, action_type, result,
           source=None, targets=None, payment=None, transitions=None):
    action_types = {
        "place_bat", "place_box", "place_cat_friend",
        "replace_companion_for_chameleon", "play_animal_shogi",
        "replay_recovered_bat",
    }
    return {
        "seq": seq,
        "round": round_number,
        "turn_player": turn_player,
        "phase": "main" if action_type in action_types else action_type,
        "actor": actor,
        "action_type": action_type,
        "source_instance_id": source,
        "target_instance_ids": targets or [],
        "payment": payment or _zero_payment(),
        "choice_ids": [],
        "chain": {
            "chain_id": f"chain-{seq:03d}",
            "link_index": 1,
            "responds_to_seq": None,
        },
        "reservations_created": [],
        "reservations_consumed": [],
        "instance_transitions": transitions or [],
        "before_state_sha256": "",
        "after_state_sha256": "",
        "result": result,
    }


def _append_event(events, snapshots, state, event):
    event["before_state_sha256"] = snapshots[-1]["sha256"]
    event["after_state_sha256"] = canonical_sha256(state)
    events.append(event)
    snapshots.append(_snapshot(event["seq"], event["action_type"], state))


def _move_hand_to_companion(state, instance_id):
    player = state["players"]["A"]
    player["hand"].remove(instance_id)
    player["field"]["companions"].append(instance_id)


def build_reentry_pilot(fixture, plan, pair):
    record = _derive_input(fixture, plan)
    record["match_id"] = pair["record_match_id"]
    record["design"].update(plan["design"])
    record["test_plan"]["purpose"] = (
        "P97-05の既存40枚を順序だけ派生し、なかま満員交代で"
        "A-011#1を捨て札へ置き、どうぶつしょうぎで回収した後、"
        "通常再配置で同じ現物のA-011#2を作る。記録経路の統制"
        "パイロットであり、勝率・先後差・カード強度には数えない。"
    )
    record["test_plan"]["strata"] = [
        "current-452", "P97-05", "single", "controlled-manual-pilot",
        "completed", pair["seat_stratum"], "reentry-generation-2",
        "pilot-input-order-only",
    ]
    record["input"]["declared_choices"] = []

    state = _initial_state(record)
    events = []
    snapshots = [_snapshot(0, "initial", state)]
    seq = 0
    first_player = record["input"]["first_player"]
    turn_order = [first_player, "B" if first_player == "A" else "A"]

    placements = {
        1: ("A-011#1", "place_bat", "A-011#1をAのなかま枠へ通常配置。"),
        2: ("A-012#1", "place_box", "A-012#1をAのなかま枠へ通常配置。"),
        3: ("A-013#1", "place_cat_friend",
            "A-013#1をAのなかま枠へ通常配置し、3枠を満たす。"),
    }

    for round_number in range(1, 11):
        for turn_player in turn_order:
            player = state["players"][turn_player]
            state["round"] = round_number
            state["turn_player"] = turn_player
            state["phase"] = "action_window"
            player["time"] = round_number
            drawn = player["deck"].pop(0)
            player["hand"].append(drawn)
            seq += 1
            _append_event(events, snapshots, state, _event(
                seq, round_number, turn_player, turn_player, "turn_start_draw",
                f"時を{round_number}へ更新し、{drawn}を通常ドロー。",
            ))

            if turn_player == "A" and round_number in placements:
                instance_id, action_type, result = placements[round_number]
                _move_hand_to_companion(state, instance_id)
                seq += 1
                _append_event(events, snapshots, state, _event(
                    seq, round_number, turn_player, "A", action_type, result,
                    source=instance_id,
                ))

            if turn_player == "A" and round_number == 4:
                player = state["players"]["A"]
                old_bat = "A-011#1"
                chameleon = "A-014#1"
                player["field"]["companions"].remove(old_bat)
                player["discard"].append(old_bat)
                player["hand"].remove(chameleon)
                player["field"]["companions"].append(chameleon)
                seq += 1
                _append_event(events, snapshots, state, _event(
                    seq, round_number, turn_player, "A",
                    "replace_companion_for_chameleon",
                    "満員交代でA-011#1を捨て札へ置き、空いた枠へA-014#1を通常配置。",
                    source=chameleon, targets=[old_bat],
                ))

                animal_shogi = "A-001#1"
                player["hand"].remove(animal_shogi)
                player["discard"].append(animal_shogi)
                player["discard"].remove(old_bat)
                player["hand"].append(old_bat)
                player["time"] -= 2
                peeked = player["deck"][0]
                seq += 1
                _append_event(events, snapshots, state, _event(
                    seq, round_number, turn_player, "A", "play_animal_shogi",
                    f"A-011#1を捨て札から手札へ戻し、山札上{peeked}を見て一番上に戻す。",
                    source=animal_shogi, targets=[old_bat],
                    payment={
                        "time": 2,
                        "hand_to_discard": [],
                        "prepared_to_discard": [],
                        "deck_to_bottom": [],
                    },
                ))

            if turn_player == "A" and round_number == 5:
                player = state["players"]["A"]
                old_bat = "A-011#1"
                new_bat = "A-011#2"
                replaced = "A-012#1"
                player["field"]["companions"].remove(replaced)
                player["discard"].append(replaced)
                player["hand"].remove(old_bat)
                player["field"]["companions"].append(new_bat)
                state["instances"][old_bat]["status"] = "retired"
                state["instances"][new_bat] = {
                    "card_copy_id": "A-011", "status": "active"
                }
                transition = {
                    "card_copy_id": "A-011",
                    "from_instance_id": old_bat,
                    "to_instance_id": new_bat,
                    "reason": "zone_change",
                }
                seq += 1
                _append_event(events, snapshots, state, _event(
                    seq, round_number, turn_player, "A", "replay_recovered_bat",
                    "満員交代でA-012#1を捨て札へ置き、同じ現物A-011を新個体A-011#2として通常配置。",
                    source=old_bat, targets=[replaced], transitions=[transition],
                ))

            final_turn = round_number == 10 and turn_player == turn_order[-1]
            state["phase"] = "completed" if final_turn else "turn_complete"
            seq += 1
            _append_event(events, snapshots, state, _event(
                seq, round_number, turn_player, turn_player, "turn_end_pass",
                "任意行動なしでターン終了。",
            ))

    record["record"] = {
        "status": "completed",
        "events": events,
        "reservations": [],
        "result": {
            "winner": "draw",
            "reason": "R10終了時のそだち比較がA 20、B 20で同値。延長なし。",
            "rounds_completed": 10,
            "final_growth": {"A": 20, "B": 20},
            "notes": [
                "統制手順の記録パイロット。指定した人物配置・交代・回収・再配置以外の任意行動は行っていない。",
                "既存40枚のカードと現物IDを維持し、Aの既存8位置だけを入れ替えた派生入力。",
                "予約を作る実在カードはこのsingle経路にないため、架空の予約は記録していない。",
                "再登場の記録経路であり、勝率、先後差、カード強度を結論づけない。",
            ],
        },
    }
    trace = {
        "schema": "naotocchi.card_game.proxy_reentry_trace.v1",
        "trace_id": pair["trace_id"],
        "record_match_id": record["match_id"],
        "state_model": "checkpoint-105-controlled-reentry-state.v1",
        "snapshots": snapshots,
    }
    return {"record": record, "trace": trace}


def build_p97_05_reentry_pair(a_first_fixture, a_second_fixture, plan):
    return [
        build_reentry_pilot(fixture, plan, pair)
        for fixture, pair in zip((a_first_fixture, a_second_fixture), plan["pairs"])
    ]


def validate_reentry_trace(record, trace):
    errors = []
    events = record.get("record", {}).get("events", [])
    snapshots = trace.get("snapshots", [])
    if trace.get("record_match_id") != record.get("match_id"):
        errors.append("trace record_match_id must match the completed record")
    if len(snapshots) != len(events) + 1:
        errors.append("trace must contain the initial state and one after-state per event")
    if [row.get("event_seq") for row in snapshots] != list(range(len(events) + 1)):
        errors.append("trace event_seq must run from 0 through the event count")
    for index, snapshot in enumerate(snapshots):
        if snapshot.get("sha256") != canonical_sha256(snapshot.get("state")):
            label = "final" if index == len(snapshots) - 1 else str(index)
            errors.append(f"trace {label} snapshot sha256 does not match its canonical state")
    for index, event in enumerate(events, 1):
        if index >= len(snapshots):
            break
        if event.get("before_state_sha256") != snapshots[index - 1].get("sha256"):
            errors.append(f"record event {index} before hash does not match trace")
        if event.get("after_state_sha256") != snapshots[index].get("sha256"):
            errors.append(f"record event {index} after hash does not match trace")
    if snapshots:
        final_state = snapshots[-1].get("state", {})
        final_growth = {
            player_id: final_state.get("players", {}).get(player_id, {}).get("growth")
            for player_id in ("A", "B")
        }
        if final_growth != record.get("record", {}).get("result", {}).get("final_growth"):
            errors.append("trace final growth must match the completed result")
        if final_state.get("phase") != "completed":
            errors.append("trace final state phase must be completed")
        instances = final_state.get("instances", {})
        if instances.get("A-011#1", {}).get("status") != "retired":
            errors.append("trace must retire A-011#1 after re-entry")
        if instances.get("A-011#2") != {
                "card_copy_id": "A-011", "status": "active"}:
            errors.append("trace must activate A-011#2 for physical card A-011")
    return errors


def validate_reentry_pair(pilots, catalog):
    errors = []
    if len(pilots) != 2:
        errors.append("re-entry pilot pair must contain exactly 2 records")
    first_players = [
        row.get("record", {}).get("input", {}).get("first_player") for row in pilots
    ]
    if sorted(first_players) != ["A", "B"]:
        errors.append("re-entry pilot pair must contain first players A and B once each")
    for pilot in pilots:
        record = pilot.get("record", {})
        match_id = record.get("match_id", "<missing-match-id>")
        for error in validate_record(record, catalog):
            errors.append(f"{match_id}: {error}")
        for error in validate_reentry_trace(record, pilot.get("trace", {})):
            errors.append(f"{match_id}: {error}")
        transitions = [
            transition
            for event in record.get("record", {}).get("events", [])
            for transition in event.get("instance_transitions", [])
        ]
        if transitions != [{
                "card_copy_id": "A-011",
                "from_instance_id": "A-011#1",
                "to_instance_id": "A-011#2",
                "reason": "zone_change"}]:
            errors.append(f"{match_id}: must contain the exact A-011#1 to #2 transition")
        if record.get("record", {}).get("reservations") != []:
            errors.append(f"{match_id}: must not fabricate reservations")
    return errors


def validate_materialized_reentry_pilots(pilots, record_directory,
                                         trace_directory):
    errors = []
    record_directory = Path(record_directory)
    trace_directory = Path(trace_directory)
    expected_records = {
        f"{pilot['record']['match_id']}.json": pilot["record"]
        for pilot in pilots
    }
    expected_traces = {
        f"{pilot['trace']['trace_id']}.json": pilot["trace"]
        for pilot in pilots
    }
    for label, directory, expected in (
        ("record", record_directory, expected_records),
        ("trace", trace_directory, expected_traces),
    ):
        actual_names = ({path.name for path in directory.glob("*.json")}
                        if directory.is_dir() else set())
        if actual_names != set(expected):
            errors.append(
                f"materialized {label} files must be exactly "
                f"{sorted(expected)}; found {sorted(actual_names)}"
            )
        for name, expected_payload in expected.items():
            path = directory / name
            if not path.is_file():
                continue
            try:
                actual_payload = load_json(path)
            except (OSError, json.JSONDecodeError) as exc:
                errors.append(f"materialized {label} {name} is not readable JSON: {exc}")
                continue
            if actual_payload != expected_payload:
                errors.append(
                    f"materialized {label} {name} does not match the deterministic builder"
                )
    return errors


def write_reentry_pilots(pilots, record_directory, trace_directory):
    record_output = Path(record_directory)
    trace_output = Path(trace_directory)
    record_output.mkdir(parents=True, exist_ok=True)
    trace_output.mkdir(parents=True, exist_ok=True)
    for pilot in pilots:
        record = pilot["record"]
        trace = pilot["trace"]
        (record_output / f"{record['match_id']}.json").write_text(
            json.dumps(record, ensure_ascii=False, indent=2) + "\n"
        )
        (trace_output / f"{trace['trace_id']}.json").write_text(
            json.dumps(trace, ensure_ascii=False, indent=2) + "\n"
        )


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", default=DEFAULT_PLAN)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)
    plan_path = Path(args.plan)
    plan = load_json(plan_path)
    fixtures = [load_json(plan_path.parent / row["source_fixture"])
                for row in plan["pairs"]]
    pilots = build_p97_05_reentry_pair(fixtures[0], fixtures[1], plan)
    errors = validate_reentry_pair(pilots, load_current_catalog())
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    if args.write:
        write_reentry_pilots(
            pilots,
            plan_path.parent / plan["record_output_directory"],
            plan_path.parent / plan["trace_output_directory"],
        )
    print(json.dumps({
        "valid": True,
        "completed_records": len(pilots),
        "events_per_record": [len(row["record"]["record"]["events"])
                              for row in pilots],
        "transitions_per_record": [sum(
            len(event["instance_transitions"])
            for event in row["record"]["record"]["events"]
        ) for row in pilots],
        "written": args.write,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
