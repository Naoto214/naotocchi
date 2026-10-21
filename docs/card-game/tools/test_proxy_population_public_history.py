"""Actual concealed preparation returns must not expose card-copy IDs to rivals."""
import copy,unittest
import proxy_population_public_application as public
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_effects as effects
import proxy_population_trigger_latching as latching
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
from test_proxy_population_trigger_effects import case,resolving
from test_proxy_population_runtime import initial


class PublicHistoryBoundaryTests(unittest.TestCase):
 def test_actual_next_normal_inventory_hides_opponents_concealed_return_identity(self):
  def run(forced):
   e,o=case('C-bat');g=e['legacy_continuation']['game_state']
   p=g['players']['B'];p['deck'].extend(p['hand']);p['hand']=[];p['time']=0
   action=latching.current_actions(e,o)[0][0];target=action['target_instance_ids'][0]
   with effects.scope():
    after,_=effects.activate(e,action,o);before=resolving(after);result=effects.resolve(before,initial())
   final=result['new_envelopes'][0];history=result['new_events']
   step=runtime._step(final,initial(),history,[],[before,final],forced)
   projected=step['decision']['inventory']['public_history']
   self.assertNotIn(target,str(projected));self.assertTrue(projected[0]['result']['effect_applied'])
   self.assertEqual(history[0]['result']['returned_instance_id'],target)
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_owner_and_verified_faceup_id_preserved_but_missing_visibility_is_not_public(self):
  def run(forced):
   e,o=case('C-bat');action=latching.current_actions(e,o)[0][0];target=action['target_instance_ids'][0]
   with effects.scope():
    after,_=effects.activate(e,action,o);before=resolving(after);result=effects.resolve(before,initial());raw=result['new_events'][0]
   native=candidates.PUBLIC_HISTORY_PROJECTION
   with self.assertRaisesRegex(ValueError,'duplicate transition'):
    with public.scope([raw],[],[before,before]):pass
   with public.scope([raw],[],[before]):
    own=candidates.PUBLIC_HISTORY_PROJECTION(raw,'A');other=candidates.PUBLIC_HISTORY_PROJECTION(raw,'B')
    self.assertEqual(own['result']['returned_instance_id'],target);self.assertNotIn(target,str(other))
    self.assertEqual(candidates.PUBLIC_HISTORY_PROJECTION(other,'B'),other)
    altered=copy.deepcopy(raw);altered['actor']='B'
    with self.assertRaisesRegex(ValueError,'event identity'):candidates.PUBLIC_HISTORY_PROJECTION(altered,'B')
   self.assertIs(candidates.PUBLIC_HISTORY_PROJECTION,native)
   with public.scope([raw],[]):self.assertNotIn(target,str(candidates.PUBLIC_HISTORY_PROJECTION(raw,'B')))
   bad=copy.deepcopy(before);bad['legacy_continuation']['game_state']['players']['A']['time']+=1
   with public.scope([raw],[],[bad]):
    with self.assertRaisesRegex(ValueError,'preparation boundary'):candidates.PUBLIC_HISTORY_PROJECTION(raw,'B')
   # Use an actually attached public equipment source, not the hidden card's
   # identity or a face-up flag alone, to construct the public return fixture.
   e,o=case('C-bat');g=e['legacy_continuation']['game_state'];p=g['players']['A'];hidden=p['board']['prepared'].pop();p['hand'].append(hidden);e['runtime']['public_prepared'].pop(hidden)
   target=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='I-bowtie');(p['hand'] if target in p['hand'] else p['deck']).remove(target);p['board']['prepared'].append(target)
   e['runtime']['public_prepared'][target]=dict(controller='A',face_up=True,paid_time=2,placed_event_seq=2);e['runtime']['attachments'][target]=dict(controller='A',target_instance_id=p['board']['main'],attached_event_seq=2)
   with effects.scope():
    action=latching.current_actions(e,o)[0][0];after,_=effects.activate(e,action,o);before=resolving(after);raw=effects.resolve(before,initial())['new_events'][0]
   bound=copy.deepcopy(raw);bound['envelope_before_sha256']=state.state_hash(before)
   altered=copy.deepcopy(before);altered['runtime']['public_prepared'][target]['face_up']=False;altered['runtime']['attachments'].pop(target)
   state.validate(altered)
   with public.scope([bound],[],[altered]):
    with self.assertRaisesRegex(ValueError,'preparation boundary'):candidates.PUBLIC_HISTORY_PROJECTION(bound,'B')
   with public.scope([raw],[],[before]):
    projected=candidates.PUBLIC_HISTORY_PROJECTION(raw,'B')
    self.assertEqual(projected['result']['returned_instance_id'],target)
    self.assertEqual(candidates.PUBLIC_HISTORY_PROJECTION(projected,'B'),projected)
   return {}
  runtime.operation(initial(),run)

 def test_actual_initial_exchange_is_hidden_from_opponent_normal_inventory(self):
  from test_proxy_mandatory_population_input import bundle
  from proxy_population_connected_entry import reconstruct
  record=reconstruct(bundle(),'test-1A',13)
  raw=record['opening']['events'][1];source=raw['source_instance_id']
  self.assertIsNotNone(source)
  normals=[s['decision'] for s in record['runtime']['steps'] if s['decision'] and s['decision'].get('context',{}).get('decision_kind')=='normal_action']
  for actor in ('A','B'):
   decision=next(d for d in normals if d['context']['actor']==actor)
   event=next(e for e in decision['inventory']['public_history'] if e['seq']==2)
   if actor=='A':self.assertEqual(event['source_instance_id'],source)
   else:self.assertNotIn('source_instance_id',event)
  self.assertEqual(record['opening']['events'][1]['source_instance_id'],source)
  self.assertFalse(record['ready_for_execution'])

 def test_both_opening_owners_keep_private_exchange_and_projection_is_idempotent(self):
  from test_proxy_mandatory_population_input import bundle
  from proxy_population_opening import reconstruct_opening
  native=candidates.PUBLIC_HISTORY_PROJECTION
  for match in ('test-1A','test-1B'):
   record=reconstruct_opening(bundle(),match);events=record['events'];raw=events[1];before=copy.deepcopy(events)
   owner=raw['actor'];rival='B' if owner=='A' else 'A'
   with public.scope(events,[]):
    own=candidates.PUBLIC_HISTORY_PROJECTION(raw,owner);other=candidates.PUBLIC_HISTORY_PROJECTION(raw,rival)
    self.assertEqual(own['source_instance_id'],raw['source_instance_id']);self.assertNotIn('source_instance_id',other)
    self.assertEqual(candidates.PUBLIC_HISTORY_PROJECTION(other,rival),other)
    self.assertEqual(other['seq'],2);self.assertEqual(other['action_type'],'egg_exchange_bottom')
   self.assertEqual(events,before);self.assertIs(candidates.PUBLIC_HISTORY_PROJECTION,native)

 def test_scope_releases_on_invalid_trace_and_restores_projection(self):
  native=candidates.PUBLIC_HISTORY_PROJECTION
  with self.assertRaises((ValueError,KeyError)):
   with public.scope([],[],[{}]):pass
  self.assertIs(candidates.PUBLIC_HISTORY_PROJECTION,native)
  with public.scope([],[],[]):pass

if __name__=='__main__':unittest.main()
