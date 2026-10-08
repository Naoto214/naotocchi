"""Source arithmetic must reject internally consistent forged result values."""
import copy,unittest
from unittest.mock import patch
import proxy_continuation_challenge as challenge
import proxy_continuation_payments as payments
import proxy_population_challenge_lifetime as lifetime
import test_proxy_population_challenge_lifetime as fixtures
fixture=fixtures.fixture
try:import proxy_population_challenge_operands as api
except ImportError:api=None

class OperandTests(unittest.TestCase):
 run_case=fixtures.LifetimeTests.run_case
 def test_self_consistent_forged_comparison_is_rejected(self):
  def run():
   e=fixture();original=challenge.stats
   with patch.object(challenge,'stats',lambda env,actor:{k:v+7 for k,v in original(env,actor).items()}):r=challenge.compare(e)
   proof=lifetime.audit(e,r['new_envelopes'][0],r['new_events'][0])
   self.assertTrue(proof['errors'],'receipt values must be independently source-bound');return {}
  self.run_case(run)
 def test_every_current_main_printed_pair_and_unknown_rejection(self):
  self.assertIsNotNone(api)
  def run():
   e=fixture(0);g=e['legacy_continuation']['game_state'];p=g['players']['A'];p['board'].update(world=None,companions=[])
   for card,pair in [('M-antlion-01',(2,3)),('M-antlion-02',(3,4)),('M-antlion-03',(5,4)),('M-antlion-04',(1,5)),('M-antlion-05',(2,5)),('M-antlion-06',(6,5)),('M-antlion-07',(7,6)),('M-antlion-08',(4,8)),('M-beetle-01',(2,2)),('M-beetle-02',(3,2))]:
    source=next(s for s,v in g['cards'].items() if v['card_id']==card);p['board']['main']=source
    self.assertEqual(api.values(e,'A')['values'],dict(zip(('power','wisdom'),pair)),card)
   g['cards'][source]['card_id']='M-unregistered'
   with self.assertRaisesRegex(ValueError,'unsupported'):api.values(e,'A')
   return {}
  self.run_case(run)
 def test_public_world_hand_threshold_and_chameleon_stacking(self):
  self.assertIsNotNone(api)
  def run():
   e=fixture(0);g=e['legacy_continuation']['game_state'];p=g['players']['A'];other=g['players']['B'];base=dict(power=2,wisdom=2)
   deep=[s for s,v in g['cards'].items() if v['card_id']=='W-deepsea'];city=next(s for s,v in g['cards'].items() if v['card_id']=='W-city');companions=[s for s,v in g['cards'].items() if v['card_id']=='C-chameleon'];hand=list(p['hand'])
   for count in (0,2,3):
    p['hand']=hand[:count];p['board']['world']=deep[0]
    for mode,world,bonus in [('absent',None,None),('same',deep[-1],'wisdom'),('different',city,'power')]:
     other['board']['world']=world;p['board']['companions']=companions
     expected={k:v+(1 if count<=2 else 0)+(len(companions) if k==bonus else 0) for k,v in base.items()}
     self.assertEqual(api.values(e,'A')['values'],expected,(count,mode))
     self.assertEqual(challenge.stats(e,'A'),expected)
   p['board']['world']=None;self.assertEqual(api.values(e,'A')['values'],base)
   return {}
  self.run_case(run)
 def test_typed_sum_target_and_scope_with_mutation_rejection(self):
  self.assertIsNotNone(api)
  def run():
   e=fixture(2);g=e['legacy_continuation']['game_state'];source=next(s for s,v in g['cards'].items() if v['card_id']=='G-baseball-batting');payments.add_stat_modifier(e,'A',source,g['players']['A']['board']['main'])
   self.assertEqual(api.values(e,'A')['values'],dict(power=2,wisdom=0));self.assertEqual(api.values(e,'B')['values'],dict(power=2,wisdom=3))
   bad=copy.deepcopy(e);bad['runtime']['stat_effects'][0]['power']=-99
   with self.assertRaises(ValueError):api.values(bad,'A')
   bad=copy.deepcopy(e);bad['legacy_continuation']['game_state']['players']['A']['reservations'].append({'unproved':True})
   with self.assertRaisesRegex(ValueError,'reservation'):api.values(bad,'A')
   return {}
  self.run_case(run)
 def test_actual_values_bound_but_history_not_promoted(self):
  def run():
   for parameter in ('power','wisdom'):
    e=fixture();e['legacy_continuation']['game_state']['challenge']['parameter']=parameter
    r=challenge.compare(e);proof=lifetime.audit(e,r['new_envelopes'][0],r['new_events'][0])
    self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_comparison_arithmetic_verified'])
    self.assertFalse(proof['comparison_operands_proven']);self.assertFalse(proof['effect_creation_proven'])
    self.assertEqual({o:p['values'][parameter] for o,p in proof['comparison_operand_binding'].items()},r['new_events'][0]['result']['values'])
   return {}
  self.run_case(run)
 def test_hidden_card_contents_do_not_change_public_arithmetic(self):
  self.assertIsNotNone(api)
  def run():
   e=fixture();before=api.values(e,'A');g=e['legacy_continuation']['game_state'];hidden=set(g['players']['B']['hand']+g['players']['A']['deck']+g['players']['B']['deck'])
   public={r['source_instance_id'] for name in ('payment_effects','stat_effects','conditional_effects') for r in e['runtime'][name]}
   for source in hidden-public:g['cards'][source]['card_id']='unread_hidden_identity'
   self.assertEqual(api.values(e,'A'),before);return {}
  self.run_case(run)
 def test_final_zero_floor_changes_exact_difference_reward(self):
  def run():
   e=fixture(2);g=e['legacy_continuation']['game_state'];source=next(s for s,v in g['cards'].items() if v['card_id']=='G-air-hockey')
   payments.add_stat_modifier(e,'B',source,g['players']['A']['board']['main'],'power')
   r=challenge.compare(e);a=r['new_envelopes'][0];event=r['new_events'][0]
   self.assertEqual(event['result']['values'],dict(A=0,B=2));self.assertEqual(event['result']['growth_requested'],15)
   self.assertEqual(api.values(e,'A')['values']['power'],0);self.assertEqual(lifetime.audit(e,a,event)['errors'],[])
   with patch.object(challenge,'stats',lambda env,actor:dict(power=-2 if actor=='A' else 2,wisdom=0)):
    forged=challenge.compare(e)
   self.assertTrue(lifetime.audit(e,forged['new_envelopes'][0],forged['new_events'][0])['errors'])
   return {}
  self.run_case(run)
 def test_floor_is_after_all_positive_continuous_contributions(self):
  def run():
   e=fixture(2);g=e['legacy_continuation']['game_state'];p=g['players']['A'];other=g['players']['B']
   source=next(s for s,v in g['cards'].items() if v['card_id']=='G-air-hockey');payments.add_stat_modifier(e,'B',source,p['board']['main'],'power')
   p['hand']=[];p['board']['world']=next(s for s,v in g['cards'].items() if v['card_id']=='W-deepsea')
   other['board']['world']=next(s for s,v in g['cards'].items() if v['card_id']=='W-city')
   p['board']['companions']=[next(s for s,v in g['cards'].items() if v['card_id']=='C-chameleon')]
   self.assertEqual(challenge.stats(e,'A'),dict(power=0,wisdom=1));self.assertEqual(api.values(e,'A')['values'],dict(power=0,wisdom=1))
   p['board']['companions']=[];self.assertEqual(challenge.stats(e,'A')['power'],0);self.assertEqual(api.values(e,'A')['values']['power'],0)
   return {}
  self.run_case(run)
 def test_scope_restores_native_and_preserves_historical_source_anchor(self):
  import proxy_population_runtime_entry as entry
  original=challenge.stats
  self.run_case(lambda:{})
  self.assertIs(challenge.stats,original);self.assertEqual(entry.verify_sources(),entry.SOURCES_SHA)
 def test_aborted_comparison_has_no_numeric_operand(self):
  def run():
   e=fixture();g=e['legacy_continuation']['game_state'];g['players']['A']['board']['main']=None
   r=challenge.compare(e);proof=lifetime.audit(e,r['new_envelopes'][0],r['new_events'][0]);self.assertEqual(proof['errors'],[])
   self.assertIsNone(proof.get('comparison_operand_binding'));return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
