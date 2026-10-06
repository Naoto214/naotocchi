import copy,unittest
import proxy_population_runtime as base
import proxy_continuation_candidates as candidates
from test_proxy_population_runtime import initial
import test_proxy_continuation_challenge as fixtures
try:import proxy_population_unproved_priority as api
except ImportError:api=None

class UnprovedPriorityTests(unittest.TestCase):
 def test100_keeps_unknown_priorities_and_uses_existing_excluded116(self):
  self.assertIsNotNone(api,'unknown priority execution bridge absent');helper=fixtures.ChallengeTests();helper.setUp()
  def run(forced):
   e=base.engine.payments.upgrade(helper.e);g=e['legacy_continuation']['game_state'];g['phase']='normal_action';g['players']['A']['growth']=100
   for p in g['players'].values():p['deck'].extend(p['hand']);p['hand']=[];p['time']=0
   inv=candidates.audit(e,[])
   with api.scope():
    step=base._step(e,initial(),[],[],[e],forced);r=step['decision'];self.assertEqual(r['choice']['reason_code'],'strategic_unresolved_seeded_fallback');self.assertEqual(r['choice']['seeded_fallback_candidates'],inv['legal_candidate_ids']);self.assertEqual(step['evaluation']['legacy_116'],'excluded');self.assertEqual(r['execution_evidence']['priority_values'],None);self.assertFalse(r['execution_evidence']['policy_eligible'])
   return {}
  base.operation(initial(),run)
 def test_paid_handler_revalidates_current_excluded_policy_at100(self):
  from test_proxy_population_paid_draw import fixture
  import proxy_population_paid_draw as paid
  def run(forced):
   e,source,costs=fixture('M-antlion-02');g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']];p['growth']=100;p['deck'].extend(p['hand']);p['hand']=[];p['time']=0
   with paid.scope(),api.scope():
    step=base._step(e,initial(),[],[],[e],forced);self.assertEqual(step['evaluation']['legacy_116'],'excluded');self.assertEqual(len(step['events']),1)
   return {}
  base.operation(initial(),run)
 def test_recovery_handler_revalidates_current_excluded_policy_at100(self):
  from test_proxy_population_discard_recovery import fixture
  import proxy_population_discard_recovery as recovery
  def run(forced):
   e,history,source,target=fixture();e=base.engine.payments.upgrade(e);g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']];p['growth']=100;p['deck'].extend(p['hand']);p['hand']=[];p['time']=0
   with recovery.scope(),api.scope():
    i=initial();i['order_id']='unit-only';step=base._step(e,i,history,[],[e],forced);self.assertEqual(step['evaluation']['legacy_116'],'excluded');self.assertEqual(step['decision']['selected_action']['action_type'],'activate_companion_ability')
   return {}
  base.operation(initial(),run)
 def test_mixed_frontier_keeps_unknown_but_excludes_proven_dominated_pass(self):
  from test_proxy_population_first_response import game_with
  from proxy_population_start_window import _context
  import proxy_continuation_state as state
  def run(forced):
   g,actor,coin=game_with('I-c_coin2');p=g['players'][actor];all_ids=p['hand']+p['deck'];box=next(s for s in all_ids if g['cards'][s]['card_id']=='C-box');area=next(s for s in all_ids if g['cards'][s]['card_id']=='G-area-claim');p['hand']=[coin,box,area];p['deck']=[s for s in all_ids if s not in p['hand']];p.update(growth=95,time=1);g['phase']='normal_action'
   e=state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2)
   inv=candidates.audit(e,[]);ctx=dict(contract_version=base.engine.base.old.shadow.fallback.CONTRACT_VERSION,order_id='unit-only',actor=actor,actor_turn_index=1,round=1,phase='normal_action',decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
   with api.scope():r=candidates.select(e,inv,ctx,base.POLICY)
   frontier=r['choice']['seeded_fallback_candidates'];self.assertNotIn('pass',frontier);self.assertIn(next(a['candidate_id'] for a in inv['legal_candidate_details'] if a['source_instance_id']==coin),frontier);self.assertIn(next(a['candidate_id'] for a in inv['legal_candidate_details'] if a['source_instance_id']==box),frontier);self.assertFalse(r['execution_evidence']['policy_eligible'])
   return {}
  base.operation(initial(),run)
 def test_marriage_native_transition_uses_actual_bounded_increase(self):
  helper=fixtures.ChallengeTests();helper.setUp()
  def run(forced):
   e=base.engine.payments.upgrade(helper.e);g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']]
   source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='P-anglerfish');(p['hand'] if source in p['hand'] else p['deck']).remove(source)
   if p['board']['partner']:p['discard'].append(p['board']['partner'])
   p['board'].update(partner=source,partner_stage=3);p.update(time=1,growth=95,relationship_progressed=False)
   action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='relationship')
   with api.scope():after,events=base.engine.batch.transition(e,action,[])
   self.assertEqual(after['legacy_continuation']['game_state']['players'][g['turn_player']]['growth'],100);self.assertEqual(events[0]['growth_evidence']['operation']['requested_delta'],10);self.assertEqual(events[0]['growth_evidence']['operation']['actual_delta'],5)
   return {}
  base.operation(initial(),run)


class DirectGrowthOperandTests(unittest.TestCase):
 def test_direct_growth_default_zero_is_not_a_normal_comparison_proof(self):
  from test_proxy_population_activation_legality import fixture
  import proxy_population_activation_legality as legality
  def run(forced):
   e,actor,source=fixture('E-first-date',0);g=e['legacy_continuation']['game_state'];g['phase']='normal_action'
   with legality.scope(),api.scope():
    inventory=candidates.audit(e,[])
    ctx=dict(contract_version=base.engine.base.old.shadow.fallback.CONTRACT_VERSION,order_id='unit-only',actor=actor,actor_turn_index=1,round=1,phase='normal_action',decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
    r=candidates.select(e,inventory,ctx,base.POLICY)
    self.assertEqual(r['choice']['resolution_mode'],'seeded_fallback')
    self.assertEqual(r['execution_evidence']['native_comparison_guard'],'direct growth comparison operand proof unavailable')
    self.assertEqual(r['choice']['seeded_fallback_candidates'],inventory['legal_candidate_ids'])
    self.assertFalse(r['execution_evidence']['policy_eligible'])
   return {}
  base.operation(initial(),run)

class DirectGrowthFamiliesTests(unittest.TestCase):
 def test_public_growth_mechanisms_keep_unknown_candidates_in116_frontier(self):
  from test_proxy_population_effect_application_runtime import fixture
  def run(forced):
   for card in ('G-area-claim','E-boss'):
    e,actor,source=fixture(card,20);c=e['legacy_continuation'];g=c['game_state'];p=g['players'][actor]
    c['activation_zone']=[];c['response_context'].update(chain_status='empty',chain_links=[],consecutive_passes=0);g['phase']='normal_action';p['hand'].append(source);p['time']=3
    history=[dict(seq=2,action_type='challenge_compared',actor=actor,result=dict(outcome='win_loss',loser=actor))] if card=='E-boss' else []
    with api.scope():
     inventory=candidates.audit(e,history)
     target=next(a['candidate_id'] for a in inventory['legal_candidate_details'] if a['source_instance_id']==source)
     ctx=dict(contract_version=base.engine.base.old.shadow.fallback.CONTRACT_VERSION,order_id='unit-only',actor=actor,actor_turn_index=1,round=1,phase='normal_action',decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
     r=candidates.select(e,inventory,ctx,base.POLICY)
     self.assertIn(target,r['choice']['seeded_fallback_candidates'])
     self.assertEqual(r['execution_evidence']['candidate_comparison_evidence']['unproved'][target],api.DIRECT_GROWTH_GAP)
     self.assertNotIn(target,r['execution_evidence']['candidate_comparison_evidence']['proved_scores'])
    self.assertEqual(base._evaluate(r)['legacy_116'],'excluded')
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
