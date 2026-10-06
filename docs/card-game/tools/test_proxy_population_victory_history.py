"""Public100 maintenance boundaries from01/64; no sampled match inputs."""
import copy,unittest
from test_proxy_population_first_response import game_with
try:import proxy_population_victory_history as api
except ImportError:api=None

def game():
 g,_,_=game_with('W-city');g.update(round=5,turn_player='B',phase='normal_action');g['players']['A']['growth']=95
 return g

class VictoryHistoryTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def move(self,j,g,actor=None,round=None,growth=None,phase=None):
  after=copy.deepcopy(g)
  if actor is not None:after['turn_player']=actor
  if round is not None:after['round']=round
  if growth is not None:after['players']['A']['growth']=growth
  if phase is not None:after['phase']=phase
  kind='turn_end_completed' if actor and actor!=g['turn_player'] else 'unit_public_transition'
  event=dict(seq=j['last_event_seq']+1,action_type=kind,game_state_before_sha256=api.game_hash(g),game_state_after_sha256=api.game_hash(after))
  return api.observe(j,g,after,event),after,event
 def test_current_opponent_turn_does_not_count_as_a_future_start(self):
  g=game();j=api.create(g,0,'A');j,g,_=self.move(j,g,growth=100)
  j,g,_=self.move(j,g,phase='turn_end');self.assertEqual(api.assess_end(j,g)['early_winner_candidates'],[])
  j,g,_=self.move(j,g,actor='A',round=6,phase='turn_start');j,g,_=self.move(j,g,actor='B',phase='turn_start')
  j,g,_=self.move(j,g,phase='turn_end');r=api.assess_end(j,g)
  self.assertEqual(r['early_winner_candidates'],['A']);self.assertFalse(r['end_processing_complete']);self.assertIsNone(r['balance_admitted'])
 def test_actual_drop_then_recovery_never_restores_the_old_deadline(self):
  g=game();j=api.create(g,0,'A');j,g,_=self.move(j,g,growth=100)
  j,g,_=self.move(j,g,actor='A',round=6,phase='turn_start');j,g,_=self.move(j,g,actor='B',phase='turn_start')
  old=copy.deepcopy(j['maintenance']['A']);j,g,_=self.move(j,g,growth=95);j,g,_=self.move(j,g,growth=100,phase='turn_end')
  self.assertNotEqual(j['maintenance']['A']['reached_event_seq'],old['reached_event_seq']);self.assertEqual(api.assess_end(j,g)['early_winner_candidates'],[])
 def test_r10_never_returns_an_early_winner(self):
  g=game();g['round']=9;j=api.create(g,0,'A');j,g,_=self.move(j,g,growth=100)
  j,g,_=self.move(j,g,actor='A',round=10,phase='turn_start');j,g,_=self.move(j,g,actor='B',phase='turn_start');j,g,_=self.move(j,g,phase='turn_end')
  self.assertEqual(api.assess_end(j,g)['early_winner_candidates'],[])
 def test_full_supplied_transition_reconstruction_rejects_omission_and_forged_deadline(self):
  g=game();root=copy.deepcopy(g);j=api.create(g,0,'A');trace=[]
  for change in (dict(growth=100),dict(actor='A',round=6,phase='turn_start'),dict(actor='B',phase='turn_start')):
   before=copy.deepcopy(g);j,g,event=self.move(j,g,**change);trace.append(dict(before=before,after=copy.deepcopy(g),event=event))
  self.assertEqual(api.audit(j,root,0,'A',trace),[])
  self.assertTrue(api.audit(j,root,0,'A',trace[1:]))
  bad=copy.deepcopy(j);bad['maintenance']['A']['reached_event_seq']=True
  self.assertTrue(api.audit(bad,root,0,'A',trace))
  bad=copy.deepcopy(j);bad['maintenance']['A']['opponent_turn_start_event_seq']=1
  self.assertTrue(api.audit(bad,root,0,'A',trace))
 def test_hash_sequence_and_unknown_initial_maintenance_fail_closed(self):
  g=game();j=api.create(g,0,'A');bad=copy.deepcopy(g);bad['players']['A']['growth']=100
  with self.assertRaises(ValueError):api.create(bad,0,'A')
  event=dict(seq=2,action_type='unit_public_transition',game_state_before_sha256=api.game_hash(g),game_state_after_sha256=api.game_hash(g))
  with self.assertRaises(ValueError):api.observe(j,g,g,event)
  event['seq']=1;event['game_state_before_sha256']='0'*64
  with self.assertRaises(ValueError):api.observe(j,g,g,event)
  self.assertEqual(j,api.create(g,0,'A'))
if __name__=='__main__':unittest.main()
