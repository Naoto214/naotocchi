"""Source-derived legacy choice opportunities stay outside designated policy."""
import copy,unittest
from test_proxy_population_runtime import initial
from test_proxy_population_trigger_effects import case,resolving
import proxy_population_runtime as runtime
import proxy_population_trigger_effects as effects
import proxy_population_trigger_latching as latching
try:import proxy_population_legacy_choice_obligations as api
except ImportError:api=None

class LegacyChoiceTests(unittest.TestCase):
 def test_stat_choice_is_required_and_no_longer_current_main_has_no_choice(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,occurrence=case('M-antlion-03')
   with effects.scope():
    action=latching.current_actions(e,occurrence)[0][0];after,_=effects.activate(e,action,occurrence);before=resolving(after)
    result=effects.resolve(before,initial());records=result['new_decisions']
    self.assertTrue(api.audit(before,initial(),records)['legacy_choice_coverage_verified'])
    self.assertFalse(api.audit(before,initial(),[])['legacy_choice_coverage_verified'])
    fake=copy.deepcopy(records);fake[0]['strategic_unresolved']=False
    bad=api.audit(before,initial(),fake);self.assertFalse(bad['legacy_choice_coverage_verified']);self.assertIsNone(bad['old_116_excluded'])
    p=before['legacy_continuation']['game_state']['players']['A'];p['discard'].append(p['board']['main']);p['board']['main']=None
    self.assertTrue(api.audit(before,initial(),[])['legacy_choice_coverage_verified'])
    self.assertFalse(api.audit(before,initial(),records)['legacy_choice_coverage_verified'])
   return {}
  runtime.operation(initial(),run)

 def test_connected_step_rejects_an_omitted_legacy_choice(self):
  import proxy_population_challenge_window as connected
  def run(forced):
   e,row=case('M-antlion-03')
   with effects.scope(),connected.contract_scope():
    action=latching.current_actions(e,row)[0][0];after,_=effects.activate(e,action,row);before=resolving(after)
    def native(e,i,*unused):return effects.resolve(e,i)
    result=runtime._step(before,initial(),[],[],[],native)
    self.assertTrue(result['legacy_effect_choice_obligations']['legacy_choice_coverage_verified'])
    def omitted(e,i,*unused):
     result=effects.resolve(e,i);result['new_decisions']=[];return result
    with self.assertRaisesRegex(ValueError,'legacy effect choice'):
     runtime._step(before,initial(),[],[],[],omitted)
   return {}
  runtime.operation(initial(),run)

 def test_existing_quick_recovery_requires_choice_only_after_success_with_deck(self):
  from test_proxy_population_discard_recovery import fixture
  import proxy_population_discard_recovery as recovery
  import proxy_continuation_quick as quick
  import proxy_continuation_payments as payments
  import proxy_continuation_state as state
  e,events,_,target=fixture();g=e['legacy_continuation']['game_state'];p=g['players']['A'];source=next(x for x in p['hand']+p['deck'] if g['cards'][x]['card_id']=='G-animal-shogi')
  if source in p['deck']:p['deck'].remove(source);p['hand'].append(source)
  p['time']=5;c=state.current(e);old=runtime.engine.base.old
  events[-1].update(game_state_after_sha256=old.start.opening._stop_state_sha256(g),continuation_state_after_sha256=old.start._hash(c))
  def run(forced):
   with recovery.scope():
    before=payments.upgrade(e);chance=runtime.engine.base.actions.response_inventory(before,initial(),events);action=next(x for x in chance['legal_candidate_details'] if x['source_instance_id']==source)
    after,_=quick.activate(before,dict(selected_action=action,candidate_set_evidence=chance),dict(public_events=events),initial());before=resolving(after)
    result=payments.resolve(before,initial());checked=api.audit(before,initial(),result['new_decisions'])
    self.assertTrue(checked['legacy_choice_coverage_verified']);self.assertEqual(checked['required_choice_count'],1);self.assertFalse(checked['policy_eligible'])
    self.assertFalse(api.audit(before,initial(),[])['legacy_choice_coverage_verified'])
    p=before['legacy_continuation']['game_state']['players']['A'];p['discard'].extend(p['deck']);p['deck']=[]
    result=payments.resolve(before,initial());checked=api.audit(before,initial(),result['new_decisions'])
    self.assertTrue(checked['legacy_choice_coverage_verified']);self.assertEqual(checked['no_choice_reason'],'empty_deck')
    p['discard'].remove(target);p['hand'].append(target)
    result=payments.resolve(before,initial());checked=api.audit(before,initial(),result['new_decisions'])
    self.assertTrue(checked['legacy_choice_coverage_verified']);self.assertEqual(checked['no_choice_reason'],'target_no_longer_legal')
   return {}
  runtime.operation(initial(),run)

 def test_native_search_invalid_target_does_not_create_a_choice(self):
  from test_proxy_population_effect_application_runtime import fixture
  import proxy_continuation_payments as payments
  def run(forced):
   before,actor,_=fixture('G-asteroids-classic');c=before['legacy_continuation'];link=c['activation_zone'][-1]
   link.update(action_type='use_play',target_instance_ids=[c['game_state']['players'][actor]['hand'][0]])
   result=payments.resolve(before,initial());checked=api.audit(before,initial(),result['new_decisions'])
   self.assertTrue(checked['legacy_choice_coverage_verified']);self.assertEqual(checked['no_choice_reason'],'target_no_longer_legal')
   return {}
  runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
