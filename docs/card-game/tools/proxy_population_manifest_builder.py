"""Pure supplied-material projection; no sampling, saving, lock or authority.

A caller-supplied registry/edition is not authenticated here. Production use
also requires469 material authentication and immutable execution edition checks.
"""
import copy,hashlib
import proxy_population_contract as population
import proxy_mandatory_policy_contract as policy
import proxy_mandatory_population_input as inputs
from proxy_population_material_protocol import audit_material_record,binding_errors

def assemble_supplied(material,registry,decks,source_versions,python_version):
 if not audit_material_record(material,registry,decks,group_count=200)['material_consistent'] or material.get('complete') is not True:raise ValueError('complete consistent supplied material required')
 groups=[];matches=[];roots={};order=[]
 indexed={(r['group_index'],r['owner']):r['root_hex'] for r in material['policy_roots']}
 for index,record in enumerate(material['groups'],1):
  gid='group-'+str(index).zfill(3)
  group=dict(group_id=gid,generation_attempt_ref='material-attempt-'+str(record['attempt_index']))
  group.update({k:copy.deepcopy(record[k]) for k in ('seed_A','seed_B','full_order_A','full_order_B')});groups.append(group)
  roots[gid]={owner:indexed[index,owner] for owner in 'AB'}
  for first in 'AB':
   initial=dict(first_player=first,players=[dict(player_id=owner,deck_order_top_to_bottom=group['full_order_'+owner]) for owner in 'AB'])
   row=dict(match_id=gid+'-'+first+'-first',group_id=gid,first_player=first,input_sha256=hashlib.sha256(population.canonical(initial)).hexdigest(),policy_versions=copy.deepcopy(inputs.POLICIES))
   row['policy_input_sha256']=inputs._row_digest(row,roots[gid]);matches.append(row)
  order.extend(gid+'-'+first+'-first' for first in ('AB' if index%2 else 'BA'))
 bundle=dict(schema=inputs.SCHEMA,protocol_id=inputs.PROTOCOL_ID,protocol_sha256=population.PROTOCOL_SHA256,
  mandatory_contract_sha256=policy.CONTRACT_SHA256,groups=groups,matches=matches,execution_order=order,
  policy_roots=roots,source_versions=copy.deepcopy(source_versions),python_version=python_version,
  historical_registry_sha256=hashlib.sha256(policy.canonical(registry)).hexdigest(),
  generation_provenance=dict(material_transcript_sha256=hashlib.sha256(policy.canonical(material)).hexdigest()),lock_evidence={})
 errors=inputs.audit_input_bundle(bundle)['errors']+binding_errors(bundle,material)
 if errors:raise ValueError('supplied manifest projection differs: '+str(errors))
 return bundle
