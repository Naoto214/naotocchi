"""Named opt-in, execution-time revalidation and no implicit policy promotion."""
import copy
import unittest
from test_proxy_equivalence_inputs import fixture
import proxy_continuation_candidates as candidates
import proxy_continuation_runner as runner
import proxy_resource_value_trajectory as old
try:
 import proxy_equivalence_trajectory as subject
except ModuleNotFoundError:
 subject=None

class TrajectoryTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(subject,'trajectory adapter implementation absent')
 def test_default_two_policies_unchanged(self):
  self.assertEqual(old.POLICIES,('legacy_107_114_116','resource_value_pilot_v1'))
 def test_new_policy_requires_explicit_selector(self):
  with self.assertRaisesRegex(ValueError,'unknown policy'):runner.run_route({},'unregistered_policy')
  with self.assertRaises(KeyError):runner.run_route({},subject.POLICY_ID)
 def test_validation_replays_same_selector(self):
  e,d=fixture();r=subject.select_normal(e,d['inventory'],d['problem'])
  self.assertEqual(r['selected_candidate'],r['choice']['selected_candidate'])
  self.assertEqual(r['selected_action']['candidate_id'],r['selected_candidate'])
  bad=copy.deepcopy(r);bad['selected_action']['card_id']='tampered'
  self.assertTrue(subject.validate_normal(bad,e,d['inventory'],d['problem']))
 def test_new_route_preserves_end_and_effects(self):
  e,d=fixture();r=subject.select_normal(e,d['inventory'],d['problem'])
  self.assertEqual(r['policy_id'],subject.POLICY_ID);self.assertEqual(r['context'],d['problem']['seed_context'])
  self.assertEqual(e,fixture()[0]);self.assertEqual(r['choice']['decision_record']['seed_context']['choice_kind'],'normal_action_resource_frontier')
