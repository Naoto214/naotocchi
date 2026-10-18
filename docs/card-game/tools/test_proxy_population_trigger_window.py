"""Exercise A through the original runtime loop, not a separate driver."""
import copy,unittest
from test_proxy_population_trigger_connection import both
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_trigger_connection as connection
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
try:import proxy_population_trigger_window as api
except ImportError:api=None

class WindowTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_group_then_ordinary_responses_use_existing_loop_and_exact_replay(self):
  e,l,proof=both()
  # Conditional unit input. No random input generation or experiment fixture.
  def prepare(forced):
   for p in e['legacy_continuation']['game_state']['players'].values():p['time']=0
   proof['current_envelope_sha256']=state.canonical_sha256(e)
   c=state.current(e)
   event=dict(seq=e['event_seq'],actor='A',action_type='egg_exchange_bottom',game_state_after_sha256=triggers.old.start.opening._stop_state_sha256(c['game_state']),continuation_state_after_sha256=triggers.old.start._hash(c))
   return event
  event=base.operation(initial(),prepare);original=base._step
  r=api.segment(e,initial(),[event],[triggers.old._snapshot(state.current(e))],[e],3,proof)
  self.assertIs(base._step,original);self.assertIsNone(r['stop']);self.assertTrue(r['trigger_records']);self.assertEqual(r['final_envelope']['legacy_continuation']['game_state']['phase'],'normal_action');self.assertFalse(r['ready_for_execution'])
  self.assertEqual(api.validate(r,e,initial(),[event],[triggers.old._snapshot(state.current(e))],[e],3,proof),[])
  first=r['trigger_records'][0];self.assertEqual(first['before_envelope'],r['source_envelope'])
  self.assertTrue(any(d.get('decision_kind')=='response_action' for d in r['decisions']))
class TransactionTests(unittest.TestCase):
 def test_invalid_opening_cannot_leak_the_extension_lock(self):
  e,l,proof=both();bad=copy.deepcopy(proof);bad['capture']['turn_player']='invalid'
  try:
   with self.assertRaises(ValueError):api.segment(e,initial(),[],[],[e],1,bad)
   self.assertFalse(api.completion._EXTENSION_LOCK.locked())
  finally:
   if api.completion._EXTENSION_LOCK.locked():api.completion._EXTENSION_LOCK.release()

 def test_failed_step_does_not_keep_a_phantom_trigger_record(self):
  from unittest.mock import patch
  e,l,proof=both()
  def fail(_):raise ValueError('injected output binding failure')
  with patch.object(api,'_step_record',fail):
   result=api.segment(e,initial(),[],[],[e],1,proof)
  self.assertEqual(result['steps'],[])
  self.assertEqual(result['trigger_records'],[])
  self.assertEqual(result['trigger_ledger'],l)
  self.assertIn('injected output binding failure',result['stop']['detail'])

class ResolutionTests(unittest.TestCase):
 def test_live_and_provenance_resolution_share_the_same_boundary_adapter(self):
  from test_proxy_population_boundary_response import case
  import proxy_continuation_actions as actions
  def run(forced):
   e=case('end');bindings={state.canonical_sha256(e):dict(kind='end',turn_player='A',origin_event_seq=2)}
   original=actions.RESOLUTION_RESULT_ADAPTER
   with api.resolution_boundaries(bindings):
    live=forced(e,initial(),[],[],[e])
    replay=actions.normalize_resolution_result(e,triggers.resolve(state.current(e),initial()))
    self.assertEqual(live,replay)
    self.assertEqual(live['new_snapshots'][0]['continuation_state']['response_context']['consecutive_passes'],0)
    self.assertEqual(live['new_events'][0]['processing_boundary'],bindings[state.canonical_sha256(e)])
   self.assertIs(actions.RESOLUTION_RESULT_ADAPTER,original)
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
