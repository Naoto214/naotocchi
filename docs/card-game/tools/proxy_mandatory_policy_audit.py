"""Read-only fragment audit: supplied-material arithmetic is never admission."""
import argparse
from pathlib import Path
import proxy_mandatory_policy_contract as contract_api
from proxy_mandatory_policy_random import validate_proof

GAPS = ('input_lock_unauthenticated', 'policy_root_provenance_unverified',
        'origin_obligation_ledger_unverified', 'complete_legal_set_unverified',
        'permitted_information_unverified', 'choice_intermediate_state_unverified',
        'transition_and_continuation_unverified', 'whole_match_and_population_unverified')


def audit_fragment(fragment, root_hex, contract, root=contract_api.ROOT):
    checked = contract_api.validate_contract(contract, root)
    errors = list(checked['errors'])
    randomness_verified = False
    strategic_unproven = None
    try:
        if type(fragment) is not dict or set(fragment) != {
                'schema', 'decision_kind', 'context', 'legal_candidate_ids', 'arithmetic_proof'}:
            raise ValueError('fragment fields differ; full or legacy records are not fragments')
        if fragment['schema'] != 'mandatory_policy_fragment_464.v1' or fragment['decision_kind'] != 'mandatory_choice':
            raise ValueError('fragment schema/kind differs')
        proof = validate_proof(fragment['arithmetic_proof'], root_hex,
                               fragment['context'], fragment['legal_candidate_ids'])
        errors.extend(proof['errors'])
        randomness_verified = proof['randomness_verified']
        if randomness_verified:
            strategic_unproven = fragment['arithmetic_proof']['strategic_unproven']
    except ValueError as error:
        errors.append(str(error))
    return dict(schema='mandatory_policy_fragment_audit_464.v1', contract_verified=checked['valid'],
                randomness_verified=randomness_verified, strategic_unproven=strategic_unproven,
                policy_eligible=None, balance_admitted=None, disposition='unproved',
                errors=errors, gaps=list(GAPS), checks_scope='fragment_arithmetic_not_game_evidence',
                ready_for_input_generation=False, ready_for_execution=False,
                independent_balance_samples=0)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--contract', type=Path, default=contract_api.ROOT / contract_api.CONTRACT_PATH)
    parser.add_argument('--fragment', type=Path, required=True)
    parser.add_argument('--root-material', type=Path, required=True)
    args = parser.parse_args()
    try:
        material = contract_api.load_json(args.root_material)
        if set(material) != {'root_hex'}:
            raise ValueError('root material fields differ')
        result = audit_fragment(contract_api.load_json(args.fragment), material['root_hex'],
                                contract_api.load_json(args.contract))
        code = 2 if result['errors'] else 1  # No success exit authorizing execution.
    except (OSError, ValueError, UnicodeError) as error:
        result = dict(errors=[str(error)], policy_eligible=None, balance_admitted=None,
                      ready_for_input_generation=False, ready_for_execution=False)
        code = 2
    print(contract_api.canonical(result).decode())
    return code


if __name__ == '__main__':
    raise SystemExit(main())
