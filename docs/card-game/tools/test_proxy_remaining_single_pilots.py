#!/usr/bin/env python3
import copy
from pathlib import Path
import unittest

from proxy_record_validator import canonical_sha256, load_current_catalog, validate_record
from proxy_remaining_single_pilots import (
    build_remaining_single_pilots,
    load_json,
    validate_materialized_remaining_single_pilots,
    validate_remaining_single_pilots,
    validate_remaining_single_trace,
)


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
PLAN = DATA / "proxy-remaining-single-plan-106-20260918.json"


class ProxyRemainingSinglePilotsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = load_json(PLAN)
        cls.catalog = load_current_catalog()
        cls.fixtures = [
            load_json(DATA / row["source_fixture"])
            for row in cls.plan["records"]
        ]
        cls.pilots = build_remaining_single_pilots(cls.fixtures, cls.plan)

    def pilots_for(self, cluster):
        return [row for row in self.pilots
                if cluster in row["record"]["test_plan"]["strata"]]

    def test_builds_three_first_second_pairs_without_changing_physical_cards(self):
        self.assertEqual(len(self.pilots), 6)
        for cluster in ("P97-01", "P97-02", "P97-04"):
            pair = self.pilots_for(cluster)
            self.assertEqual(
                [row["record"]["input"]["first_player"] for row in pair],
                ["A", "B"],
            )
        for source, pilot in zip(self.fixtures, self.pilots):
            source_a = next(row for row in source["input"]["players"]
                            if row["player_id"] == "A")
            pilot_a = next(row for row in pilot["record"]["input"]["players"]
                           if row["player_id"] == "A")
            self.assertEqual(
                {row["initial_instance_id"]: (row["card_copy_id"], row["card_id"])
                 for row in source_a["deck_order_top_to_bottom"]},
                {row["initial_instance_id"]: (row["card_copy_id"], row["card_id"])
                 for row in pilot_a["deck_order_top_to_bottom"]},
            )

    def test_p97_01_places_stage_zero_partner_then_resolves_first_date(self):
        expected_sequences = [(2, 3), (4, 5)]
        for pilot, (place_seq, play_seq) in zip(
                self.pilots_for("P97-01"), expected_sequences):
            record, trace = pilot["record"], pilot["trace"]
            events = record["record"]["events"]
            place = next(row for row in events
                         if row["action_type"] == "place_first_date_partner")
            play = next(row for row in events
                        if row["action_type"] == "play_first_date")
            self.assertEqual((place["seq"], play["seq"]),
                             (place_seq, play_seq))
            self.assertEqual(place["source_instance_id"], "A-016#1")
            self.assertEqual(play["source_instance_id"], "A-001#1")
            self.assertEqual(play["target_instance_ids"], ["A-016#1"])
            self.assertEqual(play["payment"]["time"], 1)
            self.assertIn("A-007#1", play["result"])
            self.assertEqual(record["record"]["result"]["final_growth"],
                             {"A": 25, "B": 20})
            final_a = trace["snapshots"][-1]["state"]["players"]["A"]
            self.assertEqual(final_a["field"]["partner"], "A-016#1")
            self.assertEqual(final_a["field"]["partner_stage"], 0)
            self.assertIn("A-007#1", final_a["hand"])

    def test_p97_02_consumes_same_turn_end_reservation(self):
        expected_sequences = [(2, 3), (4, 5)]
        for pilot, (play_seq, resolve_seq) in zip(
                self.pilots_for("P97-02"), expected_sequences):
            record = pilot["record"]
            events = record["record"]["events"]
            play = next(row for row in events
                        if row["action_type"] == "play_mini_golf")
            resolve = next(row for row in events
                           if row["action_type"] == "resolve_mini_golf_turn_end")
            self.assertEqual((play["seq"], resolve["seq"]),
                             (play_seq, resolve_seq))
            self.assertEqual(play["payment"]["time"], 1)
            self.assertEqual(len(play["reservations_created"]), 1)
            self.assertEqual(resolve["reservations_consumed"],
                             play["reservations_created"])
            reservation = record["record"]["reservations"][0]
            self.assertEqual(reservation["deadline"], {
                "kind": "current_turn_end", "round": 1, "player": "A"
            })
            self.assertEqual(reservation["status"], "consumed")
            self.assertEqual(reservation["uses_remaining"], 0)
            self.assertIn("A-007#1", resolve["result"])
            self.assertEqual(record["record"]["result"]["final_growth"],
                             {"A": 25, "B": 20})

    def test_p97_04_builds_city_two_face_up_actions_and_two_type_selection(self):
        expected_sequences = [
            (6, 11, 20, 21, 22, 23),
            (8, 13, 22, 23, 24, 25),
        ]
        for pilot, sequences in zip(self.pilots_for("P97-04"),
                                    expected_sequences):
            record, trace = pilot["record"], pilot["trace"]
            events = record["record"]["events"]
            action_types = [
                "birth_city_runner", "place_city_world", "equip_lunch_box",
                "equip_pillow", "resolve_city_peek", "play_city_run",
            ]
            actions = [next(row for row in events
                            if row["action_type"] == action_type)
                       for action_type in action_types]
            self.assertEqual(tuple(row["seq"] for row in actions), sequences)
            self.assertEqual(actions[0]["payment"]["time"], 2)
            self.assertEqual(actions[1]["payment"]["time"], 2)
            self.assertEqual(actions[2]["payment"]["time"], 2)
            self.assertEqual(actions[3]["payment"]["time"], 2)
            self.assertEqual(actions[5]["payment"]["time"], 1)
            self.assertEqual(actions[5]["choice_ids"], [
                "choice-p97-04-take-play", "choice-p97-04-take-event",
                "choice-p97-04-bottom-order",
            ])
            self.assertIn("A-023#1", actions[5]["result"])
            self.assertIn("A-036#1", actions[5]["result"])
            final_a = trace["snapshots"][-1]["state"]["players"]["A"]
            self.assertEqual(final_a["field"]["main"], "A-002#1")
            self.assertEqual(final_a["field"]["world"], "A-020#1")
            self.assertEqual(final_a["field"]["prepared"],
                             ["A-032#1", "A-035#1"])
            self.assertIn("A-023#1", final_a["hand"])
            self.assertIn("A-036#1", final_a["hand"])
            self.assertEqual(final_a["deck"][-2:], ["A-013#1", "A-014#1"])

    def test_event_and_snapshot_counts_results_and_schema_validation(self):
        expected_counts = {"P97-01": 42, "P97-02": 42, "P97-04": 46}
        for pilot in self.pilots:
            record, trace = pilot["record"], pilot["trace"]
            cluster = next(row for row in ("P97-01", "P97-02", "P97-04")
                           if row in record["test_plan"]["strata"])
            count = expected_counts[cluster]
            self.assertEqual(len(record["record"]["events"]), count)
            self.assertEqual(len(trace["snapshots"]), count + 1)
            self.assertEqual(record["record"]["result"]["winner"],
                             "A" if cluster != "P97-04" else "draw")
            self.assertEqual(validate_record(record, self.catalog), [])
            self.assertEqual(validate_remaining_single_trace(record, trace), [])
            for snapshot in trace["snapshots"]:
                self.assertEqual(snapshot["sha256"],
                                 canonical_sha256(snapshot["state"]))

    def test_pair_validator_rejects_wrong_selection_and_unconsumed_mini_golf(self):
        broken = copy.deepcopy(self.pilots)
        city_run = next(row for row in broken[4]["record"]["record"]["events"]
                        if row["action_type"] == "play_city_run")
        city_run["choice_ids"] = ["choice-p97-04-take-play"]
        broken[2]["record"]["record"]["reservations"][0]["status"] = "active"
        errors = validate_remaining_single_pilots(broken, self.catalog)
        self.assertTrue(any("city run must record all three choices" in row
                            for row in errors))
        self.assertTrue(any("mini golf reservation must be consumed" in row
                            for row in errors))

    def test_materialized_files_exactly_match_the_deterministic_builder(self):
        errors = validate_materialized_remaining_single_pilots(
            self.pilots,
            DATA / self.plan["record_output_directory"],
            DATA / self.plan["trace_output_directory"],
        )
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
