"""C-chicken start resolution (196) after a native reentry sees only the registry-bound active cards."""
import copy,unittest
import proxy_population_incarnation_runtime as incarnation
import proxy_normal_action_seeded_restart as restart_122
import proxy_new_seed_ability_resolution_196 as resolution_196
import proxy_continuation_state as state
import test_proxy_population_history_incarnation_dispatch as dispatch


def chicken(current):
 """Turn-start C-chicken link resolving in the reentry state (group-081-A-first shape)."""
 c=copy.deepcopy(current);g=c['game_state'];actor='A';p=g['players'][actor]
 source=next(s for s,v in g['cards'].items() if v['card_id']=='C-chicken' and s.startswith(actor) and (s in p['hand'] or s in p['deck']))
 for zone in ('hand','deck'):
  if source in p[zone]:p[zone].remove(source)
 p['board']['companions'].append(source);g['phase']='response_window';g['turn_player']=actor
 link=dict(link_id='unit-chicken',source_zone='board',action_type='activate_board_ability',actor=actor,card_id='C-chicken',card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=[],candidate_variant=None,payment=dict(time=0))
 c['activation_zone']=[link];c['pending_triggers']=[]
 c['response_context'].update(window_kind='turn_start',chain_status='resolving',chain_links=[link['link_id']],consecutive_passes=2,priority_actor=actor,turn_player=actor)
 c['continuation_state_sha256']=resolution_196.start._hash(c)
 return c


class ChickenResolutionIncarnationTests(unittest.TestCase):
 def exercise(self,check):
  host=dispatch.HistoryIncarnationDispatchTests('test_unrelated_classifiers_do_not_dereference_after_only_source')
  def wrapped(before,after,event,history):
   current=state.current(after);retired=event['instance_transitions'][0]['from_instance_id']
   self.assertTrue(incarnation.retains_predecessor(current['game_state']['cards']))
   check(chicken(current),retired)
  host.exercise('I-sleepboost1',wrapped)

 def test_chicken_resolution_after_reentry_passes_the_registry_bound_check(self):
  def check(before,retired):
   after,event=resolution_196.resolve_board_ability(before)
   self.assertEqual(event['action_type'],'resolve_board_ability');self.assertEqual(after['game_state']['cards'],before['game_state']['cards'])
  self.exercise(check)

 def test_legacy_check_alone_still_rejects_and_tampering_fails_closed(self):
  def check(before,retired):
   after,event=resolution_196.resolve_board_ability(before)
   with self.assertRaises(restart_122.response_120.RouteIntegrityStop):incarnation.LEGACY_VERIFY_STEP(before,after,[event])
   bad=copy.deepcopy(after);bad['game_state']['players']['A']['hand'].pop()
   with self.assertRaises((ValueError,restart_122.response_120.RouteIntegrityStop)):restart_122._verify_step(before,bad,[event])
   forged=copy.deepcopy(before);forged['game_state']['cards']['A-099#1']=copy.deepcopy(forged['game_state']['cards'][retired])
   with self.assertRaises((ValueError,restart_122.response_120.RouteIntegrityStop)):resolution_196.resolve_board_ability(forged)
   other=copy.deepcopy(event);other['action_type']='resolve_item'
   with self.assertRaises((ValueError,restart_122.response_120.RouteIntegrityStop)):restart_122._verify_step(before,after,[other])
  self.exercise(check)


if __name__=='__main__':unittest.main()
