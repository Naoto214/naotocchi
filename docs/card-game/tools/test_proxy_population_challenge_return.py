"""E-final-time resolved inside a challenge window: native final hashes follow the frozen return."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_trigger_latching import case
from test_proxy_population_return_challenge import in_battle
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_automatic_binding as automatic_binding
import proxy_continuation_actions as actions
import proxy_continuation_challenge as challenge
import proxy_continuation_quick as quick
import proxy_continuation_state as state
import proxy_continuation_runner as base
import proxy_resource_value_trajectory as old
from proxy_population_runtime import BIND_KEYS
try:import proxy_population_challenge_return as api
except ImportError:api=None


def stub(row,actor,hand,game):
 i=sorted(hand)[0];copy_id=game['cards'][i]['card_copy_id']
 return dict(decision_kind='mandatory_choice',selected_candidate=copy_id,selected_action=dict(candidate_id=copy_id,kind='card_copy',card_id=game['cards'][i]['card_id'],initial_instance_id=i),fixture_only=True)


def comparing_final_time():
 """A resolves E-final-time as the last link while the challenge is comparing."""
 e,_,_,_=case();c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A'];old_link=c['activation_zone'][-1]
 target=old_link['source_instance_id'];p['discard'].append(target)
 source=next(s for z in ('hand','deck','discard') for s in p[z] if g['cards'][s]['card_id']=='E-final-time')
 for z in ('hand','deck','discard'):
  if source in p[z]:p[z].remove(source)
 link=dict(link_id='response-link-3-'+source,action_type='use_event',source_zone='hand',actor='A',source_instance_id=source,card_copy_id=g['cards'][source]['card_copy_id'],card_id='E-final-time',target_instance_ids=[target],candidate_variant=None,payment=dict(time=2),source_references=['91-event-21-card-text-draft.md#E-final-time'])
 c['activation_zone']=[link];c['response_context'].update(chain_status='resolving',chain_links=[link['link_id']],consecutive_passes=2)
 return in_battle(e,'comparing')


def build_step(e,f):
 envelopes=[];prior=e
 for shot in f['new_snapshots']:prior=state.advance(prior,shot['continuation_state'],shot['event_seq']);envelopes.append(prior)
 bound=[];snaps=[];prior=e
 for event,after in zip(f['new_events'],envelopes):
  raw={k:v for k,v in event.items() if k not in BIND_KEYS};old._verify_generated(state.current(prior),state.current(after),[raw])
  bound.append(base.actions.bind_event(prior,after,raw));snaps.append(old._snapshot(state.current(after)));prior=after
 return dict(source_envelope=e,decision=None,mandatory_decisions=copy.deepcopy(f.get('new_decisions',[])),forced_record=copy.deepcopy(f),events=bound,snapshots=snaps,envelopes=envelopes,final_envelope=prior,result=None)


class ChallengeReturnTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'challenge return adapter missing')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def native(self,e):
  with patch.object(quick.final_time,'hand_bottom_decision',stub):return quick.resolve(state.current(e),initial())

 def test_connected_scope_installs_adapter_over_native_challenge_return(self):
  def run():
   e=comparing_final_time();native=self.native(e)
   self.assertIsNot(actions.RESOLUTION_RESULT_ADAPTER,challenge.normalize_result)
   red=challenge.normalize_result(e,copy.deepcopy(native));green=actions.normalize_resolution_result(e,copy.deepcopy(native))
   self.assertEqual(automatic_binding.audit_step(build_step(e,red))['errors'],['native final hash differs'])
   proof=automatic_binding.audit_step(build_step(e,green));self.assertEqual(proof['errors'],[]);self.assertTrue(proof['automatic_output_binding_verified'])
   self.assertEqual({k:v for k,v in green.items() if k not in api.FIELDS},{k:v for k,v in red.items() if k not in api.FIELDS})
   self.assertEqual(green['final_game_state_sha256'],green['new_events'][-1]['game_state_after_sha256'])
   self.assertEqual(green['final_continuation_state']['return_target'],'challenge_comparison')
   return {}
  self.run_case(run)

 def test_rebind_is_fail_closed_and_leaves_other_results_untouched(self):
  def run():
   e=comparing_final_time();native=self.native(e);red=challenge.normalize_result(e,copy.deepcopy(native))
   def raises(nat,norm):
    with self.assertRaises(ValueError):api.rebind(e,nat,norm)
   bad=copy.deepcopy(native);bad['final_game_state_sha256']='0'*64;raises(bad,red)
   bad=copy.deepcopy(native);bad['final_continuation_state_sha256']='0'*64;raises(bad,red)
   bad=copy.deepcopy(red);bad['final_continuation_state']['game_state']['players']['B']['growth']+=1;bad['new_snapshots'][-1]['continuation_state']['game_state']['players']['B']['growth']+=1;raises(native,bad)
   bad=copy.deepcopy(red);bad['final_continuation_state']['return_target']='normal_action_opportunity';bad['new_snapshots'][-1]['continuation_state']['return_target']='normal_action_opportunity';raises(native,bad)
   bad=copy.deepcopy(red);bad['new_events'][-1]['game_state_after_sha256']='0'*64;raises(native,bad)
   bad=copy.deepcopy(red);bad['final_continuation_state']['pending_triggers']=['mandatory:x'];bad['new_snapshots'][-1]['continuation_state']['pending_triggers']=['mandatory:x'];raises(native,bad)
   bad=copy.deepcopy(red);bad['new_events'][-1]['action_type']='forged';raises(native,bad)
   nochal=copy.deepcopy(e);nochal['legacy_continuation']['game_state'].pop('challenge');self.assertEqual(api.rebind(nochal,native,red),red)
   nofields={k:v for k,v in native.items() if k not in api.FIELDS};stripped={k:v for k,v in red.items() if k not in api.FIELDS};self.assertEqual(api.rebind(e,nofields,stripped),stripped)
   self.assertEqual(api.rebind(e,native,copy.deepcopy(native)),native)
   green=api.rebind(e,native,red);step=build_step(e,green);step['final_envelope']=copy.deepcopy(step['source_envelope'])
   self.assertFalse(automatic_binding.audit_step(step)['automatic_output_binding_verified'])
   return {}
  self.run_case(run)

 def test_scope_requires_native_adapter_and_restores_it(self):
  prior=actions.RESOLUTION_RESULT_ADAPTER
  try:
   actions.RESOLUTION_RESULT_ADAPTER=None
   with self.assertRaises(ValueError):
    with api.scope():pass
   self.assertIsNone(actions.RESOLUTION_RESULT_ADAPTER)
   actions.RESOLUTION_RESULT_ADAPTER=challenge.normalize_result
   with api.scope():
    self.assertIsNot(actions.RESOLUTION_RESULT_ADAPTER,challenge.normalize_result)
    with self.assertRaises(ValueError):
     with api.scope():pass
   self.assertIs(actions.RESOLUTION_RESULT_ADAPTER,challenge.normalize_result)
  finally:actions.RESOLUTION_RESULT_ADAPTER=prior


if __name__=='__main__':unittest.main()
