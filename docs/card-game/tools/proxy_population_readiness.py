"""Source-pinned static readiness, not an adjudicator of played matches.

The opening theorem is bounded to the unchanged current executor/policy. It
neither runs the executor nor relabels any past or future match as excluded.
"""
import hashlib
from pathlib import Path
from proxy_population_contract import ROOT, source_path, validate_protocol, validate_manifest, load_json

PROOF_SOURCES = {
    'tools/proxy_resource_value_trajectory.py': '5a057f175317a5484e4fa31a7a3b9d53d438102076a592c056cea87e90c39245',
    'tools/proxy_continuation_batch_runner.py': '164fa89ca8503a7a59351b6625df2ba57952caddb6be131239767273d7bc7184',
    '01-core-rules.md': 'd95ee407ec1fb853a8da1102bf933a5e972e3bc6ecc0b78cfb20831e8c45ec71',
    '02-main-system.md': '6a0d04606f066f9078e88422394d3d0c5f5c6d927806bb0be99366f503af5127',
    '115-normal-decision-first-choice-audit.md': '1744396cb771160bb74d88196151fe8e35992e46ed5606f26ffbb9673959fc5c',
    '116-normal-decision-fallback-contract.md': '577dccec67343ead75aa813b464b432679927c2f4b71ed960be5058aaa3ef393',
    'tools/proxy_normal_decision_seeded_restart.py': '57a43474658ea99f1dc362882ad291fae77116762ce567a26ec21835b9977c3d',
    'tools/proxy_independent_seed_probe.py': 'c0e474874ce73d6b02ce2f0d1b91ee6556b1ad277a7cd8bb215148cd23e64ca9',
    'tools/proxy_continuation_runner.py': 'b33579d72c905f56711c0e0f008f7a70c6d3ed3aaf5e7111ba18e710c0c64402',
    'tools/proxy_continuation_choices.py': 'e2152db6a78a45b8d145d96b725eda81196ef0481c2f27c1a1415dfd046112e4',
}


def audit_opening_feasibility(contract: dict, root: Path = ROOT) -> dict:
    gaps = list(validate_protocol(contract, root)['errors'])
    for name, digest in PROOF_SOURCES.items():
        try:
            if hashlib.sha256(source_path(root, name).read_bytes()).hexdigest() != digest:
                gaps.append('opening proof source changed: ' + name)
        except (OSError, ValueError) as error:
            gaps.append('opening proof source unavailable: ' + str(error))
    # The immutable fixture proves the inventory premises, not an initial order
    # choice. No shuffle, initial-state construction, seed proof or game is run.
    if not gaps:
        fixture = load_json(source_path(root, 'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json'))
        decks = [p['deck_order_top_to_bottom'] for p in fixture['input']['players']]
        if len(decks) != 2 or any(len(d) != 40 or len({c['card_copy_id'] for c in d}) != 40 for d in decks):
            gaps.append('opening inventory premise differs')
    proven = not gaps
    return dict(schema='opening_feasibility_460.v1',
                status='proven_unavoidable_116_for_current_executor' if proven else 'unproved',
                scope='unchanged_107_inventory_and_existing_mandatory_116_executor_only',
                eligible_completion_reachable_under_current_executor=False if proven else None,
                first_choice_physical_candidates=7 if proven else None,
                required_existing_resolution='seeded_fallback' if proven else None,
                premises=[
                    '01: initial hand 5, no mulligan, first player R1 draws normally',
                    '02: initial main is egg; extra draw then one hand card to deck bottom',
                    '01: no activation interrupts time recovery through egg exchange',
                    '107: 40 distinct physical copies per deck; 5+1+1 leaves 7 choices',
                    '117.build_mandatory_choice_decision: unconditional seeded mode and strategic_unresolved true',
                    '135.run_route and continuation_runner.run_route: opening delegates to that mandatory resolver',
                    '116: any seeded OR strategically unresolved judgment excludes completed match',
                    '458/459: all planned matches/groups must be eligible for whole-set conclusion'],
                source_sha256=dict(PROOF_SOURCES), gaps=gaps,
                observed_matches=0, balance_admitted=None)


def preflight(contract: dict, manifest=None, receipt=None, root: Path = ROOT) -> dict:
    protocol = validate_protocol(contract, root)
    manifest_audit = validate_manifest(manifest, receipt, contract, root)
    opening = audit_opening_feasibility(contract, root)
    blockers = [
        'input_generation_not_authorized', 'complete_authenticated_input_lock_absent',
        'execution_not_authorized', 'generalized_execution_adapter_unavailable',
        'all_judgment_and_opportunity_validator_unavailable']
    if not protocol['valid']:
        blockers.append('invalid_protocol')
    blockers.append('unavoidable_opening_116_exclusion' if
                    opening['status'] == 'proven_unavoidable_116_for_current_executor'
                    else 'opening_feasibility_unproved')
    return dict(schema='population_preflight_460.v1', stage='preflight',
                protocol=protocol, manifest=manifest_audit, opening_feasibility=opening,
                ready_for_input_generation=False, ready_for_execution=False,
                blockers=blockers,
                planned_counts=dict(groups=200, matches=400), planned_match_ids=None,
                # No input is generated and no judgment or match is observed.
                actual_counts=dict(groups=0, matches=0, seeds=0),
                disposition_counts=dict(judgments=None,
                    matches=dict(eligible=0, excluded=0, unproved=400),
                    groups=dict(eligible=0, excluded=0, unproved=200)),
                disposition_scope='planned_unexecuted_slots_only_not_audit_of_supplied_runs',
                execution_status_counts=dict(not_executed=400),
                whole_set=dict(allowed=False, counts=None, rates=None, conclusion=None),
                diagnostic_subset=dict(label='diagnostic_subset_only', planned_denominator=400,
                    eligible_denominator=0, excluded_count=0, unproved_count=400,
                    complete_pair_count=0, single_side_count=0, numerators=None,
                    rates=None, generalizable=False),
                new_matches=0, new_replays=0, policy_promoted=False,
                independent_balance_sample_count=0, balance_admitted=None)
