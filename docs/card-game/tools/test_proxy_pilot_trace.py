#!/usr/bin/env python3
import copy
import json
from pathlib import Path
import unittest

from proxy_pilot_trace import (
    build_p97_03_pilot_pair,
    load_json,
    validate_materialized_pilots,
    validate_pilot_pair,
    validate_trace,
)
from proxy_record_validator import canonical_sha256, load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
PLAN = DATA / "proxy-pilot-plan-103-20260918.json"
FIXTURE_A_FIRST = DATA / "proxy-fixtures-101/fixture-101-p97-03-single.json"
FIXTURE_A_SECOND = DATA / "proxy-fixtures-102/fixture-102-p97-03-single-a-second.json"


class ProxyPilotTraceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = load_json(PLAN)
        cls.catalog = load_current_catalog()
        cls.pilots = build_p97_03_pilot_pair(
            load_json(FIXTURE_A_FIRST),
            load_json(FIXTURE_A_SECOND),
            cls.plan,
        )

    def test_builds_a_first_and_a_second_completed_records(self):
        self.assertEqual(len(self.pilots), 2)
        self.assertEqual(
            [row["record"]["input"]["first_player"] for row in self.pilots],
            ["A", "B"],
        )
        for pilot in self.pilots:
            record = pilot["record"]
            self.assertEqual(record["record"]["status"], "completed")
            self.assertEqual(len(record["record"]["events"]), 41)
            self.assertEqual(record["record"]["result"]["winner"], "A")
            self.assertEqual(record["record"]["result"]["rounds_completed"], 10)
            self.assertEqual(
                record["record"]["result"]["final_growth"], {"A": 25, "B": 20}
            )
            self.assertEqual(validate_record(record, self.catalog), [])

    def test_hit_blow_event_records_choice_payment_chain_and_effect(self):
        for pilot in self.pilots:
            record = pilot["record"]
            focus = [
                event for event in record["record"]["events"]
                if event["action_type"] == "play_hit_blow"
            ]
            self.assertEqual(len(focus), 1)
            event = focus[0]
            self.assertEqual((event["round"], event["turn_player"], event["actor"]), (1, "A", "A"))
            self.assertEqual(event["source_instance_id"], "A-001#1")
            self.assertEqual(event["target_instance_ids"], [])
            self.assertEqual(event["payment"]["time"], 1)
            self.assertEqual(event["choice_ids"], ["choice-p97-03-declare-main"])
            self.assertEqual(event["chain"]["link_index"], 1)
            self.assertIn("A-007#1", event["result"])
            choice = record["input"]["declared_choices"]
            self.assertEqual(choice[0]["kind"], "declared_card_type")
            self.assertEqual(choice[0]["value"], "main")

    def test_trace_hashes_are_contiguous_and_match_final_result(self):
        for pilot in self.pilots:
            record, trace = pilot["record"], pilot["trace"]
            self.assertEqual(len(trace["snapshots"]), 42)
            self.assertEqual(validate_trace(record, trace), [])
            for snapshot in trace["snapshots"]:
                self.assertEqual(snapshot["sha256"], canonical_sha256(snapshot["state"]))
            self.assertEqual(trace["snapshots"][-1]["state"]["phase"], "completed")

    def test_trace_validator_rejects_tampering_and_broken_continuity(self):
        record = copy.deepcopy(self.pilots[0]["record"])
        trace = copy.deepcopy(self.pilots[0]["trace"])
        trace["snapshots"][2]["state"]["players"]["A"]["growth"] = 99
        trace["snapshots"][3]["event_seq"] = 99
        errors = validate_trace(record, trace)
        self.assertIn("trace snapshot 2 sha256 does not match its canonical state", errors)
        self.assertIn("trace event_seq must run from 0 through the event count", errors)

    def test_pair_validator_rejects_missing_seat_pair_or_nonempty_reservations(self):
        broken = copy.deepcopy(self.pilots)
        broken.pop()
        broken[0]["record"]["record"]["reservations"] = [{"unexpected": True}]
        errors = validate_pilot_pair(broken, self.catalog)
        self.assertIn("pilot pair must contain exactly 2 records", errors)
        self.assertIn("pilot pair must contain first players A and B once each", errors)
        self.assertIn(
            "completed-103-p97-03-single-a-first must have no reservations in this controlled pilot",
            errors,
        )

    def test_materialized_validator_requires_exact_record_and_trace_files(self):
        record_dir = DATA / self.plan["record_output_directory"]
        trace_dir = DATA / self.plan["trace_output_directory"]
        self.assertEqual(
            validate_materialized_pilots(self.pilots, record_dir, trace_dir), []
        )


if __name__ == "__main__":
    unittest.main()
