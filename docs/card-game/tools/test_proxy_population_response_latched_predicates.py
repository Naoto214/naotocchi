"""Current-condition negatives are separate from actual trigger occurrence closure."""
import copy,unittest
from test_proxy_population_trigger_predicates import case
from test_proxy_population_response_pass_effect import origin
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_board_predicates as api
import proxy_population_paid_draw as paid
import proxy_continuation_quick as quick

CARDS=('M-antlion-03','M-antlion-06','C-bat','P-cliff_goat')
def fixture(card,negative=False):
 e,o=case(card);c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A']
 if negative:
  if card in ('M-antlion-03','C-bat'):g['turn_player']='A'
  elif card=='M-antlion-06':p['deck'].extend(p['hand']);p['hand']=[]
  else:p['hand'].append(p['board']['main']);p['board']['main']=None
 c['response_context'].update(turn_player=g['turn_player'],priority_actor='A')
 h=[origin(e,'turn_start_and_normal_draw',g['turn_player'])]
 return e,h,o['source_instance_id']

class ResponseLatchedPredicateTests(unittest.TestCase):
 def run_case(self,callback):
  def run(forced):
   with paid.scope():return callback()
  with window.contract_scope():runtime.operation(initial(),run)
 def test_current_condition_absence_and_reoffered_candidates(self):
  def run():
   for card in CARDS:
    e,h,s=fixture(card,True);inv=quick.actions.response_inventory(e,initial(),h);out=api.audit_response(e,h,inv)
    self.assertEqual(out['errors'],[],card);self.assertIn(s,out['verified_source_ids'],card);self.assertEqual(out['latched_negative_audits'][s]['verified_candidate_count'],0);self.assertFalse(out['origin_authenticated'])
    bad=copy.deepcopy(inv);bad['legal_candidate_details'].append(dict(source_instance_id=s,action_type='activate_board_ability'));self.assertTrue(api.audit_response(e,h,bad)['errors'])
   return {}
  self.run_case(run)
 def test_positive_current_conditions_are_not_erased_by_empty_native_inventory(self):
  def run():
   for card in CARDS:
    e,h,s=fixture(card);inv=quick.actions.response_inventory(e,initial(),h);inv['legal_candidate_details']=[r for r in inv['legal_candidate_details'] if r.get('source_instance_id')!=s]
    out=api.audit_response(e,h,inv);self.assertEqual(out['errors'],[],card);self.assertNotIn(s,out['verified_source_ids']);self.assertTrue(any(r['source_instance_id']==s for r in out['unproved_sources']))
   return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
