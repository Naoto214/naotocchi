"""Explicit metadata at synthetic turn boundaries; no new-match sampling."""
import copy,unittest
from test_proxy_population_runtime import boundary,initial
from proxy_population_policy_bridge import Session
import proxy_continuation_batch_runner as engine
try:import proxy_population_turn_boundary as api
except ImportError:api=None

class TurnTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'explicit-metadata turn bridge missing')
 def test_egg_next_turn_and_choice_reuse_policy_for_both_first_seats(self):
  for first in ('A','B'):
   e,_=boundary();c=engine.base.state.current(e);g=c['game_state'];g.update(turn_player=first,phase='turn_end');c['return_target']='turn_end'
   s=Session(dict(protocol_id='unit',group_id='unit',mirror_side=first+'_first'),{'A':'00'*32,'B':'00'*32});s.turn_start(first,'opening')
   i=initial();i['first_player']=first
   c['continuation_state_sha256']=engine.base.old.start._hash(c)
   r=api.next_turn(c,i,s)
   actor='B' if first=='A' else 'A';after=r['final_continuation_state']
   self.assertEqual(after['game_state']['turn_player'],actor);self.assertEqual(after['game_state']['round'],1)
   self.assertEqual(after['game_state']['phase'],'response_window')
   self.assertEqual([x['action_type'] for x in r['new_events']],['turn_end_completed','turn_start_and_egg_draw','egg_exchange_bottom'])
   self.assertEqual(r['new_decisions'][0]['local_policy_evidence']['context']['opportunity_address'],[actor,1,actor,'turn_start',0,'egg_exchange_bottom','selection',0])
   c2=copy.deepcopy(after);c2.update(last_event_seq=r['last_valid_event_seq']);c2['game_state']['phase']='turn_end';c2['return_target']='turn_end'
   c2['continuation_state_sha256']=engine.base.old.start._hash(c2)
   r2=api.next_turn(c2,i,s)
   self.assertEqual(r2['final_continuation_state']['game_state']['round'],2)
 def test_next_turn_has_no_permission_to_skip_r10_comparison(self):
  e,_=boundary();c=engine.base.state.current(e);c['game_state'].update(round=10,turn_player='B',phase='turn_end');c['return_target']='turn_end'
  with self.assertRaises(ValueError):api.next_turn(c,initial(),None)
 def test_empty_deck_has_no_invented_choice_or_loss(self):
  e,_=boundary();c=engine.base.state.current(e);c['game_state'].update(phase='turn_end');c['return_target']='turn_end';p=c['game_state']['players']['B'];p['discard']+=p['deck']+p['hand'];p['deck']=[];p['hand']=[]
  s=Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});s.turn_start('A','opening')
  c['continuation_state_sha256']=engine.base.old.start._hash(c)
  r=api.next_turn(c,initial(),s)
  self.assertEqual(r['new_decisions'],[]);self.assertFalse(r['completed']);self.assertEqual(r['final_continuation_state']['game_state']['players']['B']['hand'],[])


class MetadataTests(unittest.TestCase):
 def test_r10_audit_uses_explicit_first_seat_and_preserves_other_failures(self):
  from unittest.mock import patch
  terminal=engine.base.old.terminal
  raw=dict(completeness_checks={'victory_history_sufficient':False,'transition_handlers_proven':False,'other':True},contract_stop_codes=[],stage_inventory=[{} for _ in range(6)],turn_end_set_complete=False)
  for first in ('A','B'):
   i=initial();i['first_player']=first
   with patch.object(terminal.contracts.provenance,'audit_current_turn_end',return_value=copy.deepcopy(raw)),patch.object(terminal.contracts.start,'load_source',side_effect=AssertionError('historical135 accessed')):
    r=api.audit_end(dict(path_id=i['path_id'],game_state=dict(round=10,turn_player=first)),{},i)
   self.assertTrue(r['turn_end_set_complete']);self.assertEqual(r['stage_inventory'][5]['disposition'],'continue_last_opponent_turn')
  raw['completeness_checks']['other']=False
  with patch.object(terminal.contracts.provenance,'audit_current_turn_end',return_value=raw):
   self.assertFalse(api.audit_end(dict(path_id='unit-only',game_state=dict(round=10,turn_player='A')),{},initial())['turn_end_set_complete'])
 def test_metadata_scope_restores_terminal_functions_on_failure(self):
  t=engine.base.old.terminal;a,r=t.audit_current_turn_end,t.replay_end
  with self.assertRaisesRegex(ValueError,'unit'),api.metadata_scope(initial(),None):raise ValueError('unit')
  self.assertIs(t.audit_current_turn_end,a);self.assertIs(t.replay_end,r)

class TerminalTests(unittest.TestCase):
 def test_real_six_stage_proof_r10_both_seats_and_tie_without_135_lookup(self):
  import json
  from pathlib import Path
  from unittest.mock import patch
  root=Path(__file__).resolve().parents[1];t=engine.base.old.terminal;c=t.contracts
  audits=json.loads((root/'data/proxy-new-seed-mixed-audit-405-20260930.json').read_text())
  runs=json.loads((root/'data/proxy-new-seed-mixed-replay-405-20260930.json').read_text())
  route=next(r for r in runs['results'] if r['path_id']=='probe-01-a-first')
  proof=next(x['audit'] for r in audits['results'] if r['path_id']==route['path_id'] for x in r['steps'] if x['audit']['next_opportunity']=='turn_end')
  shot=next(x for x in route['new_snapshots'] if x['event_seq']==proof['source_last_valid_event_seq'])
  for first in ('A','B'):
   for side in ('first','second','second_tie'):
    row=dict(path_id='synthetic-r10',last_valid_event_seq=shot['event_seq'],final_continuation_state=copy.deepcopy(shot['continuation_state']))
    game=row['final_continuation_state']['game_state'];actor=first if side=='first' else ('B' if first=='A' else 'A');game.update(turn_player=actor,round=10)
    row['final_continuation_state']['response_context']['turn_player']=actor
    supplied=copy.deepcopy(proof)
    if side=='second_tie':
     # Conditional synthetic end boundary; never relabel the saved history.
     game['players']['A']['growth']=game['players']['B']['growth']
     supplied['growth_trace'][-1]['growth']={a:game['players'][a]['growth'] for a in 'AB'}
    row['final_game_state_sha256']=c.start.opening._stop_state_sha256(game);row['final_continuation_state_sha256']=c.start.canonical_sha256(row['final_continuation_state'])
    i=initial();i.update(path_id=row['path_id'],first_player=first)
    session=Session(dict(protocol_id='unit',group_id='unit',mirror_side=first+'_first'),{'A':'00'*32,'B':'00'*32});session.turn_start(actor,'prior')
    with api.metadata_scope(i,session),patch.object(c.start,'load_source',side_effect=AssertionError('historical135 accessed')):
     bound=t.proof_for_row(row,dict(supplied,**c.boundary(row)))
     result=t.replay_end(row,bound)
     bad=copy.deepcopy(bound);bad['completeness_checks']['victory_history_sufficient']=False
     with self.assertRaises(ValueError):t.replay_end(row,bad)
    self.assertEqual(result['completed'],side!='first')
    c.validate_chain(row,result)
    if side!='first':
     self.assertEqual(result['new_events'][0]['action_type'],'r10_final_comparison')
     self.assertEqual(result['result']['winner'],t.compare_growth({a:game['players'][a]['growth'] for a in 'AB'}))
    else:self.assertEqual(result['new_events'][0]['action_type'],'turn_end_completed')
  self.assertEqual(t.compare_growth({'A':100,'B':100}),'draw')

if __name__=='__main__':unittest.main()
