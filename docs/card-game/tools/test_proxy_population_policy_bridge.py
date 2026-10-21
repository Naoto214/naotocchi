"""Synthetic callback bindings, never experiment roots or games."""
import copy,unittest
from test_proxy_mandatory_choice_boundary import frame
from proxy_mandatory_choice_boundary import prepare,apply_choice
try:import proxy_population_policy_bridge as api
except ImportError:api=None

class BridgeTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'runtime policy binding missing')
 def session(self):return api.Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32})
 def test_origin_counts_rule_occurrences_including_no_choice_and_retries(self):
  s=self.session();s.turn_start('A','start-1');s.turn_start('A','start-1')
  s.effect('auto-1','A');s.effect('effect-2','A');s.effect('effect-2','A')
  f=frame('ability_hand_bottom');b=prepare(f)
  r=s.choose('effect-2',f,b['choice_game_state'],b['candidate_ids'])
  self.assertEqual(r['local_policy_evidence']['context']['opportunity_address'],['A',1,'A','effect_resolution',2,'ability_hand_bottom','selection',0])
  self.assertEqual(r,s.choose('effect-2',f,b['choice_game_state'],b['candidate_ids']))
  self.assertTrue(r['strategic_unproven']);self.assertIsNone(r['policy_eligible'])
  self.assertNotIn('seed_proof',r);self.assertNotEqual(r['resolution_mode'],'seeded_fallback')
 def test_each_registered_kind_checks_intermediate_complete_choices_and_application(self):
  for kind in ('egg_exchange_bottom','ability_hand_bottom','ability_draw_then_hand_bottom','ability_topdeck_order','final_time_hand_bottom'):
   s=self.session();s.turn_start('A','start');key='start' if kind=='egg_exchange_bottom' else 'effect'
   if key=='effect':s.effect(key,'A')
   f=frame(kind);b=prepare(f);r=s.choose(key,f,b['choice_game_state'],b['candidate_ids'])
   want=apply_choice(f,r['selected_candidate'])['local_after_game_state']
   s.verify_after(key,f,want)
   changed=copy.deepcopy(want);changed['players']['A']['deck'].reverse()
   if changed!=want:
    with self.assertRaises(ValueError):s.verify_after(key,f,changed)
   with self.assertRaises(ValueError):s.choose(key,f,b['choice_game_state'],b['candidate_ids'][:-1])
   bad=copy.deepcopy(b['choice_game_state']);bad['players']['B']['time']+=1
   with self.assertRaises(ValueError):s.choose(key,f,bad,b['candidate_ids'])
 def test_no_origin_rebinding_out_of_turn_and_cross_turn_replay(self):
  s=self.session()
  with self.assertRaises(ValueError):s.effect('x','A')
  s.turn_start('A','a');s.effect('x','A');f=frame('ability_hand_bottom');b=prepare(f)
  r=s.choose('x',f,b['choice_game_state'],b['candidate_ids'])
  s.turn_start('B','b')
  self.assertEqual(s.choose('x',f,b['choice_game_state'],b['candidate_ids']),r)
  with self.assertRaises(ValueError):s.effect('x','B')
  with self.assertRaises(ValueError):s.effect('new','A')
  with self.assertRaises(ValueError):s.turn_start('B','a')
 def test_no_choice_requires_zero_callbacks_and_preserves_boundary(self):
  s=self.session();s.turn_start('A','a');s.effect('x','A');f=frame('ability_topdeck_order',(),())
  s.verify_after('x',f,apply_choice(f,None)['local_after_game_state'])
  with self.assertRaises(ValueError):s.choose('x',f,f['game_state'],[])


class HandlerTests(unittest.TestCase):
 def current(self,kind):
  from proxy_population_start_window import _context
  f=frame(kind);g=f['game_state'];g['phase']='response_window'
  ctx=_context('A','A');ctx.update(chain_status='resolving',chain_links=['unit-link'])
  link=dict(link_id='unit-link',actor='A',card_id=g['cards']['src']['card_id'],source_instance_id='src',source_zone='board',target_instance_ids=[],action_type='activate_ability')
  if kind=='final_time_hand_bottom':link.update(source_zone='hand',target_instance_ids=['target'],action_type='use_event',payment=dict(time=2))
  c=dict(game_state=g,response_context=ctx,activation_zone=[link],pending_triggers=[],return_target='normal_action_opportunity',last_event_seq=9)
  return c
 def test_existing_board_handlers_use_bound_policy_and_restore_all_callbacks(self):
  import proxy_continuation_triggers as t
  from test_proxy_population_runtime import initial
  for kind in ('ability_hand_bottom','ability_draw_then_hand_bottom','ability_topdeck_order'):
   s=api.Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});s.turn_start('A','start')
   c=self.current(kind);s.effect(api.occurrence_key(c),'A');original=t.mandatory_choice;resolver=t.resolve
   with api.handler_scope(s):
    result=t.resolve(c,initial());again=t.resolve(c,initial())
   self.assertEqual(result,again);self.assertIs(t.mandatory_choice,original);self.assertIs(t.resolve,resolver)
   d=result['new_decisions'][0];self.assertEqual(d['resolution_mode'],'planned_policy_random');self.assertTrue(d['strategic_unproven'])
   self.assertEqual(d['local_policy_evidence']['context']['opportunity_address'][4],1)
 def test_missing_registered_origin_rejects_instead_of_allocating_from_callback(self):
  import proxy_continuation_triggers as t
  from test_proxy_population_runtime import initial
  s=api.Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});s.turn_start('A','start')
  with api.handler_scope(s),self.assertRaisesRegex(ValueError,'unregistered'):t.resolve(self.current('ability_hand_bottom'),initial())

 def test_final_time_handler_binds_return_draw_choice_and_cleanup(self):
  import proxy_continuation_quick as q
  import proxy_continuation_triggers as t
  from test_proxy_population_runtime import initial
  s=api.Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});s.turn_start('A','start')
  c=self.current('final_time_hand_bottom');c['game_state']['players']['A']['board']['main']='main';c['continuation_state_sha256']=t.old.start._hash(c)
  s.effect(api.occurrence_key(c),'A')
  with api.handler_scope(s):r=q.resolve(c,initial())
  self.assertEqual(r['new_decisions'][0]['resolution_mode'],'planned_policy_random')
  self.assertEqual(r['final_continuation_state']['game_state']['players']['A']['discard'][-1],'src')

if __name__=='__main__':unittest.main()
