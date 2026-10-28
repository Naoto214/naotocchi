"""Step results that open the end window or cross a turn are observed even while an arrival group is open."""
import unittest
import proxy_population_trigger_window as api


class TurnBoundaryResultTests(unittest.TestCase):
 def test_end_window_and_turn_change_results_are_boundaries(self):
  for kinds in (['open_turn_end_triggers'],['resolve_payment_modifier','expire_payment_modifiers','turn_end_completed','turn_start_and_normal_draw'],['turn_end_completed','turn_start_and_egg_draw','egg_exchange_bottom']):
   self.assertTrue(api.turn_boundary_result(dict(events=[dict(action_type=k) for k in kinds])),kinds)
  # group-028-A-first 277..280: the arrival mode stayed active through this result and the ledger kept the old turn.
  self.assertTrue(api.turn_boundary_result(dict(events=[dict(action_type=k) for k in ('resolve_payment_modifier','expire_payment_modifiers','turn_end_completed','turn_start_and_normal_draw')])))

 def test_ordinary_results_are_not_boundaries(self):
  for kinds in ([],['response_pass'],['activate_response','response_pass'],['resolve_board_ability'],['decline_trigger_group'],['normal_pass_end_request']):
   self.assertFalse(api.turn_boundary_result(dict(events=[dict(action_type=k) for k in kinds])),kinds)


if __name__=='__main__':unittest.main()
