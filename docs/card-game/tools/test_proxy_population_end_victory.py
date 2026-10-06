import copy,unittest
from test_proxy_population_trigger_latching import case
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
try:import proxy_population_end_victory as api
except ImportError:api=None

def history(round_number=5):
 e,_,_,_=case();c=state.current(e);g=c['game_state'];g.update(round=round_number,turn_player='A',phase='normal_action');g['players']['A']['growth']=95
 for p in g['players'].values():
  board=p['board']
  for slot in ('main','partner','world'):
   if board[slot]:p['hand'].append(board[slot]);board[slot]=None
  for slot in ('companions','prepared'):p['hand'].extend(board[slot]);board[slot]=[]
  board['partner_stage']=None;p['reservations']=[]
 for link in c['activation_zone']:g['players'][link['actor']]['discard'].append(link['source_instance_id'])
 c['activation_zone']=[];c['pending_triggers']=[];c['last_event_seq']=0;c['response_context'].update(chain_status='empty',chain_links=[],consecutive_passes=2);c['continuation_state_sha256']=triggers.old.start._hash(c)
 shots=[triggers.old._snapshot(c)];events=[]
 for kind in ('unit_growth','turn_end_completed','unit_end'):
  after=copy.deepcopy(c)
  if kind=='unit_growth':after['game_state']['players']['A']['growth']=100
  elif kind=='turn_end_completed':after['game_state'].update(turn_player='B',phase='turn_start')
  else:after['game_state']['phase']='turn_end';after['return_target']='turn_end';after['response_context'].update(turn_player='B',window_kind='after_normal_action')
  after['last_event_seq']+=1;after['continuation_state_sha256']=triggers.old.start._hash(after);events.append(triggers._raw_event(c,after,kind,'A' if kind!='unit_end' else 'B'));shots.append(triggers.old._snapshot(after));c=after
 row=triggers.old._row(c,'unit-end');stop=dict(path_id='unit-end',last_valid_event_seq=c['last_event_seq'],game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'],game_state=c['game_state'],continuation_state=triggers.old.start._payload(c))
 proof=dict(source_event_seq=3,classified_events=[dict(seq=e['seq'],classification='none',source_reference='unit_conditional_proof') for e in events],growth_trace=[dict(event_seq=s['event_seq'],growth={a:s['game_state']['players'][a]['growth'] for a in 'AB'}) for s in shots],growth_reach_100=[dict(event_seq=1,actor='A')],active_expiring_effects=[],unresolved_codes=[])
 return stop,proof,dict(path_id='unit-end',first_player='A'),events,shots

class EndVictoryTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'full-history end bridge absent')
 def test_six_stages_preserve_reach_history_and_derive_future_opponent_end(self):
  def run(forced):
   args=history();r=api.audit_end(*args);self.assertTrue(r['turn_end_set_complete']);self.assertEqual(r['victory_history']['assessment']['early_winner_candidates'],['A']);self.assertFalse(r['origin_authenticated']);self.assertEqual(args[1]['growth_reach_100'],[dict(event_seq=1,actor='A')])
   bad=copy.deepcopy(args);bad[1]['unresolved_codes']=['unresolved_effect_provenance'];self.assertFalse(api.audit_end(*bad)['turn_end_set_complete'])
   bad=copy.deepcopy(args);bad[4].pop(1)
   with self.assertRaises(ValueError):api.audit_end(*bad)
   return {}
  base.operation(initial(),run)
 def test_early_terminal_requires_all_six_stages_and_keeps_hash_chain(self):
  def run(forced):
   args=history();result=api.finish_early(*args);self.assertTrue(result['completed']);self.assertEqual(result['result']['winner'],'A');self.assertEqual(result['new_events'][0]['game_state_before_sha256'],args[0]['game_state_sha256']);self.assertEqual(result['new_snapshots'][0]['game_state']['phase'],'completed')
   bad=copy.deepcopy(args);bad[1]['active_expiring_effects']=[{'effect_id':'still-active'}]
   with self.assertRaises(ValueError):api.finish_early(*bad)
   self.assertIsNone(api.finish_early(*history(10)));return {}
  base.operation(initial(),run)
 def test_stop_continuation_cannot_borrow_other_history_with_same_public_growth(self):
  def run(forced):
   args=history();ctx=args[0]['continuation_state']['response_context'];ctx['priority_actor']='B' if ctx['priority_actor']=='A' else 'A'
   with self.assertRaises(ValueError):api.audit_end(*args)
   return {}
  base.operation(initial(),run)
 def test_runtime_scope_retains_end_verification_before_terminal_replay(self):
  from unittest.mock import patch
  import proxy_continuation_end as end
  import proxy_continuation_payments as payments
  import proxy_population_turn_boundary as boundary
  def run(forced):
   stop,proof,i,events,shots=history();current=copy.deepcopy(stop['continuation_state']);current['last_event_seq']=3;current['continuation_state_sha256']=stop['continuation_state_sha256'];e=payments.upgrade(state.create(current,3));row=end.old._row(current,i['path_id'])
   def verified_transition(c,path,es,ss):
    audit=end.old.terminal.audit_current_turn_end(stop,proof)
    bound=dict(end.old.reached.boundary(row),next_opportunity='turn_end',turn_end_set_complete=audit['turn_end_set_complete'],stage_inventory=audit['stage_inventory'],completeness_checks=audit['completeness_checks'],contract_stop_codes=audit['contract_stop_codes'],classified_events=proof['classified_events'],growth_trace=proof['growth_trace'])
    return end.old.terminal.replay_end(row,bound)
   original=end.forced
   with patch.object(end,'verify_new_events',return_value=[]) as verify,patch.object(end.old,'_end_transition',side_effect=verified_transition),api.scope(),boundary.metadata_scope(i,None):
    r=end.forced(e,i,events,shots,[e]);self.assertTrue(r['completed']);self.assertEqual(r['result']['winner'],'A');self.assertTrue(verify.called)
   self.assertIs(end.forced,original);return {}
  base.operation(initial(),run)
 def test_r10_keeps_full_history_but_never_declares_early_victory(self):
  def run(forced):
   r=api.audit_end(*history(10));self.assertTrue(r['turn_end_set_complete']);self.assertEqual(r['victory_history']['assessment']['early_winner_candidates'],[]);self.assertEqual(r['stage_inventory'][5]['disposition'],'compare_public_growth');return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
