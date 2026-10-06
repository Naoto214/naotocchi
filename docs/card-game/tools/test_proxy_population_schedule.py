"""Scheduling doubles use old115/zero roots; no new matches or input lock."""
import copy,unittest
from unittest.mock import patch
from test_proxy_mandatory_population_input import bundle
import test_proxy_population_admission as admission_tests
try:import proxy_population_schedule as api
except ImportError:api=None

class ScheduleTests(unittest.TestCase):
 def test_initial_position_keeps_all_rows_and_is_not_execution_permission(self):
  self.assertIsNotNone(api);b=bundle();proof=api.assess(b,[])
  self.assertEqual(proof['next_planned_row'],b['execution_order'][0]);self.assertEqual(len(proof['planned_rows']),400);self.assertEqual(len(proof['planned_groups']),200)
  self.assertEqual(proof['planned_counts'],dict(groups=200,matches=400));self.assertFalse(proof['ready_for_execution'])
  self.assertFalse(proof['whole_set']['allowed']);self.assertIsNone(proof['whole_set']['rates'])
 def test_completed_116_row_advances_position_without_removing_its_exclusion(self):
  self.assertIsNotNone(api);b=bundle();r=admission_tests.ReplayedDispositionTests().synthetic()
  with patch.object(api.admission.connected,'reconstruct',return_value=r):proof=api.assess(b,[r])
  self.assertEqual(proof['next_planned_row'],b['execution_order'][1]);self.assertEqual(proof['retained_attempt_count'],1)
  self.assertEqual(proof['planned_rows'][0]['disposition'],'excluded');self.assertEqual(proof['planned_rows'][0]['attempt_count'],1)
  self.assertEqual(len(proof['planned_rows']),400);self.assertIsNone(proof['whole_set']['counts'])
 def test_unfinished_row_blocks_skipping_and_same_row_retry_retains_attempts(self):
  self.assertIsNotNone(api);b=bundle();short=admission_tests.ReplayedDispositionTests().synthetic();short['completed']=False
  with patch.object(api.admission.connected,'reconstruct',return_value=short):proof=api.assess(b,[short])
  self.assertIsNone(proof['next_planned_row']);self.assertEqual(proof['blocked_match_id'],'test-1A');self.assertFalse(proof['automatic_retry_allowed'])
  full=admission_tests.ReplayedDispositionTests().synthetic()
  with patch.object(api.admission.connected,'reconstruct',side_effect=[short,full]):proof=api.assess(b,[short,full])
  self.assertEqual(proof['next_planned_row'],'test-1B');self.assertEqual(proof['planned_rows'][0]['attempt_count'],2)
  self.assertEqual(proof['planned_rows'][0]['disposition'],'excluded');self.assertEqual(proof['additional_independent_samples_from_retries'],0)
 def test_self_reported_completion_or_skipped_fixed_row_never_advances(self):
  self.assertIsNotNone(api);b=bundle();forged=dict(schema='unknown',binding=dict(match_id='test-1A'),completed=True,eligible=True)
  proof=api.assess(b,[forged]);self.assertIsNone(proof['next_planned_row']);self.assertTrue(proof['blockers'])
  wrong=admission_tests.ReplayedDispositionTests().synthetic();wrong['binding']['match_id']='test-1B'
  with patch.object(api.admission.connected,'reconstruct',return_value=wrong):proof=api.assess(b,[wrong])
  self.assertIsNone(proof['next_planned_row']);self.assertIn('attempt_order_differs',proof['blockers'])
if __name__=='__main__':unittest.main()
