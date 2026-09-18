#!/usr/bin/env python3
"""Build checkpoint-109 fixed same-name-two decision transcripts.

This is a deterministic transcript materializer, not a general game engine or
complete legality checker.  It preserves each 101 fixture's physical cards and
only swaps the minimum prerequisite positions listed in the checkpoint plan.
"""

import argparse
import copy
import json
from pathlib import Path

from proxy_normal_decision_pilot import _legal_candidates as _base_legal_candidates
from proxy_record_validator import canonical_sha256, load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_PLAN = DATA / "proxy-same-name-two-plan-109-20260918.json"
CARD_TYPES = ["main", "companion", "partner", "world", "play", "item", "event"]


def load_json(path):
    return json.loads(Path(path).read_text())


def _zero_payment():
    return {"time": 0, "hand_to_discard": [], "prepared_to_discard": [],
            "deck_to_bottom": []}


def _card_type(card_id):
    return {"M": "main", "C": "companion", "P": "partner", "W": "world",
            "G": "play", "I": "item", "E": "event"}[card_id[0]]


def _copy_id(instance_id):
    return instance_id.split("#", 1)[0]


def _derive_input(fixture, spec):
    record = copy.deepcopy(fixture)
    for player_id, swaps in spec.get("swaps", {}).items():
        player = next(row for row in record["input"]["players"]
                      if row["player_id"] == player_id)
        deck = player["deck_order_top_to_bottom"]
        for first_id, second_id in swaps:
            positions = {row["initial_instance_id"]: index
                         for index, row in enumerate(deck)}
            deck[positions[first_id]], deck[positions[second_id]] = (
                deck[positions[second_id]], deck[positions[first_id]])
        player["initial_hand"] = [row["initial_instance_id"] for row in deck[:5]]
    return record


def _initial_state(record):
    cards = {}
    players = {}
    for source in record["input"]["players"]:
        player_id = source["player_id"]
        for row in source["deck_order_top_to_bottom"]:
            cards[row["initial_instance_id"]] = {
                "card_id": row["card_id"], "card_copy_id": row["card_copy_id"],
                "card_type": _card_type(row["card_id"]),
            }
        deck = [row["initial_instance_id"] for row in source["deck_order_top_to_bottom"]]
        players[player_id] = {
            "time": 0, "growth": record["input"]["initial_growth"],
            "hand": deck[:5], "deck": deck[5:], "discard": [],
            "field": {"main": None, "companions": [], "partner": None,
                      "partner_stage": None, "world": None, "prepared": []},
            "challenge_used": False, "person_placed": False,
            "relationship_progressed": False,
        }
    return {"round": 0, "turn_player": None, "phase": "before_match",
            "players": players, "cards": cards, "reservations": {}}


def _canonical_state(state):
    result = copy.deepcopy(state)
    result.pop("cards", None)
    return result


def _snapshot(event_seq, action_type, state):
    payload = _canonical_state(state)
    return {"event_seq": event_seq, "action_type": action_type,
            "sha256": canonical_sha256(payload), "state": payload}


def _event(seq, state, actor, action_type, result, source=None, targets=None,
           payment=None, choice_ids=None, created=None, consumed=None,
           transitions=None, phase="main"):
    return {
        "seq": seq, "round": state["round"], "turn_player": state["turn_player"],
        "phase": phase, "actor": actor, "action_type": action_type,
        "source_instance_id": source, "target_instance_ids": targets or [],
        "payment": payment or _zero_payment(), "choice_ids": choice_ids or [],
        "chain": {"chain_id": f"chain-{seq:03d}", "link_index": 1,
                  "responds_to_seq": None},
        "reservations_created": created or [], "reservations_consumed": consumed or [],
        "instance_transitions": transitions or [], "before_state_sha256": "",
        "after_state_sha256": "", "result": result,
    }


def _append_event(events, snapshots, state, event):
    event["before_state_sha256"] = snapshots[-1]["sha256"]
    event["after_state_sha256"] = canonical_sha256(_canonical_state(state))
    events.append(event)
    snapshots.append(_snapshot(event["seq"], event["action_type"], state))


def _candidate(action, source=None, targets=None, payment=0):
    return {"candidate_id": f"candidate-{action}-{source or 'none'}",
            "kind": "legal_action", "action_type": action,
            "source_instance_id": source, "target_instance_ids": targets or [],
            "payment_time": payment}


def _pass_candidate():
    return {"candidate_id": "candidate-pass", "kind": "pass",
            "action_type": "pass", "source_instance_id": None,
            "target_instance_ids": [], "payment_time": 0}


def _candidate_pool(state, actor, scheduled_actions=()):
    candidates = _base_legal_candidates(state, actor)
    by_id = {row["candidate_id"]: row for row in candidates}
    player = state["players"][actor]
    for action_type, source, targets, cost in scheduled_actions:
        source_available = (source in player["hand"] or source == player["field"]["main"]
                            or action_type == "challenge")
        if source_available and cost <= player["time"]:
            row = _candidate(action_type, source, targets, cost)
            by_id[row["candidate_id"]] = row
    return list(by_id.values())


def _decision(decision_seq, event_seq, state, actor, selected, reason, candidates):
    opponent = "B" if actor == "A" else "A"
    player = state["players"][actor]
    other = state["players"][opponent]
    if selected["candidate_id"] not in {row["candidate_id"] for row in candidates}:
        candidates = [selected] + candidates
    payment = _zero_payment()
    payment["time"] = selected.get("payment_time", 0)
    return {
        "decision_id": f"decision-{decision_seq:03d}", "decision_seq": decision_seq,
        "event_seq": event_seq, "actor": actor, "round": state["round"],
        "pre_decision_state": {"hand": copy.deepcopy(player["hand"]),
                               "field": copy.deepcopy(player["field"]),
                               "time": player["time"], "growth": player["growth"],
                               "reservations": copy.deepcopy(list(state["reservations"].values()))},
        "legal_candidates": candidates, "selected_action": copy.deepcopy(selected),
        "runner_up_action": None if selected["kind"] == "pass" else _pass_candidate(),
        "reason_code": reason, "payment": payment,
        "targets": copy.deepcopy(selected.get("target_instance_ids", [])),
        "chain": {"chain_id": f"chain-{event_seq:03d}", "responds_to_seq": None},
        "public_information": {
            "information_policy": "public_and_owner_known_only",
            "own_hand": copy.deepcopy(player["hand"]),
            "own_field": copy.deepcopy(player["field"]),
            "opponent_field": copy.deepcopy(other["field"]),
            "growth": {actor: player["growth"], opponent: other["growth"]},
            "time": {actor: player["time"], opponent: other["time"]},
            "discard": {actor: copy.deepcopy(player["discard"]),
                        opponent: copy.deepcopy(other["discard"])},
            "reservations": copy.deepcopy(list(state["reservations"].values())),
        },
    }


def _schedule(cluster):
    schedules = {
        "P97-01": {("A", 1): [("place_partner", "A-016#1", [], 0),
                                ("play_first_date", "A-001#1", ["A-016#1"], 1)],
                    ("A", 2): [("play_first_date", "A-002#1", ["A-016#1"], 1)]},
        "P97-02": {("A", 1): [("place_companion", "A-001#1", [], 0)],
                    ("B", 1): [("birth", "B-001#1", [], 1)],
                    ("A", 2): [("place_companion", "A-002#1", [], 0)],
                    ("B", 2): [("time_skip", "B-002#1", ["B-001#1"], 1)],
                    ("A", 4): [("birth", "A-004#1", [], 4)],
                    ("A", 5): [("play_basketball", "A-029#1", [], 1),
                                ("challenge", "A-004#1", ["B-002#1"], 0)]},
        "P97-03": {("A", 1): [("play_hit_blow", "A-001#1", [], 1)],
                    ("A", 2): [("play_hit_blow", "A-002#1", [], 1)]},
        "P97-04": {("A", 3): [("birth", "A-003#1", [], 3)],
                    ("A", 4): [("place_world", "A-020#1", [], 2)],
                    ("A", 5): [("equip_item", "A-032#1", ["A-003#1"], 2),
                                ("play_basketball", "A-029#1", ["A-003#1"], 1),
                                ("play_city_run", "A-001#1", [], 1),
                                ("play_city_run", "A-002#1", [], 1)]},
        "P97-05": {("A", 1): [("place_companion", "A-011#1", [], 0)],
                    ("A", 2): [("place_companion", "A-012#1", [], 0)],
                    ("A", 3): [("place_companion", "A-013#1", [], 0)],
                    ("A", 4): [("replace_companion", "A-014#1", ["A-011#1"], 0),
                                ("play_animal_shogi", "A-001#1", ["A-011#1"], 2)],
                    ("A", 5): [("reenter_companion", "A-011#1", ["A-012#1"], 0),
                                ("play_animal_shogi", "A-002#1", ["A-012#1"], 2)],
                    ("A", 6): [("reenter_companion", "A-012#1", ["A-013#1"], 0)]},
        "P97-06": {("B", 1): [("prepare_trap", "B-034#1", [], 1)],
                    ("A", 4): [("play_breakout", "A-001#1", ["B-034#1"], 2),
                                ("play_breakout", "A-002#1", ["B-034#1"], 2)]},
    }
    return schedules[cluster]


def _protected_instances(cluster):
    protected = set()
    for actions in _schedule(cluster).values():
        for _, source, targets, _ in actions:
            protected.add(source.replace("#2", "#1"))
            protected.update(target.replace("#2", "#1") for target in targets)
    return protected


def _draw_turn(state, actor, protected):
    player = state["players"][actor]
    drawn = player["deck"].pop(0)
    player["hand"].append(drawn)
    result = f"時を{state['round']}へ更新し、{drawn}を通常ドロー。"
    payment = _zero_payment()
    if player["field"]["main"] is None and player["deck"]:
        extra = player["deck"].pop(0)
        player["hand"].append(extra)
        choices = [row for row in player["hand"] if row not in protected]
        bottom = sorted(choices or player["hand"], key=_copy_id)[-1]
        player["hand"].remove(bottom)
        player["deck"].append(bottom)
        payment["deck_to_bottom"] = [bottom]
        result += f" たまご追加で{extra}を引き、{bottom}を山札下へ置いた。"
    return result, payment


def _move_hand_to_discard(state, actor, source, payment_time):
    player = state["players"][actor]
    if source not in player["hand"]:
        raise ValueError(f"scheduled source is not in hand: {source}")
    player["hand"].remove(source)
    player["discard"].append(source)
    player["time"] -= payment_time


def _new_reservation(state, reservation_id, source, controller, targets, seq,
                     deadline):
    row = {"reservation_id": reservation_id, "source_instance_id": source,
           "controller": controller, "target_instance_ids": targets,
           "created_seq": seq, "deadline": deadline, "uses_remaining": 1,
           "status": "active"}
    state["reservations"][reservation_id] = row
    return row


def _apply_action(state, actor, action, seq, cluster, generations):
    action_type, source, targets, cost = action
    event_source = source
    player = state["players"][actor]
    opponent_id = "B" if actor == "A" else "A"
    opponent = state["players"][opponent_id]
    cards = state["cards"]
    payment = _zero_payment()
    payment["time"] = cost
    created, consumed, transitions, extra_events = [], [], [], []
    choice_ids = []

    if action_type in {"birth", "time_skip"}:
        player["hand"].remove(source)
        old = player["field"]["main"]
        if old:
            player["discard"].append(old)
        player["field"]["main"] = source
        player["time"] -= cost
        result = f"{source}を{action_type}でメイン枠へ置いた。"
    elif action_type == "place_partner":
        player["hand"].remove(source)
        player["field"]["partner"] = source
        player["field"]["partner_stage"] = 0
        player["person_placed"] = True
        result = f"{source}をこいびと枠へ置き、交際0を開始した。"
    elif action_type in {"place_companion", "replace_companion", "reenter_companion"}:
        actual_source = source
        if action_type == "reenter_companion":
            copy_id = _copy_id(source)
            generations[copy_id] = generations.get(copy_id, 1) + 1
            actual_source = f"{copy_id}#{generations[copy_id]}"
            player["hand"].remove(source)
            cards[actual_source] = copy.deepcopy(cards[source])
            player["hand"].append(actual_source)
            transitions.append({"card_copy_id": copy_id, "from_instance_id": source,
                                "to_instance_id": actual_source, "reason": "zone_change"})
        player["hand"].remove(actual_source)
        if targets:
            replaced = targets[0]
            player["field"]["companions"].remove(replaced)
            player["discard"].append(replaced)
        player["field"]["companions"].append(actual_source)
        player["person_placed"] = True
        result = f"{actual_source}をなかま枠へ通常配置した。"
    elif action_type == "play_first_date":
        _move_hand_to_discard(state, actor, source, cost)
        drawn = player["deck"].pop(0)
        player["hand"].append(drawn)
        player["growth"] += 5
        result = f"交際0の{targets[0]}を対象に{drawn}を引き、そだち+5。"
    elif action_type == "play_hit_blow":
        _move_hand_to_discard(state, actor, source, cost)
        revealed = player["deck"].pop(0)
        declared = cards[revealed]["card_type"]
        player["hand"].append(revealed)
        player["growth"] += 5
        choice = f"choice-{source}-declared-{declared}"
        choice_ids.append(choice)
        result = f"{declared}を宣言し、{revealed}を公開して手札へ加え、そだち+5。"
    elif action_type == "place_world":
        player["hand"].remove(source)
        player["field"]["world"] = source
        player["time"] -= cost
        result = f"{source}のとかいをセカイとして配置した。"
    elif action_type == "equip_item":
        player["hand"].remove(source)
        player["field"]["prepared"].append(source)
        player["time"] -= cost
        result = f"{source}を{targets[0]}へみにつけた。"
    elif action_type == "play_basketball":
        _move_hand_to_discard(state, actor, source, cost)
        result = f"{source}を表向きでプレイし、次の勝利条件を予約した。"
        if cluster == "P97-02":
            for otter in player["field"]["companions"]:
                if cards[otter]["card_id"] != "C-otter":
                    continue
                reservation_id = f"reservation-109-otter-{_copy_id(otter)}"
                reservation = _new_reservation(
                    state, reservation_id, otter, actor, [player["field"]["main"]], seq + 1,
                    {"kind": "next_challenge_win", "round": state["round"], "player": actor})
                created.append(reservation_id)
                extra_events.append(("activate_otter_reservation", otter,
                                     [player["field"]["main"]], reservation_id,
                                     f"{otter}が次のちょうせん勝利への追加そだち+5を予約。"))
    elif action_type == "challenge":
        player["challenge_used"] = True
        player["growth"] += 5
        for reservation_id, reservation in state["reservations"].items():
            if reservation["status"] == "active" and reservation["deadline"]["kind"] == "next_challenge_win":
                reservation["status"] = "consumed"
                reservation["uses_remaining"] = 0
                consumed.append(reservation_id)
                player["growth"] += 5
        result = (f"{source}が{targets[0]}へのちょうせんに勝ち基本+5。"
                  f"カワウソ予約{len(consumed)}本を消費し追加+{len(consumed) * 5}。")
    elif action_type == "play_city_run":
        _move_hand_to_discard(state, actor, source, cost)
        revealed = [player["deck"].pop(0) for _ in range(min(4, len(player["deck"])))]
        selected, seen = [], set()
        for instance_id in revealed:
            card_type = cards[instance_id]["card_type"]
            if card_type not in seen and len(selected) < 2:
                selected.append(instance_id)
                seen.add(card_type)
        remaining = [row for row in revealed if row not in selected]
        player["hand"].extend(selected)
        player["deck"].extend(remaining)
        choice = f"choice-{source}-city-run"
        choice_ids.append(choice)
        result = f"{revealed}を公開し、異なる種類{selected}を取得、残り{remaining}を山札下へ。"
    elif action_type == "play_animal_shogi":
        _move_hand_to_discard(state, actor, source, cost)
        target = targets[0]
        player["discard"].remove(target)
        player["hand"].append(target)
        top = player["deck"][0] if player["deck"] else None
        result = f"捨て札の{target}を手札へ戻し、山札上{top}を見て上へ戻した。"
    elif action_type == "prepare_trap":
        player["hand"].remove(source)
        player["field"]["prepared"].append(source)
        player["time"] -= cost
        result = f"{source}をBの準備枠へしかけた。"
    elif action_type == "play_breakout":
        _move_hand_to_discard(state, actor, source, cost)
        reservation_id = f"reservation-109-breakout-{_copy_id(source)}"
        _new_reservation(state, reservation_id, source, actor, targets, seq,
                         {"kind": "next_own_turn_start", "round": 5, "player": actor})
        created.append(reservation_id)
        result = f"{targets[0]}を対象に次の自分ターン開始時の予約を作成。"
    else:
        raise ValueError(f"unsupported scheduled action: {action_type}")
    return (event_source, result, payment, choice_ids, created, consumed, transitions,
            extra_events)


def _resolve_breakout(state, seq, events, snapshots):
    target = "B-034#1"
    for reservation_id in sorted(state["reservations"]):
        reservation = state["reservations"][reservation_id]
        if reservation["status"] != "active" or reservation["deadline"]["kind"] != "next_own_turn_start":
            continue
        seq += 1
        consumed = []
        if target in state["players"]["B"]["field"]["prepared"]:
            state["players"]["B"]["field"]["prepared"].remove(target)
            state["players"]["B"]["hand"].append(target)
            reservation["status"] = "consumed"
            reservation["uses_remaining"] = 0
            consumed = [reservation_id]
            result = f"{target}が準備枠にあるため持ち主の手札へ戻し、予約を消費。"
        else:
            reservation["status"] = "expired"
            reservation["uses_remaining"] = 1
            result = f"{target}が準備枠にないため効果なしで予約失効。"
        _append_event(events, snapshots, state, _event(
            seq, state, "A", "resolve_breakout", result,
            source=reservation["source_instance_id"], targets=[target],
            consumed=consumed, phase="turn_start_resolution"))
    return seq


def _reservation_metrics(state):
    rows = list(state["reservations"].values())
    return {"created": len(rows),
            "consumed": sum(row["status"] == "consumed" for row in rows),
            "expired": sum(row["status"] == "expired" for row in rows),
            "max_concurrent": 2 if len(rows) >= 2 else len(rows)}


def build_same_name_two_match(fixture, plan, protocol, spec):
    record = _derive_input(fixture, spec)
    record["match_id"] = spec["record_match_id"]
    record["design"].update(plan["design"])
    record["test_plan"] = {
        "purpose": ("同名2枚を別現物として追跡し、107の公開情報限定判断記録へ接続する"
                    "固定パイロット。独立した強度標本には数えない。"),
        "strata": ["current-452", spec["cluster"], "same-name-two", "completed",
                   "a-first", "controlled-prerequisite-position-swaps"],
        "automated_game": False,
    }
    record["input"]["declared_choices"] = []
    state = _initial_state(record)
    events, decisions = [], []
    snapshots = [_snapshot(0, "initial", state)]
    growth_progression = [{"event_seq": 0, "growth": {"A": 20, "B": 20}}]
    unused_time, generations = [], {}
    seq = decision_seq = 0
    schedule = _schedule(spec["cluster"])
    protected = _protected_instances(spec["cluster"])

    for round_number in range(1, 11):
        for actor in ("A", "B"):
            state["round"], state["turn_player"], state["phase"] = round_number, actor, "turn_start"
            state["players"][actor]["time"] = round_number
            state["players"][actor]["challenge_used"] = False
            state["players"][actor]["person_placed"] = False
            state["players"][actor]["relationship_progressed"] = False
            result, payment = _draw_turn(state, actor, protected)
            seq += 1
            _append_event(events, snapshots, state, _event(
                seq, state, actor, "turn_start_draw", result, payment=payment,
                phase="turn_start_draw"))
            if spec["cluster"] == "P97-06" and actor == "A" and round_number == 5:
                seq = _resolve_breakout(state, seq, events, snapshots)

            turn_actions = schedule.get((actor, round_number), [])
            for action_index, action in enumerate(turn_actions):
                action_type, source, targets, cost = action
                selected = _candidate(action_type, source, targets, cost)
                decision_seq += 1
                candidates = _candidate_pool(state, actor, turn_actions[action_index:])
                decision = _decision(decision_seq, seq + 1, state, actor, selected,
                                     "certain_growth_difference" if action_type in {
                                         "play_first_date", "play_hit_blow", "challenge",
                                         "play_city_run"} else "board_value", candidates)
                decisions.append(decision)
                record["input"]["declared_choices"].append({
                    "choice_id": decision["decision_id"], "owner": actor,
                    "kind": "normal_action_decision", "value": selected["candidate_id"],
                    "note": decision["reason_code"],
                })
                (actual_source, result, action_payment, extra_choices, created, consumed,
                 transitions, extra_events) = _apply_action(
                    state, actor, action, seq + 1, spec["cluster"], generations)
                seq += 1
                _append_event(events, snapshots, state, _event(
                    seq, state, actor, action_type, result, source=actual_source,
                    targets=targets, payment=action_payment,
                    choice_ids=[decision["decision_id"]] + extra_choices,
                    created=created, consumed=consumed, transitions=transitions))
                for choice_id in extra_choices:
                    record["input"]["declared_choices"].append({
                        "choice_id": choice_id, "owner": actor, "kind": "effect_choice",
                        "value": choice_id, "note": "固定線の公開前選択または公開後選択。"})
                for extra_type, extra_source, extra_targets, reservation_id, extra_result in extra_events:
                    seq += 1
                    _append_event(events, snapshots, state, _event(
                        seq, state, actor, extra_type, extra_result, source=extra_source,
                        targets=extra_targets, created=[reservation_id]))
                latest = {pid: state["players"][pid]["growth"] for pid in ("A", "B")}
                if latest != growth_progression[-1]["growth"]:
                    growth_progression.append({"event_seq": seq, "growth": latest})

            selected = _pass_candidate()
            decision_seq += 1
            candidates = _candidate_pool(state, actor)
            decision = _decision(decision_seq, seq + 1, state, actor, selected,
                                 "pass_no_better_legal_action", candidates)
            decisions.append(decision)
            record["input"]["declared_choices"].append({
                "choice_id": decision["decision_id"], "owner": actor,
                "kind": "normal_action_decision", "value": "candidate-pass",
                "note": "pass_no_better_legal_action",
            })
            state["phase"] = "completed" if round_number == 10 and actor == "B" else "turn_complete"
            seq += 1
            _append_event(events, snapshots, state, _event(
                seq, state, actor, "turn_end_pass", "より良い合法行動がないため通常行動を終了。",
                choice_ids=[decision["decision_id"]], phase="turn_end_pass"))
            unused_time.append({"round": round_number, "player": actor,
                                "time": state["players"][actor]["time"]})

    final_growth = {pid: state["players"][pid]["growth"] for pid in ("A", "B")}
    winner = "A" if final_growth["A"] > final_growth["B"] else (
        "B" if final_growth["B"] > final_growth["A"] else "draw")
    record["record"] = {
        "status": "completed", "events": events,
        "reservations": copy.deepcopy(list(state["reservations"].values())),
        "result": {"winner": winner,
                   "reason": f"R10終了時のそだち比較でA {final_growth['A']}、B {final_growth['B']}。",
                   "rounds_completed": 10, "final_growth": final_growth,
                   "notes": ["101の同名2枚fixtureから前提カード位置だけを交換した固定記録。",
                             "通常行動の候補記録は固定線に必要な範囲で、完全合法性エンジンではない。",
                             "勝率、先後差、発動率、カード強度の結論には数えない。"]},
    }
    trace = {"schema": "naotocchi.card_game.proxy_decision_trace.v1",
             "trace_id": spec["trace_id"], "record_match_id": record["match_id"],
             "protocol": plan["protocol"],
             "state_model": "checkpoint-109-fixed-same-name-two-state.v1",
             "decisions": decisions, "snapshots": snapshots}
    use_counts = {card_type: 0 for card_type in CARD_TYPES}
    for decision in decisions:
        source = decision["selected_action"].get("source_instance_id")
        if source and source in state["cards"]:
            use_counts[state["cards"][source]["card_type"]] += 1
    evaluation = {
        "match_id": record["match_id"], "cluster": spec["cluster"], "winner": winner,
        "legal_candidate_count": sum(len(row["legal_candidates"]) for row in decisions),
        "selected_action_count": sum(row["selected_action"]["kind"] != "pass"
                                     for row in decisions),
        "unused_time": {"turn_end": unused_time,
                        "final": {pid: state["players"][pid]["time"] for pid in ("A", "B")}},
        "use_count_by_card_type": use_counts,
        "reservations": _reservation_metrics(state),
        "reentries": sum(len(event["instance_transitions"]) for event in events),
        "growth_progression": growth_progression, "unresolved_decisions": 0,
    }
    return {"record": record, "trace": trace, "evaluation": evaluation}


def build_same_name_two_suite(fixtures, plan, protocol):
    matches = [build_same_name_two_match(fixture, plan, protocol, spec)
               for fixture, spec in zip(fixtures, plan["matches"])]
    return {"matches": matches,
            "evaluation": {
                "schema": "naotocchi.card_game.proxy_same_name_two_evaluation.v1",
                "checkpoint": 109, "completed_match_count": len(matches),
                "independent_balance_sample_count": 0,
                "unresolved_decisions": sum(row["evaluation"]["unresolved_decisions"]
                                            for row in matches),
                "matches": [row["evaluation"] for row in matches],
                "limits": ["101由来の固定6戦であり独立した無作為対戦ではない。",
                           "勝率、先後差、発動率、カード強度の結論へ数えない。"]}}


def _validate_trace(record, trace):
    errors = []
    events, snapshots = record["record"]["events"], trace.get("snapshots", [])
    if len(snapshots) != len(events) + 1:
        errors.append("trace must contain one snapshot per event plus initial state")
    if [row.get("event_seq") for row in snapshots] != list(range(len(events) + 1)):
        errors.append("trace event_seq must be contiguous")
    for index, snapshot in enumerate(snapshots):
        if snapshot.get("sha256") != canonical_sha256(snapshot.get("state")):
            errors.append(f"snapshot {index} hash differs")
    for index, event in enumerate(events, 1):
        if index >= len(snapshots):
            break
        if event["before_state_sha256"] != snapshots[index - 1]["sha256"]:
            errors.append(f"event {index} before hash differs")
        if event["after_state_sha256"] != snapshots[index]["sha256"]:
            errors.append(f"event {index} after hash differs")
    linked = {choice for event in events for choice in event.get("choice_ids", [])
              if choice.startswith("decision-")}
    if linked != {row.get("decision_id") for row in trace.get("decisions", [])}:
        errors.append("every decision must link to its resulting event")
    return errors


def validate_same_name_two_suite(suite, plan, protocol, catalog):
    errors = []
    matches = suite.get("matches", [])
    if len(matches) != 6:
        errors.append("109 suite must contain exactly six matches")
    required = set(protocol.get("choice_record_required_fields", []))
    reasons = set(protocol.get("reason_codes", []))
    for built, spec in zip(matches, plan.get("matches", [])):
        record, trace = built["record"], built["trace"]
        match_id = record.get("match_id", "<missing>")
        errors.extend(f"{match_id}: {error}" for error in validate_record(record, catalog))
        errors.extend(f"{match_id}: {error}" for error in _validate_trace(record, trace))
        focus_sources = {event.get("source_instance_id")
                         for event in record["record"]["events"]
                         if event.get("action_type") == spec["focus_action_type"]}
        expected = {row["initial_instance_id"]
                    for player in record["input"]["players"] if player["player_id"] == "A"
                    for row in player["deck_order_top_to_bottom"]
                    if row["card_id"] == spec["focus_card_id"]}
        if focus_sources != expected:
            errors.append(f"{match_id} must resolve two distinct focus copies")
        for decision in trace.get("decisions", []):
            decision_id = decision.get("decision_id", "<missing>")
            actual = set(decision) - {"decision_id", "decision_seq", "event_seq", "actor", "round"}
            if actual != required:
                errors.append(f"{match_id} {decision_id} required fields differ")
            if "pass" not in [row.get("kind") for row in decision.get("legal_candidates", [])]:
                errors.append(f"{match_id} {decision_id} must include pass")
            public = decision.get("public_information", {})
            if "opponent_hand" in public or "opponent_deck" in public:
                errors.append(f"{match_id} {decision_id} exposes opponent hidden information")
            if decision.get("reason_code") not in reasons:
                errors.append(f"{match_id} {decision_id} reason is not approved")
    evaluation = suite.get("evaluation", {})
    if evaluation.get("completed_match_count") != 6:
        errors.append("109 evaluation must count exactly six completed matches")
    if evaluation.get("independent_balance_sample_count") != 0:
        errors.append("109 fixed matches must not count as independent balance samples")
    return errors


def write_same_name_two_suite(suite, record_directory, trace_directory, evaluation_path):
    records, traces, evaluation = map(Path, (record_directory, trace_directory, evaluation_path))
    records.mkdir(parents=True, exist_ok=True)
    traces.mkdir(parents=True, exist_ok=True)
    evaluation.parent.mkdir(parents=True, exist_ok=True)
    for built in suite["matches"]:
        (records / f"{built['record']['match_id']}.json").write_text(
            json.dumps(built["record"], ensure_ascii=False, indent=2) + "\n")
        (traces / f"{built['trace']['trace_id']}.json").write_text(
            json.dumps(built["trace"], ensure_ascii=False, indent=2) + "\n")
    evaluation.write_text(json.dumps(suite["evaluation"], ensure_ascii=False, indent=2) + "\n")


def validate_materialized_suite(suite, record_directory, trace_directory, evaluation_path):
    errors = []
    records, traces, evaluation = map(Path, (record_directory, trace_directory, evaluation_path))
    expected_records = {f"{row['record']['match_id']}.json": row["record"] for row in suite["matches"]}
    expected_traces = {f"{row['trace']['trace_id']}.json": row["trace"] for row in suite["matches"]}
    actual_records = {path.name for path in records.glob("*.json")} if records.exists() else set()
    actual_traces = {path.name for path in traces.glob("*.json")} if traces.exists() else set()
    if actual_records != set(expected_records):
        errors.append("materialized 109 record filenames differ from plan")
    if actual_traces != set(expected_traces):
        errors.append("materialized 109 trace filenames differ from plan")
    for name in actual_records & set(expected_records):
        if load_json(records / name) != expected_records[name]:
            errors.append(f"materialized 109 record differs from builder: {name}")
    for name in actual_traces & set(expected_traces):
        if load_json(traces / name) != expected_traces[name]:
            errors.append(f"materialized 109 trace differs from builder: {name}")
    if not evaluation.exists() or load_json(evaluation) != suite["evaluation"]:
        errors.append("materialized 109 evaluation differs from builder")
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", default=DEFAULT_PLAN)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)
    plan_path = Path(args.plan)
    plan = load_json(plan_path)
    protocol = load_json(plan_path.parent / plan["protocol"])
    fixtures = [load_json(plan_path.parent / row["source_fixture"])
                for row in plan["matches"]]
    suite = build_same_name_two_suite(fixtures, plan, protocol)
    errors = validate_same_name_two_suite(suite, plan, protocol, load_current_catalog())
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    records = plan_path.parent / plan["record_output_directory"]
    traces = plan_path.parent / plan["trace_output_directory"]
    evaluation = plan_path.parent / plan["evaluation_output"]
    if args.write:
        write_same_name_two_suite(suite, records, traces, evaluation)
    if records.exists() or traces.exists() or evaluation.exists():
        errors = validate_materialized_suite(suite, records, traces, evaluation)
        if errors:
            print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
            return 1
    print(json.dumps({
        "valid": True, "completed_records": len(suite["matches"]),
        "events_per_record": [len(row["record"]["record"]["events"]) for row in suite["matches"]],
        "decisions_per_record": [len(row["trace"]["decisions"]) for row in suite["matches"]],
        "final_growth": [row["record"]["record"]["result"]["final_growth"]
                         for row in suite["matches"]], "written": args.write,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
