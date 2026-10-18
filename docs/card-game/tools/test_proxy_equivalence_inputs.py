"""Projection must not drop public effects or leak hidden identities."""
import copy
import importlib.util
import unittest
from pathlib import Path
import proxy_completed_comparison as saved

try:
 import proxy_equivalence_inputs as subject
except ModuleNotFoundError:
 subject=None

_CACHE=None
def fixture():
 global _CACHE
 if _CACHE is None:
  paired,shadow,_=saved.load_inputs();r=paired['results'][0];d=next(d for d in r['decisions'] if 'inventory' in d)
  e=next(e for e in r['snapshots'] if e['event_seq']==d['event_seq'])
  _CACHE=(e,d)
 return copy.deepcopy(_CACHE)

class InputsTests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(subject,'public equivalence input implementation absent')
 def test_hidden_permutation_invariant(self):
  e,d=fixture();a=subject.project_equivalence_view(e,'A',d['inventory']['public_history'])
  e['legacy_continuation']['game_state']['players']['B']['hand'].reverse()
  e['legacy_continuation']['game_state']['players']['A']['deck'].reverse()
  b=subject.project_equivalence_view(e,'A',d['inventory']['public_history']);self.assertEqual(a,b)
 def test_discard_egg_runtime_control_preserved(self):
  e,d=fixture();v=subject.project_equivalence_view(e,'A',d['inventory']['public_history'])
  self.assertEqual(v['public']['discard'],{'A':[],'B':[]})
  self.assertEqual(v['egg_state'],{'A':'egg','B':'egg'})
  self.assertIn('payment_effects',v['runtime']);self.assertIn('conditional_effects',v['runtime'])
  for key,val in [('consecutive_passes',1),('priority_actor','A')]:
   q=copy.deepcopy(e);q['legacy_continuation']['response_context'][key]=val
   self.assertNotEqual(v,subject.project_equivalence_view(q,'A',d['inventory']['public_history']))
  q=copy.deepcopy(e);g=q['legacy_continuation']['game_state'];g['players']['A']['discard'].append(g['players']['A']['hand'].pop())
  self.assertNotEqual(v,subject.project_equivalence_view(q,'A',d['inventory']['public_history']))
 def test_invalid_schema_and_bool_resource_rejected(self):
  e,d=fixture()
  for mutation in ('schema','bool'):
   q=copy.deepcopy(e)
   if mutation=='schema':q['secret_extra']='x'
   else:q['legacy_continuation']['game_state']['players']['A']['time']=True
   with self.assertRaises(ValueError):subject.project_equivalence_view(q,'A',[])
 def test_build_binds_complete_inventory(self):
  e,d=fixture();v=subject.project_equivalence_view(e,'A',d['inventory']['public_history']);sources=subject.source_manifest()
  x=subject.build_input(v,d['inventory'],d['problem'],sources);self.assertEqual(subject.validate_input(x),[])
  for mutate in ('duplicate','missing','unknown'):
   q=copy.deepcopy(x)
   if mutate=='duplicate':q['actions'].append(q['actions'][0])
   elif mutate=='missing':q['actions'].pop()
   else:q['unknown']=1
   self.assertTrue(subject.validate_input(q))
 def test_hidden_preparation_identity_not_copied(self):
  e,d=fixture();g=e['legacy_continuation']['game_state'];sid=g['players']['B']['hand'].pop();g['players']['B']['board']['prepared']=[sid]
  e['runtime']['public_prepared'][sid]={'controller':'B','face_up':False,'paid_time':1,'placed_event_seq':3}
  a=subject.project_equivalence_view(e,'A',[]);g['cards'][sid]['card_id']='I-concealed-other'
  self.assertEqual(a,subject.project_equivalence_view(e,'A',[]));self.assertNotIn(sid,str(a))

class ReviewInputTests(unittest.TestCase):
 def test_pass_descriptor_cannot_borrow_placement_identity(self):
  from test_proxy_equivalence_outcomes import problem
  from proxy_equivalence_selection import select_equivalence
  x=problem();pas=next(a for a in x['actions'] if a['candidate_id']=='pass')
  x['actions']=[dict(copy.deepcopy(pas),candidate_id=a['candidate_id']) for a in x['actions']]
  self.assertTrue(subject.validate_input(x))
  with self.assertRaises(ValueError):select_equivalence(x)
 def test_nested_right_type_rejected_at_proof_entry(self):
  from test_proxy_equivalence_outcomes import problem
  x=problem();x['view']['rights']['A']['person_placed']='not a bool'
  self.assertTrue(subject.validate_input(x))
 def test_source_variant_target_or_extra_field_tamper_rejected(self):
  from test_proxy_equivalence_outcomes import problem
  for key,value in [('source_instance_id','A-020#1'),('candidate_variant','forged'),('target_instance_ids',['A-020#1']),('unknown_field',1)]:
   x=problem();x['actions'][0][key]=value;self.assertTrue(subject.validate_input(x),key)
