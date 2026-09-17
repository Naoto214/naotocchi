#!/usr/bin/env python3
import copy
import json
from pathlib import Path
import unittest

from proxy_record_validator import canonical_sha256, load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"


class ProxyRecordValidatorTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads(
            (DATA / "proxy-match-record-example-20260917.json").read_text()
        )
        cls.catalog = load_current_catalog()

    def test_accepts_the_split_copy_and_instance_fixture(self):
        self.assertEqual(validate_record(self.fixture, self.catalog), [])

    def test_rejects_initial_hand_that_is_not_the_deck_top(self):
        record = copy.deepcopy(self.fixture)
        record["input"]["players"][0]["initial_hand"][0] = "A-006#1"

        self.assertIn(
            "input.players[A].initial_hand must equal the first five initial instance IDs",
            validate_record(record, self.catalog),
        )

    def test_rejects_missing_seat_without_crashing(self):
        record = copy.deepcopy(self.fixture)
        del record["input"]["players"][0]["seat"]

        self.assertIn(
            "input.players seats must contain first and second once each",
            validate_record(record, self.catalog),
        )

    def test_rejects_duplicate_instances_and_a_deck_missing_a_card_type(self):
        record = copy.deepcopy(self.fixture)
        deck = record["input"]["players"][1]["deck_order_top_to_bottom"]
        deck[0]["card_copy_id"] = "A-001"
        deck[0]["initial_instance_id"] = "A-001#1"
        for card in deck:
            if card["card_id"].startswith("E-"):
                card["card_id"] = "G-air-hockey"

        errors = validate_record(record, self.catalog)
        self.assertIn("card copy IDs must be unique across both decks", errors)
        self.assertIn("initial instance IDs must be unique across both decks", errors)
        self.assertIn("input.players[B].deck must contain all seven card types", errors)

    def test_rejects_unknown_card_ids(self):
        record = copy.deepcopy(self.fixture)
        record["input"]["players"][0]["deck_order_top_to_bottom"][7]["card_id"] = "M-not-real-08"

        self.assertIn(
            "input.players[A].deck contains unknown current-catalog card ID M-not-real-08",
            validate_record(record, self.catalog),
        )

    def test_rejects_malformed_design_identity(self):
        record = copy.deepcopy(self.fixture)
        record["design"]["rules_commit"] = "short"
        record["design"]["rules_tree"] = "not-a-tree"
        record["design"]["catalog_records_sha256"] = "UPPER"

        errors = validate_record(record, self.catalog)
        self.assertIn("design.rules_commit must be 40 lowercase hex characters", errors)
        self.assertIn("design.rules_tree must be 40 lowercase hex characters", errors)
        self.assertIn(
            "design.catalog_records_sha256 must be 64 lowercase hex characters",
            errors,
        )

    def test_rejects_broken_event_references_and_hashes(self):
        record = copy.deepcopy(self.fixture)
        record["record"]["status"] = "in_progress"
        record["record"]["events"] = [{
            "seq": 2,
            "round": 1,
            "turn_player": "A",
            "phase": "main",
            "actor": "A",
            "action_type": "play",
            "source_instance_id": "A-001#1",
            "target_instance_ids": [],
            "payment": {
                "time": 1,
                "hand_to_discard": [],
                "prepared_to_discard": [],
                "deck_to_bottom": [],
            },
            "choice_ids": ["choice-missing"],
            "chain": {
                "chain_id": "chain-1",
                "link_index": 2,
                "responds_to_seq": 2,
            },
            "reservations_created": ["reservation-missing"],
            "reservations_consumed": [],
            "instance_transitions": [],
            "before_state_sha256": "bad",
            "after_state_sha256": "also-bad",
            "result": "pending",
        }]

        errors = validate_record(record, self.catalog)
        self.assertIn("record.events seq must be contiguous from 1", errors)
        self.assertIn("record.events[2] responds_to_seq must reference an earlier event", errors)
        self.assertIn("record.events[2] references unknown choice ID choice-missing", errors)
        self.assertIn("record.events[2] creates unknown reservation ID reservation-missing", errors)
        self.assertIn("record.events[2].before_state_sha256 must be 64 lowercase hex characters", errors)

    def test_accepts_reentry_as_a_new_instance_without_migrating_reservation(self):
        record = copy.deepcopy(self.fixture)
        record["record"]["status"] = "in_progress"
        record["record"]["reservations"] = [{
            "reservation_id": "reservation-1",
            "source_instance_id": "A-002#1",
            "controller": "A",
            "target_instance_ids": ["A-001#1"],
            "created_seq": 1,
            "deadline": {"kind": "next_turn_start", "round": 2, "player": "A"},
            "uses_remaining": 1,
            "status": "active",
        }]
        record["record"]["events"] = [
            self._event(1, "A-002#1", reservations_created=["reservation-1"]),
            self._event(2, "A-001#1", instance_transitions=[{
                "card_copy_id": "A-001",
                "from_instance_id": "A-001#1",
                "to_instance_id": "A-001#2",
                "reason": "zone_change",
            }]),
        ]

        self.assertEqual(validate_record(record, self.catalog), [])
        self.assertEqual(
            record["record"]["reservations"][0]["target_instance_ids"],
            ["A-001#1"],
        )

    def test_rejects_transition_to_an_instance_of_another_card_copy(self):
        record = copy.deepcopy(self.fixture)
        record["record"]["status"] = "in_progress"
        record["record"]["events"] = [self._event(1, "A-001#1", instance_transitions=[{
            "card_copy_id": "A-001",
            "from_instance_id": "A-001#1",
            "to_instance_id": "A-002#2",
            "reason": "zone_change",
        }])]

        self.assertIn(
            "record.events[1] transition to_instance_id must belong to card copy A-001",
            validate_record(record, self.catalog),
        )

    def test_rejects_later_event_reference_to_retired_instance(self):
        record = copy.deepcopy(self.fixture)
        record["record"]["status"] = "in_progress"
        record["record"]["events"] = [
            self._event(1, "A-001#1", instance_transitions=[{
                "card_copy_id": "A-001",
                "from_instance_id": "A-001#1",
                "to_instance_id": "A-001#2",
                "reason": "zone_change",
            }]),
            self._event(2, "A-001#1"),
        ]

        self.assertIn(
            "record.events[2] references inactive instance ID A-001#1",
            validate_record(record, self.catalog),
        )

    def test_rejects_nonsequential_or_untyped_transition_without_retiring_source(self):
        record = copy.deepcopy(self.fixture)
        record["record"]["status"] = "in_progress"
        record["record"]["events"] = [
            self._event(1, "A-001#1", instance_transitions=[{
                "card_copy_id": "A-001",
                "from_instance_id": "A-001#1",
                "to_instance_id": "A-001#3",
                "reason": "return_to_field",
            }]),
            self._event(2, "A-001#1"),
        ]

        errors = validate_record(record, self.catalog)
        self.assertIn(
            "record.events[1] transition must increment the instance generation by 1",
            errors,
        )
        self.assertIn(
            "record.events[1] transition reason must be zone_change",
            errors,
        )
        self.assertNotIn(
            "record.events[2] references inactive instance ID A-001#1",
            errors,
        )

    def test_canonical_state_hash_is_key_order_independent(self):
        left = {"zones": {"hand": ["A-001"]}, "growth": {"A": 20, "B": 20}}
        right = {"growth": {"B": 20, "A": 20}, "zones": {"hand": ["A-001"]}}

        self.assertEqual(canonical_sha256(left), canonical_sha256(right))
        self.assertEqual(len(canonical_sha256(left)), 64)

    @staticmethod
    def _event(seq, source_instance_id, reservations_created=None,
               instance_transitions=None):
        return {
            "seq": seq,
            "round": 1,
            "turn_player": "A",
            "phase": "main",
            "actor": "A",
            "action_type": "play",
            "source_instance_id": source_instance_id,
            "target_instance_ids": [],
            "payment": {
                "time": 0,
                "hand_to_discard": [],
                "prepared_to_discard": [],
                "deck_to_bottom": [],
            },
            "choice_ids": [],
            "chain": {
                "chain_id": f"chain-{seq}",
                "link_index": 1,
                "responds_to_seq": None,
            },
            "reservations_created": reservations_created or [],
            "reservations_consumed": [],
            "instance_transitions": instance_transitions or [],
            "before_state_sha256": "0" * 64,
            "after_state_sha256": "1" * 64,
            "result": "resolved",
        }


if __name__ == "__main__":
    unittest.main()
