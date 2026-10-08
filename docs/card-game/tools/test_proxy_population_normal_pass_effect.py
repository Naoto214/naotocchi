import copy,unittest
import test_proxy_population_payment_consumption as fixtures
import proxy_continuation_actions as actions
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_continuation_payments as payments
try:import proxy_population_normal_pass_effect as api
except ImportError:api=None

def actual(b):
 action=next(a for a in candidates.audit(b,[])['legal_candidate_details'] if a['action_type']=='pass')
 current,events=actions.old.normal.transition(state.current(b),dict(selected_action=action,selected_candidate='pass',candidate_set_complete=True),{})
 a=state.advance(b,current,current['last_event_seq']);return a,actions.bind_event(b,a,events[0])

class NormalPassEffectTests(unittest.TestCase):
 run_case=fixtures.ConsumptionTests.run_case
 def setUp(self):self.assertIsNotNone(api,'normal pass delta absent')
 def test_normal_pass_keeps_time_and_turn_and_opens_opponent_response(self):
  def run(b):
   a,event=actual(b);proof=api.audit(b,a,event);self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_normal_pass_verified']);self.assertFalse(proof['end_obligations_proven']);self.assertIsNone(proof['balance_admitted'])
   return {}
  self.run_case(run)
 def test_resource_reset_expiry_turn_skip_and_open_chain_are_refused(self):
  def run(b):
   a,event=actual(b);actor=event['actor']
   for mode in ('time','growth','draw','reset','expiry','turn','round','phase','priority','passes','seq','actor','selection','chain','pending','challenge'):
    before=copy.deepcopy(b);bad=copy.deepcopy(a);ev=copy.deepcopy(event);c=bad['legacy_continuation'];g=c['game_state'];p=g['players'][actor]
    if mode=='time':p['time']=0
    elif mode=='growth':p['growth']+=5
    elif mode=='draw':p['discard'].append(p['hand'].pop())
    elif mode=='reset':p['challenge_used']=not p['challenge_used']
    elif mode=='expiry':bad['runtime']['payment_effects']=[]
    elif mode=='turn':g['turn_player']='A' if actor=='B' else 'B'
    elif mode=='round':g['round']+=1
    elif mode=='phase':g['phase']='turn_end'
    elif mode=='priority':c['response_context']['priority_actor']=actor
    elif mode=='passes':c['response_context']['consecutive_passes']=2
    elif mode=='seq':ev['seq']=True
    elif mode=='actor':ev['actor']='A' if actor=='B' else 'B'
    elif mode=='selection':ev['selected_candidate']='other'
    elif mode=='chain':before['legacy_continuation']['response_context']['chain_links']=['unknown']
    elif mode=='pending':before['legacy_continuation']['pending_triggers']=['unknown']
    else:before['legacy_continuation']['game_state']['challenge']={'unknown':True}
    with self.subTest(mode=mode):self.assertTrue(api.audit(before,bad,ev)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_refuses_added_growth_with_rebound_hashes(self):
  import proxy_population_trigger_coverage as coverage
  def run(b):
   a,event=actual(b);a['legacy_continuation']['game_state']['players'][event['actor']]['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],**{k:event[k] for k in ('source_instance_id','source_reference','selected_candidate')})
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted added growth'
   self.assertIn('normal pass full delta',message);return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
