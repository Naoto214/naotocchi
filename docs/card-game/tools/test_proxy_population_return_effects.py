"""Reject wrong recovery, refunds and collateral edits on real resolutions."""
import copy, unittest
from test_proxy_population_trigger_effects import case, resolving
from test_proxy_population_runtime import initial
import proxy_population_challenge_window as connected
import proxy_population_runtime as runtime
import proxy_population_trigger_effects as effects
import proxy_population_trigger_latching as latching
try:
 import proxy_population_return_effects as api
except ImportError:
 api=None


def transition(card, invalid=False, ending=False, departed=False):
 e,row=case(card)
 action=latching.current_actions(e,row)[0][0]
 activated,_=effects.activate(e,action,row)
 before=resolving(activated);c=before['legacy_continuation'];p=c['game_state']['players']['A']
 target=action['target_instance_ids'][0]
 if invalid:
  zone=p['board']['prepared'] if card=='C-bat' else p['discard']
  zone.remove(target);p['deck'].append(target)
  before['runtime']['public_prepared'].pop(target,None)
 if departed:
  source=row['source_instance_id']
  if card=='C-bat':p['board']['companions'].remove(source)
  else:p['board']['main']=None
  p['discard'].append(source)
 if ending:
  c['response_context']['source_phase']='turn_end';c['game_state']['phase']='turn_end_response'
 result=effects.resolve(before,initial())
 return before,result['new_envelopes'][0],result['new_events'][0],target


class ReturnEffectsTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'return-effect semantic audit absent')
 def run_case(self,callback):
  def run(forced):
   with effects.scope():return callback()
  with connected.contract_scope():return runtime.operation(initial(),run)
 def test_actual_return_and_invalid_target_preserve_paid_cost_and_source_departure(self):
  def run():
   for card in ('C-bat','M-antlion-06'):
    for invalid,ending,departed in ((False,False,False),(True,False,False),(False,True,False),(False,False,True)):
     b,a,event,target=transition(card,invalid,ending,departed);proof=api.audit(b,a,event)
     self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_return_resolution_verified'])
     self.assertEqual(proof['returned_instance_id'],None if invalid else target)
     self.assertFalse(proof['activation_proven']);self.assertFalse(proof['all_rule_opportunities_proven'])
   return {}
  self.run_case(run)
 def test_false_receipt_draw_refund_reservation_and_chain_changes_rejected(self):
  def run():
   for card in ('C-bat','M-antlion-06'):
    b,a,event,target=transition(card)
    for mode in ('receipt','draw','time','reservation','chain','usage','target'):
     after=copy.deepcopy(a);ev=copy.deepcopy(event);p=after['legacy_continuation']['game_state']['players']['A']
     if mode=='receipt':ev['result']['effect_applied']=False
     elif mode=='draw':p['hand'].append(p['deck'].pop(0))
     elif mode=='time':p['time']+=1
     elif mode=='reservation':p['reservations'].append('forged')
     elif mode=='chain':after['legacy_continuation']['response_context']['consecutive_passes']=1
     elif mode=='usage':after['runtime']['ability_uses']=[]
     else:ev['result']['target_instance_id']='foreign'
     with self.subTest(card=card,mode=mode):self.assertTrue(api.audit(b,after,ev)['errors'])
   return {}
  self.run_case(run)
 def test_wrong_dispatch_or_link_identity_rejected_and_unrelated_event_unproved(self):
  def run():
   b,a,event,_=transition('C-bat')
   for key,value in [('action_type','resolve_item'),('actor','B'),('source_instance_id','foreign'),('chain_link_id','foreign'),('source_reference','wrong'),('seq',True)]:
    self.assertTrue(api.audit(b,a,dict(event,**{key:value}))['errors'],key)
   b=copy.deepcopy(a)
   proof=api.audit(b,b,dict(action_type='response_pass'))
   self.assertEqual(proof['errors'],[]);self.assertFalse(proof['supplied_return_resolution_verified'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_false_draw_before_accepting_observed_transition(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run():
   b,a,event,_=transition('C-bat');p=a['legacy_continuation']['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0))
   fields={k:event[k] for k in ('source_instance_id','source_zone','chain_link_id','source_reference','result')}
   event=payments.transition_event(b,a,'resolve_board_ability','A',**fields)
   result=dict(source_envelope=b,steps=[dict(source_envelope=b,events=[event],envelopes=[a],final_envelope=a)])
   try:coverage.audit(result,[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted false draw'
   self.assertIn('return effect semantics differ',message)
   return {}
  self.run_case(run)
 def test_faceup_equipment_return_removes_only_its_attachment(self):
  def run():
   e,row=case('C-bat');g=e['legacy_continuation']['game_state'];p=g['players']['A']
   target=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='I-bowtie')
   for zone in ('hand','deck'):
    if target in p[zone]:p[zone].remove(target)
   p['board']['prepared'].append(target)
   e['runtime']['public_prepared'][target]=dict(controller='A',face_up=True,paid_time=2,placed_event_seq=2)
   e['runtime']['attachments'][target]=dict(controller='A',target_instance_id=row['source_instance_id'],attached_event_seq=2)
   action=next(a for a in latching.current_actions(e,row)[0] if a['target_instance_ids']==[target])
   activated,_=effects.activate(e,action,row);b=resolving(activated);result=effects.resolve(b,initial());a=result['new_envelopes'][0];ev=result['new_events'][0]
   self.assertEqual(api.audit(b,a,ev)['errors'],[]);self.assertNotIn(target,a['runtime']['attachments'])
   a['runtime']['attachments'][target]=copy.deepcopy(b['runtime']['attachments'][target])
   self.assertTrue(api.audit(b,a,ev)['errors']);return {}
  self.run_case(run)
 def test_existing_start_end_restart_adapter_preserves_return_semantics(self):
  import proxy_population_boundary_response as boundary
  import proxy_continuation_payments as payments
  def run():
   for card in ('C-bat','M-antlion-06'):
    for kind in ('start','end'):
     b,a,event,_=transition(card,ending=kind=='end')
     descriptor=dict(kind=kind,turn_player=b['legacy_continuation']['game_state']['turn_player'],origin_event_seq=3)
     result=boundary.normalize(b,payments.forced_result(b,a,event),descriptor)
     final=result['new_envelopes'][0];ev=result['new_events'][0]
     with self.subTest(card=card,kind=kind):self.assertEqual(api.audit(b,final,ev)['errors'],[])
     for field,value in [('kind','unknown'),('origin_event_seq',999),('turn_player','foreign')]:
      bad=copy.deepcopy(ev);bad['processing_boundary'][field]=value
      self.assertTrue(api.audit(b,final,bad)['errors'])
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
