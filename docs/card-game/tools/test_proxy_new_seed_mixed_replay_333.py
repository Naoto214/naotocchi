import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_333.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-333-20260928.json'


class MixedReplay333Tests(unittest.TestCase):
    def test_two_normal_passes_end_draw_and_egg(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        report = json.loads(OUTPUT.read_bytes())
        self.assertEqual(5, report['new_events'])
        self.assertEqual(5, report['new_snapshots'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), OUTPUT.read_bytes())
