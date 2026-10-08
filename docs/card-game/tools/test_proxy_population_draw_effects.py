"""Conditional actual draw handlers; never sampled production input."""
import copy, unittest
from contextlib import ExitStack
from test_proxy_population_runtime import initial
from test_proxy_population_paid_draw import fixture as paid_fixture
from test_proxy_population_arrival_predicates import fixture as arrival_fixture
from test_proxy_population_trigger_effects import case, resolving
from test_proxy_population_trigger_connection import both
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_paid_draw as paid
import proxy_population_trigger_connection as start
import proxy_population_trigger_sequential as sequential
import proxy_population_boundary_response as boundary
import proxy_continuation_triggers as triggers
import proxy_continuation_state as state
import proxy_continuation_actions as actions
try:import proxy_population_draw_effects as api
except ImportError:api=None

CARDS=('M-antlion-02','M-antlion-05','M-antlion-08','P-desert_scorpion','I-bowtie')

def actual(card, empty=False, outer=False, departed=False, restart=None, battle_status=None):
 with ExitStack() as stack:
  import proxy_population_activation_reference as references
  stack.enter_context(references.scope())
  if card in paid.DESCRIPTORS:
   stack.enter_context(paid.scope());e,source,_=paid_fixture(card)
   row=triggers.board_candidates(state.current(e),[],source,runtime=e['runtime'])[0][0]
   e,_=triggers.activate(e,dict(selected_action=row),[])
  elif card=='I-bowtie':
   e,journal,proof=both();stack.enter_context(start.scope(proof));adapter=sequential.StartAdapter()
   option=next(o for o in sequential.inventory(e,journal,adapter)['legal_candidate_details'] if o['action']=='activate' and o['activation']['card_id']==card)
   e,_=adapter.activate(e,option['activation'],journal['occurrences'][option['occurrence_id']]['occurrence'])
   source=option['activation']['source_instance_id']
  else:
   if card=='M-antlion-05':e,history,row,_=arrival_fixture(card,'time_skip')
   else:
    e,row=case(card);history=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=3,actor='A',action_type='open_turn_end_triggers',eligible_source_instance_ids=[row['source_instance_id']])]
    e['legacy_continuation']['response_context']['source_phase']='turn_end'
   source=row['source_instance_id'];slot='main' if card.startswith('M-') else 'partner'
   action=triggers.board_candidates(state.current(e),history,source,slot,e['runtime'])[0][0]
   e,_=triggers.activate(e,dict(selected_action=action),history)
  b=resolving(e);c=b['legacy_continuation'];p=c['game_state']['players'][c['activation_zone'][-1]['actor']]
  if empty:p['discard'].extend(p['deck']);p['deck']=[]
  if departed:
   if card=='I-bowtie':p['board']['prepared'].remove(source);b['runtime']['attachments'].pop(source);b['runtime']['public_prepared'].pop(source)
   else:p['board']['main' if card.startswith('M-') else 'partner']=None
   p['discard'].append(source)
  if outer:
   # Retain a distinct board link below the actual draw link.
   other=copy.deepcopy(c['activation_zone'][-1]);other['link_id']='outer-supplied-link';other.pop('activation_receipt',None)
   c['activation_zone'].insert(0,other);c['response_context']['chain_links'].insert(0,other['link_id'])
  if battle_status:
   from test_proxy_population_return_challenge import in_battle
   b=in_battle(b,battle_status)
  result=start.resolve(b,initial()) if card=='I-bowtie' else actions.normalize_resolution_result(b,triggers.resolve(state.current(b),initial()))
  if restart:result=boundary.normalize(b,result,dict(kind=restart,turn_player=c['game_state']['turn_player'],origin_event_seq=2))
  event=result['new_events'][0];a=state.advance(b,result['new_snapshots'][0]['continuation_state'],event['seq'])
  return b,a,event

class DrawEffectsTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'draw semantic audit absent')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_real_five_handlers_empty_deck_outer_stack_departure_and_restart(self):
  def run():
   for card in CARDS:
    for mode in ('normal','empty','outer','departed','start','end'):
     b,a,event=actual(card,empty=mode=='empty',outer=mode=='outer',departed=mode=='departed',restart=mode if mode in ('start','end') else None)
     proof=api.audit(b,a,event)
     with self.subTest(card=card,mode=mode):
      self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_draw_resolution_verified'])
      self.assertFalse(proof['activation_proven']);self.assertFalse(proof['all_rule_opportunities_proven']);self.assertIsNone(proof['balance_admitted'])
   return {}
  self.run_case(run)
 def test_self_consistent_wrong_card_count_refund_reservation_and_outer_changes_rejected(self):
  def run():
   for card in CARDS:
    b,a,event=actual(card,outer=True);actor=event['actor']
    for mode in ('wrong_top','extra_draw','refund','reservation','outer','usage','metadata','receipt'):
     bad=copy.deepcopy(a);ev=copy.deepcopy(event);p=bad['legacy_continuation']['game_state']['players'][actor]
     if mode=='wrong_top':
      old=p['hand'].pop();replacement=p['deck'].pop(0);p['hand'].append(replacement);p['deck'].insert(0,old);ev['result']['drawn_instance_ids']=[replacement]
     elif mode=='extra_draw':
      extra=p['deck'].pop(0);p['hand'].append(extra);ev['result']['drawn_instance_ids'].append(extra)
     elif mode=='refund':p['time']+=1
     elif mode=='reservation':p['reservations'].append('forged')
     elif mode=='outer':bad['legacy_continuation']['activation_zone']=[];bad['legacy_continuation']['response_context']['chain_links']=[]
     elif mode=='usage':bad['runtime']['ability_uses'].append(dict(forged=True))
     elif mode=='metadata':bad['legacy_continuation']['game_state']['cards'][event['source_instance_id']]['card_id']='C-box'
     else:ev['result']['growth_added']=5
     with self.subTest(card=card,mode=mode):self.assertTrue(api.audit(b,bad,ev)['errors'])
   return {}
  self.run_case(run)
 def test_receipt_identity_bad_boundary_and_unrelated_event(self):
  def run():
   b,a,event=actual('M-antlion-02',restart='end')
   for key,value in [('action_type','resolve_item'),('actor','B'),('source_instance_id','foreign'),('seq',True),('chain_link_id','foreign'),('source_reference','wrong')]:
    self.assertTrue(api.audit(b,a,dict(event,**{key:value}))['errors'],key)
   for value in (None,[],True,dict(kind='end',turn_player='A',origin_event_seq=True)):
    self.assertTrue(api.audit(b,a,dict(event,processing_boundary=value))['errors'])
   proof=api.audit(a,a,dict(action_type='response_pass'));self.assertEqual(proof['errors'],[]);self.assertFalse(proof['supplied_draw_resolution_verified'])
   return {}
  self.run_case(run)
 def test_challenge_restart_and_known_partner_egg_gate(self):
  def run():
   for card in ('M-antlion-02','M-antlion-08'):
    for status in ('comparing','resolved'):
     for outer in (False,True):
      b,a,ev=actual(card,outer=outer,battle_status=status)
      self.assertEqual(api.audit(b,a,ev)['errors'],[])
      bad=copy.deepcopy(a);bad['legacy_continuation']['return_target']='normal_action_opportunity'
      self.assertTrue(api.audit(b,bad,ev)['errors'])
   b,a,ev=actual('P-desert_scorpion')
   p=b['legacy_continuation']['game_state']['players'][ev['actor']];p['discard'].append(p['board']['main']);p['board']['main']=None
   self.assertIn('partner egg suppression semantics not connected',api.audit(b,a,ev)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_rebound_false_draw(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run():
   b,a,event=actual('M-antlion-02');p=a['legacy_continuation']['game_state']['players'][event['actor']];extra=p['deck'].pop(0);p['hand'].append(extra);event['result']['drawn_instance_ids'].append(extra)
   fields={k:event[k] for k in ('source_instance_id','source_zone','chain_link_id','source_reference','result')}
   ev=payments.transition_event(b,a,'resolve_board_ability',event['actor'],**fields)
   result=dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)])
   try:coverage.audit(result,[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted false draw'
   self.assertIn('draw effect semantics differ',message);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
