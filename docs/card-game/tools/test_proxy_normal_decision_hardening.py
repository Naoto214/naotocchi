#!/usr/bin/env python3
"""Regression tests for checkpoint-114 normal-decision protocol hardening."""

import copy
import json
from pathlib import Path
import tempfile
import unittest

from proxy_normal_decision_hardening import (
    build_hardening_contract,
    compare_candidates,
    source_card_ids,
    validate_candidate_table,
    validate_hardening_contract,
    validate_materialized_contract,
    validate_pre_decision_state,
    validate_public_information,
    write_hardening_contract,
)


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
SOURCE = DATA / "proxy-fixtures-107/fixture-107-normal-decision-a-first.json"
ADMISSION = DATA / "proxy-normal-decision-admission-113-20260918.json"
TABLE = DATA / "proxy-normal-decision-candidate-table-114-20260918.json"
OUTPUT = DATA / "proxy-normal-decision-hardening-114-20260918.json"


def evaluation(candidate_id, *, avoid=0, growth_100=0, growth=0, time=3,
               payment=0, consumed=0, copy_id="A-001"):
    return {
        "candidate_id": candidate_id,
        "avoid_loss_or_abort": avoid,
        "maintain_or_prevent_100": growth_100,
        "certain_growth_difference": growth,
        "time_after_certain_resolution": time,
        "payment_time": payment,
        "consumed_card_count": consumed,
        "card_copy_id": copy_id,
        "value_comparison_to": {},
    }


class NormalDecisionHardeningTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = json.loads(SOURCE.read_text())
        cls.admission = json.loads(ADMISSION.read_text())
        cls.table = json.loads(TABLE.read_text())
        cls.contract = build_hardening_contract(cls.table, cls.source, cls.admission)

    def test_candidate_table_matches_source_union_of_41_ids(self):
        expected_ids = source_card_ids(self.source)
        table_ids = {row["card_id"] for row in self.table["cards"]}
        self.assertEqual(len(expected_ids), 41)
        self.assertEqual(table_ids, expected_ids)
        self.assertEqual(validate_candidate_table(self.table, self.source), [])

    def test_candidate_table_covers_all_seven_types_and_pass(self):
        self.assertEqual({row["card_type"] for row in self.table["cards"]}, {
            "main", "companion", "partner", "world", "play", "item", "event",
        })
        self.assertEqual(self.table["standing_candidates"], [{
            "candidate_id": "candidate-pass", "kind": "pass", "action_type": "pass",
            "timing": "normal_action_opportunity", "base_time_cost": 0,
        }])

    def test_candidate_table_preserves_existing_non_card_candidate_families(self):
        self.assertEqual(self.table["preserved_existing_candidate_families"], [
            "challenge_power_or_wisdom",
            "relationship_progress",
        ])
        self.assertEqual(
            self.contract["candidate_table"]["preserved_existing_candidate_families"],
            self.table["preserved_existing_candidate_families"],
        )

    def test_candidate_table_rejects_missing_extra_and_duplicate_entries(self):
        broken = copy.deepcopy(self.table)
        broken["cards"].pop()
        broken["cards"].append(copy.deepcopy(broken["cards"][0]))
        broken["cards"].append({
            **copy.deepcopy(broken["cards"][0]), "card_id": "G-not-in-source",
        })
        errors = validate_candidate_table(broken, self.source)
        self.assertTrue(any("missing" in row for row in errors))
        self.assertTrue(any("extra" in row for row in errors))
        self.assertTrue(any("duplicate" in row for row in errors))

    def test_pre_decision_state_requires_exact_nested_board_schema(self):
        valid = {
            "hand": [],
            "board": {"main": None, "companions": [], "partner": None,
                      "partner_stage": None, "world": None, "prepared": []},
            "time": 3,
            "growth": 20,
            "reservations": [],
        }
        self.assertEqual(validate_pre_decision_state(valid), [])
        field = copy.deepcopy(valid)
        field["field"] = field.pop("board")
        self.assertTrue(validate_pre_decision_state(field))
        unknown = copy.deepcopy(valid)
        unknown["board"]["opponent_hand"] = []
        self.assertTrue(validate_pre_decision_state(unknown))

    def test_public_information_uses_exact_whitelist(self):
        valid = {
            "information_policy": "public_and_owner_known_only",
            "own_hand": [],
            "own_board": {},
            "opponent_board": {},
            "growth": {"A": 20, "B": 20},
            "time": {"A": 3, "B": 3},
            "discard": {"A": [], "B": []},
            "reservations": [],
        }
        self.assertEqual(validate_public_information(valid), [])
        for forbidden in ("opponent_hand", "deck_order", "unknown_future"):
            broken = copy.deepcopy(valid)
            broken[forbidden] = []
            self.assertTrue(validate_public_information(broken), forbidden)
        broken = copy.deepcopy(valid)
        broken["information_policy"] = "all_information"
        self.assertTrue(validate_public_information(broken))

    def test_higher_priority_wins_without_lower_priority(self):
        left = evaluation("left", avoid=1, growth=-10, time=0)
        right = evaluation("right", avoid=0, growth=50, time=9)
        result = compare_candidates(left, right)
        self.assertEqual(result["winner"], "left")
        self.assertEqual(result["decided_at"], "avoid_loss_or_abort")

    def test_pass_can_beat_paid_action_at_time_balance(self):
        paid = evaluation("paid", time=1, payment=2)
        passed = evaluation("pass", time=3)
        result = compare_candidates(paid, passed)
        self.assertEqual(result["winner"], "right")
        self.assertEqual(result["decided_at"], "time_after_certain_resolution")

    def test_value_uses_pareto_and_stops_on_tradeoff(self):
        left = evaluation("left")
        right = evaluation("right")
        left["value_comparison_to"]["right"] = {
            "hand": "equal", "board": "better", "reservations": "equal",
        }
        self.assertEqual(compare_candidates(left, right)["winner"], "left")
        left["value_comparison_to"]["right"] = {
            "hand": "worse", "board": "better", "reservations": "equal",
        }
        result = compare_candidates(left, right)
        self.assertEqual(result["winner"], "unresolved")
        self.assertEqual(result["reason"], "unresolved_canonical_text")
        left["value_comparison_to"]["right"]["hand"] = "incomparable"
        self.assertEqual(compare_candidates(left, right)["winner"], "unresolved")

    def test_tie_breakers_apply_only_after_five_equal_priorities(self):
        left = evaluation("left", payment=0, consumed=2, copy_id="A-010")
        right = evaluation("right", payment=1, consumed=0, copy_id="A-001")
        left["value_comparison_to"]["right"] = {
            "hand": "equal", "board": "equal", "reservations": "equal",
        }
        result = compare_candidates(left, right)
        self.assertEqual((result["winner"], result["decided_at"]),
                         ("left", "lower_time_payment"))
        right["payment_time"] = 0
        result = compare_candidates(left, right)
        self.assertEqual((result["winner"], result["decided_at"]),
                         ("right", "fewer_cards_consumed"))
        left["consumed_card_count"] = 0
        result = compare_candidates(left, right)
        self.assertEqual((result["winner"], result["decided_at"]),
                         ("right", "lower_card_copy_id"))

    def test_contract_resolves_three_blockers_without_matches(self):
        self.assertEqual(self.contract["checkpoint"], 114)
        self.assertEqual(self.contract["status"], "protocol_hardened_no_matches")
        self.assertEqual(self.contract["resolved_blockers"], [
            "candidate-coverage-incomplete",
            "pre-decision-schema-mismatch",
            "priority-comparison-unresolved",
        ])
        self.assertEqual(self.contract["candidate_table"]["unique_card_id_count"], 41)
        self.assertEqual(self.contract["candidate_table"]["card_type_count"], 7)
        self.assertEqual(self.contract["scope"]["fixture_count"], 0)
        self.assertEqual(self.contract["scope"]["completed_match_count"], 0)
        self.assertEqual(self.contract["scope"]["trace_count"], 0)
        self.assertEqual(self.contract["scope"]["independent_balance_sample_count"], 0)

    def test_contract_preserves_deferred_and_population_boundaries(self):
        self.assertEqual(self.contract["deferred_batch"]["planned_match_count"], 4)
        self.assertFalse(self.contract["deferred_batch"]["materialized_in_114"])
        self.assertEqual(self.contract["checkpoint_112"], {
            "targeted_fixture_count": 6,
            "completed_in_114": 0,
            "status": "unchanged_unplayed",
        })
        self.assertEqual(self.contract["population"], {
            "current_catalog": 452,
            "registered_candidates": 477,
            "changed_card_text_numeric_or_registration_ids": 0,
        })

    def test_validator_and_saved_contract_equal_builder_output(self):
        self.assertEqual(validate_hardening_contract(
            self.contract, self.table, self.source, self.admission), [])
        self.assertEqual(validate_materialized_contract(self.contract, OUTPUT), [])
        broken = copy.deepcopy(self.contract)
        broken["scope"]["completed_match_count"] = 1
        self.assertTrue(validate_hardening_contract(
            broken, self.table, self.source, self.admission))
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "contract.json"
            write_hardening_contract(self.contract, output)
            self.assertEqual(validate_materialized_contract(self.contract, output), [])


if __name__ == "__main__":
    unittest.main()
