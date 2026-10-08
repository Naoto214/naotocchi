"""A reaction-only prepared trigger cannot activate from a normal hand row."""
import copy,unittest
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
from proxy_population_start_window import _context
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_continuation_state as state
import proxy_continuation_candidates as candidates
import proxy_population_hand_predicates as api
import proxy_population_core_predicates as core
import proxy_population_board_predicates as board

class HandPreparedTriggerTests(unittest.TestCase):
 def test_actual_hand_row_is_excluded_and_composes_without_claiming_replacement_reachability(self):
  def run(forced):
   for time in (0,1,5):
    g,actor,source=game_with('I-poop1');g['phase']='normal_action';g['players'][actor]['time']=time
    e=runtime.engine.payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),3));h=[dict(seq=1,actor=actor,action_type='turn_start_and_normal_draw')]
    inv=candidates.audit(e,h);setting=next(r for r in inv['enumeration_units'] if r['source_instance_id']==source and r['action_type']=='set_item');self.assertEqual(setting['disposition'],'admitted' if time>=1 else 'excluded');row=next(r for r in inv['enumeration_units'] if r['source_instance_id']==source and r['action_type']=='trigger_prepared_item');out=api.audit_normal(e,h,inv)
    self.assertEqual(out['errors'],[]);proved=next((v for v in out['verified_units'] if v['enumeration_unit_id']==row['enumeration_unit_id']),None);self.assertIsNotNone(proved);self.assertFalse(proved['activation_allowed']);self.assertFalse(out['all_rule_opportunities_proven'])
    merged=board.compose(inv,[core.audit_normal(e,inv),out,board.audit_normal(e,inv)]);self.assertNotIn(row['enumeration_unit_id'],merged['unproved_enumeration_unit_ids'])
    for mode in ('admitted','source','variant'):
     bad=copy.deepcopy(inv);r=next(v for v in bad['enumeration_units'] if v['enumeration_unit_id']==row['enumeration_unit_id'])
     if mode=='admitted':r.update(disposition='admitted',candidate_id='forged',reason_codes=[])
     elif mode=='source':r['source_zone']='prepared'
     else:r['candidate_variant']='invented'
     self.assertTrue(api.audit_normal(e,h,bad)['errors'],mode)
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
