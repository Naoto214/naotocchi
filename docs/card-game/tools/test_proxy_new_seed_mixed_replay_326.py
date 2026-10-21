import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_326.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-326-20260928.json'


class MixedReplay326Tests(unittest.TestCase):
    def test_three_response_passes_and_normal_pass(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        self.assertEqual((4, 4), (report['new_events'], report['new_snapshots']))
        self.assertEqual(0, report['independent_balance_sample_count'])
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual('turn_end', rows['probe-02-b-first']['final_continuation_state']['game_state']['phase'])
        self.assertEqual('turn_end_response', rows['probe-01-b-first']['final_continuation_state']['game_state']['phase'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
