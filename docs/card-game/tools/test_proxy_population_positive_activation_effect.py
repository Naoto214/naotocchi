import copy,unittest
from test_proxy_population_trigger_effects import case
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_effects as effects
import proxy_population_trigger_latching as latching
import proxy_population_trigger_sequential as sequential
import proxy_population_opportunity_ledger as ledger
try:import proxy_population_positive_activation_effect as api
except ImportError:api=None

class Adapter:
 def enumerate(self,e,row):return latching.current_actions(e,row)
 def activate(self,e,action,row):return effects.activate(e,action,row)
 def compare(self,e,inv):return dict(status='unresolved_existing_contract')

def actual(card,phase=None):
 b,row=case(card);g=b['legacy_continuation']['game_state'];b['legacy_continuation']['response_context'].update(turn_player=g['turn_player'],priority_actor='B')
 if phase:g['phase']=phase
 j=ledger.observe(ledger.create(g['turn_player']),[row],'empty');i=initial();i['order_id']='unit-only'
 with effects.scope():record=sequential.step(b,i,j,Adapter())
 assert record['chosen']['action']=='activate'
 return b,record['after_envelope'],record['events'][0],record

class PositiveActivationEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'positive activation full delta absent')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_all_four_group_sources_and_m06_world_cost(self):
  def run():
   for card in sorted(latching.CARDS):
    b,a,event,record=actual(card);out=api.audit(b,a,event,record);self.assertEqual(out['errors'],[],card);self.assertTrue(out['supplied_positive_activation_verified']);self.assertIsNone(out['balance_admitted'])
   return {}
  self.run_case(run)
 def test_cost_receipt_usage_group_and_unrelated_changes_refused(self):
  def run():
   for card in sorted(latching.CARDS):
    b,a,event,record=actual(card)
    for mode in ('time','growth','usage','deck','link','receipt','priority','origin','decision','consume','missing'):
     before=copy.deepcopy(b);after=copy.deepcopy(a);ev=copy.deepcopy(event);r=copy.deepcopy(record);c=after['legacy_continuation'];p=c['game_state']['players']['A']
     if mode=='time':p['time']+=1
     elif mode=='growth':p['growth']+=5
     elif mode=='usage':after['runtime']['ability_uses']=[]
     elif mode=='deck':p['deck'].reverse()
     elif mode=='link':c['activation_zone'][-1]['target_instance_ids']=['wrong']
     elif mode=='receipt':c['activation_zone'][-1]['activation_receipt']['before_envelope_sha256']='0'*64
     elif mode=='priority':c['response_context']['priority_actor']='B'
     elif mode=='origin':ev['trigger_origin_event_seq']+=1
     elif mode=='decision':r['decision']['selected_candidate']='wrong'
     elif mode=='consume':r['after_ledger']=copy.deepcopy(r['before_ledger'])
     if mode=='missing':r=None
     else:r['before_envelope']=copy.deepcopy(before);r['after_envelope']=copy.deepcopy(after);r['events']=[copy.deepcopy(ev)]
     with self.subTest(card=card,mode=mode):self.assertTrue(api.audit(before,after,ev,r)['errors'])
   return {}
  self.run_case(run)
 def test_m06_group_after_resolution_returns_from_normal_phase(self):
  def run():
   b,a,event,record=actual('M-antlion-06','normal_action');self.assertEqual(api.audit(b,a,event,record)['errors'],[]);return {}
  self.run_case(run)
 def test_coverage_binds_actual_group_record_and_rejects_extra_growth(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run():
   b,a,event,record=actual('M-antlion-06');a['legacy_continuation']['game_state']['players']['A']['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],**{k:event[k] for k in ('source_instance_id','source_zone','selected_candidate','chain_link_id','target_instance_ids','payment','trigger_origin_event_seq','mandatory','source_reference')})
   record['after_envelope']=copy.deepcopy(a);record['events']=[copy.deepcopy(ev)]
   with self.assertRaisesRegex(ValueError,'positive activation full delta'):coverage.audit(dict(source_envelope=b,trigger_records=[record],steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
