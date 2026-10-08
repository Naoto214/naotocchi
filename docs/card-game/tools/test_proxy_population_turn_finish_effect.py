"""Conditional actual turn switch and existing405/metadata R10 finish."""
import copy,json,unittest
from functools import lru_cache
from pathlib import Path
from test_proxy_population_runtime import boundary,initial
from proxy_population_policy_bridge import Session
import proxy_population_turn_boundary as turn
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_continuation_state as state
import proxy_continuation_end as end
try:import proxy_population_turn_finish_effect as api
except ImportError:api=None

def switch(first,actor,number):
 b,_=boundary();b=runtime.engine.payments.upgrade(b);c=b['legacy_continuation'];g=c['game_state'];g.update(turn_player=actor,round=number,phase='turn_end');c['return_target']='turn_end';c['response_context'].update(turn_player=actor,priority_actor=actor,consecutive_passes=2)
 i=initial();i['first_player']=first;s=Session(dict(protocol_id='unit',group_id='unit',mirror_side=first+'_first'),{'A':'00'*32,'B':'00'*32});s.turn_start(actor,'conditional-prior')
 with end.end_scope(b,[],[],[b]):r=turn.next_turn(state.current(b),i,s)
 a=state.advance(b,r['new_snapshots'][0]['continuation_state'],r['new_snapshots'][0]['event_seq']);return b,a,r['new_events'][0],first

@lru_cache(maxsize=1)
def saved_r10():
 root=Path(__file__).resolve().parents[1];audits=json.loads((root/'data/proxy-new-seed-mixed-audit-405-20260930.json').read_text());runs=json.loads((root/'data/proxy-new-seed-mixed-replay-405-20260930.json').read_text());route=next(r for r in runs['results'] if r['path_id']=='probe-01-a-first');proof=next(x['audit'] for r in audits['results'] if r['path_id']==route['path_id'] for x in r['steps'] if x['audit']['next_opportunity']=='turn_end');shot=next(x for x in route['new_snapshots'] if x['event_seq']==proof['source_last_valid_event_seq']);return shot,proof

def terminal(first,tie=False):
 from unittest.mock import patch
 shot,proof=copy.deepcopy(saved_r10());t=end.old.terminal;c=t.contracts;actor='B' if first=='A' else 'A';row=dict(path_id='conditional-r10',last_valid_event_seq=shot['event_seq'],final_continuation_state=shot['continuation_state']);g=row['final_continuation_state']['game_state'];g.update(turn_player=actor,round=10);row['final_continuation_state']['response_context']['turn_player']=actor
 if tie:g['players']['A']['growth']=g['players']['B']['growth'];proof['growth_trace'][-1]['growth']={a:g['players'][a]['growth'] for a in 'AB'}
 row['final_game_state_sha256']=c.start.opening._stop_state_sha256(g);row['final_continuation_state_sha256']=c.start.canonical_sha256(row['final_continuation_state']);i=initial();i.update(path_id=row['path_id'],first_player=first)
 with turn.metadata_scope(i,None),patch.object(c.start,'load_source',side_effect=AssertionError('historical135 accessed')):
  bound=t.proof_for_row(row,dict(proof,**c.boundary(row)));r=t.replay_end(row,bound)
 b=runtime.engine.payments.upgrade(state.create(row['final_continuation_state'],row['last_valid_event_seq']));a=state.advance(b,r['final_continuation_state'],r['last_valid_event_seq']);return b,a,r['new_events'][0],first

class TurnFinishEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'turn finish full delta absent')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_actual_switch_round_and_final_comparison_both_seats(self):
  def run():
   for first in ('A','B'):
    for actor in ('A','B'):
     for number in (1,9,10):
      if number==10 and actor!=first:continue
      b,a,e,f=switch(first,actor,number);p=api.audit(b,a,e,f);self.assertEqual(p['errors'],[],(first,actor,number));self.assertTrue(p['supplied_turn_finish_verified']);self.assertFalse(p['end_obligation_closure_proven']);self.assertIsNone(p['balance_admitted'])
    for tie in (False,True):
     b,a,e,f=terminal(first,tie);self.assertEqual(api.audit(b,a,e,f)['errors'],[])
   return {}
  self.run_case(run)
 def test_supplied_r10_public_score_edges_include_100_tie(self):
  import proxy_continuation_payments as payments
  def run():
   original_before,original_after,raw,first=terminal('A')
   for av,bv,winner in ((100,100,'draw'),(100,95,'A'),(95,100,'B'),(0,0,'draw')):
    # Conditional score-edge deltas only, not an authenticated rewritten history.
    b=copy.deepcopy(original_before);a=copy.deepcopy(original_after)
    for e in (b,a):
     e['legacy_continuation']['game_state']['players']['A']['growth']=av;e['legacy_continuation']['game_state']['players']['B']['growth']=bv
    result=dict(raw['result'],winner=winner,final_growth=dict(A=av,B=bv));event=payments.transition_event(b,a,'r10_final_comparison','B',selected_candidate=None,result=result)
    self.assertEqual(api.audit(b,a,event,first)['errors'],[]);self.assertTrue(api.audit(b,a,event)['errors'])
    event['result']['rounds_completed']=11;self.assertTrue(api.audit(b,a,event,first)['errors'])
   return {}
  self.run_case(run)
 def test_early_resets_extra_draw_wrong_first_round_and_result_refused(self):
  def run():
   for b,a,e,f in (switch('A','A',9),terminal('B')):
    for mode in ('draw','growth','time','reset','actor','round','phase','context','usage','selection','first','result'):
     before=copy.deepcopy(b);after=copy.deepcopy(a);event=copy.deepcopy(e);first=f;p=after['legacy_continuation']['game_state']['players']['A']
     if mode=='draw':p['hand'].append(p['deck'].pop(0))
     elif mode=='growth':p['growth']+=5
     elif mode=='time':p['time']+=1
     elif mode=='reset':p['person_placed']=not p['person_placed']
     elif mode=='actor':event['actor']='B' if event['actor']=='A' else 'A'
     elif mode=='round':after['legacy_continuation']['game_state']['round']+=1
     elif mode=='phase':after['legacy_continuation']['game_state']['phase']='normal_action'
     elif mode=='context':after['legacy_continuation']['response_context']['consecutive_passes']=0
     elif mode=='usage':after['runtime']['ability_uses'].append({'invented':True})
     elif mode=='selection':event['selected_candidate']='invented'
     elif mode=='first':first='B' if first=='A' else 'A'
     elif event['action_type']=='r10_final_comparison':event['result']['winner']='invented'
     else:before['legacy_continuation']['game_state']['round']=10;first='B'
     with self.subTest(kind=e['action_type'],mode=mode):self.assertTrue(api.audit(before,after,event,first)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_uses_explicit_first_seat_for_delta(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run():
   b,a,e,f=switch('A','A',1);a['legacy_continuation']['game_state']['players']['A']['growth']+=5;ev=payments.transition_event(b,a,e['action_type'],e['actor'],selected_candidate=None)
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)],trigger_records=[]),[],dict(occurrences=[]),dict(first_player=f))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted extra growth'
   self.assertIn('turn finish full delta',message);return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
