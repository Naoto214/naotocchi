import copy,unittest
import test_proxy_continuation_challenge as fixtures
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_continuation_challenge as challenge
import proxy_continuation_candidates as candidates
import proxy_continuation_payments as payments
try:import proxy_population_growth_runtime as api
except ImportError:api=None

class GrowthRuntimeTests(unittest.TestCase):
 def test_challenge_reward_is_bounded_in_state_result_and_hashes(self):
  self.assertIsNotNone(api,'shared runtime upper bound missing');h=fixtures.ChallengeTests();h.setUp()
  def run(forced):
   e=payments.upgrade(h.e);a=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='challenge' and a['candidate_variant']=='power');after,_=challenge.declare(e,a);c=after['legacy_continuation'];g=c['game_state'];g['phase']='challenge_comparison';c['response_context']['consecutive_passes']=2
   source=next(s for s,v in g['cards'].items() if s.startswith('B-') and v['card_id']=='E-big-illness');payments.add_stat_modifier(after,'B',source,g['players']['A']['board']['main']);g['players']['B']['growth']=100
   with api.scope():result=challenge.compare(after)
   event=result['new_events'][0];final=result['new_envelopes'][0];self.assertEqual(event['result']['winner'],'B');self.assertEqual(event['result']['growth_added'],0);self.assertEqual(event['result']['growth_requested'],5);self.assertEqual(final['legacy_continuation']['game_state']['players']['B']['growth'],100);self.assertEqual(final['legacy_continuation']['game_state']['challenge']['result'],event['result'])
   self.assertEqual(api.audit_challenge(result,after),[])
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
