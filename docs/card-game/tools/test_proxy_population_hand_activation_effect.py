import copy,unittest
import test_proxy_population_response_pass_effect as fixtures
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
from proxy_population_start_window import _context
import proxy_continuation_state as state
import proxy_continuation_payments as payments
import proxy_continuation_candidates as candidates
import proxy_continuation_actions as actions
import proxy_continuation_quick as quick
try:import proxy_population_hand_activation_effect as api
except ImportError:api=None

def actual(card,normal,passes=0):
 g,actor,source=game_with(card);g['phase']='normal_action' if normal else 'response_window';g['players'][actor]['time']=1
 c=dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity')
 c['response_context'].update(origin_event_seq=2,consecutive_passes=passes)
 b=payments.upgrade(state.create(c,2));history=[dict(seq=1,actor=actor,action_type='turn_start_and_normal_draw')]
 if not normal:history.append(fixtures.origin(b,'egg_exchange_bottom',actor))
 inv=candidates.audit(b,history) if normal else actions.response_inventory(b,initial(),history)
 action=next(a for a in inv['legal_candidate_details'] if a.get('card_id')==card and a['action_type'] in ('use_item','use_play','use_event'))
 a,events=quick.activate(b,dict(selected_action=action,candidate_set_evidence=inv),dict(public_events=history),initial(),verify_record=False)
 return b,a,events[0],history

class HandActivationEffectTests(unittest.TestCase):
 run_case=fixtures.ResponsePassEffectTests.run_case
 def setUp(self):self.assertIsNotNone(api,'hand activation full delta absent')
 def test_normal_response_and_prior_pass(self):
  def run():
   for card in ('I-c_coin2','G-hit-blow'):
    for normal,passes in ((True,0),(False,0),(False,1)):
     b,a,event,_=actual(card,normal,passes);out=api.audit(b,a,event);self.assertEqual(out['errors'],[],(card,normal,passes));self.assertTrue(out['supplied_hand_activation_verified']);self.assertFalse(out['activation_conditions_proven']);self.assertIsNone(out['balance_admitted'])
   return {}
  self.run_case(run)
 def test_payment_link_and_unrelated_changes_rejected(self):
  def run():
   for normal in (True,False):
    b,a,event,_=actual('I-c_coin2',normal)
    for mode in ('time','growth','hand','runtime','priority','passes','index','link','source','cost','reference','negative','bool','actor'):
     before=copy.deepcopy(b);after=copy.deepcopy(a);ev=copy.deepcopy(event);c=after['legacy_continuation'];p=c['game_state']['players'][event['actor']]
     if mode=='time':p['time']+=1
     elif mode=='growth':p['growth']+=5
     elif mode=='hand':p['hand'].append(event['source_instance_id'])
     elif mode=='runtime':after['runtime']['ability_uses'].append(dict(invented=True))
     elif mode=='priority':c['response_context']['priority_actor']='B' if c['response_context']['priority_actor']=='A' else 'A'
     elif mode=='passes':c['response_context']['consecutive_passes']=1
     elif mode=='index':c['response_context']['response_opportunity_index']+=1
     elif mode=='link':c['activation_zone'][-1]['target_instance_ids']=['invented']
     elif mode=='source':ev['source_instance_id']='invented'
     elif mode=='cost':ev['payment']['time']=True
     elif mode=='reference':ev['source_reference']='invented'
     elif mode in ('negative','bool'):before['legacy_continuation']['game_state']['players'][event['actor']]['time']=-1 if mode=='negative' else True
     else:ev['actor']='B' if event['actor']=='A' else 'A'
     with self.subTest(normal=normal,mode=mode):self.assertTrue(api.audit(before,after,ev)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_extra_growth(self):
  import proxy_population_trigger_coverage as coverage
  def run():
   b,a,event,history=actual('I-c_coin2',True);a['legacy_continuation']['game_state']['players'][event['actor']]['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],**{k:event[k] for k in ('selected_candidate','source_instance_id','candidate_variant','payment','target_instance_ids','chain_link_id','source_reference')})
   with self.assertRaisesRegex(ValueError,'hand activation full delta'):coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)]),history,dict(occurrences=[]))
   return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
