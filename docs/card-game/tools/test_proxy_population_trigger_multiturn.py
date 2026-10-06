"""Old115/zero-root multi-turn reconstruction; not an independent sample."""
import copy,unittest
from test_proxy_mandatory_population_input import bundle
from test_proxy_population_runtime import initial
from proxy_population_opening import reconstruct_opening
from proxy_population_policy_bridge import Session
import proxy_population_start_obligations as starts
import proxy_population_trigger_window as api
import proxy_population_runtime as base
import proxy_continuation_state as state

class MultiTurnTests(unittest.TestCase):
 def test_actual_next_start_captures_pre_draw_sources_across_turns(self):
  prefix=reconstruct_opening(bundle(),'test-1A');e=prefix['final_envelope'];cards=e['legacy_continuation']['game_state']['cards'];shots=[]
  for snap in prefix['snapshots'][:2]:
   g=copy.deepcopy(snap['state']);g['cards']=copy.deepcopy(cards);shots.append(dict(event_seq=snap['seq'],game_state=g,game_state_sha256=snap['state_sha256'],continuation_state=None,continuation_state_sha256=None))
  shots.append(base.engine.base.old._snapshot(state.current(e)));i=initial();i.update(path_id='test-1A',order_id='test-1');i['inputs']['path_id']=i['path_id']
  captured=copy.deepcopy(e);captured['event_seq']=0;captured['legacy_continuation']['game_state']['phase']='turn_start';proof=starts.collect(starts.capture(captured),e)
  s=Session(dict(protocol_id='policy_conditional_population.v1',group_id='test-1',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});s.turn_start('A','opening')
  result=api.segment(e,i,prefix['events'],shots,[e],40,proof,session=s)
  self.assertIsNone(result['stop']);self.assertGreater(len(result['start_occurrence_proofs']),2)
  for record in result['start_occurrence_proofs'][1:]:
   self.assertGreater(record['origin_event_seq'],record['capture']['event_seq']);self.assertFalse(record['start_execution_authenticated'])
  self.assertEqual(result['independent_balance_samples'],0);self.assertFalse(result['ready_for_execution'])
if __name__=='__main__':unittest.main()
