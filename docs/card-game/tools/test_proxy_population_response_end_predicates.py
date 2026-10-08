"""Reuse end predicates at ordinary response; positive groups stay unproved."""
import copy,unittest
import proxy_population_connected_entry as connected
import proxy_population_challenge_window as window
import proxy_population_board_predicates as api
from test_proxy_population_response_pass_effect import origin
from test_proxy_mandatory_population_input import bundle

class ResponseEndPredicateTests(unittest.TestCase):
 def test_actual_non_end_scorpion_is_bound_to_existing_end_negative(self):
  r=connected.reconstruct(bundle(),'test-1A',4);steps=[s for s in r['runtime']['steps'] if 'response_board_predicates' in s];step=steps[-1]
  g=step['source_envelope']['legacy_continuation']['game_state'];source=g['players']['A']['board']['partner'];self.assertEqual(g['cards'][source]['card_id'],'P-desert_scorpion')
  p=step['response_board_predicates'];self.assertIn(source,p['verified_source_ids']);self.assertTrue(p['end_negative_audits'][source]['current_trigger_predicates_verified']);self.assertEqual(p['end_negative_audits'][source]['verified_candidate_count'],0)
  self.assertTrue(step['response_source_predicate_coverage']['supplied_response_source_predicates_covered']);self.assertFalse(p['all_rule_opportunities_proven'])

 def test_four_negative_sources_reoffers_and_incomplete_history(self):
  from test_proxy_population_end_predicates import end_fixture
  from test_proxy_population_runtime import initial
  import proxy_population_runtime as runtime
  import proxy_continuation_quick as quick
  def run(forced):
   for card in ('M-beetle-02','W-countryside','P-desert_scorpion','I-sleepboost1'):
    e,h,o=end_fixture(card);source=o['source_instance_id'];h[-1]=origin(e,'response_pass','A')
    inv=quick.actions.response_inventory(e,initial(),h);out=api.audit_response(e,h,inv)
    self.assertEqual(out['errors'],[],card);self.assertIn(source,out['verified_source_ids']);self.assertEqual(out['end_negative_audits'][source]['verified_candidate_count'],0)
    bad=copy.deepcopy(inv);bad['legal_candidate_details'].append(dict(source_instance_id=source,action_type='activate_board_ability'));self.assertTrue(api.audit_response(e,h,bad)['errors'])
    for history in (h[:-1],h+[h[-1]]):
     out=api.audit_response(e,history,inv);self.assertNotIn(source,out['verified_source_ids']);self.assertNotIn(source,out['end_negative_audits'])
   return {}
  with window.contract_scope():runtime.operation(initial(),run)
 def test_positive_end_absence_or_closed_reason_is_not_negative_proof(self):
  from test_proxy_population_end_predicates import end_fixture
  from test_proxy_population_runtime import initial
  import proxy_population_runtime as runtime
  import proxy_continuation_quick as quick
  def run(forced):
   for card in ('M-beetle-02','W-countryside','P-desert_scorpion','I-sleepboost1'):
    e,h,o=end_fixture(card);source=o['source_instance_id'];h[-1]=origin(e,'open_turn_end_triggers','A',eligible_source_instance_ids=[source]);inv=quick.actions.response_inventory(e,initial(),h)
    for omitted in (False,True):
     actual=copy.deepcopy(inv)
     if omitted:actual['legal_candidate_details']=[r for r in actual['legal_candidate_details'] if r.get('source_instance_id')!=source]
     actual['reason_codes']=['initial_trigger_occurrence_closed']
     out=api.audit_response(e,h,actual);self.assertEqual(out['errors'],[]);self.assertNotIn(source,out['verified_source_ids']);self.assertNotIn(source,out['end_negative_audits']);self.assertTrue(any(r['source_instance_id']==source for r in out['unproved_sources']))
   return {}
  with window.contract_scope():runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
