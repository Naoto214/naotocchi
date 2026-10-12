"""Reject unverified ordinary comparison certificates at the current entry."""
import copy,unittest
from unittest.mock import patch
import proxy_population_decision_binding as binding
import test_proxy_population_information_use as fixture

class SelectionEntryTests(unittest.TestCase):
 def scoped(self,body):
  with fixture.window.contract_scope():fixture.runtime.operation(fixture.initial(),body)
 def test_normal_payment_missing_candidate_cannot_pass_current_gate(self):
  def run(forced):
   e,_,_,h=fixture.supplied('normal_action','I-poop1');s=fixture.execute(e,h,forced)
   proof=s['normal_payment_operands'];self.assertEqual(proof['errors'],[])
   removed=proof['verified_candidates'].pop();proof['unproved_candidates'].append(dict(candidate_id=removed['candidate_id']))
   with self.assertRaisesRegex(ValueError,'current comparison payment coverage incomplete'):binding.require_current_predicates(s)
   return {}
  self.scoped(run)
 def test_normal_invalid_selection_cannot_pass_current_gate(self):
  def run(forced):
   e,_,_,h=fixture.supplied('normal_action','I-poop1');s=fixture.execute(e,h,forced)
   d=s['decision'];self.assertEqual(d['choice']['resolution_mode'],'seeded_fallback')
   self.assertIsNone(d['problem']);self.assertEqual(s['evaluation']['legacy_116'],'excluded')
   d['choice']['selected_candidate']='foreign'
   with self.assertRaisesRegex(ValueError,'current normal comparison evidence incomplete'):binding.require_current_predicates(s)
   return {}
  self.scoped(run)
 def test_response_invalid_selection_cannot_pass_current_gate(self):
  def run(forced):
   e,_,_,h=fixture.supplied('response_window','I-poop1');s=fixture.execute(e,h,forced)
   self.assertEqual(s['decision']['resolution_mode'],'response_unique')
   s['decision']['selected_action']['candidate_id']='foreign'
   with self.assertRaisesRegex(ValueError,'current selection computation incomplete'):binding.require_current_predicates(s)
   return {}
  self.scoped(run)
 def test_response_priority_requires_premises_but_fallback_stays_excluded(self):
  import test_proxy_population_response_operands as response
  def run(forced):
   e,h=response.supplied();s=fixture.execute(e,h,forced);binding.require_current_comparison(s)
   self.assertTrue(s['selection_computation_audit']['selection_computation_verified']);self.assertFalse(s['selection_computation_audit']['operand_provenance_verified'])
   bad=copy.deepcopy(s);bad['response_comparison_operands']['supplied_resolution_premises_verified']=False
   with self.assertRaisesRegex(ValueError,'current response comparison coverage incomplete'):binding.require_current_comparison(bad)
   e,h=response.supplied(growth=96);s=fixture.execute(e,h,forced)
   self.assertEqual(s['decision']['resolution_mode'],'response_seeded_fallback');binding.require_current_comparison(s)
   self.assertNotIn('selection_computation_audit',s);self.assertEqual(s['evaluation']['legacy_116'],'excluded');self.assertIsNone(s['policy_eligible']);return {}
  self.scoped(run)
 def test_connected_entry_stops_before_exporting_unverified_computation(self):
  import proxy_population_selection_basis as selection
  import proxy_population_connected_entry as connected
  import test_proxy_mandatory_population_input as inputs
  native=selection.audit
  def incomplete(record):
   proof=native(record);self.assertEqual(proof['errors'],[]);proof['selection_computation_verified']=False;return proof
  with patch.object(selection,'audit',incomplete):r=connected.reconstruct(inputs.bundle(),'test-1A',4)
  self.assertIn('current selection computation incomplete',r['runtime']['stop']['detail']);self.assertEqual(r['runtime']['steps'],[])

if __name__=='__main__':unittest.main()
