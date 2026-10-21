import copy,unittest
import test_proxy_population_payment_consumption as fixtures
import test_proxy_population_departure as departure_fixture
import proxy_population_departure as departure
import proxy_continuation_batch as batch
import proxy_continuation_candidates as candidates
import proxy_continuation_actions as actions
import proxy_continuation_payments as payments
import proxy_continuation_state as state
import proxy_population_incarnation_runtime as incarnation
try:import proxy_population_person_placement_effect as api
except ImportError:api=None

def actual(template,card,egg=False,legacy=False):
 b=copy.deepcopy(template);g=b['legacy_continuation']['game_state'];p=g['players'][g['turn_player']]
 for slot in ('partner',):
  if p['board'][slot]:p['hand'].append(p['board'][slot]);p['board'][slot]=None
 p['board']['partner_stage']=None;p['person_placed']=False
 if egg and p['board']['main']:p['hand'].append(p['board']['main']);p['board']['main']=None
 action=next(a for a in candidates.audit(b,[])['legal_candidate_details'] if a['card_id']==card and a['action_type'] in ('place_partner','place_companion'))
 if legacy:
  candidates.placement_certificate(b,action)
  with actions.old.placements.partner_placement_scope():result,events=actions.old.extension._apply_placement(state.current(b),dict(selected_action=action,selected_candidate=action['candidate_id']))
  a=state.advance(b,result,result['last_event_seq']);events=[actions.bind_event(b,a,events[0])]
 else:a,events=batch.transition(b,action,[])
 return b,a,events[0]

def replacement():
 e,source,old=departure_fixture.fixture(True,'I-bowtie');b=payments.upgrade(e)
 action=next(a for a in candidates.audit(b,[])['legal_candidate_details'] if a['action_type']=='place_companion' and a['target_instance_ids']==[old[0]])
 out=departure.replace_companion(b,action,[]);return b,out['envelope'],out['events'][0]

class PersonPlacementEffectTests(unittest.TestCase):
 run_case=fixtures.ConsumptionTests.run_case
 def setUp(self):self.assertIsNotNone(api,'person placement full delta absent')
 def test_current_people_cat_egg_legacy_and_replacement(self):
  def run(template):
   for card in ('C-bat','C-box','C-cat_friend','C-chameleon','C-chicken','P-cat_ceo','P-anglerfish','P-cliff_goat','P-desert_scorpion'):
    for egg in (False,True):
     b,a,event=actual(template,card,egg);proof=api.audit(b,a,event)
     with self.subTest(card=card,egg=egg):self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_person_placement_verified']);self.assertIsNone(proof['balance_admitted'])
   for card in ('C-box','P-desert_scorpion','P-cat_ceo'):
    b,a,event=actual(template,card,True,True);self.assertEqual(api.audit(b,a,event)['errors'],[])
   b,a,event=replacement();proof=api.audit(b,a,event);self.assertEqual(proof['errors'],[]);self.assertTrue(proof['discard_arrival_order_proven'])
   return {}
  self.run_case(run)
 def test_reentry_identity_and_cat_pending_generation(self):
  def run(template):
   for card in ('P-cat_ceo','C-box'):
    b,a,event=actual(template,card);source=event['source_instance_id'];actor=event['actor'];connection=incarnation.Connection(b);connection.capture(b,a,event)
    recovered=copy.deepcopy(a);p=recovered['legacy_continuation']['game_state']['players'][actor]
    if card.startswith('P-'):p['board']['partner']=None;p['board']['partner_stage']=None
    else:p['board']['companions'].remove(source)
    p['hand'].append(source);p['person_placed']=False;recovered['event_seq']+=1
    recovered['legacy_continuation']['pending_triggers']=[];recovered['legacy_continuation']['game_state']['phase']='normal_action';recovered['legacy_continuation']['response_context']=copy.deepcopy(b['legacy_continuation']['response_context'])
    ev=payments.transition_event(a,recovered,'unit_recovery',actor);connection.capture(a,recovered,ev)
    with connection.scope():
     action=next(row for row in candidates.audit(recovered,[event,ev])['legal_candidate_details'] if row['source_instance_id']==source and row['action_type'] in ('place_partner','place_companion'))
     end,events=batch.transition(recovered,action,[event,ev])
    self.assertTrue(events[0]['source_instance_id'].endswith('#2'));self.assertEqual(api.audit(recovered,end,events[0])['errors'],[])
    bad=copy.deepcopy(events[0]);bad['instance_transitions'][0]['from_instance_id']='missing';self.assertTrue(api.audit(recovered,end,bad)['errors'])
   return {}
  self.run_case(run)
 def test_replacement_typed_departure_and_wrong_discard_order(self):
  def run(template):
   b,a,event=replacement();actor=event['actor'];old=event['replaced_instance_id']
   # Derive two typed rows with the existing constructors, then execute again.
   for card,add in (('E-big-illness',payments.add_stat_modifier),('G-basketball-3d',payments.add_conditional_reward)):
    source=next(s for s,v in b['legacy_continuation']['game_state']['cards'].items() if s.startswith(actor+'-') and v['card_id']==card)
    add(b,actor,source,old)
   action=next(row for row in candidates.audit(b,[])['legal_candidate_details'] if row['action_type']=='place_companion' and row['target_instance_ids']==[old]);out=departure.replace_companion(b,action,[]);a=out['envelope'];event=out['events'][0]
   self.assertEqual(api.audit(b,a,event)['errors'],[])
   bad=copy.deepcopy(a);bad['runtime']['stat_effects']=b['runtime']['stat_effects'];self.assertTrue(api.audit(b,bad,event)['errors'])
   reordered=copy.deepcopy(a);reordered['legacy_continuation']['game_state']['players'][actor]['discard'].reverse();proof=api.audit(b,reordered,event);self.assertTrue(proof['errors']);self.assertFalse(proof['discard_arrival_order_proven'])
   return {}
  self.run_case(run)
 def test_full_delta_and_event_tampering_refused(self):
  def run(template):
   for make in (lambda:actual(template,'P-cat_ceo'),replacement):
    b,a,event=make()
    for mode in ('person','growth','time','pending','source','payment','actor','typed','equipment','identity','boundary'):
     bad=copy.deepcopy(a);before=copy.deepcopy(b);ev=copy.deepcopy(event);p=bad['legacy_continuation']['game_state']['players'][event['actor']]
     if mode=='person':p['person_placed']=False
     elif mode=='growth':p['growth']+=5
     elif mode=='time':p['time']+=1
     elif mode=='pending':bad['legacy_continuation']['pending_triggers']=['wrong']
     elif mode=='source':ev['source_instance_id']='missing'
     elif mode=='payment':ev['payment_time']=True
     elif mode=='actor':ev['actor']='B' if event['actor']=='A' else 'A'
     elif mode=='typed':bad['runtime']['payment_effects'].append({'invented':1})
     elif mode=='equipment':bad['runtime']['attachments']['invented']={}
     elif mode=='identity':bad['legacy_continuation']['game_state']['cards'][event['source_instance_id']]['card_id']='C-box'
     else:before['legacy_continuation']['game_state']['players'][event['actor']]['person_placed']=True
     if mode=='identity' and event['action_type']=='person_placement':continue
     with self.subTest(mode=mode):self.assertTrue(api.audit(before,bad,ev)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_extra_growth_with_fresh_event_hashes(self):
  import proxy_population_trigger_coverage as coverage
  def run(template):
   b,a,event=actual(template,'P-cat_ceo');a['legacy_continuation']['game_state']['players'][event['actor']]['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],**{k:event[k] for k in ('source_instance_id','payment_time','source_reference','candidate_variant','payment_effect_ids','selected_candidate')})
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted extra growth'
   self.assertIn('person placement full delta',message);return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
