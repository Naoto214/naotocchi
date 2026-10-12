"""Own-start timing negatives must not be inferred from a suppression scope."""
import copy,unittest
from test_proxy_population_trigger_connection import both
from test_proxy_population_response_pass_effect import origin
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_window as window
import proxy_population_board_predicates as api
import proxy_continuation_quick as quick

class ResponseStartNegativeTests(unittest.TestCase):
 def test_placement_and_opponent_start_are_negative_but_own_start_stays_unproved(self):
  def run(forced):
   for mode in ('placement','end_open','end_request','challenge_declared','challenge_compared','relationship_progress','relationship_marriage','resolve_payment_modifier','resolve_board_stat','resolve_board_ability','resolve_event','resolve_targeted_zone_move','resolve_immediate_effect','resolve_item','resolve_play','opponent_start','own_start','own_start_three','unknown_own_origin','later_pass'):
    e,j,proof=both();c=e['legacy_continuation'];e['event_seq']=5;c['response_context']['origin_event_seq']=5;g=c['game_state'];sources=[next(s for s in g['players']['A']['board'][slot] if g['cards'][s]['card_id']==card) for card,slot in (('C-chicken','companions'),('I-bowtie','prepared'))]
    if mode in ('placement','relationship_progress','relationship_marriage'):c['response_context'].update(window_kind='after_normal_action',source_phase='post_placement_response');g['phase']='post_placement_response'
    if mode in ('end_open','end_request'):c['response_context'].update(window_kind='after_normal_action',source_phase='turn_end');g['phase']='turn_end_response'
    if mode.startswith('resolve_'):c['response_context'].update(window_kind='after_normal_action',source_phase='response_window');g['phase']='response_window'
    if mode in ('challenge_declared','challenge_compared'):c['response_context'].update(window_kind='after_normal_action',source_phase='challenge_declaration' if mode=='challenge_declared' else 'challenge_result');g['phase']='response_window'
    if mode=='opponent_start':g['turn_player']='B';c['response_context']['turn_player']='B'
    if mode=='own_start_three':g['players']['A']['hand'].append(g['players']['A']['deck'].pop(0))
    h=[origin(e,'person_placement' if mode=='placement' else 'open_turn_end_triggers' if mode=='end_open' else 'normal_pass_end_request' if mode=='end_request' else mode if mode in ('challenge_declared','challenge_compared','relationship_progress','relationship_marriage','resolve_payment_modifier','resolve_board_stat','resolve_board_ability','resolve_event','resolve_targeted_zone_move','resolve_immediate_effect','resolve_item','resolve_play') else 'unregistered_own_origin' if mode=='unknown_own_origin' else 'turn_start_and_normal_draw',g['turn_player'])]
    if mode=='later_pass':
     e['event_seq']+=1;h.append(origin(e,'response_pass','B'))
    with window.closed_start():
     inv=quick.actions.response_inventory(e,initial(),h);out=api.audit_response(e,h,inv)
    self.assertEqual(out['errors'],[],mode)
    if mode in ('placement','end_open','end_request','challenge_declared','challenge_compared','relationship_progress','relationship_marriage','resolve_payment_modifier','resolve_board_stat','resolve_board_ability','resolve_event','resolve_targeted_zone_move','resolve_immediate_effect','resolve_item','resolve_play','opponent_start'):
     for source in sources:
      self.assertIn(source,out['verified_source_ids'],(mode,g['cards'][source]['card_id']));self.assertFalse(out['start_negative_audits'][source]['timing_matches'])
      bad=copy.deepcopy(inv);bad['legal_candidate_details'].append(dict(action_type='activate_board_ability',source_instance_id=source));self.assertTrue(api.audit_response(e,h,bad)['errors'])
      for history in (h[:-1],h+h):self.assertNotIn(source,api.audit_response(e,history,inv)['verified_source_ids'])
    else:
     for source in sources:self.assertNotIn(source,out['verified_source_ids'],mode)
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_supplied_nonstart_driver_exports_both_start_sources_as_negative(self):
  import proxy_population_trigger_existing as existing
  import proxy_continuation_state as state
  e,j,_=both();c=e['legacy_continuation'];g=c['game_state'];e['event_seq']=5
  c['response_context'].update(origin_event_seq=5,window_kind='after_normal_action',source_phase='post_placement_response');g['phase']='post_placement_response'
  for p in g['players'].values():p['time']=0
  h=[origin(e,'person_placement',g['turn_player'])]
  def prepare(forced):
   upgraded=runtime.engine.payments.upgrade(e)
   return dict(envelope=upgraded,proof=existing.ExistingAdapter(h).proof(upgraded),shot=quick.old._snapshot(state.current(upgraded)))
  with connected.contract_scope():
   prepared=runtime.operation(initial(),prepare);upgraded=prepared['envelope'];proof=prepared['proof']
   result=window.segment(upgraded,initial(),h,[prepared['shot']],[upgraded],1,proof)
  self.assertIsNone(result['stop'],result['stop']);self.assertEqual(len(result['steps']),1)
  step=result['steps'][0];proof=step['response_board_predicates']
  self.assertEqual({g['cards'][source]['card_id'] for source in proof['start_negative_audits']},{'C-chicken','I-bowtie'})
  self.assertTrue(step['response_source_predicate_coverage']['supplied_response_source_predicates_covered']);self.assertFalse(proof['all_rule_opportunities_proven'])

 def test_actual_r10_resolution_restarts_keep_own_start_sources_negative(self):
  import json,lzma
  from proxy_mandatory_policy_contract import ROOT
  import proxy_population_paid_draw as paid
  for sha,kind in (('81e46ee','resolve_payment_modifier'),('7872fea','resolve_immediate_effect')):
   record=json.loads(lzma.decompress((ROOT/('data/proxy-population-effective-application/verification/current-connected-'+sha+'-record.json.xz')).read_bytes()))
   rt=record['runtime'];envelope=rt['final_envelope'];events=rt['events']
   self.assertEqual(events[-1]['action_type'],kind)
   self.assertEqual(envelope['legacy_continuation']['game_state']['round'],10)
   def run(forced):
    with paid.scope(),window.closed_start():inventory=quick.actions.response_inventory(envelope,initial(),events)
    proof=api.audit_response(envelope,events,inventory)
    self.assertEqual(proof['errors'],[]);self.assertIn('B-032#1',proof['verified_source_ids'])
    self.assertFalse(proof['start_negative_audits']['B-032#1']['timing_matches'])
    for mode in ('unknown_resolution','wrong_window'):
     e=copy.deepcopy(envelope);history=copy.deepcopy(events);inv=copy.deepcopy(inventory)
     if mode=='unknown_resolution':history[-1]['action_type']='resolve_unregistered'
     else:
      e['legacy_continuation']['response_context']['window_kind']='turn_start'
      inv['response_context']=copy.deepcopy(e['legacy_continuation']['response_context'])
     self.assertNotIn('B-032#1',api.audit_response(e,history,inv)['verified_source_ids'])
    return {}
   with self.subTest(record=sha),connected.contract_scope():runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
