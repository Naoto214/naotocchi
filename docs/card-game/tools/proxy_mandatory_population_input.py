"""Read-only PCP bundle structure; no generation, lock or execution authority."""
import copy
import hashlib
import proxy_population_contract as population
import proxy_mandatory_policy_contract as approved
from proxy_mandatory_policy_random import POLICY_ID
from proxy_mandatory_choice_boundary import source_catalog

ROOT=approved.ROOT
PROTOCOL_ID='policy_conditional_population.v1'
SCHEMA='policy_conditional_population_manifest.v1'
POLICIES=dict(normal='114_with_116',mandatory=POLICY_ID,response='119')


def _row_digest(row, roots):
    payload=dict(protocol_id=PROTOCOL_ID,group_id=row['group_id'],match_id=row['match_id'],
                 mirror_side=row['first_player']+'_first',initial_input_sha256=row['input_sha256'],
                 policy_versions=POLICIES,root_commitments={a:hashlib.sha256(bytes.fromhex(roots[a])).hexdigest() for a in 'AB'})
    return hashlib.sha256(approved.canonical(payload)).hexdigest()


def audit_input_bundle(bundle, root=ROOT):
    errors=[];root_values=[]
    gaps=['input_lock_authentication_unavailable','generation_provenance_verifier_unavailable',
          'historical_registry_verifier_unavailable','execution_source_edition_unfixed',
          'origin_and_whole_match_evidence_unverified']
    try:
        source_catalog(root)
        approved.canonical(bundle)
        contract=approved.load_json(population.source_path(root,approved.CONTRACT_PATH))
        errors.extend(approved.validate_contract(contract,root)['errors'])
        fields={'schema','protocol_id','protocol_sha256','mandatory_contract_sha256','groups','matches',
                'execution_order','policy_roots','source_versions','python_version',
                'historical_registry_sha256','generation_provenance','lock_evidence'}
        if type(bundle) is not dict or set(bundle)!=fields or bundle['schema']!=SCHEMA or bundle['protocol_id']!=PROTOCOL_ID or bundle['mandatory_contract_sha256']!=approved.CONTRACT_SHA256:
            raise ValueError('PCP bundle schema/approval binding differs')
        groups=bundle['groups'];matches=bundle['matches'];roots=bundle['policy_roots']
        errors.extend(population.validate_membership(groups,matches,bundle['execution_order']))
        if type(groups) is not list or any(type(g) is not dict or type(g.get('group_id')) is not str for g in groups):
            raise ValueError('group rows malformed')
        if type(matches) is not list or any(type(m) is not dict for m in matches):
            raise ValueError('match rows malformed')
        if type(roots) is not dict or set(roots)!={g['group_id'] for g in groups}:
            raise ValueError('policy root group coverage differs')
        for gid,owners in roots.items():
            if type(owners) is not dict or set(owners)!={'A','B'}:
                raise ValueError('policy root owner coverage differs')
            for value in owners.values():
                if type(value) is not str or len(value)!=64 or any(c not in '0123456789abcdef' for c in value):
                    raise ValueError('policy root must be independent-format 32-byte material')
                root_values.append(value)
        # Explicit structural projection only. No old record/contract is rewritten
        # or treated as an actual execution under the new policy.
        projection=copy.deepcopy(bundle)
        for k in ('protocol_id','mandatory_contract_sha256','policy_roots'):projection.pop(k)
        old_contract=approved.load_json(population.source_path(root,population.PROTOCOL_PATH))
        projection['schema']=old_contract['future_manifest_contract']['schema']
        for row in projection['matches']:
            if set(row)!={'match_id','group_id','first_player','input_sha256','policy_versions','policy_input_sha256'}:
                raise ValueError('PCP match row fields differ')
            if approved.canonical(row['policy_versions'])!=approved.canonical(POLICIES):
                raise ValueError('PCP fixed policies differ')
            if row['group_id'] not in roots or row['first_player'] not in ('A','B'):
                raise ValueError('PCP match group/side differs')
            if row.pop('policy_input_sha256')!=_row_digest(row,roots[row['group_id']]):
                errors.append('policy row digest differs: '+str(row['match_id']))
            row['policy_versions']['mandatory']=old_contract['selected_package']['mandatory_policy']
        checked=population.validate_manifest(projection,None,old_contract,root)
        errors.extend(checked['errors'])
    except (ValueError,OSError,KeyError,TypeError,AttributeError) as error:
        errors.append(str(error))
    return dict(schema='mandatory_population_input_audit_465.v1',structure_verified=not errors,
                errors=errors,gaps=gaps,planned_groups=200,planned_matches=400,
                supplied_policy_roots=len(root_values),root_value_coincidences=len(root_values)-len(set(root_values)),
                zero_root_count=root_values.count('00'*32),provenance_verified=False,input_lock_verified=False,
                balance_admitted=None,policy_eligible=None,ready_for_input_generation=False,ready_for_execution=False,
                checks_scope='supplied_bundle_structure_not_independence_or_precommitment')


def build_bound_local_record(bundle, match_id, frame, address, root=ROOT):
    """Offline connection only: supplied bundle is structurally checked, not locked."""
    from proxy_mandatory_policy_local import build_local_record
    checked=audit_input_bundle(bundle,root)
    if not checked['structure_verified']:
        raise ValueError('bundle structure invalid: '+'; '.join(checked['errors']))
    rows=[r for r in bundle['matches'] if r['match_id']==match_id]
    if len(rows)!=1:raise ValueError('planned match identity absent')
    if type(frame) is not dict or frame.get('actor') not in ('A','B'):
        raise ValueError('local chooser missing')
    row=rows[0];owner=frame['actor'];gid=row['group_id']
    context=dict(protocol_id=bundle['protocol_id'],group_id=gid,owner=owner,
                 mirror_side=row['first_player']+'_first',opportunity_address=copy.deepcopy(address))
    record=build_local_record(frame,bundle['policy_roots'][gid][owner],context,root)
    return dict(schema='mandatory_bundle_bound_local_record_465.v1',match_id=match_id,
                supplied_bundle_sha256=hashlib.sha256(approved.canonical(bundle)).hexdigest(),
                policy_input_sha256=row['policy_input_sha256'],local_record=record,
                input_lock_verified=False,policy_eligible=None,balance_admitted=None)


def audit_bound_local_record(record,bundle,match_id,frame,address,root=ROOT):
    errors=[]
    try:
        expected=build_bound_local_record(bundle,match_id,frame,address,root)
        if approved.canonical(record)!=approved.canonical(expected):
            errors.append('bundle binding/local record differs')
    except ValueError as error:
        errors.append(str(error))
    return dict(schema='mandatory_bundle_bound_local_audit_465.v1',binding_and_local_record_verified=not errors,
                errors=errors,input_lock_verified=False,policy_eligible=None,balance_admitted=None,
                ready_for_input_generation=False,ready_for_execution=False,
                checks_scope='supplied_bundle_binding_and_local_rule_only')
