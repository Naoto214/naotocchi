import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_choice_325.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-325-20260928.json'


class MixedChoice325Tests(unittest.TestCase):
    def test_three_unique_responses_and_paid_normal_comparison(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True, capture_output=True, text=True)
        raw = OUTPUT.read_bytes()
        report = json.loads(raw)
        rows = {x['path_id']: x for x in report['results']}
        for path in ('probe-01-a-first', 'probe-02-a-first', 'probe-02-b-first'):
            self.assertEqual('response-pass', rows[path]['selected_candidate'])
        self.assertEqual('pass', rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual(2, len(rows['probe-01-b-first']['paid_comparisons']))
        self.assertEqual((json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(), raw)
