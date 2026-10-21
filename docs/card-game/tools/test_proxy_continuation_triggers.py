import copy,gzip,json,unittest
from pathlib import Path
import proxy_continuation_batch as batch
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old
try:import proxy_continuation_triggers as triggers
except ImportError:triggers=None

class TriggerTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.rows=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-world-438/paired.json.gz').read_bytes()))['results']
 def setUp(self):self.assertIsNotNone(triggers)
 def test_birth_fifth_stage_does_not_offer_time_skip_trigger(self):
  e=copy.deepcopy(self.rows[6]['final_envelope']);g=e['legacy_continuation']['game_state'];p=g['players']['A'];s=next(s for s in p['hand'] if g['cards'][s]['card_id']=='M-antlion-05')
  with batch.scope():
   a=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['card_id']=='M-antlion-05')
   after,events=batch.transition(e,a)
   raw={k:v for k,v in events[0].items() if k not in ('execution_contract_id','envelope_before_sha256','envelope_after_sha256')}
   details,reason=triggers.board_candidates(state.current(after),[raw],s,'main')
  self.assertEqual(details,[])
 def test_board_ability_does_not_count_as_played_card(self):
  events=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=2,actor='A',action_type='activate_response',source_zone='board'),dict(seq=3,actor='A',action_type='use_item',source_zone='hand')]
  self.assertEqual(batch.turn_card_count({},events,'A',3),1)
 def test_companion_ability_retains_existing_adapter(self):
  self.assertNotIn('C-chicken',triggers.SUPPORTED_EFFECTS)
  self.assertNotIn('C-cat_friend',triggers.SUPPORTED_EFFECTS)
 def test_rest_equipment_uses_remaining_time_and_own_challenge_flag(self):
  e=copy.deepcopy(self.rows[5]['final_envelope']);g=e['legacy_continuation']['game_state'];p=g['players']['B'];zone,source=next((z,s) for z in ('hand','deck','discard') for s in p[z] if g['cards'][s]['card_id']=='I-sleepboost1');p[zone].remove(source);p['board']['prepared'].append(source);p['time']=2;p['challenge_used']=False
  e['runtime']['attachments'][source]=dict(controller='B',target_instance_id=p['board']['main'],attached_event_seq=e['event_seq']);e['runtime']['public_prepared'][source]=dict(controller='B',face_up=True,paid_time=2,placed_event_seq=e['event_seq'])
  with batch.scope():
   eligible,_=triggers.end_inventory(e,self.rows[5]['events']);self.assertIn(source,eligible)
   p['challenge_used']=True;eligible,_=triggers.end_inventory(e,self.rows[5]['events']);self.assertNotIn(source,eligible)
 def test_seeded_hand_choice_covers_every_owner_copy(self):
  e=copy.deepcopy(self.rows[5]['final_envelope']);c=state.current(e);g=c['game_state'];p=g['players']['B'];initial=old.load_initial_routes()[2]
  choice=triggers.mandatory_choice(initial,c,'B',p['hand'],'hand_bottom')
  self.assertEqual(set(choice['legal_candidates']),{g['cards'][s]['card_copy_id'] for s in p['hand']});self.assertFalse(old.shadow.fallback.validate_seeded_resolution(choice))

if __name__=='__main__':unittest.main()

class StartClassificationTests(TriggerTests):
 def test_historical_end_equipment_has_independent_start_classification(self):
  import proxy_continuation_end as end
  e=copy.deepcopy(self.rows[1]['final_envelope']);g=copy.deepcopy(e['legacy_continuation']['game_state']);p=g['players']['B']
  zone,source=next((zone,s) for zone in ('hand','deck','discard') for s in p[zone] if g['cards'][s]['card_id']=='I-sleepboost1');p[zone].remove(source);p['board']['prepared'].append(source)
  with batch.scope(),end.end_scope(e,[],[],[]):
   inventory=old.reached.ORIGINAL_CLASSIFY(g,'B')
  self.assertTrue(any(row['source_instance_id']==source and row['trigger_kind']=='not_turn_start_trigger' for row in inventory))

class ResponseOccurrenceTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.rows=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-batch-439/paired.json.gz').read_bytes()))['results']
 def setUp(self):
  self.e=copy.deepcopy(self.rows[1]['snapshots'][0]);self.c=copy.deepcopy(self.e['legacy_continuation']);self.g=self.c['game_state'];self.g['turn_player']='A'
  self.city=self.source('W-city','A');self.quick=self.source('I-c_coin2','A');self.main=self.source('M-antlion-03','B');self.trap=self.source('I-poop1','B')
  self.c['response_context'].update(origin_event_seq=2,priority_actor='A');self.g['players']['A']['board']['world']=self.city
  self.history=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=2,actor='A',action_type='place_world',source_instance_id=self.city),dict(seq=3,actor='A',action_type='activate_response',source_zone='hand',source_instance_id=self.quick)]
 def source(self,card,actor):return next(s for s,v in self.g['cards'].items() if s.startswith(actor+'-') and v['card_id']==card)
 def test_second_response_play_uses_actual_occurrence_not_window_anchor(self):
  with batch.scope():details,_=triggers.board_candidates(self.c,self.history,self.city,'world')
  self.assertEqual(len(details),1);self.assertEqual(details[0]['trigger_origin_event_seq'],3)
  self.assertEqual(self.c['response_context']['origin_event_seq'],2)
 def test_used_second_play_is_not_enumerated_again(self):
  history=self.history+[dict(seq=4,actor='A',action_type='activate_response',source_zone='board',source_instance_id=self.city,trigger_origin_event_seq=3)]
  with batch.scope():details,_=triggers.board_candidates(self.c,history,self.city,'world')
  self.assertEqual(details,[])
 def test_opponent_response_quick_with_concealed_preparation_fails_closed(self):
  self.c['response_context']['priority_actor']='B';p=self.g['players']['B'];p['board']['main']=self.main;p['board']['prepared']=[self.trap]
  runtime=dict(public_prepared={self.trap:dict(face_up=False)})
  from unittest.mock import patch
  with batch.scope(),patch.object(batch,'RESPONSE_FULL_RUNTIME',runtime):
   with self.assertRaisesRegex(ValueError,'eligible board activation/response obligation'):
    batch.response_capability(self.c,self.history,self.main,'main')
 def test_board_and_prepared_activations_are_not_quick_card_plays(self):
  from unittest.mock import patch
  self.c['response_context']['priority_actor']='B';p=self.g['players']['B'];p['board']['main']=self.main;p['board']['prepared']=[self.trap]
  for zone in ('board','prepared'):
   history=copy.deepcopy(self.history);history[-1]['source_zone']=zone
   with self.subTest(zone=zone),batch.scope(),patch.object(batch,'RESPONSE_FULL_RUNTIME',dict(public_prepared={self.trap:dict(face_up=False)})):
    self.assertEqual(batch.response_capability(self.c,history,self.main,'main')['reason_code'],'trigger_condition_not_met')
   self.c['response_context']['priority_actor']='A'
   with batch.scope():self.assertEqual(triggers.board_candidates(self.c,history,self.city,'world')[0],[])
   self.c['response_context']['priority_actor']='B'
 def test_later_prepared_activation_does_not_count_as_a_played_card(self):
  history=copy.deepcopy(self.history);history[1].update(action_type='activate_response',source_zone='prepared')
  self.assertEqual(batch.turn_card_count(self.g,history,'A',3),1)
 def test_unknown_effect_application_cannot_be_accepted_as_unmet(self):
  e,result=self.resolution();result['new_events'][0]['created_effect']={}
  with self.assertRaisesRegex(ValueError,'post-resolution obligation effect application unproved'):batch.guard_resolution_result(e,result,[])
 def test_resolution_guard_excludes_board_source_with_a_quick_printed_method(self):
  e,result=self.resolution();e['legacy_continuation']['activation_zone'][-1]['source_zone']='board'
  batch.guard_resolution_result(e,result,[])
 def resolution(self):
  import proxy_continuation_payments as payments
  e=copy.deepcopy(next(e for e in self.rows[1]['snapshots'] if e['event_seq']==88));g=e['legacy_continuation']['game_state'];g.pop('challenge',None);g['turn_player']='B';p=g['players']['B'];main=next(s for s in p['deck'] if g['cards'][s]['card_id']=='M-antlion-06');p['deck'].remove(main);p['discard'].append(p['board']['main']);p['board']['main']=main
  for card,zone in [('W-city','hand'),('W-countryside','discard')]:
   s=next(s for s in p['deck'] if g['cards'][s]['card_id']==card);p['deck'].remove(s);p[zone].append(s)
  with payments.scope(),batch.scope():state.validate(e);result=payments.resolve(e);state.validate(result['new_envelopes'][0])
  return e,result
 def test_positive_last_link_resolution_obligation_blocks_continuation(self):
  e,result=self.resolution()
  self.assertEqual(result['new_envelopes'][0]['legacy_continuation']['game_state']['phase'],'normal_action')
  with self.assertRaisesRegex(ValueError,'post-resolution obligation'):batch.guard_resolution_result(e,result,[])
 def test_resolution_guard_rechecks_resource_turn_and_actual_effect(self):
  e,result=self.resolution()
  for case in ('no_world_payment','opponent_turn','no_effect'):
   r=copy.deepcopy(result);g=r['new_envelopes'][0]['legacy_continuation']['game_state'];p=g['players']['B']
   if case=='no_world_payment':p['hand']=[s for s in p['hand'] if not g['cards'][s]['card_id'].startswith('W-')]
   elif case=='opponent_turn':g['turn_player']='A'
   else:r['new_events'][0]['created_effect']=dict(effect_applied=False)
   with self.subTest(case=case):batch.guard_resolution_result(e,r,[])
 def test_batch_forced_adapter_cannot_accept_positive_unsupported_resolution(self):
  from unittest.mock import patch
  import proxy_continuation_batch_runner as runner
  e,_=self.resolution();initial=old.load_initial_routes()[0]
  def run(initial,policy,forced):return forced(e,initial,[],[],[e])
  with patch.object(runner.base,'run_route',side_effect=run):
   with self.assertRaisesRegex(ValueError,'post-resolution obligation'):runner.run_route(initial,old.POLICIES[0])
