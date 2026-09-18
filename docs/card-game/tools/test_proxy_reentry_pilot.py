#!/usr/bin/env python3
import copy
import json
from pathlib import Path
import unittest

from proxy_record_validator import canonical_sha256, load_current_catalog, validate_record
from proxy_reentry_pilot import (
    build_p97_05_reentry_pair,
    load_json,
    validate_materialized_reentry_pilots,
    validate_reentry_pair,
    validate_reentry_trace,
)


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
PLAN = DATA / "proxy-reentry-plan-105-20260918.json"
FIXTURE_A_FIRST = DATA / "proxy-fixtures-101/fixture-101-p97-05-single.json"
FIXTURE_A_SECOND = DATA / "proxy-fixtures-102/fixture-102-p97-05-single-a-second.json"


class ProxyReentryPilotTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = load_json(PLAN)
        cls.catalog = load_current_catalog()
        cls.sources = [load_json(FIXTURE_A_FIRST), load_json(FIXTURE_A_SECOND)]
        cls.pilots = build_p97_05_reentry_pair(
            cls.sources[0], cls.sources[1], cls.plan
        )

    def test_order_only_derivation_moves_four_existing_companions_to_initial_hand(self):
        expected_hand = [
            "A-001#1", "A-011#1", "A-012#1", "A-013#1", "A-014#1"
        ]
        for source, pilot in zip(self.sources, self.pilots):
            source_a = next(row for row in source["input"]["players"]
                            if row["player_id"] == "A")
            pilot_a = next(row for row in pilot["record"]["input"]["players"]
                           if row["player_id"] == "A")
            self.assertEqual(
                {row["initial_instance_id"]: row["card_id"]
                 for row in source_a["deck_order_top_to_bottom"]},
                {row["initial_instance_id"]: row["card_id"]
                 for row in pilot_a["deck_order_top_to_bottom"]},
            )
            self.assertEqual(pilot_a["initial_hand"], expected_hand)
            self.assertEqual(
                [row["initial_instance_id"] for row in
                 pilot_a["deck_order_top_to_bottom"][10:14]],
                ["A-002#1", "A-003#1", "A-004#1", "A-005#1"],
            )

    def test_builds_two_completed_draws_with_one_transition_each(self):
        self.assertEqual(
            [row["record"]["input"]["first_player"] for row in self.pilots],
            ["A", "B"],
        )
        for pilot in self.pilots:
            record = pilot["record"]
            events = record["record"]["events"]
            transitions = [transition for event in events
                           for transition in event["instance_transitions"]]
            self.assertEqual(len(events), 46)
            self.assertEqual(transitions, [{
                "card_copy_id": "A-011",
                "from_instance_id": "A-011#1",
                "to_instance_id": "A-011#2",
                "reason": "zone_change",
            }])
            self.assertEqual(record["record"]["reservations"], [])
            self.assertEqual(record["record"]["result"]["winner"], "draw")
            self.assertEqual(record["record"]["result"]["final_growth"],
                             {"A": 20, "B": 20})
            self.assertEqual(validate_record(record, self.catalog), [])

    def test_full_slot_replacement_then_animal_shogi_recovers_the_old_instance(self):
        expected_sequences = [(17, 18), (19, 20)]
        for pilot, (replace_seq, recover_seq) in zip(
                self.pilots, expected_sequences):
            events = pilot["record"]["record"]["events"]
            replace = [row for row in events
                       if row["action_type"] == "replace_companion_for_chameleon"]
            recover = [row for row in events
                       if row["action_type"] == "play_animal_shogi"]
            self.assertEqual(len(replace), 1)
            self.assertEqual(replace[0]["seq"], replace_seq)
            self.assertEqual((replace[0]["round"], replace[0]["turn_player"]),
                             (4, "A"))
            self.assertEqual(replace[0]["source_instance_id"], "A-014#1")
            self.assertEqual(replace[0]["target_instance_ids"], ["A-011#1"])
            self.assertEqual(len(recover), 1)
            self.assertEqual(recover[0]["seq"], recover_seq)
            self.assertEqual(recover[0]["source_instance_id"], "A-001#1")
            self.assertEqual(recover[0]["target_instance_ids"], ["A-011#1"])
            self.assertEqual(recover[0]["payment"]["time"], 2)
            self.assertIn("A-010#1", recover[0]["result"])

    def test_round_five_replay_creates_generation_two_and_retires_generation_one(self):
        expected_sequences = [23, 25]
        for pilot, expected_seq in zip(self.pilots, expected_sequences):
            record, trace = pilot["record"], pilot["trace"]
            replay = [row for row in record["record"]["events"]
                      if row["action_type"] == "replay_recovered_bat"]
            self.assertEqual(len(replay), 1)
            self.assertEqual(replay[0]["seq"], expected_seq)
            self.assertEqual((replay[0]["round"], replay[0]["turn_player"]),
                             (5, "A"))
            self.assertEqual(replay[0]["source_instance_id"], "A-011#1")
            self.assertEqual(replay[0]["target_instance_ids"], ["A-012#1"])
            final_a = trace["snapshots"][-1]["state"]["players"]["A"]
            self.assertIn("A-011#2", final_a["field"]["companions"])
            self.assertNotIn("A-011#1", final_a["field"]["companions"])
            self.assertNotIn("A-011#1", final_a["hand"])
            self.assertNotIn("A-011#1", final_a["discard"])
            self.assertIn("A-012#1", final_a["discard"])
            final_instances = trace["snapshots"][-1]["state"]["instances"]
            self.assertEqual(final_instances["A-011#1"]["status"], "retired")
            self.assertEqual(final_instances["A-011#2"]["status"], "active")

    def test_no_later_event_directly_references_the_retired_instance(self):
        for pilot in self.pilots:
            events = pilot["record"]["record"]["events"]
            transition_event = next(
                row for row in events if row["instance_transitions"]
            )
            for event in events[transition_event["seq"]:]:
                references = [event["source_instance_id"]]
                references += event["target_instance_ids"]
                references += event["payment"]["hand_to_discard"]
                references += event["payment"]["prepared_to_discard"]
                references += event["payment"]["deck_to_bottom"]
                self.assertNotIn("A-011#1", references)

    def test_trace_hashes_are_contiguous_and_match_completed_state(self):
        for pilot in self.pilots:
            record, trace = pilot["record"], pilot["trace"]
            self.assertEqual(len(trace["snapshots"]), 47)
            self.assertEqual(validate_reentry_trace(record, trace), [])
            for snapshot in trace["snapshots"]:
                self.assertEqual(snapshot["sha256"],
                                 canonical_sha256(snapshot["state"]))
            self.assertEqual(trace["snapshots"][-1]["state"]["phase"], "completed")

    def test_pair_validator_rejects_transition_tampering_and_old_instance_reuse(self):
        broken = copy.deepcopy(self.pilots)
        replay = next(row for row in broken[0]["record"]["record"]["events"]
                      if row["action_type"] == "replay_recovered_bat")
        replay["instance_transitions"][0]["to_instance_id"] = "A-011#3"
        final_event = broken[1]["record"]["record"]["events"][-1]
        final_event["source_instance_id"] = "A-011#1"
        errors = validate_reentry_pair(broken, self.catalog)
        self.assertTrue(any("transition must increment the instance generation by 1"
                            in row for row in errors))
        self.assertTrue(any("references inactive instance ID A-011#1"
                            in row for row in errors))

    def test_materialized_files_exactly_match_the_deterministic_builder(self):
        errors = validate_materialized_reentry_pilots(
            self.pilots,
            DATA / self.plan["record_output_directory"],
            DATA / self.plan["trace_output_directory"],
        )
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
