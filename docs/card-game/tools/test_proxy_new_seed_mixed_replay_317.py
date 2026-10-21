import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_317.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-317-20260927.json'


class MixedReplay317Tests(unittest.TestCase):
    def test_four_transitions_and_hashes(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        self.assertEqual(4, report['new_events'])
        self.assertEqual(4, report['new_snapshots'])
        self.assertEqual(0, report['independent_balance_sample_count'])
        egg = next(x for x in report['results'] if x['path_id'] == 'probe-01-b-first')
        self.assertEqual(['egg_exchange_bottom'], [x['action_type'] for x in egg['new_events']])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
