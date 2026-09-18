#!/usr/bin/env python3
"""Materialize and validate the checkpoint-103 controlled manual pilot logs.

This is deliberately not a card-effect engine.  It records the one approved
P97-03 line and computes canonical state hashes for that fixed transcript.
"""

import argparse
import copy
import json
from pathlib import Path

from proxy_record_validator import canonical_sha256, load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_PLAN = DATA / "proxy-pilot-plan-103-20260918.json"


def load_json(path):
    return json.loads(Path(path).read_text())


def _zero_payment():
    return {
        "time": 0,
        "hand_to_discard": [],
        "prepared_to_discard": [],
        "deck_to_bottom": [],
    }


def _initial_state(fixture):
    players = {}
    for player in fixture["input"]["players"]:
        deck = player["deck_order_top_to_bottom"]
        player_id = player["player_id"]
        players[player_id] = {
            "time": 0,
            "growth": fixture["input"]["initial_growth"],
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
    return {
        "round": 0,
        "turn_player": None,
        "phase": "before_match",
        "players": players,
    }


def _snapshot(event_seq, action_type, state):
    state_copy = copy.deepcopy(state)
    return {
        "event_seq": event_seq,
        "action_type": action_type,
        "sha256": canonical_sha256(state_copy),
        "state": state_copy,
    }


def _append_event(events, snapshots, state, event):
    event["before_state_sha256"] = snapshots[-1]["sha256"]
    event["after_state_sha256"] = canonical_sha256(state)
    events.append(event)
    snapshots.append(_snapshot(event["seq"], event["action_type"], state))


def _event(seq, round_number, turn_player, actor, action_type, result,
           source=None, payment=None, choice_ids=None):
    return {
        "seq": seq,
        "round": round_number,
        "turn_player": turn_player,
        "phase": "main" if action_type == "play_hit_blow" else action_type,
        "actor": actor,
        "action_type": action_type,
        "source_instance_id": source,
        "target_instance_ids": [],
        "payment": payment or _zero_payment(),
        "choice_ids": choice_ids or [],
        "chain": {
            "chain_id": f"chain-{seq:03d}",
            "link_index": 1,
            "responds_to_seq": None,
        },
        "reservations_created": [],
        "reservations_consumed": [],
        "instance_transitions": [],
        "before_state_sha256": "",
        "after_state_sha256": "",
        "result": result,
    }


def build_pilot_record(fixture, plan, pair):
    record = copy.deepcopy(fixture)
    record["match_id"] = pair["record_match_id"]
    record["design"].update(plan["design"])
    record["test_plan"]["purpose"] = (
        "P97-03の先後鏡像について、AがR1にヒット&ブローでメインを宣言し、"
        "ほかの任意行動を行わない統制手順をcompleted形式で記録する。"
        "記録経路のパイロットであり、勝率・先後差・カード強度の結論には数えない。"
    )
    record["test_plan"]["strata"] = [
        "current-452", "P97-03", "single", "controlled-manual-pilot",
        "completed", pair["seat_stratum"],
    ]
    record["input"]["declared_choices"] = [{
        "choice_id": "choice-p97-03-declare-main",
        "owner": "A",
        "kind": "declared_card_type",
        "value": "main",
        "note": "ヒット&ブローの発動時に、公開前のカード種としてメインを宣言。",
    }]

    state = _initial_state(record)
    events = []
    snapshots = [_snapshot(0, "initial", state)]
    seq = 0
    first_player = record["input"]["first_player"]
    turn_order = [first_player, "B" if first_player == "A" else "A"]

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

            if round_number == 1 and turn_player == "A":
                focus = "A-001#1"
                revealed = player["deck"].pop(0)
                if focus not in player["hand"] or revealed != "A-007#1":
                    raise ValueError("P97-03 controlled line no longer matches its fixture")
                player["hand"].remove(focus)
                player["hand"].append(revealed)
                player["discard"].append(focus)
                player["time"] -= 1
                player["growth"] += 5
                seq += 1
                _append_event(events, snapshots, state, _event(
                    seq, round_number, turn_player, "A", "play_hit_blow",
                    f"メインを宣言。A-007#1を公開して手札へ加え、Aのそだち+5。",
                    source=focus,
                    payment={
                        "time": 1,
                        "hand_to_discard": [],
                        "prepared_to_discard": [],
                        "deck_to_bottom": [],
                    },
                    choice_ids=["choice-p97-03-declare-main"],
                ))

            final_turn = round_number == 10 and turn_player == turn_order[-1]
            state["phase"] = "completed" if final_turn else "turn_complete"
            seq += 1
            _append_event(events, snapshots, state, _event(
                seq, round_number, turn_player, turn_player, "turn_end_pass",
                "両者が追加発動を行わず、任意行動なしでターン終了。",
            ))

    record["record"] = {
        "status": "completed",
        "events": events,
        "reservations": [],
        "result": {
            "winner": "A",
            "reason": "R10終了時のそだち比較でAが25、Bが20。",
            "rounds_completed": 10,
            "final_growth": {"A": 25, "B": 20},
            "notes": [
                "統制手順の手動パイロット。Aのヒット&ブロー以外の任意行動は行っていない。",
                "予約と個体遷移は実際に発生していないため空。後続のP97-06／P97-05で個別に試す。",
                "この2戦だけから勝率、先後差、カード強度を結論づけない。",
            ],
        },
    }
    trace = {
        "schema": "naotocchi.card_game.proxy_pilot_trace.v1",
        "trace_id": pair["trace_id"],
        "record_match_id": record["match_id"],
        "state_model": "checkpoint-103-controlled-pilot-state.v1",
        "snapshots": snapshots,
    }
    return {"record": record, "trace": trace}


def build_p97_03_pilot_pair(a_first_fixture, a_second_fixture, plan):
    fixtures = [a_first_fixture, a_second_fixture]
    return [
        build_pilot_record(fixture, plan, pair)
        for fixture, pair in zip(fixtures, plan["pairs"])
    ]


def validate_trace(record, trace):
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
            errors.append(
                f"trace snapshot {index} sha256 does not match its canonical state"
            )
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
    return errors


def validate_pilot_pair(pilots, catalog):
    errors = []
    if len(pilots) != 2:
        errors.append("pilot pair must contain exactly 2 records")
    first_players = [
        pilot.get("record", {}).get("input", {}).get("first_player")
        for pilot in pilots
    ]
    if sorted(first_players) != ["A", "B"]:
        errors.append("pilot pair must contain first players A and B once each")
    for pilot in pilots:
        record = pilot.get("record", {})
        match_id = record.get("match_id", "<missing-match-id>")
        if record.get("record", {}).get("reservations"):
            errors.append(
                f"{match_id} must have no reservations in this controlled pilot"
            )
        transitions = [
            transition
            for event in record.get("record", {}).get("events", [])
            for transition in event.get("instance_transitions", [])
        ]
        if transitions:
            errors.append(
                f"{match_id} must have no instance transitions in this controlled pilot"
            )
        for error in validate_record(record, catalog):
            errors.append(f"{match_id}: {error}")
        for error in validate_trace(record, pilot.get("trace", {})):
            errors.append(f"{match_id}: {error}")
    return errors


def write_pilots(pilots, record_directory, trace_directory):
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


def validate_materialized_pilots(pilots, record_directory, trace_directory):
    errors = []
    record_output = Path(record_directory)
    trace_output = Path(trace_directory)
    expected_records = {
        f"{pilot['record']['match_id']}.json": pilot["record"] for pilot in pilots
    }
    expected_traces = {
        f"{pilot['trace']['trace_id']}.json": pilot["trace"] for pilot in pilots
    }
    actual_records = {
        path.name for path in record_output.glob("*.json")
    } if record_output.exists() else set()
    actual_traces = {
        path.name for path in trace_output.glob("*.json")
    } if trace_output.exists() else set()
    if actual_records != set(expected_records):
        errors.append("materialized pilot record filenames must equal the plan")
    if actual_traces != set(expected_traces):
        errors.append("materialized pilot trace filenames must equal the plan")
    for name in sorted(actual_records & set(expected_records)):
        if load_json(record_output / name) != expected_records[name]:
            errors.append(f"materialized pilot record differs from builder output: {name}")
    for name in sorted(actual_traces & set(expected_traces)):
        if load_json(trace_output / name) != expected_traces[name]:
            errors.append(f"materialized pilot trace differs from builder output: {name}")
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", default=DEFAULT_PLAN)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)
    plan_path = Path(args.plan)
    plan = load_json(plan_path)
    fixtures = [load_json(plan_path.parent / pair["source_fixture"]) for pair in plan["pairs"]]
    pilots = build_p97_03_pilot_pair(fixtures[0], fixtures[1], plan)
    errors = validate_pilot_pair(pilots, load_current_catalog())
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    record_output = plan_path.parent / plan["record_output_directory"]
    trace_output = plan_path.parent / plan["trace_output_directory"]
    if args.write:
        write_pilots(pilots, record_output, trace_output)
    if record_output.exists() or trace_output.exists():
        errors = validate_materialized_pilots(pilots, record_output, trace_output)
        if errors:
            print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
            return 1
    print(json.dumps({
        "valid": True,
        "completed_records": len(pilots),
        "events_per_record": [len(row["record"]["record"]["events"]) for row in pilots],
        "record_output_directory": str(record_output),
        "trace_output_directory": str(trace_output),
        "written": args.write,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
