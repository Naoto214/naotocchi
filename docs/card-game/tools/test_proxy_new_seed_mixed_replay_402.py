import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_402.py')

class Replay402Tests(unittest.TestCase):
    def test_full_a_turn_per_route(self):
        self.assertTrue(SCRIPT.exists(),'402 turn replay adapter is missing')
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
        p=ROOT/'data/proxy-new-seed-mixed-replay-402-20260930.json';saved=json.loads(p.read_bytes())
        self.assertEqual(4,len(saved['results']))
        self.assertGreaterEqual(saved['new_events'],28)
        self.assertEqual(saved['new_events'],saved['new_snapshots'])
        self.assertEqual(0,saved['independent_balance_sample_count'])
        for row in saved['results']:
            self.assertEqual('egg_exchange_bottom',row['new_events'][0]['action_type'])
            self.assertEqual(['turn_end_completed','turn_start_and_egg_draw'],[e['action_type'] for e in row['new_events'][-2:]])
            state=row['final_continuation_state'];self.assertEqual(('B','egg_exchange_choice'),(state['game_state']['turn_player'],state['game_state']['phase']))
        for kind in ('audit','replay'):
            path=ROOT/f'data/proxy-new-seed-mixed-{kind}-402-20260930.json';value=json.loads(path.read_bytes())
            self.assertEqual((json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),path.read_bytes())

    def test_all_intermediate_choices_have_complete_candidates(self):
        self.assertTrue(SCRIPT.exists(),'402 turn replay adapter is missing')
        path=ROOT/'data/proxy-new-seed-mixed-audit-402-20260930.json';self.assertTrue(path.exists())
        for route in json.loads(path.read_bytes())['results']:
            for step in route['steps']:
                proof=step['audit']
                if proof['next_opportunity'] in ('normal_action','response_window','turn_end_response','mandatory_egg_exchange'):
                    self.assertTrue(proof['candidate_set_complete'])
                    self.assertEqual(sorted(set(proof['candidate_ids'])),proof['candidate_ids'])
                if proof['next_opportunity']=='normal_action':
                    self.assertEqual('A',proof['actor'])
                    self.assertIn('116',step['selection']['decision_pipeline'])
            self.assertTrue(route['next_opportunity_audit']['candidate_set_complete'])
