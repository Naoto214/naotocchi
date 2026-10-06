"""Resolve-time choice presence is not inferred from an empty record list."""
import copy,unittest
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
try:import proxy_population_resolution_choices as api
except ImportError:api=None

def fixture(card):
 import proxy_continuation_state as state
 import proxy_continuation_payments as payments
 import proxy_continuation_batch as batch
 from proxy_population_start_window import _context
 g,actor,source=game_with(card);p=g['players'][actor];p['hand'].remove(source)
 link=dict(link_id='response-link-3-'+source,action_type={'G':'use_play','I':'use_item','E':'use_event'}.get(card[0],'activate_board_ability'),source_zone='hand',actor=actor,source_instance_id=source,card_copy_id=g['cards'][source]['card_copy_id'],card_id=card,target_instance_ids=[],candidate_variant=None,payment=dict(time=0),source_references=[batch.classification(card)['reference']])
 ctx=_context(actor,actor);ctx.update(chain_status='resolving',chain_links=[link['link_id']],consecutive_passes=2,origin_event_seq=3)
 e=payments.upgrade(state.create(dict(game_state=g,response_context=ctx,activation_zone=[link],pending_triggers=[],return_target='normal_action_opportunity'),3))
 return e,actor,source

class ResolutionChoiceTests(unittest.TestCase):
 def test_descriptor_no_choice_routes_reject_extra_records(self):
  self.assertIsNotNone(api)
  def run(forced):
   for card in ('G-area-claim','E-boss','E-fateful-transform','G-basketball-3d','G-archery-3d','E-big-illness','I-c_coin2','G-hit-blow','E-first-date'):
    e,_,_=fixture(card);proof=api.audit(e,initial(),[])
    self.assertTrue(proof['resolution_choice_obligation_verified'],(card,proof['errors']))
    self.assertEqual(proof['route'],'source_proven_no_resolution_choice')
    self.assertFalse(proof['all_rule_opportunities_proven']);self.assertFalse(proof['effect_semantics_proven'])
    self.assertFalse(api.audit(e,initial(),[dict(decision_kind='mandatory_choice')])['resolution_choice_obligation_verified'])
   return {}
  runtime.operation(initial(),run)
 def test_unknown_resolver_is_not_certified_by_empty_decisions(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,_,_=fixture('C-box');proof=api.audit(e,initial(),[])
   self.assertEqual(proof['route'],'unproved');self.assertFalse(proof['resolution_choice_obligation_verified'])
   self.assertIsNone(proof['required_choice_count'])
   bad=copy.deepcopy(e);bad['legacy_continuation']['activation_zone'][-1]['card_id']='E-boss'
   self.assertTrue(api.audit(bad,initial(),[])['errors'])
   return {}
  runtime.operation(initial(),run)
 def test_designated_family_requires_separate_journal_proof(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,_,_=fixture('E-final-time');p=api.audit(e,initial(),[])
   self.assertEqual(p['route'],'designated_465_journal_required');self.assertFalse(p['resolution_choice_obligation_verified'])
   self.assertEqual(p['choice_contract_id'],'final_time_hand_bottom');self.assertIsNone(p['required_choice_count'])
   return {}
  runtime.operation(initial(),run)
 def test_missing_legacy_descriptor_does_not_turn_parameter_choice_into_no_choice(self):
  def run(forced):
   e,actor,source=fixture('M-antlion-03');c=e['legacy_continuation'];c['activation_zone'][-1]['source_zone']='board';c['game_state']['players'][actor]['board']['main']=source
   p=api.audit(e,initial(),[])
   self.assertEqual(p['route'],'unproved');self.assertFalse(p['resolution_choice_obligation_verified'])
   return {}
  runtime.operation(initial(),run)
 def test_existing_board_handlers_classify_no_additional_resolution_choice(self):
  def run(forced):
   for card in ('M-antlion-04','M-antlion-05','M-antlion-06','M-antlion-07','P-anglerfish','P-desert_scorpion','P-cliff_goat','W-countryside','C-bat','C-chicken','C-cat_friend'):
    e,actor,source=fixture(card);c=e['legacy_continuation'];link=c['activation_zone'][-1];link.update(source_zone='board',action_type='activate_board_ability')
    b=c['game_state']['players'][actor]['board']
    if card[0]=='C':b['companions'].append(source)
    else:
     b[{'M':'main','P':'partner','W':'world'}[card[0]]]=source
     if card[0]=='P':b['partner_stage']=0
    proof=api.audit(e,initial(),[])
    self.assertTrue(proof['resolution_choice_obligation_verified'],(card,proof))
   return {}
  runtime.operation(initial(),run)
 def test_opt_in_paid_draw_reuses_registered_draw_only_route(self):
  import proxy_population_paid_draw as paid
  def run(forced):
   with paid.scope():
    for card in paid.DESCRIPTORS:
     e,actor,source=fixture(card);c=e['legacy_continuation'];c['activation_zone'][-1].update(source_zone='board',action_type='activate_board_ability');c['game_state']['players'][actor]['board']['main']=source
     p=api.audit(e,initial(),[])
     self.assertTrue(p['resolution_choice_obligation_verified'],p['errors'])
     self.assertEqual(p['handler'],'proxy_continuation_triggers.resolve:draw_only')
   return {}
  runtime.operation(initial(),run)
 def test_connected_step_rejects_an_extra_no_choice_record(self):
  from test_proxy_population_effect_application_runtime import fixture as actual_fixture
  import proxy_population_challenge_window as connected
  import proxy_continuation_payments as payments
  def run(forced):
   e,_,_=actual_fixture(growth=20)
   with connected.contract_scope():
    def native(e,i,*unused):return payments.resolve(e,i)
    result=runtime._step(e,initial(),[],[],[],native)
    self.assertTrue(result['resolution_choice_obligation']['resolution_choice_obligation_verified'])
    def extra(e,i,*unused):
     result=payments.resolve(e,i);result['new_decisions']=[dict(decision_kind='mandatory_choice')];return result
    with self.assertRaisesRegex(ValueError,'resolution choice'):runtime._step(e,initial(),[],[],[],extra)
   return {}
  runtime.operation(initial(),run)
 def test_legacy_search_failure_is_explicit_no_choice_not_designated_policy(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,actor,_=fixture('G-asteroids-classic');c=e['legacy_continuation'];c['activation_zone'][-1]['target_instance_ids']=[c['game_state']['players'][actor]['hand'][0]]
   p=api.audit(e,initial(),[])
   self.assertEqual(p['route'],'existing_116_resolution_choice');self.assertTrue(p['resolution_choice_obligation_verified'])
   self.assertEqual(p['required_choice_count'],0);self.assertEqual(p['legacy']['no_choice_reason'],'target_no_longer_legal')
   return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
