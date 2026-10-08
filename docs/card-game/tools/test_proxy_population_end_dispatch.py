"""64 dispatch prerequisites, separate from isolated effect delta validation."""
import copy,unittest
from test_proxy_population_end_window_effect import actual
from test_proxy_population_runtime import initial
import proxy_population_challenge_window as window
import proxy_population_runtime as runtime
import proxy_continuation_payments as payments
import proxy_continuation_triggers as triggers
import proxy_population_effect_expiry as expiry
try:import proxy_population_end_dispatch as api
except ImportError:api=None

KINDS=('expire_payment_modifiers','turn_end_completed','r10_final_comparison','maintained100_final_comparison')

class EndDispatchTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'end dispatch ordering audit absent')
 def run_case(self,fn):
  with window.contract_scope():return runtime.operation(initial(),fn)
 def test_native_opens_eligible_source_before_expiry_or_finish(self):
  def run(forced):
   for card in ('M-beetle-02','W-countryside','P-desert_scorpion','I-sleepboost1'):
    b,a,e,h=actual(card);g=b['legacy_continuation']['game_state'];s=next(s for s,v in g['cards'].items() if v['card_id']=='E-fateful-transform');payments.add_modifier(b,'A',s)
    r=forced(b,initial(),h,[],[b]);self.assertEqual(r['new_events'][0]['action_type'],'open_turn_end_triggers')
    bad=payments.expire(b);self.assertEqual(expiry.audit(b,bad['new_envelopes'][0],bad['new_events'][0])['errors'],[])
    for kind in KINDS:
     proof=api.audit(b,h,dict(seq=b['event_seq']+1,actor='A',action_type=kind),{})
     self.assertIn('unopened eligible end source',str(proof['errors']),(card,kind))
   return {}
  self.run_case(run)
 def test_no_eligible_source_is_proved_without_native_empty_inventory(self):
  def run(forced):
   from unittest.mock import patch
   for card in ('M-beetle-02','W-countryside','P-desert_scorpion','I-sleepboost1'):
    b,a,e,h=actual(card);p=b['legacy_continuation']['game_state']['players']['A'];source=p['board']['main']
    h.append(dict(seq=4,actor='A',action_type='main_movement',source_instance_id=source,candidate_variant='time_skip'))
    if card=='W-countryside':h.insert(-1,dict(h[1],seq=3))
    elif card=='P-desert_scorpion':h[1]['action_type']='set_item'
    elif card=='I-sleepboost1':p['time']=1
    with patch.object(triggers,'end_inventory',side_effect=AssertionError('native enumeration used')):
     for kind in KINDS:
      proof=api.audit(b,h,dict(seq=5,actor='A',action_type=kind),{})
      self.assertEqual(proof['errors'],[],card);self.assertTrue(proof['supplied_end_dispatch_verified']);self.assertFalse(proof['all_rule_opportunities_proven']);self.assertFalse(proof['history_origin_authenticated'])
   return {}
  self.run_case(run)
 def test_past_open_requires_its_actual_delta_and_cannot_reopen(self):
  def run(forced):
   b,a,e,h=actual('M-beetle-02');later=copy.deepcopy(a);later['event_seq']=7;c=later['legacy_continuation'];c['game_state']['phase']='turn_end';c['response_context'].update(chain_status='empty',chain_links=[],consecutive_passes=2)
   history=h+[e];trace={b['event_seq']:b,a['event_seq']:a,later['event_seq']:later};event=dict(seq=8,actor='A',action_type='turn_end_completed')
   p=api.audit(later,history,event,trace);self.assertEqual(p['errors'],[]);self.assertTrue(p['supplied_end_dispatch_verified'])
   missing=api.audit(later,history,event,{});self.assertFalse(missing['supplied_end_dispatch_verified']);self.assertEqual(missing['errors'],[])
   for mode in ('classification','trace','duplicate','future','missing_start'):
    hs=copy.deepcopy(history);ts=copy.deepcopy(trace)
    if mode=='classification':hs[-1]['eligible_source_instance_ids']=[]
    elif mode=='trace':ts[a['event_seq']]['legacy_continuation']['game_state']['players']['A']['growth']+=5
    elif mode=='duplicate':hs.append(copy.deepcopy(e))
    elif mode=='future':hs[-1]['seq']=10
    else:hs=hs[1:]
    with self.subTest(mode=mode):self.assertTrue(api.audit(later,hs,event,ts)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_invokes_dispatch_order_after_full_delta(self):
  import proxy_population_trigger_coverage as coverage
  def run(forced):
   b,a,e,h=actual('M-beetle-02');g=b['legacy_continuation']['game_state'];source=next(s for s,v in g['cards'].items() if v['card_id']=='E-fateful-transform');payments.add_modifier(b,'A',source);r=payments.expire(b);after=r['new_envelopes'][0];event=r['new_events'][0]
   result=dict(source_envelope=b,steps=[dict(source_envelope=b,events=[event],envelopes=[after],final_envelope=after)],trigger_records=[])
   with self.assertRaisesRegex(ValueError,'end dispatch order'):coverage.audit(result,h,dict(occurrences=[]))
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
