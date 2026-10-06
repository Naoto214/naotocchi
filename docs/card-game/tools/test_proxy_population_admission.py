"""Planned-set retention; structural doubles are never independent samples."""
import copy,unittest
from unittest.mock import patch
from test_proxy_mandatory_population_input import bundle
try:import proxy_population_admission as api
except ImportError:api=None

class AdmissionTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_all_unexecuted_slots_and_pairs_remain_without_denominator_repair(self):
  b=bundle();before=copy.deepcopy(b);out=api.audit_population(b,[])
  self.assertEqual(b,before);self.assertEqual(out['planned_counts'],dict(groups=200,matches=400))
  self.assertEqual(len(out['matches']),400);self.assertEqual(len(out['groups']),200)
  self.assertEqual(out['disposition_counts']['matches'],dict(eligible=0,excluded=0,unproved=400))
  self.assertEqual(out['execution_status_counts']['not_executed'],400)
  self.assertEqual(out['whole_set'],dict(allowed=False,counts=None,rates=None,conclusion=None))
  self.assertEqual(out['diagnostic_subset']['planned_denominator'],400)
  self.assertIsNone(out['diagnostic_subset']['rates']);self.assertFalse(out['diagnostic_subset']['generalizable'])
 def test_unknown_or_old_self_reported_eligible_is_unproved_without_replay(self):
  b=bundle();fake=dict(schema='saved_old_run',binding=dict(match_id='test-1A'),eligible=True,verified=True,strategic_unresolved=True)
  with patch.object(api.connected,'reconstruct',side_effect=AssertionError('unsupported record must not execute')):
   out=api.audit_population(b,[fake])
  first=out['matches'][0];self.assertEqual(first['disposition'],'unproved');self.assertFalse(first['exclusions'])
  self.assertIn('unsupported_or_historical_record_schema',first['gaps'])
  self.assertEqual(out['groups'][0]['disposition'],'unproved');self.assertEqual(len(out['matches']),400)
 def test_out_of_plan_attempt_is_retained_as_integrity_gap(self):
  out=api.audit_population(bundle(),[dict(schema='unknown',binding=dict(match_id='unplanned'))])
  self.assertEqual(out['unplanned_attempt_indices'],[0]);self.assertIn('unplanned_attempts',out['gaps']);self.assertFalse(out['whole_set']['allowed'])
 def test_manifest_corruption_cannot_define_a_smaller_population(self):
  b=bundle();b['matches'].pop()
  out=api.audit_population(b,[])
  self.assertFalse(out['manifest_structure_verified']);self.assertEqual(out['planned_counts']['matches'],400)
  self.assertFalse(out['whole_set']['allowed']);self.assertIn('invalid_manifest_structure',out['gaps'])

class ReplayedDispositionTests(unittest.TestCase):
 def synthetic(self):
  # Adapter unit double only; public integration below uses real reconstruction.
  local=dict(selection_basis='planned_policy_random',strategic_unproven=True)
  return dict(schema='bound_population_connected_runtime.v1',binding=dict(match_id='test-1A'),connected_tools_sha256='unit-only',reconstruction_step_limit=3,
   opening=dict(mandatory_record=dict(local_record=local)),runtime=dict(decisions=[dict(decision_kind='normal_action',choice=dict(resolution_mode='seeded_fallback',strategic_unresolved=True))],supported_trigger_coverage=dict(covered=True),result=dict(winner='A')),completed=True)
 def test_replayed_legacy_exclusion_survives_mrp_and_a_later_unverified_attempt(self):
  b=bundle();r=self.synthetic();forged=copy.deepcopy(r);forged['runtime']['decisions']=[]
  with patch.object(api.connected,'reconstruct',return_value=r):out=api.audit_population(b,[r,forged])
  first=out['matches'][0];self.assertEqual(first['disposition'],'excluded');self.assertTrue(first['gaps']);self.assertEqual(first['attempt_count'],2)
  self.assertEqual(out['groups'][0]['disposition'],'excluded');self.assertEqual(out['disposition_counts']['matches']['excluded'],1)
  self.assertEqual(out['diagnostic_subset']['excluded_count'],1);self.assertIsNone(out['whole_set']['rates'])
  judgments=first['children'][0]['children'];self.assertEqual(judgments[0]['selection_kind'],'designated_policy');self.assertTrue(judgments[0]['strategic_unproven']);self.assertIsNone(judgments[0]['policy_eligible'])
  self.assertEqual(judgments[1]['disposition'],'excluded')
 def test_policy_conformance_does_not_prove_lock_or_other_judgments(self):
  b=bundle();r=self.synthetic();r['runtime']['decisions']=[];r['completed']=False
  with patch.object(api.connected,'reconstruct',return_value=r):out=api.audit_match([r],b,'test-1A')
  self.assertEqual(out['disposition'],'unproved');self.assertFalse(out['exclusions']);self.assertEqual(out['execution_status'],'incomplete')
  self.assertIn('input_lock_unauthenticated',out['gaps']);self.assertIn('match_not_completed',out['gaps'])
 def test_forged_active_flags_and_counterfactuals_are_not_source_evidence(self):
  b=bundle();r=self.synthetic();fake=copy.deepcopy(r);fake['runtime']['decisions'][0]['choice']['strategic_unresolved']=False
  with patch.object(api.connected,'reconstruct',return_value=r):out=api.audit_match([fake],b,'test-1A')
  self.assertEqual(out['disposition'],'unproved');self.assertFalse(out['exclusions']);self.assertIn('source_reconstruction_mismatch',out['gaps'])
 def test_conflicting_completed_attempts_do_not_select_a_favorable_result(self):
  b=bundle();a=self.synthetic();a['runtime']['decisions']=[];z=copy.deepcopy(a);z['runtime']['result']['winner']='B'
  with patch.object(api.connected,'reconstruct',side_effect=[a,z]):out=api.audit_match([a,z],b,'test-1A')
  self.assertEqual(out['disposition'],'excluded');self.assertIn('conflicting_authenticated_completed_attempts',out['exclusions'])

class RealEntryAdmissionTests(unittest.TestCase):
 def test_real_bound_prefix_reconstruction_is_required_and_remains_unproved(self):
  b=bundle();r=api.connected.reconstruct(b,'test-1A',3)
  out=api.audit_match([r],b,'test-1A')
  self.assertEqual(out['source_reconstructed_attempt_count'],1)
  self.assertEqual(out['execution_status'],'incomplete')
  self.assertIn('input_lock_unauthenticated',out['gaps'])
  first=out['children'][0]['children'][0]
  self.assertEqual(first['selection_kind'],'designated_policy');self.assertTrue(first['strategic_unproven']);self.assertIsNone(first['policy_eligible'])
  gates={g['name']:g for g in first['gates']}
  self.assertEqual(gates['complete_legal_set_and_allowed_information']['state'],'verified')
  self.assertEqual(gates['permitted_selection_basis']['state'],'unproved')
  self.assertEqual(first['old_116_applicability'],'outside_designated_policy_contract')
  response=out['children'][0]['children'][1];response_gates={g['name']:g for g in response['gates']}
  self.assertEqual(response_gates['permitted_selection_basis']['state'],'unproved')
  self.assertEqual(response_gates['legacy_116_status']['state'],'unproved')
  self.assertEqual(response_gates['complete_legal_set_and_allowed_information']['state'],'unproved')
  self.assertTrue(response['selection_computation']['selection_computation_verified'])
  self.assertTrue(response['selection_computation_bound_to_reconstructed_record'])
  bad=copy.deepcopy(r);bad['runtime']['events'][0]['seq']+=1
  failed=api.audit_match([bad],b,'test-1A')
  self.assertEqual(failed['source_reconstructed_attempt_count'],0);self.assertFalse(failed['exclusions'])

 def test_mixed_actual_prefix_limits_preserve_authenticated_exclusion(self):
  b=bundle();short=api.connected.reconstruct(b,'test-1A',1);long=api.connected.reconstruct(b,'test-1A',3)
  self.assertEqual(short['reconstruction_step_limit'],1);self.assertEqual(long['reconstruction_step_limit'],3)
  out=api.audit_match([short,long],b,'test-1A')
  self.assertEqual(out['source_reconstructed_attempt_count'],2)
  self.assertEqual(out['disposition'],'excluded');self.assertTrue(out['exclusions'])
  for invalid in (None,True,0,513):
   bad=copy.deepcopy(long);bad['reconstruction_step_limit']=invalid
   with patch.object(api.connected,'reconstruct',side_effect=AssertionError('invalid limit must not execute')):
    rejected=api.audit_match([bad],b,'test-1A')
   self.assertEqual(rejected['source_reconstructed_attempt_count'],0)
   self.assertFalse(rejected['exclusions'])

class CounterfactualBoundaryTests(unittest.TestCase):
 synthetic=ReplayedDispositionTests.synthetic
 def test_counterfactual_fallback_does_not_become_active_exclusion(self):
  b=bundle();r=self.synthetic();r['runtime']['decisions']=[dict(decision_kind='normal_action',choice=dict(resolution_mode='priority_unique'),counterfactual_baseline=dict(resolution_mode='seeded_fallback',strategic_unresolved=True))]
  with patch.object(api.connected,'reconstruct',return_value=r):out=api.audit_match([r],b,'test-1A')
  self.assertFalse(out['exclusions']);self.assertEqual(out['disposition'],'unproved')

if __name__=='__main__':unittest.main()
