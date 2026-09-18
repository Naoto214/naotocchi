#!/usr/bin/env python3
import copy
import json
from pathlib import Path
import unittest

from proxy_record_validator import canonical_sha256, load_current_catalog, validate_record
from proxy_reservation_pilot import (
    build_p97_06_reservation_pair,
    load_json,
    validate_materialized_reservation_pilots,
    validate_reservation_pair,
    validate_reservation_trace,
)


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
PLAN = DATA / "proxy-reservation-plan-104-20260918.json"
FIXTURE_A_FIRST = DATA / "proxy-fixtures-101/fixture-101-p97-06-single.json"
FIXTURE_A_SECOND = DATA / "proxy-fixtures-102/fixture-102-p97-06-single-a-second.json"


class ProxyReservationPilotTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = load_json(PLAN)
        cls.catalog = load_current_catalog()
        cls.sources = [load_json(FIXTURE_A_FIRST), load_json(FIXTURE_A_SECOND)]
        cls.pilots = build_p97_06_reservation_pair(
            cls.sources[0], cls.sources[1], cls.plan
        )

    def test_pilot_input_moves_existing_target_to_b_initial_hand(self):
        for source, pilot in zip(self.sources, self.pilots):
            source_b = next(row for row in source["input"]["players"]
                            if row["player_id"] == "B")
            pilot_b = next(row for row in pilot["record"]["input"]["players"]
                           if row["player_id"] == "B")
            source_cards = {
                row["initial_instance_id"]: row["card_id"]
                for row in source_b["deck_order_top_to_bottom"]
            }
            pilot_cards = {
                row["initial_instance_id"]: row["card_id"]
                for row in pilot_b["deck_order_top_to_bottom"]
            }
            self.assertEqual(pilot_cards, source_cards)
            self.assertEqual(pilot_b["initial_hand"][-1], "B-034#1")
            self.assertEqual(
                [row["initial_instance_id"] for row in
                 pilot_b["deck_order_top_to_bottom"][:5]],
                pilot_b["initial_hand"],
            )
            self.assertEqual(
                pilot_b["deck_order_top_to_bottom"][33]["initial_instance_id"],
                "B-005#1",
            )

    def test_builds_consumed_and_expired_completed_records(self):
        self.assertEqual(len(self.pilots), 2)
        self.assertEqual(
            [row["record"]["input"]["first_player"] for row in self.pilots],
            ["A", "B"],
        )
        self.assertEqual(
            [len(row["record"]["record"]["events"]) for row in self.pilots],
            [43, 42],
        )
        self.assertEqual(
            [row["record"]["record"]["reservations"][0]["status"]
             for row in self.pilots],
            ["consumed", "expired"],
        )
        for pilot in self.pilots:
            record = pilot["record"]
            self.assertEqual(record["record"]["status"], "completed")
            self.assertEqual(record["record"]["result"]["winner"], "draw")
            self.assertEqual(record["record"]["result"]["final_growth"], {"A": 20, "B": 20})
            self.assertEqual(validate_record(record, self.catalog), [])

    def test_prepare_and_breakout_events_record_cost_target_and_reservation(self):
        expected_rounds = [2, 10]
        expected_created_seq = [7, 41]
        for pilot, breakout_round, created_seq in zip(
                self.pilots, expected_rounds, expected_created_seq):
            record = pilot["record"]
            prepare = [row for row in record["record"]["events"]
                       if row["action_type"] == "prepare_toilet_paper"]
            breakout = [row for row in record["record"]["events"]
                        if row["action_type"] == "play_breakout"]
            self.assertEqual(len(prepare), 1)
            self.assertEqual(prepare[0]["source_instance_id"], "B-034#1")
            self.assertEqual(prepare[0]["payment"]["time"], 1)
            self.assertEqual(len(breakout), 1)
            self.assertEqual(breakout[0]["round"], breakout_round)
            self.assertEqual(breakout[0]["source_instance_id"], "A-001#1")
            self.assertEqual(breakout[0]["target_instance_ids"], ["B-034#1"])
            self.assertEqual(breakout[0]["payment"]["time"], 2)
            reservation = record["record"]["reservations"][0]
            self.assertEqual(reservation["created_seq"], created_seq)
            self.assertEqual(breakout[0]["reservations_created"],
                             [reservation["reservation_id"]])
            self.assertEqual(reservation["source_instance_id"], "A-001#1")
            self.assertEqual(reservation["target_instance_ids"], ["B-034#1"])
            self.assertEqual(reservation["deadline"]["kind"], "next_own_turn_start")

    def test_consumed_path_returns_target_at_a_round_three_start(self):
        record = self.pilots[0]["record"]
        reservation = record["record"]["reservations"][0]
        execute = [row for row in record["record"]["events"]
                   if row["action_type"] == "execute_breakout_reservation"]
        self.assertEqual(len(execute), 1)
        self.assertEqual((execute[0]["round"], execute[0]["turn_player"]), (3, "A"))
        self.assertEqual(execute[0]["reservations_consumed"],
                         [reservation["reservation_id"]])
        self.assertEqual(reservation["deadline"], {
            "kind": "next_own_turn_start", "round": 3, "player": "A"
        })
        self.assertEqual(reservation["uses_remaining"], 0)
        final_b = self.pilots[0]["trace"]["snapshots"][-1]["state"]["players"]["B"]
        self.assertIn("B-034#1", final_b["hand"])
        self.assertNotIn("B-034#1", final_b["field"]["prepared"])

    def test_expired_path_keeps_target_and_does_not_create_round_eleven(self):
        record = self.pilots[1]["record"]
        reservation = record["record"]["reservations"][0]
        self.assertEqual(reservation["deadline"], {
            "kind": "next_own_turn_start", "round": 11, "player": "A"
        })
        self.assertEqual(reservation["uses_remaining"], 1)
        self.assertFalse(any(row["action_type"] == "execute_breakout_reservation"
                             for row in record["record"]["events"]))
        self.assertFalse(any(row["round"] == 11 for row in record["record"]["events"]))
        self.assertFalse(any(reservation["reservation_id"] in row["reservations_consumed"]
                             for row in record["record"]["events"]))
        final_state = self.pilots[1]["trace"]["snapshots"][-1]["state"]
        self.assertIn("B-034#1", final_state["players"]["B"]["field"]["prepared"])
        self.assertEqual(final_state["reservations"][reservation["reservation_id"]]["status"],
                         "expired")
        self.assertEqual(final_state["round"], 10)

    def test_trace_hashes_and_reservation_state_are_contiguous(self):
        for pilot in self.pilots:
            record, trace = pilot["record"], pilot["trace"]
            self.assertEqual(len(trace["snapshots"]),
                             len(record["record"]["events"]) + 1)
            self.assertEqual(validate_reservation_trace(record, trace), [])
            for snapshot in trace["snapshots"]:
                self.assertEqual(snapshot["sha256"], canonical_sha256(snapshot["state"]))
            self.assertEqual(trace["snapshots"][-1]["state"]["phase"], "completed")

    def test_pair_validator_rejects_wrong_terminal_status_and_tampered_trace(self):
        broken = copy.deepcopy(self.pilots)
        broken[0]["record"]["record"]["reservations"][0]["status"] = "active"
        broken[1]["trace"]["snapshots"][-1]["state"]["round"] = 11
        errors = validate_reservation_pair(broken, self.catalog)
        self.assertIn("reservation pilot statuses must be consumed and expired", errors)
        self.assertIn(
            "completed-104-p97-06-single-a-second-expired: trace final snapshot sha256 does not match its canonical state",
            errors,
        )

    def test_materialized_files_exactly_match_the_deterministic_builder(self):
        errors = validate_materialized_reservation_pilots(
            self.pilots,
            DATA / self.plan["record_output_directory"],
            DATA / self.plan["trace_output_directory"],
        )
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
