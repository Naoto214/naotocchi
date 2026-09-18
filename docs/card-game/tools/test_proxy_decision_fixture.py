#!/usr/bin/env python3
import copy
import json
from pathlib import Path
import tempfile
import unittest

from proxy_decision_fixture import (
    build_decision_fixtures,
    fixture_filename,
    load_json,
    validate_decision_fixture_suite,
    validate_materialized_suite,
    validate_protocol,
    write_decision_fixtures,
)
from proxy_record_validator import load_current_catalog, validate_record


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
PROTOCOL = DATA / "proxy-decision-protocol-107-20260918.json"


class ProxyDecisionFixtureTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.protocol = load_json(PROTOCOL)
        cls.catalog = load_current_catalog()
        cls.fixtures = build_decision_fixtures(cls.protocol)

    def test_protocol_fixes_priority_order_and_public_information_boundary(self):
        self.assertEqual(
            self.protocol["decision_priority"],
            [
                "avoid_defeat_or_aborted_challenge",
                "maintain_or_prevent_growth_100",
                "maximize_certain_growth_difference",
                "maximize_time_balance",
                "maximize_hand_board_reservation_value",
            ],
        )
        self.assertEqual(
            self.protocol["tie_breakers"],
            ["lower_time_payment", "fewer_cards_consumed", "lower_card_copy_id"],
        )
        self.assertEqual(self.protocol["information_policy"], "public_and_owner_known_only")
        self.assertFalse(self.protocol["may_use_opponent_hidden_information"])

    def test_protocol_requires_every_choice_field_and_pass_candidate(self):
        self.assertEqual(
            self.protocol["choice_record_required_fields"],
            [
                "pre_decision_state",
                "legal_candidates",
                "selected_action",
                "runner_up_action",
                "reason_code",
                "payment",
                "targets",
                "chain",
                "public_information",
            ],
        )
        self.assertIn("pass", self.protocol["required_candidate_kinds"])
        self.assertEqual(validate_protocol(self.protocol), [])

    def test_protocol_fixes_stop_conditions_and_evaluation_metrics(self):
        self.assertEqual(
            self.protocol["stop_conditions"],
            [
                "r10_final_comparison_completed",
                "early_victory_after_growth_100_maintenance",
                "decision_cannot_be_resolved_from_canonical_text",
                "record_integrity_failure",
            ],
        )
        self.assertEqual(
            self.protocol["recorded_nonterminal_conditions"],
            ["challenge_aborted_by_participant_departure"],
        )
        self.assertEqual(
            self.protocol["evaluation_metrics"],
            [
                "winner",
                "legal_candidate_count",
                "selected_action_count",
                "unused_time",
                "use_count_by_card_type",
                "reservations",
                "reentries",
                "growth_progression",
                "unresolved_decisions",
            ],
        )

    def test_builds_exactly_two_unplayed_seat_mirror_fixtures(self):
        self.assertEqual(
            [fixture["match_id"] for fixture in self.fixtures],
            [
                "fixture-107-normal-decision-a-first",
                "fixture-107-normal-decision-a-second",
            ],
        )
        self.assertEqual(
            [fixture["input"]["first_player"] for fixture in self.fixtures],
            ["A", "B"],
        )

    def test_fixtures_preserve_source_decks_hands_and_identity(self):
        for spec, fixture in zip(self.protocol["fixtures"], self.fixtures):
            source = load_json(DATA / spec["source_fixture"])
            source_players = {
                player["player_id"]: player for player in source["input"]["players"]
            }
            fixture_players = {
                player["player_id"]: player for player in fixture["input"]["players"]
            }
            for player_id in ("A", "B"):
                self.assertEqual(
                    fixture_players[player_id]["deck_order_top_to_bottom"],
                    source_players[player_id]["deck_order_top_to_bottom"],
                )
                self.assertEqual(
                    fixture_players[player_id]["initial_hand"],
                    source_players[player_id]["initial_hand"],
                )

    def test_fixtures_are_valid_and_remain_unplayed(self):
        self.assertEqual(
            validate_decision_fixture_suite(
                self.fixtures, self.protocol, self.catalog
            ),
            [],
        )
        for fixture in self.fixtures:
            self.assertEqual(validate_record(fixture, self.catalog), [])
            self.assertEqual(fixture["record"]["status"], "fixture")
            self.assertEqual(fixture["record"]["events"], [])
            self.assertIsNone(fixture["record"]["result"]["winner"])

    def test_validator_rejects_completed_or_non_mirrored_fixture(self):
        broken = copy.deepcopy(self.fixtures)
        broken[0]["record"]["status"] = "completed"
        broken[0]["record"]["result"]["winner"] = "A"
        broken[1]["input"]["players"][0]["deck_order_top_to_bottom"].reverse()
        errors = validate_decision_fixture_suite(broken, self.protocol, self.catalog)
        self.assertIn(
            "fixture-107-normal-decision-a-first must remain an unplayed fixture",
            errors,
        )
        self.assertIn(
            "107 seat pair must preserve identical A/B deck order and initial hands",
            errors,
        )

    def test_writer_reproduces_exact_json_and_detects_changes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            write_decision_fixtures(self.fixtures, output)
            self.assertEqual(
                sorted(path.name for path in output.glob("*.json")),
                sorted(fixture_filename(row) for row in self.fixtures),
            )
            self.assertEqual(validate_materialized_suite(self.fixtures, output), [])
            changed = output / fixture_filename(self.fixtures[0])
            payload = json.loads(changed.read_text())
            payload["record"]["events"] = [{"invalid": True}]
            changed.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
            self.assertEqual(
                validate_materialized_suite(self.fixtures, output),
                [f"generated fixture differs from builder output: {changed.name}"],
            )


if __name__ == "__main__":
    unittest.main()
