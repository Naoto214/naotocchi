"""Fixed cohort accounting and source/action binding must survive a new policy."""
import copy
import unittest
import proxy_completed_comparison as saved
try:
 import proxy_equivalence_evaluation as subject
except ModuleNotFoundError:
 subject=None

class EvaluationTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.inputs=saved.load_inputs()
 def setUp(self):self.assertIsNotNone(subject,'evaluation implementation absent')
 def test_manifest_313_and_groups_241_72(self):
  rows=subject.bind_sources(*self.inputs)
  self.assertEqual(len(rows),313);from collections import Counter
  self.assertEqual(dict(Counter(r['group'] for r in rows)),{'legacy_time_unique':128,'legacy_safe_free_unique':46,'already_seeded':8,'control':59,'legacy_unsupported':72})
 def test_duplicate_source_decision_rejected(self):
  p,s,l=self.inputs;p=copy.deepcopy(p);d=next(d for d in p['results'][0]['decisions'] if 'inventory'in d);p['results'][0]['decisions'].append(d)
  with self.assertRaises(ValueError):subject.bind_sources(p,s,l)
 def test_selected_action_binding_rejected(self):
  p,s,l=self.inputs;s=copy.deepcopy(s);s['results'][0]['policies'][saved.NEW]['selected_action']['card_id']='different'
  with self.assertRaises(ValueError):subject.bind_sources(p,s,l)
 def test_zero_reduction_is_valid(self):
  from test_proxy_equivalence_outcomes import problem
  from proxy_equivalence_selection import select_equivalence
  x=problem();w=select_equivalence(x)
  summary=subject.summarize_rows([dict(group='already_seeded',selection=w,baseline=x['baseline_problem'],hidden_order_checks=2)])
  self.assertEqual(summary['groups']['already_seeded']['fallback_reduction'],0)
 def test_group_label_not_selection_input(self):
  row=subject.bind_sources(*self.inputs)[0];x=subject.row_input(row);row['group']='not_a_rule'
  self.assertEqual(x,subject.row_input(row))
 def test_new_unsupported_row_not_dropped(self):
  rows=subject.bind_sources(*self.inputs);self.assertEqual(sum(r['group']=='legacy_unsupported' for r in rows),72)

class ReviewProvenanceTests(unittest.TestCase):
 def test_manifest_source_mutation_rejected(self):
  from pathlib import Path
  manifest={'canonical_sources':subject.source_manifest(),'tools_sha256':subject.execution_sources()}
  self.assertEqual(subject.validate_manifest(manifest),[])
  for field in ('canonical_sources','tools_sha256'):
   q=copy.deepcopy(manifest);key=next(iter(q[field]));q[field][key]='0'*64
   self.assertTrue(subject.validate_manifest(q))
 def test_hidden_checks_record_actual_region_changes(self):
  from test_proxy_equivalence_inputs import fixture
  e,d=fixture();r={'envelope':e,'decision':d};checks=subject.check_hidden_regions(r)
  self.assertEqual(set(checks),{'opponent_hand','deck_middle','opponent_concealed_prepared'})
  self.assertTrue(checks['opponent_hand']['changed']);self.assertFalse(checks['opponent_concealed_prepared']['changed'])
  g=e['legacy_continuation']['game_state'];sid=g['players']['B']['hand'].pop();g['players']['B']['board']['prepared']=[sid]
  e['runtime']['public_prepared'][sid]={'controller':'B','face_up':False,'paid_time':1,'placed_event_seq':3}
  checks=subject.check_hidden_regions(r)
  self.assertTrue(checks['opponent_concealed_prepared']['changed']);self.assertTrue(checks['opponent_concealed_prepared']['passed'])
