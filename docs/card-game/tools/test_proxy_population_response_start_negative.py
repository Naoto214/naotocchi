"""Own-start timing negatives must not be inferred from a suppression scope."""
import copy,unittest
from test_proxy_population_trigger_connection import both
from test_proxy_population_response_pass_effect import origin
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_window as window
import proxy_population_board_predicates as api
import proxy_continuation_quick as quick

class ResponseStartNegativeTests(unittest.TestCase):
 def test_placement_and_opponent_start_are_negative_but_own_start_stays_unproved(self):
  def run(forced):
   for mode in ('placement','opponent_start','own_start','later_pass'):
    e,j,proof=both();c=e['legacy_continuation'];e['event_seq']=5;c['response_context']['origin_event_seq']=5;g=c['game_state'];source=next(s for s in g['players']['A']['board']['companions'] if g['cards'][s]['card_id']=='C-chicken')
    if mode=='placement':c['response_context'].update(window_kind='after_normal_action',source_phase='post_placement_response');g['phase']='post_placement_response'
    if mode=='opponent_start':g['turn_player']='B';c['response_context']['turn_player']='B'
    h=[origin(e,'person_placement' if mode=='placement' else 'turn_start_and_normal_draw',g['turn_player'])]
    if mode=='later_pass':
     e['event_seq']+=1;h.append(origin(e,'response_pass','B'))
    with window.closed_start():
     inv=quick.actions.response_inventory(e,initial(),h);out=api.audit_response(e,h,inv)
    self.assertEqual(out['errors'],[],mode)
    if mode in ('placement','opponent_start'):
     self.assertIn(source,out['verified_source_ids'],mode);self.assertFalse(out['start_negative_audits'][source]['timing_matches'])
     bad=copy.deepcopy(inv);bad['legal_candidate_details'].append(dict(action_type='activate_board_ability',source_instance_id=source));self.assertTrue(api.audit_response(e,h,bad)['errors'])
     for history in (h[:-1],h+h):self.assertNotIn(source,api.audit_response(e,history,inv)['verified_source_ids'])
    else:self.assertNotIn(source,out['verified_source_ids'],mode)
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
