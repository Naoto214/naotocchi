import copy,gzip,json,unittest
from pathlib import Path
import proxy_continuation_state as state
import proxy_continuation_batch as batch
try:import proxy_continuation_payments as payments
except ImportError:payments=None

class PaymentTests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(payments)
  self.e=copy.deepcopy(json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-world-438/paired.json.gz').read_bytes()))['results'][5]['final_envelope'])
 def upgraded(self):
  return payments.upgrade(self.e)
 def test_effects_are_typed_visible_and_hash_bound(self):
  with payments.scope():
   e=self.upgraded();before=state.state_hash(e);g=e['legacy_continuation']['game_state'];source=next(s for s,c in g['cards'].items() if c['card_id']=='E-fateful-transform')
   payments.add_modifier(e,'B',source);state.validate(e)
   self.assertNotEqual(before,state.state_hash(e));self.assertEqual(state.visible(e,'A')['runtime']['payment_effects'],e['runtime']['payment_effects'])
   e['runtime']['payment_effects'][0]['amount']=99
   with self.assertRaises(ValueError):state.validate(e)
 def test_transform_only_additive_payment_floors_at_zero(self):
  with payments.scope():
   e=self.upgraded();g=e['legacy_continuation']['game_state'];source=next(s for s,c in g['cards'].items() if c['card_id']=='E-fateful-transform');payments.add_modifier(e,'B',source)
   proof=dict(legal=True,payment_time=1,reason_codes=[])
   result=payments.adjust_payment(e,dict(candidate_variant='transform'),proof)
   self.assertEqual(result['payment_time'],0);self.assertEqual(len(result['payment_effect_ids']),1)
   self.assertEqual(payments.adjust_payment(e,dict(candidate_variant='time_skip'),proof)['payment_time'],1)
 def test_stat_modifier_is_bound_to_the_target_instance(self):
  with payments.scope():
   e=self.upgraded();g=e['legacy_continuation']['game_state'];source=next(s for s,c in g['cards'].items() if c['card_id']=='E-big-illness');target=g['players']['B']['board']['main']
   payments.add_stat_modifier(e,'A',source,target);state.validate(e)
   self.assertEqual(payments.stat_delta(e,target),dict(power=-2,wisdom=-2))
   self.assertEqual(payments.stat_delta(e,'a-different-instance'),dict(power=0,wisdom=0))
 def test_expiration_requires_closed_end_boundary(self):
  with payments.scope():
   e=self.upgraded();g=e['legacy_continuation']['game_state'];source=next(s for s,c in g['cards'].items() if c['card_id']=='E-fateful-transform');payments.add_modifier(e,'B',source)
   with self.assertRaises(ValueError):payments.expire(e)
   c=e['legacy_continuation'];g['phase']='turn_end';c['response_context'].update(consecutive_passes=2,chain_status='empty');result=payments.expire(e)
   after=result['new_envelopes'][0]
   self.assertEqual(after['runtime']['payment_effects'],[]);self.assertEqual(result['new_events'][0]['expired_effect_ids'],[e['runtime']['payment_effects'][0]['effect_id']])
if __name__=='__main__':unittest.main()

class EquipmentTargetTests(PaymentTests):
 def test_printed_cost_and_controller_define_targets(self):
  with payments.scope():
   e=self.upgraded();g=e['legacy_continuation']['game_state'];actor=g['turn_player'];other='A' if actor=='B' else 'B'
   targets={}
   for player in g['players'].values():player['discard'].extend(player['board']['prepared']);player['board']['prepared']=[]
   e['runtime']['attachments'].clear();e['runtime']['public_prepared'].clear()
   for owner,card in [(actor,'I-bond1'),(other,'I-sleepboost1')]:
    p=g['players'][owner];zone,source=next((z,s) for z in ('hand','deck','discard') for s in p[z] if g['cards'][s]['card_id']==card)
    p[zone].remove(source);p['board']['prepared'].append(source);targets[owner]=source
    e['runtime']['public_prepared'][source]=dict(controller=owner,face_up=True,paid_time=0,placed_event_seq=e['event_seq'])
    e['runtime']['attachments'][source]=dict(controller=owner,target_instance_id=p['board']['main'],attached_event_seq=e['event_seq'])
   self.assertEqual(payments.equipment_targets(g,e['runtime'],actor,'G-archery-3d'),[targets[other]])
   self.assertEqual(payments.equipment_targets(g,e['runtime'],actor,'G-asteroids-classic'),[])
   from unittest.mock import patch
   entries=copy.deepcopy(payments.old.start.load_candidate_rows());entries['I-bond1']['actions'][0]['base_time_cost']=3
   with patch.object(payments.old.start,'load_candidate_rows',return_value=entries):
    self.assertEqual(payments.equipment_targets(g,e['runtime'],actor,'G-asteroids-classic'),[targets[actor]])
   e['runtime']['public_prepared'][targets[actor]]['face_up']=False
   self.assertEqual(payments.equipment_targets(g,e['runtime'],actor,'G-asteroids-classic'),[])

class ChallengeStatTests(PaymentTests):
 def test_challenge_effects_are_scoped_and_removed_with_the_battle(self):
  with payments.scope():
   e=self.upgraded();g=e['legacy_continuation']['game_state'];source=next(s for s,c in g['cards'].items() if c['card_id']=='G-baseball-batting');target=g['players']['B']['board']['main']
   g['challenge']=dict(challenge_id='challenge-test',status='comparing',declaring_actor='B',parameter='power',participants={o:g['players'][o]['board']['main'] for o in 'AB'})
   payments.add_stat_modifier(e,'B',source,target)
   self.assertEqual(e['runtime']['stat_effects'][0]['challenge_id'],'challenge-test')
   self.assertEqual(payments.stat_delta(e,target),dict(power=2,wisdom=0))
   payments.clear_challenge(e,'challenge-test');g.pop('challenge');state.validate(e)
   self.assertEqual(e['runtime']['stat_effects'],[])

class ConditionalRewardTests(PaymentTests):
 def test_next_win_consumes_condition_even_when_difference_is_wrong(self):
  with payments.scope():
   e=self.upgraded();g=e['legacy_continuation']['game_state'];actor=g['turn_player'];source=next(s for s,c in g['cards'].items() if c['card_id']=='G-basketball-3d');target=g['players'][actor]['board']['main']
   payments.add_conditional_reward(e,actor,source,target)
   battle=dict(participants={actor:target,'A':'other'},parameter='power')
   self.assertEqual(payments.consume_win_rewards(e,battle,actor,dict(B=6,A=3)),0)
   self.assertEqual(e['runtime']['conditional_effects'],[])
   payments.add_conditional_reward(e,actor,source,target)
   self.assertEqual(payments.consume_win_rewards(e,battle,actor,dict(B=5,A=3)),10)

class ResponseIdentityTests(PaymentTests):
 def test_board_count_response_uses_registered_explicit_variant(self):
  from unittest.mock import patch
  with payments.scope():
   e=self.upgraded();g=e['legacy_continuation']['game_state'];actor=g['turn_player'];g['players'][actor]['time']=3;source=next(s for s,v in g['cards'].items() if s.startswith(actor+'-') and v['card_id']=='G-area-claim');entry=payments.old.start.load_candidate_rows()['G-area-claim']
   with patch.object(payments,'board_count',return_value=7):details,_=payments.hand_candidates(state.current(e),actor,source,entry,[],e['runtime'])
   self.assertEqual(len(details),1);self.assertTrue(details[0]['candidate_id'].endswith('-variant-seven_or_eight_cards'))

class UpgradeIntegrityTests(PaymentTests):
 def test_reopening_current_envelope_preserves_all_live_effects(self):
  with payments.scope():
   e=self.upgraded();g=e['legacy_continuation']['game_state'];source=next(s for s,v in g['cards'].items() if v['card_id']=='E-fateful-transform');payments.add_modifier(e,'B',source)
   self.assertEqual(payments.upgrade(e),e)
