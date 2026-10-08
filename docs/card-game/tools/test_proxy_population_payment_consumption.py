"""Next-transform consumption through the existing movement handler."""
import copy,unittest
import test_proxy_continuation_challenge as fixtures
import proxy_continuation_payments as payments
import proxy_continuation_candidates as candidates
import proxy_continuation_batch as batch
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
from test_proxy_population_runtime import initial
try:import proxy_population_payment_consumption as api
except ImportError:api=None


def fixture():
 h=fixtures.ChallengeTests();h.setUp();e=payments.upgrade(h.e);g=e['legacy_continuation']['game_state'];actor=g['turn_player'];p=g['players'][actor]
 p['hand']+=p['deck']+p['discard'];p['deck']=[];p['discard']=[];p['time']=10
 for owner in 'AB':
  for s,v in g['cards'].items():
   if s.startswith(owner+'-') and v['card_id']=='E-fateful-transform':payments.add_modifier(e,owner,s)
 return e

class ConsumptionTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'payment consumption audit missing')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback(fixture()))
 def transform(self,e):
  action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='play_main' and a['candidate_variant']=='transform')
  after,events=batch.transition(e,action,[]);return action,after,events[0]
 def test_actual_transform_consumes_all_own_and_preserves_other_controller(self):
  def run(e):
   action,a,event=self.transform(e);proof=api.audit(e,a,event)
   self.assertTrue(proof['payment_consumption_verified'],proof['errors']);self.assertGreater(proof['consumed_effect_count'],0)
   self.assertEqual(event['payment_time'],0)
   self.assertTrue(a['runtime']['payment_effects']);self.assertFalse(proof['payment_amount_proven']);self.assertFalse(proof['all_rule_opportunities_proven'])
   return {}
  self.run_case(run)
 def test_receipt_omission_duplicate_and_other_controller_consumption_fail(self):
  def run(e):
   action,a,event=self.transform(e)
   for ids in ([],event['payment_effect_ids']*2,['foreign']):self.assertTrue(api.audit(e,a,dict(event,payment_effect_ids=ids))['errors'])
   for kept in ([],e['runtime']['payment_effects']):
    bad=copy.deepcopy(a);bad['runtime']['payment_effects']=copy.deepcopy(kept);self.assertTrue(api.audit(e,bad,event)['errors'])
   return {}
  self.run_case(run)
 def test_time_skip_preserves_next_transform_and_pass_cannot_claim_consumption(self):
  def run(e):
   action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='play_main' and a['candidate_variant']=='time_skip')
   a,events=batch.transition(e,action,[]);proof=api.audit(e,a,events[0]);self.assertEqual(proof['errors'],[]);self.assertEqual(proof['consumed_effect_count'],0)
   bad=copy.deepcopy(a);bad['runtime']['payment_effects']=[];self.assertTrue(api.audit(e,bad,events[0])['errors'])
   self.assertTrue(api.audit(e,a,dict(events[0],action_type='response_pass',payment_effect_ids=[e['runtime']['payment_effects'][0]['effect_id']]))['errors'])
   return {}
  self.run_case(run)

 def test_wrong_actor_source_variant_boundary_and_retained_value_fail(self):
  def run(e):
   action,a,event=self.transform(e)
   for mode in ('actor','source','variant','phase','chain','retained'):
    b=copy.deepcopy(e);after=copy.deepcopy(a);ev=copy.deepcopy(event)
    if mode=='actor':ev['actor']='A' if event['actor']=='B' else 'B'
    elif mode=='source':ev['source_instance_id']='foreign'
    elif mode=='variant':ev['candidate_variant']='unknown'
    elif mode=='phase':b['legacy_continuation']['game_state']['phase']='response_window'
    elif mode=='chain':b['legacy_continuation']['response_context']['chain_links']=['open']
    else:after['runtime']['payment_effects'][0]['amount']=0
    self.assertTrue(api.audit(b,after,ev)['errors'],mode)
   return {}
  self.run_case(run)

class TargetDepartureTests(unittest.TestCase):
 setUp=ConsumptionTests.setUp
 run_case=ConsumptionTests.run_case
 transform=ConsumptionTests.transform
 def test_movement_removes_old_target_effects_without_erasing_other_target(self):
  def run(e):
   g=e['legacy_continuation']['game_state'];actor=g['turn_player'];other='A' if actor=='B' else 'B'
   for owner in (actor,other):
    for card,add in [('E-big-illness',payments.add_stat_modifier),('G-basketball-3d',payments.add_conditional_reward)]:
     source=next(s for s,v in g['cards'].items() if s.startswith(owner+'-') and v['card_id']==card)
     add(e,owner,source,g['players'][owner]['board']['main'])
   action,a,event=self.transform(e);proof=api.audit(e,a,event)
   self.assertTrue(proof.get('movement_target_expiry_verified'),proof)
   self.assertEqual(proof['expired_target_effect_count'],2)
   for family in ('stat_effects','conditional_effects'):
    for rows in ([],e['runtime'][family]):
     bad=copy.deepcopy(a);bad['runtime'][family]=copy.deepcopy(rows);self.assertTrue(api.audit(e,bad,event)['errors'],family)
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
