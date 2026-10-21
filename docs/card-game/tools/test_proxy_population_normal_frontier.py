"""Existing116 on fully proved upper-priority incomparable frontiers."""
import copy,unittest
import proxy_population_runtime as base
import proxy_continuation_candidates as candidates
from test_proxy_population_runtime import initial
import test_proxy_continuation_challenge as fixtures
try:import proxy_population_normal_frontier as api
except ImportError:api=None

class NormalFrontierTests(unittest.TestCase):
 def test_pure_challenge_pass_frontier_preserves_116_exclusion_and_real_step(self):
  self.assertIsNotNone(api,'pure116 current frontier connection absent')
  helper=fixtures.ChallengeTests();helper.setUp();e=helper.e
  def run(forced):
   e2=base.engine.payments.upgrade(e);g=e2['legacy_continuation']['game_state'];g['phase']='normal_action'
   for p in g['players'].values():p['deck'].extend(p['hand']);p['hand']=[];p['time']=0
   inv=candidates.audit(e2,[]);self.assertEqual({a['action_type'] for a in inv['legal_candidate_details']},{'challenge','pass'})
   with self.assertRaisesRegex(ValueError,'legacy fallback contract not applicable'):base._step(e2,initial(),[],[],[e2],forced)
   with api.scope():
    step=base._step(e2,initial(),[],[],[e2],forced);r=step['decision'];self.assertEqual(r['choice']['reason_code'],'strategic_unresolved_seeded_fallback');self.assertEqual(r['choice']['seeded_fallback_candidates'],inv['legal_candidate_ids']);self.assertEqual(step['evaluation']['legacy_116'],'excluded');self.assertEqual(len(step['events']),1)
    bad=copy.deepcopy(r);bad['selected_candidate']='forged'
    with self.assertRaises(ValueError):base.engine.base.actions.apply(e2,bad,dict(public_events=[]))
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
