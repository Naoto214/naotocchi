"""Core verdicts must not be inferred from a self-consistent legal projection."""
import copy,unittest
import proxy_population_runtime as runtime
import proxy_continuation_candidates as candidates
from test_proxy_population_runtime import initial
from test_proxy_population_paid_draw import fixture
from test_proxy_population_candidate_expansions import repair
try:import proxy_population_core_predicates as api
except ImportError:api=None

class CorePredicateTests(unittest.TestCase):
 def test_all_core_variants_and_false_exclusions(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,_,_=fixture('M-antlion-01');g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']]
   p['hand']+=p['deck']+p['discard'];p['deck']=[];p['discard']=[];p['time']=10
   inv=candidates.audit(e,[]);proof=api.audit_normal(e,inv)
   self.assertTrue(proof['core_predicates_verified'],proof['errors'])
   self.assertEqual({r['action_type'] for r in proof['verified_units']},{'pass','challenge','relationship','play_main','place_companion','place_partner','place_world','attach_item','set_item'})
   self.assertTrue(proof['unproved_units']);self.assertFalse(proof['complete_legal_set_proven']);self.assertFalse(proof['information_use_proven'])
   # Rebuild the projection: generic source and expansion checks alone do not
   # establish the correctness of the altered verdict/reason.
   for row in proof['verified_units']:
    bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['enumeration_unit_id']==row['enumeration_unit_id'])
    if u['disposition']=='admitted':u.update(disposition='excluded',candidate_id=None,reason_codes=['insufficient_time'])
    else:u.update(disposition='admitted',candidate_id='forged-core-candidate',reason_codes=[])
    repair(bad);self.assertFalse(api.audit_normal(e,bad)['core_predicates_verified'],row)
   for time in (0,1):
    p.update(time=time,person_placed=True,challenge_used=True,relationship_progressed=True)
    proof=api.audit_normal(e,candidates.audit(e,[]));self.assertTrue(proof['core_predicates_verified'],proof['errors'])
   return {}
  runtime.operation(initial(),run)
 def test_cost_and_target_evidence_corruption(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,_,_=fixture('M-antlion-01');g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']]
   p['hand']+=p['deck']+p['discard'];p['deck']=[];p['discard']=[];p['time']=10
   inv=candidates.audit(e,[])
   for kind in ('play_main','attach_item','set_item'):
    bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['action_type']==kind and r['disposition']=='admitted');u['evidence']['payment_time']=True;repair(bad)
    self.assertFalse(api.audit_normal(e,bad)['core_predicates_verified'])
   bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['action_type']=='attach_item' and r['disposition']=='admitted');u['target_instance_ids']=['not-a-current-target'];repair(bad)
   self.assertFalse(api.audit_normal(e,bad)['core_predicates_verified'])
   bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['action_type']=='play_main' and r['disposition']=='admitted');u['evidence']['payment_effect_ids']=['invented-effect'];repair(bad)
   self.assertFalse(api.audit_normal(e,bad)['core_predicates_verified'])
   from unittest.mock import patch
   with patch.dict(api.SOURCES,{'01-core-rules.md':'0'*64}):self.assertFalse(api.audit_normal(e,inv)['core_predicates_verified'])
   return {}
  runtime.operation(initial(),run)

class CapacityAndPaymentTests(unittest.TestCase):
 def test_full_slots_current_targets_and_transform_payment(self):
  import test_proxy_continuation_challenge as fixtures
  import proxy_continuation_payments as payments
  helper=fixtures.ChallengeTests();helper.setUp()
  def run(forced):
   e=payments.upgrade(helper.e);g=e['legacy_continuation']['game_state'];actor=g['turn_player'];p=g['players'][actor]
   p['hand']+=p['deck']+p['discard'];p['deck']=[];p['discard']=[];p['time']=10
   for slot,prefix in [('companions','C-')]*3+[('partner','P-'),('world','W-')]:
    source=next(s for s in p['hand'] if g['cards'][s]['card_id'].startswith(prefix));p['hand'].remove(source)
    if slot=='companions':p['board'][slot].append(source)
    else:p['board'][slot]=source
   p['board']['partner_stage']='married'
   for _ in range(3):
    source=next(s for s in p['hand'] if g['cards'][s]['card_id'] in ('I-poop1','I-bowtie','I-sleepboost1'));p['hand'].remove(source);p['board']['prepared'].append(source)
    face=g['cards'][source]['card_id']!='I-poop1';e['runtime']['public_prepared'][source]=dict(controller=actor,face_up=face,paid_time=2 if face else 1,placed_event_seq=e['event_seq'])
    if face:e['runtime']['attachments'][source]=dict(controller=actor,target_instance_id=p['board']['main'],attached_event_seq=e['event_seq'])
   source=next(s for s in p['hand'] if g['cards'][s]['card_id']=='E-fateful-transform');payments.add_modifier(e,actor,source)
   inv=candidates.audit(e,[]);proof=api.audit_normal(e,inv);self.assertTrue(proof['core_predicates_verified'],proof['errors'])
   self.assertTrue(any(r['action_type']=='attach_item' and 'preparation_slots_full' in r['reason_codes'] for r in proof['verified_units']))
   transforms=[r for r in inv['enumeration_units'] if r['action_type']=='play_main' and r['candidate_variant']=='transform' and r['evidence'].get('payment_effect_ids')]
   self.assertTrue(transforms)
   for row in transforms:
    bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['enumeration_unit_id']==row['enumeration_unit_id']);u['evidence']['payment_effect_ids']=[];repair(bad)
    self.assertFalse(api.audit_normal(e,bad)['core_predicates_verified'])
   return {}
  runtime.operation(initial(),run)

class EntryPhaseTests(unittest.TestCase):
 def test_active_challenge_is_not_a_normal_entry(self):
  import test_proxy_continuation_challenge as fixtures
  helper=fixtures.ChallengeTests();helper.setUp()
  def run(forced):
   e=runtime.engine.payments.upgrade(helper.e);g=e['legacy_continuation']['game_state'];inv=candidates.audit(e,[])
   g['challenge']=dict(challenge_id='conditional-entry-test',declaring_actor=g['turn_player'],parameter='power',status='comparing',participants={o:g['players'][o]['board']['main'] for o in 'AB'})
   proof=api.audit_normal(e,inv);self.assertFalse(proof['core_predicates_verified']);self.assertIn('not a core normal entry',proof['errors'])
   return {}
  runtime.operation(initial(),run)

class CurrentPaymentTests(unittest.TestCase):
 def test_existing_same_partner_discount_is_not_replaced_by_printed_cost(self):
  from test_proxy_population_trigger_effects import case,resolving
  import proxy_population_trigger_effects as effects
  import proxy_population_trigger_latching as latching
  def run(forced):
   e,row=case('P-cliff_goat');e['legacy_continuation']['game_state']['players']['A']['board']['partner_stage']=0
   with effects.scope():
    action=latching.current_actions(e,row)[0][0];after,_=effects.activate(e,action,row);e=effects.resolve(resolving(after),initial())['new_envelopes'][0]
    for time in (0,1):
     e['legacy_continuation']['game_state']['players']['A']['time']=time
     inv=candidates.audit(e,[]);proof=api.audit_normal(e,inv)
     self.assertTrue(proof['core_predicates_verified'],proof['errors']);r=next(r for r in proof['verified_units'] if r['action_type']=='relationship');self.assertEqual(r['payment_time'],0)
     bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['action_type']=='relationship');u['evidence']['payment_effect_ids']=[];repair(bad)
     self.assertFalse(api.audit_normal(e,bad)['core_predicates_verified'])
   return {}
  runtime.operation(initial(),run)

class ConnectedCoreTests(unittest.TestCase):
 def test_actual_normal_entries_bind_predicates(self):
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as connected
  r=connected.reconstruct(bundle(),'test-1A',3)
  rows=[s['normal_core_predicates'] for s in r['runtime']['steps'] if s.get('decision',{} ) is not None and s['decision'].get('context',{}).get('decision_kind')=='normal_action']
  self.assertTrue(rows)
  for proof in rows:
   self.assertTrue(proof['core_predicates_verified'],proof['errors']);self.assertFalse(proof['complete_legal_set_proven']);self.assertIsNone(proof['balance_admitted'])

if __name__=='__main__':unittest.main()
