import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_choice_313.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-313-20260927.json'


class MixedChoice313Tests(unittest.TestCase):
    def test_two_pass_one_proved_end_one_seeded_egg(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        report = json.loads(OUTPUT.read_bytes())
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual('pass', rows['probe-01-a-first']['selected_candidate'])
        self.assertEqual('pass', rows['probe-02-a-first']['selected_candidate'])
        self.assertEqual('turn_end', rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual('seeded_fallback', rows['probe-02-b-first']['resolution_mode'])
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), OUTPUT.read_bytes())
