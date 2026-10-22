"""E-final-time resolving under an outer link inside a post-placement window (group-200-A-first 263)."""
import unittest
from unittest.mock import patch
from test_proxy_population_runtime import initial
import test_proxy_population_designated_effects as fixture
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_designated_effects as api


def post_placement(**kwargs):
 b=fixture_cat(**kwargs);b['legacy_continuation']['game_state']['phase']='post_placement_response';return b
fixture_cat=fixture.cat


class FinalTimePostPlacementTests(unittest.TestCase):
 def run_case(self,callback):
  with window.contract_scope():return runtime.operation(initial(),callback)

 def test_frozen_window_relabel_is_part_of_the_expected_envelope(self):
  def run(forced):
   with patch.object(fixture,'cat',post_placement):b,a,ev,decisions,registry=fixture.actual(forced,'E-final-time','outer')
   self.assertEqual(b['legacy_continuation']['game_state']['phase'],'post_placement_response');self.assertTrue(a['legacy_continuation']['activation_zone'])
   # The frozen quick.resolve relabels the window for 406; with an outer link left, the label persists.
   self.assertEqual(a['legacy_continuation']['game_state']['phase'],'response_window')
   proof=api.audit(b,a,ev,decisions,registry)
   self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_designated_effect_verified'])
   return {}
  self.run_case(run)

 def test_any_other_phase_or_card_difference_still_fails(self):
  import copy
  def run(forced):
   with patch.object(fixture,'cat',post_placement):b,a,ev,decisions,registry=fixture.actual(forced,'E-final-time','outer')
   for phase in ('post_placement_response','normal_action','turn_end_response'):
    bad=copy.deepcopy(a);bad['legacy_continuation']['game_state']['phase']=phase
    self.assertTrue(api.audit(b,bad,ev,decisions,registry)['errors'],phase)
   bad=copy.deepcopy(a);bad['legacy_continuation']['game_state']['players']['A']['time']+=1
   self.assertTrue(api.audit(b,bad,ev,decisions,registry)['errors'])
   # Without an outer link the chain closes and the ordinary tail decides the phase.
   with patch.object(fixture,'cat',post_placement):b,a,ev,decisions,registry=fixture.actual(forced,'E-final-time','normal')
   self.assertEqual(api.audit(b,a,ev,decisions,registry)['errors'],[])
   return {}
  self.run_case(run)


if __name__=='__main__':unittest.main()
