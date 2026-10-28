"""C-cat_friend with a discarded companion is classified as having no turn-start trigger at the next turn."""
import copy,unittest
from test_proxy_population_first_response import game_with
import proxy_reached_mixed_contracts_401 as reached
import proxy_population_start_obligations as starts
import proxy_population_next_board as api


def board(discarded):
 """Next actor with C-cat_friend on the board (group-034-B-first shape); discarded adds a companion to its discard."""
 g,actor,cat=game_with('C-cat_friend');p=g['players'][actor];p['hand'].remove(cat);p['board']['companions']=[cat]
 if discarded:
  other=next(s for s in p['deck'] if g['cards'][s]['card_id'].startswith('C-') and g['cards'][s]['card_id']!='C-cat_friend');p['deck'].remove(other);p['discard'].append(other)
 return g,actor,cat


class NextBoardTests(unittest.TestCase):
 def test_discarded_companion_refusal_is_classified_from_the_start_catalog(self):
  g,actor,cat=board(True)
  with self.assertRaises(ValueError):reached.classify_next_board(g,actor)
  with api.scope():rows=reached.classify_next_board(copy.deepcopy(g),actor)
  mine=[r for r in rows if r['source_instance_id']==cat]
  self.assertEqual([(r['card_id'],r['trigger_kind']) for r in mine],[('C-cat_friend','no_turn_start_trigger')])
  self.assertEqual(mine[0]['source_section_sha256'],starts.catalog()['cards']['C-cat_friend']['section_sha256'])
  self.assertIsNot(reached.classify_next_board,None)

 def test_unrefused_boards_and_other_errors_keep_the_frozen_result(self):
  g,actor,cat=board(False)
  native=reached.classify_next_board(copy.deepcopy(g),actor)
  with api.scope():self.assertEqual(reached.classify_next_board(copy.deepcopy(g),actor),native)
  def other(game,actor):raise ValueError('reached trigger effect needs separate proof')
  with self.assertRaises(ValueError):api.classify(other,g,actor)

 def test_catalog_change_or_start_kind_fails_closed_and_scope_restores(self):
  from unittest.mock import patch
  g,actor,cat=board(True);native=reached.classify_next_board
  changed=copy.deepcopy(starts.catalog());changed['cards']['C-cat_friend']['start_kind']='own_start_reveal_companion'
  with patch.object(api.starts,'catalog',return_value=changed):
   with self.assertRaises(ValueError):api.classify(native,g,actor)
  with patch.object(api.starts,'CATALOG_SHA','0'*64):
   with self.assertRaises(ValueError):api.classify(native,g,actor)
  with api.scope():pass
  self.assertIs(reached.classify_next_board,native)


if __name__=='__main__':unittest.main()


class ConnectedNextTurnTests(unittest.TestCase):
 def test_frozen_next_turn_inside_the_connected_scope_reaches_the_next_start(self):
  from test_proxy_population_city_predicates import fixture as city_fixture,run_current
  from test_proxy_population_runtime import initial
  import proxy_population_turn_boundary as boundary
  import proxy_continuation_state as state
  from proxy_population_policy_bridge import Session
  def run(forced):
   e,h,o=city_fixture();c=e['legacy_continuation'];g=c['game_state'];g['phase']='turn_end';c['return_target']='turn_end'
   p=g['players']['B'];cat=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='C-cat_friend')
   other=next(s for s in p['deck'] if g['cards'][s]['card_id'].startswith('C-') and g['cards'][s]['card_id']!='C-cat_friend' and s!=cat)
   for s in (cat,other):
    for zone in ('hand','deck'):
     if s in p[zone]:p[zone].remove(s)
   p['board']['companions'].append(cat);p['discard'].append(other);state.validate(e)
   i=dict(initial(),first_player='A');session=Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});session.turn_start('A','prior')
   result=boundary.next_turn(state.current(e),i,session)
   self.assertEqual(result['new_events'][0]['action_type'],'turn_end_completed')
   row=next(r for r in result['next_actor_board_inventory'] if r['source_instance_id']==cat)
   self.assertEqual(row['trigger_kind'],'no_turn_start_trigger')
   return {}
  run_current(run)
