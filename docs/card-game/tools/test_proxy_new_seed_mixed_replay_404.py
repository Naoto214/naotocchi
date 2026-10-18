import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_404.py')
class Replay404Tests(unittest.TestCase):
 def test_round_nine_a_turns_and_contiguous_history(self):
  self.assertTrue(SCRIPT.exists(),'404 replay is missing')
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  data=json.loads((ROOT/'data/proxy-new-seed-mixed-replay-404-20260930.json').read_bytes())
  self.assertEqual(4,len(data['results']));self.assertEqual(data['new_events'],data['new_snapshots']);self.assertGreaterEqual(data['new_events'],28)
  for row in data['results']:
   g=row['final_continuation_state']['game_state'];self.assertEqual(('B','egg_exchange_choice'),(g['turn_player'],g['phase']))
   expected=9 if row['path_id'].endswith('a-first') else 10;self.assertEqual(expected,g['round'])
  for kind in ('audit','replay'):
   p=ROOT/f'data/proxy-new-seed-mixed-{kind}-404-20260930.json';v=json.loads(p.read_bytes());self.assertEqual((json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),p.read_bytes())
  self.assertEqual(0,data['independent_balance_sample_count'])
 def test_coin_chain_preserves_board_source_and_resolves_reverse_order(self):
  data=json.loads((ROOT/'data/proxy-new-seed-mixed-replay-404-20260930.json').read_bytes())
  row=next(x for x in data['results'] if x['path_id']=='probe-01-b-first')
  coin=next(x for x in row['new_events'] if x['action_type']=='resolve_item')
  ability=next(x for x in row['new_events'] if x['action_type']=='resolve_board_ability')
  self.assertEqual(coin['seq']+1,ability['seq']);self.assertEqual(0,coin['result']['growth_added'])
  before=next(x for x in row['new_snapshots'] if x['event_seq']==coin['seq']-1)['continuation_state']
  self.assertEqual(['C-chicken','I-c_coin2'],[x['card_id'] for x in before['activation_zone']])
  self.assertEqual('turn_start',before['response_context']['window_kind'])
  self.assertIn('A-015#1',before['game_state']['players']['A']['board']['companions'])
  self.assertNotIn('A-033#1',before['game_state']['players']['A']['hand'])
  after=next(x for x in row['new_snapshots'] if x['event_seq']==coin['seq'])['continuation_state']
  self.assertEqual(['C-chicken'],[x['card_id'] for x in after['activation_zone']])
  self.assertEqual('resolving',after['response_context']['chain_status'])
  self.assertIn('A-033#1',after['game_state']['players']['A']['discard'])
 def test_full_candidate_proof_and_hidden_deck_boundary(self):
  import copy
  sys.path.insert(0,str(SCRIPT.parent))
  import proxy_new_seed_mixed_replay_404 as replay
  row=replay.egg_replay.run_route(next(x for x in replay.load_rows() if x['path_id']=='probe-01-a-first'))
  proof=replay.audit_response(row);selected=replay.choose_response(row,proof)
  self.assertEqual(['response-activate-ability-A-015#1','response-pass','response-use-item-A-033#1'],proof['candidate_ids'])
  bad=copy.deepcopy(proof);bad['candidate_ids'].remove('response-use-item-A-033#1')
  with self.assertRaises(ValueError):replay.choose_response(row,bad)
  hidden=copy.deepcopy(row);state=hidden['final_continuation_state'];deck=state['game_state']['players']['A']['deck'];deck[0],deck[1]=deck[1],deck[0]
  hidden['final_game_state_sha256']=replay.start.opening._stop_state_sha256(state['game_state']);hidden['final_continuation_state_sha256']=replay.start.canonical_sha256(state)
  other=replay.choose_response(hidden,replay.audit_response(hidden))
  self.assertEqual(selected['comparison']['seed_proof'],other['comparison']['seed_proof'])
  bad=copy.deepcopy(row);bad['final_game_state_sha256']='0'*64
  with self.assertRaises(ValueError):replay.audit_response(bad)
