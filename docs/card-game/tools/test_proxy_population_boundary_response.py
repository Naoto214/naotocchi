"""06 boundary response restart, using an existing effect result."""
import copy,unittest
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
from proxy_population_start_window import _context
import proxy_population_runtime as runtime
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
try:import proxy_population_boundary_response as api
except ImportError:api=None

def case(kind='start',outer=False):
 g,actor,source=game_with('W-city');p=g['players'][actor];p['hand'].remove(source);p['board']['world']=source;g['phase']='turn_end_response' if kind=='end' else 'response_window'
 link=dict(link_id='unit-world',source_zone='board',action_type='activate_board_ability',actor=actor,card_id='W-city',card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=[],candidate_variant=None,payment=dict(time=0),source_references=['89-world-13-card-text-draft.md#W-city'])
 links=[link]
 if outer:
  item=next(i for i in p['hand']+p['deck'] if g['cards'][i]['card_id']=='I-c_coin2');(p['hand'] if item in p['hand'] else p['deck']).remove(item)
  links.insert(0,dict(link_id='unit-outer',source_instance_id=item,actor=actor,card_id='I-c_coin2',card_copy_id=g['cards'][item]['card_copy_id'],action_type='use_item',payment=dict(time=1),target_instance_ids=[],candidate_variant=None))
 ctx=_context(actor,actor);ctx.update(chain_status='resolving',chain_links=[l['link_id'] for l in links],consecutive_passes=2,source_phase='turn_end' if kind=='end' else 'response_window')
 e=state.create(dict(game_state=g,response_context=ctx,activation_zone=links,pending_triggers=[],return_target='turn_end' if kind=='end' else 'normal_action_opportunity'),3)
 return e

class BoundaryTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_both_start_and_end_need_a_fresh_response_after_last_link(self):
  for kind in ('start','end'):
   def run(forced):
    e=case(kind);c=state.current(e);result=triggers.resolve(c,initial());saved=copy.deepcopy(result)
    out=api.normalize(e,result,dict(kind=kind,turn_player='A',origin_event_seq=2))
    after=out['new_snapshots'][0]['continuation_state'];ctx=after['response_context']
    self.assertEqual(ctx['consecutive_passes'],0);self.assertEqual(ctx['priority_actor'],'A');self.assertEqual(ctx['origin_event_seq'],4)
    self.assertEqual(after['game_state']['phase'],'turn_end_response' if kind=='end' else 'response_window')
    runtime.engine.base.old._verify_generated(c,state.current(state.advance(e,after,4)),out['new_events'])
    self.assertEqual(result,saved);self.assertEqual(out['new_decisions'],result['new_decisions']);return {}
   with self.subTest(kind=kind):runtime.operation(initial(),run)
 def test_live_outer_link_is_never_projected_away_or_restarted(self):
  def run(forced):
   e=case('start',True);result=triggers.resolve(state.current(e),initial());out=api.normalize(e,result,dict(kind='start',turn_player='A',origin_event_seq=2));self.assertEqual(out,result);self.assertEqual(len(out['new_snapshots'][0]['continuation_state']['activation_zone']),1);return {}
  runtime.operation(initial(),run)
 def test_boundary_is_typed_and_does_not_claim_origin_authentication(self):
  def run(forced):
   e=case();result=triggers.resolve(state.current(e),initial())
   with self.assertRaises(ValueError):api.normalize(e,result,dict(kind='start',turn_player='A',origin_event_seq=True))
   with self.assertRaises(ValueError):api.normalize(e,result,dict(kind='start',turn_player='B',origin_event_seq=2))
   return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
