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

 def test_scope_releases_on_invalid_trace_and_restores_projection(self):
  native=candidates.PUBLIC_HISTORY_PROJECTION
  with self.assertRaises((ValueError,KeyError)):
   with public.scope([],[],[{}]):pass
  self.assertIs(candidates.PUBLIC_HISTORY_PROJECTION,native)
  with public.scope([],[],[]):pass

if __name__=='__main__':unittest.main()
