import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_choice_322.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-322-20260927.json'


class MixedChoice322Tests(unittest.TestCase):
    def test_two_seeded_eggs_unique_response_and_normal_pass(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {x['path_id']: x for x in report['results']}
        for path in ('probe-01-a-first', 'probe-02-a-first'):
            self.assertEqual('seeded_fallback', rows[path]['resolution_mode'])
        self.assertEqual('response-pass', rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual('pass', rows['probe-02-b-first']['selected_candidate'])
        self.assertEqual(4, len(rows['probe-02-b-first']['paid_comparisons']))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
