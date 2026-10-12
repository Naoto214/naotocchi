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
  # Use the current entry scopes (including474/first-date), preserving the
  # historical115/zero-root input and actual pre-draw capture assertions.
  import proxy_population_connected_entry as connected
  result=connected.reconstruct(bundle(),'test-1A',40)['runtime']
  self.assertIsNone(result['stop']);self.assertGreater(len(result['start_occurrence_proofs']),2)
  # Current opening enters an existing group; each later start closes one turn.
  self.assertEqual(len(result['closed_turn_trigger_ledgers']),len(result['start_occurrence_proofs'])+int(result['completed']))
  self.assertTrue(all(r['supplied_occurrences_closed'] and not r['opportunity_completeness_proven'] for r in result['closed_turn_trigger_ledgers']))
  for record in result['start_occurrence_proofs']:
   self.assertGreater(record['origin_event_seq'],record['capture']['event_seq']);self.assertFalse(record['start_execution_authenticated'])
  self.assertEqual(result['independent_balance_samples'],0);self.assertFalse(result['ready_for_execution'])
if __name__=='__main__':unittest.main()
