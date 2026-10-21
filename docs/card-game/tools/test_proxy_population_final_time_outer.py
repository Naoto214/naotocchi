"""Conditional supplied outer abilities; no activation/history authentication."""
import copy,unittest
from unittest.mock import patch
import test_proxy_population_designated_effects as fixture
import test_proxy_population_final_time_boundary as boundary_tests
import proxy_population_incarnation_runtime as incarnation
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old
import proxy_population_designated_effects as semantics
import proxy_continuation_quick as quick


def outer_fixture(card):
 original=fixture.cat
 def cat(egg=False):
  b=original(egg);c=b['legacy_continuation'];g=c['game_state'];p=g['players']['A']
  source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card)
  (p['hand'] if source in p['hand'] else p['deck']).remove(source)
  if card.startswith('W-'):
   if p['board']['world']:p['discard'].append(p['board']['world'])
   p['board']['world']=source
  elif card.startswith('M-'):
   p['discard'].append(p['board']['main']);p['board']['main']=source
  else:p['board']['companions'].append(source)
  link=copy.deepcopy(c['activation_zone'][-1]);link.update(link_id='conditional-outer',source_instance_id=source,card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],target_instance_ids=[])
  c['activation_zone'].insert(0,link);c['response_context']['chain_links'].insert(0,link['link_id'])
  return b
 return patch.object(fixture,'cat',cat)

class FinalTimeOuterTests(unittest.TestCase):
 run_case=boundary_tests.FinalTimeBoundaryTests.run_case
 def test_actual_final_time_retains_other_board_sources_and_metadata(self):
  def run(forced):
   for card in ('W-city','M-antlion-04','C-bat'):
    for mode in ('normal','retained','retained_source','retained_target','invalid','outer'):
     with self.subTest(card=card,mode=mode),outer_fixture(card):
      b,a,event,decisions,registry=fixture.actual(forced,'E-final-time',mode)
      self.assertEqual(semantics.audit(b,a,event,decisions,registry)['errors'],[])
      self.assertEqual(a['legacy_continuation']['activation_zone'],b['legacy_continuation']['activation_zone'][:-1])
      self.assertEqual(a['legacy_continuation']['response_context']['chain_status'],'resolving')
   return {}
  self.run_case(run)

 def test_rehashed_outer_mutations_and_physical_corruption_are_refused(self):
  def run(forced):
   with outer_fixture('W-city'):b,a,event,decisions,registry=fixture.actual(forced,'E-final-time','outer')
   connection=incarnation.Connection.__new__(incarnation.Connection);connection.records={registry['current_envelope_sha256']:registry}
   before=state.current(b);row=old._row(before,'conditional-final-time-outer')
   with connection.scope():
    quick.final_time.verify_transition(row,state.current(a),event)
    for mode in ('identity','copy','actor','kind','order','omitted','all_omitted','context','metadata','duplicate','hash'):
     after=state.current(a);ev=copy.deepcopy(event);link=after['activation_zone'][0]
     if mode=='identity':link['card_id']='C-box'
     elif mode=='copy':link['card_copy_id']='forged'
     elif mode=='actor':link['actor']='B'
     elif mode=='kind':link['action_type']='use_event'
     elif mode=='order':after['activation_zone'].reverse()
     elif mode=='omitted':after['activation_zone'].pop(0)
     elif mode=='all_omitted':after['activation_zone']=[];after['response_context'].update(chain_links=[],chain_status='empty')
     elif mode=='context':after['response_context']['chain_status']='building'
     elif mode=='metadata':next(iter(after['game_state']['cards'].values()))['card_id']='C-box'
     elif mode=='duplicate':p=after['game_state']['players']['A'];p['hand'].append(p['deck'][0])
     after['continuation_state_sha256']=old.start._hash(after)
     ev.update(game_state_after_sha256=old.start.opening._stop_state_sha256(after['game_state']),continuation_state_after_sha256=after['continuation_state_sha256'])
     if mode=='hash':ev['game_state_after_sha256']='0'*64
     with self.subTest(mode=mode),self.assertRaises(ValueError):quick.final_time.verify_transition(row,after,ev)
   return {}
  self.run_case(run)
 def test_historical_outside_scope_rejection_and_exception_restore_remain(self):
  def run(forced):
   native=quick.final_time.verify_transition
   with outer_fixture('W-city'):b,a,event,decisions,registry=fixture.actual(forced,'E-final-time')
   row=old._row(state.current(b),'conditional-final-time-outer')
   with self.assertRaisesRegex(ValueError,'406 active board source identity'):native(row,state.current(a),event)
   connection=incarnation.Connection.__new__(incarnation.Connection);connection.records={registry['current_envelope_sha256']:registry}
   with self.assertRaisesRegex(RuntimeError,'fixture exception'):
    with connection.scope():raise RuntimeError('fixture exception')
   self.assertIs(quick.final_time.verify_transition,native)
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
