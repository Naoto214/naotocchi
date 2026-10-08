"""Conditional actual normal/egg start draws, no production sampling."""
import copy,unittest
from test_proxy_population_runtime import boundary,initial
from proxy_population_policy_bridge import Session
import proxy_population_turn_boundary as turn
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_continuation_state as state
import proxy_continuation_end as end
try:import proxy_population_start_draw_effect as api
except ImportError:api=None

def actual(actor,egg,count,round_number=1):
 e,_=boundary();e=runtime.engine.payments.upgrade(e);c=e['legacy_continuation'];g=c['game_state'];prior='B' if actor=='A' else 'A';g.update(turn_player=prior,phase='turn_end',round=round_number);c['return_target']='turn_end';c['response_context'].update(turn_player=prior,priority_actor=prior,consecutive_passes=2)
 p=g['players'][actor]
 if not egg:
  source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id'].startswith('M-'));(p['hand'] if source in p['hand'] else p['deck']).remove(source);p['board']['main']=source
 p.update(time=0,challenge_used=True,person_placed=True,relationship_progressed=True)
 p['discard']+=p['deck'][count:];p['deck']=p['deck'][:count]
 i=initial();i['first_player']=prior;s=Session(dict(protocol_id='unit',group_id='unit',mirror_side=prior+'_first'),{'A':'00'*32,'B':'00'*32});s.turn_start(prior,'conditional-prior')
 # Conditional end fixture: reuse production source classification scope.
 with end.end_scope(e,[],[],[e]):result=turn.next_turn(state.current(e),i,s)
 b=state.advance(e,result['new_snapshots'][0]['continuation_state'],result['new_snapshots'][0]['event_seq']);a=state.advance(b,result['new_snapshots'][1]['continuation_state'],result['new_snapshots'][1]['event_seq'])
 return b,a,result['new_events'][1]

class StartDrawEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'start draw full delta absent')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_both_actors_main_or_egg_and_empty_partial_decks(self):
  def run():
   for actor in ('A','B'):
    for egg in (False,True):
     for count in (0,1,2,4):
      b,a,e=actual(actor,egg,count);p=api.audit(b,a,e);self.assertEqual(p['errors'],[],(actor,egg,count));self.assertTrue(p['supplied_start_draw_verified']);self.assertFalse(p['start_obligation_closure_proven']);self.assertIsNone(p['balance_admitted'])
   return {}
  self.run_case(run)
 def test_time_replaces_remaining_time_at_later_rounds(self):
  def run():
   for actor in ('A','B'):
    for egg in (False,True):
     for number in (5,10):
      b,a,e=actual(actor,egg,2,number);self.assertEqual(api.audit(b,a,e)['errors'],[]);self.assertEqual(a['legacy_continuation']['game_state']['players'][actor]['time'],number)
   return {}
  self.run_case(run)
 def test_unrelated_changes_wrong_draw_reset_and_context_refused(self):
  def run():
   for egg in (False,True):
    b,a,e=actual('A',egg,4)
    for mode in ('extra','reorder','growth','time','actor','main','reset','opponent','context','usage','metadata','early','selection'):
     before=copy.deepcopy(b);after=copy.deepcopy(a);ev=copy.deepcopy(e);p=after['legacy_continuation']['game_state']['players']['A']
     if mode=='extra':p['hand'].append(p['deck'].pop(0))
     elif mode=='reorder':p['hand'][-1],p['hand'][-2]=p['hand'][-2],p['hand'][-1]
     elif mode=='growth':p['growth']+=5
     elif mode=='time':p['time']+=1
     elif mode=='actor':ev['actor']='B'
     elif mode=='main':ev['action_type']='turn_start_and_normal_draw' if egg else 'turn_start_and_egg_draw'
     elif mode=='reset':p['person_placed']=True
     elif mode=='opponent':after['legacy_continuation']['game_state']['players']['B']['time']+=1
     elif mode=='context':after['legacy_continuation']['response_context']['priority_actor']='A' if egg else 'B'
     elif mode=='usage':after['runtime']['ability_uses'].append({'invented':True})
     elif mode=='metadata':next(iter(after['legacy_continuation']['game_state']['cards'].values()))['card_id']='invented'
     elif mode=='early':before['legacy_continuation']['game_state']['phase']='turn_end'
     else:ev['selected_candidate']='invented-choice'
     with self.subTest(egg=egg,mode=mode):self.assertTrue(api.audit(before,after,ev)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_added_growth(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run():
   b,a,e=actual('A',False,4);a['legacy_continuation']['game_state']['players']['A']['growth']+=5;ev=payments.transition_event(b,a,e['action_type'],e['actor'],selected_candidate=None)
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)],trigger_records=[]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted extra growth'
   self.assertIn('start draw full delta',message);return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
