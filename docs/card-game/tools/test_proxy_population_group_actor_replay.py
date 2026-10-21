"""History replay of a board group activation binds the event's actor and origin, not the window's priority actor."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_city_predicates import fixture as city_fixture
from test_proxy_population_runtime import initial
from proxy_mandatory_policy_contract import canonical
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_existing as existing
import proxy_population_trigger_sequential as sequential
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_replay as replay
import proxy_population_history_replay as api
import proxy_continuation_end as end


def fixture():
 """Opponent-turn W-city group (fixed-400 shape group-022-A-first 268/269).

 The post-placement window's priority actor is the turn player B; the source owner
 A activates the second-card group through the actual sequential step.
 """
 e,h,o=city_fixture(True);c=e['legacy_continuation'];c['response_context']['priority_actor']='B';c['game_state']['phase']='post_placement_response'
 adapter=existing.ExistingAdapter(h);proof=adapter.proof(e)
 assert [r['source_instance_id'] for r in proof['occurrences']]==[o['source_instance_id']]
 journal=ledger.observe(ledger.create('B'),proof['occurrences'],'empty')
 def choose(_initial,_current,_actor,options,*address):
  option=next(r for r in options if r['action']=='activate' and r['activation']['card_id']=='W-city');key=canonical(option).decode()
  return dict(selected_candidate=key,selected_action=dict(candidate_id=key,option=copy.deepcopy(option)),fixture_only=True)
 with patch.object(sequential.choices,'resolve',side_effect=choose):record=sequential.step(e,initial(),journal,adapter)
 after=record['after_envelope'];event={k:v for k,v in record['events'][0].items() if k not in end.BIND_KEYS}
 assert event['action_type']=='activate_response' and event['source_zone']=='board' and event['actor']=='A'
 return e,h,record,after,event


class GroupActorReplayTests(unittest.TestCase):
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())

 def test_group_activation_by_the_non_priority_actor_gets_its_provenance_row(self):
  def run():
   e,h,record,after,event=fixture()
   self.assertEqual(e['legacy_continuation']['response_context']['priority_actor'],'B');self.assertEqual(event['trigger_origin_event_seq'],5)
   with replay.scope([record]):
    proofs=api.triggers_verifier(lambda events,shots,runtime:[],initial())(h+[event],[],[e,after])
    self.assertEqual([(p['event_seq'],p['kind'],p['card_id'],p['certain_growth_difference'],p['duration']) for p in proofs],[(event['seq'],'activate_response','W-city',0,'activation_until_resolution')])
    self.assertTrue(end.RUNTIME_TRANSITION_VERIFIER(e,after,event,h))
   return {}
  self.run_case(run)

 def test_forged_actor_origin_or_delta_fails_closed(self):
  def run():
   e,h,record,after,event=fixture()
   def verify(ev,before,final):
    with replay.scope([record]):return api.triggers_verifier(lambda events,shots,runtime:[],initial())(h+[ev],[],[before,final])
   with self.assertRaises(ValueError):verify(dict(event,actor='B'),e,after)
   with self.assertRaises(ValueError):verify(dict(event,trigger_origin_event_seq=4),e,after)
   bad=copy.deepcopy(after);bad['legacy_continuation']['game_state']['players']['A']['time']+=1
   with self.assertRaises(ValueError):verify(event,e,bad)
   # Without its group origin the event stays on the window-actor path, which does not own A's world.
   plain={k:v for k,v in event.items() if k!='trigger_origin_event_seq'}
   with self.assertRaises(ValueError):verify(plain,e,after)
   with replay.scope([record]):self.assertFalse(end.RUNTIME_TRANSITION_VERIFIER(e,after,dict(event,actor='B'),h))
   return {}
  self.run_case(run)


if __name__=='__main__':unittest.main()
