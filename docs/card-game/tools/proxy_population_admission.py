"""Read-only planned-population evidence composition, separate from execution.

Only supported source-reconstructed records can establish exclusion evidence.
Caller disposition/verified flags and historical records confer no authority.
Input provenance/lock and full rule opportunity gates remain explicit.
"""
import copy,hashlib
import proxy_population_runtime as runtime
from proxy_mandatory_policy_contract import canonical
import proxy_population_connected_entry as connected
import proxy_population_selection_basis as selection_basis
from proxy_mandatory_population_input import audit_input_bundle

DISPOSITIONS=('eligible','excluded','unproved')


def _gate(name,state='unproved',refs=(),reasons=()):
    return dict(name=name,state=state,evidence_refs=list(refs),reason_codes=list(reasons))


def _node(layer,identity,gates,exclusions=(),gaps=(),children=()):
    exclusions=list(exclusions);gaps=list(gaps);children=list(children)
    for child in children:
        exclusions.extend(child['exclusions']);gaps.extend(child['gaps'])
    exclusions=list(dict.fromkeys(exclusions));gaps=list(dict.fromkeys(gaps))
    status='excluded' if exclusions else 'unproved' if gaps or any(g['state']!='verified' for g in gates) or any(c['disposition']!='eligible' for c in children) else 'eligible'
    return dict(layer=layer,id=identity,disposition=status,gates=gates,exclusions=exclusions,gaps=gaps,children=children)


def _judgment(record,identity,source_ref,policy_entries_verified=False):
    # Internal only: caller records reach here after full adapter reconstruction.
    local=record.get('local_policy_evidence') if record.get('decision_kind')=='mandatory_choice' else None
    fallback=runtime._evaluate(record)['legacy_116']=='excluded'
    refs=[source_ref,'tools/proxy_population_connected_entry.py']
    local_verified=bool(local) and policy_entries_verified
    computation=selection_basis.audit(record) if not local and not fallback else None
    computation_verified=computation is not None and computation['selection_computation_verified']
    gaps=[] if local_verified else ['complete_legal_set_and_information_cross_audit_pending']
    exclusions=['authenticated_116:'+identity] if fallback else []
    gates=[_gate('identity_and_origin','verified',refs),
           _gate('complete_legal_set_and_allowed_information','verified' if local_verified else 'unproved',refs+['tools/proxy_mandatory_choice_boundary.py','tools/proxy_population_policy_journal.py'] if local_verified else [],gaps),
           _gate('record_and_continuation_linkage','verified',refs)]
    if fallback:
        gates.append(_gate('permitted_selection_basis','contradicted',refs+['116-normal-decision-fallback-contract.md'],['authenticated_legacy_fallback_or_strategic_unresolved']))
    else:
        gap='precommitted_policy_input_unverified' if local else 'existing_selection_basis_cross_audit_pending'
        gaps.append(gap);gates.append(_gate('permitted_selection_basis',reasons=[gap]))
    gates.append(_gate('legacy_116_status','contradicted' if fallback else 'verified' if local_verified else 'unproved',refs if fallback or local_verified else [],['legacy_116_exclusion'] if fallback else ['distinct_designated_policy_not_116_negative'] if local_verified else ['absence_not_promoted_to_negative_proof']))
    result=_node('judgment',identity,gates,exclusions,gaps)
    result.update(selection_kind='legacy_116' if fallback else 'designated_policy' if local else 'existing_contract',
        strategic_unproven=local.get('strategic_unproven') if local else record.get('strategic_unproven'),
        local_policy_reconstruction_verified=local_verified,old_116_applicability='applicable_excluded' if fallback else 'outside_designated_policy_contract' if local_verified else 'unproved',policy_eligible=None,balance_admitted=None,
        selection_computation=computation,selection_computation_bound_to_reconstructed_record=computation_verified)
    return result


def audit_match(attempts,bundle,match_id):
    if type(attempts) is not list or any(type(a) is not dict for a in attempts):raise ValueError('attempts must be dictionaries')
    gaps=['input_lock_unauthenticated','generation_provenance_unverified','all_rule_opportunities_unproved']
    children=[];verified=[];exclusions=[]
    for index,record in enumerate(attempts):
        identity=match_id+':attempt:'+str(index+1)
        if record.get('schema')!='bound_population_connected_runtime.v1':
            children.append(_node('attempt',identity,[_gate('source_reconstruction')],gaps=['unsupported_or_historical_record_schema']));continue
        try:
            limit=record.get('reconstruction_step_limit')
            if type(limit) is not int or not 1<=limit<=512:raise ValueError('saved reconstruction boundary absent or invalid')
            expected=connected.reconstruct(bundle,match_id,limit)
            if canonical(record)!=canonical(expected):raise ValueError('source_reconstruction_mismatch')
        except (ValueError,KeyError,TypeError,OSError) as error:
            children.append(_node('attempt',identity,[_gate('source_reconstruction')],gaps=['source_reconstruction_mismatch',str(error)]));continue
        verified.append(record);ref='sha256:'+hashlib.sha256(canonical(record)).hexdigest()
        local=record['opening']['mandatory_record']['local_record']
        opening=dict(decision_kind='mandatory_choice',resolution_mode=local['selection_basis'],local_policy_evidence=local,strategic_unproven=local['strategic_unproven'])
        judgments=[_judgment(d,identity+':judgment:'+str(n),ref,expected.get('mandatory_policy_entry_audit',{}).get('local_entries_verified') is True) for n,d in enumerate([opening]+record['runtime']['decisions'])]
        missing=[] if record['completed'] else ['match_not_completed']
        coverage=record['runtime'].get('supported_trigger_coverage',{})
        if coverage.get('covered') is not True:missing.append('supported_trigger_occurrences_incomplete')
        # A supported-trigger check is narrower than all rule opportunities.
        children.append(_node('attempt',identity,[_gate('source_reconstruction','verified',[ref]),
            _gate('completed','verified' if record['completed'] else 'unproved',[ref] if record['completed'] else [],missing)],gaps=missing,children=judgments))
    completed=[r for r in verified if r['completed']]
    if len({canonical(r['runtime']) for r in completed})>1:exclusions.append('conflicting_authenticated_completed_attempts')
    if len({r['connected_tools_sha256'] for r in verified})>1:exclusions.append('authenticated_execution_edition_mismatch')
    if not attempts:gaps.append('not_executed')
    completion_reasons=list(exclusions)
    if not completed:completion_reasons.append('no_authenticated_completed_attempt')
    if len(verified)!=len(attempts):completion_reasons.append('unverified_attempts_retained')
    completion_state='contradicted' if exclusions else 'unproved' if completion_reasons else 'verified'
    completion_refs=['sha256:'+hashlib.sha256(canonical(r)).hexdigest() for r in completed]
    gates=[_gate(n,reasons=[n+'_unproved']) for n in ('input_and_edition_lock','all_judgments','all_rule_opportunities')]
    gates.append(_gate('completed_source_replay',completion_state,completion_refs,completion_reasons))
    node=_node('match',match_id,gates,exclusions,gaps,children)
    node.update(execution_status='completed' if completed else 'incomplete' if verified else 'not_executed' if not attempts else 'record_unverified',attempt_count=len(attempts),source_reconstructed_attempt_count=len(verified),policy_eligible=None,balance_admitted=None,
                opportunity_scope='existing_executor_only')
    return node


def audit_population(bundle,runs):
    if type(bundle) is not dict or type(runs) is not list or any(type(r) is not dict for r in runs):raise ValueError('population input types differ')
    checked=audit_input_bundle(bundle);valid=checked['structure_verified'];gaps=[];matches=[];groups=[];unplanned=[]
    if not valid:gaps.append('invalid_manifest_structure')
    else:
        attempts={row['match_id']:[] for row in bundle['matches']}
        for index,run in enumerate(runs):
            binding=run.get('binding');mid=binding.get('match_id') if type(binding) is dict else None
            if type(mid) is not str or mid not in attempts:unplanned.append(index)
            else:attempts[mid].append(run)
        if unplanned:gaps.append('unplanned_attempts')
        matches=[audit_match(attempts[row['match_id']],bundle,row['match_id']) for row in bundle['matches']]
        byid={m['id']:m for m in matches}
        for group in bundle['groups']:
            rows=[row for row in bundle['matches'] if row['group_id']==group['group_id']]
            groups.append(_node('group',group['group_id'],[_gate('both_fixed_mirror_sides',reasons=['match_admission_required'])],children=[byid[row['match_id']] for row in rows]))
    node=_node('population',bundle.get('protocol_id','unverified_population'),[_gate('all_planned_rows',reasons=['whole_set_admission_unproved'])],gaps=gaps,children=groups)
    counts={layer:{d:sum(n['disposition']==d for n in nodes) for d in DISPOSITIONS} for layer,nodes in [('matches',matches),('groups',groups)]}
    if not valid:counts=dict(matches=dict(eligible=0,excluded=0,unproved=400),groups=dict(eligible=0,excluded=0,unproved=200))
    statuses={s:sum(m['execution_status']==s for m in matches) for s in ('not_executed','record_unverified','incomplete','completed')}
    node.update(schema='policy_population_admission.v1',manifest_structure_verified=valid,manifest_errors=copy.deepcopy(checked['errors']),
        planned_counts=dict(groups=200,matches=400),matches=matches,groups=groups,disposition_counts=counts,
        execution_status_counts=statuses,unplanned_attempt_indices=unplanned,unresolved_planned_slots=0 if valid else 400,
        whole_set=dict(allowed=False,counts=None,rates=None,conclusion=None),
        diagnostic_subset=dict(label='diagnostic_subset_only',planned_denominator=400,eligible_denominator=0,
            excluded_count=counts['matches']['excluded'],unproved_count=counts['matches']['unproved'],complete_pair_count=0,single_side_count=0,numerators=None,rates=None,generalizable=False),
        ready_for_execution=False,ready_for_input_generation=False,policy_promoted=False,independent_balance_samples=0,balance_admitted=None)
    return node
