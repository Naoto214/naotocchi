import copy,unittest
import test_proxy_population_payment_consumption as fixtures
import proxy_continuation_actions as actions
import proxy_continuation_preparation as preparation
import proxy_continuation_candidates as candidates
import proxy_continuation_payments as payments
import proxy_population_incarnation_runtime as incarnation
try:import proxy_population_prepared_placement_effect as api
except ImportError:api=None

def setup(template):
 b=copy.deepcopy(template);g=b['legacy_continuation']['game_state'];actor=g['turn_player'];p=g['players'][actor]
 for source in list(p['board']['prepared']):
  p['board']['prepared'].remove(source);p['hand'].append(source);b['runtime']['attachments'].pop(source,None);b['runtime']['public_prepared'].pop(source,None)
 for card,slot in (('M-antlion-01','main'),('C-box','companions'),('P-cat_ceo','partner')):
  if slot=='companions':
   p['hand']+=p['board'][slot];p['board'][slot]=[]
  elif p['board'][slot]:p['hand'].append(p['board'][slot]);p['board'][slot]=None
  source=next(s for s in p['hand'] if g['cards'][s]['card_id']==card);p['hand'].remove(source)
  if slot=='companions':p['board'][slot].append(source)
  else:p['board'][slot]=source
 p['board']['partner_stage']=0
 return b

def actual(b,card,target=None,discount=False,history=None):
 rows=candidates.audit(b,history or [])['legal_candidate_details'];action=next(a for a in rows if a['card_id']==card and a['action_type'] in ('set_item','attach_item') and bool(a['evidence']['cost_modifiers'])==discount and a['target_instance_ids']==([] if target is None else [target]))
 after,events=(preparation.set_card if card=='I-poop1' else actions.attach)(b,action,history or [])
 return after,events[0]

class PreparedPlacementEffectTests(unittest.TestCase):
 run_case=fixtures.ConsumptionTests.run_case
 def setUp(self):self.assertIsNotNone(api,'prepared placement full delta absent')
 def test_all_current_equipment_targets_and_optional_zero_discount(self):
  def run(template):
   b=setup(template);g=b['legacy_continuation']['game_state'];board=g['players'][g['turn_player']]['board']
   cases=[('I-sleepboost1',board['main']),('I-bond1',board['companions'][0])]+[('I-bowtie',s) for s in (board['main'],board['partner'],board['companions'][0])]
   for card,target in cases:
    a,event=actual(b,card,target);proof=api.audit(b,a,event);self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_prepared_placement_verified'])
   for discount in (False,True):
    a,event=actual(b,'I-poop1',discount=discount);proof=api.audit(b,a,event);self.assertEqual(proof['errors'],[]);self.assertEqual(event['payment_time'],0 if discount else 1);self.assertIsNone(proof['balance_admitted'])
   return {}
  self.run_case(run)
 def test_full_delta_price_targets_and_usage_tampering_refused(self):
  def run(template):
   b=setup(template);actor=b['legacy_continuation']['game_state']['turn_player'];main=b['legacy_continuation']['game_state']['players'][actor]['board']['main']
   for card,target,discount in (('I-poop1',None,True),('I-bowtie',main,False)):
    a,event=actual(b,card,target,discount)
    for mode in ('time','cost','face','relation','usage','typed','person','growth','source','target','receipt','capacity','duplicate_use','negative_time'):
     before=copy.deepcopy(b);bad=copy.deepcopy(a);ev=copy.deepcopy(event);p=bad['legacy_continuation']['game_state']['players'][actor];source=ev['source_instance_id']
     if mode=='time':p['time']+=1
     elif mode=='cost':ev['payment_time']=True
     elif mode=='face':bad['runtime']['public_prepared'][source]['face_up']=card=='I-poop1'
     elif mode=='relation':bad['runtime']['attachments'][source]=dict(controller=actor,target_instance_id='wrong',attached_event_seq=ev['seq'])
     elif mode=='usage':bad['runtime']['ability_uses'].append(dict(source_instance_id=main,ability_key='invented',turn_player=actor,round=1,count=1))
     elif mode=='typed':bad['runtime']['payment_effects']=[]
     elif mode=='person':p['person_placed']=not p['person_placed']
     elif mode=='growth':p['growth']+=5
     elif mode=='source':ev['source_reference']='wrong'
     elif mode=='target':ev['target_instance_ids']=['wrong']
     elif mode=='receipt':ev['cost_modifiers']=[dict(source_instance_id='wrong')]
     elif mode=='capacity':before['legacy_continuation']['game_state']['players'][actor]['board']['prepared']=['one','two','three']
     elif mode=='duplicate_use':
      if not discount:continue
      before['runtime']['ability_uses']=copy.deepcopy(a['runtime']['ability_uses'])
     else:before['legacy_continuation']['game_state']['players'][actor]['time']=-1
     with self.subTest(card=card,mode=mode):self.assertTrue(api.audit(before,bad,ev)['errors'])
   return {}
  self.run_case(run)
 def test_reentry_binds_prepared_metadata_and_exhausted_discount(self):
  def run(template):
   for card in ('I-poop1','I-bowtie'):
    b=setup(template);actor=b['legacy_continuation']['game_state']['turn_player'];target=b['legacy_continuation']['game_state']['players'][actor]['board']['main'] if card=='I-bowtie' else None
    a,event=actual(b,card,target);source=event['source_instance_id'];connection=incarnation.Connection(b);connection.capture(b,a,event)
    recovered=copy.deepcopy(a);p=recovered['legacy_continuation']['game_state']['players'][actor];p['board']['prepared'].remove(source);p['hand'].append(source);recovered['runtime']['attachments'].pop(source,None);del recovered['runtime']['public_prepared'][source];recovered['event_seq']+=1
    recovered['legacy_continuation']['game_state']['phase']='normal_action';recovered['legacy_continuation']['response_context']=copy.deepcopy(b['legacy_continuation']['response_context'])
    ev=payments.transition_event(a,recovered,'unit_recovery',actor);connection.capture(a,recovered,ev)
    with connection.scope():end,events=actual(recovered,card,target,history=[event,ev])
    self.assertTrue(events['source_instance_id'].endswith('#2'));self.assertEqual(api.audit(recovered,end,events)['errors'],[])
    bad=copy.deepcopy(events);bad['instance_transitions']=[];self.assertTrue(api.audit(recovered,end,bad)['errors'])
   b=setup(template);a,event=actual(b,'I-poop1',discount=True);actor=event['actor'];source=event['source_instance_id'];p=a['legacy_continuation']['game_state']['players'][actor]
   p['board']['prepared'].remove(source);p['hand'].append(source);del a['runtime']['public_prepared'][source];a['legacy_continuation']['game_state']['phase']='normal_action';a['legacy_continuation']['response_context']=copy.deepcopy(b['legacy_continuation']['response_context'])
   rows=[r for r in candidates.audit(a,[])['legal_candidate_details'] if r['action_type']=='set_item'];self.assertTrue(rows);self.assertTrue(all(not r['evidence']['cost_modifiers'] for r in rows))
   end,ev=actual(a,'I-poop1');self.assertEqual(api.audit(a,end,ev)['errors'],[])
   return {}
  self.run_case(run)
 def test_coverage_refuses_added_growth_with_rebound_hashes(self):
  import proxy_population_trigger_coverage as coverage
  def run(template):
   b=setup(template);a,event=actual(b,'I-poop1',discount=True);a['legacy_continuation']['game_state']['players'][event['actor']]['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],**{k:event[k] for k in ('source_instance_id','target_instance_ids','payment_time','source_reference','cost_modifiers','selected_candidate')})
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted extra growth'
   self.assertIn('prepared placement full delta',message);return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
