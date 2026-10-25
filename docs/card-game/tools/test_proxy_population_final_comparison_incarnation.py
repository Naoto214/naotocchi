"""R10 final-comparison zone check after a native reentry; no game/worker or input generation."""
import copy,unittest
import proxy_population_incarnation_runtime as incarnation
import proxy_normal_action_seeded_restart as restart_122
import proxy_continuation_state as state
import proxy_continuation_end as end
import test_proxy_population_history_incarnation_dispatch as dispatch

contracts=end.old.terminal.contracts

def final(current,action='r10_final_comparison'):
 # Same transition construction as proxy_population_turn_boundary.replay at R10.
 after=copy.deepcopy(current);after['game_state']['phase']='completed';after['return_target']=None;events=[]
 contracts.provenance._append_transition(current,after,events,[],action,current['game_state']['turn_player'])
 return after,events

class FinalComparisonIncarnationTests(unittest.TestCase):
 def exercise(self,check):
  # Reuse the native I-sleepboost1 reentry fixture: A-xxx#1 is retired, A-xxx#2 active.
  host=dispatch.HistoryIncarnationDispatchTests('test_unrelated_classifiers_do_not_dereference_after_only_source')
  def wrapped(before,after,event,history):
   current=state.current(after);current['game_state']['round']=10;r=restart_122.response_120
   # R10 rows use the 120 continuation hash family, as contracts.current does.
   current['continuation_state_sha256']=r.continuation_state_sha256(r._continuation_payload(current))
   retired=event['instance_transitions'][0]['from_instance_id']
   self.assertIn(retired,current['game_state']['cards'])
   self.assertNotIn(retired,[x for p in current['game_state']['players'].values() for x in p['hand']+p['deck']+p['discard']])
   check(current,retired)
  host.exercise('I-sleepboost1',wrapped)

 def test_retained_predecessor_metadata_passes_registry_bound_final_comparison(self):
  def check(current,retired):
   after,events=final(current)
   restart_122._verify_step(current,after,events)
   self.assertEqual(after['game_state']['cards'],current['game_state']['cards'])
  self.exercise(check)

 def test_state_already_projected_by_extended_verifier_uses_legacy_check(self):
  # verify() hands the 122 verifier successor-only cards; this must not be
  # mistaken for a missing generation (observed on the fixed first row).
  def check(current,retired):
   projected=copy.deepcopy(current);projected['game_state']['cards'].pop(retired);r=restart_122.response_120
   projected['continuation_state_sha256']=r.continuation_state_sha256(r._continuation_payload(projected))
   self.assertFalse(incarnation.retains_predecessor(projected['game_state']['cards']))
   after,events=final(projected)
   restart_122._verify_step(projected,after,events)
  self.exercise(check)

 def test_unchanged_legacy_check_still_rejects_without_scope(self):
  def check(current,retired):
   after,events=final(current)
   with self.assertRaises(restart_122.response_120.RouteIntegrityStop):incarnation.LEGACY_VERIFY_STEP(current,after,events)
  self.exercise(check)

 def test_other_transitions_keep_legacy_zone_failure(self):
  def check(current,retired):
   after,events=final(current,'turn_end_completed')
   with self.assertRaises(restart_122.response_120.RouteIntegrityStop):restart_122._verify_step(current,after,events)
  self.exercise(check)

 def test_missing_active_instance_and_forged_retired_metadata_fail_closed(self):
  def check(current,retired):
   bad=copy.deepcopy(current);p=bad['game_state']['players']['A'];p['deck'].pop()
   after,events=final(bad)
   with self.assertRaises((ValueError,restart_122.response_120.RouteIntegrityStop)):restart_122._verify_step(bad,after,events)
   bad=copy.deepcopy(current);bad['game_state']['cards']['A-099#1']=copy.deepcopy(bad['game_state']['cards'][retired])
   after,events=final(bad)
   with self.assertRaises((ValueError,restart_122.response_120.RouteIntegrityStop)):restart_122._verify_step(bad,after,events)
  self.exercise(check)

 def test_hash_chain_still_checked_on_full_state(self):
  def check(current,retired):
   after,events=final(current);events[0]['game_state_before_sha256']='0'*64
   with self.assertRaises(restart_122.response_120.RouteIntegrityStop):restart_122._verify_step(current,after,events)
   after,events=final(current);after['game_state']['players']['A']['growth']+=1
   with self.assertRaises((ValueError,restart_122.response_120.RouteIntegrityStop)):restart_122._verify_step(current,after,events)
  self.exercise(check)

 def test_scope_restores_legacy_verifier(self):
  self.assertIs(restart_122._verify_step,incarnation.LEGACY_VERIFY_STEP)
  self.exercise(lambda current,retired:self.assertIsNot(restart_122._verify_step,incarnation.LEGACY_VERIFY_STEP))
  self.assertIs(restart_122._verify_step,incarnation.LEGACY_VERIFY_STEP)

if __name__=='__main__':unittest.main()
