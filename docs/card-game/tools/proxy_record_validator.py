#!/usr/bin/env python3
"""Validate a proxy match record without executing card effects.

The validator checks replay identity and references.  It is not a gameplay
engine and does not decide whether an action or card effect is legally timed.
"""

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys


TOOLS = Path(__file__).resolve().parent
CURRENT_CATALOG_KEYS = {
    "cards": "main",
    "companions": "companion",
    "partners": "partner",
    "worlds": "world",
    "play_cards": "play",
    "items_current_source": "item",
    "events": "event",
}
CARD_TYPES = set(CURRENT_CATALOG_KEYS.values())
INSTANCE_RE = re.compile(r"^[AB]-[0-9]{3}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
GIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def canonical_sha256(value):
    payload = json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def load_current_catalog(audit_json=None):
    """Return current card ID -> seven-type mapping from the canonical audit."""
    if audit_json is None:
        output = subprocess.check_output(
            [sys.executable, str(TOOLS / "check-design-data.py"), "--catalog"],
            cwd=TOOLS.parents[2],
            text=True,
        )
        audit = json.loads(output)
    else:
        audit = json.loads(Path(audit_json).read_text())
    if audit.get("errors"):
        raise ValueError(f"catalog audit has errors: {audit['errors']}")
    catalog = {}
    for key, card_type in CURRENT_CATALOG_KEYS.items():
        for row in audit.get(key, []):
            card_id = row.get("id")
            if card_id in catalog:
                raise ValueError(f"duplicate current-catalog ID: {card_id}")
            catalog[card_id] = card_type
    if len(catalog) != 452:
        raise ValueError(f"expected 452 current-catalog IDs, got {len(catalog)}")
    return catalog


def _add_hash_error(errors, label, value):
    if not isinstance(value, str) or not SHA256_RE.fullmatch(value):
        errors.append(f"{label} must be 64 lowercase hex characters")


def validate_record(record, catalog):
    """Return deterministic semantic errors for one schema-v1 record."""
    errors = []
    if not isinstance(record, dict):
        return ["record root must be an object"]
    if record.get("schema_version") != "naotocchi.card_game.proxy_match_record.v1":
        errors.append("schema_version must be naotocchi.card_game.proxy_match_record.v1")

    design = record.get("design")
    if not isinstance(design, dict):
        errors.append("design must be an object")
    else:
        for key in ("rules_commit", "rules_tree"):
            value = design.get(key)
            if not isinstance(value, str) or not GIT_SHA_RE.fullmatch(value):
                errors.append(f"design.{key} must be 40 lowercase hex characters")
        _add_hash_error(
            errors,
            "design.catalog_records_sha256",
            design.get("catalog_records_sha256"),
        )

    match_input = record.get("input")
    match_record = record.get("record")
    if not isinstance(match_input, dict):
        return errors + ["input must be an object"]
    if not isinstance(match_record, dict):
        return errors + ["record must be an object"]

    players = match_input.get("players")
    if not isinstance(players, list) or len(players) != 2:
        return errors + ["input.players must contain exactly two players"]
    player_ids = [player.get("player_id") for player in players if isinstance(player, dict)]
    if set(player_ids) != {"A", "B"} or len(player_ids) != 2:
        errors.append("input.players must contain player IDs A and B once each")
    seats = [player.get("seat") for player in players if isinstance(player, dict)]
    if len(seats) != 2 or set(seats) != {"first", "second"}:
        errors.append("input.players seats must contain first and second once each")
    first_player = match_input.get("first_player")
    if first_player not in {"A", "B"}:
        errors.append("input.first_player must be A or B")
    elif not any(
        player.get("player_id") == first_player and player.get("seat") == "first"
        for player in players if isinstance(player, dict)
    ):
        errors.append("input.first_player must match the player in the first seat")

    instance_ids = []
    for player in players:
        if not isinstance(player, dict):
            errors.append("each input.players entry must be an object")
            continue
        player_id = player.get("player_id", "?")
        deck = player.get("deck_order_top_to_bottom")
        hand = player.get("initial_hand")
        if not isinstance(deck, list) or len(deck) != 40:
            errors.append(f"input.players[{player_id}].deck must contain exactly 40 cards")
            deck = deck if isinstance(deck, list) else []
        deck_instance_ids = []
        deck_types = set()
        unknown_ids = set()
        for card in deck:
            if not isinstance(card, dict):
                errors.append(f"input.players[{player_id}].deck entries must be objects")
                continue
            instance_id = card.get("instance_id")
            card_id = card.get("card_id")
            deck_instance_ids.append(instance_id)
            instance_ids.append(instance_id)
            if not isinstance(instance_id, str) or not INSTANCE_RE.fullmatch(instance_id):
                errors.append(f"input.players[{player_id}] has invalid instance ID {instance_id}")
            elif player_id in {"A", "B"} and not instance_id.startswith(f"{player_id}-"):
                errors.append(f"input.players[{player_id}] instance ID {instance_id} has the wrong owner prefix")
            card_type = catalog.get(card_id)
            if card_type is None:
                unknown_ids.add(card_id)
            else:
                deck_types.add(card_type)
        for card_id in sorted(unknown_ids, key=str):
            errors.append(
                f"input.players[{player_id}].deck contains unknown current-catalog card ID {card_id}"
            )
        if deck_types != CARD_TYPES:
            errors.append(f"input.players[{player_id}].deck must contain all seven card types")
        if hand != deck_instance_ids[:5]:
            errors.append(
                f"input.players[{player_id}].initial_hand must equal the first five deck instance IDs"
            )
    if len(instance_ids) != len(set(instance_ids)):
        errors.append("instance IDs must be unique across both decks")
    known_instances = set(instance_ids)

    choices = match_input.get("declared_choices", [])
    choice_ids = []
    if not isinstance(choices, list):
        errors.append("input.declared_choices must be an array")
        choices = []
    for choice in choices:
        if not isinstance(choice, dict) or not isinstance(choice.get("choice_id"), str):
            errors.append("each declared choice must have a string choice_id")
            continue
        choice_ids.append(choice["choice_id"])
    if len(choice_ids) != len(set(choice_ids)):
        errors.append("declared choice IDs must be unique")
    known_choices = set(choice_ids)

    reservations = match_record.get("reservations", [])
    reservation_by_id = {}
    if not isinstance(reservations, list):
        errors.append("record.reservations must be an array")
        reservations = []
    for reservation in reservations:
        if not isinstance(reservation, dict) or not isinstance(reservation.get("reservation_id"), str):
            errors.append("each reservation must have a string reservation_id")
            continue
        reservation_id = reservation["reservation_id"]
        if reservation_id in reservation_by_id:
            errors.append("reservation IDs must be unique")
        reservation_by_id[reservation_id] = reservation
        references = [reservation.get("source_instance_id")] + reservation.get("target_instance_ids", [])
        for instance_id in references:
            if instance_id not in known_instances:
                errors.append(f"reservation {reservation_id} references unknown instance ID {instance_id}")

    events = match_record.get("events")
    if not isinstance(events, list):
        return errors + ["record.events must be an array"]
    sequences = [event.get("seq") for event in events if isinstance(event, dict)]
    if sequences != list(range(1, len(events) + 1)):
        errors.append("record.events seq must be contiguous from 1")
    known_sequences = set(sequences)
    chain_links = {}
    created_reservations = set()
    consumed_reservations = set()
    for event in events:
        if not isinstance(event, dict):
            errors.append("each record.events entry must be an object")
            continue
        seq = event.get("seq")
        label = f"record.events[{seq}]"
        references = [event.get("source_instance_id")] + event.get("target_instance_ids", [])
        payment = event.get("payment", {})
        for key in ("hand_to_discard", "prepared_to_discard", "deck_to_bottom"):
            references.extend(payment.get(key, []) if isinstance(payment, dict) else [])
        for instance_id in references:
            if instance_id is not None and instance_id not in known_instances:
                errors.append(f"{label} references unknown instance ID {instance_id}")
        for choice_id in event.get("choice_ids", []):
            if choice_id not in known_choices:
                errors.append(f"{label} references unknown choice ID {choice_id}")
        chain = event.get("chain", {})
        responds_to = chain.get("responds_to_seq") if isinstance(chain, dict) else None
        if responds_to is not None and (
            responds_to not in known_sequences or not isinstance(seq, int) or responds_to >= seq
        ):
            errors.append(f"{label} responds_to_seq must reference an earlier event")
        chain_id = chain.get("chain_id") if isinstance(chain, dict) else None
        link_index = chain.get("link_index") if isinstance(chain, dict) else None
        if isinstance(chain_id, str):
            chain_links.setdefault(chain_id, []).append(link_index)
        for reservation_id in event.get("reservations_created", []):
            created_reservations.add(reservation_id)
            if reservation_id not in reservation_by_id:
                errors.append(f"{label} creates unknown reservation ID {reservation_id}")
        for reservation_id in event.get("reservations_consumed", []):
            consumed_reservations.add(reservation_id)
            if reservation_id not in reservation_by_id:
                errors.append(f"{label} consumes unknown reservation ID {reservation_id}")
        _add_hash_error(errors, f"{label}.before_state_sha256", event.get("before_state_sha256"))
        _add_hash_error(errors, f"{label}.after_state_sha256", event.get("after_state_sha256"))
    for chain_id, links in sorted(chain_links.items()):
        if links != list(range(1, len(links) + 1)):
            errors.append(f"chain {chain_id} link_index must be contiguous from 1")
    for reservation_id, reservation in reservation_by_id.items():
        if reservation.get("created_seq") not in known_sequences:
            errors.append(f"reservation {reservation_id} created_seq must reference an event")
        if reservation_id not in created_reservations:
            errors.append(f"reservation {reservation_id} must be listed by its creating event")
        if reservation.get("status") == "consumed" and reservation_id not in consumed_reservations:
            errors.append(f"consumed reservation {reservation_id} must be listed by an event")

    status = match_record.get("status")
    if status not in {"fixture", "in_progress", "completed", "aborted"}:
        errors.append("record.status is invalid")
    if status == "fixture" and events:
        errors.append("fixture records must not contain events")
    result = match_record.get("result", {})
    if status == "completed" and isinstance(result, dict):
        if result.get("winner") not in {"A", "B", "draw"}:
            errors.append("completed records must name winner A, B or draw")
        if not result.get("reason"):
            errors.append("completed records must include a result reason")
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("record", nargs="?", help="schema-v1 record JSON")
    parser.add_argument("--catalog-json", help="saved --catalog output instead of running the canonical audit")
    parser.add_argument("--hash-state", help="print canonical SHA-256 for a state JSON file")
    args = parser.parse_args(argv)
    if args.hash_state:
        if args.record:
            parser.error("record and --hash-state are mutually exclusive")
        print(canonical_sha256(json.loads(Path(args.hash_state).read_text())))
        return 0
    if not args.record:
        parser.error("record is required unless --hash-state is used")
    record = json.loads(Path(args.record).read_text())
    errors = validate_record(record, load_current_catalog(args.catalog_json))
    print(json.dumps({"valid": not errors, "errors": errors}, ensure_ascii=False, indent=2))
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
