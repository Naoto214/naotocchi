import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_320.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-320-20260927.json'


class MixedReplay320Tests(unittest.TestCase):
    def test_two_end_draws_and_two_response_passes(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        self.assertEqual(6, report['new_events'])
        self.assertEqual(6, report['new_snapshots'])
        self.assertEqual(0, report['independent_balance_sample_count'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
