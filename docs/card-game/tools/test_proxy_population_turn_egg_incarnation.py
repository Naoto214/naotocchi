"""The frozen next_turn egg-exchange choice after a native reentry runs on the active view and keeps the full map."""
import copy,unittest
import proxy_population_incarnation_runtime as incarnation
import proxy_population_turn_boundary as turn_boundary
import proxy_population_incarnation as life
import proxy_population_policy_journal as journal
import proxy_mandatory_choice_boundary as boundary
import proxy_continuation_state as state
import test_proxy_population_history_incarnation_dispatch as dispatch


def egg_frame(current):
 """Next actor without a main after the turn change (group-042-A-first at 115)."""
 g=copy.deepcopy(current['game_state']);actor='B' if g['turn_player']=='A' else 'A';p=g['players'][actor]
 if p['board']['main'] is not None:p['discard'].append(p['board']['main']);p['board']['main']=None
 g['turn_player']=actor;g['phase']='turn_start'
 return journal.egg_entry(g,actor)


class TurnEggIncarnationTests(unittest.TestCase):
 def exercise(self,check):
  host=dispatch.HistoryIncarnationDispatchTests('test_unrelated_classifiers_do_not_dereference_after_only_source')
  def wrapped(before,after,event,history):
   current=state.current(after);self.assertTrue(incarnation.retains_predecessor(current['game_state']['cards']))
   check(egg_frame(current))
  host.exercise('I-sleepboost1',wrapped)

 def test_egg_choice_keeps_the_full_card_map_after_reentry(self):
  def check(frame):
   with self.assertRaises(ValueError):boundary.prepare(frame)
   b=turn_boundary.prepare(frame)
   self.assertEqual(b['choice_game_state']['cards'],frame['game_state']['cards'])
   selected=b['candidate_ids'][0] if b['candidate_ids'] else None
   applied=turn_boundary.apply_choice(frame,selected)
   self.assertEqual(applied['local_after_game_state']['cards'],frame['game_state']['cards'])
   # Same shape the record-level egg audit expects: unchanged465 operation, full map restored.
   self.assertTrue(incarnation.retains_predecessor(applied['local_after_game_state']['cards']))
  self.exercise(check)

 def test_without_reentry_or_outside_the_scope_the_frozen_operation_is_used(self):
  self.assertIs(turn_boundary.prepare,boundary.prepare);self.assertIs(turn_boundary.apply_choice,boundary.apply_choice)
  def check(frame):
   self.assertIsNot(turn_boundary.prepare,boundary.prepare)
   forged=copy.deepcopy(frame);s=next(iter(forged['game_state']['cards']));forged['game_state']['cards']['A-099#1']=copy.deepcopy(forged['game_state']['cards'][s])
   with self.assertRaises(ValueError):turn_boundary.prepare(forged)
  self.exercise(check)
  self.assertIs(turn_boundary.prepare,boundary.prepare)


if __name__=='__main__':unittest.main()
