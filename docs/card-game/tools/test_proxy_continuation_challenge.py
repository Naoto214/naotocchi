import copy,gzip,json,unittest
from pathlib import Path
import proxy_continuation_state as state
import proxy_continuation_batch as batch
import proxy_continuation_candidates as candidates
import proxy_continuation_payments as payments
try:import proxy_continuation_challenge as challenge
except ImportError:challenge=None

class ChallengeTests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(challenge)
  self.e=copy.deepcopy(json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-world-438/paired.json.gz').read_bytes()))['results'][5]['final_envelope'])
  g=self.e['legacy_continuation']['game_state'];p=g['players']['A'];source=next(s for s in p['deck'] if g['cards'][s]['card_id']=='M-beetle-01');p['deck'].remove(source);p['board']['main']=source
 def test_declaration_fixes_participants_and_consumes_no_reward(self):
  with payments.scope(),batch.scope():
   e=payments.upgrade(self.e);inv=candidates.audit(e,[]);a=next(a for a in inv['legal_candidate_details'] if a['action_type']=='challenge' and a['candidate_variant']=='power');before=copy.deepcopy(e);after,events=challenge.declare(e,a)
   g=after['legacy_continuation']['game_state'];battle=g['challenge']
   self.assertEqual(battle['participants'],{o:p['board']['main'] for o,p in g['players'].items()});self.assertEqual(battle['parameter'],'power');self.assertTrue(g['players']['B']['challenge_used'])
   self.assertEqual({o:p['growth'] for o,p in g['players'].items()},{o:p['growth'] for o,p in before['legacy_continuation']['game_state']['players'].items()});self.assertEqual(events[0]['envelope_after_sha256'],state.state_hash(after))
 def test_comparison_uses_current_source_bound_stat_modifier(self):
  with payments.scope(),batch.scope():
   e=payments.upgrade(self.e);a=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='challenge' and a['candidate_variant']=='power');after,_=challenge.declare(e,a);c=after['legacy_continuation'];g=c['game_state'];g['phase']='challenge_comparison';c['response_context']['consecutive_passes']=2
   source=next(s for s,v in g['cards'].items() if s.startswith('B-') and v['card_id']=='E-big-illness');payments.add_stat_modifier(after,'B',source,g['players']['A']['board']['main']);result=challenge.compare(after)
   self.assertEqual(result['new_events'][0]['result']['winner'],'B');self.assertEqual(result['new_events'][0]['result']['values'],dict(A=0,B=2))
if __name__=='__main__':unittest.main()

class BoardChallengeTests(ChallengeTests):
 def test_partner_ability_requires_own_declaration_and_deepsea(self):
  with payments.scope(),batch.scope():
   e=payments.upgrade(self.e);g=e['legacy_continuation']['game_state'];p=g['players']['B'];source=next(s for s,v in g['cards'].items() if v['card_id']=='P-anglerfish');world=next(s for s,v in g['cards'].items() if v['card_id']=='W-deepsea');p['board'].update(partner=source,world=world)
   g['challenge']=dict(challenge_id='battle',declaring_actor='B',parameter='wisdom',status='comparing',participants={o:g['players'][o]['board']['main'] for o in 'AB'})
   c=dict(game_state=g,response_context=dict(priority_actor='B',origin_event_seq=1),activation_zone=[])
   events=[dict(seq=1,actor='B',action_type='challenge_declared')]
   details,_=challenge.board_candidates(c,events,source)
   self.assertEqual(len(details),1);self.assertEqual(details[0]['target_instance_ids'],[p['board']['main']])
   g['challenge']['declaring_actor']='A';self.assertEqual(challenge.board_candidates(c,events,source)[0],[])

class ResponseProjectionTests(ChallengeTests):
 def test_internal_projection_keeps_actual_battle_modifier_observation(self):
  from unittest.mock import patch
  import proxy_continuation_actions as actions
  with payments.scope(),batch.scope():
   e=payments.upgrade(self.e);a=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='challenge');after,_=challenge.declare(e,a);g=after['legacy_continuation']['game_state'];source=next(s for s,v in g['cards'].items() if v['card_id']=='G-baseball-batting');payments.add_stat_modifier(after,'B',source,g['players']['B']['board']['main']);before=copy.deepcopy(after)
   def delegate(projected,initial,events):
    state.validate(projected)
    self.assertEqual(batch.RESPONSE_FULL_RUNTIME['stat_effects'],before['runtime']['stat_effects'])
    return dict(legal_candidate_details=[],legal_candidate_ids=[])
   with patch.object(actions,'response_inventory',delegate),challenge.scope(None):
    response=actions.response_inventory(after,None,[dict(seq=after['event_seq'],actor='B',action_type='challenge_declared')])
   self.assertEqual(response['envelope_sha256'],state.state_hash(after));self.assertEqual(after,before)
