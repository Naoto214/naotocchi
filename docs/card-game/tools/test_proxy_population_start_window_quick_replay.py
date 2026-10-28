"""History replay of a quick activation inside the turn-start window reproduces the live start closure."""
import copy,unittest
from test_proxy_population_trigger_connection import both
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_window as window
import proxy_population_history_replay as api
import proxy_continuation_actions as actions
import proxy_continuation_quick as quick
import proxy_continuation_end as end


def raw(event):
 return {k:v for k,v in event.items() if k not in end.BIND_KEYS}


def fixture():
 """Turn-start window with a prepared I-bowtie (group-012-B-first shape at 253).

 The live step enumerates the actor's quick cards under closed_start; the frozen
 inventory itself refuses a turn-start window with start equipment attached.
 """
 before,_,_=both();g=before['legacy_continuation']['game_state'];actor=g['turn_player'];p=g['players'][actor]
 # Hand stays at two cards so the prepared I-bowtie start equipment is live; seq 3 leaves the opening response.
 coin=next(s for s in p['deck'] if g['cards'][s]['card_id']=='I-c_coin2');p['deck'].remove(coin);p['deck'].append(p['hand'].pop());p['hand'].append(coin);p['time']=3;before['event_seq']=3
 history=[dict(seq=1,actor=actor,action_type='turn_start_and_normal_draw',fixture_only=True),dict(seq=2,actor=actor,action_type='egg_exchange_bottom',fixture_only=True),dict(seq=3,actor='B' if actor=='A' else 'A',action_type='response_pass',fixture_only=True)]
 with window.closed_start():inv=actions.response_inventory(before,initial(),history)
 action=next(a for a in inv['legal_candidate_details'] if a.get('source_instance_id')==coin)
 record=dict(actor=actor,selected_action=action,selected_candidate=action['candidate_id'],candidate_set_evidence=inv)
 with window.closed_start():after,generated=quick.activate(before,record,dict(public_events=history),initial(),verify_record=False)
 return before,after,history,raw(generated[0])


class StartWindowQuickReplayTests(unittest.TestCase):
 def run_case(self,callback):
  def run(forced):callback();return {}
  with connected.contract_scope():return runtime.operation(initial(),run)

 def test_turn_start_quick_activation_replays_under_the_start_closure(self):
  def run():
   before,after,history,event=fixture()
   self.assertEqual(before['legacy_continuation']['response_context']['window_kind'],'turn_start');self.assertTrue(actions.start_attachments(before,event['actor']))
   with self.assertRaises(ValueError):actions.response_inventory(before,initial(),history)
   proofs=api.quick_verifier(lambda events,shots,runtime:[],initial())(history+[event],[],[before,after])
   self.assertEqual([(p['event_seq'],p['kind'],p['card_id'],p['duration']) for p in proofs],[(event['seq'],event['action_type'],'I-c_coin2','activation_until_resolution')])
   bad=copy.deepcopy(after);bad['legacy_continuation']['game_state']['players'][event['actor']]['time']+=1
   with self.assertRaises(ValueError):api.quick_verifier(lambda events,shots,runtime:[],initial())(history+[event],[],[before,bad])
  self.run_case(run)


if __name__=='__main__':unittest.main()
