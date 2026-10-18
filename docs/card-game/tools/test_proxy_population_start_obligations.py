"""Current107 start sources, independent of the value/selection policy."""
import copy,unittest
from test_proxy_population_first_response import game_with
from proxy_population_start_window import _context
import proxy_continuation_state as state
try:import proxy_population_start_obligations as api
except ImportError:api=None

def fixture():
 g,actor,chicken=game_with('C-chicken');p=g['players'][actor];p['hand'].remove(chicken);p['board']['companions']=[chicken];g['phase']='turn_start'
 e=state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target=None),1)
 return e,actor,chicken

def opened(e,actor):
 e=copy.deepcopy(e);e['event_seq']=2;e['legacy_continuation']['game_state']['phase']='response_window';e['legacy_continuation']['response_context']=_context(actor,actor);e['legacy_continuation']['return_target']='normal_action_opportunity';return e

class StartTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_chicken_empty_deck_is_not_an_added_activation_condition(self):
  e,actor,source=fixture();g=e['legacy_continuation']['game_state'];p=g['players'][actor];p['discard']+=p['deck'];p['deck']=[]
  capture=api.capture(e);result=api.collect(capture,opened(e,actor))
  self.assertEqual([x['source_instance_id'] for x in result['occurrences']],[source]);self.assertFalse(result['start_execution_authenticated']);self.assertIsNone(result['balance_admitted'])
 def test_sources_cannot_join_retroactively_and_unknown_cards_fail_closed(self):
  e,actor,source=fixture();capture=api.capture(e);after=opened(e,actor);g=after['legacy_continuation']['game_state'];other=g['players'][actor]['hand'].pop();g['players'][actor]['board']['companions'].append(other)
  with self.assertRaises(ValueError):api.collect(capture,after)
  e['legacy_continuation']['game_state']['cards'][source]['card_id']='future-card'
  with self.assertRaises(ValueError):api.capture(e)
 def test_equipment_remaining_hand_condition_and_opponent_owner_are_separate(self):
  e,actor,source=fixture();g=e['legacy_continuation']['game_state'];p=g['players'][actor];item=next(i for i in p['hand']+p['deck'] if g['cards'][i]['card_id']=='I-bowtie');(p['hand'] if item in p['hand'] else p['deck']).remove(item);p['board']['prepared'].append(item)
  e['runtime']['attachments'][item]=dict(controller=actor,target_instance_id=source,attached_event_seq=1);e['runtime']['public_prepared'][item]=dict(controller=actor,face_up=True,paid_time=2,placed_event_seq=1)
  for count in (2,3):
   local=copy.deepcopy(e);owner=local['legacy_continuation']['game_state']['players'][actor]
   while len(owner['hand'])>count:owner['deck'].append(owner['hand'].pop())
   while len(owner['hand'])<count:owner['hand'].append(owner['deck'].pop(0))
   result=api.collect(api.capture(local),opened(local,actor));ids={o['source_instance_id'] for o in result['occurrences']};self.assertEqual(item in ids,count==2)
  bad=copy.deepcopy(e);bad['runtime']['public_prepared'][item]['face_up']=None
  with self.assertRaises(ValueError):api.capture(bad)
 def test_catalog_exactly_covers_existing107_and_preserves_literal_sources(self):
  catalog=api.catalog();self.assertEqual(len(catalog['cards']),41);self.assertEqual({k for k,v in catalog['cards'].items() if v['start_kind']!='none'},{'C-chicken','I-bowtie'})
if __name__=='__main__':unittest.main()
