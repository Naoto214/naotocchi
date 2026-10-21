"""02/77 full normal main movement delta, retaining existing payment proof."""
import copy,unittest
import test_proxy_population_payment_consumption as fixtures
from test_proxy_population_movement_lifetime import reentry_case
import proxy_continuation_candidates as candidates
import proxy_continuation_batch as batch
import proxy_continuation_actions as actions
import proxy_continuation_state as state
try:import proxy_population_main_movement_effect as api
except ImportError:api=None

def actual(template,variant='transform',equipment=False,legacy=False):
 b=copy.deepcopy(template);g=b['legacy_continuation']['game_state'];actor=g['turn_player'];p=g['players'][actor]
 if variant=='birth':p['hand'].append(p['board']['main']);p['board']['main']=None
 if equipment:
  source=next(s for s in p['hand'] if g['cards'][s]['card_id']=='I-sleepboost1');p['hand'].remove(source);p['board']['prepared'].append(source);b['runtime']['attachments'][source]=dict(controller=actor,target_instance_id=p['board']['main'],attached_event_seq=1);b['runtime']['public_prepared'][source]=dict(controller=actor,face_up=True,paid_time=2,placed_event_seq=1)
 card='M-antlion-01' if legacy else 'M-beetle-02' if variant=='transform' else 'M-antlion-08'
 action=next(a for a in candidates.audit(b,[])['legal_candidate_details'] if a['action_type']=='play_main' and a['card_id']==card and a['candidate_variant']==variant)
 if legacy:
  current,events=actions.old.normal.transition(state.current(b),dict(selected_action=action,selected_candidate=action['candidate_id'],candidate_set_complete=True),{});after=state.advance(b,current,current['last_event_seq'])
 else:after,events=batch.transition(b,action,[])
 return b,after,events[0]

class MainMovementEffectTests(unittest.TestCase):
 run_case=fixtures.ConsumptionTests.run_case
 def setUp(self):self.assertIsNotNone(api,'main movement full delta absent')
 def test_three_movements_equipment_legacy_birth_and_reentry(self):
  def run(template):
   for variant,equipment,legacy in [('birth',False,False),('time_skip',False,False),('transform',False,False),('time_skip',True,False),('transform',True,False),('birth',False,True)]:
    b,a,event=actual(template,variant,equipment,legacy);proof=api.audit(b,a,event)
    with self.subTest(variant=variant,equipment=equipment,legacy=legacy):self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_main_movement_verified']);self.assertFalse(proof['incarnation_origin_proven']);self.assertIsNone(proof['balance_admitted'])
   b,a,event=reentry_case();self.assertEqual(api.audit(b,a,event)['errors'],[]);return {}
  self.run_case(run)
 def test_unrelated_changes_and_wrong_destinations_are_rejected(self):
  def run(template):
   b,a,event=actual(template,equipment=True);actor=event['actor'];old=b['legacy_continuation']['game_state']['players'][actor]['board']['main'];equipment=next(s for s,row in b['runtime']['attachments'].items() if row['target_instance_id']==old)
   for mode in ('draw','old_main','equipment','partner','person','growth','reservation','metadata','usage','pending','response'):
    bad=copy.deepcopy(a);p=bad['legacy_continuation']['game_state']['players'][actor]
    if mode=='draw':p['hand'].append(p['discard'].pop(0))
    elif mode=='old_main':p['discard'].remove(old);p['hand'].append(old)
    elif mode=='equipment':p['discard'].remove(equipment);p['hand'].append(equipment)
    elif mode=='partner':p['board']['partner_stage']=3
    elif mode=='person':p['person_placed']=not p['person_placed']
    elif mode=='growth':p['growth']+=5
    elif mode=='reservation':p['reservations'].append('forged')
    elif mode=='metadata':bad['legacy_continuation']['game_state']['cards'][old]['card_id']='C-box'
    elif mode=='usage':bad['runtime']['ability_uses'].append(dict(forged=True))
    elif mode=='pending':bad['legacy_continuation']['pending_triggers'].append('forged')
    else:bad['legacy_continuation']['response_context']['consecutive_passes']=1
    with self.subTest(mode=mode):self.assertTrue(api.audit(b,bad,event)['errors'])
   return {}
  self.run_case(run)
 def test_wrong_discard_arrival_order_rejected_even_with_fresh_hashes(self):
  def run(template):
   import proxy_continuation_payments as payments
   b,a,event=actual(template,equipment=True);actor=event['actor'];offset=len(b['legacy_continuation']['game_state']['players'][actor]['discard']);p=a['legacy_continuation']['game_state']['players'][actor]
   self.assertGreater(len(p['discard'])-offset,1);p['discard'][offset:]=reversed(p['discard'][offset:])
   event=payments.transition_event(b,a,event['action_type'],actor,**{k:event[k] for k in ('source_instance_id','payment_time','source_reference','candidate_variant','payment_effect_ids','selected_candidate')})
   proof=api.audit(b,a,event);self.assertTrue(proof['errors']);self.assertFalse(proof['discard_arrival_order_proven']);return {}
  self.run_case(run)
 def test_coverage_rejects_self_consistent_extra_growth(self):
  import proxy_population_trigger_coverage as coverage
  def run(template):
   import proxy_continuation_payments as payments
   b,a,event=actual(template);a['legacy_continuation']['game_state']['players'][event['actor']]['growth']+=5
   event=payments.transition_event(b,a,event['action_type'],event['actor'],**{k:event[k] for k in ('source_instance_id','payment_time','source_reference','candidate_variant','payment_effect_ids','selected_candidate')})
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[event],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='wrongly accepted'
   self.assertIn('main movement full delta',message);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
