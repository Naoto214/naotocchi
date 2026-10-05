"""Synthetic integration: no independent seeds, planned matches or adoption."""
import copy,unittest
from test_proxy_population_first_response import game_with
from proxy_population_start_window import _context
import proxy_continuation_state as state
import proxy_continuation_batch_runner as engine
try:import proxy_population_runtime as api
except ImportError:api=None

def initial():
 return dict(path_id='unit-only',order_id='unit-group',first_player='A',inputs=dict(boundaries=[],path_id='unit-only',source_raw_sha256={},historical_response_inventories=[],response_seed_profiles=[],legacy_pass_boundaries=[],legacy_empty_pass_boundaries=[]))

def boundary(card='C-box'):
 g,a,s=game_with(card)
 c=dict(game_state=g,response_context=_context(a,a),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity')
 return state.create(c,2),s

class RuntimeTests(unittest.TestCase):
 def setUp(self):self.assertTrue(hasattr(api,'step'),'shared runtime operation adapter missing')
 def test_existing_response_fallback_is_executed_but_never_admitted_or_renamed(self):
  e,s=boundary('G-hit-blow');before=copy.deepcopy(e)
  r=api.step(e,initial(),[],[],[e])
  self.assertEqual(r['decision']['resolution_mode'],'response_seeded_fallback')
  self.assertEqual(r['decision']['seed_context']['order_id'],'unit-group')
  self.assertEqual(r['evaluation']['legacy_116'],'excluded')
  self.assertIsNone(r['evaluation']['policy_eligible']);self.assertEqual(e,before)
  self.assertEqual(len(r['events']),1)
 def test_unique_responses_continue_together_to_normal_boundary(self):
  e,_=boundary();r=api.segment(e,initial(),[],[],[e],2)
  self.assertEqual(len(r['decisions']),2)
  self.assertEqual(r['final_envelope']['legacy_continuation']['game_state']['phase'],'normal_action')
  self.assertEqual([d['resolution_mode'] for d in r['decisions']],['response_unique','response_unique'])
  self.assertEqual([x['seq'] for x in r['events']],[3,4])
  self.assertFalse(r['ready_for_execution'])
 def test_existing_normal_candidates_and_selector_are_used_after_window(self):
  e,_=boundary();r=api.segment(e,initial(),[],[],[e],3)
  self.assertIsNone(r['stop']);self.assertEqual(len(r['decisions']),3)
  self.assertEqual(r['decisions'][-1]['policy_id'],'legacy_107_114_116')
  self.assertEqual(r['decisions'][-1]['selected_candidate'],'candidate-place-companion-A-012#1')
 def test_chain_resolution_uses_existing_handler_before_end_history_gate(self):
  e,_=boundary('G-hit-blow');r=api.segment(e,initial(),[],[],[e],8)
  self.assertEqual([x['action_type'] for x in r['events']],['activate_response','response_pass','response_pass','resolve_play','normal_pass_end_request','response_pass'])
  self.assertEqual(r['stop']['detail'],'end history event/snapshot coverage differs')
  self.assertEqual(r['stop']['phase'],'turn_end')
 def test_all_scope_hooks_restore_after_failure_and_reentry_is_rejected(self):
  original=engine.base.run_route;schema=state.SCHEMA
  def fail(forced):raise ValueError('unit failure')
  with self.assertRaisesRegex(ValueError,'unit failure'):api.operation(initial(),fail)
  self.assertIs(engine.base.run_route,original);self.assertEqual(state.SCHEMA,schema)
  with self.assertRaisesRegex(ValueError,'reentry'):api.operation(initial(),lambda f:api.operation(initial(),lambda x:{}))
  self.assertIs(engine.base.run_route,original)
 def test_step_hashes_and_lookup_are_bound_and_invalid_limit_rejected(self):
  from proxy_record_validator import canonical_sha256
  e,_=boundary();r=api.step(e,initial(),[],[],[e]);after=r['envelopes'][0]
  self.assertEqual(r['events'][0]['envelope_after_sha256'],canonical_sha256(after))
  self.assertEqual(r['events'][0]['envelope_before_sha256'],canonical_sha256(r['source_envelope']))
  self.assertEqual(after['legacy_continuation']['game_state']['cards'],e['legacy_continuation']['game_state']['cards'])
  for limit in (True,0,-1,513):
   with self.assertRaises(ValueError):api.segment(e,initial(),[],[],[e],limit)

class MultiTurnTests(unittest.TestCase):
 def test_supplied_historical_unit_order_continues_through_next_turn(self):
  from test_proxy_mandatory_population_input import bundle
  from proxy_population_opening import reconstruct_opening
  from proxy_population_policy_bridge import Session
  prefix=reconstruct_opening(bundle(),'test-1A');e=prefix['final_envelope'];cards=e['legacy_continuation']['game_state']['cards']
  shots=[]
  for snap in prefix['snapshots'][:2]:
   g=copy.deepcopy(snap['state']);g['cards']=copy.deepcopy(cards)
   shots.append(dict(event_seq=snap['seq'],game_state=g,game_state_sha256=snap['state_sha256'],continuation_state=None,continuation_state_sha256=None))
  shots.append(engine.base.old._snapshot(state.current(e)))
  i=initial();i.update(path_id='test-1A',order_id='test-1');i['inputs']['path_id']=i['path_id']
  s=Session(dict(protocol_id='policy_conditional_population.v1',group_id='test-1',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});s.turn_start('A','opening')
  r=api.segment(e,i,prefix['events'],shots,[e],40,session=s)
  self.assertIn('turn_end_completed',[x['action_type'] for x in r['events']],r['stop'])
  self.assertGreaterEqual(s.counts['B'],1)
  ends=[step for step in r['steps'] if any(e['action_type']=='turn_end_completed' for e in step['events'])]
  self.assertTrue(all(x['forced_record']['end_evidence']['turn_end_set_complete'] for x in ends))
  self.assertTrue(any(d['policy_basis']=='designated_supplied_policy' for x in ends for d in x['judgment_evaluations']))
  self.assertFalse(r['ready_for_execution'])

if __name__=='__main__':unittest.main()
