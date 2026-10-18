"""Conditional synthetic reentry through the production outer instance guard.

Recovery is an explicitly supplied unit transition, not a new game ruling.
No population execution, input generation or modification of saved artifacts.
"""
import copy,unittest
from contextlib import ExitStack
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
from proxy_population_start_window import _context
import proxy_population_runtime as base
import proxy_population_incarnation_runtime as api
import proxy_population_instance_boundary as guard
import proxy_population_departure as departure
import proxy_population_discard_recovery as recovery
import proxy_population_activation_reference as references
import proxy_continuation_state as state
import proxy_continuation_payments as payments
import proxy_continuation_candidates as candidates
import proxy_continuation_actions as actions
import proxy_continuation_preparation as preparation
import proxy_population_comparison_evidence as comparison

CASES=(('C-box','place_companion'),('P-cat_ceo','place_partner'),('M-beetle-01','play_main'),('W-city','place_world'),('I-sleepboost1','attach_item'),('I-poop1','set_item'))

def fixture(card,kind):
 g,actor,source=game_with(card);g['phase']='normal_action';p=g['players'][actor];p['time']=20;p['person_placed']=False
 if kind in ('attach_item','place_partner'):
  target=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='M-beetle-01')
  (p['hand'] if target in p['hand'] else p['deck']).remove(target);p['board']['main']=target
 p['deck'].extend(s for s in p['hand'] if s!=source);p['hand']=[source]
 e=payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2))
 return e,actor,source

def recover(connection,e,source,actor):
 after=copy.deepcopy(e);p=api.life.game(after)['players'][actor];b=p['board']
 for slot in ('main','partner','world'):
  if b[slot]==source:b[slot]=None
 if b['partner'] is None:b['partner_stage']=None
 for slot in ('companions','prepared'):
  if source in b[slot]:b[slot].remove(source)
 p['hand'].append(source);p['person_placed']=False
 for key in ('attachments','public_prepared'):after['runtime'][key].pop(source,None)
 after['legacy_continuation']['pending_triggers']=[]
 api.life.game(after)['phase']='normal_action';after['legacy_continuation']['response_context']=_context(actor,actor)
 after['event_seq']+=1
 event=payments.transition_event(e,after,'unit_recovery',actor);connection.capture(e,after,event)
 return after,event

def native(e,action,history):
 # The exact production entry wrappers are outside Connection.scope.
 # Attach/set use the same outer apply guard, with a real rebuilt decision.
 if action['action_type'] in ('attach_item','set_item'):
  inv=candidates.audit(e,history);g=api.life.game(e)
  context=dict(contract_version=base.engine.base.old.shadow.fallback.CONTRACT_VERSION,order_id=('reentry' if action['action_type']=='attach_item' else 'test-1A'),actor=g['turn_player'],actor_turn_index=g['round'],round=g['round'],phase='normal_action',decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
  decision=candidates.select(e,inv,context,base.POLICY,None)
  if decision['selected_action']['action_type']!=action['action_type']:raise AssertionError('synthetic selector did not select entry: '+decision['selected_candidate'])
  return actions.apply(e,decision,dict(public_events=history))
 return base.engine.batch.transition(e,action,history)

class EntryHistoryTests(unittest.TestCase):
 def run_case(self,callback):return base.operation(initial(),lambda forced:callback())
 def test_all_six_native_entries_reenter_through_outer_guard(self):
  for card,kind in CASES:
   def run():
    e,actor,source=fixture(card,kind);connection=api.Connection(e);history=[dict(seq=0,action_type='turn_start_and_normal_draw',actor=actor)]
    with departure.scope(),recovery.scope(),connection.scope(),guard.scope(),references.scope(),comparison.scope():
     action=next(a for a in candidates.audit(e,history)['legal_candidate_details'] if a['action_type']==kind)
     entered,events=native(e,action,history);history+=events
     self.assertEqual(events[0].get('instance_transitions',[]),[])
     recovered,event=recover(connection,entered,source,actor);history.append(event)
     action=next(a for a in candidates.audit(recovered,history)['legal_candidate_details'] if a['action_type']==kind)
     after,events=native(recovered,action,history);successor=source.split('#')[0]+'#2'
     self.assertEqual(events[0]['instance_transitions'][0]['to_instance_id'],successor)
     self.assertIn(successor,api.life.field(api.life.game(after)));self.assertNotIn(source,api.life.located(after))
     self.assertEqual(events[0]['envelope_after_sha256'],state.canonical_sha256(after))
     if kind in ('place_partner','play_main'):
      from proxy_population_trigger_existing import ExistingAdapter
      found=ExistingAdapter(history+events).collect(after)['occurrences']
      self.assertIn(successor,[r['source_instance_id'] for r in found])
     return {}
   with self.subTest(kind=kind):self.run_case(run)

 def test_wrong_or_missing_history_cannot_borrow_a_cached_state(self):
  def run():
   e,actor,source=fixture('C-box','place_companion');connection=api.Connection(e);history=[]
   with departure.scope(),recovery.scope(),connection.scope(),guard.scope():
    action=next(a for a in candidates.audit(e,history)['legal_candidate_details'] if a['action_type']=='place_companion')
    entered,events=native(e,action,history);history+=events
    recovered,event=recover(connection,entered,source,actor);history.append(event)
    guard.require_initial_entry(action,history,recovered)
    bad_event=copy.deepcopy(history);bad_event[-1]['actor']='B'
    bad_hash=copy.deepcopy(history);bad_hash[-1]['continuation_state_before_sha256']='0'*64
    for label,bad in [('missing',[]),('truncated',history[:-1]),('reordered',history[::-1]),('duplicate',history+history[-1:]),('event',bad_event),('hash',bad_hash)]:
     with self.subTest(case=label),self.assertRaisesRegex(ValueError,'history|chain'):
      guard.require_initial_entry(action,bad,recovered)
    foreign=copy.deepcopy(recovered);api.life.game(foreign)['players'][actor]['time']+=1
    with self.assertRaisesRegex(ValueError,'history|envelope'):
     guard.require_initial_entry(action,history,foreign)
    with self.assertRaisesRegex(ValueError,'history|envelope'):
     guard.require_initial_entry(action,history)
   return {}
  self.run_case(run)

 def test_hypothetical_branch_is_not_selected_history_and_retired_source_stops(self):
  def run():
   e,actor,source=fixture('C-box','place_companion');connection=api.Connection(e)
   with departure.scope(),recovery.scope(),connection.scope(),guard.scope():
    action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='place_companion')
    hypothetical,events=native(e,action,[])
    trial,event=recover(connection,hypothetical,source,actor);trial_history=events+[event]
    # Cached candidate transitions exist, but the selected public prefix is empty.
    with self.assertRaisesRegex(ValueError,'history'):
     guard.require_initial_entry(action,[],trial)
    # Root remains usable; evaluating a candidate did not mark it selected.
    guard.require_initial_entry(action,[],e)
    after,generated=native(trial,action,trial_history);successor=source.split('#')[0]+'#2'
    again,event=recover(connection,after,successor,actor);actual=trial_history+generated+[event]
    with self.assertRaisesRegex(ValueError,'retired|active'):
     guard.require_initial_entry(action,actual,again)
   return {}
  self.run_case(run)

 def test_root_prefix_and_record_state_binding_are_required(self):
  def run():
   e,actor,source=fixture('C-box','place_companion');history=[dict(seq=2,action_type='unit_root',actor=actor)]
   connection=api.Connection(e,history);action=dict(action_type='place_companion',source_instance_id=source)
   with connection.scope():
    guard.require_initial_entry(action,history,e)
    with self.assertRaisesRegex(ValueError,'root history'):guard.require_initial_entry(action,[],e)
    connection.records[api.life.digest(e)]['current_envelope_sha256']='0'*64
    with self.assertRaisesRegex(ValueError,'envelope history'):guard.require_initial_entry(action,history,e)
   return {}
  self.run_case(run)

 def test_saved_stop_history_proves_guard_without_resuming_attempt(self):
  import gzip,json,hashlib
  from pathlib import Path
  path=Path(__file__).resolve().parents[1]/'data/proxy-population-400-rebound-run-20261013/attempt-0001/record.json.gz'
  compressed=path.read_bytes();raw=gzip.decompress(compressed)
  self.assertEqual(hashlib.sha256(raw).hexdigest(),'59cc47da428c90700466db3c7421311709f09e7b4e6669c4ae278a98518f0d95')
  record=json.loads(raw);runtime=record['runtime']
  def run():
   before=runtime['source_envelope'];history=copy.deepcopy(record['opening']['events']);connection=api.Connection(before,history)
   self.assertEqual(connection.records[api.life.digest(before)],runtime['physical_lifecycle_root'])
   count=0
   for step in runtime['steps']:
    for event,after in zip(step['events'],step['envelopes']):
     connection.capture(before,after,event);history.append(event);before=after;count+=1
   self.assertEqual(count,275)
   self.assertEqual(connection.records[api.life.digest(before)],runtime['physical_lifecycle_final'])
   action=dict(action_type='attach_item',source_instance_id='A-035#1')
   with connection.scope(),guard.scope():guard.require_initial_entry(action,history,before)
   self.assertFalse(record['completed']);self.assertEqual(runtime['stop']['detail'],'prior field-entry history not captured by conditional root')
   self.assertEqual(path.read_bytes(),compressed)
   return {}
  self.run_case(run)

 def test_full_envelope_branch_collision_and_binding_tampering_stop(self):
  def run():
   e,actor,source=fixture('C-box','place_companion');connection=api.Connection(e,[])
   one=copy.deepcopy(e);one['event_seq']+=1;two=copy.deepcopy(one)
   two['runtime']['ability_uses'].append(dict(source_instance_id=source,ability_key='unit',turn_player=actor,round=1,count=1))
   first=payments.transition_event(e,one,'unit_noop',actor);second=payments.transition_event(e,two,'unit_noop',actor)
   connection.capture(e,one,first);connection.capture(e,two,second)
   action=dict(action_type='place_companion',source_instance_id=source)
   with connection.scope():
    guard.require_initial_entry(action,[first],one);guard.require_initial_entry(action,[second],two)
    with self.assertRaisesRegex(ValueError,'history|binding'):guard.require_initial_entry(action,[first],two)
    for field in base.BIND_KEYS:
     bad=copy.deepcopy(second);bad[field]='0'*64
     with self.subTest(field=field),self.assertRaisesRegex(ValueError,'history|binding'):guard.require_initial_entry(action,[bad],two)
    raw={k:v for k,v in first.items() if k not in base.BIND_KEYS}
    for branch in (one,two):
     with self.assertRaisesRegex(ValueError,'ambiguous|history'):guard.require_initial_entry(action,[raw],branch)
   return {}
  self.run_case(run)

 def test_late_event_annotation_does_not_replace_captured_transition(self):
  def run():
   e,actor,source=fixture('C-box','place_companion');connection=api.Connection(e,[])
   after=copy.deepcopy(e);after['event_seq']+=1
   event=payments.transition_event(e,after,'unit_noop',actor);connection.capture(e,after,event)
   annotated=dict(event,unit_annotation='final evidence');connection.capture(e,after,annotated)
   with connection.scope():
    for supplied in (event,annotated):guard.require_initial_entry(dict(action_type='place_companion',source_instance_id=source),[supplied],after)
   return {}
  self.run_case(run)

 def test_native_reentry_keeps_old_usage_and_rejects_unresolved_old_reservations(self):
  def run():
   e,actor,source=fixture('C-box','place_companion');connection=api.Connection(e,[])
   with departure.scope(),recovery.scope(),connection.scope(),guard.scope():
    action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='place_companion')
    entered,events=native(e,action,[]);recovered,event=recover(connection,entered,source,actor);history=events+[event]
    marked=copy.deepcopy(recovered);marked['event_seq']+=1
    usage=dict(source_instance_id=source,ability_key='unit_old_usage',turn_player=actor,round=1,count=1)
    marked['runtime']['ability_uses'].append(usage)
    event=payments.transition_event(recovered,marked,'unit_old_usage',actor);connection.capture(recovered,marked,event);history.append(event)
    after,generated=native(marked,action,history)
    self.assertEqual(after['runtime']['ability_uses'],[usage])
    self.assertEqual(generated[0]['source_instance_id'],source.split('#')[0]+'#2')
    blocked=copy.deepcopy(marked);blocked['event_seq']+=1
    reservation=dict(source_instance_id=source,target_instance_ids=[source])
    api.life.game(blocked)['players'][actor]['reservations']=[reservation]
    event=payments.transition_event(marked,blocked,'unit_unresolved_reservation',actor);connection.capture(marked,blocked,event)
    saved=copy.deepcopy(blocked)
    with self.assertRaises(ValueError):native(blocked,action,history+[event])
    self.assertEqual(blocked,saved)
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
