import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_323.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-323-20260927.json'


class MixedReplay323Tests(unittest.TestCase):
    def test_two_eggs_response_and_normal_pass(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        self.assertEqual((4, 4), (report['new_events'], report['new_snapshots']))
        self.assertEqual(0, report['independent_balance_sample_count'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
