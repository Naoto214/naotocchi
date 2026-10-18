"""Conditional fixtures for current paid draw, never population inputs."""
import copy
import unittest
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
from proxy_population_start_window import _context
import proxy_population_runtime as base
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
try:
 import proxy_population_paid_draw as api
except ImportError:
 api=None


def fixture(card):
 g,actor,source=game_with(card);g['players'][actor]['hand'].remove(source);g['players'][actor]['board']['main']=source;g['phase']='response_window'
 p=g['players'][actor];names=['I-poop1'] if card=='M-antlion-02' else ['I-poop1','I-c_coin2'];costs=[]
 for name in names:
  s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==name);costs.append(s)
  for zone in ('hand','deck'):
   if s in p[zone]:p[zone].remove(s)
  (p['board']['prepared'] if card=='M-antlion-02' else p['discard']).append(s)
 c=dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity');c['response_context'].update(origin_event_seq=3,window_kind='after_normal_action')
 e=dict(schema=state.SCHEMA,execution_contract_id=state.CONTRACT,event_seq=3,legacy_continuation=c,runtime={k:({} if k in ('attachments','public_prepared') else []) for k in state.RUNTIME_KEYS})
 if card=='M-antlion-02':e['runtime']['public_prepared'][costs[0]]=dict(controller=actor,face_up=False,paid_time=1,placed_event_seq=2)
 state.validate(e);return base.engine.payments.upgrade(e),source,costs

class PaidDrawTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'paid draw connection missing')
 def test_current_facedown_cost_is_paid_once_before_existing_draw_resolution(self):
  def run(forced):
   import proxy_continuation_end as end
   e,s,costs=fixture('M-antlion-02');actor=state.current(e)['response_context']['priority_actor'];top=e['legacy_continuation']['game_state']['players'][actor]['deck'][0]
   with api.scope():
    rows,_=triggers.board_candidates(state.current(e),[],s,runtime=e['runtime']);self.assertEqual(len(rows),1)
    after,events=triggers.activate(e,dict(selected_action=rows[0]),[]);raw={k:v for k,v in events[0].items() if k not in end.BIND_KEYS}
    self.assertTrue(end.RUNTIME_TRANSITION_VERIFIER(e,after,raw,[]));bad=copy.deepcopy(after);bad['runtime']['ability_uses']=[];self.assertFalse(end.RUNTIME_TRANSITION_VERIFIER(e,bad,raw,[]))
    p=after['legacy_continuation']['game_state']['players'][actor];self.assertEqual(p['deck'][-1],costs[0]);self.assertEqual(p['board']['prepared'],[])
    self.assertEqual(triggers.board_candidates(state.current(after),events,s,runtime=after['runtime'])[0],[])
    resolving=copy.deepcopy(after);resolving['legacy_continuation']['response_context'].update(chain_status='resolving',consecutive_passes=2)
    result=forced(resolving,initial(),[],[],[resolving]);p=result['final_continuation_state']['game_state']['players'][actor]
    self.assertIn(top,p['hand']);self.assertEqual(p['deck'][-1],costs[0])
   return {}
  base.operation(initial(),run)
 def test_discard_cost_contains_both_orders_and_never_uses_one_copy_twice(self):
  def run(forced):
   e,s,costs=fixture('M-antlion-08')
   with api.scope():
    rows,_=triggers.board_candidates(state.current(e),[],s,runtime=e['runtime']);self.assertEqual({tuple(a['cost_instance_ids']) for a in rows},{tuple(costs),tuple(reversed(costs))})
    e['legacy_continuation']['game_state']['turn_player']='B';self.assertEqual(triggers.board_candidates(state.current(e),[],s,runtime=e['runtime'])[0],[])
   return {}
  base.operation(initial(),run)
 def test_normal_inventory_contains_the_same_costs_and_shares_usage_with_response(self):
  def run(forced):
   import proxy_continuation_candidates as candidates
   e,s,costs=fixture('M-antlion-02');e['legacy_continuation']['game_state']['phase']='normal_action'
   with api.scope():
    inventory=candidates.audit(e,[]);rows=[a for a in inventory['legal_candidate_details'] if a['action_type']=='activate_main_ability'];self.assertEqual([a['cost_instance_ids'] for a in rows],[costs])
    after,events=api.activate_normal(e,rows[0],[]);self.assertEqual(events[0]['action_type'],'activate_main_ability');self.assertEqual(triggers.board_candidates(state.current(after),events,s,runtime=after['runtime'])[0],[])
   return {}
  base.operation(initial(),run)
 def test_original_normal_loop_applies_existing116_without_valuing_unknown_draw(self):
  def run(forced):
   e,s,costs=fixture('M-antlion-02');g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']];p['deck'].extend(p['hand']);p['hand']=[];p['time']=0
   with api.scope():r=base._step(e,initial(),[],[],[e],forced)
   self.assertEqual(r['decision']['choice']['resolution_mode'],'seeded_fallback');self.assertEqual(r['evaluation']['legacy_116'],'excluded');self.assertEqual(len(r['decision']['choice']['legal_candidates']),2);self.assertIsNone(r['evaluation']['balance_admitted'])
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
