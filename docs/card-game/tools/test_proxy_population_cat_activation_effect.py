import copy,unittest
import test_proxy_population_discard_recovery as fixture
import test_proxy_population_response_pass_effect as harness
import proxy_population_discard_recovery as recovery
import proxy_population_activation_reference as references
import proxy_continuation_payments as payments
import proxy_continuation_candidates as candidates
import proxy_continuation_triggers as triggers
import proxy_continuation_state as state
try:import proxy_population_cat_activation_effect as api
except ImportError:api=None

def actual(normal,gear=0,typed=False):
 b,history,source,target=fixture.fixture();b=payments.upgrade(b);g=b['legacy_continuation']['game_state'];p=g['players']['A']
 for card in ('I-bowtie','I-bond1')[:gear]:
  item=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card);(p['hand'] if item in p['hand'] else p['deck']).remove(item);p['board']['prepared'].append(item)
  b['runtime']['public_prepared'][item]=dict(controller='A',face_up=True,paid_time=2,placed_event_seq=2);b['runtime']['attachments'][item]=dict(controller='A',target_instance_id=source,attached_event_seq=2)
 if typed:
  stat_source=next(s for s in g['cards'] if s.startswith('A-') and g['cards'][s]['card_id']=='G-beach-volley')
  payments.add_stat_modifier(b,'A',stat_source,source)
 if normal:
  g['phase']='normal_action';action=next(a for a in candidates.audit(b,history)['legal_candidate_details'] if a['action_type']=='activate_companion_ability');a,events=recovery.activate_normal(b,action,history)
 else:
  action=recovery.board_candidates(state.current(b),history,source)[0][0];a,events=triggers.activate(b,dict(selected_action=action),history)
 return b,a,events[0],history

class CatActivationEffectTests(unittest.TestCase):
 def run_case(self,callback):
  def wrapped():
   with recovery.scope(),references.scope():return callback()
  return harness.ResponsePassEffectTests.run_case(self,wrapped)
 def setUp(self):self.assertIsNotNone(api,'cat source cost full delta absent')
 def test_normal_response_and_attached_equipment(self):
  def run():
   for normal in (True,False):
    for gear in (0,1,2):
     b,a,event,history=actual(normal,gear);out=api.audit(b,a,event,history);self.assertEqual(out['errors'],[],(normal,gear));self.assertTrue(out['supplied_cat_activation_verified']);self.assertTrue(out['equipment_discard_order_proven']);self.assertIsNone(out['balance_admitted'])
   return {}
  self.run_case(run)
 def test_wrong_cost_refund_equipment_target_usage_and_receipt(self):
  def run():
   b,a,event,history=actual(True,2)
   for mode in ('source','deck','discard','equipment','time','growth','usage','receipt','target','same_name','repeat','payment','chain'):
    before=copy.deepcopy(b);after=copy.deepcopy(a);ev=copy.deepcopy(event);c=after['legacy_continuation'];p=c['game_state']['players']['A']
    if mode=='source':p['board']['companions'].append(event['source_instance_id'])
    elif mode=='deck':p['deck'].reverse()
    elif mode=='discard':p['discard'].pop()
    elif mode=='equipment':after['runtime']['attachments']=copy.deepcopy(before['runtime']['attachments'])
    elif mode=='time':p['time']+=1
    elif mode=='growth':p['growth']+=5
    elif mode=='usage':after['runtime']['ability_uses']=[]
    elif mode=='receipt':c['activation_zone'][-1]['source_cost_receipt']['paid_event_seq']=True
    elif mode=='target':ev['target_instance_ids']=[]
    elif mode=='same_name':before['legacy_continuation']['game_state']['cards'][event['target_instance_ids'][0]]['card_id']='C-cat_friend'
    elif mode=='repeat':before['runtime']['ability_uses']=copy.deepcopy(after['runtime']['ability_uses'])
    elif mode=='payment':ev['payment']['time']=False
    else:c['response_context']['consecutive_passes']=1
    with self.subTest(mode=mode):self.assertTrue(api.audit(before,after,ev,history)['errors'])
   return {}
  self.run_case(run)
 def test_typed_departure_and_wrong_discard_order(self):
  def run():
   b,a,event,history=actual(True,2,typed=True);self.assertTrue(b['runtime']['stat_effects']);self.assertEqual(a['runtime']['stat_effects'],[]);self.assertEqual(api.audit(b,a,event,history)['errors'],[])
   bad=copy.deepcopy(a);bad['runtime']['stat_effects']=copy.deepcopy(b['runtime']['stat_effects']);self.assertTrue(api.audit(b,bad,event,history)['errors'])
   reordered=copy.deepcopy(a);discard=reordered['legacy_continuation']['game_state']['players']['A']['discard'];discard[-2:]=reversed(discard[-2:]);proof=api.audit(b,reordered,event,history);self.assertTrue(proof['errors']);self.assertFalse(proof['equipment_discard_order_proven']);self.assertIsNone(proof['balance_admitted']);return {}
  self.run_case(run)
 def test_coverage_refuses_extra_growth(self):
  import proxy_population_trigger_coverage as coverage
  def run():
   b,a,event,history=actual(False);a['legacy_continuation']['game_state']['players']['A']['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],**{k:event[k] for k in ('source_instance_id','source_zone','selected_candidate','chain_link_id','target_instance_ids','payment','trigger_origin_event_seq','mandatory','source_reference')})
   with self.assertRaisesRegex(ValueError,'cat activation full delta'):coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)]),history,dict(occurrences=[]))
   return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
