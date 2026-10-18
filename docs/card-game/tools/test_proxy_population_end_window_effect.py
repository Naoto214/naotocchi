"""Actual end-window transition, conditional on supplied public history."""
import copy,unittest
from test_proxy_population_end_predicates import end_fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_continuation_triggers as triggers
import proxy_continuation_state as state
try:import proxy_population_end_window_effect as api
except ImportError:api=None

def actual(card):
 b,h,o=end_fixture(card);h=h[:-1];b['event_seq']=4;c=b['legacy_continuation'];c['game_state']['phase']='turn_end';c['return_target']='turn_end';c['response_context'].update(chain_status='empty',chain_links=[],consecutive_passes=2,origin_event_seq=3)
 result=triggers.open_end(b,h);assert result is not None
 a=state.advance(b,result['new_snapshots'][0]['continuation_state'],result['last_valid_event_seq'])
 return b,a,result['new_events'][0],h

class EndWindowEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'end window full delta absent')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_actual_four_source_windows_and_complete_classifications(self):
  def run():
   for card in ('M-beetle-02','W-countryside','P-desert_scorpion','I-sleepboost1'):
    b,a,e,h=actual(card);p=api.audit(b,a,e,h);self.assertEqual(p['errors'],[],card);self.assertTrue(p['supplied_end_window_verified']);self.assertFalse(p['history_origin_authenticated']);self.assertIsNone(p['balance_admitted'])
   return {}
  self.run_case(run)
 def test_missing_false_classifications_and_added_effects_are_refused(self):
  def run():
   b,a,e,h=actual('I-sleepboost1')
   for mode in ('growth','time','draw','pass','turn','usage','typed','actor','eligible','classifications','reopen','boundary'):
    before=copy.deepcopy(b);after=copy.deepcopy(a);event=copy.deepcopy(e);history=copy.deepcopy(h);p=after['legacy_continuation']['game_state']['players']['A']
    if mode=='growth':p['growth']+=5
    elif mode=='time':p['time']+=1
    elif mode=='draw':p['hand'].append(p['deck'].pop(0))
    elif mode=='pass':after['legacy_continuation']['response_context']['consecutive_passes']=1
    elif mode=='turn':after['legacy_continuation']['game_state']['turn_player']='B'
    elif mode=='usage':after['runtime']['ability_uses'].append({'invented':True})
    elif mode=='typed':after['runtime']['stat_effects'].append({'invented':True})
    elif mode=='actor':event['actor']='B'
    elif mode=='eligible':event['eligible_source_instance_ids'].pop()
    elif mode=='classifications':event['end_source_classifications'].pop()
    elif mode=='reopen':history.append(dict(e,seq=3))
    else:before['legacy_continuation']['game_state']['phase']='normal_action'
    with self.subTest(mode=mode):self.assertTrue(api.audit(before,after,event,history)['errors'])
   # Current time makes sleep ineligible; beetle remains eligible. Removing the
   # negative sleep classification must still fail the complete supplied scan.
   b['legacy_continuation']['game_state']['players']['A']['time']=1;r=triggers.open_end(b,h);a=state.advance(b,r['new_snapshots'][0]['continuation_state'],r['last_valid_event_seq']);e=r['new_events'][0]
   self.assertEqual(api.audit(b,a,e,h)['errors'],[]);e['end_source_classifications']=[x for x in e['end_source_classifications'] if x['condition_met']];self.assertTrue(api.audit(b,a,e,h)['errors']);return {}
  self.run_case(run)
 def test_coverage_rejects_extra_growth(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run():
   b,a,e,h=actual('M-beetle-02');a['legacy_continuation']['game_state']['players']['A']['growth']+=5
   ev=payments.transition_event(b,a,e['action_type'],e['actor'],eligible_source_instance_ids=e['eligible_source_instance_ids'],end_source_classifications=e['end_source_classifications'],source_reference=e['source_reference'])
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)],trigger_records=[]),h,dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted extra growth'
   self.assertIn('end window full delta',message);return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
