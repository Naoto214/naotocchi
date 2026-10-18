import copy,unittest
try:
 import proxy_residual_witness_audit as subject
except ModuleNotFoundError:subject=None
from proxy_equivalence_outcomes import _atom
class ResidualAuditTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(subject,'residual audit absent')
 def pair(self):
  a=dict(candidate_id='left',action_type='use_play',candidate_variant='x',target_instance_ids=[])
  b=dict(a,candidate_id='right')
  l=dict(candidate_id='left',boundary={'phase':'normal'},unknowns=['unresolved_effect'],atoms=[_atom('time','A',1),_atom('opaque','deck',{'contents':'unobserved'})])
  r=copy.deepcopy(l);r['candidate_id']='right'
  return l,r,a,b
 def test_same_atoms_and_unknowns_are_not_proof(self):
  l,r,a,b=self.pair();v=subject.audit_pair(l,r,a,b)
  self.assertEqual(v['category'],'no_structural_difference_observed');self.assertEqual(v['proven_cancellations'],[]);self.assertFalse(v['equivalence_proven']);self.assertIn('unresolved_effect',v['unknowns'])
 def test_distinct_copies_and_zones_survive(self):
  l,r,a,b=self.pair();l['atoms'].append(_atom('own_hand','copy1',{'card_id':'same'},kind='card'));r['atoms'].append(_atom('own_hand','copy2',{'card_id':'same'},kind='card'))
  self.assertEqual(subject.audit_pair(l,r,a,b)['category'],'physical_card_or_location')
 def test_equal_amount_different_target_or_deadline_survives(self):
  for field,left,right in [('target_instance_id','one','two'),('deadline','this_turn','next_turn')]:
   l,r,a,b=self.pair();l['atoms'].append(_atom('stat_effects','effect',{field:left,'amount':2}));r['atoms'].append(_atom('stat_effects','effect',{field:right,'amount':2}))
   v=subject.audit_pair(l,r,a,b);self.assertEqual(v['category'],'persistent_state_or_rights');self.assertIn('stat_effects',v['different_zones'])
 def test_target_variant_and_pass_boundary_are_kept(self):
  l,r,a,b=self.pair();a['target_instance_ids']=['one'];b['target_instance_ids']=['two'];l['atoms'].append(_atom('pending_action','unresolved',a));r['atoms'].append(_atom('pending_action','unresolved',b))
  self.assertEqual(subject.audit_pair(l,r,a,b)['category'],'declared_target')
  a['target_instance_ids']=b['target_instance_ids']=[];a['candidate_variant']='x';b['candidate_variant']='y';l['atoms'][-1]=_atom('pending_action','unresolved',a);r['atoms'][-1]=_atom('pending_action','unresolved',b)
  self.assertEqual(subject.audit_pair(l,r,a,b)['category'],'declared_variant')
  l,r,a,b=self.pair();r['boundary']={'phase':'turn_end_response'};r['atoms'].append(_atom('end_obligation','turn_end',{'response_before_end':True}))
  v=subject.audit_pair(l,r,a,b);self.assertFalse(v['boundary_equal']);self.assertEqual(v['category'],'other_retained_difference')
 def test_time_only_is_not_non_time_difference(self):
  l,r,a,b=self.pair();r['atoms'][0]['value']=2;v=subject.audit_pair(l,r,a,b)
  self.assertEqual(v['category'],'time_only_structural_difference');self.assertEqual(v['non_time_differences'],[]);self.assertFalse(v['equivalence_proven'])
 def test_direction_and_enumeration_order_do_not_change_witness_set(self):
  l,r,a,b=self.pair();r['atoms'][0]['value']=2;l['atoms'].append(_atom('rights','A',{'used':False}));r['atoms'].append(_atom('rights','A',{'used':True}))
  first=subject.audit_pair(l,r,a,b);l['atoms'].reverse();r['atoms'].reverse();second=subject.audit_pair(r,l,b,a)
  self.assertEqual(first['category'],second['category']);self.assertEqual(first['different_atom_ids'],second['different_atom_ids']);self.assertEqual(first['raw_equal_atom_ids'],second['raw_equal_atom_ids'])
 def test_duplicate_and_wrong_candidate_binding_rejected(self):
  l,r,a,b=self.pair();l['atoms'].append(copy.deepcopy(l['atoms'][0]))
  with self.assertRaises(ValueError):subject.audit_pair(l,r,a,b)
  l,r,a,b=self.pair();a['candidate_id']='wrong'
  with self.assertRaises(ValueError):subject.audit_pair(l,r,a,b)
