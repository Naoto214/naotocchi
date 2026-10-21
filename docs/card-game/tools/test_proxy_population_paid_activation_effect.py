import copy,unittest
import test_proxy_population_paid_draw as fixture
import test_proxy_population_response_pass_effect as harness
import proxy_population_paid_draw as paid
import proxy_continuation_triggers as triggers
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_population_activation_reference as references
try:import proxy_population_paid_activation_effect as api
except ImportError:api=None

def actual(card,normal,index=0):
 b,source,costs=fixture.fixture(card)
 if normal:
  b['legacy_continuation']['game_state']['phase']='normal_action'
  action=[a for a in candidates.audit(b,[])['legal_candidate_details'] if a['action_type']=='activate_main_ability'][index];a,events=paid.activate_normal(b,action,[])
 else:
  action=triggers.board_candidates(state.current(b),[],source,runtime=b['runtime'])[0][index];a,events=triggers.activate(b,dict(selected_action=action),[])
 return b,a,events[0]

class PaidActivationEffectTests(unittest.TestCase):
 def run_case(self,callback):
  def wrapped():
   with references.scope():return callback()
  return harness.ResponsePassEffectTests.run_case(self,wrapped)
 def setUp(self):self.assertIsNotNone(api,'paid activation full delta absent')
 def test_both_sources_normal_response_and_both_bottom_orders(self):
  def run():
   for card in ('M-antlion-02','M-antlion-08'):
    for normal in (True,False):
     for index in range(1 if card=='M-antlion-02' else 2):
      b,a,event=actual(card,normal,index);out=api.audit(b,a,event);self.assertEqual(out['errors'],[],(card,normal,index));self.assertTrue(out['supplied_paid_activation_verified']);self.assertIsNone(out['balance_admitted'])
   return {}
  self.run_case(run)
 def test_payment_usage_metadata_chain_and_full_delta_tampering(self):
  def run():
   for card in ('M-antlion-02','M-antlion-08'):
    b,a,event=actual(card,True)
    for mode in ('deck','time','growth','usage','duplicate','target','receipt','payment','chain','main','turn','face'):
     before=copy.deepcopy(b);after=copy.deepcopy(a);ev=copy.deepcopy(event);actor=event['actor'];c=after['legacy_continuation'];p=c['game_state']['players'][actor]
     if mode=='deck':p['deck'].reverse()
     elif mode=='time':p['time']+=1
     elif mode=='growth':p['growth']+=5
     elif mode=='usage':after['runtime']['ability_uses']=[]
     elif mode=='duplicate':before['runtime']['ability_uses']=copy.deepcopy(after['runtime']['ability_uses'])
     elif mode=='target':ev['target_instance_ids']=['wrong']
     elif mode=='receipt':c['activation_zone'][-1]['activation_receipt']['before_envelope_sha256']='0'*64
     elif mode=='payment':ev['payment']['time']=True
     elif mode=='chain':c['response_context']['consecutive_passes']=1
     elif mode=='main':before['legacy_continuation']['game_state']['players'][actor]['board']['main']=None
     elif mode=='turn':before['legacy_continuation']['game_state']['turn_player']='B' if actor=='A' else 'A'
     else:
      if card!='M-antlion-02':continue
      next(iter(before['runtime']['public_prepared'].values()))['face_up']=True
     with self.subTest(card=card,mode=mode):self.assertTrue(api.audit(before,after,ev)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_rebound_extra_growth(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run():
   b,a,event=actual('M-antlion-08',False);a['legacy_continuation']['game_state']['players'][event['actor']]['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],**{k:event[k] for k in ('source_instance_id','source_zone','selected_candidate','chain_link_id','target_instance_ids','payment','trigger_origin_event_seq','mandatory','source_reference')})
   with self.assertRaisesRegex(ValueError,'paid activation full delta'):coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
