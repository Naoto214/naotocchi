"""Export existing callback entries for separate local-rule/randomness checking.

Origins and input material remain supplied; only the source-replaying match
adapter may bind this conditional evidence to actual execution. No admission.
"""
import copy,json
from collections import Counter
from proxy_mandatory_policy_contract import canonical
from proxy_mandatory_policy_local import validate_local_record
from proxy_population_policy_bridge import Session


def export(session):
    entries=[]
    for identity,stored in sorted(session.records.items()):
        payload=json.loads(stored['payload']);decoded=json.loads(identity)
        if canonical(payload)!=stored['payload'] or canonical(decoded)!=identity:raise ValueError('callback entry encoding differs')
        if canonical(stored['record']['local_policy_evidence'])!=canonical(payload['local']):raise ValueError('callback local entry differs')
        entries.append(dict(identity=decoded,frame=payload['frame'],local_record=payload['local']))
    return dict(schema='registered_mandatory_policy_entries.v1',entries=entries,origin_authenticated=False,policy_eligible=None,balance_admitted=None)


def audit(journal,decisions,origins,binding,roots):
    errors=[];verified=0
    try:
        if type(journal) is not dict or set(journal)!={'schema','entries','origin_authenticated','policy_eligible','balance_admitted'} or journal['schema']!='registered_mandatory_policy_entries.v1' or journal['origin_authenticated'] is not False or journal['policy_eligible'] is not None or journal['balance_admitted'] is not None or type(journal['entries']) is not list:raise ValueError('policy journal schema differs')
        checker=Session(binding,roots);checker.origins=copy.deepcopy(origins)
        identities=[];locals_=[]
        for row in journal['entries']:
            if type(row) is not dict or set(row)!={'identity','frame','local_record'}:raise ValueError('policy entry fields differ')
            identity=row['identity'];frame=row['frame'];local=row['local_record']
            if type(identity) is not list or len(identity)!=3 or identity[1:]!=[frame['actor'],frame['choice_contract_id']]:raise ValueError('policy occurrence identity differs')
            context=checker.context(identity[0],frame)
            result=validate_local_record(local,frame,roots[frame['actor']],context)
            if not result['local_record_verified']:raise ValueError('local source/candidates/application/randomness differs')
            identities.append(canonical(identity));locals_.append(canonical(local));verified+=1
        if identities!=sorted(set(identities)):raise ValueError('duplicate or unordered policy occurrence')
        active=[]
        for d in decisions:
            if 'local_policy_evidence' in d:
                if d.get('decision_kind')!='mandatory_choice':raise ValueError('policy on undesignated decision kind')
                active.append(canonical(d['local_policy_evidence']))
        if Counter(active)!=Counter(locals_):raise ValueError('actual policy decision coverage differs')
    except (ValueError,TypeError,KeyError,IndexError) as error:errors.append(str(error))
    return dict(schema='registered_mandatory_policy_entry_audit.v1',local_entries_verified=not errors,verified_count=verified if not errors else 0,errors=errors,
        origin_authenticated=False,policy_eligible=None,balance_admitted=None,
        scope='supplied_registered_entries_local_rules_and_randomness',strategic_optimality_proven=False)
