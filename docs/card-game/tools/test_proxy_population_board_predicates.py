"""Current board ability conditions and omitted alternatives stay separate."""
import copy,unittest
import proxy_population_runtime as runtime
import proxy_population_paid_draw as paid
import proxy_population_discard_recovery as recovery
import proxy_population_challenge_window as connected
import proxy_continuation_candidates as candidates
from test_proxy_population_runtime import initial
from test_proxy_population_paid_draw import fixture
from test_proxy_population_candidate_expansions import repair
try:import proxy_population_board_predicates as api
except ImportError:api=None

class BoardPredicateTests(unittest.TestCase):
 def test_paid_costs_usage_and_forged_passive_exclusion(self):
  self.assertIsNotNone(api)
  def run(forced):
   with paid.scope():
    for card in paid.DESCRIPTORS:
     e,source,costs=fixture(card);g=e['legacy_continuation']['game_state'];g['phase']='normal_action'
     for used in (False,True):
      e['runtime']['ability_uses']=[dict(source_instance_id=source,ability_key='activated_normal_action',turn_player=g['turn_player'],round=g['round'],count=1)] if used else []
      inv=candidates.audit(e,[]);proof=api.audit_normal(e,inv)
      self.assertTrue(proof['board_predicates_verified'],proof['errors'])
      own=[r for r in proof['verified_units'] if r['source_instance_id']==source]
      self.assertTrue(own);self.assertEqual(any(r['activation_allowed'] for r in own),not used)
      bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['source_instance_id']==source)
      if used:u.update(disposition='admitted',candidate_id='forged',reason_codes=[])
      else:u.update(disposition='excluded',candidate_id=None,reason_codes=['passive_not_separate_action'])
      repair(bad);self.assertFalse(api.audit_normal(e,bad)['board_predicates_verified'])
     e['runtime']['ability_uses']=[];inv=candidates.audit(e,[])
     bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['source_instance_id']==source);u['cost_instance_ids']=['wrong-cost'];repair(bad)
     self.assertFalse(api.audit_normal(e,bad)['board_predicates_verified'])
     bad=copy.deepcopy(inv);bad['enumeration_units'].remove(next(r for r in bad['enumeration_units'] if r['source_instance_id']==source));repair(bad)
     self.assertFalse(api.audit_normal(e,bad)['board_predicates_verified'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_recovery_other_name_target_and_current_incarnation_limit(self):
  self.assertIsNotNone(api)
  from test_proxy_population_discard_recovery import fixture as recovery_fixture
  def run(forced):
   e,events,source,target=recovery_fixture();e=runtime.engine.payments.upgrade(e);g=e['legacy_continuation']['game_state'];g['phase']='normal_action'
   with recovery.scope():
    for used in (False,True):
     e['runtime']['ability_uses']=[dict(source_instance_id=source,ability_key='activated_normal_action',turn_player=g['turn_player'],round=g['round'],count=1)] if used else []
     inv=candidates.audit(e,events);proof=api.audit_normal(e,inv)
     self.assertTrue(proof['board_predicates_verified'],proof['errors'])
     own=[r for r in proof['verified_units'] if r['source_instance_id']==source];self.assertTrue(own);self.assertEqual(any(r['activation_allowed'] for r in own),not used)
    e['runtime']['ability_uses']=[];g['cards'][target]['card_id']='C-cat_friend'
    inv=candidates.audit(e,events);proof=api.audit_normal(e,inv);self.assertTrue(proof['board_predicates_verified'],proof['errors']);self.assertFalse(any(r['activation_allowed'] for r in proof['verified_units']))
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_all_current_person_world_and_equipment_sources(self):
  from test_proxy_population_first_response import game_with
  from proxy_population_start_window import _context
  import proxy_continuation_state as state
  def run(forced):
   table=candidates.rules.table()
   for card in table['cards']:
    kind=card['card_type']
    if kind not in ('main','companion','partner','world') and card['card_id'] not in ('I-poop1','I-bowtie','I-sleepboost1'):continue
    g,actor,source=game_with(card['card_id']);g['phase']='normal_action';p=g['players'][actor];p['hand'].remove(source)
    slot={'main':'main','companion':'companions','partner':'partner','world':'world'}.get(kind,'prepared')
    if slot in ('companions','prepared'):p['board'][slot].append(source)
    else:p['board'][slot]=source
    if slot=='partner':p['board']['partner_stage']=0
    if slot=='prepared' and card['card_id']!='I-poop1':
     main=next(x for x in p['hand']+p['deck'] if g['cards'][x]['card_id'].startswith('M-'))
     (p['hand'] if main in p['hand'] else p['deck']).remove(main);p['board']['main']=main
    c=dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity')
    e=dict(schema=state.SCHEMA,execution_contract_id=state.CONTRACT,event_seq=3,legacy_continuation=c,runtime={k:({} if k in ('attachments','public_prepared') else []) for k in state.RUNTIME_KEYS})
    if slot=='prepared':
     face=card['card_id']!='I-poop1';e['runtime']['public_prepared'][source]=dict(controller=actor,face_up=face,paid_time=2 if face else 1,placed_event_seq=2)
     if face:e['runtime']['attachments'][source]=dict(controller=actor,target_instance_id=main,attached_event_seq=2)
    e=runtime.engine.payments.upgrade(e)
    with paid.scope(),recovery.scope():
     inv=candidates.audit(e,[]);proof=api.audit_normal(e,inv)
     self.assertTrue(proof['board_predicates_verified'],(card['card_id'],proof['errors']))
     self.assertEqual(proof['unproved_units'],[],card['card_id'])
     bad=copy.deepcopy(inv);bad['enumeration_units']=[r for r in bad['enumeration_units'] if r['source_instance_id']!=source];repair(bad)
     self.assertFalse(api.audit_normal(e,bad)['board_predicates_verified'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_hand_board_ability_is_excluded_and_composition_detects_gaps(self):
  from test_proxy_population_first_response import game_with
  from proxy_population_start_window import _context
  import proxy_continuation_state as state
  import proxy_population_core_predicates as core
  import proxy_population_hand_predicates as hand
  def run(forced):
   g,actor,source=game_with('C-cat_friend');g['phase']='normal_action'
   e=runtime.engine.payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2))
   inv=candidates.audit(e,[]);proof=api.audit_normal(e,inv)
   own=[r for r in proof['verified_units'] if r['source_instance_id']==source];self.assertTrue(own)
   self.assertFalse(any(r['activation_allowed'] for r in own))
   proofs=[core.audit_normal(e,inv),hand.audit_normal(e,[],inv),proof]
   coverage=api.compose(inv,proofs);self.assertTrue(coverage['supplied_normal_unit_predicates_covered'],coverage)
   dropped=copy.deepcopy(proofs);dropped[-1]['verified_units']=[]
   self.assertFalse(api.compose(inv,dropped)['supplied_normal_unit_predicates_covered'])
   duplicated=proofs+[proof];self.assertTrue(api.compose(inv,duplicated)['errors'])
   foreign=copy.deepcopy(proofs);foreign[-1]['verified_units'].append(dict(enumeration_unit_id='foreign-unit'))
   self.assertTrue(api.compose(inv,foreign)['errors'])
   unknown=copy.deepcopy(proofs);unknown[-1]['schema']='unknown.v1'
   self.assertTrue(api.compose(inv,unknown)['errors'])
   reserved=copy.deepcopy(inv);reserved['enumeration_units'].append(dict(enumeration_unit_id='reservation-unit',source_family='reservation_action',source_id='reservation-test'))
   reservation_proof=api.audit_normal(e,reserved)
   self.assertTrue(reservation_proof['board_predicates_verified'],reservation_proof['errors'])
   self.assertTrue(reservation_proof['unproved_units'])
   coverage=api.compose(reserved,proofs[:-1]+[reservation_proof])
   self.assertFalse(coverage['supplied_normal_unit_predicates_covered'])
   self.assertIn('reservation-unit',coverage['unproved_enumeration_unit_ids'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_actual_entry_exports_distinct_board_predicate_evidence(self):
  self.assertIsNotNone(api)
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as entry
  r=entry.reconstruct(bundle(),'test-1A',3);steps=[s for s in r['runtime']['steps'] if s.get('normal_core_predicates')]
  self.assertTrue(steps)
  for step in steps:
   proof=step['normal_board_predicates'];self.assertTrue(proof['board_predicates_verified'],proof['errors']);self.assertFalse(proof['complete_legal_set_proven'])
   self.assertTrue(step['normal_unit_predicate_coverage']['supplied_normal_unit_predicates_covered'])

if __name__=='__main__':unittest.main()
