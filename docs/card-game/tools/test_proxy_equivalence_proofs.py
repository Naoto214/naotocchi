"""No identity, context, pending-tail or integrity shortcuts in equality."""
import copy
import unittest
from test_proxy_equivalence_outcomes import problem
from proxy_equivalence_outcomes import derive_outcomes
try:
 import proxy_equivalence_proofs as subject
except ModuleNotFoundError:
 subject=None

class ProofTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(subject,'proof implementation absent')
 def test_exact_identity_closed_dependencies_cancel(self):
  x=problem();a=derive_outcomes(x)[0];p=subject.prove_pair(a,a,x)
  self.assertEqual(p['relations'],dict(hand='equal',board='equal',reservations='equal'))
  self.assertEqual(p['left_residual'],[]);self.assertEqual(len(p['matched_atom_ids']),len(a['atoms']))
 def test_same_name_other_instance_not_equal(self):
  x=problem();a,b=derive_outcomes(x)[:2];p=subject.prove_pair(a,b,x)
  self.assertEqual(p['status'],'unknown');self.assertTrue(p['left_residual'])
 def test_target_deadline_uses_order_mismatch(self):
  x=problem();a=derive_outcomes(x)[0]
  for field,val in [('targets',['different']),('lifetime',{'deadline':2}),('uses',2),('order',99)]:
   b=copy.deepcopy(a);b['atoms'][0][field]=val
   with self.assertRaises(ValueError):subject.prove_pair(a,b,x)
 def test_dependency_cycle_complete_vs_missing_edge(self):
  x=problem();a=derive_outcomes(x)[0];p=subject.prove_pair(a,a,x);self.assertEqual(p['status'],'proved_equal')
  b=copy.deepcopy(a);b['dependencies'][0]['members'].pop()
  with self.assertRaises(ValueError):subject.prove_pair(a,b,x)
 def test_common_world_affects_residual_main(self):
  x=problem();a,b=derive_outcomes(x)[:2];p=subject.prove_pair(a,b,x)
  self.assertIn('dependency_unproved',p['unknowns']);self.assertEqual(p['matched_atom_ids'],[])
 def test_time_changes_hand_condition(self):
  x=problem();a=derive_outcomes(x)[0];b=copy.deepcopy(a)
  next(z for z in b['atoms'] if z['zone']=='time')['value']+=1
  with self.assertRaises(ValueError):subject.prove_pair(a,b,x)
 def test_unknown_symbol_not_identity(self):
  x=problem();a,b=derive_outcomes(x)[:2]
  self.assertEqual(a['unknowns'],b['unknowns']);self.assertEqual(subject.prove_pair(a,b,x)['status'],'unknown')
 def test_orientation_and_proof_tampering(self):
  x=problem();a,b=derive_outcomes(x)[:2];p=subject.prove_pair(a,b,x);q=subject.prove_pair(b,a,x)
  self.assertEqual(p['left_residual'],q['right_residual']);self.assertEqual(subject.validate_pair(p,a,b,x),[])
  p['relations']['board']='equal';self.assertTrue(subject.validate_pair(p,a,b,x))

class ResidualKernelTests(unittest.TestCase):
 """Semantic kernel fixtures, separate from public-API tamper rejection."""
 def ledger(self):
  from proxy_equivalence_outcomes import _ledger
  import proxy_equivalence_evaluation as evaluation
  rows=evaluation.bind_sources(*evaluation.saved.load_inputs())
  x=next(evaluation.row_input(r) for r in rows if r['envelope']['legacy_continuation']['game_state']['players'][r['decision']['context']['actor']]['board']['world'] and r['envelope']['legacy_continuation']['game_state']['players'][r['decision']['context']['actor']]['board']['main'])
  atoms=_ledger(x['view'],x['source_manifest'])
  return dict(candidate_id='kernel-fixture',source_view_sha256='same-public-input',boundary=x['view']['control'],atoms=atoms,dependencies=[dict(dependency_id='context',members=sorted(a['atom_id'] for a in atoms),complete=True)],unknowns=[],opaque_unchanged=True)
 def test_actual_world_retained_when_main_or_time_differs(self):
  a=self.ledger();world=next(z for z in a['atoms'] if z['zone']=='own_board.world')
  for zone in ('own_board.main','time'):
   b=copy.deepcopy(a);atom=next(z for z in b['atoms'] if z['zone']==zone)
   if zone=='time':atom['value']+=1
   else:atom['identity']+='-different-physical-instance'
   proof=subject._compare_derived(a,b)
   self.assertEqual(proof['status'],'unknown');self.assertIn(world['atom_id'],proof['left_residual']);self.assertEqual(proof['matched_atom_ids'],[])
 def test_effect_target_deadline_uses_order_are_semantic_blockers(self):
  from proxy_equivalence_outcomes import _atom
  a=self.ledger();effect=_atom('stat_effects','effect-1',dict(source_instance_id='physical-source',target_instance_id='physical-target',round=1,turn_player='A',created_event_seq=1,count=1),'A',0)
  a['atoms'].append(effect);a['dependencies'][0]['members'].append(effect['atom_id']);a['dependencies'][0]['members'].sort()
  self.assertEqual(subject._compare_derived(a,a)['status'],'proved_equal')
  for key,value in [('targets',['other-target']),('lifetime',dict(round=2)),('uses',0),('order',1)]:
   b=copy.deepcopy(a);b['atoms'][-1][key]=value
   proof=subject._compare_derived(a,b);self.assertEqual(proof['status'],'unknown');self.assertIn(effect['atom_id'],proof['right_residual'])
 def test_context_cycle_requires_complete_closure(self):
  a=self.ledger();atom=a['atoms'][0]
  self.assertIn('context',atom['dependency_refs']);self.assertIn(atom['atom_id'],a['dependencies'][0]['members'])
  self.assertEqual(subject._compare_derived(a,a)['status'],'proved_equal')
  a['dependencies'][0]['complete']=False
  self.assertEqual(subject._compare_derived(a,a)['status'],'unknown')
 def test_discard_and_egg_difference_retained(self):
  from proxy_equivalence_outcomes import _atom
  a=self.ledger();a['atoms'].append(_atom('discard','physical-discard',dict(instance_id='physical-discard'),'A',0));a['dependencies'][0]['members'].append('discard:physical-discard')
  for zone in ('discard','egg_state'):
   b=copy.deepcopy(a);atom=next(z for z in b['atoms'] if z['zone']==zone);atom['value']='different-residual'
   proof=subject._compare_derived(a,b);self.assertEqual(proof['status'],'unknown');self.assertIn(atom['atom_id'],proof['left_residual'])
