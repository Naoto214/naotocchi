import unittest
import proxy_resource_value_trajectory as old
import proxy_continuation_state as state
import test_proxy_continuation_batch as fixtures
try:import proxy_continuation_choices as choices
except ImportError:choices=None

class ChoiceTests(unittest.TestCase):
 def test_categorical_choice_binds_all_options_and_public_occurrence(self):
  self.assertIsNotNone(choices)
  fixtures.BatchTests.setUpClass();e=fixtures.BatchTests.r[5]['final_envelope'];c=state.current(e);initial=old.load_initial_routes()[2]
  first=choices.resolve(initial,c,'B',[dict(position='top'),dict(position='bottom')],'deck_order','link-1')
  second=choices.resolve(initial,c,'B',[dict(position='top'),dict(position='bottom')],'deck_order','link-2')
  self.assertEqual(old.shadow.fallback.validate_seeded_resolution(first),[])
  self.assertEqual(len(first['legal_candidates']),2)
  self.assertNotEqual(first['seed_context']['choice_kind'],second['seed_context']['choice_kind'])
 def test_reveal_selection_covers_zero_one_two_and_remaining_orders(self):
  self.assertIsNotNone(choices)
  options=choices.revealed_search_options(['a','b','c'],['a','b'],2)
  self.assertTrue(any(o['take']==[] for o in options));self.assertTrue(any(o['take']==['a','b'] for o in options))
  self.assertEqual(len(options),11)
  for option in options:self.assertEqual(set(option['take'])|set(option['bottom']),{'a','b','c'})
