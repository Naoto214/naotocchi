"""450 diagnostic observations, never equality or cancellation certificates.

Callers derive both public outcomes from the same validated input. Categories
are mutually exclusive reporting labels; they are never selector inputs.
"""
import json
from proxy_equivalence_outcomes import ATOM_KEYS
from proxy_resource_value_selection import canonical_sha256 as sha

PERSISTENT={'rights','egg_state','reservations','attachments','ability_uses','public_prepared','payment_effects','stat_effects','conditional_effects','own_board.partner_stage','opponent_board.partner_stage'}

def _canonical(value):
 return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)

def _atoms(outcome):
 result={}
 for atom in outcome['atoms']:
  if set(atom)!=ATOM_KEYS or atom['atom_id'] in result:raise ValueError('invalid or duplicate residual atom')
  result[atom['atom_id']]=atom
 return result

def audit_pair(left,right,left_action,right_action):
 if left['candidate_id']!=left_action['candidate_id'] or right['candidate_id']!=right_action['candidate_id'] or left['candidate_id']==right['candidate_id']:raise ValueError('candidate binding differs')
 a=_atoms(left);b=_atoms(right);keys=sorted(a.keys()|b.keys());different=[k for k in keys if _canonical(a.get(k))!=_canonical(b.get(k))]
 zones=sorted({(a.get(k) or b[k])['zone'] for k in different})
 non_time=[k for k in different if (a.get(k) or b[k])['zone']!='time']
 physical=[k for k in different if (a.get(k) or b[k])['kind']=='card']
 boundary_equal=_canonical(left['boundary'])==_canonical(right['boundary'])
 if physical:category='physical_card_or_location'
 elif set(zones)&PERSISTENT:category='persistent_state_or_rights'
 elif left_action['target_instance_ids']!=right_action['target_instance_ids']:category='declared_target'
 elif left_action['action_type']==right_action['action_type'] and left_action['candidate_variant']!=right_action['candidate_variant']:category='declared_variant'
 elif non_time or not boundary_equal or set(left['unknowns'])!=set(right['unknowns']):category='other_retained_difference'
 elif different:category='time_only_structural_difference'
 else:category='no_structural_difference_observed'
 details=[]
 for k in different:
  fields=sorted(f for f in ATOM_KEYS if _canonical(a.get(k,{}).get(f))!=_canonical(b.get(k,{}).get(f)))
  details.append(dict(atom_id=k,zone=(a.get(k) or b[k])['zone'],left_present=k in a,right_present=k in b,different_fields=fields,left_atom_sha256=sha(a[k]) if k in a else None,right_atom_sha256=sha(b[k]) if k in b else None))
 return dict(left_id=left['candidate_id'],right_id=right['candidate_id'],category=category,different_atom_ids=different,different_zones=zones,non_time_differences=non_time,physical_differences=physical,differences=details,raw_equal_atom_ids=[k for k in keys if k not in different],boundary_equal=boundary_equal,unknowns=sorted(set(left['unknowns']+right['unknowns'])),proven_cancellations=[],equivalence_proven=False,diagnostic_only=True)
