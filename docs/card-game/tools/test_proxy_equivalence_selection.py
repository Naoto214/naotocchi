"""Separate policy must preserve seed distribution and fail closed on bad proofs."""
import copy
import unittest
from test_proxy_equivalence_outcomes import problem
from proxy_resource_value_selection import select_problem
try:
 import proxy_equivalence_selection as subject
except ModuleNotFoundError:
 subject=None

class SelectionTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(subject,'selection implementation absent')
 def test_unknown_retains_seeded_frontier(self):
  r=subject.select_equivalence(problem());self.assertEqual(r['selection_basis'],'seeded_frontier')
  self.assertEqual(len(r['frontier_report']['frontier_ids']),2)
 def test_same_frontier_same_seed(self):
  x=problem();old=select_problem(x['baseline_problem']);new=subject.select_equivalence(x)
  self.assertEqual(old['decision_record'],new['decision_record']);self.assertEqual(old['selected_candidate'],new['selected_candidate'])
 def test_disabled_proofs_reproduce_414(self):
  x=problem();r=subject.select_equivalence(x,enable_proofs=False)
  self.assertEqual(r['baseline_selection'],select_problem(x['baseline_problem']));self.assertEqual(r['frontier_report'],r['baseline_selection']['frontier_report'])
 def test_safe_free_certificate_not_transferred(self):
  x=problem();r=subject.select_equivalence(x)
  ordinary=[p for p in r['effective_problem']['pairs'] if p['kind']=='ordinary']
  self.assertTrue(all(p['relations']['board']=='incomparable' for p in ordinary))
  self.assertEqual(len(r['frontier_report']['frontier_ids']),2)
 def test_wrapper_choice_and_action_binding(self):
  x=problem();r=subject.select_equivalence(x);self.assertEqual(subject.validate_equivalence(r,x),[])
  for key in ('selected_candidate','selected_action','decision_record'):
   q=copy.deepcopy(r);q[key]='tampered';self.assertTrue(subject.validate_equivalence(q,x))
 def test_unknown_input_not_fallback(self):
  x=problem();x['unregistered']=True
  with self.assertRaises(ValueError):subject.select_equivalence(x)
 def test_input_order_does_not_choose_group(self):
  x=problem();a=subject.select_equivalence(x);x['actions'].reverse();b=subject.select_equivalence(x)
  self.assertEqual(a['selected_candidate'],b['selected_candidate']);self.assertEqual(a['decision_record'],b['decision_record'])
