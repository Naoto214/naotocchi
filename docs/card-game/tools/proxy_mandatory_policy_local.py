"""MRP dispatch and audit for a supplied local rule entry, not a match record."""
import copy
import hashlib
from proxy_mandatory_policy_contract import ROOT, canonical
from proxy_mandatory_policy_random import build_proof
from proxy_mandatory_choice_boundary import prepare, apply_choice

GAPS = ('input_lock_unauthenticated','policy_root_provenance_unverified',
        'origin_obligation_ledger_unverified','entry_state_provenance_unverified',
        'activation_and_information_permission_unverified',
        'global_transition_instance_event_hash_unverified','whole_match_and_population_unverified')


def build_local_record(frame, root_hex, context, root=ROOT):
    boundary=prepare(frame,root)
    if not boundary['candidate_ids']:
        raise ValueError('no mandatory selection: '+boundary['no_choice_reason'])
    arithmetic=build_proof(root_hex,context,boundary['candidate_ids'])
    address=context['opportunity_address']
    if context['owner']!=frame['actor'] or address[0]!=frame['game_state']['turn_player'] or address[5]!=frame['choice_contract_id']:
        raise ValueError('context and local entry differ')
    # Validation of turn counts/origin ordinals needs the future obligation ledger.
    application=apply_choice(frame,arithmetic['selected_candidate'],root)
    return dict(schema='mandatory_local_policy_record_465.v1',decision_kind='mandatory_choice',
                context=copy.deepcopy(context),entry_sha256=hashlib.sha256(canonical(frame)).hexdigest(),
                supplied_root_commitment=hashlib.sha256(bytes.fromhex(root_hex)).hexdigest(),
                arithmetic_proof=arithmetic,application=application,
                selection_basis=arithmetic['selection_basis'],strategic_unproven=arithmetic['strategic_unproven'],
                optimality_claim=False,equivalence_claim=False,policy_eligible=None,balance_admitted=None,
                checks_scope='local_rule_and_arithmetic_given_supplied_entry',gaps=list(GAPS))


def validate_local_record(record, frame, root_hex, context, root=ROOT):
    errors=[]
    try:
        expected=build_local_record(frame,root_hex,context,root)
        if canonical(record)!=canonical(expected):
            errors.append('local record values/types differ from reconstructed rule/application/policy')
    except ValueError as error:
        errors.append(str(error))
    return dict(schema='mandatory_local_policy_audit_465.v1',local_record_verified=not errors,
                errors=errors,gaps=list(GAPS),policy_eligible=None,balance_admitted=None,
                checks_scope='local_rule_and_arithmetic_given_supplied_entry',
                ready_for_input_generation=False,ready_for_execution=False)
