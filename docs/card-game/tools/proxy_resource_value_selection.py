"""Opt-in wrapper: replay frontier proofs before delegating randomness to 116."""
import copy
import hashlib
import json
import proxy_normal_decision_fallback_contract as fallback
from proxy_resource_value_comparison import compare_problem

SCHEMA='naotocchi.card_game.resource_value_pilot_selection.v1'
POLICY_ID='resource_value_pilot_v1'
EVIDENCE_KEYS=('source_ref','state_ref','enumeration_rule')

def canonical_sha256(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()

def select_problem(problem: dict) -> dict:
    report=compare_problem(problem)
    context=copy.deepcopy(problem['seed_context'])
    errors=fallback._validate_seed_context(context)
    if errors:raise ValueError('; '.join(errors))
    if context['decision_kind']!='normal_action' or context['phase']!='normal_action':
        raise ValueError('resource pilot is only for normal action opportunities')
    evidence=problem['candidate_set_evidence']
    if any(not isinstance(evidence.get(k),str) or not evidence[k] for k in EVIDENCE_KEYS):
        raise ValueError('source, state and enumeration evidence required')
    selected=report['selected_candidate'];decision=None
    if selected is None:
        context['choice_kind']='normal_action_resource_frontier'
        frontier=report['frontier_ids'];proof=fallback.build_seed_proof(context,frontier)
        selected=proof['selected_candidate']
        decision=dict(decision_kind='normal_action',resolution_mode='seeded_fallback',
            strategic_unresolved=True,reason_code='strategic_unresolved_seeded_fallback',
            legal_candidates=copy.deepcopy(problem['legal_candidate_ids']),
            seeded_fallback_candidates=copy.deepcopy(frontier),candidate_set_complete=True,
            candidate_set_evidence={k:evidence[k] for k in EVIDENCE_KEYS},
            seed_context=context,seed_proof=proof,selected_candidate=selected,
            runner_up_candidates=[cid for cid in frontier if cid!=selected])
        errors=fallback.validate_seeded_resolution(decision)
        if errors:raise ValueError('; '.join(errors))
    return copy.deepcopy(dict(schema=SCHEMA,policy_id=POLICY_ID,
        problem_sha256=canonical_sha256(problem),view_sha256=problem['view_sha256'],
        frontier_report=report,selected_candidate=selected,
        selection_basis=report['selection_basis'],decision_record=decision))

def validate_selection(wrapper: dict, problem: dict) -> list[str]:
    try:
        expected=select_problem(problem)
        if not isinstance(wrapper,dict) or wrapper!=expected:return ['selection wrapper differs from independent frontier/seed recomputation']
        if wrapper['decision_record'] is not None:
            return fallback.validate_seeded_resolution(wrapper['decision_record'])
        return []
    except (ValueError,TypeError,KeyError) as error:
        return ['invalid selection input: '+str(error)]
