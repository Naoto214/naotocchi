"""Conditional107 local states, no input sampling or experiment execution."""
import copy,unittest
from test_proxy_population_runtime import initial
from test_proxy_population_first_response import game_with
import proxy_population_runtime as runtime
import proxy_continuation_state as state
from proxy_population_start_window import _context
try:import proxy_population_discard_recovery as api
except ImportError:api=None

def fixture():
 g,a,source=game_with('C-cat_friend');p=g['players'][a];p['hand'].remove(source);p['board']['companions']=[source]
 available=p['hand']+p['deck'];target=next(s for s in available if g['cards'][s]['card_id']=='C-box')
 (p['hand'] if target in p['hand'] else p['deck']).remove(target);p['discard'].append(target)
 ctx=_context(a,a);ctx.update(origin_event_seq=3,window_kind='after_normal_action',source_phase='post_placement_response');g['phase']='post_placement_response'
 e=state.create(dict(game_state=g,response_context=ctx,activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),3)
 c=state.current(e);old=runtime.engine.base.old
 events=[dict(seq=1,actor=a,action_type='turn_start_and_egg_draw'),dict(seq=3,actor=a,action_type='person_placement',source_instance_id=source,game_state_after_sha256=old.start.opening._stop_state_sha256(g),continuation_state_after_sha256=old.start._hash(c))]
 return e,events,source,target
class RecoveryTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_public_target_inventory_distinguishes_own_turn_and_same_name(self):
  e,events,source,target=fixture();c=state.current(e)
  rows,reason=api.board_candidates(c,events,source)
  self.assertEqual([r['target_instance_ids'] for r in rows],[[target]])
  other=copy.deepcopy(c);other['game_state']['turn_player']='B';self.assertEqual(api.board_candidates(other,events,source)[0],[])
  own=copy.deepcopy(c);own['game_state']['cards'][target]['card_id']='C-cat_friend';self.assertEqual(api.board_candidates(own,events,source)[0],[])
  used=events+[dict(seq=4,actor='A',action_type='activate_response',source_zone='board',source_instance_id=source)]
  self.assertEqual(api.board_candidates(c,used,source)[0],[])
 def test_actual_response_inventory_includes_target_and_pass_without_policy_extension(self):
  e,events,source,target=fixture()
  def run(forced):
   with api.scope():
    r=runtime.engine.base.actions.response_inventory(runtime.engine.payments.upgrade(e),initial(),events)
    self.assertTrue(r['candidate_set_complete']);self.assertIn('response-pass',r['legal_candidate_ids']);self.assertTrue(any(x['target_instance_ids']==[target] for x in r['legal_candidate_details']))
   return {}
  runtime.operation(initial(),run)
class RecoveryExecutionTests(unittest.TestCase):
 def test_source_cost_reference_two_passes_and_recovery_reuse_existing_chain(self):
  self.assertTrue(hasattr(api,'activate'))
  e,events,source,target=fixture()
  def run(forced):
   import proxy_continuation_triggers as triggers
   c=runtime.engine.payments.upgrade(e)
   with api.scope():
    action=api.board_candidates(state.current(c),events,source)[0][0]
    after,generated=api.activate(c,dict(selected_action=action),events)
    p=after['legacy_continuation']['game_state']['players']['A'];self.assertNotIn(source,p['board']['companions']);self.assertEqual(p['deck'][-1],source);state.validate(after)
    self.assertTrue(after['legacy_continuation']['activation_zone']);history=events+[{k:v for k,v in x.items() if k not in runtime.BIND_KEYS} for x in generated]
    for _ in range(3):
     step=runtime._step(after,initial(),history,[],[],forced);after=step['final_envelope'];history += [{k:v for k,v in x.items() if k not in runtime.BIND_KEYS} for x in step['events']]
    p=after['legacy_continuation']['game_state']['players']['A'];self.assertIn(target,p['hand']);self.assertEqual(p['deck'][-1],source);self.assertFalse(after['legacy_continuation']['activation_zone'])
    self.assertEqual(after['runtime']['ability_uses'][0]['ability_key'],'activated_normal_action')
   return {}
  runtime.operation(initial(),run)
class RecoveryIntegrityTests(unittest.TestCase):
 def test_paid_reference_and_runtime_replay_reject_forgery(self):
  e,events,source,target=fixture()
  def run(forced):
   import proxy_continuation_end as end
   with api.scope():
    before=runtime.engine.payments.upgrade(e);a=api.board_candidates(state.current(before),events,source)[0][0];after,generated=api.activate(before,dict(selected_action=a),events)
    raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
    self.assertTrue(end.RUNTIME_TRANSITION_VERIFIER(before,after,raw,events))
    bad=copy.deepcopy(after);bad['legacy_continuation']['activation_zone'][0]['source_cost_receipt']['paid_event_seq']=True
    with self.assertRaises(ValueError):state.validate(bad)
    bad=copy.deepcopy(after);bad['legacy_continuation']['activation_zone'][0]['payment']['time']=False
    with self.assertRaises(ValueError):state.validate(bad)
    bad=copy.deepcopy(after);bad['runtime']['ability_uses']=[]
    self.assertFalse(end.RUNTIME_TRANSITION_VERIFIER(before,bad,raw,events))
   return {}
  runtime.operation(initial(),run)
 def test_disappeared_target_is_not_replaced_at_resolution(self):
  e,events,source,target=fixture()
  def run(forced):
   with api.scope():
    before=runtime.engine.payments.upgrade(e);a=api.board_candidates(state.current(before),events,source)[0][0];after,_=api.activate(before,dict(selected_action=a),events);c=state.current(after)
    p=c['game_state']['players']['A'];p['discard'].remove(target);p['deck'].insert(0,target);c['response_context']['chain_status']='resolving'
    result=api.resolve(c,initial());self.assertFalse(result['new_events'][0]['result']['returned_to_hand']);self.assertNotIn(target,result['final_continuation_state']['game_state']['players']['A']['hand'])
   return {}
  runtime.operation(initial(),run)

class QuickRecoveryTests(unittest.TestCase):
 def test_quick_recovery_uses_legacy_mandatory_policy_and_existing_chain(self):
  e,events,_,target=fixture();g=e['legacy_continuation']['game_state'];p=g['players']['A'];source=next(x for x in p['hand']+p['deck'] if g['cards'][x]['card_id']=='G-animal-shogi')
  if source in p['deck']:p['deck'].remove(source);p['hand'].append(source)
  p['time']=5
  current=state.current(e);old=runtime.engine.base.old;events[-1].update(game_state_after_sha256=old.start.opening._stop_state_sha256(g),continuation_state_after_sha256=old.start._hash(current))
  def run(forced):
   import proxy_continuation_quick as quick
   import proxy_continuation_payments as payments
   with api.scope():
    before=payments.upgrade(e);c=state.current(before);rows,_=quick.hand_candidates(c,events,'A',source,triggers.old.start.load_candidate_rows()['G-animal-shogi'])
    self.assertEqual([r['target_instance_ids'] for r in rows],[[target]])
    chance=runtime.engine.base.actions.response_inventory(before,initial(),events);a=next(r for r in chance['legal_candidate_details'] if r['source_instance_id']==source)
    record=dict(selected_action=a,candidate_set_evidence=chance)
    after,_=quick.activate(before,record,dict(public_events=events),initial());c=state.current(after);c['response_context']['chain_status']='resolving';after=state.advance(after,c,after['event_seq'])
    result=payments.resolve(after,initial());final=result['new_envelopes'][0];self.assertIn(target,final['legacy_continuation']['game_state']['players']['A']['hand']);self.assertIn(source,final['legacy_continuation']['game_state']['players']['A']['discard'])
    choice=result['new_decisions'][0];self.assertEqual(choice['reason_code'],'strategic_unresolved_seeded_fallback');self.assertTrue(choice['strategic_unresolved']);self.assertNotIn('policy_eligible',choice)
   return {}
  import proxy_continuation_triggers as triggers
  runtime.operation(initial(),run)

class NormalRecoveryTests(unittest.TestCase):
 def test_normal_activation_uses_same_cost_effect_and_usage_contract(self):
  self.assertTrue(hasattr(api,'activate_normal'))
  e,events,source,target=fixture();e['legacy_continuation']['game_state']['phase']='normal_action';e['legacy_continuation']['game_state']['players']['A']['person_placed']=True
  def run(forced):
   with api.scope():
    before=runtime.engine.payments.upgrade(e);inventory=runtime.engine.base.candidates.audit(before,events);a=next(a for a in inventory['legal_candidate_details'] if a['action_type']=='activate_companion_ability')
    context=dict(contract_version=runtime.engine.base.old.shadow.fallback.CONTRACT_VERSION,order_id='unit-only',actor='A',actor_turn_index=1,round=before['legacy_continuation']['game_state']['round'],phase='normal_action',decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
    record=runtime.engine.base.candidates.select(before,inventory,context,runtime.POLICY,None)
    self.assertEqual(record['choice']['resolution_mode'],'seeded_fallback');self.assertTrue(record['choice']['strategic_unresolved'])
    after,generated=api.activate_normal(before,a,events)
    self.assertEqual(after['legacy_continuation']['response_context']['origin_event_seq'],after['event_seq'])
    self.assertEqual(generated[0]['action_type'],'activate_companion_ability');self.assertEqual(after['legacy_continuation']['game_state']['players']['A']['deck'][-1],source)
    self.assertTrue(runtime.engine.batch.rules.used(after,source,'activated_normal_action'))
    import proxy_continuation_end as end
    raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
    self.assertTrue(end.RUNTIME_TRANSITION_VERIFIER(before,after,raw,events))
   return {}
  runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
