import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_342.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-342-20260928.json'


class MixedReplay342Tests(unittest.TestCase):
    def test_two_eggs_response_and_free_companion(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        self.assertEqual((4, 4), (report['new_events'], report['new_snapshots']))
        self.assertEqual(0, report['independent_balance_sample_count'])
        route = next(x for x in report['results'] if x['path_id'] == 'probe-02-b-first')
        self.assertEqual('post_placement_response', route['final_continuation_state']['game_state']['phase'])
        self.assertIn('B-012#1', route['final_continuation_state']['game_state']['players']['B']['board']['companions'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
