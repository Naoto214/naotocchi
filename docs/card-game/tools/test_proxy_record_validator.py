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

    def test_accepts_the_98_unplayed_fixture(self):
        self.assertEqual(validate_record(self.fixture, self.catalog), [])

    def test_rejects_initial_hand_that_is_not_the_deck_top(self):
        record = copy.deepcopy(self.fixture)
        record["input"]["players"][0]["initial_hand"][0] = "A-006"

        self.assertIn(
            "input.players[A].initial_hand must equal the first five deck instance IDs",
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
        deck[0]["instance_id"] = "A-001"
        for card in deck:
            if card["card_id"].startswith("E-"):
                card["card_id"] = "G-air-hockey"

        errors = validate_record(record, self.catalog)
        self.assertIn("instance IDs must be unique across both decks", errors)
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
            "source_instance_id": "A-001",
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

    def test_canonical_state_hash_is_key_order_independent(self):
        left = {"zones": {"hand": ["A-001"]}, "growth": {"A": 20, "B": 20}}
        right = {"growth": {"B": 20, "A": 20}, "zones": {"hand": ["A-001"]}}

        self.assertEqual(canonical_sha256(left), canonical_sha256(right))
        self.assertEqual(len(canonical_sha256(left)), 64)


if __name__ == "__main__":
    unittest.main()
