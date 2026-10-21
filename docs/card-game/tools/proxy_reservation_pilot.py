#!/usr/bin/env python3
"""Materialize checkpoint-104 P97-06 controlled reservation pilots.

This records two approved fixed transcripts: one reservation is consumed at
the next A turn start, and one expires because an R11 turn is never created.
It is not a general card-effect engine.
"""

import argparse
import copy
import json
from pathlib import Path

from proxy_record_validator import canonical_sha256, load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_PLAN = DATA / "proxy-reservation-plan-104-20260918.json"


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
    positions = {
        row["initial_instance_id"]: index for index, row in enumerate(deck)
    }
    first = positions[rule["first_instance_id"]]
    second = positions[rule["second_instance_id"]]
    deck[first], deck[second] = deck[second], deck[first]
    player["initial_hand"] = [row["initial_instance_id"] for row in deck[:5]]
    return record


def _initial_state(record):
    players = {}
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
    return {
        "round": 0,
        "turn_player": None,
        "phase": "before_match",
        "players": players,
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
           source=None, targets=None, payment=None, created=None, consumed=None):
    return {
        "seq": seq,
        "round": round_number,
        "turn_player": turn_player,
        "phase": "main" if action_type in {
            "prepare_toilet_paper", "play_breakout"
        } else action_type,
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
        "reservations_created": created or [],
        "reservations_consumed": consumed or [],
        "instance_transitions": [],
        "before_state_sha256": "",
        "after_state_sha256": "",
        "result": result,
    }


def _append_event(events, snapshots, state, event):
    event["before_state_sha256"] = snapshots[-1]["sha256"]
    event["after_state_sha256"] = canonical_sha256(state)
    events.append(event)
    snapshots.append(_snapshot(event["seq"], event["action_type"], state))


def build_reservation_pilot(fixture, plan, pair):
    record = _derive_input(fixture, plan)
    record["match_id"] = pair["record_match_id"]
    record["design"].update(plan["design"])
    record["test_plan"]["purpose"] = (
        "P97-06の先後鏡像を派生させ、BがR1に既存のトイレットペーパーを"
        "しかけ、Aのブロックくずし予約を消費またはR10後に失効させる。"
        "記録経路の統制パイロットであり、勝率・先後差・カード強度には数えない。"
    )
    record["test_plan"]["strata"] = [
        "current-452", "P97-06", "single", "controlled-manual-pilot",
        "completed", pair["seat_stratum"], pair["terminal_path"],
        "pilot-input-order-only",
    ]
    record["input"]["declared_choices"] = []

    state = _initial_state(record)
    events = []
    snapshots = [_snapshot(0, "initial", state)]
    seq = 0
    first_player = record["input"]["first_player"]
    turn_order = [first_player, "B" if first_player == "A" else "A"]
    reservation_id = f"reservation-104-breakout-{pair['seat_stratum']}"
    reservation = None

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

            if turn_player == "A" and reservation is not None:
                tracked = state["reservations"][reservation_id]
                if (tracked["status"] == "active" and
                        reservation["deadline"]["round"] == round_number):
                    target = "B-034#1"
                    owner = state["players"]["B"]
                    if target in owner["field"]["prepared"]:
                        owner["field"]["prepared"].remove(target)
                        owner["hand"].append(target)
                        tracked["status"] = "consumed"
                        tracked["uses_remaining"] = 0
                        reservation["status"] = "consumed"
                        reservation["uses_remaining"] = 0
                        seq += 1
                        _append_event(events, snapshots, state, _event(
                            seq, round_number, turn_player, "A",
                            "execute_breakout_reservation",
                            "追跡したB-034#1が相手の準備枠に残っているため、持ち主Bの手札へ戻す。",
                            source="A-001#1", targets=[target],
                            consumed=[reservation_id],
                        ))

            if round_number == 1 and turn_player == "B":
                target = "B-034#1"
                if target not in player["hand"]:
                    raise ValueError("P97-06 pilot target is not in B's derived initial hand")
                player["hand"].remove(target)
                player["field"]["prepared"].append(target)
                player["time"] -= 1
                seq += 1
                _append_event(events, snapshots, state, _event(
                    seq, round_number, turn_player, "B", "prepare_toilet_paper",
                    "B-034#1を裏向きでBの準備枠へ置く。",
                    source=target,
                    payment={
                        "time": 1,
                        "hand_to_discard": [],
                        "prepared_to_discard": [],
                        "deck_to_bottom": [],
                    },
                ))

            if round_number == pair["breakout_round"] and turn_player == "A":
                focus = "A-001#1"
                target = "B-034#1"
                if focus not in player["hand"] or target not in state["players"]["B"]["field"]["prepared"]:
                    raise ValueError("P97-06 controlled line no longer matches its derived input")
                player["hand"].remove(focus)
                player["discard"].append(focus)
                player["time"] -= 2
                reservation = {
                    "reservation_id": reservation_id,
                    "source_instance_id": focus,
                    "controller": "A",
                    "target_instance_ids": [target],
                    "created_seq": seq + 1,
                    "deadline": {
                        "kind": "next_own_turn_start",
                        "round": pair["deadline_round"],
                        "player": "A",
                    },
                    "uses_remaining": 1,
                    "status": "active",
                }
                state["reservations"][reservation_id] = copy.deepcopy(reservation)
                seq += 1
                _append_event(events, snapshots, state, _event(
                    seq, round_number, turn_player, "A", "play_breakout",
                    f"B-034#1を対象に、Aの次のターン開始時の予約{reservation_id}を作る。",
                    source=focus, targets=[target],
                    payment={
                        "time": 2,
                        "hand_to_discard": [],
                        "prepared_to_discard": [],
                        "deck_to_bottom": [],
                    },
                    created=[reservation_id],
                ))

            final_turn = round_number == 10 and turn_player == turn_order[-1]
            if final_turn and reservation is not None and reservation["status"] == "active":
                reservation["status"] = "expired"
                state["reservations"][reservation_id]["status"] = "expired"
            state["phase"] = "completed" if final_turn else "turn_complete"
            seq += 1
            result_text = "任意行動なしでターン終了。"
            if final_turn and reservation is not None and reservation["status"] == "expired":
                result_text += "R11を作らず、未実行のブロックくずし予約を失効。"
            _append_event(events, snapshots, state, _event(
                seq, round_number, turn_player, turn_player, "turn_end_pass",
                result_text,
            ))

    if reservation is None:
        raise ValueError("P97-06 controlled line did not create a reservation")
    record["record"] = {
        "status": "completed",
        "events": events,
        "reservations": [reservation],
        "result": {
            "winner": "draw",
            "reason": "R10終了時のそだち比較がA 20、B 20で同値。延長なし。",
            "rounds_completed": 10,
            "final_growth": {"A": 20, "B": 20},
            "notes": [
                "統制手順の記録パイロット。指定した設置とブロックくずし以外の任意行動は行っていない。",
                "既存40枚のカードと現物IDを維持し、B-034#1だけを初手へ並べ替えた派生入力。",
                "消費／失効の記録経路であり、勝率、先後差、カード強度を結論づけない。",
            ],
        },
    }
    trace = {
        "schema": "naotocchi.card_game.proxy_reservation_trace.v1",
        "trace_id": pair["trace_id"],
        "record_match_id": record["match_id"],
        "state_model": "checkpoint-104-controlled-reservation-state.v1",
        "snapshots": snapshots,
    }
    return {"record": record, "trace": trace}


def build_p97_06_reservation_pair(a_first_fixture, a_second_fixture, plan):
    return [
        build_reservation_pilot(fixture, plan, pair)
        for fixture, pair in zip((a_first_fixture, a_second_fixture), plan["pairs"])
    ]


def validate_reservation_trace(record, trace):
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
        for reservation in record.get("record", {}).get("reservations", []):
            traced = final_state.get("reservations", {}).get(
                reservation.get("reservation_id"), {}
            )
            if (traced.get("status") != reservation.get("status") or
                    traced.get("uses_remaining") != reservation.get("uses_remaining")):
                errors.append("trace final reservation state must match the completed record")
    return errors


def validate_reservation_pair(pilots, catalog):
    errors = []
    if len(pilots) != 2:
        errors.append("reservation pilot pair must contain exactly 2 records")
    first_players = [
        row.get("record", {}).get("input", {}).get("first_player") for row in pilots
    ]
    if sorted(first_players) != ["A", "B"]:
        errors.append("reservation pilot pair must contain first players A and B once each")
    statuses = [
        row.get("record", {}).get("record", {}).get("reservations", [{}])[0].get("status")
        for row in pilots
    ]
    if statuses != ["consumed", "expired"]:
        errors.append("reservation pilot statuses must be consumed and expired")
    for pilot in pilots:
        record = pilot.get("record", {})
        match_id = record.get("match_id", "<missing-match-id>")
        for error in validate_record(record, catalog):
            errors.append(f"{match_id}: {error}")
        for error in validate_reservation_trace(record, pilot.get("trace", {})):
            errors.append(f"{match_id}: {error}")
    return errors


def validate_materialized_reservation_pilots(pilots, record_directory,
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


def write_reservation_pilots(pilots, record_directory, trace_directory):
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
    pilots = build_p97_06_reservation_pair(fixtures[0], fixtures[1], plan)
    errors = validate_reservation_pair(pilots, load_current_catalog())
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    if args.write:
        write_reservation_pilots(
            pilots,
            plan_path.parent / plan["record_output_directory"],
            plan_path.parent / plan["trace_output_directory"],
        )
    print(json.dumps({
        "valid": True,
        "completed_records": len(pilots),
        "events_per_record": [len(row["record"]["record"]["events"])
                              for row in pilots],
        "reservation_statuses": [row["record"]["record"]["reservations"][0]["status"]
                                 for row in pilots],
        "written": args.write,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
