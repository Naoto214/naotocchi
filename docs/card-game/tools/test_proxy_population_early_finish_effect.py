"""Existing public100 history and actual conditional terminal output."""
import copy,unittest
from test_proxy_population_end_victory import history
from test_proxy_population_runtime import initial
from proxy_population_policy_bridge import Session
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_end_victory as native
import proxy_population_turn_boundary as turn
import proxy_continuation_end as end
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
try:import proxy_population_early_finish_effect as api
except ImportError:api=None

def actual():
 args=history();r=native.finish_early(*args);b=runtime.engine.payments.upgrade(state.create(args[0]['continuation_state'],3));a=state.advance(b,r['new_snapshots'][0]['continuation_state'],4);return b,a,r['new_events'][0],args[3],args[4],args[2]['first_player']

def continuation(before):
 i=initial();s=Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});s.turn_start('B','conditional-prior')
 with end.end_scope(before,[],[],[before]):r=turn.next_turn(state.current(before),i,s)
 return state.advance(before,r['new_snapshots'][0]['continuation_state'],r['new_snapshots'][0]['event_seq']),r['new_events'][0]

class EarlyFinishEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'early finish public-history delta absent')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_actual_existing_terminal_and_no_early_result_in_r10(self):
  def run():
   b,a,e,h,s,f=actual();p=api.audit(b,a,e,h,s,f);self.assertEqual(p['errors'],[]);self.assertTrue(p['supplied_early_finish_verified']);self.assertFalse(p['history_origin_authenticated']);self.assertIsNone(p['balance_admitted'])
   # Existing synthetic history changes round, never a protected saved transcript.
   args=history(10);b=runtime.engine.payments.upgrade(state.create(args[0]['continuation_state'],3));a=copy.deepcopy(b);a['event_seq']=4;a['legacy_continuation']['game_state']['phase']='completed';a['legacy_continuation']['return_target']=None
   self.assertTrue(api.audit(b,a,e,args[3],args[4],f)['errors']);return {}
  self.run_case(run)
 def test_terminal_delta_history_result_and_improper_continuation_rejected(self):
  def run():
   b,a,e,h,s,f=actual()
   for mode in ('draw','growth','time','reset','context','runtime','winner','history_receipt','selection','missing_history','missing_snapshot','snapshot_context','first'):
    bad=copy.deepcopy(a);ev=copy.deepcopy(e);events=copy.deepcopy(h);shots=copy.deepcopy(s);first=f;p=bad['legacy_continuation']['game_state']['players']['A']
    if mode=='draw':p['hand'].append(p['deck'].pop(0))
    elif mode=='growth':p['growth']-=5
    elif mode=='time':p['time']+=1
    elif mode=='reset':p['person_placed']=not p['person_placed']
    elif mode=='context':bad['legacy_continuation']['response_context']['consecutive_passes']=0
    elif mode=='runtime':bad['runtime']['ability_uses'].append({'invented':True})
    elif mode=='winner':ev['result']['winner']='B'
    elif mode=='history_receipt':ev['result']['victory_history']['record']['turn_ordinal']+=1
    elif mode=='selection':ev['selected_candidate']='invented'
    elif mode=='missing_history':events.pop(0)
    elif mode=='missing_snapshot':shots.pop(0)
    elif mode=='snapshot_context':shots[-1]['continuation_state']['response_context']['priority_actor']='B'
    else:first='B'
    with self.subTest(mode=mode):self.assertTrue(api.audit(b,bad,ev,events,shots,first)['errors'])
   after,event=continuation(b);self.assertTrue(api.audit(b,after,event,h,s,f)['errors']);return {}
  self.run_case(run)
 def test_history_snapshot_game_cannot_disagree_with_actual_continuation(self):
  import proxy_continuation_payments as payments
  def run():
   b,a,e,h,s,f=actual();b['legacy_continuation']['game_state']['players']['A']['growth']=95;a['legacy_continuation']['game_state']['players']['A']['growth']=95;s[-1]['continuation_state']['game_state']['players']['A']['growth']=95;e['result']['final_growth']['A']=95
   # Separate snapshot.game still claims100 and the supplied public event chain
   # agrees with that claim; actual before/after and continuation instead say95.
   event=payments.transition_event(b,a,e['action_type'],e['actor'],selected_candidate=None,result=e['result'])
   self.assertTrue(api.audit(b,a,event,h,s,f)['errors']);return {}
  self.run_case(run)
 def test_100_without_future_opponent_end_may_continue(self):
  def run():
   b,_,_,h,s,f=actual();currents=[]
   # B reaches100 in A's turn then ends B's own turn; no future A turn yet.
   for shot in s:
    c=copy.deepcopy(shot['continuation_state']);c['last_event_seq']=shot['event_seq'];c['game_state']['players']['A']['growth']=0;c['game_state']['players']['B']['growth']=95 if shot['event_seq']==0 else 100;c['continuation_state_sha256']=triggers.old.start._hash(c);currents.append(c)
   events=[triggers._raw_event(prior,after,event['action_type'],event['actor']) for prior,after,event in zip(currents,currents[1:],h)];shots=[triggers.old._snapshot(c) for c in currents];b=runtime.engine.payments.upgrade(state.create(currents[-1],3));a,e=continuation(b)
   p=api.audit(b,a,e,events,shots,f);self.assertEqual(p['errors'],[]);self.assertEqual(p['early_winner_candidates'],[]);return {}
  self.run_case(run)
 def test_coverage_rejects_extra_growth_with_full_supplied_history(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run():
   b,a,e,h,s,f=actual();a['legacy_continuation']['game_state']['players']['B']['growth']+=5;ev=payments.transition_event(b,a,e['action_type'],e['actor'],selected_candidate=None,result=e['result'])
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)],trigger_records=[]),h,dict(occurrences=[]),dict(first_player=f),s)
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted extra growth'
   self.assertIn('early finish full delta',message);return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
