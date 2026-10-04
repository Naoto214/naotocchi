import copy
import unittest
try:import proxy_replay_evidence_audit as subject
except ModuleNotFoundError:subject=None

def example():
 return dict(run_id='r',policy_id='p',path_id='route',decisions=[dict(decision_kind='mandatory_choice',resolution_mode='seeded_fallback',strategic_unresolved=True,legal_candidates=['a','b'],selected_candidate='a')],events=[{'seq':1}],snapshots=[{'event_seq':0},{'event_seq':1}],completed=True,result={'winner':'A'},stop=None)

class ReplayTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(subject,'replay evidence module absent')
 def test_equal_replay_is_bounded_not_admission(self):
  a=example();before=copy.deepcopy(a);r=subject.compare_replayed(a,copy.deepcopy(a))
  self.assertTrue(r['exact_run_match']);self.assertIsNone(r['balance_admitted']);self.assertEqual(r['opportunity_scope'],'existing_executor_only');self.assertEqual(a,before)
 def test_omitted_extra_or_modified_decision_rejected(self):
  for change in ('omit','extra','flag','candidate','selection'):
   a=example();b=copy.deepcopy(a)
   if change=='omit':b['decisions']=[]
   if change=='extra':b['decisions']*=2
   if change=='flag':b['decisions'][0]['strategic_unresolved']=False
   if change=='candidate':b['decisions'][0]['legal_candidates']=['a']
   if change=='selection':b['decisions'][0]['selected_candidate']='b'
   with self.subTest(change=change),self.assertRaises(ValueError):subject.compare_replayed(a,b)
 def test_reordered_decisions_rejected(self):
  a=example();a['decisions'].append(dict(a['decisions'][0],selected_candidate='b'));b=copy.deepcopy(a);b['decisions'].reverse()
  with self.assertRaises(ValueError):subject.compare_replayed(a,b)
 def test_all_run_fields_not_just_decisions_compared(self):
  for key in ('events','snapshots','result','stop','run_id','policy_id','path_id','completed','extra'):
   a=example();b=copy.deepcopy(a);b[key]='changed'
   with self.subTest(key=key),self.assertRaises(ValueError):subject.compare_replayed(a,b)
 def test_bool_integer_difference_not_equal(self):
  a=example();b=copy.deepcopy(a);b['completed']=1
  with self.assertRaises(ValueError):subject.compare_replayed(a,b)
 def test_invalid_or_stopped_runs_not_verified(self):
  for x in (None,{},dict(example(),completed=False),dict(example(),stop={'code':'stop'})):
   with self.subTest(x=x),self.assertRaises(ValueError):subject.compare_replayed(x,x)
 def test_saved_inventory_loader(self):
  rows=subject.load_saved_path('probe-01-a-first')
  self.assertEqual(len(rows),3);self.assertEqual(len({r['policy_id'] for r in rows}),3)
  with self.assertRaises(ValueError):subject.load_saved_path('../other')
 def test_saved_manifest_revision_rejected(self):
  from pathlib import Path
  from unittest.mock import patch
  original=Path.read_bytes
  def changed(p):
   value=original(p)
   return value+b'change' if p.name=='manifest.json' and p.parent.name=='trajectories' else value
  with patch.object(Path,'read_bytes',changed):
   with self.assertRaises(ValueError):subject.load_saved_path('probe-01-a-first')
