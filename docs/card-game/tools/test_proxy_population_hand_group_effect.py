import copy,unittest
import test_proxy_population_hand_timing as fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_existing as existing
import proxy_population_hand_activation_effect as api

class HandGroupEffectTests(unittest.TestCase):
 def test_actual_group_record_required_and_tampering_rejected(self):
  i=initial();i['order_id']='unit-only'
  def prepare(forced):
   before,_,_,history,source=fixture.fixture()
   with connected.contract_scope():proof=existing.ExistingAdapter(history[:-1]).proof(before)
   return dict(before=before,history=history[:-1],proof=proof)
  p=runtime.operation(i,prepare);result=connected.segment(p['before'],i,p['history'],[],[p['before']],3,p['proof'])
  def check(forced):
   record=result['trigger_records'][0];self.assertEqual(record['chosen']['action'],'activate');b=record['before_envelope'];a=record['after_envelope'];ev=record['events'][0]
   self.assertNotEqual(b['legacy_continuation']['response_context']['priority_actor'],ev['actor'])
   self.assertEqual(api.audit(b,a,ev,record)['errors'],[]);self.assertTrue(api.audit(b,a,ev)['errors'])
   for mode in ('decision','chosen','origin','consume','rank','actor','event','extra_growth'):
    r=copy.deepcopy(record);event=copy.deepcopy(ev);after=copy.deepcopy(a)
    if mode=='decision':r['decision']['selected_candidate']='wrong'
    elif mode=='chosen':r['chosen']['activation']['candidate_variant']='wrong'
    elif mode=='origin':event['trigger_origin_event_seq']+=1;r['events']=[event]
    elif mode=='consume':r['after_ledger']=copy.deepcopy(r['before_ledger'])
    elif mode=='rank':r['inventory']['group_rank']+=1
    elif mode=='actor':r['inventory']['actor']='B'
    elif mode=='event':r['events'][0]['payment']['time']=0
    else:after['legacy_continuation']['game_state']['players'][ev['actor']]['growth']+=5;r['after_envelope']=copy.deepcopy(after)
    with self.subTest(mode=mode):self.assertTrue(api.audit(b,after,event,r)['errors'])
   return {}
  with connected.contract_scope():runtime.operation(i,check)
if __name__=='__main__':unittest.main()
