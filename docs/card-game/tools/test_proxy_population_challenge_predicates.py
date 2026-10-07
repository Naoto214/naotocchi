"""Supplied challenge-trigger conditions;474 zero application stays excluded."""
import copy,unittest
from test_proxy_population_arrival_predicates import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_existing as existing
import proxy_population_trigger_predicates as api
import proxy_population_effect_application_runtime as application
import proxy_population_effective_application as effects
import proxy_continuation_batch as batch


def challenge_fixture(card='M-antlion-07',applied=True):
 e,h,o,_=fixture('M-antlion-07' if card=='M-antlion-07' else 'M-beetle-01');c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A']
 def take(owner,name):
  player=g['players'][owner];s=next(s for s in player['hand']+player['deck'] if g['cards'][s]['card_id']==name)
  (player['hand'] if s in player['hand'] else player['deck']).remove(s);return s
 other=take('B','M-beetle-01');g['players']['B']['board']['main']=other
 world=take('A','W-deepsea');previous=take('A','W-city');p['board']['world']=world;p['discard'].append(previous)
 if card=='P-anglerfish':
  source=take('A',card);p['board'].update(partner=source,partner_stage=0);cap=batch.classification(card);o.update(source_instance_id=source,ability_key=cap['timing'],source_reference=cap['reference'])
 quick=take('A','G-area-claim');p['discard'].append(quick);part=effects.growth(90 if applied else 100,5)
 event=dict(seq=3,actor='A',action_type='resolve_immediate_effect',source_instance_id=quick,chain_link_id='conditional-growth',result=dict(growth_added=5))
 event['application_evidence']=dict(contract='effective_application_474.v1',source_sha256=application.RULING_SHA,source_instance_id=quick,chain_link_id=event['chain_link_id'],resolved=True,parts=[part],parts_complete=True,status=effects.classify([part],True))
 h=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=2,actor='A',action_type='place_world',source_instance_id=world,previous_world_instance_id=previous),event,dict(seq=4,actor='A',action_type='challenge_declared')]
 g['challenge']=dict(challenge_id='conditional',declaring_actor='A',parameter='power',status='comparing',participants={'A':p['board']['main'],'B':other},started_event_seq=4,result=None)
 e['event_seq']=4;c['response_context'].update(origin_event_seq=4,source_phase='challenge_declaration');o['origin_event_seq']=4
 return e,h,o

class ChallengePredicateTests(unittest.TestCase):
 def setUp(self):self.assertTrue(hasattr(api,'audit_challenge'),'challenge trigger audit absent')
 def test_current_source_target_parameter_and_all_alternatives(self):
  def run(forced):
   with connected.contract_scope():
    for card in ('M-antlion-07','P-anglerfish'):
     for parameter in ('power','wisdom'):
      e,h,o=challenge_fixture(card);e['legacy_continuation']['game_state']['challenge']['parameter']=parameter
      rows,p=existing.ExistingAdapter(h).enumerate(e,o);self.assertEqual(len(rows),1);self.assertTrue(p['current_predicate_audit']['current_trigger_predicates_verified'])
      self.assertEqual(rows[0]['candidate_variant'],parameter if card=='M-antlion-07' else None)
      for bad in ([],rows+rows,[dict(rows[0],target_instance_ids=['foreign'])],[dict(rows[0],candidate_variant='invalid')],[dict(rows[0],base_time_cost=1)]):self.assertTrue(api.audit_challenge(e,o,bad,h)['errors'])
   return {}
  runtime.operation(initial(),run)
 def test_474_zero_is_not_application_and_world_change_is_required(self):
  def run(forced):
   with connected.contract_scope():
    for mode in ('zero','first_world','same_world','old_application','other_declarer','used'):
     e,h,o=challenge_fixture(applied=mode!='zero');g=e['legacy_continuation']['game_state']
     if mode=='first_world':h[1]['previous_world_instance_id']=None
     elif mode=='same_world':h[1]['previous_world_instance_id']=h[1]['source_instance_id']
     elif mode=='old_application':h[2]['seq']=0;h.sort(key=lambda e:e['seq'])
     elif mode=='other_declarer':g['challenge']['declaring_actor']='B'
     elif mode=='used':
      h[-1]['seq']=5;e['event_seq']=5;o['origin_event_seq']=5;e['legacy_continuation']['response_context']['origin_event_seq']=5
      h.insert(-1,dict(seq=4,actor='A',action_type='activate_response',source_zone='board',source_instance_id=o['source_instance_id']))
     rows,p=existing.ExistingAdapter(h).enumerate(e,o);self.assertEqual(rows,[],mode);self.assertTrue(p['current_predicate_audit']['current_trigger_predicates_verified'])
   return {}
  runtime.operation(initial(),run)
 def test_partner_requires_current_deepsea_main_and_origin(self):
  def run(forced):
   with connected.contract_scope():
    for mode in ('world','main','origin'):
     e,h,o=challenge_fixture('P-anglerfish');g=e['legacy_continuation']['game_state'];p=g['players']['A']
     if mode=='world':p['discard'].append(p['board']['world']);p['board']['world']=None
     elif mode=='main':p['discard'].append(p['board']['main']);p['board']['main']=None
     else:h[-1]['action_type']='challenge_compared'
     rows,proof=existing.ExistingAdapter(h).enumerate(e,o);self.assertEqual(rows,[]);self.assertTrue(proof['current_predicate_audit']['current_trigger_predicates_verified'])
   return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
