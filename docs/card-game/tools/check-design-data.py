#!/usr/bin/env python3
"""Read-only source/ID/curve audit. Not a card-game simulator or rules validator.

Run from any directory with Python 3 and Node.js:
  python docs/card-game/tools/check-design-data.py
"""
import ast
import collections
from decimal import Decimal, ROUND_HALF_UP
import json
import hashlib
from pathlib import Path
import re
import runpy
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
DOCS = ROOT / "docs/card-game"
errors = []


def check(ok, message):
    if not ok:
        errors.append(message)


def doc(number):
    matches = list(DOCS.glob(f"{number:02d}-*.md"))
    if len(matches) != 1:
        raise ValueError(f"Expected one document for {number}: {matches}")
    return matches[0].read_text()


def rows(text):
    return [[c.strip().strip("`") for c in line.strip("|").split("|")]
            for line in text.splitlines() if line.startswith("|")]


# Checkpoint 118 reserves the former Japanese action name only for its explicit
# naming-history record.  Build the spellings from fragments so this checker
# does not exempt itself from the repository-wide scan.
former_time_action_terms = (
    "とき" + "とばし",
    "時" + "飛ばし",
    "時" + "とばし",
    "とき" + "飛ばし",
)
terminology_history_path = DOCS / "118-tokiokuri-terminology-migration.md"


def normalize_provisional_terminology(value):
    """Keep historical semantic fingerprints stable across the name-only migration."""
    if isinstance(value, str):
        return value.replace("ときおくり", former_time_action_terms[0])
    if isinstance(value, list):
        return [normalize_provisional_terminology(item) for item in value]
    if isinstance(value, dict):
        return {key: normalize_provisional_terminology(item)
                for key, item in value.items()}
    return value


def check_checkpoint_119():
    """Return checkpoint-119-only errors without requiring sparse-excluded sources."""
    checkpoint_errors = []

    def checkpoint_check(ok, message):
        if not ok:
            checkpoint_errors.append(message)

    required = (
        DOCS / "plans/2026-09-22-response-window-contract-design.md",
        DOCS / "plans/2026-09-22-response-window-contract.md",
        DOCS / "tools/proxy_response_window_contract.py",
        DOCS / "tools/test_proxy_response_window_contract.py",
        DOCS / "data/proxy-response-window-contract-119-20260922.json",
        DOCS / "data/proxy-response-window-candidate-audit-119-20260922.json",
        DOCS / "119-response-window-contract.md",
    )
    for path in required:
        checkpoint_check(path.is_file(), f"119 missing required file: {path.relative_to(ROOT)}")
    numbered_doc = DOCS / "119-response-window-contract.md"
    readme = DOCS / "README.md"
    if numbered_doc.is_file():
        numbered_text = numbered_doc.read_text()
        checkpoint_check(all(value in numbered_text for value in (
            "`protocol_only_no_match_progress`",
            "planned 0・completed 0・stopped 0",
            "decision trace 0・event 0・snapshot 0・winner 0",
            "117のstopped 4",
            "response-use-event-A-040#1-target-A-017#1",
            "専用31件", "全proxy 221件",
        )), "119 numbered document counts and candidate identity")
    if readme.is_file():
        readme_text = readme.read_text()
        current = re.search(r"^## 現在フェーズと再開地点\n\n(.*?)(?=^## |\Z)",
                            readme_text, re.M | re.S)
        checkpoint_check(current is not None and
                         "[119 response-window契約](119-response-window-contract.md)" in
                         current.group(1) and "117の4経路を再開していない" in current.group(1),
                         "README current phase is checkpoint 119 protocol-only")
        checkpoint_check("| [119](119-response-window-contract.md) |" in readme_text,
                         "README missing 119 index entry")
    test_path = DOCS / "tools/test_proxy_response_window_contract.py"
    checkpoint_test_count = 0
    if test_path.is_file():
        checkpoint_test_count = sum(
            isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and
            node.name.startswith("test_")
            for node in ast.walk(ast.parse(test_path.read_text()))
        )
        checkpoint_check(checkpoint_test_count == 31, "119 dedicated test count")
    checkpoint_119_proxy_paths = [
        path for path in (DOCS / "tools").glob("test_proxy_*.py")
        if path.name not in ("test_proxy_response_window_seeded_restart.py", "test_proxy_normal_action_candidate_completeness.py", "test_proxy_normal_action_seeded_restart.py", "test_proxy_turn_end_completeness.py", "test_proxy_turn_end_provenance_restart.py", "test_proxy_normal_action_extension.py", "test_proxy_current_turn_end_correction.py", "test_proxy_r2_candidate_extension_127.py", "test_proxy_r2_candidate_extension_128.py", "test_proxy_conditional_growth_129.py", "test_proxy_board_source_world_130.py", "test_proxy_safe_placement_mixed_131.py", "test_proxy_board_active_132.py", "test_proxy_cross_restart_133.py", "test_proxy_board_response_134.py", "test_proxy_independent_seed_probe.py", "test_proxy_start_response_138.py", "test_proxy_new_seed_normal_audit_140.py", "test_proxy_new_seed_normal_restart_141.py", "test_proxy_hit_blow_response_142.py", "test_proxy_new_seed_next_opportunities_143.py", "test_proxy_board_trigger_audit_144.py", "test_proxy_new_seed_response_restart_145.py", "test_proxy_new_seed_normal_trigger_audit_146.py", "test_proxy_new_seed_normal_restart_147.py", "test_proxy_new_seed_response_restart_148.py", "test_proxy_new_seed_turn_end_audit_149.py", "test_proxy_new_seed_turn_end_history_150.py", "test_proxy_new_seed_turn_end_restart_151.py", "test_proxy_new_seed_egg_restart_152.py", "test_proxy_new_seed_start_response_153.py", "test_proxy_new_seed_item_chain_154.py", "test_proxy_new_seed_chain_resolution_155.py", "test_proxy_new_seed_normal_audit_156.py", "test_proxy_new_seed_normal_restart_157.py", "test_proxy_new_seed_response_restart_158.py", "test_proxy_new_seed_next_audit_159.py", "test_proxy_new_seed_normal_restart_160.py", "test_proxy_new_seed_end_response_restart_161.py", "test_proxy_new_seed_turn_end_history_162.py", "test_proxy_new_seed_turn_end_audit_163.py", "test_proxy_new_seed_turn_end_restart_164.py", "test_proxy_new_seed_egg_restart_165.py", "test_proxy_new_seed_start_audit_166.py", "test_proxy_board_ability_id_167.py", "test_proxy_new_seed_start_restart_168.py", "test_proxy_new_seed_next_response_audit_169.py", "test_proxy_new_seed_next_response_restart_170.py", "test_proxy_new_seed_opportunity_audit_171.py", "test_proxy_new_seed_chain_pass_172.py", "test_proxy_new_seed_next_audit_173.py", "test_proxy_new_seed_next_restart_174.py", "test_proxy_new_seed_current_audit_175.py", "test_proxy_new_seed_current_restart_176.py", "test_proxy_new_seed_followup_audit_177.py", "test_proxy_new_seed_followup_restart_178.py", "test_proxy_new_seed_board_partner_audit_179.py", "test_proxy_new_seed_partner_followup_180.py", "test_proxy_new_seed_r2_turn_end_history_181.py", "test_proxy_new_seed_r2_boundary_audit_182.py", "test_proxy_new_seed_end_response_replay_183.py", "test_proxy_new_seed_turn_end_proof_184.py", "test_proxy_new_seed_turn_end_replay_185.py", "test_proxy_new_seed_egg_exchange_replay_186.py", "test_proxy_new_seed_start_opportunity_audit_187.py", "test_proxy_new_seed_start_choice_188.py", "test_proxy_new_seed_followup_opportunity_189.py", "test_proxy_new_seed_ability_activation_190.py", "test_proxy_new_seed_chain_normal_audit_191.py", "test_proxy_new_seed_current_choices_192.py", "test_proxy_new_seed_current_restart_193.py", "test_proxy_new_seed_followup_response_194.py", "test_proxy_new_seed_mixed_pass_195.py", "test_proxy_new_seed_ability_resolution_196.py", "test_proxy_new_seed_followup_pass_197.py", "test_proxy_new_seed_normal_audit_198.py", "test_proxy_new_seed_normal_choice_199.py", "test_proxy_new_seed_normal_pass_200.py", "test_proxy_new_seed_end_response_audit_201.py")
    ]
    proxy_count = sum(
        isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and
        node.name.startswith("test_")
        for path in checkpoint_119_proxy_paths
        for node in ast.walk(ast.parse(path.read_text()))
    )
    checkpoint_check(proxy_count == 221, "119 total proxy test count")
    if all(path.is_file() for path in required):
        try:
            module = runpy.run_path(str(DOCS / "tools/proxy_response_window_contract.py"))
            inputs = module["load_inputs"]()
            bundle = module["build_checkpoint_119"](inputs)
            checkpoint_check(not module["validate_response_window_contract"](
                bundle["contract"]), "119 response contract validation")
            checkpoint_check(not module["validate_candidate_audit"](
                bundle["candidate_audit"], inputs), "119 candidate audit validation")
            materialized = module["validate_materialized_checkpoint_119"](
                bundle, DOCS / "data")
            checkpoint_check(not materialized,
                             f"119 exact materialized JSON: {materialized}")
            protected = module["validate_protected_sources"](inputs, DOCS / "data")
            checkpoint_check(not protected, f"119 protected inputs: {protected}")
            contract = bundle["contract"]
            audit = bundle["candidate_audit"]
            checkpoint_check(contract.get("status") == "protocol_only_no_match_progress" and
                             contract.get("scope") == module["ZERO_SCOPE"] and
                             audit.get("scope") == module["ZERO_SCOPE"],
                             "119 protocol-only zero scope")
            checkpoint_check(audit.get("selected_candidate_count") == 0 and
                             len(audit.get("audits", [])) == 4,
                             "119 four audits and zero selections")
            expected_candidates = {
                "order-01-a-first": [
                    "response-pass",
                    "response-use-event-A-040#1-target-A-017#1",
                ],
                "order-01-b-first": ["response-pass"],
                "order-02-a-first": ["response-pass"],
                "order-02-b-first": ["response-pass"],
            }
            checkpoint_check({row["path_id"]: row["legal_candidate_ids"]
                              for row in audit["audits"]} == expected_candidates,
                             "119 exact legal candidate sets")
            checkpoint_check(all(
                row.get("candidate_set_complete") is True and
                row.get("forbidden_information_used") == [] and
                row["response_context"].get("origin_event_seq") == 3 and
                row["response_context"].get("phase") == "response_window"
                for row in audit["audits"]),
                "119 complete contexts and information boundary")
            forbidden_keys = {"opponent_hand", "opponent_deck_order",
                              "future_draw", "future_response_choice"}
            checkpoint_check(all(not (forbidden_keys & row["inspected_information"].keys())
                                 for row in audit["audits"]),
                             "119 opponent-private and future information rejection")
            forbidden_actions = set(module["FORBIDDEN_RESPONSE_ACTION_TYPES"])
            checkpoint_check(all(
                detail.get("action_type") not in forbidden_actions
                for row in audit["audits"] for detail in row["legal_candidate_details"]),
                "119 normal actions excluded from responses")
            checkpoint_check(
                contract["candidate_contract"]["response_pass_candidate_id"] == "response-pass" and
                contract["candidate_contract"]["forbidden_pass_aliases"] == ["candidate-pass", "pass"],
                "119 response pass identity")
            first_date = audit["audits"][0]["legal_candidate_details"][1]
            checkpoint_check(
                [first_date.get(key) for key in (
                    "card_id", "card_copy_id", "source_instance_id", "target_instance_ids",
                    "base_time_cost", "remaining_time_before_payment", "relationship_stage",
                )] == ["E-first-date", "A-040", "A-040#1", ["A-017#1"], 1, 1, 0] and
                first_date.get("source_references") == [
                    "91-event-21-card-text-draft.md#E-first-date",
                    "93-cross-type-boundary-audit.md#B12",
                ], "119 E-first-date identity and sources")
            transition = {
                "window_status": "open", "window_kind": "after_normal_action",
                "turn_player": "A", "priority_actor": "A", "chain_status": "empty",
                "chain_links": [], "consecutive_passes": 0,
                "response_opportunity_index": 1, "pending_triggers": [],
                "return_to": None, "resolution_order": [],
            }
            activated = module["transition_response_window"](
                transition, {"kind": "activate", "actor": "A", "link_id": "link-1"})
            checkpoint_check(activated["priority_actor"] == "A" and
                             activated["consecutive_passes"] == 0,
                             "119 activator retains priority")
            seed_context = {
                "contract_version": module["CONTRACT_VERSION"],
                "order_id": "synthetic-order", "actor": "A", "actor_turn_index": 1,
                "round": 1, "origin_event_seq": 3, "response_opportunity_index": 1,
                "phase": "response_window", "decision_kind": "response_action",
                "choice_kind": "reaction_or_pass",
            }
            seed_ids = ["response-pass", "response-use-synthetic"]
            proof = module["build_response_seed_proof"](seed_context, seed_ids)
            checkpoint_check(not module["validate_response_seed_proof"](
                proof, seed_context, seed_ids), "119 synthetic response seed proof")
            evaluation_117 = inputs["restart_evaluation_117"]
            checkpoint_check([evaluation_117.get(key) for key in (
                "planned_route_count", "completed_route_count", "stopped_route_count",
                "independent_balance_sample_count")] == [4, 0, 4, 0],
                "119 preserves historical 117 result")
            fixtures = [json.loads(path.read_text()) for path in sorted(
                (DOCS / "data/proxy-gap-fixtures-112").glob("*.json"))]
            checkpoint_check(len(fixtures) == 6 and all(
                value["record"]["status"] == "fixture" and
                value["record"]["events"] == [] and
                value["record"]["result"]["winner"] is None for value in fixtures),
                "119 preserves six unplayed 112 fixtures")
            checkpoint_check(contract.get("population") == {
                "current_catalog_count": 452,
                "registered_history_candidate_count": 477,
                "checkpoint_119_added_count": 0,
            }, "119 unchanged 452/477 population")
            cli = subprocess.run(
                [sys.executable, str(DOCS / "tools/proxy_response_window_contract.py")],
                capture_output=True, text=True, check=False)
            checkpoint_check(cli.returncode == 0 and
                             json.loads(cli.stdout).get("valid") is True,
                             f"119 CLI: {cli.stdout}{cli.stderr}")
        except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
            checkpoint_check(False, f"119 canonical check failed: {error}")
    history = DOCS / "118-tokiokuri-terminology-migration.md"
    former_term = former_time_action_terms[0]
    unexpected = []
    for path in DOCS.rglob("*"):
        if not path.is_file() or path == history:
            continue
        try:
            if former_term in path.read_text():
                unexpected.append(str(path.relative_to(ROOT)))
        except UnicodeDecodeError:
            continue
    checkpoint_check(not unexpected, f"119 former-term allowlist changed: {unexpected}")
    checkpoint_check(history.is_file() and history.read_text().count(former_term) == 2,
                     "119 checkpoint 118 terminology history changed")
    return checkpoint_errors, checkpoint_test_count, proxy_count


def check_checkpoint_120():
    """Return checkpoint-120-only errors without sparse-excluded sources."""
    checkpoint_errors = []

    def checkpoint_check(ok, message):
        if not ok:
            checkpoint_errors.append(message)

    module_path = DOCS / "tools/proxy_response_window_seeded_restart.py"
    plan_path = DOCS / "data/proxy-response-window-seeded-restart-plan-120-20260922.json"
    evaluation_path = DOCS / "data/proxy-response-window-seeded-restart-evaluation-120-20260922.json"
    numbered_doc = DOCS / "120-response-window-seeded-restart.md"
    readme = DOCS / "README.md"
    required = (module_path, plan_path, evaluation_path)
    for path in required:
        checkpoint_check(path.is_file(), f"120 missing required file: {path.relative_to(ROOT)}")

    test_path = DOCS / "tools/test_proxy_response_window_seeded_restart.py"
    checkpoint_test_count = 0
    if test_path.is_file():
        checkpoint_test_count = sum(
            isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and
            node.name.startswith("test_")
            for node in ast.walk(ast.parse(test_path.read_text()))
        )
    checkpoint_check(checkpoint_test_count == 42, "120 dedicated test count")
    proxy_count = sum(
        isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and
        node.name.startswith("test_")
        for path in (DOCS / "tools").glob("test_proxy_*.py")
        if path.name not in ("test_proxy_normal_action_candidate_completeness.py", "test_proxy_normal_action_seeded_restart.py", "test_proxy_turn_end_completeness.py", "test_proxy_turn_end_provenance_restart.py", "test_proxy_normal_action_extension.py", "test_proxy_current_turn_end_correction.py", "test_proxy_r2_candidate_extension_127.py", "test_proxy_r2_candidate_extension_128.py", "test_proxy_conditional_growth_129.py", "test_proxy_board_source_world_130.py", "test_proxy_safe_placement_mixed_131.py", "test_proxy_board_active_132.py", "test_proxy_cross_restart_133.py", "test_proxy_board_response_134.py", "test_proxy_independent_seed_probe.py", "test_proxy_start_response_138.py", "test_proxy_new_seed_normal_audit_140.py", "test_proxy_new_seed_normal_restart_141.py", "test_proxy_hit_blow_response_142.py", "test_proxy_new_seed_next_opportunities_143.py", "test_proxy_board_trigger_audit_144.py", "test_proxy_new_seed_response_restart_145.py", "test_proxy_new_seed_normal_trigger_audit_146.py", "test_proxy_new_seed_normal_restart_147.py", "test_proxy_new_seed_response_restart_148.py", "test_proxy_new_seed_turn_end_audit_149.py", "test_proxy_new_seed_turn_end_history_150.py", "test_proxy_new_seed_turn_end_restart_151.py", "test_proxy_new_seed_egg_restart_152.py", "test_proxy_new_seed_start_response_153.py", "test_proxy_new_seed_item_chain_154.py", "test_proxy_new_seed_chain_resolution_155.py", "test_proxy_new_seed_normal_audit_156.py", "test_proxy_new_seed_normal_restart_157.py", "test_proxy_new_seed_response_restart_158.py", "test_proxy_new_seed_next_audit_159.py", "test_proxy_new_seed_normal_restart_160.py", "test_proxy_new_seed_end_response_restart_161.py", "test_proxy_new_seed_turn_end_history_162.py", "test_proxy_new_seed_turn_end_audit_163.py", "test_proxy_new_seed_turn_end_restart_164.py", "test_proxy_new_seed_egg_restart_165.py", "test_proxy_new_seed_start_audit_166.py", "test_proxy_board_ability_id_167.py", "test_proxy_new_seed_start_restart_168.py", "test_proxy_new_seed_next_response_audit_169.py", "test_proxy_new_seed_next_response_restart_170.py", "test_proxy_new_seed_opportunity_audit_171.py", "test_proxy_new_seed_chain_pass_172.py", "test_proxy_new_seed_next_audit_173.py", "test_proxy_new_seed_next_restart_174.py", "test_proxy_new_seed_current_audit_175.py", "test_proxy_new_seed_current_restart_176.py", "test_proxy_new_seed_followup_audit_177.py", "test_proxy_new_seed_followup_restart_178.py", "test_proxy_new_seed_board_partner_audit_179.py", "test_proxy_new_seed_partner_followup_180.py", "test_proxy_new_seed_r2_turn_end_history_181.py", "test_proxy_new_seed_r2_boundary_audit_182.py", "test_proxy_new_seed_end_response_replay_183.py", "test_proxy_new_seed_turn_end_proof_184.py", "test_proxy_new_seed_turn_end_replay_185.py", "test_proxy_new_seed_egg_exchange_replay_186.py", "test_proxy_new_seed_start_opportunity_audit_187.py", "test_proxy_new_seed_start_choice_188.py", "test_proxy_new_seed_followup_opportunity_189.py", "test_proxy_new_seed_ability_activation_190.py", "test_proxy_new_seed_chain_normal_audit_191.py", "test_proxy_new_seed_current_choices_192.py", "test_proxy_new_seed_current_restart_193.py", "test_proxy_new_seed_followup_response_194.py", "test_proxy_new_seed_mixed_pass_195.py", "test_proxy_new_seed_ability_resolution_196.py", "test_proxy_new_seed_followup_pass_197.py", "test_proxy_new_seed_normal_audit_198.py", "test_proxy_new_seed_normal_choice_199.py", "test_proxy_new_seed_normal_pass_200.py", "test_proxy_new_seed_end_response_audit_201.py")
        for node in ast.walk(ast.parse(path.read_text()))
    )
    checkpoint_check(proxy_count == 263, "120 total proxy test count")

    if numbered_doc.is_file():
        numbered_text = numbered_doc.read_text()
        checkpoint_check(all(value in numbered_text for value in (
            "planned 4・completed 0・rules-stop 4・integrity-stop 0",
            "decision 9・event 10・snapshot 14・winner 0",
            "`incomplete_legal_candidates`", "`E-first-date`",
            "独立balance標本 0", "117・119・116・112を変更していない",
            "専用42件", "全proxy 263件",
        )), "120 numbered document outcomes and protected boundaries")
    else:
        checkpoint_check(False, "120 numbered document is missing")
    if readme.is_file():
        readme_text = readme.read_text()
        current = re.search(r"^## 現在フェーズと再開地点\n\n(.*?)(?=^## |\Z)",
                            readme_text, re.M | re.S)
        checkpoint_check(current is not None and
                         "[120 response-window再開](120-response-window-seeded-restart.md)" in
                         current.group(1), "README current phase is checkpoint 120")
        checkpoint_check(all(
            f"| [{number}]({target}) |" in readme_text
            for number, target in (
                (112, "112-targeted-structural-gap-fixtures.md"),
                (116, "116-normal-decision-fallback-contract.md"),
                (117, "117-normal-decision-seeded-restart.md"),
                (119, "119-response-window-contract.md"),
                (120, "120-response-window-seeded-restart.md"),
            )
        ), "README 112/116/117/119/120 history")

    if all(path.is_file() for path in required):
        try:
            module = runpy.run_path(str(module_path))
            inputs = module["load_checkpoint_120_inputs"]()
            protected = module["verify_protected_sources"](inputs)
            checkpoint_check(not protected, f"120 protected inputs: {protected}")
            checkpoint_check(
                len(module["PROTECTED_RAW_SHA256"]) + len(module["PROTECTED_STOPS"]) == 20,
                "120 protected raw source count",
            )
            checkpoint_check(
                len(module["PROTECTED_STATE_SHA256"]) == 4,
                "120 protected state hash count",
            )

            plan = json.loads(plan_path.read_text())
            plan_errors = module["validate_restart_plan_120"](plan, inputs)
            checkpoint_check(not plan_errors, f"120 canonical plan: {plan_errors}")
            plan_bytes_errors = module["validate_materialized_plan_120"](
                inputs, DOCS / "data"
            )
            checkpoint_check(not plan_bytes_errors,
                             f"120 exact materialized plan JSON: {plan_bytes_errors}")
            suite = module["continue_routes_independently"](plan, inputs)
            evaluation = module["build_evaluation_120"](suite)
            checkpoint_check(
                json.loads(evaluation_path.read_text()) == evaluation,
                "120 saved evaluation differs from builder",
            )
            materialized = module["validate_materialized_checkpoint_120"](
                suite, DOCS / "data"
            )
            checkpoint_check(not materialized,
                             f"120 exact materialized JSON: {materialized}")
            checkpoint_check(
                [evaluation.get(key) for key in (
                    "planned_route_count", "completed_route_count",
                    "stopped_rules_adjudication_count",
                    "stopped_record_integrity_count", "decision_count",
                    "event_count", "snapshot_count", "winner_count",
                    "independent_balance_sample_count",
                )] == [4, 0, 4, 0, 9, 10, 14, 0, 0],
                "120 exact evaluation counts",
            )

            expected_terminals = {
                "order-01-a-first": (7,
                    "641e77bb932b2a3b4d4214b0cd12306076ec86a990e13110c9e4bc4cf8f94d80",
                    "a698227f6c2c851c3012b64ba27cf9db77d8a0eeb13d583902efda03ac600a00"),
                "order-01-b-first": (5,
                    "6462c0cb11bc0cb26aeb055a4b969578a3f9bd05ff8963584fe629ac00ff3616",
                    "cbda8acffc3a36ceb14b98a2cb36cd9649796444599ed02da4abfdcfc8403467"),
                "order-02-a-first": (5,
                    "edbc2844074b27462439c1efe85f0c021b826cf75a51bdd115858029dfc2ff89",
                    "b325d7802cf9e9e621765f420727f33c16a52e0ea10a989bb1dd38376aa717ea"),
                "order-02-b-first": (5,
                    "c934f656ed14f0a73b2c70f714470e7bbdad98626ce4a4078fe96888aa426473",
                    "f4eaf9452682fd1c5ff2ecf7ed4dfb9a3ccd34fb3dba707cff7bff870b3accf5"),
            }
            for path_id, expected in expected_terminals.items():
                outcome = suite["outcomes"][path_id]
                stop = outcome["stop"]
                checkpoint_check(
                    outcome["status"] == "stopped_rules_adjudication" and
                    stop["reason_code"] == "incomplete_legal_candidates" and
                    (stop["last_valid_event_seq"], stop["game_state_sha256"],
                     stop["continuation_state_sha256"]) == expected,
                    f"120 exact terminal manifest: {path_id}",
                )
                evidence = suite["replay_evidence"][path_id]
                decisions = evidence["decisions"]
                events = evidence["events"]
                snapshots = evidence["snapshots"]
                decision_ids = {row.get("decision_id") for row in decisions}
                checkpoint_check(
                    [row.get("decision_seq") for row in decisions] ==
                    list(range(1, len(decisions) + 1)),
                    f"120 decision sequence: {path_id}",
                )
                checkpoint_check(
                    [row.get("seq") for row in events] ==
                    list(range(4, 4 + len(events))),
                    f"120 event sequence: {path_id}",
                )
                checkpoint_check(
                    len(snapshots) == len(events) + 1 and
                    snapshots[0].get("event_seq") == 3,
                    f"120 snapshot sequence: {path_id}",
                )
                prior = snapshots[0]
                for event, snapshot in zip(events, snapshots[1:]):
                    checkpoint_check(
                        event.get("event_id") ==
                        f"event-120-{path_id}-{event['seq']:03d}" and
                        event.get("decision_id") in decision_ids | {None} and
                        event.get("game_state_before_sha256") ==
                        prior.get("game_state_sha256") and
                        event.get("continuation_state_before_sha256") ==
                        prior.get("continuation_state_sha256") and
                        event.get("game_state_after_sha256") ==
                        snapshot.get("game_state_sha256") and
                        event.get("continuation_state_after_sha256") ==
                        snapshot.get("continuation_state_sha256") and
                        snapshot.get("event_seq") == event.get("seq"),
                        f"120 event/snapshot dual-hash chain: {path_id}:{event.get('seq')}",
                    )
                    prior = snapshot
                for decision in decisions:
                    matching = [event for event in events
                                if event.get("decision_id") == decision.get("decision_id")]
                    checkpoint_check(
                        len(matching) == 1 and
                        decision.get("event_seq") == matching[0].get("seq") and
                        decision.get("pre_game_state_sha256") ==
                        matching[0].get("game_state_before_sha256") and
                        decision.get("pre_continuation_state_sha256") ==
                        matching[0].get("continuation_state_before_sha256") and
                        decision.get("forbidden_information_used") == [],
                        f"120 decision/event reference: {path_id}:{decision.get('decision_seq')}",
                    )

            fixtures = [json.loads(path.read_text()) for path in sorted(
                (DOCS / "data/proxy-gap-fixtures-112").glob("*.json"))]
            checkpoint_check(len(fixtures) == 6 and all(
                value["record"]["status"] == "fixture" and
                value["record"]["events"] == [] and
                value["record"]["result"]["winner"] is None
                for value in fixtures
            ), "120 preserves six unplayed 112 fixtures")
        except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
            checkpoint_check(False, f"120 canonical check failed: {error}")
    return checkpoint_errors, checkpoint_test_count, proxy_count


if "--checkpoint-133" in sys.argv:
    import proxy_cross_restart_133 as checkpoint_133
    errors=[]
    try:
        sources=checkpoint_133.load_sources()
        errors.extend(checkpoint_133.check_outputs(DOCS/'data',sources))
        plan=json.loads((DOCS/'data'/checkpoint_133.PLAN_FILE).read_text())
        evaluation=json.loads((DOCS/'data'/checkpoint_133.EVALUATION_FILE).read_text())
        if plan['source_stop_raw_sha256']!=checkpoint_133.SOURCE_SHA or \
                evaluation['planned']!=4 or evaluation['completed']!=2 or \
                evaluation['rules_stop']!=2 or evaluation['independent_balance_sample']!=0:
            errors.append('133 four-route plan/evaluation differs')
    except (OSError,ValueError,KeyError,TypeError) as error:
        errors.append(f'133 source integrity: {error}')
    if not (DOCS/'133-cross-stop-restart.md').is_file() or \
            '| [133](133-cross-stop-restart.md) |' not in (DOCS/'README.md').read_text():
        errors.append('133 report or README index')
    print(json.dumps({'checkpoint':133,'errors':errors},ensure_ascii=False,indent=2))
    sys.exit(bool(errors))

if "--checkpoint-132" in sys.argv:
    import proxy_board_active_132 as checkpoint_132
    checkpoint_errors=[]
    try:
        inputs=checkpoint_132.load_sources()
        checkpoint_errors.extend(checkpoint_132.check_outputs(DOCS/'data',inputs))
        plan=json.loads((DOCS/'data'/checkpoint_132.PLAN_FILE).read_text())
        evaluation=json.loads((DOCS/'data'/checkpoint_132.EVALUATION_FILE).read_text())
        if plan!=checkpoint_132.build_plan(checkpoint_132.run_all(inputs)) or \
                evaluation!=checkpoint_132.build_evaluation(plan) or \
                evaluation['planned']!=4 or evaluation['independent_balance_sample']!=0:
            checkpoint_errors.append('132 four-route canonical plan/evaluation differs')
    except (OSError,ValueError,KeyError,TypeError) as error:
        checkpoint_errors.append(f'132 source integrity: {error}')
    if not (DOCS/'132-board-active-restart.md').is_file() or \
            '| [132](132-board-active-restart.md) |' not in (DOCS/'README.md').read_text():
        checkpoint_errors.append('132 report or README index')
    print(json.dumps({'checkpoint':132,'errors':checkpoint_errors},ensure_ascii=False,indent=2))
    sys.exit(bool(checkpoint_errors))


if "--checkpoint-131" in sys.argv:
    import proxy_safe_placement_mixed_131 as checkpoint_131
    checkpoint_errors=[]
    try:
        inputs=checkpoint_131.load_sources()
        checkpoint_errors.extend(checkpoint_131.check_outputs(DOCS/'data',inputs))
        plan=json.loads((DOCS/'data'/checkpoint_131.PLAN_FILE).read_text())
        evaluation=json.loads((DOCS/'data'/checkpoint_131.EVALUATION_FILE).read_text())
        if plan!=checkpoint_131.build_plan(checkpoint_131.run_all(inputs)) or \
                evaluation!=checkpoint_131.build_evaluation(plan) or \
                evaluation['planned']!=4 or evaluation['independent_balance_sample']!=0:
            checkpoint_errors.append('131 four-route canonical plan/evaluation differs')
    except (OSError,ValueError,KeyError,TypeError) as error:
        checkpoint_errors.append(f'131 source integrity: {error}')
    if not (DOCS/'131-safe-placement-mixed-restart.md').is_file() or \
            '| [131](131-safe-placement-mixed-restart.md) |' not in (DOCS/'README.md').read_text():
        checkpoint_errors.append('131 report or README index')
    print(json.dumps({'checkpoint':131,'errors':checkpoint_errors},ensure_ascii=False,indent=2))
    sys.exit(bool(checkpoint_errors))


if "--checkpoint-130" in sys.argv:
    import proxy_board_source_world_130 as checkpoint_130
    checkpoint_errors=[]
    try:
        inputs=checkpoint_130.load_sources()
        checkpoint_errors.extend(checkpoint_130.check_outputs(DOCS/'data',inputs))
        plan=json.loads((DOCS/'data'/checkpoint_130.PLAN_FILE).read_text())
        evaluation=json.loads((DOCS/'data'/checkpoint_130.EVALUATION_FILE).read_text())
        if plan!=checkpoint_130.build_plan(checkpoint_130.run_all(inputs)) or \
                evaluation!=checkpoint_130.build_evaluation(plan) or \
                evaluation['planned']!=4 or evaluation['independent_balance_sample']!=0:
            checkpoint_errors.append('130 four-route canonical plan/evaluation differs')
    except (OSError,ValueError,KeyError,TypeError) as error:
        checkpoint_errors.append(f'130 source integrity: {error}')
    if not (DOCS/'130-board-source-world-restart.md').is_file() or \
            '| [130](130-board-source-world-restart.md) |' not in (DOCS/'README.md').read_text():
        checkpoint_errors.append('130 report or README index')
    print(json.dumps({'checkpoint':130,'errors':checkpoint_errors},ensure_ascii=False,indent=2))
    sys.exit(bool(checkpoint_errors))


if "--checkpoint-129" in sys.argv:
    import proxy_conditional_growth_129 as checkpoint_129
    checkpoint_errors=[]
    try:
        inputs=checkpoint_129.load_sources()
        checkpoint_errors.extend(checkpoint_129.check_outputs(DOCS/'data',inputs))
        plan=json.loads((DOCS/'data'/checkpoint_129.PLAN_FILE).read_text())
        evaluation=json.loads((DOCS/'data'/checkpoint_129.EVALUATION_FILE).read_text())
        if plan!=checkpoint_129.build_plan(checkpoint_129.run_all(inputs)) or \
                evaluation!=checkpoint_129.build_evaluation(plan) or \
                evaluation['planned']!=4 or evaluation['independent_balance_sample']!=0:
            checkpoint_errors.append('129 four-route canonical plan/evaluation differs')
    except (OSError,ValueError,KeyError,TypeError) as error:
        checkpoint_errors.append(f'129 source integrity: {error}')
    if not (DOCS/'129-conditional-growth-restart.md').is_file() or \
            '| [129](129-conditional-growth-restart.md) |' not in (DOCS/'README.md').read_text():
        checkpoint_errors.append('129 report or README index')
    print(json.dumps({'checkpoint':129,'errors':checkpoint_errors},ensure_ascii=False,indent=2))
    sys.exit(bool(checkpoint_errors))


if "--checkpoint-128" in sys.argv:
    import proxy_r2_candidate_extension_128 as checkpoint_128
    checkpoint_errors=[]
    try:
        inputs=checkpoint_128.load_sources()
        checkpoint_errors.extend(checkpoint_128.check_outputs(DOCS/'data',inputs))
        plan=json.loads((DOCS/'data'/checkpoint_128.PLAN_FILE).read_text())
        evaluation=json.loads((DOCS/'data'/checkpoint_128.EVALUATION_FILE).read_text())
        if plan!=checkpoint_128.build_plan(checkpoint_128.run_all(inputs)) or \
                evaluation!=checkpoint_128.build_evaluation(plan) or \
                evaluation['planned']!=4 or evaluation['independent_balance_sample']!=0:
            checkpoint_errors.append('128 four-route canonical plan/evaluation differs')
    except (OSError,ValueError,KeyError,TypeError) as error:
        checkpoint_errors.append(f'128 source integrity: {error}')
    if not (DOCS/'128-r2-candidate-extension.md').is_file() or \
            '| [128](128-r2-candidate-extension.md) |' not in (DOCS/'README.md').read_text():
        checkpoint_errors.append('128 report or README index')
    print(json.dumps({'checkpoint':128,'errors':checkpoint_errors},ensure_ascii=False,indent=2))
    sys.exit(bool(checkpoint_errors))

if "--checkpoint-127" in sys.argv:
    import proxy_r2_candidate_extension_127 as checkpoint_127
    checkpoint_errors=[]
    try:
        checkpoint_errors.extend(checkpoint_127.check_outputs())
        inputs=checkpoint_127.load_sources()
        plan=checkpoint_127.build_plan(inputs)
        evaluation=checkpoint_127.build_evaluation(plan)
        if len(plan['routes'])!=4 or evaluation['completed']!=0 or evaluation['rules_stop']!=4 or \
                evaluation['decision']!=9 or evaluation['event']!=11 or evaluation['snapshot']!=15 or \
                evaluation['independent_balance_sample']!=0:
            checkpoint_errors.append('127 route outcome differs')
    except (OSError,ValueError,KeyError,TypeError) as error:
        checkpoint_errors.append(f'127 source integrity: {error}')
    if not (DOCS/'127-r2-candidate-extension.md').is_file() or \
            '| [127](127-r2-candidate-extension.md) |' not in (DOCS/'README.md').read_text():
        checkpoint_errors.append('127 report or README index')
    print(json.dumps({'checkpoint':127,'errors':checkpoint_errors},ensure_ascii=False,indent=2))
    sys.exit(bool(checkpoint_errors))

if "--checkpoint-126" in sys.argv:
    import proxy_current_turn_end_correction as checkpoint_126
    checkpoint_errors=[]
    try:
        checkpoint_errors.extend(checkpoint_126.check_outputs())
        plan=checkpoint_126.build_plan(checkpoint_126.load_sources())
        evaluation=checkpoint_126.build_evaluation(plan)
        if len(plan['routes'])!=4 or evaluation['completed']!=0 or evaluation['rules_stop']!=4:
            checkpoint_errors.append('126 route outcome differs')
    except (OSError,ValueError,KeyError,TypeError) as error:
        checkpoint_errors.append(f'126 source integrity: {error}')
    if not (DOCS/'126-current-turn-end-correction.md').is_file() or \
            '| [126](126-current-turn-end-correction.md) |' not in (DOCS/'README.md').read_text():
        checkpoint_errors.append('126 report or README index')
    print(json.dumps({'checkpoint':126,'errors':checkpoint_errors},ensure_ascii=False,indent=2))
    sys.exit(bool(checkpoint_errors))

if "--checkpoint-125" in sys.argv:
    import proxy_normal_action_extension as checkpoint_125
    checkpoint_errors=[]
    try:
        checkpoint_errors.extend(checkpoint_125.check_outputs())
        plan=checkpoint_125.build_plan(checkpoint_125.load_sources())
        evaluation=checkpoint_125.build_evaluation(plan)
        if len(plan['routes'])!=4 or evaluation['completed']!=0 or evaluation['rules_stop']!=4:
            checkpoint_errors.append('125 route outcome differs')
    except (OSError,ValueError,KeyError,TypeError) as error:
        checkpoint_errors.append(f'125 source integrity: {error}')
    if not (DOCS/'125-normal-action-extension.md').is_file() or \
            '| [125](125-normal-action-extension.md) |' not in (DOCS/'README.md').read_text():
        checkpoint_errors.append('125 report or README index')
    print(json.dumps({'checkpoint':125,'errors':checkpoint_errors},ensure_ascii=False,indent=2))
    sys.exit(bool(checkpoint_errors))

if "--checkpoint-124" in sys.argv:
    import proxy_turn_end_provenance_restart as checkpoint_124
    checkpoint_errors = []
    try:
        checkpoint_errors.extend(checkpoint_124.check_outputs())
        plan = checkpoint_124.build_plan(checkpoint_124.load_sources())
        evaluation = checkpoint_124.build_evaluation(plan)
        if len(plan['routes']) != 4 or evaluation['completed'] != 0 or evaluation['rules_stop'] != 4:
            checkpoint_errors.append('124 route outcome differs')
    except (OSError, ValueError, KeyError, TypeError) as error:
        checkpoint_errors.append(f'124 source integrity: {error}')
    if not (DOCS/'124-turn-end-provenance-restart.md').is_file() or \
            '| [124](124-turn-end-provenance-restart.md) |' not in (DOCS/'README.md').read_text():
        checkpoint_errors.append('124 report or README index')
    print(json.dumps({'checkpoint':124,'errors':checkpoint_errors},ensure_ascii=False,indent=2))
    sys.exit(bool(checkpoint_errors))

if "--checkpoint-123" in sys.argv:
    import proxy_turn_end_completeness as checkpoint_123
    checkpoint_errors = []
    try:
        checkpoint_errors.extend(checkpoint_123.check_outputs())
        inputs = checkpoint_123.load_inputs()
        audits = checkpoint_123.build_audits(inputs)['audits']
        for audit, (stop, raw) in zip(audits, inputs.values()):
            checkpoint_errors.extend(checkpoint_123.validate_turn_end(audit, stop, raw))
        if len(audits) != 4 or any(a['turn_end_set_complete'] for a in audits):
            checkpoint_errors.append('123 protected stop count or proof boundary')
    except (OSError, ValueError, KeyError, TypeError) as error:
        checkpoint_errors.append(f'123 source integrity: {error}')
    report = DOCS / '123-turn-end-completeness-contract.md'
    if not report.is_file() or '| [123](123-turn-end-completeness-contract.md) |' not in (DOCS/'README.md').read_text():
        checkpoint_errors.append('123 report or README index')
    print(json.dumps({'checkpoint':123, 'errors':checkpoint_errors}, ensure_ascii=False, indent=2))
    sys.exit(bool(checkpoint_errors))

if "--checkpoint-122" in sys.argv:
    import proxy_normal_action_seeded_restart as checkpoint_122
    import proxy_normal_action_candidate_completeness as checkpoint_121
    test_path = DOCS / 'tools/test_proxy_normal_action_seeded_restart.py'
    dedicated_test_count = sum(
        isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and
        node.name.startswith('test_')
        for node in ast.walk(ast.parse(test_path.read_text())))
    checkpoint_errors = []
    try:
        checkpoint_errors.extend(checkpoint_122.check_outputs())
        for filename, expected in (
            ('proxy-normal-action-candidate-completeness-contract-121-20260923.json',
             checkpoint_121.build_contract()),
            ('proxy-normal-action-candidate-completeness-audit-121-20260923.json',
             checkpoint_121.build_audits(checkpoint_121.load_inputs())),
        ):
            if (DOCS/'data'/filename).read_bytes()!=checkpoint_121.canonical_bytes(expected):
                checkpoint_errors.append('121 canonical bytes: '+filename)
    except (OSError,ValueError,KeyError,TypeError) as error:
        checkpoint_errors.append(f'122 protected source or canonical bytes: {error}')
    if dedicated_test_count != 18:
        checkpoint_errors.append('122 dedicated test count')
    report = DOCS / '122-normal-action-seeded-restart.md'
    if not report.is_file() or '| [122](122-normal-action-seeded-restart.md) |' not in (DOCS/'README.md').read_text():
        checkpoint_errors.append('122 report or README index')
    print(json.dumps({'checkpoint':122,'dedicated_test_count':dedicated_test_count,
                      'errors':checkpoint_errors},ensure_ascii=False,indent=2))
    sys.exit(bool(checkpoint_errors))

checkpoint_119_errors, checkpoint_119_test_count, checkpoint_119_proxy_count = check_checkpoint_119()
if "--checkpoint-119" in sys.argv:
    print(json.dumps({
        "checkpoint": 119,
        "checkpoint_119_test_count": checkpoint_119_test_count,
        "proxy_test_count": checkpoint_119_proxy_count,
        "errors": checkpoint_119_errors,
    }, ensure_ascii=False, indent=2))
    sys.exit(bool(checkpoint_119_errors))
errors.extend(checkpoint_119_errors)

checkpoint_120_errors, checkpoint_120_test_count, checkpoint_120_proxy_count = check_checkpoint_120()
if "--checkpoint-120" in sys.argv:
    print(json.dumps({
        "checkpoint": 120,
        "checkpoint_120_test_count": checkpoint_120_test_count,
        "proxy_test_count": checkpoint_120_proxy_count,
        "errors": checkpoint_120_errors,
    }, ensure_ascii=False, indent=2))
    sys.exit(bool(checkpoint_120_errors))
errors.extend(checkpoint_120_errors)


unexpected_former_time_action_terms = []
for terminology_path in DOCS.rglob("*"):
    if not terminology_path.is_file() or terminology_path == terminology_history_path:
        continue
    try:
        terminology_text = terminology_path.read_text()
    except UnicodeDecodeError:
        continue
    for former_term in former_time_action_terms:
        for match in re.finditer(re.escape(former_term), terminology_text):
            line = terminology_text.count("\n", 0, match.start()) + 1
            unexpected_former_time_action_terms.append(
                f"{terminology_path.relative_to(ROOT)}:{line}:{former_term}"
            )
check(not unexpected_former_time_action_terms,
      f"Former time-action term remains outside checkpoint 118: "
      f"{unexpected_former_time_action_terms}")
check(terminology_history_path.exists(), "118 terminology migration document missing")
if terminology_history_path.exists():
    terminology_history_text = terminology_history_path.read_text()
    terminology_history_counts = {
        term: terminology_history_text.count(term) for term in former_time_action_terms
    }
    check(list(terminology_history_counts.values()) == [2, 0, 0, 0],
          f"118 former-term history allowlist changed: {terminology_history_counts}")
    former_term = former_time_action_terms[0]
    allowed_history_contexts = (
        f"旧称「{former_term}」を、現時点の暫定名称",
        f"| 旧称 | {former_term} | この移行履歴だけに残す。現行仕様本文では使用しない |",
    )
    check(all(terminology_history_text.count(context) == 1
              for context in allowed_history_contexts),
          "118 former-term history contexts changed")
    check("暫定名称" in terminology_history_text and
          "ID、schema、英語の機械識別子は変更しない" in terminology_history_text and
          "新しい「ときもどし」効果" in terminology_history_text and
          "81ファイル" in terminology_history_text and "合計268件" in terminology_history_text,
          "118 terminology scope or provisional-name boundary changed")


# Execute only the master/catalog constructors, never game callbacks or script.js.
source = json.loads(subprocess.check_output(["node", "-e", r"""
const fs=require('fs'),vm=require('vm');
const c={window:{}}; vm.createContext(c);
vm.runInContext(fs.readFileSync('character-world-master.v1.js','utf8'),c);
vm.runInContext(fs.readFileSync('games.js','utf8'),c);
const g=c.installNaotocchiMinigames({SEASON:{SPRING:'spring',SUMMER:'summer',AUTUMN:'autumn',WINTER:'winter'}});
const games=[...g.MINIGAMES.map(x=>({id:x.id,category:g.minigameCategoryOf.get(x),source:'general'})),
...Object.entries(g.REGION_MINIGAMES).flatMap(([context,a])=>a.map(x=>({id:x.game.id,category:x.category,source:'region',context}))),
...Object.entries(g.SEASONAL_MINIGAMES).flatMap(([context,a])=>a.map(x=>({id:x.game.id,category:x.category,source:'season',context})))];
console.log(JSON.stringify({master:c.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1,games}));
"""], cwd=ROOT, text=True))
master, games = source["master"], source["games"]
species = [s for rarity in ("normal", "rare", "secret") for s in master["playerSpecies"][rarity]]
check(len(species) == 31 and all(len(s["stages"]) == 8 for s in species), "Main source: expected 31 x 8")
check(master["playerSpecies"]["author"]["id"] == "naoto" and not master["playerSpecies"]["author"]["playable"], "Author source changed")

catalogs = {
    "C": master["companions"]["normal"] + master["companions"]["rare"],
    "P": master["partners"],
    "W": [master["regions"]["home"]] + master["regions"]["normal"] + master["regions"]["special"],
}
for prefix, number, count in (("C", 35, 26), ("P", 36, 18), ("W", 40, 13)):
    ids = re.findall(rf"^### {prefix}-([\w-]+)", doc(number), re.M)
    check(len(ids) == len(set(ids)) == count and set(ids) == {s["id"] for s in catalogs[prefix]}, f"{prefix} source/role mismatch")

# Historical registered 38: the unmerged branch's source baseline.
# Current main items are checked separately against the pinned 76 snapshot.
script = (ROOT / "script.js").read_text()
item_ids = []
item_groups = {}
for name, count in (("SHOP_ITEMS", 15), ("NAOTO_ITEMS", 4), ("CONSUMABLE_ITEMS", 11), ("FUN_ITEMS", 7), ("RECOVERY_ITEMS", 1)):
    block = re.search(rf"  const {name} = \[\n(.*?)\n  \];", script, re.S)
    if not block:
        raise ValueError(f"Cannot find current array {name}")
    ids = re.findall(r"(?:\bid|\"id\"):\s*['\"]([^'\"]+)['\"]", block[1])
    check(len(ids) == count, f"{name}: expected {count}, got {len(ids)}")
    item_groups[name] = ids
    item_ids.extend(ids)
item_role_ids = re.findall(r"^### I-([\w-]+)", doc(37), re.M)
check(len(item_role_ids) == len(set(item_role_ids)) == len(set(item_ids)) == 38 and set(item_ids) == set(item_role_ids), "Item role/source mismatch")
held_items = re.findall(r"^### I-([\w-]+)", doc(37).split("## E. RECOVERY_ITEMS 1 — HOLD")[1].split("## F.")[0], re.M)
check(set(held_items) == set(item_groups["RECOVERY_ITEMS"]), "Item HOLD/source mismatch")

check(collections.Counter(g["source"] for g in games) == {"general": 86, "region": 10, "season": 4}, "Game source counts changed")
game_map = {g["id"]: g for g in games}
check(len(game_map) == 100, "Duplicate/missing game source ID")
mapped = [r for r in rows(doc(32)) if r[0].startswith("G-")]
check(len(mapped) == 100 and {r[0][2:] for r in mapped} == set(game_map), "32 game ID coverage")
for r in mapped:
    g = game_map.get(r[1], {})
    check(r[0] == "G-" + r[1] and r[2] == g.get("category"), f"32 category mismatch: {r[0]}")
    kind = "region" if r[3].startswith("地域:") else "season" if r[3].startswith("季節:") else "general"
    check(kind == g.get("source"), f"32 source mismatch: {r[0]}")
role_games = [r[1][2:] for r in rows(doc(39)) if len(r) > 1 and r[0].isdigit()]
check(len(role_games) == 100 and set(role_games) == set(game_map), "39 game role coverage")
inventory_games = re.findall(r"^\d+\. ([\w-]+)$", doc(28), re.M)
check(len(inventory_games) == 100 and set(inventory_games) == set(game_map), "28 game inventory coverage")

event_rows = [r for r in rows(doc(30).split("## 5.")[1].split("## 6.")[0]) if r[0].startswith("E-")]
check(len({r[0] for r in event_rows}) == 34 and collections.Counter(r[1] for r in event_rows) == {"CARD": 21, "HOLD": 13}, "Event count/status mismatch")
event_roles = re.findall(r"^(?:### |- )(E-[\w-]+)", doc(38), re.M)
check(set(event_roles) == {r[0] for r in event_rows}, "38 event role coverage")
event_status = collections.Counter(r[1] for r in event_rows)
check(any(r[0] == "E-naoto" and r[1] == "CARD" for r in event_rows), "E-naoto CARD missing")
inventory = {
    "メイン": (sum(len(s["stages"]) for s in species), 0),
    "なかま": (len(catalogs["C"]), 0), "こいびと": (len(catalogs["P"]), 0),
    "セカイ（場所）": (len(catalogs["W"]), 0), "あそび": (len(games), 0),
    "あいてむ": (len(item_ids) - len(held_items), len(held_items)),
    "できごと": (event_status["CARD"], event_status["HOLD"]),
}
totals = [sum(counts[i] for counts in inventory.values()) for i in (0, 1)]
inventory_rows = [r for r in rows(doc(30).split("## 6.")[1].split("## 7.")[0]) if r[0] in inventory or r[0] == "**合計**"]
check(len(inventory_rows) == 8, "30 inventory summary row count")
for r in inventory_rows:
    counts = inventory.get(r[0], totals)
    check([int(c.strip("*")) for c in r[1:]] == [*counts, sum(counts)], f"30 inventory arithmetic: {r[0]}")
check(totals == [463, 14], f"Registered pool changed: {totals}")

order = {42: ["man", "woman", "ren"], 43: ["cat"], 44: ["penguin", "turtle", "frog", "salmon"],
         45: ["clownfish", "hermit_crab", "jellyfish", "starfish", "coral"],
         46: ["butterfly", "beetle", "stagbeetle", "cicada", "antlion"],
         47: ["dandelion", "sakura", "venus_flytrap", "mushroom", "world_tree"],
         48: ["dragon", "phoenix", "god", "ghost"], 49: ["star", "plush", "unknown"]}
curves = {}
for number, ids in order.items():
    found = [tuple((int(a), int(b)) for a, b in re.findall(r"(\d+)/(\d+)", s))
             for s in re.findall(r"`([^`]*→[^`]*)`", doc(number))]
    found = [c for c in found if len(c) == 8]
    check(len(found) == len(ids), f"{number}: curve extraction changed; inspect document")
    curves.update(zip(ids, found))
dog = doc(4).split("## けもの代表: いぬ")[1].split("## みずべ代表:")[0]
curves["dog"] = tuple((int(a), int(b)) for a, b in re.findall(r"(\d+)/(\d+)", re.search(r"仮数値曲線: `([^`]+)`", dog)[1]))
check(set(curves) == {s["id"] for s in species}, "Curve/source species mismatch")
check(all(1 <= v <= 10 for c in curves.values() for pair in c for v in pair), "Printed value outside 1..10")
duplicates = [names for curve in set(curves.values()) if len(names := [s for s, c in curves.items() if c == curve]) > 1]
check(not duplicates, f"Duplicate eight-stage curves: {duplicates}")


def means(pairs):
    sums = [sum(v[i] for v in pairs) for i in (0, 1)]
    return [str((Decimal(s) / len(pairs)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) for s in sums + [sum(sums)]]


attributes = {"ひと": ["man", "woman", "ren"], "けもの": ["dog", "cat"], "みずべ": order[44],
              "うみ": order[45], "むし": order[46], "くさ": order[47], "げんそう": order[48], "ふしぎ": order[49]}
averages = {a: means([p for s in ids for p in curves[s]]) for a, ids in attributes.items()}
stages = {label: means([c[i] for c in curves.values()]) for i, label in enumerate("①②③④⑤⑥⑦⑧")}
rarities = {label: means([p for s in master["playerSpecies"][key] for p in curves[s["id"]]])
            for label, key in (("通常", "normal"), ("レア", "rare"), ("シークレット（れんくん）", "secret"))}
for r in rows(doc(50)):
    expected = {**averages, **stages, **rarities}.get(r[0])
    if expected:
        check(r[1:] == expected, f"50 rounding/value mismatch: {r[0]} {r[1:]} -> {expected}")

body_records = {}
ability_texts = collections.defaultdict(list)
vanilla = []
species_map = {s["id"]: s for s in species}


def add_body(s, stage, label, power, wisdom, block, path):
    stage = int(stage)
    key = f"M-{s}-{stage:02}"
    check(s in curves and 1 <= stage <= 8, f"Unknown main ID: {key}")
    if s not in curves or not 1 <= stage <= 8:
        return
    check(curves[s][stage-1] == (int(power), int(wisdom)) and label == "①②③④⑤⑥⑦⑧"[stage-1], f"Body heading value/stage: {key}")
    check(key not in body_records, f"Duplicate canonical body ID: {key}")
    body = re.search(r"^`(.+)`$|^> (.+)$", block, re.M)
    is_vanilla = ("能力なし" in block.splitlines()[0]
                  or bool(re.search(r"^能力なし。?$", block, re.M))
                  or "- Bでは能力なしで試す。ちから10自体を個性とする。" in block.splitlines())
    value = "能力なし。" if is_vanilla else (body[1] or body[2]) if body else ""
    check(bool(value), f"Missing body: {key}")
    if is_vanilla:
        vanilla.append(key)
    elif value:
        ability_texts[value].append(key)
    body_records[key] = {"id": key, "species": s, "stage": stage,
                         "name": species_map[s]["label"] + label,
                         "form": species_map[s]["stages"][stage-1],
                         "power": int(power), "wisdom": int(wisdom),
                         "normal_time": stage, "text": value, "path": str(path.relative_to(ROOT))}


indexed_files = [next(DOCS.glob(f"{n:02}-*.md")) for n in (51, 52, 53, 54, 55, 57, 59, 68)]
representative_files = [DOCS / "representatives" / name for name in (
    "02-beast-dog.md", "03-waterside-frog.md", "04-ocean-clownfish.md",
    "06-plant-sakura.md", "07-fantasy-phoenix.md", "08-mystery-plush.md")]
for path in indexed_files + representative_files:
    text = path.read_text()
    matches = list(re.finditer(r"^#{1,2} M-([\w_]+)-(\d{2}) ([①-⑧]) (\d+)/(\d+)", text, re.M))
    for index, match in enumerate(matches):
        block = text[match.start():matches[index+1].start() if index+1 < len(matches) else len(text)]
        add_body(*match.groups(), block, path)
    # New source tables must keep the real form name distinct from display name.
    if path in representative_files or path.name.startswith("68-"):
        mapped_forms = [r for r in rows(text) if re.fullmatch(r"M-[\w_]+-\d{2}", r[0])]
        check(len(mapped_forms) == len(matches), f"Form table coverage: {path.name}")
        for r in mapped_forms:
            rec = body_records.get(r[0], {})
            check(r[1] == rec.get("name") and r[2] == rec.get("form"), f"Form name/source mismatch: {r[0]}")
indexed_count = len(body_records)
check(indexed_count == 224, "Expected 224 M-ID body headings including the six existing A cards")

# 15 v2 + later individual revisions, and 23 v3 are the authoritative old 24.
for s, number, start, end in (
        ("man", 15, "# おとこのひと①〜⑧", "# カブトムシ①〜⑧"),
        ("beetle", 15, "# カブトムシ①〜⑧", "# 第2稿横断監査"),
        ("stagbeetle", 23, "# 8段階 第3稿", "# 第3稿 短期模擬")):
    text = doc(number).split(start, 1)[1].split(end, 1)[0]
    matches = list(re.finditer(r"^## ([①-⑧]) (\d+)/(\d+)", text, re.M))
    check(len(matches) == 8, f"Legacy main coverage: {s}")
    for index, match in enumerate(matches):
        label, power, wisdom = match.groups()
        block = text[match.start():matches[index+1].start() if index+1 < len(matches) else len(text)]
        add_body(s, "①②③④⑤⑥⑦⑧".index(label)+1, label, power, wisdom, block, next(DOCS.glob(f"{number:02}-*.md")))
expected_ids = {f"M-{s['id']}-{stage:02}" for s in species for stage in range(1, 9)}
check(set(body_records) == expected_ids, "248 canonical main ID coverage mismatch")
check(len(vanilla) == 6, "Expected six explicitly ability-free cards")

# 31 is a migration mirror, never a second set of 16 cards.
migrated = list(re.finditer(r"^## (M-(?:beetle|stagbeetle)-\d{2})\n(.*?)(?=^## M-|\Z)", doc(31), re.M | re.S))
check(len(migrated) == 16, "31 migration coverage")
for m in migrated:
    line = re.search(r"^- 本文：(.+)$", m[2], re.M)
    value = line[1].strip("`*") if line else ""
    check(value == body_records[m[1]]["text"], f"31 body mirror mismatch: {m[1]}")
for n, key in ((2, "M-dog-02"), (3, "M-frog-03"), (4, "M-clownfish-04"),
               (6, "M-phoenix-05"), (7, "M-sakura-06"), (8, "M-plush-07")):
    line = re.search(rf"^{n}\. .+$", doc(8), re.M)
    quoted = re.search(r"`(.+)`", line[0]) if line else None
    check(bool(quoted) and quoted[1] == body_records[key]["text"], f"08 representative mirror: {key}")
duplicate_bodies = [ids for ids in ability_texts.values() if len(ids) > 1]
check(not duplicate_bodies, f"Identical ability bodies: {duplicate_bodies}")

# 72 is the canonical companion draft; 35 and 08 retain the six A/B mirrors.
companion_records = {}
companion_vanilla = []
companion_source = {s["id"]: (rarity, s) for rarity in ("normal", "rare")
                    for s in master["companions"][rarity]}
companion_text = doc(72)
companion_matches = list(re.finditer(r"^### C-([\w_]+) — ([^\n]+)\n(.*?)(?=^### |^## |\Z)", companion_text, re.M | re.S))
for match in companion_matches:
    source_id, name, block = match.groups()
    key = "C-" + source_id
    check(key not in companion_records, f"Duplicate companion body ID: {key}")
    check(source_id in companion_source, f"Unknown companion source ID: {key}")
    if source_id not in companion_source:
        continue
    rarity, definition = companion_source[source_id]
    check(name == definition["label"], f"Companion display name: {key}")
    check(f"`companions.{rarity} / id={source_id}`" in block, f"Companion source path: {key}")
    bodies = re.findall(r"^> (.+)$", block, re.M)
    check(len(bodies) == 1 and bool(bodies[0]), f"Expected one companion body: {key}")
    value = bodies[0] if bodies else ""
    if value == "能力なし。":
        companion_vanilla.append(key)
    companion_records[key] = {"id": key, "source_id": source_id, "name": name,
                              "type": "なかま", "normal_time": 0, "rarity": rarity,
                              "text": value, "path": str(next(DOCS.glob("72-*.md")).relative_to(ROOT))}
check(set(companion_records) == {"C-" + s for s in companion_source}, "26 companion body coverage mismatch")
check(companion_vanilla == ["C-box"], "Expected explicit companion vanilla: C-box")
companion_rows = [r for r in rows(companion_text) if r[0].startswith("C-")]
check(len(companion_rows) == len({r[0] for r in companion_rows}) == 26, "72 companion source table coverage")
for r in companion_rows:
    rec = companion_records.get(r[0], {})
    check(r[1] == rec.get("name") and r[2] == {"normal": "通常", "rare": "レア"}.get(rec.get("rarity")), f"72 companion table name/rarity: {r[0]}")
for key, short in (("otter", "カワウソ"), ("monkey", "サル"), ("owl", "ふくろう"),
                   ("hedgehog", "ハリネズミ"), ("snail", "カタツムリ"), ("tanuki", "たぬき")):
    role_block = re.search(rf"^### C-{key} — [^\n]+\n(.*?)(?=^### |^## |\Z)", doc(35), re.M | re.S)
    role_body = re.search(r"`([^`]+)`", role_block[1]) if role_block else None
    deck_line = re.search(rf"^- (?:\*\*)?{short}「[^\n]+", doc(8), re.M)
    deck_body = re.search(r"`([^`]+)`", deck_line[0]) if deck_line else None
    value = companion_records.get("C-" + key, {}).get("text")
    check(bool(role_body) and role_body[1] == value, f"35 companion mirror: C-{key}")
    check(bool(deck_body) and deck_body[1] == value, f"08 companion mirror: C-{key}")
combined_texts = collections.defaultdict(list, {k: list(v) for k, v in ability_texts.items()})
for rec in companion_records.values():
    if rec["text"] and rec["text"] != "能力なし。":
        combined_texts[rec["text"]].append(rec["id"])
combined_duplicates = [ids for ids in combined_texts.values() if len(ids) > 1]
check(not combined_duplicates, f"Identical main/companion ability bodies: {combined_duplicates}")

# 74 holds the partner bodies; 36 and 08 mirror the four existing A/B cards.
partner_records = {}
partner_vanilla = []
partner_source = {p["id"]: p for p in master["partners"]}
partner_text = doc(74)
for match in re.finditer(r"^### P-([\w_]+) — ([^\n]+)\n(.*?)(?=^### |^## |\Z)", partner_text, re.M | re.S):
    source_id, name, block = match.groups()
    key = "P-" + source_id
    check(key not in partner_records, f"Duplicate partner body ID: {key}")
    check(source_id in partner_source, f"Unknown partner source ID: {key}")
    if source_id not in partner_source:
        continue
    definition = partner_source[source_id]
    check(name == definition["label"], f"Partner display name: {key}")
    check(f"`partners / id={source_id}`" in block, f"Partner source path: {key}")
    check(f"firstRegion: `{definition['firstRegion']}`" in block, f"Partner source region: {key}")
    check(f"hook: {definition['hook']}。" in block, f"Partner source hook: {key}")
    bodies = re.findall(r"^> (.+)$", block, re.M)
    check(len(bodies) == 1 and bool(bodies[0]), f"Expected one partner body: {key}")
    value = bodies[0] if bodies else ""
    if value == "能力なし。":
        partner_vanilla.append(key)
    partner_records[key] = {"id": key, "source_id": source_id, "name": name,
                            "type": "こいびと", "normal_time": 0, "rarity": "normal",
                            "first_region": definition["firstRegion"], "text": value,
                            "path": str(next(DOCS.glob("74-*.md")).relative_to(ROOT))}
check(len(partner_records) == 18 and set(partner_records) == {"P-" + p for p in partner_source}, "18 partner body coverage mismatch")
check(not partner_vanilla, "74 partner draft expects 18 ability bodies")
check("全18体とも通常・各同名3枚" in doc(27), "27 explicit partner deck classification missing")
partner_rows = [r for r in rows(partner_text) if r[0].startswith("P-")]
check(len(partner_rows) == len({r[0] for r in partner_rows}) == 18, "74 partner source table coverage")
for r in partner_rows:
    rec = partner_records.get(r[0], {})
    check(r[1] == rec.get("name") and r[2] == rec.get("first_region") and r[3] == "通常", f"74 partner table name/region/rarity: {r[0]}")
for key in ("cat_ceo", "knitting_spider", "sea_mermaid", "snowman"):
    role_block = re.search(rf"^### P-{key} — [^\n]+\n(.*?)(?=^### |^## |\Z)", doc(36), re.M | re.S)
    role_body = re.search(r"`([^`]+)`", role_block[1]) if role_block else None
    name = partner_source[key]["label"]
    deck_line = re.search(rf"^- {re.escape(name)}[^\n]+", doc(8), re.M)
    deck_body = re.search(r"`([^`]+)`", deck_line[0]) if deck_line else None
    value = partner_records.get("P-" + key, {}).get("text")
    check(bool(role_body) and role_body[1] == value, f"36 partner mirror: P-{key}")
    check(bool(deck_body) and deck_body[1] == value, f"08 partner mirror: P-{key}")
all_character_texts = collections.defaultdict(list, {k: list(v) for k, v in combined_texts.items()})
for rec in partner_records.values():
    if rec["text"] and rec["text"] != "能力なし。":
        all_character_texts[rec["text"]].append(rec["id"])
all_character_duplicates = [ids for ids in all_character_texts.values() if len(ids) > 1]
check(not all_character_duplicates, f"Identical character ability bodies: {all_character_duplicates}")

item_audit = runpy.run_path(str(DOCS / "tools/check-item-source.py"))["audit"](include_catalog=True)
errors.extend(item_audit["errors"])
item_records = item_audit.pop("items_current_source")
all_texts = collections.defaultdict(list, {k: list(v) for k, v in all_character_texts.items()})
for rec in item_records:
    all_texts[rec["text"]].append(rec["id"])
all_draft_duplicates = [ids for ids in all_texts.values() if len(ids) > 1]
check(not all_draft_duplicates, f"Identical character/item ability bodies: {all_draft_duplicates}")

# Registered play batch: current-main source snapshot and canonical prose.
# The default run stays offline; --play-source-root additionally checks exported
# files against their pinned git blobs and executes only games.js constructors.
play_snapshot = json.loads((DOCS / "data/play-source-20260917.json").read_text())
pinned_games = play_snapshot["games"]
check(sorted(pinned_games, key=lambda g: g["id"]) == sorted(games, key=lambda g: g["id"]),
      "Pinned main play IDs/categories/source contexts differ from registered baseline")
play_records = []
play_batch_counts = []
for batch, draft_number in ((1, 79), (2, 81), (3, 83), (4, 85), (5, 87)):
    batch_start = len(play_records)
    for m in re.finditer(r"^### (G-[\w-]+) — ([^\n]+)\n(.*?)(?=^### |^## |\Z)", doc(draft_number), re.M | re.S):
        card_id, name, section = m.groups()
        body = re.findall(r"^> (.+)$", section, re.M)
        time = re.findall(r"^- 時：(\d+)$", section, re.M)
        method = re.findall(r"^- プレイ方法：(すぐつかう|しかける|みにつける)$", section, re.M)
        category = re.findall(r"^- source category：([\w]+)（(一般|地域|季節)）$", section, re.M)
        context = re.findall(r"^- source context：([\w]+)$", section, re.M)
        order = re.findall(r"^- 登録順：(\d+)$", section, re.M)
        check(len(body) == len(time) == len(method) == len(category) == len(order) == 1,
              f"Play body/metadata missing or ambiguous: {card_id}")
        if not (len(body) == len(time) == len(method) == len(category) == len(order) == 1):
            continue
        check("- 構築区分：通常（同名3枚）" in section, f"Play rarity missing: {card_id}")
        source_game = game_map.get(card_id[2:], {})
        check(category[0][0] == source_game.get("category"), f"Play category mismatch: {card_id}")
        check(category[0][1] == {"general": "一般", "region": "地域", "season": "季節"}.get(source_game.get("source")),
              f"Play source type mismatch: {card_id}")
        check(context == ([source_game["context"]] if "context" in source_game else []),
              f"Play source context mismatch: {card_id}")
        check(int(order[0]) == len(play_records) + 1, f"Play order mismatch: {card_id}")
        play_records.append({"id": card_id, "name": name, "time": int(time[0]),
                             "method": method[0], "rarity": "normal", "text": body[0],
                             "source": source_game.get("source"), "context": source_game.get("context"),
                             "source_file": str(next(DOCS.glob(f"{draft_number:02d}-*.md")).relative_to(ROOT))})
    batch_records = play_records[batch_start:]
    batch_ids = [r["id"] for r in batch_records]
    check(len(batch_ids) == len(set(batch_ids)) == 20, f"Expected 20 unique play bodies in batch {batch}")
    check(batch_ids == ["G-" + sid for sid in role_games[batch_start:batch_start + 20]] == play_snapshot[f"draft_batch_{batch}"],
          f"Play batch {batch} differs from canonical roles")
    expected_methods = {1: {"すぐつかう": 18, "しかける": 2}, 2: {"すぐつかう": 17, "しかける": 3}, 3: {"すぐつかう": 18, "しかける": 2}, 4: {"すぐつかう": 17, "しかける": 3}, 5: {"すぐつかう": 18, "しかける": 2}}
    # 95: bowling changes printed play time from 2 to 3; other batch-1 times stay fixed.
    expected_times = {1: {1: 7, 2: 12, 3: 1}, 2: {1: 11, 2: 8, 3: 1}, 3: {1: 9, 2: 10, 3: 1}, 4: {1: 12, 2: 7, 3: 1}, 5: {1: 12, 2: 8}}
    methods = dict(collections.Counter(r["method"] for r in batch_records))
    times = dict(collections.Counter(r["time"] for r in batch_records))
    check(methods == expected_methods[batch], f"Play method distribution batch {batch}")
    check(times == expected_times[batch], f"Play time distribution batch {batch}")
    case_ids = re.findall(r"^\| ([PX]\d{2}) \|", doc(draft_number + 1), re.M)
    check(len(case_ids) == len(set(case_ids)) == 40 and set(case_ids) ==
          {f"{p}{n:02d}" for p in ("P", "X") for n in range(1, 21)}, f"Play manual case IDs batch {batch}")
    play_batch_counts.append({"batch": batch, "bodies": len(batch_ids), "methods": methods,
                              "times": times, "manual_case_entries": len(case_ids)})
play_ids = [r["id"] for r in play_records]
check(len(play_ids) == len(set(play_ids)) == 100, "Expected 100 unique registered play bodies")
legacy_2048 = re.search(r"^- 2048 — 時1・\*\*すぐつかう\*\*: (.+)$", doc(8), re.M)
check(bool(legacy_2048), "Existing 2048 body missing")
existing_play = [r for r in play_records if r["id"] == "G-puzzle-2048"]
check(len(existing_play) == 1, "Existing 2048 must occur exactly once")
if legacy_2048 and len(existing_play) == 1:
    check(existing_play[0]["text"] == legacy_2048[1], "2048 body differs between 08 and 83")
    existing_play[0]["status"] = "legacy_body_linked_to_registered_source"
    existing_play[0]["canonical_body_file"] = "docs/card-game/08-test-deck-a-card-drafts.md"
new_play_records = [r for r in play_records if r["id"] != "G-puzzle-2048"]
check(len(play_records) == 100 and len(new_play_records) == 99, "Play coverage should be 99 new + 1 existing = 100/100")
check(set(play_ids) == {"G-" + g["id"] for g in pinned_games}, "Complete play coverage differs from registered 100")
check(dict(collections.Counter(r["source"] for r in play_records)) == {"general": 86, "region": 10, "season": 4},
      "Complete play source distribution differs from 86/10/4")
all_with_play = collections.defaultdict(list, {k: list(v) for k, v in all_texts.items()})
for r in play_records:
    all_with_play[r["text"]].append(r["id"])
play_duplicates = [ids for ids in all_with_play.values() if len(ids) > 1]
check(not play_duplicates, f"Identical character/item/play bodies: {play_duplicates}")
play_source_verified = False
if "--play-source-root" in sys.argv:
    source_dir = Path(sys.argv[sys.argv.index("--play-source-root") + 1]).resolve()
    for name, expected in play_snapshot["source_blobs"].items():
        raw = (source_dir / name).read_bytes()
        actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
        check(actual == expected, f"Play source blob differs: {name}")
    actual_games = json.loads(subprocess.check_output(["node", "-e", r"""
const fs=require('fs'),vm=require('vm'),c={};vm.createContext(c);
vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);
const g=c.installNaotocchiMinigames({SEASON:{SPRING:'spring',SUMMER:'summer',AUTUMN:'autumn',WINTER:'winter'}});
console.log(JSON.stringify([...g.MINIGAMES.map(x=>({id:x.id,category:g.minigameCategoryOf.get(x),source:'general'})),
...Object.entries(g.REGION_MINIGAMES).flatMap(([context,a])=>a.map(x=>({id:x.game.id,category:x.category,source:'region',context}))),
...Object.entries(g.SEASONAL_MINIGAMES).flatMap(([context,a])=>a.map(x=>({id:x.game.id,category:x.category,source:'season',context})))]));
""", str(source_dir / "games.js")], text=True))
    check(actual_games == pinned_games, "Actual pinned games catalog differs from snapshot")
    play_source_verified = actual_games == pinned_games and all(
        hashlib.sha1(b"blob " + str(len((source_dir / n).read_bytes())).encode() + b"\0" + (source_dir / n).read_bytes()).hexdigest() == h
        for n, h in play_snapshot["source_blobs"].items())
play_audit = {"main_commit": play_snapshot["main_commit"], "registered_games": len(pinned_games),
              "new_body_entries": len(new_play_records), "existing_linked_bodies": int(bool(legacy_2048)),
              "total_body_entries": len(play_records), "unexpanded_entries": 100 - len(play_records),
              "body_source_counts": dict(collections.Counter(r["source"] for r in play_records)),
              "method_counts_new": dict(collections.Counter(r["method"] for r in new_play_records)),
              "time_counts_new": dict(collections.Counter(r["time"] for r in new_play_records)),
              "max_new_body_length": max((len(r["text"]) for r in new_play_records), default=0),
              "batches": play_batch_counts,
              "manual_case_entries": sum(b["manual_case_entries"] for b in play_batch_counts), "identical_body_groups": play_duplicates,
              "actual_source_verified": play_source_verified}


# Places keep the existing single world slot; runtime source groups are not rarity.
world_snapshot = json.loads((DOCS / "data/world-source-20260917.json").read_text())
world_sources = [{**master["regions"]["home"], "source": "home"}] + [
    {**r, "source": group} for group in ("normal", "special") for r in master["regions"][group]]
check(world_snapshot["regions"] == world_sources, "Pinned region sources differ from registered baseline")
world_followup = world_snapshot.get("followup_main_check")
if world_followup:
    check(world_followup["compare_base"] == world_snapshot["main_commit"] and
          world_followup["verified_source_blobs"] == world_snapshot["source_blobs"] and
          not set(world_followup["changed_paths"]) & set(world_snapshot["source_blobs"]),
          "World follow-up main evidence differs from pinned source")
world_source_map = {"W-" + r["id"]: r for r in world_sources}
world_records = {}
for m in re.finditer(r"^### (W-[\w-]+) — ([^\n]+)\n(.*?)(?=^### |^## |\Z)", doc(89), re.M | re.S):
    card_id, name, section = m.groups()
    body = re.findall(r"^> (.+)$", section, re.M)
    time = re.findall(r"^- 時：(\d+)$", section, re.M)
    group = re.findall(r"^- source group：(home|normal|special)$", section, re.M)
    check(len(body) == len(time) == len(group) == 1, f"World body/metadata missing: {card_id}")
    if not (len(body) == len(time) == len(group) == 1):
        continue
    check(card_id not in world_records, f"World ID repeated: {card_id}")
    definition = world_source_map.get(card_id, {})
    check(name == definition.get("label") and group[0] == definition.get("source"), f"World name/group: {card_id}")
    check("- 構築区分：通常（同名3枚）" in section, f"World rarity missing: {card_id}")
    expected_time = 3 if card_id in ("W-star_stop", "W-memory_lake") else 2
    check(int(time[0]) == expected_time, f"World time: {card_id}")
    check(body[0] != "能力なし。", f"World draft expects ability: {card_id}")
    world_records[card_id] = {"id": card_id, "name": name, "type": "セカイ", "time": int(time[0]),
                              "source_group": group[0], "rarity": "normal", "text": body[0],
                              "path": str(next(DOCS.glob("89-*.md")).relative_to(ROOT))}
check(len(world_records) == 13 and set(world_records) == set(world_source_map), "13 world body coverage mismatch")
for sid in ("city", "forest", "deepsea", "memory_lake"):
    rec = world_records.get("W-" + sid, {})
    role = re.search(rf"^### W-{sid} — [^\n]+\n(.*?)(?=^### |^## |\Z)", doc(40), re.M | re.S)
    role_body = re.search(r"本文: `([^`]+)`", role[1]) if role else None
    deck = re.search(rf"^- {re.escape(rec.get('name', ''))} — 時(\d+)[^\n]+", doc(8), re.M)
    deck_body = re.search(r"`([^`]+)`", deck[0]) if deck else None
    check(bool(role_body) and role_body[1] == rec.get("text"), f"40 world mirror: {sid}")
    check(bool(deck_body) and deck_body[1] == rec.get("text") and int(deck[1]) == rec.get("time"), f"08 world mirror: {sid}")
city_section = re.search(r"^### W-city — [^\n]+\n(.*?)(?=^### |^## |\Z)", doc(67), re.M | re.S)
city_body = re.search(r"^> (.+)$", city_section[1], re.M) if city_section else None
check(bool(city_body) and city_body[1] == world_records.get("W-city", {}).get("text"), "67 city exact body changed")
check("セカイ13は全て通常・各同名3枚" in doc(27), "27 explicit world deck classification missing")
world_cases = re.findall(r"^\| ([PX]\d{2}) \|", doc(90), re.M)
check(len(world_cases) == len(set(world_cases)) == 40 and set(world_cases) ==
      {f"P{n:02d}" for n in range(1, 14)} | {f"X{n:02d}" for n in range(1, 28)}, "90 world manual case IDs")
all_with_world = collections.defaultdict(list, {k: list(v) for k, v in all_with_play.items()})
for rec in world_records.values():
    all_with_world[rec["text"]].append(rec["id"])
world_duplicates = [ids for ids in all_with_world.values() if len(ids) > 1]
check(not world_duplicates, f"Identical character/item/play/world bodies: {world_duplicates}")
world_source_verified = False
if "--world-source-root" in sys.argv:
    source_dir = Path(sys.argv[sys.argv.index("--world-source-root") + 1]).resolve()
    hashes_match = True
    for name, expected in world_snapshot["source_blobs"].items():
        raw = (source_dir / name).read_bytes()
        actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
        check(actual == expected, f"World source blob differs: {name}")
        hashes_match = hashes_match and actual == expected
    actual_regions = json.loads(subprocess.check_output(["node", "-e", r"""
const fs=require('fs'),vm=require('vm'),c={window:{}};vm.createContext(c);
vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);
const r=c.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1.regions;
console.log(JSON.stringify([{...r.home,source:'home'},...['normal','special'].flatMap(k=>r[k].map(x=>({...x,source:k})))]));
""", str(source_dir / "character-world-master.v1.js")], text=True))
    check(actual_regions == world_snapshot["regions"], "Actual pinned region definitions differ from snapshot")
    world_source_verified = hashes_match and actual_regions == world_snapshot["regions"]
world_audit = {"main_commit": world_snapshot["main_commit"], "body_entries": len(world_records),
               "latest_main_checked": world_followup["main_commit"] if world_followup else world_snapshot["main_commit"],
               "rarity_counts": dict(collections.Counter(r["rarity"] for r in world_records.values())),
               "source_group_counts": dict(collections.Counter(r["source_group"] for r in world_records.values())),
               "time_counts": dict(collections.Counter(r["time"] for r in world_records.values())),
               "manual_case_entries": len(world_cases), "max_body_length": max((len(r["text"]) for r in world_records.values()), default=0),
               "identical_body_groups": world_duplicates, "actual_source_verified": world_source_verified}


# Events: CARD bodies and HOLD source families remain separate populations.
event_snapshot = json.loads((DOCS / "data/event-source-20260917.json").read_text())
event_expected = {r[0]: r[1] for r in event_rows}
event_pinned = {r["id"]: r for r in event_snapshot["events"]}
check(len(event_snapshot["events"]) == 34 and
      {k: v["status"] for k, v in event_pinned.items()} == event_expected, "Event source population/status")
event_names = dict(re.findall(r"^### (E-[\w-]+) — ([^\n]+)$", doc(38), re.M))
event_records = {}
for m in re.finditer(r"^### (E-[\w-]+) — ([^\n]+)\n(.*?)(?=^### |^## |\Z)", doc(91), re.M | re.S):
    card_id, name, section = m.groups()
    body = re.findall(r"^> (.+)$", section, re.M)
    times = re.findall(r"^- 時：(\d+)$", section, re.M)
    check(len(body) == len(times) == 1, f"Event body/metadata missing: {card_id}")
    if len(body) != 1 or len(times) != 1:
        continue
    check(card_id not in event_records, f"Event duplicate ID: {card_id}")
    check(event_expected.get(card_id) == "CARD" and name == event_names.get(card_id) == event_pinned.get(card_id, {}).get("name"), f"Event name/status: {card_id}")
    check(all(x in section for x in ("- 状態：CARD", "- 使用方法：すぐつかう", "- 構築区分：通常（同名3枚）")), f"Event classification: {card_id}")
    check(f'- source：{event_pinned.get(card_id, {}).get("anchor")}' in section, f"Event source anchor: {card_id}")
    check(1 <= int(times[0]) <= 3, f"Event time outside draft range: {card_id}")
    event_records[card_id] = {"id": card_id, "name": name, "type": "できごと", "time": int(times[0]),
                              "method": "すぐつかう", "rarity": "normal", "text": body[0],
                              "path": str(next(DOCS.glob("91-*.md")).relative_to(ROOT))}
check(set(event_records) == {k for k, v in event_expected.items() if v == "CARD"}, "21 event body coverage")
event_hold_ids = re.findall(r"^\| (E-[\w-]+) \|", doc(91), re.M)
check(len(event_hold_ids) == len(set(event_hold_ids)) == 13 and set(event_hold_ids) ==
      {k for k, v in event_expected.items() if v == "HOLD"}, "13 event HOLD coverage")
for short, time in {"big-illness": 3, "fateful-transform": 2, "new-encounter": 1,
                    "misunderstanding": 2, "sudden-trip": 2, "final-time": 2}.items():
    cid = "E-" + short
    rec = event_records.get(cid, {})
    check(rec.get("time") == time, f"Legacy event time: {cid}")
    role = re.search(rf"^### {cid} — [^\n]+\n(.*?)(?=^### |^## |\Z)", doc(38), re.M | re.S)
    rb = re.search(r"91本文: `([^`]+)`", role[1]) if role else None
    deck = re.search(rf"^- {re.escape(rec.get('name', ''))} — 時(\d+)[^\n]+", doc(8), re.M)
    db = re.search(r"`([^`]+)`", deck[0]) if deck else None
    check(bool(rb) and rb[1] == rec.get("text"), f"38 event mirror: {cid}")
    check(bool(db) and db[1] == rec.get("text") and int(deck[1]) == time, f"08 event mirror: {cid}")
check("できごとCARD21は全て通常・各同名3枚" in doc(27), "27 event classification missing")
event_cases = re.findall(r"^\| ([PX]\d{2}) \|", doc(92), re.M)
check(len(event_cases) == len(set(event_cases)) == 40 and set(event_cases) ==
      {f"P{n:02d}" for n in range(1, 22)} | {f"X{n:02d}" for n in range(1, 20)}, "92 event manual case IDs")
all_with_event = collections.defaultdict(list, {k: list(v) for k, v in all_with_world.items()})
for rec in event_records.values():
    all_with_event[rec["text"]].append(rec["id"])
event_duplicates = [ids for ids in all_with_event.values() if len(ids) > 1]
check(not event_duplicates, f"Identical character/item/play/world/event bodies: {event_duplicates}")
event_source_verified = False
if "--event-source-root" in sys.argv:
    source_dir = Path(sys.argv[sys.argv.index("--event-source-root") + 1]).resolve()
    hashes_match = True
    for name, expected in event_snapshot["source_blobs"].items():
        raw = (source_dir / name).read_bytes()
        actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
        check(actual == expected, f"Event source blob differs: {name}")
        hashes_match = hashes_match and actual == expected
    runtime = (source_dir / "script.js").read_text()
    source_text = runtime + (source_dir / "character-world-master.v1.js").read_text()
    for rec in event_pinned.values():
        # author is a nested master path, other anchors are literal source tokens.
        anchors = rec["anchor"].split(" / ")
        for anchor in anchors:
            token = "author:" if anchor == "playerSpecies.author" else anchor
            check(token in source_text, f"Current event anchor missing: {rec['id']} / {anchor}")
    legend_part = runtime.split("const LEGEND_ENCOUNTERS = [", 1)[1].split("\n  ];", 1)[0]
    actual_legend_ids = re.findall(r"id: '([^']+)'", legend_part)
    check(actual_legend_ids == event_snapshot["legend_ids"], "Event legend ID snapshot")
    midlife_part = runtime.split("const MIDLIFE_EVENTS = [", 1)[1].split("\n  ];", 1)[0]
    check([int(x) for x in re.findall(r"age: (\d+)", midlife_part)] == event_snapshot["midlife_ages"], "Event midlife age snapshot")
    retired = event_snapshot["retired_anchors"]["E-special-trip-memory"]
    check(retired["old"] not in runtime and all(x in runtime for x in retired["current"]) and
          "const travelMemory = null;" in runtime, "Event retired travel reward evidence")
    movie_keys = json.loads(subprocess.check_output(["node", "-e",
        "console.log(JSON.stringify(Object.keys(require(process.argv[1]).legends)))",
        str(source_dir / "movie-dialogue.js")], text=True))
    check(movie_keys == event_snapshot["legend_ids"], "Event actual movie legend IDs")
    event_source_verified = hashes_match
event_audit = {"main_commit": event_snapshot["main_commit"], "body_entries": len(event_records),
               "hold_entries": len(event_hold_ids), "unexpanded_CARD_entries": 21-len(event_records),
               "time_counts": dict(collections.Counter(r["time"] for r in event_records.values())),
               "manual_case_entries": len(event_cases), "identical_body_groups": event_duplicates,
               "actual_source_verified": event_source_verified}

current_catalog_groups = {
    "main": list(body_records.values()), "companion": list(companion_records.values()),
    "partner": list(partner_records.values()), "world": list(world_records.values()),
    "play": play_records, "current_item": item_records, "event": list(event_records.values())}
current_counts = {k: len(v) for k, v in current_catalog_groups.items()}
check(current_counts == {"main": 248, "companion": 26, "partner": 18, "world": 13,
                         "play": 100, "current_item": 26, "event": 21}, "93 current catalog scope")
current_vanilla = sum(r["text"] == "能力なし。" for group in current_catalog_groups.values() for r in group)
check(sum(current_counts.values()) == 452 and current_vanilla == 7, "93 catalog total/vanilla")

# 96 keeps the catalog fixed and revises only four existing defensive/recovery
# bodies so that their timing or destination matches an actual current card.
revision_96_expected = {
    "M-penguin-07": "1ターンに1回。自分がセカイを変更した時、自分になかまがある場合、発動できる。自分のなかま1枚を選ぶ。次の自分のターン開始時まで、そのなかまが相手の効果で盤面を離れる場合、1回だけ盤面を離れない。",
    "M-dandelion-04": "1ラウンドに1回。自分のセカイが相手の効果で手札または捨て札に移るなら、手札のセカイ1枚を公開して捨て札に置くことで、その移動を防いでもよい。",
    "P-snowman": "このカードが相手の効果でこいびと枠から手札または捨て札に移動し、このカードとの交際または結婚が終了した時、自分のメインがたまごでない場合、その移動先で発動できる。山札上2枚を見て、その中から1枚を手札に加え、残りを山札の一番下に置く。",
    "G-p3-drive": "自分のメイン1枚を対象として発動できる。このターン、そのメインが相手の効果で捨て札に置かれるなら、1回だけ、代わりに場に残す。このターン、自分が次に手札からセカイを通常の方法で変更するための時を1少なくする。",
}
revision_96_catalog = {r["id"]: r for group in current_catalog_groups.values() for r in group}
for card_id, expected_text in revision_96_expected.items():
    check(revision_96_catalog.get(card_id, {}).get("text") == expected_text,
          f"96 removal/defense revision mismatch: {card_id}")
revision_96_doc = DOCS / "96-removal-defense-deadline-revisions.md"
revision_96_data_path = DOCS / "data/removal-defense-deadline-revisions-20260917.json"
check(revision_96_doc.exists(), "96 revision document missing")
check(revision_96_data_path.exists(), "96 revision evidence missing")
if revision_96_data_path.exists():
    revision_96_data = json.loads(revision_96_data_path.read_text())
    revision_96_changed = {r["id"]: r for r in revision_96_data.get("changed_cards", [])}
    check(set(revision_96_changed) == set(revision_96_expected), "96 changed card IDs")
    for card_id, expected_text in revision_96_expected.items():
        check(revision_96_changed.get(card_id, {}).get("after") == expected_text,
              f"96 evidence after text: {card_id}")
    revision_96_cases = revision_96_data.get("manual_cases", [])
    check(len(revision_96_cases) == len({r.get("id") for r in revision_96_cases}) == 28,
          "96 manual case count/IDs")
    revision_96_sorted = normalize_provisional_terminology(
        sorted(revision_96_catalog.values(), key=lambda r: r["id"])
    )
    revision_96_catalog_hash = hashlib.sha256(json.dumps(
        revision_96_sorted, ensure_ascii=False, sort_keys=True,
        separators=(",", ":")).encode()).hexdigest()
    check(revision_96_data.get("validation", {}).get("catalog_records_sha256") == revision_96_catalog_hash,
          "96 current catalog hash")

# 97 freezes a reproducible cross-type surface classification before any
# balance-driven text revision.  The counts are lexical signals, not activation
# rates or simulated game results.
audit_97_doc = DOCS / "97-role-density-and-efficiency-audit.md"
audit_97_data_path = DOCS / "data/role-density-efficiency-audit-20260917.json"
check(audit_97_doc.exists(), "97 role/density audit document missing")
check(audit_97_data_path.exists(), "97 role/density audit evidence missing")
if audit_97_data_path.exists():
    audit_97_data = json.loads(audit_97_data_path.read_text())
    check(audit_97_data.get("scope", {}).get("current_catalog") == 452,
          "97 current catalog scope")
    check(audit_97_data.get("scope", {}).get("changed_card_ids") == [],
          "97 must not change card text")
    audit_97_patterns = {
        "deck_reference": r"山札",
        "top_look_or_reveal": r"山札(?:の)?(?:一番)?上(?:から)?[0-9一二三四五六七八九十]*枚?(?:を)?(?:見|公開)|山札上[0-9一二三四五六七八九十]*枚(?:を)?(?:見|公開)",
        "deck_bottom_move": r"山札(?:の)?一番下|山札下",
        "direct_draw": r"[0-9一二三四五六七八九十]+枚引",
        "selective_hand_add": r"手札に加え",
        "discard_to_hand": r"捨て札[^。]{0,120}手札に戻",
        "growth_gain": r"そだち\+[0-9]+",
        "time_discount": r"時を[0-9]+少なく",
        "next_own_start": r"次の自分(?:の)?ターン開始時|次の自分ターン開始時",
        "next_own_end": r"次の自分(?:の)?ターン終了時|次の自分ターン終了時",
        "turn_end_timing": r"(?:自分|相手|この)の?ターン終了時|勝負の終了時",
        "next_event_reservation": r"次に",
        "once_per_turn": r"1ターンに1回",
        "once_per_round": r"1ラウンドに1回",
        "name_wide_limit": r"この名前.*1ターンに1回|同名カードは1ターンに1回|この名前のカードは1ターンに1回",
    }
    audit_97_groups = {
        "main": current_catalog_groups["main"],
        "companion": current_catalog_groups["companion"],
        "partner": current_catalog_groups["partner"],
        "world": current_catalog_groups["world"],
        "play": current_catalog_groups["play"],
        "item": current_catalog_groups["current_item"],
        "event": current_catalog_groups["event"],
    }
    for tag, pattern in audit_97_patterns.items():
        actual_by_type = {
            group: sum(bool(re.search(pattern, row.get("text", ""))) for row in rows)
            for group, rows in audit_97_groups.items()
        }
        evidence_tag = audit_97_data.get("surface_tags", {}).get(tag, {})
        check(evidence_tag.get("by_type") == actual_by_type,
              f"97 surface tag by-type counts: {tag}")
        check(evidence_tag.get("total") == sum(actual_by_type.values()),
              f"97 surface tag total: {tag}")
    audit_97_cases = audit_97_data.get("manual_cases", [])
    check(len(audit_97_cases) == len({row.get("id") for row in audit_97_cases}) == 32,
          "97 manual case count/IDs")
    check(audit_97_data.get("validation", {}).get("catalog_records_sha256") == revision_96_catalog_hash,
          "97 current catalog hash")

# 98 separates pool-registration layers from proxy inclusion and freezes the
# first replayable match-record contract.  The fixture is intentionally not a
# played game, but it must already contain two legal 40-card ordered decks.
proxy_98_doc = DOCS / "98-proxy-pool-layers-and-replay-schema.md"
proxy_98_pool_path = DOCS / "data/proxy-pool-layers-20260917.json"
proxy_98_schema_path = DOCS / "data/proxy-match-record.schema.json"
proxy_98_example_path = DOCS / "data/proxy-match-record-example-20260917.json"
check(proxy_98_doc.exists(), "98 proxy preparation document missing")
check(proxy_98_pool_path.exists(), "98 proxy pool layers missing")
check(proxy_98_schema_path.exists(), "98 proxy match schema missing")
check(proxy_98_example_path.exists(), "98 proxy match example missing")
if all(path.exists() for path in
       (proxy_98_pool_path, proxy_98_schema_path, proxy_98_example_path)):
    proxy_98_pool = json.loads(proxy_98_pool_path.read_text())
    proxy_98_schema = json.loads(proxy_98_schema_path.read_text())
    proxy_98_example = json.loads(proxy_98_example_path.read_text())
    proxy_98_layers = proxy_98_pool.get("layers", {})
    check(len(proxy_98_layers.get("current_registered", [])) == 14,
          "98 current registered item count")
    check(len(proxy_98_layers.get("current_unregistered_source", [])) == 12,
          "98 current unregistered item count")
    check(len(proxy_98_layers.get("retired_legacy_test", [])) == 3,
          "98 retired item legacy count")
    check(len(proxy_98_layers.get("retired_archive", [])) == 20,
          "98 retired item archive count")
    check(len(proxy_98_layers.get("hold", [])) == 14,
          "98 HOLD count")
    check(len(proxy_98_layers.get("play_legacy", [])) == 4,
          "98 play legacy count")
    proxy_98_current_items = {
        row["id"] for row in proxy_98_layers.get("current_registered", [])
    } | {
        row["id"] for row in proxy_98_layers.get("current_unregistered_source", [])
    }
    check(proxy_98_current_items == {row["id"] for row in current_catalog_groups["current_item"]},
          "98 current item layer IDs")
    proxy_98_old_items = {
        row["id"] for row in proxy_98_layers.get("retired_legacy_test", [])
    } | {
        row["id"] for row in proxy_98_layers.get("retired_archive", [])
    } | {
        row["id"] for row in proxy_98_layers.get("hold", []) if row["id"].startswith("I-")
    }
    check(len(proxy_98_old_items) == 24 and not (proxy_98_current_items & proxy_98_old_items),
          "98 old/current item separation")
    check(proxy_98_schema.get("$id") == "https://naotocchi.example/schema/card-game/proxy-match-record.v1.json",
          "98 proxy schema ID")
    check(proxy_98_example.get("schema_version") == "naotocchi.card_game.proxy_match_record.v1",
          "98 proxy example schema version")
    check(proxy_98_example.get("design", {}).get("rules_commit") ==
          "3d16b894938cb4edabef7ecf9c676c462391251a",
          "98 proxy rules commit")
    check(proxy_98_example.get("design", {}).get("rules_tree") ==
          "a9188c92b8ce4f19f53804c7861212ec3b536255",
          "98 proxy rules tree")
    proxy_98_players = proxy_98_example.get("input", {}).get("players", [])
    check(len(proxy_98_players) == 2 and {row.get("player_id") for row in proxy_98_players} == {"A", "B"},
          "98 proxy two players")
    proxy_98_type_ids = {
        group: {row["id"] for row in rows}
        for group, rows in audit_97_groups.items()
    }
    proxy_98_all_ids = set().union(*proxy_98_type_ids.values())
    proxy_98_card_copy_ids = []
    proxy_98_initial_instance_ids = []
    for player in proxy_98_players:
        deck = player.get("deck_order_top_to_bottom", [])
        hand = player.get("initial_hand", [])
        check(len(deck) == 40, f"98 proxy deck count: {player.get('player_id')}")
        check(hand == [row.get("initial_instance_id") for row in deck[:5]],
              f"98 proxy initial hand follows deck order: {player.get('player_id')}")
        check(all(row.get("card_id") in proxy_98_all_ids for row in deck),
              f"98 proxy deck card IDs: {player.get('player_id')}")
        deck_types = {
            group for group, ids in proxy_98_type_ids.items()
            if any(row.get("card_id") in ids for row in deck)
        }
        check(deck_types == set(proxy_98_type_ids),
              f"98 proxy deck seven types: {player.get('player_id')}")
        proxy_98_card_copy_ids.extend(row.get("card_copy_id") for row in deck)
        proxy_98_initial_instance_ids.extend(row.get("initial_instance_id") for row in deck)
    check(len(proxy_98_card_copy_ids) == len(set(proxy_98_card_copy_ids)) == 80,
          "100 proxy global card-copy IDs")
    check(len(proxy_98_initial_instance_ids) ==
          len(set(proxy_98_initial_instance_ids)) == 80,
          "100 proxy global initial-instance IDs")
    check(all(instance_id == f"{card_copy_id}#1"
              for card_copy_id, instance_id in
              zip(proxy_98_card_copy_ids, proxy_98_initial_instance_ids)),
          "100 proxy initial instance generation")
    check(proxy_98_example.get("record", {}).get("status") == "fixture" and
          proxy_98_example.get("record", {}).get("events") == [],
          "98 proxy example remains unplayed fixture")

# 99 adds a standard-library validator for replay identity/reference checks.
# Do not execute its unit test here: the test deliberately loads this catalog,
# which would recurse.  Syntax, public entry points and test inventory are
# checked here; the unit test remains a separate command.
proxy_99_doc = DOCS / "99-proxy-record-validator.md"
proxy_99_tool = DOCS / "tools/proxy_record_validator.py"
proxy_99_test = DOCS / "tools/test_proxy_record_validator.py"
check(proxy_99_doc.exists(), "99 proxy validator document missing")
check(proxy_99_tool.exists(), "99 proxy validator tool missing")
check(proxy_99_test.exists(), "99 proxy validator tests missing")
if proxy_99_tool.exists() and proxy_99_test.exists():
    proxy_99_tool_source = proxy_99_tool.read_text()
    proxy_99_test_source = proxy_99_test.read_text()
    proxy_99_tool_tree = ast.parse(proxy_99_tool_source)
    proxy_99_test_tree = ast.parse(proxy_99_test_source)
    proxy_99_functions = {
        node.name for node in proxy_99_tool_tree.body if isinstance(node, ast.FunctionDef)
    }
    check({"canonical_sha256", "load_current_catalog", "validate_record", "main"} <=
          proxy_99_functions, "99 proxy validator public functions")
    proxy_99_test_count = sum(
        node.name.startswith("test_")
        for node in ast.walk(proxy_99_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_99_test_count == 12, "100 proxy validator test count")
    check("領域移動後に場へ戻ったカード" in proxy_99_doc.read_text() and
          "再登場を含むcompleted記録にはまだ使用しない" in proxy_99_doc.read_text(),
          "99 new-instance limitation is explicit")

# 100 separates the stable physical card-copy ID from the current game-object
# instance ID, and records same-copy re-entry as an explicit generation step.
proxy_100_doc = DOCS / "100-card-copy-and-instance-identity.md"
check(proxy_100_doc.exists(), "100 card-copy/instance document missing")
if proxy_100_doc.exists() and proxy_98_schema_path.exists():
    proxy_100_doc_text = proxy_100_doc.read_text()
    proxy_100_defs = proxy_98_schema.get("$defs", {})
    check(proxy_100_defs.get("cardCopyId", {}).get("pattern") ==
          "^[AB]-[0-9]{3}$", "100 card-copy ID schema")
    check(proxy_100_defs.get("instanceId", {}).get("pattern") ==
          "^[AB]-[0-9]{3}#[1-9][0-9]*$", "100 instance ID schema")
    check(proxy_100_defs.get("instanceTransition", {}).get("properties", {})
          .get("reason", {}).get("const") == "zone_change",
          "100 instance transition schema")
    check("予約は旧個体IDから新個体IDへ移し替えない" in proxy_100_doc_text and
          "カード効果の適法性を判定する対戦エンジンではない" in proxy_100_doc_text,
          "100 reservation and validator boundaries")

# 101 materializes the six P97 priority clusters as three deterministic
# unplayed profiles each.  These are inputs, never completed match results.
proxy_101_doc = DOCS / "101-priority-proxy-fixture-suite.md"
proxy_101_manifest_path = DOCS / "data/proxy-fixture-plan-101-20260917.json"
proxy_101_output = DOCS / "data/proxy-fixtures-101"
proxy_101_tool = DOCS / "tools/proxy_fixture_builder.py"
proxy_101_test = DOCS / "tools/test_proxy_fixture_builder.py"
for path, label in (
    (proxy_101_doc, "101 proxy fixture document"),
    (proxy_101_manifest_path, "101 proxy fixture manifest"),
    (proxy_101_output, "101 proxy fixture output"),
    (proxy_101_tool, "101 proxy fixture builder"),
    (proxy_101_test, "101 proxy fixture tests"),
):
    check(path.exists(), f"{label} missing")
if all(path.exists() for path in (
        proxy_101_doc, proxy_101_manifest_path, proxy_101_output,
        proxy_101_tool, proxy_101_test)):
    proxy_101_manifest = json.loads(proxy_101_manifest_path.read_text())
    proxy_101_clusters = proxy_101_manifest.get("clusters", [])
    check([row.get("id") for row in proxy_101_clusters] ==
          [f"P97-{index:02d}" for index in range(1, 7)],
          "101 priority cluster IDs")
    check(all([variant.get("profile") for variant in row.get("variants", [])] ==
              ["single", "same-name-two", "board-combination"]
              for row in proxy_101_clusters),
          "101 three profiles per priority cluster")
    proxy_101_expected = {
        f"fixture-101-{cluster['id'].lower()}-{variant['profile']}": variant
        for cluster in proxy_101_clusters
        for variant in cluster.get("variants", [])
    }
    proxy_101_paths = sorted(proxy_101_output.glob("*.json"))
    proxy_101_fixtures = [json.loads(path.read_text()) for path in proxy_101_paths]
    check(len(proxy_101_fixtures) == len(proxy_101_expected) == 18,
          "101 generated fixture count")
    check({row.get("match_id") for row in proxy_101_fixtures} ==
          set(proxy_101_expected), "101 generated fixture IDs")
    proxy_101_unregistered = {
        row["id"] for row in proxy_98_layers.get("current_unregistered_source", [])
    }
    proxy_101_excluded = {
        row["id"]
        for key in ("retired_legacy_test", "retired_archive", "hold")
        for row in proxy_98_layers.get(key, [])
    }
    proxy_101_tagged = []
    for fixture in proxy_101_fixtures:
        match_id = fixture.get("match_id")
        players = fixture.get("input", {}).get("players", [])
        player_a = next((row for row in players if row.get("player_id") == "A"), {})
        deck_a = player_a.get("deck_order_top_to_bottom", [])
        focus = proxy_101_expected.get(match_id, {}).get("focus_sequence", [])
        check([row.get("card_id") for row in deck_a[:len(focus)]] == focus,
              f"101 focus sequence: {match_id}")
        check(len(players) == 2 and all(len(row.get("deck_order_top_to_bottom", [])) == 40
                                        for row in players),
              f"101 two complete decks: {match_id}")
        fixture_card_ids = {
            card.get("card_id") for player in players
            for card in player.get("deck_order_top_to_bottom", [])
        }
        check(fixture_card_ids <= proxy_98_all_ids,
              f"101 current catalog IDs: {match_id}")
        check(not (fixture_card_ids & proxy_101_excluded),
              f"101 excluded pool IDs: {match_id}")
        has_unregistered = bool(fixture_card_ids & proxy_101_unregistered)
        is_tagged = "unregistered-item-separate-stratum" in fixture.get(
            "test_plan", {}).get("strata", [])
        check(has_unregistered == is_tagged,
              f"101 unregistered stratum: {match_id}")
        if is_tagged:
            proxy_101_tagged.append(match_id)
        check(fixture.get("record", {}).get("status") == "fixture" and
              fixture.get("record", {}).get("events") == [] and
              fixture.get("record", {}).get("result", {}).get("winner") is None,
              f"101 fixture remains unplayed: {match_id}")
    check(proxy_101_tagged == ["fixture-101-p97-04-board-combination"],
          "101 only egg fixture uses unregistered stratum")
    proxy_101_tool_tree = ast.parse(proxy_101_tool.read_text())
    proxy_101_test_tree = ast.parse(proxy_101_test.read_text())
    proxy_101_functions = {
        node.name for node in proxy_101_tool_tree.body if isinstance(node, ast.FunctionDef)
    }
    check({"build_fixture_suite", "validate_fixture_suite",
           "build_single_seat_mirrors", "validate_seat_mirror_suite",
           "validate_materialized_suite", "write_fixture_suite", "main"} <=
          proxy_101_functions, "101 fixture builder public functions")
    proxy_101_test_count = sum(
        node.name.startswith("test_")
        for node in ast.walk(proxy_101_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_101_test_count == 12, "101/102 fixture builder test count")
    check("すべて未実施fixture" in proxy_101_doc.read_text() and
          "対戦結果・発動率・強度には数えない" in proxy_101_doc.read_text(),
          "101 unplayed-result boundary")

# 102 mirrors only the seats of the six 101 single fixtures.  Player identity,
# complete deck order, hands and all copy/instance IDs must remain unchanged.
proxy_102_doc = DOCS / "102-single-seat-mirror-fixtures.md"
proxy_102_manifest_path = DOCS / "data/proxy-seat-mirror-plan-102-20260917.json"
proxy_102_output = DOCS / "data/proxy-fixtures-102"
for path, label in (
    (proxy_102_doc, "102 seat mirror document"),
    (proxy_102_manifest_path, "102 seat mirror manifest"),
    (proxy_102_output, "102 seat mirror output"),
):
    check(path.exists(), f"{label} missing")
if all(path.exists() for path in (
        proxy_102_doc, proxy_102_manifest_path, proxy_102_output)):
    proxy_102_manifest = json.loads(proxy_102_manifest_path.read_text())
    proxy_102_pairs = proxy_102_manifest.get("pairs", [])
    check(len(proxy_102_pairs) == 6, "102 mirror pair count")
    proxy_102_expected = {
        pair.get("mirror_match_id"): pair.get("source_match_id")
        for pair in proxy_102_pairs
    }
    proxy_102_paths = sorted(proxy_102_output.glob("*.json"))
    proxy_102_mirrors = [json.loads(path.read_text()) for path in proxy_102_paths]
    check(len(proxy_102_mirrors) == len(proxy_102_expected) == 6,
          "102 generated mirror count")
    check({row.get("match_id") for row in proxy_102_mirrors} ==
          set(proxy_102_expected), "102 generated mirror IDs")
    proxy_101_by_id = {row.get("match_id"): row for row in proxy_101_fixtures}
    for mirror in proxy_102_mirrors:
        match_id = mirror.get("match_id")
        source = proxy_101_by_id.get(proxy_102_expected.get(match_id), {})
        mirror_players = {
            row.get("player_id"): row
            for row in mirror.get("input", {}).get("players", [])
        }
        source_players = {
            row.get("player_id"): row
            for row in source.get("input", {}).get("players", [])
        }
        check(all(mirror_players.get(player_id, {}).get("deck_order_top_to_bottom") ==
                  source_players.get(player_id, {}).get("deck_order_top_to_bottom")
                  for player_id in ("A", "B")),
              f"102 unchanged A/B deck order: {match_id}")
        check(all(mirror_players.get(player_id, {}).get("initial_hand") ==
                  source_players.get(player_id, {}).get("initial_hand")
                  for player_id in ("A", "B")),
              f"102 unchanged A/B initial hands: {match_id}")
        check(mirror.get("input", {}).get("first_player") == "B" and
              mirror_players.get("A", {}).get("seat") == "second" and
              mirror_players.get("B", {}).get("seat") == "first",
              f"102 A-second/B-first seats: {match_id}")
        check("a-second-seat-mirror" in mirror.get("test_plan", {}).get(
                  "strata", []), f"102 mirror stratum: {match_id}")
        fixture_card_ids = {
            card.get("card_id") for player in mirror_players.values()
            for card in player.get("deck_order_top_to_bottom", [])
        }
        check(fixture_card_ids <= proxy_98_all_ids and
              not (fixture_card_ids & proxy_101_unregistered) and
              not (fixture_card_ids & proxy_101_excluded),
              f"102 current registered pool only: {match_id}")
        check(mirror.get("record", {}).get("status") == "fixture" and
              mirror.get("record", {}).get("events") == [] and
              mirror.get("record", {}).get("result", {}).get("winner") is None,
              f"102 fixture remains unplayed: {match_id}")
    proxy_102_doc_text = proxy_102_doc.read_text()
    check("AとBのデッキを交換する方式ではない" in proxy_102_doc_text and
          "対戦結果・発動率・強度には数えない" in proxy_102_doc_text,
          "102 seat-only and unplayed boundaries")

# 103 records one controlled P97-03 transcript for each seat.  It validates
# the recording path and canonical state linkage, not gameplay strength.
proxy_103_doc = DOCS / "103-controlled-p97-03-pilot.md"
proxy_103_plan_path = DOCS / "data/proxy-pilot-plan-103-20260918.json"
proxy_103_records_path = DOCS / "data/proxy-pilots-103"
proxy_103_traces_path = DOCS / "data/proxy-pilot-traces-103"
proxy_103_main_path = DOCS / "data/proxy-main-followup-103-20260918.json"
proxy_103_tool = DOCS / "tools/proxy_pilot_trace.py"
proxy_103_test = DOCS / "tools/test_proxy_pilot_trace.py"
for path, label in (
    (proxy_103_doc, "103 controlled pilot document"),
    (proxy_103_plan_path, "103 controlled pilot plan"),
    (proxy_103_records_path, "103 completed pilot output"),
    (proxy_103_traces_path, "103 pilot trace output"),
    (proxy_103_main_path, "103 latest-main evidence"),
    (proxy_103_tool, "103 pilot materializer"),
    (proxy_103_test, "103 pilot tests"),
):
    check(path.exists(), f"{label} missing")
if all(path.exists() for path in (
        proxy_103_doc, proxy_103_plan_path, proxy_103_records_path,
        proxy_103_traces_path, proxy_103_main_path, proxy_103_tool,
        proxy_103_test)):
    proxy_103_plan = json.loads(proxy_103_plan_path.read_text())
    proxy_103_records = [
        json.loads(path.read_text())
        for path in sorted(proxy_103_records_path.glob("*.json"))
    ]
    proxy_103_traces = {
        row.get("record_match_id"): row
        for row in (
            json.loads(path.read_text())
            for path in sorted(proxy_103_traces_path.glob("*.json"))
        )
    }
    check(proxy_103_plan.get("cluster") == "P97-03" and
          proxy_103_plan.get("focus_card_id") == "G-hit-blow" and
          proxy_103_plan.get("declared_card_type") == "main",
          "103 approved P97-03 pilot plan")
    check(len(proxy_103_records) == len(proxy_103_traces) == 2,
          "103 completed record and trace counts")
    check(sorted(row.get("input", {}).get("first_player")
                 for row in proxy_103_records) == ["A", "B"],
          "103 first-player pair")
    for record in proxy_103_records:
        match_id = record.get("match_id")
        recorded = record.get("record", {})
        events = recorded.get("events", [])
        trace = proxy_103_traces.get(match_id, {})
        snapshots = trace.get("snapshots", [])
        focus_events = [event for event in events
                        if event.get("action_type") == "play_hit_blow"]
        check(recorded.get("status") == "completed" and len(events) == 41,
              f"103 completed event count: {match_id}")
        check(len(snapshots) == 42 and
              [row.get("event_seq") for row in snapshots] == list(range(42)),
              f"103 trace sequence: {match_id}")
        for index, snapshot in enumerate(snapshots):
            canonical = json.dumps(snapshot.get("state"), ensure_ascii=False,
                                   sort_keys=True, separators=(",", ":"))
            digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
            check(snapshot.get("sha256") == digest,
                  f"103 canonical snapshot hash {index}: {match_id}")
        for index, event in enumerate(events, 1):
            if index < len(snapshots):
                check(event.get("before_state_sha256") ==
                      snapshots[index - 1].get("sha256") and
                      event.get("after_state_sha256") ==
                      snapshots[index].get("sha256"),
                      f"103 event/trace hash linkage {index}: {match_id}")
        check(len(focus_events) == 1 and
              focus_events[0].get("round") == 1 and
              focus_events[0].get("turn_player") == "A" and
              focus_events[0].get("source_instance_id") == "A-001#1" and
              focus_events[0].get("payment", {}).get("time") == 1 and
              focus_events[0].get("choice_ids") ==
              ["choice-p97-03-declare-main"] and
              "A-007#1" in focus_events[0].get("result", ""),
              f"103 exact P97-03 focus event: {match_id}")
        check(recorded.get("reservations") == [] and
              not any(event.get("instance_transitions") for event in events),
              f"103 no fabricated reservation or transition: {match_id}")
        result_103 = recorded.get("result", {})
        final_state = snapshots[-1].get("state", {}) if snapshots else {}
        final_growth = {
            player_id: final_state.get("players", {}).get(
                player_id, {}).get("growth")
            for player_id in ("A", "B")
        }
        check(result_103.get("winner") == "A" and
              result_103.get("final_growth") == {"A": 25, "B": 20} and
              final_growth == {"A": 25, "B": 20} and
              final_state.get("phase") == "completed",
              f"103 controlled final result: {match_id}")
    proxy_103_tool_tree = ast.parse(proxy_103_tool.read_text())
    proxy_103_test_tree = ast.parse(proxy_103_test.read_text())
    proxy_103_functions = {
        node.name for node in proxy_103_tool_tree.body
        if isinstance(node, ast.FunctionDef)
    }
    check({"build_p97_03_pilot_pair", "validate_trace",
           "validate_pilot_pair", "validate_materialized_pilots", "main"} <=
          proxy_103_functions, "103 pilot materializer public functions")
    proxy_103_test_count = sum(
        node.name.startswith("test_")
        for node in ast.walk(proxy_103_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_103_test_count == 6, "103 pilot materializer test count")
    proxy_103_doc_text = proxy_103_doc.read_text()
    check("勝率・先後差・カード強度の結論には数えない" in
          proxy_103_doc_text and
          "架空記録は加えない" in proxy_103_doc_text,
          "103 controlled-result and empty-path boundaries")

    proxy_103_main = json.loads(proxy_103_main_path.read_text())
    expected_103_main_paths = {
        "index.html", "script.js", "tests/consumables-v2-browser.cjs",
        "tests/consumables-v2-eggs-test.cjs",
        "tests/consumables-v2-forms-test.cjs",
        "tests/helpers/runtime-harness.cjs",
        "tests/item-collections-economy-test.cjs", "tests/sticker-test.cjs",
    }
    base_blobs_103 = proxy_103_main.get("source_blobs_at_base", {})
    main_blobs_103 = proxy_103_main.get("source_blobs_at_main", {})
    stable_sources_103 = {
        "character-world-master.v1.js", "games.js", "item-system.js",
        "movie-dialogue.js", "world-environment.js",
    }
    check(proxy_103_main.get("main_commit") ==
          "d8036775d35f21fc12c20d5bf450e93d3a2e8846" and
          set(proxy_103_main.get("changed_paths", [])) == expected_103_main_paths,
          "103 latest-main commit and changed paths")
    check(all(base_blobs_103.get(path) == main_blobs_103.get(path)
              for path in stable_sources_103) and
          base_blobs_103.get("script.js") != main_blobs_103.get("script.js"),
          "103 latest-main source blob boundary")

# 104 records both terminal reservation paths with a controlled P97-06 pair.
# It preserves the existing physical cards and changes only two B deck positions.
proxy_104_doc = DOCS / "104-p97-06-reservation-pilot.md"
proxy_104_plan_path = DOCS / "data/proxy-reservation-plan-104-20260918.json"
proxy_104_records_path = DOCS / "data/proxy-pilots-104"
proxy_104_traces_path = DOCS / "data/proxy-pilot-traces-104"
proxy_104_tool = DOCS / "tools/proxy_reservation_pilot.py"
proxy_104_test = DOCS / "tools/test_proxy_reservation_pilot.py"
for path, label in (
    (proxy_104_doc, "104 reservation pilot document"),
    (proxy_104_plan_path, "104 reservation pilot plan"),
    (proxy_104_records_path, "104 completed pilot output"),
    (proxy_104_traces_path, "104 reservation trace output"),
    (proxy_104_tool, "104 reservation materializer"),
    (proxy_104_test, "104 reservation tests"),
):
    check(path.exists(), f"{label} missing")
if all(path.exists() for path in (
        proxy_104_doc, proxy_104_plan_path, proxy_104_records_path,
        proxy_104_traces_path, proxy_104_tool, proxy_104_test)):
    proxy_104_plan = json.loads(proxy_104_plan_path.read_text())
    proxy_104_record_files = sorted(proxy_104_records_path.glob("*.json"))
    proxy_104_trace_files = sorted(proxy_104_traces_path.glob("*.json"))
    proxy_104_records = [json.loads(path.read_text())
                         for path in proxy_104_record_files]
    proxy_104_traces = {
        row.get("record_match_id"): row
        for row in (json.loads(path.read_text()) for path in proxy_104_trace_files)
    }
    check(proxy_104_plan.get("cluster") == "P97-06" and
          proxy_104_plan.get("focus_card_id") == "G-breakout-classic" and
          proxy_104_plan.get("target_card_id") == "I-poop1" and
          proxy_104_plan.get("design", {}).get("rules_commit") ==
          "25d82135873d5f6ca9cac0ffa44fc9e3a69cb457" and
          proxy_104_plan.get("design", {}).get("rules_tree") ==
          "98748feb521b90cc65e7e36e2ee4785cbd63fe2b",
          "104 approved P97-06 reservation plan and baseline")
    expected_104_record_names = {
        f"{row.get('record_match_id')}.json"
        for row in proxy_104_plan.get("pairs", [])
    }
    expected_104_trace_names = {
        f"{row.get('trace_id')}.json"
        for row in proxy_104_plan.get("pairs", [])
    }
    check({path.name for path in proxy_104_record_files} ==
          expected_104_record_names and
          {path.name for path in proxy_104_trace_files} ==
          expected_104_trace_names and
          len(proxy_104_records) == len(proxy_104_traces) == 2,
          "104 exact completed record and trace files")
    check(sorted(row.get("input", {}).get("first_player")
                 for row in proxy_104_records) == ["A", "B"],
          "104 first-player pair")
    expected_104_by_first = {
        "A": (43, 44, "consumed", 3, 0),
        "B": (42, 43, "expired", 11, 1),
    }
    source_104_by_first = {}
    for pair in proxy_104_plan.get("pairs", []):
        source = json.loads((proxy_104_plan_path.parent /
                             pair["source_fixture"]).read_text())
        source_104_by_first[source.get("input", {}).get("first_player")] = source
    for record in proxy_104_records:
        match_id = record.get("match_id")
        first_player = record.get("input", {}).get("first_player")
        events = record.get("record", {}).get("events", [])
        reservations = record.get("record", {}).get("reservations", [])
        trace = proxy_104_traces.get(match_id, {})
        snapshots = trace.get("snapshots", [])
        expected_events, expected_snapshots, expected_status, deadline_round, uses = \
            expected_104_by_first.get(first_player, (None,) * 5)
        check(record.get("record", {}).get("status") == "completed" and
              len(events) == expected_events and len(snapshots) == expected_snapshots,
              f"104 completed event and snapshot counts: {match_id}")
        check([row.get("event_seq") for row in snapshots] ==
              list(range(expected_snapshots or 0)),
              f"104 trace sequence: {match_id}")
        for index, snapshot in enumerate(snapshots):
            canonical = json.dumps(snapshot.get("state"), ensure_ascii=False,
                                   sort_keys=True, separators=(",", ":"))
            digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
            check(snapshot.get("sha256") == digest,
                  f"104 canonical snapshot hash {index}: {match_id}")
        for index, event in enumerate(events, 1):
            if index < len(snapshots):
                check(event.get("before_state_sha256") ==
                      snapshots[index - 1].get("sha256") and
                      event.get("after_state_sha256") ==
                      snapshots[index].get("sha256"),
                      f"104 event/trace hash linkage {index}: {match_id}")
        reservation = reservations[0] if len(reservations) == 1 else {}
        reservation_id = reservation.get("reservation_id")
        prepare = [event for event in events
                   if event.get("action_type") == "prepare_toilet_paper"]
        breakout = [event for event in events
                    if event.get("action_type") == "play_breakout"]
        execute = [event for event in events
                   if event.get("action_type") == "execute_breakout_reservation"]
        check(len(prepare) == len(breakout) == 1 and
              prepare[0].get("source_instance_id") == "B-034#1" and
              prepare[0].get("payment", {}).get("time") == 1 and
              breakout[0].get("source_instance_id") == "A-001#1" and
              breakout[0].get("target_instance_ids") == ["B-034#1"] and
              breakout[0].get("payment", {}).get("time") == 2 and
              breakout[0].get("reservations_created") == [reservation_id],
              f"104 exact preparation and breakout events: {match_id}")
        check(reservation.get("status") == expected_status and
              reservation.get("deadline") == {
                  "kind": "next_own_turn_start", "round": deadline_round,
                  "player": "A"} and
              reservation.get("uses_remaining") == uses and
              reservation.get("source_instance_id") == "A-001#1" and
              reservation.get("target_instance_ids") == ["B-034#1"],
              f"104 reservation terminal state: {match_id}")
        final_state = snapshots[-1].get("state", {}) if snapshots else {}
        final_b = final_state.get("players", {}).get("B", {})
        if expected_status == "consumed":
            check(len(execute) == 1 and execute[0].get("round") == 3 and
                  execute[0].get("turn_player") == "A" and
                  execute[0].get("reservations_consumed") == [reservation_id] and
                  "B-034#1" in final_b.get("hand", []) and
                  "B-034#1" not in final_b.get("field", {}).get("prepared", []),
                  f"104 consumed path and target position: {match_id}")
        else:
            check(not execute and not any(event.get("round") == 11 for event in events) and
                  not any(reservation_id in event.get("reservations_consumed", [])
                          for event in events) and
                  "B-034#1" in final_b.get("field", {}).get("prepared", []),
                  f"104 expired path without R11: {match_id}")
        result_104 = record.get("record", {}).get("result", {})
        check(result_104.get("winner") == "draw" and
              result_104.get("final_growth") == {"A": 20, "B": 20} and
              final_state.get("phase") == "completed" and
              {player_id: final_state.get("players", {}).get(
                  player_id, {}).get("growth") for player_id in ("A", "B")} ==
              {"A": 20, "B": 20} and
              final_state.get("reservations", {}).get(
                  reservation_id, {}).get("status") == expected_status,
              f"104 controlled final result and reservation trace: {match_id}")
        source = source_104_by_first.get(first_player, {})
        source_players = {row.get("player_id"): row for row in
                          source.get("input", {}).get("players", [])}
        pilot_players = {row.get("player_id"): row for row in
                         record.get("input", {}).get("players", [])}
        for player_id in ("A", "B"):
            source_deck = source_players.get(player_id, {}).get(
                "deck_order_top_to_bottom", [])
            pilot_deck = pilot_players.get(player_id, {}).get(
                "deck_order_top_to_bottom", [])
            check({row.get("initial_instance_id"): row.get("card_id")
                   for row in source_deck} ==
                  {row.get("initial_instance_id"): row.get("card_id")
                   for row in pilot_deck},
                  f"104 unchanged instance-to-card mapping {player_id}: {match_id}")
            source_order = [row.get("initial_instance_id") for row in source_deck]
            pilot_order = [row.get("initial_instance_id") for row in pilot_deck]
            changed_positions = {index for index, (before, after) in
                                 enumerate(zip(source_order, pilot_order))
                                 if before != after}
            expected_changes = set() if player_id == "A" else {4, 33}
            check(len(source_order) == len(pilot_order) == 40 and
                  changed_positions == expected_changes and
                  pilot_players.get(player_id, {}).get("initial_hand") ==
                  pilot_order[:5],
                  f"104 order-only input derivation {player_id}: {match_id}")
        check(not any(event.get("instance_transitions") for event in events),
              f"104 no premature instance transitions: {match_id}")
    proxy_104_tool_tree = ast.parse(proxy_104_tool.read_text())
    proxy_104_test_tree = ast.parse(proxy_104_test.read_text())
    proxy_104_functions = {
        node.name for node in proxy_104_tool_tree.body
        if isinstance(node, ast.FunctionDef)
    }
    check({"build_p97_06_reservation_pair", "validate_reservation_trace",
           "validate_reservation_pair", "validate_materialized_reservation_pilots",
           "write_reservation_pilots", "main"} <= proxy_104_functions,
          "104 reservation materializer public functions")
    proxy_104_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_104_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_104_test_count == 8, "104 reservation materializer test count")
    proxy_104_doc_text = proxy_104_doc.read_text()
    check("勝率・先後差・カード強度の結論には数えない" in proxy_104_doc_text and
          "R11は作らない" in proxy_104_doc_text and
          "instance_transitions`は空" in proxy_104_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_104_doc_text,
          "104 controlled-result and reservation boundaries")

# 105 records a real physical-card re-entry after full-slot replacement and
# Animal Shogi recovery.  It must retire #1 and activate #2 exactly once.
proxy_105_doc = DOCS / "105-p97-05-reentry-pilot.md"
proxy_105_plan_path = DOCS / "data/proxy-reentry-plan-105-20260918.json"
proxy_105_records_path = DOCS / "data/proxy-pilots-105"
proxy_105_traces_path = DOCS / "data/proxy-pilot-traces-105"
proxy_105_tool = DOCS / "tools/proxy_reentry_pilot.py"
proxy_105_test = DOCS / "tools/test_proxy_reentry_pilot.py"
for path, label in (
    (proxy_105_doc, "105 re-entry pilot document"),
    (proxy_105_plan_path, "105 re-entry pilot plan"),
    (proxy_105_records_path, "105 completed pilot output"),
    (proxy_105_traces_path, "105 re-entry trace output"),
    (proxy_105_tool, "105 re-entry materializer"),
    (proxy_105_test, "105 re-entry tests"),
):
    check(path.exists(), f"{label} missing")
if all(path.exists() for path in (
        proxy_105_doc, proxy_105_plan_path, proxy_105_records_path,
        proxy_105_traces_path, proxy_105_tool, proxy_105_test)):
    proxy_105_plan = json.loads(proxy_105_plan_path.read_text())
    proxy_105_record_files = sorted(proxy_105_records_path.glob("*.json"))
    proxy_105_trace_files = sorted(proxy_105_traces_path.glob("*.json"))
    proxy_105_records = [json.loads(path.read_text())
                         for path in proxy_105_record_files]
    proxy_105_traces = {
        row.get("record_match_id"): row
        for row in (json.loads(path.read_text()) for path in proxy_105_trace_files)
    }
    check(proxy_105_plan.get("cluster") == "P97-05" and
          proxy_105_plan.get("focus_card_id") == "G-animal-shogi" and
          proxy_105_plan.get("reentry_card_id") == "C-bat" and
          proxy_105_plan.get("design", {}).get("rules_commit") ==
          "e1c616d25a3d349d6dd7b430da1aced2a4c9ba6a" and
          proxy_105_plan.get("design", {}).get("rules_tree") ==
          "8c217b52534f26103a3505f6032450c2a894db77",
          "105 approved P97-05 re-entry plan and baseline")
    expected_105_record_names = {
        f"{row.get('record_match_id')}.json"
        for row in proxy_105_plan.get("pairs", [])
    }
    expected_105_trace_names = {
        f"{row.get('trace_id')}.json"
        for row in proxy_105_plan.get("pairs", [])
    }
    check({path.name for path in proxy_105_record_files} ==
          expected_105_record_names and
          {path.name for path in proxy_105_trace_files} ==
          expected_105_trace_names and
          len(proxy_105_records) == len(proxy_105_traces) == 2,
          "105 exact completed record and trace files")
    check(sorted(row.get("input", {}).get("first_player")
                 for row in proxy_105_records) == ["A", "B"],
          "105 first-player pair")
    source_105_by_first = {}
    for pair in proxy_105_plan.get("pairs", []):
        source = json.loads((proxy_105_plan_path.parent /
                             pair["source_fixture"]).read_text())
        source_105_by_first[source.get("input", {}).get("first_player")] = source
    expected_105_sequences = {
        "A": (17, 18, 23),
        "B": (19, 20, 25),
    }
    expected_transition_105 = {
        "card_copy_id": "A-011",
        "from_instance_id": "A-011#1",
        "to_instance_id": "A-011#2",
        "reason": "zone_change",
    }
    for record in proxy_105_records:
        match_id = record.get("match_id")
        first_player = record.get("input", {}).get("first_player")
        events = record.get("record", {}).get("events", [])
        trace = proxy_105_traces.get(match_id, {})
        snapshots = trace.get("snapshots", [])
        check(record.get("record", {}).get("status") == "completed" and
              len(events) == 46 and len(snapshots) == 47 and
              [row.get("event_seq") for row in snapshots] == list(range(47)),
              f"105 completed event and trace sequence: {match_id}")
        for index, snapshot in enumerate(snapshots):
            canonical = json.dumps(snapshot.get("state"), ensure_ascii=False,
                                   sort_keys=True, separators=(",", ":"))
            digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
            check(snapshot.get("sha256") == digest,
                  f"105 canonical snapshot hash {index}: {match_id}")
        for index, event in enumerate(events, 1):
            if index < len(snapshots):
                check(event.get("before_state_sha256") ==
                      snapshots[index - 1].get("sha256") and
                      event.get("after_state_sha256") ==
                      snapshots[index].get("sha256"),
                      f"105 event/trace hash linkage {index}: {match_id}")
        placements = [event for event in events if event.get("action_type") in {
            "place_bat", "place_box", "place_cat_friend"}]
        replacement = [event for event in events
                       if event.get("action_type") ==
                       "replace_companion_for_chameleon"]
        recovery = [event for event in events
                    if event.get("action_type") == "play_animal_shogi"]
        replay = [event for event in events
                  if event.get("action_type") == "replay_recovered_bat"]
        replacement_seq, recovery_seq, replay_seq = \
            expected_105_sequences.get(first_player, (None, None, None))
        check([(event.get("round"), event.get("source_instance_id"))
               for event in placements] == [
                   (1, "A-011#1"), (2, "A-012#1"), (3, "A-013#1")],
              f"105 first three companion placements: {match_id}")
        check(len(replacement) == 1 and
              replacement[0].get("seq") == replacement_seq and
              replacement[0].get("round") == 4 and
              replacement[0].get("source_instance_id") == "A-014#1" and
              replacement[0].get("target_instance_ids") == ["A-011#1"],
              f"105 full-slot replacement: {match_id}")
        check(len(recovery) == 1 and recovery[0].get("seq") == recovery_seq and
              recovery[0].get("round") == 4 and
              recovery[0].get("source_instance_id") == "A-001#1" and
              recovery[0].get("target_instance_ids") == ["A-011#1"] and
              recovery[0].get("payment", {}).get("time") == 2 and
              "A-010#1" in recovery[0].get("result", ""),
              f"105 exact Animal Shogi recovery: {match_id}")
        all_transitions = [transition for event in events
                           for transition in event.get("instance_transitions", [])]
        check(len(replay) == 1 and replay[0].get("seq") == replay_seq and
              replay[0].get("round") == 5 and
              replay[0].get("source_instance_id") == "A-011#1" and
              replay[0].get("target_instance_ids") == ["A-012#1"] and
              replay[0].get("instance_transitions") == [expected_transition_105] and
              all_transitions == [expected_transition_105],
              f"105 exact generation-two replay: {match_id}")
        for event in events[replay_seq:]:
            payment = event.get("payment", {})
            direct_references = ([event.get("source_instance_id")] +
                                 event.get("target_instance_ids", []) +
                                 payment.get("hand_to_discard", []) +
                                 payment.get("prepared_to_discard", []) +
                                 payment.get("deck_to_bottom", []))
            check("A-011#1" not in direct_references,
                  f"105 no retired-instance reference after replay: {match_id}")
        final_state = snapshots[-1].get("state", {}) if snapshots else {}
        final_a = final_state.get("players", {}).get("A", {})
        final_instances = final_state.get("instances", {})
        check(final_a.get("field", {}).get("companions") ==
              ["A-013#1", "A-014#1", "A-011#2"] and
              "A-011#1" not in final_a.get("hand", []) and
              "A-011#1" not in final_a.get("discard", []) and
              "A-012#1" in final_a.get("discard", []) and
              final_instances.get("A-011#1", {}).get("status") == "retired" and
              final_instances.get("A-011#2") == {
                  "card_copy_id": "A-011", "status": "active"},
              f"105 final zones and instance statuses: {match_id}")
        result_105 = record.get("record", {}).get("result", {})
        check(result_105.get("winner") == "draw" and
              result_105.get("final_growth") == {"A": 20, "B": 20} and
              final_state.get("phase") == "completed" and
              record.get("record", {}).get("reservations") == [] and
              final_state.get("reservations") == {},
              f"105 controlled result and no fabricated reservation: {match_id}")
        source = source_105_by_first.get(first_player, {})
        source_players = {row.get("player_id"): row for row in
                          source.get("input", {}).get("players", [])}
        pilot_players = {row.get("player_id"): row for row in
                         record.get("input", {}).get("players", [])}
        for player_id in ("A", "B"):
            source_deck = source_players.get(player_id, {}).get(
                "deck_order_top_to_bottom", [])
            pilot_deck = pilot_players.get(player_id, {}).get(
                "deck_order_top_to_bottom", [])
            check({row.get("initial_instance_id"): row.get("card_id")
                   for row in source_deck} ==
                  {row.get("initial_instance_id"): row.get("card_id")
                   for row in pilot_deck},
                  f"105 unchanged instance-to-card mapping {player_id}: {match_id}")
            source_order = [row.get("initial_instance_id") for row in source_deck]
            pilot_order = [row.get("initial_instance_id") for row in pilot_deck]
            changed_positions = {index for index, (before, after) in
                                 enumerate(zip(source_order, pilot_order))
                                 if before != after}
            expected_changes = ({1, 2, 3, 4, 10, 11, 12, 13}
                                if player_id == "A" else set())
            check(len(source_order) == len(pilot_order) == 40 and
                  changed_positions == expected_changes and
                  pilot_players.get(player_id, {}).get("initial_hand") ==
                  pilot_order[:5],
                  f"105 order-only input derivation {player_id}: {match_id}")
    proxy_105_tool_tree = ast.parse(proxy_105_tool.read_text())
    proxy_105_test_tree = ast.parse(proxy_105_test.read_text())
    proxy_105_functions = {
        node.name for node in proxy_105_tool_tree.body
        if isinstance(node, ast.FunctionDef)
    }
    check({"build_p97_05_reentry_pair", "validate_reentry_trace",
           "validate_reentry_pair", "validate_materialized_reentry_pilots",
           "write_reentry_pilots", "main"} <= proxy_105_functions,
          "105 re-entry materializer public functions")
    proxy_105_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_105_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_105_test_count == 8, "105 re-entry materializer test count")
    proxy_105_doc_text = proxy_105_doc.read_text()
    check("勝率・先後差・カード強度の結論には数えない" in proxy_105_doc_text and
          "架空予約は作らない" in proxy_105_doc_text and
          "予約非移行を実対戦で確認済みとは数えない" in proxy_105_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_105_doc_text,
          "105 controlled-result and identity boundaries")

# 106 completes the controlled single-fixture layer for P97-01, P97-02 and
# P97-04.  It preserves every physical card while recording exact choices,
# a same-turn-end reservation and the City Run setup.
proxy_106_doc = DOCS / "106-remaining-single-pilots.md"
proxy_106_plan_path = DOCS / "data/proxy-remaining-single-plan-106-20260918.json"
proxy_106_records_path = DOCS / "data/proxy-pilots-106"
proxy_106_traces_path = DOCS / "data/proxy-pilot-traces-106"
proxy_106_tool = DOCS / "tools/proxy_remaining_single_pilots.py"
proxy_106_test = DOCS / "tools/test_proxy_remaining_single_pilots.py"
for path, label in (
    (proxy_106_doc, "106 remaining single pilot document"),
    (proxy_106_plan_path, "106 remaining single pilot plan"),
    (proxy_106_records_path, "106 completed pilot output"),
    (proxy_106_traces_path, "106 trace output"),
    (proxy_106_tool, "106 pilot materializer"),
    (proxy_106_test, "106 pilot tests"),
):
    check(path.exists(), f"{label} missing")
if all(path.exists() for path in (
        proxy_106_doc, proxy_106_plan_path, proxy_106_records_path,
        proxy_106_traces_path, proxy_106_tool, proxy_106_test)):
    proxy_106_plan = json.loads(proxy_106_plan_path.read_text())
    proxy_106_specs = proxy_106_plan.get("records", [])
    proxy_106_record_files = sorted(proxy_106_records_path.glob("*.json"))
    proxy_106_trace_files = sorted(proxy_106_traces_path.glob("*.json"))
    proxy_106_records = [json.loads(path.read_text())
                         for path in proxy_106_record_files]
    proxy_106_traces = {
        row.get("record_match_id"): row
        for row in (json.loads(path.read_text()) for path in proxy_106_trace_files)
    }
    check(proxy_106_plan.get("schema") ==
          "naotocchi.card_game.proxy_remaining_single_plan.v1" and
          proxy_106_plan.get("design", {}).get("rules_commit") ==
          "bffbbb8f575f0ae0d8bf3e375ce8fa0c743aa8f4" and
          proxy_106_plan.get("design", {}).get("rules_tree") ==
          "9f41b9001714f59a665cfbaeaa7f687129f00017" and
          [row.get("cluster") for row in proxy_106_specs] ==
          ["P97-01", "P97-01", "P97-02", "P97-02", "P97-04", "P97-04"],
          "106 approved clusters and baseline")
    expected_106_record_names = {
        f"{row.get('record_match_id')}.json" for row in proxy_106_specs
    }
    expected_106_trace_names = {
        f"{row.get('trace_id')}.json" for row in proxy_106_specs
    }
    check({path.name for path in proxy_106_record_files} ==
          expected_106_record_names and
          {path.name for path in proxy_106_trace_files} ==
          expected_106_trace_names and
          len(proxy_106_records) == len(proxy_106_traces) == 6,
          "106 exact completed record and trace files")
    specs_106_by_match = {
        row.get("record_match_id"): row for row in proxy_106_specs
    }
    expected_106_sequences = {
        ("P97-01", "A"): (2, 3),
        ("P97-01", "B"): (4, 5),
        ("P97-02", "A"): (2, 3),
        ("P97-02", "B"): (4, 5),
        ("P97-04", "A"): (6, 11, 20, 21, 22, 23),
        ("P97-04", "B"): (8, 13, 22, 23, 24, 25),
    }
    expected_106_changes = {
        "P97-01": {1, 15},
        "P97-02": set(),
        "P97-04": {2, 3, 4, 10, 11, 19, 22, 31, 34, 35},
    }
    cluster_first_players_106 = {cluster: [] for cluster in
                                 ("P97-01", "P97-02", "P97-04")}
    for record in proxy_106_records:
        match_id = record.get("match_id")
        spec = specs_106_by_match.get(match_id, {})
        cluster = spec.get("cluster")
        first_player = record.get("input", {}).get("first_player")
        if cluster in cluster_first_players_106:
            cluster_first_players_106[cluster].append(first_player)
        events = record.get("record", {}).get("events", [])
        trace = proxy_106_traces.get(match_id, {})
        snapshots = trace.get("snapshots", [])
        expected_count = 46 if cluster == "P97-04" else 42
        check(record.get("record", {}).get("status") == "completed" and
              len(events) == expected_count and
              len(snapshots) == expected_count + 1 and
              [row.get("event_seq") for row in snapshots] ==
              list(range(expected_count + 1)),
              f"106 completed event and trace sequence: {match_id}")
        for index, snapshot in enumerate(snapshots):
            canonical = json.dumps(snapshot.get("state"), ensure_ascii=False,
                                   sort_keys=True, separators=(",", ":"))
            digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
            check(snapshot.get("sha256") == digest,
                  f"106 canonical snapshot hash {index}: {match_id}")
        for index, event in enumerate(events, 1):
            if index < len(snapshots):
                check(event.get("before_state_sha256") ==
                      snapshots[index - 1].get("sha256") and
                      event.get("after_state_sha256") ==
                      snapshots[index].get("sha256"),
                      f"106 event/trace hash linkage {index}: {match_id}")
        final_state = snapshots[-1].get("state", {}) if snapshots else {}
        final_a = final_state.get("players", {}).get("A", {})
        result_106 = record.get("record", {}).get("result", {})
        expected_growth = ({"A": 20, "B": 20} if cluster == "P97-04"
                           else {"A": 25, "B": 20})
        check(result_106.get("final_growth") == expected_growth and
              result_106.get("winner") ==
              ("draw" if cluster == "P97-04" else "A") and
              final_state.get("phase") == "completed" and
              not any(event.get("instance_transitions") for event in events),
              f"106 controlled result and no instance transition: {match_id}")
        source = json.loads((proxy_106_plan_path.parent /
                             spec.get("source_fixture", "missing")).read_text())
        source_players = {row.get("player_id"): row for row in
                          source.get("input", {}).get("players", [])}
        pilot_players = {row.get("player_id"): row for row in
                         record.get("input", {}).get("players", [])}
        for player_id in ("A", "B"):
            source_deck = source_players.get(player_id, {}).get(
                "deck_order_top_to_bottom", [])
            pilot_deck = pilot_players.get(player_id, {}).get(
                "deck_order_top_to_bottom", [])
            check({row.get("initial_instance_id"):
                   (row.get("card_copy_id"), row.get("card_id"))
                   for row in source_deck} ==
                  {row.get("initial_instance_id"):
                   (row.get("card_copy_id"), row.get("card_id"))
                   for row in pilot_deck},
                  f"106 unchanged physical-card mapping {player_id}: {match_id}")
            source_order = [row.get("initial_instance_id") for row in source_deck]
            pilot_order = [row.get("initial_instance_id") for row in pilot_deck]
            changed_positions = {index for index, (before, after) in
                                 enumerate(zip(source_order, pilot_order))
                                 if before != after}
            expected_changes = (expected_106_changes.get(cluster, set())
                                if player_id == "A" else set())
            check(len(source_order) == len(pilot_order) == 40 and
                  changed_positions == expected_changes and
                  pilot_players.get(player_id, {}).get("initial_hand") ==
                  pilot_order[:5],
                  f"106 order-only input derivation {player_id}: {match_id}")
        if cluster == "P97-01":
            placement = [row for row in events if row.get("action_type") ==
                         "place_first_date_partner"]
            first_date = [row for row in events if row.get("action_type") ==
                          "play_first_date"]
            place_seq, play_seq = expected_106_sequences[(cluster, first_player)]
            check(len(placement) == len(first_date) == 1 and
                  placement[0].get("seq") == place_seq and
                  placement[0].get("source_instance_id") == "A-016#1" and
                  first_date[0].get("seq") == play_seq and
                  first_date[0].get("source_instance_id") == "A-001#1" and
                  first_date[0].get("target_instance_ids") == ["A-016#1"] and
                  first_date[0].get("payment", {}).get("time") == 1 and
                  final_a.get("field", {}).get("partner") == "A-016#1" and
                  final_a.get("field", {}).get("partner_stage") == 0,
                  f"106 exact first-date line: {match_id}")
        elif cluster == "P97-02":
            play = [row for row in events if row.get("action_type") ==
                    "play_mini_golf"]
            resolution = [row for row in events if row.get("action_type") ==
                          "resolve_mini_golf_turn_end"]
            play_seq, resolve_seq = expected_106_sequences[(cluster, first_player)]
            reservations = record.get("record", {}).get("reservations", [])
            check(len(play) == len(resolution) == len(reservations) == 1 and
                  play[0].get("seq") == play_seq and
                  resolution[0].get("seq") == resolve_seq and
                  play[0].get("reservations_created") ==
                  resolution[0].get("reservations_consumed") and
                  reservations[0].get("deadline") == {
                      "kind": "current_turn_end", "round": 1, "player": "A"} and
                  reservations[0].get("status") == "consumed" and
                  reservations[0].get("uses_remaining") == 0,
                  f"106 exact mini-golf reservation: {match_id}")
        elif cluster == "P97-04":
            action_types = [
                "birth_city_runner", "place_city_world", "equip_lunch_box",
                "equip_pillow", "resolve_city_peek", "play_city_run",
            ]
            actions = [next((row for row in events
                             if row.get("action_type") == action_type), {})
                       for action_type in action_types]
            check(tuple(row.get("seq") for row in actions) ==
                  expected_106_sequences[(cluster, first_player)] and
                  [row.get("payment", {}).get("time") for row in actions] ==
                  [2, 2, 2, 2, 0, 1] and
                  actions[-1].get("choice_ids") == [
                      "choice-p97-04-take-play", "choice-p97-04-take-event",
                      "choice-p97-04-bottom-order"] and
                  final_a.get("field", {}).get("main") == "A-002#1" and
                  final_a.get("field", {}).get("world") == "A-020#1" and
                  final_a.get("field", {}).get("prepared") ==
                  ["A-032#1", "A-035#1"] and
                  all(instance in final_a.get("hand", [])
                      for instance in ("A-023#1", "A-036#1")) and
                  final_a.get("deck", [])[-2:] == ["A-013#1", "A-014#1"] and
                  record.get("record", {}).get("reservations") == [],
                  f"106 exact City Run line and final zones: {match_id}")
    check(all(first_players == ["A", "B"] for first_players in
              cluster_first_players_106.values()),
          "106 first-player pair for each cluster")
    proxy_106_tool_tree = ast.parse(proxy_106_tool.read_text())
    proxy_106_test_tree = ast.parse(proxy_106_test.read_text())
    proxy_106_functions = {
        node.name for node in proxy_106_tool_tree.body
        if isinstance(node, ast.FunctionDef)
    }
    check({"build_remaining_single_pilots", "validate_remaining_single_trace",
           "validate_remaining_single_pilots",
           "validate_materialized_remaining_single_pilots",
           "write_remaining_single_pilots", "main"} <= proxy_106_functions,
          "106 remaining single materializer public functions")
    proxy_106_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_106_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_106_test_count == 7,
          "106 remaining single materializer test count")
    proxy_106_doc_text = proxy_106_doc.read_text()
    check("計12戦の統制completed記録" in proxy_106_doc_text and
          "勝率・先後差・発動率・カード強度の結論には数えない" in
          proxy_106_doc_text and
          "instance_transitions`は全eventで空" in proxy_106_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_106_doc_text,
          "106 controlled-result and scope boundaries")

# 107 fixes the normal-decision protocol and two unplayed seat-mirror inputs.
# It deliberately records no completed match and does not automate legality.
proxy_107_doc = DOCS / "107-normal-decision-match-protocol.md"
proxy_107_protocol_path = DOCS / "data/proxy-decision-protocol-107-20260918.json"
proxy_107_output = DOCS / "data/proxy-fixtures-107"
proxy_107_tool = DOCS / "tools/proxy_decision_fixture.py"
proxy_107_test = DOCS / "tools/test_proxy_decision_fixture.py"
for path, label in (
    (proxy_107_doc, "107 normal-decision protocol document"),
    (proxy_107_protocol_path, "107 machine-readable decision protocol"),
    (proxy_107_output, "107 unplayed fixture output"),
    (proxy_107_tool, "107 decision fixture builder"),
    (proxy_107_test, "107 decision fixture tests"),
):
    check(path.exists(), f"{label} missing")
if all(path.exists() for path in (
        proxy_107_doc, proxy_107_protocol_path, proxy_107_output,
        proxy_107_tool, proxy_107_test)):
    proxy_107_protocol = json.loads(proxy_107_protocol_path.read_text())
    proxy_107_files = sorted(proxy_107_output.glob("*.json"))
    proxy_107_fixtures = [json.loads(path.read_text()) for path in proxy_107_files]
    check(proxy_107_protocol.get("schema") ==
          "naotocchi.card_game.proxy_decision_protocol.v1" and
          proxy_107_protocol.get("design", {}).get("rules_commit") ==
          "0a97a9f14d68a26633545f1b80d7fbc1c64218fa" and
          proxy_107_protocol.get("design", {}).get("rules_tree") ==
          "91943d238bc31e6d6c97d8ee44b047a73e32efdc" and
          proxy_107_protocol.get("completed_match_count") == 0,
          "107 approved protocol baseline and zero completed matches")
    check(proxy_107_protocol.get("decision_priority") == [
              "avoid_defeat_or_aborted_challenge",
              "maintain_or_prevent_growth_100",
              "maximize_certain_growth_difference",
              "maximize_time_balance",
              "maximize_hand_board_reservation_value",
          ] and
          proxy_107_protocol.get("tie_breakers") == [
              "lower_time_payment", "fewer_cards_consumed",
              "lower_card_copy_id",
          ] and
          "pass" in proxy_107_protocol.get("required_candidate_kinds", []) and
          proxy_107_protocol.get("may_use_opponent_hidden_information") is False,
          "107 approved decision ordering and information boundary")
    specs_107 = proxy_107_protocol.get("fixtures", [])
    expected_107_names = {f"{row.get('match_id')}.json" for row in specs_107}
    check({path.name for path in proxy_107_files} == expected_107_names and
          len(proxy_107_fixtures) == 2,
          "107 exact two fixture files")
    players_107 = []
    for fixture, spec in zip(proxy_107_fixtures, specs_107):
        source = json.loads((proxy_107_protocol_path.parent /
                             spec.get("source_fixture", "missing")).read_text())
        source_players = {row.get("player_id"): row for row in
                          source.get("input", {}).get("players", [])}
        fixture_players = {row.get("player_id"): row for row in
                           fixture.get("input", {}).get("players", [])}
        players_107.append(fixture_players)
        check(all(
            fixture_players.get(player_id, {}).get(key) ==
            source_players.get(player_id, {}).get(key)
            for player_id in ("A", "B")
            for key in ("deck_order_top_to_bottom", "initial_hand")
        ), f"107 unchanged source input: {fixture.get('match_id')}")
        record_107 = fixture.get("record", {})
        check(record_107.get("status") == "fixture" and
              record_107.get("events") == [] and
              record_107.get("reservations") == [] and
              record_107.get("result", {}).get("winner") is None,
              f"107 remains unplayed: {fixture.get('match_id')}")
    if len(players_107) == 2:
        check(all(
            players_107[0].get(player_id, {}).get(key) ==
            players_107[1].get(player_id, {}).get(key)
            for player_id in ("A", "B")
            for key in ("deck_order_top_to_bottom", "initial_hand")
        ), "107 seat pair preserves identical A/B inputs")
    proxy_107_tool_tree = ast.parse(proxy_107_tool.read_text())
    proxy_107_test_tree = ast.parse(proxy_107_test.read_text())
    proxy_107_functions = {
        node.name for node in proxy_107_tool_tree.body
        if isinstance(node, ast.FunctionDef)
    }
    check({"build_decision_fixtures", "validate_protocol",
           "validate_decision_fixture_suite", "validate_materialized_suite",
           "write_decision_fixtures", "main"} <= proxy_107_functions,
          "107 decision fixture builder public functions")
    proxy_107_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_107_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_107_test_count == 8, "107 decision fixture test count")
    proxy_107_doc_text = proxy_107_doc.read_text()
    check("107ではcompleted対戦を作らず" in proxy_107_doc_text and
          "勝率・先後差・発動率・カード強度の結論には数えない" in
          proxy_107_doc_text and
          "対戦エンジンは作らず" in proxy_107_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_107_doc_text,
          "107 unplayed and scope boundaries")

# 108 executes the two 107 seat-mirror inputs with the fixed decision protocol.
# The pair validates the recording path but remains outside independent balance samples.
proxy_108_doc = DOCS / "108-normal-decision-match-pair.md"
proxy_108_plan_path = DOCS / "data/proxy-normal-decision-plan-108-20260918.json"
proxy_108_records_path = DOCS / "data/proxy-matches-108"
proxy_108_traces_path = DOCS / "data/proxy-decision-traces-108"
proxy_108_evaluation_path = DOCS / "data/proxy-normal-decision-evaluation-108-20260918.json"
proxy_108_tool = DOCS / "tools/proxy_normal_decision_pilot.py"
proxy_108_test = DOCS / "tools/test_proxy_normal_decision_pilot.py"
for path, label in (
    (proxy_108_doc, "108 normal-decision match document"),
    (proxy_108_plan_path, "108 normal-decision plan"),
    (proxy_108_records_path, "108 completed record output"),
    (proxy_108_traces_path, "108 decision trace output"),
    (proxy_108_evaluation_path, "108 evaluation output"),
    (proxy_108_tool, "108 normal-decision materializer"),
    (proxy_108_test, "108 normal-decision tests"),
):
    check(path.exists(), f"{label} missing")
if all(path.exists() for path in (
        proxy_108_doc, proxy_108_plan_path, proxy_108_records_path,
        proxy_108_traces_path, proxy_108_evaluation_path,
        proxy_108_tool, proxy_108_test)):
    proxy_108_plan = json.loads(proxy_108_plan_path.read_text())
    proxy_108_record_files = sorted(proxy_108_records_path.glob("*.json"))
    proxy_108_trace_files = sorted(proxy_108_traces_path.glob("*.json"))
    proxy_108_records = [json.loads(path.read_text()) for path in proxy_108_record_files]
    proxy_108_traces = [json.loads(path.read_text()) for path in proxy_108_trace_files]
    proxy_108_evaluation = json.loads(proxy_108_evaluation_path.read_text())
    check(proxy_108_plan.get("schema") ==
          "naotocchi.card_game.proxy_normal_decision_plan.v1" and
          proxy_108_plan.get("design", {}).get("rules_commit") ==
          "05db30e3b2d25ed2209021070e9bd3f3bfbac878" and
          proxy_108_plan.get("design", {}).get("rules_tree") ==
          "6adadca1a1ea5453c517fef277a7a0bc6cff6f59" and
          proxy_108_plan.get("scope", {}).get("completed_match_count") == 2 and
          proxy_108_plan.get("scope", {}).get("may_count_as_independent_balance_sample") is False,
          "108 approved plan baseline and scope")
    expected_108_records = {
        f"{row.get('record_match_id')}.json" for row in proxy_108_plan.get("matches", [])
    }
    expected_108_traces = {
        f"{row.get('trace_id')}.json" for row in proxy_108_plan.get("matches", [])
    }
    check({path.name for path in proxy_108_record_files} == expected_108_records and
          {path.name for path in proxy_108_trace_files} == expected_108_traces and
          len(proxy_108_records) == len(proxy_108_traces) == 2,
          "108 exact completed record and trace files")
    records_108 = {row.get("match_id"): row for row in proxy_108_records}
    traces_108 = {row.get("record_match_id"): row for row in proxy_108_traces}
    for spec in proxy_108_plan.get("matches", []):
        match_id = spec.get("record_match_id")
        record = records_108.get(match_id, {})
        trace = traces_108.get(match_id, {})
        source = json.loads((proxy_108_plan_path.parent /
                             spec.get("source_fixture", "missing")).read_text())
        source_players = {row.get("player_id"): row for row in
                          source.get("input", {}).get("players", [])}
        record_players = {row.get("player_id"): row for row in
                          record.get("input", {}).get("players", [])}
        check(all(
            record_players.get(player_id, {}).get(key) ==
            source_players.get(player_id, {}).get(key)
            for player_id in ("A", "B")
            for key in ("deck_order_top_to_bottom", "initial_hand")
        ), f"108 unchanged source input: {match_id}")
        recorded = record.get("record", {})
        events = recorded.get("events", [])
        decisions = trace.get("decisions", [])
        snapshots = trace.get("snapshots", [])
        check(recorded.get("status") == "completed" and
              recorded.get("result", {}).get("winner") == spec.get("expected_winner") and
              recorded.get("result", {}).get("final_growth") == spec.get("expected_final_growth") and
              recorded.get("result", {}).get("rounds_completed") == 10,
              f"108 completed result: {match_id}")
        check(len(decisions) == spec.get("expected_decision_count") and
              len(snapshots) == len(events) + 1 and
              [row.get("event_seq") for row in snapshots] == list(range(len(events) + 1)),
              f"108 decision and trace sequence: {match_id}")
        check(all(
            "pass" in [candidate.get("kind") for candidate in decision.get("legal_candidates", [])]
            and decision.get("selected_action", {}).get("candidate_id") in {
                candidate.get("candidate_id") for candidate in decision.get("legal_candidates", [])
            }
            and "opponent_hand" not in decision.get("public_information", {})
            and "opponent_deck" not in decision.get("public_information", {})
            for decision in decisions
        ), f"108 pass, selected-action and hidden-information boundary: {match_id}")
        check(recorded.get("reservations") == [] and all(
            event.get("instance_transitions") == [] for event in events
        ), f"108 zero reservations and reentries: {match_id}")
    check(proxy_108_evaluation.get("schema") ==
          "naotocchi.card_game.proxy_normal_decision_evaluation.v1" and
          proxy_108_evaluation.get("completed_match_count") == 2 and
          proxy_108_evaluation.get("independent_balance_sample_count") == 0 and
          proxy_108_evaluation.get("unresolved_decisions") == 0 and
          [row.get("legal_candidate_count") for row in
           proxy_108_evaluation.get("matches", [])] == [296, 284] and
          [row.get("selected_action_count") for row in
           proxy_108_evaluation.get("matches", [])] == [26, 25],
          "108 evaluation counts and zero independent sample")
    proxy_108_tool_tree = ast.parse(proxy_108_tool.read_text())
    proxy_108_test_tree = ast.parse(proxy_108_test.read_text())
    proxy_108_functions = {
        node.name for node in proxy_108_tool_tree.body
        if isinstance(node, ast.FunctionDef)
    }
    check({"build_normal_decision_pair", "validate_normal_decision_suite",
           "validate_materialized_suite", "write_normal_decision_suite", "main"} <=
          proxy_108_functions,
          "108 normal-decision materializer public functions")
    proxy_108_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_108_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_108_test_count == 8, "108 normal-decision test count")
    proxy_108_doc_text = proxy_108_doc.read_text()
    check("勝率・先後差・発動率・カード強度の結論には数えない" in
          proxy_108_doc_text and
          "判断不能0、予約0、再登場0" in proxy_108_doc_text and
          "完全な合法候補自動列挙やカード効果エンジンは作っていない" in
          proxy_108_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_108_doc_text,
          "108 completed-result and scope boundaries")

# 109 connects the six 101 same-name-two fixtures to fixed completed records.
proxy_109_doc = DOCS / "109-same-name-two-pilots.md"
proxy_109_plan_path = DOCS / "data/proxy-same-name-two-plan-109-20260918.json"
proxy_109_records_path = DOCS / "data/proxy-matches-109"
proxy_109_traces_path = DOCS / "data/proxy-decision-traces-109"
proxy_109_evaluation_path = DOCS / "data/proxy-same-name-two-evaluation-109-20260918.json"
proxy_109_tool = DOCS / "tools/proxy_same_name_two_pilots.py"
proxy_109_test = DOCS / "tools/test_proxy_same_name_two_pilots.py"
for path, label in (
    (proxy_109_doc, "109 same-name-two document"),
    (proxy_109_plan_path, "109 same-name-two plan"),
    (proxy_109_records_path, "109 completed record output"),
    (proxy_109_traces_path, "109 decision trace output"),
    (proxy_109_evaluation_path, "109 evaluation output"),
    (proxy_109_tool, "109 same-name-two materializer"),
    (proxy_109_test, "109 same-name-two tests"),
):
    check(path.exists(), f"{label} exists")
if all(path.exists() for path in (
        proxy_109_doc, proxy_109_plan_path, proxy_109_records_path,
        proxy_109_traces_path, proxy_109_evaluation_path,
        proxy_109_tool, proxy_109_test)):
    proxy_109_plan = json.loads(proxy_109_plan_path.read_text())
    proxy_109_record_files = sorted(proxy_109_records_path.glob("*.json"))
    proxy_109_trace_files = sorted(proxy_109_traces_path.glob("*.json"))
    proxy_109_records = [json.loads(path.read_text()) for path in proxy_109_record_files]
    proxy_109_traces = [json.loads(path.read_text()) for path in proxy_109_trace_files]
    proxy_109_evaluation = json.loads(proxy_109_evaluation_path.read_text())
    check(proxy_109_plan.get("schema") ==
          "naotocchi.card_game.proxy_same_name_two_plan.v1" and
          proxy_109_plan.get("design", {}).get("rules_commit") ==
          "afb175abcfef7dbad06ab410ffb4119152e3be7d" and
          proxy_109_plan.get("design", {}).get("rules_tree") ==
          "6ef990477d0be71caf96b3b2451e1dd6bd36dcac" and
          proxy_109_plan.get("scope", {}).get("completed_match_count") == 6 and
          proxy_109_plan.get("scope", {}).get("may_count_as_independent_balance_sample") is False,
          "109 approved plan baseline and scope")
    expected_109_records = {
        f"{row.get('record_match_id')}.json" for row in proxy_109_plan.get("matches", [])
    }
    expected_109_traces = {
        f"{row.get('trace_id')}.json" for row in proxy_109_plan.get("matches", [])
    }
    check({path.name for path in proxy_109_record_files} == expected_109_records and
          {path.name for path in proxy_109_trace_files} == expected_109_traces and
          len(proxy_109_records) == len(proxy_109_traces) == 6,
          "109 exact completed record and trace files")
    records_109 = {row.get("match_id"): row for row in proxy_109_records}
    traces_109 = {row.get("record_match_id"): row for row in proxy_109_traces}
    for spec in proxy_109_plan.get("matches", []):
        match_id = spec.get("record_match_id")
        record = records_109.get(match_id, {})
        trace = traces_109.get(match_id, {})
        source = json.loads((proxy_109_plan_path.parent /
                             spec.get("source_fixture", "missing")).read_text())
        source_maps = {
            player.get("player_id"): {
                row.get("initial_instance_id"): (row.get("card_copy_id"), row.get("card_id"))
                for row in player.get("deck_order_top_to_bottom", [])
            } for player in source.get("input", {}).get("players", [])
        }
        record_maps = {
            player.get("player_id"): {
                row.get("initial_instance_id"): (row.get("card_copy_id"), row.get("card_id"))
                for row in player.get("deck_order_top_to_bottom", [])
            } for player in record.get("input", {}).get("players", [])
        }
        check(source_maps == record_maps, f"109 physical-card identity preserved: {match_id}")
        recorded = record.get("record", {})
        events = recorded.get("events", [])
        decisions = trace.get("decisions", [])
        snapshots = trace.get("snapshots", [])
        focus_sources = {
            event.get("source_instance_id") for event in events
            if event.get("action_type") == spec.get("focus_action_type")
        }
        expected_focus = {
            row.get("initial_instance_id")
            for player in record.get("input", {}).get("players", [])
            if player.get("player_id") == "A"
            for row in player.get("deck_order_top_to_bottom", [])
            if row.get("card_id") == spec.get("focus_card_id")
        }
        check(recorded.get("status") == "completed" and
              recorded.get("result", {}).get("rounds_completed") == 10 and
              focus_sources == expected_focus and len(focus_sources) == 2,
              f"109 completed result and distinct focus copies: {match_id}")
        check(len(snapshots) == len(events) + 1 and
              [row.get("event_seq") for row in snapshots] == list(range(len(events) + 1)) and
              all("pass" in [candidate.get("kind") for candidate in
                              decision.get("legal_candidates", [])] and
                  "opponent_hand" not in decision.get("public_information", {}) and
                  "opponent_deck" not in decision.get("public_information", {})
                  for decision in decisions),
              f"109 decision, trace and hidden-information boundary: {match_id}")
    check(proxy_109_evaluation.get("schema") ==
          "naotocchi.card_game.proxy_same_name_two_evaluation.v1" and
          proxy_109_evaluation.get("completed_match_count") == 6 and
          proxy_109_evaluation.get("independent_balance_sample_count") == 0 and
          proxy_109_evaluation.get("unresolved_decisions") == 0 and
          [row.get("legal_candidate_count") for row in
           proxy_109_evaluation.get("matches", [])] == [178, 210, 197, 180, 181, 161] and
          [row.get("selected_action_count") for row in
           proxy_109_evaluation.get("matches", [])] == [3, 7, 2, 6, 8, 3],
          "109 evaluation counts and zero independent sample")
    metrics_109 = {row.get("cluster"): row for row in
                   proxy_109_evaluation.get("matches", [])}
    check(metrics_109.get("P97-02", {}).get("reservations") ==
          {"created": 2, "consumed": 2, "expired": 0, "max_concurrent": 2} and
          metrics_109.get("P97-06", {}).get("reservations") ==
          {"created": 2, "consumed": 1, "expired": 1, "max_concurrent": 2} and
          metrics_109.get("P97-05", {}).get("reentries") == 2,
          "109 stacked reservations and reentries")
    proxy_109_tool_tree = ast.parse(proxy_109_tool.read_text())
    proxy_109_test_tree = ast.parse(proxy_109_test.read_text())
    proxy_109_functions = {
        node.name for node in proxy_109_tool_tree.body if isinstance(node, ast.FunctionDef)
    }
    check({"build_same_name_two_suite", "validate_same_name_two_suite",
           "validate_materialized_suite", "write_same_name_two_suite", "main"} <=
          proxy_109_functions,
          "109 same-name-two materializer public functions")
    proxy_109_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_109_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_109_test_count == 7, "109 same-name-two test count")
    proxy_109_doc_text = proxy_109_doc.read_text()
    check("独立した勝率・先後差・発動率・カード強度の結論には数えない" in
          proxy_109_doc_text and
          "完全なカード効果エンジンや完全自動合法性判定ではない" in
          proxy_109_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_109_doc_text,
          "109 result and scope boundaries")

# 110 connects the six 101 board-combination fixtures to fixed completed records.
proxy_110_doc = DOCS / "110-board-combination-pilots.md"
proxy_110_plan_path = DOCS / "data/proxy-board-combination-plan-110-20260918.json"
proxy_110_records_path = DOCS / "data/proxy-matches-110"
proxy_110_traces_path = DOCS / "data/proxy-decision-traces-110"
proxy_110_evaluation_path = DOCS / "data/proxy-board-combination-evaluation-110-20260918.json"
proxy_110_tool = DOCS / "tools/proxy_board_combination_pilots.py"
proxy_110_test = DOCS / "tools/test_proxy_board_combination_pilots.py"
for path, label in (
    (proxy_110_doc, "110 board-combination document"),
    (proxy_110_plan_path, "110 board-combination plan"),
    (proxy_110_records_path, "110 completed record output"),
    (proxy_110_traces_path, "110 decision trace output"),
    (proxy_110_evaluation_path, "110 evaluation output"),
    (proxy_110_tool, "110 board-combination materializer"),
    (proxy_110_test, "110 board-combination tests"),
):
    check(path.exists(), f"{label} exists")
if all(path.exists() for path in (
        proxy_110_doc, proxy_110_plan_path, proxy_110_records_path,
        proxy_110_traces_path, proxy_110_evaluation_path,
        proxy_110_tool, proxy_110_test)):
    proxy_110_plan = json.loads(proxy_110_plan_path.read_text())
    proxy_110_record_files = sorted(proxy_110_records_path.glob("*.json"))
    proxy_110_trace_files = sorted(proxy_110_traces_path.glob("*.json"))
    proxy_110_records = [json.loads(path.read_text()) for path in proxy_110_record_files]
    proxy_110_traces = [json.loads(path.read_text()) for path in proxy_110_trace_files]
    proxy_110_evaluation = json.loads(proxy_110_evaluation_path.read_text())
    check(proxy_110_plan.get("schema") ==
          "naotocchi.card_game.proxy_board_combination_plan.v1" and
          proxy_110_plan.get("design", {}).get("rules_commit") ==
          "370708a36d21ab13d00edbaf4c6b45f04a319b0f" and
          proxy_110_plan.get("design", {}).get("rules_tree") ==
          "47abe8f5156e29751e420cbdba8dbe4d31e5ae6b" and
          proxy_110_plan.get("scope", {}).get("completed_match_count") == 6 and
          proxy_110_plan.get("scope", {}).get("may_count_as_independent_balance_sample") is False,
          "110 approved plan baseline and scope")
    expected_110_records = {
        f"{row.get('record_match_id')}.json" for row in proxy_110_plan.get("matches", [])
    }
    expected_110_traces = {
        f"{row.get('trace_id')}.json" for row in proxy_110_plan.get("matches", [])
    }
    check({path.name for path in proxy_110_record_files} == expected_110_records and
          {path.name for path in proxy_110_trace_files} == expected_110_traces and
          len(proxy_110_records) == len(proxy_110_traces) == 6,
          "110 exact completed record and trace files")
    records_110 = {row.get("match_id"): row for row in proxy_110_records}
    traces_110 = {row.get("record_match_id"): row for row in proxy_110_traces}
    for spec in proxy_110_plan.get("matches", []):
        match_id = spec.get("record_match_id")
        record = records_110.get(match_id, {})
        trace = traces_110.get(match_id, {})
        source = json.loads((proxy_110_plan_path.parent /
                             spec.get("source_fixture", "missing")).read_text())
        source_maps = {
            player.get("player_id"): {
                row.get("initial_instance_id"): (row.get("card_copy_id"), row.get("card_id"))
                for row in player.get("deck_order_top_to_bottom", [])
            } for player in source.get("input", {}).get("players", [])
        }
        record_maps = {
            player.get("player_id"): {
                row.get("initial_instance_id"): (row.get("card_copy_id"), row.get("card_id"))
                for row in player.get("deck_order_top_to_bottom", [])
            } for player in record.get("input", {}).get("players", [])
        }
        check(source_maps == record_maps, f"110 physical-card identity preserved: {match_id}")
        recorded = record.get("record", {})
        events = recorded.get("events", [])
        decisions = trace.get("decisions", [])
        snapshots = trace.get("snapshots", [])
        check(recorded.get("status") == "completed" and
              recorded.get("result", {}).get("rounds_completed") == 10 and
              len(snapshots) == len(events) + 1 and
              [row.get("event_seq") for row in snapshots] == list(range(len(events) + 1)),
              f"110 completed result and contiguous trace: {match_id}")
        check(all("pass" in [candidate.get("kind") for candidate in
                              decision.get("legal_candidates", [])] and
                  "opponent_hand" not in decision.get("public_information", {}) and
                  "opponent_deck" not in decision.get("public_information", {})
                  for decision in decisions),
              f"110 decision and hidden-information boundary: {match_id}")
    metrics_110 = {row.get("cluster"): row for row in
                   proxy_110_evaluation.get("matches", [])}
    check(proxy_110_evaluation.get("schema") ==
          "naotocchi.card_game.proxy_board_combination_evaluation.v1" and
          proxy_110_evaluation.get("completed_match_count") == 6 and
          proxy_110_evaluation.get("independent_balance_sample_count") == 0 and
          proxy_110_evaluation.get("unresolved_decisions") == 0 and
          proxy_110_evaluation.get("structural_input_gap_count") == 6 and
          [row.get("legal_candidate_count") for row in
           proxy_110_evaluation.get("matches", [])] == [222, 216, 257, 224, 168, 163] and
          [row.get("selected_action_count") for row in
           proxy_110_evaluation.get("matches", [])] == [11, 10, 9, 12, 7, 7],
          "110 evaluation counts and zero independent sample")
    check(metrics_110.get("P97-06", {}).get("reservations") ==
          {"created": 3, "consumed": 3, "expired": 0, "max_concurrent": 3} and
          any(row.get("card_id") == "G-jump-quest" and
              row.get("missing_requirement") == "two_time_skips_in_same_turn"
              for row in metrics_110.get("P97-05", {}).get("structural_input_gaps", [])) and
          metrics_110.get("P97-04", {}).get("counts_toward_current_452") is False,
          "110 reservations, jump-quest gap and separate item stratum")
    p97_04_record = records_110.get("completed-110-p97-04-board-combination", {})
    p97_04_events = p97_04_record.get("record", {}).get("events", [])
    air_hockey = next((row for row in p97_04_events
                       if row.get("action_type") == "play_air_hockey"), {})
    opponent_play = next((row for row in p97_04_events
                          if row.get("action_type") ==
                          "opponent_immediate_play_during_challenge"), {})
    check(opponent_play.get("actor") == "B" and
          air_hockey.get("chain", {}).get("responds_to_seq") == opponent_play.get("seq") and
          air_hockey.get("chain", {}).get("link_index") == 3 and
          "current-452" not in p97_04_record.get("test_plan", {}).get("strata", []),
          "110 air-hockey response chain")
    proxy_110_tool_tree = ast.parse(proxy_110_tool.read_text())
    proxy_110_test_tree = ast.parse(proxy_110_test.read_text())
    proxy_110_functions = {
        node.name for node in proxy_110_tool_tree.body if isinstance(node, ast.FunctionDef)
    }
    check({"build_board_combination_suite", "validate_board_combination_suite",
           "validate_materialized_suite", "write_board_combination_suite", "main"} <=
          proxy_110_functions,
          "110 board-combination materializer public functions")
    proxy_110_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_110_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_110_test_count == 7, "110 board-combination test count")
    proxy_110_doc_text = proxy_110_doc.read_text()
    check("独立した勝率・先後差・発動率・カード強度の結論には数えない" in
          proxy_110_doc_text and
          "完全なカード効果エンジンや完全自動合法性判定ではない" in
          proxy_110_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_110_doc_text,
          "110 result and scope boundaries")

# 111 classifies the six structural gaps without creating fixtures or matches.
proxy_111_doc = DOCS / "111-structural-gap-disposition-and-repetition-scope.md"
proxy_111_data = DOCS / "data/proxy-gap-disposition-111-20260918.json"
proxy_111_tool = DOCS / "tools/proxy_gap_disposition.py"
proxy_111_test = DOCS / "tools/test_proxy_gap_disposition.py"
for path, label in [
    (proxy_111_doc, "111 structural-gap disposition document"),
    (proxy_111_data, "111 structural-gap disposition data"),
    (proxy_111_tool, "111 structural-gap disposition validator"),
    (proxy_111_test, "111 structural-gap disposition tests"),
]:
    check(path.exists(), f"Missing {label}: {path.relative_to(ROOT)}")
if all(path.exists() for path in
       (proxy_111_doc, proxy_111_data, proxy_111_tool, proxy_111_test)):
    proxy_111 = json.loads(proxy_111_data.read_text())
    gaps_111 = proxy_111.get("gaps", [])
    check(proxy_111.get("schema") ==
          "naotocchi.card_game.proxy_gap_disposition.v1" and
          proxy_111.get("checkpoint") == 111 and len(gaps_111) == 6 and
          len({row.get("card_id") for row in gaps_111}) == 6,
          "111 exact six structural-gap dispositions")
    check([row.get("fixture_group") for row in gaps_111].count("targeted-short") == 2 and
          [row.get("fixture_group") for row in gaps_111].count("evolution-path") == 4 and
          all(row.get("disposition") == "requires-targeted-fixture" and
              row.get("planned_checkpoint") == 112 for row in gaps_111),
          "111 two short and four evolution fixture plans")
    scope_111 = proxy_111.get("scope", {})
    repetition_111 = proxy_111.get("normal_decision_repetition", {})
    check(scope_111.get("fixture_created_count") == 0 and
          scope_111.get("completed_match_count") == 0 and
          scope_111.get("independent_balance_sample_count") == 0 and
          scope_111.get("changes_card_pool") is False,
          "111 creates no fixture, match, sample or card-pool change")
    check(repetition_111.get("first_batch_match_count") == 4 and
          repetition_111.get("independent_initial_orders") == 2 and
          repetition_111.get("mirror_first_player_for_each_order") is True and
          repetition_111.get("start_after_checkpoint") == 112 and
          repetition_111.get("may_count_as_strength_conclusion") is False,
          "111 four-match normal-decision repetition boundary")
    proxy_111_tool_tree = ast.parse(proxy_111_tool.read_text())
    proxy_111_test_tree = ast.parse(proxy_111_test.read_text())
    proxy_111_functions = {
        node.name for node in proxy_111_tool_tree.body if isinstance(node, ast.FunctionDef)
    }
    check({"build_gap_disposition", "validate_gap_disposition",
           "write_gap_disposition", "validate_materialized_disposition",
           "main"} <= proxy_111_functions,
          "111 disposition validator public functions")
    proxy_111_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_111_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_111_test_count == 8, "111 structural-gap test count")
    proxy_111_validation = subprocess.run(
        [sys.executable, str(proxy_111_tool)], capture_output=True, text=True,
        check=False)
    check(proxy_111_validation.returncode == 0,
          f"111 canonical validator: {proxy_111_validation.stdout}"
          f"{proxy_111_validation.stderr}")

# 112 materializes exactly six current-452 prerequisite fixtures, not matches.
proxy_112_doc = DOCS / "112-targeted-structural-gap-fixtures.md"
proxy_112_plan_path = DOCS / "data/proxy-gap-fixture-plan-112-20260918.json"
proxy_112_fixtures_path = DOCS / "data/proxy-gap-fixtures-112"
proxy_112_tool = DOCS / "tools/proxy_gap_fixture_builder.py"
proxy_112_test = DOCS / "tools/test_proxy_gap_fixture_builder.py"
for path, label in [
    (proxy_112_doc, "112 targeted fixture document"),
    (proxy_112_plan_path, "112 targeted fixture plan"),
    (proxy_112_fixtures_path, "112 targeted fixture output"),
    (proxy_112_tool, "112 targeted fixture builder"),
    (proxy_112_test, "112 targeted fixture tests"),
]:
    check(path.exists(), f"Missing {label}: {path.relative_to(ROOT)}")
if all(path.exists() for path in
       (proxy_112_doc, proxy_112_plan_path, proxy_112_fixtures_path,
        proxy_112_tool, proxy_112_test)):
    proxy_112_plan = json.loads(proxy_112_plan_path.read_text())
    proxy_112_specs = proxy_112_plan.get("fixtures", [])
    proxy_112_files = sorted(proxy_112_fixtures_path.glob("*.json"))
    proxy_112_records = [json.loads(path.read_text()) for path in proxy_112_files]
    check(proxy_112_plan.get("schema") ==
          "naotocchi.card_game.proxy_gap_fixture_plan.v1" and
          proxy_112_plan.get("checkpoint") == 112 and
          len(proxy_112_specs) == 6 and
          [row.get("fixture_group") for row in proxy_112_specs].count("targeted-short") == 2 and
          [row.get("fixture_group") for row in proxy_112_specs].count("evolution-path") == 4,
          "112 exact six targeted fixture specifications")
    scope_112 = proxy_112_plan.get("scope", {})
    interpretation_112 = proxy_112_plan.get("interpretation", {})
    check(scope_112.get("fixture_count") == 6 and
          scope_112.get("completed_match_count") == 0 and
          scope_112.get("independent_balance_sample_count") == 0 and
          scope_112.get("changes_card_pool") is False and
          interpretation_112.get("counts_as_completed_match") is False and
          interpretation_112.get("counts_as_activation_zero") is False and
          interpretation_112.get("counts_as_strength_evidence") is False and
          interpretation_112.get("targeted_execution_checkpoint") is None,
          "112 unplayed and unassigned execution boundary")
    expected_112_files = {
        f"{row.get('fixture_id')}.json" for row in proxy_112_specs
    }
    check({path.name for path in proxy_112_files} == expected_112_files and
          len(proxy_112_records) == 6,
          "112 exact materialized fixture files")
    records_112 = {row.get("match_id"): row for row in proxy_112_records}
    for spec in proxy_112_specs:
        match_id = spec.get("fixture_id")
        record = records_112.get(match_id, {})
        source = json.loads((proxy_112_plan_path.parent /
                             spec.get("source_fixture", "")).read_text())
        source_players = {
            row.get("player_id"): row for row in source.get("input", {}).get("players", [])
        }
        record_players = {
            row.get("player_id"): row for row in record.get("input", {}).get("players", [])
        }
        source_maps = {
            player_id: [(row.get("card_copy_id"), row.get("initial_instance_id"))
                        for row in player.get("deck_order_top_to_bottom", [])]
            for player_id, player in source_players.items()
        }
        record_maps = {
            player_id: [(row.get("card_copy_id"), row.get("initial_instance_id"))
                        for row in player.get("deck_order_top_to_bottom", [])]
            for player_id, player in record_players.items()
        }
        check(source_maps == record_maps,
              f"112 physical-card identity preserved: {match_id}")
        all_cards = [
            card for player in record_players.values()
            for card in player.get("deck_order_top_to_bottom", [])
        ]
        check(record.get("record", {}).get("status") == "fixture" and
              record.get("record", {}).get("events") == [] and
              record.get("record", {}).get("result", {}).get("winner") is None and
              len(all_cards) == 80 and
              {card.get("card_id") for card in all_cards} <= set(revision_96_catalog),
              f"112 unplayed current-452 fixture: {match_id}")
    proxy_112_tool_tree = ast.parse(proxy_112_tool.read_text())
    proxy_112_test_tree = ast.parse(proxy_112_test.read_text())
    proxy_112_functions = {
        node.name for node in proxy_112_tool_tree.body if isinstance(node, ast.FunctionDef)
    }
    check({"build_gap_fixtures", "validate_gap_fixtures",
           "write_gap_fixtures", "validate_materialized_fixtures",
           "main"} <= proxy_112_functions,
          "112 targeted fixture builder public functions")
    proxy_112_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_112_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_112_test_count == 9, "112 targeted fixture test count")
    if "--catalog" not in sys.argv:
        proxy_112_validation = subprocess.run(
            [sys.executable, str(proxy_112_tool)], capture_output=True, text=True,
            check=False)
        check(proxy_112_validation.returncode == 0,
              f"112 canonical fixture validator: {proxy_112_validation.stdout}"
              f"{proxy_112_validation.stderr}")
    proxy_112_doc_text = proxy_112_doc.read_text()
    check("completed対戦・発動率0・カード強度の証拠には数えない" in
          proxy_112_doc_text and
          "対戦エンジン化、合法性の完全自動判定" in proxy_112_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_112_doc_text,
          "112 scope and interpretation boundaries")

# 113 applies the 111 stop condition before materializing invalid repetition records.
proxy_113_doc = DOCS / "113-normal-decision-admission-audit.md"
proxy_113_plan_path = DOCS / "data/proxy-normal-decision-admission-plan-113-20260918.json"
proxy_113_audit_path = DOCS / "data/proxy-normal-decision-admission-113-20260918.json"
proxy_113_tool = DOCS / "tools/proxy_normal_decision_admission.py"
proxy_113_test = DOCS / "tools/test_proxy_normal_decision_admission.py"
for path, label in [
    (proxy_113_doc, "113 normal-decision admission document"),
    (proxy_113_plan_path, "113 normal-decision admission plan"),
    (proxy_113_audit_path, "113 normal-decision admission audit"),
    (proxy_113_tool, "113 admission validator"),
    (proxy_113_test, "113 admission tests"),
]:
    check(path.exists(), f"Missing {label}: {path.relative_to(ROOT)}")
if all(path.exists() for path in
       (proxy_113_doc, proxy_113_plan_path, proxy_113_audit_path,
        proxy_113_tool, proxy_113_test)):
    proxy_113_plan = json.loads(proxy_113_plan_path.read_text())
    proxy_113_audit = json.loads(proxy_113_audit_path.read_text())
    check(proxy_113_plan.get("checkpoint") == 113 and
          len(proxy_113_plan.get("orders", [])) == 2 and
          proxy_113_plan.get("planned_match_count") == 4,
          "113 two deferred orders and four planned matches")
    blocker_ids_113 = {row.get("blocker_id")
                       for row in proxy_113_audit.get("blockers", [])}
    check(proxy_113_audit.get("status") == "blocked_by_protocol_admission" and
          proxy_113_audit.get("stop_required") is True and
          proxy_113_audit.get("fixture_count") == 0 and
          proxy_113_audit.get("completed_match_count") == 0 and
          proxy_113_audit.get("independent_balance_sample_count") == 0 and
          blocker_ids_113 == {"candidate-coverage-incomplete",
                              "pre-decision-schema-mismatch",
                              "priority-comparison-unresolved"},
          "113 admission stop and exact three blockers")
    check(proxy_113_audit.get("deferred_batch", {}).get("planned_match_count") == 4 and
          proxy_113_audit.get("deferred_batch", {}).get("orders_materialized") is False and
          proxy_113_audit.get("checkpoint_112", {}).get("completed_in_113") == 0 and
          proxy_113_audit.get("checkpoint_112", {}).get("status") ==
          "unchanged_unplayed",
          "113 deferred batch and unchanged 112 boundary")
    proxy_113_tool_tree = ast.parse(proxy_113_tool.read_text())
    proxy_113_test_tree = ast.parse(proxy_113_test.read_text())
    proxy_113_functions = {
        node.name for node in proxy_113_tool_tree.body if isinstance(node, ast.FunctionDef)
    }
    check({"build_admission_audit", "validate_admission_audit",
           "write_admission_audit", "validate_materialized_audit", "main"} <=
          proxy_113_functions,
          "113 admission validator public functions")
    proxy_113_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_113_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_113_test_count == 7, "113 normal-decision admission test count")
    if "--catalog" not in sys.argv:
        proxy_113_validation = subprocess.run(
            [sys.executable, str(proxy_113_tool)], capture_output=True, text=True,
            check=False)
        check(proxy_113_validation.returncode == 0,
              f"113 canonical admission validator: {proxy_113_validation.stdout}"
              f"{proxy_113_validation.stderr}")
    proxy_113_doc_text = proxy_113_doc.read_text()
    check("fixture数、completed対戦数、独立balance標本数はすべて0" in
          proxy_113_doc_text and "予定4戦はdeferred" in proxy_113_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_113_doc_text,
          "113 stop and scope boundaries")

# 114 resolves the three admission blockers without materializing any match.
proxy_114_doc = DOCS / "114-normal-decision-protocol-hardening.md"
proxy_114_table_path = DOCS / "data/proxy-normal-decision-candidate-table-114-20260918.json"
proxy_114_contract_path = DOCS / "data/proxy-normal-decision-hardening-114-20260918.json"
proxy_114_tool = DOCS / "tools/proxy_normal_decision_hardening.py"
proxy_114_test = DOCS / "tools/test_proxy_normal_decision_hardening.py"
for path, label in [
    (proxy_114_doc, "114 normal-decision hardening document"),
    (proxy_114_table_path, "114 manual candidate table"),
    (proxy_114_contract_path, "114 hardening contract"),
    (proxy_114_tool, "114 hardening validator"),
    (proxy_114_test, "114 hardening tests"),
]:
    check(path.exists(), f"Missing {label}: {path.relative_to(ROOT)}")
if all(path.exists() for path in
       (proxy_114_doc, proxy_114_table_path, proxy_114_contract_path,
        proxy_114_tool, proxy_114_test)):
    proxy_114_table = json.loads(proxy_114_table_path.read_text())
    proxy_114_contract = json.loads(proxy_114_contract_path.read_text())
    proxy_114_ids = [row.get("card_id") for row in proxy_114_table.get("cards", [])]
    proxy_114_types = {row.get("card_type") for row in proxy_114_table.get("cards", [])}
    check(len(proxy_114_ids) == len(set(proxy_114_ids)) == 41,
          "114 exact 41 unique card IDs")
    check(proxy_114_types == {"main", "companion", "partner", "world", "play", "item", "event"},
          "114 all seven card types")
    check(proxy_114_table.get("standing_candidates") == [{
        "candidate_id": "candidate-pass", "kind": "pass", "action_type": "pass",
        "timing": "normal_action_opportunity", "base_time_cost": 0}],
        "114 standing pass candidate")
    check(proxy_114_table.get("preserved_existing_candidate_families") == [
              "challenge_power_or_wisdom", "relationship_progress"],
          "114 preserved challenge and relationship candidate families")
    check(proxy_114_contract.get("checkpoint") == 114 and
          proxy_114_contract.get("status") == "protocol_hardened_no_matches" and
          proxy_114_contract.get("resolved_blockers") == [
              "candidate-coverage-incomplete", "pre-decision-schema-mismatch",
              "priority-comparison-unresolved"],
          "114 resolves exact three admission blockers")
    schema_114 = proxy_114_contract.get("decision_schema", {})
    check(set(schema_114.get("pre_decision_state_required_and_allowed_keys", [])) ==
          {"hand", "board", "time", "growth", "reservations"} and
          schema_114.get("information_policy") == "public_and_owner_known_only",
          "114 strict nested decision schema and information policy")
    comparison_114 = proxy_114_contract.get("comparison", {})
    check(comparison_114.get("priority_order") == [
              "avoid_loss_or_abort", "maintain_or_prevent_100",
              "certain_growth_difference", "time_after_certain_resolution",
              "hand_board_reservation_value"] and
          comparison_114.get("pass_may_beat_paid_action") is True and
          comparison_114.get("value_rule") ==
              "pareto_only_otherwise_unresolved_canonical_text" and
          comparison_114.get("incomparable_is_tie") is False,
          "114 ordered comparison, paid-action boundary, and Pareto stop")
    scope_114 = proxy_114_contract.get("scope", {})
    check(all(scope_114.get(key) == 0 for key in
              ("fixture_count", "completed_match_count", "trace_count", "winner_count",
               "independent_balance_sample_count")) and
          proxy_114_contract.get("deferred_batch", {}).get("planned_match_count") == 4 and
          proxy_114_contract.get("deferred_batch", {}).get("materialized_in_114") is False,
          "114 zero match artifacts and four deferred matches")
    check(proxy_114_contract.get("checkpoint_112") == {
              "targeted_fixture_count": 6, "completed_in_114": 0,
              "status": "unchanged_unplayed"} and
          proxy_114_contract.get("population") == {
              "current_catalog": 452, "registered_candidates": 477,
              "changed_card_text_numeric_or_registration_ids": 0},
          "114 preserves 112 and population boundaries")
    proxy_114_tool_tree = ast.parse(proxy_114_tool.read_text())
    proxy_114_test_tree = ast.parse(proxy_114_test.read_text())
    proxy_114_functions = {
        node.name for node in proxy_114_tool_tree.body if isinstance(node, ast.FunctionDef)
    }
    check({"source_card_ids", "validate_candidate_table", "validate_pre_decision_state",
           "validate_public_information", "compare_candidates", "build_hardening_contract",
           "validate_hardening_contract", "write_hardening_contract",
           "validate_materialized_contract", "main"} <= proxy_114_functions,
          "114 hardening validator public functions")
    proxy_114_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_114_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_114_test_count == 13, "114 normal-decision hardening test count")
    if "--catalog" not in sys.argv:
        proxy_114_validation = subprocess.run(
            [sys.executable, str(proxy_114_tool)], capture_output=True, text=True,
            check=False)
        check(proxy_114_validation.returncode == 0,
              f"114 canonical hardening validator: {proxy_114_validation.stdout}"
              f"{proxy_114_validation.stderr}")
    proxy_114_doc_text = proxy_114_doc.read_text()
    check("41 card ID" in proxy_114_doc_text and
          "fixture・completed・trace・独立balance標本はすべて0" in proxy_114_doc_text and
          "4戦は115へdeferred" in proxy_114_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_114_doc_text,
          "114 scope and resume boundaries")

# 115 applies fixed seeded orders and stops at the first unresolved egg choice.
proxy_115_doc = DOCS / "115-normal-decision-first-choice-audit.md"
proxy_115_plan_path = DOCS / "data/proxy-normal-decision-first-choice-plan-115-20260918.json"
proxy_115_audit_path = DOCS / "data/proxy-normal-decision-first-choice-audit-115-20260918.json"
proxy_115_tool = DOCS / "tools/proxy_normal_decision_first_choice_audit.py"
proxy_115_test = DOCS / "tools/test_proxy_normal_decision_first_choice_audit.py"
for path, label in [
    (proxy_115_doc, "115 normal-decision first-choice audit document"),
    (proxy_115_plan_path, "115 first-choice plan"),
    (proxy_115_audit_path, "115 first-choice audit"),
    (proxy_115_tool, "115 first-choice validator"),
    (proxy_115_test, "115 first-choice tests"),
]:
    check(path.exists(), f"Missing {label}: {path.relative_to(ROOT)}")
if all(path.exists() for path in
       (proxy_115_doc, proxy_115_plan_path, proxy_115_audit_path,
        proxy_115_tool, proxy_115_test)):
    proxy_115_plan = json.loads(proxy_115_plan_path.read_text())
    proxy_115_audit = json.loads(proxy_115_audit_path.read_text())
    expected_seeds_115 = {
        "order-01": {"A": 50, "B": 100050},
        "order-02": {"A": 51, "B": 100051},
    }
    actual_seeds_115 = {
        order.get("order_id"): {
            player.get("player_id"): player.get("seed")
            for player in order.get("players", [])
        }
        for order in proxy_115_plan.get("orders", [])
    }
    check(proxy_115_plan.get("checkpoint") == 115 and
          proxy_115_plan.get("status") == "orders_materialized_no_match_artifacts" and
          proxy_115_plan.get("shuffle", {}).get("algorithm") ==
              "random.Random(seed).shuffle" and
          actual_seeds_115 == expected_seeds_115,
          "115 exact seeded shuffle plan")
    check(len(proxy_115_plan.get("orders", [])) == 2 and
          all(len(order.get("players", [])) == 2 and
              all(len(player.get("deck_order_top_to_bottom", [])) == 40
                  for player in order.get("players", []))
              for order in proxy_115_plan.get("orders", [])),
          "115 two orders with A/B forty-card manifests")
    paths_115 = proxy_115_audit.get("paths", [])
    check(len(paths_115) == 4 and
          {(path.get("order_id"), path.get("first_player")) for path in paths_115} == {
              ("order-01", "A"), ("order-01", "B"),
              ("order-02", "A"), ("order-02", "B")} and
          all(path.get("stop") == {
              "round": 1, "phase": "egg_exchange_choice",
              "actor": path.get("first_player"),
              "reason": "egg_exchange_choice_unresolved"}
              for path in paths_115),
          "115 exact four R1 egg-choice stops")
    check(all(len(path.get("hand_before_choice", [])) == 7 and
              path.get("bottom_candidate_copy_ids") == [
                  card.get("card_copy_id")
                  for card in path.get("hand_before_choice", [])]
              for path in paths_115),
          "115 seven-card egg-bottom candidate sets")
    evidence_115 = proxy_115_audit.get("downstream_evidence", [])
    check(len(evidence_115) == 4 and
          sum(row.get("classification") ==
              "unavoidable_zero_cost_person_vs_pass" for row in evidence_115) == 3 and
          all(row.get("comparison_result", {}).get("reason") ==
              "unresolved_canonical_text" and
              row.get("counts_as_played_action") is False and
              row.get("counts_as_match_result") is False
              for row in evidence_115),
          "115 downstream zero-cost-person versus pass evidence")
    scope_115 = proxy_115_audit.get("scope", {})
    check(all(scope_115.get(key) == 0 for key in
              ("fixture_count", "completed_match_count", "trace_count", "winner_count",
               "independent_balance_sample_count")) and
          proxy_115_audit.get("checkpoint_112") == {
              "targeted_fixture_count": 6, "completed_in_115": 0,
              "status": "unchanged_unplayed"} and
          proxy_115_audit.get("population") == {
              "current_catalog": 452, "registered_candidates": 477,
              "changed_card_text_numeric_or_registration_ids": 0},
          "115 zero artifacts and preserved population boundaries")
    proxy_115_tool_tree = ast.parse(proxy_115_tool.read_text())
    proxy_115_test_tree = ast.parse(proxy_115_test.read_text())
    proxy_115_functions = {
        node.name for node in proxy_115_tool_tree.body if isinstance(node, ast.FunctionDef)
    }
    check({"shuffle_deck", "build_first_choice_plan", "validate_first_choice_plan",
           "order_sha256", "zero_cost_people", "build_first_choice_audit",
           "validate_first_choice_audit", "write_json", "validate_materialized",
           "main"} <= proxy_115_functions,
          "115 first-choice validator public functions")
    proxy_115_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_115_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_115_test_count == 10, "115 normal-decision first-choice test count")
    if "--catalog" not in sys.argv:
        proxy_115_validation = subprocess.run(
            [sys.executable, str(proxy_115_tool)], capture_output=True, text=True,
            check=False)
        check(proxy_115_validation.returncode == 0,
              f"115 canonical first-choice validator: {proxy_115_validation.stdout}"
              f"{proxy_115_validation.stderr}")
    proxy_115_doc_text = proxy_115_doc.read_text()
    check("seed付きshuffle" in proxy_115_doc_text and
          "4経路すべてR1たまご交換で停止" in proxy_115_doc_text and
          "fixture・completed・trace・winner・独立balance標本はすべて0" in
              proxy_115_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_115_doc_text and
          "116" in proxy_115_doc_text,
          "115 stop, scope, and resume boundaries")

# 116 fixes the normal-decision fallback protocol without materializing a match.
proxy_116_doc = DOCS / "116-normal-decision-fallback-contract.md"
proxy_116_contract_path = DOCS / "data/proxy-normal-decision-fallback-contract-116-20260918.json"
proxy_116_tool = DOCS / "tools/proxy_normal_decision_fallback_contract.py"
proxy_116_test = DOCS / "tools/test_proxy_normal_decision_fallback_contract.py"
for path, label in [
    (proxy_116_doc, "116 normal-decision fallback contract document"),
    (proxy_116_contract_path, "116 fallback contract"),
    (proxy_116_tool, "116 fallback validator"),
    (proxy_116_test, "116 fallback tests"),
]:
    check(path.exists(), f"Missing {label}: {path.relative_to(ROOT)}")
if all(path.exists() for path in
       (proxy_116_doc, proxy_116_contract_path, proxy_116_tool, proxy_116_test)):
    contract_116 = json.loads(proxy_116_contract_path.read_text())
    check(contract_116.get("checkpoint") == 116 and
          contract_116.get("status") == "protocol_only_no_match_artifacts",
          "116 fallback contract identity")
    check(contract_116.get("scope") == {
        "fixture_count": 0,
        "completed_match_count": 0,
        "decision_trace_count": 0,
        "event_count": 0,
        "snapshot_count": 0,
        "winner_count": 0,
        "independent_balance_sample_count": 0,
    }, "116 zero match artifacts")
    decision_contract_116 = contract_116.get("decision_contract", {})
    check(decision_contract_116.get("required_record_fields") == [
        "decision_kind", "resolution_mode", "strategic_unresolved",
        "legal_candidates", "selected_candidate", "runner_up_candidates", "reason_code",
    ] and decision_contract_116.get("resolution_modes") == [
        "priority_unique", "safe_free_development", "seeded_fallback",
    ], "116 decision schema and three resolution modes")
    seeded_116 = contract_116.get("seeded_fallback", {})
    check(seeded_116.get("seed_material_fields") == [
        "contract_version", "order_id", "actor", "actor_turn_index", "round",
        "phase", "decision_kind", "choice_kind", "canonical_candidate_ids",
    ] and seeded_116.get("algorithm") == "sha256_modulo" and
          seeded_116.get("digest_integer") == "big_endian_unsigned" and
          seeded_116.get("selection_rule") == "digest_integer_modulo_candidate_count",
          "116 nine seed fields and SHA-256 modulo")
    safe_116 = contract_116.get("safe_free_development", {})
    check(safe_116.get("person_types") == ["companion", "partner"] and
          safe_116.get("required_conditions") == [
              "slot_empty", "actual_time_cost_zero", "no_replacement_or_zone_exit",
              "no_additional_card_consumption", "no_certain_public_downside",
              "legality_confirmed", "no_unresolved_required_choice",
          ] and safe_116.get("dominates") == "pass" and
          safe_116.get("multiple_unresolved_candidates") == "seeded_fallback",
          "116 six safe free development conditions")
    evaluation_116 = contract_116.get("evaluation", {})
    check(evaluation_116.get("exclude_from_independent_balance_when_any_positive") == [
        "strategic_unresolved_count", "seeded_fallback_count",
    ] and "independent_balance" in evaluation_116.get("excluded_evidence", []),
          "116 seeded match balance exclusion")
    check(contract_116.get("checkpoint_112") == {
        "targeted_fixture_count": 6, "completed_in_116": 0,
        "status": "unchanged_unplayed",
    } and contract_116.get("checkpoint_115") == {
        "audited_path_count": 4, "resumed_in_116": 0,
        "status": "unchanged_stopped",
    } and contract_116.get("population") == {
        "current_catalog": 452, "registered_candidates": 477,
        "changed_card_text_numeric_or_registration_ids": 0,
    } and contract_116.get("next_checkpoint") == 117,
          "116 preserved 112, 115, population, and 117 boundaries")
    proxy_116_tool_tree = ast.parse(proxy_116_tool.read_text())
    proxy_116_test_tree = ast.parse(proxy_116_test.read_text())
    proxy_116_functions = {
        node.name for node in proxy_116_tool_tree.body if isinstance(node, ast.FunctionDef)
    }
    check({"build_fallback_contract", "validate_fallback_contract", "load_json",
           "write_json", "validate_materialized", "canonical_candidate_ids",
           "build_seed_proof", "validate_safe_free_placement",
           "resolve_safe_free_development", "validate_seeded_resolution", "main"}
          <= proxy_116_functions,
          "116 fallback validator public functions")
    proxy_116_test_count = sum(
        node.name.startswith("test_") for node in ast.walk(proxy_116_test_tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    check(proxy_116_test_count == 36, "116 normal-decision fallback test count")
    if "--catalog" not in sys.argv:
        proxy_116_validation = subprocess.run(
            [sys.executable, str(proxy_116_tool)], capture_output=True, text=True,
            check=False)
        check(proxy_116_validation.returncode == 0,
              f"116 canonical fallback validator: {proxy_116_validation.stdout}"
              f"{proxy_116_validation.stderr}")
    proxy_116_doc_text = proxy_116_doc.read_text()
    check("seed抽選" in proxy_116_doc_text and
          "安全な無料盤面化" in proxy_116_doc_text and
          "対戦成果物はすべて0" in proxy_116_doc_text and
          "カード本文・数値・登録区分の変更は0件" in proxy_116_doc_text and
          "117" in proxy_116_doc_text,
          "116 protocol scope and 117 resume boundaries")
readme_116_text = (DOCS / "README.md").read_text()
readme_current_phase_116 = re.search(
    r"^## 現在フェーズと再開地点\n\n(.*?)(?=^## |\Z)", readme_116_text, re.M | re.S)
check(readme_current_phase_116 is not None and
      "[119 response-window契約](119-response-window-contract.md)" in
      readme_current_phase_116.group(1),
      "README current phase is checkpoint 119")
check("| [118](118-tokiokuri-terminology-migration.md) |" in readme_116_text,
      "README missing 118 index entry")
check("| [119](119-response-window-contract.md) |" in readme_116_text,
      "README missing 119 index entry")
readme_continuation_117 = re.search(
    r"^## この後の順序\n\n(.*?)(?=^## |\Z)", readme_116_text, re.M | re.S)
check(readme_continuation_117 is not None and re.search(
          r"117で4経路を再生し、completed 0・stopped 4・独立balance標本0を保存した。",
          readme_continuation_117.group(1)) is not None,
      "README 117 actual restart result and balance boundary")

# 117 materializes only the exact terminal artifacts proved by fixed replay.
proxy_test_count = sum(
    isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.startswith("test_")
    for path in (DOCS / "tools").glob("test_proxy_*.py")
    if path.name not in {"test_proxy_normal_action_candidate_completeness.py",
                          "test_proxy_normal_action_seeded_restart.py",
                          "test_proxy_turn_end_completeness.py",
                          "test_proxy_turn_end_provenance_restart.py",
                          "test_proxy_normal_action_extension.py",
                          "test_proxy_current_turn_end_correction.py",
                          "test_proxy_r2_candidate_extension_127.py", "test_proxy_r2_candidate_extension_128.py", "test_proxy_conditional_growth_129.py", "test_proxy_board_source_world_130.py", "test_proxy_safe_placement_mixed_131.py", "test_proxy_board_active_132.py", "test_proxy_cross_restart_133.py", "test_proxy_board_response_134.py", "test_proxy_independent_seed_probe.py", "test_proxy_start_response_138.py", "test_proxy_new_seed_normal_audit_140.py", "test_proxy_new_seed_normal_restart_141.py", "test_proxy_hit_blow_response_142.py", "test_proxy_new_seed_next_opportunities_143.py", "test_proxy_board_trigger_audit_144.py", "test_proxy_new_seed_response_restart_145.py", "test_proxy_new_seed_normal_trigger_audit_146.py", "test_proxy_new_seed_normal_restart_147.py", "test_proxy_new_seed_response_restart_148.py", "test_proxy_new_seed_turn_end_audit_149.py", "test_proxy_new_seed_turn_end_history_150.py", "test_proxy_new_seed_turn_end_restart_151.py", "test_proxy_new_seed_egg_restart_152.py", "test_proxy_new_seed_start_response_153.py", "test_proxy_new_seed_item_chain_154.py", "test_proxy_new_seed_chain_resolution_155.py", "test_proxy_new_seed_normal_audit_156.py", "test_proxy_new_seed_normal_restart_157.py", "test_proxy_new_seed_response_restart_158.py", "test_proxy_new_seed_next_audit_159.py", "test_proxy_new_seed_normal_restart_160.py", "test_proxy_new_seed_end_response_restart_161.py", "test_proxy_new_seed_turn_end_history_162.py", "test_proxy_new_seed_turn_end_audit_163.py", "test_proxy_new_seed_turn_end_restart_164.py", "test_proxy_new_seed_egg_restart_165.py", "test_proxy_new_seed_start_audit_166.py", "test_proxy_board_ability_id_167.py", "test_proxy_new_seed_start_restart_168.py", "test_proxy_new_seed_next_response_audit_169.py", "test_proxy_new_seed_next_response_restart_170.py", "test_proxy_new_seed_opportunity_audit_171.py", "test_proxy_new_seed_chain_pass_172.py", "test_proxy_new_seed_next_audit_173.py", "test_proxy_new_seed_next_restart_174.py", "test_proxy_new_seed_current_audit_175.py", "test_proxy_new_seed_current_restart_176.py", "test_proxy_new_seed_followup_audit_177.py", "test_proxy_new_seed_followup_restart_178.py", "test_proxy_new_seed_board_partner_audit_179.py", "test_proxy_new_seed_partner_followup_180.py", "test_proxy_new_seed_r2_turn_end_history_181.py", "test_proxy_new_seed_r2_boundary_audit_182.py", "test_proxy_new_seed_end_response_replay_183.py", "test_proxy_new_seed_turn_end_proof_184.py", "test_proxy_new_seed_turn_end_replay_185.py", "test_proxy_new_seed_egg_exchange_replay_186.py", "test_proxy_new_seed_start_opportunity_audit_187.py", "test_proxy_new_seed_start_choice_188.py", "test_proxy_new_seed_followup_opportunity_189.py", "test_proxy_new_seed_ability_activation_190.py", "test_proxy_new_seed_chain_normal_audit_191.py", "test_proxy_new_seed_current_choices_192.py", "test_proxy_new_seed_current_restart_193.py", "test_proxy_new_seed_followup_response_194.py", "test_proxy_new_seed_mixed_pass_195.py", "test_proxy_new_seed_ability_resolution_196.py", "test_proxy_new_seed_followup_pass_197.py", "test_proxy_new_seed_normal_audit_198.py", "test_proxy_new_seed_normal_choice_199.py", "test_proxy_new_seed_normal_pass_200.py", "test_proxy_new_seed_end_response_audit_201.py"}
    for node in ast.walk(ast.parse(path.read_text()))
)
check(proxy_test_count == 263, "120 total proxy test count")
proxy_117_doc = DOCS / "117-normal-decision-seeded-restart.md"
proxy_117_tool = DOCS / "tools/proxy_normal_decision_seeded_restart.py"
proxy_117_test = DOCS / "tools/test_proxy_normal_decision_seeded_restart.py"
proxy_117_plan = DOCS / "data/proxy-normal-decision-seeded-restart-plan-117-20260919.json"
proxy_117_evaluation = DOCS / "data/proxy-normal-decision-seeded-restart-evaluation-117-20260919.json"
for path in (proxy_117_doc, proxy_117_tool, proxy_117_test, proxy_117_plan, proxy_117_evaluation,
             DOCS / "plans/2026-09-19-normal-decision-seeded-restart-design.md",
             DOCS / "plans/2026-09-19-normal-decision-seeded-restart.md"):
    check(path.exists(), f"117 missing required file: {path.relative_to(ROOT)}")
check("| [117](117-normal-decision-seeded-restart.md) |" in readme_116_text,
      "README missing 117 index entry")
if all(path.exists() for path in (proxy_117_tool, proxy_117_test, proxy_117_plan, proxy_117_evaluation)):
    try:
        restart_117 = runpy.run_path(str(proxy_117_tool))
        inputs_117 = restart_117["load_inputs"]()
        plan_117 = json.loads(proxy_117_plan.read_text())
        suite_117 = restart_117["build_seeded_restart_suite"](plan_117, inputs_117)
        check(not restart_117["validate_seeded_restart_suite"](suite_117, plan_117, inputs_117),
              "117 canonical suite replay")
        materialized_errors_117 = restart_117["validate_materialized_suite"](suite_117, DOCS / "data")
        check(not materialized_errors_117, f"117 exact canonical manifest: {materialized_errors_117}")
        evaluation_117 = json.loads(proxy_117_evaluation.read_text())
        check(evaluation_117 == restart_117["build_evaluation"](suite_117), "117 evaluation regeneration")
        check([evaluation_117[key] for key in ("planned_route_count", "completed_route_count",
              "stopped_route_count", "independent_balance_sample_count")] == [4, 0, 4, 0],
              "117 exact four route terminal counts and balance exclusion")
        expected_paths_117 = ["order-01-a-first", "order-01-b-first", "order-02-a-first", "order-02-b-first"]
        check(list(suite_117["outcomes"]) == expected_paths_117, "117 fixed route order")
        for path_id, bottom, placement, seeded, candidates in zip(expected_paths_117,
                ["A-023", "B-022", "A-007", "B-034"],
                ["candidate-place-partner-A-017#1", "candidate-place-partner-B-017#1",
                 "candidate-place-companion-A-014#1", "candidate-place-companion-B-014#1"],
                [2, 2, 1, 2], [11, 12, 9, 12]):
            outcome = suite_117["outcomes"][path_id]
            stop = outcome["stop"]
            decisions = suite_117["replay_evidence"][path_id]["decisions"]
            check(set(outcome) == {"status", "stop", "metrics"} and
                  not restart_117["validate_stop_artifact"](stop) and stop["winner"] is None and
                  (stop["round"], stop["phase"], stop["last_valid_event_seq"]) ==
                  (1, "post_placement_response", 3), f"117 stop isolation: {path_id}")
            check([row["selected_candidate"] for row in decisions] == [bottom, placement] and
                  "pass" in decisions[1]["legal_candidates"] and
                  "candidate-pass" not in decisions[1]["legal_candidates"] and
                  all(not restart_117["validate_decision_bridge"](row, inputs_117["candidate_table"])
                      for row in decisions), f"117 R1 decisions and pass normalization: {path_id}")
            metrics = next(row for row in evaluation_117["routes"] if row["path_id"] == path_id)
            check([metrics[key] for key in ("seeded_fallback_count", "strategic_unresolved_count",
                  "legal_candidate_count", "event_count", "snapshot_count", "decision_count")]
                  == [seeded, seeded, candidates, 3, 4, 2], f"117 route metrics: {path_id}")
        check((evaluation_117["seeded_fallback_count"], evaluation_117["strategic_unresolved_count"],
               evaluation_117["unresolved_count"]) == (7, 7, 4), "117 seeded/strategic/stop totals")
        check(evaluation_117["population"] == {"current_catalog": sum(current_counts.values()),
              "registered_candidates": sum(totals), "changed_card_text_numeric_or_registration_ids": 0},
              "117 unchanged 452/477 population and zero changed IDs")
        fixtures_112 = list((DOCS / "data/proxy-gap-fixtures-112").glob("*.json"))
        check(len(fixtures_112) == 6 and all(
            (value := json.loads(path.read_text())["record"])["status"] == "fixture" and
            value["events"] == [] and value["result"]["winner"] is None for path in fixtures_112),
            "117 preserves six unplayed 112 fixtures")
        test_count_117 = sum(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and
                             node.name.startswith("test_") for node in ast.walk(ast.parse(proxy_117_test.read_text())))
        check(test_count_117 == 24, "117 dedicated test count")
        if "--catalog" not in sys.argv:
            validation_117 = subprocess.run([sys.executable, str(proxy_117_tool)], capture_output=True, text=True)
            check(validation_117.returncode == 0, f"117 CLI: {validation_117.stdout}{validation_117.stderr}")
    except (OSError, ValueError, KeyError, TypeError) as error:
        check(False, f"117 canonical check failed: {error}")
boundary_cases = re.findall(r"^\| ([ABC]\d{2}) \|", doc(93), re.M)
check(len(boundary_cases) == len(set(boundary_cases)) == 32 and set(boundary_cases) ==
      {f"A{n:02d}" for n in range(1, 9)} | {f"B{n:02d}" for n in range(1, 13)} |
      {f"C{n:02d}" for n in range(1, 13)}, "93 boundary manual case IDs")
current_2048 = re.search(r"\*\*現行2048本文:\*\*\n\n> ([^\n]+)", doc(93))
check(bool(current_2048) and bool(legacy_2048) and current_2048[1] == legacy_2048[1], "93 current 2048 mirror")
check("### 満員交代の手順（93の未記載境界補完）" in doc(1) and
      "### たまごと未解決のこいびと能力（93の接続明文化）" in doc(2) and
      "## 93の交代・たまご接続" in doc(6), "93 core boundary references")
boundary_audit = {"current_catalog_counts": current_counts, "current_catalog_total": sum(current_counts.values()),
                  "vanilla_entries": current_vanilla, "manual_case_entries": len(boundary_cases),
                  "scope": "Current catalog, not registered-population completion; manual cases are not simulated games."}

broken_links = []
for file in DOCS.rglob("*.md"):
    for target in re.findall(r"\]\(([^)]+)\)", file.read_text()):
        target = target.split("#")[0]
        if target and "://" not in target and not target.startswith("mailto:") and not (file.parent / target).exists():
            broken_links.append(f"{file.relative_to(ROOT)} -> {target}")
check(not broken_links, f"Broken local links: {broken_links}")

checkpoint_121_test = DOCS / "tools/test_proxy_normal_action_candidate_completeness.py"
checkpoint_121_tool = DOCS / "tools/proxy_normal_action_candidate_completeness.py"
checkpoint_121_test_count = sum(
    isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.startswith("test_")
    for node in ast.walk(ast.parse(checkpoint_121_test.read_text()))
) if checkpoint_121_test.is_file() else 0
checkpoint_121_valid = False
if checkpoint_121_tool.is_file():
    check_result = subprocess.run(
        [sys.executable, str(checkpoint_121_tool), "--check"],
        capture_output=True, text=True,
    )
    checkpoint_121_valid = check_result.returncode == 0
    check(checkpoint_121_valid, "121 canonical builder bytes and validator")
check(checkpoint_121_test_count >= 27, "121 dedicated test count")

result = {"proxy_test_count": proxy_test_count, "checkpoint_121": {"dedicated_test_count": checkpoint_121_test_count, "canonical_bytes_valid": checkpoint_121_valid},
                  "boundary_cross_audit": boundary_audit, "registered": {"CARD": totals[0], "HOLD": totals[1], "total": sum(totals)},
                  "games": dict(collections.Counter(g["source"] for g in games)), "main_curves": len(curves),
                  "value_10_cards": sum(10 in pair for c in curves.values() for pair in c),
                  "stage_7_to_8": dict(collections.Counter("up" if sum(c[7]) > sum(c[6]) else "down" if sum(c[7]) < sum(c[6]) else "same" for c in curves.values())),
                  "indexed_main_body_entries": indexed_count,
                  "legacy_main_body_entries": len(body_records) - indexed_count,
                  "total_main_body_entries": len(body_records), "vanilla_entries": vanilla,
                  "identical_ability_groups": duplicate_bodies,
                  "companion_body_entries": len(companion_records),
                  "companion_rarity_counts": dict(collections.Counter(r["rarity"] for r in companion_records.values())),
                  "companion_vanilla_entries": companion_vanilla,
                  "main_companion_identical_ability_groups": combined_duplicates,
                  "partner_body_entries": len(partner_records),
                  "partner_rarity_counts": dict(collections.Counter(r["rarity"] for r in partner_records.values())),
                  "partner_vanilla_entries": partner_vanilla,
                  "all_character_identical_ability_groups": all_character_duplicates,
                  "current_item_source_followup": item_audit,
                  "character_item_identical_ability_groups": all_draft_duplicates, "play_draft_followup": play_audit, "world_draft_followup": world_audit, "event_draft_followup": event_audit, "errors": errors,
                  "scope": "Source, ID, numeric curves, complete body coverage, literal mirrors and local links; not a gameplay or semantic-equivalence validator."}
if "--catalog" in sys.argv:
    result["events"] = sorted(event_records.values(), key=lambda r: r["id"])
    result["worlds"] = sorted(world_records.values(), key=lambda r: r["id"])
    result["cards"] = sorted(body_records.values(), key=lambda r: r["id"])
    result["companions"] = sorted(companion_records.values(), key=lambda r: r["id"])
    result["partners"] = sorted(partner_records.values(), key=lambda r: r["id"])
    result["items_current_source"] = sorted(item_records, key=lambda r: r["id"])
    result["play_cards"] = sorted(play_records, key=lambda r: r["id"])
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(bool(errors))
