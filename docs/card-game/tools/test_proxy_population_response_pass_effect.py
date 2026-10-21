import copy,unittest
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
from proxy_population_start_window import _context
import proxy_population_runtime as runtime
import proxy_population_paid_draw as paid
import proxy_population_challenge_window as connected
import proxy_continuation_state as state
import proxy_continuation_payments as payments
import proxy_continuation_actions as actions
import proxy_continuation_candidates as candidates
import proxy_continuation_quick as quick
try:import proxy_population_response_pass_effect as api
except ImportError:api=None

def origin(b,kind,actor,**extra):
 c=state.current(b)
 return dict(seq=b['event_seq'],actor=actor,action_type=kind,game_state_after_sha256=quick.old.start.opening._stop_state_sha256(c['game_state']),continuation_state_after_sha256=quick.old.start._hash(c),**extra)

def fixture(mode):
 g,actor,source=game_with('I-c_coin2');g['phase']='normal_action';g['players'][actor]['time']=1
 b=payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2))
 history=[dict(seq=1,actor=actor,action_type='turn_start_and_egg_draw')]
 if mode=='chain':
  action=next(a for a in candidates.audit(b,history)['legal_candidate_details'] if a['card_id']=='I-c_coin2' and a['action_type']=='use_item');b,events=quick.activate(b,dict(selected_action=action),dict(public_events=history),initial(),verify_record=False);history+=events
 else:
  b['legacy_continuation']['game_state']['phase']='response_window';b['legacy_continuation']['response_context'].update(origin_event_seq=2,window_kind='turn_start')
  history.append(origin(b,'egg_exchange_bottom',actor))
 if mode in ('end','comparison','challenge_end','placement'):
  c=b['legacy_continuation'];c['response_context'].update(window_kind='after_normal_action',source_phase='turn_end' if mode=='end' else 'challenge_declaration' if mode=='comparison' else 'challenge_result' if mode=='challenge_end' else 'post_placement_response')
  c['game_state']['phase']='turn_end_response' if mode=='end' else 'post_placement_response' if mode=='placement' else 'response_window'
  c['return_target']='turn_end' if mode=='end' else 'challenge_comparison' if mode=='comparison' else 'challenge_end' if mode=='challenge_end' else 'normal_action_opportunity'
  if mode in ('comparison','challenge_end'):
   for owner,p in c['game_state']['players'].items():
    source=next(s for s in p['hand']+p['deck'] if c['game_state']['cards'][s]['card_id'].startswith('M-'));(p['hand'] if source in p['hand'] else p['deck']).remove(source);p['board']['main']=source
   c['game_state']['challenge']=dict(challenge_id='challenge-2',declaring_actor=actor,participants={o:p['board']['main'] for o,p in c['game_state']['players'].items()},parameter='power',status='comparing' if mode=='comparison' else 'resolved',started_event_seq=2,result=None)
  history[-1]=origin(b,'open_turn_end_triggers' if mode=='end' else 'challenge_declared' if mode=='comparison' else 'challenge_compared' if mode=='challenge_end' else 'person_placement',actor,eligible_source_instance_ids=[])
 return b,history

def actual(b,history):
 inv=actions.response_inventory(b,initial(),history);actor=b['legacy_continuation']['response_context']['priority_actor'];action=next(a for a in inv['legal_candidate_details'] if a['action_type']=='response_pass')
 return actions.apply(b,dict(selected_action=action,selected_candidate='response-pass',actor=actor,candidate_set_evidence=inv),dict(public_events=history))

class ResponsePassEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'response pass full delta absent')
 def run_case(self,callback):
  def run(forced):
   with paid.scope():return callback()
  with connected.contract_scope():return runtime.operation(initial(),run)
 def test_both_passes_at_start_placement_end_challenge_and_building_chain(self):
  def run():
   for mode in ('start','placement','end','comparison','challenge_end','chain'):
    b,history=fixture(mode)
    for index in (1,2):
     a,events=actual(b,history);proof=api.audit(b,a,events[0]);self.assertEqual(proof['errors'],[],(mode,index));self.assertTrue(proof['supplied_response_pass_verified']);self.assertIsNone(proof['balance_admitted']);history+=events;b=a
   return {}
  self.run_case(run)
 def test_wrong_priority_early_resolution_and_extra_state_changes_refused(self):
  def run():
   for mode in ('start','chain'):
    b,history=fixture(mode);a,events=actual(b,history);event=events[0]
    for mutation in ('priority','passes','index','chain','return','time','growth','turn','pending','event','actor','closed'):
     before=copy.deepcopy(b);bad=copy.deepcopy(a);ev=copy.deepcopy(event);c=bad['legacy_continuation'];actor=event['actor']
     if mutation=='priority':c['response_context']['priority_actor']=actor
     elif mutation=='passes':c['response_context']['consecutive_passes']=2
     elif mutation=='index':c['response_context']['response_opportunity_index']+=1
     elif mutation=='chain':c['response_context']['chain_status']='resolving'
     elif mutation=='return':c['return_target']='turn_end'
     elif mutation=='time':c['game_state']['players'][actor]['time']+=1
     elif mutation=='growth':c['game_state']['players'][actor]['growth']+=5
     elif mutation=='turn':c['game_state']['turn_player']='B' if actor=='A' else 'A'
     elif mutation=='pending':before['legacy_continuation']['pending_triggers']=['unresolved']
     elif mutation=='event':ev['result']['return_target']='other'
     elif mutation=='actor':ev['actor']='B' if actor=='A' else 'A'
     else:before['legacy_continuation']['response_context']['consecutive_passes']=2
     with self.subTest(mode=mode,mutation=mutation):self.assertTrue(api.audit(before,bad,ev)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_refuses_added_growth_with_rebound_hashes(self):
  import proxy_population_trigger_coverage as coverage
  def run():
   b,history=fixture('start');a,events=actual(b,history);event=events[0];a['legacy_continuation']['game_state']['players'][event['actor']]['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],selected_candidate='response-pass',result=event['result'])
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)]),history,dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted added growth'
   self.assertIn('response pass full delta',message);return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
