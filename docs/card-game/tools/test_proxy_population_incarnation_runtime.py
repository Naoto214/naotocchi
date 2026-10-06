"""Conditional native entry + physical lifetime + next real step; no new input."""
import copy,unittest
from test_proxy_population_departure import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_departure as departure
import proxy_population_discard_recovery as recovery
import proxy_population_activation_reference as references
import proxy_continuation_candidates as candidates
import proxy_continuation_payments as payments
import proxy_continuation_state as state
import proxy_continuation_preparation as preparation
try:import proxy_population_incarnation_runtime as api
except ImportError:api=None

class RuntimeIncarnationTests(unittest.TestCase):
 def test_native_replacement_then_response_preserve_generations_and_hashes(self):
  self.assertIsNotNone(api,'lifecycle runtime connection absent')
  def run(forced):
   e,s,old=fixture();e=payments.upgrade(e);p=e['legacy_continuation']['game_state']['players']['A'];p['hand'].remove(s);p['hand'].append(old[0]);p['board']['companions'][0]=s
   connection=api.Connection(e);before=copy.deepcopy(e);p['board']['companions'][0]=old[0];p['hand'].remove(old[0]);p['hand'].append(s);e['event_seq']+=1
   # Conditional supplied recovery, not a claim that this arbitrary unit move
   # is a legal game action. Actual movement below uses the existing handler.
   event=payments.transition_event(before,e,'unit_recovery','A');connection.capture(before,e,event)
   history=[dict(seq=1,action_type='person_placement',source_instance_id=s,actor='A'),event]
   with departure.scope(),recovery.scope(),references.scope(),connection.scope():
    inventory=candidates.audit(e,history);a=next(a for a in inventory['legal_candidate_details'] if a['action_type']=='place_companion' and a['target_instance_ids']==[old[0]])
    r=departure.replace_companion(e,a,history);after=r['envelope'];event=r['events'][0];successor=s.split('#')[0]+'#2'
    self.assertIn(successor,after['legacy_continuation']['game_state']['players']['A']['board']['companions']);self.assertEqual(event['instance_transitions'][0]['from_instance_id'],s)
    self.assertEqual(event['envelope_after_sha256'],state.canonical_sha256(after));self.assertEqual(connection.registry(after['legacy_continuation']['game_state'])['active'][s.split('#')[0]],successor)
    step=base._step(after,initial(),history+[{k:v for k,v in event.items() if k not in base.BIND_KEYS}],[],[e,after],forced)
    self.assertTrue(step['events']);self.assertIn(s,step['final_envelope']['legacy_continuation']['game_state']['cards'])
   return {}
  base.operation(initial(),run)

 def test_world_and_preparation_use_same_native_entry_finisher(self):
  from test_proxy_population_first_response import game_with
  from proxy_population_start_window import _context
  for card,kind in (('W-city','place_world'),('I-poop1','set_item')):
   def run(forced):
    g,actor,source=game_with(card);g['phase']='normal_action';p=g['players'][actor];p['time']=10
    e=state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2);e=payments.upgrade(e);p=e['legacy_continuation']['game_state']['players'][actor];p['hand'].remove(source)
    if kind=='place_world':p['board']['world']=source
    else:
     p['board']['prepared'].append(source);e['runtime']['public_prepared'][source]=dict(controller=actor,face_up=False,paid_time=2,placed_event_seq=1)
    connection=api.Connection(e);before=copy.deepcopy(e)
    if kind=='place_world':p['board']['world']=None
    else:p['board']['prepared'].remove(source);e['runtime']['public_prepared'].pop(source)
    p['hand'].append(source);e['event_seq']+=1;event=payments.transition_event(before,e,'unit_recovery',actor);connection.capture(before,e,event)
    history=[dict(seq=0,action_type='turn_start_and_normal_draw',actor=actor),dict(seq=1,action_type=kind,source_instance_id=source,actor=actor),event]
    with departure.scope(),recovery.scope(),references.scope(),connection.scope():
     inventory=candidates.audit(e,history);a=next(a for a in inventory['legal_candidate_details'] if a['action_type']==kind and a['source_instance_id']==source)
     after,generated=(preparation.set_card(e,a,history) if kind=='set_item' else base.engine.batch.transition(e,a,history));successor=source.split('#')[0]+'#2';self.assertIn(successor,api.life.field(api.life.game(after)));self.assertEqual(generated[0]['instance_transitions'][0]['to_instance_id'],successor)
     if kind=='set_item':self.assertIn(successor,after['runtime']['public_prepared']);self.assertNotIn(source,after['runtime']['public_prepared'])
     for _ in range(2):
      history.extend({k:v for k,v in event.items() if k not in base.BIND_KEYS} for event in generated)
      step=base._step(after,initial(),history,[],[e,after],forced);after=step['final_envelope'];generated=step['events'];self.assertTrue(generated)
    return {}
   with self.subTest(card=card):base.operation(initial(),run)

 def test_native_partner_and_main_reentry_keep_new_arrival_obligations(self):
  from test_proxy_population_first_response import game_with
  from proxy_population_start_window import _context
  from proxy_population_trigger_existing import ExistingAdapter
  for card,slot,kind in (('P-cat_ceo','partner','place_partner'),('M-beetle-01','main','play_main')):
   def run(forced):
    g,actor,source=game_with(card);g['phase']='normal_action';p=g['players'][actor];p['time']=10;p['person_placed']=False
    if slot=='partner':
     main=next(i for i in p['hand']+p['deck'] if g['cards'][i]['card_id']=='M-beetle-01')
     (p['hand'] if main in p['hand'] else p['deck']).remove(main);p['board']['main']=main
    p['hand'].remove(source);p['board'][slot]=source
    if slot=='partner':p['board']['partner_stage']=0
    e=payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2))
    connection=api.Connection(e);before=copy.deepcopy(e);p=e['legacy_continuation']['game_state']['players'][actor];p['board'][slot]=None;p['hand'].append(source)
    if slot=='partner':p['board']['partner_stage']=None
    e['event_seq']+=1;event=payments.transition_event(before,e,'unit_recovery',actor);connection.capture(before,e,event)
    history=[event]
    with departure.scope(),recovery.scope(),references.scope(),connection.scope():
     inventory=candidates.audit(e,history);a=next(a for a in inventory['legal_candidate_details'] if a['action_type']==kind and a['source_instance_id']==source)
     after,generated=base.engine.batch.transition(e,a,history);successor=source.split('#')[0]+'#2'
     self.assertEqual(generated[0]['source_instance_id'],successor)
     self.assertEqual(history,[event])
     if slot=='partner':self.assertEqual(after['legacy_continuation']['pending_triggers'],[f"mandatory:{after['event_seq']}:{successor}"])
     found=ExistingAdapter(history+generated).collect(after)['occurrences']
     self.assertIn(successor,[r['source_instance_id'] for r in found])
    return {}
   with self.subTest(card=card):base.operation(initial(),run)

 def test_capture_rejects_runtime_only_tampering_and_missing_full_hash(self):
  def run(forced):
   e,source,_=fixture();e=payments.upgrade(e);connection=api.Connection(e)
   after=copy.deepcopy(e);after['event_seq']+=1
   event=payments.transition_event(e,after,'unit_noop','A')
   bad=copy.deepcopy(after);bad['runtime']['ability_uses'].append(dict(source_instance_id=source,ability_key='unit',turn_player='A',round=1,count=1))
   original=copy.deepcopy(connection.records)
   with self.assertRaisesRegex(ValueError,'envelope'):connection.capture(e,bad,event)
   self.assertEqual(connection.records,original)
   for field in ('envelope_before_sha256','envelope_after_sha256','execution_contract_id'):
    missing=copy.deepcopy(event);missing.pop(field)
    with self.assertRaisesRegex(ValueError,'envelope'):connection.capture(e,after,missing)
    self.assertEqual(connection.records,original)
   connection.capture(e,after,event)
   return {}
  base.operation(initial(),run)

 def test_incomplete_root_cannot_bypass_prior_entry_guard_and_scope_is_nonreentrant(self):
  def run(forced):
   e,source,targets=fixture();e=payments.upgrade(e);c=api.Connection(e);history=[dict(seq=1,actor='A',action_type='person_placement',source_instance_id=source)]
   with departure.scope(),c.scope():
    with self.assertRaisesRegex(ValueError,'reentry|concurrency'):
     with c.scope():pass
    a=next(a for a in candidates.audit(e,history)['legal_candidate_details'] if a['action_type']=='place_companion')
    with self.assertRaisesRegex(ValueError,'history'):departure.replace_companion(e,a,history)
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
