"""Reuse196's reveal effect with whole-chain state retained."""
import copy,unittest
from test_proxy_population_boundary_response import case
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_continuation_state as state
try:import proxy_population_start_effects as api
except ImportError:api=None

def chicken(outer=False,empty=False):
 e=case('start',outer);c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A'];link=c['activation_zone'][-1];world=p['board']['world'];p['board']['world']=None;p['hand'].append(world)
 source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='C-chicken');(p['hand'] if source in p['hand'] else p['deck']).remove(source);p['board']['companions'].append(source)
 link.update(source_instance_id=source,card_id='C-chicken',card_copy_id=g['cards'][source]['card_copy_id'],source_references=['72-companion-26-card-text-draft.md#C-chicken'])
 if empty:p['discard']+=p['deck'];p['deck']=[]
 return e

class StartEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_existing_reveal_effect_preserves_live_outer_chain(self):
  def run(forced):
   e=chicken(True);c=state.current(e);old=runtime.engine.base.old
   projected=copy.deepcopy(c);projected['activation_zone']=projected['activation_zone'][-1:];projected['response_context']['chain_links']=projected['response_context']['chain_links'][-1:];projected['game_state']['players']['A']['discard'].append(c['activation_zone'][0]['source_instance_id']);projected['continuation_state_sha256']=old.start._hash(projected)
   expected,event=old.reached.resolution.resolve_board_ability(projected);expected['game_state']['players']['A']['discard'].remove(c['activation_zone'][0]['source_instance_id'])
   result=api.resolve_chicken(c,initial());after=result['new_snapshots'][0]['continuation_state']
   self.assertEqual(after['game_state']['players'],expected['game_state']['players']);self.assertEqual(after['activation_zone'],c['activation_zone'][:-1]);self.assertEqual(after['response_context']['chain_status'],'resolving');self.assertEqual(result['new_events'][0]['result'],event['result'])
   old._verify_generated(c,state.current(state.advance(e,after,4)),result['new_events']);return {}
  runtime.operation(initial(),run)
 def test_empty_deck_resolves_without_a_new_loss_or_draw(self):
  def run(forced):
   e=chicken(empty=True);c=state.current(e);result=api.resolve_chicken(c,initial());after=result['new_snapshots'][0]['continuation_state']
   self.assertEqual(after['game_state']['players'],c['game_state']['players']);self.assertIsNone(result['new_events'][0]['result']['revealed_instance_id']);self.assertFalse(result['completed']);return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
