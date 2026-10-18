#!/usr/bin/env python3
"""Build checkpoint-108 fixed normal-decision match transcripts.

This is a transcript materializer, not a card-effect or complete legality engine.
It enumerates the legal candidates needed by the approved two-match line, applies
the fixed checkpoint-108 policy, and hashes each resulting state.
"""

import argparse
import copy
import json
from pathlib import Path

from proxy_record_validator import canonical_sha256, load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_PLAN = DATA / "proxy-normal-decision-plan-108-20260918.json"

MAIN_STATS = {
    1: (2, 3),
    2: (3, 4),
    3: (5, 4),
    4: (1, 5),
    5: (2, 5),
    6: (6, 5),
    7: (7, 6),
    8: (4, 8),
}
CARD_TYPES = ["main", "companion", "partner", "world", "play", "item", "event"]
HIT_BLOW_DECLARATIONS = CARD_TYPES


def load_json(path):
    return json.loads(Path(path).read_text())


def _zero_payment():
    return {"time": 0, "hand_to_discard": [], "prepared_to_discard": [], "deck_to_bottom": []}


def _card_type(card_id):
    return {
        "M": "main", "C": "companion", "P": "partner", "W": "world",
        "G": "play", "I": "item", "E": "event",
    }[card_id[0]]


def _main_meta(card_id):
    if not card_id.startswith("M-"):
        return None
    species, stage = card_id[2:].rsplit("-", 1)
    return species, int(stage)


def _copy_id(instance_id):
    return instance_id.split("#", 1)[0]


def _initial_state(fixture):
    cards = {}
    players = {}
    for source in fixture["input"]["players"]:
        player_id = source["player_id"]
        for row in source["deck_order_top_to_bottom"]:
            cards[row["initial_instance_id"]] = {
                "card_id": row["card_id"],
                "card_copy_id": row["card_copy_id"],
                "card_type": _card_type(row["card_id"]),
            }
        deck = [row["initial_instance_id"] for row in source["deck_order_top_to_bottom"]]
        players[player_id] = {
            "time": 0,
            "growth": fixture["input"]["initial_growth"],
            "hand": deck[:5],
            "deck": deck[5:],
            "discard": [],
            "field": {"main": None, "companions": [], "partner": None, "partner_stage": None,
                      "world": None, "prepared": []},
            "challenge_used": False,
            "person_placed": False,
            "relationship_progressed": False,
        }
    return {"round": 0, "turn_player": None, "phase": "before_match", "players": players, "cards": cards}


def _canonical_state(state):
    """Return replay state without the immutable per-match card lookup table."""
    state_copy = copy.deepcopy(state)
    state_copy.pop("cards", None)
    return state_copy


def _snapshot(event_seq, action_type, state):
    state_copy = _canonical_state(state)
    return {"event_seq": event_seq, "action_type": action_type,
            "sha256": canonical_sha256(state_copy), "state": state_copy}


def _event(seq, round_number, turn_player, actor, action_type, result,
           source=None, targets=None, payment=None, choice_ids=None):
    return {
        "seq": seq,
        "round": round_number,
        "turn_player": turn_player,
        "phase": "main" if action_type not in {"turn_start_draw", "turn_end_pass"} else action_type,
        "actor": actor,
        "action_type": action_type,
        "source_instance_id": source,
        "target_instance_ids": targets or [],
        "payment": payment or _zero_payment(),
        "choice_ids": choice_ids or [],
        "chain": {"chain_id": f"chain-{seq:03d}", "link_index": 1, "responds_to_seq": None},
        "reservations_created": [],
        "reservations_consumed": [],
        "instance_transitions": [],
        "before_state_sha256": "",
        "after_state_sha256": "",
        "result": result,
    }


def _append_event(events, snapshots, state, event):
    event["before_state_sha256"] = snapshots[-1]["sha256"]
    event["after_state_sha256"] = canonical_sha256(_canonical_state(state))
    events.append(event)
    snapshots.append(_snapshot(event["seq"], event["action_type"], state))


def _candidate(candidate_id, action_type, source=None, targets=None, payment=0, **details):
    row = {
        "candidate_id": candidate_id,
        "kind": "legal_action",
        "action_type": action_type,
        "source_instance_id": source,
        "target_instance_ids": targets or [],
        "payment_time": payment,
    }
    row.update(details)
    return row


def _legal_candidates(state, actor):
    player = state["players"][actor]
    opponent = state["players"]["B" if actor == "A" else "A"]
    cards = state["cards"]
    candidates = []
    current_main = player["field"]["main"]
    current_meta = _main_meta(cards[current_main]["card_id"]) if current_main else None

    for instance_id in sorted(player["hand"], key=_copy_id):
        card = cards[instance_id]
        card_id = card["card_id"]
        card_type = card["card_type"]
        if card_type == "main":
            species, stage = _main_meta(card_id)
            if current_main is None and stage <= player["time"]:
                candidates.append(_candidate(f"candidate-birth-{instance_id}", "birth", instance_id,
                                             payment=stage, stage=stage))
            elif current_main is not None:
                old_species, old_stage = current_meta
                if species == old_species and stage > old_stage and stage - old_stage <= player["time"]:
                    candidates.append(_candidate(f"candidate-time-skip-{instance_id}", "time_skip",
                                                 instance_id, [current_main], stage - old_stage,
                                                 stage=stage))
                elif species != old_species and stage <= player["time"]:
                    candidates.append(_candidate(f"candidate-transform-{instance_id}", "transform",
                                                 instance_id, [current_main], stage, stage=stage))
        elif card_type == "companion" and not player["person_placed"]:
            companions = player["field"]["companions"]
            if len(companions) < 3:
                candidates.append(_candidate(f"candidate-place-companion-{instance_id}",
                                             "place_companion", instance_id))
            else:
                for replaced in sorted(companions, key=_copy_id):
                    candidates.append(_candidate(
                        f"candidate-place-companion-{instance_id}-replace-{replaced}",
                        "place_companion", instance_id, [replaced], replacement=replaced))
        elif card_type == "partner" and not player["person_placed"] and player["field"]["partner"] is None:
            candidates.append(_candidate(f"candidate-place-partner-{instance_id}",
                                         "place_partner", instance_id))
        elif card_id == "G-hit-blow" and player["time"] >= 1:
            for declared_type in HIT_BLOW_DECLARATIONS:
                candidates.append(_candidate(
                    f"candidate-hit-blow-{instance_id}-{declared_type}", "play_hit_blow",
                    instance_id, payment=1, declared_type=declared_type))

    if (player["field"]["partner"] is not None and not player["relationship_progressed"]
            and player["field"]["partner_stage"] != "married" and player["time"] >= 1):
        candidates.append(_candidate("candidate-progress-relationship", "progress_relationship",
                                     player["field"]["partner"], payment=1))
    if current_main is not None and opponent["field"]["main"] is not None and not player["challenge_used"]:
        for parameter in ("power", "wisdom"):
            candidates.append(_candidate(f"candidate-challenge-{parameter}", "challenge",
                                         current_main, [opponent["field"]["main"]], parameter=parameter))
    candidates.append({"candidate_id": "candidate-pass", "kind": "pass", "action_type": "pass",
                       "source_instance_id": None, "target_instance_ids": [], "payment_time": 0})
    return candidates


def _public_field(player):
    return copy.deepcopy(player["field"])


def _decision(decision_seq, event_seq, state, actor, candidates, selected, reason_code):
    opponent = "B" if actor == "A" else "A"
    player = state["players"][actor]
    other = state["players"][opponent]
    runner_up = next((copy.deepcopy(row) for row in candidates
                      if row["candidate_id"] != selected["candidate_id"]), None)
    payment = _zero_payment()
    payment["time"] = selected.get("payment_time", 0)
    return {
        "decision_id": f"decision-{decision_seq:03d}",
        "decision_seq": decision_seq,
        "event_seq": event_seq,
        "actor": actor,
        "round": state["round"],
        "pre_decision_state": {
            "hand": copy.deepcopy(player["hand"]),
            "field": _public_field(player),
            "time": player["time"],
            "growth": player["growth"],
            "reservations": [],
        },
        "legal_candidates": copy.deepcopy(candidates),
        "selected_action": copy.deepcopy(selected),
        "runner_up_action": runner_up,
        "reason_code": reason_code,
        "payment": payment,
        "targets": copy.deepcopy(selected.get("target_instance_ids", [])),
        "chain": {"chain_id": f"chain-{event_seq:03d}", "responds_to_seq": None},
        "public_information": {
            "information_policy": "public_and_owner_known_only",
            "own_hand": copy.deepcopy(player["hand"]),
            "own_field": _public_field(player),
            "opponent_field": _public_field(other),
            "growth": {actor: player["growth"], opponent: other["growth"]},
            "time": {actor: player["time"], opponent: other["time"]},
            "discard": {actor: copy.deepcopy(player["discard"]),
                        opponent: copy.deepcopy(other["discard"])},
            "reservations": [],
        },
    }


def _find(candidates, action_type, source=None, parameter=None, stage=None):
    for row in candidates:
        if row.get("action_type") != action_type:
            continue
        if source is not None and row.get("source_instance_id") != source:
            continue
        if parameter is not None and row.get("parameter") != parameter:
            continue
        if stage is not None and row.get("stage") != stage:
            continue
        return row
    raise ValueError(f"fixed action is no longer legal: {action_type} {source} {parameter} {stage}")


def _main_stage(state, player_id):
    instance_id = state["players"][player_id]["field"]["main"]
    return _main_meta(state["cards"][instance_id]["card_id"])[1] if instance_id else None


def _choose_next_action(state, actor, first_player, policy):
    player = state["players"][actor]
    cards = state["cards"]
    candidates = _legal_candidates(state, actor)
    round_number = state["round"]
    seat = "first" if actor == first_player else "second"

    if round_number == 1 and actor == "A" and player["field"]["main"] is None:
        hit = next((instance for instance in player["hand"]
                    if cards[instance]["card_id"] == "G-hit-blow"), None)
        if hit:
            return candidates, _find(candidates, "play_hit_blow", hit, stage=None,
                                     parameter=None), "certain_growth_difference", "main"
    if round_number == 1 and actor == "B" and player["field"]["main"] is None:
        source = next(instance for instance in player["hand"]
                      if cards[instance]["card_id"] == "M-antlion-01")
        return candidates, _find(candidates, "birth", source), "board_value", None

    desired = policy[f"{seat}_seat_stage_by_round"].get(str(round_number))
    current = _main_stage(state, actor)
    if desired is not None and current != desired:
        source = next((instance for instance in player["hand"]
                       if _main_meta(cards[instance]["card_id"]) == ("antlion", desired)), None)
        if source is None:
            raise ValueError(
                f"missing planned antlion stage {desired}: actor={actor} round={round_number} "
                f"hand={player['hand']}"
            )
        action_type = "birth" if current is None else "time_skip"
        reason = "certain_growth_difference" if round_number >= 3 or (
            round_number == 2 and first_player == "A" and actor == "A") else "board_value"
        return candidates, _find(candidates, action_type, source, stage=desired), reason, None

    should_challenge = round_number in policy["challenge_rounds"]
    if first_player == "A" and actor == "A" and round_number == policy["a_first_extra_challenge_round"]:
        should_challenge = True
    if should_challenge and not player["challenge_used"]:
        own_stage = _main_stage(state, actor)
        other = "B" if actor == "A" else "A"
        other_stage = _main_stage(state, other)
        if own_stage and other_stage:
            own_power, own_wisdom = MAIN_STATS[own_stage]
            other_power, other_wisdom = MAIN_STATS[other_stage]
            parameter = "power" if own_power > other_power else "wisdom"
            if (parameter == "power" and own_power > other_power) or (
                    parameter == "wisdom" and own_wisdom > other_wisdom):
                return candidates, _find(candidates, "challenge", parameter=parameter), \
                    "certain_growth_difference", None

    if not player["person_placed"]:
        if len(player["field"]["companions"]) < 3:
            companions = [row for row in candidates if row.get("action_type") == "place_companion"
                          and not row.get("replacement")]
            if companions:
                return candidates, companions[0], "board_value", None
        if player["field"]["partner"] is None:
            partners = [row for row in candidates if row.get("action_type") == "place_partner"]
            if partners:
                return candidates, partners[0], "board_value", None

    return candidates, _find(candidates, "pass"), "pass_no_better_legal_action", None


def _apply_action(state, actor, selected, declared_type=None):
    player = state["players"][actor]
    opponent_id = "B" if actor == "A" else "A"
    opponent = state["players"][opponent_id]
    cards = state["cards"]
    action_type = selected["action_type"]
    source = selected.get("source_instance_id")
    payment = _zero_payment()
    payment["time"] = selected.get("payment_time", 0)
    player["time"] -= payment["time"]

    if action_type == "play_hit_blow":
        player["hand"].remove(source)
        player["discard"].append(source)
        revealed = player["deck"].pop(0)
        if _card_type(cards[revealed]["card_id"]) == declared_type:
            player["hand"].append(revealed)
            player["growth"] += 5
            result = f"{declared_type}を宣言し、{revealed}を公開して手札へ加え、そだち+5。"
        else:
            player["deck"].append(revealed)
            drawn = player["deck"].pop(0)
            player["hand"].append(drawn)
            result = f"{declared_type}を宣言。{revealed}は不一致で山札下へ置き、{drawn}を引いた。"
        return result, payment
    if action_type in {"birth", "time_skip", "transform"}:
        old = player["field"]["main"]
        player["hand"].remove(source)
        if old is not None:
            player["discard"].append(old)
        player["field"]["main"] = source
        return f"{source}を{action_type}でメイン枠へ置いた。", payment
    if action_type == "challenge":
        parameter = selected["parameter"]
        own_stage = _main_stage(state, actor)
        other_stage = _main_stage(state, opponent_id)
        index = 0 if parameter == "power" else 1
        own_value = MAIN_STATS[own_stage][index]
        other_value = MAIN_STATS[other_stage][index]
        player["challenge_used"] = True
        if own_value > other_value:
            player["growth"] += 5
            return f"{parameter}を比較し{own_value}対{other_value}で{actor}が勝利、そだち+5。", payment
        if own_value < other_value:
            opponent["growth"] += 5
            return f"{parameter}を比較し{own_value}対{other_value}で{opponent_id}が勝利、そだち+5。", payment
        return f"{parameter}を比較し{own_value}対{other_value}で引き分け。", payment
    if action_type == "place_companion":
        player["hand"].remove(source)
        replacement = selected.get("replacement")
        if replacement:
            player["field"]["companions"].remove(replacement)
            player["discard"].append(replacement)
        player["field"]["companions"].append(source)
        player["person_placed"] = True
        return f"{source}をなかま枠へ通常配置した。", payment
    if action_type == "place_partner":
        player["hand"].remove(source)
        player["field"]["partner"] = source
        player["field"]["partner_stage"] = 0
        player["person_placed"] = True
        return f"{source}をこいびと枠へ置き、交際0を開始した。", payment
    if action_type == "progress_relationship":
        stage = player["field"]["partner_stage"]
        player["field"]["partner_stage"] = "married" if stage == 3 else stage + 1
        player["relationship_progressed"] = True
        if player["field"]["partner_stage"] == "married":
            player["growth"] += 10
        return f"交際を{stage}から{player['field']['partner_stage']}へ進めた。", payment
    if action_type == "pass":
        return "より良い合法行動がないため通常行動を終了。", payment
    raise ValueError(f"unsupported fixed action: {action_type}")


def build_normal_decision_match(fixture, plan, protocol, spec):
    record = copy.deepcopy(fixture)
    record["match_id"] = spec["record_match_id"]
    record["design"].update(plan["design"])
    record["test_plan"] = {
        "purpose": ("107で固定した公開情報限定の優先順位に従い、通常行動機会ごとに合法候補、"
                    "選択、次点、理由を記録する小規模completed対戦。独立した強度標本には数えない。"),
        "strata": ["current-452", "normal-decision", "completed", spec["seat_stratum"]],
        "automated_game": False,
    }
    record["input"]["declared_choices"] = []
    state = _initial_state(record)
    events = []
    snapshots = [_snapshot(0, "initial", state)]
    decisions = []
    turn_unused_time = []
    growth_progression = [{"event_seq": 0, "growth": {"A": 20, "B": 20}}]
    seq = 0
    decision_seq = 0
    first_player = record["input"]["first_player"]
    turn_order = [first_player, "B" if first_player == "A" else "A"]

    for player_id, rounds in spec["egg_bottom"].items():
        for choice_round, instance_id in rounds.items():
            record["input"]["declared_choices"].append({
                "choice_id": f"choice-egg-bottom-{player_id}-r{choice_round}", "owner": player_id,
                "kind": "egg_exchange_deck_bottom", "value": instance_id,
                "note": "通常ドローとたまご追加ドロー後に手札から山札下へ置くカード。",
            })

    for round_number in range(1, 11):
        for turn_player in turn_order:
            player = state["players"][turn_player]
            state["round"] = round_number
            state["turn_player"] = turn_player
            state["phase"] = "turn_start"
            player["time"] = round_number
            player["challenge_used"] = False
            player["person_placed"] = False
            player["relationship_progressed"] = False
            drawn = player["deck"].pop(0)
            player["hand"].append(drawn)
            result = f"時を{round_number}へ更新し、{drawn}を通常ドロー。"
            choice_ids = []
            payment = _zero_payment()
            if player["field"]["main"] is None:
                extra = player["deck"].pop(0)
                player["hand"].append(extra)
                bottom = spec["egg_bottom"][turn_player][str(round_number)]
                if bottom not in player["hand"]:
                    raise ValueError(f"egg bottom choice is no longer in hand: {bottom}")
                player["hand"].remove(bottom)
                player["deck"].append(bottom)
                payment["deck_to_bottom"] = [bottom]
                choice_ids.append(f"choice-egg-bottom-{turn_player}-r{round_number}")
                result += f" たまご追加で{extra}を引き、{bottom}を山札下へ置いた。"
            seq += 1
            _append_event(events, snapshots, state, _event(
                seq, round_number, turn_player, turn_player, "turn_start_draw", result,
                payment=payment, choice_ids=choice_ids))

            while True:
                candidates, selected, reason, declared_type = _choose_next_action(
                    state, turn_player, first_player, plan["policy"])
                decision_seq += 1
                next_event_seq = seq + 1
                decision = _decision(decision_seq, next_event_seq, state, turn_player,
                                     candidates, selected, reason)
                decisions.append(decision)
                record["input"]["declared_choices"].append({
                    "choice_id": decision["decision_id"], "owner": turn_player,
                    "kind": "normal_action_decision", "value": selected["candidate_id"],
                    "note": reason,
                })
                extra_choice_ids = []
                if declared_type:
                    choice_id = f"choice-hit-blow-type-{turn_player}"
                    if not any(row["choice_id"] == choice_id for row in record["input"]["declared_choices"]):
                        record["input"]["declared_choices"].append({
                            "choice_id": choice_id, "owner": turn_player,
                            "kind": "declared_card_type", "value": declared_type,
                            "note": "公開前に、既知の構築比率と手札からメインを宣言。",
                        })
                    extra_choice_ids.append(choice_id)
                result, payment = _apply_action(state, turn_player, selected, declared_type)
                action_type = selected["action_type"]
                if action_type == "pass":
                    state["phase"] = "completed" if (
                        round_number == 10 and turn_player == turn_order[-1]) else "turn_complete"
                    action_type = "turn_end_pass"
                else:
                    state["phase"] = "action_window"
                seq += 1
                _append_event(events, snapshots, state, _event(
                    seq, round_number, turn_player, turn_player, action_type, result,
                    source=selected.get("source_instance_id"),
                    targets=selected.get("target_instance_ids", []), payment=payment,
                    choice_ids=[decision["decision_id"]] + extra_choice_ids))
                if snapshots[-1]["state"]["players"]["A"]["growth"] != growth_progression[-1]["growth"]["A"] or \
                        snapshots[-1]["state"]["players"]["B"]["growth"] != growth_progression[-1]["growth"]["B"]:
                    growth_progression.append({"event_seq": seq, "growth": {
                        "A": state["players"]["A"]["growth"], "B": state["players"]["B"]["growth"]}})

                if selected["action_type"] in {"birth", "time_skip"} and _main_stage(state, turn_player) == 5:
                    ability_choice = f"choice-antlion-05-draw-{turn_player}-r{round_number}"
                    record["input"]["declared_choices"].append({
                        "choice_id": ability_choice, "owner": turn_player,
                        "kind": "optional_trigger", "value": "activate",
                        "note": "準備枠が空のため、アリジゴク⑤の任意ドローを発動。",
                    })
                    ability_source = state["players"][turn_player]["field"]["main"]
                    ability_draw = state["players"][turn_player]["deck"].pop(0)
                    state["players"][turn_player]["hand"].append(ability_draw)
                    seq += 1
                    _append_event(events, snapshots, state, _event(
                        seq, round_number, turn_player, turn_player, "activate_antlion_05_draw",
                        f"{ability_source}の能力で{ability_draw}を1枚引いた。",
                        source=ability_source, choice_ids=[ability_choice]))
                if selected["action_type"] == "pass":
                    turn_unused_time.append({"round": round_number, "player": turn_player,
                                             "time": player["time"]})
                    break

    final_growth = {player_id: state["players"][player_id]["growth"] for player_id in ("A", "B")}
    winner = "A" if final_growth["A"] > final_growth["B"] else (
        "B" if final_growth["B"] > final_growth["A"] else "draw")
    record["record"] = {
        "status": "completed", "events": events, "reservations": [],
        "result": {
            "winner": winner,
            "reason": f"R10終了時のそだち比較でA {final_growth['A']}、B {final_growth['B']}。",
            "rounds_completed": 10,
            "final_growth": final_growth,
            "notes": [
                "通常行動機会ごとに107の合法候補・判断理由を記録した固定トランスクリプト。",
                "相手の非公開情報を参照せず、完全自動の合法性判定エンジンは使用していない。",
                "2戦だけから勝率、先後差、発動率、カード強度を結論づけない。",
            ],
        },
    }
    trace = {
        "schema": "naotocchi.card_game.proxy_decision_trace.v1",
        "trace_id": spec["trace_id"],
        "record_match_id": record["match_id"],
        "protocol": plan["protocol"],
        "state_model": "checkpoint-108-fixed-normal-decision-state.v1",
        "decisions": decisions,
        "snapshots": snapshots,
    }
    use_counts = {card_type: 0 for card_type in CARD_TYPES}
    action_type_to_card_type = {
        "birth": "main", "time_skip": "main", "transform": "main",
        "place_companion": "companion", "place_partner": "partner",
        "play_hit_blow": "play",
    }
    for decision in decisions:
        card_type = action_type_to_card_type.get(decision["selected_action"]["action_type"])
        if card_type:
            use_counts[card_type] += 1
    evaluation = {
        "match_id": record["match_id"],
        "winner": winner,
        "legal_candidate_count": sum(len(row["legal_candidates"]) for row in decisions),
        "selected_action_count": sum(row["selected_action"]["kind"] != "pass" for row in decisions),
        "unused_time": {"turn_end": turn_unused_time,
                        "final": {player_id: state["players"][player_id]["time"] for player_id in ("A", "B")}},
        "use_count_by_card_type": use_counts,
        "reservations": {"created": 0, "consumed": 0, "expired": 0, "max_concurrent": 0},
        "reentries": 0,
        "growth_progression": growth_progression,
        "unresolved_decisions": 0,
    }
    return {"record": record, "trace": trace, "evaluation": evaluation}


def build_normal_decision_pair(fixtures, plan, protocol):
    matches = [build_normal_decision_match(fixture, plan, protocol, spec)
               for fixture, spec in zip(fixtures, plan["matches"])]
    return {
        "matches": matches,
        "evaluation": {
            "schema": "naotocchi.card_game.proxy_normal_decision_evaluation.v1",
            "checkpoint": 108,
            "completed_match_count": len(matches),
            "independent_balance_sample_count": 0,
            "unresolved_decisions": sum(row["evaluation"]["unresolved_decisions"] for row in matches),
            "matches": [row["evaluation"] for row in matches],
            "limits": [
                "固定した2戦は記録経路の小規模確認であり、独立した無作為対戦ではない。",
                "勝率、先後差、発動率、カード強度の結論へ数えない。",
            ],
        },
    }


def _validate_trace(record, trace):
    errors = []
    events = record.get("record", {}).get("events", [])
    snapshots = trace.get("snapshots", [])
    decisions = trace.get("decisions", [])
    if trace.get("record_match_id") != record.get("match_id"):
        errors.append("trace record_match_id must match the completed record")
    if len(snapshots) != len(events) + 1:
        errors.append("trace must contain initial state and one snapshot per event")
    if [row.get("event_seq") for row in snapshots] != list(range(len(events) + 1)):
        errors.append("trace event_seq must be contiguous")
    for index, snapshot in enumerate(snapshots):
        if snapshot.get("sha256") != canonical_sha256(snapshot.get("state")):
            errors.append(f"trace snapshot {index} hash does not match canonical state")
    for index, event in enumerate(events, 1):
        if index >= len(snapshots):
            break
        if event.get("before_state_sha256") != snapshots[index - 1].get("sha256"):
            errors.append(f"event {index} before hash does not match trace")
        if event.get("after_state_sha256") != snapshots[index].get("sha256"):
            errors.append(f"event {index} after hash does not match trace")
    expected_decision_ids = {row.get("decision_id") for row in decisions}
    linked = {choice_id for event in events for choice_id in event.get("choice_ids", [])
              if isinstance(choice_id, str) and choice_id.startswith("decision-")}
    if linked != expected_decision_ids:
        errors.append("every normal decision must link to exactly one resulting event")
    return errors


def validate_normal_decision_suite(suite, plan, protocol, catalog):
    errors = []
    matches = suite.get("matches", [])
    if len(matches) != 2:
        errors.append("108 suite must contain exactly two matches")
    required_fields = set(protocol.get("choice_record_required_fields", []))
    reason_codes = set(protocol.get("reason_codes", []))
    for built, spec in zip(matches, plan.get("matches", [])):
        record = built.get("record", {})
        trace = built.get("trace", {})
        match_id = record.get("match_id", "<missing-match-id>")
        for error in validate_record(record, catalog):
            errors.append(f"{match_id}: {error}")
        for error in _validate_trace(record, trace):
            errors.append(f"{match_id}: {error}")
        if record.get("record", {}).get("status") != "completed":
            errors.append(f"{match_id} must be completed")
        if record.get("record", {}).get("result", {}).get("final_growth") != spec.get("expected_final_growth"):
            errors.append(f"{match_id} final growth differs from plan")
        if record.get("record", {}).get("result", {}).get("winner") != spec.get("expected_winner"):
            errors.append(f"{match_id} winner differs from plan")
        decisions = trace.get("decisions", [])
        if len(decisions) != spec.get("expected_decision_count"):
            errors.append(f"{match_id} decision count differs from plan")
        for decision in decisions:
            decision_id = decision.get("decision_id", "<missing-decision-id>")
            actual_fields = set(decision) - {"decision_id", "decision_seq", "event_seq", "actor", "round"}
            if actual_fields != required_fields:
                errors.append(f"{match_id} {decision_id} required fields differ from protocol")
            candidates = decision.get("legal_candidates", [])
            if "pass" not in [row.get("kind") for row in candidates]:
                errors.append(f"{match_id} {decision_id} must include pass")
            selected_id = decision.get("selected_action", {}).get("candidate_id")
            if selected_id not in [row.get("candidate_id") for row in candidates]:
                errors.append(f"{match_id} {decision_id} selected action must be legal")
            if decision.get("reason_code") not in reason_codes:
                errors.append(f"{match_id} {decision_id} reason code is not approved")
            public = decision.get("public_information", {})
            if "opponent_hand" in public or "opponent_deck" in public:
                errors.append(f"{match_id} {decision_id} exposes opponent hidden information")
            if public.get("information_policy") != "public_and_owner_known_only":
                errors.append(f"{match_id} {decision_id} violates the information policy")
    evaluation = suite.get("evaluation", {})
    if evaluation.get("completed_match_count") != 2:
        errors.append("108 evaluation must count exactly two completed matches")
    if evaluation.get("independent_balance_sample_count") != 0:
        errors.append("108 fixed matches must not count as independent balance samples")
    if evaluation.get("unresolved_decisions") != 0:
        errors.append("108 completed pair must have zero unresolved decisions")
    return errors


def write_normal_decision_suite(suite, record_directory, trace_directory, evaluation_path):
    record_output = Path(record_directory)
    trace_output = Path(trace_directory)
    evaluation_output = Path(evaluation_path)
    record_output.mkdir(parents=True, exist_ok=True)
    trace_output.mkdir(parents=True, exist_ok=True)
    evaluation_output.parent.mkdir(parents=True, exist_ok=True)
    for built in suite["matches"]:
        record = built["record"]
        trace = built["trace"]
        (record_output / f"{record['match_id']}.json").write_text(
            json.dumps(record, ensure_ascii=False, indent=2) + "\n")
        (trace_output / f"{trace['trace_id']}.json").write_text(
            json.dumps(trace, ensure_ascii=False, indent=2) + "\n")
    evaluation_output.write_text(json.dumps(suite["evaluation"], ensure_ascii=False, indent=2) + "\n")


def validate_materialized_suite(suite, record_directory, trace_directory, evaluation_path):
    errors = []
    record_output = Path(record_directory)
    trace_output = Path(trace_directory)
    expected_records = {f"{row['record']['match_id']}.json": row["record"] for row in suite["matches"]}
    expected_traces = {f"{row['trace']['trace_id']}.json": row["trace"] for row in suite["matches"]}
    actual_records = {path.name for path in record_output.glob("*.json")} if record_output.exists() else set()
    actual_traces = {path.name for path in trace_output.glob("*.json")} if trace_output.exists() else set()
    if actual_records != set(expected_records):
        errors.append("materialized 108 record filenames differ from plan")
    if actual_traces != set(expected_traces):
        errors.append("materialized 108 trace filenames differ from plan")
    for name in sorted(actual_records & set(expected_records)):
        if load_json(record_output / name) != expected_records[name]:
            errors.append(f"materialized 108 record differs from builder: {name}")
    for name in sorted(actual_traces & set(expected_traces)):
        if load_json(trace_output / name) != expected_traces[name]:
            errors.append(f"materialized 108 trace differs from builder: {name}")
    evaluation = Path(evaluation_path)
    if not evaluation.exists() or load_json(evaluation) != suite["evaluation"]:
        errors.append("materialized 108 evaluation differs from builder")
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", default=DEFAULT_PLAN)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)
    plan_path = Path(args.plan)
    plan = load_json(plan_path)
    protocol = load_json(plan_path.parent / plan["protocol"])
    fixtures = [load_json(plan_path.parent / row["source_fixture"]) for row in plan["matches"]]
    suite = build_normal_decision_pair(fixtures, plan, protocol)
    errors = validate_normal_decision_suite(suite, plan, protocol, load_current_catalog())
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    records = plan_path.parent / plan["record_output_directory"]
    traces = plan_path.parent / plan["trace_output_directory"]
    evaluation = plan_path.parent / plan["evaluation_output"]
    if args.write:
        write_normal_decision_suite(suite, records, traces, evaluation)
    if records.exists() or traces.exists() or evaluation.exists():
        errors = validate_materialized_suite(suite, records, traces, evaluation)
        if errors:
            print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
            return 1
    print(json.dumps({
        "valid": True,
        "completed_records": len(suite["matches"]),
        "decisions_per_record": [len(row["trace"]["decisions"]) for row in suite["matches"]],
        "events_per_record": [len(row["record"]["record"]["events"]) for row in suite["matches"]],
        "final_growth": [row["record"]["record"]["result"]["final_growth"] for row in suite["matches"]],
        "written": args.write,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
