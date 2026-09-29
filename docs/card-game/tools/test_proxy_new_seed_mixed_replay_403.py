import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_403.py')

class Replay403Tests(unittest.TestCase):
 def test_b_turns_and_full_free_placement_inventory(self):
  self.assertTrue(SCRIPT.exists(),'403 B-turn replay is missing')
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  audit=json.loads((ROOT/'data/proxy-new-seed-mixed-audit-403-20260930.json').read_bytes())
  replay=json.loads((ROOT/'data/proxy-new-seed-mixed-replay-403-20260930.json').read_bytes())
  self.assertEqual(4,len(replay['results']));self.assertEqual(replay['new_events'],replay['new_snapshots']);self.assertEqual(0,replay['independent_balance_sample_count'])
  for row in replay['results']:
   g=row['final_continuation_state']['game_state'];self.assertEqual((9,'A','egg_exchange_choice'),(g['round'],g['turn_player'],g['phase']))
  route=next(x for x in audit['results'] if x['path_id']=='probe-02-a-first')
  placed=next(x for x in route['steps'] if x['selection'] and x['selection'].get('selected_candidate')=='candidate-place-companion-B-014#1')
  self.assertIn('pass',placed['audit']['candidate_ids']);self.assertGreater(len(placed['audit']['candidate_ids']),2)
  self.assertEqual('safe_free_development',placed['selection']['resolution_mode'])
  self.assertEqual(set(placed['audit']['candidate_ids'])-{'pass','candidate-place-companion-B-014#1'},set(x['candidate_id'] for x in placed['selection']['paid_comparisons']))
  for kind in ('audit','replay'):
   path=ROOT/f'data/proxy-new-seed-mixed-{kind}-403-20260930.json';data=json.loads(path.read_bytes());self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),path.read_bytes())
