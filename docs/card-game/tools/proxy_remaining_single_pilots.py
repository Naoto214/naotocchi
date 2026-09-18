#!/usr/bin/env python3
"""Materialize checkpoint-106 P97-01, P97-02 and P97-04 single pilots.

The six fixed transcripts exercise a stage-zero partner payoff, a same-turn
end reservation, and City Run after two face-up actions.  This is not a
general card-effect engine.
"""

import argparse
import copy
import json
from pathlib import Path

from proxy_record_validator import canonical_sha256, load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_PLAN = DATA / "proxy-remaining-single-plan-106-20260918.json"


def load_json(path):
    return json.loads(Path(path).read_text())


def _zero_payment():
    return {
        "time": 0,
        "hand_to_discard": [],
        "prepared_to_discard": [],
        "deck_to_bottom": [],
    }


def _derive_input(fixture, spec):
    record = copy.deepcopy(fixture)
    player = next(row for row in record["input"]["players"]
                  if row["player_id"] == "A")
    deck = player["deck_order_top_to_bottom"]
    for first_id, second_id in spec["swaps"]:
        positions = {row["initial_instance_id"]: index
                     for index, row in enumerate(deck)}
        first = positions[first_id]
        second = positions[second_id]
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
                "partner_stage": None,
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
           source=None, targets=None, payment=None, choice_ids=None,
           created=None, consumed=None):
    main_actions = {
        "place_first_date_partner", "play_first_date", "play_mini_golf",
        "birth_city_runner", "place_city_world", "equip_lunch_box",
        "equip_pillow", "resolve_city_peek", "play_city_run",
    }
    return {
        "seq": seq,
        "round": round_number,
        "turn_player": turn_player,
        "phase": ("turn_end_resolution" if action_type == "resolve_mini_golf_turn_end"
                  else "main" if action_type in main_actions else action_type),
        "actor": actor,
        "action_type": action_type,
        "source_instance_id": source,
        "target_instance_ids": targets or [],
        "payment": payment or _zero_payment(),
        "choice_ids": choice_ids or [],
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


def _paid(time):
    payment = _zero_payment()
    payment["time"] = time
    return payment


def _configure_record(record, plan, spec):
    cluster = spec["cluster"]
    record["match_id"] = spec["record_match_id"]
    record["design"].update(plan["design"])
    purposes = {
        "P97-01": (
            "交際段階0の既存こいびとを通常配置し、はじめてのデートで"
            "1枚引いてそだち+5する先後統制記録。"
        ),
        "P97-02": (
            "ミニゴルフをそのターン唯一のアクションとしてプレイし、"
            "同ターン終了時の予約を消費する先後統制記録。"
        ),
        "P97-04": (
            "メインととかいを配置し、表向きアクション2枚の後に"
            "とかいランで異なる2種類を取得する先後統制記録。"
        ),
    }
    record["test_plan"]["purpose"] = (
        purposes[cluster] + "勝率・先後差・カード強度の結論には数えない。"
    )
    record["test_plan"]["strata"] = [
        "current-452", cluster, "single", "controlled-manual-pilot",
        "completed", spec["seat_stratum"], "pilot-input-order-only",
    ]
    if cluster == "P97-04":
        record["input"]["declared_choices"] = [
            {
                "choice_id": "choice-p97-04-city-leave-top",
                "owner": "A", "kind": "deck_position", "value": "top",
                "note": "とかいで見たA-023#1を山札上へ戻す。",
            },
            {
                "choice_id": "choice-p97-04-take-play",
                "owner": "A", "kind": "take_revealed", "value": "A-023#1",
                "note": "とかいランであそびを選ぶ。",
            },
            {
                "choice_id": "choice-p97-04-take-event",
                "owner": "A", "kind": "take_revealed", "value": "A-036#1",
                "note": "とかいランでできごとを選ぶ。",
            },
            {
                "choice_id": "choice-p97-04-bottom-order",
                "owner": "A", "kind": "deck_bottom_order",
                "value": ["A-013#1", "A-014#1"],
                "note": "残るなかま2枚をこの順で山札下へ置く。",
            },
        ]
    else:
        record["input"]["declared_choices"] = []


def _apply_p97_01(state, seq, events, snapshots, round_number, turn_player):
    player = state["players"]["A"]
    partner = "A-016#1"
    focus = "A-001#1"
    if partner not in player["hand"] or focus not in player["hand"]:
        raise ValueError("P97-01 controlled line no longer matches its derived input")
    player["hand"].remove(partner)
    player["field"]["partner"] = partner
    player["field"]["partner_stage"] = 0
    seq += 1
    _append_event(events, snapshots, state, _event(
        seq, round_number, turn_player, "A", "place_first_date_partner",
        "A-016#1を交際段階0でAのこいびと枠へ通常配置。",
        source=partner,
    ))
    player["hand"].remove(focus)
    player["discard"].append(focus)
    player["time"] -= 1
    drawn = player["deck"].pop(0)
    player["hand"].append(drawn)
    player["growth"] += 5
    seq += 1
    _append_event(events, snapshots, state, _event(
        seq, round_number, turn_player, "A", "play_first_date",
        f"交際段階0のA-016#1を対象とし、{drawn}を1枚引いてAのそだち+5。",
        source=focus, targets=[partner], payment=_paid(1),
    ))
    return seq


def _apply_p97_02(state, seq, events, snapshots, round_number, turn_player,
                  spec):
    player = state["players"]["A"]
    focus = "A-001#1"
    reservation_id = f"reservation-106-mini-golf-{spec['seat_stratum']}"
    if focus not in player["hand"]:
        raise ValueError("P97-02 controlled line no longer matches its fixture")
    player["hand"].remove(focus)
    player["discard"].append(focus)
    player["time"] -= 1
    reservation = {
        "reservation_id": reservation_id,
        "source_instance_id": focus,
        "controller": "A",
        "target_instance_ids": [],
        "created_seq": seq + 1,
        "deadline": {"kind": "current_turn_end", "round": 1, "player": "A"},
        "uses_remaining": 1,
        "status": "active",
    }
    state["reservations"][reservation_id] = copy.deepcopy(reservation)
    seq += 1
    _append_event(events, snapshots, state, _event(
        seq, round_number, turn_player, "A", "play_mini_golf",
        "このターン唯一のアクションとしてミニゴルフをプレイし、ターン終了時予約を作る。",
        source=focus, payment=_paid(1), created=[reservation_id],
    ))
    player["growth"] += 5
    drawn = player["deck"].pop(0)
    player["hand"].append(drawn)
    reservation["uses_remaining"] = 0
    reservation["status"] = "consumed"
    state["reservations"][reservation_id] = copy.deepcopy(reservation)
    seq += 1
    _append_event(events, snapshots, state, _event(
        seq, round_number, turn_player, "A", "resolve_mini_golf_turn_end",
        f"終了時に唯一のアクション条件を満たし、Aのそだち+5、{drawn}を1枚引く。",
        source=focus, consumed=[reservation_id],
    ))
    return seq, reservation


def _move_hand_to_field(player, instance_id, field_key, time):
    player["hand"].remove(instance_id)
    if field_key == "prepared":
        player["field"][field_key].append(instance_id)
    else:
        player["field"][field_key] = instance_id
    player["time"] -= time


def _apply_p97_04(state, seq, events, snapshots, round_number, turn_player):
    player = state["players"]["A"]
    if round_number == 2:
        _move_hand_to_field(player, "A-002#1", "main", 2)
        seq += 1
        _append_event(events, snapshots, state, _event(
            seq, round_number, turn_player, "A", "birth_city_runner",
            "A-002#1をAのメイン枠へ通常たんじょう。",
            source="A-002#1", payment=_paid(2),
        ))
    elif round_number == 3:
        _move_hand_to_field(player, "A-020#1", "world", 2)
        seq += 1
        _append_event(events, snapshots, state, _event(
            seq, round_number, turn_player, "A", "place_city_world",
            "A-020#1のとかいをAのセカイ枠へ通常配置。",
            source="A-020#1", payment=_paid(2),
        ))
    elif round_number == 5:
        _move_hand_to_field(player, "A-032#1", "prepared", 2)
        seq += 1
        _append_event(events, snapshots, state, _event(
            seq, round_number, turn_player, "A", "equip_lunch_box",
            "A-032#1をA-002#1へ表向きでみにつける。",
            source="A-032#1", targets=["A-002#1"], payment=_paid(2),
        ))
        _move_hand_to_field(player, "A-035#1", "prepared", 2)
        seq += 1
        _append_event(events, snapshots, state, _event(
            seq, round_number, turn_player, "A", "equip_pillow",
            "A-035#1をA-002#1へ表向きでみにつけ、このターン2枚目のカードを出す。",
            source="A-035#1", targets=["A-002#1"], payment=_paid(2),
        ))
        peeked = player["deck"][0]
        if peeked != "A-023#1":
            raise ValueError("P97-04 city peek no longer sees A-023#1")
        seq += 1
        _append_event(events, snapshots, state, _event(
            seq, round_number, turn_player, "A", "resolve_city_peek",
            "とかいで山札上A-023#1を見て、そのまま一番上へ戻す。",
            source="A-020#1", choice_ids=["choice-p97-04-city-leave-top"],
        ))
        focus = "A-001#1"
        revealed = player["deck"][:4]
        if revealed != ["A-023#1", "A-036#1", "A-013#1", "A-014#1"]:
            raise ValueError("P97-04 City Run reveal no longer matches derived input")
        player["hand"].remove(focus)
        player["discard"].append(focus)
        player["time"] -= 1
        del player["deck"][:4]
        player["hand"].extend(revealed[:2])
        player["deck"].extend(revealed[2:])
        seq += 1
        _append_event(events, snapshots, state, _event(
            seq, round_number, turn_player, "A", "play_city_run",
            "山札上4枚を公開し、異なる種類のA-023#1（あそび）とA-036#1（できごと）を手札へ。A-013#1、A-014#1の順で山札下へ。",
            source=focus, payment=_paid(1), choice_ids=[
                "choice-p97-04-take-play", "choice-p97-04-take-event",
                "choice-p97-04-bottom-order",
            ],
        ))
    return seq


def build_remaining_single_pilot(fixture, plan, spec):
    record = _derive_input(fixture, spec)
    _configure_record(record, plan, spec)
    state = _initial_state(record)
    events = []
    snapshots = [_snapshot(0, "initial", state)]
    seq = 0
    reservation = None
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

            if turn_player == "A":
                if spec["cluster"] == "P97-01" and round_number == 1:
                    seq = _apply_p97_01(
                        state, seq, events, snapshots, round_number, turn_player
                    )
                elif spec["cluster"] == "P97-02" and round_number == 1:
                    seq, reservation = _apply_p97_02(
                        state, seq, events, snapshots, round_number, turn_player, spec
                    )
                elif spec["cluster"] == "P97-04" and round_number in (2, 3, 5):
                    seq = _apply_p97_04(
                        state, seq, events, snapshots, round_number, turn_player
                    )

            final_turn = round_number == 10 and turn_player == turn_order[-1]
            state["phase"] = "completed" if final_turn else "turn_complete"
            seq += 1
            _append_event(events, snapshots, state, _event(
                seq, round_number, turn_player, turn_player, "turn_end_pass",
                "任意行動なしでターン終了。",
            ))

    growth = {player_id: state["players"][player_id]["growth"]
              for player_id in ("A", "B")}
    winner = "A" if growth["A"] > growth["B"] else "draw"
    record["record"] = {
        "status": "completed",
        "events": events,
        "reservations": [reservation] if reservation else [],
        "result": {
            "winner": winner,
            "reason": (
                f"R10終了時のそだち比較がA {growth['A']}、B {growth['B']}。"
                + ("Aの勝利。" if winner == "A" else "同値で延長なし。")
            ),
            "rounds_completed": 10,
            "final_growth": growth,
            "notes": [
                "指定した焦点処理以外の任意行動を行わない統制記録。",
                "既存40枚とcard copy／initial instance IDを維持した。",
                "勝率、先後差、発動率、カード強度の結論には数えない。",
            ],
        },
    }
    trace = {
        "schema": "naotocchi.card_game.proxy_remaining_single_trace.v1",
        "trace_id": spec["trace_id"],
        "record_match_id": record["match_id"],
        "state_model": "checkpoint-106-controlled-single-state.v1",
        "snapshots": snapshots,
    }
    return {"record": record, "trace": trace}


def build_remaining_single_pilots(fixtures, plan):
    if len(fixtures) != len(plan["records"]):
        raise ValueError("fixture count must match checkpoint-106 record specs")
    return [
        build_remaining_single_pilot(fixture, plan, spec)
        for fixture, spec in zip(fixtures, plan["records"])
    ]


def validate_remaining_single_trace(record, trace):
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
            errors.append(f"trace snapshot {index} sha256 does not match canonical state")
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


def validate_remaining_single_pilots(pilots, catalog):
    errors = []
    if len(pilots) != 6:
        errors.append("remaining single pilots must contain exactly 6 records")
    for cluster in ("P97-01", "P97-02", "P97-04"):
        pair = [row for row in pilots
                if cluster in row.get("record", {}).get("test_plan", {}).get("strata", [])]
        first_players = [row["record"]["input"]["first_player"] for row in pair]
        if first_players != ["A", "B"]:
            errors.append(f"{cluster} must contain A-first then A-second records")
    for pilot in pilots:
        record = pilot.get("record", {})
        match_id = record.get("match_id", "<missing-match-id>")
        for error in validate_record(record, catalog):
            errors.append(f"{match_id}: {error}")
        for error in validate_remaining_single_trace(record, pilot.get("trace", {})):
            errors.append(f"{match_id}: {error}")
        strata = record.get("test_plan", {}).get("strata", [])
        if "P97-02" in strata:
            reservations = record.get("record", {}).get("reservations", [])
            if len(reservations) != 1 or reservations[0].get("status") != "consumed":
                errors.append(f"{match_id}: mini golf reservation must be consumed")
        if "P97-04" in strata:
            city_runs = [row for row in record.get("record", {}).get("events", [])
                         if row.get("action_type") == "play_city_run"]
            expected = [
                "choice-p97-04-take-play", "choice-p97-04-take-event",
                "choice-p97-04-bottom-order",
            ]
            if len(city_runs) != 1 or city_runs[0].get("choice_ids") != expected:
                errors.append(f"{match_id}: city run must record all three choices")
    return errors


def validate_materialized_remaining_single_pilots(pilots, record_directory,
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
                    f"materialized {label} {name} does not match deterministic builder"
                )
    return errors


def write_remaining_single_pilots(pilots, record_directory, trace_directory):
    record_directory = Path(record_directory)
    trace_directory = Path(trace_directory)
    record_directory.mkdir(parents=True, exist_ok=True)
    trace_directory.mkdir(parents=True, exist_ok=True)
    for pilot in pilots:
        record = pilot["record"]
        trace = pilot["trace"]
        (record_directory / f"{record['match_id']}.json").write_text(
            json.dumps(record, ensure_ascii=False, indent=2) + "\n"
        )
        (trace_directory / f"{trace['trace_id']}.json").write_text(
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
                for row in plan["records"]]
    pilots = build_remaining_single_pilots(fixtures, plan)
    errors = validate_remaining_single_pilots(pilots, load_current_catalog())
    if not errors and args.write:
        write_remaining_single_pilots(
            pilots,
            plan_path.parent / plan["record_output_directory"],
            plan_path.parent / plan["trace_output_directory"],
        )
    print(json.dumps({
        "valid": not errors,
        "completed_records": len(pilots),
        "events_per_record": [len(row["record"]["record"]["events"])
                              for row in pilots],
        "written": args.write and not errors,
        "errors": errors,
    }, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
