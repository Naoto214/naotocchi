"""Actual typed expiration, independent of winner or balance eligibility."""
import copy,unittest
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_continuation_payments as payments
from test_proxy_population_runtime import initial
from test_proxy_population_trigger_latching import case
try:import proxy_population_effect_expiry as api
except ImportError:api=None


def expiry_case():
 e,_,_,_=case();e=payments.upgrade(e);c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A']
 p['discard'].append(c['activation_zone'][-1]['source_instance_id']);c['activation_zone']=[];c['pending_triggers']=[]
 c['response_context'].update(chain_status='empty',chain_links=[],consecutive_passes=2);g['phase']='turn_end';c['return_target']='turn_end';p['growth']=100
 for card,add in [('E-fateful-transform',lambda s:payments.add_modifier(e,'A',s)),('E-big-illness',lambda s:payments.add_stat_modifier(e,'A',s,p['board']['main'])),('G-basketball-3d',lambda s:payments.add_conditional_reward(e,'A',s,p['board']['main']))]:
  add(next(s for s,v in g['cards'].items() if v['card_id']==card))
 return e

class ExpiryTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'typed effect expiry audit missing')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback(expiry_case()))
 def test_real_expiration_at_growth100_preserves_game_and_clears_all_three_families(self):
  def run(e):
   r=payments.expire(e);after=r['new_envelopes'][0];event=r['new_events'][0];proof=api.audit(e,after,event)
   self.assertTrue(proof['typed_expiry_verified'],proof['errors']);self.assertEqual(proof['expired_effect_count'],3)
   self.assertFalse(proof['all_rule_opportunities_proven']);self.assertIsNone(proof['balance_admitted'])
   return {}
  self.run_case(run)
 def test_partial_duplicate_or_wrong_expired_receipt_fails(self):
  def run(e):
   r=payments.expire(e);a=r['new_envelopes'][0];event=r['new_events'][0]
   for ids in (event['expired_effect_ids'][:-1],event['expired_effect_ids']*2,['foreign']):
    self.assertTrue(api.audit(e,a,dict(event,expired_effect_ids=ids))['errors'])
   for family in ('payment_effects','stat_effects','conditional_effects'):
    bad=copy.deepcopy(a);bad['runtime'][family]=copy.deepcopy(e['runtime'][family]);self.assertTrue(api.audit(e,bad,event)['errors'])
   return {}
  self.run_case(run)
 def test_wrong_boundary_or_collateral_game_change_fails(self):
  def run(e):
   r=payments.expire(e);a=r['new_envelopes'][0];event=r['new_events'][0]
   for mode in ('phase','priority','chain','pending','actor','source','growth'):
    before=copy.deepcopy(e);after=copy.deepcopy(a);ev=copy.deepcopy(event)
    if mode=='phase':before['legacy_continuation']['game_state']['phase']='normal_action'
    elif mode=='priority':before['legacy_continuation']['response_context']['consecutive_passes']=1
    elif mode=='chain':before['legacy_continuation']['response_context']['chain_status']='building'
    elif mode=='pending':before['legacy_continuation']['pending_triggers']=['unhandled']
    elif mode=='actor':ev['actor']='B'
    elif mode=='source':ev['source_reference']='foreign'
    else:after['legacy_continuation']['game_state']['players']['A']['growth']=99
    self.assertTrue(api.audit(before,after,ev)['errors'],mode)
   return {}
  self.run_case(run)
 def test_turn_change_cannot_bypass_expiration_and_unrelated_step_does_not_certify_it(self):
  def run(e):
   after=copy.deepcopy(e);after['event_seq']+=1;after['legacy_continuation']['game_state'].update(turn_player='B',phase='turn_start')
   proof=api.audit(e,after,dict(seq=after['event_seq'],action_type='turn_end_completed',actor='A'))
   self.assertTrue(proof['errors'])
   after=copy.deepcopy(e);after['event_seq']+=1
   proof=api.audit(e,after,dict(seq=after['event_seq'],action_type='response_pass',actor='A'))
   self.assertEqual(proof['errors'],[]);self.assertFalse(proof['typed_expiry_verified'])
   return {}
  self.run_case(run)

 def test_actual_transition_coverage_exports_and_enforces_expiry(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_population_opportunity_ledger as ledger
  def run(e):
   r=payments.expire(e);a=r['new_envelopes'][0];event=r['new_events'][0]
   j=ledger.observe(ledger.create('A'),[],'empty')
   step=dict(source_envelope=e,final_envelope=a,events=[event],envelopes=[a],decision=None,forced_record=r)
   result=dict(source_envelope=e,final_envelope=a,steps=[step],events=[event],trigger_records=[],trigger_ledger=j,closed_turn_trigger_ledgers=[],completed=False)
   h=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw')]
   proof=coverage.audit(result,h,dict(occurrences=[]))
   self.assertIn('typed_effect_expiry_audits',proof,'real transition coverage bypasses expiration audit')
   self.assertTrue(proof['typed_effect_expiry_audits'][0]['typed_expiry_verified'])
   event['expired_effect_ids'].pop()
   with self.assertRaisesRegex(ValueError,'expiry'):coverage.audit(result,h,dict(occurrences=[]))
   return {}
  self.run_case(run)

 def test_source_departure_does_not_cancel_expiry_obligation(self):
  def run(e):
   g=e['legacy_continuation']['game_state']
   for family in api.FAMILIES:
    source=e['runtime'][family][0]['source_instance_id']
    owner=next(p for p in g['players'].values() if source in p['hand']+p['deck']+p['discard'])
    for zone in ('hand','deck'):
     if source in owner[zone]:owner[zone].remove(source);owner['discard'].append(source)
   r=payments.expire(e);self.assertTrue(api.audit(e,r['new_envelopes'][0],r['new_events'][0])['typed_expiry_verified'])
   return {}
  self.run_case(run)
 def test_empty_duplicate_typed_rows_and_source_drift_fail_closed(self):
  from unittest.mock import patch
  def run(e):
   r=payments.expire(e);a=r['new_envelopes'][0];event=r['new_events'][0]
   for mode in ('empty','duplicate','untyped','seq','reservation'):
    b=copy.deepcopy(e);ev=copy.deepcopy(event)
    if mode=='empty':
     for family in api.FAMILIES:b['runtime'][family]=[]
     ev['expired_effect_ids']=[]
    elif mode=='duplicate':b['runtime']['payment_effects']*=2
    elif mode=='untyped':b['runtime']['payment_effects'][0]['amount']=999
    elif mode=='seq':ev['seq']=True
    else:b['legacy_continuation']['game_state']['players']['A']['reservations']=[{'unproved':True}]
    self.assertTrue(api.audit(b,a,ev)['errors'],mode)
   with patch.dict(api.SOURCES,{api.REFERENCE:'0'*64}):self.assertTrue(api.audit(e,a,event)['errors'])
   return {}
  self.run_case(run)

 def test_nonempty_chain_links_cannot_be_certified_as_closed(self):
  def run(e):
   e['legacy_continuation']['response_context']['chain_links']=[{'link_id':'unresolved'}]
   r=payments.expire(e)
   proof=api.audit(e,r['new_envelopes'][0],r['new_events'][0])
   self.assertTrue(proof['errors'],'empty status does not establish empty chain links')
   self.assertFalse(proof['typed_expiry_verified'])
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
