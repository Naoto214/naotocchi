"""Read-only consistency of supplied local attempts; never opportunity coverage."""
from proxy_mandatory_policy_contract import ROOT, canonical
from proxy_mandatory_policy_local import GAPS, validate_local_record


def audit_journal(items, binding, root=ROOT):
    errors=[];seen={};owner_roots={};retries=0
    try:
        canonical(binding);canonical(items)
        if type(binding) is not dict or set(binding)!={'protocol_id','group_id','mirror_side','match_id'} or any(type(v) is not str or not v for v in binding.values()) or binding['mirror_side'] not in ('A_first','B_first'):
            raise ValueError('supplied match binding differs')
        if type(items) is not list: raise ValueError('attempt list required')
        for index,item in enumerate(items):
            try:
                if type(item) is not dict or set(item)!={'frame','context','root_hex','record'}:
                    raise ValueError('attempt fields differ')
                checked=validate_local_record(item['record'],item['frame'],item['root_hex'],item['context'],root)
                if not checked['local_record_verified']:
                    raise ValueError('local record invalid: '+'; '.join(checked['errors']))
                context=item['context']
                if any(context[key]!=binding[key] for key in ('protocol_id','group_id','mirror_side')):
                    raise ValueError('attempt and supplied match binding differ')
                owner=context['owner'];material=item['root_hex']
                if owner in owner_roots and owner_roots[owner]!=material:
                    raise ValueError('policy root changed within owner/match')
                owner_roots[owner]=material
                key=canonical(context['opportunity_address'])
                # Exact whole entry and record, including unchanged hidden audit state.
                payload=canonical(item)
                if key in seen:
                    if seen[key]!=payload: raise ValueError('address reused with different entry/material/evidence')
                    retries+=1
                else: seen[key]=payload
            except ValueError as error:
                errors.append('attempt '+str(index)+': '+str(error))
    except ValueError as error:
        errors.append(str(error))
    return dict(schema='mandatory_policy_journal_audit_465.v1',journal_consistent=not errors,
                errors=errors,distinct_supplied_addresses=len(seen),identical_retries=retries,
                judgment_opportunities=None,gaps=list(GAPS),policy_eligible=None,balance_admitted=None,
                checks_scope='supplied_attempt_consistency_not_origin_coverage',
                ready_for_input_generation=False,ready_for_execution=False)


def main():
    import argparse
    from pathlib import Path
    from proxy_mandatory_policy_contract import load_json
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence',type=Path,required=True)
    args=parser.parse_args()
    try:
        request=load_json(args.evidence)
        if set(request)!={'binding','attempts'}: raise ValueError('journal request fields differ')
        result=audit_journal(request['attempts'],request['binding'])
        code=1 if result['journal_consistent'] else 2
    except (OSError,ValueError,UnicodeError) as error:
        result=dict(errors=[str(error)],policy_eligible=None,balance_admitted=None,
                    ready_for_input_generation=False,ready_for_execution=False)
        code=2
    print(canonical(result).decode())
    return code


if __name__=='__main__':raise SystemExit(main())
