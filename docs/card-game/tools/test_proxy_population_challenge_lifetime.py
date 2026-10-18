"""Catch next-win retention/consumption and challenge-end collateral mutations."""
import copy,unittest
import test_proxy_continuation_challenge as fixtures
import proxy_continuation_payments as payments
import proxy_continuation_candidates as candidates
import proxy_continuation_challenge as challenge
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
from test_proxy_population_runtime import initial
try:import proxy_population_challenge_lifetime as api
except ImportError:api=None


def fixture(difference=2):
 h=fixtures.ChallengeTests();h.setUp();e=payments.upgrade(h.e)
 action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='challenge' and a['candidate_variant']=='power')
 e,_=challenge.declare(e,action);c=e['legacy_continuation'];g=c['game_state'];g['phase']='challenge_comparison';c['return_target']='challenge_comparison';c['response_context']['consecutive_passes']=2
 # Both mains have power2. Illness gives A power0; beach volley gives B power4.
 if difference==2:
  source=next(s for s,v in g['cards'].items() if v['card_id']=='E-big-illness');payments.add_stat_modifier(e,'B',source,g['players']['A']['board']['main'])
 elif difference==4:
  for card,owner in [('E-big-illness','A'),('G-beach-volley','B')]:
   source=next(s for s,v in g['cards'].items() if v['card_id']==card);payments.add_stat_modifier(e,'B',source,g['players'][owner]['board']['main'])
 for owner in 'AB':
  sources=[s for s,v in g['cards'].items() if s.startswith(owner+'-') and v['card_id']=='G-basketball-3d']
  for source in sources:payments.add_conditional_reward(e,owner,source,g['players'][owner]['board']['main'])
 return e

class LifetimeTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'challenge lifetime audit missing')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_next_win_consumes_even_without_exact_difference_reward(self):
  def run():
   for difference,reward in [(2,15),(4,5)]:
    e=fixture(difference);r=challenge.compare(e);a=r['new_envelopes'][0];event=r['new_events'][0];proof=api.audit(e,a,event)
    self.assertTrue(proof['next_win_consumption_verified'],proof['errors']);self.assertEqual(proof['consumed_effect_count'],1)
    self.assertEqual(event['result']['growth_requested'],reward)
    self.assertEqual([v['controller'] for v in a['runtime']['conditional_effects']],['A'])
    bad=copy.deepcopy(a);bad['runtime']['conditional_effects']=copy.deepcopy(e['runtime']['conditional_effects']);self.assertTrue(api.audit(e,bad,event)['errors'])
   return {}
  self.run_case(run)
 def test_draw_aborted_and_other_target_preserve_pending_reward(self):
  def run():
   for mode in ('draw','aborted','other_target'):
    e=fixture(0 if mode=='draw' else 2);g=e['legacy_continuation']['game_state']
    if mode=='aborted':g['players']['A']['discard'].append(g['players']['A']['board']['main']);g['players']['A']['board']['main']=None
    if mode=='other_target':
     for row in e['runtime']['conditional_effects']:row['target_instance_id']=next(s for s,v in g['cards'].items() if v['card_id'].startswith('M-') and s not in g['challenge']['participants'].values())
    r=challenge.compare(e);a=r['new_envelopes'][0];event=r['new_events'][0];proof=api.audit(e,a,event)
    self.assertEqual(proof['errors'],[],mode);self.assertEqual(proof['consumed_effect_count'],0)
    bad=copy.deepcopy(a);bad['runtime']['conditional_effects']=[];self.assertTrue(api.audit(e,bad,event)['errors'])
   return {}
  self.run_case(run)
 def test_finish_clears_only_current_challenge_effects(self):
  def run():
   e=fixture();g=e['legacy_continuation']['game_state'];source=next(s for s,v in g['cards'].items() if v['card_id']=='G-baseball-batting');payments.add_stat_modifier(e,'B',source,g['players']['B']['board']['main'])
   r=challenge.compare(e);e=r['new_envelopes'][0];c=e['legacy_continuation'];c['game_state']['phase']='challenge_end';c['return_target']='challenge_end';c['response_context']['consecutive_passes']=2
   r=challenge.finish(e);a=r['new_envelopes'][0];event=r['new_events'][0];proof=api.audit(e,a,event)
   self.assertTrue(proof['challenge_finish_verified'],proof['errors']);self.assertEqual(proof['expired_stat_count'],1)
   self.assertEqual(len(a['runtime']['stat_effects']),1);self.assertEqual(a['runtime']['conditional_effects'],e['runtime']['conditional_effects'])
   for mode in ('retain','erase_turn','erase_conditional','result','links'):
    b=copy.deepcopy(e);bad=copy.deepcopy(a);ev=copy.deepcopy(event)
    if mode=='retain':bad['runtime']['stat_effects']=copy.deepcopy(e['runtime']['stat_effects'])
    elif mode=='erase_turn':bad['runtime']['stat_effects']=[]
    elif mode=='erase_conditional':bad['runtime']['conditional_effects']=[]
    elif mode=='result':ev['result']['winner']=None
    else:b['legacy_continuation']['response_context']['chain_links']=['unresolved']
    self.assertTrue(api.audit(b,bad,ev)['errors'],mode)
   return {}
  self.run_case(run)

class LifetimeBoundaries(unittest.TestCase):
 setUp=LifetimeTests.setUp
 run_case=LifetimeTests.run_case
 def test_comparison_preserves_declaration_costs_and_closed_result_window(self):
  def run():
   e=fixture();g=e['legacy_continuation']['game_state'];g['players']['A']['discard'].append(g['players']['A']['board']['main']);g['players']['A']['board']['main']=None
   r=challenge.compare(e);a=r['new_envelopes'][0];event=r['new_events'][0]
   for mode in ('declaration','refund','links','priority','reservation'):
    bad=copy.deepcopy(a);c=bad['legacy_continuation']
    if mode=='declaration':c['game_state']['players']['B']['challenge_used']=False
    elif mode=='refund':c['game_state']['players']['B']['time']+=1
    elif mode=='links':c['response_context']['chain_links']=['unresolved']
    elif mode=='priority':c['response_context']['priority_actor']='A'
    else:c['game_state']['players']['B']['reservations'].append({'invented':True})
    with self.subTest(mode=mode):self.assertTrue(api.audit(e,bad,event)['errors'])
   return {}
  self.run_case(run)
 def test_capped_reward_still_consumes_all_matching_effects(self):
  def run():
   e=fixture();g=e['legacy_continuation']['game_state'];g['players']['B']['growth']=100
   source=next(r['source_instance_id'] for r in e['runtime']['conditional_effects'] if r['controller']=='B')
   e['event_seq']+=1;payments.add_conditional_reward(e,'B',source,g['players']['B']['board']['main'])
   r=challenge.compare(e);proof=api.audit(e,r['new_envelopes'][0],r['new_events'][0])
   self.assertEqual(proof['errors'],[]);self.assertEqual(proof['consumed_effect_count'],2)
   self.assertEqual(r['new_events'][0]['result']['growth_requested'],25);self.assertEqual(r['new_events'][0]['result']['growth_added'],0)
   self.assertFalse(proof['comparison_operands_proven']);self.assertIsNone(proof['balance_admitted']);return {}
  self.run_case(run)
 def test_result_boundary_identity_and_partial_consumption_mutations_fail(self):
  def run():
   e=fixture();r=challenge.compare(e);a=r['new_envelopes'][0];event=r['new_events'][0]
   for mode in ('actor','outcome','winner','values','requested','growth','sequence','links','passes','phase','source','pending','retained','erase_other'):
    b=copy.deepcopy(e);bad=copy.deepcopy(a);ev=copy.deepcopy(event)
    if mode=='actor':ev['actor']='A'
    elif mode=='outcome':ev['result']['outcome']='draw'
    elif mode=='winner':ev['result']['winner']='A'
    elif mode=='values':ev['result']['values']['B']=True
    elif mode=='requested':ev['result']['growth_requested']=5
    elif mode=='growth':bad['legacy_continuation']['game_state']['players']['A']['growth']+=5
    elif mode=='sequence':ev['seq']+=1
    elif mode=='links':b['legacy_continuation']['response_context']['chain_links']=['unresolved']
    elif mode=='passes':b['legacy_continuation']['response_context']['consecutive_passes']=1
    elif mode=='phase':b['legacy_continuation']['game_state']['phase']='normal_action'
    elif mode=='source':ev['source_reference']='foreign'
    elif mode=='pending':b['legacy_continuation']['pending_triggers']=['pending']
    elif mode=='retained':bad['runtime']['conditional_effects'][0]['amount']=0
    else:bad['runtime']['conditional_effects']=[]
    self.assertTrue(api.audit(b,bad,ev)['errors'],mode)
   # The actual shared coverage must reject an incorrect consume transition.
   import proxy_population_trigger_coverage as coverage
   bad=copy.deepcopy(a);bad['runtime']['conditional_effects']=copy.deepcopy(e['runtime']['conditional_effects'])
   step=dict(source_envelope=e,events=[event],envelopes=[bad])
   with self.assertRaisesRegex(ValueError,'challenge lifetime'):coverage.audit(dict(source_envelope=e,steps=[step]),[],dict(occurrences=[]))
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
