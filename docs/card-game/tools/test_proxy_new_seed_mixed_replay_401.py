import copy
import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_401.py')

class Replay401Tests(unittest.TestCase):
    def test_contiguous_four_route_batch(self):
        self.assertTrue(SCRIPT.exists(), '401 continuous replay adapter is missing')
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True)
        saved = json.loads((ROOT/'data/proxy-new-seed-mixed-replay-401-20260930.json').read_bytes())
        source = json.loads((ROOT/'data/proxy-new-seed-mixed-replay-400-20260929.json').read_bytes())
        self.assertEqual(4, len(saved['results']))
        self.assertEqual(0, saved['independent_balance_sample_count'])
        counts = []
        for before, after in zip(source['results'], saved['results']):
            self.assertEqual(before['path_id'], after['path_id'])
            self.assertEqual('egg_exchange_choice', after['final_continuation_state']['game_state']['phase'])
            self.assertEqual(['turn_end_completed','turn_start_and_egg_draw'], [e['action_type'] for e in after['new_events'][-2:]])
            self.assertEqual(len(after['new_events']), len(after['new_snapshots']))
            counts.append(len(after['new_events']))
            game, cont, seq = before['final_game_state_sha256'], before['final_continuation_state_sha256'], before['last_valid_event_seq']
            for event, shot in zip(after['new_events'], after['new_snapshots']):
                self.assertEqual(seq+1, event['seq'])
                self.assertEqual((game,cont), (event['game_state_before_sha256'],event['continuation_state_before_sha256']))
                game,cont,seq = shot['game_state_sha256'],shot['continuation_state_sha256'],event['seq']
            self.assertEqual((seq,game,cont), (after['last_valid_event_seq'],after['final_game_state_sha256'],after['final_continuation_state_sha256']))
        self.assertGreaterEqual(sum(counts), 15)
        for kind in ('audit','replay'):
            path=ROOT/f'data/proxy-new-seed-mixed-{kind}-401-20260930.json'
            value=json.loads(path.read_bytes())
            self.assertEqual((json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),path.read_bytes())

    def test_actor_and_window_contracts(self):
        self.assertTrue(SCRIPT.exists(), '401 continuous replay adapter is missing')
        sys.path.insert(0,str(SCRIPT.parent))
        import proxy_new_seed_mixed_replay_401 as replay
        import proxy_reached_mixed_contracts_401 as contracts
        rows=replay.load_rows()
        row=rows[2]
        proof=contracts.audit_normal(row)
        self.assertEqual('B', proof['actor'])
        self.assertIn('continuous_not_response', [x.get('reason_code') for x in proof['board_exclusions']])
        source_copy=copy.deepcopy(rows[0])
        proof=contracts.audit_response(rows[0])
        self.assertEqual('A',proof['actor'])
        self.assertEqual('after_normal_action',proof['source_window_kind'])
        self.assertEqual(['response-pass'],proof['candidate_ids'])
        self.assertEqual(source_copy,rows[0])
        start_proof=contracts.audit_response(rows[1])
        self.assertEqual(['response-activate-ability-B-015#1','response-pass'],start_proof['candidate_ids'])

    def test_hash_tamper_rejected(self):
        self.assertTrue(SCRIPT.exists(), '401 continuous replay adapter is missing')
        sys.path.insert(0,str(SCRIPT.parent))
        import proxy_new_seed_mixed_replay_401 as replay
        import proxy_reached_mixed_contracts_401 as contracts
        row=copy.deepcopy(replay.load_rows()[0])
        row['final_continuation_state']['game_state']['players']['A']['growth']+=1
        with self.assertRaisesRegex(ValueError,'hash'):
            contracts.audit_response(row)
