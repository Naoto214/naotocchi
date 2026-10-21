#!/usr/bin/env python3
"""Build checkpoint-110 fixed board-combination decision transcripts.

This is a deterministic transcript materializer, not a game engine or a
complete legality checker.  It preserves each 101 fixture's physical-card
mapping, applies only the prerequisite position swaps in the plan, and keeps
unreachable focus effects as explicit structural input gaps.
"""

import argparse
import copy
import json
from pathlib import Path

from proxy_record_validator import load_current_catalog, validate_record
from proxy_same_name_two_pilots import (
    CARD_TYPES,
    _append_event,
    _candidate,
    _candidate_pool,
    _decision,
    _derive_input,
    _draw_turn,
    _event,
    _initial_state,
    _move_hand_to_discard,
    _new_reservation,
    _pass_candidate,
    _snapshot,
    _validate_trace,
    _zero_payment,
    load_json,
)


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_PLAN = DATA / "proxy-board-combination-plan-110-20260918.json"
MAIN_STATS = {
    "M-beetle-01": {"strength": 2, "wisdom": 2},
    "M-beetle-02": {"strength": 3, "wisdom": 2},
    "M-antlion-01": {"strength": 2, "wisdom": 3},
}


def _schedule(cluster):
    schedules = {
        "P97-01": {
            ("A", 1): [("place_companion", "A-003#1", [], 0),
                       ("birth", "A-009#1", [], 1)],
            ("B", 1): [("birth", "B-001#1", [], 1)],
            ("A", 2): [("prepare_curling", "A-001#1", [], 1),
                       ("challenge_draw", "A-009#1", ["B-001#1"], 0)],
            ("A", 3): [("time_skip", "A-010#1", ["A-009#1"], 2),
                       ("prepare_curling", "A-002#1", [], 1)],
            ("A", 4): [("place_world", "A-004#1", [], 2)],
            ("A", 5): [("equip_star", "A-005#1", ["A-010#1"], 3)],
            ("A", 6): [("play_basketball", "A-029#1", ["A-010#1"], 1),
                       ("challenge_win", "A-010#1", ["B-001#1"], 0)],
        },
        "P97-02": {
            ("A", 1): [("place_companion", "A-002#1", [], 0),
                       ("birth", "A-009#1", [], 1)],
            ("B", 1): [("birth", "B-001#1", [], 1)],
            ("A", 2): [("time_skip", "A-010#1", ["A-009#1"], 2)],
            ("A", 3): [("place_world", "A-001#1", [], 2)],
            ("A", 4): [("equip_star", "A-004#1", ["A-010#1"], 3)],
            ("A", 5): [("equip_lantern", "A-005#1", ["A-010#1"], 4)],
            ("A", 6): [("play_mini_golf", "A-003#1", [], 1)],
            ("A", 7): [("play_basketball", "A-029#1", ["A-010#1"], 1),
                       ("challenge_win", "A-010#1", ["B-001#1"], 0)],
        },
        "P97-03": {
            ("A", 1): [("place_companion", "A-003#1", [], 0),
                       ("birth", "A-009#1", [], 1)],
            ("B", 1): [("birth", "B-001#1", [], 1)],
            ("A", 2): [("place_world", "A-002#1", [], 2)],
            ("A", 3): [("equip_star", "A-004#1", ["A-009#1"], 3)],
            ("A", 4): [("time_skip", "A-010#1", ["A-009#1"], 2),
                       ("play_hit_blow", "A-005#1", [], 1),
                       ("challenge_win", "A-010#1", ["B-001#1"], 0)],
            ("A", 5): [("play_mini_golf", "A-001#1", [], 1)],
        },
        "P97-04": {
            ("A", 1): [("use_mystery_egg", "A-005#1", [], 1)],
            ("B", 1): [("birth", "B-001#1", [], 1)],
            ("A", 2): [("birth", "A-009#1", [], 1),
                       ("place_companion", "A-011#1", [], 0)],
            ("A", 3): [("place_companion", "A-013#1", [], 0),
                       ("place_world", "A-004#1", [], 2)],
            ("A", 4): [("place_companion", "A-015#1", [], 0)],
            ("A", 5): [("replace_companion", "A-014#1", ["A-011#1"], 0),
                       ("declare_challenge", "A-009#1", ["B-001#1"], 0),
                       ("play_air_hockey", "A-002#1", ["B-001#1"], 1),
                       ("play_animal_shogi", "A-003#1", ["A-011#1"], 2),
                       ("play_city_run", "A-001#1", [], 1)],
        },
        "P97-05": {
            ("A", 1): [("birth", "A-009#1", [], 1)],
            ("A", 2): [("time_skip", "A-010#1", ["A-009#1"], 1),
                       ("place_companion", "A-011#1", [], 0)],
            ("A", 3): [("place_companion", "A-012#1", [], 0)],
            ("A", 4): [("place_companion", "A-013#1", [], 0)],
            ("A", 5): [("replace_companion", "A-014#1", ["A-011#1"], 0),
                       ("play_animal_shogi", "A-005#1", ["A-011#1"], 2)],
        },
        "P97-06": {
            ("A", 1): [("birth", "A-009#1", [], 1)],
            ("A", 2): [("place_world", "A-021#1", [], 2)],
            ("A", 3): [("prepare_item", "A-031#1", ["A-009#1"], 2)],
            ("A", 4): [("prepare_item", "A-032#1", ["A-009#1"], 2)],
            ("A", 5): [("play_stack_snowman", "A-004#1",
                         ["A-031#1", "A-032#1"], 2),
                       ("play_stack_harvest", "A-003#1",
                         ["A-031#1", "A-032#1"], 2),
                       ("prepare_takoyaki", "A-005#1", ["A-031#1"], 1)],
        },
    }
    return schedules[cluster]


def _protected_instances(cluster):
    return {
        instance.replace("#2", "#1")
        for actions in _schedule(cluster).values()
        for _, source, targets, _ in actions
        for instance in [source] + targets
        if instance.startswith("A-")
    }


def _star_present(state, actor):
    return any(state["cards"][row]["card_id"] == "I-star"
               for row in state["players"][actor]["field"]["prepared"])


def _lantern_present(state, actor):
    return any(state["cards"][row]["card_id"] == "I-naoto_lantern"
               for row in state["players"][actor]["field"]["prepared"])


def _create_otter_reservations(state, actor, seq, created):
    player = state["players"][actor]
    for companion in player["field"]["companions"]:
        if state["cards"][companion]["card_id"] != "C-otter":
            continue
        reservation_id = f"reservation-110-otter-{seq}-{companion.split('#')[0]}"
        _new_reservation(
            state, reservation_id, companion, actor, [player["field"]["main"]], seq,
            {"kind": "next_challenge_win_this_turn", "round": state["round"],
             "player": actor},
        )
        created.append(reservation_id)


def _challenge_values(state, source, target, stat="strength"):
    source_card = state["cards"][source]["card_id"]
    target_card = state["cards"][target]["card_id"]
    return MAIN_STATS[source_card][stat], MAIN_STATS[target_card][stat]


def _apply_action(state, actor, action, seq, cluster, turn_context):
    action_type, source, targets, cost = action
    player = state["players"][actor]
    payment = _zero_payment()
    payment["time"] = cost
    created, consumed, choices = [], [], []

    if action_type in {"birth", "time_skip"}:
        player["hand"].remove(source)
        old = player["field"]["main"]
        if old:
            player["discard"].append(old)
        player["field"]["main"] = source
        player["time"] -= cost
        result = f"{source}を{action_type}でメイン枠へ置いた。"
    elif action_type in {"place_companion", "replace_companion"}:
        player["hand"].remove(source)
        if targets:
            player["field"]["companions"].remove(targets[0])
            player["discard"].append(targets[0])
        player["field"]["companions"].append(source)
        player["person_placed"] = True
        result = f"{source}をなかま枠へ置いた。"
    elif action_type == "place_world":
        player["hand"].remove(source)
        player["field"]["world"] = source
        player["time"] -= cost
        result = f"{source}をセカイとして配置した。"
    elif action_type in {"equip_star", "equip_lantern", "prepare_item"}:
        player["hand"].remove(source)
        player["field"]["prepared"].append(source)
        player["time"] -= cost
        result = f"{source}を{targets[0]}へみにつけ、準備枠で追跡した。"
    elif action_type == "prepare_curling":
        player["hand"].remove(source)
        player["field"]["prepared"].append(source)
        player["time"] -= cost
        result = f"{source}をしかけた。"
    elif action_type == "challenge_draw":
        opponent = state["players"]["B" if actor == "A" else "A"]
        if (player["field"]["main"] != source or opponent["field"]["main"] != targets[0]
                or player["challenge_used"]):
            raise ValueError("challenge draw requires current participating mains")
        own_value, other_value = _challenge_values(state, source, targets[0])
        if own_value != other_value:
            raise ValueError("scheduled challenge draw values are not equal")
        player["challenge_used"] = True
        curling = next(row for row in player["field"]["prepared"]
                       if state["cards"][row]["card_id"] == "G-curling-ice")
        player["field"]["prepared"].remove(curling)
        player["discard"].append(curling)
        player["growth"] += 5
        drawn = player["deck"].pop(0)
        player["hand"].append(drawn)
        choices.append(f"choice-{source}-challenge-strength")
        result = (f"ちからを比較し{own_value}対{other_value}で引き分け。{curling}を発動し、"
                  f"そだち+5、{drawn}を1枚引いた。")
    elif action_type == "challenge_win":
        opponent = state["players"]["B" if actor == "A" else "A"]
        if (player["field"]["main"] != source or opponent["field"]["main"] != targets[0]
                or player["challenge_used"]):
            raise ValueError("challenge win requires current participating mains")
        own_value, other_value = _challenge_values(state, source, targets[0])
        if own_value <= other_value:
            raise ValueError("scheduled challenge winner does not have the higher value")
        player["challenge_used"] = True
        player["growth"] += 5
        otter_consumed = 0
        basketball_consumed = 0
        for reservation_id, reservation in state["reservations"].items():
            if reservation["status"] != "active":
                continue
            kind = reservation["deadline"]["kind"]
            if kind == "next_challenge_win_this_turn":
                reservation["status"] = "consumed"
                reservation["uses_remaining"] = 0
                consumed.append(reservation_id)
                otter_consumed += 1
                player["growth"] += 5
            elif kind == "basketball_next_challenge_win_this_turn":
                reservation["status"] = "consumed"
                reservation["uses_remaining"] = 0
                consumed.append(reservation_id)
                basketball_consumed += 1
                if own_value - other_value == 2:
                    player["growth"] += 10
        jungle = player["field"]["world"]
        jungle_triggered = bool(
            jungle and state["cards"][jungle]["card_id"] == "W-jungle" and
            player["field"]["companions"] and turn_context["action_cards"]
        )
        if jungle_triggered:
            player["growth"] += 5
        choices.append(f"choice-{source}-challenge-strength")
        result = (f"ちからを比較し{own_value}対{other_value}で{source}が勝ち基本+5。"
                  f"カワウソ予約{otter_consumed}本、バスケ予約{basketball_consumed}本を消費し、"
                  f"ジャングル追加は"
                  f"{'適用' if jungle_triggered else 'なし'}。")
    elif action_type == "declare_challenge":
        opponent = state["players"]["B" if actor == "A" else "A"]
        if (player["field"]["main"] != source or opponent["field"]["main"] != targets[0]
                or player["challenge_used"]):
            raise ValueError("challenge declaration requires current participating mains")
        own_value, other_value = _challenge_values(state, source, targets[0])
        player["challenge_used"] = True
        state["challenge"] = {
            "active": True, "attacker": actor, "attacker_main": source,
            "defender": "B" if actor == "A" else "A",
            "defender_main": targets[0], "stat": "strength",
            "base_values": {actor: own_value,
                            "B" if actor == "A" else "A": other_value},
            "modifiers": {"A": {"strength": 0, "wisdom": 0},
                          "B": {"strength": 0, "wisdom": 0}},
            "declaration_seq": seq,
        }
        choices.append(f"choice-{source}-challenge-strength")
        result = (f"{source}が{targets[0]}へちょうせんを宣言し、"
                  f"ちから{own_value}対{other_value}を比較対象にした。")
    elif action_type == "play_air_hockey":
        challenge = state.get("challenge", {})
        if (not challenge.get("active") or challenge.get("defender_main") != targets[0] or
                state["players"]["B"]["field"]["main"] != targets[0]):
            raise ValueError("air hockey requires an active challenge and opposing main")
        _move_hand_to_discard(state, actor, source, cost)
        turn_context["action_cards"] += 1
        challenge["modifiers"]["B"]["strength"] -= 2
        choices.append(f"choice-{source}-reduce-strength")
        result = f"相手参加メイン{targets[0]}のちからをこの勝負中-2。"
    elif action_type in {"play_basketball", "play_hit_blow", "play_mini_golf"}:
        _move_hand_to_discard(state, actor, source, cost)
        turn_context["action_cards"] += 1
        if action_type == "play_hit_blow":
            declared = "main"
            revealed = player["deck"].pop(0)
            choices.append(f"choice-{source}-declared-{declared}")
            if state["cards"][revealed]["card_type"] == declared:
                player["hand"].append(revealed)
                player["growth"] += 5
                branch = f"一致したため{revealed}を手札へ加え、そだち+5。"
            else:
                player["deck"].append(revealed)
                drawn = player["deck"].pop(0)
                player["hand"].append(drawn)
                branch = f"不一致の{revealed}を山札下へ置き、{drawn}を引いた。"
        if action_type == "play_mini_golf":
            reservation_id = f"reservation-110-mini-golf-{seq}"
            _new_reservation(
                state, reservation_id, source, actor, [], seq,
                {"kind": "current_turn_end", "round": state["round"],
                 "player": actor},
            )
            created.append(reservation_id)
        if action_type == "play_basketball":
            if targets != [player["field"]["main"]]:
                raise ValueError("basketball must target the current own main")
            reservation_id = f"reservation-110-basketball-{seq}"
            _new_reservation(
                state, reservation_id, source, actor, targets, seq,
                {"kind": "basketball_next_challenge_win_this_turn",
                 "round": state["round"], "player": actor},
            )
            created.append(reservation_id)
        _create_otter_reservations(state, actor, seq, created)
        if _star_present(state, actor):
            player["growth"] += 5
            turn_context["star_triggered"] = True
        result = (f"公開前に{declared}を宣言し、{branch}" if action_type == "play_hit_blow"
                  else f"{source}を表向きでプレイし、適用できる盤面誘発を記録した。")
    elif action_type == "use_mystery_egg":
        _move_hand_to_discard(state, actor, source, cost)
        turn_context["action_cards"] += 1
        revealed = [player["deck"].pop(0) for _ in range(min(5, len(player["deck"])))]
        eligible = [row for row in revealed
                    if state["cards"][row]["card_type"] == "main" and
                    state["cards"][row]["card_id"].rsplit("-", 1)[-1] in {"01", "02"}]
        selected = eligible[0] if eligible else None
        if selected:
            player["hand"].append(selected)
        remaining = [row for row in revealed if row != selected]
        protected = _protected_instances(cluster)
        remaining.sort(key=lambda row: (row not in protected, revealed.index(row)))
        player["deck"].extend(remaining)
        choices.append(f"choice-{source}-egg-{selected or 'none'}")
        result = f"{revealed}を見て{selected}を公開取得し、残りを山札下へ置いた。"
    elif action_type == "play_animal_shogi":
        _move_hand_to_discard(state, actor, source, cost)
        turn_context["action_cards"] += 1
        target = targets[0]
        player["discard"].remove(target)
        player["hand"].append(target)
        result = f"捨て札の{target}を手札へ戻し、山札上を確認した。"
    elif action_type == "play_city_run":
        _move_hand_to_discard(state, actor, source, cost)
        turn_context["action_cards"] += 1
        revealed = [player["deck"].pop(0) for _ in range(min(4, len(player["deck"])))]
        selected, seen = [], set()
        for row in revealed:
            card_type = state["cards"][row]["card_type"]
            if card_type not in seen and len(selected) < 2:
                selected.append(row)
                seen.add(card_type)
        remaining = [row for row in revealed if row not in selected]
        player["hand"].extend(selected)
        player["deck"].extend(remaining)
        choices.append(f"choice-{source}-city-run")
        result = f"{revealed}を公開し、異なる種類{selected}を取得した。"
    elif action_type in {"play_stack_snowman", "play_stack_harvest"}:
        _move_hand_to_discard(state, actor, source, cost)
        turn_context["action_cards"] += 1
        kind = ("snowman_next_own_turn_start" if action_type == "play_stack_snowman"
                else "harvest_next_own_turn_start")
        reservation_id = f"reservation-110-{kind}-{seq}"
        _new_reservation(
            state, reservation_id, source, actor, targets, seq,
            {"kind": kind, "round": state["round"] + 1, "player": actor},
        )
        created.append(reservation_id)
        result = f"{targets}を対象に次の自分ターン開始時の予約を作成した。"
    elif action_type == "prepare_takoyaki":
        player["hand"].remove(source)
        player["field"]["prepared"].append(source)
        player["time"] -= cost
        turn_context["takoyaki_target"] = targets[0]
        result = f"{source}をしかけ、終了時に{targets[0]}を対象とする。"
    else:
        raise ValueError(f"unsupported board-combination action: {action_type}")

    if action_type not in {"challenge_draw", "challenge_win", "declare_challenge"}:
        turn_context["hand_plays"] += 1

    return result, payment, choices, created, consumed


def _append_automatic_event(events, snapshots, state, seq, actor, action_type,
                            source, result, targets=None, created=None,
                            consumed=None, choice_ids=None,
                            phase="trigger_resolution"):
    seq += 1
    _append_event(events, snapshots, state, _event(
        seq, state, actor, action_type, result, source=source,
        targets=targets or [], created=created or [], consumed=consumed or [],
        choice_ids=choice_ids or [],
        phase=phase,
    ))
    return seq


def _resolve_turn_end(state, actor, turn_context, seq, events, snapshots):
    player = state["players"][actor]
    for reservation in list(state["reservations"].values()):
        if reservation["status"] != "active":
            continue
        kind = reservation["deadline"]["kind"]
        if kind == "current_turn_end" and reservation["controller"] == actor:
            reservation["status"] = "consumed"
            reservation["uses_remaining"] = 0
            player["growth"] += 5
            drawn = player["deck"].pop(0)
            player["hand"].append(drawn)
            seq = _append_automatic_event(
                events, snapshots, state, seq, actor, "resolve_mini_golf",
                reservation["source_instance_id"],
                f"アクション1枚だけのためそだち+5、{drawn}を1枚引いた。",
                consumed=[reservation["reservation_id"]], phase="turn_end_resolution")
        elif (kind in {"next_challenge_win_this_turn",
                       "basketball_next_challenge_win_this_turn"} and
              reservation["deadline"]["round"] == state["round"]):
            reservation["status"] = "expired"
            seq = _append_automatic_event(
                events, snapshots, state, seq, reservation["controller"],
                "expire_challenge_reservation",
                reservation["source_instance_id"], "このターン勝利せず予約が失効した。",
                phase="turn_end_resolution")

    world = player["field"]["world"]
    if (world and state["cards"][world]["card_id"] == "W-countryside" and
            turn_context["action_cards"] == 1):
        player["growth"] += 5
        seq = _append_automatic_event(
            events, snapshots, state, seq, actor, "resolve_countryside", world,
            "このターンのアクションが1枚だけなのでそだち+5。",
            phase="turn_end_resolution")
    if _lantern_present(state, actor) and player["growth"] > turn_context["growth_start"]:
        lantern = next(row for row in player["field"]["prepared"]
                       if state["cards"][row]["card_id"] == "I-naoto_lantern")
        player["growth"] += 5
        seq = _append_automatic_event(
            events, snapshots, state, seq, actor, "resolve_lantern", lantern,
            "このターンそだちが増えたため追加そだち+5。",
            phase="turn_end_resolution")
    target = turn_context.get("takoyaki_target")
    if target:
        takoyaki = next(row for row in player["field"]["prepared"]
                        if state["cards"][row]["card_id"] == "G-takoyaki-grill")
        player["field"]["prepared"].remove(takoyaki)
        player["discard"].append(takoyaki)
        reservation_id = f"reservation-110-takoyaki-{seq + 1}"
        _new_reservation(
            state, reservation_id, takoyaki, actor, [target], seq + 1,
            {"kind": "takoyaki_next_own_turn_start", "round": state["round"] + 1,
             "player": actor},
        )
        seq = _append_automatic_event(
            events, snapshots, state, seq, actor, "activate_takoyaki", takoyaki,
            f"終了時に{target}を対象として次の開始予約を作成した。",
            targets=[target], created=[reservation_id], phase="turn_end_resolution")
    return seq


def _resolve_turn_start(state, actor, seq, events, snapshots):
    player = state["players"][actor]
    for reservation in list(state["reservations"].values()):
        if (reservation["status"] != "active" or reservation["controller"] != actor or
                reservation["deadline"].get("round") != state["round"]):
            continue
        kind = reservation["deadline"]["kind"]
        if not kind.endswith("next_own_turn_start"):
            continue
        present = [row for row in reservation["target_instance_ids"]
                   if row in player["field"]["prepared"]]
        if kind == "snowman_next_own_turn_start" and len(present) == 2:
            player["growth"] += 10
            result = "対象2枚が残ったためそだち+10。"
        elif kind == "harvest_next_own_turn_start":
            drawn = [player["deck"].pop(0) for _ in range(min(len(present), len(player["deck"])))]
            player["hand"].extend(drawn)
            result = f"残った対象{len(present)}枚につき引き、{drawn}を手札へ加えた。"
        elif kind == "takoyaki_next_own_turn_start" and present:
            drawn = player["deck"].pop(0)
            player["hand"].append(drawn)
            player["growth"] += 5
            result = f"対象が残ったため{drawn}を引き、そだち+5。"
        else:
            reservation["status"] = "expired"
            result = "対象条件を満たさず予約が失効した。"
            seq = _append_automatic_event(
                events, snapshots, state, seq, actor, "expire_start_reservation",
                reservation["source_instance_id"], result,
                targets=reservation["target_instance_ids"], phase="turn_start_resolution")
            continue
        reservation["status"] = "consumed"
        reservation["uses_remaining"] = 0
        seq = _append_automatic_event(
            events, snapshots, state, seq, actor, "resolve_start_reservation",
            reservation["source_instance_id"], result,
            targets=reservation["target_instance_ids"],
            consumed=[reservation["reservation_id"]], phase="turn_start_resolution")
    return seq


def _instance_card_id(cards, instance_id):
    return cards.get(instance_id, {}).get("card_id")


def _has_prepared_card(state, cards, actor, card_id):
    player = state.get("players", {}).get(actor, {})
    return any(_instance_card_id(cards, instance) == card_id
               for instance in player.get("field", {}).get("prepared", []))


def _focus_event_matches(card_id, evidence_action, event, before, after, cards):
    if event.get("action_type") != evidence_action:
        return False
    actor = event.get("actor")
    if card_id == "I-star":
        before_growth = before.get("players", {}).get(actor, {}).get("growth", 0)
        after_growth = after.get("players", {}).get(actor, {}).get("growth", 0)
        return (_has_prepared_card(before, cards, actor, card_id) and
                after_growth >= before_growth + 5)
    if card_id == "C-otter":
        reservations = after.get("reservations", {})
        return any(
            reservation_id in event.get("reservations_consumed", []) and
            _instance_card_id(cards, reservation.get("source_instance_id")) == card_id and
            reservation.get("status") == "consumed"
            for reservation_id, reservation in reservations.items()
        )
    if card_id == "W-jungle":
        world = before.get("players", {}).get(actor, {}).get("field", {}).get("world")
        return (_instance_card_id(cards, world) == card_id and
                "ジャングル追加は適用" in event.get("result", ""))
    if card_id == "G-curling-ice":
        prepared_before = before.get("players", {}).get(actor, {}).get("field", {}).get(
            "prepared", [])
        discard_after = after.get("players", {}).get(actor, {}).get("discard", [])
        return any(_instance_card_id(cards, instance) == card_id and
                   instance in discard_after for instance in prepared_before)
    if card_id == "G-air-hockey":
        target = event.get("target_instance_ids", [None])[0]
        challenge_before = before.get("challenge", {})
        challenge_after = after.get("challenge", {})
        return (
            _instance_card_id(cards, event.get("source_instance_id")) == card_id and
            challenge_before.get("active") is True and
            challenge_before.get("defender_main") == target and
            challenge_after.get("modifiers", {}).get("B", {}).get("strength") == -2
        )
    if card_id == "W-city":
        return (
            _instance_card_id(cards, event.get("source_instance_id")) == card_id and
            bool(event.get("choice_ids")) and "山札上に残した" in event.get("result", "")
        )
    return _instance_card_id(cards, event.get("source_instance_id")) == card_id


def _focus_effects(cluster, spec, events, snapshots, cards):
    achieved_actions = {
        "P97-01": {"G-curling-ice": "challenge_draw", "C-otter": "challenge_win",
                   "W-countryside": "resolve_countryside", "I-star": "play_basketball"},
        "P97-02": {"W-jungle": "challenge_win", "C-otter": "challenge_win",
                   "G-mini-golf-physics": "resolve_mini_golf", "I-star": "play_mini_golf",
                   "I-naoto_lantern": "resolve_lantern"},
        "P97-03": {"G-mini-golf-physics": "resolve_mini_golf",
                   "W-countryside": "resolve_countryside", "C-otter": "challenge_win",
                   "I-star": "play_hit_blow", "G-hit-blow": "play_hit_blow"},
        "P97-04": {"G-road-city": "play_city_run", "G-air-hockey": "play_air_hockey",
                   "G-animal-shogi": "play_animal_shogi", "W-city": "trigger_city",
                   "I-c_egg_normal": "use_mystery_egg"},
        "P97-05": {"G-animal-shogi": "play_animal_shogi"},
        "P97-06": {"G-stack-harvest": "play_stack_harvest",
                   "G-stack-snowman": "play_stack_snowman",
                   "G-takoyaki-grill": "activate_takoyaki"},
    }[cluster]
    gaps = {row["card_id"]: row for row in spec.get("structural_input_gaps", [])}
    rows = []
    for card_id in spec["focus_card_ids"]:
        evidence_action = achieved_actions.get(card_id)
        achieved = any(
            0 < event.get("seq", 0) < len(snapshots) and
            _focus_event_matches(
                card_id, evidence_action, event,
                snapshots[event["seq"] - 1].get("state", {}),
                snapshots[event["seq"]].get("state", {}), cards,
            )
            for event in events
        )
        rows.append({
            "card_id": card_id,
            "achieved": achieved,
            "evidence_action_type": evidence_action if achieved else None,
            "reason_code": "resolved_in_fixed_path" if achieved else (
                "structural_input_gap" if card_id in gaps else "not_reached"),
        })
    return rows


def _reservation_metrics_from_events(events, state):
    reservations = state["reservations"]
    active = set()
    maximum = 0
    for event in events:
        active.update(event.get("reservations_created", []))
        maximum = max(maximum, len(active))
        active.difference_update(event.get("reservations_consumed", []))
        if event.get("action_type", "").startswith("expire_"):
            source = event.get("source_instance_id")
            expired = sorted(
                reservation_id for reservation_id in active
                if reservations[reservation_id]["source_instance_id"] == source
            )
            if expired:
                active.remove(expired[0])
    rows = list(reservations.values())
    return {
        "created": len(rows),
        "consumed": sum(row["status"] == "consumed" for row in rows),
        "expired": sum(row["status"] == "expired" for row in rows),
        "max_concurrent": maximum,
    }


def build_board_combination_match(fixture, plan, protocol, spec):
    record = _derive_input(fixture, spec)
    record["match_id"] = spec["record_match_id"]
    record["design"].update(plan["design"])
    strata = [spec["cluster"], "board-combination", "completed", "a-first",
              "controlled-prerequisite-position-swaps"]
    if spec["cluster"] != "P97-04":
        strata.insert(0, "current-452")
    strata.extend(spec.get("extra_strata", []))
    record["test_plan"] = {
        "purpose": ("101盤面併用fixtureの固定判断線。達成した焦点効果と固定40枚で"
                    "届かない構造的入力不足を分離し、独立した強度標本には数えない。"),
        "strata": strata,
        "automated_game": False,
    }
    record["input"]["declared_choices"] = []
    state = _initial_state(record)
    events, decisions = [], []
    snapshots = [_snapshot(0, "initial", state)]
    growth_progression = [{"event_seq": 0, "growth": {"A": 20, "B": 20}}]
    unused_time = []
    seq = decision_seq = 0
    schedule = _schedule(spec["cluster"])
    protected = _protected_instances(spec["cluster"])

    for round_number in range(1, 11):
        for actor in ("A", "B"):
            state["round"], state["turn_player"], state["phase"] = round_number, actor, "turn_start"
            player = state["players"][actor]
            player["time"] = round_number
            player["challenge_used"] = False
            player["person_placed"] = False
            player["relationship_progressed"] = False
            turn_context = {"action_cards": 0, "hand_plays": 0,
                            "growth_start": player["growth"],
                            "star_triggered": False, "city_triggered": False}
            draw_protected = protected if actor == "A" else (
                {"B-029#1"} if spec["cluster"] == "P97-04" else set())
            result, payment = _draw_turn(state, actor, draw_protected)
            seq += 1
            _append_event(events, snapshots, state, _event(
                seq, state, actor, "turn_start_draw", result, payment=payment,
                phase="turn_start_draw"))
            seq = _resolve_turn_start(state, actor, seq, events, snapshots)

            actions = schedule.get((actor, round_number), [])
            for action_index, action in enumerate(actions):
                action_type, source, targets, cost = action
                responds_to_seq = None
                if action_type == "play_air_hockey":
                    opponent = state["players"]["B"]
                    opponent_source = "B-029#1"
                    challenge = state.get("challenge", {})
                    if (not challenge.get("active") or
                            opponent["field"]["main"] != challenge.get("defender_main")):
                        raise ValueError("opponent response requires an active challenge")
                    opponent["hand"].remove(opponent_source)
                    opponent["discard"].append(opponent_source)
                    opponent["time"] -= 1
                    reservation_id = f"reservation-110-basketball-{seq + 1}-B"
                    _new_reservation(
                        state, reservation_id, opponent_source, "B",
                        [opponent["field"]["main"]], seq + 1,
                        {"kind": "basketball_next_challenge_win_this_turn",
                         "round": state["round"], "player": "B"},
                    )
                    seq += 1
                    opponent_event = _event(
                        seq, state, "B", "opponent_immediate_play_during_challenge",
                        "Bが参加メインを対象にバスケ3Dを表向きでプレイした。",
                        source=opponent_source, targets=[opponent["field"]["main"]],
                        payment={"time": 1, "hand_to_discard": [],
                                 "prepared_to_discard": [], "deck_to_bottom": []},
                        created=[reservation_id], phase="challenge_response")
                    opponent_event["chain"]["chain_id"] = (
                        f"chain-{challenge['declaration_seq']:03d}")
                    opponent_event["chain"]["link_index"] = 2
                    opponent_event["chain"]["responds_to_seq"] = challenge["declaration_seq"]
                    _append_event(events, snapshots, state, opponent_event)
                    responds_to_seq = seq
                selected = _candidate(action_type, source, targets, cost)
                decision_seq += 1
                candidates = _candidate_pool(state, actor, actions[action_index:])
                decision = _decision(
                    decision_seq, seq + 1, state, actor, selected,
                    "certain_growth_difference" if action_type in {
                        "challenge_win", "challenge_draw", "play_mini_golf",
                        "play_hit_blow", "play_city_run", "play_stack_snowman",
                    } else "board_value",
                    candidates,
                )
                if responds_to_seq is not None:
                    decision["chain"] = {
                        "chain_id": f"chain-{state['challenge']['declaration_seq']:03d}",
                        "responds_to_seq": responds_to_seq,
                    }
                decisions.append(decision)
                record["input"]["declared_choices"].append({
                    "choice_id": decision["decision_id"], "owner": actor,
                    "kind": ("response_decision" if action_type == "play_air_hockey"
                             else "normal_action_decision"),
                    "value": selected["candidate_id"],
                    "note": decision["reason_code"],
                })
                result, action_payment, choices, created, consumed = _apply_action(
                    state, actor, action, seq + 1, spec["cluster"], turn_context)
                seq += 1
                action_event = _event(
                    seq, state, actor, action_type, result, source=source,
                    targets=targets, payment=action_payment,
                    choice_ids=[decision["decision_id"]] + choices,
                    created=created, consumed=consumed)
                if responds_to_seq is not None:
                    action_event["chain"]["responds_to_seq"] = responds_to_seq
                    action_event["chain"]["chain_id"] = (
                        f"chain-{state['challenge']['declaration_seq']:03d}")
                    action_event["chain"]["link_index"] = 3
                _append_event(events, snapshots, state, action_event)
                for choice in choices:
                    declared_main = choice.endswith("-declared-main")
                    record["input"]["declared_choices"].append({
                        "choice_id": choice, "owner": actor, "kind": "effect_choice",
                        "value": "main" if declared_main else choice,
                        "note": ("公開前にメインを宣言。" if declared_main
                                 else "固定線で公開情報から選択。"),
                    })
                world = state["players"][actor]["field"]["world"]
                city_due = (
                    world and state["cards"][world]["card_id"] == "W-city" and
                    turn_context["hand_plays"] == 2 and
                    not turn_context["city_triggered"]
                )
                if city_due:
                    turn_context["city_triggered"] = True
                    world = state["players"]["A"]["field"]["world"]
                    top = state["players"]["A"]["deck"][0]
                    city_choice = f"choice-{world}-keep-top-{seq + 1}"
                    seq = _append_automatic_event(
                        events, snapshots, state, seq, "A", "trigger_city", world,
                        f"このターン2枚目のカードを手札からプレイしたため山札上{top}を見て、山札上に残した。",
                        choice_ids=[city_choice])
                    record["input"]["declared_choices"].append({
                        "choice_id": city_choice, "owner": actor,
                        "kind": "effect_choice", "value": "deck_top",
                        "note": "公開情報を確認し、山札上に残した。",
                    })
                if action_type == "play_air_hockey":
                    challenge = state["challenge"]
                    own_value = challenge["base_values"]["A"]
                    other_value = (challenge["base_values"]["B"] +
                                   challenge["modifiers"]["B"]["strength"])
                    if own_value <= other_value:
                        raise ValueError("air-hockey challenge path must end in an A win")
                    state["players"]["A"]["growth"] += 5
                    challenge["active"] = False
                    challenge["resolved"] = True
                    seq = _append_automatic_event(
                        events, snapshots, state, seq, "A",
                        "resolve_air_hockey_challenge", challenge["attacker_main"],
                        f"ちからを比較し{own_value}対{other_value}でAが勝ち、そだち+5。",
                        targets=[challenge["defender_main"]], phase="challenge_resolution")

            decision_seq += 1
            selected = _pass_candidate()
            candidates = _candidate_pool(state, actor)
            decision = _decision(decision_seq, seq + 1, state, actor, selected,
                                 "pass_no_better_legal_action", candidates)
            decisions.append(decision)
            record["input"]["declared_choices"].append({
                "choice_id": decision["decision_id"], "owner": actor,
                "kind": "normal_action_decision", "value": "candidate-pass",
                "note": "pass_no_better_legal_action",
            })
            seq += 1
            _append_event(events, snapshots, state, _event(
                seq, state, actor, "turn_end_pass", "より良い合法行動がないため通常行動を終了。",
                choice_ids=[decision["decision_id"]], phase="turn_end_pass"))
            seq = _resolve_turn_end(state, actor, turn_context, seq, events, snapshots)
            state["phase"] = "completed" if round_number == 10 and actor == "B" else "turn_complete"
            snapshots[-1] = _snapshot(seq, snapshots[-1]["action_type"], state)
            if events:
                events[-1]["after_state_sha256"] = snapshots[-1]["sha256"]
            unused_time.append({"round": round_number, "player": actor,
                                "time": player["time"]})
            latest = {pid: state["players"][pid]["growth"] for pid in ("A", "B")}
            if latest != growth_progression[-1]["growth"]:
                growth_progression.append({"event_seq": seq, "growth": latest})

    final_growth = {pid: state["players"][pid]["growth"] for pid in ("A", "B")}
    winner = "A" if final_growth["A"] > final_growth["B"] else (
        "B" if final_growth["B"] > final_growth["A"] else "draw")
    record["record"] = {
        "status": "completed", "events": events,
        "reservations": copy.deepcopy(list(state["reservations"].values())),
        "result": {
            "winner": winner,
            "reason": f"R10終了時のそだち比較でA {final_growth['A']}、B {final_growth['B']}。",
            "rounds_completed": 10, "final_growth": final_growth,
            "notes": [
                "101の盤面併用fixtureから前提カード位置だけを交換した固定記録。",
                "未達効果はカード差し替えで強制せず構造的入力不足へ分離した。",
                "勝率、先後差、発動率、カード強度の結論には数えない。",
            ],
        },
    }
    trace = {
        "schema": "naotocchi.card_game.proxy_decision_trace.v1",
        "trace_id": spec["trace_id"], "record_match_id": record["match_id"],
        "protocol": plan["protocol"],
        "state_model": "checkpoint-110-fixed-board-combination-state.v1",
        "decisions": decisions, "snapshots": snapshots,
    }
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
        "reservations": _reservation_metrics_from_events(events, state),
        "reentries": 0, "growth_progression": growth_progression,
        "unresolved_decisions": 0,
        "structural_input_gaps": copy.deepcopy(spec.get("structural_input_gaps", [])),
        "focus_effects": _focus_effects(
            spec["cluster"], spec, events, snapshots, state["cards"]),
        "counts_toward_current_452": spec["cluster"] != "P97-04",
        "path_metrics": {
            "challenge_draws": sum(row["action_type"] == "challenge_draw" for row in events),
            "challenge_wins": sum(row["action_type"] == "challenge_win" for row in events),
        },
    }
    return {"record": record, "trace": trace, "evaluation": evaluation}


def build_board_combination_suite(fixtures, plan, protocol):
    matches = [build_board_combination_match(fixture, plan, protocol, spec)
               for fixture, spec in zip(fixtures, plan["matches"])]
    return {
        "matches": matches,
        "evaluation": {
            "schema": "naotocchi.card_game.proxy_board_combination_evaluation.v1",
            "checkpoint": 110, "completed_match_count": len(matches),
            "independent_balance_sample_count": 0,
            "unresolved_decisions": sum(row["evaluation"]["unresolved_decisions"]
                                        for row in matches),
            "structural_input_gap_count": sum(
                len(row["evaluation"]["structural_input_gaps"]) for row in matches),
            "matches": [row["evaluation"] for row in matches],
            "limits": ["101由来の固定6戦であり独立した無作為対戦ではない。",
                       "未達は構造的入力不足であり、カードの弱さや発動率を示さない。",
                       "勝率、先後差、発動率、カード強度の結論へ数えない。"],
        },
    }


def validate_board_combination_suite(suite, plan, protocol, catalog):
    errors = []
    matches = suite.get("matches", [])
    if len(matches) != 6:
        errors.append("110 suite must contain exactly six matches")
    required = set(protocol.get("choice_record_required_fields", []))
    reasons = set(protocol.get("reason_codes", []))
    for built, spec in zip(matches, plan.get("matches", [])):
        record, trace, evaluation = built["record"], built["trace"], built["evaluation"]
        match_id = record.get("match_id", "<missing>")
        errors.extend(f"{match_id}: {row}" for row in validate_record(record, catalog))
        errors.extend(f"{match_id}: {row}" for row in _validate_trace(record, trace))
        if record.get("record", {}).get("status") != "completed":
            errors.append(f"{match_id} must be completed")
        events = record.get("record", {}).get("events", [])
        snapshots = trace.get("snapshots", [])
        for event in events:
            if event.get("action_type") not in {"challenge_draw", "challenge_win"}:
                continue
            seq = event.get("seq", 0)
            before = snapshots[seq - 1].get("state", {}) if 0 < seq <= len(snapshots) else {}
            players = before.get("players", {})
            if (event.get("source_instance_id") !=
                    players.get("A", {}).get("field", {}).get("main") or
                    event.get("target_instance_ids") != [
                        players.get("B", {}).get("field", {}).get("main")
                    ] or players.get("B", {}).get("field", {}).get("main") is None):
                errors.append(f"{match_id} challenge must target the current opposing main")
        reservations_by_id = {
            row.get("reservation_id"): row
            for row in record.get("record", {}).get("reservations", [])
        }
        for event in events:
            if event.get("action_type") != "play_basketball":
                continue
            seq = event.get("seq", 0)
            before = snapshots[seq - 1].get("state", {}) if 0 < seq <= len(snapshots) else {}
            own_main = before.get("players", {}).get(event.get("actor"), {}).get(
                "field", {}).get("main")
            basketball_created = [
                reservations_by_id.get(reservation_id, {})
                for reservation_id in event.get("reservations_created", [])
                if reservations_by_id.get(reservation_id, {}).get("deadline", {}).get(
                    "kind") == "basketball_next_challenge_win_this_turn"
            ]
            if (event.get("target_instance_ids") != [own_main] or
                    len(basketball_created) != 1 or
                    basketball_created[0].get("target_instance_ids") !=
                    event.get("target_instance_ids")):
                errors.append(f"{match_id} basketball must record its current-main target")
        for decision in trace.get("decisions", []):
            actual = set(decision) - {"decision_id", "decision_seq", "event_seq", "actor", "round"}
            if actual != required:
                errors.append(f"{match_id} decision required fields differ")
            if "pass" not in [row.get("kind") for row in decision.get("legal_candidates", [])]:
                errors.append(f"{match_id} decision must include pass")
            public = decision.get("public_information", {})
            if "opponent_hand" in public or "opponent_deck" in public:
                errors.append(f"{match_id} exposes opponent hidden information")
            if decision.get("reason_code") not in reasons:
                errors.append(f"{match_id} decision reason is not approved")
        if spec["cluster"] == "P97-05":
            gaps = evaluation.get("structural_input_gaps", [])
            if not any(row.get("card_id") == "G-jump-quest" and
                       row.get("missing_requirement") == "two_time_skips_in_same_turn"
                       for row in gaps):
                errors.append(f"{match_id} must retain jump quest structural input gap")
        cards = {
            card["initial_instance_id"]: {"card_id": card["card_id"]}
            for player_input in record.get("input", {}).get("players", [])
            for card in player_input.get("deck_order_top_to_bottom", [])
        }
        expected_focus = _focus_effects(
            spec["cluster"], spec, events, snapshots, cards)
        if evaluation.get("focus_effects") != expected_focus:
            errors.append(f"{match_id} focus-effect evidence differs from recorded events")
        if spec["cluster"] == "P97-04":
            strata = record.get("test_plan", {}).get("strata", [])
            if ("unregistered-item-separate-stratum" not in strata or
                    evaluation.get("counts_toward_current_452") is not False):
                errors.append(f"{match_id} must keep unregistered egg in separate stratum")
            if "current-452" in strata and "unregistered-item-separate-stratum" in strata:
                errors.append(f"{match_id} current-452 and unregistered strata must be mutually exclusive")
            if not any(row.get("action_type") == "trigger_city" for row in events):
                errors.append(f"{match_id} must retain city trigger evidence")
            air_hockey = next((row for row in events
                               if row.get("action_type") == "play_air_hockey"), {})
            opponent_play = next((row for row in events
                                  if row.get("action_type") ==
                                  "opponent_immediate_play_during_challenge"), {})
            if (air_hockey.get("target_instance_ids") != ["B-001#1"] or
                    air_hockey.get("chain", {}).get("responds_to_seq") !=
                    opponent_play.get("seq")):
                errors.append(f"{match_id} air hockey must respond against the opposing main")
            response_decision = next((
                row for row in trace.get("decisions", [])
                if row.get("decision_id") in air_hockey.get("choice_ids", [])
            ), {})
            if response_decision.get("chain") != {
                    "chain_id": air_hockey.get("chain", {}).get("chain_id"),
                    "responds_to_seq": opponent_play.get("seq")}:
                errors.append(f"{match_id} response decision must retain the event chain context")
            city_events = [row for row in events
                           if row.get("action_type") == "trigger_city"]
            events_by_seq = {row.get("seq"): row for row in events}
            if (len(city_events) != 2 or
                    [events_by_seq.get(row.get("seq") - 1, {}).get("action_type")
                     for row in city_events] != ["place_world", "play_air_hockey"] or
                    not all(row.get("choice_ids") and
                            "山札上に残した" in row.get("result", "")
                            for row in city_events)):
                errors.append(f"{match_id} city triggers must follow each second hand play")
    aggregate = suite.get("evaluation", {})
    if aggregate.get("completed_match_count") != 6:
        errors.append("110 evaluation must count exactly six completed matches")
    if aggregate.get("independent_balance_sample_count") != 0:
        errors.append("110 fixed matches must not count as independent balance samples")
    if aggregate.get("unresolved_decisions") != 0:
        errors.append("110 fixed decisions must have zero unresolved decisions")
    return errors


def write_board_combination_suite(suite, record_directory, trace_directory,
                                  evaluation_path):
    records, traces, evaluation = map(Path, (record_directory, trace_directory,
                                             evaluation_path))
    records.mkdir(parents=True, exist_ok=True)
    traces.mkdir(parents=True, exist_ok=True)
    evaluation.parent.mkdir(parents=True, exist_ok=True)
    for built in suite["matches"]:
        (records / f"{built['record']['match_id']}.json").write_text(
            json.dumps(built["record"], ensure_ascii=False, indent=2) + "\n")
        (traces / f"{built['trace']['trace_id']}.json").write_text(
            json.dumps(built["trace"], ensure_ascii=False, indent=2) + "\n")
    evaluation.write_text(json.dumps(suite["evaluation"], ensure_ascii=False,
                                     indent=2) + "\n")


def validate_materialized_suite(suite, record_directory, trace_directory,
                                evaluation_path):
    errors = []
    records, traces, evaluation = map(Path, (record_directory, trace_directory,
                                             evaluation_path))
    expected_records = {f"{row['record']['match_id']}.json": row["record"]
                        for row in suite["matches"]}
    expected_traces = {f"{row['trace']['trace_id']}.json": row["trace"]
                       for row in suite["matches"]}
    actual_records = {path.name for path in records.glob("*.json")} if records.exists() else set()
    actual_traces = {path.name for path in traces.glob("*.json")} if traces.exists() else set()
    if actual_records != set(expected_records):
        errors.append("materialized 110 record filenames differ from plan")
    if actual_traces != set(expected_traces):
        errors.append("materialized 110 trace filenames differ from plan")
    for name in actual_records & set(expected_records):
        if load_json(records / name) != expected_records[name]:
            errors.append(f"materialized 110 record differs from builder: {name}")
    for name in actual_traces & set(expected_traces):
        if load_json(traces / name) != expected_traces[name]:
            errors.append(f"materialized 110 trace differs from builder: {name}")
    if not evaluation.exists() or load_json(evaluation) != suite["evaluation"]:
        errors.append("materialized 110 evaluation differs from builder")
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
    suite = build_board_combination_suite(fixtures, plan, protocol)
    errors = validate_board_combination_suite(
        suite, plan, protocol, load_current_catalog())
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    records = plan_path.parent / plan["record_output_directory"]
    traces = plan_path.parent / plan["trace_output_directory"]
    evaluation = plan_path.parent / plan["evaluation_output"]
    if args.write:
        write_board_combination_suite(suite, records, traces, evaluation)
    if records.exists() or traces.exists() or evaluation.exists():
        errors = validate_materialized_suite(suite, records, traces, evaluation)
        if errors:
            print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False,
                             indent=2))
            return 1
    print(json.dumps({
        "valid": True, "completed_records": len(suite["matches"]),
        "events_per_record": [len(row["record"]["record"]["events"])
                              for row in suite["matches"]],
        "decisions_per_record": [len(row["trace"]["decisions"])
                                 for row in suite["matches"]],
        "final_growth": [row["record"]["record"]["result"]["final_growth"]
                         for row in suite["matches"]],
        "structural_input_gap_count": suite["evaluation"]["structural_input_gap_count"],
        "written": args.write,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
