#!/usr/bin/env python3
"""Build checkpoint-113 admission audit for normal-decision repetition."""

import argparse
import json
from pathlib import Path


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_PLAN = DATA / "proxy-normal-decision-admission-plan-113-20260918.json"


def load_json(path):
    return json.loads(Path(path).read_text())


def build_admission_audit(plan, protocol, source):
    support = plan["candidate_support_by_card_type"]
    omitted = [card_type for card_type in ("world", "play", "item", "event")
               if support[card_type] != "implemented"]
    return {
        "schema": "naotocchi.card_game.proxy_normal_decision_admission.v1",
        "checkpoint": 113,
        "status": "blocked_by_protocol_admission",
        "stop_required": True,
        "stop_rule": "111.stop_conditions.rules_adjudication_unresolved",
        "protocol": plan["protocol"],
        "source_fixture": plan["source_fixture"],
        "design": plan["design"],
        "fixture_count": 0,
        "completed_match_count": 0,
        "independent_balance_sample_count": 0,
        "blockers": [
            {
                "blocker_id": "candidate-coverage-incomplete",
                "severity": "blocking",
                "requirement": protocol["decision_opportunity"],
                "omitted_card_types": omitted,
                "evidence": {
                    "support_by_card_type": support,
                    "concrete_card": "W-deepsea",
                    "concrete_state": "empty_world_and_time_3",
                    "missing_candidate": "place_world_time_2"
                },
                "resolution_required": "40枚に含まれる全種類を正本文と照合した手動候補表を先に固定する。"
            },
            {
                "blocker_id": "pre-decision-schema-mismatch",
                "severity": "blocking",
                "required_key": "board",
                "emitted_key": plan["reference_pre_decision_board_key"],
                "required_fields": protocol["pre_decision_state_fields"],
                "resolution_required": "nested schemaと公開情報whitelistをvalidatorで必須化する。"
            },
            {
                "blocker_id": "priority-comparison-unresolved",
                "severity": "blocking",
                "priority_order": protocol["decision_priority"],
                "conflict": plan["reference_paid_action_ranking"],
                "resolution_required": ("確定そだち差、時収支、手札・盤面・予約価値を候補間で比較する"
                                        "記録規則を、対戦前に一意化する。")
            }
        ],
        "deferred_batch": {
            "orders": plan["orders"],
            "planned_match_count": plan["planned_match_count"],
            "mirror_first_player_for_each_order": True,
            "orders_materialized": False,
            "records_materialized": False,
            "resume_after_all_blockers_resolved": True
        },
        "source_summary": {
            "player_count": len(source["input"]["players"]),
            "deck_size_by_player": {row["player_id"]: len(row["deck_order_top_to_bottom"])
                                    for row in source["input"]["players"]},
            "card_type_count_by_player": {
                row["player_id"]: len({card["card_id"][0]
                                       for card in row["deck_order_top_to_bottom"]})
                for row in source["input"]["players"]
            }
        },
        "checkpoint_112": {
            "targeted_fixture_count": 6,
            "completed_in_113": 0,
            "status": "unchanged_unplayed"
        },
        "interpretation": {
            "counts_as_match": False,
            "counts_as_activation_zero": False,
            "counts_as_strength_evidence": False,
            "changes_card_pool": False
        }
    }


def validate_admission_audit(audit, plan, protocol, source):
    errors = []
    expected = build_admission_audit(plan, protocol, source)
    if audit.get("schema") != expected["schema"] or audit.get("checkpoint") != 113:
        errors.append("113 admission schema or checkpoint differs")
    if audit.get("status") != "blocked_by_protocol_admission" or audit.get("stop_required") is not True:
        errors.append("113 admission must stop on unresolved protocol")
    if audit.get("fixture_count") != 0:
        errors.append("fixture_count must remain zero")
    if audit.get("completed_match_count") != 0:
        errors.append("completed_match_count must remain zero")
    blockers = audit.get("blockers", [])
    if len(blockers) != 3 or {row.get("blocker_id") for row in blockers} != {
            "candidate-coverage-incomplete", "pre-decision-schema-mismatch",
            "priority-comparison-unresolved"}:
        errors.append("113 admission must retain the exact three blockers")
    coverage = next((row for row in blockers
                     if row.get("blocker_id") == "candidate-coverage-incomplete"), {})
    if coverage.get("omitted_card_types") != ["world", "play", "item", "event"]:
        errors.append("candidate coverage blocker differs")
    schema = next((row for row in blockers
                   if row.get("blocker_id") == "pre-decision-schema-mismatch"), {})
    if schema.get("required_key") != "board" or schema.get("emitted_key") != "field":
        errors.append("pre-decision board schema blocker differs")
    deferred = audit.get("deferred_batch", {})
    if deferred.get("planned_match_count") != 4 or deferred.get("orders_materialized") is not False:
        errors.append("four-match batch must remain deferred and unmaterialized")
    source_summary = audit.get("source_summary", {})
    if source_summary.get("deck_size_by_player") != {"A": 40, "B": 40} or \
            source_summary.get("card_type_count_by_player") != {"A": 7, "B": 7}:
        errors.append("source must remain A/B forty-card seven-type decks")
    if audit.get("checkpoint_112") != {
            "targeted_fixture_count": 6, "completed_in_113": 0,
            "status": "unchanged_unplayed"}:
        errors.append("checkpoint-112 boundary differs")
    if audit != expected:
        errors.append("113 admission audit differs from canonical builder")
    return errors


def write_admission_audit(audit, output_path):
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n")


def validate_materialized_audit(audit, output_path):
    output_path = Path(output_path)
    if not output_path.exists():
        return ["materialized 113 admission audit is missing"]
    if load_json(output_path) != audit:
        return ["materialized 113 admission audit differs from builder"]
    return []


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", default=DEFAULT_PLAN)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)
    plan_path = Path(args.plan)
    plan = load_json(plan_path)
    protocol = load_json(plan_path.parent / plan["protocol"])
    source = load_json(plan_path.parent / plan["source_fixture"])
    audit = build_admission_audit(plan, protocol, source)
    errors = validate_admission_audit(audit, plan, protocol, source)
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    output = plan_path.parent / plan["output"]
    if args.write:
        write_admission_audit(audit, output)
    if output.exists():
        errors = validate_materialized_audit(audit, output)
        if errors:
            print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
            return 1
    print(json.dumps({
        "valid": True,
        "status": audit["status"],
        "blockers": [row["blocker_id"] for row in audit["blockers"]],
        "fixture_count": audit["fixture_count"],
        "completed_match_count": audit["completed_match_count"],
        "deferred_match_count": audit["deferred_batch"]["planned_match_count"],
        "written": args.write
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
