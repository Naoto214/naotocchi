#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


TOOLS = Path(__file__).resolve().parent
DATA = TOOLS.parent / "data"
DEFAULT_SOURCE_PLAN = DATA / "proxy-board-combination-plan-110-20260918.json"
DEFAULT_SOURCE_EVALUATION = DATA / "proxy-board-combination-evaluation-110-20260918.json"
DEFAULT_OUTPUT = DATA / "proxy-gap-disposition-111-20260918.json"

SOURCE_HEAD = "7dfbcfb457be0a6bf0d171df5e465b7286414338"
SOURCE_TREE = "2a744900283d354471879648f804ac699c9acbe1"

GAP_DESIGNS = {
    "G-jump-quest": {
        "fixture_group": "targeted-short",
        "required_evidence": [
            "同じターンに別々のときおくりeventを2回記録する。",
            "時1を払い、捨て札の①〜③メインを対象として手札へ戻し、そだち+5を記録する。",
        ],
        "forbidden_shortcuts": [
            "card_pool_definition_change",
            "count_unexecuted_as_activation_zero",
            "count_one_multi_stage_move_as_two_time_skips",
        ],
    },
    "M-mushroom-06": {
        "fixture_group": "targeted-short",
        "required_evidence": [
            "同名かつ別card copyのメイン以外2枚を用意する。",
            "終了時と解決時の両方で1枚を盤面、1枚を捨て札に置き、対象を手札へ戻す。",
        ],
        "forbidden_shortcuts": [
            "card_pool_definition_change",
            "count_unexecuted_as_activation_zero",
            "duplicate_one_physical_card_across_zones",
        ],
    },
    "M-sakura-05": {
        "fixture_group": "evolution-path",
        "required_evidence": [
            "サクラ①〜④のいずれかをメイン枠に置き、手札のサクラ⑤へ必要な時を払ってときおくりする。",
            "自分終了時に時1を払い、捨て札のしかける1枚を対象として手札へ戻す。",
        ],
        "forbidden_shortcuts": [
            "card_pool_definition_change",
            "count_unexecuted_as_activation_zero",
            "direct_high_stage_placement",
        ],
    },
    "M-dragon-08": {
        "fixture_group": "evolution-path",
        "required_evidence": [
            "りゅう①〜⑦のいずれかをメイン枠に置き、手札のりゅう⑧へ必要な時を払ってときおくりする。",
            "終了時に捨て札のアクション2枚を順序付きで山札下へ置き、別のなかまかこいびと1枚を手札へ戻す。",
        ],
        "forbidden_shortcuts": [
            "card_pool_definition_change",
            "count_unexecuted_as_activation_zero",
            "direct_high_stage_placement",
        ],
    },
    "M-penguin-07": {
        "fixture_group": "evolution-path",
        "required_evidence": [
            "ペンギン①〜⑥のいずれかをメイン枠に置き、手札のペンギン⑦へ必要な時を払ってときおくりする。",
            "セカイ変更後になかま1枚へ期限付き保護を作り、次の相手ターンの離脱を1回防ぐ。",
        ],
        "forbidden_shortcuts": [
            "card_pool_definition_change",
            "count_unexecuted_as_activation_zero",
            "direct_high_stage_placement",
        ],
    },
    "M-god-08": {
        "fixture_group": "evolution-path",
        "required_evidence": [
            "かみさま①〜⑦のいずれかをメイン枠に置き、手札のかみさま⑧へ必要な時を払ってときおくりする。",
            "時1を払い、手札1枚を山札の一番下に置いて盤面1枚を予約し、次の相手効果による捨て札移動を手札戻しへ置換する。",
        ],
        "forbidden_shortcuts": [
            "card_pool_definition_change",
            "count_unexecuted_as_activation_zero",
            "direct_high_stage_placement",
        ],
    },
}


def load_json(path):
    return json.loads(Path(path).read_text())


def _source_gaps(document):
    return [
        {"source_cluster": match["cluster"], **gap}
        for match in document.get("matches", [])
        for gap in match.get("structural_input_gaps", [])
    ]


def build_gap_disposition(source_plan, source_evaluation):
    source_gaps = _source_gaps(source_plan)
    gaps = []
    for source in source_gaps:
        design = GAP_DESIGNS[source["card_id"]]
        gaps.append({
            **source,
            "fixture_group": design["fixture_group"],
            "disposition": "requires-targeted-fixture",
            "planned_checkpoint": 112,
            "planned_fixture_id": f"fixture-112-{source['card_id'].lower().replace('_', '-')}",
            "required_evidence": design["required_evidence"],
            "forbidden_shortcuts": design["forbidden_shortcuts"],
            "counts_as_activation_zero": False,
            "counts_as_strength_evidence": False,
        })
    return {
        "schema": "naotocchi.card_game.proxy_gap_disposition.v1",
        "checkpoint": 111,
        "source": {
            "checkpoint": 110,
            "saved_head": SOURCE_HEAD,
            "saved_tree": SOURCE_TREE,
            "plan": DEFAULT_SOURCE_PLAN.name,
            "evaluation": DEFAULT_SOURCE_EVALUATION.name,
        },
        "scope": {
            "source_gap_count": len(source_gaps),
            "requires_targeted_fixture_count": len(gaps),
            "fixture_created_count": 0,
            "completed_match_count": 0,
            "independent_balance_sample_count": 0,
            "changes_card_pool": False,
        },
        "planned_fixture_constraints": {
            "catalog_layer": "current-452",
            "deck_size_per_player": 40,
            "required_card_type_count": 7,
            "preserve_card_copy_id": True,
            "preserve_initial_instance_id": True,
            "record_status": "fixture",
            "events": [],
            "winner": None,
        },
        "gaps": gaps,
        "normal_decision_repetition": {
            "start_after_checkpoint": 112,
            "first_batch_match_count": 4,
            "independent_initial_orders": 2,
            "mirror_first_player_for_each_order": True,
            "protocol": {
                "schema": "naotocchi.card_game.proxy_decision_protocol.v1",
                "source_file": "proxy-decision-protocol-107-20260918.json",
            },
            "may_count_as_strength_conclusion": False,
            "stop_after_batch_for_review": True,
        },
        "stop_conditions": [
            "illegal_direct_high_stage_placement",
            "missing_required_prerequisite",
            "opponent_hidden_information_used",
            "rules_adjudication_unresolved",
            "validator_or_materialized_data_mismatch",
        ],
        "population_boundaries": {
            "current_catalog": 452,
            "registered_candidates": 477,
            "registered_card": 463,
            "hold": 14,
            "automatic_population_addition": False,
        },
    }


def validate_gap_disposition(disposition, source_plan, source_evaluation):
    errors = []
    source = disposition.get("source", {})
    expected_source = {
        "checkpoint": 110,
        "saved_head": SOURCE_HEAD,
        "saved_tree": SOURCE_TREE,
        "plan": DEFAULT_SOURCE_PLAN.name,
        "evaluation": DEFAULT_SOURCE_EVALUATION.name,
    }
    if (disposition.get("schema") != "naotocchi.card_game.proxy_gap_disposition.v1" or
            disposition.get("checkpoint") != 111 or source != expected_source):
        errors.append("111 schema and source checkpoint identity differ")
    source_gaps = _source_gaps(source_plan)
    evaluation_gaps = _source_gaps(source_evaluation)
    gaps = disposition.get("gaps", [])
    if source_gaps != evaluation_gaps:
        errors.append("110 plan and evaluation structural gaps differ")
    source_ids = [row["card_id"] for row in source_gaps]
    if (len(gaps) != 6 or [row.get("card_id") for row in gaps] != source_ids or
            len(set(source_ids)) != 6):
        errors.append("111 must preserve all six source gaps exactly once")
    for gap, source in zip(gaps, source_gaps):
        if any(gap.get(key) != source.get(key) for key in
               ("source_cluster", "card_id", "missing_requirement", "evidence")):
            errors.append(f"{gap.get('card_id')} source evidence differs from checkpoint 110")
        if (gap.get("disposition") != "requires-targeted-fixture" or
                gap.get("planned_checkpoint") != 112):
            errors.append(f"{gap.get('card_id')} must remain planned for a targeted fixture")
        forbidden = gap.get("forbidden_shortcuts", [])
        if ("card_pool_definition_change" not in forbidden or
                "count_unexecuted_as_activation_zero" not in forbidden):
            errors.append(f"{gap.get('card_id')} fixture boundary shortcuts are incomplete")
        if (gap.get("fixture_group") == "evolution-path" and
                "direct_high_stage_placement" not in forbidden):
            errors.append(f"{gap.get('card_id')} must prohibit direct high-stage placement")
        if (not gap.get("required_evidence") or
                gap.get("counts_as_activation_zero") is not False or
                gap.get("counts_as_strength_evidence") is not False):
            errors.append(f"{gap.get('card_id')} evidence and interpretation boundary differ")
        if source.get("card_id") in GAP_DESIGNS:
            design = GAP_DESIGNS[source["card_id"]]
            expected_gap = {
                **source,
                "fixture_group": design["fixture_group"],
                "disposition": "requires-targeted-fixture",
                "planned_checkpoint": 112,
                "planned_fixture_id": (
                    f"fixture-112-{source['card_id'].lower().replace('_', '-')}"),
                "required_evidence": design["required_evidence"],
                "forbidden_shortcuts": design["forbidden_shortcuts"],
                "counts_as_activation_zero": False,
                "counts_as_strength_evidence": False,
            }
            if gap != expected_gap:
                errors.append(f"{source['card_id']} authored disposition differs")
    groups = [row.get("fixture_group") for row in gaps]
    if groups.count("targeted-short") != 2 or groups.count("evolution-path") != 4:
        errors.append("111 fixture grouping must remain two short and four evolution paths")
    scope = disposition.get("scope", {})
    expected_scope = {
        "source_gap_count": 6,
        "requires_targeted_fixture_count": 6,
        "fixture_created_count": 0,
        "completed_match_count": 0,
        "independent_balance_sample_count": 0,
        "changes_card_pool": False,
    }
    if (scope.get("fixture_created_count") != 0 or
            scope.get("completed_match_count") != 0):
        errors.append("checkpoint 111 must not create fixtures or completed matches")
    if (scope.get("source_gap_count") != 6 or
            scope.get("requires_targeted_fixture_count") != 6 or
            scope.get("independent_balance_sample_count") != 0 or
            scope.get("changes_card_pool") is not False):
        errors.append("checkpoint 111 scope counts differ")
    if scope != expected_scope:
        errors.append("checkpoint 111 complete scope object differs")
    expected_constraints = {
        "catalog_layer": "current-452",
        "deck_size_per_player": 40,
        "required_card_type_count": 7,
        "preserve_card_copy_id": True,
        "preserve_initial_instance_id": True,
        "record_status": "fixture",
        "events": [],
        "winner": None,
    }
    if disposition.get("planned_fixture_constraints") != expected_constraints:
        errors.append("111 planned fixture constraints differ")
    repetition = disposition.get("normal_decision_repetition", {})
    expected_repetition = {
        "start_after_checkpoint": 112,
        "first_batch_match_count": 4,
        "independent_initial_orders": 2,
        "mirror_first_player_for_each_order": True,
        "protocol": {
            "schema": "naotocchi.card_game.proxy_decision_protocol.v1",
            "source_file": "proxy-decision-protocol-107-20260918.json",
        },
        "may_count_as_strength_conclusion": False,
        "stop_after_batch_for_review": True,
    }
    if (repetition.get("first_batch_match_count") != 4 or
            repetition.get("independent_initial_orders") != 2 or
            repetition.get("mirror_first_player_for_each_order") is not True or
            repetition.get("start_after_checkpoint") != 112):
        errors.append("111 must retain the four-match first batch after checkpoint 112")
    if repetition.get("may_count_as_strength_conclusion") is not False:
        errors.append("111 repetition batch must not be a strength conclusion")
    if repetition != expected_repetition:
        errors.append("111 complete normal-decision repetition object differs")
    required_stops = {
        "illegal_direct_high_stage_placement",
        "missing_required_prerequisite",
        "opponent_hidden_information_used",
        "rules_adjudication_unresolved",
        "validator_or_materialized_data_mismatch",
    }
    if set(disposition.get("stop_conditions", [])) != required_stops:
        errors.append("111 stop conditions differ")
    population = disposition.get("population_boundaries", {})
    if population != {
            "current_catalog": 452, "registered_candidates": 477,
            "registered_card": 463, "hold": 14,
            "automatic_population_addition": False}:
        errors.append("111 population boundaries differ")
    return errors


def write_gap_disposition(disposition, output):
    Path(output).write_text(json.dumps(disposition, ensure_ascii=False, indent=2) + "\n")


def validate_materialized_disposition(disposition, output):
    output = Path(output)
    if not output.exists():
        return ["materialized 111 disposition is missing"]
    try:
        materialized = load_json(output)
    except (OSError, json.JSONDecodeError):
        return ["materialized 111 disposition is not valid JSON"]
    if materialized != disposition:
        return ["materialized 111 disposition differs from builder"]
    return []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-plan", type=Path, default=DEFAULT_SOURCE_PLAN)
    parser.add_argument("--source-evaluation", type=Path,
                        default=DEFAULT_SOURCE_EVALUATION)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    source_plan = load_json(args.source_plan)
    source_evaluation = load_json(args.source_evaluation)
    disposition = build_gap_disposition(source_plan, source_evaluation)
    errors = validate_gap_disposition(disposition, source_plan, source_evaluation)
    if args.write and not errors:
        write_gap_disposition(disposition, args.output)
    if not errors:
        errors.extend(validate_materialized_disposition(disposition, args.output))
    print(json.dumps({
        "valid": not errors,
        "structural_gap_count": len(disposition["gaps"]),
        "fixture_created_count": disposition["scope"]["fixture_created_count"],
        "completed_match_count": disposition["scope"]["completed_match_count"],
        "first_normal_repetition_batch": disposition[
            "normal_decision_repetition"]["first_batch_match_count"],
        "written": bool(args.write and not errors),
        "errors": errors,
    }, ensure_ascii=False, indent=2))
    raise SystemExit(1 if errors else 0)


if __name__ == "__main__":
    main()
