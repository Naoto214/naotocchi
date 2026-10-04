import copy
import unittest
try:
 import proxy_judgment_evidence_audit as subject
except ModuleNotFoundError:
 subject=None

def run(record=None):
 return {'run_id':'test','decisions':[record or {'decision_kind':'mandatory_choice','resolution_mode':'seeded_fallback','strategic_unresolved':True,'legal_candidates':['a'],'selected_candidate':'a'}]}

class EvidenceTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(subject,'audit module not implemented')
 def test_singleton_seeded_is_excluded_without_mutation(self):
  source=run();before=copy.deepcopy(source);x=subject.build_sidecar(source)
  self.assertEqual(x['evaluation']['status'],'excluded_by_116');self.assertEqual(x['decisions'][0]['recorded_strategic_unresolved'],True);self.assertEqual(source,before)
 def test_nonseeded_does_not_certify_legality_or_admission(self):
  x=subject.build_sidecar(run({'decision_kind':'response_action','resolution_mode':'response_unique','legal_candidate_ids':['response-pass'],'selected_candidate':'response-pass'}))
  self.assertIsNone(x['decisions'][0]['recorded_strategic_unresolved']);self.assertEqual(x['decisions'][0]['legality_evidence'],'not_reverified');self.assertEqual(x['evaluation']['status'],'not_assessed');self.assertIsNone(x['evaluation']['admitted']);self.assertEqual(x['opportunity_coverage'],'not_reverified')
 def test_flag_alone_excludes_even_nonseeded(self):
  r=run();r['decisions'][0]['resolution_mode']='priority_unique'
  self.assertEqual(subject.build_sidecar(r)['evaluation']['status'],'excluded_by_116')
 def test_sidecar_mutation_and_omission_rejected(self):
  r=run();x=subject.build_sidecar(r)
  for mutation in ('omit','approve','flag','hash'):
   y=copy.deepcopy(x)
   if mutation=='omit':y['decisions']=[]
   if mutation=='approve':y['evaluation']['admitted']=True
   if mutation=='flag':y['decisions'][0]['recorded_strategic_unresolved']=False
   if mutation=='hash':y['run_sha256']='0'*64
   self.assertTrue(subject.validate_sidecar(y,r),mutation)
 def test_source_change_invalidates_projection(self):
  r=run();x=subject.build_sidecar(r);r['decisions'][0]['extra_history']={'source':'changed'}
  self.assertTrue(subject.validate_sidecar(x,r))
 def test_malformed_sources_rejected(self):
  mutations=[('decision_kind','other'),('strategic_unresolved',1),('legal_candidates',['a','a']),('selected_candidate','missing'),('legal_candidates',[]),('resolution_mode',None)]
  for key,value in mutations:
   r=run();r['decisions'][0][key]=value
   with self.subTest(key=key,value=value),self.assertRaises(ValueError):subject.build_sidecar(r)
 def test_normal_wrappers_and_response_modes_remain_distinct(self):
  for choice in ({'resolution_mode':'seeded_fallback','selected_candidate':'a'},{'selection_basis':'seeded_frontier','selected_candidate':'a','decision_record':dict(run()['decisions'][0],decision_kind='normal_action')}):
   record={'inventory':{'legal_candidate_ids':['a']},'context':{'decision_kind':'normal_action'},'choice':choice,'selected_candidate':'a'}
   x=subject.build_sidecar(run(record));self.assertEqual(x['decisions'][0]['kind'],'normal_action');self.assertEqual(x['evaluation']['status'],'excluded_by_116')
 def test_unknown_mode_and_missing_inventory_are_not_success(self):
  r=run();r['decisions'][0]['resolution_mode']='invented'
  with self.assertRaises(ValueError):subject.build_sidecar(r)
  del r['decisions'][0]['legal_candidates']
  with self.assertRaises(ValueError):subject.build_sidecar(r)
 def test_empty_run_never_admitted(self):
  r=run();r['decisions']=[];x=subject.build_sidecar(r);self.assertIsNone(x['evaluation']['admitted']);self.assertEqual(x['opportunity_coverage'],'not_reverified')
 def test_contract_is_non_admitting_and_isolated(self):
  x=subject.contract();self.assertFalse(x['can_admit_balance']);x['can_admit_balance']=True;self.assertFalse(subject.contract()['can_admit_balance'])

class SavedIntegrationTests(unittest.TestCase):
 def test_saved_inventory_and_tamper_rejection(self):
  import runpy
  from pathlib import Path
  p=Path(__file__).resolve().parents[1]/'data/proxy-judgment-evidence-455/reproduce.py'
  self.assertTrue(p.exists(),'saved source adapter not implemented')
  report=runpy.run_path(str(p))['build']()
  self.assertEqual(len(report['runs']),12)
  self.assertTrue(all(r['evaluation']['status']=='excluded_by_116' for r in report['runs']))
  self.assertEqual(sum(sum(r['counts'].values()) for r in report['runs']),2378)

class BoundaryTests(unittest.TestCase):
 def test_nested_kind_conflict_rejected(self):
  record={'inventory':{'legal_candidate_ids':['a']},'context':{'decision_kind':'normal_action'},'choice':{'selection_basis':'seeded_frontier','selected_candidate':'a','decision_record':run()['decisions'][0]},'selected_candidate':'a'}
  with self.assertRaises(ValueError):subject.build_sidecar(run(record))
 def test_nested_candidates_conflict_rejected(self):
  inner=run()['decisions'][0];inner['decision_kind']='normal_action';inner['legal_candidates']=['a','b']
  record={'inventory':{'legal_candidate_ids':['a']},'context':{'decision_kind':'normal_action'},'choice':{'selection_basis':'seeded_frontier','selected_candidate':'a','decision_record':inner},'selected_candidate':'a'}
  with self.assertRaises(ValueError):subject.build_sidecar(run(record))
 def test_source_revision_is_pinned(self):
  from unittest.mock import patch
  from pathlib import Path
  original=Path.read_bytes
  def altered(p):
   data=original(p)
   return data+b'changed' if p.name=='454-all-judgment-evaluation-design.md' else data
  with patch.object(Path,'read_bytes',altered):
   with self.assertRaises(ValueError):subject.build_sidecar(run())
 def test_outer_exclusion_evidence_cannot_be_shadowed(self):
  for layer in ('record','choice'):
   for field,value in (('resolution_mode','seeded_fallback'),('strategic_unresolved',True),('reason_code','strategic_unresolved_seeded_fallback')):
    inner={'decision_kind':'normal_action','resolution_mode':'priority_unique','strategic_unresolved':False,'legal_candidates':['a'],'selected_candidate':'a'}
    record={'inventory':{'legal_candidate_ids':['a']},'context':{'decision_kind':'normal_action'},'choice':{'selection_basis':'upper_priority_unique','decision_record':inner,'selected_candidate':'a'},'selected_candidate':'a'}
    (record if layer=='record' else record['choice'])[field]=value
    with self.subTest(layer=layer,field=field),self.assertRaises(ValueError):subject.build_sidecar(run(record))
