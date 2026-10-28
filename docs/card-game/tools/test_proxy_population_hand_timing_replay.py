"""History replay of a registered hand-timing reaction reuses the hand timing capture and activation audits."""
import copy,unittest
from test_proxy_population_hand_timing import fixture as hand_fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_hand_timing as hand_timing
import proxy_population_history_replay as api
import proxy_continuation_end as end


def raw(event):
 return {k:v for k,v in event.items() if k not in end.BIND_KEYS}


def fixture():
 """Opponent G-air-hockey reaction to the actual batting play (group-013-B-first 284/285 shape).

 The reaction is activated by the sequential hand-timing path: source_zone 'hand',
 trigger_origin_event_seq = the batting play, while the window's priority actor
 is still the batter.
 """
 before,after,event,history,source=hand_fixture();row=hand_timing.capture(before,after,event)['occurrences'][0]
 rows,_=hand_timing.current_actions(after,row,history);action=rows[0]
 activated,events=hand_timing.activate(after,action,row,history,initial())
 reaction=raw(events[0]);history=[raw(e) for e in history]
 assert reaction['source_zone']=='hand' and reaction['trigger_origin_event_seq']==event['seq'] and reaction['actor']!=after['legacy_continuation']['response_context']['priority_actor']
 return before,after,activated,history,reaction


class HandTimingReplayTests(unittest.TestCase):
 def run_case(self,callback):
  def run(forced):callback();return {}
  with connected.contract_scope():return runtime.operation(initial(),run)

 def verify(self,events,envelopes):
  return api.quick_verifier(lambda events,shots,runtime:[],initial())(events,[],envelopes)

 def test_hand_reaction_gets_its_provenance_row_from_the_hand_timing_audits(self):
  def run():
   before,after,activated,history,reaction=fixture()
   proofs=self.verify(history+[reaction],[before,after,activated])
   cap=hand_timing.descriptor('G-air-hockey')
   mine=[p for p in proofs if p['event_seq']==reaction['seq']]
   self.assertEqual([(p['kind'],p['card_id'],p['duration'],p['source_reference'],p['source_raw_sha256']) for p in mine],[('activate_response','G-air-hockey','activation_until_resolution',cap['reference'],cap['source_raw_sha256'])])
   self.assertEqual(mine[0]['hand_timing_origin_event_seq'],reaction['trigger_origin_event_seq'])
   # The batting play itself keeps its ordinary quick provenance row.
   self.assertTrue(any(p['event_seq']==history[-1]['seq'] and p['card_id']=='G-baseball-batting' for p in proofs))
  self.run_case(run)

 def test_forged_origin_missing_origin_transition_or_tampered_delta_fails_closed(self):
  def run():
   before,after,activated,history,reaction=fixture()
   with self.assertRaises(ValueError):self.verify(history+[dict(reaction,trigger_origin_event_seq=reaction['trigger_origin_event_seq']-1)],[before,after,activated])
   with self.assertRaises(ValueError):self.verify(history+[reaction],[after,activated])
   bad=copy.deepcopy(activated);bad['legacy_continuation']['game_state']['players'][reaction['actor']]['time']+=1
   with self.assertRaises(ValueError):self.verify(history+[reaction],[before,after,bad])
   with self.assertRaises(ValueError):self.verify(history+[dict(reaction,selected_candidate='response-use-play-forged')],[before,after,activated])
   # A hand event without its sequential origin stays on the ordinary inventory path and is rejected there.
   plain={k:v for k,v in reaction.items() if k!='trigger_origin_event_seq'}
   with self.assertRaises(ValueError):self.verify(history+[plain],[before,after,activated])
  self.run_case(run)


if __name__=='__main__':unittest.main()
